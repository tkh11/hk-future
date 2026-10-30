// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { unstable_getResponseFromNextConfig } from 'next/experimental/testing/server';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('GITHUB_PAGES', 'false');
});
afterEach(() => vi.unstubAllEnvs());

describe('Payload client hints', () => {
  it.each(['/', '/catalog', '/catalog/pipelines/therm', '/api/products', '/administrator', '/admin-preview'])('%s does not require a client-hint retry', async path => {
    const { default: nextConfig } = await import('../../next.config');
    const response = await unstable_getResponseFromNextConfig({ url: `https://example.test${path}`, nextConfig });
    expect(response.headers.has('critical-ch')).toBe(false);
    expect(response.headers.get('accept-ch')).toBe('Sec-CH-Prefers-Color-Scheme');
    expect(response.headers.get('vary')).toBe('Sec-CH-Prefers-Color-Scheme');
    expect(response.headers.get('x-powered-by')).toBe('Next.js, Payload');
  });

  it.each(['/admin', '/admin/', '/admin/login', '/admin/collections/products/1'])('%s retains Payload theme negotiation', async path => {
    const { default: nextConfig } = await import('../../next.config');
    const response = await unstable_getResponseFromNextConfig({ url: `https://example.test${path}`, nextConfig });
    expect(response.headers.get('critical-ch')).toBe('Sec-CH-Prefers-Color-Scheme');
    expect(response.headers.get('accept-ch')).toBe('Sec-CH-Prefers-Color-Scheme');
    expect(response.headers.get('vary')).toBe('Sec-CH-Prefers-Color-Scheme');
    expect(nextConfig.serverExternalPackages).toContain('graphql');
  });

  it('keeps the GitHub Pages export independent of Payload headers', async () => {
    vi.stubEnv('GITHUB_PAGES', 'true');
    const { default: nextConfig } = await import('../../next.config');
    expect(nextConfig.output).toBe('export');
    expect(nextConfig.basePath).toBe('/hk-future');
    expect(nextConfig.headers).toBeUndefined();
  });
});
