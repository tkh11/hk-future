import type { Where } from 'payload';
import { z } from 'zod';
import { profileValues, type PublishState } from './labels';

export const PAGE_SIZE = 50;

type RawParams = Record<string, string | string[] | undefined>;
const first = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);
const optional = <T extends z.ZodType>(schema: T) => schema.optional().catch(undefined);

const common = {
  q: optional(z.string().trim().min(1).max(100)),
  profile: optional(z.enum(profileValues)),
  status: optional(z.enum(['draft', 'published'])),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
};

const productSchema = z.object({
  ...common,
  category: optional(z.coerce.number().int().positive()),
  attention: optional(z.enum(['any', 'review', 'blocked'])),
  missing: optional(z.enum(['photo', 'summary'])),
  sort: z.enum(['-updatedAt', 'updatedAt', 'title', '-title']).catch('-updatedAt'),
});

const variantSchema = z.object({
  ...common,
  product: optional(z.coerce.number().int().positive()),
  attention: optional(z.enum(['any', 'review', 'blocked'])),
  unverified: optional(z.literal('1')),
  sort: z.enum(['sku', '-sku', '-updatedAt', 'updatedAt']).catch('sku'),
});

export type ProductParams = z.infer<typeof productSchema>;
export type VariantParams = z.infer<typeof variantSchema>;

const flatten = (raw: RawParams) => Object.fromEntries(Object.entries(raw).map(([key, value]) => [key, first(value)]));
export const parseProductParams = (raw: RawParams): ProductParams => productSchema.parse(flatten(raw));
export const parseVariantParams = (raw: RawParams): VariantParams => variantSchema.parse(flatten(raw));

const attentionWhere = (attention: 'any' | 'review' | 'blocked'): Where =>
  attention === 'any' ? { reviewState: { in: ['review', 'blocked'] } } : { reviewState: { equals: attention } };

/**
 * Lists read the latest drafts, so `_status` there is the draft's status, not what the site shows.
 * `liveIds` are documents whose published state matches `params.status`.
 */
const liveWhere = (liveIds: number[]): Where => ({ id: { in: liveIds.length ? liveIds : [0] } });

/** `skuProductIds` are parents of variants whose article matched `q`. */
export function productWhere(params: ProductParams, { skuProductIds = [], liveIds = [] }: { skuProductIds?: number[]; liveIds?: number[] } = {}): Where {
  const and: Where[] = [];
  if (params.q) {
    const or: Where[] = [{ title: { like: params.q } }, { slug: { like: params.q } }, { sku: { like: params.q } }];
    if (/^\d+$/.test(params.q)) or.push({ id: { equals: Number(params.q) } });
    if (skuProductIds.length) or.push({ id: { in: skuProductIds } });
    and.push({ or });
  }
  if (params.category) and.push({ or: [{ category: { equals: params.category } }, { additionalCategories: { in: [params.category] } }] });
  if (params.profile) and.push({ profile: { equals: params.profile } });
  if (params.status) and.push(liveWhere(liveIds));
  if (params.attention) and.push(attentionWhere(params.attention));
  if (params.missing === 'photo') and.push({ image: { exists: false } });
  if (params.missing === 'summary') and.push({ or: [{ summary: { exists: false } }, { summary: { equals: '' } }] });
  return and.length ? { and } : {};
}

export function variantWhere(params: VariantParams, liveIds: number[] = []): Where {
  const and: Where[] = [];
  if (params.q) and.push({ or: [{ sku: { like: params.q } }, { title: { like: params.q } }, { externalId: { equals: params.q } }] });
  if (params.product) and.push({ product: { equals: params.product } });
  if (params.profile) and.push({ profile: { equals: params.profile } });
  if (params.status) and.push(liveWhere(liveIds));
  if (params.attention) and.push(attentionWhere(params.attention));
  if (params.unverified) and.push({ or: [{ 'packaging.unitsVerified': { equals: false } }, { 'packaging.unitsVerified': { exists: false } }] });
  return and.length ? { and } : {};
}

export const publishState = (live: ReadonlyMap<number, 'draft' | 'published'>, id: number, latest?: 'draft' | 'published' | null): PublishState =>
  live.get(id) !== 'published' ? 'draft' : latest === 'draft' ? 'changed' : 'published';

/** The first click sorts ascending, the next one flips the direction. */
export function sortState(sort: string, field: string, hrefFor: (sort: string) => string) {
  const direction = sort === field ? ('asc' as const) : sort === `-${field}` ? ('desc' as const) : undefined;
  return { href: hrefFor(direction === 'asc' ? `-${field}` : field), direction };
}

/** Serialises params back into a query string, dropping defaults so links stay short. */
export function toSearch(params: Record<string, string | number | undefined>, defaults: Record<string, string | number> = {}) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === '' || defaults[key] === value || (key === 'page' && value === 1)) continue;
    search.set(key, String(value));
  }
  const text = search.toString();
  return text ? `?${text}` : '';
}
