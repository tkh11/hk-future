import { expect, test, type Locator, type Page } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";
const cases = [
  { path: "/solutions/data-centers", selector: "#cooling-system", asset: "chilling.glb" },
  { path: "/solutions/fire-suppression", selector: "#fireoff-system", asset: "parking-sprinkler.glb" },
  { path: "/designers", selector: ".pipeline", asset: "facade.glb" },
] as const;

async function reveal(section: Locator) {
  // Streaming navigation may replace its initial shell during this action.
  await expect(async () => { await section.scrollIntoViewIfNeeded(); }).toPass({ timeout: 15_000 });
}

async function ready(page: Page, selector: string) {
  const scene = page.locator(selector);
  await expect(scene.locator("canvas")).toBeVisible({ timeout: 60_000 });
  if (selector === ".pipeline") {
    await expect(scene.locator(".pipeline__veil")).toHaveAttribute("aria-hidden", "true", { timeout: 60_000 });
  } else {
    await expect(scene.locator("[data-model-status]")).toHaveAttribute("data-model-status", "ready", { timeout: 60_000 });
  }
  await expect(scene.getByRole("alert")).toHaveCount(0);
}

test("cooling descriptions remain mapped to their three model selections", async ({ page }) => {
  await page.goto(`${prefix}/solutions/data-centers`);
  const section = page.locator("#cooling-system");
  await reveal(section);
  await ready(page, "#cooling-system");
  const menu = section.getByRole("group", { name: "Элементы системы охлаждения" });
  for (const part of [
    { name: "Труба ClimatFaser", title: "Трубопроводные системы ClimatFaser", legend: "Подача хладоносителя" },
    { name: "Насосы HIP", title: "Серия циркуляционных насосов HIP", legend: "Циркуляционные насосы" },
    { name: "Арматура HEISSKRAFT", title: "Запорно-регулирующая арматура HEISSKRAFT", legend: "Шаровые краны" },
  ]) {
    const button = menu.getByRole("button", { name: new RegExp(part.name) });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(menu.locator('button[aria-expanded="true"]')).toHaveCount(1);
    await expect(menu.getByRole("heading", { name: part.title, exact: true })).toBeVisible();
    await expect(section.getByText(part.legend, { exact: true })).toBeVisible();
  }
  await menu.getByRole("button", { name: /Арматура HEISSKRAFT/ }).press("Escape");
  await expect(menu.locator('button[aria-expanded="true"]')).toHaveCount(0);
});

test("FireOff selects every fixed camera view and restores the overview", async ({ page }) => {
  await page.goto(`${prefix}/solutions/fire-suppression`);
  const section = page.locator("#fireoff-system");
  await reveal(section);
  await ready(page, "#fireoff-system");
  const menu = section.getByRole("group", { name: "Элементы системы FireOff" });
  const markers = section.getByRole("group", { name: "Подсказки на модели" });
  await expect(markers.locator("button")).toHaveCount(5);
  const stationPin = markers.getByRole("button", { name: "Показать: Насосная станция", exact: true });
  await stationPin.click();
  await expect(menu.getByRole("button", { name: /Насосная станция/ })).toHaveAttribute("aria-expanded", "true");
  await section.getByRole("button", { name: "Общий вид", exact: true }).click();
  for (const part of [
    { id: "station", label: "Насосная станция" },
    { id: "pipework", label: "Трубопровод FireOff" },
    { id: "sprinkler", label: "Узел спринклера" },
    { id: "hydrants", label: "Пожарные краны" },
    { id: "flange", label: "Фланцевый переход" },
  ]) {
    const button = menu.getByRole("button", { name: new RegExp(part.label) });
    await button.click();
    await expect(button).toHaveAttribute("aria-expanded", "true");
    await expect(section.locator("[data-model-view]")).toHaveAttribute("data-model-view", part.id);
    await expect(section.locator(`[data-fire-marker="${part.id}"]`)).toHaveAttribute("data-muted", "false");
    await expect(section.locator('[data-fire-marker][data-muted="true"]')).toHaveCount(4);
    const detail = section.locator(`#fireoff-detail-${part.id}`);
    await expect(detail.getByRole("img")).toBeVisible();
    await expect(detail.getByRole("link", { name: `${part.label} — перейти в каталог` })).toHaveAttribute("href", new RegExp(`${prefix}/catalog/?$`));
  }
  await section.getByRole("button", { name: "Общий вид", exact: true }).click();
  await expect(section.locator("[data-model-view]")).toHaveAttribute("data-model-view", "overview");
  await expect(menu.locator('button[aria-expanded="true"]')).toHaveCount(0);
  await expect(section.locator('[data-fire-marker][data-muted="true"]')).toHaveCount(0);
});

test("designers can enter a floor, select a product and return to the building", async ({ page }) => {
  await page.goto(`${prefix}/designers`);
  await ready(page, ".pipeline");
  await page.getByRole("complementary", { name: "Блоки здания" }).getByRole("button", { name: /Типовой этаж/ }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Разводка ХВС и ГВС");
  await ready(page, ".pipeline");
  await page.getByRole("complementary", { name: "Элементы трубопровода" }).getByRole("button", { name: /Труба KraftPipePlus SDR 7.4/ }).click();
  await expect(page.getByRole("heading", { name: "Труба KraftPipePlus SDR 7.4", exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Здание", exact: true }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Интерактивная модель инженерных систем");
  await ready(page, ".pipeline");
});

for (const scene of cases) {
  for (const failure of ["HTTP 503", "corrupt GLB"] as const) {
    test(`${scene.path}: ${failure} can be retried without reloading the page`, async ({ page }) => {
      let attempts = 0;
      await page.route(`**/models/${scene.asset}`, route => {
        attempts += 1;
        if (attempts > 1) return route.continue();
        return failure === "HTTP 503"
          ? route.fulfill({ status: 503, contentType: "text/plain", body: "Intentional E2E model failure" })
          : route.fulfill({ status: 200, contentType: "model/gltf-binary", body: "glTF-invalid-model-for-E2E" });
      });
      await page.goto(`${prefix}${scene.path}`);
      const section = page.locator(scene.selector);
      await reveal(section);
      await expect(section.getByRole("alert")).toContainText("Не удалось", { timeout: 60_000 });
      // A media failure must not remove the adjacent product descriptions/list.
      await expect(section.getByRole("button", { name: scene.selector === ".pipeline" ? /Типовой этаж/ : scene.selector === "#cooling-system" ? /Труба ClimatFaser/ : /Насосная станция/ }).first()).toBeVisible();
      await section.getByRole("button", { name: /Попробовать снова|Повторить/ }).click();
      await ready(page, scene.selector);
      expect(attempts).toBeGreaterThan(1);
    });
  }

  test(`${scene.path}: unavailable WebGL remains a local recoverable state`, async ({ page }) => {
    await page.addInitScript(() => {
      const native = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (this: HTMLCanvasElement, ...args: Parameters<typeof native>) {
        if (String(args[0]).includes("webgl")) return null;
        return native.apply(this, args);
      } as typeof native;
    });
    await page.goto(`${prefix}${scene.path}`);
    const section = page.locator(scene.selector);
    await reveal(section);
    await expect(section.getByRole("alert")).toBeVisible({ timeout: 60_000 });
    await expect(section.getByRole("button", { name: /Попробовать снова|Повторить/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  });
}

test("a lost graphics context can be recreated without losing the cooling menu", async ({ page }) => {
  await page.goto(`${prefix}/solutions/data-centers`);
  const section = page.locator("#cooling-system");
  await reveal(section);
  await ready(page, "#cooling-system");
  await section.locator("canvas").dispatchEvent("webglcontextlost", { cancelable: true });
  await expect(section.getByRole("alert")).toBeVisible();
  await section.getByRole("button", { name: /Насосы HIP/ }).click();
  await expect(section.getByRole("heading", { name: "Серия циркуляционных насосов HIP" })).toBeVisible();
  await section.getByRole("button", { name: "Попробовать снова" }).click();
  await ready(page, "#cooling-system");
  await expect(section.getByRole("button", { name: /Насосы HIP/ })).toHaveAttribute("aria-expanded", "true");
});
