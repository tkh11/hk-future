'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { describeError } from './errors';
import { productHref, variantHref } from './routes';
import { requireEditor } from './session';

const ids = z.array(z.number().int().positive()).min(1).max(100);
const bulkSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('category'), ids, category: z.number().int().positive() }),
  z.object({ type: z.literal('review'), ids, state: z.enum(['review', 'ready']) }),
  z.object({ type: z.literal('publish-request'), ids, requested: z.boolean() }),
]);

export type BulkInput = z.infer<typeof bulkSchema>;
export type BulkResult = { ok: number; failed: { id: number; message: string }[] } | { error: string };

const describe = (error: unknown) => describeError(error).error;

/** Saves into the latest draft: the public copy changes only after publication. */
export async function bulkUpdateProducts(input: BulkInput): Promise<BulkResult> {
  const parsed = bulkSchema.safeParse(input);
  if (!parsed.success) return { error: 'Неверный запрос.' };
  const s = await requireEditor();
  const change = parsed.data;
  if (change.type === 'category') {
    const category = await s.payload.findByID({ collection: 'categories', id: change.category, depth: 0, select: { title: true }, disableErrors: true, overrideAccess: false, user: s.user });
    if (!category) return { error: 'Раздел не найден.' };
  }
  const data = change.type === 'category' ? { category: change.category } : change.type === 'review' ? { reviewState: change.state } : { publicationRequested: change.requested };
  let ok = 0;
  const failed: { id: number; message: string }[] = [];
  // Sequential on purpose: each update runs hooks and version writes in its own transaction.
  for (const id of change.ids) {
    try {
      await s.payload.update({ collection: 'products', id, data, draft: true, overrideLock: false, overrideAccess: false, user: s.user });
      ok += 1;
    } catch (error) {
      failed.push({ id, message: describe(error) });
    }
  }
  revalidatePath('/studio', 'layout');
  return { ok, failed };
}

export type SearchHit = { href: string; title: string; meta: string };

export async function searchCatalog(raw: string): Promise<SearchHit[]> {
  const q = z.string().trim().min(2).max(100).safeParse(raw);
  if (!q.success) return [];
  const s = await requireEditor();
  const term = q.data;
  const [products, variants] = await Promise.all([
    s.payload.find({
      collection: 'products', draft: true, limit: 6, depth: 0,
      where: { or: [{ title: { like: term } }, { slug: { like: term } }, { sku: { like: term } }] },
      select: { title: true, sku: true }, overrideAccess: false, user: s.user,
    }),
    s.payload.find({
      collection: 'product-variants', draft: true, limit: 6, depth: 1,
      where: { or: [{ sku: { like: term } }, { title: { like: term } }] },
      select: { sku: true, title: true, product: true }, populate: { products: { title: true } }, overrideAccess: false, user: s.user,
    }),
  ]);
  return [
    ...products.docs.map(p => ({ href: productHref(p.id), title: p.title, meta: p.sku ? `Товар · ${p.sku}` : 'Товар' })),
    ...variants.docs.map(v => {
      const parent = v.product && typeof v.product === 'object' ? v.product.title : null;
      return { href: variantHref(v.id), title: v.sku ? `${v.sku} · ${v.title}` : v.title, meta: parent ? `Позиция · ${parent}` : 'Позиция' };
    }),
  ];
}
