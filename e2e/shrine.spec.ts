import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

const TEST_SLUG = 'data-darbar';
const TEST_NAME = 'Data Darbar';

test.describe('Shrine detail page', () => {
  test('renders title, breadcrumb, and article', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await expect(page.locator('h1.shrine-title')).toContainText(TEST_NAME);

    await expect(page.locator('.shrine-breadcrumb')).toBeVisible();
    await expect(page.locator('article.shrine-page')).toBeVisible();
  });

  test('pre-rendered page has correct document title', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);
    await expect(page).toHaveTitle(new RegExp(TEST_NAME));
  });

  test('back-to-map link returns to map', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    await page.getByRole('link', { name: UI_TEXT.en.backToMap }).first().click();

    await expect(page).toHaveURL('/');
  });

  test('share button copies link to clipboard', async ({ page, context }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(`/shrine/${TEST_SLUG}`);

    await page.getByRole('button', { name: UI_TEXT.en.share }).click();

    // Toast appears briefly
    await expect(page.locator('.share-toast--visible')).toBeVisible();
  });

  test('unknown slug redirects to map', async ({ page }) => {
    await page.goto('/shrine/this-shrine-does-not-exist-xyz123');
    await expect(page).toHaveURL('/');
  });
});
