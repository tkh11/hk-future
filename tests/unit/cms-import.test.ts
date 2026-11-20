// @vitest-environment node
import { describe, expect, it } from 'vitest'
import ExcelJS from 'exceljs'
import { deflateRawSync } from 'node:zlib'
import { applyImportPreview, createImportPreview, parseCatalogImport, type CatalogImportRepository, type ExistingImportProduct, type ImportBatch, type ImportTransaction } from '../../src/cms/import'
import { catalogImportCSVTemplate, catalogImportXLSXTemplate } from '../../src/cms/import/templates'
import { inspectXlsxArchive } from '../../src/cms/import/xlsx-guard'

const headers = 'sku,externalId,slug,title,description,category'
const row = '0001,external-1,pipe-1,Труба 25,Описание,pipelines'
const parse = (csv = `${headers}\n${row}`) => parseCatalogImport({ name: 'products.csv', bytes: Buffer.from(csv) })

/** ZIP fixture builder permits lying size headers to exercise pre-decompression defenses. */
function zipFixture(name: string, content: Buffer, declaredSize = content.length): Buffer {
  const compressed = deflateRawSync(content)
  const encodedName = Buffer.from(name)
  const local = Buffer.alloc(30)
  local.writeUInt32LE(0x04034b50)
  local.writeUInt16LE(20, 4)
  local.writeUInt16LE(8, 8)
  local.writeUInt32LE(compressed.length, 18)
  local.writeUInt32LE(declaredSize, 22)
  local.writeUInt16LE(encodedName.length, 26)
  const central = Buffer.alloc(46)
  central.writeUInt32LE(0x02014b50)
  central.writeUInt16LE(20, 4)
  central.writeUInt16LE(20, 6)
  central.writeUInt16LE(8, 10)
  central.writeUInt32LE(compressed.length, 20)
  central.writeUInt32LE(declaredSize, 24)
  central.writeUInt16LE(encodedName.length, 28)
  const end = Buffer.alloc(22)
  end.writeUInt32LE(0x06054b50)
  end.writeUInt16LE(1, 8)
  end.writeUInt16LE(1, 10)
  end.writeUInt32LE(central.length + encodedName.length, 12)
  end.writeUInt32LE(local.length + encodedName.length + compressed.length, 16)
  return Buffer.concat([local, encodedName, compressed, central, encodedName, end])
}

class MemoryRepository implements CatalogImportRepository {
  products: ExistingImportProduct[] = []
  batches = new Map<string, ImportBatch>()
  categories = [{ key: 'pipelines', id: 'category-1' }, { key: 'pumps', id: 'category-2' }]
  failCAS = false
  nextID = 1
  revision = 1
  async transaction<T>(run: (transaction: ImportTransaction) => Promise<T>): Promise<T> {
    const snapshot = structuredClone({ products: this.products, batches: this.batches, nextID: this.nextID, revision: this.revision })
    try {
      return await run({
        lockCatalog: async () => {},
        findProducts: async keys => structuredClone(this.products.filter(item => keys.skus.includes(item.sku) || keys.slugs.includes(item.slug) || Boolean(item.externalId && keys.externalIds.includes(item.externalId)))),
        resolveReferences: async keys => ({ categories: structuredClone(this.categories.filter(item => keys.categories.includes(item.key))) }),
        saveBatch: async batch => { this.batches.set(batch.id, structuredClone(batch)) },
        getBatchForUpdate: async id => structuredClone(this.batches.get(id) || null),
        createDraftProduct: async data => {
          if (this.products.some(item => item.sku === data.sku || item.slug === data.slug || data.externalId && item.externalId === data.externalId)) throw new Error('unique constraint')
          const id = this.nextID++
          this.products.push({ ...structuredClone(data), id, updatedAt: `revision-${this.revision++}` })
          return id
        },
        createDraftVariant: async (productId, data) => {
          const family = this.products.find(item => item.id === productId)
          if (!family) throw new Error('missing family')
          if (this.products.some(item => item.sku === data.sku)) throw new Error('unique constraint')
          const id = this.nextID++
          this.products.push({ ...structuredClone(data), id, slug: family.slug, category: family.category, updatedAt: `revision-${this.revision++}` })
          return id
        },
        updateDraftProduct: async (id, revision, patch) => {
          const product = this.products.find(item => item.id === id && item.updatedAt === revision)
          if (!product || this.failCAS) return false
          Object.assign(product, structuredClone(patch), { updatedAt: `revision-${this.revision++}` })
          return true
        },
        markBatchApplied: async (id, result) => {
          const batch = this.batches.get(id)!
          batch.status = 'applied'
          batch.result = structuredClone(result)
        },
      })
    } catch (error) {
      Object.assign(this, snapshot)
      throw error
    }
  }
}

async function seeded() {
  const repository = new MemoryRepository()
  const preview = await createImportPreview(repository, await parse(), { actorId: 'editor' })
  await applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })
  return repository
}

describe('catalog CSV/XLSX parsing', () => {
  it('preserves text SKUs and multiline CSV', async () => {
    const parsed = await parse(`${headers}\r\n0001,external-1,pipe-1,"Труба, 25","Первая строка\nВторая строка",pipelines`)
    expect(parsed.issues).toEqual([])
    expect(parsed.rows[0].sku).toBe('0001')
    expect(parsed.rows[0].description).toContain('\n')
  })

  for (const name of ['pipes', 'pumps'] as const) {
    it(`parses both CSV and real XLSX ${name} templates`, async () => {
      const csv = await parseCatalogImport({ name: `${name}.csv`, bytes: Buffer.from(catalogImportCSVTemplate(name)) })
      const xlsx = await parseCatalogImport({ name: `${name}.xlsx`, bytes: await catalogImportXLSXTemplate(name) })
      expect(csv.issues).toEqual([])
      expect(xlsx.issues).toEqual([])
      expect(xlsx.rows).toEqual(csv.rows)
    })
  }

  it('rejects duplicate keys, unknown headers and malformed values in preview', async () => {
    const parsed = await parse(`${headers},series\n${row},x\n${row.replace('pipelines', 'bad//path')},y`)
    expect(parsed.issues.map(issue => issue.code)).toEqual(expect.arrayContaining(['invalid-header', 'invalid-value', 'duplicate-identity']))
  })

  it('uses the same product slug rules as the CMS schema', async () => {
    for (const slug of ['under_score', 'double--dash', 'trailing-', 'UPPER', 'a'.repeat(151)]) {
      const parsed = await parse(`${headers}\n${row.replace('pipe-1', slug)}`)
      expect(parsed.issues).toEqual(expect.arrayContaining([expect.objectContaining({ field: 'slug', code: 'invalid-value' })]))
    }
  })

  it('rejects invalid encoding, CSV quoting, oversized files and unsupported files', async () => {
    await expect(parseCatalogImport({ name: 'bad.csv', bytes: Buffer.from([0xff]) })).rejects.toMatchObject({ code: 'csv-encoding' })
    await expect(parse(`${headers}\n"unclosed`)).rejects.toMatchObject({ code: 'invalid-csv' })
    await expect(parseCatalogImport({ name: 'large.csv', bytes: Buffer.alloc(5 * 1024 * 1024 + 1) })).rejects.toMatchObject({ code: 'file-limit' })
    await expect(parseCatalogImport({ name: 'bad.xlsm', bytes: Buffer.from('x') })).rejects.toMatchObject({ code: 'file-type' })
  })

  it('rejects huge row counts before catalog access', async () => {
    await expect(parse(`${headers}\n${Array.from({ length: 1001 }, () => row).join('\n')}`)).rejects.toMatchObject({ code: 'row-limit' })
  })

  it('rejects ZIP path traversal and a decompression bomb with dishonest size headers', () => {
    expect(() => inspectXlsxArchive(zipFixture('../outside.xml', Buffer.from('<x/>')))).toThrow('Недопустимое имя')
    // A forged tiny expanded-size header must not bypass maxOutputLength.
    expect(() => inspectXlsxArchive(zipFixture('xl/worksheets/sheet1.xml', Buffer.alloc(21 * 1024 * 1024, 32), 128))).toThrow('Ошибка распаковки')
    expect(() => inspectXlsxArchive(zipFixture('xl/worksheets/sheet1.xml', Buffer.from('<worksheet><row r="999999999"/></worksheet>')))).toThrow('число строк')
  })

  it('reads semicolon-separated CSV saved by Excel', async () => {
    const parsed = await parse(`${headers}\n${row}`.replaceAll(',', ';'))
    expect(parsed.issues).toEqual([])
    expect(parsed.rows[0].category).toBe('pipelines')
  })

  it('rejects XLSX formulas, external links, multiple sheets and numeric identifiers', async () => {
    const workbook = new ExcelJS.Workbook()
    const sheet = workbook.addWorksheet('Products')
    sheet.addRow(headers.split(','))
    sheet.addRow(row.split(','))
    sheet.getCell('D2').value = { formula: '1+1', result: 2 }
    await expect(parseCatalogImport({ name: 'formula.xlsx', bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) })).rejects.toMatchObject({ code: 'unsafe-workbook' })
    sheet.getCell('D2').value = { text: 'Link', hyperlink: 'https://example.com' }
    await expect(parseCatalogImport({ name: 'link.xlsx', bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) })).rejects.toMatchObject({ code: 'unsafe-workbook' })
    sheet.getCell('D2').value = 'Title'
    sheet.getCell('A2').value = 123
    await expect(parseCatalogImport({ name: 'numeric.xlsx', bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) })).rejects.toMatchObject({ code: 'identifier-type' })
    sheet.getCell('A2').value = '0001'
    workbook.addWorksheet('Unexpected')
    await expect(parseCatalogImport({ name: 'many.xlsx', bytes: new Uint8Array(await workbook.xlsx.writeBuffer()) })).rejects.toMatchObject({ code: 'unsafe-workbook' })
  })
})

describe('persisted import preview and atomic apply', () => {
  it('persists deterministic previews without creating products', async () => {
    const repository = new MemoryRepository()
    const parsed = await parse()
    const first = await createImportPreview(repository, parsed, { actorId: 'editor' })
    const second = await createImportPreview(repository, parsed, { actorId: 'editor' })
    expect(first.id).not.toBe(second.id)
    expect(first.previewHash).toBe(second.previewHash)
    expect(repository.products).toHaveLength(0)
    expect(repository.batches.size).toBe(2)
  })

  it('creates once and repeated file/batch applies do not duplicate products', async () => {
    const repository = new MemoryRepository()
    const first = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    const result = await applyImportPreview(repository, { batchId: first.id, actorId: 'editor' })
    expect(result.created).toBe(1)
    expect(await applyImportPreview(repository, { batchId: first.id, actorId: 'editor' })).toEqual(result)
    const repeated = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    expect((await applyImportPreview(repository, { batchId: repeated.id, actorId: 'editor' })).unchanged).toBe(1)
    expect(repository.products).toHaveLength(1)
  })

  it('preserves manual edits by default and applies only explicitly selected fields', async () => {
    const repository = await seeded()
    repository.products[0].title = 'Ручное название'
    repository.products[0].description = 'Ручное описание'
    const first = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    expect((await applyImportPreview(repository, { batchId: first.id, actorId: 'editor' })).preserved).toBe(1)
    expect(repository.products[0].title).toBe('Ручное название')
    const second = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    await applyImportPreview(repository, { batchId: second.id, actorId: 'editor', overwrites: { '2': ['title'] } })
    expect(repository.products[0].title).toBe('Труба 25')
    expect(repository.products[0].description).toBe('Ручное описание')
  })

  it('refuses stale content revisions and leaves all records unchanged', async () => {
    const repository = await seeded()
    const preview = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    repository.products[0].updatedAt = 'concurrent-revision'
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })).rejects.toMatchObject({ code: 'stale-preview' })
    expect(repository.batches.get(preview.id)?.status).toBe('preview')
  })

  it('rolls back earlier creations if atomic compare-and-set fails later in the batch', async () => {
    const repository = await seeded()
    repository.products[0].title = 'Manual'
    const preview = await createImportPreview(repository, await parse(`${headers}\n0002,external-2,pipe-2,Second,Description,pipelines\n${row}`), { actorId: 'editor' })
    repository.failCAS = true
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor', overwrites: { '3': ['title'] } })).rejects.toMatchObject({ code: 'stale-preview' })
    expect(repository.products).toHaveLength(1)
    expect(repository.products[0].title).toBe('Manual')
  })

  it('never deletes records absent from the file', async () => {
    const repository = await seeded()
    const preview = await createImportPreview(repository, await parse(`${headers}\n0002,external-2,pipe-2,Second,Description,pipelines`), { actorId: 'editor' })
    await applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })
    expect(repository.products.map(item => item.sku)).toEqual(['0001', '0002'])
  })

  it('imports several SKUs with one slug as one family and extra variants', async () => {
    const repository = new MemoryRepository()
    const preview = await createImportPreview(repository, await parse(`${headers}\n${row}\n0002,external-2,pipe-1,Труба 32,Описание,pipelines`), { actorId: 'editor' })
    expect(preview.issues).toEqual([])
    const result = await applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })
    expect(result.created).toBe(2)
    expect(repository.products).toHaveLength(2)
    expect(new Set(repository.products.map(item => item.slug))).toEqual(new Set(['pipe-1']))
  })

  it('blocks duplicate identities and unknown references', async () => {
    const repository = await seeded()
    for (const changed of [row.replace('0001', '9999'), row.replace('pipelines', 'unknown')]) {
      const preview = await createImportPreview(repository, await parse(`${headers}\n${changed}`), { actorId: 'editor' })
      expect(preview.issues.length).toBeGreaterThan(0)
      await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })).rejects.toMatchObject({ code: 'invalid-preview' })
    }
  })

  it('moves a product to another category only when that change is selected', async () => {
    const repository = await seeded()
    const preview = await createImportPreview(repository, await parse(`${headers}\n${row.replace('pipelines', 'pumps')}`), { actorId: 'editor' })
    await applyImportPreview(repository, { batchId: preview.id, actorId: 'editor', overwrites: { '2': ['category'] } })
    expect(repository.products[0].category).toBe('category-2')
  })

  it('rejects changed taxonomy, tampered snapshots, unknown overwrite fields and other actors', async () => {
    const repository = await seeded()
    repository.products[0].title = 'Manual'
    const preview = await createImportPreview(repository, await parse(), { actorId: 'editor' })
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'outsider' })).rejects.toMatchObject({ code: 'batch-not-found' })
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor', overwrites: { '2': ['description'] } })).rejects.toMatchObject({ code: 'invalid-overwrite' })
    repository.categories[0].id = 'replacement-category'
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })).rejects.toMatchObject({ code: 'stale-preview' })
    repository.batches.get(preview.id)!.rows[0].data.title = 'Tampered'
    await expect(applyImportPreview(repository, { batchId: preview.id, actorId: 'editor' })).rejects.toMatchObject({ code: 'invalid-preview' })
  })
})
