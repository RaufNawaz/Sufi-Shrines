import { test, expect, selectMarker } from './fixtures';

/**
 * A site selection is one step of history.
 *
 * Measured by the phone council on 17 October 2026: tap a site, close it, press
 * Back — the site opened again; Back again left an expanded sheet on the
 * welcome card; only a third Back left the map. Every selection change,
 * closing included, pushed an entry. The rule since: the first selection
 * pushes one entry; moving to another site replaces it; closing pops it.
 *
 * And the regression that rule nearly shipped: a site chosen from the search
 * palette lands on the palette's own history entry. Keeping that entry's
 * overlay marker made the palette's close step back — and the step back
 * deselected the site the reader had just chosen.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test('closing a site and pressing Back once leaves the map', async ({ page }) => {
  await page.goto('/about');
  await page.goto('/');
  await selectMarker(page, page.locator('.leaflet-marker-icon').first());
  await expect(page).toHaveURL(/selected=/);

  await page.locator('.sheet-selected-close').click();
  await expect(page).not.toHaveURL(/selected=/);

  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
});

test('Back closes an open site and stays on the map', async ({ page }) => {
  await page.goto('/about');
  await page.goto('/');
  await selectMarker(page, page.locator('.leaflet-marker-icon').first());
  await expect(page).toHaveURL(/selected=/);

  await page.goBack();
  await expect(page).not.toHaveURL(/selected=/);
  await expect(page).not.toHaveURL(/\/about$/);
  await expect(page.locator('.sheet-selected-bar')).toHaveCount(0);
});

test('a site chosen from the search palette stays chosen', async ({ page }) => {
  await page.goto('/');
  await page.locator('#map-search').click();
  await page.locator('.search-input').fill('data darbar');
  await page.locator('.palette-result').first().click();
  await expect(page.locator('.palette')).toHaveCount(0);
  await expect(page).toHaveURL(/selected=data-darbar/);
  // Long enough for the palette's own history step to have run.
  await page.waitForTimeout(500);
  await expect(page).toHaveURL(/selected=data-darbar/);
  await expect(page.locator('.sheet-selected-name')).toContainText('Data Darbar');
});

test('Back folds a raised sheet before it leaves the map', async ({ page }) => {
  await page.goto('/about');
  await page.goto('/');
  const sheet = page.locator('.sidebar');
  const peekTop = (await sheet.boundingBox())!.y;
  await page.locator('.sidebar-sheet-handle').click();
  await expect.poll(async () => (await sheet.boundingBox())!.y).toBeLessThan(peekTop - 100);

  await page.goBack();
  await expect(page).not.toHaveURL(/\/about$/);
  await expect.poll(async () => (await sheet.boundingBox())!.y).toBeGreaterThan(peekTop - 5);

  await page.goBack();
  await expect(page).toHaveURL(/\/about$/);
});
