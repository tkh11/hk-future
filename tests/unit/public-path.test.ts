import { afterEach, expect, it, vi } from 'vitest';
import { publicPath } from '@/lib/public-path';
afterEach(() => vi.unstubAllEnvs());
it('resolves assets at root and in the exported subdirectory', () => {
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '');
  expect(publicPath('/videos/catalog/pipes.mp4')).toBe('/videos/catalog/pipes.mp4');
  vi.stubEnv('NEXT_PUBLIC_BASE_PATH', '/hk-future');
  for (const file of ['/models/chilling.glb', '/videos/catalog/pipes.mp4', '/images/catalog/therm.jpg', '/draco/draco_decoder.wasm']) expect(publicPath(file)).toBe(`/hk-future${file}`);
  expect(publicPath('https://example.com/image.jpg')).toBe('https://example.com/image.jpg');
});
