import type { Page } from '@playwright/test';
import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * A pile of markers, and what a tap on it is worth.
 *
 * Measured at the opening view on 30 August 2026, before any of this existed:
 * the archive's 169 markers formed **21 visually distinct shapes**. The median
 * distance from a pin centre to its nearest neighbour was **1 px**; 152 of 169
 * had another pin's centre inside their own 22 px tap radius. The largest
 * single shape held **66 sites** — 39% of the archive — over Lahore. A reader
 * who tapped it opened whichever marker Leaflet had drawn last, with no route
 * to the other 65. Full figures in `docs/planning/MAP_PIN_DENSITY_2026-08-30.md`.
 *
 * Ruled from four costed options: **fan on tap, and leave the resting map
 * alone.** Amended by Rauf on 1 September 2026 — the tap gesture went. A tap
 * on a pile now *flies the map toward it*; everything a zoom can separate
 * separates on the way, and whatever it cannot — ten sites share exact
 * coordinates — fans out on its own at fan depth, gathering again on the way
 * back out. The resting-map half of the ruling stands, and this suite still
 * asserts it: the option that redrew the opening view was considered and
 * declined, and a suite that only checked the fan would let it arrive later by
 * accident.
 *
 * `src/lib/map/__tests__/spiderfy.test.ts` holds the geometry. This holds the
 * behaviour, in a browser, on the built bundle.
 */

/** What the marker layer treats as one tap, and what the finding measured. */
const TAP_RADIUS = 22;

interface Pin {
  x: number;
  y: number;
  fanned: boolean;
  /** The marker's own accessible name, set in ShrineMarkers' `add` handler.
   *  Used as identity: DOM order is not one, and pairing two snapshots by
   *  index compared different markers and reported a 358 px drift on a map
   *  that had not moved a site at all. */
  label: string;
}

async function pins(page: Page): Promise<Pin[]> {
  return page.evaluate(() =>
    [...document.querySelectorAll('.leaflet-marker-icon')].map((el) => {
      const box = el.getBoundingClientRect();
      return {
        x: box.left + box.width / 2,
        y: box.top + box.height / 2,
        fanned: el.classList.contains('shrine-dot--fanned'),
        label: el.getAttribute('aria-label') ?? el.getAttribute('title') ?? '',
      };
    }),
  );
}

/** Only the pins a reader can currently see. The tap-until-fanned walk clicks
 *  what it measures, and after the first flight most of the archive is off the
 *  edges of the viewport — a "densest point" computed over those is a point
 *  the mouse cannot reach. */
function onScreen(all: Pin[], width: number, height: number): Pin[] {
  return all.filter((p) => p.x >= 0 && p.y >= 0 && p.x <= width && p.y <= height);
}

/** The screen point with the most pin centres within one pin diameter — the
 *  pile a reader's thumb finds first. Computed rather than hardcoded, because
 *  the fixture's coordinates are data and data changes. */
function densestPoint(all: Pin[]): { point: Pin; size: number } {
  let point = all[0]!;
  let size = 0;
  for (const candidate of all) {
    const n = all.filter((p) => Math.hypot(p.x - candidate.x, p.y - candidate.y) < 30).length;
    if (n > size) {
      size = n;
      point = candidate;
    }
  }
  return { point, size };
}

/**
 * Wait until the map itself stops moving.
 *
 * The marker count settles well before the view does — the opening view is
 * animated, so for a while after all markers exist every one of them is still
 * sliding. Measuring against a moving map has twice produced readings — four
 * pairs of duplicate coordinates, a closest pair of 0.18 px — that look
 * exactly like a broken spiral and are a mid-animation frame of a working one.
 *
 * Two identical samples of marker positions, a time gap apart, is the same
 * test `settle()` in `fixtures.ts` applies to animations, for the same reason.
 */
async function waitForMapStill(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const sample = () =>
          [...document.querySelectorAll('.leaflet-marker-icon')]
            .map((el) => {
              const b = el.getBoundingClientRect();
              return `${b.left.toFixed(1)},${b.top.toFixed(1)}`;
            })
            .join('|');
        const first = sample();
        /* A time gap, not two adjacent frames. Under a full parallel suite the
           frames themselves stretch, so two of them can land inside one slow
           step of an easing curve and report a moving map as still. 250 ms is
           longer than any single frame this suite has produced and shorter than
           the opening view's animation. */
        setTimeout(() => resolve(first !== '' && first === sample()), 250);
      }),
    undefined,
    { timeout: 30_000 },
  );
}

/**
 * Wait for a fan to finish opening, not to start.
 *
 * `waitForFunction(fanned.length > 1)` returns on the first marker to get its
 * class — with the rest of the pile mid-glide, since the fan now *animates*
 * outward over 300 ms. Measuring there reports markers at near-identical
 * coordinates, which is indistinguishable from a broken spiral. So this waits
 * for the shape to stop changing: two samples, 250 ms apart, with the same
 * count and the same positions. A leader line per fanned marker is the other
 * half of "finished" — the lines land in the same pass.
 */
async function waitForFan(page: Page): Promise<void> {
  await page.waitForFunction(
    () =>
      new Promise<boolean>((resolve) => {
        const sample = () =>
          [...document.querySelectorAll('.shrine-dot--fanned')]
            .map((el) => {
              const b = el.getBoundingClientRect();
              return `${Math.round(b.left)},${Math.round(b.top)}`;
            })
            .join('|');
        const first = sample();
        const legs = document.querySelectorAll('.shrine-fan-leg').length;
        setTimeout(() => {
          const second = sample();
          const count = second === '' ? 0 : second.split('|').length;
          resolve(count > 1 && first === second && legs === count);
        }, 250);
      }),
    undefined,
    { timeout: 15_000 },
  );
}

function closestPair(points: Pin[]): number {
  let min = Infinity;
  for (let i = 0; i < points.length; i += 1)
    for (let j = i + 1; j < points.length; j += 1)
      min = Math.min(min, Math.hypot(points[i]!.x - points[j]!.x, points[i]!.y - points[j]!.y));
  return min;
}

/**
 * A flight is 900 ms and the fan's glide 300 ms. `waitForMapStill` alone is
 * not enough to wait one out: under parallel workers with tiles decoding, two
 * samples 250 ms apart matched while a flight was a third done — a stalled
 * frame reads exactly like arrival — and the walk below spent its taps
 * interrupting its own flights. The fixed floor carries the wait past the
 * whole animation; the still-check then handles stretched frames.
 */
async function waitOutFlight(page: Page): Promise<void> {
  await page.waitForTimeout(1_500);
  await waitForMapStill(page);
}

/**
 * Ride the taps down to fan depth: tap the densest visible pile, wait out the
 * flight, repeat. Each tap below fan depth is spent on a flight (it neither
 * fans nor selects — separate tests hold both); the first sight of a fanned
 * marker is the auto-fan taking over. Ten taps is generous — the opening view
 * sits ten zoom levels above fan depth and every flight covers several.
 *
 * The fan check comes before the "nothing to tap" check on purpose: once the
 * fan opens, the fanned markers stand a tap radius apart by design, so the
 * densest visible point reads size 1 — reversing the two reads a working fan
 * as an empty map.
 */
async function tapUntilFanned(page: Page): Promise<void> {
  for (let i = 0; i < 10; i += 1) {
    if ((await page.locator('.shrine-dot--fanned').count()) > 0) {
      await waitForFan(page);
      return;
    }
    const view = page.viewportSize()!;
    const visible = onScreen(await pins(page), view.width, view.height);
    const { point, size } = densestPoint(visible);
    if (size < 2)
      throw new Error('every visible pin stands alone, and no fan has opened — nothing to tap');
    await page.mouse.click(point.x, point.y);
    await waitOutFlight(page);
  }
  if ((await page.locator('.shrine-dot--fanned').count()) > 0) {
    await waitForFan(page);
    return;
  }
  throw new Error('no fan opened after ten taps on the densest pile');
}

/**
 * Wait for the marker layer to stop being rebuilt.
 *
 * Not a `waitForTimeout`, and the first draft of this file learned why. Markers
 * arrive in two passes — the slim index, then the CSV dataset — and the second
 * pass **rebuilds the whole layer**. The settled count is the signal, so this
 * waits for it. `MAPPED_SHRINE_COUNT` is the fixture's own answer to "how many
 * rows have coordinates", which is what the second pass converges on.
 */
async function loadMap(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
    timeout: 30_000,
  });
  await waitForMapStill(page);
}

test.describe('a pile of markers: tap to fly toward it, and overlap fans at depth', () => {
  test('the opening view really does pile them up', async ({ page }) => {
    /* The premise, asserted rather than assumed. If a future dataset or default
       zoom separates the pins, every test below stops meaning anything and this
       one says so instead of passing silently. */
    await loadMap(page);
    const all = await pins(page);
    const { size } = densestPoint(all);
    expect(size, 'no pile at the opening view — the rest of this file is vacuous').toBeGreaterThan(
      5,
    );
  });

  test('a tap on a pile flies the map toward it — no fan, no selection', async ({ page }) => {
    await loadMap(page);
    const before = await pins(page);
    const { point, size } = densestPoint(before);

    await page.mouse.click(point.x, point.y);
    await waitOutFlight(page);

    /* The tap was spent on the flight and nothing else: the opening pile spans
       a city, so the flight lands far above fan depth. */
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0);
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveCount(0);

    /* And it worked: the pile the reader tapped is looser on screen than it
       was. The flight fits the pile's bounds to the viewport, so its members
       must spread. */
    const view = page.viewportSize()!;
    const after = densestPoint(onScreen(await pins(page), view.width, view.height));
    expect(after.size, 'the flight did not loosen the pile it was aimed at').toBeLessThan(size);
  });

  test('what depth cannot separate fans out on its own, every marker tappable', async ({
    page,
  }) => {
    await loadMap(page);
    await tapUntilFanned(page);

    const fanned = (await pins(page)).filter((p) => p.fanned);
    expect(fanned.length).toBeGreaterThan(1);

    /* The point of the whole feature: no two of them share a tap target. */
    expect(
      closestPair(fanned),
      'two fanned markers are still within one tap radius of each other',
    ).toBeGreaterThan(TAP_RADIUS);

    /* And a leader line each, so the fan does not silently misreport where a
       site is. */
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(
      await page.locator('.shrine-dot--fanned').count(),
    );
  });

  test('zooming out gathers the fan, and coming back re-opens it exactly', async ({ page }) => {
    await loadMap(page);
    await tapUntilFanned(page);
    const before = (await pins(page)).filter((p) => p.fanned);

    /* Keyboard zoom on the focused map container: one press is exactly one
       zoom level, which is what makes the return trip land on the same zoom
       and the two fans comparable. */
    await page.locator('.leaflet-container').focus();
    await page.keyboard.press('-');
    await waitOutFlight(page);
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0);
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);

    await page.keyboard.press('+');
    await waitOutFlight(page);
    await waitForFan(page);
    const after = (await pins(page)).filter((p) => p.fanned);

    /* Exactly, not approximately: same zoom, same piles, same offsets — so the
       whole constellation must reproduce. A drift here means the collapse put
       a marker back somewhere other than its own coordinates, which is the
       fan quietly moving a site. Measured relative to one named marker rather
       than to the viewport, because the zoom round-trip may leave the camera
       centred slightly elsewhere; paired by accessible name, because DOM order
       is not identity. */
    expect(after.length, 'the fan did not re-open with the same members').toBe(before.length);
    const wasOrigin = before[0]!;
    const nowOrigin = after.find((p) => p.label === wasOrigin.label);
    expect(nowOrigin, 'lost the reference marker between snapshots').toBeTruthy();
    const byLabel = new Map(after.map((p) => [p.label, p]));
    let drift = 0;
    for (const was of before) {
      const now = byLabel.get(was.label);
      expect(now, `marker "${was.label}" fell out of the fan`).toBeTruthy();
      drift = Math.max(
        drift,
        Math.hypot(
          now!.x - nowOrigin!.x - (was.x - wasOrigin.x),
          now!.y - nowOrigin!.y - (was.y - wasOrigin.y),
        ),
      );
    }
    expect(drift, 'the re-opened fan is not the fan that closed').toBeLessThan(1);
  });

  test('a marker inside a fan opens, and the fan survives the selection', async ({ page }) => {
    await loadMap(page);
    await tapUntilFanned(page);

    const target = (await pins(page)).filter((p) => p.fanned)[1];
    expect(target, 'fan too small to pick a second marker').toBeTruthy();
    await page.mouse.click(target!.x, target!.y);

    /* Selection is what a tap on a lone marker has always done, and a marker
       standing in a fan is exactly that — individually reachable. */
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveCount(1, {
      timeout: 10_000,
    });

    /* And the fan is still there afterwards. Selecting flies the map to the
       shrine (`flyToOrSetView` in ShrineMap), which collapses every fan at
       `zoomstart` — and `zoomend` re-fans what the depth still cannot
       separate, selected marker included. The fan stopped being a transient
       the moment it stopped being a gesture: at fan depth it is simply how
       the map presents overlap, so a selection must not dismiss it. */
    await waitOutFlight(page);
    await waitForFan(page);
    expect(await page.locator('.shrine-dot--fanned').count()).toBeGreaterThan(1);
  });

  test('the keyboard can ride the same taps down, and never loses focus', async ({ page }) => {
    await loadMap(page);
    const { point } = densestPoint(await pins(page));
    /* Focus the marker under the pile the same way a reader would reach it,
       then use the keyboard alone from there. */
    await page.mouse.move(point.x, point.y);
    await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x as number, y as number);
        (el?.closest('.leaflet-marker-icon') as HTMLElement | null)?.focus();
      },
      [point.x, point.y],
    );

    /* Enter on a piled marker flies toward its pile; the marker element
       survives the flight, so focus needs no hand-off and the next Enter goes
       deeper. The walk ends in one of exactly two states — the focused marker
       fanned, or standing alone and selected — and either way the reader was
       never dropped. */
    for (let i = 0; i < 10; i += 1) {
      await page.keyboard.press('Enter');
      await waitOutFlight(page);
      const state = await page.evaluate(() => ({
        focusedIsMarker: Boolean(document.activeElement?.classList.contains('leaflet-marker-icon')),
        focusedFanned: Boolean(document.activeElement?.classList.contains('shrine-dot--fanned')),
        focusedPressed: document.activeElement?.getAttribute('aria-pressed') === 'true',
      }));
      expect(state.focusedIsMarker, 'the flight dropped keyboard focus').toBe(true);
      if (state.focusedFanned || state.focusedPressed) return;
    }
    throw new Error('ten Enters and the focused marker neither fanned nor selected');
  });

  test('an Urdu reader is told how many fanned, in Eastern numerals', async ({ page }) => {
    await loadMap(page, '/?lang=ur');
    await tapUntilFanned(page);

    const announced = await page.locator('.sr-only[role="status"]').innerText();
    expect(announced.trim(), 'the fan announced nothing').not.toBe('');
    /* Eastern digits, and no Western ones: the count is a number at a render
       site, which is where this project keeps finding Western digits left in. */
    expect(announced).toMatch(/[۰-۹]/);
    expect(announced).not.toMatch(/[0-9]/);
  });

  test('the resting map is unchanged — no clustering arrived by the back door', async ({
    page,
  }) => {
    /* The declined option, held declined — and now also the guard that the
       auto-fan respects its depth: at the opening view, ten zoom levels above
       fan depth, the map draws one marker per mapped shrine and nothing else.
       No cluster bubbles, no counts, no fanned markers, no leader lines. */
    await loadMap(page);
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0);
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);
    const announced = await page.locator('.sr-only[role="status"]').innerText();
    expect(announced.trim()).toBe('');
  });
});
