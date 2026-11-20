"use client";

import { useEffect, useId, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import Image from "next/image";
import Link, { useLinkStatus } from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { publicPath } from "@/lib/public-path";
import { searchSite, type SiteSearchEntry } from "@/lib/site-search";
import styles from "./SiteSearch.module.css";

function SearchIcon({ open = false }: { open?: boolean }) {
  return <svg className={`site-header__search-icon ${styles.icon}`} data-open={open} width="15" height="15" viewBox="0 0 24 24" aria-hidden="true" fill="none">
    <g className={styles.magnifier}>
      <circle cx="11" cy="11" r="6.25" stroke="currentColor" strokeWidth="1.75" />
      <path d="M16.2 16.2L20.5 20.5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
    </g>
    <path className={styles.closeIcon} d="M6 6L18 18M18 6L6 18" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" />
  </svg>;
}

function Thumbnail({ image }: { image?: string }) {
  const [failed, setFailed] = useState(false);
  const fallback = !image || failed;
  return <span className={styles.thumbnail} data-fallback={fallback}>
    <Image src={publicPath(fallback ? "/brand/small-black-logo.svg" : image)} width={56} height={56} unoptimized alt="" onError={() => setFailed(true)} />
  </span>;
}

function ResultPreview({ result }: { result: SiteSearchEntry }) {
  const { pending } = useLinkStatus();
  return <>
    <Thumbnail key={result.image} image={result.image} />
    <span className={styles.copy} aria-busy={pending}>
      <span className={styles.kind}>
        {pending ? <span className={styles.pending} role="status"><span className={styles.spinner} aria-hidden="true" />Открываем…</span> : result.kind}
      </span>
      <span className={styles.title}>{result.title}</span>
      {result.description && <span className={styles.description}>{result.description}</span>}
    </span>
  </>;
}

// Loaded once per browser session, on first use, instead of with every page.
let searchIndex: Promise<SiteSearchEntry[]> | null = null;
function loadSearchIndex() {
  searchIndex ??= fetch(publicPath("/search-index.json"))
    .then(response => {
      if (!response.ok) throw new Error(`Search index: ${response.status}`);
      return response.json() as Promise<SiteSearchEntry[]>;
    })
    .catch(error => {
      searchIndex = null;
      throw error;
    });
  return searchIndex;
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mobile?: boolean;
};

export default function SiteSearch({ open, onOpenChange, mobile = false }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const previousPath = useRef(pathname);
  const formRef = useRef<HTMLFormElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const toggleRef = useRef<HTMLButtonElement>(null);
  const [query, setQuery] = useState("");
  const [engaged, setEngaged] = useState(false);
  const [entries, setEntries] = useState<SiteSearchEntry[] | null>(null);
  const [failed, setFailed] = useState(false);
  const id = useId();
  const results = entries ? searchSite(entries, query) : [];
  const showResults = open && engaged && Boolean(query.trim());
  const ready = entries !== null;

  useEffect(() => {
    if (!open || entries || failed) return;
    let active = true;
    loadSearchIndex().then(
      loaded => { if (active) setEntries(loaded); },
      () => { if (active) setFailed(true); },
    );
    return () => { active = false; };
  }, [open, entries, failed]);

  // Keep the selected link mounted until navigation commits, including when
  // CMS data is slow. Modified clicks retain normal new-tab browser behavior.
  useEffect(() => {
    if (previousPath.current === pathname) return;
    previousPath.current = pathname;
    onOpenChange(false);
  }, [pathname, onOpenChange]);

  useEffect(() => {
    if (!open || mobile) return;
    inputRef.current?.focus();
    function onPointerDown(event: PointerEvent) {
      if (!formRef.current?.contains(event.target as Node)) onOpenChange(false);
    }
    function onKeyDown(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        onOpenChange(false);
        toggleRef.current?.focus();
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, mobile, onOpenChange]);

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/catalog?q=${encodeURIComponent(value)}` : "/catalog");
    onOpenChange(false);
  }

  function onKeyDown(event: KeyboardEvent<HTMLFormElement>) {
    if (!showResults || !results.length || !["ArrowDown", "ArrowUp"].includes(event.key) || event.nativeEvent.isComposing) return;
    const links = [...(formRef.current?.querySelectorAll<HTMLAnchorElement>("[data-search-result]") ?? [])];
    const index = links.findIndex(link => link === document.activeElement);
    if (index < 0 && document.activeElement !== inputRef.current) return;
    event.preventDefault();
    const next = index < 0 ? (event.key === "ArrowDown" ? 0 : links.length - 1) : index + (event.key === "ArrowDown" ? 1 : -1);
    (links[next] ?? inputRef.current)?.focus();
  }

  return <form
    ref={formRef}
    className={mobile ? "site-header__menu-search" : `site-header__search${open ? " is-open" : ""}`}
    role="search" onSubmit={onSubmit} onKeyDown={onKeyDown}
    onFocus={() => setEngaged(true)}
    onBlur={event => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setEngaged(false);
    }}
  >
    <div className={styles.field}>
      {mobile && <SearchIcon />}
      <input
        ref={inputRef} className={mobile ? "site-header__menu-search-input" : "site-header__search-input"}
        type="search" name="q" value={query} placeholder="Поиск" aria-label="Поиск"
        aria-hidden={!open} tabIndex={open ? 0 : -1} autoComplete="off" maxLength={160}
        aria-controls={showResults ? `${id}-results` : undefined}
        aria-describedby={showResults ? `${id}-status` : undefined}
        onChange={event => setQuery(event.target.value)}
      />
    </div>
    {!mobile && <button type="button" className="site-header__search-toggle" ref={toggleRef}
      aria-label={open ? "Закрыть поиск" : "Поиск"} aria-expanded={open} onClick={() => onOpenChange(!open)}>
      <SearchIcon open={open} />
    </button>}
    <span id={`${id}-status`} className={styles.srOnly} role="status" aria-atomic="true">
      {showResults && ready ? (results.length ? `Подходящих результатов: ${results.length}. Стрелки вверх и вниз — выбор результата.` : "Ничего не найдено. Попробуйте другое название.") : ""}
    </span>
    {showResults && <div className={styles.results} data-mobile={mobile}>
      {!ready ? <p id={`${id}-results`} className={styles.empty}>{failed ? "Поиск недоступен. Обновите страницу." : "Загрузка…"}</p>
      : results.length ? <ul id={`${id}-results`} aria-label="Быстрые результаты поиска">
        {results.map(result => <li key={result.href}>
          <Link href={result.href} prefetch={false} data-search-result
            onMouseDown={event => {
              // Some browsers blur the input without focusing the link. That
              // would remove the results before mouseup/click can reach them.
              if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) event.preventDefault();
            }}
            onNavigate={() => {
              const target = new URL(publicPath(result.href), window.location.href);
              if (target.pathname === window.location.pathname && target.search === window.location.search) onOpenChange(false);
            }}>
            <ResultPreview result={result} />
          </Link>
        </li>)}
      </ul> : <p id={`${id}-results`} className={styles.empty}>Ничего не найдено. Попробуйте другое название.</p>}
    </div>}
  </form>;
}
