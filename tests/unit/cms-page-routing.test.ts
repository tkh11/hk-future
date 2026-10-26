import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ find: vi.fn(), count: vi.fn(), findGlobal: vi.fn(), redirect: vi.fn(), notFound: vi.fn() }));
vi.mock('server-only', () => ({}));
vi.mock('next/server', () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock('next/navigation', () => ({ permanentRedirect: mocks.redirect, notFound: mocks.notFound }));
vi.mock('@/cms/env', () => ({ cmsEnabled: () => true }));
vi.mock('@/cms/client', () => ({ getCMS: async () => ({ find: mocks.find, count: mocks.count, findGlobal: mocks.findGlobal }) }));
vi.mock('@/cms/preview', () => ({ getPreviewUser: async () => null }));

import { filterPublicCMSPaths, getCMSPage, getCMSPageMetadata, getNavigationContent } from '@/content/cms-adapter';

beforeEach(() => {
  vi.resetAllMocks();
  mocks.count.mockResolvedValue({ totalDocs: 0 });
  mocks.redirect.mockImplementation((path: string) => { throw new Error(`REDIRECT:${path}`); });
  mocks.notFound.mockImplementation(() => { throw new Error('NOT_FOUND'); });
});

describe('CMS overrides at existing fixed routes', () => {
  it('uses the saved permanent redirect when a seeded solution page is renamed', async () => {
    const oldPath = '/solutions/data-centers';
    const target = '/solutions/cooling';
    mocks.find.mockImplementation(async query => {
      if (query.collection === 'redirects') return { docs: query.where.from.equals === oldPath ? [{ from: oldPath, to: target }] : [] };
      const requestedPath = query.where.and.find((condition: { path?: { equals: string } }) => condition.path)?.path.equals;
      return { docs: requestedPath === target ? [{ path: target, _status: 'published' }] : [], hasNextPage: false };
    });
    await expect(getCMSPage(oldPath)).rejects.toThrow(`REDIRECT:${target}`);
    expect(mocks.redirect).toHaveBeenCalledWith(target);
    expect(mocks.notFound).not.toHaveBeenCalled();
  });

  it('does not revive legacy content when a renamed page target becomes private or is deleted', async () => {
    mocks.find.mockImplementation(async query => ({ docs: query.collection === 'redirects' && query.where.from.equals === '/solutions/data-centers'
      ? [{ from: '/solutions/data-centers', to: '/private-solution' }] : [], hasNextPage: false }));
    await expect(getCMSPage('/solutions/data-centers')).rejects.toThrow('NOT_FOUND');
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it('allows fallback only for a route the CMS has not managed', async () => {
    mocks.find.mockResolvedValue({ docs: [], hasNextPage: false });
    expect(await getCMSPage('/designers')).toBeNull();
    mocks.count.mockResolvedValue({ totalDocs: 1 });
    await expect(getCMSPage('/designers')).rejects.toThrow('NOT_FOUND');
  });

  it('retains the initial metadata and uses a later editor title on a fixed route', async () => {
    const fallback = { title: 'Системы охлаждения ЦОД — HEISSKRAFT', description: 'Existing description' };
    mocks.find.mockResolvedValue({ docs: [{ path: '/solutions/data-centers', title: 'Системы охлаждения ЦОД', blocks: [] }], hasNextPage: false });
    expect(await getCMSPageMetadata('/solutions/data-centers', fallback)).toEqual(fallback);
    mocks.find.mockResolvedValue({ docs: [{ path: '/solutions/data-centers', title: 'Новое название решения', blocks: [] }], hasNextPage: false });
    expect(await getCMSPageMetadata('/solutions/data-centers', fallback)).toEqual({ ...fallback, title: 'Новое название решения — HEISSKRAFT' });
  });

  it('removes historical fixed routes and unpublished pages from sitemap while keeping live routes', async () => {
    mocks.find.mockImplementation(async query => ({ docs: query.collection === 'pages'
      ? [{ path: '/cooling', _status: 'published' }, { path: '/private', _status: 'draft' }, { path: '/live-page', _status: 'published' }]
      : [{ from: '/solutions/data-centers' }, { from: '/live-page' }, { from: '/products/live' }], hasNextPage: false }));
    expect(await filterPublicCMSPaths(['/', '/solutions/data-centers', '/cooling', '/private', '/live-page', '/products/live'])).toEqual(['/', '/cooling', '/live-page', '/products/live']);
  });
});

describe('intentional empty navigation', () => {
  it('honors an explicitly saved empty array and uses defaults only before initialization', async () => {
    mocks.findGlobal.mockResolvedValue({ createdAt: '2026-10-26T00:00:00Z', items: [] });
    expect(await getNavigationContent()).toEqual([]);
    mocks.findGlobal.mockResolvedValue({ items: [] });
    expect((await getNavigationContent()).map((item: { label: string }) => item.label)).toEqual(['Каталог', 'База знаний', 'Проектировщикам', 'Подбор оборудования']);
  });
});
