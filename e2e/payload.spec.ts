import type { Page, Request } from '@playwright/test';
import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

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

/*
 * The five-order Latin-leak sweep that used to live here has moved to
 * e2e/urdu-no-leak.spec.ts, which runs the same walk over every route in both
 * an undeclared and a declared form. It had to move rather than be copied: its
 * allow-list was `.coords, a, bdi, [data-latin]`, and `a` exempted every anchor
 * on the site — 328 leaks on the map route alone once removed. Leaving a weaker
 * duplicate in place is worse than having none, because it reads as coverage.
 */

/**
 * The basemap must not hold up the map.
 *
 * maplibre-gl is 1035 KB minified — on its own two-thirds of everything `/`
 * used to ship before a reader saw anything, on a site whose readers are
 * overwhelmingly on a phone on a mobile connection. Nothing in the primary
 * interaction needs it: the sidebar, the search, the filters, the era slider
 * and the markers are Leaflet and React. Only the tiles are maplibre's.
 *
 * `check-bundle-budget.mjs` proves it is not in the route's static import
 * graph. That is a fact about chunks, not about the reader's experience — a
 * lazily-loaded module can still be awaited before anything paints, and the
 * budget would be perfectly happy. So this test holds the chunk hostage
 * indefinitely and asserts that the archive is still usable without it:
 * markers on the map, a browsable list, working search.
 */
const MAPLIBRE_CHUNK = /vendor-maplibre-[^/]*\.js/;

test.describe('the vector basemap is not on the critical path', () => {
  test('markers, list and search all work while maplibre is still in flight', async ({ page }) => {
    let held = 0;
    // Never fulfil it. If anything on the critical path awaits the basemap,
    // this test times out rather than passing by a hair on a fast machine.
    await page.route(MAPLIBRE_CHUNK, async () => {
      held += 1;
      await new Promise(() => {});
    });

    await page.goto('/');

    // The markers are Leaflet's, drawn over whatever ground exists.
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    // The sidebar list is the primary way through the archive on a phone. It
    // starts collapsed behind the table button, so open it the way a reader
    // does rather than asserting on a list nobody has asked for yet.
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    const items = page.locator('.shrine-list-item');
    await expect(items.first()).toBeVisible();
    expect(await items.count()).toBeGreaterThan(10);
    // And search, which runs in a worker and shares nothing with the basemap.
    await page.getByPlaceholder(UI_TEXT.en.searchPlaceholder).fill('Data Darbar');
    await expect(
      items.filter({ has: page.locator('.shrine-list-name', { hasText: /^Data Darbar$/ }) }),
    ).toBeVisible();

    expect(held, 'the maplibre chunk was never requested at all — has it been inlined?').toBe(1);
  });
});
