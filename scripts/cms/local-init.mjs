import { existsSync, mkdirSync, writeFileSync, readFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { resolve } from 'node:path';

mkdirSync('.local', { recursive: true, mode: 0o700 });
const filename = '.env.local';
if (!existsSync(filename)) {
  const password = randomBytes(24).toString('hex');
  const secret = randomBytes(48).toString('hex');
  const adminPassword = randomBytes(24).toString('base64url');
  writeFileSync(filename, `CMS_ENABLED=true\nCMS_SERVER_URL=http://localhost:3000\nDATABASE_URL=postgresql://heisskraft:${password}@127.0.0.1:5433/heisskraft\nPAYLOAD_SECRET=${secret}\nCMS_BOOTSTRAP_EMAIL=admin@heisskraft.local\nCMS_BOOTSTRAP_PASSWORD=${adminPassword}\n`, { mode: 0o600, flag: 'wx' });
  writeFileSync('.local/admin-access.txt', `Локальная CMS: http://localhost:3000/studio\nEmail: admin@heisskraft.local\nПароль: ${adminPassword}\nТолько для разработки. Измените пароль после входа.\n`, { mode: 0o600 });
}
const env = readFileSync(filename, 'utf8');
const database = new URL(env.match(/^DATABASE_URL=(.+)$/m)?.[1] || '');
if (database.hostname !== '127.0.0.1' || database.port !== '5433' || database.pathname !== '/heisskraft') throw new Error('Local initializer only supports isolated localhost:5433/heisskraft.');
const pgBin = process.env.PG_BIN || '/opt/homebrew/opt/postgresql@17/bin';
const data = resolve('.local/postgres');
const passwordFile = resolve('.local/pg-password');
writeFileSync(passwordFile, decodeURIComponent(database.password), { mode: 0o600 });
function run(binary, args, extraEnv = {}) {
  const result = spawnSync(`${pgBin}/${binary}`, args, { stdio: 'inherit', env: { ...process.env, ...extraEnv } });
  if (result.status) throw new Error(`${binary} failed (${result.status}).`);
}
if (!existsSync(`${data}/PG_VERSION`)) run('initdb', ['-D',data,'-U','heisskraft','--auth=scram-sha-256',`--pwfile=${passwordFile}`,'--encoding=UTF8','--locale=en_US.UTF-8']);
const status = spawnSync(`${pgBin}/pg_ctl`, ['-D',data,'status'], { stdio: 'ignore' });
if (status.status !== 0) run('pg_ctl', ['-D',data,'-l',resolve('.local/postgres.log'),'-o','-h 127.0.0.1 -p 5433','start']);
const options = ['-h','127.0.0.1','-p','5433','-U','heisskraft'];
const check = spawnSync(`${pgBin}/psql`, [...options,'-d','postgres','-Atc',"SELECT 1 FROM pg_database WHERE datname='heisskraft'"], { encoding: 'utf8', env: { ...process.env, PGPASSWORD: decodeURIComponent(database.password) } });
if (check.status !== 0) throw new Error('Unable to check local database.');
if (check.stdout.trim() !== '1') run('createdb', [...options,'heisskraft'], { PGPASSWORD: decodeURIComponent(database.password) });
console.log('Isolated PostgreSQL ready. Admin credentials saved in .local/admin-access.txt (not tracked).');
