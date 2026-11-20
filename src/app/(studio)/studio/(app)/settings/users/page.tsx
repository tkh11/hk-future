import ListPager from '@/studio/components/ListPager';
import { listParams, fetchListPage, type ListPageProps } from '@/studio/pagination';
import type { Metadata } from 'next';
import UsersAdmin from '@/studio/components/UsersAdmin';
import ui from '@/studio/components/ui.module.css';
import { requireAdmin } from '@/studio/session';

export const metadata: Metadata = { title: 'Пользователи' };

export default async function UsersPage({ searchParams }: ListPageProps) {
  const s = await requireAdmin();
  const params = listParams(await searchParams);
  const { result, paging } = await fetchListPage(params, page => s.payload.find({ collection: 'users', page, limit: params.limit, depth: 0, sort: 'email', overrideAccess: false, user: s.user }));
  return (
    <>
      <div className={ui.header}><h1>Пользователи</h1></div>
      <UsersAdmin users={result.docs.map(u => ({ id: u.id, email: u.email, name: u.name ?? null, role: u.role }))} />
      <ListPager {...paging} />
    </>
  );
}
