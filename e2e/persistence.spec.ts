import { test, expect } from '@playwright/test';

test.describe('Preference persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage so tests start clean
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('shrines_theme');
      localStorage.removeItem('shrines_language');
    });
    await page.reload();
  });

  test('dark mode persists across reload', async ({ page }) => {
    // Starts light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Toggle dark mode in the sidebar header
    await page.getByRole('button', { name: 'Dark mode' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload: main.tsx reads localStorage before React mounts
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('light mode restored after toggling back', async ({ page }) => {
    await page.getByRole('button', { name: 'Dark mode' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: 'Light mode' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('Urdu language selection persists across reload', async ({ page }) => {
    // Start in English
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Switch to Urdu
    await page.getByRole('button', { name: 'اردو' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    // Persist across reload
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('English language restored after switching back', async ({ page }) => {
    await page.getByRole('button', { name: 'اردو' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    await page.getByRole('button', { name: 'EN' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
