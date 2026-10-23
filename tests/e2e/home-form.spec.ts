import { expect, test } from "@playwright/test";

const prefix = process.env.E2E_BASE_PATH ?? "";

test("hero keeps manual slides, timeline progress and automatic end transition", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${prefix}/`);
  const carousel = page.getByRole("region", { name: "Решения HEISSKRAFT" });
  const firstVideo = carousel.locator("video").nth(0);
  await expect.poll(() => firstVideo.evaluate((video: HTMLVideoElement) => video.currentTime), { timeout: 60_000 }).toBeGreaterThan(0);
  const progress = carousel.locator(".park-banner__progress").first();
  const readProgress = () => progress.evaluate(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a);
  await expect.poll(readProgress).toBeGreaterThan(0);
  const initialProgress = await readProgress();
  expect(initialProgress).toBeLessThan(1);
  await expect.poll(readProgress).toBeGreaterThan(initialProgress);
  await carousel.getByRole("button", { name: "Слайд 2: Среда для жизни" }).click();
  await expect(carousel.getByRole("heading", { level: 1 })).toHaveText("Создаём среду для жизни");
  await expect(carousel.getByRole("button", { name: "Слайд 2: Среда для жизни" })).toHaveAttribute("aria-pressed", "true");
  await expect.poll(() => carousel.locator("video").nth(1).evaluate((video: HTMLVideoElement) => video.readyState), { timeout: 60_000 }).toBeGreaterThanOrEqual(2);
  // Exercise the actual media event without waiting through the entire video.
  await carousel.locator("video").nth(1).dispatchEvent("ended");
  await expect(carousel.getByRole("heading", { level: 1 })).toHaveText("Инженерия для городской среды");
  await carousel.getByRole("button", { name: "Слайд 1: Инженерные системы будущего" }).click();
  await expect(carousel.getByRole("heading", { level: 1 })).toHaveText("Инженерные системы будущего");
});

test("reduced motion keeps videos paused and navigation usable", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto(`${prefix}/`);
  const carousel = page.getByRole("region", { name: "Решения HEISSKRAFT" });
  await carousel.getByRole("button", { name: "Слайд 2: Среда для жизни" }).click();
  await expect(carousel.getByRole("heading", { level: 1 })).toHaveText("Создаём среду для жизни");
  await expect.poll(() => carousel.locator("video").evaluateAll(videos => videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
  await page.getByRole("heading", { name: "О компании", exact: true }).scrollIntoViewIfNeeded();
  await expect.poll(() => page.locator("#about-company video").evaluateAll(videos => videos.length > 0 && videos.every(video => (video as HTMLVideoElement).paused))).toBe(true);
});

test("company video starts in view, pauses outside it and category tilt stays interactive", async ({ page }, testInfo) => {
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.goto(`${prefix}/`);
  const video = page.locator("#about-company video");
  await video.scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused), { timeout: 60_000 }).toBe(true);
  await page.locator("footer").last().scrollIntoViewIfNeeded();
  await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
  const solutions = page.getByRole("region", { name: "Инженерные решения" });
  await solutions.scrollIntoViewIfNeeded();
  if (!testInfo.project.use.isMobile) {
    const card = solutions.getByRole("link", { name: "Системы охлаждения ЦОД" });
    await card.hover({ position: { x: 20, y: 20 } });
    await expect(card.locator('[data-hovered="true"]')).toHaveCount(1);
    const surface = card.locator('[data-hovered="true"]');
    await expect.poll(() => surface.evaluate(element => getComputedStyle(element).transform)).not.toBe("none");
  }
});

test("demo request validates every step and advances progress only on Next", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  const submissions: string[] = [];
  page.on("request", request => {
    if (["POST", "PUT", "PATCH"].includes(request.method())) submissions.push(`${request.method()} ${request.url()}`);
  });
  await page.goto(`${prefix}/`);
  const desktopTrigger = page.locator(".site-header__nav").getByRole("button", { name: "Оставить заявку", exact: true });
  if (await desktopTrigger.isVisible()) await desktopTrigger.click();
  else {
    await page.getByRole("button", { name: "Открыть меню", exact: true }).click();
    await page.getByRole("navigation", { name: "Мобильная навигация" }).getByRole("button", { name: "Оставить заявку" }).click();
  }
  const dialog = page.getByRole("dialog", { name: "Форма заявки" });
  const progress = dialog.getByRole("progressbar", { name: "Заполнение заявки" });
  const next = dialog.getByRole("button", { name: "Далее", exact: true });
  const name = dialog.getByRole("textbox", { name: "Укажите ваше ФИО", exact: true });
  await expect(name).toBeFocused();
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await next.click();
  await expect(dialog.getByRole("alert")).toHaveText("Заполните это поле");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await name.fill("Тестовый Тест Тестович");
  await expect(progress).toHaveAttribute("aria-valuenow", "0");
  await next.click();
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await dialog.getByRole("button", { name: "Предыдущий шаг" }).click();
  await expect(name).toHaveValue("Тестовый Тест Тестович");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await next.click();
  await next.click();
  await expect(dialog.getByRole("alert")).toContainText("Введите телефон полностью");
  await dialog.getByRole("button", { name: /^Код страны:/ }).click();
  const countrySearch = dialog.getByRole("combobox", { name: "Найти страну или код" });
  await expect(countrySearch).toBeFocused();
  await countrySearch.fill("Россия");
  await countrySearch.press("Enter");
  const phone = dialog.getByRole("textbox", { name: "Укажите ваш номер телефона", exact: true });
  await expect(phone).toBeFocused();
  await phone.fill("9991234567");
  await expect(progress).toHaveAttribute("aria-valuenow", "1");
  await next.click();
  const email = dialog.getByRole("textbox", { name: "Укажите ваш e-mail", exact: true });
  await email.fill("invalid");
  await next.click();
  await expect(dialog.getByRole("alert")).toHaveText("Введите корректный email");
  await expect(progress).toHaveAttribute("aria-valuenow", "2");
  await email.fill("e2e@example.test");
  await next.click();
  await dialog.getByRole("textbox", { name: "Укажите ваш город", exact: true }).fill("Москва");
  await next.click();
  await dialog.getByRole("textbox", { name: "Детали обращения", exact: true }).fill("Автоматическая проверка интерфейса. Заявка не отправляется.");
  await next.click();
  await expect(dialog.getByText("Прикрепите файл (при необходимости)", { exact: true })).toBeVisible();
  await expect(progress).toHaveAttribute("aria-valuenow", "5");
  await next.click(); // Attachment intentionally omitted: it is optional.
  const submit = dialog.getByRole("button", { name: "Отправить заявку", exact: true });
  await submit.click();
  await expect(dialog.getByRole("alert")).toHaveText("Подтвердите согласие на обработку персональных данных");
  await expect(progress).toHaveAttribute("aria-valuenow", "6");
  await dialog.getByRole("checkbox", { name: "Согласие на обработку персональных данных" }).check();
  await expect(progress).toHaveAttribute("aria-valuenow", "6");
  await submit.click();
  await expect(progress).toHaveAttribute("aria-valuenow", "7");
  await expect(progress).toHaveAttribute("aria-valuetext", "Заполнение завершено");
  await expect(dialog.getByRole("status")).toContainText("Заявка отправлена");
  await expect(dialog.getByRole("status")).toContainText("В ближайшее время наш менеджер свяжется с вами.");
  await expect(dialog.getByRole("status")).toContainText("Благодарим за выбор компании Heisskraft!");
  await expect(dialog.getByRole("status")).toBeFocused();
  expect(submissions, "This checks only the demo UI; no delivery backend is connected").toEqual([]);
  await page.keyboard.press("Escape");
  await expect(dialog).toHaveCount(0);
});
