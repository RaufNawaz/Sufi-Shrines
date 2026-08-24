import type { Page } from '@playwright/test';
import { test, expect, settle } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';
import { DIRECTORY_MODE_STORAGE_KEY } from '../src/lib/storageKeys';

/**
 * What the "Table of Shrines" button opens, and the setting that changes it.
 *
 * Every bug this file exists for was invisible to the unit tests, because all
 * three were about layout or hit-testing and jsdom has neither:
 *
 * 1. The settings panel was a <details>, whose ::details-content carries
 *    `content-visibility: hidden` — that implies paint containment, so the
 *    <details> became the containing block and the panel could only ever align
 *    to its own 32px icon. It began at x = −53 on desktop and ended 109px past
 *    the trailing edge in RTL on a phone (HANDOVER §9.82).
 * 2. The panel is absolutely positioned directly over the button it
 *    configures, so leaving it open after a choice hid the very change the
 *    reader had just made — and on the deployed site it made that button
 *    unclickable.
 * 3. Its only dismissal was the gear itself.
 *
 * So this checks the journey a reader actually takes, in a real browser, in
 * both languages: press the button, change the setting, watch the button
 * change, come back and find the choice remembered.
 */

const stored = (page: Page) =>
  page.evaluate((key) => localStorage.getItem(key), DIRECTORY_MODE_STORAGE_KEY);

for (const lang of ['en', 'ur'] as const) {
  const T = UI_TEXT[lang];
  const url = lang === 'ur' ? '/?lang=ur' : '/';

  test.describe(`[${lang}] the Table of Shrines button`, () => {
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
      const panel = page.locator('.sidebar-settings-panel');
      await expect(panel).toBeVisible();
      await settle(page);

      // The panel must sit inside the sidebar it belongs to — not merely inside
      // the viewport, which a panel hanging over the map would also satisfy.
      const geometry = await page.evaluate(() => {
        const p = document.querySelector('.sidebar-settings-panel')!.getBoundingClientRect();
        const s = document.querySelector('#sidebar')!.getBoundingClientRect();
        return {
          panelLeft: Math.round(p.left),
          panelRight: Math.round(p.right),
          sidebarLeft: Math.round(s.left),
          sidebarRight: Math.round(s.right),
        };
      });
      expect(geometry.panelLeft, 'the panel starts before the sidebar does').toBeGreaterThanOrEqual(
        geometry.sidebarLeft,
      );
      expect(geometry.panelRight, 'the panel ends after the sidebar does').toBeLessThanOrEqual(
        geometry.sidebarRight,
      );

      // The control is what a click at its own centre would actually reach.
      const topmostIsTheRadio = await page.evaluate((name) => {
        const input = [...document.querySelectorAll('.sidebar-settings-panel input')].find(
          (i) => i.parentElement?.textContent?.trim() === name,
        ) as HTMLElement | undefined;
        if (!input) return false;
        const r = input.getBoundingClientRect();
        return document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2) === input;
      }, T.directoryModeTable);
      expect(topmostIsTheRadio, 'something is covering the radio').toBe(true);

      await page.getByRole('radio', { name: T.directoryModeTable }).click();

      // Choosing closes the panel: it is sitting on top of the button whose
      // behaviour just changed.
      await expect(panel).toHaveCount(0);
      expect(await stored(page)).toBe('table');

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
      const panel = page.locator('.sidebar-settings-panel');

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
