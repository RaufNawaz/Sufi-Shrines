import type { Page } from '@playwright/test';
import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * On a phone, the map must open showing the archive — not a third of it.
 *
 * ## What was measured, 30 August 2026
 *
 * The map opened at a fixed centre and zoom regardless of viewport, and
 * `DEFAULT_CENTER` is Lahore — which is not the middle of a dataset spanning
 * 24.36–34.79° latitude and 65.52–75.02° longitude, but its north-east corner.
 * Marker centres outside the visible map rectangle (the viewport minus the
 * bottom sheet):
 *
 *     390×664   60 of 169        414×896   54 of 169
 *     390×844   54 of 169        360×780   56 of 169
 *     1280×900   0 of 169
 *
 * **It was not a random third.** At 390×664: **14 of 14 Nanakpanthi/Udasi
 * darbars**, 16 of 36 Hindu temples and 2 of 3 Jain temples were off-screen,
 * against 23 of 79 Muslim shrines. Every size measured hid *all fourteen*
 * Nanakpanthi sites. The archive's distinguishing claim is six traditions, and
 * a phone reader was shown four.
 *
 * ## What this asserts
 *
 * The rectangle, not the viewport. Measuring against `window.innerHeight` is
 * what the defect looked like from the inside — the pins were on the map, just
 * underneath the sheet — so the test computes the sheet's box and excludes it,
 * exactly as the probe that found this did.
 *
 * And it asserts the deep link still wins, because the council's warning about
 * this fix was specific: `?selected=` and tour routes already own the camera,
 * and an opening fit that raced them would land a shared link somewhere else.
 */

const PHONES = [
  { name: '390x664', width: 390, height: 664 },
  { name: '390x844', width: 390, height: 844 },
  { name: '360x780', width: 360, height: 780 },
];

/** Marker centres outside the map area a reader can actually see. */
async function pinsOutsideVisibleMap(page: Page) {
  return page.evaluate(() => {
    const sheet = document.querySelector('.sidebar');
    const rect = sheet?.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    /* The sheet spans the full width on a phone, so it occludes from its top
       edge down. Falling back to the viewport if it is absent would make this
       test pass for the wrong reason, so its presence is asserted separately. */
    const bottom = rect && rect.width >= vw * 0.9 ? rect.top : vh;

    return [...document.querySelectorAll('.leaflet-marker-icon')]
      .map((el) => {
        const b = el.getBoundingClientRect();
        return { x: b.left + b.width / 2, y: b.top + b.height / 2 };
      })
      .filter((p) => p.x < 0 || p.x > vw || p.y < 0 || p.y > bottom).length;
  });
}

/** Wait for the marker constellation to stop moving — the opening view is a
 *  camera move, and sampling during it measures a map mid-flight. */
async function waitForMapStill(page: Page) {
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
    timeout: 30_000,
  });
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const sample = () =>
          [...document.querySelectorAll('.leaflet-marker-icon')]
            .map((el) => {
              const b = el.getBoundingClientRect();
              return `${b.left.toFixed(0)},${b.top.toFixed(0)}`;
            })
            .join('|');
        const first = sample();
        setTimeout(() => resolve(first !== '' && first === sample()), 400);
      }),
    undefined,
    { timeout: 30_000 },
  );
}

test.describe('the opening view fits the archive on a phone', () => {
  for (const phone of PHONES) {
    test(`${phone.name}: every mapped site is above the sheet`, async ({ page }) => {
      await page.setViewportSize({ width: phone.width, height: phone.height });
      await page.goto('/');
      await waitForMapStill(page);

      /* The premise: the sheet is really there and really occluding. Without
         this the assertion below would pass on a layout where the sheet failed
         to render, which is the opposite of what it means to check. */
      const sheet = page.locator('.sidebar');
      await expect(sheet).toBeVisible();

      const outside = await pinsOutsideVisibleMap(page);
      expect(
        outside,
        `${outside} of ${MAPPED_SHRINE_COUNT} markers open outside the visible map — the archive is cropped on this screen`,
      ).toBe(0);
    });
  }

  test('desktop is left exactly as it was', async ({ page }) => {
    /* The other half of the ruling: desktop measured 0 outside before this
       change, so it is not refitted. If this ever fails, the narrow-viewport
       branch has leaked into a viewport that never needed it. */
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');
    await waitForMapStill(page);
    expect(await pinsOutsideVisibleMap(page)).toBe(0);
  });

  test('a ?selected= deep link still owns the camera', async ({ page }) => {
    /* The council's warning about this fix, asserted rather than trusted: an
       opening fit that raced the selection flyTo would land a shared link on
       the whole-archive view instead of its shrine. If the fit had won, the
       map would still be at overview zoom with every marker on screen. */
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/?selected=data-darbar');
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
      timeout: 30_000,
    });
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveCount(1, {
      timeout: 15_000,
    });

    const onScreen = await page.evaluate(() => {
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      return [...document.querySelectorAll('.leaflet-marker-icon')].filter((el) => {
        const b = el.getBoundingClientRect();
        const x = b.left + b.width / 2;
        const y = b.top + b.height / 2;
        return x >= 0 && x <= vw && y >= 0 && y <= vh;
      }).length;
    });
    expect(
      onScreen,
      'the whole archive is on screen after a deep link — the opening fit overrode the selection',
    ).toBeLessThan(MAPPED_SHRINE_COUNT / 2);
  });
});
