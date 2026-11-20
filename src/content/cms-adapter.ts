import "server-only";

import { cache } from "react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { z } from "zod";
import { cmsEnabled } from "@/cms/env";
import { getCMS } from "@/cms/client";
import { getPreviewUser } from "@/cms/preview";
import { publicCache } from "@/cms/public-cache";
import { catalog } from "./catalog";
import { articles } from "./articles";
import { contacts } from "./contacts";
import * as pageCopy from "./solution-pages";
import { coolingProducts, fireProducts, fireStations } from "./solutions";
import type { CatalogNode } from "@/lib/catalog";
import { catalogHref, getCatalogEntries } from "@/lib/catalog";
import type { SiteSearchEntry } from "@/lib/site-search";
import { searchPages } from "./search-pages";
import { mapCatalogVariant, catalogSpecs, variantRanges } from './catalog-presenter';
import type { Where } from 'payload';
import { mapLibraryDocuments } from './documents';
import { solutionSchema, type SolutionContent } from "./cms-schemas";
export { solutionSchema, type SolutionContent } from "./cms-schemas";

// DTO schemas deliberately strip unknown fields. Never pass Payload documents,
// internal IDs, auth metadata or uploaded-file internals into client components.
const text = z.string();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const relativePath = z.string().regex(/^\/(?!\/)[^\\\u0000-\u0020]*$/);
const httpURL = z.string().url().refine((value) => /^https?:\/\//.test(value));
const assetURL = z.union([relativePath, httpURL]);
const relationID = z.union([z.string(), z.number()]);
const art = z.enum(["pipes", "layers", "pump", "circulation", "borehole", "drainage", "station", "automation", "auxiliary"]);
const media = z.object({ url: assetURL, alt: text.nullish(), filename: text.nullish(),
  id: relationID.optional(), _status: text.optional(), mimeType: text.nullish(), filesize: z.number().nullish() });
const populatedMedia = media.nullish().catch(undefined);

const categoryDocument = z.object({
  id: relationID, slug, title: text, path: z.string().regex(/^[a-z0-9-]+(?:\/[a-z0-9-]+)*$/),
  parent: z.union([relationID, z.object({ id: relationID })]).nullish(),
  sortOrder: z.number().nullish(), art: art.nullish(), tone: z.literal("light").nullish(),
  description: text.nullish(), imagePath: assetURL.nullish(), image: populatedMedia,
});

export function mapCategoryTree(documents: unknown[]): CatalogNode[] {
  const rows = documents.map((doc) => categoryDocument.parse(doc));
  const nodes = new Map<string, CatalogNode>(rows.map((row) => [String(row.id), {
    slug: row.slug, title: row.title, art: row.art ?? "auxiliary",
    ...(row.description ? { description: row.description } : {}),
    ...(row.image?.url || row.imagePath ? { image: row.image?.url || row.imagePath || undefined } : {}),
    ...(row.tone ? { tone: row.tone } : {}),
  } satisfies CatalogNode]));
  const roots: CatalogNode[] = [];
  const sorted = [...rows].sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.path.localeCompare(b.path));
  const rowByID = new Map(rows.map((row) => [String(row.id), row]));
  const reachable = (row: (typeof rows)[number], ancestors = new Set<string>()): boolean => {
    const id = String(row.id);
    if (ancestors.has(id)) return false;
    const parentID = typeof row.parent === "object" ? row.parent?.id : row.parent;
    if (parentID == null) return row.path === row.slug;
    const parent = rowByID.get(String(parentID));
    if (!parent || row.path !== `${parent.path}/${row.slug}`) return false;
    return reachable(parent, new Set([...ancestors, id]));
  };
  for (const row of sorted) {
    // A published child of an unpublished/inaccessible parent must not leak as
    // an unexpected root category, even when returned by a collection query.
    if (!reachable(row)) continue;
    const node: CatalogNode = nodes.get(String(row.id))!;
    const parentID = typeof row.parent === "object" ? row.parent?.id : row.parent;
    if (parentID == null) roots.push(node);
    else {
      const parent: CatalogNode = nodes.get(String(parentID))!;
      (parent.children ??= []).push(node);
    }
  }
  return roots;
}

export const articleSchema = z.object({
  query: text, wordstat: z.number(), seed: text, slug, title: text,
  description: text, category: text, lead: text,
  sections: z.array(z.object({ heading: text, paragraphs: z.array(text) })),
  faq: z.array(z.object({ question: text, answer: text })),
  sources: z.array(z.object({ title: text, url: httpURL })),
  related: z.array(slug), status: text, language: text, date: text,
  catalogHref: relativePath, selectionHref: relativePath, wordstatSource: text, readingMinutes: z.number(),
});
export function mapArticle(document: unknown) {
  const row = z.object({ slug, title: text, content: z.unknown() }).parse(document);
  const content = articleSchema.parse(row.content);
  return { ...content, slug: row.slug, title: row.title };
}

export const contactsSchema = z.object({
  phone: text, phoneHref: z.string().regex(/^tel:\+?[\d ()-]+$/), email: z.email(), serviceEmail: z.email(),
  serviceExtensions: text, address: text, region: text, locality: text, street: text, hours: text,
  mapEmbed: httpURL.refine((value) => { const url = new URL(value); return url.hostname === "yandex.ru" && url.pathname === "/map-widget/v1/"; }),
  messengers: z.array(z.object({ name: text, href: httpURL, icon: assetURL })),
});

const productDocument = z.object({
  id: relationID.optional(), slug, sku: text.nullish(), title: text, description: text.nullish(),
  profile: text.nullish(), productKind: z.enum(['single','family','request']).nullish(), characteristics:text.nullish(), summary:text.nullish(),
  additionalCategories:z.array(z.object({path:text,title:text})).nullish().catch(undefined),
  gallery:z.array(z.object({file:populatedMedia,role:text.nullish(),caption:text.nullish()})).nullish(),
  catalogDocuments:z.array(z.object({visible:z.boolean().nullish(),document:z.object({id:relationID.optional(),_status:text.optional(),title:text,kind:text.nullish(),file:populatedMedia,cover:populatedMedia}).nullish().catch(undefined)})).nullish(),
  category: z.object({ path: text, title: text }).nullish().catch(undefined),
});
type GalleryRow = { file?: { url: string; alt?: string | null } | null; role?: string | null; caption?: string | null };
const galleryOf = (rows: GalleryRow[] | null | undefined, title: string) =>
  (rows ?? []).flatMap(x => x.file ? [{ url: x.file.url, alt: x.caption || x.file.alt || title, role: x.role || 'gallery' }] : []);
/** The main photo is the one marked «Основное фото», otherwise the first gallery item. */
const coverOf = (gallery: { url: string; alt: string; role: string }[]) => {
  const item = gallery.find(x => x.role === 'main') ?? gallery[0];
  return item ? { url: item.url, alt: item.alt } : null;
};
export function mapProduct(document: unknown) {
  const row = productDocument.parse(document);
  const gallery = galleryOf(row.gallery, row.title);
  return {
    slug: row.slug, sku: row.sku ?? '', title: row.title, description: row.description ?? "",
    productKind:row.productKind??'single', characteristics:row.characteristics??'',summary:row.summary??'',
    profile: row.profile ?? '',
    previewDocuments: mapLibraryDocuments((row.catalogDocuments ?? []).filter(item => item.visible !== false).map(item => item.document)),
    additionalCategories:row.additionalCategories??[],
    gallery,
    image: coverOf(gallery),
    category: row.category ? { title: row.category.title, path: row.category.path } : null,
    documents: (row.catalogDocuments??[]).filter(x=>x.visible!==false).flatMap(x=>x.document?.file?[{url:x.document.file.url,title:x.document.title}]:[]).filter((d,i,all)=>all.findIndex(x=>x.url===d.url)===i),
  };
}
export type PublicProduct = NonNullable<Awaited<ReturnType<typeof getProductContent>>>;

// React cache is request-scoped: no preview data or authenticated user may enter
// a shared persistent cache. The Local API bypasses access checks by default,
// so every request below explicitly enables them.
const requestContext = cache(async () => {
  await connection();
  // Read the request boundary first; a CMS-enabled build must not open a DB
  // connection before Next has marked this render as request-time.
  const user = await getPreviewUser();
  const payload = await getCMS();
  return { payload, user };
});
const publishedOnly = { _status: { equals: "published" } } as const;

async function findAll(collection: "categories" | "articles" | "products" | "pages", options: { publicOnly?: boolean; summary?: boolean; where?: import("payload").Where } = {}) {
  const { payload, user } = options.publicOnly ? { payload: await getCMS(), user: null } : await requestContext();
  const rows: unknown[] = [];
  let page = 1;
  let hasNextPage = true;
  while (hasNextPage) {
    const args = {
      depth: collection === 'products' && !options.summary ? 2 : 1, limit: 200, page,
      overrideAccess: false, user: user ?? undefined, draft: Boolean(user),
      where: { and: [...(user ? [] : [publishedOnly]), ...(options.where ? [options.where] : [])] },
      sort: collection === "categories" || collection === "products" ? "sortOrder" : "createdAt",
      ...(options.summary ? { select: { slug: true, sku: true, title: true, gallery: true, category: true, productKind:true,additionalCategories:true } as const } : {}),
    };
    // Fetch variants explicitly below; expanding reverse joins here would load
    // dozens of unnecessary rows for every card and header search result.
    const result = collection === 'products'
      ? await payload.find({...args,collection:'products',joins:false,...(!options.summary ? { select: { resources: false } as const } : {})})
      : await payload.find({...args,collection});
    rows.push(...result.docs);
    hasNextPage = result.hasNextPage;
    page += 1;
  }
  return rows;
}

const publishedCatalog = publicCache("catalog", async (): Promise<CatalogNode[]> => mapCategoryTree(await findAll("categories", { publicOnly: true })));
export const getCatalogContent = cache(async (): Promise<CatalogNode[]> => {
  if (!cmsEnabled()) return catalog;
  const { user } = await requestContext();
  return user ? mapCategoryTree(await findAll("categories")) : publishedCatalog();
});

export const getArticlesContent = cache(async () => {
  if (!cmsEnabled()) return articles;
  return (await findAll("articles")).map(mapArticle);
});

/** The global search always uses published content, including in preview mode. */
async function loadSiteSearch(): Promise<SiteSearchEntry[]> {
  const enabled = cmsEnabled();
  const [categoryRows, productRows, articleRows, pageRows, allowedPages] = enabled
    ? await Promise.all([
      findAll("categories", { publicOnly: true }),
      findAll("products", { publicOnly: true, summary: true }),
      findAll("articles", { publicOnly: true }),
      findAll("pages", { publicOnly: true }),
      filterPublicCMSPaths(searchPages.map(page => page.href)),
    ]) : [[], [], [], [], searchPages.map(page => page.href)];
  const categories = getCatalogEntries(enabled ? mapCategoryTree(categoryRows) : catalog);
  const categoryPaths = new Set(categories.map(entry => entry.path.join("/")));
  const pages = new Map(searchPages.filter(page => allowedPages.includes(page.href)).map(page => [page.href, page]));
  const productSearch=await enrichVariantSummaries(productRows,productSummaries(productRows),true);
  for (const document of pageRows) {
    const page = z.object({ path: relativePath, title: text }).parse(document);
    if (page.path === "/") continue;
    pages.set(page.path, { ...pages.get(page.path), href: page.path, title: page.title, description: pages.get(page.path)?.description ?? "", kind: "Страница" });
  }
  return [
    ...categories.map(({ node, path, trail }): SiteSearchEntry => ({
      href: catalogHref(path), title: node.title, description: node.description?.slice(0, 220) ?? trail.slice(0, -1).map(item => item.title).join(" · "),
      kind: "Раздел каталога", image: node.image, keywords: trail.map(item => item.title).join(" "),
    })),
    ...productSearch.filter(product => product.category && categoryPaths.has(product.category.path)).map((product): SiteSearchEntry => ({
      href: `/products/${product.slug}`, title: product.title, description: [product.sku||product.articleSummary, product.category?.title].filter(Boolean).join(" · "),
      kind: "Продукт", image: product.image?.url, keywords: [product.sku, product.searchKeywords, product.category?.title].filter(Boolean).join(" "),
    })),
    ...(enabled ? articleRows.map(mapArticle) : articles).map((article): SiteSearchEntry => ({
      href: `/articles/${article.slug}`, title: article.title, description: article.description.slice(0, 220), kind: "Статья", keywords: article.category,
    })),
    ...pages.values(),
  ];
}
const publishedSiteSearch = publicCache("site-search", loadSiteSearch);
export const getSiteSearchContent = cache(async (): Promise<SiteSearchEntry[]> => cmsEnabled() ? publishedSiteSearch() : loadSiteSearch());
export async function getArticleContent(articleSlug: string) {
  return (await getArticlesContent()).find((article) => article.slug === articleSlug);
}

export const getContactsContent = cache(async () => {
  if (!cmsEnabled()) return contacts;
  const { payload, user } = await requestContext();
  const result = await payload.findGlobal({ slug: "contacts", overrideAccess: false, user: user ?? undefined, draft: Boolean(user) });
  return contactsSchema.parse(result.content);
});

export const getSolutionsContent = cache(async (): Promise<SolutionContent> => {
  if (!cmsEnabled()) return { ...pageCopy, coolingProducts, fireProducts, fireStations };
  const { payload, user } = await requestContext();
  const result = await payload.findGlobal({ slug: "solution-content", overrideAccess: false, user: user ?? undefined, draft: Boolean(user) });
  return solutionSchema.parse(result.content);
});

export type PublicProductSummary = Pick<PublicProduct, "slug" | "sku" | "title" | "image" | "category"> & {
  additionalCategories?:{path:string;title:string}[]; articleSummary?:string;variantCount?:number;searchKeywords?:string;
};
const productSummaryDocument = productDocument.pick({ slug: true, sku: true, title: true, gallery: true, category: true })
  .extend({ productKind:z.enum(['single','family','request']).nullish(),additionalCategories:z.array(z.object({path:text,title:text})).nullish().catch(undefined),title: text.refine(value => value.trim().length > 0) })
  .refine(row=>row.productKind==='family'||row.productKind==='request'||Boolean(row.sku?.trim()),{path:['sku'],message:'Артикул не заполнен'});
function productSummaries(documents: unknown[]): PublicProductSummary[] {
  return documents.flatMap(document => {
    const result = productSummaryDocument.safeParse(document);
    // Autosaved drafts can lack even a title or slug. Keep them in the CMS,
    // but never create broken links or fail the entire catalog/search page.
    if (!result.success) {
      console.warn('[CMS] Incomplete product omitted from listings:', result.error.issues.map(issue => issue.path.join('.')).join(', '));
      return [];
    }
    const row = result.data;
    return [{
      slug: row.slug, sku: row.sku??'', title: row.title,
      image: coverOf(galleryOf(row.gallery, row.title)),
      category: row.category ?? null,
      additionalCategories:row.additionalCategories??[],
    }];
  });
}
async function visibleCategoryPaths() {
  const { getCatalogEntries } = await import("@/lib/catalog");
  return new Set(getCatalogEntries(await getCatalogContent()).map((entry) => entry.path.join("/")));
}
const publishedProductSummaries = publicCache("product-summaries", async (): Promise<PublicProductSummary[]> => {
  const visible = new Set(getCatalogEntries(await publishedCatalog()).map((entry) => entry.path.join("/")));
  const rows = await findAll("products", { publicOnly: true, summary: true });
  return (await enrichVariantSummaries(rows, productSummaries(rows), true)).filter((product) => product.category && visible.has(product.category.path));
});
export const getProductSummariesContent = cache(async (): Promise<PublicProductSummary[]> => {
  if (!cmsEnabled()) return [];
  const { user } = await requestContext();
  if (!user) return publishedProductSummaries();
  const visible = await visibleCategoryPaths();
  const rows=await findAll("products", { summary: true });
  return (await enrichVariantSummaries(rows,productSummaries(rows))).filter((product) => product.category && visible.has(product.category.path));
});

async function enrichVariantSummaries(rows:unknown[], summaries:PublicProductSummary[], publicOnly=false):Promise<PublicProductSummary[]> {
  const families=rows.flatMap(row=>{const parsed=z.object({id:relationID,slug:text,productKind:z.enum(['family','request'])}).safeParse(row);return parsed.success?[parsed.data]:[];});
  if(!families.length)return summaries;
  const {payload,user}=publicOnly?{payload:await getCMS(),user:null}:await requestContext();
  const variants=await payload.find({collection:'product-variants',where:{product:{in:families.map(p=>p.id)}},pagination:false,depth:0,overrideAccess:false,user:user??undefined,draft:Boolean(user),select:{sku:true,product:true}});
  const groups=new Map<string,string[]>();
  for(const v of variants.docs){const id=typeof v.product==='object'?v.product?.id:v.product;if(!v.sku||id==null)continue;const key=String(id);groups.set(key,[...(groups.get(key)||[]),v.sku]);}
  const {articleSummary}=await import('./catalog-presenter');
  return summaries.map(p=>{const family=families.find(f=>f.slug===p.slug);if(!family)return p;const skus=groups.get(String(family.id))||[];return {...p,articleSummary:articleSummary(skus),variantCount:skus.length,searchKeywords:skus.join(' ')};});
}
async function loadProduct(productSlug: string, publicOnly: boolean) {
  const parent = await visibleProduct(productSlug, false, publicOnly);
  if (!parent) return null;
  const { payload, user } = publicOnly ? { payload: await getCMS(), user: null } : await requestContext();
  // Only size choices and numeric ranges are needed for the product overview.
  // Full rows, including their media, are fetched when the visitor opens the table.
  const overview = await payload.find({
    collection: 'product-variants', where: variantWhere(parent.id), depth: 0, pagination: false,
    overrideAccess: false, user: user ?? undefined, draft: Boolean(user), select: { size: true, specs: true },
  });
  return {
    ...mapProduct(parent.row),
    sizes: [...new Set(overview.docs.flatMap(row => row.size ? [row.size] : []))].sort((a,b) => a.localeCompare(b,'ru',{numeric:true})),
    specifications: variantRanges(overview.docs.map(row => ({ specs: catalogSpecs(row.specs) }))),
    variantCount: overview.docs.length,
  };
}
const publishedProduct = publicCache("product", (productSlug: string) => loadProduct(productSlug, true));
// Metadata and the page request the same product during one render.
export const getProductContent = cache(async (productSlug: string) => {
  if (!cmsEnabled() || !slug.safeParse(productSlug).success) return undefined;
  const { user } = await requestContext();
  return (user ? await loadProduct(productSlug, false) : await publishedProduct(productSlug)) ?? undefined;
});

async function visibleProduct(productSlug: string, summary = false, publicOnly = false) {
  if (!cmsEnabled() || !slug.safeParse(productSlug).success) return undefined;
  const [row] = await findAll('products', { where: { slug: { equals: productSlug } }, summary, publicOnly });
  const parsed = z.object({ id: relationID, category: z.object({ path: text }) }).safeParse(row);
  const visible = publicOnly ? new Set(getCatalogEntries(await publishedCatalog()).map((entry) => entry.path.join("/"))) : await visibleCategoryPaths();
  if (!parsed.success || !visible.has(parsed.data.category.path)) return undefined;
  return { id: parsed.data.id, row };
}

function variantWhere(productId: string | number): Where {
  return { and: [{ product: { equals: productId } }, { sku: { exists: true } }, { title: { exists: true } }] };
}

export async function getNomenclaturePage(productSlug: string, page: number, limit: number, query: string, size: string) {
  const parent = await visibleProduct(productSlug, true);
  if (!parent) return null;
  const { payload, user } = await requestContext();
  const filters: Where[] = [variantWhere(parent.id)];
  if (size) filters.push({ size: { equals: size } });
  for (const term of query.split(/\s+/).filter(Boolean)) {
    filters.push({ or: ['sku', 'title', 'size', 'connection'].map(key => ({ [key]: { contains: term } })) });
  }
  const result = await payload.find({
    collection: 'product-variants', where: { and: filters }, limit, page, depth: 1, sort: ['sortOrder', 'id'],
    user: user ?? undefined, draft: Boolean(user), overrideAccess: false,
    select: { title:true, sku:true, size:true, connection:true, color:true, specs:true, gallery:true },
  });
  return { rows: result.docs.map(mapCatalogVariant).filter(row => row !== null), total: result.totalDocs, pages: result.totalPages };
}

export async function getCMSPage(path: string) {
  if (!cmsEnabled()) return null;
  const [document] = await findAll("pages", { where: { path: { equals: path } } });
  if (!document) {
    const payload = await getCMS();
    const [existing, aliases] = await Promise.all([
      // Read existence only; private page content never leaves this boundary.
      payload.count({ collection: 'pages', where: { path: { equals: path } }, overrideAccess: true }),
      payload.find({ collection: 'redirects', where: { from: { equals: path } }, limit: 1, depth: 0, overrideAccess: false }),
    ]);
    if (aliases.docs.length) await redirectOldCMSPath(path);
    // Missing published targets and explicitly unpublished pages must not revive
    // the legacy composition at a URL previously managed by the CMS.
    if (existing.totalDocs || aliases.docs.length) { const { notFound } = await import('next/navigation'); notFound(); }
    return null;
  }
  const row = z.object({ path: relativePath, title: text, blocks: z.unknown() }).parse(document);
  const { parsePublicBlocks } = await import("@/cms/blocks/parse");
  return { path: row.path, title: row.title, blocks: parsePublicBlocks(row.blocks) };
}

const initialPageTitles: Record<string, string> = {
  '/': 'Главная', '/solutions/data-centers': 'Системы охлаждения ЦОД',
  '/solutions/fire-suppression': 'Системы пожаротушения',
};

/** Keep initial page metadata while honoring subsequent CMS title edits. */
export async function getCMSPageMetadata(path: string, fallback: Metadata): Promise<Metadata> {
  const page = await getCMSPage(path);
  if (!page || page.title === initialPageTitles[path]) return fallback;
  return { ...fallback, title: `${page.title} — HEISSKRAFT` };
}

/** A sitemap never inherits an authenticated preview session. */
export async function getPublishedCMSPaths(): Promise<string[]> {
  if (!cmsEnabled()) return [];
  const [categories, products, publishedArticles, pages] = await Promise.all([
    findAll("categories", { publicOnly: true }), findAll("products", { publicOnly: true, summary: true }),
    findAll("articles", { publicOnly: true }), findAll("pages", { publicOnly: true }),
  ]);
  const { getCatalogEntries } = await import("@/lib/catalog");
  const categoryPaths = getCatalogEntries(mapCategoryTree(categories)).map((entry) => entry.path.join("/"));
  const allowed = new Set(categoryPaths);
  return [
    ...categoryPaths.map((path) => `/catalog/${path}`),
    ...productSummaries(products).filter((product) => product.category && allowed.has(product.category.path)).map((product) => `/products/${product.slug}`),
    ...publishedArticles.map(mapArticle).map((article) => `/articles/${article.slug}`),
    ...pages.map((document) => z.object({ path: relativePath }).parse(document).path),
  ];
}

const defaultNavigation = [
  { href: '/catalog', label: 'Каталог' }, { href: '/articles', label: 'База знаний' },
  { href: '/designers', label: 'Проектировщикам' }, { href: '/selection', label: 'Подбор оборудования' },
];
export const getNavigationContent = cache(async () => {
  if (!cmsEnabled()) return defaultNavigation;
  const { payload, user } = await requestContext();
  const result = await payload.findGlobal({ slug: 'navigation', overrideAccess: false, user: user ?? undefined });
  return result.createdAt ? z.array(z.object({ label: text, href: relativePath })).parse(result.items ?? []) : defaultNavigation;
});
export const getSiteSettingsContent = cache(async () => {
  if (!cmsEnabled()) return { title: 'HEISSKRAFT', description: 'HEISSKRAFT' };
  const { payload, user } = await requestContext();
  const result = await payload.findGlobal({ slug: 'site-settings', overrideAccess: false, user: user ?? undefined });
  return { title: result.title || 'HEISSKRAFT', description: result.description || 'HEISSKRAFT' };
});

export async function redirectOldCMSPath(path: string) {
  if (!cmsEnabled()) return;
  const { resolvePublishedRedirect } = await import('@/cms/redirects');
  const target = await resolvePublishedRedirect(await getCMS(), path);
  if (target) {
    const { permanentRedirect } = await import('next/navigation');
    permanentRedirect(target);
  }
}

/** Omit unpublished pages and old CMS page URLs from the legacy baseline. */
export async function filterPublicCMSPaths(paths: string[]): Promise<string[]> {
  if (!cmsEnabled()) return paths;
  const payload = await getCMS();
  const [managed, aliases] = await Promise.all([
    payload.find({ collection: 'pages', depth: 0, pagination: false, limit: 10000, overrideAccess: true, select: { path: true, _status: true } }),
    payload.find({ collection: 'redirects', depth: 0, pagination: false, overrideAccess: false, select: { from: true } }),
  ]);
  const unpublished = new Set(managed.docs.filter(page => page._status !== 'published').map(page => page.path));
  const published = new Set(managed.docs.filter(page => page._status === 'published').map(page => page.path));
  // Category/product/article URLs come from public queries already. An unrelated
  // manual redirect must not remove a live system route from the sitemap.
  const oldPages = new Set(aliases.docs.map(alias => alias.from).filter(path => !/^\/(?:admin|api|catalog|products|articles)(?:\/|$)/.test(path)));
  return paths.filter(path => !unpublished.has(path) && (!oldPages.has(path) || published.has(path)));
}
