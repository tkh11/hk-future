// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ document: vi.fn(), serve: vi.fn() }));
vi.mock('@/content/documents-server', () => ({ getPublicDocument: mocks.document }));
vi.mock('@payloadcms/next/routes', () => ({ REST_GET: () => mocks.serve }));
vi.mock('../../payload.config', () => ({ default: Promise.resolve({}) }));
import { GET } from '@/app/(frontend)/docs/file/[id]/route';
const doc = { id: 1, title: 'Каталог насосов', file: { filename: 'file.pdf', mimeType: 'application/pdf' }, cover: null };
const context = { params: Promise.resolve({ id: '1' }) };
beforeEach(() => {
  vi.clearAllMocks(); mocks.document.mockResolvedValue(doc);
  mocks.serve.mockImplementation(async () => new Response('%PDF-', { status: 206, headers: { 'Content-Range': 'bytes 0-4/100', 'Content-Type': 'application/pdf' } }));
});
describe('public PDF streaming', () => {
  it('preserves ranges and does not forward editor credentials to storage', async () => {
    const response = await GET(new Request('http://localhost/docs/file/1', { headers: { range: 'bytes=0-4', cookie: 'payload-token=secret', authorization: 'Bearer secret' } }), context);
    expect(response.status).toBe(206);
    expect(response.headers.get('Content-Range')).toBe('bytes 0-4/100');
    expect(response.headers.get('Content-Disposition')).toMatch(/^inline;/);
    const forwarded = mocks.serve.mock.calls[0][0] as Request;
    expect(forwarded.headers.get('range')).toBe('bytes=0-4');
    expect(forwarded.headers.has('cookie')).toBe(false);
    expect(forwarded.headers.has('authorization')).toBe(false);
    expect(await response.text()).toBe('%PDF-');
  });
  it('makes the separate download response an attachment', async () => {
    const response = await GET(new Request('http://localhost/docs/file/1?download=1'), context);
    expect(response.headers.get('Content-Disposition')).toMatch(/^attachment;.*filename\*=UTF-8''/);
    expect(response.headers.get('Cache-Control')).toBe('private, no-store');
  });
  it('never serves inaccessible documents, missing covers or unsafe filenames', async () => {
    for (const value of [null, { ...doc, file: { ...doc.file, filename: '../private.pdf' } }]) {
      mocks.document.mockResolvedValue(value);
      expect((await GET(new Request('http://localhost/docs/file/1'), context)).status).toBe(404);
    }
    mocks.document.mockResolvedValue(doc);
    expect((await GET(new Request('http://localhost/docs/file/1?cover=1'), context)).status).toBe(404);
    expect(mocks.serve).not.toHaveBeenCalled();
  });
});
