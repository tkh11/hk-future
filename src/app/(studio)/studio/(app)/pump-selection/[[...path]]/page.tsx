import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import ListPager from '@/studio/components/ListPager';
import { listParams, pageRange } from '@/studio/pagination';
import FilterBar from '@/studio/components/FilterBar';
import PumpSelectionEditor from '@/studio/components/PumpSelectionEditor';
import PumpSelectionFolderActions from '@/studio/components/PumpSelectionFolderActions';
import PumpSharedCharacteristicsEditor from '@/studio/components/PumpSharedCharacteristicsEditor';
import editor from '@/studio/components/editor/Editor.module.css';
import { CategoriesIcon } from '@/studio/components/icons';
import ui from '@/studio/components/ui.module.css';
import { getPumpSelectionEditor, getPumpSelectionGroups, getPumpSelectionRoute, getPumpSelectionRows } from '@/studio/pump-selection-data';
import { pumpSelectionHref, pumpSelectionTitle } from '@/studio/routes';
import { requireEditor } from '@/studio/session';
import css from './pump-selection.module.css';

export const metadata: Metadata = { title: pumpSelectionTitle };

export default async function PumpSelectionPage({ params, searchParams }: PageProps<'/studio/pump-selection/[[...path]]'>) {
  const session = await requireEditor();
  const [{ path = [] }, raw] = await Promise.all([params, searchParams]);
  const groups = await getPumpSelectionGroups(session);
  const route = getPumpSelectionRoute(groups, path);
  if (!route) notFound();

  const breadcrumbs = route.trail.length ? (
    <nav className={`${editor.crumbs} ${css.crumbs}`} aria-label="Путь">
      <Link href={pumpSelectionHref}>{pumpSelectionTitle}</Link>
      {route.trail.map(({ href, title }, index) => (
        <span className={css.crumb} key={href}>
          <span aria-hidden>/</span>
          {route.id === null && index === route.trail.length - 1
            ? <span aria-current="page">{title}</span>
            : <Link href={href}>{title}</Link>}
        </span>
      ))}
    </nav>
  ) : null;

  if (route.id !== null) {
    const data = await getPumpSelectionEditor(session, route.id, groups);
    if (!data) notFound();
    if (data.href !== route.href) redirect(data.href);
    return <PumpSelectionEditor key={data.id} data={data} canPublish={session.can.publish} breadcrumbs={breadcrumbs} />;
  }

  const rawQuery = raw.q;
  const query = typeof rawQuery === 'string' ? rawQuery.trim().slice(0, 200) : '';
  const showFolders = route.depth < 3 && !query;
  const rows = showFolders ? [] : await getPumpSelectionRows(session, route.groups, query);

  const paging = pageRange(showFolders ? route.children.length : rows.length, listParams(raw));

  return (
    <>
      {breadcrumbs}
      <header className={ui.header}>
        <h1>{route.trail.at(-1)?.title ?? pumpSelectionTitle}</h1>
      </header>
      {session.can.publish && <div className={css.actions}>
        <PumpSelectionFolderActions key={route.current?.id ?? 'root'} current={route.current ? { id: route.current.id, title: route.current.title } : null}
          depth={route.depth} parentHref={route.parentHref} />
      </div>}
      {session.can.publish && route.current && <PumpSharedCharacteristicsEditor key={route.current.id}
        group={route.current} path={route.current.folders} />}
      <FilterBar placeholder="Артикул или название насоса" values={{ q: query || undefined }} selects={[]} pills={[]} />
      {showFolders && route.children.length ? (
        <ul className={css.folders} aria-label="Группы насосов">
          {route.children.slice(paging.offset, paging.offset + paging.limit).map(({ href, title }) => (
            <li key={href}><Link className={css.folder} href={href}><CategoriesIcon />{title}</Link></li>
          ))}
        </ul>
      ) : rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Исполнения насосов</caption>
            <thead><tr><th>Артикул</th><th>Название</th>{query ? <th>Группа</th> : null}</tr></thead>
            <tbody>
              {rows.slice(paging.offset, paging.offset + paging.limit).map(({ id, sku, title, href, groupName }) => (
                <tr key={id}>
                  <td className="num"><Link href={href} prefetch={false} className={ui.rowTitle} aria-label={`${sku} · ${title}`}>{sku}</Link></td>
                  <td className={ui.wrap}>{title}</td>
                  {query ? <td className={ui.wrap}>{groupName}</td> : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className={`${ui.tableWrap} ${ui.empty}`}>{query ? 'Насосы по этому запросу не найдены.' : showFolders ? 'Пока нет групп.' : 'В этой группе пока нет насосов.'}</p>
      )}
      <ListPager {...paging} />
    </>
  );
}
