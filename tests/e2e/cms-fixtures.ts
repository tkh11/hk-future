import { randomBytes } from "node:crypto";
import { expect, request, test as base, type APIRequestContext, type APIResponse } from "@playwright/test";

type Role = "editor" | "publisher" | "analyst";
type Document = { id: number; title?: string; _status?: string; filename?: string; url?: string; role?: string };
type Owner = { collection: string; id: number };
type CMSFixture = {
  suffix: string;
  admin: APIRequestContext;
  anonymous: APIRequestContext;
  editor: APIRequestContext;
  publisher: APIRequestContext;
  analyst: APIRequestContext;
  editorID: number;
  create: (collection: string, data: Record<string, unknown>, actor?: APIRequestContext, draft?: boolean) => Promise<Document>;
  upload: (actor: APIRequestContext, name: string, bytes: Buffer, draft?: boolean) => Promise<Document>;
  deniedCreate: (collection: string, response: APIResponse, status: number) => Promise<void>;
};

export async function readDocument(response: APIResponse, expected: number, wrapped = true): Promise<Document> {
  // Never attach response bodies, request data, passwords or tokens to reports.
  expect(response.status(), "CMS operation status").toBe(expected);
  const result = await response.json();
  const doc = wrapped ? result.doc : result;
  expect(typeof doc?.id, "CMS document identifier").toBe("number");
  return doc as Document;
}

export const test = base.extend<{ cms: CMSFixture }>({
  cms: async ({ baseURL, extraHTTPHeaders }, runTest) => {
    if (!baseURL) throw new Error("CMS E2E baseURL is required.");
    const email = process.env.CMS_BOOTSTRAP_EMAIL;
    const password = process.env.CMS_BOOTSTRAP_PASSWORD;
    if (!email || !password) throw new Error("CMS E2E requires local bootstrap credentials in the environment.");
    const suffix = `e2e-${randomBytes(8).toString("hex")}`;
    const contexts: APIRequestContext[] = [];
    const owned: Owner[] = [];
    const context = async () => {
      const api = await request.newContext({ baseURL, extraHTTPHeaders, failOnStatusCode: false });
      contexts.push(api);
      return api;
    };
    const admin = await context();
    const login = async (api: APIRequestContext, loginEmail: string, loginPassword: string) => {
      const response = await api.post("/api/users/login", { data: { email: loginEmail, password: loginPassword } });
      expect(response.status(), "CMS test account login").toBe(200);
    };
    try {
      await login(admin, email, password);
      const anonymous = await context();
      const actors = {} as Record<Role, APIRequestContext>;
      let editorID = 0;
      for (const role of ["editor", "publisher", "analyst"] as const) {
        const loginEmail = `${suffix}-${role}@cms-e2e.invalid`;
        const loginPassword = randomBytes(24).toString("hex");
        const user = await readDocument(await admin.post("/api/users", { data: { name: `CMS E2E ${role}`, email: loginEmail, password: loginPassword, role } }), 201);
        owned.push({ collection: "users", id: user.id });
        if (role === "editor") editorID = user.id;
        actors[role] = await context();
        await login(actors[role], loginEmail, loginPassword);
      }
      const create: CMSFixture["create"] = async (collection, data, actor = actors.editor, draft = true) => {
        const doc = await readDocument(await actor.post(`/api/${collection}?draft=${draft}`, { data }), 201);
        owned.push({ collection, id: doc.id });
        return doc;
      };
      const upload: CMSFixture["upload"] = async (actor, name, bytes, draft = true) => {
        const doc = await readDocument(await actor.post(`/api/media?draft=${draft}`, { multipart: {
          _payload: JSON.stringify({ title: suffix, alt: "CMS E2E PDF", _status: draft ? "draft" : "published" }),
          file: { name, mimeType: "application/pdf", buffer: bytes },
        } }), 201);
        owned.push({ collection: "media", id: doc.id });
        return doc;
      };
      const deniedCreate: CMSFixture["deniedCreate"] = async (collection, response, status) => {
        if (response.ok()) {
          const body = await response.json();
          const id = body.doc?.id ?? body.user?.id ?? body.id;
          if (typeof id === "number") owned.push({ collection, id });
        }
        expect(response.status(), "Unauthorized fixture creation must be denied").toBe(status);
      };
      await runTest({ suffix, admin, anonymous, ...actors, editorID, create, upload, deniedCreate });
    } finally {
      const failures: string[] = [];
      for (const item of owned.reverse()) {
        const response = await admin.delete(`/api/${item.collection}/${item.id}?overrideLock=true`).catch(() => null);
        if (!response || ![200, 404].includes(response.status())) failures.push(`${item.collection}/${item.id}`);
      }
      for (const api of contexts) await api.dispose();
      expect(failures, "Only generated CMS fixtures must be removed after the test").toEqual([]);
    }
  },
});

