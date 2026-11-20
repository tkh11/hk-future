export interface ImportProductRow {
  /** Physical CSV / worksheet row, including the header. */
  row: number
  sku: string
  externalId?: string
  slug: string
  title: string
  description: string
  category: string
}

export interface ImportIssue {
  code: string
  message: string
  row?: number
  field?: string
}

export interface ParsedCatalogImport {
  sourceName: string
  sourceHash: string
  rows: ImportProductRow[]
  issues: ImportIssue[]
}

export type RecordID = string | number
export const IMPORT_FIELDS = ['slug', 'title', 'description', 'category'] as const
export type ImportField = (typeof IMPORT_FIELDS)[number]

/** Only these fields can be written by this importer; media and publication are excluded. */
export interface ImportProductData {
  sku: string
  externalId?: string
  slug: string
  title: string
  description: string
  category: RecordID
}

export interface ExistingImportProduct extends ImportProductData {
  id: RecordID
  /** Revision of the latest draft, not just the published document. */
  updatedAt: string
}

export interface ImportReference {
  key: string
  id: RecordID
}

export interface ImportDifference {
  field: ImportField
  before: ImportProductData[ImportField]
  after: ImportProductData[ImportField]
}

export interface ImportPreviewRow {
  row: number
  action: 'create' | 'review' | 'unchanged'
  data: ImportProductData
  productId?: RecordID
  expectedUpdatedAt?: string
  differences: ImportDifference[]
}

export interface ImportApplyResult {
  batchId: string
  created: number
  updated: number
  unchanged: number
  preserved: number
}

export interface ImportBatch {
  id: string
  actorId: RecordID
  status: 'preview' | 'applied'
  createdAt: string
  sourceName: string
  sourceHash: string
  previewHash: string
  rows: ImportPreviewRow[]
  issues: ImportIssue[]
  /** Used to detect taxonomy changes between preview and apply. */
  referenceKeys: { categories: string[] }
  referenceHash: string
  result?: ImportApplyResult
}

export interface ProductLookup {
  skus: string[]
  externalIds: string[]
  slugs: string[]
}

/** Implementations must use a real DB transaction: any thrown error rolls back every write. */
export interface ImportTransaction {
  /** Serializes catalog imports. Normal editor updates also need revision / row locking below. */
  lockCatalog(): Promise<void>
  findProducts(keys: ProductLookup): Promise<ExistingImportProduct[]>
  resolveReferences(keys: ImportBatch['referenceKeys']): Promise<{ categories: ImportReference[] }>
  saveBatch(batch: ImportBatch): Promise<void>
  /** Lock the persisted batch until commit. Clients must never be allowed to edit its snapshot. */
  getBatchForUpdate(id: string): Promise<ImportBatch | null>
  createDraftProduct(data: ImportProductData): Promise<RecordID>
  /** Adds a variant to an existing family created in this batch or already in the catalog. */
  createDraftVariant(productId: RecordID, data: ImportProductData): Promise<RecordID>
  /** Atomic compare-and-set against the latest draft revision; false means concurrent edit. */
  updateDraftProduct(id: RecordID, expectedUpdatedAt: string, patch: Partial<Pick<ImportProductData, ImportField>>): Promise<boolean>
  markBatchApplied(id: string, result: ImportApplyResult): Promise<void>
}

export interface CatalogImportRepository {
  transaction<T>(run: (transaction: ImportTransaction) => Promise<T>): Promise<T>
}

export class CatalogImportError extends Error {
  constructor(public readonly code: string, message: string) {
    super(message)
    this.name = 'CatalogImportError'
  }
}
