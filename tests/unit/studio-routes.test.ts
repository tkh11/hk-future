// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { safeNext } from '@/studio/routes';

describe('safeNext', () => {
  it('keeps studio paths with queries', () => {
    expect(safeNext('/studio/assortment?status=draft')).toBe('/studio/assortment?status=draft');
    expect(safeNext('/studio')).toBe('/studio');
  });

  it('rejects other sites, other sections and the login page itself', () => {
    for (const value of ['//evil.example/studio', 'https://evil.example', '/studiox', '/admin', '/studio/login?next=/studio', '/studio\\@evil', '/studio\r\nx', null, 42]) {
      expect(safeNext(value)).toBe('/studio');
    }
  });
});
