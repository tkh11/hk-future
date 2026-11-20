import 'server-only';
import { cache } from 'react';
import { headers } from 'next/headers';
import { notFound, redirect } from 'next/navigation';
import { canEdit, canPublish, isAdmin } from '@/cms/access';
import { getCMS } from '@/cms/client';
import { cmsEnabled } from '@/cms/env';
import { safeNext } from './routes';

export const getStudioSession = cache(async () => {
  const payload = await getCMS();
  const { user } = await payload.auth({ headers: await headers() });
  return { payload, user };
});

async function loginRedirect(): Promise<never> {
  const path = (await headers()).get('x-studio-path');
  redirect(`/studio/login${path && safeNext(path) !== '/studio' ? `?next=${encodeURIComponent(path)}` : ''}`);
}

/** Every page, action and route handler calls one of these; the layout check alone does not protect server actions. */
export async function requireStaff() {
  if (!cmsEnabled()) notFound();
  const { payload, user } = await getStudioSession();
  if (!user) return loginRedirect();
  return { payload, user, can: { edit: canEdit(user), publish: canPublish(user), admin: isAdmin(user) } };
}

export async function requireEditor() {
  const session = await requireStaff();
  if (!session.can.edit) redirect('/studio');
  return session;
}

export async function requireAdmin() {
  const session = await requireStaff();
  if (!session.can.admin) redirect('/studio');
  return session;
}

export type StudioSession = Awaited<ReturnType<typeof requireStaff>>;
