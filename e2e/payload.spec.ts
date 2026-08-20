import type { Page, Request } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * The Urdu article payload must stay off the English critical path.
 *
 * `src/data/urdu-content.json` holds complete Urdu Descriptions for 168
 * shrines — 1.0 MB. It used to be a static import in `urduContentOverride.ts`,
 * so it landed in the same eager chunk as the data hook and every visitor
 * downloaded the whole Urdu edition of the archive before the first tile
 * appeared. `/` shipped 3506 KB of JS; 1000 KB of it was this file.
 *
 * `scripts/check-bundle-budget.mjs` guards the *bundling* (the chunk must not
 * re-enter any route's static import graph). This guards the *behaviour*,
 * which is the part a budget cannot see: that an Urdu reader still gets the
 * Urdu prose — on a `?lang=ur` load, and after switching language mid-session,
 * which is the case that needs `useShrineData` to re-merge rows it already
 * built.
 */

const URDU_CHUNK = /urdu-content-[^/]*\.js/;

/** Records every request for the Urdu article chunk. */
function watchUrduChunk(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (request: Request) => {
    if (URDU_CHUNK.test(request.url())) hits.push(request.url());
  });
  return hits;
}

/** Length of the longest unbroken run of Urdu letters in the article body. */
async function longestUrduRun(page: Page): Promise<number> {
  return page.evaluate(() => {
    const text = Array.from(document.querySelectorAll('.article-prose'))
      .map((el) => el.textContent ?? '')
      .join('\n');
    const runs = text.match(/[؀-ۿ\s،۔]+/g) ?? [];
    return runs.reduce((max, run) => Math.max(max, run.trim().length), 0);
  });
}

test.describe('Urdu article payload is language-gated', () => {
  test('an English reader never requests it', async ({ page }) => {
    const hits = watchUrduChunk(page);
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('.article-prose').first()).toBeVisible();
    // The article is on screen, so the data path has fully run.
    expect(hits, 'the 1 MB Urdu payload was fetched for an English reader').toEqual([]);
  });

  test('the map route never requests it in English either', async ({ page }) => {
    const hits = watchUrduChunk(page);
    await page.goto('/');
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    expect(hits).toEqual([]);
  });

  test('?lang=ur requests it and renders Urdu prose', async ({ page }) => {
    const hits = watchUrduChunk(page);
    await page.goto('/shrine/data-darbar?lang=ur');
    await expect(page.locator('.article-prose').first()).toBeVisible();
    await expect
      .poll(() => hits.length, { message: 'Urdu reader did not get the Urdu payload' })
      .toBeGreaterThan(0);
    // A long unbroken Urdu run means real translated prose, not just the
    // localized UI chrome around an English body.
    await expect.poll(() => longestUrduRun(page)).toBeGreaterThan(400);
  });

  test('switching to Urdu mid-session re-merges the article content', async ({ page }) => {
    const hits = watchUrduChunk(page);
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('.article-prose').first()).toBeVisible();
    expect(hits).toEqual([]);

    // The rows on screen were built before the payload existed. Without
    // useShrineData's onUrduContentLoaded rebuild, the chrome would flip to
    // Urdu and the article body would stay English.
    await page.locator('.lang-seg[lang="ur"]').click();
    await expect
      .poll(() => hits.length, { message: 'switching language did not fetch the Urdu payload' })
      .toBeGreaterThan(0);
    await expect.poll(() => longestUrduRun(page)).toBeGreaterThan(400);
  });
});
