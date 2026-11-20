import type { CollectionAfterChangeHook, CollectionAfterDeleteHook, CollectionBeforeChangeHook, CollectionBeforeValidateHook, PayloadRequest } from 'payload';
import type { Category } from './payload-types';

type PathDocument = { _status?: string | null; path?: string | null; slug?: string | null };
const publicPath = (collection: string, doc?: PathDocument | null): string | null => {
  if (!doc || doc._status !== 'published') return null;
  if (collection === 'categories') return doc.path ? `/catalog/${doc.path}` : null;
  if (collection === 'pages') return doc.path || null;
  return ['products', 'articles'].includes(collection) && doc.slug ? `/${collection}/${doc.slug}` : null;
};

// Payload's previousDoc/originalDoc can be the latest private draft. Capture the
// actual base row before the write, within the same transaction. Local API reads
// replace req.context, so use the stable request object as the WeakMap key.
const publishedPaths = new WeakMap<PayloadRequest, Map<string, string | null>>();
export const capturePublishedPath: CollectionBeforeChangeHook = async ({ data, originalDoc, operation, collection, req }) => {
  if (req.context.skipContentHooks || operation !== 'update' || !['categories', 'pages', 'products', 'articles'].includes(collection.slug)) return data;
  const current = await req.payload.findByID({ collection: collection.slug as 'categories' | 'pages' | 'products' | 'articles', id: originalDoc.id, depth: 0, draft: false, overrideAccess: true, req });
  let paths = publishedPaths.get(req);
  if (!paths) { paths = new Map(); publishedPaths.set(req, paths); }
  paths.set(`${collection.slug}:${originalDoc.id}`, publicPath(collection.slug, current));
  return data;
};

const baseSnapshotWrites = new WeakSet<PayloadRequest>();

export const validateCategoryPath: CollectionBeforeValidateHook = async ({ data, originalDoc, req }) => {
  if (!data) return data;
  const slug = data.slug ?? originalDoc?.slug;
  if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug || '')) throw new Error('Используйте адрес из латинских букв, цифр и дефисов.');
  const parent = data.parent === undefined ? originalDoc?.parent : data.parent;
  const parentId = typeof parent === 'object' && parent ? parent.id : parent;
  let prefix = '';
  if (parentId) {
    const seen = new Set<string>(originalDoc ? [String(originalDoc.id)] : []);
    let current: string | number | null = parentId;
    while (current) {
      if (seen.has(String(current))) throw new Error('Категория не может входить в собственную иерархию.');
      seen.add(String(current));
      const item = await req.payload.findByID({ collection: 'categories', id: current, depth: 0, draft: data._status === 'draft' && !baseSnapshotWrites.has(req), req, overrideAccess: false, user: req.user });
      if (!prefix) prefix = item.path || item.slug;
      current = typeof item.parent === 'object' ? item.parent?.id ?? null : item.parent ?? null;
    }
  }
  data.path = [prefix, slug].filter(Boolean).join('/');
  return data;
};

async function rememberRedirect(req: PayloadRequest, from: string, to: string) {
  if (from === to) return;
  // A path reclaimed by a published document must stop being a redirect source.
  // Collapse existing historical aliases onto the newest URL as well.
  await req.payload.delete({ collection: 'redirects', where: { from: { equals: to } }, req, overrideAccess: true });
  const aliases = await req.payload.find({ collection: 'redirects', where: { to: { equals: from } }, pagination: false, depth: 0, req, overrideAccess: true });
  for (const alias of aliases.docs) {
    if (alias.from !== to) await req.payload.update({ collection: 'redirects', id: alias.id, data: { to }, req, overrideAccess: true });
  }
  const existing = await req.payload.find({ collection: 'redirects', where: { from: { equals: from } }, limit: 1, depth: 0, req, overrideAccess: true });
  if (existing.docs[0]) await req.payload.update({ collection: 'redirects', id: existing.docs[0].id, data: { to }, req, overrideAccess: true });
  else await req.payload.create({ collection: 'redirects', data: { from, to }, req, overrideAccess: true });
}

// Supplying only a new path would merge unpublished fields from the latest
// version into the base row. Include every category field (including nulls),
// then restore the pending draft after changing the public snapshot.
function categorySnapshot(doc: Category) {
  const relation = (value: number | { id: number } | null | undefined) => typeof value === 'object' ? value?.id ?? null : value ?? null;
  return {
    title: doc.title, slug: doc.slug, description: doc.description ?? null,
    parent: relation(doc.parent), path: doc.path, sortOrder: doc.sortOrder ?? null,
    art: doc.art, image: relation(doc.image), imagePath: doc.imagePath ?? null,
    tone: doc.tone ?? null, _status: doc._status,
  };
}

async function refreshDescendantPaths(req: PayloadRequest, parent: number, seen = new Set<number>()) {
  if (seen.has(parent)) throw new Error('Категория не может входить в собственную иерархию.');
  seen.add(parent);
  const children = await req.payload.find({ collection: 'categories', where: { parent: { equals: parent } }, draft: false, pagination: false, depth: 0, overrideAccess: true, req });
  for (const child of children.docs) {
    const pending = await req.payload.findByID({ collection: 'categories', id: child.id, draft: true, depth: 0, overrideAccess: true, req });
    const childReq = { ...req, context: { ...req.context, skipContentHooks: true } } as PayloadRequest;
    baseSnapshotWrites.add(childReq);
    const updated = await req.payload.update({ collection: 'categories', id: child.id, data: categorySnapshot(child), draft: false, depth: 0, overrideAccess: true, req: childReq });
    baseSnapshotWrites.delete(childReq);
    const before = publicPath('categories', child);
    const after = publicPath('categories', updated);
    if (before && after && before !== after) await rememberRedirect(req, before, after);
    if (pending._status === 'draft') {
      await req.payload.update({ collection: 'categories', id: child.id, data: { ...categorySnapshot(pending), _status: 'draft' }, draft: true, depth: 0, overrideAccess: true, req: childReq });
    }
    await refreshDescendantPaths(req, child.id, seen);
  }
}

export const contentChanged: CollectionAfterChangeHook = async ({ doc, collection, req }) => {
  if (req.context.skipContentHooks) return doc;
  const key = `${collection.slug}:${doc.id}`;
  const paths = publishedPaths.get(req);
  const oldPath = paths?.get(key);
  paths?.delete(key);
  const newPath = publicPath(collection.slug, doc);
  if (newPath) {
    // Also remove stale redirects when a deleted/unpublished URL is reused.
    await req.payload.delete({ collection: 'redirects', where: { from: { equals: newPath } }, req, overrideAccess: true });
    if (oldPath && oldPath !== newPath) await rememberRedirect(req, oldPath, newPath);
    if (collection.slug === 'categories' && oldPath !== newPath) await refreshDescendantPaths(req, doc.id);
  }
  // Public adapters are request-scoped, so publication/unpublication is visible
  // immediately. These hooks also invalidate routes if a deployment caches them.
  try {
    const { revalidatePath } = await import('next/cache');
    revalidatePath('/', 'layout');
    revalidatePath('/sitemap.xml');
  } catch { /* CLI migrations have no Next request/store. */ }
  return doc;
};
export const contentDeleted: CollectionAfterDeleteHook = async () => {
  try { const { revalidatePath } = await import('next/cache'); revalidatePath('/', 'layout'); } catch { /* CLI */ }
};
