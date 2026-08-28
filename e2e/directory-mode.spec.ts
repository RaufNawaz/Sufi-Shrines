import type { Page } from '@playwright/test';
import { test, expect, settle } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';
/* `UI_TEXT.ur` is `UiStrings | undefined` in the app — the Urdu table is a
   lazily-loaded chunk — so a spec parameterised over both languages picks the
   table rather than indexing a registry that may be unpopulated. A static import
   in a test does not reach the bundle. */
import { UI_TEXT_UR } from '../src/lib/i18n/uiStrings.ur';
import { DIRECTORY_MODE_STORAGE_KEY } from '../src/lib/storageKeys';

/**
 * What the "Table of Shrines" button opens, and the setting that changes it.
 *
 * Every bug this file exists for was invisible to the unit tests, because all
 * of them were about layout or hit-testing and jsdom has neither. Three of the
 * four were also invisible to a full local suite and a green Pages deploy, and
 * turned up within a minute of clicking the deployed site (HANDOVER §9.82–84):
 *
 * 1. The panel was a <details>, whose ::details-content carries
 *    `content-visibility: hidden` — that implies paint containment, so the
 *    <details> became the containing block and the panel could only ever align
 *    to its own 32px icon. It began at x = −53 on desktop and ended 109px past
 *    the trailing edge in RTL on a phone.
 * 2. It stayed open after a choice, sitting on top of the very button whose
 *    behaviour had just changed — which on production made that button
 *    unclickable.
 * 3. Its only dismissal was the gear itself; adding Escape then found that
 *    MapPage collapses the sidebar on Escape too, so one press shut both.
 * 4. On a phone the sidebar is a bottom sheet whose header sits near the foot
 *    of the screen, so a panel opening downward fell 84px below the fold: the
 *    second option was untappable in English and both were in Urdu.
 *
 * So this drives the journey a reader actually takes — press the button, change
 * the setting, watch the button change, come back and find it remembered — and
 * asserts the two things a unit test cannot: the panel is wholly on screen, and
 * every option is what a tap at its own centre would really reach.
 */

const stored = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), DIRECTORY_MODE_STORAGE_KEY);

/* Both device classes, because the two placement bugs were opposites: on
   desktop the panel hung off the side of the sidebar, on a phone off the
   bottom of the screen. Either leaves an option nobody can pick. */
const DEVICES = [
  { name: 'desktop', viewport: { width: 1280, height: 900 }, isMobile: false },
  { name: 'phone', viewport: { width: 390, height: 844 }, isMobile: true },
] as const;

for (const device of DEVICES) {
  for (const lang of ['en', 'ur'] as const) {
    const T = lang === 'ur' ? UI_TEXT_UR : UI_TEXT.en;
    const url = lang === 'ur' ? '/?lang=ur' : '/';

    test.describe(`[${device.name}/${lang}] the Table of Shrines button`, () => {
      test.use({
        viewport: device.viewport,
        isMobile: device.isMobile,
        hasTouch: device.isMobile,
      });

      test('opens the search by default, and nothing is stored until asked', async ({ page }) => {
        await page.goto(url);
        await page.locator('#sidebar').waitFor();
        expect(await stored(page)).toBeNull();

        await page.locator('.list-toggle-btn').click();
        await expect(page.locator('.palette')).toBeVisible();
        await expect(page.locator('.shrine-list-panel')).toHaveCount(0);
      });

      test('sends the button to the table once the setting says so, and remembers', async ({
        page,
      }) => {
        await page.goto(url);
        await page.locator('#sidebar').waitFor();

        await page.getByRole('button', { name: T.settings }).click();
        const panel = page.locator('.settings-menu-panel');
        await expect(panel).toBeVisible();
        await settle(page);

        // All four edges. The horizontal ones because the panel used to hang
        // off the sidebar; the vertical ones because on a phone it opened
        // downward out of a bottom sheet and fell below the fold (§9.84).
        const geometry = await page.evaluate(() => {
          const p = document.querySelector('.settings-menu-panel')!.getBoundingClientRect();
          return {
            left: Math.round(p.left),
            right: Math.round(p.right),
            top: Math.round(p.top),
            bottom: Math.round(p.bottom),
            vw: window.innerWidth,
            vh: window.innerHeight,
          };
        });
        expect(geometry.left, 'the panel starts off the leading edge').toBeGreaterThanOrEqual(0);
        expect(geometry.right, 'the panel runs past the trailing edge').toBeLessThanOrEqual(
          geometry.vw,
        );
        expect(geometry.top, 'the panel starts above the viewport').toBeGreaterThanOrEqual(0);
        expect(geometry.bottom, 'the panel runs below the fold').toBeLessThanOrEqual(geometry.vh);

        /* Every control must be what a tap at its own centre actually reaches.
           A point outside the viewport returns null — the failure that matters
           most, an option no finger can land on.

           Over *every* control in the panel rather than the two named ones it
           used to check. The panel held one preference when this was written
           and holds seven now, and the bug it is written against — an option
           below the fold of a bottom sheet — is exactly the bug that arrives
           when a panel grows. Naming the options would have left the five new
           rows unguarded, which is this repository's most repeated lesson: a
           guard that samples one member of a set is blind to the others. */
        const reachable = await page.evaluate(() =>
          [
            ...document.querySelectorAll(
              '.settings-menu-panel input, .settings-menu-panel button, .settings-menu-panel a',
            ),
          ].map((el) => {
            const label =
              (el.closest('label') ?? el).textContent?.trim() ||
              el.getAttribute('aria-label') ||
              '(unnamed)';
            /* Scrolled to first, because the panel is a scroll container on a
               phone: seven preferences do not fit above the tab bar, and a row
               a reader has not scrolled to yet is not a bug. What this still
               catches — and it is the bug the file is named for — is a control
               that is *unreachable after scrolling to it*: one under the tab
               bar, one off the trailing edge, one whose own hit area is
               covered. Without the scroll the calendar and units rows reported
               the sticky footer and the tab bar as topmost, which is a true
               reading of a false question. */
            el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
            const r = el.getBoundingClientRect();
            const top = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2);
            return {
              label,
              ok: top === el || el.contains(top),
              topmost: top ? top.tagName.toLowerCase() : 'outside the viewport',
            };
          }),
        );
        expect(reachable.length, 'no controls found in the panel').toBeGreaterThan(2);
        expect(
          reachable.filter((r) => !r.ok),
          `unreachable options: ${JSON.stringify(reachable)}`,
        ).toEqual([]);

        await page.getByRole('radio', { name: T.directoryModeTable }).click();

        /* The panel stays open. It closed on a choice while it held one
           preference; with seven, closing on the first made setting a second a
           second trip to the gear. Escape, the gear and a click outside all
           still dismiss it — the test below covers two of them. */
        await expect(panel).toBeVisible();
        expect(await stored(page)).toBe('table');

        // And it is out of the way of the button it configures, which is the
        // reason closing-on-choice existed in the first place (§9.82).
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);

        await page.locator('.list-toggle-btn').click();
        await expect(page.locator('.shrine-list-panel')).toBeVisible();
        await expect(page.locator('.palette')).toHaveCount(0);

        await page.reload();
        await page.locator('#sidebar').waitFor();
        await page.locator('.list-toggle-btn').click();
        await expect(page.locator('.shrine-list-panel')).toBeVisible();
      });

      test('the panel closes on Escape and on a click outside it', async ({ page }) => {
        await page.goto(url);
        await page.locator('#sidebar').waitFor();
        const trigger = page.getByRole('button', { name: T.settings });
        const panel = page.locator('.settings-menu-panel');

        await trigger.click();
        await expect(panel).toBeVisible();
        await page.keyboard.press('Escape');
        await expect(panel).toHaveCount(0);
        await expect(trigger).toBeFocused();
        // One Escape shuts the thing on top, not the surface behind it: MapPage
        // also collapses the sidebar on Escape, and it must not have run.
        await expect(page.locator('#sidebar')).not.toHaveClass(/collapsed/);

        await trigger.click();
        await expect(panel).toBeVisible();
        await page.locator('.sidebar-header').click({ position: { x: 2, y: 2 } });
        await expect(panel).toHaveCount(0);
      });
    });
  }
}
