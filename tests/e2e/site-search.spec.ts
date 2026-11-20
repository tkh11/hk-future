import { expect, test, type Page, type TestInfo } from '@playwright/test';

const prefix = process.env.E2E_BASE_PATH ?? '';
const href = (path: string) => `${prefix}${path}${process.env.E2E_EXPORT === 'true' ? '/' : ''}`;
async function openSearch(page: Page, testInfo: TestInfo) {
  await page.goto(`${prefix}/`);
  if (testInfo.project.use.isMobile) await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
  else await page.locator('.site-header__search-toggle').click();
  const form = page.locator(testInfo.project.use.isMobile ? '.site-header__menu-search' : '.site-header__search');
  const input = form.getByRole('searchbox', { name: 'Поиск', exact: true });
  return { form, input, results: form.getByRole('list', { name: 'Быстрые результаты поиска' }) };
}

test('compact search previews the top three matches and supports keyboard navigation', async ({ page }, testInfo) => {
  const { form, input, results } = await openSearch(page, testInfo);
  await input.fill('Heisskraft');
  await expect(results.getByRole('link')).toHaveCount(3);
  if (!testInfo.project.use.isMobile) await expect.poll(async () => (await form.boundingBox())!.width).toBeLessThanOrEqual(181);
  await expect.poll(() => results.locator('img').evaluateAll(images => images.every(image => (image as HTMLImageElement).complete && (image as HTMLImageElement).naturalWidth > 0))).toBe(true);
  const first = results.getByRole('link').first();
  const href = await first.getAttribute('href');
  await input.press('ArrowDown');
  await expect(first).toBeFocused();
  await page.keyboard.press('ArrowDown');
  await expect(results.getByRole('link').nth(1)).toBeFocused();
  await page.keyboard.press('ArrowUp');
  await expect(first).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(url => url.pathname.replace(/\/$/, '') === href!.replace(/\/$/, ''));
  await expect(results).toHaveCount(0);
});

test('searches site pages as well as catalog sections and clears stale previews', async ({ page }, testInfo) => {
  const { input, results, form } = await openSearch(page, testInfo);
  await input.fill('Heisskraft FireOff');
  await expect(results.getByRole('link').first()).toHaveAttribute('href', href('/catalog/pipelines/fireoff'));
  await input.fill('цод');
  await expect(results.locator(`a[href="${href('/solutions/data-centers')}"]`)).toBeVisible();
  await input.fill('zzzzнесуществующий');
  await expect(results).toHaveCount(0);
  await expect(form.getByText('Ничего не найдено. Попробуйте другое название.', { exact: true }).last()).toBeVisible();
  await input.fill('');
  await expect(form.locator('[data-search-result]')).toHaveCount(0);
  await input.fill('контакты');
  await results.locator(`a[href="${href('/contacts')}"]`).click();
  await expect(page).toHaveURL(/\/contacts\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Контакты');
});

test('keeps the chosen preview visible while the destination loads', async ({ page }, testInfo) => {
  let release: () => void = () => {};
  const responseGate = new Promise<void>(resolve => { release = resolve; });
  // Hold every request for the destination, including static export segment files
  // (/contacts/__next.*.txt) that Link prefetches as soon as the result is visible.
  await page.route(url => /\/contacts(?:\/|$)/.test(url.pathname), async route => {
    await responseGate;
    await route.continue();
  });
  try {
    const { input, results } = await openSearch(page, testInfo);
    await input.fill('контакты');
    const result = results.locator(`a[href="${href('/contacts')}"]`);
    // Clicking the thumbnail must work just like clicking its title.
    if (testInfo.project.use.isMobile) await result.locator('img').tap();
    else await result.locator('img').click();
    await expect(result).toBeVisible();
    await expect(result.getByRole('status')).toHaveText('Открываем…');
    release();
    await expect(page).toHaveURL(/\/contacts\/?$/);
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Контакты');
    await expect(results).toHaveCount(0);
  } finally { release(); }
});

test('does not lose a result when the browser would blur the input before click', async ({ page }, testInfo) => {
  const { input, results } = await openSearch(page, testInfo);
  await input.fill('контакты');
  // Reproduce browsers that do not focus an anchor on a mouse press: focus
  // would leave the form before the ensuing click gets dispatched.
  await page.evaluate(() => {
    document.addEventListener('mousedown', event => {
      if (!event.defaultPrevented && (event.target as Element).closest('[data-search-result]')) {
        event.preventDefault();
        (document.activeElement as HTMLElement | null)?.blur();
      }
    });
  });
  await results.locator(`a[href="${href('/contacts')}"]`).click();
  await expect(page).toHaveURL(/\/contacts\/?$/);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Контакты');
});
