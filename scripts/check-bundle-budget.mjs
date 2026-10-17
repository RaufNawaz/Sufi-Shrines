#!/usr/bin/env node
/**
 * check-bundle-budget.mjs — fails the build when a route's *eager* JavaScript
 * grows past its budget.
 *
 * Why this exists: `src/data/urdu-content.json` — 1.0 MB of Urdu article prose
 * for 168 shrines — was a static import in `urduContentOverride.ts`, which put
 * it in the same eager chunk as the data hook. Every visitor downloaded and
 * parsed the entire Urdu edition of the archive before the first map tile
 * appeared, English-only readers included. Measured on 20 August 2026: `/`
 * shipped 3506 KB of JS, of which 1000 KB was that one file. Nothing errored,
 * no test failed, and `vite build`'s own "chunks larger than 500 kB" warning
 * had been printing for other reasons for long enough to be background noise.
 *
 * So the invariant is measured, not guessed: walk the real static import graph
 * from Vite's manifest and add up bytes on disk. A dynamic import is excluded
 * because it is off the critical path by construction — which is exactly the
 * property the fix relies on, and exactly what a regression would quietly
 * undo.
 *
 * Budgets are current measurement plus headroom, not aspirations. Raising one
 * should be a deliberate line in a diff with a reason next to it.
 */
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = join(ROOT, 'dist');
const MANIFEST = join(DIST, '.vite', 'manifest.json');

/**
 * Eager KB budgets per route: the entry's static closure plus the route
 * chunk's static closure. Headroom is ~8% over the 20 August 2026 measurement,
 * enough to absorb a normal feature but not another megabyte.
 */
/*
 * **Paid off on 21 August 2026, and every budget below dropped ~74 KB.**
 *
 * The two notes this block used to carry both said the same thing: the Urdu
 * dictionary (`src/data/urdu-seed.json`) was a static import in
 * `urduFallback.ts`, so every route shipped it eagerly, and it had grown twice
 * in two days (49 → 67 → 80 KB) with the budgets raised each time. Twice
 * recording a debt is the point at which recording it stops being the answer.
 *
 * It is now loaded on demand, gated on the reader's language exactly as
 * `urdu-content.json` already was — an English reader downloads none of it. The
 * header of `src/lib/i18n/urduFallback.ts` explains how the synchronous-render
 * problem is handled, which was the real reason this waited.
 *
 * Numbers below are the measurement *after* that change. `index.html` went from
 * 322 KB to 248 KB of eager JavaScript; the map route from 611 to 537.
 */
/*
 * **Every number below was re-measured and lowered on 24 August 2026**, when the
 * Urdu interface strings were split into their own chunk. Each route's eager JS
 * fell 20–30 KB — index.html 261 → 234, MapPage 575 → 548, ShrinePage 496 → 469
 * — because 42 KB of Nastaliq copy had been reaching every reader on every route,
 * English-only ones included. See docs/planning/LANGUAGE_LAYER_2026-08-24.md.
 *
 * The budgets came down with it, deliberately. A budget that does not fall when
 * the payload does is how this table ended up with a line reading "measured 457"
 * against a route sitting at 495: the headroom had been silently spent, and the
 * next commit to touch *any* shared module was going to fail here regardless of
 * what it did. Two block comments used to live in this table explaining raises
 * for ShrinePage and AboutPage; both described numbers these lines no longer
 * carry, so they are gone rather than left to read as current. The lesson they
 * recorded is kept because it is the general one:
 *
 *   **a per-route budget cannot express "a shared module grew", so the route
 *   with the least headroom takes the blame for a change unrelated to it.**
 *
 * Each line is now `measured N on <date>`. The date is the part that matters —
 * a measurement quoted long enough becomes a claim (CLAUDE.md's standing
 * findings). Headroom is ~7%: enough for a normal feature, not for another
 * language's worth of strings.
 */
/*
 * **Re-measured on 26 August 2026, and every line moved.** Twelve routes, all
 * of them 5–26 KB heavier than the 24 August numbers two days above:
 *
 *   index 234 → 246 · Map 548 → 560 · Shrine 469 → 484 · Saint 606 → 632 ·
 *   Order 600 → 620 · Graph 563 → 574 · Almanac 295 → 316 · About 308 → 313 ·
 *   Place 278 → 292 · Typology 274 → 288 · Review 251 → 257 · 404 237 → 250
 *
 * Two things in that column, and separating them is the point of re-measuring
 * rather than raising one line:
 *
 * **A shared module grew, and it reached every route.** `src/lib/i18n/
 * uiStrings.ts` went 44.5 KB → 49.7 KB of source in two days — the ʿurs
 * calendar's strings, A9's figure-page sections, the century strip's — and the
 * English strings are eager on every route by construction, because English is
 * the default language and the first paint renders them synchronously. That is
 * most of the ~12 KB floor under every number above. The Urdu strings were
 * split into their own chunk on 24 August for exactly this reason; the English
 * ones cannot be split the same way, but the *route-specific* ones could be,
 * and that is the follow-up this measurement earns rather than a raise.
 *
 * **And the almanac had already spent its headroom.** It was at 315/315 —
 * exactly its ceiling — when the calendar view shipped on 26 August, and the
 * budget was not re-measured with it. So the next commit to touch any shared
 * module failed here, on a route it had nothing to do with. That is the failure
 * this table's own header foresees ("the route with the least headroom takes the
 * blame for a change unrelated to it") happening for the second time, and the
 * fix is the same one the header prescribes: re-measure the whole table when
 * features ship, not when it goes red.
 *
 * Nothing here is a lazy import gone static — MUST_STAY_LAZY passes on every
 * route, which is the check that would catch the megabyte-class regression this
 * file exists for.
 *
 * HEADROOM IS DELIBERATE, and this paragraph replaces a claim that had stopped
 * being true. It said "headroom stays ~7%"; measured on 30 August 2026 the table
 * had **three routes at exactly zero** (SettingsPage, ReviewPage, index.html) and
 * **six more under 3 KB**, MapPage at 1 KB. Every one of those had been set to
 * the measured value, which the note above already calls a landmine rather than a
 * pass — and at that spread a single UI string, which is eager on all thirteen
 * routes, fails several at once on pages the string will never reach. Two
 * sessions lost time to exactly that on 30 August, each assuming the failure was
 * theirs.
 *
 * So every route now carries **at least 2% or 7 KB, whichever is larger**. That
 * is not a licence to grow: 1 KB of interface copy is not what this gate is for,
 * MUST_STAY_LAZY is, and a route that moves by tens of KB still fails. Re-measure
 * the whole table when features ship, and keep the slack when you do.
 */
const BUDGETS_KB = {
  /* Every route +5 KB on 17 October 2026, and two new entries. Two causes,
     measured separately rather than lumped:

     1. HEAD was already red before this change. Built clean at f649acc, the
        shell measured 279/275, MapPage 626/620 and TypologyPage 335/328. MapPage
        at 626 is the number the note below says to watch for — "if this grows
        by ~10 KB the palette went static again" — and it did not: checked the
        same night, CommandPalette is still a dynamic import
        (MapSidebar.tsx, `loadCommandPalette`). The growth is the 15–16 October
        map work: the location control, pinch handling, sheet-on-drag.
     2. The Sources tab: ~3.7 KB of English interface strings (the English table
        is eager by design; the Urdu one is its own chunk), a sixth tab icon, the
        welcome card's sixth destination. The shell went 279 → 284.

     Later the same night the council rounds added ~1 KB more of interface
     strings (the map key, trust explanation, atlas switch, wordmark), taking
     four routes 1 KB over; those four were re-measured and set to +3. Then
     per-article Urdu loading (urduContentOverride.loadUrduArticle) added ~1 KB
     to the shell and tipped four more; same treatment. The trade is 1 KB on
     every route against 255 KB off an Urdu entry page's critical path.

     The two new pages: the index does not load the country outline (DotMap.tsx
     is its own module for exactly that), the book page does. Each budget is the
     17 October measurement + 3. */
  'src/pages/SourcesPage.tsx': 371, // measured 368 on 17 Oct 2026, after the council rounds
  'src/pages/SourcePage.tsx': 379, // measured 376 on 17 Oct 2026, after the council rounds
  /* 265 → 272 on 30 August 2026. Measured 265 against a 265 budget, which this
     file's own header calls a landmine rather than a pass — and index.html is
     the worst place to leave one, because every route's shell is in it, so it
     goes red for a change made anywhere. Third and last of the zero-headroom
     entries (SettingsPage and ReviewPage were the others); the whole table now
     carries slack on purpose. */
  /* +2 KB on 15 Oct 2026, on the shell and so on every route: TabLink (the tab
     bar's links now prefetch their page module on intent and arrive by View
     Transition — lib/nav/routeModules.ts, lib/nav/viewTransition.ts). Measured
     273 for the shell, 362 Almanac, 286 NotFound; each set to measurement + 2. */
  'index.html': 290, // measured 287 on 17 Oct 2026 (round 5 strings)
  /* 611 → 618 on 8 October 2026: measured 613 after the palette grew its
     tradition chips and grouped browse mode, and the shared-ground lens
     control moved from the sidebar into ShrineMap. Slack kept, per the note
     above about a budget set at the measurement. */
  /* 618 → 626 on 9 October 2026: measured 620 after the mobile council's
     map fixes — the nearest-dot tap pick, flights that clear the bottom sheet,
     the RTL label plugin's registration (the plugin itself is a lazy public/
     file, not in this count), the sheet's scroll reset and the gear menu's
     theme row. Slack kept, as above. */
  /* 626 → 620 on 15 October 2026: CommandPalette (with its preview pane and
     filters) is lazy now, fetched when the browser is idle, and the route
     measured 616. If this grows by ~10 KB the palette went static again. */
  'src/pages/MapPage.tsx': 644, // measured 641 on 17 Oct 2026 (round 5 strings)
  /* 520 → 526 on 29 Aug 2026, and raised rather than left at exactly the
     measurement for a specific reason: the route hit **520 against a 520
     budget**, which is not a pass, it is a landmine. The next person to add a
     line here gets a red build with no clue that the previous change spent the
     last kilobyte.

     The growth is two features and both are accounted for. +2 KB: the infobox's
     tradition row (the 13 KB of tradition data it reads is deliberately not in
     this number — `useShrineTraditions` reaches it through a dynamic import).
     +1 KB: the article-column skeleton, so a shrine opened from a shared link
     shows its masthead from the slim index at ~3.3s instead of a blank page
     until the sheet lands at ~7s.

     Six kilobytes of headroom, deliberately modest. This is still the tightest
     route on the board, and the next feature that needs room here should look
     at what the page imports before raising this line again. */
  /* 534 → 415 on 15 October 2026. SourcesProvenance is team view only, and its
     static import carried `data/provenance.json` (127 KB) to every public
     reader of every entry; it is a lazy import now and the route measured 408.
     If this jumps by ~127 KB, that import went static again. */
  'src/pages/ShrinePage.tsx': 437, // measured 434 on 17 Oct 2026, after council round 5
  /* Raised 675 → 680 on 30 August 2026 and **put back the same morning**, which
     is the useful half of the story.

     `data/kg.json` had grown 414,791 → 430,883 bytes as lineage and kin ties
     landed, and this route imports it, so it went over. The raise was made with
     the cause named — and then the other session working this tree fixed the
     cause instead: `relations[].id` was `type[:kinType]:subject:object`, every
     character of it already present in the four fields beside it, 49 KB of the
     graph restating its own primary key, eager on every route that imports it.
     Stripped on write and derived back on load, kg.json fell to 371,864 and this
     route measured **636 KB** — 44 KB under even the original number.

     So the raise is reverted rather than kept. A budget carrying slack nobody
     can account for is the thing this file's other comments keep warning about,
     and holding 680 for a 636 KB page would have been exactly that.

     The structural point is still open and is worth more than either number:
     `/saint/:slug` downloads the whole graph to render one figure. */
  'src/pages/SaintPage.tsx': 699, // measured 696 on 17 Oct 2026, round 5: traditions row, capped days
  'src/pages/OrderPage.tsx': 682, // measured 679 on 17 Oct 2026, after the Urdu council's RecordedRun
  'src/pages/GraphPage.tsx': 628, // measured 625 on 17 Oct 2026, round 5: ?order= and #lineage
  /* 340 → 345 on 28 Aug 2026. Not this route's own growth: Track C added ~14
     UI strings, and the English string table is eager on every route, so the
     whole table moves together. Almanac was simply the one with the least
     headroom left (341 against 340). This is the same shared-table effect that
     made all twelve budgets stale on 27 Aug — if several routes go 1–2 KB over
     at once, look at uiStrings.ts before looking at the routes. */
  /* 345 → 350 on 29 Aug 2026, and this is the **third** instance of the effect
     the paragraph above describes, so it is worth stating as a rule rather than
     a coincidence: /shared-ground added ~15 English UI strings — four of them
     the long method paragraphs the page exists to be honest with — and every
     route grew by exactly 3 KB. Measured both ways in a detached worktree at
     HEAD: 343 without the page, 346 with it, and the same +3 KB on all
     fourteen entries including index.html.

     Almanac was again the one route with under 3 KB of headroom; nothing about
     the almanac changed. If a fourth route's strings do this, the fix is not a
     fourth bump — it is that a page's own copy should not be eager on every
     other page, and `UI_TEXT.en` should split the way `UI_TEXT.ur` already
     lazily does. That is a design change, not a budget edit, which is why it is
     written here rather than done at the same time as the feature. */
  'src/pages/AlmanacPage.tsx': 382, // measured 379 on 17 Oct 2026 (round 5 strings)
  /* 29 Aug 2026, and it is the shared-table effect the Almanac note above
     describes, arriving exactly as predicted: kinship added ~25 English UI
     strings, the English table is eager on every route, and the three routes
     that went over together are the three that **do not import the graph** —
     so they paid the strings and got none of the offsetting saving. The routes
     that do import it fell instead: SaintPage 695 → 662 and GraphPage 620 →
     587, because the same commit took the relation `notes` and the build's
     `reviewNeeded` log out of kg.json (33 KB of eager JS that no page had ever
     rendered). Those two budgets are deliberately left where they are — the
     headroom is real and the next feature should be able to spend it. */
  /* 275 → 285, 30 August 2026 — the THIRD raise in one night, and the number is
     less interesting than the pattern.
     
     Every one had the same cause: interface copy is eager on every route, so
     any feature that adds UI strings taxes all fourteen, and whichever route has
     the least headroom fails first. Tonight two sessions shipped in parallel —
     kinship, order prose, traditions, a tradition page, shared ground — and this
     route, which renders none of them, went over three times.
     
     Raised with more headroom than the 1 KB overrun needs, deliberately, so the
     next feature does not spend an hour of a release on a route it never
     touched. **But the real reading is that per-route byte budgets do not
     describe a shared eager table well**, and the honest fix if this keeps
     happening is to split the English strings the way `uiStrings.ur.ts` is
     split, not to keep moving numbers. Nobody should do that tonight; it is
     written down so the fourth raise prompts the change instead of a fourth
     comment. */
  'src/pages/NotFoundPage.tsx': 305, // measured 302 on 17 Oct 2026 (round 5 strings)
  /* Track C, new on 28 Aug 2026. It carries the shell, the shrine snapshot and
     its own ~4 KB of timeline code — no graph, no provenance, no places index.
     If this jumps by ~170 KB something pulled provenance.json in; by ~420 KB,
     src/lib/kg.ts. */
  /* 310 → 315, 30 August 2026, and the honest attribution is that the byte is
     mine. Adding `className="section-heading"` to this route's two unclassed
     <h2>s — part of collapsing thirteen heading treatments to five — tipped it
     to 311. Measured both ways: with that change reverted it builds at exactly
     310, which is the real finding.

     **A route sitting exactly on its budget is a tripwire, not a budget.** It
     had zero headroom, so the next byte from anywhere — a shared UI string, a
     class attribute, someone else's data — was going to trip it and be blamed
     on whoever arrived last. Five kilobytes so the number can distinguish a
     cause from a coincidence. */
  /* +4 KB on 9 Oct 2026: the page rebuilt (HANDOVER §9.277) — a chart card with
     packed lanes and a hover label, a tradition filter, and inset lists with
     disclosure. All of it is page code; no new import. */
  'src/pages/ChronologyPage.tsx': 345, // measured 342 on 17 Oct 2026, with per-article Urdu loading
  /* Track A's archive-wide half, new on 29 Aug 2026. Carries the shell, the
     shrine snapshot and `sharedGround.ts` — no graph, no provenance, no places
     index, and no map: the page is a list of pairs, and every distance on it is
     computed from coordinates the snapshot already holds. Sits alongside
     ChronologyPage because they load the same things. If this jumps by ~420 KB
     something pulled in src/lib/kg.ts; by ~1 MB, the maplibre basemap, which
     would mean a link to the map turned into an embedded one. */
  /* +5 KB on 9 Oct 2026: the meetings ring and the crossings' distance strip
     (HANDOVER §9.279) — page code, no new import. */
  'src/pages/SharedGroundPage.tsx': 349, // measured 346 on 17 Oct 2026 (round 5 strings)
  /* The tradition pages, new on 29 Aug 2026. Sibling of the order pages and it
     loads much the same things, minus the graph. Its own data lives in
     `data/kg-traditions.json` (17 KB as a chunk) and is *not* here by accident:
     `ShrineInfobox` wants the same file for a one-line row on 18 of 169 pages
     and reaches it through a dynamic import, so ShrinePage pays nothing for it.
     A static import there would have cost 17 KB against 3 KB of headroom.
     If this route ever jumps by ~420 KB, something pulled in src/lib/kg.ts. */
  'src/pages/TraditionPage.tsx': 365, // measured 362 on 17 Oct 2026; the figures list loads the graph through import()
  /* Absorbed /coverage and /report on 24 Aug 2026, so it carries what those two
     routes used to: the source index, the places index and the archive report.
     278 KB before the merge, 308 after — and the 281 KB and 279 KB those two
     routes each cost are gone from this table rather than moved down it. A
     reader who wanted the archive's account of itself used to download all
     three. provenance.json stays a dynamic import inside the page; if this
     number jumps by ~170 KB, that is what went static. */
  /* 342 → 350 on 30 Aug 2026. The citations counted by *work* rather than by
     citation string — `sourceWorks.ts` plus its 3 KB of curated works — which
     is what lets the page say that 48 of the 168 sourced entries lean on one
     book. The per-citation list can only ever show that book's largest slice,
     25, because it appears under ten different citation strings.

     The module is imported by `ArchiveKnows` and nothing else, deliberately:
     `sourceIndex.ts` is on every shrine page and this is not. */
  /* +1 KB on 9 Oct 2026: the citation cards and the Latin-run span (HANDOVER
     §9.277) — markup only. */
  'src/pages/AboutPage.tsx': 376, // measured 373 on 17 Oct 2026, with per-article Urdu loading
  /* 292 → 312 on 26 Aug 2026 when the place page gained its figures and
     observances (A3). The first draft of that feature measured **608 KB**: the
     join was `getSaintsForShrine`, and `src/lib/kg.ts` statically imports the
     426 KB graph onto a route that had never carried it. It now uses the 11 KB
     shrine → figure index, so the growth is the two sections and nothing else.
     If this line ever jumps by ~300 KB, that is what came back. */
  /* 346 → 352, 14 September 2026, and it is the shared-table effect this file
     already has two notes about: the entry page's two optional sections brought
     twelve English UI strings — two legends, two help sentences, two switch
     labels and six accessible names — and `uiStrings.ts` is eager on every
     route. ~1 KB on all thirteen; this is the one with the least headroom, so
     it is the one that failed, on a route that renders neither section.

     Raised past the measurement rather than to it, for the reason the
     ReviewPage note gives: a budget set to the measured value fails the next
     person who adds a string, on a page their string never reaches, and they
     reasonably conclude the failure is theirs. The same +1 KB put
     AlmanacPage and TraditionPage at exactly 355/355 and 335/335 — passing
     today and set up to misattribute tomorrow — so both are given the same
     slack here. */
  /* 10 October 2026: Place, Tradition and Review each measured 1 KB over (353/352,
     341/340, 290/289). The cause is the four English strings of /graph's team-only
     "Named in the books" sheet: `uiStrings.ts` is in every route's eager closure,
     so interface copy lands everywhere, which is the shared-table effect the
     PlacePage note describes. The book figures themselves are a lazy 96 KB chunk
     and in no number here. Re-based at measurement + 7 KB, this file's rule. Not
     raised, and at or near zero slack before this change: ShrinePage 534/534,
     AlmanacPage 360/360, index.html 272/272. */
  'src/pages/PlacePage.tsx': 378, // measured 375 on 17 Oct 2026, round 5: grouped sites; orders load through import()
  // Added 23 Aug 2026 when the two branches merged: this route was built on the
  // other line, so this table had never seen it.
  /* 310 → 317, 29 August 2026, with PlacePage on the same day and for the same
     reason as About/Review/NotFound above: the order pages gained a sourced
     "What the archive says" section, that is ~5 more English UI strings, and the
     English table is eager on every route. **Twice in one session now**, on five
     routes the features never touched. The pattern is the one the Almanac note
     states — when several routes go 1–2 KB over at once it is uiStrings.ts, not
     the routes — and it is worth reading as a standing cost: any feature that
     adds interface copy taxes all thirteen routes, and the ones with the least
     headroom fail first regardless of what changed. */
  /* +2 KB on 9 Oct 2026: the tile mosaic and the per-form tradition bars
     (HANDOVER §9.279) — page code, no new import. */
  'src/pages/TypologyPage.tsx': 346, // measured 343 on 17 Oct 2026, with per-article Urdu loading
  /* The review desk. 257 KB measured 26 Aug 2026 — essentially the app shell and
     nothing else, which is the point: its 78 KB queue is a dynamic `import()`
     inside the route, so a public reader never downloads a page they cannot
     open. If this number jumps by ~78 KB, that import went static. */
  /* 282 → 288 on 30 August 2026, and the six bytes are the point rather than the
     page. This sat at exactly 282/282 — the measured value, with zero slack —
     which means the next UI string anyone adds fails HERE, on a route that
     string will never reach, and the person who added it reasonably concludes
     the failure is theirs. That false attribution cost two sessions time on a
     shared tree today. Headroom is deliberate; see SettingsPage below. */
  'src/pages/ReviewPage.tsx': 311, // measured 308 on 17 Oct 2026 (round 5 strings)
  /* The settings page, added 27 Aug 2026. 269 KB is the app shell plus a page
     of native form controls, which is why it sits beside NotFoundPage and
     ReviewPage rather than with the routes that carry an index.
     `useSavedShrines` is the only data it touches, and that is one localStorage
     key — this route deliberately does **not** call `useShrineData`, so opening
     the settings does not fetch the sheet. If this number grows by ~90 KB, a
     preference started reading shrine data; if by ~426 KB, something on it
     imported `lib/kg.ts`. */
  /* Raised 285 → 291 on 30 August 2026 by five UI strings for a relation type
     that this page does not render and never will (`descentHeading` and four
     others, for descent in a lineage on SaintPage). Exactly the tax the note
     above describes, and measured rather than assumed: with the five strings
     removed this page builds at 285 KB against a 285 KB budget — **zero
     headroom** — so the failure was not that the feature was large, it was that
     the budget had been set to the measured value and the next byte of interface
     copy from any hand was going to fail here.
     ReviewPage (282/282) and index.html (265/265) are sitting at zero the same
     way. The 291 is deliberate slack, not a measurement. */
  /* +1 KB on 9 Oct 2026: settings as inset groups (segmented controls,
     switches) — markup only, no new import. */
  /* +34 KB on 17 Oct 2026, deliberately: the saved-sites group lists the
     sites by name, which needs the rows, so this page now loads the same data
     layer (useShrineData) every entry page does. A reader reaches Settings from
     another page, so the chunk is almost always cached by then. */
  'src/pages/SettingsPage.tsx': 348, // measured 345 on 17 Oct 2026
};

/**
 * Chunks that must stay off every route's eager path. Named rather than
 * size-checked so the failure message says *what* regressed: a budget
 * overshoot from one of these is a lazy import that turned static, which is a
 * different bug from a chunk that simply grew.
 */
const MUST_STAY_LAZY = [
  { match: /^urdu-content-/, why: 'the 1 MB Urdu article payload (Urdu readers only)' },
  {
    match: /^urdu-seed-/,
    why: 'the 80 KB Urdu dictionary (Urdu readers only) — see urduFallback.ts',
  },
  {
    match: /^shrines-fallback-/,
    why: 'the offline snapshot (loaded only when the sheet fetch fails)',
  },
  {
    match: /^vendor-maplibre-/,
    why:
      'maplibre-gl, 1035 KB — the basemap tiles only. The sidebar, search, filters, ' +
      'era slider and markers are Leaflet and need none of it, so it must never sit on ' +
      'the map route’s critical path (src/components/map/ShrineMap.tsx lazy-loads it)',
  },
];

let manifest;
try {
  manifest = JSON.parse(readFileSync(MANIFEST, 'utf8'));
} catch {
  console.error(
    `check-bundle-budget: no manifest at ${MANIFEST}.\n` +
      'Run `npm run build` (build.manifest must stay true in vite.config.ts).',
  );
  process.exit(1);
}

const sizeCache = new Map();
function sizeOf(file) {
  if (!sizeCache.has(file)) {
    try {
      sizeCache.set(file, statSync(join(DIST, file)).size);
    } catch {
      sizeCache.set(file, 0);
    }
  }
  return sizeCache.get(file);
}

/** Transitive *static* import closure of a manifest key, as file names. */
function staticClosure(key, seen = new Set()) {
  const entry = manifest[key];
  if (!entry || seen.has(key)) return seen;
  seen.add(key);
  for (const dep of entry.imports ?? []) staticClosure(dep, seen);
  return seen;
}

function filesOf(keys) {
  return [...keys].map((k) => manifest[k]?.file).filter((f) => f && f.endsWith('.js'));
}

const entryKey = Object.keys(manifest).find((k) => manifest[k].isEntry);
if (!entryKey) {
  console.error('check-bundle-budget: no isEntry chunk in the manifest.');
  process.exit(1);
}

const shellFiles = new Set(filesOf(staticClosure(entryKey)));
const failures = [];
const rows = [];

/**
 * Every route the entry can reach, plus the shell itself. The entry's other
 * dynamic imports are data chunks (`src/data/urdu-content.json`) — deliberately
 * lazy, and not a route anyone navigates to.
 */
/* A route is usually keyed by its source path. Not always: when a lazy chunk
   statically imports something Rollup hoisted *into* a page's chunk, the page
   is keyed by its chunk file (`_ShrinePage-<hash>.js`) instead. On 15 October
   2026 lazy-loading the team-only SourcesProvenance did exactly that, and
   ShrinePage — the tightest route on the board — silently vanished from this
   table while the check printed OK. So routes are found by `name` as well, and
   a budgeted route that is not measured is a failure, not a missing row. */
const pageKeyOf = (key) => {
  if (key.startsWith('src/pages/')) return key;
  const entry = manifest[key];
  const page = entry?.isDynamicEntry && entry.name ? `src/pages/${entry.name}.tsx` : null;
  return page && existsSync(join(ROOT, page)) ? page : null;
};
const routes = [
  [entryKey, entryKey],
  ...(manifest[entryKey].dynamicImports ?? [])
    .filter((key) => manifest[key])
    .map((key) => [key, pageKeyOf(key)])
    .filter(([, page]) => page),
];
for (const page of Object.keys(BUDGETS_KB)) {
  if (!routes.some(([, p]) => p === page)) {
    failures.push(`${page}: has a budget but was not found in the build, so it was not measured`);
  }
}

for (const [manifestKey, key] of routes) {
  const files = new Set([...shellFiles, ...filesOf(staticClosure(manifestKey))]);
  const bytes = [...files].reduce((sum, f) => sum + sizeOf(f), 0);
  const kb = Math.round(bytes / 1024);
  const budget = BUDGETS_KB[key];

  const leaked = [...files]
    .map((f) => {
      const base = f.replace(/^assets\//, '');
      const rule = MUST_STAY_LAZY.find((r) => r.match.test(base));
      return rule ? `${base} — ${rule.why}` : null;
    })
    .filter(Boolean);
  for (const leak of leaked) {
    failures.push(`${key}: eagerly imports ${leak}`);
  }

  if (budget === undefined) {
    failures.push(
      `${key}: no budget set (${kb} KB). Add it to BUDGETS_KB in scripts/check-bundle-budget.mjs.`,
    );
  } else if (kb > budget) {
    failures.push(`${key}: ${kb} KB eager JS exceeds its ${budget} KB budget`);
  }
  rows.push({ key, kb, budget, files: files.size });
}

const width = Math.max(...rows.map((r) => r.key.length));
for (const r of rows.sort((a, b) => b.kb - a.kb)) {
  const flag = r.budget !== undefined && r.kb > r.budget ? 'FAIL' : 'ok  ';
  console.log(
    `  ${flag} ${r.key.padEnd(width)}  ${String(r.kb).padStart(5)} KB / ${String(r.budget ?? '—').padStart(5)} KB  (${r.files} chunks)`,
  );
}

if (failures.length > 0) {
  console.error('\ncheck-bundle-budget: FAILED');
  for (const f of failures) console.error(`  · ${f}`);
  console.error(
    '\nIf the growth is intentional, raise the budget in scripts/check-bundle-budget.mjs\n' +
      'with a comment saying why. If it is not, the usual cause is a `import x from\n' +
      "'…json'` that should be `await import('…json')` behind a condition.",
  );
  process.exit(1);
}
console.log('\ncheck-bundle-budget: OK — every route within its eager JS budget.');
