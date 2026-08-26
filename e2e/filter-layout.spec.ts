import type { Page } from '@playwright/test';
import { test, expect, setTraditionalDirectory } from './fixtures';

/**
 * No filter chip may be wider than the panel it sits in.
 *
 * `.filter-chips`'s own comment described its contents as "short, fixed option
 * sets (a handful of pills per group)". The case that disproved it was the
 * saint facet — 147 chips from the `Sufi Saint` column, several of them
 * qualified names past a hundred characters, one pill 1163px wide inside a
 * 380px sidebar. That facet was removed on 26 August 2026 (search covers the
 * need), but the clamp it forced onto `.filter-chip` still guards every
 * remaining row: region names and the saved-list chips are unbounded content
 * too, just less spectacularly.
 */

/**
 * Reveal every facet, and *assert* the hidden group actually opened.
 *
 * The first draft of this spec clicked a list of plausible disclosure selectors
 * and tolerated failures. None of them matched — the control is
 * `.more-filters-toggle` — so the collapsed facets never entered the DOM, and
 * the spec passed having measured only the seven category chips. It stayed
 * green with the clamp deleted, which is how I found out.
 *
 * A test that can silently skip the thing it checks is worse than no test: it
 * reports a safety it never established. Hence the assertion below — the
 * provenance group renders only inside the expanded disclosure, so its
 * presence proves the hidden facets are in the DOM.
 */
async function openAllFacets(page: Page) {
  await expect(page.locator('.shrine-dot').first()).toBeVisible();

  const listToggle = page.locator('.list-toggle-btn');
  if (await listToggle.count()) await listToggle.first().click();

  const moreFilters = page.locator('.more-filters-toggle');
  await expect(moreFilters, 'the more-filters disclosure has moved').toHaveCount(1);
  if ((await moreFilters.getAttribute('aria-expanded')) !== 'true') await moreFilters.click();

  await expect(
    page.locator('[aria-label="Filter by provenance"]'),
    'the disclosure never opened, so the hidden facets were not measured',
  ).toHaveCount(1);
}

test.describe('filter chips fit their panel', () => {
  test.beforeEach(async ({ page }) => setTraditionalDirectory(page));

  test('no chip row overflows, at any facet', async ({ page }) => {
    await page.goto('/');
    await openAllFacets(page);

    const overflowing = await page.evaluate(() => {
      const bad: string[] = [];
      document.querySelectorAll('.filter-chips').forEach((row, i) => {
        const count = row.querySelectorAll('.filter-chip').length;
        // 1px of slack for sub-pixel rounding.
        if (row.scrollWidth > row.clientWidth + 1) {
          bad.push(
            `row ${i} (${count} chips): scrollWidth ${row.scrollWidth} > ${row.clientWidth}`,
          );
        }
        row.querySelectorAll('.filter-chip').forEach((chip) => {
          if (chip.getBoundingClientRect().width > row.clientWidth + 1) {
            bad.push(`chip "${(chip.textContent ?? '').slice(0, 40)}…" is wider than its row`);
          }
        });
      });
      return bad;
    });

    expect(
      overflowing,
      'a filter chip is wider than its panel — check the max-width/ellipsis clamp on ' +
        '.filter-chip in src/styles/map.css',
    ).toEqual([]);
  });

  test('a clamped chip keeps its full value reachable', async ({ page }) => {
    await page.goto('/');
    await openAllFacets(page);

    // A chip truncated on screen must carry the whole string in `title`, or the
    // qualification — the honest part of the value — becomes unreadable rather
    // than merely abbreviated.
    const untitled = await page.evaluate(() =>
      [...document.querySelectorAll('.filter-chip')]
        .filter((chip) => chip.scrollWidth > chip.clientWidth + 1)
        .filter((chip) => !(chip as HTMLElement).title)
        .map((chip) => (chip.textContent ?? '').slice(0, 40)),
    );
    expect(untitled, 'these chips are truncated with no title to recover the full value').toEqual(
      [],
    );
  });
});
