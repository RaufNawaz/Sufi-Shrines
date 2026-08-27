import { test, expect, settle } from './fixtures';

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
 * - `graph` (49) — figure and order labels from the knowledge graph, in the
 *   SVG and its accessible link list. Some are not names at all but phrases
 *   lifted from a source quote ("the princess Jahanara", "founder of the
 *   Rashidi order"). Inventing Urdu for those would break RULE 2. SVG `<text>`
 *   cannot carry `<bdi>` either, which is why NetworkGraph has
 *   `labelDirection()`.
 *
 *   **49 → 122.** The explorer gained "Named in a lineage, not documented here":
 *   the 60 figures the archive holds no entry for, who until now were reachable
 *   only by already walking the chain that names them — Prince Dara Shikoh among
 *   them. Unlike the archive's own figures, most of these names are *not* in the
 *   Urdu dictionary: they are masters named in a source and nothing else, so
 *   RULE 2 shows them as recorded rather than transliterating them. Two runs per
 *   row (the name, and "teacher of X" / "disciple of Y" — the fact that makes an
 *   unfamiliar name mean something), and the note carries a second untranslated
 *   name inside it. This is the archive being honest about what it has not
 *   translated, on 60 rows it previously did not show at all.
 *
 *   **Was 253.** The teacher-disciple list used to print all 86 recorded edges,
 *   each with its verbatim source quote, regardless of which order the chips
 *   above had selected — a filter that half the page ignored, and the long half
 *   at that. Scoped to the selected order it shows 17 for the Chishtiyya, and
 *   the declared Latin falls with it. Lowered rather than left: this file's own
 *   rule is that a number which shrank should shrink, and 253 standing over a
 *   page declaring 49 is how a budget stops describing anything.
 * - the five `order` pages (41 / 30 / 24 / 16 / 7) — alt-names and branch
 *   names. Each order carries a different set of figures, which is why all five
 *   are here rather than one standing in for the rest.
 * - `almanac` (39) — the observance strings the sheet records. **Was 87.**
 *   `OBSERVANCES` in urdu-i18n/build_dictionary.py now covers the 33 most
 *   common segments ("Annual urs", "daily langar", "Maha Shivratri"), which the
 *   almanac and the shrine infobox both look up segment by segment via
 *   localizeObservance. What is left is the long tail: 157 segments that occur
 *   once each, several of them a sentence long.
 * - `saint` (16) — honorific chips and the alt-name list (14), plus the two
 *   runs of the one lineage edge this figure has: the verbatim quote and its
 *   `<cite>`. **Was 14.** SaintPage now prints the evidence under each
 *   recorded teacher and each order membership, which `/graph` had been doing
 *   all along — so the figure's own page held its claims to a *lower*
 *   standard of provenance than the graph-wide dump. i18n rule 7 makes that
 *   quote Latin on purpose: it is the entire basis for trusting an unreviewed
 *   edge, and paraphrasing it into Urdu would destroy the reader's search
 *   string. Counted on `/saint/data-ganj-bakhsh`, whose graph holds one
 *   `disciple_of` edge and no order membership; a figure with a compound
 *   silsila declares more, which is why the number belongs to this route
 *   rather than to the page type.
 *   **16 → 17** when the chain of transmission was added: one more run for the
 *   teacher's name at the first remove, which is the same figure already named
 *   under `Teachers` — a chain repeats its links by construction, and the
 *   dictionary does not carry this one.
 * - `saint:multi-order` (22) — the same page type with the sections the first
 *   figure has none of. Counted, not estimated: 3 lineage/membership quotes
 *   with 3 `<cite>`s (6), the branch chip on each of his two order edges (2),
 *   his row's own silsila cell — once, deduped across both edges, and a
 *   sentence long (1), 8 figure and order names the dictionary does not carry,
 *   the network diagram's `<title>`/`<text>`/`<a>` for one such name (3), and
 *   the language toggle's "EN" (1), and the one name at the first remove of
 *   his chain of transmission (1). Nothing here is prose: every run is a
 *   source's words, a person's name, or a citation.
 * - `saint:lineage-only` (24) — the third saint-page shape, and the densest in
 *   declared Latin of any page in this file. Counted, not estimated: his own
 *   name at 3 sites (breadcrumb, title, infobox), which the Urdu dictionary does
 *   not carry; 4 alt-name runs; 2 honorific chips; 6 runs for his one recorded
 *   teacher (the Teachers list, the chain of transmission, the link, and the
 *   network diagram's `<title>`, `<text>` and `<a>`); 2 lineage quotes with 2
 *   `<cite>`s; the 3 network-diagram runs for his own name; the file his
 *   biography was read out of (1); and the language toggle's "EN" (1).
 *
 *   **28 → 24.** His recorded birth and death used to be Latin at 2 sites each:
 *   "۱۱ Rabīʿ al-Sānī ۷۲۹ AH" — Eastern digits around a Latin month, which is
 *   worse than either language alone. `localizeRecordedDate` now substitutes the
 *   Hijri month and the calendar marker in place, which is safe for a date and
 *   is refused for prose: Urdu writes day-month-year in that same order, so
 *   nothing is reordered and no word-order decision is being made. The four
 *   runs are gone rather than merely declared.
 *
 *   **This route is why the budget list has three saint pages.** Adding it
 *   turned up 9 *undeclared* runs on a page shape the other two never exercise:
 *   a figure whose name the dictionary lacks had that name printed raw in the
 *   breadcrumb, the `<h1>` and the infobox, and his Hijri dates printed raw
 *   twice each. Both saint pages already scanned happen to have translated
 *   names, so the title of most figures' pages was an undeclared Latin run for
 *   as long as this guard has existed. A budget file is only as wide as its
 *   route list.
 * - `about` (74) — **was 7, and `coverage`'s 68 is gone from this list.** The
 *   two pages merged on 24 August 2026: `/coverage` is a redirect into `/about`
 *   now, so measuring both measured the same document twice, under two names
 *   and two different budgets. 7 of the 74 are what /about always had — licence
 *   names, the contact address, the repository URL, Latin by nature. The other
 *   67 came with "What the archive rests on": the 28 sources that more than one
 *   entry cites, printed as the citations they are. i18n rule 7 makes this the
 *   one place Latin is not a debt at all — a bibliography entry carries the
 *   source's real title, publisher and edition, and it is the exact string a
 *   reader needs in order to go and check. Far more than 28 runs because the
 *   emphasis inside a citation is rendered rather than printed as asterisks, so
 *   "Alam Faqri, *Tazkirah Awliya-e-Pakistan* (Lahore)" is three runs: the
 *   author, the italicised title, and the rest. Splitting it that way is what
 *   makes a book title read as a book title.
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
 *   One of the 74 is not a citation and not a licence: a category value the
 *   sheet still holds as "Islam" instead of "Muslim Shrine". It was listed
 *   against `coverage` while that route existed. It drops when
 *   data/patch_data_hygiene_2026-08-21.csv is imported.
 */
const BUDGET: Record<string, number> = {
  map: 7,
  // 2 → 10, raised 23 Aug 2026 when the two branches merged. Deliberately, and
  // this is what each of the eight is:
  //   · 3 Auqaf mosque names and one city (NearbyMosques) — the women's-prayer
  //     block reads a second sheet this project does not translate;
  //   · 4 citation strings (CiteThisEntry) — a BibTeX key and a `@misc{…}`
  //     record. i18n rule 7 makes citations Latin on purpose: a reader chasing a
  //     source needs the exact string.
  // Neither is interface copy, and neither is prose. What *was* interface copy —
  // the print footer's raw "Field-verified" — is now translated through
  // SUPPORT_LEVEL_LABEL_KEYS rather than declared.
  shrine: 10,
  saint: 17,
  'saint:multi-order': 23,
  // The order pages gained two things from the same merge: each member's dates
  // rendered verbatim ("8 Muharram 1040 AH / 8 August 1630 CE" — a hedged phrase
  // the dictionary cannot carry without paraphrasing it, RULE 2), and shrine
  // tags whose Urdu name is unknown, where the fallback title-cases the slug.
  // Both are now declared at the element instead of passing as untagged text.
  // Measured on the settled page, which is the only number that means anything
  // here: the member list grows as data arrives, so a page sampled early
  // declares fewer runs than the same page a moment later. Every route whose
  // markup this merge did not touch measures exactly its pre-merge number,
  // which is what makes these five trustworthy.
  // Raised 26 August 2026 by exactly the ʿurs list's own runs — +11 / +7 / +6 /
  // +5 / +1, measured route by route with the walker below. The new section
  // prints each observance's `Events` cell verbatim beside the date read out of
  // it, the way the almanac's own cards do, and `localizeObservance` translates
  // that cell segment by segment: "سالانہ عرس؛ نعت اور قوالی؛ روزانہ لنگر"
  // arrives whole, while "Eid Milad-un-Nabi (principal gathering)" has no
  // dictionary entry and stays as the surveyor wrote it (RULE 2 — a visibly
  // untranslated observance beats a confidently wrong one). Each of these is a
  // segment the observance dictionary does not yet carry, so the number falls as
  // `urdu-i18n/build_dictionary.py` gains entries. Hiding the cell from an Urdu
  // reader would have cost nothing here and would have made the Urdu view the
  // one that cannot check the archive's arithmetic.
  order: 77,
  'order:chishtiyya': 43,
  'order:suhrawardiyya': 51,
  'order:naqshbandiyya': 32,
  'order:qalandariyya': 11,
  graph: 122,
  almanac: 39,
  'saint:lineage-only': 24,
  about: 74,
  place: 36,
};

/* All five orders, not one: they came from the sweep this file replaced
   (payload.spec.ts), and each carries a different set of figures, so a single
   order page proves nothing about the other four. */
const ROUTES = [
  { name: 'map', path: '/?lang=ur', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar?lang=ur', ready: 'h1.shrine-title' },
  { name: 'saint', path: '/saint/data-ganj-bakhsh?lang=ur', ready: 'h1.entity-title' },
  /* A second figure, for the same reason all five orders are here: the two
     saint pages render different sections. Data Ganj Bakhsh has one lineage
     edge and no recorded order; Wasif Ali Wasif holds two silsilas at once and
     his row's own silsila cell is a sentence long — the exact shape that used
     to render as one order and no source wording. */
  {
    name: 'saint:multi-order',
    path: '/saint/hazrat-wasif-ali-wasif?lang=ur',
    ready: 'h1.entity-title',
  },
  /* A third figure, for the page shape neither of the others has: no site in
     this archive, and a biography read out of a drafted entry file. That file
     path is the only Latin on the page that is neither a name nor a quote — it
     is a citable location, which i18n rule 7 puts on the same footing as a
     bibliography entry, and it must stay declared rather than paraphrased. */
  {
    name: 'saint:lineage-only',
    path: '/saint/shah-gohar-peer?lang=ur',
    ready: 'h1.entity-title',
  },
  { name: 'order', path: '/order/qadiriyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:chishtiyya', path: '/order/chishtiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:suhrawardiyya', path: '/order/suhrawardiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:naqshbandiyya', path: '/order/naqshbandiyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'order:qalandariyya', path: '/order/qalandariyya?lang=ur', ready: 'h1.entity-title' },
  { name: 'graph', path: '/graph?lang=ur', ready: 'h1.entity-title' },
  { name: 'almanac', path: '/almanac?lang=ur', ready: 'h1' },
  { name: 'place', path: '/place/lahore?lang=ur', ready: 'h1.entity-title' },
  { name: 'about', path: '/about?lang=ur', ready: 'h1.entity-title' },
] as const;

test.describe('the Urdu view carries no undeclared English', () => {
  for (const route of ROUTES) {
    test(`${route.name} is Urdu, or says where it is not`, async ({ page }) => {
      await page.goto(route.path);
      await page.locator(route.ready).first().waitFor();
      await settle(page);

      const sample = (notOurs: string[]) =>
        page.evaluate((notOurs) => {
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
        }, notOurs);

      /* Sampled until it stops moving, not once.
       *
       * Some declarations are conditional on a translation *not* having
       * happened: an order page's recorded dates and its shrine tags carry
       * `data-latin` only where `translateToUrdu` returned its input unchanged.
       * The Urdu dictionary is language-gated and arrives as its own chunk, so
       * a page sampled before it lands declares more Latin than the same page a
       * moment later — this route measured 7 locally and 10 in CI, on the same
       * commit, which is a race and not a regression. The budget describes the
       * settled page, so that is what gets measured. */
      let undeclared: string[] = [];
      let declared = -1;
      let steady = 0;
      for (let i = 0; i < 24; i++) {
        const next = await sample(NOT_OURS);
        steady = next.declared === declared ? steady + 1 : 0;
        ({ undeclared, declared } = next);
        if (steady >= 3 && i >= 6) break;
        await page.waitForTimeout(250);
      }

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
