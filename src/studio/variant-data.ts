import 'server-only';
import type { Media } from '@/cms/payload-types';
import { fetchListPage } from './pagination';
import { getCategories, liveStatus } from './data';
import type { PublishState } from './labels';
import { lockHolder } from './locks';
import { publishState } from './query';
import type { StudioSession } from './session';
import { getMediaOptions } from './media-data';
import { fromVariant, type VariantValues } from './variant-form';

const scoped = (s: StudioSession) => ({ overrideAccess: false, user: s.user }) as const;
const asMedia = (value: unknown) => (value && typeof value === 'object' && 'url' in value ? (value as Media) : null);
const relId = (value: number | { id: number } | null | undefined) => (typeof value === 'number' ? value : value?.id ?? null);

export type VariantGalleryItem = { url: string; alt: string; role: 'main' | 'gallery' | 'technical' };
export type VariantListItem = { id: number; values: VariantValues; status: PublishState; updatedAt: string };

export async function getProductVariantRows(s: StudioSession, productId: number, page: number, limit: number) {
  const { result, paging } = await fetchListPage({ page, limit }, page => s.payload.find({
    collection: 'product-variants', draft: true, where: { product: { equals: productId } },
    sort: ['sortOrder', 'id'], page, limit, depth: 0, ...scoped(s),
  }));
  const map = await liveStatus(s, 'product-variants', result.docs.map(doc => doc.id));
  const rows: VariantListItem[] = result.docs.map(doc => ({
    id: doc.id, values: fromVariant(doc as unknown as Record<string, unknown>),
    status: publishState(map, doc.id, doc._status), updatedAt: doc.updatedAt,
  }));
  return { rows, ...paging };
}

export async function getVariantEditor(s: StudioSession, id: number) {
  const draft = await s.payload.findByID({
    collection: 'product-variants', id, draft: true, depth: 1, disableErrors: true,
    populate: { media: { url: true, alt: true, filename: true }, products: { title: true, profile: true } },
    ...scoped(s),
  });
  if (!draft) return null;
  const productId = relId(draft.product);
  const [live, versions, holder, products, media] = await Promise.all([
    s.payload.findByID({ collection: 'product-variants', id, depth: 0, select: { _status: true }, disableErrors: true, ...scoped(s) }),
    s.payload.findVersions({ collection: 'product-variants', where: { parent: { equals: id } }, sort: '-updatedAt', limit: 12, depth: 0, ...scoped(s) }),
    lockHolder(s, 'product-variants', id),
    s.payload.find({ collection: 'products', draft: true, pagination: false, depth: 0, sort: 'title', select: { title: true, profile: true }, ...scoped(s) }),
    getMediaOptions(s),
  ]);
  const values = fromVariant(draft as unknown as Record<string, unknown>);
  const gallery: VariantGalleryItem[] = (draft.gallery ?? []).flatMap(item => {
    const media = asMedia(item.file);
    return media?.url ? [{ url: media.url, alt: media.alt ?? '', role: item.role ?? 'gallery' }] : [];
  });
  return {
    id, values, gallery, holder, updatedAt: draft.updatedAt,
    status: publishState(new Map([[id, live?._status ?? 'draft']]), id, draft._status) as PublishState,
    media,
    productTitle: draft.product && typeof draft.product === 'object' ? draft.product.title : null,
    products: products.docs.map(p => ({ id: p.id, title: p.title, profile: p.profile ?? null })),
    versions: versions.docs.map(v => ({
      id: String(v.id), at: v.updatedAt, status: v.version._status === 'published' ? 'published' as const : 'draft' as const,
      autosave: (v as { autosave?: boolean }).autosave === true, latest: v.latest === true,
    })),
    archive: { sourceSlug: draft.sourceSlug ?? null, legacyIds: (draft.legacyIds ?? []).flatMap(l => l.value ?? []) },
    categories: await getCategories(s),
    productId,
  };
}

export type VariantEditorData = NonNullable<Awaited<ReturnType<typeof getVariantEditor>>>;
