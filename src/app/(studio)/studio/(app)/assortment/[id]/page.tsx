import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ProductEditor from '@/studio/components/ProductEditor';
import { getProductEditor } from '@/studio/product-data';
import { requireEditor } from '@/studio/session';

import { parseVariantParams } from '@/studio/query';

type Props = { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: 'Товар' };
  const session = await requireEditor();
  const doc = await session.payload.findByID({ collection: 'products', id, draft: true, depth: 0, select: { title: true }, disableErrors: true, overrideAccess: false, user: session.user });
  return { title: doc?.title ?? 'Товар' };
}

export default async function ProductPage({ params, searchParams }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const session = await requireEditor();
  const { page, limit } = parseVariantParams(await searchParams);
  const data = await getProductEditor(session, id, page, limit);
  if (!data) notFound();
  return <ProductEditor key={data.id} data={data} can={session.can} />;
}
