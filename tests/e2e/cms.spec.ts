import { randomBytes } from "node:crypto";
import { expect } from "@playwright/test";
import articleFixtures from "../../src/data/articles.json" with { type: "json" };
import { test, readDocument } from "./cms-fixtures";

test.describe("CMS production REST and editor workflow", () => {
  test.skip(process.env.CMS_E2E !== "true", "Run with playwright.cms.config.ts against a prepared local CMS server.");

  test("roles reject anonymous writes, account creation, privilege changes and settings history", async ({ cms }) => {
    const { anonymous, editor, analyst, editorID, suffix } = cms;
    const registration = { email: `${suffix}-blocked@cms-e2e.invalid`, password: randomBytes(24).toString("hex"), role: "admin" };
    await cms.deniedCreate("users", await anonymous.post("/api/users/first-register", { data: registration }), 404);
    await cms.deniedCreate("users", await anonymous.post("/api/users", { data: registration }), 403);
    await cms.deniedCreate("users", await editor.post("/api/users", { data: registration }), 403);
    await cms.deniedCreate("categories", await anonymous.post("/api/categories", { data: { title: suffix, slug: suffix, art: "pipes", _status: "draft" } }), 403);
    const updated = await readDocument(await editor.patch(`/api/users/${editorID}`, { data: { role: "admin", name: "Редактор E2E" } }), 200);
    expect(updated.role).toBe("editor");
    for (const email of [`${suffix}-editor@cms-e2e.invalid`, `${suffix}-unknown@cms-e2e.invalid`]) {
      expect((await anonymous.post("/api/users/forgot-password", { data: { email } })).status()).toBe(503);
    }
    for (const slug of ["contacts", "navigation", "site-settings"]) {
      expect((await analyst.get(`/api/globals/${slug}/versions`)).status()).toBe(403);
      expect((await editor.post(`/api/globals/${slug}`, { data: {} })).status()).toBe(403);
    }
  });

  test("publishing and unpublishing updates new routes, search and sitemap without rebuilding", async ({ cms, page }) => {
    const { suffix, editor, publisher, anonymous } = cms;
    const category = await cms.create("categories", { title: `Категория ${suffix}`, slug: suffix, art: "pipes", _status: "published" }, publisher, false);
    const initialTitle = `Насос ${suffix}`;
    const draftTitle = `Проверенный насос ${suffix}`;
    const product = await cms.create("products", { title: initialTitle, slug: suffix, sku: suffix, category: category.id, description: "Тестовая запись удаляется после проверки.", _status: "draft" });
    const route = `/products/${suffix}`;
    expect((await anonymous.get(route)).status()).toBe(404);
    expect((await editor.patch(`/api/products/${product.id}`, { data: { _status: "published" } })).status()).toBe(403);
    await readDocument(await publisher.patch(`/api/products/${product.id}`, { data: { _status: "published" } }), 200);
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(initialTitle);
    await readDocument(await editor.patch(`/api/products/${product.id}?draft=true`, { data: { title: draftTitle, _status: "draft" } }), 200);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(initialTitle);
    expect((await editor.patch(`/api/products/${product.id}`, { data: { title: draftTitle, _status: "draft" } })).status()).toBe(403);
    await readDocument(await publisher.patch(`/api/products/${product.id}`, { data: { _status: "published" } }), 200);
    await page.goto(`/catalog?q=${suffix}`);
    await expect(page.locator(`main a[href="${route}"]`)).toContainText(draftTitle);
    const sitemap = await anonymous.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain(route);
    await readDocument(await publisher.patch(`/api/products/${product.id}`, { data: { _status: "draft" } }), 200);
    expect((await anonymous.get(route)).status()).toBe(404);
    await page.reload();
    await expect(page.locator(`main a[href="${route}"]`)).toHaveCount(0);
    expect(await (await anonymous.get("/sitemap.xml")).text()).not.toContain(route);
  });

  for (const collection of ["categories", "articles"] as const) {
    test(`new ${collection} routes render immediately and never cache an unpublished revision`, async ({ cms, page }) => {
      const { suffix, editor, publisher, anonymous } = cms;
      const initialTitle = `${collection === "categories" ? "Новая категория" : "Новая статья"} ${suffix}`;
      const revisedTitle = `Проверенная редакция ${suffix}`;
      let route: string;
      let data: Record<string, unknown>;
      if (collection === "categories") {
        const parentSlug = `${suffix}-parent`;
        const parent = await cms.create("categories", { title: `Родитель ${suffix}`, slug: parentSlug, art: "pipes", _status: "published" }, publisher, false);
        route = `/catalog/${parentSlug}/${suffix}`;
        data = { title: initialTitle, slug: suffix, parent: parent.id, art: "pipes", _status: "draft" };
      } else {
        route = `/articles/${suffix}`;
        // Clone public source content, never a live document with database row IDs.
        data = { title: initialTitle, slug: suffix, _status: "draft", content: {
          ...structuredClone(articleFixtures[0]), title: initialTitle, slug: suffix,
          sections: [{ heading: "Раздел тестовой статьи", paragraphs: ["Материал создан только для проверки CMS и будет удалён."] }],
          faq: [], related: [], sources: [],
        } };
      }
      const doc = await cms.create(collection, data);
      expect((await page.goto(route))?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: initialTitle, exact: true })).toHaveCount(0);

      await readDocument(await publisher.patch(`/api/${collection}/${doc.id}`, { data: { _status: "published" } }), 200);
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(initialTitle);
      expect(await (await anonymous.get("/sitemap.xml")).text()).toContain(route);

      await readDocument(await editor.patch(`/api/${collection}/${doc.id}?draft=true`, { data: { title: revisedTitle, _status: "draft" } }), 200);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(initialTitle);
      await expect(page.getByRole("heading", { name: revisedTitle, exact: true })).toHaveCount(0);

      await readDocument(await publisher.patch(`/api/${collection}/${doc.id}`, { data: { _status: "published" } }), 200);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(revisedTitle);
      await expect(page).toHaveTitle(new RegExp(revisedTitle));

      await readDocument(await publisher.patch(`/api/${collection}/${doc.id}`, { data: { _status: "draft" } }), 200);
      expect((await page.reload())?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: revisedTitle, exact: true })).toHaveCount(0);
      expect(await (await anonymous.get("/sitemap.xml")).text()).not.toContain(route);
    });
  }

  test("draft media stay private and metadata edits cannot replace published bytes", async ({ cms, baseURL }) => {
    const { suffix, editor, publisher, anonymous } = cms;
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 100 100]>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000062 00000 n \n0000000121 00000 n \ntrailer\n<</Root 1 0 R /Size 4>>\nstartxref\n194\n%%EOF");
    await cms.deniedCreate("media", await anonymous.post("/api/media?draft=true", { multipart: { _payload: JSON.stringify({ alt: suffix }), file: { name: `${suffix}.pdf`, mimeType: "application/pdf", buffer: bytes } } }), 403);
    const media = await cms.upload(editor, `${suffix}.pdf`, bytes);
    expect(media.url).toBeTruthy();
    const fileURL = new URL(media.url!, baseURL);
    expect(fileURL.origin).toBe(new URL(baseURL!).origin);
    expect([403, 404]).toContain((await anonymous.get(fileURL.pathname)).status());
    expect((await anonymous.get(`/api/media/${media.id}`)).status()).toBe(404);
    await readDocument(await publisher.patch(`/api/media/${media.id}`, { data: { _status: "published" } }), 200);
    const file = await anonymous.get(fileURL.pathname);
    expect(file.status()).toBe(200);
    expect(await file.body()).toEqual(bytes);
    await readDocument(await editor.patch(`/api/media/${media.id}?draft=true`, { data: { alt: "Неопубликованные метаданные", _status: "draft" } }), 200);
    const replacement = await editor.patch(`/api/media/${media.id}?draft=true`, { multipart: { _payload: JSON.stringify({ alt: "Замена", _status: "draft" }), file: { name: `${suffix}.pdf`, mimeType: "application/pdf", buffer: Buffer.concat([bytes, Buffer.from("\n% replacement draft\n")]) } } });
    expect(replacement.status()).toBe(400);
    expect((await replacement.json()).errors?.[0]?.message).toContain("создайте новую запись");
    expect(await (await anonymous.get(fileURL.pathname)).body()).toEqual(bytes);
    const metadata = await anonymous.get(`/api/media/${media.id}`);
    expect(metadata.status()).toBe(200);
    expect((await metadata.json()).alt).toBe("CMS E2E PDF");
  });

  test("editor controls and authenticated preview preserve hidden and reordered blocks", async ({ cms, page }) => {
    const { suffix, editor, publisher, anonymous } = cms;
    const route = `/${suffix}`;
    const hero = { blockType: "hero", heading: `Предпросмотр ${suffix}`, description: "Черновик новой страницы" };
    const first = { blockType: "text", heading: "Первый блок E2E", text: "Первый абзац" };
    const second = { blockType: "text", heading: "Второй блок E2E", text: "Второй абзац" };
    const hidden = { blockType: "text", heading: "Скрытый блок E2E", text: "Не должен попасть в HTML", hidden: true };
    const doc = await cms.create("pages", { title: suffix, path: route, blocks: [hero, first, second, hidden], _status: "draft" });
    expect((await anonymous.get(route)).status()).toBe(404);
    expect((await anonymous.get(`/api/preview?collection=pages&id=${doc.id}`, { maxRedirects: 0 })).status()).toBe(403);

    await page.context().addCookies((await editor.storageState()).cookies);
    await page.goto(`/admin/collections/pages/${doc.id}`);
    const title = page.locator('input[name="title"]');
    await expect(title).toBeEditable();
    await title.fill(`${suffix} изменён в панели`);
    await expect(page.getByRole("button", { name: "Опубликовать изменения", exact: true })).toBeDisabled();
    await expect.poll(async () => (await readDocument(await editor.get(`/api/pages/${doc.id}?draft=true`), 200, false)).title).toBe(`${suffix} изменён в панели`);
    await expect(page.getByRole("button", { name: "Отменить публикацию", exact: true })).toHaveCount(0);

    await readDocument(await editor.patch(`/api/pages/${doc.id}?draft=true&overrideLock=true`, { data: { blocks: [hero, second, { ...first, hidden: true }, { ...hidden, hidden: false }], _status: "draft" } }), 200);
    await page.goto(`/api/preview?collection=pages&id=${doc.id}`);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("main h1")).toHaveText(hero.heading);
    await expect(page.locator("main h2")).toHaveText([second.heading, hidden.heading]);
    await expect(page.getByText(first.text, { exact: true })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Первый блок E2E");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await anonymous.get(route)).status()).toBe(404);
    expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain(route);

    // A Next preview cookie is insufficient after the Payload authentication cookie is removed.
    const previewCookies = (await page.context().cookies()).filter(cookie => cookie.name !== "payload-token");
    await page.context().clearCookies();
    await page.context().addCookies(previewCookies);
    expect((await page.goto(route))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: hero.heading, exact: true })).toHaveCount(0);
    await readDocument(await publisher.patch(`/api/pages/${doc.id}?overrideLock=true`, { data: { _status: "published" } }), 200);
    await page.goto(route);
    await expect(page.locator("main h1")).toHaveText(hero.heading);
    await expect(page.locator("main h2")).toHaveText([second.heading, hidden.heading]);

    await page.context().addCookies((await editor.storageState()).cookies);
    await page.goto(`/admin/collections/pages/${doc.id}`);
    await expect(page.locator('input[name="title"]')).toBeEditable();
    await expect(page.getByRole("button", { name: "Опубликовать изменения", exact: true })).toBeDisabled();
    await page.locator(".doc-controls__popup .popup__trigger-wrap button").click();
    await expect(page.locator("#action-create")).toBeVisible();
    await expect(page.locator("#action-unpublish")).toHaveCount(0);
    await expect(page.locator("#action-delete")).toHaveCount(0);
  });
});
