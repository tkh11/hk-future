import { after, before, describe, it } from "node:test";
import assert from "node:assert/strict";
import { randomBytes } from "node:crypto";
import { mkdtemp, readdir, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { Pool } from "pg";
import { getPayload, type Payload } from "payload";
import type { Category, Media, User } from "../../src/cms/payload-types";

/** Real PostgreSQL permission checks. Never reuse or migrate a development database. */
describe("Payload permissions against an isolated migrated PostgreSQL database", { concurrency: false, timeout: 120_000 }, () => {
  let payload: Payload;
  let adminPool: Pool;
  let databaseName = "";
  let uploads = "";
  let admin: User;
  let editor: User;
  let publisher: User;
  let analyst: User;
  let published: Category;
  let draft: Category;
  let draftFile: Media;

  before(async () => {
    const connection = process.env.CMS_TEST_DATABASE_URL;
    assert.ok(connection, "Use scripts/cms/test-access.mjs or set CMS_TEST_DATABASE_URL to a new local hk_test_access_* database.");
    const url = new URL(connection);
    databaseName = url.pathname.slice(1);
    assert.ok(["127.0.0.1", "localhost", "[::1]"].includes(url.hostname), "Integration tests only allow local PostgreSQL.");
    assert.match(databaseName, /^hk_test_access_[a-z0-9_]{8,48}$/u, "The target must be a dedicated disposable test database.");
    const maintenanceURL = new URL(url); maintenanceURL.pathname = "/postgres";
    adminPool = new Pool({ connectionString: maintenanceURL.toString(), max: 1 });
    const existing = await adminPool.query("SELECT 1 FROM pg_database WHERE datname = $1", [databaseName]);
    assert.equal(existing.rowCount, 0, "Refusing to modify an existing database, even one with a test prefix.");
    await adminPool.query(`CREATE DATABASE "${databaseName}"`);
    uploads = await mkdtemp(path.join(tmpdir(), "hk-cms-access-"));
    process.env.CMS_ENABLED = "true";
    process.env.GITHUB_PAGES = "false";
    process.env.DATABASE_URL = url.toString();
    process.env.CMS_SERVER_URL = "http://localhost:3309";
    process.env.PAYLOAD_SECRET = randomBytes(48).toString("hex");
    delete process.env.S3_BUCKET;
    delete process.env.CMS_GATEWAY_SECRET;
    const migrationDir = path.resolve("src/cms/migrations");
    const migrationFiles = await readdir(migrationDir);
    assert.ok(migrationFiles.some(file => file.endsWith(".ts") && file !== "index.ts"), "Commit a real schema migration before running integration tests.");
    const { default: configPromise } = await import("../../payload.config");
    const config = await configPromise;
    const media = config.collections.find(collection => collection.slug === "media");
    assert.ok(media?.upload && typeof media.upload === "object");
    media.upload.staticDir = uploads;
    payload = await getPayload({ config });
    await payload.db.migrate();
    async function createUser(role: User["role"]) {
      return payload.create({ collection: "users", overrideAccess: true, data: { email: `${role}@access-test.invalid`, password: randomBytes(24).toString("hex"), role, name: role } });
    }
    admin = await createUser("admin"); editor = await createUser("editor");
    publisher = await createUser("publisher"); analyst = await createUser("analyst");
    published = await payload.create({ collection: "categories", overrideAccess: false, user: publisher, data: { title: "Публичная категория", slug: "published", art: "pipes", _status: "published" } });
    draft = await payload.create({ collection: "categories", overrideAccess: false, user: editor, draft: true, data: { title: "Приватный черновик", slug: "private-draft", art: "pipes", _status: "draft" } });
    const pdf = Buffer.from("%PDF-1.4\n1 0 obj\n<</Type /Catalog /Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type /Pages /Kids [3 0 R] /Count 1>>\nendobj\n3 0 obj\n<</Type /Page /Parent 2 0 R /MediaBox [0 0 100 100]>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000009 00000 n \n0000000062 00000 n \n0000000121 00000 n \ntrailer\n<</Root 1 0 R /Size 4>>\nstartxref\n194\n%%EOF");
    draftFile = await payload.create({ collection: "media", overrideAccess: false, user: editor, draft: true, data: { title: "Private PDF", alt: "Приватный файл", _status: "draft" }, file: { data: pdf, size: pdf.length, name: "private.pdf", mimetype: "application/pdf" } });
  });

  after(async () => {
    // Payload 3.92 keeps a PostgreSQL connect probe checked out. The runner
    // force-exits only after tests finish, then drops this unique database.
    if (payload) await payload.destroy();
    if (adminPool) await adminPool.end();
    if (uploads) await rm(uploads, { recursive: true, force: true });
  });

  it("anonymous Local API reads expose only published documents, including draft=true probes", async () => {
    const publicResult = await payload.find({ collection: "categories", overrideAccess: false, depth: 0 });
    assert.deepEqual(publicResult.docs.map(doc => doc.id), [published.id]);
    const draftProbe = await payload.find({ collection: "categories", overrideAccess: false, draft: true, depth: 0 });
    assert.equal(draftProbe.docs.some(doc => doc.id === draft.id), false);
    await assert.rejects(payload.findByID({ collection: "categories", id: draft.id, overrideAccess: false }));
  });

  it("anonymous readers cannot read draft media metadata or version history", async () => {
    await assert.rejects(payload.findByID({ collection: "media", id: draftFile.id, overrideAccess: false }));
    const media = await payload.find({ collection: "media", overrideAccess: false });
    assert.equal(media.docs.length, 0);
    await assert.rejects(payload.findVersions({ collection: "categories", overrideAccess: false }));
  });

  it("media bytes stay immutable across draft metadata edits, replacements, and duplicate filenames", async () => {
    const bytes = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\nxref\ntrailer\n%%EOF");
    const publicFile = await payload.create({ collection: "media", overrideAccess: false, user: publisher, data: { title: "Публичный документ", alt: "Публичный файл", _status: "published" }, file: { data: bytes, size: bytes.length, name: "published.pdf", mimetype: "application/pdf" } });
    assert.ok(publicFile.filename);
    const before = await readFile(path.join(uploads, publicFile.filename));
    for (const alt of ["Первый черновик метаданных", "Второй черновик метаданных"]) {
      const updated = await payload.update({ collection: "media", id: publicFile.id, user: editor, overrideAccess: false, draft: true, data: { alt, _status: "draft" } });
      assert.equal(updated.alt, alt);
      assert.equal(updated._status, "draft");
      assert.deepEqual(await readFile(path.join(uploads, publicFile.filename)), before);
    }
    const replacement = Buffer.from("%PDF-1.4\n1 0 obj<</Type/Catalog /Private(true)>>endobj\nxref\ntrailer\n%%EOF");
    for (const user of [editor, publisher, admin]) {
      await assert.rejects(payload.update({ collection: "media", id: publicFile.id, user, overrideAccess: false, draft: true, overwriteExistingFiles: true, data: { alt: "Неопубликованная замена", _status: "draft" }, file: { data: replacement, size: replacement.length, name: "published.pdf", mimetype: "application/pdf" } }), /создайте новую запись/u);
    }
    await assert.rejects(payload.update({ collection: "media", id: publicFile.id, user: editor, overrideAccess: false, draft: true, req: { query: { uploadEdits: { crop: { x: 0, y: 0, width: 50, height: 50 } } } }, data: { _status: "draft" } }), /создайте новую запись/u);
    await assert.rejects(payload.update({ collection: "media", id: publicFile.id, user: editor, overrideAccess: false, draft: true, data: { _status: "draft", ...{ focalX: 25, focalY: 25 } } }), /создайте новую запись/u);
    const newFile = await payload.create({ collection: "media", user: editor, overrideAccess: false, draft: true, overwriteExistingFiles: true, data: { alt: "Новый приватный файл", _status: "draft" }, file: { data: replacement, size: replacement.length, name: "published.pdf", mimetype: "application/pdf" } });
    assert.notEqual(newFile.filename, publicFile.filename);
    assert.deepEqual(await readFile(path.join(uploads, publicFile.filename)), before);
    const publicMetadata = await payload.findByID({ collection: "media", id: publicFile.id, overrideAccess: false });
    assert.equal(publicMetadata.alt, "Публичный файл");
  });

  it("editor can save a draft but cannot publish or delete it", async () => {
    const updated = await payload.update({ collection: "categories", id: draft.id, user: editor, overrideAccess: false, draft: true, data: { title: "Изменённый черновик", _status: "draft" } });
    assert.equal(updated._status, "draft");
    await assert.rejects(payload.update({ collection: "categories", id: draft.id, user: editor, overrideAccess: false, data: { _status: "published" } }));
    await assert.rejects(payload.update({ collection: "categories", id: draft.id, user: editor, overrideAccess: false, draft: true, data: { _status: "published" } }));
    await assert.rejects(payload.create({ collection: "categories", user: editor, overrideAccess: false, data: { title: "Попытка публикации", slug: "unauthorized-publish", art: "pipes", _status: "published" } }));
    await assert.rejects(payload.delete({ collection: "categories", id: draft.id, user: editor, overrideAccess: false }));
  });

  it("editor cannot change the published copy, including after creating an unpublished revision", async () => {
    await assert.rejects(payload.update({ collection: "categories", id: published.id, user: editor, overrideAccess: false, data: { title: "Непроверенная правка" } }));
    await payload.update({ collection: "categories", id: published.id, user: editor, overrideAccess: false, draft: true, context: { saveDraft: true }, data: { title: "Редакторский черновик", _status: "draft" } });
    let visible = await payload.findByID({ collection: "categories", id: published.id, overrideAccess: false });
    assert.equal(visible.title, "Публичная категория");
    await assert.rejects(payload.update({ collection: "categories", id: published.id, user: editor, overrideAccess: false, data: { title: "Попытка изменить публичную запись", _status: "draft" } }));
    await assert.rejects(payload.update({ collection: "categories", id: published.id, user: editor, overrideAccess: false, context: { saveDraft: true }, data: { title: "Поддельный режим черновика", _status: "draft" } }));
    await assert.rejects(payload.update({ collection: "categories", id: published.id, user: editor, overrideAccess: false, autosave: true, data: { title: "Поддельное автосохранение", _status: "draft" } }));
    await assert.rejects(payload.findByID({ collection: "categories", id: published.id, overrideAccess: false, draft: true }));
    visible = await payload.findByID({ collection: "categories", id: published.id, overrideAccess: false });
    assert.equal(visible.title, "Публичная категория");
  });

  it("bulk updates enforce the same draft-only editor restriction", async () => {
    await assert.rejects(payload.update({ collection: "categories", where: { id: { equals: published.id } }, user: editor, overrideAccess: false, data: { title: "Массовая непроверенная правка", _status: "draft" } }));
    const allowed = await payload.update({ collection: "categories", where: { id: { equals: published.id } }, user: editor, overrideAccess: false, draft: true, data: { title: "Массовый черновик", _status: "draft" } });
    assert.equal(allowed.errors.length, 0);
    assert.equal(allowed.docs[0].title, "Массовый черновик");
    assert.equal((await payload.findByID({ collection: "categories", id: published.id, overrideAccess: false })).title, "Публичная категория");
  });

  it("nested category lookups do not lose the editor's real draft mode", async () => {
    const child = await payload.create({ collection: "categories", user: publisher, overrideAccess: false, data: { title: "Дочерняя категория", slug: "child", parent: published.id, art: "pipes", _status: "published" } });
    const updated = await payload.update({ collection: "categories", id: child.id, user: editor, overrideAccess: false, draft: true, context: { saveDraft: true }, data: { title: "Дочерний черновик", parent: published.id, _status: "draft" } });
    assert.equal(updated._status, "draft");
    assert.equal(updated.path, "published/child");
    await assert.rejects(payload.update({ collection: "categories", id: child.id, user: editor, overrideAccess: false, context: { saveDraft: true }, data: { title: "Поддельный дочерний черновик", parent: published.id, _status: "draft" } }));
    assert.equal((await payload.findByID({ collection: "categories", id: child.id, overrideAccess: false })).title, "Дочерняя категория");
  });

  it("publisher can publish a reviewed draft", async () => {
    const result = await payload.update({ collection: "categories", id: draft.id, user: publisher, overrideAccess: false, data: { title: "Проверено", _status: "published" } });
    assert.equal(result._status, "published");
    assert.equal((await payload.findByID({ collection: "categories", id: draft.id, overrideAccess: false })).title, "Проверено");
  });

  it("editor cannot promote their role or create another user", async () => {
    await payload.update({ collection: "users", id: editor.id, user: editor, overrideAccess: false, data: { role: "admin", name: "Редактор" } });
    assert.equal((await payload.findByID({ collection: "users", id: editor.id, user: admin, overrideAccess: false })).role, "editor");
    await assert.rejects(payload.create({ collection: "users", user: editor, overrideAccess: false, data: { email: "intruder@access-test.invalid", password: randomBytes(24).toString("hex"), role: "admin" } }));
  });

  it("unconfigured email recovery neither creates reset tokens nor logs reset links", async () => {
    assert.equal(payload.email.name, "disabled");
    const isUnavailable = (error: unknown) => error instanceof Error && "status" in error && error.status === 503 && !error.message.includes("@") && !error.message.includes("reset-token");
    await assert.rejects(payload.forgotPassword({ collection: "users", data: { email: editor.email } }), isUnavailable);
    await assert.rejects(payload.forgotPassword({ collection: "users", data: { email: "unknown@access-test.invalid" } }), isUnavailable);
    await assert.rejects(payload.sendEmail({ to: editor.email, subject: "Reset", html: "https://example.invalid/reset/reset-token" }), isUnavailable);
    const user = await payload.findByID({ collection: "users", id: editor.id, user: admin, overrideAccess: false, showHiddenFields: true });
    assert.ok(user.resetPasswordToken == null);
  });

  it("analyst can read allowed aggregates but cannot edit content or users", async () => {
    const count = await payload.count({ collection: "categories", user: analyst, overrideAccess: false });
    assert.ok(count.totalDocs > 0);
    await assert.rejects(payload.update({ collection: "categories", id: published.id, user: analyst, overrideAccess: false, data: { title: "Попытка аналитика" } }));
    await assert.rejects(payload.update({ collection: "users", id: admin.id, user: analyst, overrideAccess: false, data: { name: "Попытка аналитика" } }));
    await assert.rejects(payload.findVersions({ collection: "categories", user: analyst, overrideAccess: false }));
  });

  it("restoring a published version cannot bypass editor publication restrictions", async () => {
    const versions = await payload.findVersions({ collection: "categories", user: editor, overrideAccess: false, where: { parent: { equals: published.id }, "version._status": { equals: "published" } }, limit: 1 });
    assert.equal(versions.docs.length, 1);
    await assert.rejects(payload.restoreVersion({ collection: "categories", id: String(versions.docs[0].id), user: editor, overrideAccess: false }));
    const original = await payload.findByID({ collection: "categories", id: published.id, overrideAccess: false });
    assert.equal(original.title, "Публичная категория");
  });

  it("restoring a draft cannot unpublish the public document", async () => {
    const versions = await payload.findVersions({ collection: "categories", user: editor, overrideAccess: false, where: { parent: { equals: published.id }, "version._status": { equals: "draft" } }, limit: 1 });
    assert.equal(versions.docs.length, 1);
    await assert.rejects(payload.restoreVersion({ collection: "categories", id: String(versions.docs[0].id), user: editor, overrideAccess: false }));
    // Payload's Local API does not forward a restore-as-draft option. A query
    // flag must not turn its base-row restoration into an authorized operation.
    await assert.rejects(payload.restoreVersion({ collection: "categories", id: String(versions.docs[0].id), user: editor, overrideAccess: false, req: { query: { draft: "true" } } }));
    assert.equal((await payload.findByID({ collection: "categories", id: published.id, overrideAccess: false })).title, "Публичная категория");
  });

  it("global publication and history obey the content and administration roles", async () => {
    for (const slug of ["contacts", "solution-content", "navigation", "site-settings"] as const) {
      for (const user of [undefined, editor, analyst]) {
        await assert.rejects(payload.updateGlobal({ slug, user, overrideAccess: false, data: {} }));
      }
      await assert.rejects(payload.findGlobalVersions({ slug, user: analyst, overrideAccess: false }));
      await assert.rejects(payload.findGlobalVersions({ slug, overrideAccess: false }));
    }
    await payload.updateGlobal({ slug: "navigation", user: publisher, overrideAccess: false, data: { items: [{ label: "Каталог", href: "/catalog" }] } });
    await assert.rejects(payload.updateGlobal({ slug: "site-settings", user: publisher, overrideAccess: false, data: { title: "Нет доступа" } }));
    await payload.updateGlobal({ slug: "site-settings", user: admin, overrideAccess: false, data: { title: "HEISSKRAFT" } });
    assert.equal((await payload.findGlobal({ slug: "site-settings", overrideAccess: false })).title, "HEISSKRAFT");
  });

  it("anonymous Local API writes fail when access checks are explicitly enabled", async () => {
    await assert.rejects(payload.create({ collection: "categories", overrideAccess: false, data: { title: "Анонимная запись", slug: "anonymous", art: "pipes" } }));
    await assert.rejects(payload.delete({ collection: "categories", id: published.id, overrideAccess: false }));
  });
});
