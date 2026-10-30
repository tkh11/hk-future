'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useOptimistic, useRef, useState, useTransition } from 'react';
import { SearchIcon } from './icons';
import css from './FilterBar.module.css';
import ui from './ui.module.css';

export type FilterSelect = { name: string; label: string; options: { value: string; label: string }[] };
export type FilterPill = { name: string; value: string; label: string };
type Values = Record<string, string | undefined>;

export default function FilterBar({ placeholder, selects, pills, values }: { placeholder: string; selects: FilterSelect[]; pills: FilterPill[]; values: Values }) {
  const router = useRouter();
  const pathname = usePathname();
  const [pending, startTransition] = useTransition();
  const [current, setCurrent] = useOptimistic(values, (state: Values, patch: Values) => ({ ...state, ...patch }));
  const [query, setQuery] = useState(values.q ?? '');
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  function apply(patch: Values) {
    const params = new URLSearchParams(window.location.search);
    for (const [key, value] of Object.entries(patch)) {
      if (value) params.set(key, value);
      else params.delete(key);
    }
    params.delete('page');
    const search = params.toString();
    startTransition(() => {
      setCurrent(patch);
      router.replace(search ? `${pathname}?${search}` : pathname, { scroll: false });
    });
  }

  function onSearch(value: string) {
    setQuery(value);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => apply({ q: value.trim() || undefined }), 350);
  }

  function reset() {
    clearTimeout(timer.current);
    setQuery('');
    startTransition(() => router.replace(pathname, { scroll: false }));
  }

  const filtered = Object.entries(values).some(([key, value]) => key !== 'sort' && value);

  return (
    <div className={css.bar} aria-busy={pending}>
      <div role="search" className={css.search}>
        <SearchIcon />
        <input
          type="search"
          value={query}
          onChange={event => onSearch(event.target.value)}
          onKeyDown={event => { if (event.key === 'Enter') { clearTimeout(timer.current); apply({ q: query.trim() || undefined }); } }}
          placeholder={placeholder}
          aria-label={placeholder}
          autoComplete="off"
          spellCheck={false}
        />
      </div>
      {selects.map(select => (
        <label key={select.name} className={css.select} data-active={Boolean(current[select.name])}>
          <span className="visually-hidden">{select.label}</span>
          <select value={current[select.name] ?? ''} onChange={event => apply({ [select.name]: event.target.value || undefined })}>
            <option value="">{select.label}</option>
            {select.options.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
          </select>
        </label>
      ))}
      {pills.map(pill => {
        const pressed = current[pill.name] === pill.value;
        return (
          <button key={pill.name + pill.value} type="button" className={ui.pill} aria-pressed={pressed} onClick={() => apply({ [pill.name]: pressed ? undefined : pill.value })}>
            {pill.label}
          </button>
        );
      })}
      {filtered ? <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={reset}>Сбросить</button> : null}
      <span role="status" className={css.status}>{pending ? 'Обновляю…' : ''}</span>
    </div>
  );
}
