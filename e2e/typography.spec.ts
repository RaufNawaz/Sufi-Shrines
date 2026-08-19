import { test, expect } from './fixtures';

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

async function typeScale(page: import('@playwright/test').Page) {
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

test('the shrine list has room to be a list on a laptop viewport', async ({ page }) => {
  // 1280x720 is the common case that collapsed the panel to 0px.
  await page.setViewportSize({ width: 1280, height: 720 });
  await page.goto('/');
  await page.locator('.list-toggle-btn').click();
  const panel = page.locator('.shrine-list-panel');
  await expect(panel).toBeVisible();
  const box = (await panel.boundingBox())!;
  expect(box.height, 'the filter sections above must yield space to the list').toBeGreaterThan(150);
});
