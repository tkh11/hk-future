import type { Metadata } from 'next';
import Link from 'next/link';
import { getDocumentLibrary } from '@/content/documents-server';
import DocumentGrid, { type DocumentCard } from '@/studio/components/DocumentGrid';
import ListPager from '@/studio/components/ListPager';
import ui from '@/studio/components/ui.module.css';
import { fetchListPage, listParams, pageRange, type ListPageProps } from '@/studio/pagination';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Документы' };
const href = '/studio/assortment/documents';

export default async function DocumentsPage({ searchParams }: ListPageProps) {
  const s = await requireEditor();
  const raw = await searchParams;
  const params = listParams(raw);
  const outside = raw.view === 'unlisted';
  const { documents, version } = await getDocumentLibrary();
  let paging = pageRange(documents.length, params);
  let cards: DocumentCard[];
  if (outside) {
    const { result, paging: unlisted } = await fetchListPage(params, page => s.payload.find({
      collection: 'catalog-documents', draft: true, sort: 'id', page, limit: params.limit, depth: 1,
      where: documents.length ? { id: { not_in: documents.map(doc => Number(doc.id)) } } : undefined,
      select: { title: true, kind: true, cover: true, _status: true, reviewState: true },
      populate: { media: { url: true, mimeType: true } }, overrideAccess: false, user: s.user,
    }));
    paging = unlisted;
    cards = result.docs.map(doc => ({
      id: String(doc.id), title: doc.title, kind: doc.kind || 'Документ',
      cover: typeof doc.cover === 'object' && doc.cover?.mimeType?.startsWith('image/') ? doc.cover.url ?? null : null,
      review: doc.reviewState ?? undefined,
    }));
  } else {
    const visible = documents.slice(paging.offset, paging.offset + paging.limit);
    const drafts = visible.length ? (await s.payload.find({
      collection: 'catalog-documents', draft: true, depth: 0, limit: visible.length,
      where: { id: { in: visible.map(doc => Number(doc.id)) } }, select: { _status: true, reviewState: true },
      overrideAccess: false, user: s.user,
    })).docs : [];
    const byId = new Map(drafts.map(doc => [String(doc.id), doc]));
    cards = visible.map(doc => ({
      ...doc, status: byId.get(doc.id)?._status === 'draft' ? 'changed' : undefined,
      review: byId.get(doc.id)?.reviewState ?? undefined,
    }));
  }
  return <>
    <div className={ui.header}><h1>Документы</h1><span className={ui.spacer} />
      <Link href={href + '/new'} className={`${ui.button} ${ui.primary}`}>Новый документ</Link>
    </div>
    <nav aria-label="Библиотека документов" className={ui.tabs}>
      <Link className={ui.tab} href={href + '?limit=' + params.limit} aria-current={!outside ? 'page' : undefined}>На сайте</Link>
      <Link className={ui.tab} href={href + '?view=unlisted&limit=' + params.limit} aria-current={outside ? 'page' : undefined}>Вне сайта</Link>
    </nav>
    <DocumentGrid cards={cards} offset={paging.offset} total={paging.total} version={version} canMove={!outside && s.can.publish && paging.total > 1} />
    <ListPager {...paging} />
  </>;
}
