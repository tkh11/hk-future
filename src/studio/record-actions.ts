'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';
import { describeError, type ActionError } from './errors';
import { claimLock, lockHolder, type Lockable } from './locks';
import { requireAdmin, requireEditor } from './session';

export type SaveResult = { ok: true; savedAt?: string; id?: number } | ActionError;
const idSchema = z.number().int().positive();

type Writable = Extract<Lockable, 'categories' | 'catalog-documents' | 'articles' | 'media'>;

async function actor(needAdmin: boolean) {
  return needAdmin ? requireAdmin() : requireEditor();
}

export async function saveRecord(collection: Writable, id: number, data: Record<string, unknown>, mode: 'autosave' | 'save' | 'publish' = 'save'): Promise<SaveResult> {
  if (!idSchema.safeParse(id).success) return { error: 'Запись не найдена.' };
  const s = await actor(false);
  if (mode === 'publish' && !s.can.publish) return { error: 'Публикует публикующий редактор.' };
  if (!['categories', 'catalog-documents', 'articles', 'media'].includes(collection)) return { error: 'Раздел недоступен.' };
  const holder = await lockHolder(s, collection, id);
  if (holder) return { error: `Сейчас редактирует ${holder.name}.`, locked: true };
  try {
    const doc = await s.payload.update({
      collection, id, data: mode === 'publish' ? { ...data, _status: 'published' } : data,
      draft: mode !== 'publish', autosave: mode === 'autosave',
      overrideLock: false, overrideAccess: false, user: s.user, depth: 0, select: { updatedAt: true },
    });
    await claimLock(s, collection, id);
    revalidatePath('/studio', 'layout');
    return { ok: true, savedAt: doc.updatedAt };
  } catch (error) {
    return describeError(error);
  }
}

export async function createDocument(data: Record<string, unknown>): Promise<SaveResult> {
  const s = await actor(false);
  try {
    const doc = await s.payload.create({ collection: 'catalog-documents', data: { ...data, _status: 'draft' }, draft: true, overrideAccess: false, user: s.user, depth: 0 });
    redirect(`/studio/assortment/documents/${doc.id}`);
  } catch (error) {
    if ((error as { digest?: string }).digest?.startsWith('NEXT_REDIRECT')) throw error;
    return describeError(error);
  }
}

export async function saveGlobal(slug: 'contacts' | 'navigation', data: Record<string, unknown>): Promise<SaveResult> {
  const s = await requireEditor();
  if (slug !== 'contacts' && slug !== 'navigation') return { error: 'Раздел недоступен.' };
  if (!s.can.publish) return { error: 'Публикует публикующий редактор.' };
  try {
    if (slug === 'contacts') {
      const current = await s.payload.findGlobal({ slug, overrideAccess: false, user: s.user, depth: 0 });
      const previous = (current.content && typeof current.content === 'object') ? current.content as Record<string, unknown> : {};
      const incoming = (data.content && typeof data.content === 'object') ? data.content as Record<string, unknown> : {};
      data = { content: { ...previous, ...incoming } };
    }
    await s.payload.updateGlobal({ slug, data, overrideAccess: false, user: s.user, depth: 0 });
    revalidatePath('/studio', 'layout');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}

export async function saveUser(id: number, data: { name?: string; role?: 'admin' | 'editor' | 'publisher' | 'analyst'; password?: string }): Promise<SaveResult> {
  if (!idSchema.safeParse(id).success) return { error: 'Пользователь не найден.' };
  const s = await requireAdmin();
  try {
    await s.payload.update({ collection: 'users', id, data, overrideAccess: false, user: s.user, depth: 0 });
    revalidatePath('/studio/settings/users');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}

export async function createUser(data: { email: string; name?: string; role: 'admin' | 'editor' | 'publisher' | 'analyst'; password: string }): Promise<SaveResult> {
  const s = await requireAdmin();
  const parsed = z.object({
    email: z.string().email(), name: z.string().max(200).optional(),
    role: z.enum(['admin', 'editor', 'publisher', 'analyst']), password: z.string().min(10).max(200),
  }).safeParse(data);
  if (!parsed.success) return { error: 'Проверьте почту, роль и пароль (не короче 10 символов).' };
  try {
    const doc = await s.payload.create({ collection: 'users', data: parsed.data, overrideAccess: false, user: s.user, depth: 0 });
    revalidatePath('/studio/settings/users');
    return { ok: true, id: doc.id };
  } catch (error) {
    return describeError(error);
  }
}

export async function saveRedirect(id: number | null, data: { from: string; to: string }): Promise<SaveResult> {
  const s = await requireAdmin();
  const parsed = z.object({ from: z.string().min(1).max(500), to: z.string().regex(/^\/[a-z0-9/-]*$/, 'Только локальный путь.') }).safeParse(data);
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? 'Проверьте адреса.' };
  try {
    if (id) await s.payload.update({ collection: 'redirects', id, data: parsed.data, overrideAccess: false, user: s.user, depth: 0 });
    else await s.payload.create({ collection: 'redirects', data: parsed.data, overrideAccess: false, user: s.user, depth: 0 });
    revalidatePath('/studio/settings/redirects');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}

export async function deleteRedirect(id: number): Promise<SaveResult> {
  if (!idSchema.safeParse(id).success) return { error: 'Не найдено.' };
  const s = await requireAdmin();
  try {
    await s.payload.delete({ collection: 'redirects', id, overrideAccess: false, user: s.user });
    revalidatePath('/studio/settings/redirects');
    return { ok: true };
  } catch (error) {
    return describeError(error);
  }
}
