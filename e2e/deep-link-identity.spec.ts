import { test, expect } from './fixtures';

/**
 * A shared link must open the shrine it names, after the dataset changes
 * underneath it.
 *
 * `buildShrines` numbers rows by position — `.map((row, i) => buildShrine(row, i))`
 * — and the map swaps its dataset twice on a cold load: the bundled slim index
 * first, so a marker can be drawn in ~1.5s, then the live sheet. Production has
 * 171 rows against the snapshot's 169 and the two extra rows are not at the end,
 * so the same integer names a different shrine in each array.
 *
 * Measured on a production build against the live sheet, before the fix:
 * `/?selected=data-darbar` rendered "Data Darbar" at 0.7s and **"Dargah of Pir
 * Muhammad Rashid (Roze Dhani), Pir Jo Goth" at 2.1s**, with the address bar
 * still reading `data-darbar`. A link someone sent opened a different shrine in
 * a different province and said nothing.
 *
 * The hermetic fixture cannot reproduce that on its own — its CSV is generated
 * from the same snapshot the index is, so the two agree and every id lines up.
 * This spec introduces the drift deliberately: it serves the fixture CSV with
 * **one extra row in front**, which shifts every row's index by one. That is
 * the production condition in miniature, and it is the smallest change that
 * creates it.
 */
const SHIFTED_ROW_NAME = 'Zz Index Shifting Fixture Row';

test.describe('a deep link keeps its own shrine when the dataset is replaced', () => {
  test('?selected=<slug> still shows that slug after the sheet lands', async ({ page }) => {
    /* Registered before `goto`, and it wraps the fixture the context route
       already serves rather than replacing it: `route.fetch()` runs the
       handler underneath, so this stays hermetic and stays in step if the
       fixture is regenerated. */
    await page.route(/docs\.google\.com/, async (route) => {
      const response = await route.fetch();
      const csv = await response.text();
      const newline = csv.indexOf('\n');
      const header = csv.slice(0, newline);
      const columns = header.split(',').length;
      /* One synthetic row, no commas or quotes in any cell, so it needs no
         escaping and cannot disturb the multiline cells that follow. */
      const cells = new Array(columns).fill('');
      cells[0] = SHIFTED_ROW_NAME;
      cells[1] = 'Testville';
      cells[2] = 'Muslim Shrine';
      cells[3] = '31.5';
      cells[4] = '74.3';
      await route.fulfill({
        status: 200,
        contentType: 'text/csv; charset=utf-8',
        body: `${header}\n${cells.join(',')}\n${csv.slice(newline + 1)}`,
      });
    });

    await page.goto('/?selected=data-darbar');
    await page.locator('.preview-card').waitFor();

    /* The shifted sheet has to have actually arrived, or this asserts nothing:
       the extra row is the proof, and it is only in the CSV. */
    await expect
      .poll(async () => page.locator('.shrine-dot').count(), { timeout: 20_000 })
      .toBeGreaterThan(0);
    await expect
      .poll(
        async () =>
          page.evaluate((name) => document.body.innerHTML.includes(name), SHIFTED_ROW_NAME),
        { timeout: 20_000, message: 'the shifted CSV never replaced the index' },
      )
      .toBe(true);

    /* And the card is still the shrine the link named. Held for a beat rather
       than sampled once: the swap that caused the original bug arrived 1.4s
       after the first correct render, so an immediate assertion passed. */
    for (let i = 0; i < 4; i += 1) {
      await expect(page.locator('.preview-card h2')).toHaveText(/Data Darbar/);
      await page.waitForTimeout(500);
    }
    await expect(page).toHaveURL(/selected=data-darbar/);
  });
});
