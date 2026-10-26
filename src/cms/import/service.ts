import { createHash, randomUUID } from 'node:crypto'
import {
  CatalogImportError, IMPORT_FIELDS, type CatalogImportRepository, type ExistingImportProduct,
  type ImportApplyResult, type ImportBatch, type ImportField, type ImportIssue, type ImportPreviewRow,
  type ImportProductData, type ImportReference, type ParsedCatalogImport, type RecordID,
} from './types'

function canonical(value: unknown): string {
  if (value === undefined) return 'null'
  if (Array.isArray(value)) return `[${value.map(canonical).join(',')}]`
  if (value !== null && typeof value === 'object') {
    return `{${Object.entries(value).filter(([, value]) => value !== undefined).sort(([a], [b]) => a.localeCompare(b, 'en')).map(([key, value]) => `${JSON.stringify(key)}:${canonical(value)}`).join(',')}}`
  }
  return JSON.stringify(value)
}

const hash = (value: unknown) => createHash('sha256').update(canonical(value)).digest('hex')
const equals = (left: unknown, right: unknown) => canonical(left) === canonical(right)
const unique = (values: string[]) => [...new Set(values)].sort()
const sameID = (left: RecordID | undefined, right: RecordID | undefined) => left !== undefined && right !== undefined && String(left) === String(right)
function lookup(rows: Array<{ sku: string; externalId?: string; slug: string }>) {
  return { skus: unique(rows.map(row => row.sku)), externalIds: unique(rows.flatMap(row => row.externalId ? [row.externalId] : [])), slugs: unique(rows.map(row => row.slug)) }
}

function matchingProduct(row: { sku: string; externalId?: string }, products: ExistingImportProduct[]): ExistingImportProduct | undefined {
  const matches = products.filter(product => product.sku === row.sku || (row.externalId && product.externalId === row.externalId))
  if (matches.length > 1 || (matches[0] && (matches[0].sku !== row.sku || (row.externalId && matches[0].externalId !== row.externalId)))) {
    throw new CatalogImportError('identity-conflict', `Артикул ${row.sku} и внешний ID относятся к разным идентификаторам товара.`)
  }
  return matches[0]
}

function reference(key: string, items: ImportReference[], field: string): ImportReference {
  const matches = items.filter(item => item.key === key)
  if (matches.length !== 1) throw new CatalogImportError('invalid-reference', `Не найдена однозначная связь ${field}: ${key}.`)
  return matches[0]
}

function referencesHash(refs: { categories: ImportReference[]; series: ImportReference[] }): string {
  const sort = (items: ImportReference[]) => [...items].sort((left, right) => left.key.localeCompare(right.key, 'en'))
  return hash({ categories: sort(refs.categories), series: sort(refs.series) })
}

function previewHash(batch: Pick<ImportBatch, 'sourceHash' | 'rows' | 'issues' | 'referenceHash'>): string {
  return hash({ sourceHash: batch.sourceHash, rows: batch.rows, issues: batch.issues, referenceHash: batch.referenceHash })
}

/** An adapter must authenticate/authorize the actor before calling this server-only function. */
export async function createImportPreview(
  repository: CatalogImportRepository,
  parsed: ParsedCatalogImport,
  options: { actorId: RecordID; now?: Date; id?: string },
): Promise<ImportBatch> {
  return repository.transaction(async transaction => {
    await transaction.lockCatalog()
    const referenceKeys = { categories: unique(parsed.rows.map(row => row.category)), series: unique(parsed.rows.map(row => row.series)) }
    const refs = await transaction.resolveReferences(referenceKeys)
    const products = await transaction.findProducts(lookup(parsed.rows))
    const issues: ImportIssue[] = [...parsed.issues]
    const rows: ImportPreviewRow[] = []
    for (const row of parsed.rows) {
      try {
        const category = reference(row.category, refs.categories, 'category')
        const series = reference(row.series, refs.series, 'series')
        if (!sameID(series.category, category.id)) throw new CatalogImportError('series-category', `Серия ${row.series} не принадлежит категории ${row.category}.`)
        const existing = matchingProduct(row, products)
        const slugOwner = products.find(product => product.slug === row.slug && !sameID(product.id, existing?.id))
        if (slugOwner) throw new CatalogImportError('slug-conflict', `Slug ${row.slug} уже занят другим товаром.`)
        const data: ImportProductData = {
          sku: row.sku, ...(row.externalId ? { externalId: row.externalId } : {}), slug: row.slug,
          title: row.title, description: row.description, category: category.id, series: series.id,
          attributes: structuredClone(row.attributes),
        }
        const differences = existing ? IMPORT_FIELDS.filter(field => !equals(existing[field], data[field])).map(field => ({ field, before: structuredClone(existing[field]), after: structuredClone(data[field]) })) : []
        rows.push({
          row: row.row, action: !existing ? 'create' : differences.length ? 'review' : 'unchanged', data, differences,
          ...(existing ? { productId: existing.id, expectedUpdatedAt: existing.updatedAt } : {}),
        })
      } catch (error) {
        if (!(error instanceof CatalogImportError)) throw error
        issues.push({ code: error.code, message: error.message, row: row.row })
      }
    }
    const batch: ImportBatch = {
      id: options.id || randomUUID(), actorId: options.actorId, status: 'preview', createdAt: (options.now || new Date()).toISOString(),
      sourceName: parsed.sourceName, sourceHash: parsed.sourceHash, previewHash: '', rows, issues,
      referenceKeys, referenceHash: referencesHash(refs),
    }
    batch.previewHash = previewHash(batch)
    await transaction.saveBatch(batch)
    return batch
  })
}

export interface ApplyImportRequest {
  batchId: string
  actorId: RecordID
  /** Row numbers -> fields explicitly confirmed by the user in the saved preview. */
  overwrites?: Record<string, ImportField[]>
}

/** Applies only the immutable server-side snapshot, never product data supplied by the client. */
export async function applyImportPreview(repository: CatalogImportRepository, request: ApplyImportRequest): Promise<ImportApplyResult> {
  return repository.transaction(async transaction => {
    await transaction.lockCatalog()
    const batch = await transaction.getBatchForUpdate(request.batchId)
    if (!batch || !sameID(batch.actorId, request.actorId)) throw new CatalogImportError('batch-not-found', 'Предпросмотр не найден.')
    if (batch.status === 'applied' && batch.result) return batch.result
    if (batch.status !== 'preview' || batch.issues.length || !batch.rows.length || previewHash(batch) !== batch.previewHash) throw new CatalogImportError('invalid-preview', 'Предпросмотр содержит ошибки. Подготовьте новый импорт.')
    const overwrites = request.overwrites || {}
    for (const [rowKey, fields] of Object.entries(overwrites)) {
      const row = batch.rows.find(item => String(item.row) === rowKey)
      if (!row || row.action !== 'review' || !Array.isArray(fields) || new Set(fields).size !== fields.length || fields.some(field => !row.differences.some(difference => difference.field === field))) throw new CatalogImportError('invalid-overwrite', 'Можно подтверждать только изменения из сохранённого предпросмотра.')
      const relationshipChanges = row.differences.filter(difference => difference.field === 'category' || difference.field === 'series').map(difference => difference.field)
      if (fields.some(field => relationshipChanges.includes(field)) && relationshipChanges.some(field => !fields.includes(field))) throw new CatalogImportError('invalid-overwrite', 'Изменение категории и связанной серии нужно подтвердить вместе.')
    }
    const refs = await transaction.resolveReferences(batch.referenceKeys)
    if (referencesHash(refs) !== batch.referenceHash) throw new CatalogImportError('stale-preview', 'Структура каталога изменилась. Создайте новый предпросмотр.')
    const products = await transaction.findProducts(lookup(batch.rows.map(row => row.data)))
    // Check the whole batch before its first write. The repository also performs CAS on every update.
    for (const row of batch.rows) {
      const existing = matchingProduct(row.data, products)
      if (row.action === 'create' ? Boolean(existing) : !existing || !sameID(row.productId, existing.id) || row.expectedUpdatedAt !== existing.updatedAt) throw new CatalogImportError('stale-preview', `Товар ${row.data.sku} изменился. Создайте новый предпросмотр.`)
      if (products.some(product => product.slug === row.data.slug && !sameID(product.id, row.productId))) throw new CatalogImportError('stale-preview', `Slug ${row.data.slug} теперь занят. Создайте новый предпросмотр.`)
    }
    const result: ImportApplyResult = { batchId: batch.id, created: 0, updated: 0, unchanged: 0, preserved: 0 }
    for (const row of batch.rows) {
      if (row.action === 'create') {
        await transaction.createDraftProduct(structuredClone(row.data))
        result.created++
      } else if (row.action === 'unchanged') result.unchanged++
      else {
        const selected = overwrites[String(row.row)] || []
        if (selected.length < row.differences.length) result.preserved++
        if (!selected.length) continue
        const patch = Object.fromEntries(row.differences.filter(difference => selected.includes(difference.field)).map(difference => [difference.field, structuredClone(difference.after)])) as Partial<Pick<ImportProductData, ImportField>>
        if (row.productId === undefined || !row.expectedUpdatedAt || !await transaction.updateDraftProduct(row.productId, row.expectedUpdatedAt, patch)) throw new CatalogImportError('stale-preview', `Товар ${row.data.sku} изменён во время импорта. Изменения отменены.`)
        result.updated++
      }
    }
    await transaction.markBatchApplied(batch.id, result)
    return result
  })
}
