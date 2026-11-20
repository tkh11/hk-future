import { productMarkdown } from '@/content/product-markdown';
import { z } from 'zod';
import { profileValues } from './labels';

export const productKinds = [
  { value: 'family', label: 'Семейство с номенклатурой' },
  { value: 'single', label: 'Один артикул' },
  { value: 'request', label: 'Подбор по запросу' },
] as const;
export type ProductKind = (typeof productKinds)[number]['value'];

export const SUMMARY_LIMIT = 160;
export const SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

const text = (max: number) => z.string().max(max);
const id = z.number().int().positive();

/** Rows keep their ids and legacy link ids, so saving a toggle never drops data the form does not show. */
const documentRow = z.object({
  id: z.string().max(64).nullable().optional(),
  document: id,
  visible: z.boolean(),
  legacyLinkIds: z.array(z.object({ id: z.string().max(64).nullable().optional(), value: z.string().max(200).nullable().optional() })).max(50).optional(),
});

const galleryRow = z.object({
  id: z.string().max(64).nullable().optional(),
  file: id,
  role: z.enum(['main', 'gallery', 'technical']),
  caption: text(200),
});

export const productValuesSchema = z.object({
  title: text(200),
  productKind: z.enum(['single', 'family', 'request']),
  profile: z.enum(profileValues).nullable(),
  category: id.nullable(),
  additionalCategories: z.array(id).max(20),
  sku: text(100),
  summary: text(2000),
  description: text(10_000),
  characteristics: text(20_000),
  documentsText: text(5000),
  videoText: text(5000),
  slug: z.string().max(150).refine(v => v === '' || SLUG_PATTERN.test(v), 'Латинские буквы, цифры и дефисы.'),
  externalId: text(100),
  sortOrder: z.number().int().min(-100_000).max(100_000).nullable(),
  titleEn: text(200),
  descriptionEn: text(10_000),
  characteristicsEn: text(20_000),
  documentsTextEn: text(5000),
  reviewState: z.enum(['ready', 'review', 'blocked']),
  reviewNotes: text(5000),
  catalogDocuments: z.array(documentRow).max(200),
  gallery: z.array(galleryRow).max(50),
  publicationRequested: z.boolean(),
});

export type ProductValues = z.infer<typeof productValuesSchema>;
export type ProductField = keyof ProductValues;
export const productPatchSchema = productValuesSchema.partial();
export type ProductPatch = z.infer<typeof productPatchSchema>;

export const fieldLabels: Record<ProductField, string> = {
  title: 'Название', productKind: 'Как продаётся', profile: 'Тип продукции', category: 'Раздел каталога',
  additionalCategories: 'Также в разделах', sku: 'Артикул', summary: 'Краткое описание', description: 'Описание',
  characteristics: 'Общие характеристики', documentsText: 'Примечания к документам', videoText: 'Примечания к видео',
  slug: 'Адрес', externalId: 'ID в 1С', sortOrder: 'Порядок', titleEn: 'Название EN', descriptionEn: 'Описание EN',
  characteristicsEn: 'Характеристики EN', documentsTextEn: 'Документы EN', reviewState: 'Проверка данных',
  reviewNotes: 'Что нужно проверить', catalogDocuments: 'Документы', gallery: 'Галерея', publicationRequested: 'Запрос на публикацию',
};

/** Empty strings become null for optional and unique columns: two blank SKUs must not collide. */
const nullable = new Set<ProductField>(['sku', 'externalId', 'summary', 'description', 'characteristics', 'documentsText', 'videoText', 'titleEn', 'descriptionEn', 'characteristicsEn', 'documentsTextEn', 'reviewNotes']);

export function toPayloadData(patch: ProductPatch) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch) as [ProductField, unknown][]) {
    data[key] = typeof value === 'string' && nullable.has(key) && !value.trim() ? null : value;
  }
  return data;
}

type Rel = number | { id: number } | null | undefined;
const relId = (value: Rel) => (typeof value === 'number' ? value : value?.id ?? null);
const str = (value: unknown) => (typeof value === 'string' ? value : '');

/** Accepts a Payload product document (any depth) and returns what the form edits. */
export function fromDocument(doc: Record<string, unknown>): ProductValues {
  const rows = Array.isArray(doc.catalogDocuments) ? (doc.catalogDocuments as Record<string, unknown>[]) : [];
  return {
    title: str(doc.title),
    productKind: (['single', 'family', 'request'] as const).find(k => k === doc.productKind) ?? 'family',
    profile: (profileValues as readonly string[]).includes(str(doc.profile)) ? (doc.profile as ProductValues['profile']) : null,
    category: relId(doc.category as Rel),
    additionalCategories: Array.isArray(doc.additionalCategories) ? (doc.additionalCategories as Rel[]).flatMap(c => relId(c) ?? []) : [],
    sku: str(doc.sku), summary: str(doc.summary), description: productMarkdown(str(doc.description)), characteristics: productMarkdown(str(doc.characteristics), true),
    documentsText: str(doc.documentsText), videoText: str(doc.videoText), slug: str(doc.slug), externalId: str(doc.externalId),
    sortOrder: typeof doc.sortOrder === 'number' ? doc.sortOrder : null,
    titleEn: str(doc.titleEn), descriptionEn: str(doc.descriptionEn), characteristicsEn: str(doc.characteristicsEn), documentsTextEn: str(doc.documentsTextEn),
    reviewState: (['ready', 'review', 'blocked'] as const).find(k => k === doc.reviewState) ?? 'ready',
    reviewNotes: str(doc.reviewNotes),
    publicationRequested: doc.publicationRequested === true,
    gallery: (Array.isArray(doc.gallery) ? doc.gallery as Record<string, unknown>[] : []).flatMap(row => {
      const file = relId(row.file as Rel);
      if (!file) return [];
      const role = row.role === 'main' || row.role === 'technical' ? row.role : 'gallery';
      return [{ id: (row.id as string | null) ?? null, file, role, caption: str(row.caption) }];
    }),
    catalogDocuments: rows.flatMap(row => {
      const document = relId(row.document as Rel);
      if (!document) return [];
      const legacy = Array.isArray(row.legacyLinkIds) ? (row.legacyLinkIds as { id?: string | null; value?: string | null }[]) : [];
      return [{ id: (row.id as string | null) ?? null, document, visible: row.visible !== false, legacyLinkIds: legacy.map(l => ({ id: l.id ?? null, value: l.value ?? null })) }];
    }),
  };
}

const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);

export type Facts = {
  photos: number;
  categoryPublished: boolean;
  variants: number;
  variantsToReview: number;
  documents: number;
};

export type ReadinessItem = { key: string; label: string; ok: boolean; blocking: boolean; field: string };

/** Blocking items are the ones Payload refuses to publish without; the rest show what visitors will miss. */
export function readiness(values: ProductValues, facts: Facts): ReadinessItem[] {
  const items: ReadinessItem[] = [
    { key: 'title', label: 'Название и раздел', ok: !!values.title.trim() && !!values.category, blocking: true, field: values.title.trim() ? 'category' : 'title' },
    { key: 'slug', label: 'Адрес на сайте', ok: SLUG_PATTERN.test(values.slug), blocking: true, field: 'slug' },
  ];
  if (values.productKind === 'single') items.push({ key: 'sku', label: 'Артикул', ok: !!values.sku.trim(), blocking: true, field: 'sku' });
  items.push(
    { key: 'review', label: 'Проверка данных завершена', ok: values.reviewState === 'ready', blocking: true, field: 'reviewState' },
    { key: 'categoryPublished', label: 'Раздел опубликован', ok: facts.categoryPublished, blocking: false, field: 'category' },
    { key: 'photo', label: 'Главное фото', ok: facts.photos > 0, blocking: false, field: 'gallery' },
    { key: 'summary', label: 'Краткое описание', ok: !!values.summary.trim(), blocking: false, field: 'summary' },
  );
  if (values.productKind === 'family') {
    items.push({ key: 'variants', label: facts.variants ? `Номенклатура проверена · ${facts.variants}` : 'Есть номенклатура', ok: facts.variants > 0 && facts.variantsToReview === 0, blocking: false, field: 'variants' });
  }
  items.push({ key: 'documents', label: `Документы · ${facts.documents}`, ok: facts.documents > 0, blocking: false, field: 'documents' });
  return items;
}

export type Difference = { field: ProductField; label: string; before: string; after: string };

const shown = (field: ProductField, value: unknown, names: ReadonlyMap<number, string>): string => {
  if (value === null || value === undefined || value === '') return '—';
  if (field === 'category') return names.get(value as number) ?? `Раздел ${value}`;
  if (field === 'additionalCategories') return (value as number[]).map(v => names.get(v) ?? String(v)).join(', ') || '—';
  if (field === 'productKind') return productKinds.find(k => k.value === value)?.label ?? String(value);
  if (field === 'catalogDocuments') {
    const rows = value as ProductValues['catalogDocuments'];
    return `${rows.filter(r => r.visible).length} из ${rows.length} показаны`;
  }
  return String(value);
};

/** «Было / Станет»: the public copy against the latest draft, field by field. */
export function differences(published: ProductValues, draft: ProductValues, categoryNames: ReadonlyMap<number, string> = new Map()): Difference[] {
  return (Object.keys(fieldLabels) as ProductField[]).flatMap(field => {
    const a = field === 'catalogDocuments' ? published[field].map(({ document, visible }) => ({ document, visible })) : published[field];
    const b = field === 'catalogDocuments' ? draft[field].map(({ document, visible }) => ({ document, visible })) : draft[field];
    if (same(a, b)) return [];
    return [{ field, label: fieldLabels[field], before: shown(field, published[field], categoryNames), after: shown(field, draft[field], categoryNames) }];
  });
}
