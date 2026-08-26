import { test, expect, setTraditionalDirectory } from './fixtures';
import type { Locator } from '@playwright/test';

/**
 * Regression guard for the Delegated Execution Plan A2 audit: a handful of
 * components carried Latin-tuned letter-spacing/uppercase/italic on text
 * that's actually translated in the Urdu view — none of them are h1-h4/p/
 * li/dd/dt, so global.css's [dir='rtl'] heading remap never reached them.
 * Nastaliq has no italic form (synthetic oblique breaks the connected
 * script) and non-zero tracking breaks connected letterforms, so each of
 * these must compute to font-style: normal / letter-spacing: normal.
 */
test.describe('Nastaliq metrics (?lang=ur)', () => {
  test.beforeEach(async ({ page }) => setTraditionalDirectory(page));

  async function letterSpacing(locator: Locator) {
    return locator.evaluate((el) => getComputedStyle(el).letterSpacing);
  }
  async function fontStyle(locator: Locator) {
    return locator.evaluate((el) => getComputedStyle(el).fontStyle);
  }

  test('shrine page: category kicker and infobox badge have no letter-spacing', async ({
    page,
  }) => {
    await page.goto('/shrine/data-darbar?lang=ur');
    await expect(page.locator('html')).toHaveAttribute('dir', 'rtl');

    const kicker = page.locator('.shrine-category-kicker');
    await expect(kicker).toBeVisible();
    expect(await letterSpacing(kicker)).toBe('normal');

    const badge = page.locator('.infobox-category-badge');
    if (await badge.count()) {
      expect(await letterSpacing(badge)).toBe('normal');
    }

    const note = page.locator('.infobox-note').first();
    if (await note.count()) {
      expect(await fontStyle(note)).toBe('normal');
    }
  });

  test('map sidebar: filter-section labels and group headings have no letter-spacing', async ({
    page,
  }) => {
    await page.goto('/?lang=ur');
    await page.locator('.list-toggle-btn').click();

    // Provenance section is always rendered once "more filters" is expanded
    // (unlike region, which depends on the fixture having >1 value).
    await page.locator('.more-filters-toggle').click();
    const label = page.locator('.filter-section-label').first();
    await expect(label).toBeVisible();
    expect(await letterSpacing(label)).toBe('normal');

    const groupHeading = page.locator('.shrine-list-group-heading').first();
    if (await groupHeading.count()) {
      expect(await letterSpacing(groupHeading)).toBe('normal');
    }
  });

  test('saint page: entity-type kicker has no letter-spacing', async ({ page }) => {
    await page.goto('/graph?lang=ur');
    const firstSaintLink = page.locator('.graph-saints-list a').first();
    await expect(firstSaintLink).toBeVisible();
    await firstSaintLink.click();

    const kicker = page.locator('.entity-type-kicker');
    await expect(kicker).toBeVisible();
    expect(await letterSpacing(kicker)).toBe('normal');
  });
});
