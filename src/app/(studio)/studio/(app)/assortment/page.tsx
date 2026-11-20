import type { Metadata } from 'next';
import AssortmentHeader from '@/studio/components/AssortmentHeader';
import FilterBar from '@/studio/components/FilterBar';
import ProductsTable from '@/studio/components/ProductsTable';
import ListPager from '@/studio/components/ListPager';
import { getCategories, getProducts, getTotals } from '@/studio/data';
import { profiles, publishOptions } from '@/studio/labels';
import { parseProductParams, sortState, toSearch } from '@/studio/query';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Товары' };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function ProductsPage({ searchParams }: Props) {
  const session = await requireEditor();
  const params = parseProductParams(await searchParams);
  const [data, categories, totals] = await Promise.all([getProducts(session, params), getCategories(session), getTotals(session)]);

  const { page, ...filters } = params;
  const href = (patch: Partial<typeof params>) => `/studio/assortment${toSearch({ ...filters, page, ...patch }, { sort: '-updatedAt' })}`;
  const sortHref = (sort: string) => href({ sort: sort as typeof params.sort, page: 1 });

  return (
    <>
      <AssortmentHeader current="products" totals={totals} exportHref={`/studio/export${toSearch(filters, { sort: '-updatedAt' })}`} />
      <FilterBar
        placeholder="Название, адрес или артикул позиции"
        values={{ q: params.q, category: params.category?.toString(), profile: params.profile, status: params.status, attention: params.attention, missing: params.missing }}
        selects={[
          { name: 'category', label: 'Раздел', options: categories.map(c => ({ value: String(c.id), label: c.title })) },
          { name: 'profile', label: 'Тип продукции', options: profiles },
          { name: 'status', label: 'Публикация', options: publishOptions },
        ]}
        pills={[
          { name: 'attention', value: 'any', label: 'Требуют внимания' },
          { name: 'missing', value: 'photo', label: 'Без фото' },
          { name: 'missing', value: 'summary', label: 'Без описания' },
        ]}
      />
      <ProductsTable
        rows={data.rows}
        categories={categories}
        sorts={{ title: sortState(params.sort, 'title', sortHref), updatedAt: sortState(params.sort, 'updatedAt', sortHref) }}
      />
      <ListPager {...data} limit={params.limit} />
    </>
  );
}
