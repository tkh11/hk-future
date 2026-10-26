import "server-only";

import { cache } from "react";
import { z } from "zod";
import { cmsEnabled } from "@/cms/env";
import { getCMS } from "@/cms/client";
import { getPreviewUser } from "@/cms/preview";
import { catalog } from "./catalog";
import { articles } from "./articles";
import { contacts } from "./contacts";
import * as pageCopy from "./solution-pages";
import { coolingProducts, fireProducts, fireStations } from "./solutions";
import type { CatalogNode } from "@/lib/catalog";

// DTO schemas deliberately strip unknown fields. Never pass Payload documents,
// internal IDs, auth metadata or uploaded-file internals into client components.
const text = z.string();
const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/);
const relativePath = z.string().regex(/^\/(?!\/)[^\\\u0000-\u0020]*$/);
const httpURL = z.string().url().refine((value) => /^https?:\/\//.test(value));
const assetURL = z.union([relativePath, httpURL]);
const relationID = z.union([z.string(), z.number()]);
const art = z.enum(["pipes", "layers", "pump", "circulation", "borehole", "drainage", "station", "automation", "auxiliary"]);
const media = z.object({ url: assetURL, alt: text.nullish(), filename: text.nullish() });
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

const productDescription = z.object({
  id: text, label: text, title: text, text, image: assetURL, alt: text,
  detail: text.optional(), badge: assetURL.optional(),
});
const stringObject = <T extends Record<string, string>>(sample: T) => z.object(Object.fromEntries(Object.keys(sample).map((key) => [key, text])) as { [K in keyof T]: z.ZodString });
const propertyRows = z.array(z.tuple([text, text]));
export const solutionSchema = z.object({
  dcHero: stringObject(pageCopy.dcHero), fireHero: stringObject(pageCopy.fireHero),
  dcIntro: stringObject(pageCopy.dcIntro), fireIntro: stringObject(pageCopy.fireIntro),
  dcProducts: z.object({
    heading: text, headingAccent: text, description: text, pipeTitle: text, pipeDescription: text,
    pumpTitle: text, pumpTitleSecondLine: text, pumpDescription: text, projectNote: text,
    ctaTitle: text, ctaTitleSecondLine: text, pipeProperties: propertyRows, pumpProperties: propertyRows,
  }),
  firePageProducts: stringObject(pageCopy.firePageProducts),
  coolingProducts: z.array(productDescription.extend({ id: z.enum(["pipes", "pumps", "valves"]) })),
  fireProducts: z.array(productDescription.extend({ id: z.enum(["station", "pipework", "sprinkler", "hydrants", "flange"]) })),
  fireStations: z.array(z.object({ id: z.enum(["fpa", "fpv"]), name: text, application: text, description: text })),
});
export type SolutionContent = z.infer<typeof solutionSchema>;

const attribute = z.object({
  key: text, label: text, valueType: z.enum(["text", "number", "boolean"]),
  textValue: text.nullish(), numberValue: z.number().nullish(), booleanValue: z.boolean().nullish(), unit: text.nullish(),
});
const productDocument = z.object({
  slug, sku: text, title: text, description: text.nullish(), image: populatedMedia,
  category: z.object({ path: text, title: text }).nullish().catch(undefined),
  series: z.object({ slug, title: text }).nullish().catch(undefined),
  attributes: z.array(attribute).nullish(), documents: z.array(z.unknown()).nullish(),
});
export function mapProduct(document: unknown) {
  const row = productDocument.parse(document);
  return {
    slug: row.slug, sku: row.sku, title: row.title, description: row.description ?? "",
    image: row.image ? { url: row.image.url, alt: row.image.alt ?? row.title } : null,
    category: row.category ? { title: row.category.title, path: row.category.path } : null,
    series: row.series ? { slug: row.series.slug, title: row.series.title } : null,
    attributes: (row.attributes ?? []).flatMap((entry) => {
      const raw = entry.valueType === "number" ? entry.numberValue : entry.valueType === "boolean" ? entry.booleanValue : entry.textValue;
      if (raw == null) return [];
      return [{ key: entry.key, label: entry.label, value: typeof raw === "boolean" ? (raw ? "Да" : "Нет") : String(raw), unit: entry.unit ?? "" }];
    }),
    documents: (row.documents ?? []).flatMap((value) => {
      const parsed = media.safeParse(value);
      return parsed.success ? [{ url: parsed.data.url, title: parsed.data.alt || parsed.data.filename || "Документ" }] : [];
    }),
  };
}
export type PublicProduct = ReturnType<typeof mapProduct>;

// React cache is request-scoped: no preview data or authenticated user may enter
// a shared persistent cache. The Local API bypasses access checks by default,
// so every request below explicitly enables them.
const requestContext = cache(async () => {
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
    const result = await payload.find({
      collection, depth: 1, limit: 200, page,
      overrideAccess: false, user: user ?? undefined, draft: Boolean(user),
      where: { and: [...(user ? [] : [publishedOnly]), ...(options.where ? [options.where] : [])] },
      sort: collection === "categories" ? "sortOrder" : "createdAt",
      ...(options.summary ? { select: { slug: true, sku: true, title: true, image: true, category: true, series: true } as const } : {}),
    });
    rows.push(...result.docs);
    hasNextPage = result.hasNextPage;
    page += 1;
  }
  return rows;
}

export const getCatalogContent = cache(async (): Promise<CatalogNode[]> => {
  if (!cmsEnabled()) return catalog;
  return mapCategoryTree(await findAll("categories"));
});

export const getArticlesContent = cache(async () => {
  if (!cmsEnabled()) return articles;
  return (await findAll("articles")).map(mapArticle);
});
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

export type PublicProductSummary = Pick<PublicProduct, "slug" | "sku" | "title" | "image" | "category" | "series">;
function productSummary(document: unknown): PublicProductSummary {
  const { slug, sku, title, image, category, series } = mapProduct(document);
  return { slug, sku, title, image, category, series };
}
async function visibleCategoryPaths() {
  const { getCatalogEntries } = await import("@/lib/catalog");
  return new Set(getCatalogEntries(await getCatalogContent()).map((entry) => entry.path.join("/")));
}
export const getProductSummariesContent = cache(async (): Promise<PublicProductSummary[]> => {
  if (!cmsEnabled()) return [];
  const visible = await visibleCategoryPaths();
  return (await findAll("products", { summary: true })).map(productSummary).filter((product) => product.category && visible.has(product.category.path));
});
export async function getProductContent(productSlug: string) {
  if (!cmsEnabled()) return undefined;
  const [document] = await findAll("products", { where: { slug: { equals: productSlug } } });
  if (!document) return undefined;
  const product = mapProduct(document);
  return product.category && (await visibleCategoryPaths()).has(product.category.path) ? product : undefined;
}

export async function getCMSPage(path: string) {
  if (!cmsEnabled()) return null;
  const [document] = await findAll("pages", { where: { path: { equals: path } } });
  if (!document) return null;
  const row = z.object({ path: relativePath, title: text, blocks: z.unknown() }).parse(document);
  const { parsePublicBlocks } = await import("@/cms/blocks/parse");
  return { path: row.path, title: row.title, blocks: parsePublicBlocks(row.blocks) };
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
    ...products.map(productSummary).filter((product) => product.category && allowed.has(product.category.path)).map((product) => `/products/${product.slug}`),
    ...publishedArticles.map(mapArticle).map((article) => `/articles/${article.slug}`),
    ...pages.map((document) => z.object({ path: relativePath }).parse(document).path),
  ];
}
