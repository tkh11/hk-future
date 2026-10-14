"use client";

import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Link from "next/link";
import { catalogHref, type CatalogNode } from "@/lib/catalog";
import styles from "./Catalog.module.css";

type Props = {
  path: string[];
  trail: CatalogNode[];
  query: string;
  onQuery: (query: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
  onClear: () => void;
};

export default function CatalogFloatingNav({ path, trail, query, onQuery, onSubmit, onClear }: Props) {
  const [open, setOpen] = useState(Boolean(query));
  const bar = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const mounted = useRef(false);

  // Rest on the footer instead of covering it: lift the bar by however much of
  // the footer is currently visible, so its bottom edge stays above the footer.
  useEffect(() => {
    const element = bar.current;
    const footer = document.querySelector<HTMLElement>(".deferred-block--footer");
    if (!element || !footer) return;
    // Updated inside the scroll event itself, so the bar moves in the same frame
    // as the footer and never lags behind smooth scrolling.
    const update = () => {
      const lift = Math.max(0, window.innerHeight - footer.getBoundingClientRect().top);
      element.style.setProperty("--float-lift", lift.toFixed(2));
    };
    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    // Content above the footer can change height without any scrolling.
    const observer = new ResizeObserver(update);
    observer.observe(document.body);
    observer.observe(footer);
    return () => {
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
      observer.disconnect();
    };
  }, []);

  // Move focus into the field only after the visitor opens it, not on first render.
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    if (open) input.current?.focus({ preventScroll: true });
  }, [open]);

  const items = [
    { title: "Каталог", href: "/catalog" },
    ...trail.map((node, index) => ({ title: node.title, href: catalogHref(path.slice(0, index + 1)) })),
  ];
  const parent = items[items.length - 2];

  function closeSearch() {
    onClear();
    setOpen(false);
  }

  function toggleSearch() {
    if (!open) setOpen(true);
    else if (!query) setOpen(false);
    else input.current?.focus({ preventScroll: true });
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (event.key !== "Escape" || !open) return;
    event.preventDefault();
    closeSearch();
    toggle.current?.focus({ preventScroll: true });
  }

  return <div ref={bar} className={styles.floatBar} data-search-open={open}>
    <div className={styles.floatPath}>
      <nav aria-label="Путь по каталогу"><ol>
        {items.map((item, index) => {
          const last = index === items.length - 1;
          return <li key={item.href} className={index > 0 && !last ? styles.crumbMiddle : undefined}>
            {last ? <span aria-current="page">{item.title}</span> : <Link href={item.href}>{item.title}</Link>}
          </li>;
        }).flatMap((crumb, index) => index === 0 && items.length > 2
          ? [crumb, <li key="more" className={styles.crumbMore}><Link href={parent.href} aria-label={`На уровень выше: ${parent.title}`}>…</Link></li>]
          : [crumb])}
      </ol></nav>
    </div>
    <span className={styles.floatDivider} aria-hidden="true" />
    <form
      className={styles.floatSearch}
      role="search"
      aria-label="Поиск разделов каталога"
      onSubmit={onSubmit}
      onKeyDown={onKeyDown}
      onBlur={event => { if (!query && !event.currentTarget.contains(event.relatedTarget)) setOpen(false); }}
    >
      <button ref={toggle} type="button" className={styles.floatIcon} aria-label={open && !query ? "Свернуть поиск" : "Поиск по каталогу"} aria-expanded={open} aria-controls="catalog-float-field" onClick={toggleSearch}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 5 5" /></svg>
      </button>
      <div id="catalog-float-field" className={styles.floatField} inert={!open}>
        <input ref={input} type="search" enterKeyHint="search" value={query} onChange={event => onQuery(event.target.value)} placeholder="Поиск по каталогу" aria-label="Поиск по каталогу" autoComplete="off" />
        <button type="button" className={styles.floatClose} aria-label="Закрыть поиск" onClick={closeSearch}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m6 6 12 12M6 18 18 6" /></svg>
        </button>
      </div>
    </form>
  </div>;
}
