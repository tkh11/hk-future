'use client';

import { useRouter } from 'next/navigation';
import { PagerControls } from './ListPager';
import { pageRange } from '../pagination';
import { useMemo, useState, useTransition } from 'react';
import { saveRecord } from '../record-actions';
import { suggestSlug } from '../form-utils';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

export type CategoryRow = { id: number; title: string; slug: string; path: string; parent: number | null; sortOrder: number; published: boolean; art: string };

const previewPath = (rows: CategoryRow[], parent: number | null, slug: string) => {
  const byId = new Map(rows.map(r => [r.id, r]));
  const parts = [slug];
  let current = parent;
  const seen = new Set<number>();
  while (current && !seen.has(current)) {
    seen.add(current);
    const node = byId.get(current);
    if (!node) break;
    parts.unshift(node.slug);
    current = node.parent;
  }
  return parts.join('/');
};

export default function CategoryTree({ rows }: { rows: CategoryRow[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<number | null>(rows[0]?.id ?? null);
  const [pending, start] = useTransition();
  const [notice, setNotice] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 20 });
  const ordered = useMemo(() => {
    const map = new Map<number | null, CategoryRow[]>();
    for (const row of rows) {
      const list = map.get(row.parent) ?? [];
      list.push(row);
      map.set(row.parent, list);
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title, 'ru'));
    const ordered: { row: CategoryRow; depth: number }[] = [];
    function visit(parent: number | null, depth: number) {
      for (const row of map.get(parent) ?? []) {
        ordered.push({ row, depth });
        visit(row.id, depth + 1);
      }
    }
    visit(null, 0);
    return ordered;
  }, [rows]);
  const paging = pageRange(ordered.length, params);
  const visible = ordered.slice(paging.offset, paging.offset + paging.limit);
  const current = visible.find(({ row }) => row.id === selected)?.row ?? visible[0]?.row;

  const save = (patch: Partial<CategoryRow>) => {
    if (!current) return;
    start(async () => {
      const result = await saveRecord('categories', current.id, {
        title: patch.title ?? current.title,
        slug: patch.slug ?? current.slug,
        parent: patch.parent === undefined ? current.parent : patch.parent,
        sortOrder: patch.sortOrder ?? current.sortOrder,
        art: patch.art ?? current.art,
      }, 'save');
      setNotice('error' in result ? result.error : 'Сохранено.');
      router.refresh();
    });
  };

  return (
    <div className={css.split}>
      <div>
        <nav className={css.tree} aria-label="Дерево категорий">
          {visible.map(({ row, depth }) => <button type="button" key={row.id} data-on={row.id === current?.id || undefined}
            style={{ paddingLeft: 8 + depth * 16 }} onClick={() => setSelected(row.id)}>
            <span>{row.title}</span>{!row.published && <span className={ui.muted}>черновик</span>}
          </button>)}
        </nav>
        <PagerControls {...paging} onChange={(page, limit) => setParams({ page, limit })} />
      </div>
      {current ? (
        <form className={`${f.form} ${f.section}`} onSubmit={e => e.preventDefault()}>
          {notice ? <p className={f.notice} role="status">{notice}</p> : null}
          <label className={f.field}><span className={f.label}>Название</span>
            <input className={f.input} defaultValue={current.title} key={current.id + 't'} onBlur={e => e.target.value !== current.title && save({ title: e.target.value })} />
          </label>
          <label className={f.field}><span className={f.label}>Адрес</span>
            <input className={`${f.input} ${f.mono}`} defaultValue={current.slug} key={current.id + 's'} onBlur={e => e.target.value !== current.slug && save({ slug: e.target.value })} />
          </label>
          <label className={f.field}><span className={f.label}>Родитель</span>
            <select className={f.select} value={current.parent ?? ''} onChange={e => save({ parent: e.target.value ? Number(e.target.value) : null })}>
              <option value="">Корень каталога</option>
              {rows.filter(r => r.id !== current.id).map(r => <option key={r.id} value={r.id}>{r.path || r.title}</option>)}
            </select>
          </label>
          <label className={f.field}><span className={f.label}>Порядок</span>
            <input className={f.input} inputMode="numeric" defaultValue={current.sortOrder} key={current.id + 'o'} onBlur={e => save({ sortOrder: Number(e.target.value) || 0 })} />
          </label>
          <p className={f.hint}>Путь после сохранения: /catalog/{previewPath(rows, current.parent, current.slug || suggestSlug(current.title))}</p>
          <p className={ui.muted}>{current.published ? 'Раздел опубликован' : 'Черновик — посетители его не видят.'}</p>
          <div className={f.actions}>
            <button type="button" className={ui.button} disabled={pending} onClick={() => save({ sortOrder: current.sortOrder - 10 })}>Выше</button>
            <button type="button" className={ui.button} disabled={pending} onClick={() => save({ sortOrder: current.sortOrder + 10 })}>Ниже</button>
          </div>
        </form>
      ) : <p className={ui.muted}>Выберите раздел.</p>}
    </div>
  );
}
