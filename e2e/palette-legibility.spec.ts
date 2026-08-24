import { test, expect } from './fixtures';
import { settle } from './fixtures';

/**
 * The command palette has to look like a panel, in both themes.
 *
 * Reported by the archive's author: over the map the panel's edge was hard to
 * find, and it was "hard to see what text is on the search bar and what is on the
 * map". Reproduced from screenshots, and the first hypothesis was wrong in a way
 * worth writing down.
 *
 * The obvious suspect was the border — `--glass-border` is 0.7-alpha warm grey in
 * light mode and, in dark mode, within a few values of `--glass-bg` itself. It
 * turned out not to be the trigger: restoring the old border alone leaves every
 * assertion here passing, because a 1px edge at that colour is faint rather than
 * absent. What actually did it, confirmed by restoring each change on its own:
 *
 *  · the scrim, at 0.46 alpha, barely dimmed the page — so the sidebar's text and
 *    the map's markers kept their full contrast right up against the panel, and
 *    the panel had nothing to stand out against; and
 *  · the search field was drawing a 1.5px pill and a 3px halo *inside* the panel.
 *    It carries `.search-input` for the sidebar field, whose `:focus` rule is
 *    permanently active here — the caret is in this field from the moment the
 *    palette opens — and at (0,2,0) it outranked the single-class rule that
 *    claimed, in a comment, to have removed it. A box drawn inside the box.
 *
 * So assertions 3, 4 and 5 are the load-bearing ones; 1 and 2 are a floor against
 * a future edge that is genuinely invisible rather than merely faint. Each was
 * checked by restoring the old value and watching it fail — a guard that has not
 * been shown to fail on the thing it guards is not yet a guard.
 *
 * Nothing existing caught any of it. axe checks text against its *own* background
 * and passes: the text was legible, the panel was not. Contrast between a panel
 * and what is behind it is not a WCAG criterion, and a screenshot review passes it
 * whenever the reviewer already knows where the panel is.
 *
 * So this measures the three things that make a translucent panel read as one:
 * its edge differs from its own surface, its surface differs from the backdrop,
 * and the backdrop actually dims what is behind it. Thresholds are deliberately
 * loose — this is a floor against "invisible", not a lock on the design.
 */

/** Perceptual distance in sRGB, good enough to tell "different" from "the same
 * colour". Not a WCAG ratio: these are surfaces, not text on a ground. */
function rgb(value: string): [number, number, number] {
  const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return [nums[0] ?? 0, nums[1] ?? 0, nums[2] ?? 0];
}

function distance(a: string, b: string): number {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return Math.sqrt((r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2);
}

/** Alpha of an rgba() string, 1 when opaque. */
function alpha(value: string): number {
  const nums = value.match(/[\d.]+/g)?.map(Number) ?? [];
  return nums.length >= 4 ? nums[3] : 1;
}

for (const theme of ['light', 'dark'] as const) {
  test(`[${theme}] the palette reads as a panel, not as text over the map`, async ({ page }) => {
    await page.emulateMedia({ colorScheme: theme });
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await settle(page);
    await page.keyboard.press('Control+k');
    await page.locator('.palette').waitFor();
    await settle(page);

    const measured = await page.evaluate(() => {
      const panel = document.querySelector('.palette')!;
      const backdrop = document.querySelector('.palette-backdrop')!;
      const input = document.querySelector('.palette-input')!;
      const ps = getComputedStyle(panel);
      const bs = getComputedStyle(backdrop);
      const is = getComputedStyle(input);
      return {
        panelBg: ps.backgroundColor,
        panelBorder: ps.borderTopColor,
        panelBorderWidth: ps.borderTopWidth,
        panelShadow: ps.boxShadow,
        backdropBg: bs.backgroundColor,
        inputBorderWidth: is.borderTopWidth,
        inputShadow: is.boxShadow,
      };
    });

    // 1. The panel has an edge that is not its own surface.
    expect(
      Number.parseFloat(measured.panelBorderWidth),
      'the palette has no border at all',
    ).toBeGreaterThan(0);
    expect(
      distance(measured.panelBorder, measured.panelBg),
      `the palette's border is the same colour as the palette (${measured.panelBorder} vs ` +
        `${measured.panelBg}), so the panel has no visible edge`,
    ).toBeGreaterThan(24);

    // 2. The panel's surface is distinct from the scrim right outside it.
    expect(
      distance(measured.panelBg, measured.backdropBg),
      'the palette and the scrim behind it are the same colour',
    ).toBeGreaterThan(24);

    // 3. The scrim actually dims. A near-transparent scrim puts the map's own
    //    contrast right up against the panel's edge.
    expect(
      alpha(measured.backdropBg),
      'the backdrop barely dims the page behind the palette',
    ).toBeGreaterThanOrEqual(0.5);

    // 4. The panel is elevated, which is the other half of reading as a panel.
    expect(measured.panelShadow, 'the palette casts no shadow').not.toBe('none');

    /* 5. No box drawn inside the box. The input carries `.search-input` for the
          sidebar field, whose :focus rule paints a 1.5px pill and a 3px halo —
          and the caret is in this field from the moment the palette opens, so
          that rule is permanently active. It outranks any single-class attempt
          to cancel it, which is why the pill survived a comment claiming it had
          been removed. */
    expect(
      Number.parseFloat(measured.inputBorderWidth),
      'the palette input is drawing its own pill border inside the panel',
    ).toBe(0);
    expect(
      measured.inputShadow,
      'the palette input is drawing the sidebar field’s focus halo inside the panel',
    ).toBe('none');
  });
}
