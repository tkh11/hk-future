import { Suspense } from "react";
import { getCatalogEntry } from "@/lib/catalog";
import CatalogBrowser from "./CatalogBrowser";
import CatalogSkeleton from "./CatalogSkeleton";
import styles from "./Catalog.module.css";

export default function CatalogScreen({ path = [] }: { path?: string[] }) {
  const entry = getCatalogEntry(path);
  const title = entry?.node.title ?? "Каталог";
  if (!entry) return <main className={styles.landing} aria-label="Каталог продукции Heisskraft" data-header-theme="light">
    <div className={styles.landingContent}>
      <Suspense fallback={<CatalogSkeleton cover />}><CatalogBrowser path={path} /></Suspense>
    </div>
  </main>;
  return <main className={styles.page} data-header-theme="light" data-catalog-section={path[0]}>
    <h1 className={styles.srOnly}>{title}</h1>
    <Suspense fallback={<CatalogSkeleton count={entry?.node.children?.length ?? (entry ? 1 : 3)} />}>
      <CatalogBrowser path={path} />
    </Suspense>
  </main>;
}
