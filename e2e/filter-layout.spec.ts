import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * No filter chip may be wider than the panel it sits in.
 *
 * `.filter-chips`'s own comment described its contents as "short, fixed option
 * sets (a handful of pills per group)". True of categories and regions. The
 * saint facet is 147 chips built from the `Sufi Saint` column, and several of
 * those values are qualified names running past a hundred characters — real,
 * deliberate content, and the join key that matches rows, so it cannot be
 * shortened at the source.
 *
 * With `white-space: nowrap` and `flex-shrink: 0` that produced a single
 * unbreakable pill 1163px wide inside a 380px sidebar; the saint row's
 * scrollWidth was 1179 against a clientWidth of 379. Measured, not guessed —
 * and measurable, which is why this is a test rather than a note.
 */

/**
 * Reveal every facet, and *assert* the saint one is there.
 *
 * The first draft of this spec clicked a list of plausible disclosure selectors
 * and tolerated failures. None of them matched — the control is
 * `.more-filters-toggle` — so the saint facet never entered the DOM, and the
 * spec passed having measured only the seven category chips. It stayed green
 * with the clamp deleted, which is how I found out.
 *
 * A test that can silently skip the thing it checks is worse than no test: it
 * reports a safety it never established. Hence the assertions below.
 */
async function openAllFacets(page: Page) {
  await expect(page.locator('.shrine-dot').first()).toBeVisible();

  const listToggle = page.locator('.list-toggle-btn');
  if (await listToggle.count()) await listToggle.first().click();

  const moreFilters = page.locator('.more-filters-toggle');
  await expect(moreFilters, 'the more-filters disclosure has moved').toHaveCount(1);
  if ((await moreFilters.getAttribute('aria-expanded')) !== 'true') await moreFilters.click();

  // The saint facet is the wide one. Without it this spec proves nothing.
  await expect
    .poll(() => page.locator('.filter-chip').count(), {
      message: 'the saint facet never appeared, so nothing wide was measured',
    })
    .toBeGreaterThan(100);
}

test.describe('filter chips fit their panel', () => {
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
