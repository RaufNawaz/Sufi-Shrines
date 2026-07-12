import { test, expect, SHRINE_COUNT } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

test.describe('Map page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('loads with sidebar and map', async ({ page }) => {
    await expect(page.locator('#sidebar')).toBeVisible();
    await expect(page.locator('.leaflet-container')).toBeVisible();
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
    const list = page.locator('.shrine-list-item');
    await expect(list).toHaveCount(SHRINE_COUNT);

    // "Data Darbar" also matches another shrine's Location text (Peer Makki,
    // "near Data Darbar"), so don't pin the exact match count — assert the
    // search narrows the list before checking that clear restores it.
    await page.getByPlaceholder(UI_TEXT.en.searchPlaceholder).fill('Data Darbar');
    await expect(list).not.toHaveCount(SHRINE_COUNT);
    const filteredCount = await list.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(SHRINE_COUNT);

    await page.locator('.search-clear').click();

    // Debounce clears (200ms) then all shrines return.
    await expect(list).toHaveCount(SHRINE_COUNT);
  });
});
