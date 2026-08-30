import { test, expect } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * What a screen reader is told when a search changes the list.
 *
 * Measured 30 August 2026, typing into ⌘K and reading every live region in the
 * document:
 *
 *     /about   "lahore" → 9 results   announced: nothing
 *     /about   "zzzzqq" → 0 results   announced: nothing
 *     /        "lahore" → 38 results  announced: "38 of 171 sites"
 *
 * The map's palette had done it correctly the whole time; the archive-wide one,
 * on every other route, said nothing at all — and silence is indistinguishable
 * from "still thinking", which is the worst thing a search can be.
 *
 * ## The half axe cannot fail
 *
 * Both comboboxes also hardcoded `aria-expanded="true"` and pointed
 * `aria-controls` at a listbox id that is **not in the document** when there
 * are no results. A screen reader is told a popup is open and sent to nothing.
 * axe grades a dangling `aria-controls` *incomplete* rather than a violation,
 * so `a11y.spec.ts` — which runs every route in both languages and the dark
 * theme at zero critical/serious — passed over it every time.
 *
 * The map's palette was the control while the other was being fixed, which is
 * how its copy of the same defect was found. Both are asserted here.
 */
async function openPalette(page: Page, route: string, query: string) {
  await page.goto(route);
  await page.locator('h1').first().waitFor();
  await page.keyboard.press('Meta+k');
  await page.locator('.palette-input').waitFor();
  await page.locator('.palette-input').fill(query);
  /* The count settles a beat after the keystroke — the worker ranks, and on the
     map the dataset may still be upgrading. */
  await expect(page.locator('.palette-status')).not.toHaveText('', { timeout: 20_000 });
}

const ROUTES = ['/about', '/graph', '/'];

test.describe('a search says how many results it found', () => {
  for (const route of ROUTES) {
    test(`${route} announces a non-empty result count`, async ({ page }) => {
      await openPalette(page, route, 'lahore');

      const status = page.locator('.palette-status');
      await expect(status).toHaveAttribute('aria-live', 'polite');
      /* `aria-atomic`, so the whole sentence is read on each change rather
         than a diff of it. */
      await expect(status).toHaveAttribute('aria-atomic', 'true');
      await expect(status).not.toHaveText('');

      const options = await page.locator('[role="option"]').count();
      expect(options, 'the query matched nothing, so this asserts nothing').toBeGreaterThan(0);
    });

    test(`${route} announces zero, and stops claiming a popup is open`, async ({ page }) => {
      await openPalette(page, route, 'zzzzqqnothingmatchesthis');

      await expect(page.locator('[role="option"]')).toHaveCount(0);
      await expect(page.locator('.palette-status')).not.toHaveText('');

      const input = page.locator('.palette-input');
      await expect(
        input,
        'the combobox says its popup is open with no listbox rendered',
      ).toHaveAttribute('aria-expanded', 'false');

      /* And it must not point at an element that is not there. Checked in the
         document rather than by attribute equality, because the bug was a
         *dangling* reference, not a wrong one. */
      const dangling = await page.evaluate(() => {
        const el = document.querySelector('[role="combobox"]');
        const id = el?.getAttribute('aria-controls');
        return id ? !document.getElementById(id) : false;
      });
      expect(dangling, 'aria-controls points at an id that is not in the document').toBe(false);
    });
  }
});
