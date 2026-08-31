import { test, expect } from './fixtures';

/**
 * Every whole-archive page is reachable by clicking, not only by typing.
 *
 * ## What was wrong
 *
 * `/chronology` was reachable from **nowhere in the application**. Measured by
 * the IA council on 30 August 2026 across 81 rendered pages at two widths:
 * 0 anchors, 0 buttons, 0 text mentions. Confirmed from the other side —
 * `git log -S 'to="/chronology"'` returns no commit that ever added one, so it
 * was never linked at any point in its life, and `prerender.mjs`'s comment
 * claiming it shipped "prerendered, linked and absent from the sitemap" was
 * wrong in its middle word.
 *
 * Meanwhile it was prerendered, in `sitemap.xml` at priority 0.7, and rendering
 * 171 shrine links. **A crawler could reach the page; a reader could not.**
 *
 * ## Why six e2e specs did not catch it
 *
 * They exercise `/chronology` thoroughly and **every one of them arrives by
 * `page.goto`**. A suite that navigates by URL cannot see that nothing
 * navigates by link — the same blind spot as the Urdu specs that all start from
 * a fresh context and so could not see a defect that needs a dirty start
 * (`datasetFingerprint.test.ts`). This file exists to ask the question the
 * others cannot: not *does the page work*, but *can a reader get to it*.
 *
 * So it asserts the whole set rather than the one route that was broken. The
 * next page added to the archive and left unlinked should fail here, and the
 * failure should name it.
 *
 * ## Where the link went, and what stays declined
 *
 * The welcome card, beside `/typology`: they are the same kind of thing — the
 * whole archive at once, by century and by built form — which is the reason
 * `tabs.ts` already gives for the atlas tab owning both. A sixth *tab* was
 * declined deliberately (`docs/planning/TRACK_C_CHRONOLOGY.md`) and stays
 * declined; this is a link. The card matters most on desktop, where the tab bar
 * is `display: none` and it is the archive's only index.
 */

/** The whole-archive destinations the front door is responsible for. */
const DESTINATIONS = [
  '/almanac',
  '/graph',
  '/typology',
  '/chronology',
  '/shared-ground',
  '/about',
] as const;

test.describe('the front door reaches every whole-archive page', () => {
  test('the explore nav exists at all', async ({ page }) => {
    /* The premise. If the card stops rendering its nav — on a narrow viewport,
       in embed mode, behind a flag — every assertion below would pass over an
       empty set, so this one says so instead. */
    await page.goto('/');
    await expect(page.locator('.welcome-card-links')).toHaveCount(1);
  });

  for (const path of DESTINATIONS) {
    test(`links to ${path}`, async ({ page }) => {
      await page.goto('/');
      await expect(
        page.locator(`.welcome-card-links a[href$="${path}"]`),
        `nothing on the front door links to ${path} — it is reachable only by typing the URL`,
      ).toHaveCount(1);
    });
  }

  test('the chronology link goes where it says', async ({ page }) => {
    /* A link that exists and does not arrive is the same defect wearing a
       different hat — cf. the `?selected=` link that opened a different shrine. */
    await page.goto('/');
    await page.locator('.welcome-card-links a[href$="/chronology"]').click();
    await expect(page).toHaveURL(/\/chronology(\?|$)/);
    await expect(page.locator('h1')).toBeVisible();
  });

  test('an Urdu reader gets the same six, labelled in Urdu', async ({ page }) => {
    /* The parity half. A destination added to the English card and not the Urdu
       one is the failure this project keeps finding, so the count is asserted
       in both languages rather than assumed to be shared. */
    await page.goto('/?lang=ur');
    await expect(page.locator('.welcome-card-links')).toHaveCount(1);

    for (const path of DESTINATIONS) {
      await expect(
        page.locator(`.welcome-card-links a[href$="${path}"]`),
        `the Urdu front door does not link to ${path}`,
      ).toHaveCount(1);
    }

    /* And the labels are Urdu. `chronologyTitle` is reviewed in both languages
       (صدیوں میں آرکائیو), so this link cost no new copy — but a future one
       added with an English-only string would show English here, and that is
       what this asserts. */
    const label = await page.locator('.welcome-card-links a[href$="/chronology"]').innerText();
    expect(label.trim(), 'the chronology link is labelled in English in the Urdu view').not.toMatch(
      /[A-Za-z]/,
    );
  });
});
