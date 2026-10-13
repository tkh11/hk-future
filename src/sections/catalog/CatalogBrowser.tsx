"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import dynamic from "next/dynamic";
import { useRouter, useSearchParams } from "next/navigation";
import { catalog, catalogHref, getCatalogEntry, searchCatalog, type CatalogEntry } from "@/lib/catalog";
import CatalogCard from "./CatalogCard";
import styles from "./Catalog.module.css";

const CatalogArtwork = dynamic(() => import("./CatalogArtwork"), {
  ssr: false,
  loading: () => <span className={styles.skeleton} aria-hidden="true" />,
});

function CatalogResults({ path, initialQuery }: { path: string[]; initialQuery: string }) {
  const [query, setQuery] = useState(initialQuery);
  const router = useRouter();
  const current = getCatalogEntry(path);
  const children = path.length ? current?.node.children ?? [] : catalog;
  const searching = Boolean(query.trim());
  const covers = path.length === 0 && !searching;
  const entries: CatalogEntry[] = searching ? searchCatalog(query) : children.map(node => ({ node, path: [...path, node.slug], trail: [...(current?.trail ?? []), node] }));
  const selector = path[0] === "pipelines" ? { href: "/selection/pipelines", label: "Подбор трубопровода" } : path[0] === "pumps" ? { href: "/selection/pumps", label: "Подбор насосов" } : null;

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = query.trim();
    router.replace(`${catalogHref(path)}${search ? `?q=${encodeURIComponent(search)}` : ""}`, { scroll: false });
  }
  function clearSearch() {
    setQuery("");
    if (initialQuery) router.replace(catalogHref(path), { scroll: false });
  }

  return <>
    <div className={styles.toolbar}>
      <form className={styles.search} role="search" aria-label="Поиск разделов каталога" onSubmit={submit}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Найти раздел каталога" aria-label="Найти раздел каталога" autoComplete="off" />
        {query && <button type="button" aria-label="Очистить поиск" onClick={clearSearch}><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg></button>}
      </form>
      {!covers && <p className={styles.resultCount} role="status">{searching ? `Найдено разделов: ${entries.length}` : children.length ? `Разделов: ${children.length}` : ""}</p>}
    </div>
    {entries.length > 0 ? <ul className={`${styles.grid}${covers ? ` ${styles.coverGrid}` : ""}`} aria-label={searching ? "Результаты поиска разделов" : "Разделы каталога"}>
      {entries.map(entry => <CatalogCard key={catalogHref(entry.path)} entry={entry} showParent={searching} cover={covers} />)}
    </ul> : searching ? <div className={styles.empty}>
      <div className={styles.emptyCopy}><h2>Разделы не найдены</h2><p>Попробуйте другое название системы или тип оборудования.</p><button type="button" className="home-hero__link home-hero__link--secondary" onClick={clearSearch}>Сбросить поиск</button></div>
    </div> : <div className={`${styles.empty} deferred-block__content is-ready`}>
      <div className={styles.emptyArtwork}><CatalogArtwork kind={current?.node.art ?? "auxiliary"} /></div>
      <div className={styles.emptyCopy}><h2>Ассортимент скоро появится</h2><p>Информация о продукции этого раздела готовится к публикации.</p>
        {selector && <Link href={selector.href} className="home-hero__link home-hero__link--secondary">{selector.label}</Link>}
      </div>
    </div>}
  </>;
}

export default function CatalogBrowser({ path }: { path: string[] }) {
  const params = useSearchParams();
  const query = params.get("q") ?? "";
  return <CatalogResults key={`${catalogHref(path)}?${query}`} path={path} initialQuery={query} />;
}
