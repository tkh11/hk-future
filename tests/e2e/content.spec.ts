import { expect, test } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";
const url = (path: string) => `${prefix}${path}`;

test.describe("Initial HTML without JavaScript", () => {
  test.use({ javaScriptEnabled: false });

  test("home exposes company text and engineering category links", async ({ page }) => {
    await page.goto(url("/"));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Инженерные системы будущего");
    await expect(page.getByRole("heading", { name: "О компании", exact: true })).toBeVisible();
    await expect(page.getByText(/Более 25 лет на рынке/)).toBeVisible();
    const solutions = page.getByRole("region", { name: "Инженерные решения" });
    await expect(solutions.getByRole("link")).toHaveCount(6);
    await expect(solutions.getByRole("link", { name: "Системы охлаждения ЦОД" })).toHaveAttribute("href", new RegExp(`${prefix}/solutions/data-centers/?$`));
    await expect(solutions.getByRole("link", { name: "Системы пожаротушения" })).toBeVisible();
  });

  test("catalog and pipeline categories are rendered at build time", async ({ page }) => {
    await page.goto(url("/catalog"));
    const roots = page.getByRole("list", { name: "Разделы каталога" });
    await expect(roots.getByRole("link")).toHaveCount(3);
    await roots.getByRole("link", { name: "Трубопроводные системы", exact: true }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Трубопроводные системы");
    const systems = page.getByRole("list", { name: "Разделы каталога" });
    await expect(systems.getByRole("link")).toHaveCount(5);
    await expect(systems.getByRole("heading", { name: "Heisskraft Multilayer" })).toBeVisible();
    await expect(systems.getByRole("heading", { name: "Heisskraft HDPE" })).toBeVisible();
  });

  for (const route of [
    { path: "/solutions/data-centers", title: /Холод для\s*больших данных/, section: "Системы охлаждения ЦОД", content: "Больше вычислений — выше требования" },
    { path: "/solutions/fire-suppression", title: /Системы\s*пожаротушения/, section: "FireOff. Система в деталях.", content: "Надёжность — на всём пути воды" },
  ]) {
    test(`${route.path}: text and catalog links do not depend on the 3D scene`, async ({ page }) => {
      await page.goto(url(route.path));
      await expect(page.getByRole("heading", { level: 1 })).toHaveText(route.title);
      await expect(page.getByRole("heading", { name: route.section, exact: true })).toBeVisible();
      await expect(page.getByRole("heading", { name: route.content, exact: true })).toBeVisible();
      await expect(page.locator(`main a[href="${prefix}/catalog"], main a[href="${prefix}/catalog/"]`).first()).toBeVisible();
      const banner = page.locator('[data-product-banner]').first().getByRole('img');
      await banner.scrollIntoViewIfNeeded();
      await expect(banner).toBeVisible();
      await expect(banner).toHaveJSProperty('complete', true);
      expect(await banner.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    });
  }
});

for (const route of [
  { path: '/solutions/data-centers', banner: 'climatfaser', asset: 'climatfaser-banner.jpg' },
  { path: '/solutions/fire-suppression', banner: 'fireoff', asset: 'fireoff-cover.png' },
]) {
  test(`${route.banner}: large product banner waits for its own viewport`, async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    const requests: string[] = [];
    page.on('request', request => requests.push(request.url()));
    await page.goto(url(route.path));
    await page.waitForFunction(() => document.documentElement.classList.contains('lenis'));
    expect(requests.some(request => request.includes(route.asset))).toBe(false);
    const banner = page.locator(`[data-product-banner="${route.banner}"]`);
    await banner.scrollIntoViewIfNeeded();
    const image = banner.getByRole('img');
    await expect(image).toBeVisible();
    await expect(image).toHaveJSProperty('complete', true);
    expect(await image.evaluate((element: HTMLImageElement) => element.naturalWidth)).toBeGreaterThan(0);
    expect(requests.some(request => request.includes(route.asset))).toBe(true);
  });
}

test("failed media cannot hide company text or category navigation", async ({ page }) => {
  await page.route(/\.(?:jpe?g|png|webp|avif|mp4|webm)(?:\?|$)/, route => route.abort());
  await page.goto(url("/"));
  const company = page.getByRole("heading", { name: "О компании", exact: true });
  await company.scrollIntoViewIfNeeded();
  await expect(company).toBeVisible();
  await expect(page.getByText(/Более 25 лет на рынке/)).toBeVisible();
  const category = page.getByRole("region", { name: "Инженерные решения" }).getByRole("link", { name: "Системы охлаждения ЦОД" });
  await category.scrollIntoViewIfNeeded();
  await category.click();
  await expect(page).toHaveURL(new RegExp(`${prefix}/solutions/data-centers/?$`));
});
