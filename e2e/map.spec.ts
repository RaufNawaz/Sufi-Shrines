import { test, expect } from '@playwright/test';

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
    await page.getByRole('button', { name: 'Table of Shrines' }).click();
    await expect(page.locator('.shrine-list-panel')).toBeVisible();

    // Type a known shrine name
    await page.getByPlaceholder('Search shrines…').fill('Data Darbar');

    // First result should match
    const firstItem = page.locator('.shrine-list-item').first();
    await expect(firstItem).toBeVisible();
    await firstItem.click();

    // Preview card appears with matching title
    await expect(page.locator('.preview-card')).toBeVisible();
    await expect(page.locator('.preview-title')).toContainText('Data Darbar');
  });

  test('"View full details" navigates to the shrine page', async ({ page }) => {
    await page.getByRole('button', { name: 'Table of Shrines' }).click();
    await page.locator('.shrine-list-item').first().click();

    await page.locator('.preview-view-link').click();

    await expect(page).toHaveURL(/\/shrine\//);
    await expect(page.locator('h1.shrine-title')).toBeVisible();
  });

  test('clear search button removes filter', async ({ page }) => {
    await page.getByRole('button', { name: 'Table of Shrines' }).click();
    // The list renders progressively, so wait for it to settle on the full
    // (large) directory before using its count as a baseline.
    const list = page.locator('.shrine-list-item');
    await expect(async () => {
      const n = await list.count();
      expect(n).toBeGreaterThan(50);
    }).toPass();
    const fullCount = await list.count();

    // "Data Darbar" also appears in another shrine's Location text (Peer
    // Makki, "near Data Darbar"), so don't assume an exact match count —
    // just assert the search narrows the list before checking clear restores it.
    await page.getByPlaceholder('Search shrines…').fill('Data Darbar');
    await expect(list).not.toHaveCount(fullCount);
    const filteredCount = await list.count();
    expect(filteredCount).toBeGreaterThan(0);
    expect(filteredCount).toBeLessThan(fullCount);

    await page.locator('.search-clear').click();

    // Debounce clears (200ms) then all shrines return.
    await expect(list).toHaveCount(fullCount);
  });
});
