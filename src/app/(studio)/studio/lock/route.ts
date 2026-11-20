import { z } from 'zod';
import { canEdit } from '@/cms/access';
import { releaseLock, lockable } from '@/studio/locks';
import { getStudioSession } from '@/studio/session';

const body = z.object({ collection: z.enum(lockable), id: z.number().int().positive() });

/** `navigator.sendBeacon` target: frees the record when the editor tab closes. */
export async function POST(request: Request) {
  const parsed = body.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return new Response(null, { status: 400 });
  const { payload, user } = await getStudioSession();
  if (!user || !canEdit(user)) return new Response(null, { status: 401 });
  await releaseLock({ payload, user }, parsed.data.collection, parsed.data.id);
  return new Response(null, { status: 204 });
}
