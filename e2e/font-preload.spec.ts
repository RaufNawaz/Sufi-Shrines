import { test, expect } from './fixtures';

/**
 * Nastaliq is preloaded only for readers who will actually see it.
 *
 * A3 (Delegated Execution Plan) gated the 700 weight this way, because
 * preloading it unconditionally "would cost every English-first visitor
 * ~154KB they don't need". The 400 weight was still preloaded statically for
 * everyone — the same 156KB cost, on the same critical path, exempted from
 * the same argument. Both weights are now injected by the inline script in
 * index.html, which follows the same lang-detection order as
 * detectInitialLang() (LanguageContext.tsx).
 *
 * The @font-face rules carry a unicode-range, so an English reader who never
 * paints an Arabic-script glyph now fetches neither face.
 */
test.describe('Urdu font preload', () => {
  for (const weight of ['400', '700'] as const) {
    test(`preloads the ${weight} weight when Urdu is the initial language`, async ({ page }) => {
      await page.goto('/?lang=ur');
      const link = page.locator(`link[rel="preload"][href*="NotoNastaliqUrdu-${weight}"]`);
      await expect(link).toHaveCount(1);
    });

    test(`does not preload the ${weight} weight for a default English load`, async ({ page }) => {
      await page.goto('/');
      const link = page.locator(`link[rel="preload"][href*="NotoNastaliqUrdu-${weight}"]`);
      await expect(link).toHaveCount(0);
    });
  }

  test('the preloaded font URLs actually resolve', async ({ page, request }) => {
    // A preload that 404s is worse than no preload: it costs a request, logs
    // an error, and warms nothing. Both of these pointed at /fonts/... on the
    // production deploy, which is served from /Sufi-Shrines/ — Vite rewrites
    // href attributes in index.html but not string literals inside a script,
    // so the injected preloads silently missed while the CSS @font-face (which
    // Vite does rewrite) kept working. The bug was invisible in the app.
    await page.goto('/?lang=ur');
    const hrefs = await page
      .locator('link[rel="preload"][href*="NotoNastaliqUrdu"]')
      .evaluateAll((links) => links.map((l) => (l as HTMLLinkElement).getAttribute('href') ?? ''));
    expect(hrefs.length, 'expected both Nastaliq weights to be preloaded').toBe(2);

    const base = await page.evaluate(() => document.baseURI);
    for (const href of hrefs) {
      const url = new URL(href, base).toString();
      const response = await request.get(url);
      expect(response.status(), `preloaded font 404s: ${url}`).toBe(200);
    }
  });

  test('an Urdu page still renders in Nastaliq, not a fallback face', async ({ page }) => {
    // The preload is an optimisation; the @font-face is what must hold.
    await page.goto('/?lang=ur');
    const heading = page.locator('h1, .shrine-title').first();
    await expect(heading).toBeVisible();
    const family = await heading.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Nastaliq/i);
  });
});
