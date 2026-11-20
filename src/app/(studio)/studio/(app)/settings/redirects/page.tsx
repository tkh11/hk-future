import ListPager from '@/studio/components/ListPager';
import { listParams, fetchListPage, type ListPageProps } from '@/studio/pagination';
import type { Metadata } from 'next';
import RedirectsAdmin from '@/studio/components/RedirectsAdmin';
import ui from '@/studio/components/ui.module.css';
import { requireAdmin } from '@/studio/session';

export const metadata: Metadata = { title: 'Редиректы' };

export default async function RedirectsPage({ searchParams }: ListPageProps) {
  const s = await requireAdmin();
  const params = listParams(await searchParams);
  const { result, paging } = await fetchListPage(params, page => s.payload.find({ collection: 'redirects', page, limit: params.limit, depth: 0, sort: 'from', overrideAccess: false, user: s.user }));
  return (
    <>
      <div className={ui.header}><h1>Перенаправления</h1></div>
      <RedirectsAdmin rows={result.docs.map(r => ({ id: r.id, from: r.from, to: r.to }))} />
      <ListPager {...paging} />
    </>
  );
}
