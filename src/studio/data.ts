import 'server-only';
import type { PaginatedDocs } from 'payload';
import type { Category, Media, Product, ProductVariant } from '@/cms/payload-types';
import type { Profile, PublishState, ReviewState } from './labels';
import { PAGE_SIZE, parseProductParams, parseVariantParams, productWhere, publishState, variantWhere, type ProductParams, type VariantParams } from './query';
import type { StudioSession } from './session';

const scoped = (s: StudioSession) => ({ overrideAccess: false, user: s.user }) as const;
const relId = (value: number | { id: number } | null | undefined) => (typeof value === 'number' ? value : value?.id ?? null);
const titleOf = (value: unknown) => (value && typeof value === 'object' && 'title' in value ? String(value.title) : null);
const imageOf = (value: unknown) => {
  if (!value || typeof value !== 'object' || !('url' in value)) return null;
  const media = value as Media;
  return media.url ? { url: media.url, alt: media.alt ?? '' } : null;
};
const pageOf = <T,>(result: PaginatedDocs<T>) => ({
  total: result.totalDocs,
  page: result.page ?? 1,
  pages: result.totalPages,
  from: result.totalDocs ? (result.page! - 1) * result.limit + 1 : 0,
  to: Math.min((result.page ?? 1) * result.limit, result.totalDocs),
});
export type PageInfo = ReturnType<typeof pageOf>;

export type ProductRow = {
  id: number; title: string; slug: string; sku: string | null; category: string | null; profile: Profile | null;
  image: { url: string; alt: string } | null; variants: number; docs: number; missing: ('photo' | 'summary')[];
  status: PublishState; review: ReviewState; updatedAt: string;
};

type Catalog = 'products' | 'product-variants';
type Live = ReadonlyMap<number, 'draft' | 'published'>;

/** Published state of the main documents; list reads only see the latest draft. */
async function liveStatus(s: StudioSession, collection: Catalog, ids: number[]): Promise<Live> {
  if (!ids.length) return new Map();
  const result = await s.payload.find({ collection, where: { id: { in: ids } }, pagination: false, depth: 0, select: { _status: true }, ...scoped(s) });
  return new Map(result.docs.map(d => [d.id, d._status ?? 'draft']));
}

async function liveIds(s: StudioSession, collection: Catalog, status?: 'draft' | 'published') {
  if (!status) return [];
  const result = await s.payload.find({ collection, where: { _status: { equals: status } }, pagination: false, depth: 0, select: { _status: true }, ...scoped(s) });
  return result.docs.map(d => d.id);
}

const toProductRow = (p: Omit<Product, 'createdAt'>, live: Live): ProductRow => ({
  id: p.id, title: p.title, slug: p.slug, sku: p.sku ?? null, category: titleOf(p.category), profile: p.profile ?? null,
  image: imageOf(p.image),
  // Draft reads ignore the join's count and limit and return every variant id.
  variants: p.variants?.totalDocs ?? p.variants?.docs?.length ?? 0,
  docs: (p.catalogDocuments?.filter(d => d.visible !== false).length ?? 0) + (p.documents?.length ?? 0),
  missing: [...(p.image ? [] : ['photo' as const]), ...(p.summary?.trim() ? [] : ['summary' as const])],
  status: publishState(live, p.id, p._status), review: p.reviewState ?? 'ready', updatedAt: p.updatedAt,
});

async function skuParents(s: StudioSession, q: string) {
  const found = await s.payload.find({
    collection: 'product-variants', draft: true, where: { sku: { like: q } }, limit: 50, depth: 0, select: { product: true }, ...scoped(s),
  });
  return [...new Set(found.docs.flatMap(v => relId(v.product) ?? []))];
}

async function productsWhere(s: StudioSession, params: ProductParams) {
  const [skuProductIds, live] = await Promise.all([params.q ? skuParents(s, params.q) : [], liveIds(s, 'products', params.status)]);
  return productWhere(params, { skuProductIds, liveIds: live });
}

async function findProducts(s: StudioSession, params: ProductParams, page: number, limit: number, ids?: number[]) {
  const where = ids?.length ? { id: { in: ids } } : await productsWhere(s, params);
  const result = await s.payload.find({
    collection: 'products', draft: true, where, sort: params.sort, page, limit, depth: 1,
    select: { title: true, slug: true, sku: true, category: true, profile: true, image: true, summary: true, documents: true, catalogDocuments: { visible: true }, reviewState: true, _status: true, updatedAt: true, variants: true },
    populate: { categories: { title: true }, media: { url: true, alt: true, filename: true } },
    joins: { variants: { limit: 1, count: true } },
    ...scoped(s),
  });
  const live = await liveStatus(s, 'products', result.docs.map(d => d.id));
  return { result, rows: result.docs.map(d => toProductRow(d, live)) };
}

export async function getProducts(s: StudioSession, params: ProductParams) {
  const { result, rows } = await findProducts(s, params, params.page, PAGE_SIZE);
  return { ...pageOf(result), rows };
}

export const EXPORT_LIMIT = 2000;

export async function getProductsForExport(s: StudioSession, params: ProductParams, ids?: number[]) {
  const { result, rows } = await findProducts(s, params, 1, EXPORT_LIMIT, ids);
  return { rows, truncated: result.totalDocs > result.docs.length };
}

export type VariantRow = {
  id: number; sku: string | null; title: string; size: string | null; connection: string | null;
  product: { id: number; title: string } | null; profile: Profile | null; specs: Record<string, number | null>;
  verified: boolean; status: PublishState; review: ReviewState;
};

const toVariantRow = (v: Omit<ProductVariant, 'createdAt' | 'updatedAt'>, live: Live): VariantRow => {
  const productId = relId(v.product);
  return {
    id: v.id, sku: v.sku ?? null, title: v.title, size: v.size ?? null, connection: v.connection ?? null,
    product: productId ? { id: productId, title: titleOf(v.product) ?? `Товар ${productId}` } : null,
    profile: v.profile ?? null, specs: { ...v.specs }, verified: v.packaging?.unitsVerified === true,
    status: publishState(live, v.id, v._status), review: v.reviewState ?? 'ready',
  };
};

export async function getVariants(s: StudioSession, params: VariantParams) {
  const where = variantWhere(params, await liveIds(s, 'product-variants', params.status));
  const [result, parent] = await Promise.all([
    s.payload.find({
      collection: 'product-variants', draft: true, where, sort: params.sort, page: params.page, limit: PAGE_SIZE, depth: 1,
      select: { sku: true, title: true, size: true, connection: true, product: true, profile: true, specs: true, packaging: { unitsVerified: true }, reviewState: true, _status: true },
      populate: { products: { title: true } },
      ...scoped(s),
    }),
    params.product
      ? s.payload.findByID({ collection: 'products', id: params.product, draft: true, depth: 0, select: { title: true }, disableErrors: true, ...scoped(s) })
      : null,
  ]);
  const live = await liveStatus(s, 'product-variants', result.docs.map(d => d.id));
  return { ...pageOf(result), rows: result.docs.map(v => toVariantRow(v, live)), parent: parent ? { id: parent.id, title: parent.title } : null };
}

export async function getTotals(s: StudioSession) {
  const [products, variants, categories] = await Promise.all([
    s.payload.count({ collection: 'products', ...scoped(s) }),
    s.payload.count({ collection: 'product-variants', ...scoped(s) }),
    s.payload.count({ collection: 'categories', ...scoped(s) }),
  ]);
  return { products: products.totalDocs, variants: variants.totalDocs, categories: categories.totalDocs };
}

export async function getCategories(s: StudioSession) {
  const result = await s.payload.find({
    collection: 'categories', draft: true, pagination: false, depth: 0, sort: 'path', select: { title: true, path: true }, ...scoped(s),
  });
  return result.docs.map((c: Pick<Category, 'id' | 'title' | 'path'>) => ({ id: c.id, title: c.title, path: c.path ?? '' }));
}

/** Counts go through the same filters as the lists they link to, so the numbers match. */
export async function getOverview(s: StudioSession) {
  const countProducts = async (raw: Record<string, string>) => {
    const where = await productsWhere(s, parseProductParams(raw));
    return s.payload.find({ collection: 'products', draft: true, where, limit: 1, depth: 0, select: { _status: true }, ...scoped(s) }).then(r => r.totalDocs);
  };
  const countVariants = async (raw: Record<string, string>) => {
    const params = parseVariantParams(raw);
    const where = variantWhere(params, await liveIds(s, 'product-variants', params.status));
    return s.payload.find({ collection: 'product-variants', draft: true, where, limit: 1, depth: 0, select: { _status: true }, ...scoped(s) }).then(r => r.totalDocs);
  };
  const [attention, conflicts, noPhoto, noSummary, unpublished, recent] = await Promise.all([
    countProducts({ attention: 'any' }),
    countVariants({ attention: 'blocked' }),
    countProducts({ missing: 'photo' }),
    countProducts({ missing: 'summary', status: 'published' }),
    countProducts({ status: 'draft' }),
    s.payload.find({
      collection: 'products', draft: true, sort: '-updatedAt', limit: 8, depth: 0,
      select: { title: true, _status: true, reviewState: true, updatedAt: true }, ...scoped(s),
    }),
  ]);
  const live = await liveStatus(s, 'products', recent.docs.map(d => d.id));
  return {
    attention, conflicts, noPhoto, noSummary, unpublished,
    recent: recent.docs.map(p => ({ id: p.id, title: p.title, status: publishState(live, p.id, p._status), review: (p.reviewState ?? 'ready') as ReviewState, updatedAt: p.updatedAt })),
  };
}
