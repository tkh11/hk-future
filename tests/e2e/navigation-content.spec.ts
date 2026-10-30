import { expect, test } from '@playwright/test';

const prefix = process.env.E2E_BASE_PATH ?? '';

test('header search returns keyboard focus on Escape and submits to the catalog', async ({ page }, testInfo) => {
  await page.goto(`${prefix}/`);
  if (testInfo.project.use.isMobile) {
    const menuButton = page.getByRole('button', { name: 'Открыть меню', exact: true });
    await menuButton.click();
    const input = page.getByRole('navigation', { name: 'Мобильная навигация' }).getByRole('searchbox', { name: 'Поиск', exact: true });
    await input.click();
    await input.press('Escape');
    await expect(menuButton).toBeFocused();
    await menuButton.click();
    await input.fill('FireOff');
    await input.press('Enter');
    await expect(page).toHaveURL(/\/catalog\/?\?q=FireOff$/);
    await expect(page.getByRole('list', { name: 'Результаты поиска разделов' }).getByRole('link')).toContainText('FireOff');
    return;
  }
  const search = page.locator('.site-header__search');
  const toggle = search.getByRole('button');
  const input = search.getByRole('searchbox', { name: 'Поиск', exact: true });
  await toggle.click();
  await expect(input).toBeFocused();
  await input.press('Escape');
  await expect(toggle).toBeFocused();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await input.fill('FireOff');
  await input.press('Enter');
  await expect(page).toHaveURL(/\/catalog\/?\?q=FireOff$/);
  await expect(page.getByRole('list', { name: 'Результаты поиска разделов' }).getByRole('link')).toContainText('FireOff');
});

for (const path of ['/projects', '/warranty']) {
  test(`${path}: request action opens the form and restores focus on close`, async ({ page }) => {
    await page.goto(`${prefix}${path}`);
    const trigger = page.locator('main').getByRole('button', { name: 'Оставить заявку' });
    await trigger.click();
    const form = page.getByRole('dialog', { name: 'Форма заявки' });
    await expect(form.getByRole('textbox', { name: 'Укажите ваше ФИО' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(form).toHaveCount(0);
    await expect(trigger).toBeFocused();
    await expect(page).toHaveURL(new RegExp(`${path}/?$`));
  });
}

test('knowledge base filtering, accordion, article navigation and FAQ work together', async ({ page }) => {
  await page.goto(`${prefix}/articles`);
  const search = page.getByRole('searchbox', { name: 'Поиск по статьям' });
  await search.fill('zzzzнесуществующаястатья');
  await expect(page.getByRole('heading', { name: 'Статьи не найдены' })).toBeVisible();
  await page.getByRole('button', { name: 'Сбросить поиск' }).click();
  await page.getByRole('group', { name: 'Темы статей' }).getByRole('button', { name: 'Насосы', exact: true }).click();
  const entries = page.locator('[data-article-slug]');
  expect(await entries.count()).toBeGreaterThan(0);
  const title = await entries.first().getByRole('heading').innerText();
  const toggle = entries.first().getByRole('button');
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
  await toggle.click();
  await entries.first().getByRole('link', { name: 'Читать статью' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(title);
  const faq = page.locator('#questions details').first();
  await faq.locator('summary').click();
  await expect(faq).toHaveAttribute('open', '');
  await expect(faq.locator('p')).toBeVisible();
  await page.getByRole('link', { name: 'Все статьи', exact: true }).click();
  await expect(search).toBeVisible();
});
