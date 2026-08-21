import { test, expect } from './fixtures';

/**
 * The Urdu site's *accessible* layer must be Urdu too.
 *
 * The no-English-leak guard walks text nodes under `[dir='rtl']`. An accessible
 * name is not a text node, so it walked straight past twenty-six English
 * literals: every breadcrumb landmark, "Shrine browser", "Open sidebar",
 * "Clear search", "Filter by category", "Previous image", "Reading progress",
 * "Dismiss", Leaflet's "Zoom in" / "Zoom out" / "Layers", and
 * `Category: ${cat}` interpolated with the *raw English* category while the
 * heading beside it rendered the Urdu one. An Urdu screen-reader user got an
 * English interface with Urdu content inside it — and the project's stated bar
 * is that Urdu is a first-class edition, not a translation layer.
 *
 * Two of the six instances of this pattern found in a week (HANDOVER §9.29,
 * §9.38, §9.39, §9.40, §9.46, §9.51) were guards looking at the wrong
 * universe. So this one names its universe explicitly: the attributes that
 * become an accessible name or a tooltip, on every route, in Urdu.
 *
 * Exemptions, all declared rather than pattern-matched:
 *
 * - `[data-latin]` — the element says its own content is untranslated source
 *   text. The almanac's Location tooltip is the case that matters: it repeats a
 *   field-survey qualification that is often still English, marked `<bdi>` in
 *   the text and `data-latin` on the element so the attribute can declare it
 *   too.
 * - URLs and decimal coordinates, stripped before the test — Latin by nature,
 *   the same exemption CLAUDE.md's i18n rule 6 already grants.
 * - Leaflet's own attribution link, whose `title` is Leaflet's sentence about
 *   itself. Rewriting a library's self-attribution is not localisation.
 * - The basemap picker's layer names, which are provider names (CARTO, Esri,
 *   MapTiler). Recorded as a known gap below rather than silently allowed.
 */

const ROUTES = [
  { name: 'map', path: '/?lang=ur', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar?lang=ur', ready: 'h1.shrine-title' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh?lang=ur', ready: 'h1.entity-title' },
  { name: 'order', path: '/order/qadiriyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'graph', path: '/graph?lang=ur', ready: 'h1.entity-title' },
  { name: 'almanac', path: '/almanac?lang=ur', ready: 'h1' },
  { name: 'coverage', path: '/coverage?lang=ur', ready: 'h1.entity-title' },
  { name: 'about', path: '/about?lang=ur', ready: 'h1.entity-title' },
] as const;

/** Attributes a browser turns into an accessible name, or shows as a tooltip. */
const NAME_ATTRIBUTES = [
  'aria-label',
  'aria-placeholder',
  'aria-roledescription',
  'aria-valuetext',
  'title',
  'alt',
  'placeholder',
];

/**
 * Selectors whose Latin attribute text is not ours to translate.
 *
 * `.leaflet-control-attribution a` is Leaflet describing itself. The layers
 * control's own labels are provider names; they are *not* exempted here —
 * `.leaflet-control-layers-base` is excluded because the panel's inputs carry
 * no name attributes at all, and the visible provider names are covered by the
 * text-node guard when the panel is open, which is a gap this suite records
 * rather than hides (see docs/TODO.md).
 */
const FOREIGN_TO_US = ['.leaflet-control-attribution'];

test.describe('accessible names are Urdu under ?lang=ur', () => {
  for (const route of ROUTES) {
    test(`${route.name} announces itself in Urdu`, async ({ page }) => {
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor();

      const leaks = await page.evaluate(
        ({ attrs, foreign }) => {
          const found: string[] = [];
          for (const el of Array.from(document.querySelectorAll('*'))) {
            // The element, or an ancestor, has declared its content Latin.
            if (el.closest('[data-latin]')) continue;
            if (foreign.some((sel) => el.closest(sel))) continue;
            for (const attr of attrs) {
              const raw = el.getAttribute(attr);
              if (!raw) continue;
              const stripped = raw
                .replace(/https?:\/\/\S+/g, '') // URLs
                .replace(/[-+]?\d+\.\d+/g, ''); // decimal coordinates
              if (!/[A-Za-z]/.test(stripped)) continue;
              const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
              found.push(`<${el.tagName.toLowerCase()}${cls ? '.' + cls : ''} ${attr}="${raw}">`);
            }
          }
          return [...new Set(found)];
        },
        { attrs: NAME_ATTRIBUTES, foreign: FOREIGN_TO_US },
      );

      expect(
        leaks,
        'these accessible names are English on the Urdu site. Add a key to ' +
          'src/lib/i18n/uiStrings.ts (or a tFn entry if a value is interpolated — the ' +
          'variable does not sit in the same place in both languages). If the text is ' +
          'untranslated *source* data rather than interface copy, mark the element ' +
          '`data-latin`, as the almanac Location tooltip does.',
      ).toEqual([]);
    });
  }
});
