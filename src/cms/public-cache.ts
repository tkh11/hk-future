import { createHash } from 'node:crypto';
import { unstable_cache } from 'next/cache';
import { sql } from '@payloadcms/db-postgres';
import { getCMS } from './client';

// Test runs and the office server share build directories but use different
// databases; their cached entries must never mix.
const database = createHash('sha256').update(process.env.DATABASE_URL ?? '').digest('hex').slice(0, 16);

// Every table the public loaders read. Publishing, unpublishing, edits and deletions
// change a row's updated_at or the row count, whichever process made the write
// (Studio, REST, import scripts), so a new version is visible on the next request.
const contentTables = ['products', 'product_variants', 'categories', 'media', 'catalog_documents', 'pages', 'articles', 'redirects'];
const versionQuery = sql.raw(`SELECT concat_ws('|', ${contentTables.map(table => `(SELECT concat(max(updated_at), ':', count(*)) FROM ${table})`).join(', ')}) AS version`);

async function contentVersion() {
  const payload = await getCMS();
  const db = payload.db as unknown as { drizzle: { execute: (query: typeof versionQuery) => Promise<{ rows: { version: string }[] }> } };
  const { rows } = await db.drizzle.execute(versionQuery);
  return createHash('sha256').update(rows[0]?.version ?? '').digest('hex').slice(0, 16);
}

/**
 * Published content that is the same for every anonymous visitor, cached across
 * requests until the content version changes. Never use it for preview (draft) data.
 */
export function publicCache<A extends unknown[], T>(name: string, load: (...args: A) => Promise<T>) {
  return async (...args: A): Promise<T> => unstable_cache(load, ['cms-public', name, database, await contentVersion()])(...args);
}
