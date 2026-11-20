import ListPager from '@/studio/components/ListPager';
import { listParams, fetchListPage, type ListPageProps } from '@/studio/pagination';
import type { Metadata } from 'next';
import Link from 'next/link';
import { PublishBadge } from '@/studio/components/parts';
import ui from '@/studio/components/ui.module.css';
import { formatDate } from '@/studio/labels';
import { publishState } from '@/studio/query';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Статьи' };

export default async function ArticlesPage({ searchParams }: ListPageProps) {
  const s = await requireEditor();
  const params = listParams(await searchParams);
  const { result, paging } = await fetchListPage(params, page => s.payload.find({ collection: 'articles', draft: true, sort: ['-updatedAt', 'id'], page, limit: params.limit, depth: 0, overrideAccess: false, user: s.user }));
  const live = await s.payload.find({ collection: 'articles', where: { id: { in: result.docs.map(row => row.id) } }, pagination: false, depth: 0, select: { _status: true }, overrideAccess: false, user: s.user });
  const map = new Map(live.docs.map(d => [d.id, d._status ?? 'draft' as const]));
  return (
    <>
      <div className={ui.header}><h1>Статьи</h1></div>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <caption className="visually-hidden">Статьи</caption>
          <thead><tr><th>Статья</th><th>Адрес</th><th>Публикация</th><th>Изменено</th></tr></thead>
          <tbody>
            {result.docs.map(article => (
              <tr key={article.id}>
                <td><Link href={`/studio/site/articles/${article.id}`} className={ui.rowTitle}>{article.title}</Link></td>
                <td className="num">{article.slug}</td>
                <td><PublishBadge status={publishState(map, article.id, article._status)} /></td>
                <td className={`num ${ui.muted}`}>{formatDate(article.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <ListPager {...paging} />
    </>
  );
}
