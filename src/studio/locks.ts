import 'server-only';
import type { Where } from 'payload';
import type { StudioSession } from './session';

type Actor = Pick<StudioSession, 'payload' | 'user'>;

export const lockable = ['products', 'product-variants', 'pump-selection-records', 'categories', 'catalog-documents', 'pages', 'articles', 'media'] as const;
export type Lockable = (typeof lockable)[number];
export type LockHolder = { name: string; since: string };

/** Matches `lockDocuments.duration` on catalog and content collections. */
const LOCK_MS = 300_000;

const lockWhere = (collection: Lockable, id: number): Where => ({
  and: [{ 'document.relationTo': { equals: collection } }, { 'document.value': { equals: id } }],
});

async function locksOf(s: Actor, collection: Lockable, id: number) {
  const result = await s.payload.find({
    collection: 'payload-locked-documents', where: lockWhere(collection, id), sort: '-updatedAt', limit: 10, depth: 0,
    overrideAccess: false, user: s.user,
  });
  return result.docs;
}

const ownerId = (lock: { user: { value: number | { id: number } } }) => (typeof lock.user.value === 'number' ? lock.user.value : lock.user.value.id);
const fresh = (lock: { updatedAt: string }) => Date.now() - new Date(lock.updatedAt).getTime() <= LOCK_MS;

async function holderOf(s: Actor, userId: number, since: string): Promise<LockHolder> {
  // Editors may read only their own user record; the colleague's name is all that leaves this query.
  const user = await s.payload.findByID({ collection: 'users', id: userId, depth: 0, select: { name: true, email: true }, disableErrors: true, overrideAccess: true });
  return { name: user?.name || user?.email || 'Коллега', since };
}

/** Who else holds a fresh lock, if anyone. */
export async function lockHolder(s: Actor, collection: Lockable, id: number): Promise<LockHolder | null> {
  const other = (await locksOf(s, collection, id)).find(lock => ownerId(lock) !== s.user.id && fresh(lock));
  return other ? holderOf(s, ownerId(other), other.updatedAt) : null;
}

/**
 * Takes or renews the lock. Payload deletes the lock row on every successful
 * save, so the editor calls this after each save as well as on a timer.
 */
export async function claimLock(s: Actor, collection: Lockable, id: number): Promise<LockHolder | null> {
  const locks = await locksOf(s, collection, id);
  const other = locks.find(lock => ownerId(lock) !== s.user.id && fresh(lock));
  if (other) return holderOf(s, ownerId(other), other.updatedAt);
  const own = locks.find(lock => ownerId(lock) === s.user.id);
  for (const stale of locks) {
    if (stale !== own) await s.payload.delete({ collection: 'payload-locked-documents', id: stale.id, overrideAccess: false, user: s.user });
  }
  const user = { relationTo: 'users' as const, value: s.user.id };
  if (own) await s.payload.update({ collection: 'payload-locked-documents', id: own.id, data: { user }, overrideAccess: false, user: s.user });
  else await s.payload.create({ collection: 'payload-locked-documents', data: { document: { relationTo: collection, value: id }, user }, overrideAccess: false, user: s.user });
  return null;
}

export async function releaseLock(s: Actor, collection: Lockable, id: number) {
  const own = (await locksOf(s, collection, id)).filter(lock => ownerId(lock) === s.user.id);
  for (const lock of own) await s.payload.delete({ collection: 'payload-locked-documents', id: lock.id, overrideAccess: false, user: s.user });
}
