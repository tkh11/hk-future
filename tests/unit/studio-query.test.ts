// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { parseProductParams, parseVariantParams, productWhere, publishState, sortState, toSearch, variantWhere } from '../../src/studio/query';

describe('Studio URL params', () => {
  it('keeps valid filters and falls back on anything malformed', () => {
    expect(parseProductParams({ q: '  HIP 40 ', profile: 'pump', status: 'published', page: '3', category: '7', attention: 'any', missing: 'photo', sort: 'title' }))
      .toEqual({ q: 'HIP 40', profile: 'pump', status: 'published', page: 3, limit: 50, category: 7, attention: 'any', missing: 'photo', sort: 'title' });
    expect(parseProductParams({ q: '   ', profile: 'rocket', status: 'gone', page: '-2', category: 'x', missing: 'price', sort: 'drop table' }))
      .toEqual({ page: 1, limit: 50, sort: '-updatedAt' });
  });

  it('reads the first value of repeated params', () => {
    expect(parseVariantParams({ product: ['12', '13'], unverified: '1' })).toEqual({ product: 12, unverified: '1', page: 1, limit: 10, sort: 'sku' });
    expect(parseVariantParams({ unverified: 'yes' })).toEqual({ page: 1, limit: 10, sort: 'sku' });
  });
});

describe('Studio list queries', () => {
  it('matches a product by its own fields, its numeric id and its variants', () => {
    const where = productWhere(parseProductParams({ q: '185' }), { skuProductIds: [4, 9] });
    expect(where).toEqual({
      and: [{ or: [{ title: { like: '185' } }, { slug: { like: '185' } }, { sku: { like: '185' } }, { id: { equals: 185 } }, { id: { in: [4, 9] } }] }],
    });
  });

  it('filters publication by the live documents, not by the latest draft', () => {
    expect(productWhere(parseProductParams({ status: 'published' }), { liveIds: [1, 2] })).toEqual({ and: [{ id: { in: [1, 2] } }] });
    expect(productWhere(parseProductParams({ status: 'draft' }))).toEqual({ and: [{ id: { in: [0] } }] });
    expect(variantWhere(parseVariantParams({ status: 'published' }), [5])).toEqual({ and: [{ id: { in: [5] } }] });
  });

  it('combines category, attention and missing data filters', () => {
    const where = productWhere(parseProductParams({ category: '3', attention: 'blocked', missing: 'summary' }));
    expect(where).toEqual({
      and: [
        { or: [{ category: { equals: 3 } }, { additionalCategories: { in: [3] } }] },
        { reviewState: { equals: 'blocked' } },
        { or: [{ summary: { exists: false } }, { summary: { equals: '' } }] },
      ],
    });
    expect(productWhere(parseProductParams({}))).toEqual({});
  });

  it('treats a missing packaging check as unverified', () => {
    expect(variantWhere(parseVariantParams({ unverified: '1', attention: 'any' }))).toEqual({
      and: [
        { reviewState: { in: ['review', 'blocked'] } },
        { or: [{ 'packaging.unitsVerified': { equals: false } }, { 'packaging.unitsVerified': { exists: false } }] },
      ],
    });
  });
});

describe('Studio list helpers', () => {
  it('shows a pending draft over a published card as changed', () => {
    const live = new Map([[1, 'published' as const], [2, 'draft' as const]]);
    expect(publishState(live, 1, 'draft')).toBe('changed');
    expect(publishState(live, 1, 'published')).toBe('published');
    expect(publishState(live, 2, 'draft')).toBe('draft');
    expect(publishState(live, 3, 'published')).toBe('draft');
  });

  it('sorts ascending first and flips on the next click', () => {
    const href = (sort: string) => `?sort=${sort}`;
    expect(sortState('-updatedAt', 'title', href)).toEqual({ href: '?sort=title', direction: undefined });
    expect(sortState('title', 'title', href)).toEqual({ href: '?sort=-title', direction: 'asc' });
    expect(sortState('-title', 'title', href)).toEqual({ href: '?sort=title', direction: 'desc' });
  });

  it('drops defaults and the first page from links', () => {
    expect(toSearch({ q: 'HIP', page: 1, sort: '-updatedAt', profile: undefined }, { sort: '-updatedAt' })).toBe('?q=HIP');
    expect(toSearch({ page: 2, sort: 'title' }, { sort: '-updatedAt' })).toBe('?page=2&sort=title');
    expect(toSearch({})).toBe('');
  });
});
