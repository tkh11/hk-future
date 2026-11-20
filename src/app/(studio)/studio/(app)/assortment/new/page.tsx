import type { Metadata } from 'next';
import Link from 'next/link';
import NewProductForm from '@/studio/components/NewProductForm';
import { getCategories } from '@/studio/data';
import { requireEditor } from '@/studio/session';
import ui from '@/studio/components/ui.module.css';

export const metadata: Metadata = { title: 'Новый товар' };

type Props = { searchParams: Promise<{ category?: string }> };

export default async function NewProductPage({ searchParams }: Props) {
  const session = await requireEditor();
  const [categories, { category }] = await Promise.all([getCategories(session), searchParams]);
  return (
    <>
      <div className={ui.header}>
        <h1>Новый товар</h1>
        <span className={ui.spacer} />
        <Link href="/studio/assortment" className={`${ui.button} ${ui.ghost}`}>К списку</Link>
      </div>
      <p className={ui.lead}>Карточка создаётся черновиком. Фото, номенклатура и документы добавляются на следующем экране; на сайте товар появится после публикации.</p>
      <NewProductForm categories={categories} category={category && /^\d+$/.test(category) ? category : ''} />
    </>
  );
}
