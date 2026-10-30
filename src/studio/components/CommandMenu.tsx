'use client';

import { useRouter } from 'next/navigation';
import { Dialog } from 'radix-ui';
import { useEffect, useId, useRef, useState, useSyncExternalStore, useTransition } from 'react';
import { searchCatalog, type SearchHit } from '../actions';
import { classic } from '../routes';
import { SearchIcon } from './icons';
import css from './CommandMenu.module.css';

const destinations: SearchHit[] = [
  { title: 'Обзор', href: '/studio', meta: 'Раздел' },
  { title: 'Товары', href: '/studio/assortment', meta: 'Ассортимент' },
  { title: 'Варианты', href: '/studio/assortment/variants', meta: 'Ассортимент' },
  { title: 'Требуют внимания', href: '/studio/assortment?attention=any', meta: 'Выборка товаров' },
  { title: 'Без фото', href: '/studio/assortment?missing=photo', meta: 'Выборка товаров' },
  { title: 'Без краткого описания', href: '/studio/assortment?missing=summary', meta: 'Выборка товаров' },
  { title: 'Конфликты вариантов', href: '/studio/assortment/variants?attention=blocked', meta: 'Выборка вариантов' },
  { title: 'Новый товар', href: classic('/collections/products/create'), meta: 'Классическая админка' },
  { title: 'Импорт каталога', href: classic('/import'), meta: 'Классическая админка' },
  { title: 'Медиатека', href: classic('/collections/media'), meta: 'Классическая админка' },
];

const noop = () => () => {};
const shortcutLabel = () => (/Mac|iPhone|iPad/.test(navigator.platform) ? '⌘K' : 'Ctrl K');

export default function CommandMenu() {
  const router = useRouter();
  const listId = useId();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [hits, setHits] = useState<{ query: string; found: SearchHit[] }>({ query: '', found: [] });
  const [active, setActive] = useState(0);
  const [searching, startSearch] = useTransition();
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const latest = useRef('');
  const shortcut = useSyncExternalStore(noop, shortcutLabel, () => '⌘K');

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        setOpen(value => !value);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const asked = query.trim();
  const term = asked.toLowerCase();
  const matches = term ? destinations.filter(d => d.title.toLowerCase().includes(term)) : destinations;
  const waiting = term.length >= 2 && (searching || hits.query !== asked);
  const options = [...matches, ...(hits.query === asked ? hits.found : [])];

  function changeOpen(next: boolean) {
    setOpen(next);
    if (!next) {
      clearTimeout(timer.current);
      latest.current = '';
      setQuery('');
      setHits({ query: '', found: [] });
      setActive(0);
    }
  }

  function search(value: string) {
    setQuery(value);
    setActive(0);
    clearTimeout(timer.current);
    latest.current = value.trim();
    if (latest.current.length < 2) return;
    timer.current = setTimeout(() => {
      const wanted = latest.current;
      startSearch(async () => {
        const found = await searchCatalog(wanted);
        if (latest.current === wanted) startSearch(() => setHits({ query: wanted, found }));
      });
    }, 200);
  }

  function go(hit: SearchHit) {
    changeOpen(false);
    if (hit.href.startsWith('/studio')) router.push(hit.href);
    else window.location.assign(hit.href);
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (!options.length) return;
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      setActive(index => (index + step + options.length) % options.length);
    } else if (event.key === 'Enter') {
      event.preventDefault();
      go(options[Math.min(active, options.length - 1)]);
    }
  }

  const status = waiting ? 'Ищу…' : !term ? 'Название, адрес или артикул варианта.' : options.length ? `Найдено: ${options.length}` : 'Ничего не найдено.';

  return (
    <Dialog.Root open={open} onOpenChange={changeOpen}>
      <Dialog.Trigger className={css.trigger}>
        <SearchIcon />
        <span>Найти</span>
        <kbd className={css.kbd} suppressHydrationWarning>{shortcut}</kbd>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className={css.overlay} />
        <Dialog.Content className={css.dialog} aria-describedby={undefined}>
          <Dialog.Title className="visually-hidden">Поиск по каталогу</Dialog.Title>
          <div className={css.field}>
            <SearchIcon />
            <input
              className={css.input}
              value={query}
              onChange={event => search(event.target.value)}
              onKeyDown={onKeyDown}
              placeholder="Товар, артикул, раздел…"
              role="combobox"
              aria-expanded={options.length > 0}
              aria-controls={listId}
              aria-activedescendant={options.length ? `${listId}-${Math.min(active, options.length - 1)}` : undefined}
              aria-autocomplete="list"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <ul id={listId} role="listbox" aria-label="Результаты" className={css.list}>
            {options.map((option, index) => (
              <li
                key={option.href + option.title}
                id={`${listId}-${index}`}
                role="option"
                aria-selected={index === active}
                className={css.option}
                onPointerMove={() => setActive(index)}
                onClick={() => go(option)}
              >
                <span className={css.title}>{option.title}</span>
                <span className={css.meta}>{option.meta}</span>
              </li>
            ))}
          </ul>
          <p role="status" className={css.status}>{status}</p>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
