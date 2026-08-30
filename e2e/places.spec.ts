import { test, expect } from './fixtures';
import { UI_TEXT } from '../src/lib/i18n/uiStrings';
/* The Urdu table is a lazily-loaded chunk in the app, so `UI_TEXT.ur` is
   `UiStrings | undefined` there. A spec asserting the Urdu view's copy wants the
   table itself; a static import in a test does not reach the bundle. */
import { UI_TEXT_UR } from '../src/lib/i18n/uiStrings.ur';

/**
 * Places as entities — Track B.
 *
 * The point of the feature is that a reader can get *from* a shrine *to* the
 * place it stands in and back, in either language, and that the page says only
 * what the data supports. So the journey is what is tested, not the component:
 * the /coverage index links to a place, the place lists its sites, each site
 * links back, and the shrine page offers the place again.
 *
 * The one thing a unit test cannot cover here is that the pills and the index
 * are *reachable*: `/place/lahore` was routed and prerendered before anything
 * linked to it, which is a page nobody would ever have found.
 */

const LAHORE_MIN_SITES = 20;

test.describe('places', () => {
  test('the places index links to a place page', async ({ page }) => {
    await page.goto('/about');
    await page.locator('h1.entity-title').waitFor();

    const links = page.locator('.coverage-place-link');
    // Polled, not counted once: /about is prerendered, so the first HTML the
    // browser paints has no place list at all — it is built from the dataset
    // after hydration.
    await expect.poll(() => links.count(), { timeout: 15000 }).toBeGreaterThanOrEqual(20);

    // Lahore is the densest place in the archive, so it heads the index.
    const first = links.first();
    await expect(first).toContainText('Lahore');
    await first.click();

    await expect(page).toHaveURL(/\/place\/lahore$/);
    await expect(page.locator('h1.entity-title')).toHaveText('Lahore');
  });

  test('a place page lists its sites, its traditions and its date span', async ({ page }) => {
    await page.goto('/place/lahore');
    await page.locator('h1.entity-title').waitFor();

    /* `.place-site-list .inset-row`, not `.place-site`. Commit 9556adf put the
       place page on the shared inset-list idiom and renamed the row class; this
       spec kept the old selector and matched nothing, so both assertions below
       had been reading an empty list rather than a wrong one. Scoped to
       `.place-site-list` so it cannot start counting some other inset list that
       lands on this page later. */
    const sites = page.locator('.place-site-list .inset-row');
    expect(await sites.count()).toBeGreaterThanOrEqual(LAHORE_MIN_SITES);

    // More than one tradition, which is the argument for the page existing.
    expect(await page.locator('.place-tradition').count()).toBeGreaterThan(1);

    // Every site links to a shrine page that exists.
    const href = await sites.first().locator('a').first().getAttribute('href');
    expect(href).toMatch(/\/shrine\/[a-z0-9-]+$/);
    await sites.first().locator('a').first().click();
    await expect(page.locator('h1.shrine-title')).toBeVisible();
  });

  test('a shrine page offers the places it is recorded in', async ({ page }) => {
    await page.goto('/shrine/data-darbar');
    await page.locator('h1.shrine-title').waitFor();

    const pills = page.locator('.shrine-place-tag');
    expect(await pills.count()).toBeGreaterThanOrEqual(1);
    await expect(pills.first()).toContainText('Lahore');

    await pills.first().click();
    await expect(page).toHaveURL(/\/place\/lahore$/);
    /* …and the place it navigated to lists the shrine it came from. Matched by
       href rather than by text: two of Lahore's entries mention Data Darbar,
       because one of them records its location relative to it. */
    await expect(page.locator('.place-site-list a[href$="/shrine/data-darbar"]')).toBeVisible();
  });

  test('an unknown place says so rather than rendering an empty page', async ({ page }) => {
    // Not a 404: /place/:slug is a real route, and a slug that names no place
    // in the vocabulary is a legitimate URL with nothing behind it.
    await page.goto('/place/no-such-town');
    await expect(page.locator('h1.entity-title')).toHaveText(UI_TEXT.en.placesTitle);
    await expect(page.getByText(UI_TEXT.en.placeNotFound)).toBeVisible();
  });

  test('[ur] the place page and the route to it are Urdu', async ({ page }) => {
    await page.goto('/about?lang=ur');
    await page.locator('h1.entity-title').waitFor();

    /* The index heading is the Urdu word for Places, and the place names in it
       come from the dictionary rather than from the English table.

       Matched exactly, not by substring. Since /coverage and /report merged into
       /about, this page also carries رپورٹ's "خود مقامات کا حال" — which contains
       مقامات, so `hasText` resolved to two headings and failed on strict mode.
       An exact accessible name is the thing being asserted anyway. */
    await expect(
      page.getByRole('heading', { name: UI_TEXT_UR.placesTitle, exact: true }),
    ).toBeVisible();
    const first = page.locator('.coverage-place-link').first();
    await expect(first.locator('.coverage-place-name')).toHaveText('لاہور');

    await first.click();
    await expect(page.locator('h1.entity-title')).toHaveText('لاہور');
    await expect(page.locator('.entity-type-kicker')).toHaveText(UI_TEXT_UR.placeKicker);
    // Eastern numerals reach the counts, like every other number site.
    await expect(page.locator('.place-tradition-count').first()).toHaveText(/[۰-۹]/);
  });

  test('[ur] the shrine page pills are Urdu place names', async ({ page }) => {
    await page.goto('/shrine/data-darbar?lang=ur');
    await page.locator('h1.shrine-title').waitFor();
    await expect(page.locator('.shrine-place-tag').first()).toHaveText('لاہور');
  });
});

test.describe('the photo captions clamp', () => {
  /*
   * A long shrine name must be truncated to two lines with an ellipsis, not cut
   * in half by `overflow: hidden`.
   *
   * The three clamp properties sat on `.place-photo-caption` from the day it
   * shipped and **never applied**: the caption is `position: absolute`, an
   * absolutely positioned box is blockified, and `display: -webkit-box`
   * computes to `flow-root` — which silently disables `-webkit-line-clamp`. The
   * archive's longest name rendered three lines into a two-line box and the
   * third was sliced through the middle, so the tile read as a rendering fault
   * rather than as a truncation.
   *
   * Nothing reported it because **a clamp that does not apply looks exactly
   * like a clamp with nothing to clamp** — every shorter caption was fine, and
   * still is. This asserts the mechanism rather than the appearance, because
   * the appearance is correct for 4 of the 5 captions either way.
   */
  test('a name too long for its tile is clamped, not sliced', async ({ page }) => {
    await page.goto('/place/lahore');
    await page.locator('.place-photo-caption').first().waitFor();

    const captions = await page.evaluate(() =>
      [...document.querySelectorAll('.place-photo-caption')].map((caption) => {
        const inner = caption.querySelector('bdi');
        return {
          text: (caption.textContent ?? '').trim().slice(0, 40),
          /* The symptom: content taller than its own box means the caption is
             being cut rather than clamped. */
          captionOverflows: caption.scrollHeight > caption.clientHeight + 1,
          /* The mechanism: a clamped element *is* shorter than its content —
             that is what clamping means — so on a name too long for two lines
             this must be true. If the clamp stops applying it goes false and
             `captionOverflows` goes true in the same move. */
          innerIsClamped: inner ? inner.scrollHeight > inner.clientHeight + 1 : false,
        };
      }),
    );

    expect(captions.length).toBeGreaterThan(0);
    expect(
      captions.filter((c) => c.captionOverflows),
      'a caption is being sliced by overflow:hidden instead of clamped',
    ).toEqual([]);
    /* Asserted on the *behaviour*, not on `getComputedStyle(...).display`:
       Chrome reports `-webkit-box` back as `flow-root`, so a style check here
       fails against working code and would have to be weakened into
       meaninglessness. Lahore's longest name is three lines in a two-line box,
       so at least one caption must be actively clamping. */
    expect(
      captions.some((c) => c.innerIsClamped),
      'no caption is clamping, so the longest name is not being truncated at all',
    ).toBe(true);
  });
});
