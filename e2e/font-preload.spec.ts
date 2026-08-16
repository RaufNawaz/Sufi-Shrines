import { test, expect } from './fixtures';

/**
 * A3 (Delegated Execution Plan): headings render at font-weight 700, but
 * index.html only <link rel="preload">s the 400 weight statically — on a
 * cold Urdu load the 700 face arrived late (synthetic-bold flash, then a
 * swap). Preloading it unconditionally would cost every English-first
 * visitor ~154KB they don't need, so a small inline script in index.html
 * injects the preload only when the same lang-detection order as
 * detectInitialLang() (LanguageContext.tsx) resolves to Urdu.
 */
test.describe('Urdu heading-weight font preload', () => {
  test('preloads the 700 weight when Urdu is the initial language', async ({ page }) => {
    await page.goto('/?lang=ur');
    const link = page.locator('link[rel="preload"][href*="NotoNastaliqUrdu-700"]');
    await expect(link).toHaveCount(1);
  });

  test('does not preload the 700 weight for a default English load', async ({ page }) => {
    await page.goto('/');
    const link = page.locator('link[rel="preload"][href*="NotoNastaliqUrdu-700"]');
    await expect(link).toHaveCount(0);
  });
});
