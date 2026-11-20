import { REST_GET } from '@payloadcms/next/routes';
import { getPublicDocument } from '@/content/documents-server';

export const runtime = 'nodejs';
type Context = { params: Promise<{ id: string }> };

export async function GET(request: Request, { params }: Context) {
  const row = await getPublicDocument((await params).id);
  const url = new URL(request.url);
  const cover = url.searchParams.get('cover') === '1';
  const media = cover ? row?.cover : row?.file;
  if (!row || !media || (cover && !media.mimeType.startsWith('image/')) || /[/\\\x00-\x1f]/.test(media.filename)) {
    return new Response('Документ не найден.', { status: 404, headers: { 'Cache-Control': 'private, no-store' } });
  }

  // Delegate streaming, Range requests and private/S3 storage to Payload.
  // Do not forward cookies or authorization: this endpoint serves public PDFs only.
  const { default: config } = await import('../../../../../../payload.config');
  const headers = new Headers();
  for (const name of ['range', 'if-none-match', 'if-modified-since']) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  const upstream = await REST_GET(config)(new Request(new URL(`/api/media/file/${encodeURIComponent(media.filename)}`, url), { headers }), {
    params: Promise.resolve({ slug: ['media', 'file', media.filename] }),
  });
  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.set('Cache-Control', 'private, no-store');
  responseHeaders.set('X-Content-Type-Options', 'nosniff');
  responseHeaders.set('X-Frame-Options', 'SAMEORIGIN');
  if (upstream.ok && !cover) {
    const disposition = url.searchParams.get('download') === '1' ? 'attachment' : 'inline';
    const filename = encodeURIComponent(`${row.title}.pdf`).replace(/[!'()*]/g, c => `%${c.charCodeAt(0).toString(16).toUpperCase()}`);
    responseHeaders.set('Content-Type', 'application/pdf');
    responseHeaders.set('Content-Disposition', `${disposition}; filename="heisskraft-${row.id}.pdf"; filename*=UTF-8''${filename}`);
  }
  return new Response(upstream.body, { status: upstream.status, headers: responseHeaders });
}
