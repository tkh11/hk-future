import 'server-only';

import { createHash } from 'node:crypto';
import { applyDocumentOrder, documentOrderKey } from './document-order';
import { cache } from 'react';
import { connection } from 'next/server';
import { cmsEnabled } from '@/cms/env';
import { getCMS } from '@/cms/client';
import { mapLibraryDocuments, parseLibraryDocument } from './documents';

const select = { title: true, kind: true, file: true, cover: true, _status: true } as const;
const populate = { media: { filename: true, mimeType: true, filesize: true, _status: true } } as const;

// Public library and file endpoints never inherit an editor's preview session.
export const getDocumentLibrary = cache(async () => {
  if (!cmsEnabled()) return { documents: [], storedOrder: null, version: '' };
  await connection();
  const payload = await getCMS();
  const rows: unknown[] = [];
  let page = 1;
  for (;;) {
    const result = await payload.find({
      collection: 'catalog-documents', overrideAccess: false, draft: false,
      depth: 1, limit: 100, page, sort: 'id', select, populate,
      where: { _status: { equals: 'published' } },
    });
    rows.push(...result.docs);
    if (!result.hasNextPage) break;
    page += 1;
  }
  const visible = mapLibraryDocuments(rows);
  const storedOrder = visible.length > 1 ? await payload.kv.get<string[]>(documentOrderKey) : null;
  const documents = applyDocumentOrder(visible, storedOrder);
  const version = createHash('sha256').update(documents.map(doc => doc.id).join(',')).digest('hex');
  return { documents, storedOrder, version };
});

export const getDocumentsContent = cache(async () => (await getDocumentLibrary()).documents);

export const getPublicDocument = cache(async (id: string) => {
  if (!cmsEnabled() || !/^[1-9]\d{0,9}$/.test(id)) return null;
  const payload = await getCMS();
  const result = await payload.find({
    collection: 'catalog-documents', overrideAccess: false, draft: false,
    depth: 1, limit: 1, select, populate,
    where: { and: [{ id: { equals: Number(id) } }, { _status: { equals: 'published' } }] },
  });
  return parseLibraryDocument(result.docs[0]);
});
