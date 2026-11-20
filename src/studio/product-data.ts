import 'server-only';
import type { Media } from '@/cms/payload-types';
import { getCategories } from './data';
import type { PublishState } from './labels';
import { publishState } from './query';
import { lockHolder } from './locks';
import { fromDocument, type Facts, type ProductValues } from './product-form';
import type { StudioSession } from './session';
import { getMediaOptions } from './media-data';
import { getProductVariantRows } from './variant-data';

const scoped = (s: StudioSession) => ({ overrideAccess: false, user: s.user }) as const;
const asMedia = (value: unknown) => (value && typeof value === 'object' && 'url' in value ? (value as Media) : null);

export type VersionEntry = { id: string; at: string; status: 'draft' | 'published'; autosave: boolean; latest: boolean };
export type GalleryItem = { url: string; alt: string; role: 'main' | 'gallery' | 'technical' };
export type DocumentInfo = { id: number; title: string; kind: string | null; published: boolean };

export async function getProductEditor(s: StudioSession, id: number, page: number, limit: number) {
  const draft = await s.payload.findByID({
    collection: 'products', id, draft: true, depth: 1, disableErrors: true,
    populate: { media: { url: true, alt: true, filename: true }, categories: { title: true, path: true }, 'catalog-documents': { title: true, kind: true, _status: true } },
    joins: false,
    ...scoped(s),
  });
  if (!draft) return null;
  const categoryId = typeof draft.category === 'number' ? draft.category : draft.category?.id;

  const [live, versions, holder, categories, variantCount, toReview, liveCategory, variantRows, media, library] = await Promise.all([
    s.payload.findByID({ collection: 'products', id, depth: 0, joins: false, disableErrors: true, ...scoped(s) }),
    s.payload.findVersions({ collection: 'products', where: { parent: { equals: id } }, sort: '-updatedAt', limit: 12, depth: 0, ...scoped(s) }),
    lockHolder(s, 'products', id),
    getCategories(s),
    s.payload.count({ collection: 'product-variants', where: { product: { equals: id } }, ...scoped(s) }),
    s.payload.count({ collection: 'product-variants', where: { and: [{ product: { equals: id } }, { reviewState: { not_equals: 'ready' } }] }, ...scoped(s) }),
    categoryId ? s.payload.count({ collection: 'categories', where: { and: [{ id: { equals: categoryId } }, { _status: { equals: 'published' } }] }, ...scoped(s) }) : null,
    getProductVariantRows(s, id, page, limit),
    getMediaOptions(s, true),
    s.payload.find({ collection: 'catalog-documents', draft: true, pagination: false, depth: 0, sort: 'title', select: { title: true, kind: true, _status: true }, ...scoped(s) }),
  ]);

  const published = live?._status === 'published' ? fromDocument(live as unknown as Record<string, unknown>) : null;
  const values = fromDocument(draft as unknown as Record<string, unknown>);
  const status: PublishState = publishState(new Map([[id, live?._status ?? 'draft']]), id, draft._status);
  const gallery: GalleryItem[] = (draft.gallery ?? []).flatMap(item => {
    const media = asMedia(item.file);
    return media?.url ? [{ url: media.url, alt: media.alt ?? '', role: item.role ?? 'gallery' }] : [];
  });
  const attached = new Map((draft.catalogDocuments ?? []).flatMap(row => {
    const doc = row.document;
    return doc && typeof doc === 'object' ? [[doc.id, { id: doc.id, title: doc.title, kind: doc.kind ?? null, published: doc._status === 'published' }]] : [];
  }));
  const documents: DocumentInfo[] = library.docs.map(doc => attached.get(doc.id) ?? {
    id: doc.id, title: doc.title, kind: doc.kind ?? null, published: doc._status === 'published',
  });
  const variants = variantCount.totalDocs;
  const facts: Facts = {
    photos: values.gallery.length,
    categoryPublished: (liveCategory?.totalDocs ?? 0) > 0,
    variants,
    variantsToReview: toReview.totalDocs,
    documents: values.catalogDocuments.filter(d => d.visible).length,
  };

  return {
    id, values, published, status, updatedAt: draft.updatedAt, publishedAt: published ? live!.updatedAt : null,
    liveSlug: published ? live!.slug : null,
    gallery, documents, facts, holder, variants: variantRows, media,
    categories,
    versions: versions.docs.map((v): VersionEntry => ({ id: String(v.id), at: v.updatedAt, status: v.version._status === 'published' ? 'published' : 'draft', autosave: (v as { autosave?: boolean }).autosave === true, latest: v.latest === true })),
    archive: { resources: draft.resources?.length ?? 0, legacyIds: (draft.legacyIds ?? []).flatMap(l => l.value ?? []), sourceSlug: draft.sourceSlug ?? null },
  };
}

export type ProductEditorData = NonNullable<Awaited<ReturnType<typeof getProductEditor>>>;
export type { ProductValues };
