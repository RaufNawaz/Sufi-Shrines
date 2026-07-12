import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';
import { LANGUAGE_STORAGE_KEY, THEME_STORAGE_KEY } from '../src/lib/storageKeys';

test.describe('Preference persistence', () => {
  test.beforeEach(async ({ page }) => {
    // Clear storage so tests start clean
    await page.goto('/');
    await page.evaluate(
      ([themeKey, languageKey]) => {
        localStorage.removeItem(themeKey);
        localStorage.removeItem(languageKey);
      },
      [THEME_STORAGE_KEY, LANGUAGE_STORAGE_KEY],
    );
    await page.reload();
  });

  test('dark mode persists across reload', async ({ page }) => {
    // Starts light
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    // Toggle dark mode in the sidebar header
    await page.getByRole('button', { name: UI_TEXT.en.darkMode }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // Reload: main.tsx reads localStorage before React mounts
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  });

  test('light mode restored after toggling back', async ({ page }) => {
    await page.getByRole('button', { name: UI_TEXT.en.darkMode }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    await page.getByRole('button', { name: UI_TEXT.en.lightMode }).first().click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('Urdu language selection persists across reload', async ({ page }) => {
    // Start in English
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    // Switch to Urdu
    await page.getByRole('button', { name: UI_TEXT.en.switchToUrdu }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    // Persist across reload
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
  });

  test('English language restored after switching back', async ({ page }) => {
    await page.getByRole('button', { name: UI_TEXT.en.switchToUrdu }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    // 'EN' is hardcoded in LanguageToggle.tsx (not a uiStrings entry) — the
    // literal is the rendered copy under test.
    await page.getByRole('button', { name: 'EN' }).first().click();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');

    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('dir', 'ltr');
  });
});
