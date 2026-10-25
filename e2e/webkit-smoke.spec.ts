import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * Safari's engine, on a phone, on every kind of page.
 *
 * Until 25 October 2026 the whole suite ran in Chromium alone, so nothing
 * could see a page that works in Chrome and breaks in Safari. That is the
 * failure readers reported: "several features do not work on mobile, some not
 * on Safari specifically". This spec runs only in the `webkit-iphone` project
 * (playwright.config.ts) and asks the cheapest question that would have caught
 * those reports: does each route render its heading, without an uncaught error
 * and without scrolling sideways?
 *
 * What it cannot see: Playwright's WebKit is current, so a feature missing
 * only from *older* iOS Safari passes here. `scripts/check-no-lookbehind.mjs`
 * guards the one such case that has already shipped (regex lookbehind, which
 * Safari before 16.4 cannot parse).
 */

const ROUTES = [
  '/',
  '/shrine/data-darbar',
  '/ur/shrine/data-darbar',
  '/graph',
  '/almanac',
  '/chronology',
  '/shared-ground',
  '/sources',
  '/about',
  '/settings',
];

for (const route of ROUTES) {
  test(`${route} renders in WebKit without an error`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));

    await page.goto(route);
    await expect(page.locator('h1').first()).toBeVisible();
    // The error boundaries' card (AppErrorBoundary.tsx).
    await expect(page.locator('.error-card')).toHaveCount(0);

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    expect(overflow, 'the page scrolls sideways').toBeLessThanOrEqual(1);
    expect(errors).toEqual([]);
  });
}

test('the map draws every marker in WebKit', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT);
});
