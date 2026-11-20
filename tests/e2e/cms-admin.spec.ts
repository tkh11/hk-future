import { mkdir } from 'node:fs/promises';
import { jsPDF } from 'jspdf';
import { expect, type Page } from '@playwright/test';
import { test } from './cms-fixtures';

async function captureGuide(page: Page, name: string, mobile?: boolean) {
  if (process.env.CMS_E2E_CAPTURE !== 'true') return;
  await mkdir('.local/qa', { recursive: true, mode: 0o700 });
  await page.screenshot({ path: `.local/qa/cms-${name}-${mobile ? 'mobile' : 'desktop'}.png` });
}

test.describe('Studio employee workflow', () => {
  test('overview exposes editing work only to editorial roles and never invents statistics', async ({ cms, page, isMobile }) => {
    await page.context().addCookies(cms.cookies(cms.editorActor));
    await page.goto('/studio');
    await expect(page.getByRole('heading', { name: 'Обзор', exact: true })).toHaveCount(1);
    await expect(page.getByRole('link', { name: 'Товары', exact: true })).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Задачи' })).toHaveCount(1);
    await expect(page.getByText('Яндекс Метрика')).toBeVisible();
    await captureGuide(page, 'dashboard', isMobile);
    await page.context().clearCookies();
    await page.context().addCookies(cms.cookies(cms.analystActor));
    await page.reload();
    await expect(page.getByRole('link', { name: 'Товары', exact: true })).toHaveCount(0);
    await expect(page.getByRole('heading', { name: 'Задачи' })).toHaveCount(0);
    await expect(page.getByText('Яндекс Метрика')).toBeVisible();
  });

  test('product form preserves entered values and generates an editable address without changing the SKU', async ({ cms, page, isMobile }) => {
    const { suffix, editorActor, publisherActor } = cms;
    await cms.create('categories', { title: `Категория ${suffix}`, slug: suffix, art: 'pipes', _status: 'published' }, publisherActor, false);
    await page.context().addCookies(cms.cookies(editorActor));
    await page.goto('/studio/assortment/new');
    await expect(page.getByLabel('Название', { exact: true })).toBeEditable();
    await page.getByLabel('Название', { exact: true }).fill(`Насос ${suffix}`);
    await page.getByLabel('Раздел каталога').selectOption({ label: `Категория ${suffix}` });
    await page.getByRole('radio', { name: 'Один артикул', exact: true }).check();
    const slug = page.getByLabel('Адрес на сайте');
    await expect(slug).not.toHaveValue('');
    await slug.fill(`custom-${suffix}`);
    await page.getByRole('button', { name: 'Создать черновик', exact: true }).click();
    await expect(page).toHaveURL(/\/studio\/assortment\/\d+$/);
    const id = Number(page.url().split('/').at(-1));
    cms.track('products', id);
    await captureGuide(page, 'product', isMobile);
    await page.getByLabel('Артикул', { exact: true }).fill(`SKU-${suffix}`);
    await page.getByRole('textbox', { name: 'Описание', exact: true }).fill('Описание сохраняется при переходе между разделами.');
    // The section list is hidden on narrow screens.
    if (!isMobile) {
      await page.getByRole('navigation', { name: 'Разделы карточки' }).getByRole('link', { name: 'Документы' }).click();
      await page.getByRole('navigation', { name: 'Разделы карточки' }).getByRole('link', { name: 'Информация для карточки' }).click();
    }
    await expect(page.getByLabel('Название', { exact: true })).toHaveValue(`Насос ${suffix}`);
    await expect(page.getByLabel('Артикул', { exact: true })).toHaveValue(`SKU-${suffix}`);
    await expect.poll(async () => {
      const saved = await cms.find('products', id, editorActor, true);
      return { slug: saved.slug as string, sku: saved.sku as string };
    }).toEqual({ slug: `custom-${suffix}`, sku: `SKU-${suffix}` });
    await page.reload();
    await expect(page.getByLabel('Артикул', { exact: true })).toHaveValue(`SKU-${suffix}`);
    await page.getByLabel('Название', { exact: true }).fill(`Новое название ${suffix}`);
    await expect.poll(async () => (await cms.find('products', id, editorActor, true)).title).toBe(`Новое название ${suffix}`);
    const renamed = await cms.find('products', id, editorActor, true);
    expect(renamed.slug).toBe(`custom-${suffix}`);
    expect(renamed.sku).toBe(`SKU-${suffix}`);
    await expect(page.getByRole('button', { name: 'Опубликовать', exact: true })).toHaveCount(0);
    expect((await cms.anonymous.get(`/products/custom-${suffix}`)).status()).toBe(404);
  });

  test('Studio hides the retired editors and their routes', async ({ cms, page }) => {
    await page.context().addCookies(cms.cookies(cms.publisherActor));
    await page.goto('/studio');
    const nav = page.getByRole('navigation', { name: 'Разделы', exact: true });
    await expect(page.locator('html')).toHaveAttribute('data-studio-sidebar-ready', '');
    await nav.getByRole('button', { name: 'Сайт', exact: true }).click();
    await expect(nav.getByRole('link', { name: 'Контакты' })).toBeVisible();
    for (const name of ['Страницы', 'Тексты ЦОД', 'Настройки сайта']) {
      await expect(nav.getByRole('link', { name, exact: true })).toHaveCount(0);
    }
    for (const path of ['/studio/site', '/studio/site/1', '/studio/site/solutions', '/studio/site/settings']) {
      expect((await page.goto(path))?.status()).toBe(404);
    }
  });

  test('moving a document in Studio changes the public document order', async ({ cms, page, isMobile }) => {
    const titles = ['Первый', 'Второй'].map(name => name + ' ' + cms.suffix);
    for (const [index, title] of titles.entries()) {
      const pdf = Buffer.from(new jsPDF().text(cms.suffix + '-' + index, 10, 10).output('arraybuffer'));
      const file = await cms.upload(cms.publisherActor, cms.suffix + '-' + index + '.pdf', pdf, false);
      await cms.create('catalog-documents', { title, file: file.id, _status: 'published' }, cms.publisherActor, false);
    }
    await page.context().addCookies(cms.cookies(cms.publisherActor));
    await page.goto('/studio/assortment/documents?limit=100');
    await expect(page.getByLabel('Позиций на странице')).toBeEnabled();
    const source = page.getByRole('article').nth(1);
    const movedTitle = await source.locator('strong').innerText();
    const target = page.getByRole('article').first();
    if (isMobile) {
      await source.getByRole('spinbutton').fill('1');
      await source.getByRole('button').click();
    } else {
      await source.dragTo(target);
    }
    await expect(page.getByRole('status').filter({ hasText: 'Порядок сохранён.' })).toBeVisible();
    await expect(page.getByRole('article').first().locator('strong')).toHaveText(movedTitle);
    await page.goto('/docs');
    await expect(page.getByRole('list', { name: 'Каталоги и PDF-документы' }).getByRole('button').first()).toHaveAccessibleName('Посмотреть документ: ' + movedTitle);
  });

  test('a failed upload does not discard the selected file name from the notice path, and a retry stores the file', async ({ cms, page }) => {
    const { publisherActor, suffix } = cms;
    await page.context().addCookies(cms.cookies(publisherActor));
    await page.goto('/studio/media');
    let rejected = false;
    await page.route('**/studio/media**', async route => {
      if (route.request().method() === 'POST') {
        rejected = true;
        await route.fulfill({ status: 503, contentType: 'text/plain', body: 'Тестовый отказ загрузки.' });
      } else await route.continue();
    });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
    await page.locator('input[type=file]').setInputFiles({ name: `${suffix}.png`, mimeType: 'image/png', buffer: png });
    await expect.poll(() => rejected).toBe(true);
    await expect(page.getByRole('status')).toBeVisible();
    await page.unroute('**/studio/media**');
    await page.locator('input[type=file]').setInputFiles({ name: `${suffix}.png`, mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('status').filter({ hasText: 'Загружено' })).toBeVisible();
  });

  test('a new file uploads successfully as a private draft and reopens with its metadata', async ({ cms, page }) => {
    const { editorActor, suffix } = cms;
    await page.context().addCookies(cms.cookies(editorActor));
    await page.goto('/studio/media');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAADUlEQVQImWNgYGBgAAAABQABh6FO1AAAAABJRU5ErkJggg==', 'base64');
    await page.locator('input[type=file]').setInputFiles({ name: `${suffix}.png`, mimeType: 'image/png', buffer: png });
    await expect(page.getByRole('status').filter({ hasText: 'Загружено' })).toBeVisible();
    const files = await cms.payload.find({ collection: 'media', user: editorActor.user, overrideAccess: false, draft: true, where: { filename: { contains: suffix } }, limit: 1 });
    expect(files.docs[0]?._status).toBe('draft');
    if (typeof files.docs[0]?.id === 'number') cms.track('media', files.docs[0].id);
    expect([403, 404]).toContain((await cms.anonymous.get(`/api/media/file/${files.docs[0].filename}`)).status());
    await page.reload();
    await expect(page.getByRole('button', { name: suffix, exact: false })).toBeVisible();
  });

  test('another editor sees a lock warning and a read-only card', async ({ cms, page, browser, extraHTTPHeaders }) => {
    const { editorActor, publisherActor, suffix } = cms;
    const category = await cms.create('categories', { title: `Категория ${suffix}`, slug: suffix, art: 'pipes', _status: 'published' }, publisherActor, false);
    const doc = await cms.create('products', { title: suffix, slug: suffix, sku: suffix, category: category.id, productKind: 'single', _status: 'draft' });
    await page.context().addCookies(cms.cookies(editorActor));
    await page.goto(`/studio/assortment/${doc.id}`);
    await expect(page.getByLabel('Название', { exact: true })).toBeEditable();
    await expect.poll(async () => (await cms.payload.find({
      collection: 'payload-locked-documents',
      where: { and: [{ 'document.relationTo': { equals: 'products' } }, { 'document.value': { equals: doc.id } }] },
      limit: 1,
      overrideAccess: true,
    })).totalDocs).toBe(1);
    const otherContext = await browser.newContext({ extraHTTPHeaders, viewport: page.viewportSize() });
    try {
      await otherContext.addCookies(cms.cookies(publisherActor));
      const otherPage = await otherContext.newPage();
      await otherPage.goto(`/studio/assortment/${doc.id}`);
      await expect(otherPage.getByRole('status').filter({ hasText: 'Карточку редактирует' })).toBeVisible();
      await expect(otherPage.getByLabel('Название', { exact: true })).toBeDisabled();
      await expect(page.getByLabel('Название', { exact: true })).toBeEditable();
    } finally {
      await otherContext.close();
    }
  });
});
