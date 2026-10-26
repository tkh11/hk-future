import 'server-only';
import { Gutter, Link } from '@payloadcms/ui';
import type { AdminViewServerProps } from 'payload';
import { getMetrikaSummary } from '@/cms/analytics/metrika';
import { canEdit } from '@/cms/access';
import CatalogImportPanel from './CatalogImportPanel';
import styles from './AdminDashboard.module.css';

const sections = [
  { slug: 'products', title: 'Товары' }, { slug: 'categories', title: 'Категории' },
  { slug: 'pages', title: 'Страницы' }, { slug: 'articles', title: 'Статьи' }, { slug: 'media', title: 'Файлы' },
] as const;
const quickActions = [
  { slug: 'products', action: 'create', title: 'Добавить товар', note: 'Описание, характеристики и документы', path: '/collections/products/create' },
  { slug: 'pages', action: 'update', title: 'Изменить страницу', note: 'Блоки, порядок и предпросмотр', path: '/collections/pages' },
  { slug: 'articles', action: 'create', title: 'Добавить статью', note: 'Новости и полезные материалы', path: '/collections/articles/create' },
  { slug: 'media', action: 'create', title: 'Загрузить файл', note: 'Изображения, видео и документы', path: '/collections/media/create' },
] as const;

type RecentRecord = { id: string | number; title: string; updatedAt: string; status: string; collection: string; collectionTitle: string };
const dateFormat = new Intl.DateTimeFormat('ru-RU', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Europe/Moscow' });
const newest = (records: RecentRecord[]) => records.sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)).slice(0, 6);

/** Root already supplies DefaultTemplate. Replaces, rather than appends to, Payload's dashboard. */
export default async function AdminDashboard({ initPageResult }: AdminViewServerProps) {
  const { req, permissions, visibleEntities } = initPageResult;
  const { payload, user } = req;
  if (!user || !['admin', 'editor', 'publisher', 'analyst'].includes(user.role)) return null;
  const mayEdit = canEdit(user);
  const adminPath = payload.config.routes.admin;
  const available = mayEdit ? sections.filter(item => permissions.collections?.[item.slug]?.read && visibleEntities.collections.includes(item.slug)) : [];
  const [overview, statistics] = await Promise.all([
    Promise.all(available.map(async section => {
      try {
        const options = { collection: section.slug, overrideAccess: false as const, user, depth: 0, draft: true as const, sort: '-updatedAt', select: { title: true as const, updatedAt: true as const, _status: true as const } };
        const [recent, drafts] = await Promise.all([
          payload.find({ ...options, limit: 6 }),
          payload.find({ ...options, limit: 6, where: { _status: { equals: 'draft' } } }),
        ]);
        const mapRecords = (rows: typeof recent.docs): RecentRecord[] => rows.map(row => ({ id: row.id, title: row.title || 'Без названия', updatedAt: row.updatedAt, status: row._status ?? 'draft', collection: section.slug, collectionTitle: section.title }));
        return { ...section, total: recent.totalDocs, draftCount: drafts.totalDocs, recent: mapRecords(recent.docs), drafts: mapRecords(drafts.docs), unavailable: false };
      } catch {
        return { ...section, total: null, draftCount: null, recent: [], drafts: [], unavailable: true };
      }
    })),
    getMetrikaSummary(),
  ]);
  const recentRecords = newest(overview.flatMap(section => section.recent));
  const draftRecords = newest(overview.flatMap(section => section.drafts));
  const overviewUnavailable = overview.some(section => section.unavailable);
  const recordList = (records: RecentRecord[], empty: string) => records.length ? <ul className={styles.recordList}>{records.map(record => <li key={`${record.collection}-${record.id}`}>
    <Link href={`${adminPath}/collections/${record.collection}/${record.id}`} prefetch={false}><strong>{record.title}</strong><span>{record.collectionTitle} · <time dateTime={record.updatedAt}>{dateFormat.format(new Date(record.updatedAt))} МСК</time></span></Link>
    <span className={record.status === 'published' ? styles.published : styles.draft}>{record.status === 'published' ? 'Опубликовано' : 'Черновик'}</span>
  </li>)}</ul> : <p className={styles.muted}>{overviewUnavailable ? 'Не удалось загрузить список. Откройте нужный раздел через меню.' : empty}</p>;
  return <Gutter className={styles.dashboard}>
    <header className={styles.heading}><h1>Управление сайтом</h1><p>{mayEdit ? 'Каталог, страницы и материалы HEISSKRAFT — в одном месте.' : 'Показатели сайта HEISSKRAFT.'}</p></header>
    {mayEdit && <>
      <section aria-labelledby="hk-actions-title"><h2 id="hk-actions-title" className={styles.sectionTitle}>Что нужно сделать?</h2><div className={styles.quickActions}>
        {quickActions.filter(action => permissions.collections?.[action.slug]?.[action.action] && visibleEntities.collections.includes(action.slug)).map((action, index) => <Link key={action.slug} className={styles.quickAction} href={`${adminPath}${action.path}`} prefetch={false}><span className={styles.actionIcon} aria-hidden="true">{['+', '▦', '≡', '↑'][index]}</span><strong>{action.title}</strong><span>{action.note}</span></Link>)}
      </div></section>
      <section className={styles.panel} aria-labelledby="hk-content-title"><h2 id="hk-content-title">Содержимое сайта</h2><dl className={styles.metrics}>{overview.map(item => <div className={styles.metric} key={item.slug}><dt><Link href={`${adminPath}/collections/${item.slug}`} prefetch={false}>{item.title}</Link></dt><dd>{item.total ?? 'Недоступно'}</dd>{item.draftCount !== null && <span className={styles.muted}>Черновиков: {item.draftCount}</span>}</div>)}</dl><p className={styles.muted}>Черновики видны редакторам. Посетители сайта видят опубликованную версию.</p></section>
      <div className={styles.activityGrid}>
        <section className={styles.panel} aria-labelledby="hk-drafts-title"><h2 id="hk-drafts-title">Продолжить работу</h2>{recordList(draftRecords, 'Черновиков пока нет. Начните с одного из быстрых действий выше.')}</section>
        <section className={styles.panel} aria-labelledby="hk-recent-title"><h2 id="hk-recent-title">Недавние изменения</h2>{recordList(recentRecords, 'Здесь появятся последние изменённые материалы.')}</section>
      </div>
    </>}
    <section id="statistics" className={styles.panel} aria-labelledby="hk-statistics-title"><h2 id="hk-statistics-title">Статистика</h2>
      {statistics.status === 'unconfigured' ? <><span className={styles.status}>Не подключена</span><p>Здесь появятся показатели посещаемости после подключения Яндекс Метрики.</p><p className={styles.muted}>Для настройки администратору нужны номер счётчика и серверный токен чтения. Секретный токен не вводится в редакторе.</p></> : statistics.status === 'unavailable' ? <p role="status">Статистика временно недоступна. Данные сайта и редактирование работают независимо.</p> : <><p>Последние 7 завершённых дней. Только агрегированные показатели.</p><dl className={styles.metrics}>{[{ label: 'Визиты', value: statistics.visits }, { label: 'Посетители', value: statistics.visitors }, { label: 'Просмотры', value: statistics.pageViews }, { label: 'Отказы', value: `${statistics.bounceRate.toFixed(1)}%` }, { label: 'Среднее время', value: `${Math.round(statistics.averageVisitSeconds)} с` }].map(item => <div key={item.label} className={styles.metric}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></>}
      <p className={styles.muted}>Форма заявки пока демонстрационная: её заполнение не означает доставку заявки менеджеру. Значения полей и поисковые запросы не передаются в цели.</p>
    </section>
    {mayEdit && permissions.collections?.['import-batches']?.read && <div id="import" className={styles.importSection}><CatalogImportPanel /></div>}
  </Gutter>;
}
