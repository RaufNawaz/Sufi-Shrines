import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * An Urdu reader must be able to find a place by its Urdu name.
 *
 * The same seam as `urdu-figure-search.spec.ts`, one entity type over, and open
 * for as long. Measured on the running site, 30 August 2026, before the fix:
 * typing «لاہور» returned **two groups — sites and figures — and no Places
 * group at all**, while `Lahore` returned three and surfaced Lahore itself.
 * «ملتان» behaved the same way. **All 64 place pages were unreachable by an
 * Urdu query.**
 *
 * The cause was one missing field. `ArchiveSearch` built its place candidates
 * as `{ type, slug, name }` and nothing else, so `haystacks()` had only the
 * Latin name to match on — while the row three lines below already displayed
 * the Urdu name through `localizeRecordedName`. All 64 places have a reviewed
 * Urdu name; it is why their page titles render in Urdu today. The matcher was
 * simply never shown it.
 *
 * ## The heading collision this made visible, which is not fixed here
 *
 * With places reachable, an Urdu query now returns three groups headed
 * **«مقامات | شخصیات | مقامات»** — the first and third identical, because
 * `searchGroupSites` and `placesTitle` are both `مقامات` while English
 * distinguishes "Sites" from "Places". The collision is in the strings and
 * predates this change; it was invisible only because the third group never
 * appeared.
 *
 * It is deliberately not fixed here. The archive's reviewed Urdu uses مقامات
 * for *sites* consistently (`sharedGroundIntro`, `sharedGroundSamePin`), so the
 * ambiguous one is `placesTitle`, and there is no reviewed Urdu term for
 * "locality" anywhere in the repo to substitute. Choosing one is composition,
 * which RULE 2 reserves for a fluent speaker. Recorded in
 * `docs/SESSION_RESUME.md`; unreachable was judged worse than
 * ambiguously-labelled, and the rows are distinguishable by their site-count
 * meta even while the headings are not.
 */
const PLACES = [
  { latin: 'Lahore', urdu: 'لاہور', slug: 'lahore' },
  { latin: 'Multan', urdu: 'ملتان', slug: 'multan' },
];

/**
 * The row for a *place*, not merely a row containing the word.
 *
 * `hasText` is a substring match and this archive is full of sites named after
 * the town they stand in — «جین مندر، لاہور» contains «لاہور» — so a bare filter
 * matches shrine rows too and `.first()` takes whichever ranked higher at click
 * time. That is the exact failure `urdu-figure-search.spec.ts` records, where a
 * figure query followed an almanac row once the lazy dictionary re-ranked the
 * list mid-test. The row's kind is in the DOM, so the locator states it.
 */
function placeRow(page: Page, name: string) {
  return page
    .locator('li.palette-result')
    .filter({ has: page.locator('.archive-search-dot--place') })
    .filter({ hasText: name })
    .first();
}

async function openPalette(page: Page, lang: 'en' | 'ur', query: string) {
  await page.goto(lang === 'ur' ? '/about?lang=ur' : '/about');
  await page.locator('h1').first().waitFor();
  await page.keyboard.press('Meta+k');
  await page.locator('.palette-input').waitFor();
  await page.locator('.palette-input').fill(query);
}

test.describe('a place is findable by its Urdu name', () => {
  for (const place of PLACES) {
    test(`«${place.urdu}» reaches /place/${place.slug}`, async ({ page }) => {
      await openPalette(page, 'ur', place.urdu);

      /* Poll rather than assert once: the Urdu dictionary is lazy and 88 KB,
         and an Urdu-script query is what triggers the fetch, so the place row
         appears only after it lands and the candidates are re-enriched. */
      const row = placeRow(page, place.urdu);
      await expect(row, `«${place.urdu}» did not reach ${place.slug}`).toBeVisible({
        timeout: 20_000,
      });

      await row.click();
      await expect(page).toHaveURL(new RegExp(`/place/${place.slug}(\\?|$)`));
    });

    test(`"${place.latin}" still reaches /place/${place.slug}`, async ({ page }) => {
      /* The other half, so the Urdu fix cannot quietly cost the Latin one:
         adding `nameUr` must add a name to the haystack, never replace one. */
      await openPalette(page, 'en', place.latin);
      const row = placeRow(page, place.latin);
      await expect(row, `"${place.latin}" did not reach ${place.slug}`).toBeVisible({
        timeout: 20_000,
      });
      await row.click();
      await expect(page).toHaveURL(new RegExp(`/place/${place.slug}(\\?|$)`));
    });
  }
});
