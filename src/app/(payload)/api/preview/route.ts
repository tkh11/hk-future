import { draftMode } from 'next/headers';
import { getCMS } from '@/cms/client';
import { canEdit } from '@/cms/access';

export async function GET(request: Request) {
  const cms = await getCMS();
  const { user } = await cms.auth({ headers: request.headers });
  if (!canEdit(user)) return new Response('Нет доступа к предварительному просмотру.', { status: 403 });
  const params = new URL(request.url).searchParams;
  const collection = params.get('collection');
  if (!collection || !['categories', 'products', 'pages', 'articles'].includes(collection)) return new Response('Неизвестный раздел.', { status: 400 });
  const id = Number(params.get('id'));
  if (!Number.isSafeInteger(id) || id < 1) return new Response('Неверная запись.', { status: 400 });
  const doc = await cms.findByID({ collection: collection as 'categories', id, draft: true, depth: 0, user, overrideAccess: false });
  let target: string | null | undefined;
  if (collection === 'categories') target = `/catalog/${doc.path}`;
  else if (collection === 'pages') target = doc.path;
  else target = `/${collection}/${doc.slug}`;
  if (!target || !/^\/(?!\/)[a-z0-9/-]*$/.test(target)) return new Response('Недопустимый адрес.', { status: 400 });
  (await draftMode()).enable();
  return new Response(null, { status: 307, headers: { Location: target, 'Cache-Control': 'private, no-store' } });
}
export async function POST() {
  (await draftMode()).disable();
  return new Response(null, { status: 303, headers: { Location: '/', 'Cache-Control': 'no-store' } });
}
