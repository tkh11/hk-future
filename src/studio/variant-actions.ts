'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { describeError, type ActionError } from './errors';
import { claimLock, lockHolder } from './locks';
import { productHref, variantHref } from './routes';
import { requireEditor } from './session';
import { blankVariant, toVariantData, variantPatchSchema, type VariantPatch } from './variant-form';

export type SaveResult = { ok: true; savedAt: string; id?: number } | ActionError;

const variantId = z.number().int().positive();
const busy = (name: string): ActionError => ({ error: `Позицию сейчас редактирует ${name}. Правки не сохранены.`, locked: true });
const invalid: ActionError = { error: 'Проверьте заполнение полей.' };

async function write(id: number, patch: VariantPatch, mode: 'autosave' | 'save' | 'publish'): Promise<SaveResult> {
  const parsed = variantPatchSchema.safeParse(patch);
  if (!variantId.safeParse(id).success || !parsed.success) return invalid;
  const s = await requireEditor();
  if (mode === 'publish' && !s.can.publish) return { error: 'Публикует публикующий редактор.' };
  const holder = await lockHolder(s, 'product-variants', id);
  if (holder) return busy(holder.name);
  try {
    const data = mode === 'publish' ? { ...toVariantData(parsed.data), _status: 'published' as const } : toVariantData(parsed.data);
    const doc = await s.payload.update({
      collection: 'product-variants', id, data, draft: mode !== 'publish', autosave: mode === 'autosave',
      overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true, product: true },
    });
    await claimLock(s, 'product-variants', id);
    revalidatePath(variantHref(id));
    const parent = typeof doc.product === 'number' ? doc.product : doc.product?.id;
    if (parent) revalidatePath(productHref(parent));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

export async function saveVariant(id: number, patch: VariantPatch, mode: 'autosave' | 'save') {
  return write(id, patch, mode);
}
export async function publishVariant(id: number, patch: VariantPatch) {
  return write(id, patch, 'publish');
}

export async function unpublishVariant(id: number): Promise<SaveResult> {
  if (!variantId.safeParse(id).success) return invalid;
  const s = await requireEditor();
  if (!s.can.publish) return { error: 'Снимает с сайта публикующий редактор.' };
  try {
    const doc = await s.payload.update({
      collection: 'product-variants', id, data: { _status: 'draft' }, overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    await claimLock(s, 'product-variants', id);
    revalidatePath(variantHref(id));
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

export async function createVariant(productId: number): Promise<SaveResult> {
  if (!variantId.safeParse(productId).success) return invalid;
  const s = await requireEditor();
  const product = await s.payload.findByID({ collection: 'products', id: productId, draft: true, depth: 0, select: { title: true, profile: true }, disableErrors: true, overrideAccess: false, user: s.user });
  if (!product) return { error: 'Товар не найден.' };
  try {
    const blank = blankVariant(productId, product.profile ?? null);
    const doc = await s.payload.create({
      collection: 'product-variants', draft: true,
      data: { ...toVariantData(blank), title: 'Новая позиция', product: productId, profile: product.profile ?? undefined, reviewState: 'ready', _status: 'draft' },
      overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    revalidatePath(productHref(productId));
    return { ok: true, savedAt: doc.updatedAt, id: doc.id };
  } catch (error) {
    return describeError(error);
  }
}

export async function createVariantAndOpen(productId: number) {
  const result = await createVariant(productId);
  if ('id' in result && result.id) redirect(variantHref(result.id));
  return result;
}

export async function saveVariantRow(id: number, patch: VariantPatch): Promise<SaveResult> {
  return write(id, patch, 'save');
}

export async function pasteVariants(productId: number, rows: VariantPatch[]): Promise<{ ok: number; failed: number; error?: string }> {
  if (!variantId.safeParse(productId).success || !Array.isArray(rows) || rows.length === 0 || rows.length > 200) {
    return { ok: 0, failed: 0, error: 'Нечего вставлять.' };
  }
  const s = await requireEditor();
  const product = await s.payload.findByID({ collection: 'products', id: productId, draft: true, depth: 0, select: { profile: true }, disableErrors: true, overrideAccess: false, user: s.user });
  if (!product) return { ok: 0, failed: 0, error: 'Товар не найден.' };
  let ok = 0;
  let failed = 0;
  for (const row of rows) {
    const parsed = variantPatchSchema.safeParse(row);
    if (!parsed.success) { failed += 1; continue; }
    try {
      await s.payload.create({
        collection: 'product-variants', draft: true,
        data: { ...toVariantData({ ...blankVariant(productId, product.profile ?? null), ...parsed.data, title: parsed.data.title || parsed.data.sku || 'Позиция' }), product: productId, reviewState: 'ready', _status: 'draft' },
        overrideAccess: false, user: s.user, depth: 0,
      });
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  revalidatePath(productHref(productId));
  return { ok, failed };
}

export async function markPackagingVerified(ids: number[]): Promise<{ ok: number; failed: number; error?: string }> {
  const parsed = z.array(variantId).min(1).max(100).safeParse(ids);
  if (!parsed.success) return { ok: 0, failed: 0, error: 'Выберите позиции.' };
  const s = await requireEditor();
  let ok = 0;
  let failed = 0;
  for (const id of parsed.data) {
    try {
      await s.payload.update({
        collection: 'product-variants', id, data: { packaging: { unitsVerified: true } }, draft: true,
        overrideLock: false, overrideAccess: false, user: s.user, depth: 0,
      });
      ok += 1;
    } catch {
      failed += 1;
    }
  }
  revalidatePath('/studio/assortment', 'layout');
  return { ok, failed };
}
