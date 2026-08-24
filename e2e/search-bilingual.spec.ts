import { test, expect, setTraditionalDirectory } from './fixtures';
import type { Page } from '@playwright/test';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

/**
 * Search must work in the language the interface is in.
 *
 * On the Urdu site, an Urdu query returned **zero results**. `داتا` — the first
 * word of the archive's best-known shrine, rendered in Urdu on screen, in a
 * search box whose placeholder is `مزار تلاش کریں...` — matched nothing. A
 * reader looking at an entirely Urdu interface had to type English to find
 * anything, which is precisely the "translation layer" the project's i18n
 * contract says the Urdu edition must not be.
 *
 * The cause was two sources for one fact. The page *displays* Urdu names from
 * the dictionary (`urdu-seed.json`, 169/169 covered); the search index took its
 * `urduName` from `getUrduFieldValue(row, 'Name')`, a sheet column. **The sheet
 * has no Urdu column at all**, so that field was the empty string for all 169
 * documents.
 *
 * Everything else was already right, which is what made it invisible: the worker
 * folds Arabic letter variants to Urdu ones, strips harakat, boosts `urduName`
 * to 4, and has unit tests asserting `داتا دربار` matches. Those tests build
 * their own index from hand-written documents — so they passed, in full, while
 * production indexed nothing. A unit test that supplies its own fixture proves
 * the algorithm and says nothing about the data reaching it.
 *
 * Hence this: the real index, the real dataset, through the real UI.
 */

/**
 * Queries, the count each must not fall below, and — where a specific hit is the
 * point — the *slug* that must appear.
 *
 * `nameIn` holds both renderings, because the list item is a click handler
 * rather than a link — there is no href to match a slug against. The first draft
 * asserted a single displayed name, which is script-dependent: "Data Darbar"
 * typed in the Urdu interface finds the shrine and then renders it as
 * داتا دربار. Two of thirteen tests failed on that, and the assertion was wrong
 * rather than the app.
 *
 * Thresholds are deliberately loose: the point is "finds the obvious things",
 * not a frozen ranking.
 */
const QUERIES = [
  { query: 'داتا', minResults: 1, nameIn: /Data Darbar|داتا دربار/ },
  { query: 'لاہور', minResults: 10, nameIn: null },
  { query: 'مندر', minResults: 10, nameIn: null },
  { query: 'گوردوارہ', minResults: 10, nameIn: null },
  { query: 'Data Darbar', minResults: 1, nameIn: /Data Darbar|داتا دربار/ },
  { query: 'Lahore', minResults: 10, nameIn: null },
];

async function openList(page: Page, lang: 'en' | 'ur') {
  await setTraditionalDirectory(page);
  await page.goto(lang === 'ur' ? '/?lang=ur' : '/');
  await page.locator('#sidebar').waitFor();
  await page.locator('.list-toggle-btn').click();
  await expect(page.locator('.shrine-list-item').first()).toBeVisible();
}

async function search(page: Page, query: string) {
  const box = page.locator('.search-input');
  await box.fill('');
  await box.fill(query);
  // Wait for the count to *stop changing*, not merely to exist.
  //
  // Two things move it after the keystroke: the search worker's debounce, and
  // the Urdu dictionary, which is language-gated and lands as its own chunk —
  // useSearch rebuilds the index when it arrives (`dictGen`), so an Urdu query
  // legitimately grows from 3 hits to 10 a moment later. The old version polled
  // for `> -1`, which is true immediately, then slept 700ms: enough on a warm
  // run and not enough on a cold one, which is why this flaked at 3 and 7.
  // Stability, not a single reading: the count must hold for a full second, and
  // no earlier than two seconds in. A short window is not enough — the pre-
  // dictionary count is itself stable for a moment, so "two equal reads" accepts
  // 3 hits and then the index rebuilds to 10 just after the assertion.
  const rows = page.locator('.shrine-list-item');
  const STABLE_READS = 4; // × 250ms = 1s unchanged
  const MIN_READS = 8; // never settle before 2s
  let previous = -1;
  let steady = 0;
  for (let i = 0; i < 60; i++) {
    const current = await rows.count();
    steady = current === previous ? steady + 1 : 0;
    previous = current;
    if (steady >= STABLE_READS && i >= MIN_READS) break;
    await page.waitForTimeout(250);
  }
  return rows.count();
}

test.describe('search works in both scripts', () => {
  for (const lang of ['ur', 'en'] as const) {
    for (const { query, minResults, nameIn } of QUERIES) {
      test(`[${lang}] "${query}" finds something`, async ({ page }) => {
        await openList(page, lang);
        const count = await search(page, query);
        expect(
          count,
          `"${query}" returned ${count} results in the ${lang} interface. The Urdu fields are ` +
            'indexed from the dictionary (src/lib/search/useSearch.ts) — check that they are ' +
            'still populated, not that the sheet has an Urdu column, because it does not.',
        ).toBeGreaterThanOrEqual(minResults);
        if (nameIn) {
          await expect(
            page
              .locator('.shrine-list-item')
              .filter({ has: page.locator('.shrine-list-name', { hasText: nameIn }) })
              .first(),
          ).toBeVisible();
        }
      });
    }
  }

  test('the Urdu placeholder is Urdu, so an Urdu query is what a reader will type', async ({
    page,
  }) => {
    // The reason the bug mattered: the interface invites the query it could not
    // answer.
    await setTraditionalDirectory(page);
    await page.goto('/?lang=ur');
    await page.locator('#sidebar').waitFor();
    await page.locator('.list-toggle-btn').click();
    await expect(page.getByPlaceholder(UI_TEXT.ur.searchPlaceholder)).toBeVisible();
  });
});
