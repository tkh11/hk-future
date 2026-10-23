import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { expect, test } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";
const chunkDirectory = join(process.cwd(), process.env.E2E_EXPORT === "true" ? "out/_next/static/chunks" : ".next-production/static/chunks");
const cases = [
  { path: "/solutions/data-centers", selector: "#cooling-system", asset: "/models/chilling.glb", menu: "Элементы системы охлаждения", button: /Труба ClimatFaser/, title: "Трубопроводные системы ClimatFaser" },
  { path: "/solutions/fire-suppression", selector: "#fireoff-system", asset: "/models/parking-sprinkler.glb", menu: "Элементы системы FireOff", button: /Насосная станция/, title: "Подача воды в систему" },
  { path: "/designers", selector: ".pipeline", asset: "/models/facade.glb", menu: "Блоки здания", button: /Типовой этаж/, title: "Разводка ХВС и ГВС" },
] as const;

for (const scene of cases) {
  test(`${scene.path}: failed viewer JavaScript chunk is isolated and retried`, async ({ page }) => {
    // Locate the emitted viewer payload by its model URL, not its changing hash.
    // Reading a local build artifact also avoids preloading it into the browser.
    const chunks = readdirSync(chunkDirectory).filter(name => name.endsWith(".js") && readFileSync(join(chunkDirectory, name), "utf8").includes(scene.asset));
    expect(chunks, "one lazy viewer payload must contain the model URL").toHaveLength(1);
    let restoreNetwork = false;
    let requests = 0;
    let documentNavigations = 0;
    page.on("framenavigated", frame => { if (frame === page.mainFrame()) documentNavigations += 1; });
    await page.route(`**/_next/static/chunks/${chunks[0]}`, route => {
      requests += 1;
      // Keep failing through Turbopack's automatic network retry. Recovery must
      // come from the user's button, not a successful background second request.
      return restoreNetwork ? route.continue() : route.fulfill({ status: 503, contentType: "text/plain", body: "Intentional viewer chunk outage" });
    });
    await page.goto(`${prefix}${scene.path}`);
    const section = page.locator(scene.selector);
    await expect(async () => { await section.scrollIntoViewIfNeeded(); }).toPass({ timeout: 15_000 });
    await expect(section.getByRole("alert")).toContainText("Не удалось", { timeout: 30_000 });
    expect(requests).toBeGreaterThan(0);
    const failedRequests = requests;
    const navigationCount = documentNavigations;

    // The import boundary contains only the media: its descriptions still work.
    const menu = scene.selector === ".pipeline"
      ? section.getByRole("complementary", { name: scene.menu })
      : section.getByRole("group", { name: scene.menu });
    await menu.getByRole("button", { name: scene.button }).click();
    await expect(section.getByRole("heading", { name: scene.title, exact: true })).toBeVisible();
    if (scene.selector === ".pipeline") {
      await section.getByRole("complementary", { name: "Элементы трубопровода" }).getByRole("button", { name: /Труба KraftPipePlus SDR 7.4/ }).click();
      await expect(section.getByRole("heading", { name: "Труба KraftPipePlus SDR 7.4", exact: true })).toBeVisible();
    }

    restoreNetwork = true;
    await section.getByRole("button", { name: "Попробовать снова", exact: true }).click();
    await expect(section.locator("canvas")).toBeVisible({ timeout: 60_000 });
    if (scene.selector === ".pipeline") {
      await expect(section.locator(".pipeline__veil")).toHaveAttribute("aria-hidden", "true", { timeout: 60_000 });
      await expect(section.getByRole("heading", { name: "Труба KraftPipePlus SDR 7.4", exact: true })).toBeVisible();
    } else {
      await expect(section.locator("[data-model-status]")).toHaveAttribute("data-model-status", "ready", { timeout: 60_000 });
      await expect(menu.getByRole("button", { name: scene.button })).toHaveAttribute("aria-expanded", "true");
    }
    await expect(section.getByRole("alert")).toHaveCount(0);
    expect(requests).toBeGreaterThan(failedRequests);
    expect(documentNavigations).toBe(navigationCount);
  });
}
