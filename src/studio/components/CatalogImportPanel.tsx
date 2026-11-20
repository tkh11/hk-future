'use client';

import { useId, useRef, useState } from 'react';
import type { ImportApplyResult, ImportBatch, ImportField, ImportPreviewRow } from '@/cms/import/types';
import { PagerControls } from './ListPager';
import { pageRange } from '../pagination';
import f from './form.module.css';
import ui from './ui.module.css';

const fieldNames: Record<ImportField, string> = { slug: 'Адрес', title: 'Название', description: 'Описание', category: 'Категория' };

const errors: Record<string, string> = {
  'stale-preview': 'Данные изменились после проверки файла. Создайте новый предварительный просмотр.',
  forbidden: 'Недостаточно прав для импорта.',
  unauthorized: 'Сессия закончилась. Войдите снова.',
};

function valueLabel(value: unknown) {
  if (value === null || value === undefined || value === '') return '—';
  return typeof value === 'object' ? JSON.stringify(value) : String(value);
}

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body && typeof body === 'object' && 'code' in body && typeof body.code === 'string' ? body.code : '';
    throw new Error(errors[code] ?? (response.status === 413 ? 'Файл превышает допустимый размер.' : 'Не удалось выполнить импорт. Проверьте файл и повторите попытку.'));
  }
  if (!body || typeof body !== 'object') throw new Error('Сервер вернул некорректный ответ. Повторите попытку.');
  return body as T;
}

export default function CatalogImportPanel({ standalone = false }: { standalone?: boolean }) {
  const id = useId();
  const [file, setFile] = useState<File>();
  const [batch, setBatch] = useState<ImportBatch>();
  const [overwrites, setOverwrites] = useState<Record<string, ImportField[]>>({});
  const [result, setResult] = useState<ImportApplyResult>();
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [error, setError] = useState('');
  const [params, setParams] = useState({ page: 1, limit: 25 });
  const paging = pageRange(batch?.rows.length ?? 0, params);

  async function preview() {
    if (!file || requestPending.current) return;
    if (file.size > 5 * 1024 * 1024) { setError('Максимальный размер файла — 5 МБ.'); return; }
    requestPending.current = true;
    setBusy(true); setError(''); setBatch(undefined); setResult(undefined); setOverwrites({}); setParams(previous => ({ ...previous, page: 1 }));
    const form = new FormData(); form.set('file', file);
    try { setBatch(await readResponse<ImportBatch>(await fetch('/api/catalog-import/preview', { method: 'POST', body: form, credentials: 'same-origin' }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось проверить файл.'); }
    finally { requestPending.current = false; setBusy(false); }
  }

  function toggle(row: ImportPreviewRow, field: ImportField, checked: boolean) {
    setOverwrites(current => {
      const chosen = new Set(current[row.row] ?? []);
      if (checked) chosen.add(field); else chosen.delete(field);
      return { ...current, [row.row]: [...chosen] };
    });
  }

  async function apply() {
    if (!batch || requestPending.current || batch.issues.length) return;
    requestPending.current = true;
    setBusy(true); setError('');
    try { setResult(await readResponse<ImportApplyResult>(await fetch('/api/catalog-import/apply', { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ batchId: batch.id, overwrites }) }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : 'Не удалось применить импорт.'); }
    finally { requestPending.current = false; setBusy(false); }
  }

  return (
    <section className={f.section} aria-labelledby={standalone ? undefined : `${id}-title`} aria-label={standalone ? 'Файл каталога' : undefined}>
      {!standalone && (
        <>
          <h2 id={`${id}-title`}>Файл каталога</h2>
          <p className={ui.lead}>CSV или XLSX. Новые товары создаются семейством с номенклатурой — как черновики. Серии больше нет: категория берётся из файла.</p>
        </>
      )}
      <div className={f.form}>
        <label className={f.field} htmlFor={`${id}-file`}>
          <span className={f.label}>Файл, до 5 МБ</span>
          <input id={`${id}-file`} type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => { setFile(event.currentTarget.files?.[0]); setBatch(undefined); setResult(undefined); setError(''); setOverwrites({}); }} />
        </label>
        <button className={ui.button} type="button" disabled={!file || busy} onClick={() => void preview()}>{busy && !batch ? 'Проверяем файл…' : 'Предварительный просмотр'}</button>
      </div>
      {error ? <p role="alert" className={f.alert}>{error}</p> : null}
      {batch && !result ? (
        <div aria-busy={busy}>
          <p>Всего строк: {batch.rows.length}. Новых: {batch.rows.filter(row => row.action === 'create').length}. Требуют проверки: {batch.rows.filter(row => row.action === 'review').length}.</p>
          {batch.issues.length > 0 ? <div className={f.alert} role="alert"><p>Исправьте ошибки перед импортом</p><ul>{batch.issues.map((issue, index) => <li key={index}>{issue.row ? `Строка ${issue.row}: ` : ''}{issue.message}</li>)}</ul></div> : null}
          <div className={ui.tableWrap}>
            <table className={ui.table}>
              <caption className="visually-hidden">Проверка данных перед сохранением</caption>
              <thead><tr><th>Строка / артикул</th><th>Изменения</th></tr></thead>
              <tbody>
                {batch.rows.slice(paging.offset, paging.offset + paging.limit).map(row => (
                  <tr key={row.row}>
                    <th scope="row">{row.row} · {row.data.sku}<span className={ui.rowMeta}>{row.data.title}</span></th>
                    <td>
                      {row.action === 'create' ? 'Новый черновик' : row.action === 'unchanged' ? 'Без изменений' : (
                        <fieldset className={f.field} disabled={busy}>
                          <legend className={f.label}>Разрешить замену выбранных полей</legend>
                          {row.differences.map(change => (
                            <label key={change.field} className={f.check}>
                              <input type="checkbox" checked={overwrites[row.row]?.includes(change.field) ?? false} onChange={event => toggle(row, change.field, event.currentTarget.checked)} />
                              <span><strong>{fieldNames[change.field]}</strong> · было {valueLabel(change.before)} → {valueLabel(change.after)}</span>
                            </label>
                          ))}
                        </fieldset>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <PagerControls {...paging} disabled={busy} limits={[10, 25, 50, 100]} onChange={(page, limit) => setParams({ page, limit })} />
          <button type="button" className={`${ui.button} ${ui.primary}`} disabled={busy || batch.issues.length > 0 || !batch.rows.length} onClick={() => void apply()}>{busy ? 'Сохраняем…' : `Применить импорт (${batch.rows.length} строк)`}</button>
        </div>
      ) : null}
      {result ? <div className={f.ok} role="status"><p>Импорт завершён. Создано: {result.created}. Обновлено: {result.updated}. Без изменений: {result.unchanged}. Сохранены прежние значения: {result.preserved}.</p></div> : null}
    </section>
  );
}
