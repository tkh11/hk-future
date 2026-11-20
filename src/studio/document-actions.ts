'use server';

import { revalidatePath } from 'next/cache';
import { getDocumentLibrary } from '@/content/documents-server';
import { documentOrderKey, moveDocument } from '@/content/document-order';
import { requireEditor } from './session';
import { describeError } from './errors';

export async function reorderDocument(id: string, position: number, version: string) {
  const session = await requireEditor();
  if (!session.can.publish) return { error: 'Для изменения порядка нужны права публикации.' };
  const conflict = { error: 'Список изменился. Повторите перемещение.' };
  try {
    const library = await getDocumentLibrary();
    if (version !== library.version) return conflict;
    const ids = moveDocument(library.documents.map(doc => doc.id), id, position);
    if (!ids) return { error: 'Проверьте позицию документа.' };
    // Compare and swap so two publishers cannot silently overwrite each other's order.
    const result = await session.payload.db.pool.query(
      `INSERT INTO payload_kv ("key", data) VALUES ($1, $2::jsonb)
       ON CONFLICT ("key") DO UPDATE SET data = EXCLUDED.data WHERE payload_kv.data = $3::jsonb`,
      [documentOrderKey, JSON.stringify(ids), library.storedOrder && JSON.stringify(library.storedOrder)],
    );
    if (!result.rowCount) return conflict;
    revalidatePath('/docs');
    revalidatePath('/studio/assortment/documents');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}
