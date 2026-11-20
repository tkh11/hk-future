import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdtemp, mkdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import path from 'node:path';
import { Pool } from 'pg';

// Only reuse local PostgreSQL connection credentials, never its database or files.
process.umask(0o077);
if (existsSync('.env.local')) process.loadEnvFile('.env.local');
const connection = process.env.CMS_TEST_DATABASE_URL || process.env.DATABASE_URL;
if (!connection) throw new Error('Configure a local PostgreSQL connection first.');
const url = new URL(connection);
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('CMS browser tests require a local PostgreSQL server.');
const database = `hk_test_admin_${randomBytes(8).toString('hex')}`;
url.pathname = `/${database}`;
const maintenanceURL = new URL(url); maintenanceURL.pathname = '/postgres';
const pool = new Pool({ connectionString: maintenanceURL.toString(), max: 1 });
const node = existsSync('node_modules/node/bin/node') ? path.resolve('node_modules/node/bin/node') : process.execPath;
const baseURL = 'http://localhost:3100';
if (!existsSync('.next-production/BUILD_ID')) throw new Error('Build the CMS production bundle first: npm run build:production.');
const directory = await mkdtemp(path.join(tmpdir(), 'hk-cms-admin-'));
const uploads = path.join(directory, 'uploads');
await mkdir(uploads, { mode: 0o700 });
const env = {
  ...process.env, NODE_ENV: 'production', NEXT_BUILD_DIR: '.next-production',
  CMS_ENABLED: 'true', GITHUB_PAGES: 'false', DATABASE_URL: url.toString(), CMS_TEST_DATABASE_URL: url.toString(),
  CMS_SERVER_URL: baseURL, NEXT_PUBLIC_SITE_URL: baseURL, CMS_E2E_URL: baseURL,
  CMS_UPLOAD_DIR: uploads, CMS_E2E_ISOLATED: database,
  PAYLOAD_SECRET: randomBytes(48).toString('hex'),
  CMS_BOOTSTRAP_EMAIL: 'admin@cms-browser-test.invalid',
  CMS_BOOTSTRAP_PASSWORD: randomBytes(32).toString('hex'),
};
// Test activity must never reach production storage, analytics or an access gateway.
for (const name of [...Object.keys(env), 'S3_BUCKET', 'S3_ENDPOINT', 'S3_ACCESS_KEY_ID', 'S3_SECRET_ACCESS_KEY', 'CMS_GATEWAY_SECRET', 'METRIKA_COUNTER_ID', 'METRIKA_READ_TOKEN', 'METRIKA_ENABLED', 'NEXT_PUBLIC_METRIKA_ID']) {
  if (/^(?:S3_|METRIKA_|NEXT_PUBLIC_METRIKA|CMS_GATEWAY_)/.test(name)) env[name] = '';
}
let server;
let child;
let created = false;
let interrupted = false;
const interrupt = () => { interrupted = true; child?.kill('SIGTERM'); server?.kill('SIGTERM'); };
process.once('SIGINT', interrupt);
process.once('SIGTERM', interrupt);

async function run(args, label, inherit = false) {
  if (interrupted) throw new Error('CMS browser tests interrupted.');
  console.log(label);
  return new Promise((resolve, reject) => {
    child = spawn(node, args, { env, stdio: inherit ? 'inherit' : ['ignore', 'pipe', 'pipe'] });
    // Do not print configuration, fixture credentials, or raw Payload error bodies.
    if (!inherit) { child.stdout.resume(); child.stderr.resume(); }
    child.once('error', reject);
    child.once('exit', (code) => {
      child = undefined;
      if (code === 0) resolve();
      else reject(new Error(`${label} failed (exit ${code ?? 'signal'}).`));
    });
  });
}

try {
  // Never attach tests to an unrelated running server (even on the expected port).
  await new Promise((resolve, reject) => {
    const probe = createServer();
    probe.once('error', () => reject(new Error('Port 3100 is in use. Stop that server before running isolated CMS tests.')));
    probe.listen(3100, '127.0.0.1', () => probe.close(resolve));
  });
  if ((await pool.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rowCount !== 0) throw new Error('Refusing to use an existing test database.');
  await pool.query(`CREATE DATABASE "${database}"`); created = true;
  await run(['--import', 'tsx', 'scripts/cms/prepare-admin-test.ts'], 'Preparing isolated CMS schema');
  await run(['--import', 'tsx', 'scripts/cms/bootstrap.ts'], 'Creating disposable administrator');
  await run(['--import', 'tsx', 'scripts/cms/seed.ts'], 'Seeding disposable CMS content');
  server = spawn(node, ['node_modules/next/dist/bin/next', 'start', '--hostname', '127.0.0.1', '--port', '3100'], { env, stdio: ['ignore', 'pipe', 'pipe'] });
  server.stdout.resume(); server.stderr.resume();
  let serverError;
  server.once('error', error => { serverError = error; });
  const deadline = Date.now() + 60_000;
  let ready = false;
  while (!ready && Date.now() < deadline && !interrupted) {
    if (serverError || server.exitCode !== null || server.signalCode !== null) throw new Error('The isolated CMS server could not start.');
    try { ready = (await fetch(`${baseURL}/studio/login`, { signal: AbortSignal.timeout(2000) })).ok; } catch { /* Startup may not have opened its listener yet. */ }
    if (!ready) await new Promise(resolve => setTimeout(resolve, 250));
  }
  if (!ready) throw new Error('The isolated CMS server did not become ready.');
  await run(['node_modules/@playwright/test/cli.js', 'test', '--config', 'playwright.cms.config.ts', ...process.argv.slice(2)], 'Running CMS browser scenarios in the disposable database', true);
} catch (error) {
  console.error(error instanceof Error ? error.message : 'CMS browser verification failed.');
  process.exitCode = 1;
} finally {
  if (server?.pid && server.exitCode === null && server.signalCode === null) {
    const stopped = new Promise(resolve => server.once('exit', resolve));
    server.kill('SIGTERM');
    const timeout = setTimeout(() => server.kill('SIGKILL'), 5000);
    await stopped; clearTimeout(timeout);
  }
  if (created) {
    if (!/^hk_test_admin_[a-f0-9]{16}$/.test(database)) throw new Error('Refusing unsafe test database cleanup.');
    await pool.query(`DROP DATABASE "${database}" WITH (FORCE)`);
  }
  await pool.end();
  await rm(directory, { recursive: true, force: true });
  process.removeListener('SIGINT', interrupt);
  process.removeListener('SIGTERM', interrupt);
  console.log('Disposable CMS database and uploads removed.');
}
