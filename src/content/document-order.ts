export const documentOrderKey = 'public-document-order';

export function applyDocumentOrder<T extends { id: string }>(documents: T[], order: string[] | null) {
  if (!order?.length) return documents;
  const remaining = new Map(documents.map(doc => [doc.id, doc]));
  const sorted: T[] = [];
  for (const id of order) {
    const doc = remaining.get(id);
    if (doc) { sorted.push(doc); remaining.delete(id); }
  }
  return sorted.concat([...remaining.values()]);
}

export function moveDocument(ids: string[], id: string, position: number) {
  const from = ids.indexOf(id);
  if (from < 0 || !Number.isSafeInteger(position) || position < 1 || position > ids.length) return null;
  const next = [...ids];
  next.splice(from, 1);
  next.splice(position - 1, 0, id);
  return next;
}
