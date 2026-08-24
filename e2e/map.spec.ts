import {
  test,
  expect,
  SHRINE_COUNT,
  MAPPED_SHRINE_COUNT,
  setTraditionalDirectory,
} from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

test.describe('Map page', () => {
  test.beforeEach(async ({ page }) => {
    // These tests are about the shrine table itself — the row count, the
    // preview it opens, the search that filters it — so they ask for it
    // rather than relying on it being what the button happens to open.
    await setTraditionalDirectory(page);
    await page.goto('/');
  });

  test('loads with sidebar and map', async ({ page }) => {
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
  });

  /**
   * Marker count vs row count — the check CLAUDE.md RULE 4 names as one that
   * has actually worked, and which this suite did not have.
   *
   * Every assertion here counted `.shrine-list-item`, so the suite could not
   * distinguish a map drawing all 168 markers from one drawing none. On
   * 22 Aug an `if (!shrine.latLng) return` landed inside ShrineMarkers'
   * `for...of` where `continue` was meant; it abandoned the effect before
   * `map.addLayer(group)`, and production shipped a basemap with zero
   * markers while the sidebar list showed all 171 shrines. The suite stayed
   * green.
   *
   * The two counts must differ for this to mean anything — hence the
   * deliberately unmapped fixture row.
   */
  test('draws exactly one marker per shrine that has coordinates', async ({ page }) => {
    await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
      timeout: 15000,
    });

    // The unmapped row is still a shrine everywhere that isn't the map.
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    await expect(page.locator('.shrine-list-item')).toHaveCount(SHRINE_COUNT, { timeout: 15000 });
  });

  test('search filters list and shows preview card', async ({ page }) => {
    // Open the list view
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    await expect(page.locator('.shrine-list-panel')).toBeVisible();

    // Type a known shrine name
    await page.getByPlaceholder(UI_TEXT.en.searchPlaceholder).fill('Data Darbar');

    // The searched shrine is among the results — target it by its list-entry
    // name (the list is grouped/alphabetical, not score-ordered, so another
    // "…Darbar" match can sort above it; Peer Makki's location text also
    // contains "Data Darbar", hence the exact name match).
    const match = page
      .locator('.shrine-list-item')
      .filter({ has: page.locator('.shrine-list-name', { hasText: /^Data Darbar$/ }) });
    await expect(match).toBeVisible();
    await match.click();

    // Preview card appears with matching title
    await expect(page.locator('.preview-card')).toBeVisible();
    await expect(page.locator('.preview-title')).toContainText('Data Darbar');
  });

  test('"View full details" navigates to the shrine page', async ({ page }) => {
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    await page.locator('.shrine-list-item').first().click();

    await page.locator('.preview-view-link').click();

    await expect(page).toHaveURL(/\/shrine\//);
    await expect(page.locator('h1.shrine-title')).toBeVisible();
  });

  test('clear search button removes filter', async ({ page }) => {
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    // The list renders progressively; with the deterministic CSV fixture it
    // settles on exactly one item per fixture row.
    //
    // The generous timeout is the point: 169 rows arrive in batches, and under
    // a parallel run on a loaded machine that regularly took longer than the
    // 5s default. This failed in roughly half of full-suite runs while passing
    // every time in isolation — a flake, not a product bug, but one that
    // reddens CI at random.
    const list = page.locator('.shrine-list-item');
    const settled = { timeout: 20_000 };
    await expect(list).toHaveCount(SHRINE_COUNT, settled);

    // "Data Darbar" also matches another shrine's Location text (Peer Makki,
    // "near Data Darbar"), so don't pin the exact match count — assert the
    // search narrows the list before checking that clear restores it.
    await page.getByPlaceholder(UI_TEXT.en.searchPlaceholder).fill('Data Darbar');
    await expect(list).not.toHaveCount(SHRINE_COUNT, settled);
    const filteredCount = await list.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(SHRINE_COUNT);

    await page.locator('.search-clear').click();

    // Debounce clears (200ms) then all shrines return.
    await expect(list).toHaveCount(SHRINE_COUNT, settled);
  });
});

test.describe('Basemap layers control', () => {
  test('has a drawn icon and sits clear of the mobile bottom sheet', async ({ page }) => {
    // Production shipped this control as a blank white square sitting on the
    // bottom sheet's brand row (real-phone screenshot, 22 Aug 2026): the CSS
    // removes the vendor sprite, so the glyph must come from our ::after mask.
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    const toggle = page.locator('.leaflet-control-layers-toggle');
    await expect(toggle).toBeVisible();

    const mask = await toggle.evaluate((el) => {
      const s = getComputedStyle(el, '::after');
      return s.maskImage || s.webkitMaskImage || '';
    });
    expect(mask, 'the toggle must draw a glyph — a blank square is not a control').toContain('svg');

    // topright: above the sheet, right half of the screen.
    const control = (await page.locator('.leaflet-control-layers').boundingBox())!;
    const sheet = (await page.locator('#sidebar').boundingBox())!;
    expect(control.y + control.height, 'must not overlap the bottom sheet').toBeLessThan(sheet.y);
    expect(control.x, 'lives in the top-right corner').toBeGreaterThan(390 / 2);
    expect(control.y).toBeLessThan(100);
  });
});
