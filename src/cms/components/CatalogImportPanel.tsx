"use client";

import { useId, useRef, useState } from "react";
import type { ImportApplyResult, ImportBatch, ImportField, ImportPreviewRow } from "@/cms/import/types";
import styles from "./AdminDashboard.module.css";

const fieldNames: Record<ImportField, string> = { slug: "Адрес", title: "Название", description: "Описание", category: "Категория", series: "Серия", attributes: "Характеристики" };
const pageSize = 25;
const errors: Record<string, string> = {
  "stale-preview": "Данные изменились после проверки файла. Создайте новый предварительный просмотр.",
  "forbidden": "Недостаточно прав для импорта.",
  "unauthorized": "Сессия закончилась. Войдите в административную панель заново.",
};

function valueLabel(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—";
  return typeof value === "object" ? JSON.stringify(value) : String(value);
}

async function readResponse<T>(response: Response): Promise<T> {
  const body: unknown = await response.json().catch(() => null);
  if (!response.ok) {
    const code = body && typeof body === "object" && "code" in body && typeof body.code === "string" ? body.code : "";
    throw new Error(errors[code] ?? (response.status === 413 ? "Файл превышает допустимый размер." : "Не удалось выполнить импорт. Проверьте файл и повторите попытку."));
  }
  if (!body || typeof body !== "object") throw new Error("Сервер вернул некорректный ответ. Повторите попытку.");
  return body as T;
}

export default function CatalogImportPanel() {
  const id = useId();
  const [file, setFile] = useState<File>();
  const [batch, setBatch] = useState<ImportBatch>();
  const [overwrites, setOverwrites] = useState<Record<string, ImportField[]>>({});
  const [result, setResult] = useState<ImportApplyResult>();
  const [busy, setBusy] = useState(false);
  const requestPending = useRef(false);
  const [error, setError] = useState("");
  const [page, setPage] = useState(0);

  async function preview() {
    if (!file || requestPending.current) return;
    if (file.size > 5 * 1024 * 1024) { setError("Максимальный размер файла — 5 МБ."); return; }
    requestPending.current = true;
    setBusy(true); setError(""); setBatch(undefined); setResult(undefined); setOverwrites({}); setPage(0);
    const form = new FormData(); form.set("file", file);
    try { setBatch(await readResponse<ImportBatch>(await fetch("/api/catalog-import/preview", { method: "POST", body: form, credentials: "same-origin" }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось проверить файл."); }
    finally { requestPending.current = false; setBusy(false); }
  }

  function toggle(row: ImportPreviewRow, field: ImportField, checked: boolean) {
    // A move across taxonomy levels is reviewed as a pair; partial changes can create invalid links.
    const pair = field === "category" || field === "series";
    const fields = pair ? row.differences.filter(item => item.field === "category" || item.field === "series").map(item => item.field) : [field];
    setOverwrites(current => {
      const chosen = new Set(current[row.row] ?? []);
      fields.forEach(name => checked ? chosen.add(name) : chosen.delete(name));
      return { ...current, [row.row]: [...chosen] };
    });
  }

  async function apply() {
    if (!batch || requestPending.current || batch.issues.length) return;
    requestPending.current = true;
    setBusy(true); setError("");
    try { setResult(await readResponse<ImportApplyResult>(await fetch("/api/catalog-import/apply", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ batchId: batch.id, overwrites }) }))); }
    catch (caught) { setError(caught instanceof Error ? caught.message : "Не удалось применить импорт."); }
    finally { requestPending.current = false; setBusy(false); }
  }

  return <section className={styles.panel} aria-labelledby={`${id}-title`}>
    <h2 id={`${id}-title`}>Импорт каталога</h2>
    <p>Загрузите CSV или XLSX, проверьте изменения и подтвердите импорт. Новые товары создаются как черновики. Существующие значения сохраняются, пока вы явно не выберете поля для замены.</p>
    <div className={styles.form}>
      <label htmlFor={`${id}-file`}>Файл каталога, до 5 МБ<input id={`${id}-file`} type="file" accept=".csv,.xlsx" disabled={busy} onChange={event => { setFile(event.currentTarget.files?.[0]); setBatch(undefined); setResult(undefined); setError(""); setOverwrites({}); }} /></label>
      <div><button className={styles.button} type="button" disabled={!file || busy} onClick={() => void preview()}>{busy && !batch ? "Проверяем файл…" : "Предварительный просмотр"}</button></div>
    </div>
    {error && <p role="alert" className={styles.error}>{error}</p>}
    {batch && !result && <div aria-busy={busy}>
      <p>Всего строк: {batch.rows.length}. Новых: {batch.rows.filter(row => row.action === "create").length}. Требуют проверки: {batch.rows.filter(row => row.action === "review").length}.</p>
      {batch.issues.length > 0 && <div className={styles.error} role="alert"><h3>Исправьте ошибки перед импортом</h3><ul>{batch.issues.map((issue, index) => <li key={index}>{issue.row ? `Строка ${issue.row}: ` : ""}{issue.message}</li>)}</ul></div>}
      <div className={styles.tableWrap}><table className={styles.table}><caption>Проверка данных перед сохранением</caption><thead><tr><th scope="col">Строка / артикул</th><th scope="col">Изменения</th></tr></thead><tbody>{batch.rows.slice(page * pageSize, (page + 1) * pageSize).map(row => <tr key={row.row}><th scope="row">{row.row} · {row.data.sku}<br />{row.data.title}</th><td>{row.action === "create" ? "Новый черновик" : row.action === "unchanged" ? "Без изменений" : <fieldset className={styles.choices} disabled={busy}><legend>Разрешить замену выбранных полей</legend>{row.differences.map(change => <label key={change.field}><input type="checkbox" checked={overwrites[row.row]?.includes(change.field) ?? false} onChange={event => toggle(row, change.field, event.currentTarget.checked)} /><span><strong>{fieldNames[change.field]}</strong><br />Было: {valueLabel(change.before)}<br />Станет: {valueLabel(change.after)}</span></label>)}</fieldset>}</td></tr>)}</tbody></table></div>
      {batch.rows.length > pageSize && <nav className={styles.links} aria-label="Строки предварительного просмотра"><button className={styles.button} type="button" disabled={page === 0 || busy} onClick={() => setPage(value => value - 1)}>Предыдущие</button><span>Страница {page + 1} из {Math.ceil(batch.rows.length / pageSize)}</span><button className={styles.button} type="button" disabled={(page + 1) * pageSize >= batch.rows.length || busy} onClick={() => setPage(value => value + 1)}>Следующие</button></nav>}
      <button type="button" className={`${styles.button} ${styles.primary}`} disabled={busy || batch.issues.length > 0 || !batch.rows.length} onClick={() => void apply()}>{busy ? "Сохраняем…" : `Применить импорт (${batch.rows.length} строк)`}</button>
    </div>}
    {result && <div className={styles.result} role="status"><h3>Импорт завершён</h3><p>Создано: {result.created}. Обновлено: {result.updated}. Без изменений: {result.unchanged}. Сохранены прежние значения: {result.preserved}.</p><p>Проверьте черновики в каталоге и опубликуйте их отдельно.</p></div>}
  </section>;
}
