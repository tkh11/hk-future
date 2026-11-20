'use server';

import { z } from 'zod';
import { claimLock, lockable, releaseLock, type Lockable, type LockHolder } from './locks';
import { requireEditor } from './session';

const target = z.object({ collection: z.enum(lockable), id: z.number().int().positive() });

/** Called on a timer by an open editor; returns the colleague who holds the record, if any. */
export async function renewLock(collection: Lockable, id: number): Promise<LockHolder | null> {
  const parsed = target.parse({ collection, id });
  return claimLock(await requireEditor(), parsed.collection, parsed.id);
}

export async function dropLock(collection: Lockable, id: number) {
  const parsed = target.parse({ collection, id });
  await releaseLock(await requireEditor(), parsed.collection, parsed.id);
}
