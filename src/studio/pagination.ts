import { nomenclatureLimits } from '@/lib/nomenclature';

export type ListSearch = Record<string, string | string[] | undefined>;
export type ListPageProps = { searchParams: Promise<ListSearch> };
export const mediaLimits = [16, 32, 64, 128];

export function listParams(raw: ListSearch, fallback = 20, limits = nomenclatureLimits) {
  const page = Number(raw.page);
  const limit = Number(raw.limit);
  return {
    page: Number.isSafeInteger(page) && page > 0 ? Math.min(10000, page) : 1,
    limit: limits.includes(limit) ? limit : fallback,
  };
}

export function pageRange(total: number, { page, limit }: { page: number; limit: number }) {
  const pages = Math.max(1, Math.ceil(total / limit));
  page = Math.min(page, pages);
  return { page, pages, total, limit, offset: (page - 1) * limit };
}

export async function fetchListPage<T extends { totalDocs: number }>(
  params: { page: number; limit: number }, fetch: (page: number) => Promise<T>,
) {
  let result = await fetch(params.page);
  const paging = pageRange(result.totalDocs, params);
  if (paging.page !== params.page) result = await fetch(paging.page);
  return { result, paging };
}
