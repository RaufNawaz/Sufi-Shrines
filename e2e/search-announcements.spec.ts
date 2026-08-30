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

test.describe('a capped list says it is capped', () => {
  /**
   * Measured on the map's palette: typing "lahore" reported **"44 of 171
   * sites"** and rendered **40**. `MAX_RESULTS = 40` — a deliberate cap, so the
   * open animation stays at 60fps on a phone — but the status line reported
   * `results.length`, so four matching sites were unreachable through search and
   * nothing said so.
   *
   * Reporting `visible.length` instead would have been a different falsehood:
   * the reader would be told 40 sites match when 44 do. Both numbers, or the
   * count stops meaning anything.
   *
   * The assertion is the relationship rather than 44 or 40 — the fixture's
   * match counts move whenever the archive does, and revising a hardcoded
   * number is exactly when someone revises away the check.
   */
  test('the map palette names both numbers when it truncates', async ({ page }) => {
    await openPalette(page, '/', 'lahore');

    /* Wait for the worker, not for the keystroke. An earlier version of this
       measurement read the status 1.5s in and saw the *unfiltered* list — the
       archive total with no "N of" in front of it — before the ranked results
       arrived. The instrument was too fast, and it looked exactly like a bug in
       the app. So the wait is for the shape "N of M", which only appears once a
       query has actually narrowed something.

       Case-insensitive, and that is not defensive: `.palette-status` is
       `text-transform: uppercase`, and **`innerText()` returns rendered text**,
       so it reads "42 OF 169 SITES" where `textContent` reads "42 of 169
       sites". A lowercase pattern against `innerText` matched nothing and timed
       out for twenty seconds, which looked exactly like the count never
       arriving. */
    await expect
      .poll(async () => /\d+\s+of\s+\d+/i.test(await page.locator('.palette-status').innerText()), {
        timeout: 20_000,
      })
      .toBe(true);
    await page.waitForTimeout(2_000);

    const status = (await page.locator('.palette-status').innerText()).trim();
    const rendered = await page.locator('.palette-result').count();
    /* `/i` here too, and for the same reason as the poll above — this is the
       rendered, uppercased text. Without it the parse silently fell through to
       `rendered`, which made a truncated list look untruncated and sent the
       assertion down the wrong branch. One cause, two failures, ten minutes
       apart. */
    const matched = Number(/(\d+)\s+of\s+(\d+)/i.exec(status)?.[1] ?? rendered);

    expect(rendered, 'nothing rendered, so this asserts nothing').toBeGreaterThan(0);

    if (matched > rendered) {
      expect(
        status,
        `the list shows ${rendered} of ${matched} matches and the status does not say so: "${status}"`,
      ).toContain(String(rendered));
    } else {
      /* Not truncated: the status must not claim a truncation that did not
         happen. */
      expect(status).not.toMatch(/showing first/i);
    }
  });
});

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
