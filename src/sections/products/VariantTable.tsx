'use client';
import { useMemo, useState } from 'react';
import type { CatalogVariant } from '@/content/catalog-presenter';
import styles from './Products.module.css';
import { publicPath } from '@/lib/public-path';

export default function VariantTable({ variants }: { variants: CatalogVariant[] }) {
  const [query,setQuery]=useState('');const [size,setSize]=useState('');
  const sizes=useMemo(()=>[...new Set(variants.map(v=>v.size).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'ru',{numeric:true})),[variants]);
  const rows=useMemo(()=>variants.filter(v=>(!size||v.size===size)&&`${v.sku} ${v.title} ${v.size} ${v.connection}`.toLocaleLowerCase('ru').includes(query.trim().toLocaleLowerCase('ru'))),[variants,query,size]);
  const columns=[...new Map(variants.flatMap(v=>v.specs).map(s=>[s.key,{key:s.key,label:s.label,unit:s.unit}])).values()];
  const connection=variants.some(v=>v.connection),color=variants.some(v=>v.color);
  const images=variants.some(v=>v.images.length);
  return <section className={styles.specifications} aria-labelledby="variants-title"><h2 id="variants-title">Варианты товара</h2>
    <div className={styles.variantFilters}><label>Артикул или исполнение<input type="search" value={query} onChange={e=>setQuery(e.target.value)} placeholder="Поиск по вариантам" /></label>
      {sizes.length>1&&<label>Размер<select value={size} onChange={e=>setSize(e.target.value)}><option value="">Все размеры</option>{sizes.map(s=><option key={s}>{s}</option>)}</select></label>}
      <p role="status">Показано {rows.length} из {variants.length}</p>
    </div>
    <div className={`${styles.tableFrame} ${styles.variantTable}`} tabIndex={0} role="region" aria-label="Таблица вариантов товара"><table><thead><tr><th scope="col">Артикул</th><th scope="col">Исполнение</th>
      {sizes.length>0&&<th scope="col">Размер</th>}{connection&&<th scope="col">Присоединение</th>}{color&&<th scope="col">Цвет</th>}
      {columns.map(c=><th scope="col" key={c.key}>{c.label}{c.unit?`, ${c.unit}`:''}</th>)}{images&&<th scope="col">Изображения</th>}</tr></thead>
      <tbody>{rows.map(v=><tr key={v.id}><th scope="row">{v.sku}</th><td>{v.title}</td>{sizes.length>0&&<td>{v.size||'—'}</td>}{connection&&<td>{v.connection||'—'}</td>}{color&&<td>{v.color||'—'}</td>}{columns.map(c=><td key={c.key}>{v.specs.find(s=>s.key===c.key)?.display??'—'}</td>)}{images&&<td>{v.images.length?v.images.map((image,i)=><a className={styles.variantImageLink} href={publicPath(image.url)} key={`${image.url}-${i}`} target="_blank" rel="noopener noreferrer">{image.label}</a>):'—'}</td>}</tr>)}</tbody></table>
      {!rows.length&&<p className={styles.emptyVariants}>Варианты не найдены. Измените запрос или размер.</p>}
    </div>
  </section>;
}
