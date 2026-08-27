# Next steps — 26 August 2026: enrichment of what the site displays

**What this is.** The working plan from here. It supersedes the *sequencing* of
[`NEXT_STEPS_2026-08-21.md`](NEXT_STEPS_2026-08-21.md) (whose Lane A closed the same day it
was written); that document remains the record of what was done and why. The direction for
this phase, set by the project head on 26 August: **enrich the information the website
displays — the order pages first — and improve existing features.** Every task below was
checked against the repository on 26 August, not carried forward from an older doc.

**Who executes this.** These tasks are sized and specified so a smaller/cheaper model can
carry them, one task per session, without design judgement being the bottleneck. That is
why each task names its files, its data source, its definition of done, and — most
importantly — what it must *not* do. Read the guardrails first. When in doubt, do less and
report.

---

## 0. Guardrails for the executing agent — read before any task

These restate the operating contract (CLAUDE.md) as it applies to this plan. They are not
optional and they are not summaries — follow them literally.

1. **Never invent content (RULE 2).** Every task below is *display of data the repository
   already holds* — `data/kg.json`, `data/kg-sources.json`, the shrine snapshot, the
   relations. If a value is missing, the section hides or says "not recorded"; you do not
   fill it from general knowledge. Not a date, not a lineage, not an order's history. If a
   task seems to need content that isn't in the data, the task is mis-specified — stop and
   write that finding into this file instead.
2. **Session start:** make sure the dev server is running (CLAUDE.md "Session start");
   review every change at http://localhost:5173, driving it with Playwright from
   `node_modules` where a screenshot or DOM check is claimed. Do not deploy; do not push
   `1.7`. Push the working branch only when asked.
3. **Gates:** `npm run verify` green before every commit. UI strings go through
   `src/lib/i18n/uiStrings.ts` **and** `uiStrings.ur.ts` — never an inline
   `lang === 'ur' ? … : …` (ESLint blocks it). Every number rendered goes through
   `fmtNum()`. New sections need the RTL treatment the sibling sections already have.
3a. **Before deleting "dead" UI strings**, grep the *whole* of `src/` — `fieldLabels.ts`
   maps sheet columns to string keys and has already caught one too-narrow grep
   (`saintLabel`, 26 Aug).
4. **iCloud duplicates:** if the typecheck fails on a file you never touched, look for
   untracked `* 2.*` copies (`find . -name "* 2.*" -not -path "./node_modules/*"
   -not -path "./.git/*"`) and delete them. Known trap; they are never tracked by git.
5. **Dates are rendered as recorded.** Use the existing machinery —
   `DateAsRecorded`, `figureDates.ts`, `figurePrecision.ts`, `localizeRecordedDate` —
   and never convert a Hijri year to Gregorian or vice versa. An undated figure appears
   in an "undated" row (the pattern `orderUndated` already implements), never at a
   guessed position.
6. **Unreviewed stays labelled unreviewed.** 80 of 86 lineage links and 44 of 64 order
   memberships are machine-read and unreviewed. Any new surface that shows them inherits
   the `lineageUnreviewed` marking the existing surfaces carry (HANDOVER §9.85 is the
   lesson: provenance parity between surfaces does not happen by itself).
7. **When a task is done,** append one line to its entry here (`Done <date>, <commit>`),
   and put any non-obvious finding in `docs/HANDOVER.md` §9. RULE 0: nothing counts
   until it is committed.

---

## 1. Where the enrichment data is

For orientation, the shipped graph (`data/kg.json`, rebuilt by
`scripts/data/build-kg.mjs`, accessed through `src/lib/kg.ts`):

- **136 figures** (60 lineage-only), with `titles` (177), `altNames`, `figureType`,
  per-figure dates from the sheet (`figure_born`/`figure_died` via `figureDates.ts`),
  `biographySource`, disputed-date flags (11 figures).
- **5 orders** with `arabicName`, `founded`, `description`/`descriptionUr`.
- **94 places**, **149 observances** (77 urs) as event nodes carrying `shrineSlug`,
  `saintSlug`, `frequency`.
- **Relations:** `buried_at` (169), `located_in` (169), `belongs_to_order` (64),
  `disciple_of` (60), `successor_of` (26), `commemorated_by` (149).
- **Sources:** `data/kg-sources.json` — 464 sources, 533 citations —
  surfaced today only via `src/lib/data/sourceIndex.ts` inside `/about`.

The pattern this plan exploits, named in HANDOVER §9.85/§9.99/§9.100: **the archive
repeatedly holds data that no page renders.** Enrichment here means closing that gap, not
adding data.

---

## 2. Lane A — enrichment tasks, agent-executable, in order

### A1 — Order pages: the order's own urs calendar

**Gap:** `/order/:slug` lists members, dates, sites, lineage — but not one of the 77 urs
observances, though every one is keyed by `saintSlug` and `belongs_to_order` joins figure
to order. A reader on the Chishtiyya page cannot see when its saints' urs fall.

**Do:** a new `kg-section` on `OrderPage.tsx` — "Urs in this order" — listing each member
figure's urs observances (figure name → observance name, date **as recorded**, frequency),
each row linking to the shrine and to `/almanac`. Data: `commemorated_by` relations joined
through the order's membership list (helper in `src/lib/kg.ts`, unit-tested in
`src/lib/__tests__/`). Follow the almanac's date-honesty conventions (`ursDates.ts`,
`localizeObservance.ts`) — no date parsing beyond what those already do.

**Hide when empty.** New strings in both languages. Done when: section renders for an
order with ≥1 urs and is absent otherwise; unit test for the join; verify green; reviewed
at localhost:5173 in EN and UR.
> **Done 26 August 2026, `c2482cd`.** `getOrderObservances()` in `src/lib/kg.ts`;
> `src/lib/__tests__/orderObservances.test.ts` (14 assertions). The date is read off the
> shrine's `Events` cell through `parseObservances`, **not** from `KGEvent.date` — that field
> is a bare month on 16 of 149 nodes, so reading it would have shown a date for a sixth of the
> rows that can actually be dated. Two thirds of rows have no readable date and say so.
> `SEASON_LABEL_KEYS` moved to `formatDateWindow.ts` (two surfaces render a recorded season
> now). No-leak budget raised by exactly the new runs: +11/+7/+6/+5/+1, measured per route.
> Not covered by an e2e spec yet — see B3.

### A2 — Order pages: a century strip for the members

**Gap:** the `/graph` compare table computes each order's century span; the order page
itself states members' dates only as text rows. A reader cannot see the shape of an order
in time.

**Do:** a light, computed timeline on `OrderPage.tsx`: one row per dated member (bar from
born to died, rendered from `figureDates`/`figurePrecision`), undated members in the
existing `orderUndated` row — never placed on the axis. CSS only (no chart library);
follow the design direction (hairlines, no cards; see
`feedback_design_direction_os_minimal` / `docs/GOLD_STANDARD.md` spirit). Both themes,
RTL-correct (logical properties). Approximate dates get the precision marking the member
list already uses.

Done when: strip renders on orders with ≥2 dated members, absent otherwise; no invented
positions (an undated figure never appears on the axis — assert it in a unit test);
verify green; reviewed in both languages and both themes.
> Status: open.

### A3 — Place pages: who is commemorated here, and when

**Gap:** `/place/:slug` shows traditions present and sites — but not the figures
(`buried_at`, 169 edges) or the observances (`commemorated_by` through the place's
shrines) the graph already ties to the place.

**Do:** two new sections on `PlacePage.tsx`: "Figures commemorated here" (linking
`/saint/:slug`, with the lineage-only marking where it applies) and "Days observed here"
(observances at this place's shrines, dates as recorded, linking `/almanac`). Same
hide-when-empty, same bilingual strings, same unreviewed-inherits-marking rule.

Done when: both sections computed from relations (no new data), unit-tested joins,
verify green, reviewed at localhost:5173.
> Status: open.

### A4 — The field audit: every KG field, where does it render?

**Gap-finder, not a gap.** §9.99 ran this once and §9.100 found two more fields the next
day. Run it again after A1–A3: for every property on `KGSaint`, `KGOrder`, `KGPlace`,
event nodes, and every relation type, answer *"which page renders this, and does every
surface that shows the datum show its provenance marking?"* Write the table into
`docs/HANDOVER.md` §9 as a new entry. Fix only what is small (a missing field on an
existing section); anything larger becomes a new task appended to this plan.

Done when: the table is in HANDOVER with a date, and this file lists any follow-up tasks.
> Status: open.

### A5 — Sources: give the 464 sources a reachable surface

**Gap:** `data/kg-sources.json` carries 464 sources with 533 citations; the only render is
the aggregate inside `/about` (`ArchiveKnows`). A reader following a claim cannot get from
a shrine's bibliography line to "everything this archive cites this source for."

**Do (smallest honest version):** an anchored per-source listing inside `/about`'s source
index (each source gets an `id`), and links *to* those anchors from the saint page's
existing sources section (`SaintPage.tsx` `sourcesHeading`) where the source matches. Do
**not** build a new route in this task — `/source/:slug` needs prerender + nav + i18n
weight that wants its own decision. If, mid-task, the anchor approach proves wrong,
stop and write why here.

Done when: every source in the about index is addressable by URL fragment; at least the
saint-page sources link into it; verify green.
> Status: open.

### A6 — Almanac: filter by tradition and by place

**Gap:** the almanac lists all 149 observances; a reader planning around one city or one
tradition filters by eye. Both facets are already on the joined data (event → shrine →
category/place).

**Do:** two chip rows on `AlmanacPage.tsx` (same `filter-chips` idiom as the map sidebar,
same additive semantics as categories there), URL-param-backed like the map's filters so a
filtered view is shareable. Bilingual, Eastern numerals through `fmtNum`, hide a facet
with <2 values.

Done when: filters narrow the list, the URL round-trips them, an e2e spec covers one
filter in both languages, verify + relevant e2e green.
> Status: open. **Related work landed 26 August, `180c8db`:** the almanac gained a
> **calendar view** (`?view=calendar`), requested directly by the project head. It is
> URL-param-backed in exactly the idiom this task calls for, so A6's chip rows should follow
> the same `useSearchParams` pattern already in `AlmanacPage`, and should filter *both* views.
> The calendar's honesty rule is in `src/lib/data/almanacCalendar.ts`: only an observance
> recorded with a day gets a day; the ten recorded to a month alone are listed unplaced
> beneath the grid. A filter that hides the unplaced list would undo that.

### A7 — The figure-image batch: agents find candidate pictures for the order pages

**Gap:** the order pages' member lists (and the saint pages behind them) are text-only.
The archive's photo pipeline covers *shrines*; no figure has an image. Openly licensed
historical material exists for many of these figures — portraits in manuscript
collections, calligraphic panels, Company-school paintings, old lithographs — and finding
it is exactly the kind of parallel research work a fan-out of agents does well.

**This task produces candidates for the editor, not published images.** An image's
*identification* ("this depicts Baba Farid") is content under RULE 2: it must come from
the source, quoted, never from the agent's own judgement of a likeness. And imagery of
religious figures is tradition-sensitive — what is publishable differs across the
traditions this archive covers — so nothing ships without the Lane B review (item 5).

**Do:**
1. Build the target list from the graph: every member figure on the five order pages
   (`belongs_to_order`, deduped across orders, lineage-only figures included — they have
   pages too). ~50–60 figures.
2. **Check network access first.** This batch needs `WebSearch`/`WebFetch`. If external
   hosts are blocked in the running environment (the HANDOVER §9.53 situation), stop and
   record that here rather than burning a session — this task is environment-gated.
3. Fan out research agents — one per order is the natural split (five agents; split a
   large order in two rather than raising the per-agent load). Each agent, per figure,
   searches **openly licensed or public-domain collections only**: Wikimedia Commons
   first; then archive.org, museum open-access programs (V&A, Met, British Library
   releases), HathiTrust public domain. General image search may *locate* an item, but
   the candidate recorded must be the item on its licensed source page.
4. Each candidate row records: figure slug · image URL · source page URL · collection ·
   author/creator (as the source states) · **license, exactly as stated** · date/period
   the source gives · the source's own caption or title, **quoted verbatim** (this is the
   identification evidence) · image type (portrait / calligraphy / manuscript folio /
   shrine art) · agent's one-line note, clearly marked as a note.
5. Output: `pipeline/figure_image_candidates.tsv` (one row per candidate, the
   `photo_manifest.tsv` precedent; keep every field single-line), and the image files
   themselves under `media-source/figures/<figure-slug>/` (gitignored but kept — the
   iCloud-backed convention). Zero, one, or several candidates per figure are all fine;
   **an empty result is recorded as a row saying so**, so the next session doesn't
   re-search it.

**Hard rules for the agents (put these in every agent's prompt verbatim):**
- No AI-generated or AI-upscaled imagery, no modern devotional posters of uncertain
  authorship, nothing whose license the source page does not state.
- Never record an image as depicting a figure unless the source itself names the figure;
  a "possibly," "attributed," or lookalike goes in as `identification: uncertain` with
  the source's wording, or not at all.
- For figures whose `figureType` is Deity, Sikh Guru, or anything outside 'Sufi saint':
  collect, but tag the row `tradition-review: required` — imagery norms are an editorial
  decision, not an agent's.
- No image of the Prophet or his family in figural form, under any license.

Done when: the manifest is committed with every target figure accounted for (candidates
or an explicit empty row), the downloads sit in `media-source/figures/`, and a summary
(counts per order, per license, per `tradition-review` flag) is appended here and to
`docs/HANDOVER.md` §9.
> Status: **unblocked, and the shrine equivalent is running.** Network access was measured
> on 26 August 2026: `commons.wikimedia.org` returns 200 and the published sheet fetches with
> `-L`. HANDOVER §9.53 does not apply to this environment. The figure batch A7 describes is
> still open; what was launched instead, at the project head's request, is the **same method
> aimed at the 51 entries with no photograph at all** — targets in
> `pipeline/image-hunt/targets_{sikh,udasi,hindu-jain,muslim}.tsv`, candidates to
> `pipeline/image-hunt/candidates_*.tsv`, every hard rule above passed to the agents verbatim.
> Check the candidate files exist before trusting any summary of them.

### A8 — Wire approved figure images into the order and saint pages

**Conditioned on Lane B item 5** — do not start before the editor has marked approvals in
the manifest. Approved images move to `public/photos/figures/<figure-slug>/` (RMS pixel
comparison before any copy — filenames lie, per RULE 4), get a `figure_images` manifest
the build validates (license + attribution required fields, build fails loudly if
missing), and render: a small portrait on the order page's member row and on the saint
page masthead, each with the credit + license line (`photoCredit` idiom), proper `alt`
text built from the source's own caption, and graceful absence for the many figures that
will rightly have no image. Bilingual, both themes, a11y-checked.
> Status: open. Blocked-by: A7, then Lane B item 5.

---

## 3. Lane A′ — feature improvements, after (or interleaved with) the above

### B1 — Global search: show the match, and reach the almanac

Two small, separable upgrades to `ArchiveSearch`:
(a) highlight the matched substring in result names (`<mark>`, theme-aware, RTL-safe —
test with an Urdu query);
(b) a fifth result group, "Days" — observance names from the almanac's data, capped like
the others (`PER_GROUP`), each row navigating to `/almanac` (anchor to the observance if
the almanac has ids; add them if not).
Done when: both verified at localhost:5173 in both languages; entity-search unit tests
extended; verify green.
> Status: open.

### B2 — The saved list, made visible where it's used

The saved ("ziyarat") list gained top position in the filters on 26 Aug. Two follow-ups:
(a) on `/shrine/:slug`, the Save button flips label to "Saved" when active (check —
if it already does, this half closes as no-op);
(b) in `ArchiveSearch`, a saved shrine's row carries a small marker (reuse the existing
saved iconography), so search doubles as "find the one I saved."
Done when: verified live; no new colour-only distinction (a11y rule); verify green.
> Status: open.

### B3 — e2e coverage for the 26 Aug surfaces

The archive-wide palette and the reordered filters shipped with unit tests and manual
Playwright drives, but no committed specs. Add: `e2e/archive-search.spec.ts` (open via
button and ⌘K on a non-map route, type, Enter navigates, map route stands down — port the
session's throwaway scripts) and extend `e2e/filter-layout.spec.ts`'s neighbours if gaps
remain. Mind HANDOVER §9.122: in dev, the first-ever palette open reloads once (Vite
discovering minisearch) — build-based e2e does not hit this.
Done when: specs pass in the sandbox (`npm run build:e2e` first); verify green.
> Status: open.

### B4 — Periodic honesty sweep

Once, after A1–A3 land: re-run the bundle-budget check, the a11y e2e in both languages,
and Lighthouse locally; record numbers (dated) in HANDOVER §9. New sections tend to cost
axe violations and eager bytes; measure rather than assume.
> Status: open.

---

## 4. Lane B — blocked on the editor (unchanged queue, restated so it isn't lost)

Nothing here is agent-executable; each names what it waits for.

1. **The review desk queue** — 44 unreviewed order memberships, 80 unreviewed lineage
   links, 76 `reviewNeeded` merge checks, 11 disputed-date figures. `/review` exists and
   verdicts land (`ec68dda`); what is missing is a human afternoon. Every A-task above
   that displays these edges displays them *as unreviewed* until this happens.
2. **0 of 168 Urdu articles human-read** — still the largest single risk (21 Aug plan §0,
   unchanged).
3. **Pending sheet patches** — `data/patch_data_hygiene_2026-08-21.csv` (two Location
   fixes) still awaits import. Import settings per RULE 3.
4. **Media** — Mauj Darya Bukhari re-shoot, Data Darbar / Bibi Pak Daman re-shoots,
   the zero-audio gap. Waits on the surveyor (message drafted:
   `docs/message_to_saifullah_2026-08-16.md`).
5. **Figure-image approvals** (created by A7) — per-candidate accept/reject in
   `pipeline/figure_image_candidates.tsv` (an `approved` column the editor fills), plus
   the tradition-sensitivity ruling for every row A7 tagged `tradition-review: required`.
   Nothing from A7 renders anywhere until this happens; A8 is the wiring that waits
   on it.

---

### A9 — Figure pages: the four sections that would make an empty one informative

**Requested by the project head, 26 August 2026**, with a screenshot of
`/saint/baba-pir-ratan-nath`: a page carrying a name, three titles, one shrine row and nothing
else. The archive holds, for that exact figure, a place (Peshawar), an observance ("Maha
Shivratri"), a photograph of the site, the site's category/type/status, a dated
`year_built` with its precision and note, and a full `## Overview` whose second sentence is
about the yogi-saint himself. None of it reaches the figure's page.

**Do**, all display of held data:

1. **"Where this figure rests"** — `placesForShrine` link(s) plus the recorded `Location`.
2. **"Days kept for this figure"** — every recorded observance, not only a dated one inside
   twelve months (`nextUrs` is the only observance surface today). **Reuse A1 directly**:
   `parseObservances` + `formatSourceDate` + `localizeObservance`, "date not recorded" where
   there is none.
3. **The site's photograph and facts on the associated-shrine rows.** The order page's member
   list already makes the argument: a figure has no portrait, and inventing one is out of the
   question, but the shrine that holds them is photographed for 118 of 169 entries.
4. **"What the archive does not record"** — an explicit list where there are no dates, no
   order, no teachers. This is the ethos of `/about` applied to a figure.

Done when: all four hide cleanly when empty, bilingual, unit-tested joins, reviewed in both
languages at localhost:5173.
> Status: open.

### A10 — The entry's biography on the figure's page, with the misattribution guard

32 entries carry an explicitly biographical section — `## The Life of the Saint` (26),
`## The Life of the Poet-Saint` (4), `## The Saint and the Tradition` (2) — and it renders only
on the shrine page. It is the single largest body of real biographical prose the archive holds.

**The guard is the task.** Show it **only** where the entry names *this* figure as its
`principal_figure`, or where the figure is the only one `buried_at` that entry. Some entries
hold several figures, and echoing one entry's biography onto two figure pages would attribute a
life to the wrong person — which is a RULE 2 violation produced by a layout decision. Attribute
visibly ("from the entry for X", linked), never silently.

Done when: the guard is unit-tested against the shipped data, including at least one
multi-figure entry that correctly shows nothing.
> Status: open.

### A11 — Settings: what a reader can actually customize

**Requested by the project head, 26 August 2026.** Today the sidebar Settings header holds two
preferences: directory mode (`shrines_directory_mode`) and the numerals toggle.
`src/lib/storageKeys.ts` is the persistence convention.

**Scope this with the reviewer before building.** "Customizations" points at several different
features — display density, default language, map basemap, saved-list behaviour, reduced
motion, default landing view — and the answer changes the shape of the work entirely. One round
of questions first; then build. Design direction is `feedback_design_direction_os_minimal`
(hairlines not cards, cobalt for interactive only).
> Status: open, needs scoping.

## 5. Explicitly out of scope for this phase

- New content authoring (order histories, saint biographies beyond what the sheet/KG
  hold) — that is editorial work, not display work. (A7 is not an exception: it gathers
  *candidates with quoted provenance* for the editor; the publishing decision stays
  in Lane B.)
- AI-generated imagery of any figure, in any role, including as a placeholder.
- `/source/:slug` as a route (see A5), N3 field-kit PWA, N5 adopt-a-shrine — blue-sky
  items stay in `PROJECT_VISION.md`.
- Anything that writes to the Google Sheet (RULE 3) or deploys (Session-start rule).
