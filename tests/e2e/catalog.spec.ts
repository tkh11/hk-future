import { expect, test } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";
const url = (path: string) => `${prefix}${path}`;

test("search supports submit, clear, deep links and browser history", async ({ page }) => {
  await page.goto(url("/catalog?q=FireOff"));
  const search = page.getByRole("searchbox", { name: "Поиск по каталогу", exact: true });
  await expect(search).toHaveValue("FireOff");
  await expect(page.getByRole("list", { name: "Результаты поиска разделов" }).getByRole("link")).toHaveCount(1);
  await search.fill("Multilayer");
  await search.press("Enter");
  await expect(page).toHaveURL(/\?q=Multilayer$/);
  const result = page.getByRole("list", { name: "Результаты поиска разделов" }).getByRole("link");
  await expect(result).toContainText("Heisskraft Multilayer");
  await result.click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Heisskraft Multilayer");
  await page.goBack();
  await expect(search).toHaveValue("Multilayer");
  await expect(result).toContainText("Heisskraft Multilayer");
  await page.goForward();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Heisskraft Multilayer");
  await page.goBack();
  await page.getByRole("button", { name: "Очистить поиск", exact: true }).click();
  await expect(search).toHaveValue("");
  await expect(page).toHaveURL(new RegExp(`${prefix}/catalog/?$`));
  await expect(page.getByRole("list", { name: "Разделы каталога" }).getByRole("link")).toHaveCount(3);
  await search.fill("zzzzнесуществующийраздел");
  await expect(page.getByRole("heading", { name: "Разделы не найдены" })).toBeVisible();
  await page.getByRole("button", { name: "Сбросить поиск" }).click();
  await expect(page.getByRole("list", { name: "Разделы каталога" }).getByRole("link")).toHaveCount(3);
});

test("nested search is keyboard accessible and its initial categories survive clearing", async ({ page }) => {
  await page.goto(url("/catalog/pipelines"));
  const toggle = page.getByRole("button", { name: "Поиск по каталогу", exact: true });
  await toggle.click();
  const search = page.getByRole("searchbox", { name: "Поиск по каталогу", exact: true });
  await expect(search).toBeFocused();
  await search.fill("HDPE");
  await search.press("Enter");
  await expect(page).toHaveURL(/\?q=HDPE$/);
  await expect(page.getByRole("list", { name: "Результаты поиска разделов" }).getByRole("link")).toHaveCount(1);
  await search.press("Escape");
  await expect(page.getByRole("list", { name: "Разделы каталога" }).getByRole("link")).toHaveCount(5);
  await expect(toggle).toBeFocused();
  await expect(page).toHaveURL(new RegExp(`${prefix}/catalog/pipelines/?$`));
});

test("mobile pipeline cards have two columns with descriptions already visible", async ({ page }, testInfo) => {
  test.skip((testInfo.project.use.viewport?.width ?? 1440) > 599, "Mobile layout assertion");
  await page.goto(url("/catalog/pipelines"));
  const cards = page.getByRole("list", { name: "Разделы каталога" }).getByRole("link");
  await expect(cards).toHaveCount(5);
  const first = await cards.nth(0).boundingBox();
  const second = await cards.nth(1).boundingBox();
  const third = await cards.nth(2).boundingBox();
  expect(first).not.toBeNull();
  expect(second).not.toBeNull();
  expect(third).not.toBeNull();
  expect(Math.abs(first!.y - second!.y)).toBeLessThan(2);
  expect(second!.x).toBeGreaterThan(first!.x + first!.width);
  expect(third!.y).toBeGreaterThan(first!.y + first!.height);
  await expect(cards.nth(1).getByText(/для систем отопления/)).toBeVisible();
  await expect(cards.nth(2).getByText(/для систем технического\/хозяйственно-бытового водоснабжения/)).toBeVisible();
});
