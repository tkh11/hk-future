import { randomBytes } from 'node:crypto'
import { existsSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { Pool } from 'pg'

if (existsSync('.env.local')) process.loadEnvFile('.env.local')
const connection = process.env.CMS_TEST_DATABASE_URL || process.env.DATABASE_URL
if (!connection) throw new Error('Configure a local PostgreSQL connection first.')
const url = new URL(connection)
if (!['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname)) throw new Error('Path integration tests only run against local PostgreSQL.')
url.pathname = `/hk_test_paths_${randomBytes(8).toString('hex')}`
const pinnedNode = path.resolve('node_modules/node/bin/node')
const node = existsSync(pinnedNode) ? pinnedNode : process.execPath
try {
  const result = spawnSync(node, ['--import', 'tsx', '--test', '--test-force-exit', '--test-concurrency=1', 'tests/integration/cms-paths.test.ts'], {
    stdio: 'inherit', env: { ...process.env, CMS_TEST_DATABASE_URL: url.toString(), NODE_ENV: 'test' },
  })
  if (result.error) throw result.error
  process.exitCode = result.status ?? 1
} finally {
  const database = url.pathname.slice(1)
  if (!/^hk_test_paths_[a-z0-9]{16}$/.test(database)) throw new Error('Refusing unsafe database cleanup.')
  url.pathname = '/postgres'
  const pool = new Pool({ connectionString: url.toString(), max: 1 })
  try { await pool.query(`DROP DATABASE IF EXISTS "${database}" WITH (FORCE)`) }
  finally { await pool.end() }
}
