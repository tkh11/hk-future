import { z } from 'zod';

const id = z.union([z.number(), z.string()]);
const file = z.object({
  id, filename: z.string().min(1), mimeType: z.string(),
  filesize: z.number().nullish(), _status: z.literal('published'),
});
const document = z.object({
  id, title: z.string().trim().min(1), kind: z.string().nullish(),
  _status: z.literal('published'), file,
  cover: file.nullish().catch(null),
});

export function parseLibraryDocument(value: unknown) {
  const parsed = document.safeParse(value);
  if (!parsed.success || parsed.data.file.mimeType !== 'application/pdf') return null;
  return parsed.data;
}

export type LibraryDocument = {
  id: string;
  title: string;
  kind: string;
  bytes: number;
  cover: string | null;
  preview: string;
  download: string;
};

export function mapLibraryDocuments(values: unknown[]): LibraryDocument[] {
  const seen = new Set<string>();
  return values.flatMap(value => {
    const row = parseLibraryDocument(value);
    if (!row || seen.has(String(row.file.id))) return [];
    seen.add(String(row.file.id));
    const url = `/docs/file/${encodeURIComponent(String(row.id))}`;
    return [{
      id: String(row.id), title: row.title, kind: row.kind || 'Документ',
      bytes: row.file.filesize ?? 0,
      cover: row.cover?.mimeType.startsWith('image/') ? `${url}?cover=1` : null,
      preview: url, download: `${url}?download=1`,
    }];
  });
}

export { documentSize } from '@/lib/document-format';
