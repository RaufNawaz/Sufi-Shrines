import { test, expect } from './fixtures';

/**
 * No untranslated English in the Urdu view — over every route, and without the
 * exemption that made the old check nearly blind.
 *
 * The existing sweep (payload.spec.ts) ran on five order pages and allowed
 * `.coords, a, bdi, [data-latin]`. **`a` exempted every anchor on the site**,
 * and a large share of this interface is anchors. Removing it and measuring:
 * 328 leaks on the map route alone — the entire `#shrine-directory`, a
 * screen-reader-only list of all 169 shrines, announcing English names and
 * English locations on the Urdu site. Built for screen-reader users, invisible
 * to every screenshot, and waved through by the one guard meant to catch it.
 * That is the seventh instance of a check looking at the wrong universe
 * (HANDOVER §9.29, §9.38, §9.39, §9.40, §9.46, §9.51, §9.54).
 *
 * `bdi` is not an exemption here either, and that is the substantive change.
 * `<bdi>` is a *bidi* tool: it isolates a Latin run so the surrounding Urdu
 * does not reorder around it, and mixed-script text needs it whether or not the
 * run is translated. Letting it double as "this is deliberately untranslated"
 * meant the fix for any leak was to wrap it — which satisfies the check and
 * changes nothing for the reader.
 *
 * So the declaration is `data-latin`, and it is deliberately countable. The
 * budget below is the current debt, route by route. It may shrink. It may not
 * grow: a new `data-latin` is a decision to ship English to an Urdu reader, and
 * that should cost a line in a test rather than nothing at all.
 */

/**
 * Elements whose Latin text is not this project's to translate.
 *
 * Leaflet's attribution names Leaflet, OpenStreetMap and CARTO — rewriting a
 * library's self-attribution is not localisation, and an attribution has to
 * stay verbatim to be an attribution. The basemap picker's entries pair a
 * translated descriptor with a provider name (`وائجر (CARTO)`), on the same
 * footing as a bibliography entry: a reader chasing the source needs the exact
 * string.
 */
const NOT_OURS = ['.leaflet-control-attribution', '.leaflet-control-layers'];

/**
 * Latin text declared as untranslated *source* data, counted per route.
 *
 * Each number is a count of text nodes under a `data-latin` element, measured
 * against the CSV fixture — so each is a claim that can go stale. The assertion
 * is `<=`: a route that drops below its number should have the number lowered
 * with it, and a route that needs a higher one is making a decision to show an
 * Urdu reader more English, which should cost a line in a test.
 *
 * What is behind them today, largest first:
 *
 * - `graph` (253) — figure and order labels from the knowledge graph, in the
 *   SVG and its accessible link list. Some are not names at all but phrases
 *   lifted from a source quote ("the princess Jahanara", "founder of the
 *   Rashidi order"). Inventing Urdu for those would break RULE 2. SVG `<text>`
 *   cannot carry `<bdi>` either, which is why NetworkGraph has
 *   `labelDirection()`.
 * - the five `order` pages (41 / 30 / 24 / 16 / 7) — alt-names and branch
 *   names. Each order carries a different set of figures, which is why all five
 *   are here rather than one standing in for the rest.
 * - `almanac` (39) — the observance strings the sheet records. **Was 87.**
 *   `OBSERVANCES` in urdu-i18n/build_dictionary.py now covers the 33 most
 *   common segments ("Annual urs", "daily langar", "Maha Shivratri"), which the
 *   almanac and the shrine infobox both look up segment by segment via
 *   localizeObservance. What is left is the long tail: 157 segments that occur
 *   once each, several of them a sentence long.
 * - `saint` (14) — honorific chips and the alt-name list.
 * - `about` (7) — licence names, the contact address, the repository URL. Latin
 *   by nature, like a citation.
 * - `map` (7) / `shrine` (2) — the Location column, which on several
 *   field-survey rows is a paragraph of English qualification rather than a
 *   place name.
 * - `place` (36) — the Location column again, once per site listed, plus the
 *   language toggle's own "EN". The place page shows each site's Location
 *   verbatim beneath its name, and on the densest place (Lahore, 35 sites) that
 *   is 35 runs. Deliberate: the Location string is what the survey recorded,
 *   and paraphrasing it into Urdu would be translating data rather than
 *   interface. Counted, not estimated — the first number here was 35, one short,
 *   because the toggle is on every route and so is invisible in every other
 *   budget.
 * - `coverage` (1) — one category value the sheet still holds as "Islam"
 *   instead of "Muslim Shrine"; drops to 0 when
 *   data/patch_data_hygiene_2026-08-21.csv is imported.
 */
const BUDGET: Record<string, number> = {
  map: 7,
  shrine: 2,
  saint: 14,
  order: 41,
  'order:chishtiyya': 24,
  'order:suhrawardiyya': 30,
  'order:naqshbandiyya': 16,
  'order:qalandariyya': 7,
  graph: 253,
  almanac: 39,
  coverage: 1,
  about: 7,
  place: 36,
};

/* All five orders, not one: they came from the sweep this file replaced
   (payload.spec.ts), and each carries a different set of figures, so a single
   order page proves nothing about the other four. */
const ROUTES = [
  { name: 'map', path: '/?lang=ur', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar?lang=ur', ready: 'h1.shrine-title' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh?lang=ur', ready: 'h1.entity-title' },
  { name: 'order', path: '/order/qadiriyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:chishtiyya', path: '/order/chishtiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:suhrawardiyya', path: '/order/suhrawardiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:naqshbandiyya', path: '/order/naqshbandiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:qalandariyya', path: '/order/qalandariyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'graph', path: '/graph?lang=ur', ready: 'h1.entity-title' },
  { name: 'almanac', path: '/almanac?lang=ur', ready: 'h1' },
  { name: 'coverage', path: '/coverage?lang=ur', ready: 'h1.entity-title' },
  { name: 'place', path: '/place/lahore?lang=ur', ready: 'h1.entity-title' },
  { name: 'about', path: '/about?lang=ur', ready: 'h1.entity-title' },
] as const;

test.describe('the Urdu view carries no undeclared English', () => {
  for (const route of ROUTES) {
    test(`${route.name} is Urdu, or says where it is not`, async ({ page }) => {
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor();

      const { undeclared, declared } = await page.evaluate((notOurs) => {
        const undeclared: string[] = [];
        let declared = 0;
        const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          const text = (node.textContent || '').trim();
          if (!text) continue;
          // URLs and decimal coordinates are Latin by nature.
          const stripped = text.replace(/https?:\/\/\S+/g, '').replace(/[-+]?\d+\.\d+/g, '');
          if (!/[A-Za-z]/.test(stripped)) continue;
          const el = node.parentElement;
          if (!el) continue;
          if (el.closest('.coords')) continue;
          if (notOurs.some((sel) => el.closest(sel))) continue;
          if (el.closest('[data-latin]')) {
            declared += 1;
            continue;
          }
          const cls = typeof el.className === 'string' ? el.className.split(' ')[0] : '';
          undeclared.push(
            `<${el.tagName.toLowerCase()}${cls ? '.' + cls : ''}> ${text.slice(0, 70)}`,
          );
        }
        return { undeclared: [...new Set(undeclared)], declared };
      }, NOT_OURS);

      expect(
        undeclared,
        'English in the Urdu view. Add the string to src/lib/i18n/uiStrings.ts if it is ' +
          'interface copy, or to the dictionary if it is a name. If it is untranslated ' +
          'source data that must be shown as recorded (RULE 2), mark the element ' +
          '`data-latin` and raise this route’s number in BUDGET — deliberately, because ' +
          'that is a decision to show an Urdu reader English.',
      ).toEqual([]);

      const budget = BUDGET[route.name]!;
      expect(
        declared,
        `${route.name} declares ${declared} Latin runs against a budget of ${budget}. ` +
          'If the debt genuinely grew, raise the number and say why. If it shrank, lower it.',
      ).toBeLessThanOrEqual(budget);
    });
  }
});
