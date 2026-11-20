import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import DocumentEditor from '@/studio/components/DocumentEditor';
import ui from '@/studio/components/ui.module.css';
import { getMediaOptions } from '@/studio/media-data';
import { requireEditor } from '@/studio/session';

type Props = { params: Promise<{ id: string }> };
const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  return { title: (await params).id === 'new' ? 'Новый документ' : 'Документ' };
}

export default async function DocumentPage({ params }: Props) {
  const s = await requireEditor();
  const files = await getMediaOptions(s, false);
  const id = parseId((await params).id);
  if (!id) notFound();
  const doc = await s.payload.findByID({ collection: 'catalog-documents', id, draft: true, depth: 0, disableErrors: true, overrideAccess: false, user: s.user });
  if (!doc) notFound();
  const rel = (value: unknown) => (typeof value === 'number' ? value : value && typeof value === 'object' && 'id' in value ? (value as { id: number }).id : null);
  return (
    <>
      <div className={ui.header}><h1>{doc.title}</h1></div>
      <DocumentEditor id={id} files={files} canPublish={s.can.publish} initial={{
        title: doc.title, kind: doc.kind ?? '', description: doc.description ?? '',
        file: rel(doc.file), cover: rel(doc.cover),
        reviewState: doc.reviewState ?? 'ready', reviewNotes: doc.reviewNotes ?? '',
      }} />
    </>
  );
}
