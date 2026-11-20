import { createHash, randomUUID } from 'node:crypto'
import { createLocalReq, type Payload, type PayloadRequest, type TypedUser, type Where } from 'payload'
import { sql, type PostgresAdapter } from '@payloadcms/db-postgres'
import { canEdit } from '../access'
import type { Product } from '../payload-types'
import {
  CatalogImportError, type CatalogImportRepository, type ExistingImportProduct,
  type ImportBatch, type ImportProductData, type ImportTransaction, type RecordID,
} from './types'

function stable(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stable).join(',')}]`
  if (value !== null && typeof value === 'object') return `{${Object.entries(value).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, item]) => `${JSON.stringify(key)}:${stable(item)}`).join(',')}}`
  return JSON.stringify(value) ?? 'null'
}

/** Include the complete latest draft, including media, to detect edits within one timestamp tick. */
export function importProductRevision(document: Product): string {
  return createHash('sha256').update(stable(document)).digest('hex')
}

function relationID(value: unknown): RecordID {
  if (typeof value === 'string' || typeof value === 'number') return value
  if (value && typeof value === 'object' && 'id' in value && (typeof value.id === 'string' || typeof value.id === 'number')) return value.id
  return ''
}

function normalizeProduct(document: Product, sku = document.sku ?? ''): ExistingImportProduct {
  return {
    id: document.id, updatedAt: importProductRevision(document), sku, slug: document.slug,
    title: document.title, description: document.description || '', category: relationID(document.category),
    ...(document.externalId ? { externalId: document.externalId } : {}),
  }
}

function numericID(value: RecordID): number {
  const id = Number(value)
  if (!Number.isSafeInteger(id) || id < 1) throw new CatalogImportError('invalid-reference', 'Некорректный идентификатор связи.')
  return id
}

function writableProduct(data: Partial<ImportProductData>) {
  return {
    ...data,
    ...(data.category === undefined ? {} : { category: numericID(data.category) }),
    _status: 'draft' as const,
  }
}

/** PostgreSQL implementation pinned to Payload 3's documented transaction request/session mechanism. */
export function createPayloadImportRepository(payload: Payload, user: TypedUser): CatalogImportRepository {
  if (!canEdit(user)) throw new CatalogImportError('forbidden', 'Импорт доступен только редактору каталога.')
  const adapter = payload.db as unknown as PostgresAdapter
  if (adapter.name !== 'postgres' || !adapter.sessions || !adapter.drizzle) throw new Error('Catalog import requires PostgreSQL transactions.')
  return {
    async transaction<T>(run: (transaction: ImportTransaction) => Promise<T>): Promise<T> {
      const transactionID = randomUUID()
      const deadline = Date.now() + 30_000
      let aborted = false
      // Own the Drizzle transaction directly so commit failures propagate instead of being hidden.
      return adapter.drizzle.transaction(async database => {
        adapter.sessions[transactionID] = {
          db: database,
          resolve: async () => { throw new Error('Unexpected nested import transaction commit.') },
          reject: async () => { aborted = true },
        }
        const req: PayloadRequest = await createLocalReq({
          user, context: { catalogImport: true, saveDraft: true }, req: { transactionID, query: { draft: 'true' } },
        }, payload)
        const check = () => {
          if (aborted || adapter.sessions[transactionID]?.db !== database || req.transactionID !== transactionID) throw new CatalogImportError('transaction-aborted', 'Импорт отменён из-за ошибки транзакции.')
          if (Date.now() > deadline) throw new CatalogImportError('import-timeout', 'Импорт занял слишком много времени. Разделите файл на меньшие части.')
        }
        const options = { req, user, overrideAccess: false as const, depth: 0 }
        const table = (name: string) => {
          const actual = adapter.tableNameMap.get(name) || name
          if (!adapter.tables[actual]) throw new Error(`Missing import database table: ${name}`)
          return adapter.tables[actual]
        }
        const batchDocument = async (id: string) => {
          check()
          const found = await payload.find({ ...options, collection: 'import-batches', where: { batchId: { equals: id } }, limit: 1 })
          return found.docs[0] || null
        }
        const repository: ImportTransaction = {
          async lockCatalog() {
            check()
            await database.execute(sql`SET LOCAL lock_timeout = '5s'`)
            await database.execute(sql`SET LOCAL statement_timeout = '5s'`)
            await database.execute(sql`SET LOCAL idle_in_transaction_session_timeout = '10s'`)
            await database.execute(sql`SELECT pg_advisory_xact_lock(812712, 1)`)
            // Draft writes INSERT into the versions table, so locking only products rows is insufficient.
            // These locks permit readers and exclude concurrent editor/REST draft writes until commit.
            const names = ['categories', '_categories_v', 'products', '_products_v', 'product_variants', '_product_variants_v', 'import_batches']
            await database.execute(sql`LOCK TABLE ${sql.join(names.map(table), sql`, `)} IN SHARE ROW EXCLUSIVE MODE`)
          },
          async findProducts(keys) {
            check()
            const clauses: Where[] = [
              ...(keys.skus.length ? [{ sku: { in: keys.skus } }] : []),
              ...(keys.externalIds.length ? [{ externalId: { in: keys.externalIds } }] : []),
              ...(keys.slugs.length ? [{ slug: { in: keys.slugs } }] : []),
            ]
            const variants = keys.skus.length
              ? await payload.find({ ...options, collection: 'product-variants', draft: true, where: { sku: { in: keys.skus } }, pagination: false, limit: 3000, select: { sku: true, product: true } })
              : { docs: [] as { sku?: string | null; product?: number | { id: number } | null }[] }
            const parentIds = [...new Set(variants.docs.flatMap(item => {
              const id = relationID(item.product)
              return id === '' ? [] : [id]
            }))]
            if (parentIds.length) clauses.push({ id: { in: parentIds } })
            if (!clauses.length) return []
            const result = await payload.find({ ...options, collection: 'products', draft: true, where: { or: clauses }, pagination: false, limit: 3000 })
            const skuByParent = new Map(variants.docs.flatMap(item => {
              const id = relationID(item.product)
              return id === '' || !item.sku ? [] : [[id, item.sku]] as [RecordID, string][]
            }))
            return result.docs.map(document => normalizeProduct(document, skuByParent.get(document.id) || document.sku || ''))
          },
          async resolveReferences(keys) {
            check()
            const categories = keys.categories.length ? await payload.find({ ...options, collection: 'categories', draft: true, pagination: false, limit: 2000, where: { or: [{ path: { in: keys.categories } }, { slug: { in: keys.categories } }] } }) : { docs: [] }
            return {
              categories: keys.categories.flatMap(key => categories.docs.filter(item => item.path === key || item.slug === key).map(item => ({ key, id: item.id }))),
            }
          },
          async saveBatch(batch) {
            check()
            await payload.create({ ...options, collection: 'import-batches', data: {
              batchId: batch.id, filename: batch.sourceName, actorId: String(user.id), status: 'preview', data: JSON.parse(JSON.stringify(batch)),
            } })
          },
          async getBatchForUpdate(id) {
            const document = await batchDocument(id)
            if (!document || String(document.actorId) !== String(user.id)) return null
            await database.execute(sql`SELECT id FROM ${table('import_batches')} WHERE id = ${document.id} FOR UPDATE`)
            if (!document.data || typeof document.data !== 'object' || Array.isArray(document.data) || !('previewHash' in document.data)) throw new CatalogImportError('invalid-preview', 'Предпросмотр повреждён.')
            return document.data as unknown as ImportBatch
          },
          async createDraftProduct(data) {
            check()
            const { sku, ...fields } = data
            const product = await payload.create({
              ...options, collection: 'products', draft: true,
              data: { ...writableProduct(fields as ImportProductData), productKind: 'family' } as Product,
            })
            await payload.create({
              ...options, collection: 'product-variants', draft: true,
              data: { title: data.title, sku, product: product.id, reviewState: 'ready', _status: 'draft' },
            })
            return product.id
          },
          async createDraftVariant(productId, data) {
            check()
            const variant = await payload.create({
              ...options, collection: 'product-variants', draft: true,
              data: { title: data.title, sku: data.sku, product: numericID(productId), reviewState: 'ready', _status: 'draft' },
            })
            return variant.id
          },
          async updateDraftProduct(id, revision, patch) {
            check()
            const current = await payload.findByID({ ...options, collection: 'products', id: numericID(id), draft: true })
            if (importProductRevision(current) !== revision) return false
            // Recheck and write occur under the same transaction/table lock, including version inserts.
            await payload.update({ ...options, collection: 'products', id: numericID(id), draft: true, data: writableProduct(patch) as Partial<Product> })
            return true
          },
          async markBatchApplied(id, result) {
            const document = await batchDocument(id)
            if (!document || typeof document.data !== 'object' || !document.data || Array.isArray(document.data)) throw new CatalogImportError('batch-not-found', 'Предпросмотр не найден.')
            await payload.update({ ...options, collection: 'import-batches', id: document.id, data: { status: 'applied', data: { ...document.data, status: 'applied', result } } })
          },
        }
        try {
          const result = await run(repository)
          check()
          return result
        } finally {
          delete adapter.sessions[transactionID]
        }
      })
    },
  }
}
