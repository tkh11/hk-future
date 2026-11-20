import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { PublishBadge, ReviewBadge } from '@/studio/components/parts';
import ui from '@/studio/components/ui.module.css';
import { getOverview, getSiteCounts } from '@/studio/data';
import { formatDate, numberFormat } from '@/studio/labels';
import { productHref } from '@/studio/routes';
import { requireStaff } from '@/studio/session';
import css from './overview.module.css';
import Traffic, { trafficFallback } from './Traffic';

export const metadata: Metadata = { title: { absolute: 'Обзор — Каталог HEISSKRAFT' } };

export default async function OverviewPage() {
  const session = await requireStaff();
  const [site, work] = await Promise.all([getSiteCounts(session), session.can.edit ? getOverview(session) : null]);
  return (
    <>
      <header className={ui.header}><h1>Обзор</h1></header>
      <p className={ui.lead}>
        {work ? 'Что требует работы в каталоге. Каждая строка открывает готовую выборку.' : 'Посещаемость сайта и то, что сейчас опубликовано.'}
      </p>
      {work ? <Work o={work} /> : null}
      <section aria-labelledby="traffic" className={css.block}>
        <div className={css.blockHead}><h2 id="traffic">Посещаемость</h2><span>последние 7 дней, Яндекс Метрика</span></div>
        <Suspense fallback={trafficFallback}><Traffic /></Suspense>
      </section>
      <section aria-labelledby="site" className={css.block}>
        <h2 id="site">На сайте</h2>
        <dl className={css.stats}>
          <div className={css.stat}><dt>Карточки товаров</dt><dd className="num">{numberFormat.format(site.products)}</dd></div>
          <div className={css.stat}><dt>Номенклатура</dt><dd className="num">{numberFormat.format(site.variants)}</dd></div>
          <div className={css.stat}><dt>Статьи</dt><dd className="num">{numberFormat.format(site.articles)}</dd></div>
        </dl>
      </section>
    </>
  );
}

function Work({ o }: { o: Awaited<ReturnType<typeof getOverview>> }) {
  const tasks = [
    { count: o.attention, label: 'Карточки ждут проверки', href: '/studio/assortment?attention=any', tone: 'warning' },
    { count: o.conflicts, label: 'Позиции с конфликтом данных', href: '/studio/assortment/variants?attention=blocked', tone: 'danger' },
    { count: o.noPhoto, label: 'Карточки без главного фото', href: '/studio/assortment?missing=photo', tone: 'warning' },
    { count: o.noSummary, label: 'Опубликованы без краткого описания', href: '/studio/assortment?missing=summary&status=published', tone: 'neutral' },
    { count: o.unpublished, label: 'Карточки ещё не опубликованы', href: '/studio/assortment?status=draft', tone: 'neutral' },
    { count: o.requested, label: 'Ждут публикации', href: '/studio/assortment?requested=1', tone: 'warning' },
    { count: o.notes, label: 'Задачи из заметок проверки', href: '/studio/assortment?attention=any', tone: 'neutral' },
  ];
  const open = tasks.filter(t => t.count > 0);
  const done = tasks.filter(t => t.count === 0);
  return (
    <>
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
                  <td><Link href={productHref(p.id)} className={ui.rowTitle}>{p.title}</Link></td>
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
