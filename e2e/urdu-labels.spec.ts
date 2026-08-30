import { test, expect } from './fixtures';

/**
 * The Urdu view's *attributes*, which the no-leak guard cannot see.
 *
 * `urdu-no-leak.spec.ts` builds its walker with `NodeFilter.SHOW_TEXT`, so it
 * visits text nodes and never attributes. That is the right shape for what it
 * asserts and it leaves a whole surface unwatched: an `aria-label`, a `title` or
 * an `alt` is read aloud, and nothing on screen looks wrong when one is in the
 * wrong language. No screenshot and no visual review will ever surface it.
 *
 * Found on 30 August 2026 by sweeping the attributes directly:
 * `aria-label="Breadcrumb"` on `/typology` and `/chronology`, in English, in the
 * Urdu view — the only two of ten breadcrumbs not using `t('ariaBreadcrumb')`.
 * An Urdu screen-reader user navigating by landmark heard the English word.
 *
 * Third-party map chrome is excluded rather than budgeted: MapLibre's canvas
 * label and Leaflet's attribution titles are not ours to translate, and pinning
 * their text here would fail on a library upgrade for no reader's benefit.
 */
const ROUTES = [
  '/typology',
  '/chronology',
  '/about',
  '/almanac',
  '/graph',
  '/shared-ground',
  '/settings',
  '/shrine/data-darbar',
  '/saint/data-ganj-bakhsh',
  '/order/qadiriyya',
  '/place/lahore',
  '/tradition/nath',
];

/** Values that are Latin by nature or belong to a third party. */
const NOT_OURS = [
  '.leaflet-container',
  '.maplibregl-map',
  '.coords',
  '[data-latin]',
  '.lang-toggle-segment',
];

for (const route of ROUTES) {
  test(`[ur] no English in the labels a screen reader reads: ${route}`, async ({ page }) => {
    await page.goto(`${route}?lang=ur`);
    await page.locator('h1').first().waitFor();

    const leaks = await page.evaluate((notOurs) => {
      const found: string[] = [];
      for (const el of Array.from(document.querySelectorAll('*'))) {
        if (notOurs.some((sel) => el.closest(sel))) continue;
        for (const attr of ['aria-label', 'title', 'alt', 'aria-valuetext', 'placeholder']) {
          const value = el.getAttribute(attr);
          if (!value) continue;
          /* A URL, a coordinate or a bare number is Latin by nature. Anything
             that survives this strip is a word. */
          const stripped = value
            .replace(/https?:\/\/\S+/g, '')
            .replace(/[-+]?\d+(\.\d+)?/g, '')
            .trim();
          if (!/[A-Za-z]{2,}/.test(stripped)) continue;
          found.push(`${el.tagName.toLowerCase()}[${attr}] = ${value.slice(0, 60)}`);
        }
      }
      return found;
    }, NOT_OURS);

    /* Shrine and figure names are the archive's own data and are budgeted by
       the text-node guard next door; this spec is about *interface* copy, so a
       leak here is a hardcoded English string in a component. The list is
       printed in full because that is what makes the failure actionable. */
    expect(leaks, `English interface labels in the Urdu view:\n  ${leaks.join('\n  ')}`).toEqual(
      [],
    );
  });
}
