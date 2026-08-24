import { test, expect, setTraditionalDirectory } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';
/* The Urdu table is a lazily-loaded chunk in the app, so `UI_TEXT.ur` is
   `UiStrings | undefined` there. A spec asserting the Urdu view's copy wants the
   table itself; a static import in e2e does not reach the bundle. */
import { UI_TEXT_UR } from '../src/lib/i18n/uiStrings.ur';
import { LANGUAGE_STORAGE_KEY } from '../src/lib/storageKeys';

/**
 * ?lang=ur end-to-end journey per URDU_IMPLEMENTATION_PLAN.md §9:
 * switch language, open the list, open a shrine, start a tour — asserting
 * Nastaliq is applied, chips are Urdu, numerals are Eastern, and dir=rtl.
 *
 * Shrine data comes from the deterministic CSV fixture (see fixtures.ts);
 * every value still routes through the same Urdu dictionary/translateToUrdu
 * path as production — nothing here depends on a specific shrine's
 * hand-translated description.
 */
test.describe('Urdu (?lang=ur) journey', () => {
  test.beforeEach(async ({ page }) => {
    await setTraditionalDirectory(page);
    await page.goto('/');
    await page.evaluate((key) => localStorage.removeItem(key), LANGUAGE_STORAGE_KEY);
  });

  test('switching to Urdu sets dir=rtl and renders controls in Nastaliq', async ({ page }) => {
    await page.getByRole('button', { name: UI_TEXT.en.switchToUrdu }).first().click();

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
    // 'سب' is deliberately literal: the test's point is the exact rendered
    // Urdu copy of the "All" chip. No chip may contain a Latin letter (the
    // categories are Muslim Shrine / Hindu Temple / Sikh Gurdwara, all of
    // which the seed dictionary covers with zero Latin leakage).
    expect(chipTexts[0]).toBe('سب');
    for (const text of chipTexts) {
      expect(text, `chip "${text}" should not contain Latin letters`).not.toMatch(/[A-Za-z]/);
    }
  });

  test('searching in Urdu script finds a shrine by its displayed Urdu name', async ({ page }) => {
    // Guards the 21 Aug 2026 parity fix (searchDocs.ts): the worker index
    // must carry the same dictionary Urdu names the list renders. Before the
    // fix, urduName came from a sheet column that doesn't exist, and this
    // exact query returned nothing.
    await page.goto('/?lang=ur');
    await page.locator('.list-toggle-btn').click();
    await expect(page.locator('.shrine-list-panel')).toBeVisible();

    await page.getByPlaceholder(UI_TEXT_UR.searchPlaceholder).fill('داتا دربار');

    // The seed dictionary renders Data Darbar as داتا دربار; the list shows
    // localized names in ?lang=ur, so the match must surface under that name.
    const match = page
      .locator('.shrine-list-item')
      .filter({ has: page.locator('.shrine-list-name', { hasText: 'داتا دربار' }) });
    await expect(match.first()).toBeVisible();
  });

  test('the State of the Archive reads fully in Urdu', async ({ page }) => {
    await page.goto('/report?lang=ur');
    const title = page.locator('h1.entity-title');
    await expect(title).toHaveText('آرکائیو کا حال');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // The corrections ledger is bilingual data — its Urdu side must carry no
    // Latin (dates are Western digits by the numerals rule, not letters).
    const ledger = page.locator('.report-ledger-text').first();
    await expect(ledger).toBeVisible();
    expect(await ledger.textContent()).not.toMatch(/[A-Za-z]/);
  });

  test('the typology atlas reads in Urdu, prose forms sanctioned via bdi', async ({ page }) => {
    await page.goto('/typology?lang=ur');
    await expect(page.locator('h1.entity-title')).toHaveText('تعمیری صورتوں کا اٹلس');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');
    // Group headings are vocabulary labels + Eastern-numeral counts — no
    // Latin anywhere. The survey-prose groups are the sanctioned exception,
    // and only inside <bdi lang="en">.
    for (const heading of await page.locator('.typology-group-heading').allTextContents()) {
      expect(heading, `heading "${heading}" must carry no Latin`).not.toMatch(/[A-Za-z]/);
    }
    await expect(page.locator('.typology-group-prose bdi[lang="en"]')).toHaveCount(2);
  });

  test('the infobox names each tradition honestly: دیوتا for a deity, سلسلہ translated', async ({
    page,
  }) => {
    // A Hindu temple's figure row must be labeled "Deity" (دیوتا), never
    // the Muslim-specific ولی.
    await page.goto('/shrine/katas-raj-temples?lang=ur');
    const infobox = page.locator('.shrine-infobox');
    await expect(infobox).toBeVisible();
    await expect(infobox.locator('.infobox-label', { hasText: 'دیوتا' })).toBeVisible();
    await expect(infobox.locator('.infobox-label', { hasText: 'ولی' })).toHaveCount(0);

    // A Suhrawardi shrine shows its order, in Urdu, from the data dictionary.
    await page.goto('/shrine/shrine-of-abul-faiz-qalander-ali-suharwardi?lang=ur');
    const row = page.locator('.infobox-row', { hasText: 'سلسلہ' });
    await expect(row).toBeVisible();
    await expect(row).toContainText('سہروردی');
    expect(await row.textContent()).not.toMatch(/[A-Za-z]/);
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
    await page.getByRole('switch', { name: UI_TEXT_UR.turnOnTours }).click();

    const firstCard = page.locator('.tour-card').first();
    await expect(firstCard).toBeVisible();
    await firstCard.click();

    await expect(page.getByRole('button', { name: UI_TEXT_UR.tourStartButton })).toBeVisible();
    await page.getByRole('button', { name: UI_TEXT_UR.tourStartButton }).click();

    const stepBadge = page.locator('.tour-step-badge');
    await expect(stepBadge).toBeVisible();
    const badgeText = await stepBadge.textContent();
    // e.g. "۱ / ۸" — Eastern digits by default, no Latin/Western digits.
    expect(badgeText).toMatch(/[۰-۹]/);
    expect(badgeText).not.toMatch(/[0-9]/);
  });

  test('the ۱۲۳/123 numerals toggle switches a tour stop badge between digit systems', async ({
    page,
  }) => {
    await page.goto('/?lang=ur');
    await page.getByRole('switch', { name: UI_TEXT_UR.turnOnTours }).click();
    await page.locator('.tour-card').first().click();
    await page.getByRole('button', { name: UI_TEXT_UR.tourStartButton }).click();

    const stepBadge = page.locator('.tour-step-badge');
    await expect(stepBadge).toContainText(/[۰-۹]/);

    await page.locator('.numerals-toggle').click();
    await expect(stepBadge).toContainText(/[0-9]/);
    await expect(stepBadge).not.toContainText(/[۰-۹]/);
  });
});
