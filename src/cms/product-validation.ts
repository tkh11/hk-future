import { z } from 'zod';
import { ValidationError, type CollectionBeforeValidateHook } from 'payload';
import { plainContentText } from '../content/cms-schemas';

const key = z.string().max(100).regex(/^[a-z0-9][a-z0-9_-]*$/, 'Ключ: латинские строчные буквы, цифры, дефис или подчёркивание.');
const label = plainContentText.max(100).refine(value => value.trim().length > 0, 'Укажите название характеристики.');
const valueFields = {
  textValue: plainContentText.nullish(), numberValue: z.number().finite().nullish(),
  booleanValue: z.boolean().nullish(), unit: plainContentText.max(32).nullish(),
};
const attribute = z.object({ key, label, valueType: z.enum(['text', 'number', 'boolean']), ...valueFields }).superRefine((value, context) => {
  const field = `${value.valueType}Value` as 'textValue' | 'numberValue' | 'booleanValue';
  const actual = value[field];
  if (actual == null || typeof actual === 'string' && actual.trim().length === 0) {
    context.addIssue({ code: 'custom', path: [field], message: 'Заполните значение выбранного типа перед публикацией.' });
  }
});
const draftAttribute = z.object({
  key: key.or(z.literal('')).nullish(), label: plainContentText.max(100).nullish(),
  valueType: z.enum(['text', 'number', 'boolean']).nullish(), ...valueFields,
});
function uniqueKeys(rows: { key?: string | null }[], context: z.RefinementCtx) {
  const keys = new Set<string>();
  for (const [index, row] of rows.entries()) {
    if (row.key && keys.has(row.key)) context.addIssue({ code: 'custom', path: [index, 'key'], message: 'Ключи характеристик не должны повторяться.' });
    if (row.key) keys.add(row.key);
  }
}
export const productAttributesSchema = z.array(attribute).max(100).superRefine(uniqueKeys);
export const draftProductAttributesSchema = z.array(draftAttribute).max(100).superRefine(uniqueKeys);

const relationID = (value: unknown): string | number | null => {
  if (typeof value === 'string' || typeof value === 'number') return value;
  if (value && typeof value === 'object' && 'id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) return value.id;
  return null;
};

/** Draft autosaves may be incomplete; publishing validates the merged document. */
export const validateProduct: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const document = { ...originalDoc, ...data };
  const publishing = document._status === 'published';
  const parsed = (publishing ? productAttributesSchema : draftProductAttributesSchema).safeParse(document.attributes ?? []);
  const errors = parsed.success ? [] : parsed.error.issues.map(issue => ({ path: ['attributes', ...issue.path].join('.'), message: issue.message }));
  if (publishing && (!document.productKind || document.productKind === 'single') && !document.sku?.trim()) errors.push({path:'sku',message:'Укажите артикул товара.'});
  const seriesID = relationID(document.series);
  const categoryID = relationID(document.category);
  if (seriesID !== null) {
    const series = await req.payload.find({ collection: 'product-series', where: { id: { equals: seriesID } }, limit: 1, depth: 0,
      draft: !publishing, req, user: req.user, overrideAccess: false });
    const seriesCategory = relationID(series.docs[0]?.category);
    if (categoryID === null || seriesCategory === null || String(seriesCategory) !== String(categoryID)) {
      errors.push({ path: 'series', message: 'Серия должна принадлежать выбранной категории товара.' });
    }
  }
  if (errors.length) throw new ValidationError({ collection: 'products', id: originalDoc?.id, errors, req });
  return data;
};
