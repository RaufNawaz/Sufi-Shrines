import { test, expect } from '@playwright/test';

/**
 * ?lang=ur end-to-end journey per URDU_IMPLEMENTATION_PLAN.md §9:
 * switch language, open the list, open a shrine, start a tour — asserting
 * Nastaliq is applied, chips are Urdu, numerals are Eastern, and dir=rtl.
 *
 * Assertions are written against mechanisms that hold regardless of
 * whether the browser's live Google Sheets fetch or the bundled fallback
 * snapshot supplies shrine data (both route every value through the same
 * Urdu dictionary/translateToUrdu path) — nothing here depends on a
 * specific shrine's hand-translated description.
 */
test.describe('Urdu (?lang=ur) journey', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('shrines_language'));
  });

  test('switching to Urdu sets dir=rtl and renders controls in Nastaliq', async ({ page }) => {
    await page.getByRole('button', { name: 'اردو' }).first().click();

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    await expect(page.locator('html')).toHaveAttribute('lang', 'ur');

    const searchToggle = page.locator('.list-toggle-btn');
    const fontFamily = await searchToggle.evaluate((el) => getComputedStyle(el).fontFamily);
    expect(fontFamily).toMatch(/Nastaliq/i);
  });

  test('category filter chips render in Urdu, not English', async ({ page }) => {
    await page.goto('/?lang=ur');
    await page.locator('.list-toggle-btn').click();

    const chips = page.locator('.filter-chips').first().locator('.filter-chip');
    await expect(chips.first()).toBeVisible();

    const chipTexts = await chips.allTextContents();
    // "All" must read "سب"; no chip should contain a Latin letter (the
    // categories are Muslim Shrine / Hindu Temple / Sikh Gurdwara, all of
    // which the seed dictionary covers with zero Latin leakage).
    expect(chipTexts[0]).toBe('سب');
    for (const text of chipTexts) {
      expect(text, `chip "${text}" should not contain Latin letters`).not.toMatch(/[A-Za-z]/);
    }
  });

  test('opening a shrine page renders its name in Urdu script', async ({ page }) => {
    await page.goto('/shrine/data-darbar?lang=ur');

    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    const title = page.locator('h1.shrine-title');
    await expect(title).toBeVisible();
    const text = await title.textContent();
    expect(text, 'shrine title should be in Arabic-script Urdu').toMatch(/[؀-ۿ]/);
    expect(text, 'shrine title should not contain Latin letters').not.toMatch(/[A-Za-z]/);
  });

  test('starting a tour shows Urdu chrome with Eastern-numeral stop counts', async ({ page }) => {
    await page.goto('/?lang=ur');
    await page.getByRole('switch', { name: /رہنما دورے/ }).click();

    const firstCard = page.locator('.tour-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.getByRole('button', { name: 'دورہ شروع کریں' })).toBeVisible();
    await page.getByRole('button', { name: 'دورہ شروع کریں' }).click();

    const stepBadge = page.locator('.tour-step-badge');
    await expect(stepBadge).toBeVisible();
    const badgeText = await stepBadge.textContent();
    // e.g. "۱ / ۸" — Eastern digits by default, no Latin/Western digits.
    expect(badgeText).toMatch(/[۰-۹]/);
    expect(badgeText).not.toMatch(/[0-9]/);
  });

  test('the ۱۲۳/123 numerals toggle switches a tour stop badge between digit systems', async ({ page }) => {
    await page.goto('/?lang=ur');
    await page.getByRole('switch', { name: /رہنما دورے/ }).click();
    await page.locator('.tour-card').first().click();
    await page.getByRole('button', { name: 'دورہ شروع کریں' }).click();

    const stepBadge = page.locator('.tour-step-badge');
    await expect(stepBadge).toContainText(/[۰-۹]/);

    await page.locator('.numerals-toggle').click();
    await expect(stepBadge).toContainText(/[0-9]/);
    await expect(stepBadge).not.toContainText(/[۰-۹]/);
  });
});
