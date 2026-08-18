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

  test('an Urdu page still renders in Nastaliq, not a fallback face', async ({ page }) => {
    // The preload is an optimisation; the @font-face is what must hold.
    await page.goto('/?lang=ur');
    const heading = page.locator('h1, .shrine-title').first();
    await expect(heading).toBeVisible();
    const family = await heading.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Nastaliq/i);
  });
});
