// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('CMS_ENABLED', 'true');
  vi.stubEnv('GITHUB_PAGES', 'false');
  vi.stubEnv('CMS_SERVER_URL', 'http://localhost:3000');
  vi.stubEnv('CMS_GATEWAY_SECRET', '');
});
afterEach(() => vi.unstubAllEnvs());

describe('Studio proxy REST lock', () => {
  it.each(['/api/users/login', '/api/products', '/api/products/1', '/api/globals/contacts', '/api/media/1'])('%s is closed', async path => {
    const { proxy } = await import('../../src/proxy');
    const response = proxy(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(404);
  });

  it('redirects leftover admin URLs to studio', async () => {
    const { proxy } = await import('../../src/proxy');
    const response = proxy(new NextRequest('http://localhost:3000/admin/collections/products/1'));
    expect(response.status).toBe(307);
    expect(response.headers.get('location')).toBe('http://localhost:3000/studio');
  });

  it.each(['/api/media/file/photo.jpg', '/api/preview', '/api/catalog-import/preview'])('%s stays open', async path => {
    const { proxy } = await import('../../src/proxy');
    const response = proxy(new NextRequest(`http://localhost:3000${path}`));
    expect(response.status).toBe(200);
  });
});
