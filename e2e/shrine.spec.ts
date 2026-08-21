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

  test('the urs block deep-links into the almanac at this shrine', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    // Data Darbar's Events carry a day-precise Hijri urs (18-20 Safar), so
    // the block must render, flag the projection approximate, and land the
    // reader on this shrine's anchored card in the almanac.
    const block = page.locator('.shrine-observances');
    await expect(block).toBeVisible();
    await expect(block.locator('.almanac-flag--approximate')).toBeVisible();

    await block.locator('.shrine-observances-link').click();
    await expect(page).toHaveURL(/\/almanac#data-darbar$/);
    await expect(page.locator('#data-darbar')).toBeVisible();
  });

  test('unknown slug redirects to map', async ({ page }) => {
    await page.goto('/shrine/this-shrine-does-not-exist-xyz123');
    await expect(page).toHaveURL('/');
  });

  test('clicking a related shrine card lands at the top of the new page', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);

    // Scroll deep into the page first — this is what previously left the
    // next page rendered mid-scroll instead of at the top.
    const relatedCard = page.locator('.related-card').first();
    await relatedCard.scrollIntoViewIfNeeded();
    const scrollYBeforeClick = await page.evaluate(() => window.scrollY);
    expect(scrollYBeforeClick).toBeGreaterThan(0);

    await relatedCard.click();
    await expect(page.locator('h1.shrine-title')).toBeVisible();

    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
  });
});
