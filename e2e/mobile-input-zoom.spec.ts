import { test, expect } from './fixtures';
import { TEXT_SIZES } from '../src/lib/textSizePreference';
import { TEXT_SIZE_STORAGE_KEY } from '../src/lib/storageKeys';

/**
 * No text field may fall under 16px, at any reading size.
 *
 * iOS Safari zooms the viewport when a focused text input computes to less than
 * 16px, and **does not zoom back out when the field blurs**. On the map — this
 * archive's front door, and the route most of its readers arrive on — that
 * leaves someone stranded at a magnification they never chose, with the sidebar
 * half off-screen. It is the single most disorienting thing a mobile web page
 * can do by accident.
 *
 * This is a regression test for a defect that existed for a day and was
 * invisible from a desktop browser. Both fields were written with the rule in
 * mind: `.search-input` even carried the comment "16px — prevents iOS
 * auto-zoom". They stopped clearing it on 28 August 2026, when the reading-size
 * slider was widened — correctly — to scale the whole document. `--text-base`
 * at the `xsmall` step is 1rem × 0.875 = 14px, and `--text-lg`, the palette's,
 * is 15.75px. A quarter of a pixel under, which Safari treats as under.
 *
 * **Every step, not the default.** The default was never the broken one, so any
 * check that only loaded the page as shipped would have passed. The failure
 * lived in the combination of two settings, which is why this loops the whole
 * `TEXT_SIZES` set rather than sampling it — the same reason the tradition spec
 * reads its slugs from the data file.
 */
const PHONE = { width: 390, height: 844 };
/** Safari's threshold. At exactly 16 it does not zoom; under it, it does. */
const MIN_INPUT_PX = 16;

test.use({ viewport: PHONE });

for (const size of TEXT_SIZES) {
  test(`no text field is under 16px at reading size "${size}"`, async ({ page }) => {
    await page.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* private mode — the default applies, which is still worth testing */
        }
      },
      [TEXT_SIZE_STORAGE_KEY, size] as const,
    );

    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();

    // The phone's way into search: the directory button opens the palette.
    await page.locator('.list-toggle-btn').click();
    await expect(page.locator('.palette-input')).toBeVisible();

    const undersized = await page.evaluate((min) => {
      const TYPES_THAT_ZOOM = ['text', 'search', 'email', 'url', 'tel', 'number', 'password'];
      return [...document.querySelectorAll('input, textarea')]
        .filter((el) => {
          if (el instanceof HTMLTextAreaElement) return true;
          const input = el as HTMLInputElement;
          // Radios, checkboxes and ranges never trigger the zoom; Leaflet's
          // layer switcher ships several at 13px and they are not a defect.
          return TYPES_THAT_ZOOM.includes(input.type || 'text');
        })
        .filter((el) => {
          const r = el.getBoundingClientRect();
          return r.width > 0 && r.height > 0;
        })
        .map((el) => ({
          cls: (el.className || '').toString().split(' ')[0] || el.tagName.toLowerCase(),
          px: parseFloat(getComputedStyle(el).fontSize),
        }))
        .filter((f) => f.px < min)
        .map((f) => `${f.cls} ${f.px}px`);
    }, MIN_INPUT_PX);

    expect(
      undersized,
      'iOS Safari zooms the viewport on focus below 16px and does not zoom back. ' +
        'Use `font-size: max(16px, var(--text-…))` so the field still grows with the ' +
        "reader's chosen size without falling through the platform floor.",
    ).toEqual([]);
  });
}

test('the field still grows with the reading size above the floor', async ({ page }) => {
  /* The floor must not become a ceiling: `max()` was chosen over a hardcoded
     16px precisely so a reader who asks for larger type gets a larger field. */
  const sizeAt = async (step: string) => {
    await page.addInitScript(
      ([key, value]) => {
        try {
          window.localStorage.setItem(key, value);
        } catch {
          /* ignore */
        }
      },
      [TEXT_SIZE_STORAGE_KEY, step] as const,
    );
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();
    await page.locator('.list-toggle-btn').click();
    await expect(page.locator('.palette-input')).toBeVisible();
    return page
      .locator('.palette-input')
      .evaluate((el) => parseFloat(getComputedStyle(el).fontSize));
  };

  const small = await sizeAt('xsmall');
  const large = await sizeAt('xlarge');
  expect(small).toBe(16);
  expect(large).toBeGreaterThan(small);
});
