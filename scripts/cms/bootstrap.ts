import { getPayload } from 'payload';
import config from '../../payload.config';

const email = process.env.CMS_BOOTSTRAP_EMAIL;
const password = process.env.CMS_BOOTSTRAP_PASSWORD;
if (!email || !password || password.length < 16) throw new Error('Set CMS_BOOTSTRAP_EMAIL and a strong CMS_BOOTSTRAP_PASSWORD.');
const payload = await getPayload({ config });
const existing = await payload.find({ collection: 'users', limit: 1, overrideAccess: true });
if (existing.totalDocs !== 0) console.log('Users already exist; bootstrap skipped.');
else {
  await payload.create({ collection: 'users', overrideAccess: true, data: { email, password, role: 'admin', name: 'Администратор HEISSKRAFT' } });
  console.log('Initial administrator created.');
}
await payload.destroy();
// Payload retains a PostgreSQL listener; the CLI exits only after all awaited writes.
process.exit(0);
