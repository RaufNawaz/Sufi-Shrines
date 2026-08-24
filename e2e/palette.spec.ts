import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';

/**
 * The command palette is the archive's search now, so the journey through it is
 * the journey through the archive.
 *
 * Written because the palette shipped with no e2e coverage of its own while
 * being the only way to reach search and filters — the exact shape of gap that
 * let a hardcoded English `aria-label` sit on the mobile sheet handle for
 * months (nothing scanned mobile-only UI). Every case here is a thing a reader
 * does, not an internal detail: open it three ways, type, drive it from the
 * keyboard, filter, dismiss, and do all of it in Urdu.
 */

async function openViaTrigger(page: Page, urdu = false) {
  await page.goto(urdu ? '/?lang=ur' : '/');
  await page.locator('#sidebar').waitFor();
  await page.locator('.list-toggle-btn').click();
  await expect(page.locator('.palette')).toBeVisible();
}

test.describe('command palette', () => {
  test('opens from the sidebar trigger, and closes on Escape', async ({ page }) => {
    await openViaTrigger(page);
    await expect(page.locator('.search-input')).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.locator('.palette')).toHaveCount(0);
  });

  test('opens on the / key', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await page.keyboard.press('/');
    await expect(page.locator('.palette')).toBeVisible();
  });

  test('opens on Ctrl+K from anywhere on the page', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await page.keyboard.press('Control+k');
    await expect(page.locator('.palette')).toBeVisible();
  });

  test('narrows as you type, and says how much of the archive is left', async ({ page }) => {
    await openViaTrigger(page);
    const before = await page.locator('.palette-status').textContent();
    await page.locator('.search-input').fill('lahore');
    await expect
      .poll(async () => page.locator('.palette-result').count(), { timeout: 8000 })
      .toBeGreaterThan(0);
    // "N of 169 sites" — the denominator is the point: a bare count hides how
    // much a query excluded.
    await expect(page.locator('.palette-status')).not.toHaveText(before ?? '');
    await expect(page.locator('.palette-status')).toContainText('169');
  });

  test('the keyboard drives it: down moves, Enter opens the shrine', async ({ page }) => {
    await openViaTrigger(page);
    await page.locator('.search-input').fill('data darbar');
    await expect(page.locator('.palette-result').first()).toBeVisible();

    // The first row is active without any key press, so Enter always has a
    // target.
    await expect(page.locator('.palette-result').first()).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowDown');
    await expect(page.locator('.palette-result').nth(1)).toHaveAttribute('aria-selected', 'true');
    await page.keyboard.press('ArrowUp');
    await expect(page.locator('.palette-result').first()).toHaveAttribute('aria-selected', 'true');

    await page.keyboard.press('Enter');
    // Selecting a result closes the overlay and selects the shrine on the map.
    await expect(page.locator('.palette')).toHaveCount(0);
    await expect(page.locator('.preview-card')).toBeVisible();
  });

  test('clicking a result opens it too', async ({ page }) => {
    await openViaTrigger(page);
    await page.locator('.search-input').fill('data darbar');
    await page.locator('.palette-result').first().click();
    await expect(page.locator('.palette')).toHaveCount(0);
    await expect(page.locator('.preview-card')).toBeVisible();
  });

  test('the filters button reveals the chips, and filtering changes the results', async ({
    page,
  }) => {
    await openViaTrigger(page);
    // Collapsed by default: the field is the first thing, not a wall of chips.
    await expect(page.locator('.palette-filters')).toHaveCount(0);

    await page.locator('.palette-filters-btn').click();
    await expect(page.locator('.palette-filters')).toBeVisible();

    const all = await page.locator('.palette-status').textContent();
    // Scoped to `.palette`: the sidebar renders the same ShrineFilters inline
    // (one component, two homes), so an unscoped chip locator matches twice.
    await page
      .locator('.palette [aria-label="Filter by category"] .filter-chip', {
        hasText: 'Sikh Gurdwara',
      })
      .click();
    await expect(page.locator('.palette-status')).not.toHaveText(all ?? '');
    // The count badge on the button reports what is on, so a reader who closes
    // the drawer still knows.
    await expect(page.locator('.palette-filters-count')).toHaveText('1');
  });

  test('focus goes back to whatever opened it', async ({ page }) => {
    await openViaTrigger(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.list-toggle-btn')).toBeFocused();
  });

  test('a click on the backdrop dismisses it; a click inside does not', async ({ page }) => {
    await openViaTrigger(page);
    await page.locator('.palette-search').click();
    await expect(page.locator('.palette')).toBeVisible();

    // Top-left corner of the backdrop, clear of the panel.
    await page.mouse.click(8, 8);
    await expect(page.locator('.palette')).toHaveCount(0);
  });

  test('[ur] is Urdu throughout, including the hints and the counts', async ({ page }) => {
    await openViaTrigger(page, true);
    await expect(page.locator('.palette-input')).toHaveAttribute(
      'placeholder',
      UI_TEXT.ur.searchPlaceholder,
    );
    await expect(page.locator('.palette-filters-label')).toHaveText(UI_TEXT.ur.filtersLabel);
    // Eastern numerals reach the status line like every other number site.
    await expect(page.locator('.palette-status')).toHaveText(/[۰-۹]/);
    await expect(page.locator('.palette-hint').first()).toContainText(UI_TEXT.ur.paletteHintMove);
    // …and the panel is RTL, not an LTR panel with Urdu text in it.
    await expect(page.locator('.palette')).toHaveAttribute('dir', 'rtl');
  });

  test('[ur] an Urdu query finds an Urdu name', async ({ page }) => {
    await openViaTrigger(page, true);
    await page.locator('.search-input').fill('داتا');
    await expect(page.locator('.palette-result-name').first()).toContainText('داتا');
  });
});
