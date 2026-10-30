import type { Metadata } from 'next';
import { getDocumentsContent } from '@/content/documents-server';
import DocumentsLibrary from '@/sections/documents/DocumentsLibrary';

export const metadata: Metadata = {
  title: 'Каталоги и документация — HEISSKRAFT',
  description: 'Каталоги продукции, инструкции, паспорта и документация HEISSKRAFT. Просмотр и скачивание PDF.',
};

export default async function DocumentsPage() {
  return <DocumentsLibrary documents={await getDocumentsContent()} />;
}
