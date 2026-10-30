import 'server-only';
import type { ServerProps, VisibleEntities } from 'payload';
import { canEdit } from '@/cms/access';
import AdminNavClient from './AdminNavClient';

/** Server half of the nav: hides catalog sections that have no records yet. */
export default async function AdminNav({ payload, user, visibleEntities }: ServerProps & { visibleEntities?: VisibleEntities }) {
  let hasSeries = false;
  if (payload && user && canEdit(user)) {
    try { hasSeries = (await payload.count({ collection: 'product-series', overrideAccess: false, user })).totalDocs > 0; }
    catch { hasSeries = true; }
  }
  return <AdminNavClient visibleEntities={visibleEntities} hasSeries={hasSeries} />;
}
