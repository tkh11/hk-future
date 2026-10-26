import { after, before, describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { randomBytes } from 'node:crypto'
import { spawnSync } from 'node:child_process'
import { Pool } from 'pg'
import { getPayload, type Payload, type TypedUser } from 'payload'
import { resolvePublishedRedirect } from '../../src/cms/redirects'
import { articles } from '../../src/content/articles'
import * as solutionCopy from '../../src/content/solution-pages'
import { coolingProducts, fireProducts, fireStations } from '../../src/content/solutions'

describe('published URLs with real Payload / PostgreSQL versions', { concurrency: false, timeout: 120_000 }, () => {
  let cms: Payload
  let maintenance: Pool
  let publisher: TypedUser
  let editor: TypedUser
  const category = (slug: string, parent?: number) => cms.create({ collection: 'categories', user: publisher, overrideAccess: false, data: { title: slug, slug, parent, art: 'pipes', _status: 'published' } })
  const alias = async (from: string) => (await cms.find({ collection: 'redirects', overrideAccess: false, where: { from: { equals: from } } })).docs[0]?.to

  before(async () => {
    const configured = process.env.CMS_TEST_DATABASE_URL
    assert.ok(configured, 'Use node scripts/cms/test-paths.mjs')
    const url = new URL(configured)
    assert.ok(['127.0.0.1', 'localhost', '[::1]'].includes(url.hostname))
    const database = url.pathname.slice(1)
    assert.match(database, /^hk_test_paths_[a-z0-9]{16}$/)
    const maintenanceURL = new URL(url); maintenanceURL.pathname = '/postgres'
    maintenance = new Pool({ connectionString: maintenanceURL.toString(), max: 1 })
    assert.equal((await maintenance.query('SELECT 1 FROM pg_database WHERE datname = $1', [database])).rowCount, 0)
    await maintenance.query(`CREATE DATABASE "${database}"`)
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
    const pub = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'paths-publisher@test.invalid', password: randomBytes(24).toString('hex'), role: 'publisher' } })
    const edit = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'paths-editor@test.invalid', password: randomBytes(24).toString('hex'), role: 'editor' } })
    publisher = { ...pub, collection: 'users' }
    editor = { ...edit, collection: 'users' }
  })

  after(async () => {
    if (cms) await cms.destroy()
    if (maintenance) await maintenance.end()
  })

  it('captures the published product address before publishing a renamed private draft', async () => {
    const parent = await category('product-category')
    const product = await cms.create({ collection: 'products', user: publisher, overrideAccess: false, data: { title: 'Published', slug: 'original-product', sku: 'url-product', category: parent.id, _status: 'published' } })
    await cms.update({ collection: 'products', id: product.id, user: editor, overrideAccess: false, draft: true, data: { title: 'Pending', slug: 'changed-product', _status: 'draft' } })
    assert.equal((await cms.findByID({ collection: 'products', id: product.id, overrideAccess: false })).slug, 'original-product')
    assert.equal(await alias('/products/original-product'), undefined)
    await cms.update({ collection: 'products', id: product.id, user: publisher, overrideAccess: false, data: { _status: 'published' } })
    assert.equal(await alias('/products/original-product'), '/products/changed-product')
    assert.equal(await resolvePublishedRedirect(cms, '/products/original-product'), '/products/changed-product')
    await cms.update({ collection: 'products', id: product.id, user: publisher, overrideAccess: false, data: { slug: 'third-product', _status: 'published' } })
    assert.equal(await alias('/products/original-product'), '/products/third-product')
    await cms.update({ collection: 'products', id: product.id, user: publisher, overrideAccess: false, data: { slug: 'original-product', _status: 'published' } })
    assert.equal(await alias('/products/original-product'), undefined)
    assert.equal(await resolvePublishedRedirect(cms, '/products/third-product'), '/products/original-product')
    await cms.update({ collection: 'categories', id: parent.id, user: publisher, overrideAccess: false, data: { _status: 'draft' } })
    assert.equal(await resolvePublishedRedirect(cms, '/products/third-product'), null)
  })

  it('retains article and custom page addresses across draft publication and ignores removed targets', async () => {
    const article = await cms.create({ collection: 'articles', user: publisher, overrideAccess: false, data: { title: 'Article', slug: 'article-old', content: articles[0], _status: 'published' } })
    await cms.update({ collection: 'articles', id: article.id, user: editor, overrideAccess: false, draft: true, data: { slug: 'article-new', _status: 'draft' } })
    await cms.update({ collection: 'articles', id: article.id, user: publisher, overrideAccess: false, data: { _status: 'published' } })
    assert.equal(await resolvePublishedRedirect(cms, '/articles/article-old'), '/articles/article-new')
    const page = await cms.create({ collection: 'pages', user: publisher, overrideAccess: false, data: { title: 'Page', path: '/old-page', blocks: [], _status: 'published' } })
    await cms.update({ collection: 'pages', id: page.id, user: editor, overrideAccess: false, draft: true, data: { path: '/new-page', _status: 'draft' } })
    await cms.update({ collection: 'pages', id: page.id, user: publisher, overrideAccess: false, data: { _status: 'published' } })
    assert.equal(await resolvePublishedRedirect(cms, '/old-page'), '/new-page')
    await cms.update({ collection: 'pages', id: page.id, user: publisher, overrideAccess: false, data: { _status: 'draft' } })
    assert.equal(await resolvePublishedRedirect(cms, '/old-page'), null)
    await cms.delete({ collection: 'articles', id: article.id, user: publisher, overrideAccess: false })
    assert.equal(await resolvePublishedRedirect(cms, '/articles/article-old'), null)
  })

  it('updates descendant paths without publishing or losing their pending draft fields', async () => {
    const root = await category('tree-old')
    const child = await category('child', root.id)
    const leaf = await category('leaf', child.id)
    const privateChild = await cms.create({ collection: 'categories', user: editor, overrideAccess: false, draft: true, data: { title: 'Private', slug: 'private', parent: root.id, art: 'pipes', _status: 'draft' } })
    await cms.update({ collection: 'categories', id: child.id, user: editor, overrideAccess: false, draft: true, data: { title: 'Private child title', description: 'Private description', slug: 'pending-child', tone: 'light', _status: 'draft' } })
    await cms.update({ collection: 'categories', id: leaf.id, user: editor, overrideAccess: false, draft: true, data: { title: 'Private leaf title', _status: 'draft' } })
    await cms.update({ collection: 'categories', id: root.id, user: editor, overrideAccess: false, draft: true, data: { slug: 'tree-new', _status: 'draft' } })
    assert.equal(await alias('/catalog/tree-old'), undefined)
    await cms.update({ collection: 'categories', id: root.id, user: publisher, overrideAccess: false, data: { _status: 'published' } })
    const publicChild = await cms.findByID({ collection: 'categories', id: child.id, overrideAccess: false })
    const pendingChild = await cms.findByID({ collection: 'categories', id: child.id, user: editor, overrideAccess: false, draft: true })
    const publicLeaf = await cms.findByID({ collection: 'categories', id: leaf.id, overrideAccess: false })
    const pendingLeaf = await cms.findByID({ collection: 'categories', id: leaf.id, user: editor, overrideAccess: false, draft: true })
    assert.equal(publicChild.title, 'child')
    assert.equal(publicChild.description, null)
    assert.equal(publicChild.tone, null)
    assert.equal(publicChild.path, 'tree-new/child')
    assert.equal(publicChild._status, 'published')
    assert.equal(pendingChild.title, 'Private child title')
    assert.equal(pendingChild.description, 'Private description')
    assert.equal(pendingChild.tone, 'light')
    assert.equal(pendingChild.path, 'tree-new/pending-child')
    assert.equal(pendingChild._status, 'draft')
    assert.equal(publicLeaf.title, 'leaf')
    assert.equal(publicLeaf.path, 'tree-new/child/leaf')
    assert.equal(pendingLeaf.title, 'Private leaf title')
    assert.equal(pendingLeaf._status, 'draft')
    assert.equal(pendingLeaf.path, 'tree-new/pending-child/leaf')
    assert.equal((await cms.findByID({ collection: 'categories', id: privateChild.id, user: editor, overrideAccess: false, draft: true })).path, 'tree-new/private')
    assert.equal((await cms.find({ collection: 'categories', where: { id: { equals: privateChild.id } }, overrideAccess: false })).docs.length, 0)
    assert.equal(await resolvePublishedRedirect(cms, '/catalog/tree-old'), '/catalog/tree-new')
    assert.equal(await resolvePublishedRedirect(cms, '/catalog/tree-old/child'), '/catalog/tree-new/child')
    assert.equal(await resolvePublishedRedirect(cms, '/catalog/tree-old/child/leaf'), '/catalog/tree-new/child/leaf')
    assert.equal(await alias('/catalog/tree-old/private'), undefined)
    await cms.update({ collection: 'categories', id: root.id, user: publisher, overrideAccess: false, data: { _status: 'draft' } })
    assert.equal(await resolvePublishedRedirect(cms, '/catalog/tree-old/child/leaf'), null)
  })

  it('rolls back the parent, descendant paths, and redirects together if a descendant save fails', async () => {
    const root = await category('rollback-parent')
    const child = await category('rollback-child', root.id)
    const hooks = cms.collections.categories.config.hooks.beforeChange
    const failure: NonNullable<typeof hooks>[number] = ({ data, originalDoc, req }) => {
      if (req.context.skipContentHooks && originalDoc.id === child.id) throw new Error('Deliberate descendant failure')
      return data
    }
    hooks.push(failure)
    try {
      await assert.rejects(cms.update({ collection: 'categories', id: root.id, user: publisher, overrideAccess: false, data: { slug: 'rollback-new', _status: 'published' } }), /Deliberate descendant failure/)
    } finally {
      hooks.splice(hooks.indexOf(failure), 1)
    }
    assert.equal((await cms.findByID({ collection: 'categories', id: root.id, overrideAccess: false })).path, 'rollback-parent')
    assert.equal((await cms.findByID({ collection: 'categories', id: child.id, overrideAccess: false })).path, 'rollback-parent/rollback-child')
    assert.equal(await alias('/catalog/rollback-parent'), undefined)
  })

  it('enforces solution model identifiers and safe copy through the server write API', async () => {
    const content = { ...solutionCopy, coolingProducts, fireProducts, fireStations }
    await cms.updateGlobal({ slug: 'solution-content', user: publisher, overrideAccess: false, data: { content } })
    await assert.rejects(cms.updateGlobal({ slug: 'solution-content', user: publisher, overrideAccess: false, data: {
      content: { ...content, coolingProducts: coolingProducts.slice(1) },
    } }))
    await assert.rejects(cms.updateGlobal({ slug: 'solution-content', user: publisher, overrideAccess: false, data: {
      content: { ...content, fireProducts: [...fireProducts.slice(0, 4), fireProducts[0]] },
    } }))
    await assert.rejects(cms.updateGlobal({ slug: 'solution-content', user: publisher, overrideAccess: false, data: {
      content: { ...content, dcHero: { ...content.dcHero, heading: '<script>alert(1)</script>' } },
    } }))
    const saved = await cms.findGlobal({ slug: 'solution-content', overrideAccess: false })
    assert.deepEqual(saved.content, content)
  })

  it('checks product series ownership and validates full draft attributes when publishing', async () => {
    const own = await category('validated-products')
    const another = await category('different-products')
    const series = await cms.create({ collection: 'product-series', user: publisher, overrideAccess: false, data: { title: 'Series', slug: 'validated-series', category: own.id, _status: 'published' } })
    await assert.rejects(cms.create({ collection: 'products', user: publisher, overrideAccess: false, data: {
      title: 'Wrong series', slug: 'wrong-series', sku: 'wrong-series', category: another.id, series: series.id, _status: 'published',
    } }))
    const draft = await cms.create({ collection: 'products', user: editor, overrideAccess: false, draft: true, data: {
      title: 'Typed attributes', slug: 'typed-attributes', sku: 'typed-attributes', category: own.id, series: series.id, _status: 'draft',
      attributes: [{ key: 'pressure', label: 'Давление', valueType: 'number', numberValue: null, unit: 'МПа' }],
    } })
    await assert.rejects(cms.update({ collection: 'products', id: draft.id, user: publisher, overrideAccess: false, data: { _status: 'published' } }))
    assert.equal((await cms.find({ collection: 'products', where: { id: { equals: draft.id } }, overrideAccess: false })).docs.length, 0)
    await cms.update({ collection: 'products', id: draft.id, user: publisher, overrideAccess: false, data: { _status: 'published', attributes: [
      { key: 'pressure', label: 'Давление', valueType: 'number', numberValue: 0, unit: 'МПа' },
      { key: 'inline', label: 'Ин-лайн', valueType: 'boolean', booleanValue: false },
    ] } })
    const published = await cms.findByID({ collection: 'products', id: draft.id, overrideAccess: false })
    assert.equal(published.attributes?.[0].numberValue, 0)
    assert.equal(published.attributes?.[1].booleanValue, false)
    await assert.rejects(cms.update({ collection: 'products', id: draft.id, user: publisher, overrideAccess: false, data: { category: another.id } }))
    await assert.rejects(cms.update({ collection: 'products', id: draft.id, user: publisher, overrideAccess: false, data: { attributes: [
      { key: 'same', label: 'A', valueType: 'text', textValue: 'A' },
      { key: 'same', label: 'B', valueType: 'text', textValue: 'B' },
    ] } }))
  })

  it('replays the real seed without recreating renamed records or overwriting drafts and empty navigation', async () => {
    const seededAdmin = await cms.create({ collection: 'users', overrideAccess: true, data: { email: 'seed-admin@test.invalid', password: randomBytes(24).toString('hex'), role: 'admin' } })
    const seed = () => {
      const result = spawnSync(process.execPath, ['--import', 'tsx', 'scripts/cms/seed.ts'], { env: process.env, encoding: 'utf8', timeout: 30_000 })
      assert.equal(result.status, 0, result.stderr || result.stdout)
    }
    seed()
    const category = (await cms.find({ collection: 'categories', overrideAccess: true, where: { sourceKey: { equals: 'catalog:pipelines' } } })).docs[0]
    const article = (await cms.find({ collection: 'articles', overrideAccess: true, where: { sourceKey: { equals: `article:${articles[0].slug}` } } })).docs[0]
    const page = (await cms.find({ collection: 'pages', overrideAccess: true, where: { sourceKey: { equals: 'page:/solutions/data-centers' } } })).docs[0]
    assert.ok(category && article && page)
    await cms.update({ collection: 'categories', id: category.id, user: publisher, overrideAccess: false, data: { slug: 'edited-pipelines', title: 'Edited category', _status: 'published' } })
    await cms.update({ collection: 'articles', id: article.id, user: publisher, overrideAccess: false, data: { slug: 'edited-seeded-article', title: 'Edited article', _status: 'published' } })
    await cms.update({ collection: 'articles', id: article.id, user: editor, overrideAccess: false, draft: true, data: { title: 'Pending article title', _status: 'draft' } })
    await cms.update({ collection: 'pages', id: page.id, user: publisher, overrideAccess: false, data: { path: '/cooling-revised', title: 'Edited page', _status: 'published' } })
    await cms.update({ collection: 'pages', id: page.id, user: publisher, overrideAccess: false, data: { _status: 'draft' } })
    await cms.updateGlobal({ slug: 'navigation', user: publisher, overrideAccess: false, data: { items: [] } })
    const counts = await Promise.all((['categories', 'articles', 'pages'] as const).map(collection => cms.count({ collection, overrideAccess: true }).then(result => result.totalDocs)))
    seed()
    assert.deepEqual(await Promise.all((['categories', 'articles', 'pages'] as const).map(collection => cms.count({ collection, overrideAccess: true }).then(result => result.totalDocs))), counts)
    assert.equal((await cms.findByID({ collection: 'categories', id: category.id, overrideAccess: false })).title, 'Edited category')
    assert.equal((await cms.findByID({ collection: 'articles', id: article.id, user: editor, overrideAccess: false, draft: true })).title, 'Pending article title')
    assert.equal((await cms.findByID({ collection: 'articles', id: article.id, overrideAccess: false })).title, 'Edited article')
    assert.equal((await cms.findByID({ collection: 'pages', id: page.id, overrideAccess: true }))._status, 'draft')
    assert.equal((await cms.find({ collection: 'pages', overrideAccess: true, where: { path: { equals: '/solutions/data-centers' } } })).docs.length, 0)
    assert.deepEqual((await cms.findGlobal({ slug: 'navigation', overrideAccess: false })).items, [])
    assert.equal((await cms.findByID({ collection: 'categories', id: category.id, overrideAccess: false })).sourceKey, undefined)
    await assert.rejects(cms.update({ collection: 'categories', id: category.id, user: seededAdmin, overrideAccess: true, context: { trustedMigration: true }, data: { sourceKey: 'catalog:forged' } }), /неизменяем/)
    await cms.update({ collection: 'categories', id: category.id, user: publisher, overrideAccess: false, data: { sourceKey: 'catalog:forged' } })
    assert.equal((await cms.findByID({ collection: 'categories', id: category.id, overrideAccess: true })).sourceKey, 'catalog:pipelines')
  })

  it('resolves bounded historical chains, rejects cycles, and never redirects to draft-only content', async () => {
    const page = await cms.create({ collection: 'pages', user: publisher, overrideAccess: false, data: { title: 'Target', path: '/chain-target', blocks: [], _status: 'published' } })
    const redirect = (from: string, to: string) => cms.create({ collection: 'redirects', overrideAccess: true, data: { from, to } })
    await redirect('/chain-one', '/chain-two')
    await redirect('/chain-two', '/chain-target')
    assert.equal(await resolvePublishedRedirect(cms, '/chain-one'), '/chain-target')
    await redirect('/cycle-one', '/cycle-two')
    await redirect('/cycle-two', '/cycle-one')
    assert.equal(await resolvePublishedRedirect(cms, '/cycle-one'), null)
    await redirect('/unsafe-path', '//external')
    assert.equal(await resolvePublishedRedirect(cms, '/unsafe-path'), null)
    await cms.update({ collection: 'pages', id: page.id, user: publisher, overrideAccess: false, data: { _status: 'draft' } })
    assert.equal(await resolvePublishedRedirect(cms, '/chain-one'), null)
    const draft = await cms.create({ collection: 'pages', user: editor, overrideAccess: false, draft: true, data: { title: 'Draft', path: '/private-target', blocks: [], _status: 'draft' } })
    await redirect('/old-private-target', draft.path)
    assert.equal(await resolvePublishedRedirect(cms, '/old-private-target'), null)
  })
})
