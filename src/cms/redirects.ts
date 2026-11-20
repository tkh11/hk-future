import type { Payload } from 'payload';

const safePath = (value: unknown): value is string => typeof value === 'string' && /^\/(?:[a-z0-9-]+(?:\/[a-z0-9-]+)*)?$/.test(value);

/** Resolve redirects as an anonymous reader, regardless of any preview session. */
export async function resolvePublishedRedirect(payload: Payload, from: string): Promise<string | null> {
  if (!safePath(from)) return null;
  const seen = new Set([from]);
  let path = from;
  for (let hop = 0; hop < 20; hop += 1) {
    const result = await payload.find({ collection: 'redirects', where: { from: { equals: path } }, limit: 1, depth: 0, overrideAccess: false, user: undefined });
    const target = result.docs[0]?.to;
    if (!safePath(target) || seen.has(target)) return null;
    seen.add(target);
    if (await isPublishedPath(payload, target)) return target;
    path = target;
  }
  return null;
}

async function isPublishedPath(payload: Payload, path: string): Promise<boolean> {
  const categoryMatch = /^\/catalog\/(.+)$/.exec(path);
  const productMatch = /^\/products\/([^/]+)$/.exec(path);
  const articleMatch = /^\/articles\/([^/]+)$/.exec(path);
  const published = { _status: { equals: 'published' } } as const;
  if (categoryMatch) {
    const result = await payload.find({ collection: 'categories', where: { and: [published, { path: { equals: categoryMatch[1] } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
    return !!result.docs[0] && visibleCategory(payload, result.docs[0]);
  }
  if (productMatch) {
    const result = await payload.find({ collection: 'products', where: { and: [published, { slug: { equals: productMatch[1] } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
    const category = result.docs[0]?.category;
    const id = typeof category === 'object' ? category?.id : category;
    if (id == null) return false;
    const categories = await payload.find({ collection: 'categories', where: { and: [published, { id: { equals: id } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
    return !!categories.docs[0] && visibleCategory(payload, categories.docs[0]);
  }
  if (articleMatch) {
    const result = await payload.find({ collection: 'articles', where: { and: [published, { slug: { equals: articleMatch[1] } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
    return result.docs.length > 0;
  }
  // System routes are not editable page paths.
  if (/^\/(?:admin|api|catalog|products|articles)(?:\/|$)/.test(path)) return false;
  const result = await payload.find({ collection: 'pages', where: { and: [published, { path: { equals: path } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
  return result.docs.length > 0;
}

async function visibleCategory(payload: Payload, initial: { id: number; slug: string; path?: string | null; parent?: number | { id: number } | null }): Promise<boolean> {
  let category = initial;
  const seen = new Set<number>();
  while (true) {
    if (seen.has(category.id)) return false;
    seen.add(category.id);
    const parentID = typeof category.parent === 'object' ? category.parent?.id : category.parent;
    if (parentID == null) return category.path === category.slug;
    const result = await payload.find({ collection: 'categories', where: { and: [{ id: { equals: parentID } }, { _status: { equals: 'published' } }] }, limit: 1, depth: 0, draft: false, overrideAccess: false, user: undefined });
    const parent = result.docs[0];
    if (!parent || category.path !== `${parent.path}/${category.slug}`) return false;
    category = parent;
  }
}
