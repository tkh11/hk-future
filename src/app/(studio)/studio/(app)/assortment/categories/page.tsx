import type { Metadata } from 'next';
import CategoryTree, { type CategoryRow } from '@/studio/components/CategoryTree';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Категории' };

export default async function CategoriesPage() {
  const s = await requireEditor();
  const result = await s.payload.find({
    collection: 'categories', draft: true, pagination: false, depth: 0, sort: 'path',
    overrideAccess: false, user: s.user,
  });
  const live = await s.payload.find({ collection: 'categories', pagination: false, depth: 0, select: { _status: true }, overrideAccess: false, user: s.user });
  const published = new Set(live.docs.filter(d => d._status === 'published').map(d => d.id));
  const rows: CategoryRow[] = result.docs.map(c => ({
    id: c.id, title: c.title, slug: c.slug, path: c.path ?? '',
    parent: typeof c.parent === 'number' ? c.parent : c.parent?.id ?? null,
    sortOrder: c.sortOrder ?? 0, published: published.has(c.id), art: c.art,
  }));
  return (
    <>
      <div className={ui.header}><h1>Категории</h1></div>
      <p className={ui.lead}>Перенос в другой раздел и порядок меняют путь. Редиректы со старых адресов считает система.</p>
      <CategoryTree rows={rows} />
    </>
  );
}
