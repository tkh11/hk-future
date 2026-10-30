// @vitest-environment node
import { describe, expect, it, vi } from 'vitest';

const { find, preview } = vi.hoisted(() => ({ find: vi.fn(), preview: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('@/cms/env', () => ({ cmsEnabled: () => true }));
vi.mock('@/cms/client', () => ({ getCMS: async () => ({ find }) }));
vi.mock('@/cms/preview', () => ({ getPreviewUser: preview }));
vi.mock('next/server', () => ({ connection: async () => {} }));

import { getSiteSearchContent } from '@/content/cms-adapter';

describe('public search content boundary', () => {
  it('includes published CMS pages/products but excludes hidden branches, unpublished legacy pages and preview sessions', async () => {
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    find.mockImplementation(async (options) => {
      if (options.collection === 'redirects') return { docs: [{ from: '/projects' }] };
      if (options.collection === 'pages' && options.select) return { docs: [
        { path: '/solutions/data-centers', _status: 'draft' }, { path: '/new-page', _status: 'published' },
      ] };
      // These are the public Local API reads; a future accidental bypass must fail.
      expect(options.overrideAccess).toBe(false);
      expect(options.user).toBeUndefined();
      expect(options.draft).toBe(false);
      expect(options.where.and).toContainEqual({ _status: { equals: 'published' } });
      const rows: Record<string, unknown[]> = {
        categories: [
          { id: 1, slug: 'pumps', path: 'pumps', title: 'Насосы' },
          { id: 3, slug: 'hidden-child', path: 'hidden/hidden-child', title: 'Скрытый раздел', parent: 2 },
        ],
        products: [
          { id: 9, slug: null, sku: null, title: null },
          { slug: 'public-pump', sku: 'HK-100', title: 'Публичный насос', category: { path: 'pumps', title: 'Насосы' } },
          { slug: 'hidden-pump', sku: 'HK-101', title: 'Скрытый насос', category: { path: 'hidden/hidden-child', title: 'Скрытый раздел' } },
        ],
        articles: [],
        pages: [{ path: '/new-page', title: 'Новая страница CMS', internalSecret: 'must-not-be-serialized' }],
      };
      return { docs: rows[options.collection] ?? [], hasNextPage: false };
    });
    const entries = await getSiteSearchContent();
    const urls = entries.map(entry => entry.href);
    expect(urls).toContain('/products/public-pump');
    expect(urls).toContain('/new-page');
    expect(urls).not.toContain('/products/hidden-pump');
    expect(urls).not.toContain('/catalog/hidden/hidden-child');
    expect(urls).not.toContain('/solutions/data-centers');
    expect(urls).not.toContain('/projects');
    expect(preview).not.toHaveBeenCalled();
    expect(JSON.stringify(entries)).not.toContain('must-not-be-serialized');
  });
});
