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

  test('the saved list prints as a ziyarat pack — and only the pack', async ({ page }) => {
    // Save a shrine, then filter to the list.
    await page.goto('/shrine/data-darbar');
    await page.getByRole('button', { name: UI_TEXT.en.saveShrine, exact: true }).click();
    await page.goto('/?saved=1');
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    // The saved section lives behind "more filters".
    await page.locator('.more-filters-toggle').click();

    // On screen: a print action beside the filter chip; the pack itself hidden.
    await expect(page.getByRole('button', { name: UI_TEXT.en.ziyaratPackPrint })).toBeVisible();
    await expect(page.locator('.ziyarat-print-pack')).toBeHidden();

    // On paper: the pack is the page — name, coordinates — and the map is not.
    await page.emulateMedia({ media: 'print' });
    const pack = page.locator('.ziyarat-print-pack');
    await expect(pack).toBeVisible();
    await expect(pack).toContainText('Data Darbar');
    await expect(pack.locator('.ziyarat-print-coords').first()).toContainText('31.');
  });

  test('a shared ?list= link narrows the list and imports only on consent', async ({ page }) => {
    // Arriving on a shared link: banner up, list narrowed, nothing saved yet.
    await page.goto('/?list=data-darbar,shrine-of-shah-jamal');
    await page.getByRole('button', { name: UI_TEXT.en.tableButton }).click();
    await expect(page.locator('.shared-list-banner')).toBeVisible();
    await expect(page.locator('.shrine-list-name')).toHaveCount(2);
    expect(
      await page.evaluate(() => localStorage.getItem('shrines_saved')),
      'receiving a shared list must write nothing by itself',
    ).toBeNull();

    // Adding imports the slugs, clears the one-shot param, keeps the view.
    await page.getByRole('button', { name: UI_TEXT.en.sharedListAdd }).click();
    await expect(page.locator('.shared-list-banner')).toBeHidden();
    expect(new URL(page.url()).searchParams.get('list')).toBeNull();
    const saved = await page.evaluate(() =>
      JSON.parse(localStorage.getItem('shrines_saved') ?? '[]'),
    );
    expect([...saved].sort()).toEqual(['data-darbar', 'shrine-of-shah-jamal']);
    await expect(page.locator('.shrine-list-name')).toHaveCount(2);
  });

  test('dismissing a shared list leaves the device untouched', async ({ page }) => {
    await page.goto('/?list=data-darbar');
    await expect(page.locator('.shared-list-banner')).toBeVisible();
    await page.getByRole('button', { name: UI_TEXT.en.sharedListDismiss }).click();
    await expect(page.locator('.shared-list-banner')).toBeHidden();
    expect(await page.evaluate(() => localStorage.getItem('shrines_saved'))).toBeNull();
    expect(new URL(page.url()).searchParams.get('list')).toBeNull();
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
