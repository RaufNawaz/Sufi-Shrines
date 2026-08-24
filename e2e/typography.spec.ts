import { test, expect, setTraditionalDirectory } from './fixtures';
import type { Page } from '@playwright/test';

/**
 * Layout and type invariants that no unit test can see, guarding the failure
 * mode this codebase actually has: things that break *silently*. Every bug
 * below shipped, and none of them threw, logged, or failed a test.
 *
 * - The Urdu page had no heading hierarchy for months. `calc(1em * scale)` on
 *   `[dir='rtl'] h1` replaced each heading's size with its parent's, and
 *   outranked `.shrine-title` on specificity. Urdu ran h1 18.7px / h2 18.7px
 *   / body 17.8px against English's 36 / 20 / 16.
 * - The shrine list collapsed to zero height on any viewport under ~800px,
 *   while still announcing "169 shrines" to screen readers.
 * - The Urdu infobox ran 36% taller than the English one for identical
 *   content, because data rows inherited running-prose leading.
 *
 * These assert relationships, not pixel values, so they survive deliberate
 * design changes and fail on accidental ones.
 */

const px = (value: string) => Number.parseFloat(value);

async function typeScale(page: Page) {
  return page.evaluate(() => {
    const size = (sel: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontSize : null;
    };
    const weight = (sel: string) => {
      const el = document.querySelector(sel);
      return el ? getComputedStyle(el).fontWeight : null;
    };
    const body = [...document.querySelectorAll('.article-prose p')].find(
      (e) => (e.textContent ?? '').length > 80,
    );
    return {
      h1: size('h1.shrine-title'),
      h1Weight: weight('h1.shrine-title'),
      h2: size('.article-section-heading'),
      body: body ? getComputedStyle(body).fontSize : null,
    };
  });
}

for (const lang of ['en', 'ur'] as const) {
  test(`[${lang}] the shrine page has a real heading hierarchy`, async ({ page }) => {
    await page.goto(`/shrine/shamsabad?lang=${lang}`);
    await expect(page.locator('h1.shrine-title')).toBeVisible();
    await page.waitForSelector('.article-section-heading');

    const scale = await typeScale(page);
    expect(scale.h1, 'no h1').not.toBeNull();
    expect(scale.h2, 'no section heading').not.toBeNull();
    expect(scale.body, 'no body paragraph').not.toBeNull();

    const h1 = px(scale.h1!);
    const h2 = px(scale.h2!);
    const body = px(scale.body!);

    // The title must dominate, not merely differ by a rounding error.
    expect(h1 / body, `h1 ${h1}px vs body ${body}px`).toBeGreaterThan(1.8);
    expect(h2 / body, `h2 ${h2}px vs body ${body}px`).toBeGreaterThan(1.1);
    expect(h1, 'h1 must outrank h2').toBeGreaterThan(h2);
    expect(Number(scale.h1Weight)).toBeGreaterThanOrEqual(700);
  });
}

test('the two languages keep the same typographic proportions', async ({ page }) => {
  const ratios: Record<string, number> = {};
  for (const lang of ['en', 'ur'] as const) {
    await page.goto(`/shrine/shamsabad?lang=${lang}`);
    await page.waitForSelector('.article-section-heading');
    const s = await typeScale(page);
    ratios[lang] = px(s.h1!) / px(s.body!);
  }
  // Urdu may be set larger overall, but the *shape* of the scale should match.
  expect(Math.abs(ratios.en - ratios.ur), `en ${ratios.en} vs ur ${ratios.ur}`).toBeLessThan(0.3);
});

test('the Urdu infobox stays a compact list, not running prose', async ({ page }) => {
  const heights: Record<string, number> = {};
  for (const lang of ['en', 'ur'] as const) {
    await page.goto(`/shrine/shamsabad?lang=${lang}`);
    await page.waitForSelector('.shrine-infobox');
    heights[lang] = (await page.locator('.shrine-infobox').boundingBox())!.height;
  }
  // Urdu is set larger, so some growth is expected and correct; 30% is the
  // line between "bigger type" and "prose leading applied to a data table".
  expect(
    heights.ur / heights.en,
    `Urdu infobox ${Math.round(heights.ur)}px vs English ${Math.round(heights.en)}px`,
  ).toBeLessThan(1.3);
});

// The filter sections above the list are the failure mode (HANDOVER §9.9):
// their height grows with the dataset, and at 169 rows they once squeezed the
// list to exactly 0px. Guard the two viewports that hit it — the common
// laptop, and a phone, where the min-height floor is all the list gets.
for (const vp of [
  { name: 'laptop', width: 1280, height: 720 },
  { name: 'phone', width: 390, height: 844 },
]) {
  test(`the shrine list has room to be a list on a ${vp.name} viewport`, async ({ page }) => {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await setTraditionalDirectory(page);
    await page.goto('/');
    await page.locator('.list-toggle-btn').click();
    const panel = page.locator('.shrine-list-panel');
    await expect(panel).toBeVisible();
    // Poll rather than one-shot: a React re-render can swap the panel node
    // between the visibility check and boundingBox(), returning null.
    await expect
      .poll(async () => (await panel.boundingBox())?.height ?? 0, {
        message: 'the filter sections above must yield space to the list',
      })
      .toBeGreaterThan(150);
  });
}

test.describe('Motion honesty', () => {
  test('reduced motion disables the stagger and reveal system entirely', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    // No element may be animation- or transition-hidden when the reader has
    // asked for reduced motion: the utilities live behind
    // prefers-reduced-motion: no-preference, so animation-name must be none.
    const gridChild = page.locator('.related-grid > *').first();
    await expect(gridChild).toBeVisible();
    const animation = await gridChild.evaluate((el) => getComputedStyle(el).animationName);
    expect(animation).toBe('none');

    const section = page.locator('.article-section').first();
    const cls = await section.getAttribute('class');
    expect(cls).not.toContain('reveal-pending');
  });

  test('with motion enabled, every article section still ends fully visible', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'no-preference' });
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    // Scroll to the last section: reveal must have fired (or the failsafe),
    // and the section must be at full opacity — an animation system must
    // never be able to withhold prose.
    const sections = page.locator('.article-section');
    const last = sections.last();
    await last.scrollIntoViewIfNeeded();
    await expect(last).toBeVisible();
    await expect.poll(async () => last.evaluate((el) => getComputedStyle(el).opacity)).toBe('1');
  });
});
