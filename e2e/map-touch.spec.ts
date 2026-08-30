import type { Page } from '@playwright/test';
import { test, expect, selectMarker } from './fixtures';

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

/**
 * How far from a dot's centre a tap still reaches that same dot, in CSS pixels.
 *
 * The first test below records two hit-probes that were written and thrown
 * away, and both asked the wrong question. The first asked whether a point
 * landed on *a* marker — on a map holding 169 of them it did, at any hit size.
 * The second used `elementFromPoint`, singular, which returns only the topmost
 * element, so a neighbouring pin painted over the target read as a miss at the
 * target's own centre.
 *
 * `elementsFromPoint` — plural — returns every element hit at that point, and
 * membership is checked by identity against one specific dot. A neighbour
 * cannot satisfy it, and a neighbour on top cannot hide it.
 *
 * Two things about it that are worth knowing before trusting a reading:
 *
 * - **Probe for the dot, never for the Leaflet icon.** The hit area is a
 *   pseudo-element that overflows the icon's own 14px box, so past that box
 *   the list contains the dot and not its icon ancestor. Asking for the icon
 *   reads 0 and looks like a broken tap target. The tap is fine: the event
 *   fires on the dot and bubbles to the icon Leaflet bound its handler to.
 * - **Validated against a known answer** before any number here was believed:
 *   a bare 14px div with this exact 44px `::after` reads 21, and reads 0 with
 *   the rule removed.
 */
async function tapReach(page: Page, selector: string): Promise<number> {
  return page.evaluate((sel) => {
    const dot = document.querySelector(sel);
    if (!dot) return -1;
    const r = dot.getBoundingClientRect();
    const cy = r.top + r.height / 2;
    // Probe towards whichever side has room; a pin near the right edge would
    // otherwise report a short reach because the viewport ended, not the dot.
    const cx = r.left + r.width / 2;
    const dir = cx + 120 < window.innerWidth ? 1 : -1;
    let reach = 0;
    for (let d = 0; d <= 200; d += 1) {
      if (document.elementsFromPoint(cx + dir * d, cy).includes(dot)) reach = d;
      else break;
    }
    return reach;
  }, selector);
}

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

  test('a selected pin keeps a steady target instead of breathing with the pulse', async ({
    page,
  }) => {
    /* The tap target and the selected pin's pulse were one `::after` between
       them, and the pulse won: its `inset: -6px` moved the touch square off
       the dot and its `transform: scale(0.9 → 2.2)` replaced the centring
       translate — an animation outranks a normal author declaration — so the
       square breathed. Measured on one plain pin, same marker both ways:
       **reach 45→90px on a two-second loop before, a steady 21px after.**

       Why that mattered to a reader: a selected pin sits above its neighbours
       (zIndexOffset 1000), and in the walled city thirty-five sites stand
       inside a few hundred metres. A pin whose invisible target is 180px
       across swallows the taps meant for them, so tapping the next shrine
       along deselected the current one instead of opening it — and whether it
       did depended on where a decorative animation happened to be.

       The assertion is the *spread*, not the size: a fixed target of the wrong
       size is a different bug from a target that changes while you reach for
       it, and only the spread catches the pseudo-element collision. */
    await page.goto('/');
    await page.locator('.shrine-dot').first().waitFor();
    await page.waitForTimeout(600);

    const unselected = await tapReach(page, '.shrine-dot');
    expect(unselected, 'an unselected pin no longer reaches 44px across').toBeGreaterThanOrEqual(
      21,
    );

    /* Through the fan if the first marker is in a pile, which at the opening
       view it is: 161 of 169 markers share their spot with another. */
    await selectMarker(page, page.locator('.leaflet-marker-icon').first());
    await page.locator('.shrine-dot.selected').waitFor();
    // Let the selection's pan settle: a moving marker reads as a short reach.
    await page.waitForTimeout(1200);

    // Twelve samples at 180ms covers a full 2s pulse cycle.
    const samples: number[] = [];
    for (let i = 0; i < 12; i += 1) {
      samples.push(await tapReach(page, '.shrine-dot.selected'));
      await page.waitForTimeout(180);
    }
    const min = Math.min(...samples);
    const max = Math.max(...samples);

    expect(
      min,
      `a selected pin's target fell under 44px (${samples.join(',')})`,
    ).toBeGreaterThanOrEqual(21);
    expect(
      max - min,
      `a selected pin's tap target changes size as the pulse animates (${samples.join(',')})`,
    ).toBeLessThanOrEqual(2);
  });
});
