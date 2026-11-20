'use client';

import Link from 'next/link';
import { Dialog } from 'radix-ui';
import { useEffect, useRef, useState, useTransition } from 'react';
import { bulkUpdateProducts, type BulkInput } from '../actions';
import type { ProductRow } from '../data';
import { formatDate, numberFormat, profileLabel } from '../labels';
import { productHref } from '../routes';
import { ariaSort, PublishBadge, ReviewBadge, SortLink, Thumb, type SortState } from './parts';
import css from './ProductsTable.module.css';
import ui from './ui.module.css';

type Category = { id: number; title: string; path: string };
const missingText = (missing: ProductRow['missing']) =>
  missing.length === 2 ? 'Нет фото и описания' : missing[0] === 'photo' ? 'Нет фото' : 'Нет описания';

function isTyping(target: EventTarget | null) {
  return target instanceof HTMLElement && (target.isContentEditable || ['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName));
}

export default function ProductsTable({ rows, categories, sorts }: { rows: ProductRow[]; categories: Category[]; sorts: { title: SortState; updatedAt: SortState } }) {
  const [selected, setSelected] = useState<ReadonlySet<number>>(new Set());
  const [active, setActive] = useState(-1);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [category, setCategory] = useState('');
  const [message, setMessage] = useState('');
  const [pending, startTransition] = useTransition();
  const body = useRef<HTMLTableSectionElement>(null);

  const chosen = rows.filter(row => selected.has(row.id)).map(row => row.id);
  const all = rows.length > 0 && chosen.length === rows.length;

  function toggle(id: number) {
    setSelected(current => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target) || document.querySelector('[role="dialog"]')) return;
      const key = event.key.toLowerCase();
      if (key !== 'j' && key !== 'k' && key !== 'x') return;
      if (key === 'x') {
        if (rows[active]) toggle(rows[active].id);
        return;
      }
      event.preventDefault();
      const next = Math.max(0, Math.min(rows.length - 1, active + (key === 'j' ? 1 : -1)));
      setActive(next);
      body.current?.querySelectorAll<HTMLAnchorElement>('a[data-row-link]')[next]?.focus();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [rows, active]);

  function run(input: BulkInput) {
    startTransition(async () => {
      const result = await bulkUpdateProducts(input);
      if ('error' in result) {
        setMessage(result.error);
        return;
      }
      const failed = result.failed.length ? ` Не сохранено: ${result.failed.length} — ${result.failed[0].message}` : '';
      setMessage(`Сохранено в черновики: ${result.ok}.${failed}`);
      setSelected(new Set(result.failed.map(f => f.id)));
      setDialogOpen(false);
      setCategory('');
    });
  }

  if (!rows.length) {
    return (
      <div className={`${ui.tableWrap} ${ui.empty}`}>
        <p>Ничего не найдено.</p>
        <p>Измените фильтры или сбросьте их.</p>
      </div>
    );
  }

  const bulk = (
      <div className={css.bulk} role="toolbar" aria-label="Действия с выбранными">
        <span className={css.count}>Выбрано {chosen.length}</span>
        <Dialog.Root open={dialogOpen} onOpenChange={setDialogOpen}>
          <Dialog.Trigger className={ui.button} disabled={pending}>Сменить раздел…</Dialog.Trigger>
          <Dialog.Portal>
            <Dialog.Overlay className={css.overlay} />
            <Dialog.Content className={css.dialog}>
              <Dialog.Title className={css.dialogTitle}>Сменить раздел у {chosen.length} товаров</Dialog.Title>
              <Dialog.Description className={css.dialogText}>
                Изменения сохранятся в черновики. На сайте раздел поменяется после публикации карточек.
              </Dialog.Description>
              <label className={css.field}>
                <span>Новый раздел</span>
                <select value={category} onChange={event => setCategory(event.target.value)} autoFocus>
                  <option value="">Выберите раздел</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.path ? c.path.split('/').slice(0, -1).map(() => '— ').join('') : ''}{c.title}</option>)}
                </select>
              </label>
              <div className={css.dialogActions}>
                <Dialog.Close className={`${ui.button} ${ui.ghost}`}>Отмена</Dialog.Close>
                <button type="button" className={`${ui.button} ${ui.primary}`} disabled={!category || pending} onClick={() => run({ type: 'category', ids: chosen, category: Number(category) })}>
                  {pending ? 'Сохраняю…' : 'Сменить раздел'}
                </button>
              </div>
            </Dialog.Content>
          </Dialog.Portal>
        </Dialog.Root>
        <button type="button" className={ui.button} disabled={pending} onClick={() => run({ type: 'review', ids: chosen, state: 'review' })}>Отметить для проверки</button>
        <button type="button" className={ui.button} disabled={pending} onClick={() => run({ type: 'review', ids: chosen, state: 'ready' })}>Проверено</button>
        <button type="button" className={ui.button} disabled={pending} onClick={() => run({ type: 'publish-request', ids: chosen, requested: true })}>Отправить на публикацию</button>
        <a className={ui.button} href={`/studio/export?ids=${chosen.join(',')}`}>Экспорт XLSX</a>
        <span className={ui.spacer} />
        <button type="button" className={`${ui.button} ${ui.ghost}`} onClick={() => setSelected(new Set())}>Снять выбор</button>
      </div>
  );

  return (
    <>
      <div className={ui.tableWrap}>
        <table className={ui.table}>
          <caption className="visually-hidden">Товары</caption>
          <thead>
            <tr>
              <th className={ui.check}>
                <input
                  type="checkbox"
                  aria-label="Выбрать все на странице"
                  checked={all}
                  ref={node => { if (node) node.indeterminate = chosen.length > 0 && !all; }}
                  onChange={() => setSelected(all ? new Set() : new Set(rows.map(r => r.id)))}
                />
              </th>
              <th className={ui.thumbCell}><span className="visually-hidden">Фото</span></th>
              <th aria-sort={ariaSort(sorts.title)}><SortLink label="Товар" state={sorts.title} /></th>
              <th>Раздел</th>
              <th>Тип</th>
              <th className={ui.end}>Номенклатура</th>
              <th className={ui.end}>Документы</th>
              <th>Публикация</th>
              <th>Внимание</th>
              <th aria-sort={ariaSort(sorts.updatedAt)}><SortLink label="Изменено" state={sorts.updatedAt} /></th>
            </tr>
          </thead>
          <tbody ref={body}>
            {rows.map((row, index) => (
              <tr key={row.id} data-active={index === active} data-selected={selected.has(row.id)}>
                <td className={ui.check}>
                  <input type="checkbox" aria-label={`Выбрать «${row.title}»`} checked={selected.has(row.id)} onChange={() => toggle(row.id)} />
                </td>
                <td className={ui.thumbCell}><Thumb image={row.image} /></td>
                <td className={ui.wide}>
                  <a href={productHref(row.id)} className={ui.rowTitle} data-row-link onFocus={() => setActive(index)}>{row.title}</a>
                  <span className={ui.rowMeta}>
                    {row.missing.length ? <span className={css.missing}>{missingText(row.missing)} · </span> : null}
                    {row.sku || row.slug}
                  </span>
                </td>
                <td className={ui.clip} title={row.category ?? undefined}>{row.category ?? <span className={ui.muted}>—</span>}</td>
                <td className={ui.wrap}>{profileLabel(row.profile)}</td>
                <td className={ui.end}>
                  {row.variants ? <Link href={`/studio/assortment/variants?product=${row.id}`} className={css.countLink}>{numberFormat.format(row.variants)}</Link> : <span className={ui.muted}>0</span>}
                </td>
                <td className={ui.end}>{row.docs || <span className={ui.muted}>0</span>}</td>
                <td><PublishBadge status={row.status} /></td>
                <td><ReviewBadge review={row.review} /></td>
                <td className={`num ${ui.muted}`}>{formatDate(row.updatedAt)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className={css.dock}>
        {chosen.length ? bulk : null}
        <p role="status" className={css.message}>{message}</p>
      </div>
    </>
  );
}
