import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ find: vi.fn(), getOrder: vi.fn(), enabled: true }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: async () => undefined }));
vi.mock('@/cms/env', () => ({ cmsEnabled: () => mocks.enabled }));
vi.mock('@/cms/client', () => ({ getCMS: async () => ({ find: mocks.find, kv: { get: mocks.getOrder } }) }));
import { getDocumentsContent, getPublicDocument } from '@/content/documents-server';
beforeEach(() => { vi.clearAllMocks(); mocks.enabled = true; });

describe('document queries', () => {
  it('reads every page anonymously with publication access enabled', async () => {
    mocks.find.mockResolvedValueOnce({ docs: [], hasNextPage: true }).mockResolvedValueOnce({ docs: [], hasNextPage: false });
    expect(await getDocumentsContent()).toEqual([]);
    expect(mocks.find).toHaveBeenCalledTimes(2);
    for (const [query] of mocks.find.mock.calls) {
      expect(query).toMatchObject({ overrideAccess: false, draft: false, depth: 1, where: { _status: { equals: 'published' } } });
      expect(query.user).toBeUndefined();
      expect(query.req).toBeUndefined();
    }
    expect(mocks.find.mock.calls[1][0].page).toBe(2);
  });
  it('returns the saved public order, ignoring removed IDs and appending new documents', async () => {
    const docs = [1, 3, 5].map(id => ({
      id, title: 'PDF ' + id, _status: 'published', file: { id, filename: id + '.pdf', mimeType: 'application/pdf', _status: 'published' },
    }));
    mocks.find.mockResolvedValueOnce({ docs, hasNextPage: false });
    mocks.getOrder.mockResolvedValueOnce(['3', '2', '1']);
    expect((await getDocumentsContent()).map(doc => doc.id)).toEqual(['3', '1', '5']);
  });
  it('rejects invalid IDs without querying the database', async () => {
    for (const id of ['../secret', '0', '-1', '1?draft=true', '999999999999']) expect(await getPublicDocument(id)).toBeNull();
    expect(mocks.find).not.toHaveBeenCalled();
  });
  it('keeps the frozen demo independent of CMS', async () => {
    mocks.enabled = false;
    expect(await getDocumentsContent()).toEqual([]);
    expect(await getPublicDocument('1')).toBeNull();
    expect(mocks.find).not.toHaveBeenCalled();
  });
});
