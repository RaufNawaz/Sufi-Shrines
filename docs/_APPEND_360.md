
### 9.360 — 17 October 2026 (overnight): a Sources tab, and three things HEAD's own gates already said

**Shipped:** `/sources` (the sixth tab) and `/source/:slug` (43 pages + `/ur` mirrors) — `ea10528`.
Full orientation in `docs/SOURCES_TAB.md`. What a next session needs from tonight:

1. **Public readers had no way to browse the sources across entries.** The "what the archive rests
   on" section of `/about` renders for the team view only, and every shrine page's "also cited by N
   other entries" link pointed into it — so the link sent the public to a page without its target.
   It points at `/sources#source-…` now.
2. **HEAD was red on three gates before tonight's work started**, all from the 15–16 October phone
   council, whose commits are recorded as unverified: the bundle budget (shell 279/275, MapPage
   626/620, Typology 335/328), `classNamesStyled.test.ts` (the palette's near-me chip and distance
   label had no CSS), and `no-overflow.spec.ts` on `/typology` at phone width in both languages
   (the tile strip's edge bleed). All three fixed (`ea10528`, `4d82f89`). The MapPage +10 KB is *not*
   the palette going static — `loadCommandPalette` is still a dynamic import — it is the map work.
3. **`npm run verify` fails at `format:check` on four files in the untracked `Claude outputs/`
   folder** from an earlier session. Not tonight's files and not touched; run the later stages by
   hand or move that folder out of the tree.
4. **Of the 31 books read in full, 29 are cited by no published entry.** The page says "In review"
   and will list entries by itself once the pending patches land — provided each book's `match`
   string occurs in the new citation. `sourceLibrary.test.ts` pins the current hits; after an import,
   read each new hit before updating it.
5. `pipeline/gis/export_outline_svg.py` makes a 5.4 KB SVG outline of the seven OCHA units from the
   GIS foundation, without geopandas (GeoPackage geometry is a header plus WKB). A closed ring gives
   Douglas–Peucker a zero-length baseline and it keeps nothing — split the ring at its farthest vertex
   first.

**Later the same night — four UI council rounds (record: `docs/COUNCIL_2026-10-17.md`).** What a
next session should know that the commits do not say plainly:

6. **When `npm run build:e2e` fails at the bundle budget, prerender never runs** — and
   `urdu-preload.spec.ts` then fails for that reason alone ("no modulepreload was injected"). Fix
   the budget, rebuild, rerun; don't chase the spec. Tonight's budgets were raised by measurement
   five times, each with a dated comment; the interface-string table is eager by design, so every
   new UI string costs every route a little.
7. **The e2e fixture refuses a stale `dist/`** (it compares against source). Rebuild before
   re-running a single spec after a source change.
8. **Per-entry Urdu articles** come from a Vite plugin (`scripts/vite-urdu-articles.mjs`):
   `virtual:urdu-article-loaders` / `virtual:urdu-article/<slug>`, generated from
   `src/data/urdu-content.json` at build time. Nothing new is committed. `isUrduContentLoaded()`
   still means *every* article; `isUrduArticleLoaded(slug)` means one. Route slug and content key
   agree for all 171 entries (checked).
9. **Bidi characters are unreliable as UI glyphs in the Urdu view.** `›`/`‹` mirrored differently
   beside Latin text and when isolated; breadcrumbs now use drawn chevrons. Prefer border-drawn
   shapes for any directional mark.
10. **`RecordedRun`** (`src/components/ui/RecordedRun.tsx`) is the way to show a recorded value
    that may be Urdu or Latin: it declares `lang="en"` + `data-latin` only when the text has Latin
    letters. `latinRunsDeclareLanguage.test.ts` fails any `<bdi data-latin>` without a `lang`.
11. **Hover styles live inside `@media (hover: hover)`** (64 rules moved;
    `hoverOnlyWhereItHovers.test.ts`). A `:hover, :focus-visible` pair is deliberately exempt.
12. **The in-app reduce-motion switch** is read through `prefersReducedMotion()`
    (`src/lib/motionPreference.ts`), never `matchMedia` directly.
13. **Asked of Rauf tonight, unanswered:** reading desk public?; tradition palette for
    colour-blind readers; a non-GitHub correction route; the Urdu site name (still Sufi-only); the
    Figures tab name / public figure index; the Archive tab label; three public `silsila_note`
    values ending "See qa_note 1".
14. **Round 5 (record in `docs/COUNCIL_2026-10-17.md`).** `cssParses.test.ts` exists because a malformed
    rule is only a minifier *warning*: the calendar's chosen day lost its style for hours with every
    gate green. `localizeKgName` imports the graph — a static import of it on a page that otherwise
    avoids `lib/kg` adds ~280 KB; load it with `import()` alongside `lib/kg` (TraditionPage,
    PlacePage do). `prettier --check src` separately from `npm run verify`, whose format stage also
    fails on the untracked `Claude outputs/` folder and so hides real failures.
15. **Asked of Rauf, 17 October:** `buried_at` is emitted by rule for all 174 figure→site links, 92 of
    them to temples, gurdwaras, darbars and memorials (Guru Nanak "buried at" 18 gurdwaras), and the
    exports carry it. Neutral predicate for non-tomb sites? The figure page heading no longer asserts it.

16. **Map selection history** (`MapPage.tsx`, round 6): the first selection pushes an entry tagged
    `__mapSelection`; site → site replaces; closing pops; a selection on an overlay entry (the palette's)
    replaces with `null` state — keeping the overlay marker made the palette's close step back and
    deselect the site (`e2e/map-selection-history.spec.ts`).
17. **Asked of Rauf, 17 October:** the Urdu word for *places* — «مقامات» currently heads both Sites and
    Places in search.
18. **Round 7.** `useShrineData({ acceptIndex: true })` is opt-in: only callers that read nothing but
    the slim index's ten fields may take its rows; everyone else gets `[]` + `loading` until the sheet
    lands. A new page that reads `shrines` without the option is safe by default. The sheet has a 10 s
    deadline (`SHEET_DEADLINE_MS`) after which the published snapshot is shown, dated, and the late live
    answer is adopted silently. `currentDataSource()` tells the banner which copy is showing.
19. **Interaction trap:** two history rules on the map (a selection is one entry; the raised sheet is
    one entry) registered in the same commit when a site was closed with the sheet raised, and Back
    reopened the site. Closing a site now folds the sheet in the same update.
20. **Asked of Rauf, 17 October:** crediting field photographs (surveyor by name? project? nothing?);
    author/licence for Wikimedia images and whether press photos stay.
