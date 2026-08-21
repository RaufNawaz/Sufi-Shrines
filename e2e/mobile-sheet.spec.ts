import { test, expect, settle } from './fixtures';

/**
 * The mobile bottom sheet must be the topmost thing in its own band.
 *
 * This exists because it was not. Leaflet numbers its internals in the
 * hundreds (.leaflet-pane 400, .leaflet-control 800, .leaflet-bottom 1000)
 * while this app's z-index scale (tokens.css) tops out at 60. `.map-container`
 * was `position: relative` with `z-index: auto`, which does *not* create a
 * stacking context, so Leaflet's vendor values competed directly against
 * `--z-sidebar` (20) in the root stacking context — and won. On a phone, where
 * the sidebar is a fixed bottom sheet overlapping the map rather than a flex
 * column beside it, the tile pane and the markers painted over the sheet.
 * Zoomed out to the whole country, the tiles covered the peek band entirely
 * and the sidebar was invisible: unreachable in portrait, appearing only in
 * landscape, where the width crosses 768px and the desktop layout gives the
 * sidebar its own column.
 *
 * A visibility assertion would not have caught it — the element was visible,
 * laid out, and the correct size the whole time. Only paint order was wrong,
 * so the check has to be `elementFromPoint`.
 */

const PHONE = { width: 390, height: 844 };

test.describe('mobile bottom sheet', () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true });

  test('sheet paints above the map across its whole peek band', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    // Markers land asynchronously; they are what used to win the paint order,
    // so the assertion is meaningless until they are on the map.
    await expect(page.locator('.shrine-dot').first()).toBeVisible();

    const offenders = await page.evaluate(() => {
      const sheet = document.querySelector('.sidebar');
      if (!sheet) return ['no .sidebar in the DOM'];
      const r = sheet.getBoundingClientRect();
      const bad: string[] = [];
      // Sample a grid over the peek band rather than one point: the failure was
      // patchy — a marker here, a tile there — so a single probe could pass on
      // a band that is largely buried.
      for (const x of [20, 100, 195, 300, 375]) {
        for (const dy of [6, 30, 60, 95]) {
          const y = r.top + dy;
          if (y >= r.bottom) continue;
          const el = document.elementFromPoint(x, y);
          if (!el?.closest('.sidebar')) {
            bad.push(`(${x},${Math.round(dy)}) → ${el?.tagName}.${el?.className || ''}`);
          }
        }
      }
      return bad;
    });

    expect(
      offenders,
      'map content is painting over the mobile bottom sheet — check that ' +
        '.map-container still has `isolation: isolate` (src/styles/map.css)',
    ).toEqual([]);
  });

  test('the collapsed sheet is tall enough to be a tap target', async ({ page }) => {
    await page.goto('/');
    const sheet = page.locator('.sidebar');
    await expect(sheet).toHaveClass(/collapsed/);
    const box = await sheet.boundingBox();
    expect(box).not.toBeNull();
    // The peek must show the handle and the header, and must not be pushed off
    // the bottom of the viewport.
    expect(box!.height).toBeGreaterThanOrEqual(72);
    expect(box!.y + box!.height).toBeLessThanOrEqual(PHONE.height + 1);
    expect(box!.width).toBeGreaterThan(PHONE.width * 0.9);
  });

  test('dragging the handle open reveals the shrine list', async ({ page }) => {
    await page.goto('/');
    // The handle is the only affordance for opening the sheet on a phone, so
    // it is load-bearing: if it stops working there is no other way in.
    await page.locator('.sidebar-sheet-handle').click();
    await expect(page.locator('.sidebar')).not.toHaveClass(/collapsed/);
    /* The class flips immediately; the height takes --duration-base to follow
       (`transition: height` on the sheet, 108px → ~641px). Measuring straight
       after the class change caught it 5% in, at 134px, and read as a broken
       drag handle. Same mistake the axe sweep made with `reveal-rise` — see
       settle() in fixtures.ts. */
    await settle(page);
    const box = await page.locator('.sidebar').boundingBox();
    expect(box!.height).toBeGreaterThan(200);
  });

  test('map controls are not buried under the sheet', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.leaflet-container')).toBeVisible();
    const sheetTop = (await page.locator('.sidebar').boundingBox())!.y;
    // Every Leaflet control must sit clear of the peek band, or it is
    // unusable on a phone.
    const controls = page.locator('.leaflet-control-container .leaflet-control');
    const n = await controls.count();
    expect(n).toBeGreaterThan(0);
    for (let i = 0; i < n; i++) {
      const c = controls.nth(i);
      if (!(await c.isVisible())) continue;
      const box = await c.boundingBox();
      if (!box || box.height === 0) continue;
      const cls = await c.getAttribute('class');
      // The attribution strip is allowed to tuck behind the sheet; it is not
      // interactive chrome the reader needs to reach.
      if (cls?.includes('leaflet-control-attribution')) continue;
      expect(box.y + box.height, `${cls} overlaps the bottom sheet`).toBeLessThanOrEqual(
        sheetTop + 1,
      );
    }
  });
});
