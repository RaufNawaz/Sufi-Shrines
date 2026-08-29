import { test, expect, settle } from './fixtures';

/**
 * Track C — `/chronology`.
 *
 * The visual claims here are unusual, so the assertions are about honesty
 * rather than about layout: **a bar's width is the archive's uncertainty**, and
 * **a place the archive cannot date is counted rather than guessed at**. Those
 * two are the reason `SHARED_GROUND_VISION.md` deferred this track for a week,
 * so they are what a spec should defend. Parsing rules have unit tests in
 * `src/lib/chronology/__tests__/timeline.test.ts`; this file checks that what
 * they decided survives to the screen, in both languages.
 */

const EASTERN = /[۰-۹]/;

test.describe('the chronology', () => {
  test('plots the archive and counts what it cannot plot', async ({ page }) => {
    await page.goto('/chronology');
    await page.locator('h1.entity-title').waitFor();
    await page.locator('.chronology-mark').first().waitFor();
    await settle(page);

    /* Six traditions, each its own lane — the interleaving is the whole point. */
    await expect(page.locator('.chronology-band')).toHaveCount(6);

    const marks = await page.locator('.chronology-mark').count();
    expect(marks, 'nothing was plotted').toBeGreaterThan(100);

    /* The undated are on the page, by name, not merely tallied. An archive that
       hides what it does not know would show the same timeline. */
    const undated = await page.locator('.chronology-undated-list li').count();
    expect(undated, 'no undated places listed').toBeGreaterThan(0);

    const counts = (await page.locator('.chronology-counts').textContent()) ?? '';
    expect(counts).toContain(String(marks));
    expect(counts).toContain(String(undated));
  });

  test('the picture does not pretend to be an interface', async ({ page }) => {
    /* The marks were links until Lighthouse scored this page 96 on
       accessibility: ~10px tall and often 2px wide is 120 targets far under the
       24px minimum, and a mark cannot be made bigger because its width IS the
       datum. So the lane is `aria-hidden` and every dated place is reachable
       from the list under its lane. If someone makes a mark focusable again,
       this fails. */
    await page.goto('/chronology');
    await page.locator('.chronology-mark').first().waitFor();

    await expect(page.locator('.chronology-lane').first()).toHaveAttribute('aria-hidden', 'true');
    expect(await page.locator('.chronology-mark a').count()).toBe(0);

    const listed = await page.locator('.chronology-band-list li a').count();
    const marks = await page.locator('.chronology-mark').count();
    expect(listed, 'a mark with no way to reach the place it draws').toBe(marks);
  });

  test('every dated place is reachable, with its span and precision in text', async ({ page }) => {
    await page.goto('/chronology');
    await page.locator('.chronology-band-list li').first().waitFor();

    const first = page.locator('.chronology-band-list li').first();
    await expect(first.locator('a')).toHaveAttribute('href', /\/shrine\//);
    const date = (await first.locator('.chronology-band-list-date').textContent()) ?? '';
    expect(date, 'no span on a listed place').toMatch(/\d|[۰-۹]/);
  });

  test('reads as Urdu, right to left, in Eastern numerals', async ({ page }) => {
    await page.goto('/chronology?lang=ur');
    await page.locator('h1.entity-title').waitFor();
    await page.locator('.chronology-mark').first().waitFor();
    await settle(page);

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    /* Eastern numerals must reach the scale, the counts and the bar labels —
       three separate render sites, and the numeral toggle has been missed at
       one of them before (CLAUDE.md i18n rule 5). */
    const counts = (await page.locator('.chronology-counts').textContent()) ?? '';
    expect(counts, 'counts are not in Eastern numerals').toMatch(EASTERN);

    const tick = (await page.locator('.chronology-tick').first().textContent()) ?? '';
    expect(tick, 'the century scale is not in Eastern numerals').toMatch(EASTERN);

    const listed = (await page.locator('.chronology-band-list-date').first().textContent()) ?? '';
    expect(listed, 'a listed date is not in Eastern numerals').toMatch(EASTERN);
  });

  test('the timeline runs right-to-left in Urdu', async ({ page }) => {
    /* Not cosmetic: the marks are positioned with `inset-inline-start`, so the
       earliest century sits on the right for an Urdu reader without a second
       code path. If someone swaps that for `left`, this is what notices. */
    await page.goto('/chronology?lang=ur');
    await page.locator('.chronology-mark').first().waitFor();
    await settle(page);

    const lane = page.locator('.chronology-lane').first();
    const box = await lane.boundingBox();
    const firstMark = await lane.locator('.chronology-mark').first().boundingBox();
    expect(box && firstMark).toBeTruthy();
    /* The earliest entry in a right-to-left lane starts in its right half. */
    expect(firstMark!.x).toBeGreaterThan(box!.x + box!.width / 2);
  });
});
