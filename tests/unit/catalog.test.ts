import { describe, expect, it } from 'vitest';
import { catalog } from '@/content/catalog';
import { catalogHref, getCatalogEntries, getCatalogEntry, searchCatalog } from '@/lib/catalog';

describe('catalog contracts and pure search', () => {
  const entries = getCatalogEntries(catalog);
  it('round trips every nested path without duplicates', () => {
    expect(new Set(entries.map(entry => catalogHref(entry.path))).size).toBe(entries.length);
    for (const entry of entries) expect(getCatalogEntry(catalog, entry.path)?.node).toBe(entry.node);
    expect(getCatalogEntry(catalog, ['pipelines', 'unknown'])).toBeNull();
  });
  it('searches all words across ancestors and matches case and punctuation', () => {
    expect(searchCatalog(entries, 'ТРУБОПРОВОДНЫЕ multilayer').map(e => e.node.slug)).toEqual(['multilayer']);
    expect(searchCatalog(entries, 'black pipe').map(e => e.node.slug)).toEqual(['black-pipe']);
    expect(searchCatalog(entries, '  ')).toEqual([]);
    expect(searchCatalog(entries, 'нет-такой-категории')).toEqual([]);
  });
  it('uses only the supplied data and does not mutate it', () => {
    const supplied = [{ node: { slug: 'custom', title: 'Ёмкость', art: 'pipes' as const }, path: ['custom'], trail: [{ slug: 'custom', title: 'Ёмкость', art: 'pipes' as const }] }];
    const before = JSON.stringify(supplied);
    expect(searchCatalog(supplied, 'емкость')).toEqual(supplied);
    expect(searchCatalog(supplied, 'Heisskraft')).toEqual([]);
    expect(JSON.stringify(supplied)).toBe(before);
  });
});
