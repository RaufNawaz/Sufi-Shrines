import type { Locator, Page } from '@playwright/test';
/**
 * Hermetic Playwright test fixture: every spec imports `test`/`expect` from
 * here instead of '@playwright/test'. The extended context intercepts the
 * app's Google Sheets CSV request and fulfills it from the deterministic
 * fixture at e2e/fixtures/shrines.csv (regenerate with
 * `node e2e/fixtures/generate-shrines-csv.mjs`), so the suite never depends
 * on the live sheet's contents or on network availability.
 *
 * Two things make the interception airtight:
 * - `serviceWorkers: 'block'` in playwright.config.ts — the PWA service
 *   worker has a StaleWhileRevalidate route for docs.google.com whose
 *   fetches would bypass `context.route`.
 * - Playwright gives each test a fresh browser context, so the app's
 *   localStorage CSV cache (useShrineData's cache key) can never leak data
 *   from a previous test or a live fetch. Within a single test, reloads may
 *   serve that cache — it was populated from this same fixture, and the
 *   background refresh is intercepted too. persistence.spec.ts relies on
 *   exactly that within-test persistence, so no init script clears storage.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { test as base, expect } from '@playwright/test';
import type { Tour } from '../src/lib/tours/tours';
import { DIRECTORY_MODE_STORAGE_KEY } from '../src/lib/storageKeys';

const here = path.dirname(fileURLToPath(import.meta.url));

const csvBody = fs.readFileSync(path.join(here, 'fixtures', 'shrines.csv'), 'utf-8');

// Synthetic Auqaf-mosques fixture (names say "Fixture" on purpose) for the
// NearbyMosques block; served for the Awqaf sheet's publish token below.
const mosquesCsvBody = fs.readFileSync(path.join(here, 'fixtures', 'mosques.csv'), 'utf-8');

/** Distinguishes the Awqaf mosques sheet from the shrines sheet — both live
 * on docs.google.com; the publish token in the URL is the stable difference
 * (AWQAF_CSV_URL in src/lib/data/mosques.ts). */
const AWQAF_TOKEN = '2PACX-1vTzVlDrUr';

// The snapshot the CSV fixture is generated from — read with fs rather than
// imported, because Playwright's ESM runtime rejects JSON imports reached
// through TS modules (`needs an import attribute of "type: json"`).
const snapshot = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'src', 'data', 'shrines-fallback.json'), 'utf-8'),
) as { rows: unknown[] };

/** Exact number of shrines the app builds from the CSV fixture. Every row is
 * kept — including the one exported without coordinates (see
 * e2e/fixtures/generate-shrines-csv.mjs), since an unmapped row still gets a
 * page, a list entry and search presence. */
export const SHRINE_COUNT: number = snapshot.rows.length;

/** How many of those carry coordinates, and therefore how many markers the
 * map must draw. Differs from SHRINE_COUNT by exactly the unmapped row the
 * fixture generator manufactures — which is the point: when the two were
 * equal, nothing in the suite could tell a map drawing every marker from a
 * map drawing none. */
export const MAPPED_SHRINE_COUNT: number = SHRINE_COUNT - 1;

/** The bundled tour data, typed with the app's own Tour model. tours.ts
 * itself can't be imported here (same JSON-import restriction as above). */
export const TOURS: Tour[] = JSON.parse(
  fs.readFileSync(path.join(here, '..', 'src', 'data', 'tours.json'), 'utf-8'),
) as Tour[];

export function getTour(id: string): Tour {
  const tour = TOURS.find((t) => t.id === id);
  if (!tour) throw new Error(`No tour with id "${id}" in src/data/tours.json`);
  return tour;
}

/** Opt a test into the legacy sidebar table before its next navigation. */
export async function setTraditionalDirectory(page: Page): Promise<void> {
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    [DIRECTORY_MODE_STORAGE_KEY, 'table'],
  );
}

/** 1×1 transparent PNG — served for any external image/tile request. */
const BLANK_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64',
);

export const test = base.extend({
  context: async ({ context }, use) => {
    // Hermetic by construction: NOTHING leaves localhost. The CSV is served
    // from the fixture; external images and map tiles get a blank PNG (so
    // Leaflet/<img> elements resolve instead of erroring); everything else
    // is aborted. This matters beyond determinism: in an environment where
    // external hosts are proxied or unreachable (measured in the Claude Code
    // web sandbox, 21 Aug 2026), tile requests HANG rather than fail — and
    // pending <img> subresources hold the window `load` event hostage, so
    // every `page.reload()` in persistence.spec.ts timed out at 30s while
    // the rest of the suite passed.
    await context.route('**/*', (route) => {
      const url = new URL(route.request().url());
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
      if (url.hostname.endsWith('docs.google.com'))
        return route.fulfill({
          status: 200,
          contentType: 'text/csv; charset=utf-8',
          body: url.href.includes(AWQAF_TOKEN) ? mosquesCsvBody : csvBody,
        });
      if (route.request().resourceType() === 'image')
        return route.fulfill({ status: 200, contentType: 'image/png', body: BLANK_PNG });
      return route.abort();
    });
    await use(context);
  },
});

export { expect };

/**
 * Wait until a shrine page is showing the **sheet's** row, not the slim index's.
 *
 * The masthead renders from `src/data/shrines-index.json` so a reader sees which
 * shrine they opened in ~1.5s instead of a blank page — ten columns of a
 * forty-four column row. So `h1.shrine-title` being visible says nothing about
 * whether the article, the infobox or the gallery have their data yet, and a
 * spec that waits for the title and then counts anything from the sheet is
 * racing.
 *
 * Three specs were written that way and passed for weeks, because the window is
 * usually short. On 30 August 2026 a change to when the Urdu article payload
 * loads moved the timing by a few hundred milliseconds and all three began
 * failing in Urdu and passing in English — reporting things like "the fixture
 * shrine has no gallery tiles to open", which is a true statement about a page
 * that is still loading and a misleading one about the fixture.
 *
 * The infobox is the signal: `ShrinePage` holds it until `source !== 'index'`
 * precisely because a half-populated fact table reads as an archive that knows
 * less than it does.
 */
/**
 * Select a marker, through however many flights it takes.
 *
 * Since 30 August 2026 a tap on a marker that shares its spot with others does
 * not select — the point being that "whichever pin Leaflet painted on top" was
 * never a choice the reader made. At the opening view that is **161 of 169
 * markers**. The tap's meaning changed on 1 September 2026: it used to fan the
 * pile in place, it now flies the map toward the pile, and whatever depth
 * cannot separate fans out on its own at fan depth (`marker-fan.spec.ts` pins
 * all of this). So a spec that wants a *selection* keeps tapping the same
 * element until the tap lands as one — each earlier tap having been spent on a
 * flight.
 *
 * Two specs needed this when the fan first landed: `mobile-sheet` dispatching
 * a click on Data Darbar, which sits in the 66-marker Lahore pile, and
 * `map-touch` tapping the first marker in the DOM. Both are about what happens
 * *after* a selection, so neither should have to know about piles.
 *
 * Always the same element, never a neighbour: the marker node survives every
 * flight, and `aria-pressed` on it is the selection signal the markers
 * themselves publish.
 */
export async function selectMarker(page: Page, marker: Locator): Promise<void> {
  const tap = async () =>
    marker.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));
  /* Eight attempts is generous: the opening view sits ten zoom levels above
     fan depth and every flight covers several of them. */
  for (let attempt = 0; attempt < 7; attempt += 1) {
    await tap();
    try {
      /* 2.5 s covers a full 0.9 s flight plus the fan's 300 ms glide. A tap
         that has not selected by then was spent on a flight — tap again. */
      await expect(marker).toHaveAttribute('aria-pressed', 'true', { timeout: 2_500 });
      return;
    } catch {
      /* Still flying toward the pile — the next tap goes deeper. */
    }
  }
  await tap();
  await expect(marker).toHaveAttribute('aria-pressed', 'true');
}

export async function waitForSheetData(page: Page): Promise<void> {
  await page.locator('h1.shrine-title').waitFor();
  await page.locator('.infobox-row').first().waitFor({ timeout: 30_000 });
}

/**
 * Wait until the page stops animating.
 *
 * Two separate checks have now measured a transient animated state and reported
 * it as a defect:
 *
 * - the axe sweep read elements part-way through their `reveal-rise` fade and
 *   blamed the palette for a contrast failure that does not exist, because axe
 *   composites ancestor `opacity` into the foreground colour (HANDOVER §9.46);
 * - the mobile-sheet spec measured the bottom sheet 5% into its
 *   `transition: height` — 134px of an eventual 641px — and concluded the drag
 *   handle had stopped working.
 *
 * Both are the same mistake, so the fix lives in one place. Infinite animations
 * are skipped by design: the loading spinner is meant to run forever, and it is
 * the one animation `src/styles/__tests__/motion.test.ts` exempts from the
 * reduced-motion contract for the same reason.
 *
 * This is not a way of averting one's eyes. An animation that *never* finishes
 * fails the wait, so an element left permanently mid-transition is still
 * caught — and caught as a stuck animation rather than as whatever it happens
 * to look like at that instant.
 */
export async function settle(page: Page, timeout = 10_000): Promise<void> {
  await page.waitForFunction(
    () =>
      document.getAnimations().every((a) => {
        if (a.playState !== 'running') return true;
        return a.effect?.getComputedTiming().iterations === Infinity;
      }),
    null,
    { timeout },
  );
}
