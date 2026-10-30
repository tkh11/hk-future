import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { canEdit, canPublish, isAdmin } from '@/cms/access';
import { getCMS } from '@/cms/client';
import { cmsEnabled } from '@/cms/env';

export const getStudioSession = cache(async () => {
  const payload = await getCMS();
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, user };
});

/** Every page, action and route handler calls this; the layout check alone does not protect server actions. */
export async function requireEditor() {
  if (!cmsEnabled()) notFound();
  const { payload, user } = await getStudioSession();
  if (!user) redirect('/admin/login?redirect=%2Fstudio');
  // Analysts keep their read-only dashboard in the classic administration.
  if (!canEdit(user)) redirect('/admin');
  return { payload, user, can: { publish: canPublish(user), admin: isAdmin(user) } };
}

export type StudioSession = Awaited<ReturnType<typeof requireEditor>>;
