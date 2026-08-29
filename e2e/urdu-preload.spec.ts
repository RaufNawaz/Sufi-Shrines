import type { Page } from '@playwright/test';
import { test, expect, settle } from './fixtures';

/**
 * The Urdu interface strings are their own chunk, and `main.tsx` awaits them
 * before the first render — an Urdu reader must never see an English frame.
 * `scripts/prerender.mjs` therefore starts the fetch from the document instead
 * of from the bundle, so it is already in flight while the entry chunk parses.
 *
 * That was done for `/ur/...` pages only, which left the *canonical* Urdu URL
 * uncovered: `/ur/...` is a discovery prefix that `UrPrefixNormalizer` rewrites
 * to `?lang=ur` immediately, the language toggle produces `?lang=ur`, and a
 * returning reader with the preference stored gets neither prefix nor param.
 * All three are served by the non-/ur documents, which carried no preload at
 * all — measured 28 August 2026 as FCP 2,122ms in English against 4,057ms in
 * Urdu on the same route.
 *
 * The fix emits the tag conditionally, from a few hundred bytes of inline
 * script mirroring `detectInitialLang`. This file is why that is trustworthy:
 * `check-routes-prerendered.mjs` can only see whether a *string* is in the
 * HTML, and a conditional preload and an unconditional one look identical to
 * it. Only a browser can answer the question that matters — does an English
 * reader actually fetch 22 KB of Nastaliq copy, and does an Urdu reader
 * actually get a head start?
 */
const URDU_STRINGS = /uiStrings\.ur/;

test.describe('the Urdu string table is fetched by the reader who needs it', () => {
  test('an English visit never requests it', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => {
      if (URDU_STRINGS.test(r.url())) requested.push(r.url());
    });

    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();
    await settleQuietly(page);

    expect(
      requested,
      'an English reader downloaded the Urdu interface strings — the whole point of the split',
    ).toEqual([]);
  });

  test('a ?lang=ur visit gets it from the document, not from the bundle', async ({ page }) => {
    const requested: string[] = [];
    page.on('request', (r) => {
      if (URDU_STRINGS.test(r.url())) requested.push(r.url());
    });

    await page.goto('/about?lang=ur');
    await page.locator('h1.entity-title').waitFor();
    await settleQuietly(page);

    expect(requested.length, 'the Urdu reader never fetched the Urdu strings').toBeGreaterThan(0);

    /* The link being in the head is what distinguishes "the document started
       it" from "the bundle got round to it" — the latter is the round trip
       this exists to remove, and it would still satisfy the assertion above. */
    const preloads = await page.locator('link[rel="modulepreload"][href*="uiStrings.ur"]').count();
    expect(
      preloads,
      'no modulepreload was injected, so the fetch waited for the bundle',
    ).toBeGreaterThan(0);
  });

  test('a stored Urdu preference is enough, with no param and no prefix', async ({ page }) => {
    await page.addInitScript(() => {
      try {
        localStorage.setItem('shrines_language', 'ur');
      } catch {
        /* private mode — the script under test swallows this too */
      }
    });
    const requested: string[] = [];
    page.on('request', (r) => {
      if (URDU_STRINGS.test(r.url())) requested.push(r.url());
    });

    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();
    await settleQuietly(page);

    expect(
      requested.length,
      'a returning Urdu reader with no ?lang= in the URL waited a round trip',
    ).toBeGreaterThan(0);
  });
});

/* `settle()` waits for animations; a request that never happens needs a moment
   to not happen. Both, in that order. */
async function settleQuietly(page: Page): Promise<void> {
  await settle(page);
  await page.waitForTimeout(500);
}
