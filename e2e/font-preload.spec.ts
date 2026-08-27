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
 * paints an Arabic-script glyph fetches neither face.
 *
 * **That last sentence was false for three days and nothing here noticed**, which
 * is why this file now measures requests as well as tags. The language toggle
 * renders its own name — اردو — on every page in both languages, and
 * `.lang-seg[lang='ur']` asked for `var(--font-urdu)`, whose first family is
 * Nastaliq. So an English reader painted exactly one Arabic-script run and paid
 * **154 KB** for it: the only Nastaliq text on the entire English map, and the
 * whole cost the gating above exists to avoid. Measured 27 August 2026 with a
 * CPU profile and a response listener; fixed in `map.css`, where the English
 * interface now renders those four letters in whatever Arabic face the system
 * already has.
 *
 * A preload tag is an intention. A request is the cost.
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

  test('an English load requests no Nastaliq at all, not merely no preload', async ({ page }) => {
    /* The assertion the docstring's premise always implied and nothing made.
       Both of the tests above pass on a page that fetches the face anyway —
       "does not preload" and "does not download" are different claims, and only
       one of them is the 154 KB. */
    const requested: string[] = [];
    page.on('request', (request) => {
      if (/NotoNastaliqUrdu.*\.woff2/.test(request.url())) requested.push(request.url());
    });

    await page.goto('/');
    // The toggle is the element that used to trigger it, so wait for it to be
    // painted rather than for an arbitrary timeout.
    await page.locator(".lang-seg[lang='ur']").first().waitFor();
    await page.waitForTimeout(1500);

    expect(
      requested,
      'an English reader downloaded a Nastaliq face. Something on the English page is ' +
        'painting Arabic-script text in a family that names Noto Nastaliq Urdu — see the ' +
        "`.lang-seg[lang='ur']` note in map.css.",
    ).toEqual([]);
  });

  test('the Urdu segment still reads in Nastaliq inside the Urdu view', async ({ page }) => {
    /* The other half of the same change: i18n rule 4 requires Nastaliq on every
       control in the Urdu view, and the fix above must not have taken it off
       this one. */
    await page.goto('/?lang=ur');
    const segment = page.locator(".lang-seg[lang='ur']").first();
    await expect(segment).toBeVisible();
    const family = await segment.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(family).toMatch(/Nastaliq/i);
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
