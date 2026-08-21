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

/**
 * The Urdu dictionary must stay off the English critical path too — and must
 * arrive in time to be *used* on the Urdu one.
 *
 * `src/data/urdu-seed.json` is 80 KB and 960 entries: every shrine name, saint,
 * place, category and observance in the archive. It was a static import in
 * `urduFallback.ts`, so it rode on all eleven routes; removing it took
 * `index.html` from 322 KB of eager JavaScript to 248.
 *
 * The behavioural half is sharper here than for the article payload, because
 * `translateToUrdu` is called **synchronously during render**. A dictionary that
 * arrives but is never re-read leaves the reader looking at English names on an
 * Urdu page — so the tests below check the rendered name, not just the request.
 */
const SEED_CHUNK = /urdu-seed-[^/]*\.js/;

function watchSeedChunk(page: Page): string[] {
  const hits: string[] = [];
  page.on('request', (request: Request) => {
    if (SEED_CHUNK.test(request.url())) hits.push(request.url());
  });
  return hits;
}

test.describe('Urdu dictionary is language-gated', () => {
  test('an English reader never requests it', async ({ page }) => {
    const hits = watchSeedChunk(page);
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('h1.shrine-title')).toBeVisible();
    expect(hits, 'the 80 KB Urdu dictionary was fetched for an English reader').toEqual([]);
  });

  test('the map route never requests it in English either', async ({ page }) => {
    const hits = watchSeedChunk(page);
    await page.goto('/');
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    expect(hits).toEqual([]);
  });

  test('?lang=ur requests it and renders the dictionary name', async ({ page }) => {
    const hits = watchSeedChunk(page);
    await page.goto('/shrine/data-darbar?lang=ur');
    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await expect
      .poll(() => hits.length, { message: 'Urdu reader did not get the dictionary' })
      .toBeGreaterThan(0);
    // The name itself, from the dictionary — not the localized chrome around it.
    await expect(page.locator('h1.shrine-title')).toContainText('داتا دربار');
  });

  test('switching to Urdu mid-session re-renders the names', async ({ page }) => {
    const hits = watchSeedChunk(page);
    await page.goto('/shrine/data-darbar');
    await expect(page.locator('h1.shrine-title')).toHaveText(/Data Darbar/);
    expect(hits).toEqual([]);

    /* This is the case the dictionary's arrival listener exists for: the
       heading was already rendered from a dictionary that did not exist yet, so
       without the context bump in LanguageProvider the page would turn RTL with
       an English name in it. */
    await page.locator('.lang-seg[lang="ur"]').click();
    await expect
      .poll(() => hits.length, { message: 'switching language did not fetch the dictionary' })
      .toBeGreaterThan(0);
    await expect(page.locator('h1.shrine-title')).toContainText('داتا دربار');
  });

  test('and an Urdu query still finds a shrine, which needs the index rebuilt', async ({
    page,
  }) => {
    /* The search index takes its Urdu fields from this dictionary. An index
       built before the dictionary lands has an empty urduName for all 169
       documents — the exact bug e2e/search-bilingual.spec.ts was written for,
       which language-gating the dictionary could have reintroduced. */
    await page.goto('/?lang=ur');
    await page.locator('#sidebar').waitFor();
    await page.locator('.list-toggle-btn').click();
    await page.locator('.search-input').fill('داتا');
    await expect
      .poll(async () => page.locator('.shrine-list-item').count(), { timeout: 8000 })
      .toBeGreaterThan(0);
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
