import type { Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';
import Papa from 'papaparse';
import { categoryKey } from '../src/lib/data/categoryKey';

/* ESM: no `__dirname`. `fixtures.ts` resolves its own paths the same way. */
const here = dirname(fileURLToPath(import.meta.url));

/**
 * A filter must narrow the map, not only the list beside it.
 *
 * Measured on the running site, 30 August 2026, before the fix:
 *
 *     /?category=jain     list: "3 of 171 sites"     map: 169 markers
 *     /?category=sikh     list: 33                   map: 169 markers
 *     /?info=verified     list: 14                   map: 169 markers
 *
 * Every filter, all 169 pins, every time — the filters were applied inside
 * `MapSidebar` and the map was handed the unfiltered array.
 *
 * That is worse than a filter that does nothing, because **`MapPage` puts these
 * in the URL on purpose** so a reader can share the view they are looking at.
 * What they shared was a link that promised a filter and delivered the whole
 * archive.
 *
 * The assertion is the *agreement* rather than any particular number: the count
 * the sidebar reports and the number of pins on the map are the same number, or
 * one of the two is lying to the reader. A hardcoded expectation would have to
 * be revised every time the archive grows, and revising it is exactly when
 * somebody would revise away the thing being checked.
 */

/**
 * How many shrines a category filter *should* match, counted from the **CSV
 * fixture the app is actually served** — not from the snapshot it is generated
 * from.
 *
 * The difference is one row and it caught me. `?category=hindu` was expected to
 * draw 36 and drew 35, which looked like the fix under-filtering. It was the
 * instrument: `generate-shrines-csv.mjs` deliberately exports one row without
 * coordinates so the unmapped branch of `ShrineMarkers` is exercised at all
 * (its comment records that branch shipping broken while unreachable by the
 * suite), and the row it picked — "Umarkot (Amarkot) Shiv Mandir" — is a Hindu
 * temple. The snapshot has 36 mapped Hindu sites; the fixture has 35.
 *
 * Counting the bytes the app receives cannot drift from the app, and needs no
 * second copy of the unmapped row's name to keep in step.
 *
 * Rows without coordinates are excluded for the same reason `MAPPED_SHRINE_COUNT`
 * exists: an unmapped row gets a page and a list entry and no marker.
 */
function expectedMarkers(key: string): number {
  const csv = readFileSync(join(here, 'fixtures', 'shrines.csv'), 'utf-8');
  const rows = Papa.parse<Record<string, string>>(csv, {
    header: true,
    skipEmptyLines: true,
  }).data;
  return rows.filter(
    (row) =>
      categoryKey(row.category || row.Category || '') === key &&
      String(row.Latitude ?? '').trim() !== '' &&
      String(row.Longitude ?? '').trim() !== '',
  ).length;
}

const markers = (page: Page) => page.locator('.shrine-dot').count();

/** Wait for the dataset to stop changing — the rows are swapped from the slim
 *  index to the sheet, and the filtered count moves with them. */
async function settledMarkerCount(page: Page): Promise<number> {
  let previous = -1;
  await expect
    .poll(
      async () => {
        const now = await markers(page);
        const stable = now === previous;
        previous = now;
        return stable;
      },
      { timeout: 25_000 },
    )
    .toBe(true);
  return markers(page);
}

test.describe('a filter narrows the map, not just the list', () => {
  test('an unfiltered map draws every mapped shrine', async ({ page }) => {
    /* The denominator, and a guard against the whole file passing because the
       map draws nothing at all. */
    await page.goto('/');
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    await expect.poll(() => markers(page), { timeout: 20_000 }).toBe(MAPPED_SHRINE_COUNT);
  });

  for (const key of ['jain', 'sikh', 'hindu']) {
    test(`?category=${key} draws exactly that category's pins`, async ({ page }) => {
      const expected = expectedMarkers(key);
      /* Guard against a vacuous pass: a category with no sites would satisfy
         "fewer than all of them" without the filter doing anything. */
      expect(expected, `the fixture holds no mapped ${key} sites to filter to`).toBeGreaterThan(0);
      expect(expected, `${key} is the whole archive; it cannot show narrowing`).toBeLessThan(
        MAPPED_SHRINE_COUNT,
      );

      await page.goto(`/?category=${key}`);
      await expect(page.locator('.shrine-dot').first()).toBeVisible();

      const pins = await settledMarkerCount(page);
      expect(
        pins,
        `?category=${key} should draw ${expected} pins and drew ${pins}` +
          (pins === MAPPED_SHRINE_COUNT
            ? ' — the whole archive, so the map ignored the filter'
            : ''),
      ).toBe(expected);
    });
  }

  test('clearing the filter puts every pin back', async ({ page }) => {
    /* The other direction, so a fix cannot pass by narrowing permanently. */
    await page.goto('/?category=jain');
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    await expect.poll(() => markers(page), { timeout: 25_000 }).toBeLessThan(MAPPED_SHRINE_COUNT);

    await page.goto('/');
    await expect(page.locator('.shrine-dot').first()).toBeVisible();
    await expect.poll(() => markers(page), { timeout: 25_000 }).toBe(MAPPED_SHRINE_COUNT);
  });
});
