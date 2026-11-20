import Link from 'next/link';
import { numberFormat } from '../labels';
import ui from './ui.module.css';

type Totals = { products: number; variants: number; categories: number };

export default function AssortmentHeader({ current, totals, exportHref }: { current: 'products' | 'variants'; totals: Totals; exportHref?: string }) {
  return (
    <header className={ui.header}>
      <h1>Ассортимент</h1>
      <nav aria-label="Ассортимент" className={ui.tabs}>
        <Link href="/studio/assortment" className={ui.tab} aria-current={current === 'products' ? 'page' : undefined}>
          Товары <span className={ui.count}>{numberFormat.format(totals.products)}</span>
        </Link>
        <Link href="/studio/assortment/variants" className={ui.tab} aria-current={current === 'variants' ? 'page' : undefined}>
          Номенклатура <span className={ui.count}>{numberFormat.format(totals.variants)}</span>
        </Link>
        <Link href="/studio/assortment/categories" className={ui.tab}>
          Категории <span className={ui.count}>{totals.categories}</span>
        </Link>
      </nav>
      <span className={ui.spacer} />
      {exportHref ? <a href={exportHref} className={`${ui.button} ${ui.ghost}`}>Экспорт XLSX</a> : null}
      <Link href="/studio/assortment/import" className={ui.button}>Импорт</Link>
      <Link href="/studio/assortment/new" className={`${ui.button} ${ui.primary}`}>Новый товар</Link>
    </header>
  );
}
