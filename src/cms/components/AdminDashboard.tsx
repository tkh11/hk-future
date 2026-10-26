import "server-only";
import Link from "next/link";
import type { ServerProps } from "payload";
import { getMetrikaSummary } from "@/cms/analytics/metrika";
import CatalogImportPanel from "./CatalogImportPanel";
import styles from "./AdminDashboard.module.css";

const sections = [{ slug: "products", title: "Товары" }, { slug: "categories", title: "Категории" }, { slug: "pages", title: "Страницы" }, { slug: "articles", title: "Статьи" }, { slug: "media", title: "Медиафайлы" }] as const;

/** Payload beforeDashboard receives ServerProps, not an arbitrary client-provided role. */
export default async function AdminDashboard({ payload, user }: Pick<ServerProps, "payload" | "user">) {
  if (!user) return null;
  const roles: string[] = typeof user === "object" && "roles" in user && Array.isArray(user.roles) ? user.roles.filter((role): role is string => typeof role === "string") : typeof user === "object" && "role" in user && typeof user.role === "string" ? [user.role] : [];
  const mayEdit = roles.includes("admin") || roles.includes("editor") || roles.includes("publisher");
  const maySeeAnalytics = mayEdit || roles.includes("analyst");
  if (!maySeeAnalytics) return null;
  const [counts, statistics] = await Promise.all([
    Promise.all(sections.map(async section => {
      try { const result = await payload.count({ collection: section.slug, overrideAccess: false, user }); return { ...section, total: result.totalDocs }; }
      catch { return { ...section, total: null }; }
    })),
    getMetrikaSummary(),
  ]);
  const adminPath = payload.config.routes.admin;
  return <>
    <section className={styles.panel} aria-labelledby="hk-dashboard-title">
      <h2 id="hk-dashboard-title">Управление HEISSKRAFT</h2>
      <p>Изменяйте данные каталога и содержимое страниц. Черновики доступны редакторам; на сайт попадает опубликованная версия.</p>
      <dl className={styles.metrics}>{counts.map(item => <div className={styles.metric} key={item.slug}><dt>{item.title}</dt><dd>{item.total ?? "Недоступно"}</dd></div>)}</dl>
      {mayEdit && <div className={styles.links}>{sections.map(item => <Link key={item.slug} href={`${adminPath}/collections/${item.slug}`}>{item.title}</Link>)}</div>}
    </section>
    <section className={styles.panel} aria-labelledby="hk-statistics-title"><h2 id="hk-statistics-title">Посещаемость сайта</h2>
      {statistics.status === "unconfigured" ? <p>Статистика не подключена. Для подключения нужны номер счётчика и серверный токен чтения Яндекс Метрики.</p> : statistics.status === "unavailable" ? <p role="status">Статистика временно недоступна. Данные сайта и редактирование работают независимо.</p> : <><p>Последние 7 завершённых дней. Только агрегированные показатели.</p><dl className={styles.metrics}>{[{ label: "Визиты", value: statistics.visits }, { label: "Посетители", value: statistics.visitors }, { label: "Просмотры", value: statistics.pageViews }, { label: "Отказы", value: `${statistics.bounceRate.toFixed(1)}%` }, { label: "Среднее время", value: `${Math.round(statistics.averageVisitSeconds)} с` }].map(item => <div key={item.label} className={styles.metric}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl></>}
      <p className={styles.muted}>Заполнение демонстрационной формы учитывается как демонстрация интерфейса, а не как доставленная заявка. Поисковые запросы и значения полей формы в цели не передаются.</p>
    </section>
    {mayEdit && <CatalogImportPanel />}
  </>;
}
