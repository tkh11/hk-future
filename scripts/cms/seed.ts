import { getPayload } from 'payload';
import config from '../../payload.config';
import { catalog } from '../../src/content/catalog';
import { articles } from '../../src/content/articles';
import { contacts } from '../../src/content/contacts';
import * as solutionPages from '../../src/content/solution-pages';
import * as solutions from '../../src/content/solutions';
import type { CatalogNode } from '../../src/lib/catalog';

const payload = await getPayload({ config });
const admin = (await payload.find({ collection: 'users', where: { role: { equals: 'admin' } }, limit: 1, overrideAccess: true })).docs[0];
if (!admin) throw new Error('Create an administrator before seeding content.');
const context = { trustedMigration: true, skipContentHooks: true };
async function seedCategories(nodes: CatalogNode[], parent?: number, prefix = '') {
  for (const [sortOrder, node] of nodes.entries()) {
    const categoryPath = [prefix, node.slug].filter(Boolean).join('/');
    const exists = (await payload.find({ collection: 'categories', where: { sourceKey: { equals: `catalog:${categoryPath}` } }, limit: 1, overrideAccess: true })).docs[0];
    const doc = exists || await payload.create({ collection: 'categories', user: admin, overrideAccess: false, context,
      data: { sourceKey: `catalog:${categoryPath}`, title: node.title, slug: node.slug, description: node.description, art: node.art, imagePath: node.image, tone: node.tone, parent, sortOrder, _status: 'published' } });
    if (node.children) await seedCategories(node.children, doc.id, categoryPath);
  }
}
await seedCategories(catalog);
for (const article of articles) {
  const exists = await payload.count({ collection: 'articles', where: { sourceKey: { equals: `article:${article.slug}` } }, overrideAccess: true });
  if (!exists.totalDocs) await payload.create({ collection: 'articles', user: admin, overrideAccess: false, context, data: { sourceKey: `article:${article.slug}`, title: article.title, slug: article.slug, content: { ...article }, _status: 'published' } });
}
for (const [slug, content] of [['contacts', contacts], ['solution-content', { ...solutionPages, ...solutions }]] as const) {
  const current = await payload.findGlobal({ slug, overrideAccess: true });
  if (!current.content || (slug === 'contacts' && !(typeof current.content === 'object' && !Array.isArray(current.content) && 'email' in current.content && current.content.email))) await payload.updateGlobal({ slug, user: admin, overrideAccess: false, data: { content } });
}
const initialPages = [
  { title: 'Главная', path: '/', sections: ['home-banner', 'about-company', 'engineering-solutions'] },
  { title: 'Системы охлаждения ЦОД', path: '/solutions/data-centers', sections: ['dc-hero', 'dc-intro', 'dc-system', 'dc-products'] },
  { title: 'Системы пожаротушения', path: '/solutions/fire-suppression', sections: ['fire-hero', 'fire-intro', 'fire-system', 'fire-products'] },
] as const;
for (const page of initialPages) {
  const exists = await payload.count({ collection: 'pages', where: { sourceKey: { equals: `page:${page.path}` } }, overrideAccess: true });
  if (!exists.totalDocs) await payload.create({ collection: 'pages', user: admin, overrideAccess: false, context,
    data: { sourceKey: `page:${page.path}`, title: page.title, path: page.path, _status: 'published', blocks: page.sections.map(section => ({ blockType: 'siteSection' as const, section })) } });
}
const navigation = await payload.findGlobal({ slug: 'navigation', overrideAccess: true });
if (!navigation.createdAt) await payload.updateGlobal({ slug: 'navigation', user: admin, overrideAccess: false, data: { items: [
  { href: '/catalog', label: 'Каталог' }, { href: '/articles', label: 'База знаний' },
  { href: '/designers', label: 'Проектировщикам' }, { href: '/selection', label: 'Подбор оборудования' },
] } });
console.log('Existing catalogue, articles, contacts and solution copy seeded. Existing CMS edits were preserved.');
await payload.destroy();
// Payload retains a PostgreSQL listener; the CLI exits only after all awaited writes.
process.exit(0);
