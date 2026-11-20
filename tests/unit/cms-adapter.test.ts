import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ enabled: false, find: vi.fn(), findGlobal: vi.fn(), getCMS: vi.fn(), preview: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("next/server", () => ({ connection: vi.fn().mockResolvedValue(undefined) }));
vi.mock("@/cms/env", () => ({ cmsEnabled: () => mocks.enabled }));
vi.mock("@/cms/client", () => ({ getCMS: mocks.getCMS }));
vi.mock("@/cms/preview", () => ({ getPreviewUser: mocks.preview }));

import { contactsSchema, getCatalogContent, getContactsContent, getProductSummariesContent, getPublishedCMSPaths, mapArticle, mapCategoryTree, mapProduct, solutionSchema } from "@/content/cms-adapter";
import { catalog } from "@/content/catalog";
import { contacts } from "@/content/contacts";
import { articles } from "@/content/articles";
import * as pages from "@/content/solution-pages";
import { coolingProducts, fireProducts, fireStations } from "@/content/solutions";

const category = (id: number, slug: string, parent: number | null = null, path = slug) => ({ id, slug, title: slug, parent, path, art: "pipes", sortOrder: id });

beforeEach(() => {
  mocks.enabled = false;
  vi.clearAllMocks();
  mocks.getCMS.mockResolvedValue({ find: mocks.find, findGlobal: mocks.findGlobal });
  mocks.preview.mockResolvedValue(null);
});

describe("public CMS content boundary", () => {
  it("keeps the existing local content available without initializing Payload", async () => {
    expect(await getCatalogContent()).toEqual(catalog);
    expect(await getContactsContent()).toEqual(contacts);
    expect(mocks.getCMS).not.toHaveBeenCalled();
  });

  it("strips internal fields and hides children whose parent is not publicly available", () => {
    const tree = mapCategoryTree([
      { ...category(1, "pipelines"), email: "secret@example.com", salt: "hidden" },
      category(2, "therm", 1, "pipelines/therm"),
      category(3, "secret-child", 99, "private/secret-child"),
      category(4, "bad-path", 1, "bad-path"),
    ]);
    expect(tree).toEqual([{ slug: "pipelines", title: "pipelines", art: "pipes", children: [{ slug: "therm", title: "therm", art: "pipes" }] }]);
  });

  it("does not hang or publish malformed cyclic category structures", () => {
    expect(mapCategoryTree([category(1, "one", 2, "two/one"), category(2, "two", 1, "one/two")])).toEqual([]);
  });

  it("takes the cover from the gallery and drops unsafe or private data", () => {
    const product = mapProduct({
      slug: "pipe", sku: "0001", title: "Труба", externalId: "erp-secret", createdBy: { email: "secret@example.com" },
      resources: [{ label: 'Архивное видео', url: 'https://example.test/archive-video', visible: true }],
      category: { path: "pipelines/therm", title: "Therm", secret: "private" },
      gallery: [
        { file: { url: "javascript:alert(1)" }, role: "main" },
        { file: { url: "/api/media/file/side.png", alt: "Сбоку", privateKey: "hidden" }, role: "gallery" },
        { file: { url: "/api/media/file/drawing.png", alt: "Чертёж" }, role: "technical" },
      ],
    });
    expect(product.image).toEqual({ url: "/api/media/file/side.png", alt: "Сбоку" });
    expect(product.gallery.map(item => item.role)).toEqual(["gallery", "technical"]);
    expect(mapProduct({ slug: "p", title: "T", gallery: [{ file: { url: "/a.png" }, role: "gallery" }, { file: { url: "/b.png" }, role: "main" }] }).image?.url).toBe("/b.png");
    expect(JSON.stringify(product)).not.toMatch(/erp-secret|privateKey|secret@example/);
    expect(product).not.toHaveProperty('resources');
    expect(JSON.stringify(product)).not.toContain('archive-video');
  });

  it("accepts all original solution and article content without copy changes", () => {
    expect(solutionSchema.parse({ ...pages, coolingProducts, fireProducts, fireStations })).toEqual({ ...pages, coolingProducts, fireProducts, fireStations });
    for (const article of articles) expect(mapArticle({ slug: article.slug, title: article.title, content: article })).toEqual(article);
  });

  it('uses public document previews and excludes hidden or unpublished attachments', () => {
    const file = { id: 10, url: '/api/media/file/catalog.pdf', filename: 'catalog.pdf', mimeType: 'application/pdf', filesize: 1024, _status: 'published' };
    const document = { id: 7, title: 'Каталог', _status: 'published', file, cover: { ...file, id: 11, filename: 'cover.webp', url: '/api/media/file/cover.webp', mimeType: 'image/webp' } };
    const product = mapProduct({ slug: 'pipe', title: 'Труба', catalogDocuments: [
      { document }, { document, visible: false }, { document: { ...document, id: 8, _status: 'draft' } },
      { document: { ...document, id: 9, file: { ...file, _status: 'draft' } } },
    ] });
    expect(product.previewDocuments).toEqual([{ id: '7', title: 'Каталог', kind: 'Документ', bytes: 1024,
      cover: '/docs/file/7?cover=1', preview: '/docs/file/7', download: '/docs/file/7?download=1' }]);
  });

  it("rejects active URL schemes and untrusted map embedding in CMS contacts", () => {
    expect(contactsSchema.safeParse({ ...contacts, messengers: [{ name: "bad", href: "javascript:alert(1)", icon: "/icon.png" }] }).success).toBe(false);
    expect(contactsSchema.safeParse({ ...contacts, mapEmbed: "https://evil.example/map-widget/v1/" }).success).toBe(false);
  });

  it("paginates with access checks and never falls back to local content after a CMS failure", async () => {
    mocks.enabled = true;
    mocks.find.mockResolvedValueOnce({ docs: [category(1, "pipelines")], hasNextPage: true }).mockResolvedValueOnce({ docs: [category(2, "therm", 1, "pipelines/therm")], hasNextPage: false });
    const tree = await getCatalogContent();
    expect(tree[0].children?.[0].slug).toBe("therm");
    expect(mocks.find).toHaveBeenNthCalledWith(1, expect.objectContaining({ overrideAccess: false, user: undefined, draft: false, page: 1, where: { and: [{ _status: { equals: "published" } }] } }));
    expect(mocks.find).toHaveBeenNthCalledWith(2, expect.objectContaining({ page: 2, overrideAccess: false }));
    mocks.find.mockRejectedValueOnce(new Error("Database unavailable"));
    await expect(getCatalogContent()).rejects.toThrow("Database unavailable");
  });

  it("allows a verified preview reader while keeping sitemap queries strictly anonymous", async () => {
    mocks.enabled = true;
    const user = { id: 8, role: "editor" };
    mocks.preview.mockResolvedValue(user);
    mocks.find.mockResolvedValue({ docs: [], hasNextPage: false });
    await getCatalogContent();
    expect(mocks.find).toHaveBeenLastCalledWith(expect.objectContaining({ overrideAccess: false, user, draft: true }));
    mocks.find.mockClear();
    await getPublishedCMSPaths();
    expect(mocks.find).toHaveBeenCalledTimes(4);
    for (const [query] of mocks.find.mock.calls) expect(query).toEqual(expect.objectContaining({ overrideAccess: false, user: undefined, draft: false, where: { and: [{ _status: { equals: "published" } }] } }));
  });

  it("keeps the catalog usable when preview includes unfinished product drafts", async () => {
    mocks.enabled = true;
    const user = { id: 8, role: "editor" };
    mocks.preview.mockResolvedValue(user);
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.find.mockImplementation(async ({ collection }) => ({ docs: collection === "categories" ? [category(1, "pipelines")] : [
      { id: 9, _status: "draft", slug: null, sku: null, title: null },
      { id: 10, _status: "draft", slug: "", sku: "", title: "" },
      { id: 11, _status: "draft", slug: "valid-pipe", sku: "HK-1", title: "Труба", category: { path: "pipelines", title: "Трубы" } },
    ], hasNextPage: false }));
    expect(await getProductSummariesContent()).toEqual([expect.objectContaining({ slug: "valid-pipe", title: "Труба" })]);
    expect(mocks.find).toHaveBeenLastCalledWith(expect.objectContaining({ overrideAccess: false, user, draft: true }));
  });

  it("omits malformed product URLs from the public sitemap without hiding valid products", async () => {
    mocks.enabled = true;
    vi.spyOn(console, "warn").mockImplementation(() => {});
    mocks.find.mockImplementation(async ({ collection }) => ({ docs: collection === "categories" ? [category(1, "pipelines")] : collection === "products" ? [
      { id: 9, slug: null, sku: null, title: null },
      { id: 11, slug: "valid-pipe", sku: "HK-1", title: "Труба", category: { path: "pipelines", title: "Трубы" } },
    ] : [], hasNextPage: false }));
    expect(await getPublishedCMSPaths()).toEqual(["/catalog/pipelines", "/products/valid-pipe"]);
  });
});
