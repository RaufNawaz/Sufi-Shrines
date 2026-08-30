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
 *   **74 → 102 on 30 August 2026, and the rise decomposes exactly.** "Counted
 *   by book" lists the 14 works behind those citations, each as a title and an
 *   author: 14 × 2 = 28, and 74 + 28 = 102. Not a syllable of new English —
 *   they are the same books already printed in the citations below them, named
 *   once more so the page can say that 48 of the 168 sourced entries lean on
 *   one of them. Same rule-7 reasoning as the 67 below: a book's title is the
 *   string a reader needs in order to go and find it.
 * *   "Alam Faqri, *Tazkirah Awliya-e-Pakistan* (Lahore)" is three runs: the
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
  // 17 -> 19, raised 26 August 2026: the figure pages gained "Where this figure
  // rests", and its second line is the site's recorded Location verbatim —
  // "Jhanda Bazar, Peshawar, Khyber Pakhtunkhwa, Pakistan", and for several rows
  // a paragraph about what the survey did *not* record. That is the survey's own
  // wording and RULE 2 keeps it, so it is declared rather than paraphrased. The
  // other two saint routes measured exactly their pre-existing numbers:
  // multi-order 23, lineage-only 24 (the latter's figure has no site in the app,
  // so the section correctly does not render).
  /* Raised 28 August 2026, +5 on each of three routes, after the figure-identity
     branch and the front-end branch were merged. Two causes, measured rather
     than assumed, and `undeclared` stayed **empty** on all three throughout —
     the archive is not leaking English, it is declaring more of it.

       · +1 on every route: the language toggle's "EN". The 26–28 August settings
         work put the gear and the EN/اردو control on every page; it used to be
         on the map alone, and the map's own budget already counted it.
       · +4 on `saint:multi-order`, and the rest of the +5 elsewhere: this route
         was repointed on 28 August from `/saint/hazrat-wasif-ali-wasif` to
         `/saint/hazrat-wasif-ali-wasif-awan` when those two nodes turned out to
         be one man — and the budget was not re-measured with it. The merged page
         renders what the two nodes rendered separately: his shrine and ʿurs came
         from one node, his master and both silsilas from the other. The extra
         runs are the second node's half, which no page used to show beside the
         first. That is the merge working; 23 was the number for half a man.

     The lesson for the next person, and it is the same one this file's 26 August
     note is about: **a route repointed is a budget invalidated.** Changing
     `path` here without re-running the walker leaves a number describing a page
     that is no longer being visited. */
  /* 28 → 29 on 30 August 2026, and the whole increase is one string:

       shaheed (as popular belief, not a formal ruling — per the survey)

     It is a `title` that had been sitting in a date proposal pointing at a
     short-form slug (`wasif-ali-wasif`) which resolves to nobody, so `build-kg`
     dropped the proposal silently and the page never rendered it. Repointing it
     at `hazrat-wasif-ali-wasif-awan` (§9.178) recovered the title, along with
     `Sakhi Lajpal`, `Gharib Nawaz` and `wali-e-kamil` on two other figures.

     Declared rather than translated, on this file's own precedent for the dates
     two entries below: it is the survey's hedge about whether a man is called a
     martyr, and paraphrasing a hedge is exactly what RULE 2 forbids. "shaheed"
     alone is شہید; "as popular belief, not a formal ruling" is the part the
     dictionary cannot carry without deciding something the survey declined to.

     Measured against the live page rather than inferred from the diff: **29
     declared, `undeclared` still empty.** The archive is not leaking English, it
     is disclosing more of what it holds — the same conclusion every previous
     raise in this file reached, and the reason `undeclared` is the assertion
     while these numbers are only budgets.

     A process note, because this drifted for a whole session before anyone saw
     it: `npm run verify` does NOT run e2e. A day of data work can move an e2e
     budget with every gate green. The features session found this one by
     running the suite, not by a gate firing. */
  'saint:multi-order': 29,
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
  // +5 each on the two order pages, same two causes as the note above: the
  // language toggle, and merged figures now carrying the absorbed node's name as
  // an `altName` in the member list.
  order: 82,
  'order:chishtiyya': 48,
  /* 51 -> 53, 28 August 2026. The Suhrawardiyya gained a member: Bibi Jawindi
     got a node of her own when Tomb of Javindi Bibi stopped being filed under
     Jalaluddin Surkh-Posh Bukhari, whose `Sufi Saint` cell it carried
     byte-identically. Her two runs are the site's recorded location and the
     observance cell, both shown as the survey wrote them. A member arriving is
     the order page working, and `undeclared` stayed empty. */
  'order:suhrawardiyya': 53,
  'order:naqshbandiyya': 32,
  'order:qalandariyya': 11,
  /* 122 → 126, 29 August 2026 — and the rise is NOT more English. Decomposed by
     measurement rather than inferred:

       +7  lineage quotes now render the archive's own markdown, so a quote
           containing `*sajjada nashin*` is three text nodes where it was one.
           Four quotes on this route carry emphasis and they account for seven
           extra nodes between them. Not one syllable of new English: the
           asterisks used to be printed literally to the reader.
       −3  nine figure names entered the Urdu dictionary with the kinship pass,
           so runs that used to be Latin here now render in Urdu.

     Net +4. **This route shows an Urdu reader less English than it did, and the
     number went up**, because the guard counts text nodes and italics split
     them. Worth knowing before reading any budget in this file as a quantity of
     English: it is a count of nodes. See HANDOVER §9.129. */
  graph: 126,
  /* 39 → 34, 26 August 2026. Not a translation: the calendar became the route's
     default view, so `/almanac?lang=ur` now settles on one month's cards rather
     than all thirteen month listings, and five of the recorded `Events` strings
     that used to be on the page are a scroll and a click away instead. Lowered
     rather than left, because a budget that no longer describes the page is a
     budget that will absorb the next real leak in silence — which is the whole
     failure mode this file was written against. The debt itself is unchanged:
     the same observance cells are still untranslated, still declared, and still
     counted on whichever month the reader opens. */
  almanac: 34,
  /* The month listing, which the calendar-default route never renders: twelve
     months of cards, each printing its site's recorded `Events` cell verbatim.
     The same debt as `almanac`'s 34 seen at full extent rather than one month
     at a time, and it falls as `urdu-i18n/build_dictionary.py` gains observance
     entries. */
  'almanac:list': 39,
  /* Recorded `site_type` prose — the survey's own words for a built form,
     "Shrine complex (tomb, mosque, graveyard…)" — plus the Location on each
     card. Both are source data shown as recorded (RULE 2); what changed is that
     they are now declared, and therefore counted. */
  typology: 9,
  /* 19 → 20, 26 August 2026. A9's "Where this figure rests" (`a725488`) prints
     the site's recorded `Location` verbatim — "Lahore, Punjab" on Data Ganj
     Bakhsh — and the commit that added it did not move this number, so the gate
     has been red on this branch since. The run is a correct one: a Location is
     the surveyor's own string, and paraphrasing it into Urdu would be inventing
     a place name (RULE 2). The same string was already declared one section
     below in `.order-site-location`; what is new is that the figure's page now
     says where the figure rests before it lists the site. */
  /* Every one is a bibliography line the Urdu article does not have — see the
     route's note. The number is the size of one entry's English bibliography,
     counted per text node, and it moves when that entry's citations do. */
  'shrine:urdu-bibliography-fallback': 8,
  saint: 20,
  /* 24 → 27, 29 August 2026. Three runs, all in the new "Family recorded"
     section: his father's name (`Syed Ul Hassan Kabeer`, which the dictionary
     does not carry), the survey sentence the tie was read out of, and that
     sentence's `<cite>`. A name, a quotation and a citation — the three things
     i18n rule 7 permits Latin for, and here the reader already has the claim
     above them in Urdu, which is what makes the quotation evidence rather than
     an untranslated sentence. (The order pages got the other answer to that
     same question on the same day: there the passage IS the page's account, so
     it is quoted from the Urdu article instead. HANDOVER §9.128.) */
  'saint:lineage-only': 27,
  about: 102,
  /* 36 → 59, 26 August 2026, and every one of the 23 is a recorded `Events`
     cell. The place page gained "Days observed here" (A3), which prints each
     site's own observance sentence verbatim beside whatever date can be read
     out of it — the same rows, the same reader and the same component the order
     and figure pages already use, so the debt is the same debt arriving on a
     third surface rather than a new one. "Eid Milad-un-Nabi (principal
     gathering)" has no dictionary entry and stays as the surveyor wrote it
     (RULE 2: a visibly untranslated observance beats a confidently wrong one),
     and the number falls as `urdu-i18n/build_dictionary.py` gains entries.
     Hiding the cell from an Urdu reader would have cost nothing here and made
     the Urdu view the one that cannot check the archive's arithmetic. The
     figures section added none: a figure's recorded name is in the dictionary
     for all 169 rows, and the site tags beside it were already on the page. */
  place: 59,
  /* Two, and they are the only two Latin runs on the page a reader can
     legitimately meet: `EN` in the masthead's language segment, and `English`
     as the name of the English option in the reading-language group. A language
     picker is the one place in this archive where an English word belongs in the
     Urdu view — a reader who cannot read the current interface has to be able to
     recognise the way out of it. Everything else on /settings, including the
     help text under every option, is interface copy and therefore translated. */
  settings: 2,
};

/* All five orders, not one: they came from the sweep this file replaced
   (payload.spec.ts), and each carries a different set of figures, so a single
   order page proves nothing about the other four. */
const ROUTES = [
  { name: 'map', path: '/?lang=ur', ready: '#sidebar' },
  { name: 'shrine', path: '/shrine/data-darbar?lang=ur', ready: 'h1.shrine-title' },
  /* A second shrine, for the case the first cannot show: Data Darbar's Urdu
     article carries its own bibliography, and **98 of the 169 entries do not**.
     Those fall back to the English one, which is sanctioned (i18n rule 7 — a
     citation is a search string) and has to be *declared*, or the guard would
     be blind to the one place this archive deliberately shows an Urdu reader
     Latin. Bari Imam is one of the 98. */
  {
    name: 'shrine:urdu-bibliography-fallback',
    path: '/shrine/bari-imam?lang=ur',
    ready: 'h1.shrine-title',
  },
  { name: 'saint', path: '/saint/data-ganj-bakhsh?lang=ur', ready: 'h1.entity-title' },
  /* A second figure, for the same reason all five orders are here: the two
     saint pages render different sections. Data Ganj Bakhsh has one lineage
     edge and no recorded order; Wasif Ali Wasif holds two silsilas at once and
     his row's own silsila cell is a sentence long — the exact shape that used
     to render as one order and no source wording. */
  /* Slug note: this was `/saint/hazrat-wasif-ali-wasif` until 28 August 2026,
     when that node turned out to be a duplicate of this one — the two held his
     orders and his shrine separately. `hazrat-wasif-ali-wasif` is now a retired
     slug that redirects here, query string intact, so the old path would still
     work; pointed at the live slug so this spec tests the page rather than the
     redirect. */
  {
    name: 'saint:multi-order',
    path: '/saint/hazrat-wasif-ali-wasif-awan?lang=ur',
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
  /* Two routes the matrix never visited, both of which were leaking.
     `/typology` renders the same related-card as the shrine page and did not
     declare its Location — 14 undeclared runs. `/almanac?view=list` is the
     *other* half of a route the matrix already had: the default view is the
     calendar, which shows one month's cards, so the twelve month listings were
     never scanned. Found by running the walker below over 23 Urdu routes
     instead of 14; the wider sweep is in HANDOVER §9. */
  /* **Not here yet, deliberately: `/shrine/darbar-abul-muali-qadri?lang=ur`.**
     That entry has no Urdu article, so its whole page falls back to English.
     `ShrineArticle` now says so and declares the article it renders, but the
     table of contents, the category kicker, the masthead's recorded Location
     and four recorded dates in the infobox are all still undeclared — four more
     components, one of them showing an off-schema `category` value ("Islam")
     that has no dictionary entry because it is not one of the archive's six.
     Adding the route with a budget before those are declared would mean
     exempting them wholesale, which is the exemption creep this file exists
     against. The remaining list is in HANDOVER §9. */
  { name: 'typology', path: '/typology?lang=ur', ready: 'h1.entity-title' },
  { name: 'almanac:list', path: '/almanac?view=list&lang=ur', ready: 'h1.entity-title' },
  { name: 'about', path: '/about?lang=ur', ready: 'h1.entity-title' },
  /* Added with the route, 27 August 2026, rather than after someone noticed it
     was missing. The lesson of this file's own history is that a route absent
     from this matrix is a route nobody has checked: pointing the walker at 23
     routes instead of 14 found seven leaks. A settings page is more exposed than
     most — every string on it is interface copy, and interface copy is exactly
     what gets added in English and translated later. */
  { name: 'settings', path: '/settings?lang=ur', ready: 'h1.entity-title' },
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
