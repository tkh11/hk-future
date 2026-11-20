'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { useHydrated } from '@/lib/use-hydrated';
import { nomenclatureLimits } from '@/lib/nomenclature';
import ui from './ui.module.css';

type PagerProps = {
  page: number; pages: number; total: number; limit: number; disabled?: boolean; limits?: number[];
};
type ChangePage = (page: number, limit: number) => void;

export default function ListPager(props: PagerProps) {
  const router = useRouter();
  const [pending, start] = useTransition();
  function change(nextPage: number, nextLimit: number) {
    const url = new URL(window.location.href);
    url.searchParams.set('page', String(nextPage));
    url.searchParams.set('limit', String(nextLimit));
    start(() => router.replace(url.pathname + url.search + url.hash, { scroll: false }));
  }
  return <PagerControls {...props} disabled={props.disabled || pending} onChange={change} />;
}

export function PagerControls({ page, pages, total, limit, disabled, limits = nomenclatureLimits, onChange }: PagerProps & { onChange: ChangePage }) {
  const ready = useHydrated();
  const busy = !ready || disabled;
  return <nav className={ui.pager} aria-label="Страницы списка">
    <label>Позиций на странице <select value={limit} disabled={busy} onChange={e => onChange(1, Number(e.target.value))}>
      {limits.map(value => <option key={value}>{value}</option>)}
    </select></label>
    <span className={ui.spacer} />
    <span>Всего позиций: {total}</span>
    {pages > 1 && <>
      <button type="button" className={ui.button} disabled={page <= 1 || busy} onClick={() => onChange(page - 1, limit)}>Назад</button>
      <span>{page} из {pages}</span>
      <button type="button" className={ui.button} disabled={page >= pages || busy} onClick={() => onChange(page + 1, limit)}>Вперёд</button>
    </>}
  </nav>;
}
