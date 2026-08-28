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

## STATUS, 27 August 2026 — the agent-executable queue is empty

**Everything in Lane A and Lane A′ that an agent could do without a decision from the project
head is done**, in one overnight run. A1 · A2 · A3 · A4 · A5 · A6 · A9 · A10 · B1 · B2 · B3 · B4.

**What is left, and what each waits on:**

| task | waits on |
|---|---|
| A7 / A8 — figure images | Lane B item 5: an editor's accept/reject and the tradition-sensitivity ruling |
| **A12** — the calendar is not all ʿurs | what a non-ʿurs day is called in each language, and whether the page keeps its title |
| **A13** — one place vocabulary, or two | a decision about which is canonical; measure the overlap first |
| Lane B (all five) | a human afternoon |

**Closed since this table was written, 27–28 August 2026:** **A11** — `/settings` shipped with nine
preferences, and on 28 August the gear reached every page and the reading size became a slider that
scales the whole document. **A14** — closed without taking any of its three options; the diagnosis
went down to *which section* moved, and each route got its own answer. **B4** — Lighthouse ran
27 August and was re-measured 28 August after the fixes; every route is now inside the CLS budget
and the map's TBT is 74ms against 4,306ms.

A12, A13 and A14 were new, found by A4 and B4 rather than planned — which is what those two tasks
were for. Each is written up below with the decision it needs, so the scoping conversation can
happen without re-deriving the finding.

**The night also produced work that was in nobody's plan**, because the gates found it: the dark
theme failed contrast on every route and had never been scanned; `--header-height` describes no
header in the app; all twelve bundle budgets were stale; 3 of the archive's 242 images are dead;
and 86 of 169 figure slugs diverge between the sheet and the graph. All are in `docs/HANDOVER.md`
§9 with dates.

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
> **Done 26 August 2026, `b7eb6f0`.** `src/lib/data/figureTimeline.ts` +
> `figureTimeline.test.ts` (15 assertions). The three refusals the task asked for turned out to
> be three, not one: an unplaceable figure is off the axis *and named beneath it*; **one
> recorded year is a point, never a bar** (six of the fifty-one members across the five orders
> have only a death year, or only a birth year, and reading `figureCentury` would have given
> each a hundred-year life); and two years in the wrong order are reported rather than swapped
> (fires on nothing today, tested synthetically). Below two placeable figures the section hides.
> CSS only — the century grid is one `repeating-linear-gradient`. Marks are firozi, not cobalt,
> per the design direction. Verbatim dates ride as the mark's tooltip rather than as text,
> because the derived year that positions a bar drops the "c." one member's source wrote.
> **Two things came out of it and are in HANDOVER §9:** `--header-height` (56px) describes no
> header in the app (71px desktop / 93px phone), found by the first sticky element on a narrow
> screen; and all twelve bundle budgets were stale, which is **B4's bundle half, done early**.

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
> **Done 26 August 2026, `bc126d2`.** `src/lib/data/placeFigures.ts` +
> `placeFigures.test.ts` (8 assertions). Two things the task did not anticipate.
> **The dedup is the feature**: six of Nankana Sahib's seven gurdwaras name Guru Nanak, so a row
> per `buried_at` edge would have reported six figures. **And the obvious join costs 305 KB** —
> `getSaintsForShrine` pulls `src/lib/kg.ts`, which statically imports the 426 KB graph onto a
> route that never carried it; the place page measured 608 KB against 292 and the build refused
> it. Use the `kgShrineFigures.ts` pattern on any route that is not already graph-bearing: link
> target from the 11 KB index, display name from the sheet row. Do **not** slugify
> `principal_figure` instead — 86 of 169 slugs diverge from the graph (HANDOVER §9, this date).
> The unreviewed-marking rule turned out not to apply: `buried_at` has no `reviewed` flag,
> because all 169 edges are rule-derived, and marking them would have invented a doubt.

### A4 — The field audit: every KG field, where does it render?

**Gap-finder, not a gap.** §9.99 ran this once and §9.100 found two more fields the next
day. Run it again after A1–A3: for every property on `KGSaint`, `KGOrder`, `KGPlace`,
event nodes, and every relation type, answer *"which page renders this, and does every
surface that shows the datum show its provenance marking?"* Write the table into
`docs/HANDOVER.md` §9 as a new entry. Fix only what is small (a missing field on an
existing section); anything larger becomes a new task appended to this plan.

Done when: the table is in HANDOVER with a date, and this file lists any follow-up tasks.
> **Done 27 August 2026.** Table and findings in HANDOVER §9. **Method warning for the next
> run:** a property-name grep answers "is this string in a component", which is not the question —
> it called `datePrecision`, `biographyReviewed`, `biographySource`, `buried_at`, `located_in` and
> `commemorated_by` unrendered, and all six are read by a `lib/data/` helper whose caller is the
> page. Hand-verify every hit. Three real gaps found; the parity half came out clean, including on
> the surfaces A2/A3/A10 added. One of the three is escalated as A12 below.

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
> **Done 27 August 2026, `a87442b`.** The anchor approach was right; **the link's source was
> mis-specified.** `SaintPage`'s "Sources" section is the provenance of the *figure's data* —
> which dataset row a date was read out of — not a bibliography. The bibliographies are on the
> shrine pages, and that is where the link now comes from, on the 97 citations whose source is
> shared. All 464 sources are addressable: the 28 shared ones listed as before, the 436 cited once
> behind a disclosure that opens itself when the URL asks for a source inside it. Each source now
> names its entries instead of counting them. Three things worth carrying forward, all in the
> commit message: truncating the anchor to 60 characters collided 22 times (five volumes of one
> Tazkirah share their first sixty characters), **`:target` never matches in this app**, and
> `.coverage-rests-list`'s "one column, always" rule had never applied because `list.css` is
> imported after `components.css`.

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
> **Changed again 26 August 2026, `1e9a7b4`:** at the project head's request the calendar is now
> the page's *default view and opening section*, with coverage, the moon-sighting caveat,
> "Coming up" and the month listing all below it. Three consequences for A6: the chip rows
> belong at the top of that opening section, where they will be the first thing under the
> calendar's own month rail; `?view=` is now written explicitly in both directions (the default
> is conditional — a `/almanac#<slug>` deep link opens the *list*, because that is the only view
> carrying the anchor); and the route's Urdu no-leak budget dropped 39 → 34 because one month's
> cards are on the page instead of thirteen listings, so a filter that changes what renders will
> move that number again.
> The calendar's honesty rule is in `src/lib/data/almanacCalendar.ts`: only an observance
> recorded with a day gets a day; the ten recorded to a month alone are listed unplaced
> beneath the grid. A filter that hides the unplaced list would undo that.
>
> **Done 26 August 2026, `cc44976`.** The design decision the task did not anticipate:
> **filter the sites the almanac is built from, not the four lists it produces.** One line
> instead of four, and it makes the coverage block follow the filter automatically — filtering
> the outputs separately would have left "33 of 171 sites" printed under a page showing 35.
> Collapsed behind a one-row disclosure, because the calendar had just been moved to the top of
> the page and two chip rows above it would have put it back where it was; it opens
> automatically when a filter is active, including on a shared link. The place row shows twelve
> of 66 with the rest behind a dashed "54 more" chip. `e2e/almanac-facets.spec.ts` (5 tests, the
> round-trip in both languages) — which also closes part of **B3**.

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
> Status: **closed — shipped 27 August 2026, marked here 28 August.** Both halves are in
> `src/components/search/ArchiveSearch.tsx`: the `<mark>` highlight (the matched segments are
> split before render, so it is RTL-safe) and the fifth "Days" group, whose rows link to
> `/almanac#<slug>`. This line said "open" for a day after it was done — the same staleness
> the struck-through bibliography finding in CLAUDE.md exists to warn about.

### B2 — The saved list, made visible where it's used

The saved ("ziyarat") list gained top position in the filters on 26 Aug. Two follow-ups:
(a) on `/shrine/:slug`, the Save button flips label to "Saved" when active (check —
if it already does, this half closes as no-op);
(b) in `ArchiveSearch`, a saved shrine's row carries a small marker (reuse the existing
saved iconography), so search doubles as "find the one I saved."
Done when: verified live; no new colour-only distinction (a11y rule); verify green.
> Status: **closed — shipped 27 August 2026, marked here 28 August.** (a) `ShrinePage` flips the
> button to `t('savedLabel')` on `isShrineSaved` and carries `aria-pressed`; (b) `ArchiveSearch`
> marks a saved row with `.archive-search-saved` plus an `sr-only` label — a marker and a name,
> not colour alone.

### B3 — e2e coverage for the 26 Aug surfaces

The archive-wide palette and the reordered filters shipped with unit tests and manual
Playwright drives, but no committed specs. Add: `e2e/archive-search.spec.ts` (open via
button and ⌘K on a non-map route, type, Enter navigates, map route stands down — port the
session's throwaway scripts) and extend `e2e/filter-layout.spec.ts`'s neighbours if gaps
remain. Mind HANDOVER §9.122: in dev, the first-ever palette open reloads once (Vite
discovering minisearch) — build-based e2e does not hit this.
Done when: specs pass in the sandbox (`npm run build:e2e` first); verify green.
> Status: **partly done 26 August 2026.** `e2e/almanac-facets.spec.ts` landed with A6
> (`cc44976`) and covers the new facets in both languages. **`e2e/archive-search.spec.ts` landed
> 27 August in `7ebec1a` with 8 tests, which closes B3.** What was true before it was written: **the suite flakes under local parallel load** —
> 1–2 tests fail per full local run and they are different tests each time, because `workers: 1`
> and `retries: 2` are set only under `CI`. Every one passes in isolation and the failure is
> always a 30-second timeout rather than a wrong assertion. Re-run a named spec alone before
> believing a local red (HANDOVER §9, 26 August).

### B4 — Periodic honesty sweep

Once, after A1–A3 land: re-run the bundle-budget check, the a11y e2e in both languages,
and Lighthouse locally; record numbers (dated) in HANDOVER §9. New sections tend to cost
axe violations and eager bytes; measure rather than assume.
> Status: **partly done 26 August 2026.** The *bundle* half is done and dated (`6e8fe57`) —
> all twelve routes re-measured, every budget stale by 5–26 KB, the cause identified as the
> eager English string table growing 5 KB in two days. The *a11y* half has been run per-change
> rather than as a sweep: axe is clean in both languages on `/almanac` (list and calendar) and
> on all five order pages, desktop and phone. **Lighthouse has not been run**; that is what is
> left of this task, plus one new item the night produced — **no liveness check exists on the
> 242 populated external image URLs**, and two on `/order/qadiriyya` are already dead (one 403,
> one expired TLS certificate). A row whose hot-link is dead currently counts as *having* a
> photograph.
>
> **The image half is done, 27 August 2026** — `pipeline/check_image_liveness.py` +
> `pipeline/image_liveness.tsv`. **239 of 242 alive, 3 dead**, two of which are an entry’s only
> image, so "51 entries carry no photograph" is 53. The four wrong answers it took to get there
> are in HANDOVER §9 and are the more useful half: `urllib` takes 32s a request here, eight
> workers invented 55 dead Wikimedia images out of 429s, a browser pass from inside this sandbox
> reports 80 failures that are throttling rather than data, and curl here cannot see an expired
> certificate. ~~**Lighthouse is what is left of B4.**~~ **B4 is closed.** Lighthouse ran 27 August (`7ebec1a`,
> ten routes, `numberOfRuns: 1`) and was **re-run 28 August after the fixes it prompted** — three
> runs per route, medians, on a machine measured quiet first. Every CLS is now inside budget and
> the map's TBT fell 4,306ms → 74ms; the Urdu front door's 15.6s LCP is the one number that did
> not move, and the 27 August explanation for it is now disproven. Full table and method in
> HANDOVER §9, 28 August, "the archive got fast while nobody was looking".

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

### A12 — the calendar is not all ʿurs, and says nothing about it

**Found by A4, 27 August 2026.** `KGEvent.eventType` is populated on all 149 events and splits
**77 `urs` / 72 `observance`**. It reaches no surface. The 72 are Maha Shivratri, Diwali, Cheti
Chand, Guru Nanak Gurpurab, Vaisakhi, daily prakash, "Hinglaj Yatra halt", "Community worship" —
**the entire non-Muslim half of the archive's calendar, presented under the heading "The Urs
Almanac" with nothing marking that it is not an ʿurs.**

An ʿurs is a death anniversary kept as a festival of union. Diwali is not one. In an archive whose
stated subject is six traditions, and whose own data records the distinction on every row, this is
a content problem rather than a display nicety.

**Do:** carry `eventType` onto every surface that lists observances — the almanac's cards and
calendar, `RecordedObservanceList` (order, figure and place pages) — as a marking in the row, in
the archive's existing chip idiom. Where a surface builds its rows per *site* rather than per
event (`PlacePage`, since the recorded cell is a property of the site), the join has to reach the
event for its type; that is the only structural work here.

**Scope this with the reviewer before building**, because two of the decisions are editorial and
not an agent's:

1. **What a non-ʿurs day is called**, in English and in Urdu. "Observance" is the data's word and
   is thin; "festival" is wrong for daily prakash; the traditions have their own words.
2. **Whether the page is still called "The Urs Almanac".** 72 of its 149 entries are not ʿurs.
   Renaming the archive's most-linked page is the project head's call, and the honest alternatives
   ("The Calendar", "Days the shrines gather") lose the word the archive is organised around.

Do **not** infer a type where the data does not give one: `eventType` is present on all 149, so
there is no gap to fill, and there must be no fallback that guesses from the tradition.

Done when: every observance surface shows what the record calls the day; both languages; the
almanac's counts say how many of each; unit-tested join for the per-site surfaces; verify green.
> Status: open, needs scoping. Blocked-by: the two editorial decisions above.

### A13 — one place vocabulary, or a decision to keep two

**Found by A4, 27 August 2026.** The knowledge graph holds **94** place nodes and 169 `located_in`
edges; `getPlaceBySlug` and `getPlaceForShrine` are exported from `src/lib/kg.ts` and called by
nothing outside it. `/place/:slug` uses `src/lib/data/places.ts` instead — hand-curated, **69
entries**. The graph's vocabulary is published through the JSON-LD and RDF exports; the site's is
what readers see. A reader comparing the two would find different place sets.

Neither is wrong. Nothing has decided which is canonical, and that is the task: either the graph's
place layer becomes the source `places.ts` is generated from (with the drift guard the scripts
mirror already has), or the graph stops publishing a layer the archive does not stand behind.
Measure the overlap first — 94 against 69 is not 25 extra places, it is an unknown intersection.
> Status: open.

### A14 — the entity pages grow 1,455px two seconds after they render

**Found by B4's Lighthouse run, 27 August 2026.** CLS is **0.52 on `/saint`, 0.54 on `/almanac`,
0.22 on `/order`**, against a 0.1 budget, with zero unsized images. Measured directly at 390px,
unthrottled and warm: the article settles at 2,163px, then jumps to **3,618px**.

The cause is structural, not a bug in any one page: **the entity pages render their full layout
from the bundled knowledge graph before the shrine dataset arrives from the CSV.** Every section
that needs shrine data — "Where this figure rests", the observances, the associated-shrine cards,
A10's biography — appears about two seconds in. On a phone that is a page and a half moving under
the reader's thumb mid-sentence.

**Scope this with the reviewer**, because the three fixes trade different things:

1. **Reserve space** for the data-dependent sections. No blank, no jump, but the reserved height
   is a guess and is wrong for a figure with one shrine and a figure with sixteen.
2. **Render a skeleton** in those sections while `loading`. Honest and conventional; costs a
   skeleton design and puts grey boxes on a page whose whole aesthetic is quiet.
3. **Hold the article until the data arrives.** Zero CLS, and it trades a jump for two seconds of
   nothing — which on the archive's slowest route is a worse first impression, not a better one.

Whichever is chosen, the measurement to keep is the one above: article height over five seconds at
390px, and the observed CLS. Both are in HANDOVER §9 with today's numbers to compare against.
> **Status: closed, 27 August 2026 — and none of the three options was taken.** Measuring which
> *sections* arrive late ruled out the first two: `The life, from the entry` is 1,186px of the
> 1,455px and only 48 of 169 entries have one, so a reserve or a skeleton resolves to nothing on
> the other 121 and shifts the page by as much again. What was done instead is per route — the
> two late sections moved below the fold on `/saint`, the calendar's slot held open on `/almanac`,
> a viewport reserved in the loading branch on `/place`, and each photograph reserving its own
> measured box on `/shrine`. Every route is now inside the 0.1 budget: `/shrine` 0, `/place`
> 0.0004, `/almanac` 0.0211, `/order` 0.0235, `/saint` 0.0704. The instrument is
> `scripts/measure-cls.mjs` (`--sections` to diagnose, `--check` for the invariant); the
> photograph shapes are `pipeline/measure_image_shapes.py`. Full write-up, including four
> instrument failures and two unrelated defects found on the way, in HANDOVER §9.

## 5. Explicitly out of scope for this phase

- New content authoring (order histories, saint biographies beyond what the sheet/KG
  hold) — that is editorial work, not display work. (A7 is not an exception: it gathers
  *candidates with quoted provenance* for the editor; the publishing decision stays
  in Lane B.)
- AI-generated imagery of any figure, in any role, including as a placeholder.
- `/source/:slug` as a route (see A5), N3 field-kit PWA, N5 adopt-a-shrine — blue-sky
  items stay in `PROJECT_VISION.md`.
- Anything that writes to the Google Sheet (RULE 3) or deploys (Session-start rule).
