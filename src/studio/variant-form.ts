import { z } from 'zod';
import definitions from '@/cms/catalog-definitions.json' with { type: 'json' };
import { changedFields } from './form-utils';
import { colors, profileValues, type Color, type Profile } from './labels';

const specKeys = definitions.fields.map(f => f.key) as [string, ...string[]];
const colorValues = colors.map(c => c.value) as [Color, ...Color[]];
const text = (max: number) => z.string().max(max);
const id = z.number().int().positive();
const num = z.number().finite().nullable();

export const specSchema = z.object(Object.fromEntries(specKeys.map(key => [key, num])) as Record<(typeof specKeys)[number], typeof num>);
export type Specs = z.infer<typeof specSchema>;

export const packagingSchema = z.object({
  weightValue: num, weightUnit: text(32), weightNote: text(200),
  amountValue: num, amountUnit: text(32), amountNote: text(200),
  volumeValue: num, volumeUnit: text(32), volumeNote: text(200),
  unitsVerified: z.boolean(),
});
export type Packaging = z.infer<typeof packagingSchema>;

const galleryRow = z.object({
  id: z.string().max(64).nullable().optional(),
  file: id,
  role: z.enum(['main', 'gallery', 'technical']),
  caption: text(200),
});

export const variantValuesSchema = z.object({
  title: text(200).min(1, 'Введите название.'),
  product: id.nullable(),
  sku: text(100),
  profile: z.enum(profileValues).nullable(),
  size: text(100),
  connection: text(100),
  color: z.enum(colorValues).nullable(),
  sortOrder: z.number().int().min(-100_000).max(100_000).nullable(),
  specs: specSchema,
  packaging: packagingSchema,
  gallery: z.array(galleryRow).max(50),
  reviewState: z.enum(['ready', 'review', 'blocked']),
  reviewNotes: text(5000),
});

export type VariantValues = z.infer<typeof variantValuesSchema>;
export type VariantField = keyof VariantValues;
export const variantPatchSchema = variantValuesSchema.partial().extend({ specs: specSchema.partial().optional() });
export type VariantPatch = z.infer<typeof variantPatchSchema>;

export function variantDraftPatch(patch: Partial<VariantValues>, previous: Pick<VariantValues, 'specs'>): VariantPatch {
  return patch.specs ? { ...patch, specs: changedFields(previous.specs, patch.specs) } : patch;
}

export const variantFieldLabels: Record<VariantField, string> = {
  title: 'Название', product: 'Товар', sku: 'Артикул', profile: 'Тип продукции', size: 'Размер',
  connection: 'Присоединение', color: 'Цвет', sortOrder: 'Порядок', specs: 'Параметры', packaging: 'Упаковка',
  gallery: 'Галерея', reviewState: 'Проверка данных', reviewNotes: 'Что нужно проверить',
};

const emptySpecs = (): Specs => Object.fromEntries(specKeys.map(key => [key, null])) as Specs;
const emptyPackaging = (): Packaging => ({
  weightValue: null, weightUnit: '', weightNote: '', amountValue: null, amountUnit: '', amountNote: '',
  volumeValue: null, volumeUnit: '', volumeNote: '', unitsVerified: false,
});

type Rel = number | { id: number } | null | undefined;
const relId = (value: Rel) => (typeof value === 'number' ? value : value?.id ?? null);
const str = (value: unknown) => (typeof value === 'string' ? value : '');
const number = (value: unknown) => (typeof value === 'number' && Number.isFinite(value) ? value : null);

export function fromVariantSpecs(value: unknown): Specs {
  const specs = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return Object.fromEntries(specKeys.map(key => [key, number(specs[key])])) as Specs;
}

export function fromVariant(doc: Record<string, unknown>): VariantValues {
  const pack = (doc.packaging && typeof doc.packaging === 'object' ? doc.packaging : {}) as Record<string, unknown>;
  return {
    title: str(doc.title),
    product: relId(doc.product as Rel),
    sku: str(doc.sku),
    profile: (profileValues as readonly string[]).includes(str(doc.profile)) ? (doc.profile as Profile) : null,
    size: str(doc.size), connection: str(doc.connection),
    color: colorValues.includes(str(doc.color) as Color) ? (doc.color as Color) : null,
    sortOrder: typeof doc.sortOrder === 'number' ? doc.sortOrder : null,
    specs: fromVariantSpecs(doc.specs),
    packaging: {
      weightValue: number(pack.weightValue), weightUnit: str(pack.weightUnit), weightNote: str(pack.weightNote),
      amountValue: number(pack.amountValue), amountUnit: str(pack.amountUnit), amountNote: str(pack.amountNote),
      volumeValue: number(pack.volumeValue), volumeUnit: str(pack.volumeUnit), volumeNote: str(pack.volumeNote),
      unitsVerified: pack.unitsVerified === true,
    },
    gallery: (Array.isArray(doc.gallery) ? doc.gallery as Record<string, unknown>[] : []).flatMap(row => {
      const file = relId(row.file as Rel);
      if (!file) return [];
      const role = row.role === 'main' || row.role === 'technical' ? row.role : 'gallery';
      return [{ id: (row.id as string | null) ?? null, file, role, caption: str(row.caption) }];
    }),
    reviewState: (['ready', 'review', 'blocked'] as const).find(k => k === doc.reviewState) ?? 'ready',
    reviewNotes: str(doc.reviewNotes),
  };
}

const nullable = new Set(['sku', 'size', 'connection', 'reviewNotes']);

export function toVariantData(patch: VariantPatch) {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(patch) as [VariantField, unknown][]) {
    if (key === 'packaging' && value && typeof value === 'object') {
      const pack = value as Packaging;
      data.packaging = {
        ...pack,
        weightUnit: pack.weightUnit.trim() || null, weightNote: pack.weightNote.trim() || null,
        amountUnit: pack.amountUnit.trim() || null, amountNote: pack.amountNote.trim() || null,
        volumeUnit: pack.volumeUnit.trim() || null, volumeNote: pack.volumeNote.trim() || null,
      };
    } else {
      data[key] = typeof value === 'string' && nullable.has(key) && !value.trim() ? null : value;
    }
  }
  return data;
}

export function blankVariant(product: number | null, profile: Profile | null): VariantValues {
  return {
    title: '', product, sku: '', profile, size: '', connection: '', color: null, sortOrder: 500,
    specs: emptySpecs(), packaging: emptyPackaging(), gallery: [], reviewState: 'ready', reviewNotes: '',
  };
}

/** Tab-separated rows from Excel: header must contain Артикул or SKU. */
export function parseVariantPaste(text: string, profile: Profile | null) {
  const lines = text.replace(/^\uFEFF/, '').trimEnd().split(/\r?\n/).filter(line => line.length);
  if (lines.length < 2) return { error: 'Вставьте таблицу с заголовком и хотя бы одной строкой.' as const, rows: [] as VariantPatch[] };
  const header = lines[0].split('\t').map(cell => cell.trim().toLowerCase());
  const index = (names: string[]) => names.reduce<number>((found, name) => (found >= 0 ? found : header.indexOf(name)), -1);
  const sku = index(['артикул', 'sku']);
  const title = index(['название', 'исполнение', 'title']);
  if (sku < 0 && title < 0) return { error: 'В первой строке нужны колонки «Артикул» или «Название».' as const, rows: [] as VariantPatch[] };
  const size = index(['размер', 'size']);
  const connection = index(['присоединение', 'connection']);
  const specIndex = Object.fromEntries(definitions.fields.filter(f => !profile || f.profiles.includes(profile)).map(f => {
    const aliases = [f.label.toLowerCase(), f.key.toLowerCase(), `${f.label.toLowerCase()}, ${f.unit}`.toLowerCase()];
    return [f.key, aliases.reduce((found, name) => (found >= 0 ? found : header.indexOf(name)), -1)];
  }));
  const rows: VariantPatch[] = [];
  for (const line of lines.slice(1)) {
    const cells = line.split('\t');
    const specs = { ...emptySpecs() };
    for (const [key, at] of Object.entries(specIndex)) {
      if (at < 0 || !cells[at]?.trim()) continue;
      const value = Number(cells[at].replace(',', '.').replace(/\s/g, ''));
      if (Number.isFinite(value)) specs[key] = value;
    }
    rows.push({
      sku: sku >= 0 ? cells[sku]?.trim() ?? '' : '',
      title: title >= 0 ? cells[title]?.trim() ?? '' : '',
      size: size >= 0 ? cells[size]?.trim() ?? '' : '',
      connection: connection >= 0 ? cells[connection]?.trim() ?? '' : '',
      specs,
    });
  }
  return { error: null, rows };
}
