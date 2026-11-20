import { expect, test } from '@playwright/test';

const prefix = process.env.E2E_BASE_PATH ?? '';

test('hero resumes the same slide and timeline after repeated visibility changes', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  // Headless Chrome keeps tabs visible. Drive the Page Visibility API explicitly.
  await page.addInitScript(() => {
    let hidden = false;
    Object.defineProperty(document, 'hidden', { get: () => hidden });
    Object.defineProperty(document, 'visibilityState', { get: () => hidden ? 'hidden' : 'visible' });
    window.addEventListener('test-visibility', event => {
      hidden = (event as CustomEvent<boolean>).detail;
      document.dispatchEvent(new Event('visibilitychange'));
    });
  });
  await page.goto(`${prefix}/`);
  const hero = page.getByRole('region', { name: 'Решения HEISSKRAFT' });
  const select = hero.getByRole('button');
  const progress = () => hero.locator('.park-banner__progress').evaluateAll(elements => elements.map(element => new DOMMatrixReadOnly(getComputedStyle(element).transform).a));
  for (const index of [0, 2, 1, 2, 0]) {
    await select.nth(index).click();
    const video = hero.locator('video').nth(index);
    await expect(video).toHaveAttribute('data-ready', 'true');
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(0.2);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-visibility', { detail: true })));
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.paused)).toBe(true);
    const pausedTime = await video.evaluate((element: HTMLVideoElement) => element.currentTime);
    const pausedProgress = await progress();
    await page.waitForTimeout(400); // Verify that media AND progress stay frozen.
    expect(await video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeCloseTo(pausedTime, 1);
    expect(await progress()).toEqual(pausedProgress);
    const poster = hero.locator('.is-active .park-banner__poster');
    await expect(poster).toHaveJSProperty('complete', true);
    expect(await poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await page.evaluate(() => window.dispatchEvent(new CustomEvent('test-visibility', { detail: false })));
    await expect(video).toHaveAttribute('data-ready', 'true');
    await expect(select.nth(index)).toHaveAttribute('aria-pressed', 'true');
    await expect.poll(() => video.evaluate((element: HTMLVideoElement) => element.currentTime)).toBeGreaterThan(pausedTime);
    const fills = await progress();
    fills.forEach((value, i) => { if (i !== index) expect(value).toBe(i < index ? 1 : 0); });
    await hero.locator('video').nth((index + 1) % 3).dispatchEvent('ended');
    await expect(select.nth(index)).toHaveAttribute('aria-pressed', 'true');
  }
});

test('hero keeps a loaded poster and usable navigation when video requests fail', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.route('**/videos/home/*.mp4', route => route.abort());
  await page.goto(`${prefix}/`);
  const hero = page.getByRole('region', { name: 'Решения HEISSKRAFT' });
  for (const index of [0, 1, 2]) {
    await hero.getByRole('button').nth(index).click();
    const poster = hero.locator('.is-active .park-banner__poster');
    await expect(poster).toHaveJSProperty('complete', true);
    expect(await poster.evaluate((image: HTMLImageElement) => image.naturalWidth)).toBeGreaterThan(0);
    await expect(hero.locator('video').nth(index)).toHaveCSS('opacity', '0');
    await expect(hero.getByRole('link', { name: 'Смотреть каталог' })).toBeVisible();
  }
});
