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

  test('a dark-mode device gets the dark site — until an explicit choice pins it', async ({
    page,
  }) => {
    // No stored choice + system dark → the site follows the device.
    await page.emulateMedia({ colorScheme: 'dark' });
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');

    // The moon/sun button pins an explicit choice that beats the device.
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

test.describe('Saved shrines (ziyarat list)', () => {
  test('a save survives reload and powers the map filter', async ({ page }) => {
    await page.goto('/shrine/data-darbar');

    // Save from the shrine page
    const saveBtn = page.getByRole('button', { name: UI_TEXT.en.saveShrine, exact: true });
    await saveBtn.click();
    await expect(page.getByRole('button', { name: UI_TEXT.en.savedLabel })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // The save is device state, not session state
    await page.reload();
    await expect(page.getByRole('button', { name: UI_TEXT.en.savedLabel })).toHaveAttribute(
      'aria-pressed',
      'true',
    );

    // The map's "Your list" filter narrows to exactly the saved shrine
    await page.goto('/?saved=1');
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    const names = page.locator('.shrine-list-name');
    await expect(names).toHaveCount(1);
    await expect(names.first()).toHaveText('Data Darbar');
  });

  test('the preview card can save a shrine without opening its page', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    await page.getByPlaceholder(UI_TEXT.en.searchPlaceholder).fill('Data Darbar');
    await page
      .locator('.shrine-list-item')
      .filter({ has: page.locator('.shrine-list-name', { hasText: /^Data Darbar$/ }) })
      .click();
    await expect(page.locator('.preview-card')).toBeVisible();

    const saveBtn = page.locator('.preview-save-btn');
    await expect(saveBtn).toHaveAttribute('aria-pressed', 'false');
    await saveBtn.click();
    await expect(saveBtn).toHaveAttribute('aria-pressed', 'true');
    await expect(saveBtn).toContainText(UI_TEXT.en.savedLabel);

    // The same store the shrine page reads: its button now reports saved.
    await page.goto('/shrine/data-darbar');
    await expect(page.getByRole('button', { name: UI_TEXT.en.savedLabel })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
  });

  test('the saved filter chip stays hidden while the list is empty', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    // The chip lives behind "more filters" — expand so absence is meaningful,
    // not just unexpanded. A filter that can only produce zero results is
    // noise, and this pins that it never renders for an empty list.
    await page.locator('.more-filters-toggle').click();
    await expect(page.getByText(UI_TEXT.en.verifiedOnlyFilter)).toBeVisible();
    await expect(page.getByText(UI_TEXT.en.savedFilterLabel)).toHaveCount(0);
  });
});
