'use server';

import { sql, type PostgresAdapter } from '@payloadcms/db-postgres';
import { revalidatePath } from 'next/cache';
import { createLocalReq } from 'payload';
import { z } from 'zod';
import { pumpSelectionValuesSchema, type PumpSelectionValues } from '@/cms/pump-selection-values';
import { fromPumpSelection } from '@/cms/pump-selection-data';
import { pumpSharedCharacteristicsSchema, resolvePumpCharacteristics, pumpCharacteristicErrors, type PumpSharedCharacteristics } from '@/cms/pump-shared-characteristics';
import { describeError } from './errors';
import { getPumpSelectionGroups } from './pump-selection-data';
import { claimLock, lockHolder } from './locks';
import { pumpSelectionHref } from './routes';
import { requireEditor } from './session';

const patchSchema = pumpSelectionValuesSchema.partial();
const publicationLock = sql`SELECT pg_advisory_xact_lock(1887072142)`;

async function write(
  id: number, revision: string, patch: Partial<PumpSelectionValues>,
  mode: 'autosave' | 'save' | 'publish' | 'unpublish',
) {
  const session = await requireEditor();
  const parsed = patchSchema.safeParse(patch);
  if (!Number.isSafeInteger(id) || id <= 0 || !z.iso.datetime().safeParse(revision).success || !parsed.success) {
    return { error: 'Проверьте данные насоса.' };
  }
  const changesPublication = mode === 'publish' || mode === 'unpublish';
  if (changesPublication && !session.can.publish) return { error: 'Для публикации нужны права публикующего редактора.' };
  const holder = await lockHolder(session, 'pump-selection-records', id);
  if (holder) return { error: `Насос редактирует ${holder.name}.`, locked: true };

  const { payload, user } = session;
  const adapter = payload.db as unknown as PostgresAdapter;
  const req = await createLocalReq({ user }, payload);
  const tx = await adapter.beginTransaction();
  if (tx == null) return { error: 'Не удалось начать сохранение.' };
  req.transactionID = tx;
  const options = { req, user, overrideAccess: false, depth: 0 } as const;
  try {
    if (changesPublication) await adapter.sessions[tx].db.execute(publicationLock);
    await adapter.sessions[tx].db.execute(sql`SELECT id FROM pump_selection_records WHERE id = ${id} FOR UPDATE`);
    const latest = await payload.findByID({ ...options, collection: 'pump-selection-records', id, draft: true, disableErrors: true });
    if (!latest || latest.updatedAt !== revision) {
      await adapter.rollbackTransaction(tx);
      return { error: 'Карточка изменилась. Обновите страницу перед сохранением.' };
    }
    const { curve, ...fields } = parsed.data;
    if (fields.group !== undefined) {
      const groups = await getPumpSelectionGroups(session, req);
      if (!groups.some(group => group.id === fields.group && group.folders.length === 3)) {
        throw new Error('Выберите исполнение насоса.');
      }
    }
    const doc = await payload.update({
      ...options, collection: 'pump-selection-records', id, draft: !changesPublication, autosave: mode === 'autosave',
      overrideLock: false, unpublishAllLocales: mode === 'unpublish', data: {
        ...fields,
        ...(curve && { curve: { ...latest.curve, ...curve } }),
        ...(changesPublication && { _status: mode === 'publish' ? 'published' as const : 'draft' as const }),
      },
    });
    await adapter.commitTransaction(tx);
    await claimLock(session, 'pump-selection-records', id).catch(() => undefined);
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    if (changesPublication) revalidatePath('/selection/pumps');
    return { ok: true as const, savedAt: doc.updatedAt };
  } catch (error) {
    await adapter.rollbackTransaction(tx);
    return describeError(error);
  }
}

export async function savePumpSelection(id: number, revision: string, patch: Partial<PumpSelectionValues>, mode: 'save' | 'autosave') {
  return write(id, revision, patch, mode);
}

export async function changePumpSelectionPublication(id: number, revision: string, publish: boolean) {
  return write(id, revision, {}, publish ? 'publish' : 'unpublish');
}

export async function savePumpSharedCharacteristics(id: number, revision: string, fields: PumpSharedCharacteristics, mode: 'save' | 'publish') {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Недостаточно прав.' };
  const parsed = pumpSharedCharacteristicsSchema.safeParse(fields);
  const publish = mode === 'publish';
  if (!Number.isSafeInteger(id) || id <= 0 || !z.iso.datetime().safeParse(revision).success
    || !parsed.success || (!publish && mode !== 'save')) {
    return { error: 'Проверьте общие характеристики.' };
  }
  const { payload, user } = session;
  const adapter = payload.db as unknown as PostgresAdapter;
  const req = await createLocalReq({ user }, payload);
  const tx = await adapter.beginTransaction();
  if (tx == null) return { error: 'Не удалось начать сохранение.' };
  req.transactionID = tx;
  const options = { req, user, overrideAccess: false, depth: 0 } as const;
  try {
    if (publish) await adapter.sessions[tx].db.execute(publicationLock);
    await adapter.sessions[tx].db.execute(sql`SELECT id FROM pump_selection_groups WHERE id = ${id} FOR UPDATE`);
    const group = await payload.findByID({ ...options, collection: 'pump-selection-groups', id, disableErrors: true });
    if (!group || group.updatedAt !== revision) {
      await adapter.rollbackTransaction(tx);
      return { error: 'Папка изменилась. Обновите страницу перед сохранением.' };
    }
    if (publish) {
      const groups = await getPumpSelectionGroups(session, req);
      const paths = new Map(groups.filter(item => item.folders.length === 3 && item.folders.some(folder => folder.id === id))
        .map(item => [item.id, item.folders.map(folder => folder.id === id ? { ...folder, sharedCharacteristics: parsed.data } : folder)]));
      if (paths.size) {
        const { docs } = await payload.find({
          ...options, collection: 'pump-selection-records', pagination: false, draft: false,
          where: { group: { in: [...paths.keys()] }, _status: { equals: 'published' } },
          select: { sku: true, group: true, characteristicOverrides: true, systemTypes: true,
            pumpSelection: { temperatureMinC: true, temperatureMaxC: true },
            curve: { speedRpm: true, frequencyHz: true, hydraulicsOnly: true } },
        });
        for (const doc of docs) {
          const path = paths.get(typeof doc.group === 'number' ? doc.group : doc.group.id);
          const { record } = resolvePumpCharacteristics(doc, path ?? []);
          const [firstError] = pumpCharacteristicErrors(record);
          if (firstError) {
            await adapter.rollbackTransaction(tx);
            return { error: `Артикул ${doc.sku}. ${firstError.message}` };
          }
        }
      }
    }
    const saved = await payload.update({
      ...options, collection: 'pump-selection-groups', id,
      data: publish ? { sharedCharacteristics: parsed.data, sharedCharacteristicsDraft: null }
        : { sharedCharacteristicsDraft: parsed.data },
    });
    await adapter.commitTransaction(tx);
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    if (publish) revalidatePath('/selection/pumps');
    return { ok: true as const, savedAt: saved.updatedAt };
  } catch (error) {
    await adapter.rollbackTransaction(tx);
    return describeError(error);
  }
}

const groupInput = z.object({ title: z.string().trim().min(1).max(200), parent: z.number().int().positive().nullable() });
const recordInput = z.object({ sku: z.string().trim().min(1).max(100), title: z.string().trim().min(1).max(200), group: z.number().int().positive() });

export async function createPumpSelectionGroup(input: { title: string; parent: number | null }) {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Недостаточно прав.' };
  const parsed = groupInput.safeParse(input);
  if (!parsed.success) return { error: 'Укажите название группы.' };
  try {
    const req = await createLocalReq({ user: session.user }, session.payload);
    const doc = await session.payload.create({
      collection: 'pump-selection-groups', data: { ...parsed.data, slug: '' },
      req, user: session.user, overrideAccess: false, depth: 0,
    });
    const groups = await getPumpSelectionGroups(session);
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    return { ok: true as const, href: groups.find(group => group.id === doc.id)?.href ?? pumpSelectionHref };
  } catch (error) { return describeError(error); }
}

export async function renamePumpSelectionGroup(id: number, title: string) {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Недостаточно прав.' };
  if (!Number.isSafeInteger(id) || id <= 0 || !groupInput.shape.title.safeParse(title).success) return { error: 'Укажите название группы.' };
  try {
    const req = await createLocalReq({ user: session.user }, session.payload);
    await session.payload.update({ collection: 'pump-selection-groups', id, data: { title: title.trim() },
      req, user: session.user, overrideAccess: false, depth: 0 });
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    revalidatePath('/selection/pumps');
    return { ok: true as const };
  } catch (error) { return describeError(error); }
}

export async function deletePumpSelectionGroup(id: number) {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Недостаточно прав.' };
  if (!Number.isSafeInteger(id) || id <= 0) return { error: 'Группа не найдена.' };
  try {
    const req = await createLocalReq({ user: session.user }, session.payload);
    await session.payload.delete({ collection: 'pump-selection-groups', id, req, user: session.user, overrideAccess: false });
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    return { ok: true as const };
  } catch (error) { return describeError(error); }
}

export async function createPumpSelection(input: { sku: string; title: string; group: number }) {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Недостаточно прав.' };
  const parsed = recordInput.safeParse(input);
  if (!parsed.success) return { error: 'Укажите артикул и название насоса.' };
  try {
    const group = (await getPumpSelectionGroups(session)).find(item => item.id === parsed.data.group && item.folders.length === 3);
    if (!group) return { error: 'Выберите исполнение насоса.' };
    const req = await createLocalReq({ user: session.user }, session.payload);
    const doc = await session.payload.create({
      collection: 'pump-selection-records', draft: true, depth: 0, req, user: session.user, overrideAccess: false,
      data: { ...parsed.data, _status: 'draft', connectionSize: '', systemTypes: [],
        pumpSelection: fromPumpSelection({ modelName: parsed.data.title }), curve: { points: [] } },
    });
    revalidatePath(`${pumpSelectionHref}/[[...path]]`, 'page');
    return { ok: true as const, href: `${group.href}/${doc.id}` };
  } catch (error) { return describeError(error); }
}
