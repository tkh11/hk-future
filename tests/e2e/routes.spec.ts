import { expect, test } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";
// Existing unfinished destinations are explicitly out of this stabilization phase.
// Only these exact paths (including their RSC .txt requests) may return 404.
const legacyMissingPages = new Set(["/privacy", "/personal-data", "/about", "/docs", "/requisites"]);

for (const path of ["/", "/catalog", "/catalog/pipelines", "/catalog/pipelines/therm", "/solutions/data-centers", "/solutions/fire-suppression", "/designers", "/contacts"]) {
  test(`${path}: direct production navigation has no runtime, hydration or unexpected 404 errors`, async ({ page }, testInfo) => {
    const runtimeErrors: string[] = [];
    const hydrationErrors: string[] = [];
    const missing: string[] = [];
    const knownMissing: string[] = [];
    page.on("pageerror", error => runtimeErrors.push(error.message));
    page.on("console", message => {
      if (message.type() === "error" && /hydration|hydrated|Minified React error #(418|423|425)/i.test(message.text())) hydrationErrors.push(message.text());
    });
    page.on("response", response => {
      if (response.status() !== 404) return;
      const resource = new URL(response.url());
      if (resource.origin !== new URL(page.url()).origin) return;
      const pathname = resource.pathname.slice(prefix.length).replace(/\.txt$/, "").replace(/\/$/, "") || "/";
      (legacyMissingPages.has(pathname) ? knownMissing : missing).push(resource.pathname);
    });
    // Do not depend on an external map provider's uptime or execute its analytics.
    await page.route("https://yandex.ru/map-widget/**", route => route.fulfill({ contentType: "text/html", body: "<!doctype html><title>Map provider fixture</title>" }));
    const response = await page.goto(`${prefix}${path}`);
    expect(response?.status()).toBe(200);
    if (path === "/catalog") await expect(page.getByRole("main", { name: "Каталог продукции Heisskraft" })).toBeVisible();
    else await expect(page.locator("main h1")).toBeVisible();
    for (const heading of await page.locator("main h2").all()) {
      // Reveals and viewport media are activated as a visitor scrolls down.
      if (await heading.isVisible()) await heading.scrollIntoViewIfNeeded();
    }
    await page.locator("footer").last().scrollIntoViewIfNeeded();
    await page.evaluate(async () => {
      await document.fonts.ready;
      await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
    });
    if (knownMissing.length) testInfo.annotations.push({ type: "known-legacy-404", description: [...new Set(knownMissing)].join(", ") });
    expect(runtimeErrors).toEqual([]);
    expect(hydrationErrors).toEqual([]);
    expect(missing).toEqual([]);
  });
}

test("catalog video URLs respect the deployment prefix", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${prefix}/catalog`);
  const list = page.getByRole("list", { name: "Разделы каталога" });
  for (const item of await list.getByRole("listitem").all()) {
    await item.scrollIntoViewIfNeeded();
    const video = item.locator("video");
    await expect(video).toHaveAttribute("src", new RegExp(`^${prefix}/videos/catalog/`));
    expect(await video.evaluate((element: HTMLVideoElement) => element.loop && element.muted && element.playsInline)).toBe(true);
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState), { timeout: 60_000 }).toBeGreaterThanOrEqual(2);
  }
  await page.locator("footer").last().scrollIntoViewIfNeeded();
  await expect.poll(() => list.locator("video").evaluateAll(videos => videos.every(video => {
    const bounds = video.getBoundingClientRect();
    return bounds.bottom > 0 && bounds.top < window.innerHeight || (video as HTMLVideoElement).paused;
  }))).toBe(true);
});
