import type { Page } from '@playwright/test';
import { test, expect, MAPPED_SHRINE_COUNT } from './fixtures';

/**
 * A marker photograph is a circle, and it stays inside its pin.
 *
 * ## What was measured, 30 August 2026
 *
 * The map draws a 30px pin for every site that has a photograph, with the
 * picture inside it and the category colour moved to the ring. On 30 August the
 * picture stopped being a `background-image` and became an `<img>`, so that a
 * photograph which had rotted could report its own failure (`buildDivIcon` in
 * `ShrineMarkers.tsx` says why).
 *
 * What came with it: Leaflet sizes every image in the marker pane itself —
 * `.leaflet-container .leaflet-marker-pane img { width: auto }`, specificity
 * 0,2,1 — and that beat `.shrine-dot__photo { inline-size: 100% }` at 0,1,0. So
 * the width of each marker photograph came from the photograph. Measured on the
 * running map at 1280×900: of 116 photo pins, 112 had loaded, and **111 of
 * those 112 were not square**. 91 spilled outside the pin — the widest
 * 54.73×26px inside a 30px circle. Portrait pictures failed the other way and
 * less visibly, one rendering 14.64px wide: a sliver in a round frame.
 * `border-radius: 50%` on a non-square box is an ellipse, and `object-fit:
 * cover` had nothing to crop because the box already carried the image's own
 * aspect ratio.
 *
 * ## Why this injects its pictures instead of measuring the shipped ones
 *
 * The archive's marker photographs are 242 URLs on hosts this project does not
 * control, and `pipeline/check_image_liveness.py` watched that number of dead
 * ones go 53 → 54 in four days when a certificate expired. A spec that measures
 * whatever loaded is a spec that measures the network: on a run where nothing
 * loads, every `<img>` has no intrinsic size, no box to be wrong about, and the
 * suite goes green over a bug. `e2e/gallery-dead-image.spec.ts` reached the same
 * conclusion from the other direction and injects its failures.
 *
 * So this hands every marker a picture of a known, deliberately extreme shape —
 * 3:1 and 1:3, wider and narrower than anything the archive holds — and asserts
 * the frame wins. Revert the override in `map.css` and these render 78px and
 * 8.7px wide against a 26px box.
 */

/** An image with an exact intrinsic size and no network. */
function svg(w: number, h: number): string {
  return `data:image/svg+xml,${encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="#8a6d3b"/></svg>`,
  )}`;
}

/**
 * Wait for the settled marker layer, not the first one.
 *
 * Markers arrive in two passes — the slim index, then the CSV dataset — and the
 * second pass rebuilds the whole layer, which replaces every icon element. Any
 * `src` written into the first pass is discarded by the second, so injecting
 * before the count settles measures markers that no longer exist.
 */
async function loadMap(page: Page, url = '/') {
  await page.goto(url);
  await expect(page.locator('.leaflet-marker-icon')).toHaveCount(MAPPED_SHRINE_COUNT, {
    timeout: 30_000,
  });
}

interface Box {
  w: number;
  h: number;
  pinW: number;
  pinH: number;
  natW: number;
  natH: number;
}

/** Give every marker photograph a known shape, then measure the boxes. */
async function measureWithInjectedShapes(page: Page, landscape: string, portrait: string) {
  return page.evaluate(
    async ([land, port]) => {
      const imgs = [...document.querySelectorAll<HTMLImageElement>('.shrine-dot__photo')];
      await Promise.all(
        imgs.map(
          (img, i) =>
            new Promise<void>((resolve) => {
              img.addEventListener('load', () => resolve(), { once: true });
              img.addEventListener('error', () => resolve(), { once: true });
              img.src = i % 2 === 0 ? (land as string) : (port as string);
            }),
        ),
      );
      /* One frame, so layout has run against the new intrinsic sizes. */
      await new Promise((r) => requestAnimationFrame(() => r(null)));

      return imgs.map((img) => {
        const r = img.getBoundingClientRect();
        const pin = (img.parentElement as HTMLElement).getBoundingClientRect();
        return {
          w: +r.width.toFixed(2),
          h: +r.height.toFixed(2),
          pinW: +pin.width.toFixed(2),
          pinH: +pin.height.toFixed(2),
          natW: img.naturalWidth,
          natH: img.naturalHeight,
        };
      });
    },
    [landscape, portrait],
  );
}

test.describe('a marker photograph is a circle, not an ellipse', () => {
  test('the map still draws photo pins at all', async ({ page }) => {
    /* The premise, asserted rather than assumed — the same guard the fan spec
       opens with. If the dataset ever ships without image URLs, or the photo
       pin is replaced by something else, the tests below stop meaning anything
       and this one says so instead of passing over an empty set. */
    await loadMap(page);
    const count = await page.locator('.shrine-dot__photo').count();
    expect(count, 'no photo pins on the map — the rest of this file is vacuous').toBeGreaterThan(
      20,
    );
  });

  test('an extreme aspect ratio is cropped by the frame, not drawn by the picture', async ({
    page,
  }) => {
    await loadMap(page);
    const boxes: Box[] = await measureWithInjectedShapes(page, svg(240, 80), svg(80, 240));

    const injected = boxes.filter((b) => b.natW > 0);
    expect(
      injected.length,
      'the injected pictures never decoded — measuring nothing',
    ).toBeGreaterThan(20);

    /* Square, because the frame is round. This is the assertion the ellipse
       failed: with Leaflet's `width: auto` winning, a 3:1 picture rendered
       78×26 and a 1:3 picture 8.7×26. */
    const notSquare = injected.filter((b) => Math.abs(b.w - b.h) > 0.5);
    expect(
      notSquare.length,
      `${notSquare.length} of ${injected.length} marker photographs are not square — ` +
        `border-radius: 50% draws those as ellipses (first: ${notSquare[0]?.w}×${notSquare[0]?.h})`,
    ).toBe(0);

    /* And inside the pin. A photograph that is square can still be too big;
       these are separate failures and the ellipse bug produced both. */
    const spilling = injected.filter((b) => b.w > b.pinW + 0.5 || b.h > b.pinH + 0.5);
    expect(
      spilling.length,
      `${spilling.length} marker photographs render outside their pin ` +
        `(first: ${spilling[0]?.w}×${spilling[0]?.h} in ${spilling[0]?.pinW}×${spilling[0]?.pinH})`,
    ).toBe(0);
  });

  test('the override is still load-bearing', async ({ page }) => {
    /* If a Leaflet upgrade drops `width: auto` from the marker pane, the
       override in `map.css` becomes dead weight and the long comment above it
       becomes a description of something that no longer happens. This project
       has been bitten by exactly that — a standing finding quoted as current
       for weeks after it stopped being true — so the redundancy is asserted
       rather than left to be discovered.
       Failing here means: delete the override and this test, not fix them. */
    await loadMap(page);
    const leafletStillSizesMarkerImages = await page.evaluate(() => {
      for (const sheet of document.styleSheets) {
        let rules: CSSRuleList;
        try {
          rules = sheet.cssRules;
        } catch {
          continue;
        }
        for (const rule of rules) {
          const style = (rule as CSSStyleRule).style;
          const selector = (rule as CSSStyleRule).selectorText;
          if (!selector || !style) continue;
          if (selector.includes('.leaflet-marker-pane img') && style.width === 'auto') return true;
        }
      }
      return false;
    });
    expect(
      leafletStillSizesMarkerImages,
      'Leaflet no longer sets width:auto on marker-pane images — the map.css override can go',
    ).toBe(true);
  });
});
