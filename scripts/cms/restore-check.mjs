import { createReadStream, openSync, closeSync } from 'node:fs';
import { readdir, readFile, lstat, mkdir, copyFile, chmod } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { join, resolve, basename } from 'node:path';

process.umask(0o077);
const targetValue = process.env.CMS_RESTORE_DATABASE_URL;
if (!targetValue) throw new Error('Set CMS_RESTORE_DATABASE_URL explicitly to a NEW disposable database. DATABASE_URL is never used as a restore target.');
const target = new URL(targetValue);
const targetName = decodeURIComponent(target.pathname.slice(1));
if (!['postgres:', 'postgresql:'].includes(target.protocol) || !['localhost', '127.0.0.1', '[::1]', '::1'].includes(target.hostname) || !/^heisskraft_restore_[a-z0-9_]{1,40}$/.test(targetName)) throw new Error('Restore checks accept only localhost databases named heisskraft_restore_<suffix>.');
const backups = resolve(process.env.CMS_BACKUP_DIR || '.local/backups');
const candidates = process.env.CMS_BACKUP_PATH ? [] : (await readdir(backups, { withFileTypes: true })).filter((entry) => entry.isDirectory() && entry.name.startsWith('backup-')).map((entry) => entry.name).sort();
if (!process.env.CMS_BACKUP_PATH && !candidates.length) throw new Error('No completed backup found.');
const backup = resolve(process.env.CMS_BACKUP_PATH || join(backups, candidates.at(-1)));
if ((await lstat(backup)).isSymbolicLink()) throw new Error('Backup directory must not be a symlink.');
const manifest = JSON.parse(await readFile(join(backup, 'manifest.json'), 'utf8'));
if (manifest.version !== 1 || manifest.database?.file !== 'database.dump' || !manifest.source?.database || !Array.isArray(manifest.uploads?.files) || !manifest.counts) throw new Error('Invalid backup manifest.');
if (targetName === manifest.source.database) throw new Error('The restore database must differ from the source database.');
if (process.env.DATABASE_URL && targetName === decodeURIComponent(new URL(process.env.DATABASE_URL).pathname.slice(1))) throw new Error('Refusing to restore into the configured application database.');

async function sha256(file) {
  if (!(await lstat(file)).isFile() || (await lstat(file)).isSymbolicLink()) throw new Error('Backup files must be regular files.');
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}
function checkedUploadPath(path) {
  if (typeof path !== 'string' || !path || path.includes('\\') || path.includes('\0') || path.startsWith('/') || path.split('/').some((part) => !part || part === '.' || part === '..')) throw new Error('Unsafe media path in backup manifest.');
  return path;
}
const dump = join(backup, 'database.dump');
if (await sha256(dump) !== manifest.database.sha256) throw new Error('Database checksum mismatch. Nothing has been restored.');
const knownPaths = new Set();
for (const file of manifest.uploads.files) {
  const path = checkedUploadPath(file.path);
  if (knownPaths.has(path)) throw new Error('Duplicate media path in backup manifest.');
  knownPaths.add(path);
  // Reject a symlink in any parent directory as well as at the file itself.
  let current = join(backup, 'uploads');
  if ((await lstat(current)).isSymbolicLink()) throw new Error('Unsafe media directory.');
  for (const part of path.split('/')) {
    current = join(current, part);
    if ((await lstat(current)).isSymbolicLink()) throw new Error('Unsafe media directory.');
  }
  if (await sha256(current) !== file.sha256 || (await lstat(current)).size !== file.bytes) throw new Error('Media checksum or size mismatch. Nothing has been restored.');
}
const pgEnv = {
  ...process.env, PGHOST: target.hostname, PGPORT: target.port || '5432', PGDATABASE: targetName,
  PGUSER: decodeURIComponent(target.username), PGPASSWORD: decodeURIComponent(target.password),
};
const binary = (name) => process.env.PG_BIN ? join(process.env.PG_BIN, name) : name;
function run(name, args, options = {}) {
  const result = spawnSync(binary(name), args, { env: pgEnv, encoding: 'utf8', ...options });
  if (result.error || result.status !== 0) throw new Error(`${name} failed during disposable restore. The application database was not used as a target.`);
  return result.stdout?.trim();
}
const exists = run('psql', ['--no-psqlrc', '--dbname=postgres', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', `SELECT 1 FROM pg_database WHERE datname='${targetName}';`]);
if (exists === '1') throw new Error('Disposable target already exists; choose a fresh name. Existing databases are never cleaned or dropped.');
run('createdb', [targetName]);
const fd = openSync(dump, 'r');
try { run('pg_restore', ['--exit-on-error', '--no-owner', '--no-acl', `--dbname=${targetName}`], { stdio: [fd, 'pipe', 'pipe'] }); }
finally { closeSync(fd); }
const countsSQL = `SELECT json_build_object('users',(SELECT count(*) FROM users),'categories',(SELECT count(*) FROM categories),'products',(SELECT count(*) FROM products),'articles',(SELECT count(*) FROM articles),'pages',(SELECT count(*) FROM pages),'media',(SELECT count(*) FROM media),'migrations',(SELECT count(*) FROM payload_migrations));`;
const counts = JSON.parse(run('psql', ['--no-psqlrc', '--tuples-only', '--no-align', '--set=ON_ERROR_STOP=1', '--command', countsSQL]));
for (const key of ['users', 'categories', 'products', 'articles', 'pages', 'media', 'migrations']) {
  if (typeof manifest.counts[key] !== 'number' || counts[key] !== manifest.counts[key]) throw new Error('Restored data does not match the backup inventory.');
}
const restoredUploads = resolve('.local/restore-checks', targetName, 'uploads');
await mkdir(restoredUploads, { recursive: true, mode: 0o700 });
for (const file of manifest.uploads.files) {
  const destination = join(restoredUploads, file.path);
  await mkdir(resolve(destination, '..'), { recursive: true, mode: 0o700 });
  await copyFile(join(backup, 'uploads', file.path), destination);
  await chmod(destination, 0o600);
  if (await sha256(destination) !== file.sha256) throw new Error('Restored media verification failed.');
}
console.log(`Restore check passed: ${basename(backup)} into ${targetName}; ${manifest.uploads.files.length} media checksums and CMS table counts verified. The disposable database remains for inspection; no application data was overwritten.`);
