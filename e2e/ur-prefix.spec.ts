import { test, expect } from './fixtures';

/**
 * B4 (Delegated Execution Plan): /ur/* is a crawler-discovery mirror (real
 * prerendered files, see scripts/prerender.mjs) of the app's normal routes.
 * A browser landing there should render in Urdu with no flash, then quietly
 * normalize the URL back to path + ?lang=ur so every other part of the app
 * (persistence, sharing, this same e2e suite) keeps working unchanged.
 */
test.describe('/ur/* prerender-discovery routes', () => {
  test('/ur/shrine/:slug renders in Urdu and normalizes the URL', async ({ page }) => {
    await page.goto('/ur/shrine/data-darbar');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    const title = page.locator('h1.shrine-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text, 'shrine title should not contain Latin letters').not.toMatch(/[A-Za-z]/);

    await expect(page).toHaveURL(/\/shrine\/data-darbar\?lang=ur$/);
  });

  test('/ur home renders in Urdu and normalizes the URL', async ({ page }) => {
    await page.goto('/ur');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await page.locator('#sidebar').waitFor();

    await expect(page).toHaveURL(/\/\?lang=ur$/);
  });

  test('switching back to English from a normalized /ur/ page works like any other page', async ({
    page,
  }) => {
    await page.goto('/ur/shrine/data-darbar');
    await expect(page).toHaveURL(/\?lang=ur$/);

    await page.getByRole('button', { name: 'EN', exact: true }).click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
    await expect(page).toHaveURL(/\?lang=en$/);
  });
});
