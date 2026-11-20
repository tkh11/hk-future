import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { Pool } from 'pg'
import { getPayload, type Payload, type TypedUser } from 'payload'
import { createPayloadImportRepository } from '../../src/cms/import/payload-repository'
import { applyImportPreview, createImportPreview, parseCatalogImport } from '../../src/cms/import'

describe('catalog importer with real Payload / PostgreSQL transactions', { concurrency: false, timeout: 120_000 }, () => {
  let cms: Payload
  let maintenance: Pool
  let probe: Pool
  let database = ''
  let user: TypedUser
  let other: TypedUser
  let categoryID: number
  const csv = (sku: string, title = 'Тестовый товар') => `sku,slug,title,description,category\n${sku},${sku},${title},Описание,pipelines`
  const parse = (sku: string, title?: string) => parseCatalogImport({ name: 'products.csv', bytes: Buffer.from(csv(sku, title)) })
  const repository = () => createPayloadImportRepository(cms, user)

  before(async () => {
    const configured = process.env.CMS_TEST_DATABASE_URL
    assert.ok(configured, 'Use node scripts/cms/test-import.mjs')
    const url = new URL(configured)
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname), 'Only local PostgreSQL is allowed.')
    database = url.pathname.slice(1)
    assert.match(database, /^hk_test_import_[a-z0-9]{16}$/)
    const maintenanceURL = new URL(url); maintenanceURL.pathname = '/postgres'
    maintenance = new Pool({ connectionString: maintenanceURL.toString(), max: 1 })
    assert.equal((await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rowCount, 0)
    await maintenance.query(`CREATE DATABASE "${database}"`)
    url.pathname = `/${database}`
    process.env.DATABASE_URL = url.toString()
    process.env.CMS_ENABLED = 'true'
    process.env.GITHUB_PAGES = 'false'
    process.env.CMS_SERVER_URL = 'http://localhost:3309'
    process.env.PAYLOAD_SECRET = randomBytes(48).toString('hex')
    delete process.env.S3_BUCKET
    delete process.env.CMS_GATEWAY_SECRET
    const { default: config } = await import('../../payload.config')
    cms = await getPayload({ config })
    await cms.db.migrate()
    probe = new Pool({ connectionString: url.toString(), max: 1 })
    const editor = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'importer@test.invalid', password: randomBytes(24).toString('hex'), role: 'editor' } })
    const second = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'other@test.invalid', password: randomBytes(24).toString('hex'), role: 'editor' } })
    user = { ...editor, collection: 'users' }
    other = { ...second, collection: 'users' }
    const category = await cms.create({ collection: 'categories', user, overrideAccess: false, draft: true, data: { title: 'Трубопроводы', slug: 'pipelines', art: 'pipes', _status: 'draft' } })
    categoryID = category.id
  })

  after(async () => {
    if (probe) await probe.end()
    if (cms) await cms.destroy()
    // The parent runner drops this unique database after the Payload process exits.
    if (maintenance) await maintenance.end()
  })

  it('persists a private preview, creates one draft, and concurrent retry is idempotent', async () => {
    const preview = await createImportPreview(repository(), await parse('import-001'), { actorId: user.id })
    assert.equal(preview.issues.length, 0)
    const [first, second] = await Promise.all([
      applyImportPreview(repository(), { batchId: preview.id, actorId: user.id }),
      applyImportPreview(repository(), { batchId: preview.id, actorId: user.id }),
    ])
    assert.equal(first.created, 1)
    assert.deepEqual(first, second)
    // SKU belongs to the variant; the imported product is its family, found by slug.
    const products = await cms.find({ collection: 'products', user, overrideAccess: false, draft: true, where: { slug: { equals: 'import-001' } } })
    assert.equal(products.docs.length, 1)
    assert.equal(products.docs[0]._status, 'draft')
    const variants = await cms.find({ collection: 'product-variants', user, overrideAccess: false, draft: true, where: { sku: { equals: 'import-001' } } })
    assert.equal(variants.docs.length, 1)
    assert.equal(variants.docs[0].product && typeof variants.docs[0].product === 'object' ? variants.docs[0].product.id : variants.docs[0].product, products.docs[0].id)
    assert.equal((await cms.find({ collection: 'products', overrideAccess: false })).docs.length, 0)
    assert.equal((await cms.find({ collection: 'import-batches', user: other, overrideAccess: false })).docs.length, 0)
    await assert.rejects(applyImportPreview(createPayloadImportRepository(cms, other), { batchId: preview.id, actorId: other.id }), { code: 'batch-not-found' })
    await assert.rejects(cms.update({ collection: 'import-batches', user, overrideAccess: false, where: { batchId: { equals: preview.id } }, data: { status: 'applied' } }))
  })

  it('protects manual fields and applies only selected differences', async () => {
    const preview = await createImportPreview(repository(), await parse('import-001', 'Новое название'), { actorId: user.id })
    assert.equal(preview.rows[0].action, 'review')
    await applyImportPreview(repository(), { batchId: preview.id, actorId: user.id })
    const second = await createImportPreview(repository(), await parse('import-001', 'Новое название'), { actorId: user.id })
    const result = await applyImportPreview(repository(), { batchId: second.id, actorId: user.id, overwrites: { '2': ['title'] } })
    assert.equal(result.updated, 1)
    const product = await cms.find({ collection: 'products', user, overrideAccess: false, draft: true, where: { slug: { equals: 'import-001' } } })
    assert.equal(product.docs[0].title, 'Новое название')
  })

  it('rejects a preview when the latest draft has changed in the editor', async () => {
    const preview = await createImportPreview(repository(), await parse('import-001', 'Импорт'), { actorId: user.id })
    const id = Number(preview.rows[0].productId)
    await cms.update({ collection: 'products', id, user, overrideAccess: false, draft: true, context: { saveDraft: true }, data: { title: 'Правка редактора', _status: 'draft' } })
    await assert.rejects(applyImportPreview(repository(), { batchId: preview.id, actorId: user.id, overwrites: { '2': ['title'] } }), { code: 'stale-preview' })
    assert.equal((await cms.findByID({ collection: 'products', id, user, overrideAccess: false, draft: true })).title, 'Правка редактора')
  })

  it('saves changes to a published product as a private draft without changing the public copy', async () => {
    const publisher = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'publisher@test.invalid', password: randomBytes(24).toString('hex'), role: 'publisher' } })
    const original = await cms.create({ collection: 'products', user: publisher, overrideAccess: false, data: {
      sku: 'published-product', slug: 'published-product', title: 'Публичное название', description: 'Описание', category: categoryID, _status: 'published',
    } })
    const preview = await createImportPreview(repository(), await parse('published-product', 'Название из импорта'), { actorId: user.id })
    await applyImportPreview(repository(), { batchId: preview.id, actorId: user.id, overwrites: { '2': ['title'] } })
    const published = await cms.findByID({ collection: 'products', id: original.id, overrideAccess: false })
    const draft = await cms.findByID({ collection: 'products', id: original.id, user, overrideAccess: false, draft: true })
    assert.equal(published.title, 'Публичное название')
    assert.equal(published._status, 'published')
    assert.equal(draft.title, 'Название из импорта')
    assert.equal(draft._status, 'draft')
  })

  it('rolls back earlier product writes and draft versions after an exception', async () => {
    await assert.rejects(repository().transaction(async transaction => {
      await transaction.lockCatalog()
      await transaction.createDraftProduct({ sku: 'rollback-test', slug: 'rollback-test', title: 'Откат', description: '', category: categoryID })
      throw new Error('deliberate rollback')
    }), /deliberate rollback/)
    const result = await cms.find({ collection: 'products', user, overrideAccess: false, draft: true, where: { slug: { equals: 'rollback-test' } } })
    assert.equal(result.docs.length, 0)
    const versions = await probe.query('SELECT COUNT(*)::int AS count FROM _products_v WHERE version_slug = $1', ['rollback-test'])
    assert.equal(versions.rows[0].count, 0)
  })

  it('blocks concurrent ordinary writes to draft versions until the import transaction ends', async () => {
    await repository().transaction(async transaction => {
      await transaction.lockCatalog()
      const connection = await probe.connect()
      try {
        await connection.query('BEGIN')
        await connection.query("SET LOCAL lock_timeout = '100ms'")
        await assert.rejects(connection.query('UPDATE _products_v SET updated_at = now() WHERE version_sku = $1', ['import-001']), { code: '55P03' })
      } finally {
        await connection.query('ROLLBACK')
        connection.release()
      }
    })
    await probe.query('UPDATE _products_v SET updated_at = updated_at WHERE version_sku = $1', ['import-001'])
  })
})
