import { createReadStream, openSync, closeSync } from 'node:fs';
import { mkdir, readdir, lstat, copyFile, chmod, writeFile, rename, realpath, rm } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { basename, join, relative, resolve } from 'node:path';

process.umask(0o077);
if (process.env.CMS_WRITES_PAUSED !== 'true') throw new Error('Pause CMS writes/jobs first, then explicitly set CMS_WRITES_PAUSED=true.');
if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is required.');
if (process.env.S3_BUCKET && !process.env.CMS_BACKUP_UPLOAD_DIR) throw new Error('S3 requires CMS_BACKUP_UPLOAD_DIR pointing to a complete private bucket export. A database dump alone is not a media backup.');
const database = new URL(process.env.DATABASE_URL);
if (!['postgres:', 'postgresql:'].includes(database.protocol) || !database.pathname.slice(1)) throw new Error('Invalid PostgreSQL connection.');
const identity = { host: database.hostname, port: database.port || '5432', database: decodeURIComponent(database.pathname.slice(1)) };
const pgEnv = {
  ...process.env, PGHOST: identity.host, PGPORT: identity.port, PGDATABASE: identity.database,
  PGUSER: decodeURIComponent(database.username), PGPASSWORD: decodeURIComponent(database.password),
  ...(database.searchParams.get('sslmode') ? { PGSSLMODE: database.searchParams.get('sslmode') } : {}),
};
const binary = (name) => process.env.PG_BIN ? join(process.env.PG_BIN, name) : name;
function run(name, args, options = {}) {
  const result = spawnSync(binary(name), args, { env: pgEnv, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) throw new Error(`${name} failed. Check PostgreSQL availability, client version and permissions; no complete backup was published.`);
  return result.stdout?.trim();
}
run('pg_dump', ['--version']);
const uploads = resolve(process.env.CMS_BACKUP_UPLOAD_DIR || '.local/uploads');
if (process.env.S3_BUCKET) {
  if (!(await lstat(uploads)).isDirectory()) throw new Error('S3 export must be an existing complete snapshot directory.');
} else await mkdir(uploads, { recursive: true, mode: 0o700 });
const uploadsRoot = await realpath(uploads);
const backupRoot = resolve(process.env.CMS_BACKUP_DIR || '.local/backups');
const id = `backup-${new Date().toISOString().replace(/[:.]/g, '-')}`;
const pending = join(backupRoot, `.${id}.partial`);
const complete = join(backupRoot, id);
if (backupRoot === uploadsRoot || backupRoot.startsWith(`${uploadsRoot}/`)) throw new Error('Backup destination must not be inside the uploads source.');
await mkdir(backupRoot, { recursive: true, mode: 0o700 });
await mkdir(pending, { mode: 0o700 });

async function sha256(file) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
async function copyUploads(directory, files = []) {
  for (const item of await readdir(directory, { withFileTypes: true })) {
    const source = join(directory, item.name);
    const info = await lstat(source);
    if (info.isSymbolicLink()) throw new Error('Uploads snapshot contains a symlink; refusing to follow it.');
    if (info.isDirectory()) await copyUploads(source, files);
    else if (info.isFile()) {
      const path = relative(uploadsRoot, source).split('\\').join('/');
      const destination = join(pending, 'uploads', path);
      await mkdir(resolve(destination, '..'), { recursive: true, mode: 0o700 });
      const before = await sha256(source);
      await copyFile(source, destination);
      await chmod(destination, 0o600);
      const after = await sha256(destination);
      if (before !== after || before !== await sha256(source)) throw new Error('Uploads changed during backup. Pause writes and retry.');
      files.push({ path, bytes: info.size, sha256: after });
    } else throw new Error('Uploads snapshot contains an unsupported filesystem entry.');
  }
  return files;
}

const countsSQL = `SELECT json_build_object('users',(SELECT count(*) FROM users),'categories',(SELECT count(*) FROM categories),'products',(SELECT count(*) FROM products),'articles',(SELECT count(*) FROM articles),'pages',(SELECT count(*) FROM pages),'media',(SELECT count(*) FROM media),'migrations',(SELECT count(*) FROM payload_migrations));`;
try {
  const counts = JSON.parse(run('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', countsSQL]));
  const dump = join(pending, 'database.dump');
  const fd = openSync(dump, 'wx', 0o600);
  try { run('pg_dump', ['--format=custom', '--no-owner', '--no-acl'], { stdio: ['ignore', fd, 'pipe'] }); }
  finally { closeSync(fd); }
  await mkdir(join(pending, 'uploads'), { mode: 0o700 });
  const files = await copyUploads(uploadsRoot);
  const filenames = JSON.parse(run('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', "SELECT coalesce(json_agg(filename), '[]') FROM media WHERE filename IS NOT NULL;"]));
  const copiedPaths = new Set(files.map((file) => file.path));
  if (filenames.some((filename) => !copiedPaths.has(filename))) throw new Error('Uploads snapshot is incomplete: a CMS media file is missing.');
  const finalCounts = JSON.parse(run('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', countsSQL]));
  if (JSON.stringify(counts) !== JSON.stringify(finalCounts)) throw new Error('Database changed during backup. Keep CMS writes paused.');
  const manifest = {
    version: 1, createdAt: new Date().toISOString(), source: identity, counts,
    database: { file: 'database.dump', sha256: await sha256(dump), bytes: (await lstat(dump)).size },
    uploads: { source: process.env.S3_BUCKET ? 'private-s3-export' : 'local-private', files },
  };
  await writeFile(join(pending, 'manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  await rename(pending, complete);
  // Never log a URL, password, file contents or private document filenames.
  console.log(`Backup complete: ${basename(complete)} (${files.length} media files). Keep this directory private and encrypted at rest.`);
} catch (error) {
  await rm(pending, { recursive: true, force: true });
  throw error;
}
