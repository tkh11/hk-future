import 'server-only';
import { cmsEnabled } from './env';

export async function getCMS() {
  if (!cmsEnabled()) throw new Error('CMS is disabled.');
  const [{ getPayload }, { default: config }] = await Promise.all([import('payload'), import('../../payload.config')]);
  return getPayload({ config });
}
