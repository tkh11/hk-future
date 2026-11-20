import type { Metadata } from 'next';
import NavEditor from '@/studio/components/NavEditor';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Меню' };

export default async function NavigationPage() {
  const s = await requireEditor();
  const doc = await s.payload.findGlobal({ slug: 'navigation', overrideAccess: false, user: s.user, depth: 0 });
  return (
    <>
      <div className={ui.header}><h1>Меню сайта</h1></div>
      <NavEditor items={(doc.items ?? []).map(item => ({ label: item.label, href: item.href, id: item.id }))} />
    </>
  );
}
