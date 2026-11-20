import { getPayload } from 'payload';

const databaseURL = new URL(process.env.DATABASE_URL || '');
if (!['127.0.0.1', 'localhost', '[::1]'].includes(databaseURL.hostname)
  || !/^\/hk_test_admin_[a-f0-9]{16}$/.test(databaseURL.pathname)
  || process.env.CMS_E2E_ISOLATED !== databaseURL.pathname.slice(1)) {
  throw new Error('Use scripts/cms/test-admin.mjs to prepare a disposable database.');
}
const { default: config } = await import('../../payload.config');
const payload = await getPayload({ config });
await payload.db.migrate();
await payload.destroy();
// All migration writes have completed. Payload keeps a PostgreSQL listener alive.
process.exit(0);
