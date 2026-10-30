'use client';

import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { SearchIcon, useConfig, useRouteTransition } from '@payloadcms/ui';
import { useRouter } from 'next/navigation';

export type Destination = { title: string; section: string; href: string };
type Result = Destination & { id: string; meta?: string };
type Found = { status: 'idle' | 'loading' | 'done' | 'error'; results: Result[] };

const minQuery = 2;
const debounceMs = 200;
const idle: Found = { status: 'idle', results: [] };
const noSubscription = () => () => {};

function catalogQuery(fields: Record<string, string>, query: string, extra: Record<string, string>) {
  const params = new URLSearchParams({ depth: '0', limit: '6', draft: 'true', ...extra });
  Object.keys(fields).forEach((field, index) => params.set(`where[or][${index}][${field}][like]`, query));
  Object.values(fields).forEach(select => params.set(`select[${select}]`, 'true'));
  return params;
}

async function searchCatalog(query: string, api: string, admin: string, signal: AbortSignal): Promise<Result[]> {
  const products = catalogQuery({ title: 'title', slug: 'slug' }, query, {});
  const variants = catalogQuery({ sku: 'sku', title: 'title' }, query, { depth: '1', 'populate[products][title]': 'true' });
  variants.set('select[product]', 'true');
  const [productRes, variantRes] = await Promise.all([
    fetch(`${api}/products?${products}`, { credentials: 'same-origin', signal }),
    fetch(`${api}/product-variants?${variants}`, { credentials: 'same-origin', signal }),
  ]);
  if (!productRes.ok || !variantRes.ok) throw new Error('search failed');
  const [productBody, variantBody] = await Promise.all([productRes.json(), variantRes.json()]) as [
    { docs: { id: number; title?: string; slug?: string }[] },
    { docs: { id: number; title?: string; sku?: string; product?: { id: number; title?: string } | number | null }[] },
  ];
  return [
    ...productBody.docs.map(doc => ({ id: `product-${doc.id}`, section: 'Товары', title: doc.title || 'Без названия', meta: doc.slug, href: `${admin}/collections/products/${doc.id}` })),
    ...variantBody.docs.map(doc => {
      const parent = doc.product && typeof doc.product === 'object' ? doc.product.title : undefined;
      return { id: `variant-${doc.id}`, section: 'Варианты', title: doc.sku ? `${doc.sku} · ${doc.title ?? ''}`.trim() : doc.title || 'Без названия', meta: parent, href: `${admin}/collections/product-variants/${doc.id}` };
    }),
  ];
}

/** ⌘K / Ctrl+K: jump to a section, a product or a variant by its SKU. */
export default function AdminCommandMenu({ destinations, searchCatalog: canSearch, onNavigate }: { destinations: Destination[]; searchCatalog: boolean; onNavigate: () => void }) {
  const { config } = useConfig();
  const router = useRouter();
  const { startRouteTransition } = useRouteTransition();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const mounted = useSyncExternalStore(noSubscription, () => true, () => false);
  const shortcut = useSyncExternalStore(noSubscription, () => /Mac|iPhone|iPad/.test(navigator.userAgent) ? '⌘K' : 'Ctrl K', () => '⌘K');
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const [found, setFound] = useState<Found>(idle);
  const pending = useRef<{ timer?: number; controller?: AbortController }>({});
  const openRef = useRef(open);
  useEffect(() => { openRef.current = open; });

  const cancelSearch = () => {
    window.clearTimeout(pending.current.timer);
    pending.current.controller?.abort();
    pending.current = {};
  };
  useEffect(() => cancelSearch, []);
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && !event.altKey && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        openRef.current();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  function search(value: string) {
    cancelSearch();
    const term = value.trim();
    if (!canSearch || term.length < minQuery) { setFound(idle); return; }
    const controller = new AbortController();
    setFound(current => ({ status: 'loading', results: current.results }));
    pending.current = { controller, timer: window.setTimeout(() => {
      searchCatalog(term, config.routes.api, config.routes.admin, controller.signal)
        .then(results => setFound({ status: 'done', results }))
        .catch(() => { if (!controller.signal.aborted) setFound({ status: 'error', results: [] }); });
    }, debounceMs) };
  }

  const trimmed = query.trim();
  const lower = trimmed.toLowerCase();
  const sections: Result[] = destinations
    .filter(item => !lower || item.title.toLowerCase().includes(lower) || item.section.toLowerCase().includes(lower))
    .map(item => ({ ...item, id: `nav-${item.href}` }));
  const results = [...sections, ...found.results];
  const current = Math.min(active, Math.max(results.length - 1, 0));

  function open() {
    const dialog = dialogRef.current;
    if (!dialog || dialog.open) return;
    cancelSearch();
    setQuery(''); setActive(0); setFound(idle);
    dialog.showModal();
    inputRef.current?.focus();
  }
  function go(result: Result | undefined) {
    if (!result) return;
    dialogRef.current?.close();
    onNavigate();
    startRouteTransition(() => router.push(result.href));
  }
  function onInputKey(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      if (!results.length) return;
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive((current + step + results.length) % results.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(results[current]);
    }
  }

  const status = trimmed.length >= minQuery && canSearch
    ? found.status === 'loading' ? 'Ищем в каталоге…' : found.status === 'error' ? 'Не удалось выполнить поиск. Повторите попытку.' : found.status === 'done' && !results.length ? 'Ничего не найдено.' : `Найдено: ${results.length}`
    : canSearch ? 'Введите название, адрес или артикул варианта.' : '';
  const groups = [...new Set(results.map(result => result.section))];

  const dialog = <dialog ref={dialogRef} className="hk-admin-cmd" aria-label="Поиск по админке" onClick={event => { if (event.target === event.currentTarget) event.currentTarget.close(); }}>
    <div className="hk-admin-cmd__panel">
      <div className="hk-admin-cmd__field">
        <SearchIcon />
        <input ref={inputRef} type="text" role="combobox" aria-expanded={results.length > 0} aria-controls={listId} aria-autocomplete="list"
          aria-activedescendant={results[current] ? `${listId}-${results[current].id}` : undefined}
          placeholder={canSearch ? 'Раздел, товар или артикул' : 'Раздел'} value={query} autoComplete="off" spellCheck={false}
          onChange={event => { const value = event.currentTarget.value; setQuery(value); setActive(0); search(value); }} onKeyDown={onInputKey} />
        <kbd>Esc</kbd>
      </div>
      <ul id={listId} role="listbox" aria-label="Результаты" className="hk-admin-cmd__list">
        {groups.map(group => <li key={group} role="presentation">
          <span className="hk-admin-cmd__group" aria-hidden="true">{group}</span>
          <ul role="group" aria-label={group}>
            {results.filter(result => result.section === group).map(result => {
              const index = results.indexOf(result);
              return <li key={result.id} id={`${listId}-${result.id}`} role="option" aria-selected={index === current} className="hk-admin-cmd__option"
                onMouseMove={() => { if (index !== current) setActive(index); }} onClick={() => go(result)}>
                <span>{result.title}</span>{result.meta && <small>{result.meta}</small>}
              </li>;
            })}
          </ul>
        </li>)}
      </ul>
      <p className="hk-admin-cmd__status" role="status">{status}</p>
    </div>
  </dialog>;

  return <>
    <button type="button" className="hk-admin-cmd-trigger" onClick={open} aria-keyshortcuts="Meta+K Control+K">
      <SearchIcon /><span>Найти</span><kbd>{shortcut}</kbd>
    </button>
    {mounted && createPortal(dialog, document.body)}
  </>;
}
