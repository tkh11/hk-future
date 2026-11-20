import type { Metadata } from 'next';
import NewDocumentForm from '@/studio/components/NewDocumentForm';
import ui from '@/studio/components/ui.module.css';
import { requireEditor } from '@/studio/session';

export const metadata: Metadata = { title: 'Новый документ' };

export default async function NewDocumentPage() {
  await requireEditor();
  return (
    <>
      <div className={ui.header}><h1>Новый документ</h1></div>
      <NewDocumentForm />
    </>
  );
}
