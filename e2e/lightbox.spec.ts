import { test, expect } from './fixtures';
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
  await page.locator('h1.shrine-title').waitFor();
  const tiles = page.locator('.gallery-item');
  // Asserting the fixture actually has a gallery: without this the whole file
  // would pass vacuously the day the fixture changes.
  expect(await tiles.count(), 'the fixture shrine has no gallery tiles to open').toBeGreaterThan(1);
  await tiles.first().click();
  await expect(page.locator('[role="dialog"]')).toBeVisible();
  return tiles.count();
}

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
