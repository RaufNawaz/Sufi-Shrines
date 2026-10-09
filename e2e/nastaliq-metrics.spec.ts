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

    /* Attached, not visible. The kicker is `display: none` in the Urdu view
       from 14 September 2026 — with Nastaliq stripping the small caps and the
       tracking that make it a distinct object in English, it printed the same
       words as the breadcrumb crumb thirty pixels above it, and Rauf ruled the
       trail survives (shrine.css). It is still measured: the declaration has
       to stay correct for the day someone shows it again, and a rule that is
       only wrong when it becomes visible is the worst kind. */
    const kicker = page.locator('.shrine-category-kicker');
    await expect(kicker).toBeAttached();
    expect(await letterSpacing(kicker)).toBe('normal');

    /* And a *painted* element carrying the same risk, so this test keeps
       measuring something a reader can see. `.infobox-title` is the closest
       equivalent: uppercase and `--tracking-wide` in its base rule, neither of
       which an h1-h4 remap would ever have reached. */
    const infoboxTitle = page.locator('.infobox-title').first();
    await expect(infoboxTitle).toBeVisible();
    expect(await letterSpacing(infoboxTitle)).toBe('normal');

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
    // "Figures in this archive" is team-only since 9 October 2026; the lineage
    // tree is public, and every disciple chip in it links to a saint page.
    const firstSaintLink = page.locator('.graph-lineage-disciple a').first();
    await expect(firstSaintLink).toBeVisible();
    await firstSaintLink.click();

    const kicker = page.locator('.entity-type-kicker');
    await expect(kicker).toBeVisible();
    expect(await letterSpacing(kicker)).toBe('normal');
  });
});
