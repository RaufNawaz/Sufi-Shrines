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
        '.map-container still has `z-index: var(--z-map)` and `isolation: isolate` (src/styles/map.css)',
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

/**
 * The sheet must fill the width of the phone, with the list open.
 *
 * It did not. `.sidebar` set `left: 0; right: 0` and then
 * `inset-inline-start: auto !important` — which *is* `left` in LTR, so the pin
 * was cancelled and a fixed box with one inset and `width: auto` resolves to
 * shrink-to-fit. Measured at 390×844 with the shrine list open: **2201px wide,
 * starting at x = −1811**, sized by the widest row in the list and hanging off
 * the left of the screen. The peek looked fine because its own content is
 * narrower than the viewport, so nothing showed until a reader tapped through
 * to the list — and then most of the sheet they had just opened was off-screen
 * with blank rows where the names should be.
 *
 * Checked in both directions, because the old rule cancelled the *right* edge
 * in RTL and blew the sheet out the other way.
 */
for (const [label, url] of [
  ['en', '/'],
  ['ur', '/?lang=ur'],
] as const) {
  test(`[${label}] the expanded sheet fits the viewport, and so do its rows`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(url);
    await page.locator('#sidebar').waitFor();
    await page.locator('.list-toggle-btn').click();
    await expect(page.locator('.shrine-list-item').first()).toBeVisible();

    const geometry = await page.evaluate(() => {
      const sheet = document.querySelector('#sidebar')!.getBoundingClientRect();
      const row = document.querySelector('.shrine-list-item')!.getBoundingClientRect();
      return {
        sheetLeft: Math.round(sheet.left),
        sheetWidth: Math.round(sheet.width),
        rowWidth: Math.round(row.width),
        viewport: window.innerWidth,
        // A horizontally scrollable document is the same bug seen from outside.
        docScrollWidth: document.documentElement.scrollWidth,
      };
    });

    expect(geometry.sheetLeft, 'the sheet starts off-screen').toBe(0);
    expect(geometry.sheetWidth, 'the sheet is not the width of the phone').toBe(geometry.viewport);
    expect(geometry.rowWidth).toBeLessThanOrEqual(geometry.viewport);
    expect(geometry.docScrollWidth, 'the page scrolls sideways').toBeLessThanOrEqual(
      geometry.viewport,
    );
  });
}

/**
 * The two things a reader actually does on a phone, both of which the paint-order
 * bug broke silently: select a shrine, and switch language.
 *
 * Merged in from a second branch that found the same bug. Kept because they test
 * the consequence rather than the cause — the sheet can be topmost and still be
 * useless if the card it reveals is off-screen, or if the one control visible at
 * peek height cannot be tapped.
 */
test.describe('mobile bottom sheet — what it is for', () => {
  test.use({ viewport: PHONE, isMobile: true, hasTouch: true });

  test('selecting a shrine reveals its card, on top', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    // Dispatched, not clicked. At country zoom the pins overlap so heavily that a
    // real tap on one marker's centre lands on whichever is painted above it, and
    // `{ force: true }` does not help — it skips the check and still delivers the
    // event to the top element. Waited for rather than queried outright, because
    // ShrineMarkers sets aria-label in the marker's own `add` handler.
    const marker = page.locator('[aria-label="Data Darbar"]');
    await marker.waitFor({ state: 'attached', timeout: 15000 });
    await marker.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    await expect(page.locator('.preview-title')).toContainText('Data Darbar');
    await settle(page);

    const buried = await page.evaluate(() => {
      const card = document.querySelector('.preview-card');
      if (!card) return 'no .preview-card';
      const r = card.getBoundingClientRect();
      // Centre of the card's *visible* rectangle: a tall card in a scrolling
      // sheet legitimately has its geometric midpoint off-screen.
      const left = Math.max(r.left, 0);
      const right = Math.min(r.right, window.innerWidth);
      const top = Math.max(r.top, 0);
      const bottom = Math.min(r.bottom, window.innerHeight);
      if (right <= left || bottom <= top) return 'the card is entirely off-screen';
      const hit = document.elementFromPoint(
        Math.round((left + right) / 2),
        Math.round((top + bottom) / 2),
      );
      return hit?.closest('.sidebar') ? null : `${hit?.tagName}.${hit?.className || ''}`;
    });

    expect(buried, 'something is painting over the selected-shrine card').toBeNull();
  });

  test('the language toggle is reachable without opening the sheet', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();
    await settle(page);

    // The peek band shows the brand row, so the Urdu switch is the one control a
    // first-time visitor can reach immediately — and the one the mission bar
    // ("equally excellent in both languages") makes load-bearing.
    const buried = await page.evaluate(() => {
      const seg = document.querySelector('.lang-seg');
      if (!seg) return 'no .lang-seg';
      const r = seg.getBoundingClientRect();
      const hit = document.elementFromPoint(
        Math.round(r.left + r.width / 2),
        Math.round(r.top + r.height / 2),
      );
      return hit?.closest('.lang-seg') || hit?.closest('.sidebar')
        ? null
        : `${hit?.tagName}.${hit?.className || ''}`;
    });

    expect(buried, 'the language toggle is buried').toBeNull();
  });
});
