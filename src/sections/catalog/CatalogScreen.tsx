import { Suspense } from "react";
import Link from "next/link";
import { catalogHref, getCatalogEntry } from "@/lib/catalog";
import CatalogBrowser from "./CatalogBrowser";
import CatalogSkeleton from "./CatalogSkeleton";
import styles from "./Catalog.module.css";

export default function CatalogScreen({ path = [] }: { path?: string[] }) {
  const entry = getCatalogEntry(path);
  const title = entry?.node.title ?? "Каталог";
  return <main className={styles.page} data-header-theme="light">
    {entry && <nav className={styles.breadcrumbs} aria-label="Путь по каталогу"><ol>
      <li><Link href="/catalog">Каталог</Link></li>
      {entry.trail.map((node, index) => <li key={node.slug}>{index === entry.trail.length - 1 ? <span aria-current="page">{node.title}</span> : <Link href={catalogHref(path.slice(0, index + 1))}>{node.title}</Link>}</li>)}
    </ol></nav>}
    <header className={styles.heading}>
      <h1>{title}</h1>
      {!entry && <p>Выберите направление, затем систему или тип оборудования.</p>}
      {entry?.node.children && <p>{path[0] === "pipelines" ? "Выберите трубопроводную систему." : "Выберите категорию насосного оборудования."}</p>}
    </header>
    <Suspense fallback={<CatalogSkeleton count={entry?.node.children?.length ?? (entry ? 1 : 3)} />}>
      <CatalogBrowser path={path} />
    </Suspense>
  </main>;
}
