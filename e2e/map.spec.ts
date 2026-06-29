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
    await page.getByPlaceholder('Search shrines…').fill('Data Darbar');
    await expect(page.locator('.shrine-list-item')).toHaveCount(1);

    await page.locator('.search-clear').click();

    // Debounce clears (200ms) then all shrines return — wait for >1 item
    await expect(page.locator('.shrine-list-item')).not.toHaveCount(1);
  });
});
