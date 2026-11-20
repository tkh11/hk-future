import type { Metadata } from 'next';
import CatalogImportPanel from '@/studio/components/CatalogImportPanel';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Импорт' };

export default async function ImportPage() {
  await requireEditor();
  return (
    <>
      <div className={ui.header}><h1>Импорт ассортимента</h1></div>
      <CatalogImportPanel standalone />
    </>
  );
}
