'use client';
import { useEffect, useState } from 'react';
import type { CatalogVariant } from '@/content/catalog-presenter';
import { nomenclatureLimits, defaultNomenclatureLimit } from '@/lib/nomenclature';
import { publicPath } from '@/lib/public-path';
import styles from './Products.module.css';

type TablePage = { rows: CatalogVariant[]; total: number; pages: number };
type Column = { key: string; label: string; unit: string };

export default function VariantTable({ slug, sizes, columns }: { slug: string; sizes: string[]; columns: Column[] }) {
  const [query, setQuery] = useState('');
  const [size, setSize] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(defaultNomenclatureLimit);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState<{ url: string; data?: TablePage }>();
  const params = new URLSearchParams({ page: String(page), limit: String(limit), q: query.trim(), size });
  const url = publicPath(`/products/${slug}/nomenclature`) + '?' + params;
  const data = result?.url === url ? result.data : undefined;
  const failed = result?.url === url && !data;

  useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(url, { signal: controller.signal });
        if (!response.ok) throw new Error('Request failed');
        const data: TablePage = await response.json();
        if (controller.signal.aborted) return;
        if (page > Math.max(1, data.pages)) setPage(Math.max(1, data.pages));
        else setResult({ url, data });
      } catch {
        if (!controller.signal.aborted) setResult({ url });
      }
    }, query.trim() ? 180 : 0);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [url, page, query, attempt]);

  const rows = data?.rows ?? [];
  const connection = rows.some(row => row.connection);
  const color = rows.some(row => row.color);
  const images = rows.some(row => row.images.length);
  return <section className={styles.specifications} aria-labelledby="variants-title">
    <h2 id="variants-title">Номенклатура</h2>
    <div className={styles.variantFilters}>
      <label>Артикул или исполнение<input type="search" value={query} maxLength={200} placeholder="Поиск по номенклатуре"
        onChange={event => { setQuery(event.target.value); setPage(1); }} /></label>
      {sizes.length > 1 && <label>Размер<select value={size} onChange={event => { setSize(event.target.value); setPage(1); }}>
        <option value="">Все размеры</option>{sizes.map(value => <option key={value}>{value}</option>)}
      </select></label>}
      <label>Позиций на странице<select value={limit} onChange={event => { setLimit(Number(event.target.value)); setPage(1); }}>
        {nomenclatureLimits.map(value => <option key={value}>{value}</option>)}
      </select></label>
      <p role="status">{failed ? 'Не удалось загрузить номенклатуру.' : !data ? 'Загрузка…' : data.total
        ? `${(page - 1) * limit + 1}–${Math.min(page * limit, data.total)} из ${data.total}` : 'По заданным условиям позиций нет.'}</p>
      {failed && <button type="button" onClick={() => { setResult(undefined); setAttempt(value => value + 1); }}>Повторить</button>}
    </div>
    {!!rows.length && <div className={`${styles.tableFrame} ${styles.variantTable}`} tabIndex={0} role="region" aria-label="Номенклатура товара">
      <table><thead><tr><th scope="col">Артикул</th><th scope="col">Исполнение</th>
        {!!sizes.length && <th scope="col">Размер</th>}{connection && <th scope="col">Присоединение</th>}{color && <th scope="col">Цвет</th>}
        {columns.map(c => <th scope="col" key={c.key}>{c.label}{c.unit && `, ${c.unit}`}</th>)}{images && <th scope="col">Изображения</th>}
      </tr></thead><tbody>{rows.map(row => <tr key={row.id}>
        <th scope="row">{row.sku}</th><td>{row.title}</td>{!!sizes.length && <td>{row.size || '—'}</td>}
        {connection && <td>{row.connection || '—'}</td>}{color && <td>{row.color || '—'}</td>}
        {columns.map(c => <td key={c.key}>{row.specs.find(spec => spec.key === c.key)?.display ?? '—'}</td>)}
        {images && <td>{row.images.length ? row.images.map((image, i) => <a key={i} className={styles.variantImageLink}
          href={publicPath(image.url)} target="_blank" rel="noopener noreferrer">{image.label}</a>) : '—'}</td>}
      </tr>)}</tbody></table></div>}
    {data && data.pages > 1 && <nav className={styles.pagination} aria-label="Страницы номенклатуры">
      <button type="button" disabled={page === 1} onClick={() => setPage(page - 1)}>Назад</button>
      <span>Страница {page} из {data.pages}</span>
      <button type="button" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Вперёд</button>
    </nav>}
  </section>;
}
