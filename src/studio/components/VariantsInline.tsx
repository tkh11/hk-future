'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState, useTransition } from 'react';
import { specColumns, type Profile } from '../labels';
import { variantHref } from '../routes';
import { createVariant, markPackagingVerified, pasteVariants, saveVariantRow } from '../variant-actions';
import ListPager from './ListPager';
import type { VariantListItem } from '../variant-data';
import { parseVariantPaste, variantDraftPatch, type Packaging, type Specs } from '../variant-form';
import css from './editor/Editor.module.css';
import f from './form.module.css';
import ui from './ui.module.css';

type Row = VariantListItem;

export default function VariantsInline({ productId, profile, initial, pagination, readOnly }: {
  productId: number; profile: Profile | null; initial: Row[]; pagination: { page: number; pages: number; total: number; limit: number }; readOnly: boolean;
}) {
  const router = useRouter();
  const [rows, setRows] = useState(initial);
  const [selected, setSelected] = useState<number | null>(initial[0]?.id ?? null);
  const [checked, setChecked] = useState<ReadonlySet<number>>(new Set());
  const [notice, setNotice] = useState('');
  const [pending, start] = useTransition();
  const columns = useMemo(() => specColumns(profile ?? undefined).slice(0, 5), [profile]);
  const current = rows.find(r => r.id === selected);

  const patch = (id: number, next: Partial<Row['values']>) => {
    const previous = rows.find(row => row.id === id);
    if (!previous) return;
    setRows(list => list.map(row => row.id === id ? { ...row, values: { ...row.values, ...next } } : row));
    start(async () => {
      const result = await saveVariantRow(id, variantDraftPatch(next, previous.values));
      setNotice('error' in result ? result.error : '');
      if (!('error' in result)) router.refresh();
    });
  };

  const add = () => start(async () => {
    const result = await createVariant(productId);
    if ('error' in result) return setNotice(result.error);
    router.refresh();
  });

  const paste = async () => {
    const text = await navigator.clipboard.readText().catch(() => '');
    const parsed = parseVariantPaste(text, profile);
    if (parsed.error) return setNotice(parsed.error);
    start(async () => {
      const result = await pasteVariants(productId, parsed.rows);
      setNotice(result.error ?? (result.failed ? `Добавлено ${result.ok}, не удалось ${result.failed}.` : `Добавлено ${result.ok}.`));
      router.refresh();
    });
  };

  const verify = () => start(async () => {
    const ids = checked.size ? [...checked] : current ? [current.id] : [];
    if (!ids.length) return setNotice('Выберите позиции.');
    const result = await markPackagingVerified(ids);
    setNotice(result.error ?? `Упаковка отмечена у ${result.ok}.`);
    if (!result.error) {
      setRows(list => list.map(row => ids.includes(row.id) ? { ...row, values: { ...row.values, packaging: { ...row.values.packaging, unitsVerified: true } } } : row));
      router.refresh();
    }
  });

  const specOf = (specs: Specs, key: string) => specs[key] ?? '';
  const pack = current?.values.packaging;

  return (
    <div className={css.split}>
      <div>
        <div className={css.toolbar}>
          <button type="button" className={ui.button} disabled={readOnly || pending} onClick={add}>Добавить</button>
          <button type="button" className={ui.button} disabled={readOnly || pending} onClick={() => void paste()}>Вставить из Excel</button>
          <button type="button" className={ui.button} disabled={readOnly || pending || (!checked.size && !current)} onClick={verify}>Упаковка проверена</button>
        </div>
        {notice ? <p className={f.notice} role="status">{notice}</p> : null}
        {rows.length ? (
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className="visually-hidden">Номенклатура товара</caption>
              <thead>
                <tr>
                  <th className={ui.check}><span className="visually-hidden">Выбор</span></th>
                  <th>Артикул</th>
                  <th>Исполнение</th>
                  <th>Размер</th>
                  {columns.map(c => <th key={c.key} className={ui.end}>{c.label}{c.unit ? `, ${c.unit}` : ''}</th>)}
                  <th>Упаковка</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(row => (
                  <tr key={row.id} data-active={row.id === selected || undefined} onClick={() => setSelected(row.id)}>
                    <td className={ui.check} onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={checked.has(row.id)} aria-label={row.values.sku || row.values.title}
                        onChange={() => setChecked(set => { const next = new Set(set); if (next.has(row.id)) next.delete(row.id); else next.add(row.id); return next; })} />
                    </td>
                    <td>
                      <input className={`${f.input} ${f.mono} ${css.cell}`} disabled={readOnly} value={row.values.sku}
                        onChange={e => patch(row.id, { sku: e.target.value })} aria-label="Артикул" />
                    </td>
                    <td>
                      <input className={`${f.input} ${css.cell}`} disabled={readOnly} value={row.values.title}
                        onChange={e => patch(row.id, { title: e.target.value })} aria-label="Исполнение" />
                      <Link href={variantHref(row.id)} className={css.link}>Карточка</Link>
                    </td>
                    <td>
                      <input className={`${f.input} ${css.cell}`} disabled={readOnly} value={row.values.size}
                        onChange={e => patch(row.id, { size: e.target.value })} aria-label="Размер" />
                    </td>
                    {columns.map(c => (
                      <td key={c.key} className={ui.end}>
                        <input className={`${f.input} ${css.cell} ${css.num}`} disabled={readOnly} inputMode="decimal" value={specOf(row.values.specs, c.key)}
                          onChange={e => {
                            const raw = e.target.value.replace(',', '.').trim();
                            const value = raw === '' ? null : Number(raw);
                            if (raw !== '' && Number.isNaN(value)) return;
                            patch(row.id, { specs: { ...row.values.specs, [c.key]: value } });
                          }} aria-label={c.label} />
                      </td>
                    ))}
                    <td>{row.values.packaging.unitsVerified ? <span className={ui.muted}>проверена</span> : <span className={css.warn}>не проверена</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p className={css.panelText}>Позиций пока нет. Добавьте строку или вставьте таблицу из Excel с заголовком «Артикул».</p>}
        <ListPager {...pagination} disabled={pending} />
      </div>
      {pack && current ? (
        <aside className={css.side} aria-label="Упаковка позиции">
          <h3>{current.values.sku || current.values.title || 'Позиция'}</h3>
          <PackField pack={pack} readOnly={readOnly} onChange={next => patch(current.id, { packaging: next })} />
          <p className={f.hint}><Link href={variantHref(current.id)} className={css.link}>Фото, цвет и заметки — в карточке позиции</Link></p>
        </aside>
      ) : null}
    </div>
  );
}

function PackField({ pack, readOnly, onChange }: { pack: Packaging; readOnly: boolean; onChange: (next: Packaging) => void }) {
  const row = (prefix: 'weight' | 'amount' | 'volume', label: string) => (
    <div className={css.packRow} key={prefix}>
      <span className={f.label}>{label}</span>
      <input className={f.input} disabled={readOnly} inputMode="decimal" value={pack[`${prefix}Value`] ?? ''} aria-label={`${label}, значение`}
        onChange={e => {
          const raw = e.target.value.replace(',', '.').trim();
          const value = raw === '' ? null : Number(raw);
          if (raw !== '' && Number.isNaN(value)) return;
          onChange({ ...pack, [`${prefix}Value`]: value });
        }} />
      <input className={f.input} disabled={readOnly} value={pack[`${prefix}Unit`]} aria-label={`${label}, единица`}
        onChange={e => onChange({ ...pack, [`${prefix}Unit`]: e.target.value })} />
      <input className={f.input} disabled={readOnly} value={pack[`${prefix}Note`]} aria-label={`${label}, примечание`}
        onChange={e => onChange({ ...pack, [`${prefix}Note`]: e.target.value })} />
    </div>
  );
  return (
    <div className={css.pack}>
      {row('weight', 'Вес')}
      {row('amount', 'Количество')}
      {row('volume', 'Объём')}
      <label className={f.check}>
        <input type="checkbox" checked={pack.unitsVerified} disabled={readOnly} onChange={e => onChange({ ...pack, unitsVerified: e.target.checked })} />
        Единицы проверены
      </label>
    </div>
  );
}
