import type { Metadata } from 'next';
import Link from 'next/link';
import { PublishBadge, ReviewBadge } from '@/studio/components/parts';
import ui from '@/studio/components/ui.module.css';
import { getOverview } from '@/studio/data';
import { formatDate, numberFormat } from '@/studio/labels';
import { productHref } from '@/studio/routes';
import { requireEditor } from '@/studio/session';
import css from './overview.module.css';

export const metadata: Metadata = { title: { absolute: 'Обзор — Каталог HEISSKRAFT' } };

export default async function OverviewPage() {
  const session = await requireEditor();
  const o = await getOverview(session);
  const tasks = [
    { count: o.attention, label: 'Карточки ждут проверки', href: '/studio/assortment?attention=any', tone: 'warning' },
    { count: o.conflicts, label: 'Варианты с конфликтом данных', href: '/studio/assortment/variants?attention=blocked', tone: 'danger' },
    { count: o.noPhoto, label: 'Карточки без главного фото', href: '/studio/assortment?missing=photo', tone: 'warning' },
    { count: o.noSummary, label: 'Опубликованы без краткого описания', href: '/studio/assortment?missing=summary&status=published', tone: 'neutral' },
    { count: o.unpublished, label: 'Карточки ещё не опубликованы', href: '/studio/assortment?status=draft', tone: 'neutral' },
  ];
  const open = tasks.filter(t => t.count > 0);
  const done = tasks.filter(t => t.count === 0);

  return (
    <>
      <header className={ui.header}><h1>Обзор</h1></header>
      <p className={ui.lead}>Что требует работы в каталоге. Каждая строка открывает готовую выборку.</p>

      <section aria-labelledby="tasks" className={css.block}>
        <h2 id="tasks">Задачи</h2>
        {open.length ? (
          <ul className={css.tasks}>
            {open.map(task => (
              <li key={task.label}>
                <Link href={task.href} className={css.task} data-tone={task.tone}>
                  <span className={css.taskCount}>{numberFormat.format(task.count)}</span>
                  <span>{task.label}</span>
                </Link>
              </li>
            ))}
          </ul>
        ) : <p className={ui.muted}>Задач нет — каталог в порядке.</p>}
        {done.length ? <p className={css.done}>Без задач: {done.map(t => t.label.toLowerCase()).join('; ')}.</p> : null}
      </section>

      <section aria-labelledby="recent" className={css.block}>
        <h2 id="recent">Недавно изменены</h2>
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Недавно изменённые товары</caption>
            <thead><tr><th>Товар</th><th>Публикация</th><th>Внимание</th><th>Изменено</th></tr></thead>
            <tbody>
              {o.recent.map(p => (
                <tr key={p.id}>
                  <td><a href={productHref(p.id)} className={ui.rowTitle}>{p.title}</a></td>
                  <td><PublishBadge status={p.status} /></td>
                  <td><ReviewBadge review={p.review} /></td>
                  <td className={`num ${ui.muted}`}>{formatDate(p.updatedAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
