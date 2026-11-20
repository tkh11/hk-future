import { nomenclatureLimits, defaultNomenclatureLimit } from '@/lib/nomenclature';
import { getNomenclaturePage } from '@/content/cms-adapter';

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const search = new URL(request.url).searchParams;
  const page = Number(search.get('page') ?? 1);
  const limit = Number(search.get('limit') ?? defaultNomenclatureLimit);
  const query = (search.get('q') ?? '').trim();
  const size = search.get('size') ?? '';
  if (!Number.isSafeInteger(page) || page < 1 || page > 100000 || !nomenclatureLimits.includes(limit) || query.length > 200 || size.length > 500) {
    return new Response(null, { status: 400 });
  }
  const result = await getNomenclaturePage((await params).slug, page, limit, query, size);
  return Response.json(result, { status: result ? 200 : 404, headers: { 'Cache-Control': 'private, no-store' } });
}
