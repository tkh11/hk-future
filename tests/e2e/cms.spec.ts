import { randomBytes } from "node:crypto";
import { expect } from "@playwright/test";
import articleFixtures from "../../src/data/articles.json" with { type: "json" };
import { test } from "./cms-fixtures";

test.describe("CMS production REST and editor workflow", () => {
  test.skip(process.env.CMS_E2E !== "true", "Run with playwright.cms.config.ts against a prepared local CMS server.");

  test("roles reject anonymous writes, account creation, privilege changes and settings history", async ({ cms }) => {
    const { anonymous, editor, analyst, editorActor, editorID, suffix, payload } = cms;
    const registration = { email: `${suffix}-blocked@cms-e2e.invalid`, password: randomBytes(24).toString("hex"), role: "admin" };
    await cms.deniedCreate("users", await anonymous.post("/api/users/first-register", { data: registration }), 404);
    await cms.deniedCreate("users", await anonymous.post("/api/users", { data: registration }), 404);
    await cms.deniedCreate("users", await editor.post("/api/users", { data: registration }), 404);
    await cms.deniedCreate("categories", await anonymous.post("/api/categories", { data: { title: suffix, slug: suffix, art: "pipes", _status: "draft" } }), 404);
    const updated = await payload.update({ collection: "users", id: editorID, user: editorActor.user, overrideAccess: false, data: { role: "admin", name: "Редактор E2E" } });
    expect(updated.role).toBe("editor");
    for (const email of [`${suffix}-editor@cms-e2e.invalid`, `${suffix}-unknown@cms-e2e.invalid`]) {
      expect((await anonymous.post("/api/users/forgot-password", { data: { email } })).status()).toBe(404);
    }
    for (const slug of ["contacts", "navigation", "site-settings"]) {
      expect((await analyst.get(`/api/globals/${slug}/versions`)).status()).toBe(404);
      expect((await editor.post(`/api/globals/${slug}`, { data: {} })).status()).toBe(404);
    }
  });

  test("publishing and unpublishing updates new routes, search and sitemap without rebuilding", async ({ cms, page }) => {
    const { suffix, editorActor, publisherActor, anonymous } = cms;
    const category = await cms.create("categories", { title: `Категория ${suffix}`, slug: suffix, art: "pipes", _status: "published" }, publisherActor, false);
    const initialTitle = `Насос ${suffix}`;
    const draftTitle = `Проверенный насос ${suffix}`;
    const product = await cms.create("products", { title: initialTitle, slug: suffix, sku: suffix, category: category.id, description: "Тестовая запись удаляется после проверки.", productKind: "single", _status: "draft" });
    const route = `/products/${suffix}`;
    expect((await anonymous.get(route)).status()).toBe(404);
    await expect(cms.update("products", product.id, { _status: "published" }, editorActor)).rejects.toBeTruthy();
    await cms.update("products", product.id, { _status: "published" }, publisherActor);
    await page.goto(route);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(initialTitle);
    await cms.update("products", product.id, { title: draftTitle, _status: "draft" }, editorActor, true);
    await page.reload();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(initialTitle);
    await expect(cms.update("products", product.id, { title: draftTitle, _status: "draft" }, editorActor)).rejects.toBeTruthy();
    await cms.update("products", product.id, { _status: "published" }, publisherActor);
    await page.goto(`/catalog?q=${suffix}`);
    await expect(page.locator(`main a[href="${route}"]`)).toContainText(draftTitle);
    const sitemap = await anonymous.get("/sitemap.xml");
    expect(sitemap.status()).toBe(200);
    expect(await sitemap.text()).toContain(route);
    await cms.update("products", product.id, { _status: "draft" }, publisherActor);
    expect((await anonymous.get(route)).status()).toBe(404);
    await page.reload();
    await expect(page.locator(`main a[href="${route}"]`)).toHaveCount(0);
    expect(await (await anonymous.get("/sitemap.xml")).text()).not.toContain(route);
  });

  for (const collection of ["categories", "articles"] as const) {
    test(`new ${collection} routes render immediately and never cache an unpublished revision`, async ({ cms, page }) => {
      const { suffix, editorActor, publisherActor, anonymous } = cms;
      const initialTitle = `${collection === "categories" ? "Новая категория" : "Новая статья"} ${suffix}`;
      const revisedTitle = `Проверенная редакция ${suffix}`;
      let route: string;
      let data: Record<string, unknown>;
      if (collection === "categories") {
        const parentSlug = `${suffix}-parent`;
        const parent = await cms.create("categories", { title: `Родитель ${suffix}`, slug: parentSlug, art: "pipes", _status: "published" }, publisherActor, false);
        route = `/catalog/${parentSlug}/${suffix}`;
        data = { title: initialTitle, slug: suffix, parent: parent.id, art: "pipes", _status: "draft" };
      } else {
        route = `/articles/${suffix}`;
        data = { title: initialTitle, slug: suffix, _status: "draft", content: {
          ...structuredClone(articleFixtures[0]), title: initialTitle, slug: suffix,
          sections: [{ heading: "Раздел тестовой статьи", paragraphs: ["Материал создан только для проверки CMS и будет удалён."] }],
          faq: [], related: [], sources: [],
        } };
      }
      const doc = await cms.create(collection, data);
      expect((await page.goto(route))?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: initialTitle, exact: true })).toHaveCount(0);

      await cms.update(collection, doc.id, { _status: "published" }, publisherActor);
      expect((await page.goto(route))?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(initialTitle);
      expect(await (await anonymous.get("/sitemap.xml")).text()).toContain(route);

      await cms.update(collection, doc.id, { title: revisedTitle, _status: "draft" }, editorActor, true);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(initialTitle);
      await expect(page.getByRole("heading", { name: revisedTitle, exact: true })).toHaveCount(0);

      await cms.update(collection, doc.id, { _status: "published" }, publisherActor);
      expect((await page.reload())?.status()).toBe(200);
      await expect(page.locator("main h1")).toHaveText(revisedTitle);
      await expect(page).toHaveTitle(new RegExp(revisedTitle));

      await cms.update(collection, doc.id, { _status: "draft" }, publisherActor);
      expect((await page.reload())?.status()).toBe(404);
      await expect(page.getByRole("heading", { name: revisedTitle, exact: true })).toHaveCount(0);
      expect(await (await anonymous.get("/sitemap.xml")).text()).not.toContain(route);
    });
  }

  test("draft media stay private and metadata edits cannot replace published bytes", async ({ cms, baseURL }) => {
    const { suffix, editorActor, publisherActor, anonymous, payload } = cms;
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 100 100]>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000062 00000 n \n0000000121 00000 n \ntrailer\n<</Root 1 0 R /Size 4>>\nstartxref\n194\n%%EOF");
    await cms.deniedCreate("media", await anonymous.post("/api/media?draft=true", { multipart: { _payload: JSON.stringify({ alt: suffix }), file: { name: `${suffix}.pdf`, mimeType: "application/pdf", buffer: bytes } } }), 404);
    const media = await cms.upload(editorActor, `${suffix}.pdf`, bytes);
    expect(media.url).toBeTruthy();
    const fileURL = new URL(media.url!, baseURL);
    expect(fileURL.origin).toBe(new URL(baseURL!).origin);
    expect([403, 404]).toContain((await anonymous.get(fileURL.pathname)).status());
    expect((await anonymous.get(`/api/media/${media.id}`)).status()).toBe(404);
    await cms.update("media", media.id, { _status: "published" }, publisherActor);
    const file = await anonymous.get(fileURL.pathname);
    expect(file.status()).toBe(200);
    expect(await file.body()).toEqual(bytes);
    await cms.update("media", media.id, { alt: "Неопубликованные метаданные", _status: "draft" }, editorActor, true);
    await expect(payload.update({
      collection: "media",
      id: media.id,
      user: editorActor.user,
      overrideAccess: false,
      draft: true,
      data: { alt: "Замена", _status: "draft" },
      file: { data: Buffer.concat([bytes, Buffer.from("\n% replacement draft\n")]), mimetype: "application/pdf", name: `${suffix}.pdf`, size: bytes.length + 22 },
    })).rejects.toThrow(/создайте новую запись/);
    expect(await (await anonymous.get(fileURL.pathname)).body()).toEqual(bytes);
    expect((await anonymous.get(`/api/media/${media.id}`)).status()).toBe(404);
    const published = await payload.findByID({ collection: "media", id: media.id, overrideAccess: false });
    expect(published.alt).toBe("CMS E2E PDF");
  });

  test("authenticated preview preserves hidden and reordered blocks", async ({ cms, page }) => {
    const { suffix, editorActor, publisherActor, anonymous } = cms;
    const route = `/${suffix}`;
    const hero = { blockType: "hero", heading: `Предпросмотр ${suffix}`, description: "Черновик новой страницы" };
    const first = { blockType: "text", heading: "Первый блок E2E", text: "Первый абзац" };
    const second = { blockType: "text", heading: "Второй блок E2E", text: "Второй абзац" };
    const hidden = { blockType: "text", heading: "Скрытый блок E2E", text: "Не должен попасть в HTML", hidden: true };
    const doc = await cms.create("pages", { title: suffix, path: route, blocks: [hero, first, second, hidden], _status: "draft" });
    expect((await anonymous.get(route)).status()).toBe(404);
    expect((await anonymous.get(`/api/preview?collection=pages&id=${doc.id}`, { maxRedirects: 0 })).status()).toBe(403);

    await page.context().addCookies(cms.cookies(editorActor));
    await cms.update("pages", doc.id, { blocks: [hero, second, { ...first, hidden: true }, { ...hidden, hidden: false }], _status: "draft" }, editorActor, true);
    await page.goto(`/api/preview?collection=pages&id=${doc.id}`);
    await expect(page).toHaveURL(new RegExp(`${route}$`));
    await expect(page.locator("main h1")).toHaveText(hero.heading);
    await expect(page.locator("main h2")).toHaveText([second.heading, hidden.heading]);
    await expect(page.getByText(first.text, { exact: true })).toHaveCount(0);
    await expect(page.locator("main")).not.toContainText("Первый блок E2E");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
    expect((await anonymous.get(route)).status()).toBe(404);
    expect(await (await page.request.get("/sitemap.xml")).text()).not.toContain(route);

    const previewCookies = (await page.context().cookies()).filter(cookie => cookie.name !== "payload-token");
    await page.context().clearCookies();
    await page.context().addCookies(previewCookies);
    expect((await page.goto(route))?.status()).toBe(404);
    await expect(page.getByRole("heading", { name: hero.heading, exact: true })).toHaveCount(0);
    await cms.update("pages", doc.id, { _status: "published" }, publisherActor);
    await page.goto(route);
    await expect(page.locator("main h1")).toHaveText(hero.heading);
    await expect(page.locator("main h2")).toHaveText([second.heading, hidden.heading]);

  });
});
