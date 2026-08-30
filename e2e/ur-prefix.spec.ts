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

  /* Every /ur URL the build publishes as a file, not only the ones anybody
     thought to link. `/ur/settings` and `/ur/review` were emitted by
     prerender.mjs and absent from App.tsx's hand-maintained /ur block for nine
     days, so both painted an Urdu <title> and then rendered the not-found page
     the instant React hydrated — no 404, no console error, nothing to notice.
     The build now refuses that combination
     (scripts/check-routes-prerendered.mjs); this is the browser half, because a
     source-to-source check cannot see a page that renders the wrong thing.

     Neither is in the sitemap and neither is linked internally, which is why
     they were the two that drifted — and why the assertion is that they
     *resolve*, not that they are discoverable. */
  for (const path of ['/ur/settings', '/ur/review', '/ur/typology', '/ur/chronology']) {
    test(`${path} resolves to its page, not the not-found page`, async ({ page }) => {
      await page.goto(path);

      await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
      await expect(page.locator('html')).toHaveAttribute('lang', 'ur');
      await expect(page).toHaveURL(new RegExp(`${path.replace('/ur', '')}\\?lang=ur$`));

      const h1 = page.locator('h1').first();
      await expect(h1).toBeVisible();
      expect(await h1.textContent(), 'rendered the not-found page').not.toContain('صفحہ نہیں ملا');
    });
  }

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
