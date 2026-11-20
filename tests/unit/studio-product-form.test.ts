// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { changedFields } from '../../src/studio/form-utils';
import { differences, fromDocument, productPatchSchema, readiness, toPayloadData } from '../../src/studio/product-form';

const doc = {
  id: 5, title: 'Насос HMV', slug: 'nasos-hmv', productKind: 'family', profile: 'pump', category: { id: 3, title: 'Насосы' },
  additionalCategories: [4, { id: 6 }], sku: null, summary: '', reviewState: 'ready', sortOrder: 20,
  catalogDocuments: [{ id: 'row1', document: { id: 9, title: 'Паспорт' }, visible: true, legacyLinkIds: [{ id: 'l1', value: '77' }] }],
};
const facts = { photos: 1, categoryPublished: true, variants: 3, variantsToReview: 0, documents: 1 };

describe('product form', () => {
  it('reads populated and unpopulated relations and keeps legacy link ids', () => {
    const values = fromDocument(doc);
    expect(values.category).toBe(3);
    expect(values.additionalCategories).toEqual([4, 6]);
    expect(values.sku).toBe('');
    expect(values.catalogDocuments).toEqual([{ id: 'row1', document: 9, visible: true, legacyLinkIds: [{ id: 'l1', value: '77' }] }]);
  });

  it('sends only changed fields and stores blank SKUs as null', () => {
    const saved = fromDocument(doc);
    const patch = changedFields(saved, { ...saved, sku: '  ', summary: 'Коротко' });
    expect(Object.keys(patch)).toEqual(['sku', 'summary']);
    expect(toPayloadData(patch)).toEqual({ sku: null, summary: 'Коротко' });
    expect(productPatchSchema.safeParse({ slug: 'Bad Slug' }).success).toBe(false);
  });

  it('marks only what blocks publication as blocking', () => {
    const values = { ...fromDocument(doc), productKind: 'single' as const, reviewState: 'review' as const };
    const items = readiness(values, { ...facts, photos: 0 });
    expect(items.filter(i => i.blocking && !i.ok).map(i => i.key)).toEqual(['sku', 'review']);
    expect(items.find(i => i.key === 'photo')).toMatchObject({ ok: false, blocking: false, field: 'gallery' });
    expect(items.some(i => i.key === 'variants')).toBe(false);
  });

  it('lists public versus draft differences with readable values', () => {
    const published = fromDocument(doc);
    const draft = { ...published, category: 4, catalogDocuments: [{ ...published.catalogDocuments[0], visible: false }], productKind: 'single' as const };
    const names = new Map([[3, 'Насосы'], [4, 'Скважинные']]);
    expect(differences(published, draft, names)).toEqual([
      { field: 'productKind', label: 'Как продаётся', before: 'Семейство с номенклатурой', after: 'Один артикул' },
      { field: 'category', label: 'Раздел каталога', before: 'Насосы', after: 'Скважинные' },
      { field: 'catalogDocuments', label: 'Документы', before: '1 из 1 показаны', after: '0 из 1 показаны' },
    ]);
  });
});
