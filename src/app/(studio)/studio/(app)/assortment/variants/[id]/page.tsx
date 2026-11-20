import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import VariantEditor from '@/studio/components/VariantEditor';
import { requireEditor } from '@/studio/session';
import { getVariantEditor } from '@/studio/variant-data';

type Props = { params: Promise<{ id: string }> };
const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const id = parseId((await params).id);
  if (!id) return { title: 'Позиция' };
  const session = await requireEditor();
  const doc = await session.payload.findByID({ collection: 'product-variants', id, draft: true, depth: 0, select: { title: true, sku: true }, disableErrors: true, overrideAccess: false, user: session.user });
  return { title: doc ? (doc.sku ? `${doc.sku} · ${doc.title}` : doc.title) : 'Позиция' };
}

export default async function VariantPage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const session = await requireEditor();
  const data = await getVariantEditor(session, id);
  if (!data) notFound();
  return <VariantEditor key={data.id} data={data} can={session.can} />;
}
