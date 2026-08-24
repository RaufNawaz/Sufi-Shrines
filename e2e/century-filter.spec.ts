import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { settle } from './fixtures';

/**
 * Browsing the archive by *when*.
 *
 * The explorer could be searched by name and by tradition and not by century, on
 * an archive whose material runs from the 8th to the 21st. The filter itself is
 * three lines of `useMemo`; what needs a browser is the thing the unit test
 * cannot see — that the chips, the list and the result count all describe the
 * same set at the same moment.
 *
 * The undated chip is the one to watch. `figureCentury` refuses to convert a
 * Hijri year, so **63 of the 136 documented figures cannot be placed in a
 * century at all** — the largest group in the row. A filter that silently
 * dropped them would hide nearly half the archive behind a control that looks
 * complete, so the chip has to be there, has to carry its count, and has to
 * work.
 */
test.describe('the century filter', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/graph');
    await page.locator('h1.entity-title').first().waitFor();
    await settle(page);
  });

  const rows = (page: Page) => page.locator('.graph-saints-list .inset-row');

  test('offers a chip per century the archive can place, plus undated', async ({ page }) => {
    const chips = page.locator('.graph-century-chips .filter-chip');
    /* "Any", the centuries present, and undated. Ten is a floor rather than an
       exact count: an enrichment pass that dates a figure into a new century
       should not fail this. */
    expect(await chips.count()).toBeGreaterThan(10);
    await expect(chips.first()).toHaveText(/Any/);
    await expect(
      page.locator('.graph-century-chips .filter-chip', { hasText: 'Undated' }),
    ).toBeVisible();
  });

  test('the chip counts add up to the whole', async ({ page }) => {
    /* A filter whose parts do not sum to the total is one a reader cannot
       trust. Every figure is in exactly one century or in undated. */
    const total = await rows(page).count();
    const counts = await page
      .locator('.graph-century-chips .filter-chip .filter-chip-count')
      .allInnerTexts();
    const summed = counts.reduce((sum, text) => sum + Number(text.trim()), 0);
    expect(summed).toBe(total);
  });

  test('narrows the list to one century, and the count line follows', async ({ page }) => {
    const before = await rows(page).count();
    const chip = page.locator('.graph-century-chips .filter-chip', { hasText: '17th' });
    const declared = Number((await chip.locator('.filter-chip-count').innerText()).trim());
    await chip.click();

    await expect(chip).toHaveAttribute('aria-pressed', 'true');
    await expect(rows(page)).toHaveCount(declared);
    expect(declared).toBeLessThan(before);
    /* The status line is what a screen-reader user hears; it must not describe
       the unfiltered set. */
    await expect(page.locator('.graph-figure-filter-count')).toContainText(String(declared));
  });

  test('opens the undated group rather than hiding it', async ({ page }) => {
    const chip = page.locator('.graph-century-chips .filter-chip', { hasText: 'Undated' });
    const declared = Number((await chip.locator('.filter-chip-count').innerText()).trim());
    expect(declared, 'the undated group should be substantial — it is the point').toBeGreaterThan(
      20,
    );
    await chip.click();
    await expect(rows(page)).toHaveCount(declared);
  });

  test('a second click on the active chip clears it', async ({ page }) => {
    const total = await rows(page).count();
    const chip = page.locator('.graph-century-chips .filter-chip', { hasText: '13th' });
    await chip.click();
    await expect(rows(page)).not.toHaveCount(total);
    await chip.click();
    await expect(rows(page)).toHaveCount(total);
    await expect(chip).toHaveAttribute('aria-pressed', 'false');
  });

  test('combines with the text filter instead of replacing it', async ({ page }) => {
    /* Two controls over one list: if the second reset the first, a reader would
       lose their query every time they narrowed the period. */
    await page.locator('.graph-century-chips .filter-chip', { hasText: '20th' }).click();
    const periodOnly = await rows(page).count();
    await page.locator('#figure-filter').fill('shah');
    const both = await rows(page).count();
    expect(both).toBeLessThanOrEqual(periodOnly);
    await expect(
      page.locator('.graph-century-chips .filter-chip', { hasText: '20th' }),
    ).toHaveAttribute('aria-pressed', 'true');
  });
});
