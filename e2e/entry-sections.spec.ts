import type { Page } from '@playwright/test';
import { test, expect, showNearbyMosquesSection } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

/**
 * The entry page's two optional sections — shared ground, and the nearby Auqaf
 * mosques — and the one thing turning them off must not do.
 *
 * Both shipped on for every reader until 14 September 2026, when Rauf asked for
 * them off "for the time being" and behind switches in `/settings`. The whole
 * risk in a change like that is quiet: a section that vanishes is easy to see,
 * and a *fact* that vanishes with it is not. So the assertions come in pairs —
 * the block is gone from `/shrine/data-darbar`, and `/shared-ground`, the map
 * lens and the Awqaf survey itself are exactly as they were.
 *
 * The other half is the round trip. A preference that writes but never reads is
 * the failure `settingsPage.test.tsx` was written for, one route down; the same
 * failure here looks like a switch that flips, persists, and changes nothing on
 * the page it names. Every test below therefore crosses from `/settings` to an
 * entry and back.
 *
 * `data-darbar` is the fixture shrine that has both: neighbours inside 800 m
 * (two gurdwaras and a secular memorial) and three in-range mosques in
 * `e2e/fixtures/mosques.csv`, one of them joined to it by the survey's Shrine
 * Name. A shrine with neither would pass every test here while proving nothing.
 */
const SLUG = 'data-darbar';
const en = UI_TEXT.en;

/** The Awqaf sheet's publish token (AWQAF_CSV_URL in src/lib/data/mosques.ts) —
 *  the stable difference between that request and the shrines CSV. */
const AWQAF_TOKEN = '2PACX-1vTzVlDrUr';

async function flip(page: Page, label: string) {
  await page.goto('/settings');
  const box = page.getByRole('switch', { name: label });
  await expect(box).toBeVisible();
  await box.check();
}

test.describe('the entry page’s optional sections are off by default', () => {
  test('a shrine that has both shows neither', async ({ page }) => {
    await page.goto(`/shrine/${SLUG}`);
    await expect(page.locator('h1.shrine-title')).toBeVisible();

    await expect(page.locator('#shared-ground')).toHaveCount(0);
    await expect(page.locator('.nearby-mosques')).toHaveCount(0);
  });

  test('and the mosque survey is never fetched', async ({ page }) => {
    /* The reason the switch is read at the call site rather than inside
       `NearbyMosques`: a component that mounts to decide it should not render
       has already asked a second Google Sheet for a CSV. Off must cost nothing.
       Requests are counted rather than mocked away — the fixture fulfils this
       URL, so a regression would otherwise look identical to a pass. */
    const awqaf: string[] = [];
    page.on('request', (req) => {
      if (req.url().includes(AWQAF_TOKEN)) awqaf.push(req.url());
    });

    await page.goto(`/shrine/${SLUG}`);
    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await page.waitForTimeout(1500);

    expect(awqaf, 'the Awqaf sheet was fetched for a section nobody asked for').toEqual([]);
  });

  test('but the archive-wide shared ground is untouched', async ({ page }) => {
    /* The invariant the switch exists under: it removes a block from an entry,
       never a fact from the archive. */
    await page.goto('/shared-ground');
    await expect(page.locator('.crossing').first()).toBeVisible();

    /* Counted, not `toBeVisible`: every link the lens draws spans under 800 m,
       which at the zoom that shows Pakistan is a zero-length path — the reason
       shared-ground.spec.ts asserts the lens by count too. */
    await page.goto('/?lens=shared-ground');
    await expect(page.locator('.shared-ground-pin-ring').first()).toBeVisible();
    expect(await page.locator('.shared-ground-link').count()).toBeGreaterThan(0);
  });
});

test.describe('and each switch reaches the entry it names', () => {
  test('shared ground appears once it is turned on, and survives a reload', async ({ page }) => {
    await flip(page, en.settingsSharedGroundToggle);

    await page.goto(`/shrine/${SLUG}`);
    const section = page.locator('#shared-ground');
    await expect(section).toBeVisible();
    await expect(section.locator('.shared-ground-item')).not.toHaveCount(0);

    await page.reload();
    await expect(page.locator('#shared-ground')).toBeVisible();

    // The other switch is independent — turning one on must not turn both on.
    await expect(page.locator('.nearby-mosques')).toHaveCount(0);
  });

  test('nearby mosques appear once they are turned on, and survive a reload', async ({ page }) => {
    await flip(page, en.settingsMosquesToggle);

    await page.goto(`/shrine/${SLUG}`);
    const block = page.locator('.nearby-mosques');
    await expect(block).toBeVisible();
    await expect(block.locator('.nearby-mosque')).not.toHaveCount(0);

    await page.reload();
    await expect(page.locator('.nearby-mosques')).toBeVisible();

    await expect(page.locator('#shared-ground')).toHaveCount(0);
  });

  test('and turning one back off removes it again', async ({ page }) => {
    await flip(page, en.settingsSharedGroundToggle);
    await page.goto(`/shrine/${SLUG}`);
    await expect(page.locator('#shared-ground')).toBeVisible();

    await page.goto('/settings');
    await page.getByRole('switch', { name: en.settingsSharedGroundToggle }).uncheck();

    await page.goto(`/shrine/${SLUG}`);
    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await expect(page.locator('#shared-ground')).toHaveCount(0);
  });
});

test.describe('the mosque names keep Latin metrics in the Urdu view', () => {
  test('a name is set at the Latin size, not Nastaliq’s', async ({ page }) => {
    /* Measured on 14 September 2026, before the fix: the name computed
       **24.19px on 49.59px leading** against the English view's 16px on 25.6px,
       because a Latin run drawn by Source Sans down the `--font-urdu` fallback
       stack still inherits `--font-scale-urdu` (1.44) and `--leading-urdu`
       (2.05) — metrics that exist for Nastaliq and for nothing else. The
       symptom was a 461px name filling a 499px card, one per line, edge to
       edge, and wrapping to two right-aligned lines on a phone.

       Asserted as a comparison rather than against a number: the point is that
       the Latin run is not bumped relative to the Urdu around it, and a literal
       would have to be re-derived every time the scale or the reading step
       moves. */
    await showNearbyMosquesSection(page);
    await page.goto(`/shrine/${SLUG}?lang=ur`);

    const block = page.locator('.nearby-mosques');
    await expect(block).toBeVisible();

    const metrics = await page.evaluate(() => {
      const name = document.querySelector('.nearby-mosque-name > a');
      const urdu = document.querySelector('.nearby-mosque-womens');
      if (!name || !urdu) return null;
      const a = getComputedStyle(name);
      const u = getComputedStyle(urdu);
      return {
        nameSize: parseFloat(a.fontSize),
        nameLeading: parseFloat(a.lineHeight),
        urduSize: parseFloat(u.fontSize),
        dir: a.direction,
      };
    });

    expect(metrics).not.toBeNull();
    const m = metrics!;
    // Smaller than the Urdu body beside it, where it used to be larger.
    expect(m.nameSize).toBeLessThan(m.urduSize);
    // And led as Latin: anything at or above 2× is Nastaliq's leading again.
    expect(m.nameLeading / m.nameSize).toBeLessThan(1.8);
    expect(m.dir).toBe('ltr');
  });
});
