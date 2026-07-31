# Project head feedback — triage, plan, and Claude Code prompt

I read every comment against the actual code (not just the surface complaint) so the fixes address
the real cause, not just the symptom. Each item below is tagged:

- **[CODE]** — a bug or UX gap in `src/`, fixable in this repo, no content decisions needed.
- **[DATA]** — the code is doing the right thing; the *content* in the Google Sheet needs editing.
  Not something to hand to Claude Code as a "fix the bug" task.
- **[JUDGMENT]** — a design/scope call where I picked an interpretation; flagged so you can override it.

---

## 1. Basemap labels alternate English/Urdu when zoomed out at Data Darbar — **[CONFIRMED FIX, needs a MapTiler account]**

`ShrineMap.tsx`'s default layers (CARTO Voyager/Dark/Light, Esri streets/satellite) are all rendered
from OpenStreetMap `name` tags, which are inconsistently tagged Urdu-vs-English by different local
mappers in Pakistan — that's the alternating labels. CARTO/Esri's free basemaps have no language
override at all, so there's no fix available on the current default layers.

MapTiler is different and *does* support this, confirmed against their docs: any style built in their
Map Designer has a Worldview → Language setting — "Defined by style" (today's messy default), "English,"
or "Local." Setting it to English makes every label use the OSM `name:en` tag where available, instead
of whatever a local mapper happened to use. This is a property of the style itself, so it applies to
both their raster tiles (what our Leaflet map already knows how to load, behind `VITE_MAPTILER_KEY`)
and their vector SDK — no need to replace Leaflet.

**The fix, concretely:**
1. Create a free MapTiler Cloud account (free tier: 5 custom styles, 100k tile requests/month —
   comfortably enough for this project's traffic).
2. In Map Designer, duplicate an existing base style (e.g. "Streets"), open Settings (Alt+S) →
   Worldview → Language, set it to English, and publish.
3. Hand the resulting style ID to whoever's doing the code work — swapping it in for `streets-v2`/
   `topo-v2` in the existing MapTiler `TileLayer` in `ShrineMap.tsx` is a one-line URL change, since
   the raster-tile plumbing is already wired up behind the API key.

The account creation and Map Designer clicking-through is a web-UI task only you can do (step 1-2
below, in your checklist); step 3 is trivial once you have the style ID.

## 2. Saifullah's photos aren't on the site yet — **[DATA — not a code task]**

Images are plain URLs in the `Image 1` / `Image 2` sheet columns (see `IMAGE_KEYS` in
`src/lib/data/constants.ts`) — there's no code gap here. The site will pick up new photos the moment
the sheet has links to them. The only decision needed is where the photos get hosted (Wikimedia
Commons, Drive-with-public-link, etc.) so they have a stable public URL to paste into the sheet. If
Saifullah has a lot of photos, I can build a small helper script that takes a folder of images plus a
shrine-name mapping and writes the sheet rows for you — say the word and I'll scope that separately.

## 3. Left-align the "Shrine Facts" popup text — **[CODE]**

`ShrineInfobox.tsx` renders into `.infobox-row` / `.infobox-label` / `.infobox-value` in
`src/styles/shrine.css` (~line 255–285). None of those rules currently set `text-align`, so it's
inheriting alignment from somewhere else (likely a mobile-breakpoint or RTL rule elsewhere in that
stylesheet) — worth a proper audit rather than a blind CSS add. Fix: explicitly set
`text-align: start` (the logical property, so it still right-aligns correctly for Urdu/RTL) on the
label/value/category-badge rules, and check both breakpoints and both languages after.

## 4. Book names marked with `**stars**` should render bold, not literal asterisks — **[CODE]**

Confirmed root cause: `ShrineArticle.tsx`'s `ArticleSection` renders section content as plain text
inside `<p>` tags — there's no markdown handling at all, so any `**Book Title**` in the sheet shows
up as literal asterisks. Fix: add a small, deliberately narrow inline-bold renderer (`**text**` →
`<strong>`, nothing else — not a full markdown parser, to avoid opening up formatting/injection scope
creep) and use it wherever article prose and citation text render (`ArticleSection` in
`ShrineArticle.tsx`, and citation titles in `SourcesProvenance.tsx`). Also strip any unpaired stray
`**` defensively so a typo in the sheet never leaks asterisks to readers.

## 5. Events (dhammal, qawwali, etc.) with times should be in Shrine Facts — **[CODE + DATA]**

The sheet already has an `Events` column and it already *can* appear in the infobox (Data Darbar's
row shows "Qawwali on Thursdays between Zuhr and Asr" today) — but `Events` isn't in
`INFOBOX_PRIORITY_KEYS` (`src/lib/data/constants.ts`), so it isn't guaranteed a slot and can get
crowded out by `MAX_INFOBOX_ROWS` (currently 8). **[CODE]** fix: add `'Events'` to
`INFOBOX_PRIORITY_KEYS` so it always shows when present. The "add times" part is mostly **[DATA]**:
where an entry doesn't already read like "Qawwali on Thursdays between Zuhr and Asr," someone doing
the shrine research needs to add the day/time — that's a content backfill, not a rendering bug (see
item 11, many shrines have this column empty entirely).

## 6. Bibliography section should be bullet points, one per source — **[CODE]**

Same root cause as item 4: the "Sources" section goes through the generic `ArticleSection` renderer,
which only knows how to make paragraphs. Fix: when rendering the `sources` section specifically (id
`'sources'` from `ARTICLE_SECTION_DEFINITIONS`), split its content by line instead of by blank-line
paragraph, and render each non-empty line as an `<li>` in a `<ul>` instead of a `<p>`. Pair this with
item 4's bold-title parsing so a source line like `**Book Title**, Author, 1998` renders as a bolded
title inside its own bullet.

## 7. Clicking a related shrine should land at the top of the new page, not the bottom — **[CODE]**

Confirmed: there's no route-level scroll reset anywhere. `App.tsx`'s `RouteAnnouncer` only moves
accessibility focus on navigation, it never calls `window.scrollTo`. The existing `ScrollToTop.tsx`
is a different thing (a floating "back to top" button, scroll-position-triggered). Because
`RelatedShrines` cards sit near the bottom of the page, clicking one keeps the browser's scroll
position and the new shrine page renders already scrolled down. Fix: add a scroll-to-top-on-route-
change effect keyed on `location.pathname` (e.g., extend `RouteAnnouncer` or add a sibling component
in `App.tsx`) — guard it so it only fires on actual page changes, not on in-page anchor jumps from
`ContentsNav` (those stay on the same pathname, so a pathname-keyed effect won't touch them).

## 8. Simplify the main-page popup: drop the era line and saint button, give icons more room — **[CODE — decided]**

In `MapSidebar.tsx`'s browse/list view, the vertical stack today is: search bar → category chips →
region chips → **saint chips** → **`TimeSlider` ("era")** → result count ("163 shrines") → the shrine
list (with category icons/thumbnails). **Decision: keep both filters, but move them behind a
collapsed "More filters" disclosure** (closed by default) rather than deleting them — the saint chips
and era slider stay functionally available for anyone who wants them, but neither is in the default
view, so the category chips and shrine list/icons get the extra room. A small "More filters" toggle
button (with a dot/badge if saint or era is currently non-default, same idea as the existing
`filter-active-dot`) sits where the saint chips used to start; expanding it reveals the saint chips and
era slider together.

## 9. Search doesn't surface the right result (e.g. "Mian Mir" takes a lot of scrolling) — **[CODE, confirmed bug]**

Found the actual bug. `src/lib/search/search.worker.ts` uses MiniSearch, which *does* return results
ranked by relevance. But `useSearch.ts` throws that ranking away by collecting the matches into a
`Set<number>`, and `MapSidebar.tsx`'s `filtered` memo does `shrines.filter(s => searchIds.has(s.id))`
— filtering preserves the original (alphabetical-within-category) array order, not MiniSearch's
relevance order. So a strong match like "Mian Mir" gets displayed whenever it happens to fall in
the underlying list, not first. Fix: have `useSearch` return an ordered array of ids (preserving
MiniSearch's ranking) instead of a `Set`, and when a search query is active, sort `filtered` by that
rank instead of default array order. This is a real, self-contained bug fix — not a data or design
question.

## 10. One clean date of establishment instead of "completed/consecrated" — **[CODE + DATA]**

`ShrinePage.tsx` already resolves to a single `founded` value for display (`Founded/Opened` ||
`Founded` || fallback) — there's no duplicate-field bug. What you're seeing for Mian Mir is the
literal *text* in that one cell: `"Completed/consecrated 1640"`. **[CODE]** fix: add a small
display-time normalizer that strips leading qualifier words ("Completed", "Consecrated",
"Completed/consecrated", "Built", etc.) from the Founded/Opened value wherever it's rendered
(`ShrinePage.tsx` hero meta line and `ShrineInfobox.tsx`), so every shrine shows a clean date/year
consistently — this fixes all 163 rows at once regardless of how each was originally phrased in the
sheet, no manual sheet editing required.

## 11. Some pages have no events listed; "Sindh" is spelled "Sind" in places — **[DATA]**

Missing events (Mian Mir among them) is a content gap — the `Events` column is empty for a number of
shrines and needs to be filled in from research, same bucket as item 5's "add times" ask.
"Sind" vs. "Sindh": confirmed multiple rows in the dataset use the bare word "Sind" (not "Sindh").
This should be corrected at the source (a find-and-replace in the Google Sheet, since it's pure
spelling and the sheet is the system of record) — I'd also add a one-line check to
`npm run data:validate` that fails the build if a standalone "Sind" (not "Sindh"/"Sindhi") shows up
again, so it can't quietly creep back in.

---

## What this means for a single Claude Code session

Items 3, 4, 6, 7, 8, 9, and the code half of 5 and 10 are self-contained, verifiable code changes with
no open content decisions — good candidates for one focused session. Item 1's code change (swapping the
MapTiler style ID into `ShrineMap.tsx`) is trivial but blocked on you creating the MapTiler style first
(see checklist) — once you have the ID, it's a quick one-line follow-up, not worth holding up this
session for. Items 2 and 11's data half are yours (or Saifullah's) to handle in the sheet — the prompt
below adds a permanent guard for the "Sind" typo but does not attempt to invent event times or photos.

---

## Prompt to paste into Claude Code

```
Work in the Sufi Shrines project repo. Read CLAUDE.md first for conventions (npm run verify before
committing, TypeScript strict, no new lint warnings). Make the following independent fixes. Do each
as its own small, reviewable commit. Add/update unit tests where the existing test suite already
covers the area you're touching (see src/**/__tests__).

Note: the basemap English-labels fix (item 1 in the feedback doc) is already done — don't touch
src/components/map/ShrineMap.tsx's MAPTILER_STYLE_ID/getDefaultLayerConfig logic, .env, or
.env.example beyond what's needed for the tasks below.

1. Left-align Shrine Facts infobox text.
   Audit src/components/shrine/ShrineInfobox.tsx and its styles in src/styles/shrine.css
   (.infobox-row, .infobox-label, .infobox-value, .infobox-category-badge, roughly lines 220-290 and
   860-905). Find whatever is currently causing non-left alignment (check mobile breakpoints and any
   inherited rule, not just this block) and set text-align: start explicitly (use the logical
   property, not "left", so Urdu/RTL still right-aligns correctly). Verify in both languages and at
   mobile width.

2. Render **bold** markdown instead of literal asterisks, and bullet the Sources section.
   Add a small, narrowly-scoped inline renderer that only handles **text** -> <strong> (not a general
   markdown parser) and defensively strips any unpaired stray "**". Use it in
   src/components/shrine/ShrineArticle.tsx's ArticleSection content rendering, and in the citation
   title/notes rendering in src/components/shrine/SourcesProvenance.tsx.
   Separately, in ShrineArticle.tsx, when rendering the section whose id is "sources" (from
   ARTICLE_SECTION_DEFINITIONS in src/lib/data/constants.ts), split its content by line instead of by
   blank-line paragraph and render each non-empty line as an <li> in a <ul> instead of a <p>. Keep
   every other section rendering as paragraphs (don't change history/architecture/rituals/etc).

3. Promote Events into Shrine Facts.
   In src/lib/data/constants.ts, add 'Events' to INFOBOX_PRIORITY_KEYS so it's guaranteed a slot in
   ShrineInfobox rather than competing with MAX_INFOBOX_ROWS. Don't touch the existing "Events & Urs"
   long-form article section — that stays separate.

4. Scroll to top on shrine navigation.
   There's currently no route-level scroll reset in src/App.tsx (RouteAnnouncer only moves a11y
   focus). Add an effect keyed on useLocation().pathname that calls window.scrollTo(0, 0) on real
   page changes (e.g. clicking a RelatedShrines card, which currently leaves the browser scrolled to
   wherever it was on the previous page). Make sure it does NOT interfere with same-page in-page
   anchor navigation from src/components/shrine/ContentsNav.tsx (those don't change pathname, so a
   pathname-keyed effect should naturally leave them alone — just confirm this with a quick manual/e2e
   check).

5. Move the era slider and saint filter behind a "More filters" disclosure.
   In src/components/map/MapSidebar.tsx's list/browse view, the saint filter-chip block and the
   TimeSlider ("era") block should no longer render inline by default. Add a collapsed-by-default
   "More filters" toggle button in their place (collapsed/expanded local state is fine, doesn't need
   to persist across sessions) — when expanded, it reveals the saint chips and era slider together;
   when collapsed, neither takes up space. Give the toggle button its own active-indicator (reuse the
   existing `filter-active-dot` pattern) so it's visually obvious when a saint or era filter is applied
   even while the section is collapsed. Keep all existing filtering logic (eraMin/eraMax/activeSaint
   props, clearAllFilters, hasActiveFilter, URL param sync in MapPage.tsx) working exactly as today —
   this is a visibility/layout change, not a functional one. Confirm the category chips and shrine list
   get visibly more default vertical room as a result.

6. Fix search result ordering (the real bug behind "searching X takes a lot of scrolling").
   In src/lib/search/useSearch.ts, MiniSearch's ranked results are being collapsed into a
   `Set<number>`, which throws away relevance order — src/components/map/MapSidebar.tsx then filters
   the shrines array by that Set, so results appear in original list order instead of best-match-
   first. Change useSearch to return an ordered array of ids (preserving MiniSearch's own ranking from
   src/lib/search/search.worker.ts), and update MapSidebar's `filtered` memo to sort by that rank when
   a search query is active (fall back to the existing grouped/alphabetical order when there's no
   query). Add/adjust a unit test asserting that a strong match ranks before weak/incidental matches.

7. Show one clean date of establishment, not qualifier text like "Completed/consecrated 1640".
   Add a small normalizer (e.g. in src/lib/data/fieldAliasing.ts) that strips leading qualifier words
   — "Completed", "Consecrated", "Completed/consecrated", "Built", "Founded", "Opened", and similar —
   from a Founded/Opened value before display, leaving just the clean date/year. Apply it everywhere
   this field is rendered: the hero meta line in src/pages/ShrinePage.tsx and the infobox row in
   src/components/shrine/ShrineInfobox.tsx. Add a unit test covering "Completed/consecrated 1640" ->
   "1640" (or equivalent clean form) and confirm it doesn't mangle values that were already clean.

8. Guard against the "Sind" vs "Sindh" typo recurring.
   Add a check to the data validation pipeline (scripts/data, run via `npm run data:validate`) that
   fails/warns if any field contains the standalone word "Sind" not followed by "h" (i.e. not "Sindh"
   or "Sindhi") — a simple word-boundary regex is enough. This is a guard rail, not a fix for existing
   sheet content (that's a manual find-and-replace in the Google Sheet, outside this repo).

After all of the above: run `npm run verify` and `npm run e2e` (per CLAUDE.md's definition of done),
and fix anything that breaks, including the Urdu no-English-leak guard.

Explicitly out of scope for this session — do not attempt these:
- The basemap fix (already shipped separately — see the note above).
- Adding photos or writing Events/date content into the sheet (content work, not code).
- Backfilling missing Events values or fixing "Sind" spelling in the actual sheet data.
```

---

## Your checklist (things Claude Code can't do for you)

**Do this yourself, whenever's convenient (not urgent, doesn't block the Claude Code session):**

- [ ] **Basemap labels (item 1):** create a free MapTiler Cloud account at cloud.maptiler.com, open
      Map Designer, duplicate an existing base style (e.g. "Streets"), go to Settings (Alt+S) →
      Worldview → Language, set it to **English**, and publish. Grab the resulting style ID (or the
      full style/tile URL) and send it over — swapping it into `ShrineMap.tsx` in place of the current
      `streets-v2`/`topo-v2` MapTiler layer is a one-line change once you have it. Also make sure
      `VITE_MAPTILER_KEY` is set (see `.env.example`) so the app actually uses your MapTiler account
      instead of just the CARTO/Esri layers. Free tier (100k tile requests/month) should be plenty.

**Google Sheet edits (the CSV is the source of truth — none of this lives in the repo):**

- [ ] **Saifullah's photos:** pick a stable public host for the images (Wikimedia Commons is the
      cleanest fit for a heritage project; a "share" link from Drive/Dropbox also works). Then paste
      the URLs into `Image 1` / `Image 2` (and the credit columns) for each shrine. If there are more
      than a handful, tell me and I'll build a bulk-import helper instead of you pasting link by link.
- [ ] **Events data:** for shrines with an empty `Events` column (Mian Mir is one confirmed example),
      add what's known — event name plus day/time, matching the style already used for Data Darbar
      ("Qawwali on Thursdays between Zuhr and Asr"). This needs someone who actually knows each
      shrine's schedule — not something to guess at.
- [ ] **"Sind" → "Sindh":** find-and-replace the standalone word in the sheet. Check each hit in
      context before replacing — you want "Sind" as its own word, not inside "Sindhi" (which is
      already correct and shouldn't change).
- [ ] **Sources/bibliography formatting:** for the bold-book-title and bullet-list rendering to work
      well, each source should be on its own line in the `Sources` field, with book titles wrapped in
      `**like this**`. Worth a quick pass over existing entries to make sure they're already in that
      shape — Claude Code's renderer will bullet whatever lines are there, but it can't invent line
      breaks that aren't in the data.
- [ ] **Founded/Opened dates:** the code fix normalizes display text ("Completed/consecrated 1640" →
      "1640") automatically, so no sheet edit is required for that — but worth a quick skim of the
      163 entries once it ships to make sure the cleaned-up dates still read correctly and no year got
      mangled.

**After Claude Code finishes:**

- [ ] Pull the branch and click through the site yourself against the original 11 comments (in both
      English and Urdu) — especially the search fix (try "mian mir") and the scroll-to-top fix
      (click a related shrine from the bottom of a page).
- [ ] Confirm `npm run verify` and `npm run e2e` are green before merging (Claude Code should run
      these itself per CLAUDE.md, but worth double-checking, especially the Urdu no-English-leak
      guard given items 2 and 6 touch rendered text).
- [ ] Loop back to your project head with before/after screenshots or a preview link once it's live.
