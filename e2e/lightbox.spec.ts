import { test, expect, waitForSheetData } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * The gallery lightbox, operated by keyboard, in both scripts.
 *
 * Three bugs lived here, all behind one click that no test performed. The
 * accessible-name sweep, the axe sweep and the no-leak guard all scan the page
 * *as loaded*; a modal that only exists after a click is invisible to every one
 * of them — the same blind spot as `UpdateToast`, which only renders after a
 * service-worker event the e2e config disables.
 *
 * 1. **Arrowing past the end destroyed the lightbox in Urdu.** The arrow handler
 *    flipped the *step* for RTL without flipping the *clamp*:
 *    `Math.max(0, i - (isRTL ? -1 : 1))` can exceed the last index, and
 *    `Math.min(len - 1, i + (isRTL ? -1 : 1))` can go below zero. `items[idx]`
 *    became undefined and reading `item.index` in the render threw. Measured:
 *    five ArrowLefts on a two-photo gallery removed the dialog in Urdu and did
 *    nothing in English.
 * 2. **Nothing trapped focus**, under a comment that said "Focus trap". Eight
 *    Tabs escaped to a `.related-card` link behind an `aria-modal="true"`
 *    container — the screen reader is told the page is inert while the keyboard
 *    walks it.
 * 3. **The image `alt` was a hardcoded English string** on the Urdu site.
 *
 * So: exercise it. Open it, walk off both ends, tab past the last control, and
 * check what a screen reader is given — in Urdu as well as English, because two
 * of the three were Urdu-only or Urdu-visible.
 */

const GALLERY_SHRINE = '/shrine/data-darbar';

async function openLightbox(page: Page, lang: 'en' | 'ur') {
  await page.goto(lang === 'ur' ? `${GALLERY_SHRINE}?lang=ur` : GALLERY_SHRINE);
  /* The sheet, not the masthead — the masthead comes from the slim index and
     carries one image where the row has several (see waitForSheetData). */
  await waitForSheetData(page);
  const tiles = page.locator('.gallery-item');
  /* Wait for the gallery itself, then count. `waitForSheetData` returns when the
     infobox has the sheet's fields, and the gallery mounts a commit later —
     traced on the fixture at 0ms/100ms, 0 tiles then 2. Counting on the earlier
     tick reported "the fixture shrine has no gallery tiles to open", which is a
     true statement about a page mid-render and a false one about the fixture.

     The vacuity guard this replaces is kept, not weakened: a fixture shrine with
     exactly one image still fails the assertion below, and one with none fails
     this wait with a clearer message than a zero count. */
  await tiles.first().waitFor({ timeout: 30_000 });
  expect(await tiles.count(), 'the fixture shrine has no gallery tiles to open').toBeGreaterThan(1);
  await tiles.first().click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  return tiles.count();
}

test.describe('the photo strip runs the way the page does', () => {
  /**
   * Measured on `/shrine/data-darbar?lang=ur` before the fix: the grid was
   * pinned `direction: ltr`, so image 1 was the **leftmost** tile — while the
   * lightbox's own arrows were mirrored, putting اگلی تصویر ("next") at x=17 on
   * the far left, and `ShrineGallery` swaps the arrow keys with
   * `step(isRTL ? 1 : -1)` so ArrowLeft advances forward. A reader opened the
   * leftmost picture and found "next" behind them.
   *
   * The override carried a comment that restated the rule without a reason, so
   * this is not a design decision being overridden — it was one half of the
   * component contradicting the other two.
   */
  for (const lang of ['en', 'ur'] as const) {
    test(`[${lang}] the first tile sits on the side the language starts from`, async ({ page }) => {
      await page.goto(lang === 'ur' ? `${GALLERY_SHRINE}?lang=ur` : GALLERY_SHRINE);
      await waitForSheetData(page);
      const tiles = page.locator('.gallery-item');
      await tiles.first().waitFor({ timeout: 30_000 });
      expect(await tiles.count(), 'need two tiles to have an order at all').toBeGreaterThan(1);

      const [first, second] = await page.evaluate(() =>
        [...document.querySelectorAll('.gallery-item')]
          .slice(0, 2)
          .map((el) => Math.round(el.getBoundingClientRect().left)),
      );

      if (lang === 'ur') {
        expect(first, 'in Urdu the first image must be the rightmost tile').toBeGreaterThan(second);
      } else {
        expect(first, 'in English the first image must be the leftmost tile').toBeLessThan(second);
      }
    });
  }
});

for (const lang of ['en', 'ur'] as const) {
  test.describe(`gallery lightbox (${lang})`, () => {
    test('walking off either end leaves it open and in range', async ({ page }) => {
      const total = await openLightbox(page, lang);
      const dialog = page.locator('[role="dialog"]');
      const counter = page.locator('.lightbox-counter span').first();

      for (let i = 0; i < total + 3; i++) await page.keyboard.press('ArrowLeft');
      await expect(dialog, 'the dialog vanished — an out-of-range index threw').toBeVisible();
      const afterLeft = (await counter.textContent())?.trim() ?? '';

      for (let i = 0; i < total + 4; i++) await page.keyboard.press('ArrowRight');
      await expect(dialog).toBeVisible();
      const afterRight = (await counter.textContent())?.trim() ?? '';

      // Both ends must be a real position: "n / total", never "0 /" or "total+1 /".
      for (const shown of [afterLeft, afterRight]) {
        const [first, second] = shown.split('/').map((s) => s.trim());
        expect(second, `counter "${shown}" has no total`).toBeTruthy();
        expect(first, `counter "${shown}" shows an out-of-range position`).not.toBe('0');
      }
      // The two ends must differ, or the arrows are not moving at all.
      expect(afterLeft, 'both ends show the same photo — the arrows do nothing').not.toBe(
        afterRight,
      );
    });

    test('focus cannot leave the dialog', async ({ page }) => {
      await openLightbox(page, lang);
      for (let i = 0; i < 12; i++) await page.keyboard.press('Tab');
      const inside = await page.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        return !!d && !!document.activeElement && d.contains(document.activeElement);
      });
      expect(
        inside,
        'focus left an aria-modal="true" dialog, so the keyboard is in content the screen ' +
          'reader has been told is inert',
      ).toBe(true);
    });

    test('Escape closes it and returns focus to the page', async ({ page }) => {
      await openLightbox(page, lang);
      await page.keyboard.press('Escape');
      await expect(page.locator('[role="dialog"]')).toHaveCount(0);
      const focused = await page.evaluate(() => document.activeElement?.tagName.toLowerCase());
      expect(focused, 'focus was dropped on the body instead of returned').not.toBe('body');
    });

    test('the image alt is in the reader’s language', async ({ page }) => {
      await openLightbox(page, lang);
      const alt = (await page.locator('.lightbox-img').getAttribute('alt')) ?? '';
      expect(alt.trim(), 'the lightbox image has no alt at all').not.toBe('');
      if (lang === 'ur') {
        expect(
          alt,
          `alt "${alt}" contains Latin letters on the Urdu site. If it is a caption from the ` +
            'sheet that is expected; if it is interface copy, add a key to uiStrings.',
        ).toMatch(/[؀-ۿ]/);
      }
    });
  });
}
