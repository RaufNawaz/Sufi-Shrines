import { test, expect } from './fixtures';

/**
 * The entity pages read as a clean page to the public and keep every
 * qualification for the team — the split Rauf ruled on 11 September 2026 and
 * the shrine page, /about and the Urs Calendar received that day (HANDOVER
 * §9.183). The saint, order, graph and tradition pages were swept on
 * 13 September 2026 (§9.190) after a council seat counted what an anonymous
 * reader was still shown: 28 `unreviewed` chips on /order/qadiriyya, 18
 * repository paths as citations on /graph, an `approximate` pill and a
 * Sources & Provenance block on /saint/shah-hussain.
 *
 * Asserted in a browser because the gate is `hasProjectAccess()` reading
 * `localStorage`, and the eight render sites are spread over seven files —
 * exactly the shape a unit test of one component cannot see. `?team=1` is not
 * used to enter the team view here: a `<Navigate>` redirect drops it, so the
 * tests set the persisted flag directly (the idiom in `about-merge.spec.ts`).
 */

/** Apparatus a public reader must not see on any entity page. */
const TEAM_ONLY = [
  '.lineage-unreviewed',
  '.graph-lineage-cite',
  '.almanac-flag--approximate',
  '.figure-provenance',
  '.entity-order-as-recorded',
  '.order-description-editorial',
  '.kin-notes',
];

const PUBLIC_ROUTES = ['/saint/shah-hussain', '/order/qadiriyya', '/graph', '/tradition/nath'];

test.describe('entity pages — internal apparatus is team-only', () => {
  for (const path of PUBLIC_ROUTES) {
    test(`the public reads ${path} without review state or repository paths`, async ({ page }) => {
      await page.goto(path);
      await page.waitForSelector('h1.entity-title');
      for (const selector of TEAM_ONLY) {
        expect(await page.locator(selector).count(), selector).toBe(0);
      }
    });
  }

  test('the team view keeps the chips, the file paths and the provenance block', async ({
    page,
  }) => {
    await page.addInitScript(() => window.localStorage.setItem('shrines_team_access', '1'));
    await page.goto('/saint/shah-hussain');
    await page.waitForSelector('h1.entity-title');
    // Shah Hussain carries unreviewed lineage rows with quotes read from the
    // corpus, and machine-read dates — so every gated element has something to
    // show here, which is why this figure is the fixture.
    expect(await page.locator('.lineage-unreviewed').count()).toBeGreaterThan(0);
    expect(await page.locator('.graph-lineage-cite').count()).toBeGreaterThan(0);
    await expect(page.locator('.figure-provenance')).toBeVisible();
  });

  test('a public list row shows a place, not the survey paragraph', async ({ page }) => {
    // Malik Ahmad Ayaz's Location is a 200-character qualification naming a
    // market and another shrine; the order page's site card used to print all
    // of it. The public card carries at most a place name's worth.
    await page.goto('/place/lahore');
    await page.waitForSelector('h1.entity-title');
    const subs = await page.locator('.inset-row-sub').allInnerTexts();
    expect(subs.length).toBeGreaterThan(0);
    for (const text of subs) expect(text.length, text).toBeLessThanOrEqual(60);
  });
});
