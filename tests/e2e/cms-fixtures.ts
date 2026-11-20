import { randomBytes } from "node:crypto";
import { expect, request, test as base, type APIRequestContext, type APIResponse, type Cookie } from "@playwright/test";
import { getPayload, type Payload } from "payload";
import { generatePayloadCookie } from "payload/shared";
import config from "../../payload.config";

type Role = "editor" | "publisher" | "analyst";
type Document = { id: number; title?: string; slug?: string; sku?: string; _status?: string; filename?: string; url?: string; role?: string; alt?: string };
type Owner = { collection: string; id: number };
type Actor = { user: { id: number; email: string; role?: string }; cookies: Cookie[] };
type CMSFixture = {
  suffix: string;
  payload: Payload;
  admin: APIRequestContext;
  anonymous: APIRequestContext;
  editor: APIRequestContext;
  publisher: APIRequestContext;
  analyst: APIRequestContext;
  editorID: number;
  editorActor: Actor;
  publisherActor: Actor;
  analystActor: Actor;
  cookies: (actor: Actor) => Cookie[];
  create: (collection: string, data: Record<string, unknown>, actor?: Actor, draft?: boolean) => Promise<Document>;
  update: (collection: string, id: number, data: Record<string, unknown>, actor: Actor, draft?: boolean) => Promise<Document>;
  find: (collection: string, id: number, actor: Actor, draft?: boolean) => Promise<Document>;
  upload: (actor: Actor, name: string, bytes: Buffer, draft?: boolean) => Promise<Document>;
  track: (collection: string, id: number) => void;
  deniedCreate: (collection: string, response: APIResponse, status: number) => Promise<void>;
};

export function readLocal(doc: { id?: unknown }): Document {
  expect(typeof doc?.id, "CMS document identifier").toBe("number");
  return doc as Document;
}

export async function readDocument(response: APIResponse, expected: number, wrapped = true): Promise<Document> {
  expect(response.status(), "CMS operation status").toBe(expected);
  const result = await response.json();
  return readLocal(wrapped ? result.doc : result);
}

let shared: Payload | undefined;
async function sharedPayload() {
  shared ??= await getPayload({ config });
  return shared;
}

function tokenCookies(payload: Payload, token: string, baseURL: string): Cookie[] {
  const cookie = generatePayloadCookie({
    collectionAuthConfig: payload.collections.users.config.auth,
    cookiePrefix: payload.config.cookiePrefix,
    returnCookieAsObject: true,
    token,
  });
  return [{
    name: cookie.name,
    value: cookie.value ?? "",
    domain: new URL(baseURL).hostname,
    path: cookie.path ?? "/",
    httpOnly: cookie.httpOnly ?? true,
    secure: false,
    sameSite: "Lax",
    expires: cookie.expires ? Math.floor(new Date(cookie.expires).getTime() / 1000) : -1,
  }];
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
    const payload = await sharedPayload();
    const context = async (cookies: Cookie[] = []) => {
      const api = await request.newContext({ baseURL, extraHTTPHeaders, failOnStatusCode: false, storageState: { cookies, origins: [] } });
      contexts.push(api);
      return api;
    };
    const signIn = async (loginEmail: string, loginPassword: string): Promise<Actor> => {
      const result = await payload.login({ collection: "users", data: { email: loginEmail, password: loginPassword } });
      expect(result.token, "CMS test account login").toBeTruthy();
      expect(typeof result.user?.id).toBe("number");
      return { user: result.user as Actor["user"], cookies: tokenCookies(payload, result.token!, baseURL) };
    };
    try {
      const adminActor = await signIn(email, password);
      const admin = await context(adminActor.cookies);
      const anonymous = await context();
      const actors = {} as Record<Role, Actor>;
      const http = {} as Record<Role, APIRequestContext>;
      let editorID = 0;
      for (const role of ["editor", "publisher", "analyst"] as const) {
        const loginEmail = `${suffix}-${role}@cms-e2e.invalid`;
        const loginPassword = randomBytes(24).toString("hex");
        const user = await payload.create({
          collection: "users",
          user: adminActor.user,
          overrideAccess: false,
          data: { name: `CMS E2E ${role}`, email: loginEmail, password: loginPassword, role },
        });
        owned.push({ collection: "users", id: user.id });
        if (role === "editor") editorID = user.id;
        actors[role] = await signIn(loginEmail, loginPassword);
        http[role] = await context(actors[role].cookies);
      }
      const create: CMSFixture["create"] = async (collection, data, actor = actors.editor, draft = true) => {
        const doc = await payload.create({
          collection: collection as "pages",
          user: actor.user,
          overrideAccess: false,
          draft,
          data: data as never,
        });
        owned.push({ collection, id: doc.id });
        return readLocal(doc);
      };
      const update: CMSFixture["update"] = async (collection, id, data, actor, draft = false) => readLocal(await payload.update({
        collection: collection as "pages",
        id,
        user: actor.user,
        overrideAccess: false,
        draft,
        data: data as never,
      }));
      const find: CMSFixture["find"] = async (collection, id, actor, draft = true) => readLocal(await payload.findByID({
        collection: collection as "pages",
        id,
        user: actor.user,
        overrideAccess: false,
        draft,
        depth: 0,
      }));
      const upload: CMSFixture["upload"] = async (actor, name, bytes, draft = true) => {
        const doc = await payload.create({
          collection: "media",
          user: actor.user,
          overrideAccess: false,
          draft,
          data: { title: suffix, alt: "CMS E2E PDF", _status: draft ? "draft" : "published" },
          file: { data: bytes, mimetype: "application/pdf", name, size: bytes.length },
        });
        owned.push({ collection: "media", id: doc.id });
        return readLocal(doc);
      };
      const deniedCreate: CMSFixture["deniedCreate"] = async (_collection, response, status) => {
        expect(response.status(), "Unauthorized fixture creation must be denied").toBe(status);
      };
      await runTest({
        suffix, payload, admin, anonymous, editor: http.editor, publisher: http.publisher, analyst: http.analyst, editorID,
        editorActor: actors.editor, publisherActor: actors.publisher, analystActor: actors.analyst,
        cookies: actor => actor.cookies, create, update, find, upload,
        track: (collection, id) => { owned.push({ collection, id }); },
        deniedCreate,
      });
    } finally {
      const failures: string[] = [];
      for (const item of owned.reverse()) {
        try {
          await payload.delete({ collection: item.collection as "pages", id: item.id, overrideAccess: true, overrideLock: true });
        } catch {
          failures.push(`${item.collection}/${item.id}`);
        }
      }
      for (const api of contexts) await api.dispose();
      expect(failures, "Only generated CMS fixtures must be removed after the test").toEqual([]);
    }
  },
});
