'use server';

import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createLocalReq, logoutOperation, type Payload } from 'payload';
import { generateExpiredPayloadCookie, generatePayloadCookie } from 'payload/shared';
import { z } from 'zod';
import { getCMS } from '@/cms/client';
import { cmsEnabled } from '@/cms/env';
import { safeNext } from './routes';
import { getStudioSession, requireStaff } from './session';

export type FormState = { error?: string; ok?: string; email?: string } | undefined;

const credentials = z.object({
  email: z.string().trim().toLowerCase().email().max(254),
  password: z.string().min(1).max(256),
});

function failure(error: unknown) {
  const name = error instanceof Error ? error.name : '';
  if (name === 'LockedAuth') return 'Слишком много попыток. Вход заблокирован на 15 минут.';
  if (name === 'AuthenticationError') return 'Неверная почта или пароль.';
  return 'Не удалось войти. Попробуйте ещё раз.';
}

async function writeCookie(payload: Payload, token?: string) {
  const options = { collectionAuthConfig: payload.collections.users.config.auth, cookiePrefix: payload.config.cookiePrefix, returnCookieAsObject: true } as const;
  const cookie = token ? generatePayloadCookie({ ...options, token }) : generateExpiredPayloadCookie(options);
  (await cookies()).set({
    name: cookie.name, value: cookie.value ?? '', path: cookie.path ?? '/', domain: cookie.domain, httpOnly: cookie.httpOnly ?? true, secure: cookie.secure,
    sameSite: cookie.sameSite ? (cookie.sameSite.toLowerCase() as 'lax' | 'strict' | 'none') : 'lax',
    expires: cookie.expires ? new Date(cookie.expires) : undefined,
  });
}

export async function login(_: FormState, form: FormData): Promise<FormState> {
  if (!cmsEnabled()) return { error: 'Система управления выключена.' };
  const email = String(form.get('email') ?? '').slice(0, 254);
  const parsed = credentials.safeParse({ email, password: form.get('password') });
  if (!parsed.success) return { error: 'Введите почту и пароль.', email };
  const payload = await getCMS();
  let token: string | undefined;
  try {
    ({ token } = await payload.login({ collection: 'users', data: parsed.data }));
  } catch (error) {
    return { error: failure(error), email };
  }
  if (!token) return { error: 'Не удалось войти. Попробуйте ещё раз.', email };
  await writeCookie(payload, token);
  redirect(safeNext(form.get('next')));
}

async function endSession(allSessions = false) {
  const { payload, user } = await getStudioSession();
  if (user) {
    const req = await createLocalReq({ user }, payload);
    await logoutOperation({ collection: payload.collections.users, req, allSessions }).catch(() => undefined);
  }
  return payload;
}

export async function logout() {
  const payload = await endSession();
  await writeCookie(payload);
  redirect('/studio/login');
}

const passwordChange = z.object({
  current: z.string().min(1).max(256),
  next: z.string().min(10, 'Новый пароль — не короче 10 символов.').max(256),
  repeat: z.string(),
}).refine(v => v.next === v.repeat, { message: 'Пароли не совпадают.', path: ['repeat'] });

export async function changePassword(_: FormState, form: FormData): Promise<FormState> {
  const { payload, user } = await requireStaff();
  const parsed = passwordChange.safeParse({ current: form.get('current'), next: form.get('next'), repeat: form.get('repeat') });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте поля.' };
  try {
    await payload.login({ collection: 'users', data: { email: user.email, password: parsed.data.current } });
  } catch (error) {
    return { error: error instanceof Error && error.name === 'LockedAuth' ? failure(error) : 'Текущий пароль указан неверно.' };
  }
  await payload.update({ collection: 'users', id: user.id, data: { password: parsed.data.next }, overrideAccess: false, user });
  // Every other device has to sign in again with the new password.
  await endSession(true);
  const { token } = await payload.login({ collection: 'users', data: { email: user.email, password: parsed.data.next } });
  await writeCookie(payload, token);
  // A same-request re-render would still read the revoked token from the request headers.
  redirect('/studio/profile?password=changed');
}
