/** Reviewed local maintenance. Defaults to audit; --apply backs up before deleting. */
import pg from 'pg';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { readFile, mkdir, writeFile, copyFile, lstat, unlink } from 'node:fs/promises';
import path from 'node:path';

process.umask(0o077);
const apply = process.argv.includes('--apply');
const source = JSON.parse(await readFile(new URL('../../src/cms/import/obsolete-resource-covers.json', import.meta.url), 'utf8'));
const database = new URL(process.env.DATABASE_URL);
if (!['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/heisskraft' || process.env.S3_BUCKET) {
  throw new Error('This reviewed cleanup is restricted to the local Heisskraft database and local uploads.');
}
const uploads = path.resolve(process.env.CMS_UPLOAD_DIR || '.local/uploads');
const quote = name => `"${name.replaceAll('"', '""')}"`;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const db = new pg.Client({ connectionString: process.env.DATABASE_URL });
await db.connect();
let committed = false;
let backup;
try {
  await db.query(apply ? 'BEGIN' : 'BEGIN READ ONLY');
  await db.query("SET LOCAL lock_timeout = '5s'");
  // Freeze all public data writes during the short maintenance transaction.
  // Reads still work; a concurrent editor cannot attach a candidate mid-cleanup.
  if (apply) {
    const tables = (await db.query("SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename")).rows;
    await db.query(`LOCK TABLE ${tables.map(row => quote(row.tablename)).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  }
  const files = (await db.query('SELECT * FROM media WHERE external_id=ANY($1::text[]) ORDER BY id', [source.externalIds])).rows;
  if (!files.length) { console.log('No obsolete covers remain.'); }
  else {
    const ids = files.map(file => file.id);
    const allowed = new Set(['_media_v.parent_id', 'products_resources.file_id', '_products_v_version_resources.file_id']);
    const fks = (await db.query(`SELECT conrelid::regclass::text AS tbl,a.attname AS col FROM pg_constraint c
      JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=ANY(c.conkey)
      WHERE c.confrelid='media'::regclass AND c.contype='f'`)).rows;
    const references = [];
    for (const { tbl, col } of fks) {
      if (['media_legacy_ids', 'payload_locked_documents_rels'].includes(tbl)) continue;
      const count = Number((await db.query(`SELECT count(*) FROM ${quote(tbl)} WHERE ${quote(col)}=ANY($1::int[])`, [ids])).rows[0].count);
      if (count) references.push({ table: tbl, column: col, count });
      if (count && !allowed.has(`${tbl}.${col}`)) throw new Error(`Cover still used in ${tbl}.${col}; deletion stopped.`);
    }
    const versions = (await db.query('SELECT * FROM _media_v WHERE parent_id=ANY($1::int[])', [ids])).rows;
    if (versions.some(version => version.version_filename !== files.find(file => file.id === version.parent_id).filename)) {
      throw new Error('A cover has other historical file versions; review them before deletion.');
    }
    // JSON page/global content can hold file URLs outside normal foreign keys.
    const jsonColumns = (await db.query("SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND data_type IN ('json','jsonb')")).rows;
    for (const { table_name: table, column_name: column } of jsonColumns) {
      const rows = (await db.query(`SELECT ${quote(column)} AS value FROM ${quote(table)} WHERE ${quote(column)} IS NOT NULL`)).rows;
      if (rows.some(row => files.some(file => JSON.stringify(row.value).includes(file.filename)))) throw new Error(`Cover URL still used in ${table}.${column}.`);
    }
    for (const file of files) {
      if (!file.mime_type.startsWith('image/') || !/^[a-f0-9]{64}\.(png|jpg|webp)$/.test(file.filename)) throw new Error('Unexpected media type or filename.');
      const local = path.join(uploads, file.filename);
      if (!(await lstat(local)).isFile() || (await lstat(local)).isSymbolicLink()) throw new Error('Expected a regular local upload.');
      const fingerprint = hash(await readFile(local));
      if (file.external_id !== `asset-${fingerprint}` || file.sha256 !== fingerprint) throw new Error('Media checksum changed since the review.');
    }
    const snapshot = {
      reviewedAt: new Date().toISOString(), mode: apply ? 'apply' : 'audit', files, references,
      resources: (await db.query('SELECT * FROM products_resources WHERE file_id=ANY($1::int[]) ORDER BY _parent_id,_order', [ids])).rows,
      resourceVersions: (await db.query('SELECT * FROM _products_v_version_resources WHERE file_id=ANY($1::int[])', [ids])).rows,
      mediaVersions: versions,
    };
    console.log(JSON.stringify({ mode: snapshot.mode, files: files.length, bytes: files.reduce((total, file) => total + Number(file.filesize), 0),
      resourceLinks: snapshot.resources.length, affectedProducts: new Set(snapshot.resources.map(row => row._parent_id)).size }));
    if (apply) {
      backup = path.resolve('.local/resource-cleanup', new Date().toISOString().replaceAll(':', '-'));
      await mkdir(path.join(backup, 'uploads'), { recursive: true, mode: 0o700 });
      await writeFile(path.join(backup, 'snapshot.json'), JSON.stringify(snapshot, null, 2));
      for (const file of files) {
        await copyFile(path.join(uploads, file.filename), path.join(backup, 'uploads', file.filename));
        if (hash(await readFile(path.join(backup, 'uploads', file.filename))) !== file.sha256) throw new Error('Backup verification failed.');
      }
      const dump = spawnSync(process.env.PG_BIN ? path.join(process.env.PG_BIN, 'pg_dump') : 'pg_dump',
        ['--format=custom', '--no-owner', '--no-acl', '--file', path.join(backup, 'database.dump')], {
          env: { ...process.env, PGHOST: database.hostname, PGPORT: database.port || '5432', PGDATABASE: database.pathname.slice(1),
            PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password) }, encoding: 'utf8', timeout: 60_000,
        });
      if (dump.error || dump.status !== 0) throw new Error('Database backup failed; no changes applied.');
      await db.query('DELETE FROM products_resources WHERE file_id=ANY($1::int[])', [ids]);
      // Remove only obsolete links from history, so restoring a product cannot revive broken attachments.
      await db.query('DELETE FROM _products_v_version_resources WHERE file_id=ANY($1::int[])', [ids]);
      await db.query('DELETE FROM _media_v WHERE parent_id=ANY($1::int[])', [ids]);
      await db.query('DELETE FROM media WHERE id=ANY($1::int[])', [ids]);
      await db.query('COMMIT'); committed = true;
      const deleted = [];
      for (const file of files) {
        const local = path.join(uploads, file.filename);
        if (hash(await readFile(local)) !== file.sha256) throw new Error('Upload changed after commit; retained the file for review.');
        await unlink(local); deleted.push(file.id);
        await writeFile(path.join(backup, 'result.json'), JSON.stringify({ deleted, complete: deleted.length === files.length }, null, 2));
      }
      console.log(`Removed ${deleted.length} covers. Verified private backup: ${backup}`);
    }
  }
} finally {
  if (!committed) await db.query('ROLLBACK');
  await db.end();
}
