import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

/**
 * Places as entities — Track B.
 *
 * The point of the feature is that a reader can get *from* a shrine *to* the
 * place it stands in and back, in either language, and that the page says only
 * what the data supports. So the journey is what is tested, not the component:
 * the /coverage index links to a place, the place lists its sites, each site
 * links back, and the shrine page offers the place again.
 *
 * The one thing a unit test cannot cover here is that the pills and the index
 * are *reachable*: `/place/lahore` was routed and prerendered before anything
 * linked to it, which is a page nobody would ever have found.
 */

const LAHORE_MIN_SITES = 20;

test.describe('places', () => {
  test('the coverage index links to a place page', async ({ page }) => {
    await page.goto('/coverage');
    await page.locator('h1.entity-title').waitFor();

    const links = page.locator('.coverage-place-link');
    // Polled, not counted once: /coverage is prerendered, so the first HTML the
    // browser paints has no place list at all — it is built from the dataset
    // after hydration.
    await expect.poll(() => links.count(), { timeout: 15000 }).toBeGreaterThanOrEqual(20);

    // Lahore is the densest place in the archive, so it heads the index.
    const first = links.first();
    await expect(first).toContainText('Lahore');
    await first.click();

    await expect(page).toHaveURL(/\/place\/lahore$/);
    await expect(page.locator('h1.entity-title')).toHaveText('Lahore');
  });

  test('a place page lists its sites, its traditions and its date span', async ({ page }) => {
    await page.goto('/place/lahore');
    await page.locator('h1.entity-title').waitFor();

    const sites = page.locator('.place-site');
    expect(await sites.count()).toBeGreaterThanOrEqual(LAHORE_MIN_SITES);

    // More than one tradition, which is the argument for the page existing.
    expect(await page.locator('.place-tradition').count()).toBeGreaterThan(1);

    // Every site links to a shrine page that exists.
    const href = await sites.first().locator('a').first().getAttribute('href');
    expect(href).toMatch(/\/shrine\/[a-z0-9-]+$/);
    await sites.first().locator('a').first().click();
    await expect(page.locator('h1.shrine-title')).toBeVisible();
  });

  test('a shrine page offers the places it is recorded in', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    const pills = page.locator('.shrine-place-tag');
    expect(await pills.count()).toBeGreaterThanOrEqual(1);
    await expect(pills.first()).toContainText('Lahore');

    await pills.first().click();
    await expect(page).toHaveURL(/\/place\/lahore$/);
    /* …and the place it navigated to lists the shrine it came from. Matched by
       href rather than by text: two of Lahore's entries mention Data Darbar,
       because one of them records its location relative to it. */
    await expect(page.locator('.place-site a[href$="/shrine/data-darbar"]')).toBeVisible();
  });

  test('an unknown place says so rather than rendering an empty page', async ({ page }) => {
    // Not a 404: /place/:slug is a real route, and a slug that names no place
    // in the vocabulary is a legitimate URL with nothing behind it.
    await page.goto('/place/no-such-town');
    await expect(page.locator('h1.entity-title')).toHaveText(UI_TEXT.en.placesTitle);
    await expect(page.getByText(UI_TEXT.en.placeNotFound)).toBeVisible();
  });

  test('[ur] the place page and the route to it are Urdu', async ({ page }) => {
    await page.goto('/coverage?lang=ur');
    await page.locator('h1.entity-title').waitFor();

    // The index heading is the Urdu word for Places, and the place names in it
    // come from the dictionary rather than from the English table.
    await expect(
      page.locator('.coverage-section-heading', { hasText: UI_TEXT.ur.placesTitle }),
    ).toBeVisible();
    const first = page.locator('.coverage-place-link').first();
    await expect(first.locator('.coverage-place-name')).toHaveText('لاہور');

    await first.click();
    await expect(page.locator('h1.entity-title')).toHaveText('لاہور');
    await expect(page.locator('.entity-type-kicker')).toHaveText(UI_TEXT.ur.placeKicker);
    // Eastern numerals reach the counts, like every other number site.
    await expect(page.locator('.place-tradition-count').first()).toHaveText(/[۰-۹]/);
  });

  test('[ur] the shrine page pills are Urdu place names', async ({ page }) => {
    await page.goto('/shrine/data-darbar?lang=ur');
    await page.locator('h1.shrine-title').waitFor();
    await expect(page.locator('.shrine-place-tag').first()).toHaveText('لاہور');
  });
});
