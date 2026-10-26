import { mkdir } from 'node:fs/promises';
import { expect, type Page } from '@playwright/test';
import type { SolutionContent } from '../../src/content/cms-schemas';
import { test, readDocument } from './cms-fixtures';

async function captureGuide(page: Page, name: string, mobile?: boolean) {
  if (process.env.CMS_E2E_CAPTURE !== 'true') return;
  await mkdir('.local/qa', { recursive: true, mode: 0o700 });
  await page.screenshot({ path: `.local/qa/cms-${name}-${mobile ? 'mobile' : 'desktop'}.png` });
}

test.describe('Payload employee workflow', () => {
  test('dashboard exposes editing actions only to editorial roles and never invents statistics', async ({ cms, page, isMobile }) => {
    await page.context().addCookies((await cms.editor.storageState()).cookies);
    await page.goto('/admin');
    await expect(page.getByRole('heading', { name: 'Управление сайтом', exact: true })).toHaveCount(1);
    for (const name of ['Добавить товар', 'Изменить страницу', 'Добавить статью', 'Загрузить файл']) {
      await expect(page.getByRole('link', { name, exact: false })).toHaveCount(1);
    }
    await expect(page.locator('#statistics')).toContainText('Не подключена');
    await captureGuide(page, 'dashboard', isMobile);
    await page.context().clearCookies();
    await page.context().addCookies((await cms.analyst.storageState()).cookies);
    await page.reload();
    for (const name of ['Добавить товар', 'Изменить страницу', 'Добавить статью', 'Загрузить файл']) {
      await expect(page.getByRole('link', { name, exact: false })).toHaveCount(0);
    }
    await expect(page.locator('#statistics')).toContainText('Не подключена');
  });

  test('product tabs preserve entered values and generate an editable address without changing the SKU', async ({ cms, page, isMobile }) => {
    const { suffix, editor, publisher } = cms;
    const category = await cms.create('categories', { title: `Категория ${suffix}`, slug: suffix, art: 'pipes', _status: 'published' }, publisher, false);
    await page.context().addCookies((await editor.storageState()).cookies);
    await page.goto('/admin/collections/products/create');
    await expect(page.getByRole('textbox', { name: /^Название\s*\*?$/ })).toBeEditable();
    // Payload intentionally creates a private draft before rendering an autosaved form.
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+$/);
    const initialID = page.url().split('/').at(-1)!;
    expect((await (await editor.get(`/api/products/${initialID}?draft=true`)).json())._status).toBe('draft');
    expect((await cms.anonymous.get(`/api/products/${initialID}`)).status()).toBe(404);
    const before = (await (await editor.get('/api/products?limit=1&draft=true')).json()).totalDocs;
    // Waiting without typing must not create further records or autosave empty values.
    await page.waitForTimeout(2200);
    expect((await (await editor.get('/api/products?limit=1&draft=true')).json()).totalDocs).toBe(before);
    await captureGuide(page, 'product', isMobile);
    await page.getByRole('textbox', { name: /^Название\s*\*?$/ }).fill(`Насос ${suffix}`);
    await page.getByRole('textbox', { name: /^Артикул\s*\*?$/ }).fill(`SKU-${suffix}`);
    await page.getByRole('textbox', { name: 'Описание', exact: true }).fill('Описание сохраняется при переходе между вкладками.');
    await page.locator('#field-category').getByRole('combobox').fill(`Категория ${suffix}`);
    await page.getByRole('option', { name: `Категория ${suffix}`, exact: true }).click();
    await page.getByRole('button', { name: 'Переключить Блок', exact: true }).click();
    const slug = page.getByRole('textbox', { name: /^Адрес\s*\*?$/ });
    await expect(slug).not.toHaveValue('');
    await slug.fill(`custom-${suffix}`);
    for (const label of ['Изображения', 'Характеристики', 'Документы', 'Проверка', 'Основное']) {
      await page.getByRole('button', { name: label, exact: true }).click();
    }
    await expect(page.getByRole('textbox', { name: /^Название\s*\*?$/ })).toHaveValue(`Насос ${suffix}`);
    await expect(page.getByRole('textbox', { name: /^Артикул\s*\*?$/ })).toHaveValue(`SKU-${suffix}`);
    await expect(page.getByRole('textbox', { name: 'Описание', exact: true })).toHaveValue('Описание сохраняется при переходе между вкладками.');
    await expect(page.getByRole('button', { name: 'Сохранить черновик', exact: true })).toBeVisible();
    await expect(page).toHaveURL(/\/admin\/collections\/products\/\d+$/);
    const id = page.url().split('/').at(-1)!;
    await expect.poll(async () => {
      const saved = await (await editor.get(`/api/products/${id}?draft=true&depth=0`)).json();
      return { slug: saved.slug, sku: saved.sku, category: saved.category };
    }).toEqual({ slug: `custom-${suffix}`, sku: `SKU-${suffix}`, category: category.id });
    const document = await (await editor.get(`/api/products/${id}?draft=true&depth=0`)).json();
    expect(document.slug).toBe(`custom-${suffix}`);
    expect(document.sku).toBe(`SKU-${suffix}`);
    expect(document.category).toBe(category.id);
    expect(document._status).toBe('draft');
    await page.reload();
    await expect(page.getByRole('textbox', { name: /^Артикул\s*\*?$/ })).toHaveValue(`SKU-${suffix}`);
    await page.getByRole('textbox', { name: /^Название\s*\*?$/ }).fill(`Новое название ${suffix}`);
    await expect.poll(async () => (await readDocument(await editor.get(`/api/products/${id}?draft=true`), 200, false)).title).toBe(`Новое название ${suffix}`);
    const renamed = await (await editor.get(`/api/products/${id}?draft=true`)).json();
    expect(renamed.slug).toBe(`custom-${suffix}`);
    expect(renamed.sku).toBe(`SKU-${suffix}`);
    await expect(page.getByRole('button', { name: 'Опубликовать изменения', exact: true })).toBeDisabled();
    expect((await cms.anonymous.get(`/products/custom-${suffix}`)).status()).toBe(404);
  });

  test('solution text saves through normal fields, preserves model data and can be restored only by a publisher', async ({ cms, page, isMobile }) => {
    const { publisher, editor, suffix } = cms;
    const endpoint = '/api/globals/solution-content';
    const original: SolutionContent = (await (await publisher.get(endpoint)).json()).content;
    const versions = await (await publisher.get(`${endpoint}/versions?limit=1&sort=-updatedAt`)).json();
    const versionID = versions.docs[0].id;
    await page.context().addCookies((await publisher.storageState()).cookies);
    await page.goto('/admin/globals/solution-content');
    await expect(page.getByText('Изменения применятся сразу', { exact: false }).first()).toBeVisible();
    const section = page.locator('details').filter({ has: page.locator('summary', { hasText: 'ЦОД — главный баннер' }) });
    const heading = section.getByRole('textbox', { name: 'Заголовок', exact: true });
    await expect(heading).toHaveValue(original.dcHero.heading);
    await captureGuide(page, 'solution', isMobile);
    await heading.fill(`Проверенный заголовок ${suffix}`);
    await page.locator('#action-save').click();
    await expect.poll(async () => (await (await publisher.get(endpoint)).json()).content.dcHero.heading).toBe(`Проверенный заголовок ${suffix}`);
    const saved: SolutionContent = (await (await publisher.get(endpoint)).json()).content;
    expect(saved).toEqual({ ...original, dcHero: { ...original.dcHero, heading: `Проверенный заголовок ${suffix}` } });
    await page.reload();
    await expect(heading).toHaveValue(`Проверенный заголовок ${suffix}`);
    await page.context().clearCookies();
    await page.context().addCookies((await editor.storageState()).cookies);
    await page.reload();
    await expect(heading).not.toBeEditable();
    expect((await editor.post(`${endpoint}/versions/${versionID}`, { data: {} })).status()).toBe(403);
    expect((await publisher.post(`${endpoint}/versions/${versionID}?overrideLock=true`, { data: {} })).status()).toBe(200);
    expect((await (await publisher.get(endpoint)).json()).content).toEqual(original);
  });

  test('a rejected save leaves the text available for correction and retry', async ({ cms, page }) => {
    const { publisher, suffix } = cms;
    await page.context().addCookies((await publisher.storageState()).cookies);
    await page.goto('/admin/globals/solution-content');
    const section = page.locator('details').filter({ has: page.locator('summary', { hasText: 'ЦОД — главный баннер' }) });
    const heading = section.getByRole('textbox', { name: 'Заголовок', exact: true });
    const value = `Правка после сбоя ${suffix}`;
    await heading.fill(value);
    let rejected = false;
    await page.route('**/api/globals/solution-content*', async route => {
      if (route.request().method() === 'POST') {
        rejected = true;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'Тестовый отказ сохранения. Повторите попытку.' }] }) });
      } else await route.continue();
    });
    await page.locator('#action-save').click();
    await expect.poll(() => rejected).toBe(true);
    await expect(page.getByRole('status').filter({ hasText: 'Не удалось сохранить' })).toBeVisible();
    await expect(heading).toHaveValue(value);
    await page.unroute('**/api/globals/solution-content*');
    await page.locator('#action-save').click();
    await expect.poll(async () => (await (await publisher.get('/api/globals/solution-content')).json()).content.dcHero.heading).toBe(value);
  });

  test('a failed upload does not discard its title and description', async ({ cms, page }) => {
    const { publisher, suffix } = cms;
    await page.context().addCookies((await publisher.storageState()).cookies);
    await page.goto('/admin/collections/media/create');
    let rejected = false;
    await page.route('**/api/media*', async route => {
      if (['POST', 'PATCH'].includes(route.request().method())) {
        rejected = true;
        await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ errors: [{ message: 'Тестовый отказ загрузки файла. Повторите попытку.' }] }) });
      } else await route.continue();
    });
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=', 'base64');
    await page.locator('input[type=file]').setInputFiles({ name: `${suffix}.png`, mimeType: 'image/png', buffer: png });
    const title = page.getByRole('textbox', { name: /^Название\s*\*?$/ });
    const alt = page.getByRole('textbox', { name: /^Альтернативный текст\s*\*?$/ });
    await title.fill(`Файл ${suffix}`);
    await alt.fill('Описание файла, сохранённое после ошибки.');
    await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
    await expect.poll(() => rejected).toBe(true);
    await expect(page.getByRole('alert').filter({ hasText: 'Не удалось сохранить черновик' })).toBeVisible();
    await expect(title).toHaveValue(`Файл ${suffix}`);
    await expect(alt).toHaveValue('Описание файла, сохранённое после ошибки.');
    expect((await (await publisher.get(`/api/media?where[title][equals]=${encodeURIComponent(`Файл ${suffix}`)}`)).json()).totalDocs).toBe(0);
    await page.unroute('**/api/media*');
    await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+$/);
    await expect(title).toHaveValue(`Файл ${suffix}`);
    await expect(alt).toHaveValue('Описание файла, сохранённое после ошибки.');
  });

  test('a new file uploads successfully as a private draft and reopens with its metadata', async ({ cms, page }) => {
    const { editor, suffix } = cms;
    await page.context().addCookies((await editor.storageState()).cookies);
    await page.goto('/admin/collections/media/create');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j3ioAAAAASUVORK5CYII=', 'base64');
    await page.locator('input[type=file]').setInputFiles({ name: `${suffix}.png`, mimeType: 'image/png', buffer: png });
    await page.getByRole('textbox', { name: /^Название\s*\*?$/ }).fill(`Новое изображение ${suffix}`);
    await page.getByRole('textbox', { name: /^Альтернативный текст\s*\*?$/ }).fill('Изображение для проверки загрузки.');
    await page.getByRole('button', { name: 'Сохранить черновик', exact: true }).click();
    await expect(page).toHaveURL(/\/admin\/collections\/media\/\d+$/);
    const id = page.url().split('/').at(-1)!;
    const file = await (await editor.get(`/api/media/${id}?draft=true`)).json();
    expect(file.title).toBe(`Новое изображение ${suffix}`);
    expect(file.filename).toMatch(/\.png$/);
    expect(file._status).toBe('draft');
    expect([403, 404]).toContain((await cms.anonymous.get(new URL(file.url).pathname)).status());
    await page.reload();
    await expect(page.getByRole('textbox', { name: /^Название\s*\*?$/ })).toHaveValue(`Новое изображение ${suffix}`);
    await expect(page.getByRole('textbox', { name: /^Альтернативный текст\s*\*?$/ })).toHaveValue('Изображение для проверки загрузки.');
  });

  test('another editor sees a lock warning and can open a read-only copy', async ({ cms, page, browser, extraHTTPHeaders }) => {
    const { editor, publisher, suffix } = cms;
    const doc = await cms.create('pages', { title: suffix, path: `/${suffix}`, blocks: [], _status: 'draft' });
    await page.context().addCookies((await editor.storageState()).cookies);
    await page.goto(`/admin/collections/pages/${doc.id}`);
    // Payload releases a lock when autosave completes. Hold only the autosave
    // request to exercise a real concurrent edit, leaving form-state/lock calls intact.
    let release = () => {};
    const saving = new Promise<void>(resolve => { release = resolve; });
    const pattern = `**/api/pages/${doc.id}?*`;
    await page.route(pattern, async route => {
      if (route.request().method() === 'PATCH') await saving;
      await route.continue();
    });
    const otherContext = await browser.newContext({ extraHTTPHeaders, viewport: page.viewportSize() });
    try {
      await page.locator('input[name="title"]').fill(`Правка владельца ${suffix}`);
      await expect(page.getByText('Запись редактирует другой сотрудник.', { exact: false })).toHaveCount(0);
      await expect.poll(async () => {
        const response = await editor.get(`/api/payload-locked-documents?where[document.relationTo][equals]=pages&where[document.value][equals]=${doc.id}&depth=0`);
        return { status: response.status(), count: response.ok() ? (await response.json()).totalDocs : null };
      }, { message: 'The first editor must hold the document lock before a second editor opens it.' }).toEqual({ status: 200, count: 1 });
      expect((await publisher.get(`/api/users/${cms.editorID}`)).status()).toBe(404);
      await otherContext.addCookies((await publisher.storageState()).cookies);
      const otherPage = await otherContext.newPage();
      await otherPage.goto(`/admin/collections/pages/${doc.id}`);
      await expect(otherPage.getByRole('heading', { name: 'Документ заблокирован', exact: true })).toBeVisible();
      await otherPage.getByRole('button', { name: 'Просмотр только для чтения', exact: true }).click();
      await expect(otherPage.locator('input[name="title"]')).not.toBeEditable();
      await expect(page.locator('input[name="title"]')).toBeEditable();
      release();
      await expect.poll(async () => (await (await editor.get(`/api/pages/${doc.id}?draft=true`)).json()).title).toBe(`Правка владельца ${suffix}`);
    } finally {
      release();
      await page.unroute(pattern);
      await otherContext.close();
    }
  });
});
