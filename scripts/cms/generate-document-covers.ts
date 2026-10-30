/** Generate small, real first-page previews without changing source PDF bytes. */
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { tmpdir } from 'node:os';
import path from 'node:path';
import sharp from 'sharp';
import { getPayload } from 'payload';
import config from '../../payload.config';

if (process.env.S3_BUCKET) throw new Error('Run this local cover preparation command with a local copy of the media library.');
const run = promisify(execFile);
const pdfTool = process.env.PDFTOPPM_BIN || 'pdftoppm';
await run(pdfTool, ['-v']);
const payload = await getPayload({ config });
const temp = await mkdtemp(path.join(tmpdir(), 'hk-document-covers-'));
const context = { skipContentHooks: true };
const manifest: Array<{ document: number; previousCover: number | null; nextCover: number }> = [];
const manifestDirectory = path.resolve('.local/document-covers');
await mkdir(manifestDirectory, { recursive: true });
const manifestPath = path.join(manifestDirectory, `covers-${Date.now()}.json`);
let failures = 0;

try {
  const admin = (await payload.find({ collection: 'users', overrideAccess: true, limit: 1, where: { role: { equals: 'admin' } } })).docs[0];
  if (!admin) throw new Error('Create an administrator before preparing document covers.');
  const result = await payload.find({ collection: 'catalog-documents', overrideAccess: false, user: admin,
    draft: false, depth: 1, pagination: false, where: { _status: { equals: 'published' } }, sort: 'id' });
  for (const [index, doc] of result.docs.entries()) {
    try {
      const source = doc.file;
      if (!source || typeof source !== 'object' || source._status !== 'published' || source.mimeType !== 'application/pdf' || !source.filename) continue;
      if (/[/\\\x00-\x1f]/.test(source.filename)) throw new Error('Invalid source filename.');
      const fingerprint = createHash('sha256').update(`${source.id}:${source.filename}`).digest('hex');
      const externalId = `document-cover-v1-${fingerprint}`;
      let cover = (await payload.find({ collection: 'media', overrideAccess: false, user: admin,
        limit: 1, where: { externalId: { equals: externalId } } })).docs[0];
      if (!cover) {
        const input = path.resolve(process.env.CMS_UPLOAD_DIR || '.local/uploads', source.filename);
        const prefix = path.join(temp, 'first-page');
        await run(pdfTool, ['-f', '1', '-l', '1', '-singlefile', '-scale-to', '800', '-png', input, prefix], { timeout: 120_000, maxBuffer: 2 * 1024 * 1024 });
        const data = await sharp(await readFile(`${prefix}.png`)).webp({ quality: 82 }).toBuffer();
        cover = await payload.create({ collection: 'media', overrideAccess: false, user: admin, context,
          data: { title: `Обложка: ${doc.title}`, alt: `Первая страница: ${doc.title}`, externalId, _status: 'published' },
          file: { data, name: `document-cover-${fingerprint}.webp`, mimetype: 'image/webp', size: data.length } });
      }
      const oldCover = typeof doc.cover === 'object' ? doc.cover?.id ?? null : doc.cover ?? null;
      if (oldCover !== cover.id) {
        // Do not overwrite an editor's concurrent changes or unpublished revision.
        const latest = await payload.findByID({ collection: 'catalog-documents', id: doc.id, depth: 0, draft: true, user: admin, overrideAccess: false });
        if (latest.updatedAt !== doc.updatedAt) throw new Error('Document changed during preparation; rerun after the editor finishes.');
        manifest.push({ document: doc.id, previousCover: oldCover, nextCover: cover.id });
        await writeFile(manifestPath, JSON.stringify(manifest, null, 2));
        await payload.update({ collection: 'catalog-documents', id: doc.id, depth: 0,
          user: admin, overrideAccess: false, context, data: { cover: cover.id } });
      }
      console.log(`${index + 1}/${result.docs.length}: document ${doc.id} ready`);
    } catch (error) {
      failures += 1;
      console.error(`Document ${doc.id}: ${error instanceof Error ? error.message : 'cover preparation failed'}`);
    }
  }
  console.log(`Updated ${manifest.length} covers; failed ${failures}. Original cover references: ${manifestPath}`);
} finally {
  await rm(temp, { recursive: true, force: true });
  await payload.destroy();
}
// Payload retains a PostgreSQL listener after its awaited writes complete.
process.exit(failures ? 1 : 0);
