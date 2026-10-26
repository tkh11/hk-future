import 'server-only';
import { draftMode, headers } from 'next/headers';
import { getCMS } from './client';
import { canEdit } from './access';
import { cmsEnabled } from './env';

export async function getPreviewUser() {
  if (!cmsEnabled() || !(await draftMode()).isEnabled) return null;
  const cms = await getCMS();
  const { user } = await cms.auth({ headers: await headers() });
  // The bypass cookie alone is never sufficient, and revocation takes effect
  // without waiting for a shared preview cache to expire.
  return canEdit(user) ? user : null;
}
