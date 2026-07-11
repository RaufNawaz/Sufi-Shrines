import { test, expect } from '@playwright/test';

// No baseline snapshots are committed — Playwright screenshots are pixel-
// sensitive to OS font rendering, so a baseline generated on one platform
// never matches another. CI runs on ubuntu-latest; generate real baselines
// by running `npx playwright test e2e/visual.spec.ts --update-snapshots` in
// that same environment (e.g. a one-off CI job) and commit the result.
const TEST_SLUG = 'data-darbar';

// Stable viewport for all visual tests
test.use({ viewport: { width: 1280, height: 800 } });

// Clear theme/lang state before each test so screenshots are deterministic
test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await page.evaluate(() => {
    localStorage.removeItem('shrines_theme');
    localStorage.removeItem('shrines_language');
    localStorage.removeItem('shrines_tours');
  });
  await page.reload({ waitUntil: 'domcontentloaded' });
});

test.describe('Visual regression — Map sidebar', () => {
  test('light mode — welcome state', async ({ page }) => {
    await page.goto('/');
    // Wait for shrine data to load (markers appear)
    await page.waitForSelector('.shrine-dot', { state: 'attached', timeout: 15_000 });
    // Wait for sidebar content to settle
    await page.waitForSelector('.welcome-card', { state: 'visible', timeout: 10_000 });
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-welcome-light.png', {
      animations: 'disabled',
    });
  });

  test('dark mode — welcome state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shrine-dot', { state: 'attached', timeout: 15_000 });
    await page.waitForSelector('.welcome-card', { state: 'visible', timeout: 10_000 });
    await page.getByRole('button', { name: 'Dark mode' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-welcome-dark.png', {
      animations: 'disabled',
    });
  });

  test('Urdu / RTL — welcome state', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shrine-dot', { state: 'attached', timeout: 15_000 });
    await page.waitForSelector('.welcome-card', { state: 'visible', timeout: 10_000 });
    await page.getByRole('button', { name: 'اردو' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-welcome-urdu.png', {
      animations: 'disabled',
    });
  });

  test('light mode — shrine list open', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shrine-dot', { state: 'attached', timeout: 15_000 });
    await page.getByRole('button', { name: 'Table of Shrines' }).click();
    await page.waitForSelector('.shrine-list-item', { state: 'visible', timeout: 5_000 });
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-list-light.png', {
      animations: 'disabled',
    });
  });

  test('light mode — shrine preview card', async ({ page }) => {
    await page.goto('/');
    await page.waitForSelector('.shrine-dot', { state: 'attached', timeout: 15_000 });
    await page.getByRole('button', { name: 'Table of Shrines' }).click();
    await page.waitForSelector('.shrine-list-item', { state: 'visible', timeout: 5_000 });
    // Click Data Darbar (most data-complete shrine)
    await page.getByPlaceholder('Search shrines…').fill('Data Darbar');
    await page.locator('.shrine-list-item').first().click();
    await page.waitForSelector('.preview-card', { state: 'visible', timeout: 5_000 });
    await expect(page.locator('#sidebar')).toHaveScreenshot('sidebar-preview-light.png', {
      animations: 'disabled',
    });
  });
});

test.describe('Visual regression — Shrine detail page', () => {
  test('light mode — above fold', async ({ page }) => {
    await page.goto(`/shrine/${TEST_SLUG}`);
    await page.waitForSelector('h1.shrine-title', { state: 'visible', timeout: 15_000 });
    await expect(page.locator('article.shrine-page')).toHaveScreenshot('shrine-layout-light.png', {
      animations: 'disabled',
      // Mask the Google Maps embed — external content changes
      mask: [page.locator('.location-map-embed')],
    });
  });

  test('dark mode — above fold', async ({ page }) => {
    // Set via addInitScript so main.tsx reads it before first paint
    await page.addInitScript(() => localStorage.setItem('shrines_theme', 'dark'));
    await page.goto(`/shrine/${TEST_SLUG}`);
    await page.waitForSelector('h1.shrine-title', { state: 'visible', timeout: 15_000 });
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await expect(page.locator('article.shrine-page')).toHaveScreenshot('shrine-layout-dark.png', {
      animations: 'disabled',
      mask: [page.locator('.location-map-embed')],
    });
  });

  test('Urdu / RTL — above fold', async ({ page }) => {
    // Set language before navigation so LanguageContext reads it on mount
    await page.addInitScript(() => localStorage.setItem('shrines_language', 'ur'));
    await page.goto(`/shrine/${TEST_SLUG}`);
    await page.waitForSelector('h1.shrine-title', { state: 'visible', timeout: 15_000 });
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('article.shrine-page')).toHaveScreenshot('shrine-layout-urdu.png', {
      animations: 'disabled',
      mask: [page.locator('.location-map-embed')],
    });
  });
});
