import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import ArticleEditor from '@/studio/components/ArticleEditor';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

type Props = { params: Promise<{ id: string }> };
const parseId = (raw: string) => (/^\d{1,9}$/.test(raw) ? Number(raw) : null);
export const metadata: Metadata = { title: 'Статья' };

export default async function ArticlePage({ params }: Props) {
  const id = parseId((await params).id);
  if (!id) notFound();
  const s = await requireEditor();
  const doc = await s.payload.findByID({ collection: 'articles', id, draft: true, depth: 0, disableErrors: true, overrideAccess: false, user: s.user });
  if (!doc) notFound();
  const content = (doc.content ?? {}) as {
    category?: string; description?: string; lead?: string; readingMinutes?: number; date?: string;
    catalogHref?: string; selectionHref?: string; sections?: { heading: string; paragraphs: string[] }[];
  };
  return (
    <>
      <div className={ui.header}><h1>{doc.title}</h1></div>
      <ArticleEditor id={id} title={doc.title} slug={doc.slug} canPublish={s.can.publish} content={{
        category: content.category ?? '', description: content.description ?? '', lead: content.lead ?? '',
        readingMinutes: content.readingMinutes ?? 5, date: content.date ?? '',
        catalogHref: content.catalogHref ?? '', selectionHref: content.selectionHref ?? '',
        sections: content.sections ?? [],
      }} />
    </>
  );
}
