import { test, expect } from '@playwright/test';

/**
 * The phone tab bar.
 *
 * Before it, a phone reader's only navigation anywhere in the app was "Back to
 * map": four of the archive's six surfaces were reachable only through links
 * inside article bodies. So this is the app's primary navigation on the device
 * most of its readers use, and the ways it can silently break are all
 * geometric — none of them shows up in a unit test:
 *
 * - **Content underneath it.** A fixed bar over a scrolling page hides the last
 *   rows of that page unless every full-height wrapper pays for its height. The
 *   footer carries the licence and the citation link, so "the last thing on the
 *   page is unreachable" is not a cosmetic bug here.
 * - **Nothing selected.** A bar that highlights no tab on `/shrine/…` tells a
 *   reader they have left the app. `tabs.test.ts` proves the mapping; this
 *   proves it reaches the DOM as `aria-current`.
 * - **Present on a laptop.** Hidden with anything other than `display: none`, a
 *   desktop keyboard reader tabs through five links to a bar that is not there.
 */

const PHONE = { width: 390, height: 844 };

/** Every route with a tab, plus the two detail shapes that inherit one. */
const ROUTES = [
  { name: 'map', path: '/', ready: '#sidebar', tab: 'Map' },
  { name: 'explore', path: '/graph', ready: 'h1.entity-title', tab: 'Figures' },
  { name: 'almanac', path: '/almanac', ready: 'h1', tab: 'Almanac' },
  { name: 'atlas', path: '/typology', ready: 'h1', tab: 'Atlas' },
  { name: 'about', path: '/about', ready: 'h1.entity-title', tab: 'Archive' },
  { name: 'shrine', path: '/shrine/data-darbar', ready: 'h1.shrine-title', tab: 'Map' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh', ready: 'h1.entity-title', tab: 'Figures' },
] as const;

test.describe('on a phone', () => {
  test.use({ viewport: PHONE });

  for (const route of ROUTES) {
    test(`${route.name} shows the bar with exactly one tab current`, async ({ page }) => {
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor();

      const bar = page.locator('.tabbar');
      await expect(bar).toBeVisible();

      const current = page.locator('.tabbar-link[aria-current="page"]');
      await expect(current).toHaveCount(1);
      await expect(current).toContainText(route.tab);
    });
  }

  test('every tab is a 44px target', async ({ page }) => {
    await page.goto('/graph');
    await page.locator('h1.entity-title').first().waitFor();
    const links = page.locator('.tabbar-link');
    const count = await links.count();
    expect(count).toBe(5);
    for (let i = 0; i < count; i++) {
      const box = await links.nth(i).boundingBox();
      expect(box, `tab ${i} has no box`).toBeTruthy();
      expect(box!.height, `tab ${i} height`).toBeGreaterThanOrEqual(44);
      expect(box!.width, `tab ${i} width`).toBeGreaterThanOrEqual(44);
    }
  });

  /* `/about` is the long one: it absorbed /coverage and /report, so it is the
     page most likely to end underneath the bar. */
  for (const path of ['/saint/data-ganj-bakhsh', '/about']) {
    test(`the last of ${path} is not hidden behind the bar`, async ({ page }) => {
      await page.goto(path);
      await page.locator('h1.entity-title').first().waitFor();
      await page.waitForTimeout(400);
      /* Scrolled repeatedly rather than once: a late image or font shifts the
         document height, and a single scrollTo then stops short of the end —
         which is what made the first measurement of this look like a failure.

         `behavior: 'instant'` because <html> carries `scroll-behavior: smooth`,
         so a plain scrollTo *animates*. On a short page 200ms was enough to
         finish and nobody noticed. /about absorbed /coverage and /report and is
         now some twenty thousand pixels tall, and this began measuring a scroll
         still in flight — reporting the footer five thousand pixels below the
         fold on a page whose footer is perfectly reachable. This test is about
         layout, not motion. */
      for (let i = 0; i < 6; i++) {
        await page.evaluate(() =>
          window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'instant' }),
        );
        await page.waitForTimeout(200);
      }
      const clearance = await page.evaluate(() => {
        const bar = document.querySelector('.tabbar')!.getBoundingClientRect();
        /* The footer where there is one — it carries the licence and the
           citation link — and otherwise the last element with a box inside the
           main content. `/about` and `/coverage` have no footer of their own,
           and asserting against a missing element passes for the wrong
           reason. */
        const footer = document.querySelector('.site-footer');
        if (footer) return bar.top - footer.getBoundingClientRect().bottom;
        const main = document.getElementById('main-content')!;
        let lowest = -Infinity;
        for (const el of main.querySelectorAll('*')) {
          const box = el.getBoundingClientRect();
          if (box.height > 0 && box.width > 0) lowest = Math.max(lowest, box.bottom);
        }
        return bar.top - lowest;
      });
      expect(
        clearance,
        'The last thing on the page must stay reachable — on pages that have one, that is the ' +
          'footer with the licence and the citation link.',
      ).toBeGreaterThanOrEqual(0);
    });
  }

  test('a tab navigates', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await page.locator('.tabbar-link', { hasText: 'Almanac' }).click();
    await expect(page).toHaveURL(/\/almanac/);
    await expect(page.locator('.tabbar-link[aria-current="page"]')).toContainText('Almanac');
  });

  test('the Urdu bar carries no Latin', async ({ page }) => {
    /* The first thing an Urdu reader sees. e2e/urdu-no-leak.spec.ts scans page
       bodies; this asserts the chrome specifically, because a tab label is the
       one string that is on screen on every route at once. */
    await page.goto('/graph?lang=ur');
    await page.locator('h1.entity-title').first().waitFor();
    const labels = await page.locator('.tabbar-label').allInnerTexts();
    expect(labels).toHaveLength(5);
    for (const label of labels) expect(label).not.toMatch(/[A-Za-z]/);
  });

  test('the bar mirrors in Urdu', async ({ page }) => {
    /* RTL is not a coat of paint: the first tab must sit on the right, or the
       reading order of the navigation contradicts the page it navigates. */
    await page.goto('/graph?lang=ur');
    await page.locator('h1.entity-title').first().waitFor();
    const first = await page.locator('.tabbar-item').first().boundingBox();
    const last = await page.locator('.tabbar-item').last().boundingBox();
    expect(first!.x).toBeGreaterThan(last!.x);
  });
});

test.describe('on a laptop', () => {
  test.use({ viewport: { width: 1280, height: 900 } });

  test('the bar is absent from the page entirely', async ({ page }) => {
    await page.goto('/graph');
    await page.locator('h1.entity-title').first().waitFor();
    /* `toBeHidden` passes for `visibility: hidden` and an off-screen transform
       too, and neither takes the links out of the tab order. `display: none` is
       what this asserts: the element has no box at all. */
    await expect(page.locator('.tabbar')).toBeHidden();
    expect(await page.locator('.tabbar').boundingBox()).toBeNull();
    await expect(page.locator('.tabbar-link')).toHaveCount(5);
    for (const link of await page.locator('.tabbar-link').all()) {
      await expect(link).toBeHidden();
    }
  });
});
