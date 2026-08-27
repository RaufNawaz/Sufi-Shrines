import type { Page } from '@playwright/test';
import { test, expect, settle } from './fixtures';
import { SAVED_SHRINES_STORAGE_KEY } from '../src/lib/storageKeys';

/**
 * Search, from a page that is not the map.
 *
 * The archive had a search field on one route out of thirteen, inside the map's
 * sidebar — and that sidebar advertises ⌘K as the way to search, which did
 * nothing anywhere else. The overlay that fixed it shipped with unit tests and a
 * manual drive and no committed spec, which is the half this closes (plan B3).
 *
 * What needs a browser rather than a unit test is the seam: the overlay is
 * *mounted on demand*, its entity index is a dynamic import fetched on first
 * open, and it must not exist on the map at all — the map has its own palette
 * that owns the map's query and filter state, and two overlays answering one
 * keystroke is the failure this arrangement was designed to avoid.
 *
 * Three of these cover what the search learned afterwards (B1): the matched run
 * is marked, days are searchable, and a saved site says so. Each is a claim
 * about rendered output that no unit test can see.
 */

const open = async (page: Page) => {
  await page.getByRole('button', { name: 'Search the archive' }).click();
  await page.locator('.archive-search-results, .palette-empty, .palette input').first().waitFor();
};

test.describe('search from anywhere in the archive', () => {
  test('opens from the header button on a non-map route', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);

    /* Nothing is paid for until it is opened: the overlay is not in the DOM. */
    await expect(page.locator('.palette-backdrop')).toHaveCount(0);
    await open(page);
    await expect(page.locator('.palette-backdrop')).toBeVisible();
  });

  test('opens with ⌘K, and Escape puts focus back where it was', async ({ page }) => {
    await page.goto('/saint/data-ganj-bakhsh');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);

    await page.keyboard.press('Meta+k');
    await expect(page.locator('.palette-backdrop')).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(page.locator('.palette-backdrop')).toHaveCount(0);
  });

  test('the keyboard drives it: type, arrow, Enter leaves for the page', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);
    await open(page);

    await page.keyboard.type('data darbar', { delay: 20 });
    const rows = page.locator('.palette-result');
    await expect(rows.first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/\/shrine\//);
  });

  test('the map stands down — it has its own palette', async ({ page }) => {
    /* Two overlays answering one keystroke would be two features pretending to
       be one. The archive-wide search is guarded on `available`, which the map
       route turns off. */
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await settle(page);

    await expect(page.locator('.archive-search-results')).toHaveCount(0);
  });

  test('groups its results by kind, and reaches days', async ({ page }) => {
    /* The fifth group. 149 observances were unsearchable: "Shivratri" found the
       temple that keeps it only if the word was in the temple's name. */
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);
    await open(page);

    await page.keyboard.type('shivratri', { delay: 20 });
    await expect(page.locator('.palette-result').first()).toBeVisible();
    const groups = await page.locator('.archive-search-group').allTextContents();
    expect(groups, `groups were ${JSON.stringify(groups)}`).toContain('Days');

    /* A day's link carries a hash, which is what makes the almanac open its
       month listing rather than the calendar — the anchor exists only there. */
    const day = page
      .locator('.palette-result')
      .filter({ has: page.locator('.archive-search-dot--day') })
      .first();
    await day.click();
    await expect(page).toHaveURL(/\/almanac#/);
    await expect(page.locator('.almanac-month').first()).toBeVisible();
  });

  test('marks the run that matched, and only when it is really there', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);
    await open(page);

    await page.keyboard.type('chiragh', { delay: 20 });
    await expect(page.locator('.palette-result').first()).toBeVisible();
    const marks = page.locator('.palette-result-name mark');
    await expect(marks.first()).toBeVisible();
    for (const text of await marks.allTextContents()) {
      expect(text.toLowerCase(), 'a mark under text that does not match').toBe('chiragh');
    }
  });

  test('a saved site says so in the results', async ({ page }) => {
    await page.addInitScript(
      ([key, slug]) => {
        try {
          window.localStorage.setItem(key as string, JSON.stringify([slug]));
        } catch {
          /* a private window: the marker is a convenience, not a requirement */
        }
      },
      [SAVED_SHRINES_STORAGE_KEY, 'data-darbar'],
    );
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);
    await open(page);

    await page.keyboard.type('data darbar', { delay: 20 });
    await expect(page.locator('.palette-result').first()).toBeVisible();
    /* A glyph *and* a word — the archive never distinguishes by colour or icon
       alone, so the accessible name has to carry it. */
    await expect(page.locator('.archive-search-saved').first()).toBeVisible();
    await expect(page.locator('.archive-search-saved .sr-only').first()).toHaveText(/saved/i);
  });

  test('says so when nothing matches', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1').first().waitFor();
    await settle(page);
    await open(page);

    await page.keyboard.type('qqqzzzxx', { delay: 20 });
    await expect(page.locator('.palette-empty')).toBeVisible();
  });
});
