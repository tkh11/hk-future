import 'server-only';
import { fetchListPage } from './pagination';
import type { Where } from 'payload';
import type { Media } from '@/cms/payload-types';
import type { StudioSession } from './session';

const scoped = (s: StudioSession) => ({ overrideAccess: false, user: s.user }) as const;

export type MediaKind = 'photo' | 'drawing' | 'document' | 'unused';
export type MediaCard = {
  id: number; url: string; alt: string; title: string; filename: string; mime: string; kind: 'photo' | 'drawing' | 'document';
  used: boolean; published: boolean; width: number | null; height: number | null; filesize: number | null;
  thumb: string; missingSizes: boolean;
};

const thumbOf = (doc: Media) => {
  const sizes = (doc as Media & { sizes?: Record<string, { url?: string | null }> }).sizes;
  return sizes?.thumb?.url || sizes?.card?.url || doc.url || '';
};
const missingSizes = (doc: Media) => {
  if (!doc.mimeType?.startsWith('image/')) return false;
  const sizes = (doc as Media & { sizes?: Record<string, { url?: string | null }> }).sizes;
  return !sizes?.thumb?.url || !sizes?.card?.url || !sizes?.wide?.url;
};

export async function usedMediaIds(s: StudioSession) {
  const [products, variants, categories, documents, pumpDrafts, pumpPublished] = await Promise.all([
    s.payload.find({ collection: 'products', draft: true, pagination: false, depth: 0, select: { gallery: true }, ...scoped(s) }),
    s.payload.find({ collection: 'product-variants', draft: true, pagination: false, depth: 0, select: { gallery: true }, ...scoped(s) }),
    s.payload.find({ collection: 'categories', draft: true, pagination: false, depth: 0, select: { image: true }, ...scoped(s) }),
    s.payload.find({ collection: 'catalog-documents', draft: true, pagination: false, depth: 0, select: { file: true, cover: true }, ...scoped(s) }),
    s.payload.find({ collection: 'pump-selection-records', draft: true, pagination: false, depth: 0, select: { pumpSelection: { photo: true, drawing: true, sourcePdf: true } }, ...scoped(s) }),
    s.payload.find({ collection: 'pump-selection-records', draft: false, pagination: false, depth: 0, select: { pumpSelection: { photo: true, drawing: true, sourcePdf: true } }, ...scoped(s) }),
  ]);
  const ids = new Set<number>();
  const add = (value: unknown) => { if (typeof value === 'number') ids.add(value); else if (value && typeof value === 'object' && 'id' in value) ids.add((value as { id: number }).id); };
  for (const p of products.docs) for (const item of p.gallery ?? []) add(item.file);
  for (const v of variants.docs) for (const item of v.gallery ?? []) add(item.file);
  for (const { pumpSelection } of [...pumpDrafts.docs, ...pumpPublished.docs]) {
    add(pumpSelection?.photo); add(pumpSelection?.drawing); add(pumpSelection?.sourcePdf);
  }
  for (const c of categories.docs) add(c.image);
  for (const d of documents.docs) { add(d.file); add(d.cover); }
  return ids;
}

const drawingWords = ['чертёж', 'чертеж', 'drawing', 'technical'];
const drawingWhere: Where = { or: drawingWords.map(word => ({ alt: { contains: word } })) };

export async function getMediaLibrary(s: StudioSession, filter: MediaKind | undefined, params: { page: number; limit: number }) {
  const used = await usedMediaIds(s);
  const where: Where = {};
  if (filter === 'unused' && used.size) where.id = { not_in: [...used] };
  if (filter === 'document') where.mimeType = { equals: 'application/pdf' };
  if (filter === 'photo' || filter === 'drawing') {
    where.mimeType = { contains: 'image/' };
    where.and = filter === 'drawing' ? [drawingWhere] : drawingWords.map(word => ({ alt: { not_like: `%${word}%` } }));
  }
  const { result, paging } = await fetchListPage(params, page => s.payload.find({
    collection: 'media', draft: true, where, sort: ['-updatedAt', 'id'], page, limit: params.limit, depth: 0, ...scoped(s),
  }));
  const cards: MediaCard[] = result.docs.flatMap(doc => {
    if (!doc.url) return [];
    const kind = doc.mimeType === 'application/pdf' ? 'document' : drawingWords.some(word => doc.alt.toLowerCase().includes(word)) ? 'drawing' : 'photo';
    const usedHere = used.has(doc.id);
    return [{
      id: doc.id, url: doc.url, alt: doc.alt, title: doc.title || doc.filename || `Файл ${doc.id}`, filename: doc.filename ?? '',
      mime: doc.mimeType ?? '', kind, used: usedHere, published: doc._status === 'published',
      width: doc.width ?? null, height: doc.height ?? null, filesize: doc.filesize ?? null,
      thumb: thumbOf(doc) || doc.url, missingSizes: missingSizes(doc),
    }];
  });
  return { cards, paging };
}

export async function getMediaOptions(s: StudioSession, imagesOnly = true) {
  const result = await s.payload.find({
    collection: 'media', draft: true, pagination: false, depth: 0, sort: '-updatedAt',
    where: imagesOnly ? { mimeType: { contains: 'image/' } } : undefined,
    select: { url: true, alt: true, filename: true, title: true, mimeType: true, _status: true }, ...scoped(s),
  });
  return result.docs.flatMap(d => d.url ? [{ id: d.id, url: d.url, alt: d.alt, title: d.title || d.filename || `Файл ${d.id}`, mime: d.mimeType ?? '', published: d._status === 'published' }] : []);
}
