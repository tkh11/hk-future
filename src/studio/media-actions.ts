'use server';

import { access } from 'node:fs/promises';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { revalidatePath } from 'next/cache';
import sharp from 'sharp';
import { z } from 'zod';
import { describeError, type ActionError } from './errors';
import { requireEditor } from './session';

export type UploadResult = { ok: true; id: number; url: string; alt: string } | ActionError;
const IMAGE = new Set(['image/jpeg', 'image/png', 'image/webp']);
const ALLOWED = new Set([...IMAGE, 'application/pdf', 'video/mp4']);
const sizes = [
  { name: 'thumb', width: 160, height: 160 },
  { name: 'card', width: 640 },
  { name: 'wide', width: 1200 },
] as const;

function fileFrom(form: FormData) {
  const file = form.get('file');
  if (!(file instanceof File) || !file.size) return null;
  return file;
}

export async function uploadMedia(form: FormData): Promise<UploadResult> {
  const file = fileFrom(form);
  if (!file) return { error: 'Выберите файл.' };
  if (!ALLOWED.has(file.type)) return { error: 'Допустимы JPEG, PNG, WebP, PDF и MP4.' };
  const alt = String(form.get('alt') ?? '').trim() || file.name.replace(/\.[^.]+$/, '');
  const s = await requireEditor();
  const bytes = Buffer.from(await file.arrayBuffer());
  // Editors may not publish: their uploads stay private drafts until a publisher releases them.
  const publish = s.can.publish;
  try {
    const doc = await s.payload.create({
      collection: 'media', draft: !publish,
      data: { alt, title: alt, _status: publish ? 'published' : 'draft' },
      file: { data: bytes, mimetype: file.type, name: file.name, size: file.size },
      overrideAccess: false, user: s.user, depth: 0,
    });
    revalidatePath('/studio/media');
    return { ok: true, id: doc.id, url: doc.url ?? '', alt: doc.alt };
  } catch (error) {
    return describeError(error);
  }
}

export async function updateMediaMeta(id: number, patch: { alt?: string; title?: string }): Promise<{ ok: true } | ActionError> {
  if (!z.number().int().positive().safeParse(id).success) return { error: 'Файл не найден.' };
  const s = await requireEditor();
  try {
    await s.payload.update({ collection: 'media', id, data: patch, overrideAccess: false, user: s.user, depth: 0 });
    revalidatePath('/studio/media');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}

type SizeEntry = { url: string; width: number; height: number; filename: string; mimeType: string; filesize: number };

async function writeSize(original: string, filename: string, name: string, width: number, height?: number): Promise<SizeEntry | null> {
  const dir = path.dirname(original);
  await mkdir(dir, { recursive: true });
  const ext = path.extname(filename) || '.webp';
  const stem = path.basename(filename, path.extname(filename));
  const outName = `${stem}-${name}${ext === '.jpg' ? '.jpg' : ext === '.png' ? '.png' : '.webp'}`;
  const outPath = path.join(dir, outName);
  let pipeline = sharp(original, { failOn: 'none' }).rotate();
  pipeline = height ? pipeline.resize(width, height, { fit: 'cover', withoutEnlargement: true }) : pipeline.resize(width, undefined, { withoutEnlargement: true });
  const { data, info } = await pipeline.toBuffer({ resolveWithObject: true });
  await writeFile(outPath, data);
  return {
    filename: outName, width: info.width, height: info.height, mimeType: `image/${info.format === 'jpeg' ? 'jpeg' : info.format}`,
    filesize: data.length, url: `/api/media/file/${outName}`,
  };
}

/** Generates 160 / 640 / 1200 copies for images that still lack them. Originals are not rewritten. */
export async function generateMissingSizes(limit = 25): Promise<{ ok: number; skipped: number; error?: string }> {
  const s = await requireEditor();
  const result = await s.payload.find({
    collection: 'media', draft: true, pagination: false, depth: 0, limit: 500,
    where: { mimeType: { contains: 'image/' } }, overrideAccess: false, user: s.user,
  });
  const dir = process.env.CMS_UPLOAD_DIR || path.resolve('.local/uploads');
  let ok = 0;
  let skipped = 0;
  for (const doc of result.docs) {
    if (ok >= limit) break;
    const sizesField = (doc as { sizes?: Record<string, { url?: string | null }> }).sizes;
    if (sizesField?.thumb?.url && sizesField?.card?.url && sizesField?.wide?.url) { skipped += 1; continue; }
    if (!doc.filename) { skipped += 1; continue; }
    const original = path.join(dir, doc.filename);
    try {
      await access(original);
      const generated: Record<string, SizeEntry> = {};
      for (const size of sizes) {
        const entry = await writeSize(original, doc.filename, size.name, size.width, 'height' in size ? size.height : undefined);
        if (entry) generated[size.name] = entry;
      }
      await s.payload.update({
        collection: 'media', id: doc.id, data: { sizes: generated } as Record<string, unknown>,
        draft: true, overrideAccess: false, user: s.user, depth: 0,
      });
      ok += 1;
    } catch {
      skipped += 1;
    }
  }
  revalidatePath('/studio/media');
  return { ok, skipped };
}
