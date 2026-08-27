import { test, expect, settle } from './fixtures';

/**
 * Filtering the almanac by tradition and by place.
 *
 * The filter narrows the *sites the almanac is built from*, not the four lists
 * it produces, and that is the thing a browser has to check. A unit test can
 * prove the predicate; only a rendered page can prove that the calendar, the
 * month listing, the seasonal and undated lists **and the coverage block** are
 * all describing the same selection at the same moment. The failure this guards
 * against is specific and would look completely normal: filter to one city,
 * and a coverage line still quoting the whole archive's denominator underneath
 * a page showing thirty-five sites — the page contradicting itself in the one
 * block whose entire job is saying how much of the archive you are looking at.
 *
 * Run in both languages, because two of the three things being asserted are
 * language-shaped: the chips carry Eastern numerals in Urdu, and the coverage
 * sentence is one `tFn` string per language rather than fragments a component
 * reassembles (see `noSentenceFragments.test.ts` for why that matters).
 */
const LANGS = [
  { name: 'en', query: '', all: 'All' },
  { name: 'ur', query: '?lang=ur', all: 'سب' },
] as const;

test.describe('the almanac facets', () => {
  test('are collapsed until asked for, so the calendar stays first', async ({ page }) => {
    await page.goto('/almanac');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);

    /* The calendar was moved to the top of this page deliberately; two chip
       rows above it would have put it back where it was. */
    await expect(page.locator('.almanac-facet .filter-chip')).toHaveCount(0);
    await expect(page.locator('.almanac-calendar-grid')).toBeVisible();

    await page.getByRole('button', { name: 'Filters' }).click();
    await expect(page.locator('.almanac-facet .filter-chip').first()).toBeVisible();
  });

  test('a shared filtered link arrives with its filters shown', async ({ page }) => {
    /* The case that matters most. A URL that arrives filtered and *looks*
       unfiltered is a reader being shown a partial archive with no visible
       reason — and this page's whole argument is that its numbers are counted
       rather than estimated. */
    await page.goto('/almanac?place=lahore');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);

    await expect(page.locator('.almanac-facet .filter-chip').first()).toBeVisible();
    const lahore = page.locator('.filter-chip.active', { hasText: 'Lahore' });
    await expect(lahore).toHaveAttribute('aria-pressed', 'true');
  });

  for (const lang of LANGS) {
    test(`[${lang.name}] a tradition filter narrows the page and its own coverage`, async ({
      page,
    }) => {
      /* Three cold navigations and a filter round-trip, twice over. That is
         genuinely more than a 30-second budget covers when five workers share a
         laptop — it timed out once in a full-suite run and passes every time in
         isolation. `test.slow()` states the cost instead of raising the ceiling
         for every spec in the suite. */
      test.slow();
      await page.goto(`/almanac${lang.query}`);
      await page.locator('h1.entity-title').first().waitFor();
      /* `settle` waits for animations, not for the sheet. The coverage line
         renders "0 of 0 sites" until the CSV lands, and in the Urdu run the
         interface strings are a second async chunk on top of that — so a
         baseline read straight after `settle` captured the empty page and the
         comparison at the end of the test failed against it. A marked calendar
         cell cannot exist before the data does. */
      await page.locator('.almanac-calendar-cell--marked').first().waitFor();
      await settle(page);

      const coverage = page.locator('.almanac-coverage-total');
      const before = (await coverage.textContent())?.trim() ?? '';
      expect(before).not.toBe('');

      await page.getByRole('button', { name: /Filters|چھانٹ/ }).click();
      const chips = page.locator('.almanac-facet .filter-chip');
      await expect(chips.first()).toBeVisible();

      /* The first chip after "All" in the category row — whichever tradition
         the fixture makes largest, so this does not depend on the data. */
      const firstCategory = page.locator('.almanac-facet').first().locator('.filter-chip').nth(1);
      const label = (await firstCategory.textContent())?.trim() ?? '';
      await firstCategory.click();
      await settle(page);

      await expect(firstCategory).toHaveAttribute('aria-pressed', 'true');
      expect(page.url()).toContain('cat=');

      /* The denominator moved, which is the whole assertion: the coverage
         block is counting the filtered selection, not the archive. */
      const after = (await coverage.textContent())?.trim() ?? '';
      expect(after, `coverage did not change when filtering to "${label}"`).not.toBe(before);

      /* And it round-trips: the same URL, loaded cold, shows the same thing. */
      const url = page.url();
      await page.goto(url);
      await page.locator('h1.entity-title').first().waitFor();
      await settle(page);
      expect((await coverage.textContent())?.trim()).toBe(after);

      await page.getByRole('button', { name: /Clear filters|فلٹر/ }).click();
      await settle(page);
      expect((await coverage.textContent())?.trim()).toBe(before);
    });
  }

  test('an impossible combination says so rather than showing an empty page', async ({ page }) => {
    /* Every section on this page hides when empty, so a filter matching nothing
       would otherwise leave a heading, two controls and blank space. */
    await page.goto('/almanac?place=nankana-sahib&cat=jain');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);

    await expect(page.locator('.almanac-empty').first()).toBeVisible();
  });
});
