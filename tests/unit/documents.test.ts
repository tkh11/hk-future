import { describe, expect, it } from 'vitest';
import { mapLibraryDocuments, parseLibraryDocument } from '@/content/documents';

const file = { id: 10, filename: 'manual.pdf', mimeType: 'application/pdf', filesize: 1024, _status: 'published' };
const doc = { id: 1, title: 'Инструкция', _status: 'published', file };

describe('public document library', () => {
  it('omits unpublished, unresolved, malformed and non-PDF files', () => {
    expect(mapLibraryDocuments([doc, { ...doc, _status: 'draft' }, { ...doc, file: 10 },
      { ...doc, file: { ...file, _status: 'draft' } }, { ...doc, file: { ...file, mimeType: 'text/html' } },
      { ...doc, title: null }])).toHaveLength(1);
  });
  it('deduplicates shared files and passes only public presentation data', () => {
    expect(mapLibraryDocuments([{ ...doc, reviewNotes: 'private', file: { ...file, url: 'https://private-storage/key' } }, { ...doc, id: 2 }])).toEqual([
      { id: '1', title: 'Инструкция', kind: 'Документ', bytes: 1024, cover: null, preview: '/docs/file/1', download: '/docs/file/1?download=1' },
    ]);
  });
  it('does not reveal unpublished covers but keeps the published PDF available', () => {
    expect(parseLibraryDocument({ ...doc, cover: { ...file, mimeType: 'image/webp', _status: 'draft' } })?.cover).toBeNull();
    expect(mapLibraryDocuments([{ ...doc, cover: { ...file, mimeType: 'image/webp' } }])[0].cover).toBe('/docs/file/1?cover=1');
  });
});
