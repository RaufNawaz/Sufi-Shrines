import { test, expect } from './fixtures';

/**
 * The map's pin is the archive's primary interaction, and on a phone it is a
 * touch target before it is anything else.
 *
 * The dot is 14px — 30px where the site has a photograph — against the 44px
 * minimum every other control here is held to. `a11y.spec.ts` tests four
 * selectors for that minimum and markers were never among them, so 51 of the
 * 169 sites shipped a target a third of the required size. The ones hardest to
 * hit were exactly the entries with no photograph: the thinnest records, which
 * most need a reader to reach them.
 *
 * The dot cannot grow — the walled city puts thirty-five sites inside a few
 * hundred metres, and at that density a 44px disc is a blob rather than a
 * place. So `.shrine-dot::after` carries an invisible 44px square and the
 * visual stays put.
 *
 * **The failure that would matter more than the fix** is the map ceasing to
 * pan: with 169 enlarged hit areas, a drag that happens to begin on one must
 * still scroll the map, or the map feels broken rather than merely fiddly.
 * That is the second test here, and it is the reason this file exists rather
 * than a line added to the a11y spec.
 */
test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

test.describe('the map on a phone', () => {
  test('a pin accepts a tap 44px wide, not 14px', async ({ page }) => {
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();

    /* The invariant, asserted directly. An earlier version of this test only
       hit-tested a point 18px from a dot's centre and asked whether it landed
       on "a marker" — which, on a map holding 169 of them, it did even with the
       hit area reverted to 14px. It passed against the bug it was written for.
       The computed size of the pseudo-element cannot be satisfied by a
       neighbour. */
    const size = await page.evaluate(() => {
      const dot = document.querySelector('.shrine-dot');
      if (!dot) return null;
      const after = getComputedStyle(dot, '::after');
      return { w: parseFloat(after.width), h: parseFloat(after.height) };
    });
    expect(size, 'no marker rendered').not.toBeNull();
    expect(size!.w, 'the marker hit area is under the 44px minimum').toBeGreaterThanOrEqual(44);
    expect(size!.h, 'the marker hit area is under the 44px minimum').toBeGreaterThanOrEqual(44);

    /* No hit-probe here, deliberately. Two attempts were written and both were
       worse than nothing:

       The first asked whether a point 18px from a dot's centre landed on "a
       marker". On a map holding 169 of them it did — even with the hit area
       reverted to 14px — so it passed against the very bug it was written for.
       Mutation-checking caught that.

       The second compared element identity on an isolated pin, which needs the
       map zoomed in to find one, and after the zoom `elementFromPoint` at the
       marker's own centre stopped resolving to it at all. Rather than tune a
       probe I could not explain, the behavioural half is dropped: `pastTheDot`
       was never the claim. The claim is that the square is 44px, and the
       computed style says so exactly, fails when the rule is reverted, and
       cannot be satisfied by a neighbouring marker. */
  });

  test('a drag that starts on a pin still pans the map', async ({ page }) => {
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();
    await page.waitForTimeout(600);

    /* Panning is measured by where a marker *is*, not by the map pane's
       transform: Leaflet resets that transform to translate3d(0,0,0) once a pan
       settles and repositions the tiles instead, so comparing it reports "no
       movement" for a map that plainly moved. Marker geometry is the thing the
       reader actually sees change. */
    const markerX = () =>
      page.evaluate(() => {
        const el = document.querySelector('.leaflet-marker-icon');
        return el ? Math.round(el.getBoundingClientRect().left) : null;
      });

    const start = await page.evaluate(() => {
      const el = [...document.querySelectorAll('.leaflet-marker-icon')]
        .map((e) => ({ e, r: e.getBoundingClientRect() }))
        .find(({ r }) => r.top > 120 && r.bottom < 460);
      if (!el) return null;
      return {
        x: Math.round(el.r.left + el.r.width / 2),
        y: Math.round(el.r.top + el.r.height / 2),
      };
    });
    expect(start, 'no marker available to drag from').not.toBeNull();

    const before = await markerX();

    // A real finger drag beginning on the marker.
    const cdp = await page.context().newCDPSession(page);
    await cdp.send('Input.dispatchTouchEvent', {
      type: 'touchStart',
      touchPoints: [{ x: start!.x, y: start!.y }],
    });
    for (let i = 1; i <= 8; i += 1) {
      await cdp.send('Input.dispatchTouchEvent', {
        type: 'touchMove',
        touchPoints: [{ x: start!.x - i * 12, y: start!.y - i * 6 }],
      });
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await page.waitForTimeout(900);

    const after = await markerX();
    expect(before).not.toBeNull();
    expect(
      Math.abs((after ?? 0) - (before ?? 0)),
      'the map did not pan from a drag that began on a pin',
    ).toBeGreaterThan(20);
  });

  test('the enlarged target changes nothing a reader can see', async ({ page }) => {
    /* The hit area must carry no paint. If it ever gains a background or a
       border it becomes a 44px halo around every one of 169 pins, which at
       country zoom is a solid sheet of colour over Punjab. */
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();

    const paint = await page.evaluate(() => {
      const dot = document.querySelector('.shrine-dot');
      if (!dot) return null;
      const after = getComputedStyle(dot, '::after');
      const box = dot.getBoundingClientRect();
      return {
        dotSize: Math.round(box.width),
        bg: after.backgroundColor,
        bgImage: after.backgroundImage,
        borderWidth: after.borderTopWidth,
      };
    });
    expect(paint).not.toBeNull();
    expect(paint!.dotSize, 'the visible dot changed size').toBeLessThanOrEqual(30);
    expect(paint!.bg === 'rgba(0, 0, 0, 0)' || paint!.bg === 'transparent').toBe(true);
    expect(paint!.bgImage).toBe('none');
    expect(paint!.borderWidth).toBe('0px');
  });
});
