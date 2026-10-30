import { NextRequest, NextResponse } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { cmsEnabled } from './cms/env';

export function proxy(request: NextRequest) {
  if (!cmsEnabled()) return new NextResponse('Not found', { status: 404 });
  let pathname: string;
  try { pathname = decodeURIComponent(request.nextUrl.pathname); } catch { return new NextResponse('Invalid path', { status: 400 }); }
  // Bootstrap users are created only by the local CLI, never by an anonymous visitor.
  if (pathname.includes('/first-register')) return new NextResponse('Not found', { status: 404 });
  const secret = process.env.CMS_GATEWAY_SECRET;
  const publicMediaRead = ['GET', 'HEAD'].includes(request.method) && /^\/api\/media\/file\/[^/]+$/.test(pathname);
  if (secret && !publicMediaRead) {
    const provided = request.headers.get('x-heisskraft-gateway') || '';
    const a = Buffer.from(secret), b = Buffer.from(provided);
    if (a.length !== b.length || !timingSafeEqual(a,b)) return new NextResponse('Protected administration', { status: 403 });
  }
  if (!['GET','HEAD','OPTIONS'].includes(request.method)) {
    const allowed = new URL(process.env.CMS_SERVER_URL || 'http://localhost:3000').origin;
    if (request.headers.get('origin') !== allowed) return new NextResponse('Invalid origin', { status: 403 });
  }
  const response = NextResponse.next();
  response.headers.set('Cache-Control', 'private, no-store');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'same-origin');
  if (publicMediaRead && pathname.toLowerCase().endsWith('.pdf')) response.headers.set('Content-Disposition', 'attachment');
  return response;
}
export const config = { matcher: ['/admin/:path*', '/api/:path*', '/studio', '/studio/:path*'] };
