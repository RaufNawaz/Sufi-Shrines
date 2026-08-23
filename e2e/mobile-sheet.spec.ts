/**
 * The mobile bottom sheet, and the paint-order bug that made the whole
 * sidebar unreachable on a phone.
 *
 * Leaflet numbers its own panes 200–700 and the maplibre-gl-leaflet layer
 * lives among them. `.map-container` was `position: relative` with no
 * z-index, so it never became a stacking context and those numbers landed in
 * the root context — where they outranked `--z-sidebar` (20). On desktop the
 * sidebar sits *beside* the map, so nothing overlapped and nothing looked
 * wrong. On mobile, where the sheet overlaps the map, every part of the
 * sidebar painted underneath the basemap: brand, language toggle, search,
 * filters, the shrine list, and the selected-shrine card. The sheet handle
 * was also untappable, so there was no way to open any of it. The site was a
 * bare map with no UI.
 *
 * Nothing caught it. The 390px touch-target suite in a11y.spec.ts measures
 * `getBoundingClientRect()`, and the boxes were all the right size — they
 * were merely buried. A size assertion cannot see occlusion, so these tests
 * hit-test instead: the control at its own centre point must be the element
 * that would actually receive the tap.
 */
import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

const PHONE = { width: 390, height: 844 };

/**
 * What `document.elementFromPoint` resolves to over `selector`, reported as a
 * tag.class string — or null when the point resolves to the element itself or
 * one of its own descendants (i.e. nothing is in the way).
 *
 * Probes the centre of the element's *visible* rectangle rather than its
 * geometric centre. A tall card inside a scrolling sheet can easily have its
 * midpoint outside the viewport, where elementFromPoint returns null for
 * reasons that have nothing to do with occlusion.
 */
async function occluderAtCentre(page: Page, selector: string) {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return `NO SUCH ELEMENT: ${sel}`;
    const r = el.getBoundingClientRect();

    const left = Math.max(r.left, 0);
    const right = Math.min(r.right, window.innerWidth);
    const top = Math.max(r.top, 0);
    const bottom = Math.min(r.bottom, window.innerHeight);
    if (right <= left || bottom <= top) return 'element is entirely off-screen';

    const hit = document.elementFromPoint(
      Math.round((left + right) / 2),
      Math.round((top + bottom) / 2),
    );
    if (!hit) return 'nothing at that point';
    if (hit === el || el.contains(hit) || hit.contains(el)) return null;
    return `${hit.tagName.toLowerCase()}.${String(hit.className).split(' ')[0]}`;
  }, selector);
}

/** Asserts nothing is painting over `selector`. Polled, because the sheet
 *  animates its height: a card asserted mid-transition is legitimately still
 *  below the fold, which is not the failure this is looking for. */
async function expectClear(page: Page, selector: string, message: string) {
  await expect.poll(() => occluderAtCentre(page, selector), { message, timeout: 8000 }).toBeNull();
}

test.describe('Mobile bottom sheet', () => {
  test.use({ viewport: PHONE });

  test('the sheet paints above the basemap, not under it', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    await expectClear(page, '.sidebar-sheet-handle', 'something is painting over the sheet handle');
  });

  test('the sheet handle opens the sheet', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    const sheet = page.locator('#sidebar');
    await expect(sheet).toHaveClass(/collapsed/);

    // No { force: true } — an occluded handle must fail this click, which is
    // the whole point.
    await page.locator('.sidebar-sheet-handle').click();
    await expect(sheet).not.toHaveClass(/collapsed/);
  });

  test('tapping a marker reveals the shrine in the sheet', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    // Dispatched rather than clicked. At country zoom the pins overlap so
    // heavily that a real tap on Data Darbar's centre lands on whichever
    // marker is painted above it — `{ force: true }` does not help, it only
    // skips the check and still delivers the event to the top element. That
    // overlap is a real problem in its own right; this test is about what the
    // sheet does once a shrine *is* selected.
    //
    // Waited for rather than queried outright: ShrineMarkers sets aria-label
    // in the marker's own `add` handler, so the attribute does not exist until
    // Leaflet has put the marker on the map.
    const marker = page.locator('[aria-label="Data Darbar"]');
    await marker.waitFor({ state: 'attached', timeout: 15000 });
    await marker.evaluate((el) => el.dispatchEvent(new MouseEvent('click', { bubbles: true })));

    await expect(page.locator('.preview-card')).toBeVisible();
    await expect(page.locator('.preview-title')).toContainText('Data Darbar');

    // Visible in the DOM is not enough — the card must be on top, too.
    await expectClear(page, '.preview-card', 'something is painting over the selected-shrine card');
  });

  test('the language toggle is reachable without opening the sheet', async ({ page }) => {
    await page.goto('/');
    await page.locator('#sidebar').waitFor();

    // The peek height shows the brand row, so the Urdu switch is the one
    // control a first-time visitor can reach immediately. It is also the
    // control the mission bar ("equally excellent in both languages") makes
    // load-bearing.
    await expectClear(page, '.lang-seg', 'the language toggle is buried');
  });
});
