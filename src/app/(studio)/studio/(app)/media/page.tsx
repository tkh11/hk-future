import ListPager from '@/studio/components/ListPager';
import { listParams, mediaLimits, type ListPageProps } from '@/studio/pagination';
import type { Metadata } from 'next';
import MediaLibrary from '@/studio/components/MediaLibrary';
import ui from '@/studio/components/ui.module.css';
import { getMediaLibrary, type MediaKind } from '@/studio/media-data';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Медиа' };

const kinds = new Set<MediaKind>(['photo', 'drawing', 'document', 'unused']);

export default async function MediaPage({ searchParams }: ListPageProps) {
  const session = await requireEditor();
  const raw = await searchParams;
  const kind = raw.kind;
  const filter = kind && kinds.has(kind as MediaKind) ? (kind as MediaKind) : undefined;
  const { cards, paging } = await getMediaLibrary(session, filter, listParams(raw, 64, mediaLimits));
  return (
    <>
      <div className={ui.header}><h1>Медиатека</h1></div>
      <MediaLibrary cards={cards} limit={paging.limit} filter={filter ?? ''} />
      <ListPager {...paging} limits={mediaLimits} />
    </>
  );
}
