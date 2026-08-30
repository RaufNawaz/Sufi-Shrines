import type { Page } from '@playwright/test';
import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * A pile of markers, and what a tap on it is worth.
 *
 * Measured at the opening view on 30 August 2026, before this existed: the
 * archive's 169 markers formed **21 visually distinct shapes**. The median
 * distance from a pin centre to its nearest neighbour was **1 px**; 152 of 169
 * had another pin's centre inside their own 22 px tap radius. The largest single
 * shape held **66 sites** — 39% of the archive — over Lahore. A reader who
 * tapped it opened whichever marker Leaflet had drawn last, with no route to
 * the other 65. Full figures in `docs/planning/MAP_PIN_DENSITY_2026-08-30.md`.
 *
 * Ruled from four costed options: **fan on tap, and leave the resting map
 * alone.** These tests therefore assert both halves — that a tap reaches every
 * marker in a pile, *and* that nothing about the untouched map changed. The
 * second is not a formality: the option that redrew the opening view was
 * considered and declined, and a test suite that only checked the fan would let
 * it arrive later by accident.
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
 * Wait for a fan to finish opening, not to start.
 *
 * `waitForFunction(fanned.length > 1)` returns on the *second* marker of sixty-
 * six — mid-loop, with most of the pile still sitting on the anchor. Measuring
 * there reports several markers at identical coordinates and a closest pair of
 * 0.13 px, which is indistinguishable from a broken spiral. The geometry was
 * fine at every size from 2 to 200; the instrument was early.
 *
 * So this waits for the shape to stop changing: two samples, one animation
 * frame apart, with the same count and the same positions. A leader line per
 * fanned marker is the other half of "finished" — the lines are added inside the
 * same loop, so a mismatch means it is still running.
 */
/**
 * Wait until the map itself stops moving.
 *
 * The marker count settles well before the view does — the opening view is
 * animated, so for a while after all 168 markers exist every one of them is
 * still sliding. Clicking into that computes the fan against a moving map: the
 * offsets are right relative to an anchor that has since moved, and the read
 * that follows catches several markers still short of their positions. It
 * reports as four pairs of duplicate coordinates and a closest pair of 0.18 px,
 * which looks exactly like a broken spiral and is not one.
 *
 * Two identical frames of marker positions is the same test `settle()` in
 * `fixtures.ts` applies to animations, for the same reason: this project has
 * twice recorded a mid-animation state and filed it as a defect.
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
 * Wait for the marker layer to stop being rebuilt.
 *
 * Not a `waitForTimeout`, and the first draft of this file learned why. Markers
 * arrive in two passes — the slim index, then the CSV dataset — and the second
 * pass **rebuilds the whole layer**. A fan opened during the gap is collapsed by
 * that rebuild's cleanup, so a spec that tapped at a fixed 1200 ms measured a
 * map mid-swap: old fanned elements still in the DOM at their fan positions,
 * new ones already drawn at true coordinates, and two markers reported 0.13 px
 * apart. It reads exactly like a geometry bug, and the geometry was fine at
 * every size from 2 to 200.
 *
 * The settled count is the signal, so this waits for it. `MAPPED_SHRINE_COUNT`
 * is the fixture's own answer to "how many rows have coordinates", which is
 * what the second pass converges on.
 */
async function loadMap(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
    timeout: 30_000,
  });
  await waitForMapStill(page);
}

test.describe('a pile of markers fans out on tap', () => {
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

  test('every marker in the pile becomes separately tappable', async ({ page }) => {
    await loadMap(page);
    const { point } = densestPoint(await pins(page));

    await page.mouse.click(point.x, point.y);
    await waitForFan(page);

    const fanned = (await pins(page)).filter((p) => p.fanned);
    expect(fanned.length).toBeGreaterThan(5);

    /* The point of the whole feature: no two of them share a tap target. */
    expect(
      closestPair(fanned),
      'two fanned markers are still within one tap radius of each other',
    ).toBeGreaterThan(TAP_RADIUS);

    /* And a leader line each, so the fan does not silently misreport where a
       site is. */
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(fanned.length);

    const offscreen = await page.evaluate(
      () =>
        [...document.querySelectorAll('.shrine-dot--fanned')].filter((el) => {
          const b = el.getBoundingClientRect();
          const x = b.left + b.width / 2;
          const y = b.top + b.height / 2;
          return x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight;
        }).length,
    );
    expect(offscreen, 'the fan hangs off the viewport').toBe(0);
  });

  test('Escape puts every marker back exactly where it was', async ({ page }) => {
    await loadMap(page);
    const before = await pins(page);
    const { point } = densestPoint(before);

    await page.mouse.click(point.x, point.y);
    await waitForFan(page);
    await page.keyboard.press('Escape');
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0);
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);

    /* Exactly, not approximately. A marker is a coordinate; a fan that leaves
       one a few pixels from where it started has quietly moved a site.
       Measured relative to the first marker rather than to the viewport,
       because opening a fan near an edge deliberately pans the map to keep it
       on screen and does not pan back — so absolute screen positions are
       expected to differ by up to the whole pan (79 px, when this was written
       against the fixture) while the constellation must be identical. */
    await waitForMapStill(page);
    const after = await pins(page);
    expect(after).toHaveLength(before.length);

    /* Paired by accessible name, and measured relative to one named marker
       rather than to the viewport. Both matter: DOM order is not identity, and
       opening a fan near an edge pans the map on purpose and does not pan back,
       so every absolute position is expected to have shifted by the same
       amount while the constellation must be unchanged. */
    const originOf = (list: Pin[]) => list.find((p) => p.label === before[0]!.label);
    const wasOrigin = originOf(before);
    const nowOrigin = originOf(after);
    expect(wasOrigin && nowOrigin, 'lost the reference marker between snapshots').toBeTruthy();

    const byLabel = new Map(after.map((p) => [p.label, p]));
    let drift = 0;
    for (const was of before) {
      const now = byLabel.get(was.label);
      if (!now) continue;
      drift = Math.max(
        drift,
        Math.hypot(
          now.x - nowOrigin!.x - (was.x - wasOrigin!.x),
          now.y - nowOrigin!.y - (was.y - wasOrigin!.y),
        ),
      );
    }
    expect(drift, 'markers did not return to their coordinates').toBeLessThan(1);
  });

  test('a marker inside an open fan opens, rather than re-fanning', async ({ page }) => {
    await loadMap(page);
    const { point } = densestPoint(await pins(page));
    await page.mouse.click(point.x, point.y);
    await waitForFan(page);

    const target = (await pins(page)).filter((p) => p.fanned)[3];
    expect(target, 'fan too small to pick a fourth marker').toBeTruthy();
    await page.mouse.click(target!.x, target!.y);

    /* Selection is what a tap on a lone marker has always done, and a tap
       inside an open fan must do the same rather than re-fanning the pile it is
       already part of — without that clause the first marker of a fan would
       re-open its own pile forever and never open its entry. */
    await expect(page.locator('.leaflet-marker-icon[aria-pressed="true"]')).toHaveCount(1, {
      timeout: 10_000,
    });

    /* And the fan is gone afterwards, because selecting flies the map to the
       shrine (`flyToOrSetView` in ShrineMap) and every fan collapses on
       `zoomstart`. That is not incidental: the offsets were computed in layer
       points at one zoom, so a fan that survived a flight would be pointing at
       the wrong places. Asserted so the coupling is visible — if selection ever
       stops moving the map, this test says so instead of the fan silently
       becoming stale. */
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0, { timeout: 10_000 });
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);
  });

  test('the keyboard can open a fan and lands inside it', async ({ page }) => {
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
    await page.keyboard.press('Enter');

    await expect(page.locator('.shrine-dot--fanned').first()).toBeVisible({ timeout: 10_000 });
    const focusIsFanned = await page.evaluate(() =>
      Boolean(document.activeElement?.classList.contains('shrine-dot--fanned')),
    );
    expect(focusIsFanned, 'the keyboard scattered the pile and left focus outside it').toBe(true);
  });

  test('an Urdu reader is told how many, in Eastern numerals', async ({ page }) => {
    await loadMap(page, '/?lang=ur');
    const { point } = densestPoint(await pins(page));
    await page.mouse.click(point.x, point.y);
    await waitForFan(page);

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
    /* The declined option, held declined. Before any interaction the map draws
       one marker per mapped shrine and nothing else: no cluster bubbles, no
       counts, no fanned markers, no leader lines. */
    await loadMap(page);
    await expect(page.locator('.shrine-dot--fanned')).toHaveCount(0);
    await expect(page.locator('.shrine-fan-leg')).toHaveCount(0);
    const announced = await page.locator('.sr-only[role="status"]').innerText();
    expect(announced.trim()).toBe('');
  });
});
