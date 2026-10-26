import { randomBytes } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

process.umask(0o077);
await mkdir('.local', { recursive: true, mode: 0o700 });
const password = randomBytes(24).toString('hex');
const adminPassword = randomBytes(24).toString('base64url');
const values = [
  `POSTGRES_PASSWORD=${password}`,
  `PAYLOAD_SECRET=${randomBytes(48).toString('hex')}`,
  'CMS_BOOTSTRAP_EMAIL=admin@heisskraft.local',
  `CMS_BOOTSTRAP_PASSWORD=${adminPassword}`,
];
try {
  await writeFile('.local/compose.env', `${values.join('\n')}\n`, { flag: 'wx', mode: 0o600 });
} catch (error) {
  if (error.code === 'EEXIST') throw new Error('.local/compose.env already exists. Existing secrets were not changed.');
  throw error;
}
console.log('Generated private .local/compose.env for the isolated Docker environment. Administrator login values are stored there; they were not printed.');
