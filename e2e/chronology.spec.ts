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

  test('every mark carries its own date and precision as a name', async ({ page }) => {
    /* A mark's visible content is its width and nothing else, so without an
       accessible name it is an unlabelled link — and a reader who cannot see it
       gets no date at all. */
    await page.goto('/chronology');
    await page.locator('.chronology-mark').first().waitFor();

    const labels = await page
      .locator('.chronology-mark')
      .evaluateAll((els) => els.map((e) => e.getAttribute('aria-label') ?? ''));

    expect(labels.length).toBeGreaterThan(100);
    for (const label of labels) {
      expect(label, 'a mark with no accessible name').not.toBe('');
      expect(label, `no year span in "${label}"`).toMatch(/\d|[۰-۹]/);
    }
  });

  test('a mark leads to the place it marks', async ({ page }) => {
    await page.goto('/chronology');
    const first = page.locator('.chronology-mark').first();
    await first.waitFor();
    await expect(first).toHaveAttribute('href', /\/shrine\//);
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

    const label = (await page.locator('.chronology-mark').first().getAttribute('aria-label')) ?? '';
    expect(label, 'a bar label is not in Eastern numerals').toMatch(EASTERN);
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
