import type { Metadata } from 'next';
import Link from 'next/link';
import AssortmentHeader from '@/studio/components/AssortmentHeader';
import FilterBar from '@/studio/components/FilterBar';
import { CloseIcon } from '@/studio/components/icons';
import ListPager from '@/studio/components/ListPager';
import { ariaSort, PublishBadge, ReviewBadge, SortLink } from '@/studio/components/parts';
import ui from '@/studio/components/ui.module.css';
import { getTotals, getVariants } from '@/studio/data';
import { numberFormat, profileLabel, profiles, publishOptions, specColumns } from '@/studio/labels';
import { parseVariantParams, sortState, toSearch } from '@/studio/query';
import { productHref, variantHref } from '@/studio/routes';
import { requireEditor } from '@/studio/session';
import css from './variants.module.css';

export const metadata: Metadata = { title: 'Номенклатура' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function VariantsPage({ searchParams }: Props) {
  const session = await requireEditor();
  const params = parseVariantParams(await searchParams);
  const [data, totals] = await Promise.all([getVariants(session, params), getTotals(session)]);
  const { page, ...filters } = params;
  const href = (patch: Partial<typeof params>) => `/studio/assortment/variants${toSearch({ ...filters, page, ...patch }, { sort: 'sku' })}`;
  const sku = sortState(params.sort, 'sku', sort => href({ sort: sort as typeof params.sort, page: 1 }));
  const columns = specColumns(params.profile);

  return (
    <>
      <AssortmentHeader current="variants" totals={totals} />
      {data.parent ? (
        <p className={css.scope}>
          Номенклатура товара <a href={productHref(data.parent.id)}>{data.parent.title}</a>
          <Link href={href({ product: undefined, page: 1 })} className={css.clear} aria-label="Показать всю номенклатуру"><CloseIcon /></Link>
        </p>
      ) : null}
      <FilterBar
        placeholder="Артикул, название или внешний ID"
        values={{ q: params.q, profile: params.profile, status: params.status, attention: params.attention, unverified: params.unverified }}
        selects={[
          { name: 'profile', label: 'Тип продукции', options: profiles },
          { name: 'status', label: 'Публикация', options: publishOptions },
        ]}
        pills={[
          { name: 'attention', value: 'blocked', label: 'Конфликты' },
          { name: 'attention', value: 'review', label: 'На проверке' },
          { name: 'unverified', value: '1', label: 'Упаковка не проверена' },
        ]}
      />
      {!params.profile ? <p className={css.tip}>Выберите тип продукции, чтобы увидеть его параметры: мощность, PN, диаметры.</p> : null}
      {data.rows.length ? (
        <div className={ui.tableWrap}>
          <table className={ui.table}>
            <caption className="visually-hidden">Номенклатура</caption>
            <thead>
              <tr>
                <th aria-sort={ariaSort(sku)}><SortLink label="Артикул" state={sku} /></th>
                <th>Исполнение</th>
                {params.product ? null : <th>Товар</th>}
                {params.profile ? null : <th>Тип</th>}
                {columns.map(c => <th key={c.key} className={ui.end}>{c.label}{c.unit ? `, ${c.unit}` : ''}</th>)}
                <th>Упаковка</th>
                <th>Публикация</th>
                <th>Внимание</th>
              </tr>
            </thead>
            <tbody>
              {data.rows.map(row => (
                <tr key={row.id}>
                  <td className="num"><a href={variantHref(row.id)} className={ui.rowTitle}>{row.sku || '—'}</a></td>
                  <td>
                    <span className={css.title}>{row.title}</span>
                    {row.size || row.connection ? <span className={ui.rowMeta}>{[row.size, row.connection].filter(Boolean).join(' · ')}</span> : null}
                  </td>
                  {params.product ? null : (
                    <td>{row.product ? <Link href={href({ product: row.product.id, page: 1 })} className={css.parent}>{row.product.title}</Link> : <span className={ui.muted}>—</span>}</td>
                  )}
                  {params.profile ? null : <td>{profileLabel(row.profile)}</td>}
                  {columns.map(c => (
                    <td key={c.key} className={ui.end}>{row.specs[c.key] != null ? numberFormat.format(row.specs[c.key]!) : <span className={ui.muted}>—</span>}</td>
                  ))}
                  <td>{row.verified ? <span className={ui.muted}>проверена</span> : <span className={css.unverified}>не проверена</span>}</td>
                  <td><PublishBadge status={row.status} /></td>
                  <td><ReviewBadge review={row.review} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className={`${ui.tableWrap} ${ui.empty}`}>
          <p>Ничего не найдено.</p>
          <p>Измените фильтры или сбросьте их.</p>
        </div>
      )}
      <ListPager {...data} limit={params.limit} />
    </>
  );
}
