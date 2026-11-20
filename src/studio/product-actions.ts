'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { describeError, type ActionError } from './errors';
import { claimLock, lockHolder } from './locks';
import { productPatchSchema, SLUG_PATTERN, toPayloadData, type ProductPatch } from './product-form';
import { productHref } from './routes';
import { requireEditor } from './session';

export type SaveResult = { ok: true; savedAt: string } | ActionError;

const productId = z.number().int().positive();
const busy = (name: string): ActionError => ({ error: `Карточку сейчас редактирует ${name}. Правки не сохранены.`, locked: true });
const invalid: ActionError = { error: 'Проверьте заполнение полей.' };

/** Autosave updates the running autosave version; ⌘S writes a separate version in the history. */
export async function saveProduct(id: number, patch: ProductPatch, mode: 'autosave' | 'save'): Promise<SaveResult> {
  const parsed = productPatchSchema.safeParse(patch);
  if (!productId.safeParse(id).success || !parsed.success) return invalid;
  const s = await requireEditor();
  const holder = await lockHolder(s, 'products', id);
  if (holder) return busy(holder.name);
  try {
    const doc = await s.payload.update({
      collection: 'products', id, data: toPayloadData(parsed.data), draft: true, autosave: mode === 'autosave',
      overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    await claimLock(s, 'products', id);
    if (mode === 'save') revalidatePath(productHref(id));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

/** Publishes the latest draft together with any edits that have not been autosaved yet. */
export async function publishProduct(id: number, patch: ProductPatch): Promise<SaveResult> {
  const parsed = productPatchSchema.safeParse(patch);
  if (!productId.safeParse(id).success || !parsed.success) return invalid;
  const s = await requireEditor();
  if (!s.can.publish) return { error: 'Публикует публикующий редактор.' };
  const holder = await lockHolder(s, 'products', id);
  if (holder) return busy(holder.name);
  try {
    const doc = await s.payload.update({
      collection: 'products', id, data: { ...toPayloadData(parsed.data), _status: 'published' },
      overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    await claimLock(s, 'products', id);
    revalidatePath(productHref(id));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

export async function unpublishProduct(id: number): Promise<SaveResult> {
  if (!productId.safeParse(id).success) return invalid;
  const s = await requireEditor();
  if (!s.can.publish) return { error: 'Снимает с сайта публикующий редактор.' };
  try {
    const doc = await s.payload.update({
      collection: 'products', id, data: { _status: 'draft' }, overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    await claimLock(s, 'products', id);
    revalidatePath(productHref(id));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

/** Restores an old version into the draft; the site changes only after publication. */
export async function restoreProductVersion(id: number, versionId: string): Promise<SaveResult> {
  if (!productId.safeParse(id).success || !/^\d{1,12}$/.test(versionId)) return invalid;
  const s = await requireEditor();
  const holder = await lockHolder(s, 'products', id);
  if (holder) return busy(holder.name);
  const version = await s.payload.findVersionByID({ collection: 'products', id: versionId, depth: 0, disableErrors: true, overrideAccess: false, user: s.user });
  if (!version || Number(typeof version.parent === 'object' ? (version.parent as { id: number }).id : version.parent) !== id) return { error: 'Версия не найдена.' };
  try {
    const doc = await s.payload.restoreVersion({ collection: 'products', id: versionId, draft: true, depth: 0, overrideAccess: false, user: s.user });
    revalidatePath(productHref(id));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

export type CreateState = ActionError & { values?: Record<string, string> };

const createSchema = z.object({
  title: z.string().trim().min(1, 'Введите название.').max(200),
  category: z.coerce.number({ error: 'Выберите раздел.' }).int().positive('Выберите раздел.'),
  productKind: z.enum(['family', 'single', 'request']),
  slug: z.string().trim().regex(SLUG_PATTERN, 'Латинские буквы, цифры и дефисы.').max(150),
});

export async function createProduct(_: CreateState | undefined, form: FormData): Promise<CreateState> {
  const raw = { title: form.get('title'), category: form.get('category'), productKind: form.get('productKind'), slug: form.get('slug') };
  const values = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, typeof v === 'string' ? v : '']));
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    const fields = parsed.error.issues.map(issue => ({ path: String(issue.path[0]), message: issue.message }));
    return { error: fields[0]?.message ?? 'Проверьте поля.', fields, values };
  }
  const s = await requireEditor();
  let id: number;
  try {
    const doc = await s.payload.create({
      collection: 'products', draft: true, data: { ...parsed.data, reviewState: 'ready', _status: 'draft' },
      overrideAccess: false, user: s.user, depth: 0, select: { title: true },
    });
    id = doc.id;
  } catch (error) {
    return { ...describeError(error), values };
  }
  redirect(productHref(id));
}
