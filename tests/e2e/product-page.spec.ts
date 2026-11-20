import { expect, test } from '@playwright/test';

// Product routes are backed by Payload and are intentionally absent from the static demo.
test.skip(process.env.E2E_CMS_CONTENT !== 'true', 'Requires the local imported Payload catalog');
const productPath = '/products/truba-gofrirovannaya-corrugatedpipe';
const productTitle = 'Труба гофрированная CorrugatedPipe';

test('product tabs keep variant filters, support the keyboard and expose the catalog path', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /hydrat|server rendered HTML/i.test(message.text())) errors.push(message.text());
  });
  await page.goto(productPath);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(productTitle);
  await expect(page.locator('article h1 + p')).toHaveCount(0);
  const trail = page.getByRole('navigation', { name: 'Путь по каталогу' });
  await expect(trail.locator('[aria-current="page"]')).toHaveText(productTitle);
  await expect(trail.getByRole('link', { name: 'Каталог', exact: true })).toHaveAttribute('href', '/catalog');

  const tabs = page.getByRole('tablist', { name: 'Информация о товаре' });
  await expect(tabs.getByRole('tab')).toHaveText(['Описание', 'Характеристики', 'Номенклатура', 'Фотографии и чертежи', 'Документы']);
  const variants = tabs.getByRole('tab', { name: 'Номенклатура', exact: true });
  await variants.click();
  const filter = page.getByRole('searchbox', { name: 'Артикул или исполнение' });
  await filter.fill('14524161');
  await expect(page.getByRole('tabpanel').getByRole('status')).toHaveText('1–1 из 1');
  await tabs.getByRole('tab', { name: 'Характеристики', exact: true }).click();
  await expect(page.getByRole('tabpanel')).toHaveCount(1);
  await variants.click();
  await expect(filter).toHaveValue('14524161');
  await variants.focus();
  await page.keyboard.press('ArrowRight');
  await expect(tabs.getByRole('tab', { name: 'Фотографии и чертежи' })).toBeFocused();
  await expect(page.getByRole('tabpanel', { name: 'Фотографии и чертежи' })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(errors).toEqual([]);
});

test('document covers open an inline preview, have separate download and keep mobile columns', async ({ page }, testInfo) => {
  const downloads: string[] = [];
  page.on('download', download => downloads.push(download.suggestedFilename()));
  await page.goto(productPath);
  await page.getByRole('tab', { name: 'Документы', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Дополнительные материалы', exact: true })).toHaveCount(0);
  const grid = page.getByRole('list', { name: 'Документы товара' });
  const cards = grid.getByRole('button', { name: /^Предпросмотр:/ });
  await expect(cards.first()).toBeVisible();
  const columns = await grid.evaluate(element => getComputedStyle(element).gridTemplateColumns.split(' ').length);
  expect(columns).toBe(testInfo.project.use.isMobile ? 2 : 4);
  await expect(cards.first()).toHaveCSS('border-top-width', '0px');
  if (!testInfo.project.use.isMobile) {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await cards.first().hover({ position: { x: 20, y: 20 } });
    await expect(cards.first().locator('[data-hovered="true"]')).toHaveCount(1);
    await expect(cards.first().getByText('Предпросмотр', { exact: true })).toHaveCSS('opacity', '1');
  }
  await cards.first().click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  const iframe = dialog.locator('iframe');
  await expect(iframe).toHaveAttribute('src', /\/docs\/file\/\d+#view=FitH$/);
  await expect(dialog.getByRole('link', { name: 'Скачать PDF' })).toHaveAttribute('href', /\/docs\/file\/\d+\?download=1$/);
  const previewURL = (await iframe.getAttribute('src'))!.split('#')[0];
  const response = await page.request.get(previewURL, { headers: { Range: 'bytes=0-99' } });
  expect(response.status()).toBe(206);
  expect(response.headers()['content-disposition']).toContain('inline');
  expect(downloads).toEqual([]);
  await page.keyboard.press('Escape');
  await expect(dialog).toHaveCount(0);
  await expect(cards.first()).toBeFocused();
});

test('request includes the selected product, allows editing and resets on a general request', async ({ page }) => {
  await page.goto(productPath);
  await page.getByRole('button', { name: 'Запросить предложение', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Форма заявки' });
  await expect(dialog.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
  const details = dialog.locator('textarea[name="details"]');
  await expect(details).toHaveValue(`Прошу подготовить предложение на «${productTitle}».\nСтраница товара: ${productPath}`);
  const next = dialog.getByRole('button', { name: 'Далее', exact: true });
  await dialog.getByRole('textbox', { name: 'Укажите ваше ФИО', exact: true }).fill('Тестовый Тест Тестович');
  await next.click();
  await dialog.getByRole('textbox', { name: 'Укажите ваш номер телефона', exact: true }).fill('9991234567');
  await next.click();
  await dialog.getByRole('textbox', { name: 'Укажите ваш e-mail', exact: true }).fill('e2e@example.test');
  await next.click();
  await dialog.getByRole('textbox', { name: 'Укажите ваш город', exact: true }).fill('Москва');
  await next.click();
  await expect(details).toBeVisible();
  await details.fill('Нужна поставка выбранной трубы — 100 метров.');
  await next.click();
  await dialog.getByRole('button', { name: 'Предыдущий шаг' }).click();
  await expect(details).toHaveValue('Нужна поставка выбранной трубы — 100 метров.');
  await page.keyboard.press('Escape');
  const trigger = page.locator('.site-header__nav').getByRole('button', { name: 'Оставить заявку', exact: true });
  if (await trigger.isVisible()) await trigger.click();
  else {
    await page.getByRole('button', { name: 'Открыть меню', exact: true }).click();
    await page.getByRole('navigation', { name: 'Мобильная навигация' }).getByRole('button', { name: 'Оставить заявку' }).click();
  }
  await expect(dialog.locator('textarea[name="details"]')).toHaveValue('');
});

test('pump nomenclature is loaded on demand and paginated on the server', async ({ page }) => {
  const calls: string[] = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname.endsWith('/nomenclature')) calls.push(request.url());
  });
  await page.goto('/products/hip');
  const article = page.locator('main article');
  await expect(article.getByRole('link', { name: 'Подбор оборудования' })).toHaveAttribute('href', '/selection/pumps');
  await expect(article.getByRole('heading', { name: 'Применение', exact: true })).toBeVisible();
  const tabs = article.getByRole('tablist');
  const box = await tabs.boundingBox();
  expect(Math.abs(box!.x + box!.width / 2 - page.viewportSize()!.width / 2)).toBeLessThan(2);
  expect(calls).toHaveLength(0);
  await tabs.getByRole('tab', { name: 'Номенклатура' }).click();
  const rows = article.locator('[role=tabpanel]:visible tbody tr');
  await expect(rows).toHaveCount(10);
  const first = await rows.first().locator('th').innerText();
  const next = article.getByRole('button', { name: 'Вперёд' });
  await next.click();
  await expect(rows.first().locator('th')).not.toHaveText(first);
  for (const limit of [20, 50, 100]) {
    await article.getByLabel('Позиций на странице').selectOption(String(limit));
    await expect(rows).toHaveCount(limit);
    await expect(rows.first().locator('th')).toHaveText(first);
  }
  await next.click();
  await expect(article.getByText('Страница 2 из 2')).toBeVisible();
  await expect(next).toBeDisabled();
  expect((await rows.count())).toBeGreaterThan(0);
  expect((await rows.count())).toBeLessThan(100);
});
