import type { Page } from '@playwright/test';
import { test, expect } from './fixtures';

/**
 * A photograph the browser cannot fetch, and what the page offers instead.
 *
 * ## What a reader got before this
 *
 * Measured 31 August 2026 on the running site, at `/shrine/gurdwara-sacha-sauda`,
 * whose only photograph 404s. The gallery rendered **one tile, and the tile was a
 * `<button>` announcing itself as "Image 1: Open image"**, wrapping a
 * category-tinted placeholder. Pressing it opened the lightbox full-screen over a
 * broken image containing **no text at all** — `innerText` was the empty string.
 *
 * So a sighted reader was invited to open a picture that does not exist and got a
 * blank overlay; a screen-reader user was told there was an image, and then
 * handed an empty dialog. Three entries were in that state (Gurdwara Sacha Sauda,
 * Shrine of Sachal Sarmast, Garh Maharaja), each with exactly one image field
 * and a dead URL.
 *
 * It is not a fixed list, which is why this is a behaviour test rather than a
 * data check: `pipeline/check_image_liveness.py` went from 53 dead to 54 in four
 * days when a host's certificate expired. Any entry can arrive here with nothing
 * changing in this repository.
 *
 * ## What it does now, and why that shape
 *
 * A photograph that cannot be fetched is treated as a photograph the archive does
 * not have — because that is what it is, and because **51 entries already have no
 * photograph and their pages simply have no gallery section**. Rendering the two
 * cases identically is the honest answer and needs no new sentence; a tile reading
 * "photograph unavailable" would mean authoring it in Urdu (RULE 2) to say
 * something `/about` already reports in aggregate.
 *
 * ## Why the failures are injected rather than borrowed
 *
 * Pointing a test at a URL that is dead today makes it pass for a reason outside
 * the repository, and go green the day someone fixes the host. These routes are
 * intercepted, so the test states its own premise.
 *
 * ## The premise that has to be arranged, not assumed
 *
 * Gallery images are `loading="lazy"` and the gallery sits below a long article,
 * so **on an untouched page the browser never requests them at all** — nothing is
 * fetched, so nothing can fail, so the fix looks broken. Three drafts of this file
 * asserted against a page whose images had never been attempted. Every test here
 * scrolls the gallery into view first, and that line is load-bearing rather than
 * cosmetic.
 */

/** Bring the lazy images into view and let them resolve. Without this the
 *  browser never asks for them and no failure can occur. */
async function loadGallery(page: Page) {
  await page.locator('.infobox-row').first().waitFor({ timeout: 30_000 });
  await page
    .locator('#gallery')
    .scrollIntoViewIfNeeded()
    .catch(() => {
      /* Already gone, which is what one of these tests is asserting. */
    });
  await page.waitForTimeout(1500);
}

test.describe('a photograph that cannot be fetched', () => {
  test('does not leave a button promising to open it', async ({ page }) => {
    /* Both of this entry's fixture photographs fail, which is the shape three
       live entries are in: one image field, and the URL is dead. */
    await page.route('**/photos/abul-muali-qadri/**', (route) => route.fulfill({ status: 404 }));
    await page.goto('/shrine/darbar-abul-muali-qadri');
    await loadGallery(page);

    /* The whole section goes, heading included — the same nothing an entry with
       no photograph at all renders. */
    await expect(page.locator('#gallery')).toHaveCount(0, { timeout: 15_000 });
    await expect(page.locator('.gallery-item')).toHaveCount(0);

    /* And nothing is left claiming to be an openable image. This is the exact
       string a screen reader was given over a picture that does not exist. */
    await expect(page.getByRole('button', { name: /open image/i })).toHaveCount(0);
  });

  test('keeps the photographs that do load, when only one of two fails', async ({ page }) => {
    /* The case the first attempt at this got wrong. Matching a failed <img> to
       its row by URL prefix marked the wrong one dead — every Wikimedia Commons
       URL here shares 43 leading characters — so an entry with one dead image and
       one good one lost the good one. */
    /* One named file, not "the first request". The browser asked for
       `-01.jpg` twice in a measured run, so a counter that fails the first
       request lets the retry succeed and the entry keeps both photographs. */
    await page.route('**/abul-muali-qadri-01.jpg*', (route) => route.fulfill({ status: 404 }));
    await page.goto('/shrine/darbar-abul-muali-qadri');
    await loadGallery(page);

    await expect(page.locator('#gallery')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.gallery-item')).toHaveCount(1, { timeout: 15_000 });
  });

  test('leaves a working gallery alone', async ({ page }) => {
    /* The control. Without it, a change that hid every gallery would pass the
       two tests above and look like a fix. */
    await page.goto('/shrine/darbar-abul-muali-qadri');
    await loadGallery(page);
    await expect(page.locator('#gallery')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.gallery-item')).toHaveCount(2, { timeout: 15_000 });
  });
});
