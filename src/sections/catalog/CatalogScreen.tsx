import { catalog } from "@/content/catalog";
import { getCatalogEntry, getCatalogEntries } from "@/lib/catalog";
import CatalogBrowser from "./CatalogBrowser";
import styles from "./Catalog.module.css";

export default function CatalogScreen({ path = [] }: { path?: string[] }) {
  const entry = getCatalogEntry(catalog, path);
  const title = entry?.node.title ?? "Каталог";
  if (!entry) return <main className={styles.landing} aria-label="Каталог продукции Heisskraft" data-header-theme="light">
    <div className={styles.landingContent}>
      <CatalogBrowser key={path.join("/")} path={path} current={entry} nodes={catalog} searchEntries={getCatalogEntries(catalog)} />
    </div>
  </main>;
  return <main className={styles.page} data-header-theme="light" data-catalog-section={path[0]}>
    <h1 className={styles.srOnly}>{title}</h1>
    <CatalogBrowser key={path.join("/")} path={path} current={entry} nodes={entry.node.children ?? []} searchEntries={getCatalogEntries(catalog)} />
  </main>;
}
