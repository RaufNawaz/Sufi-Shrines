# Execution Plan — next steps

The sequenced, operational plan to run **while and after** Claude Code executes Track 0
(Urdu parity) and the roadmap. It threads the data/content backlog (`TODO.md`) together
with the product roadmap (`PROJECT_VISION.md`) into ordered milestones with dependencies,
owners, and acceptance criteria.

Read with: `CLAUDE.md` (rules), `PROJECT_VISION.md` (why/what), `URDU_IMPLEMENTATION_PLAN.md`
(Urdu how), `TODO.md` (live backlog).

---

## The one sequencing rule that matters

> **Data integrity → complete English content → Urdu content → features.**

You cannot correctly translate or enrich a row that is a duplicate, mis‑named, or has an
unresolved saint/date. So the data‑quality pass (M1) **blocks** the Urdu descriptions
(M3) and much of the enrichment. Doing them out of order means redoing work in two
languages.

Owners legend: **CC** = Claude Code (in‑repo code/data) · **Author** = careful human/Claude
prose or translation (reviewed) · **Chrome** = Claude‑in‑Chrome image/verification pass ·
**Human** = your judgment call/source decision.

---

## M0 — Urdu UI parity (in flight)

Track 0 of `PROJECT_VISION.md`: Urdu article content wiring, generic heading map, `fmtNum`
at the infobox/ToC/related/era sites, and the no‑English‑leak guard.

- Owner: CC. Depends on: nothing.
- **Acceptance:** a shrine page in `?lang=ur` is fully Urdu _except_ body prose still
  pending M3; numerals Eastern everywhere but coordinates; `npm run verify` + `e2e` green;
  no‑leak guard active.

---

## M1 — Dataset integrity pass ⟵ blocks M2/M3 — **RESOLVED 2026-07-10 (xlsx side)**

Resolve the known data‑quality issues before writing or translating anything new
(`TODO.md` §1).

- **De‑duplicate:** ~~"Jagannath Temple, Sialkot" (row 106) = "Shahwala Teja Singh Mandir"
  (row 72)~~ — re‑researched via web search; the Wikipedia redirect linking them is
  unsourced and the two fact‑sets (locality, founding story) don't overlap. Confirmed
  **genuinely distinct**; both now have descriptions and specific Location cells.
  ~~"Jhollay Lal Mandir" (78) likely = "Darya Lal Mandir" (101)~~ — confirmed **distinct**:
  78 is the Lasi‑community shrine on Darya Lal Street, Jodia Bazaar; 101 is the Custom
  House/Native Jetty temple. Both described.
- **Rename:** "Jamshoro District" (39) → "Shrine of Lakhi Shah Saddar" — done in the
  2026‑07‑06 21:31 batch.
- **Reconcile:** Dargah Fateh Pur Sharif (10) Founded/Opened cell clarified to distinguish
  site‑founding (1359) from the present dargah (c. 1940, post‑dating saint Syed Rakhyal
  Shah). "Shah Yousuf" (13) confirmed a genuinely distinct, if thinly‑documented, local
  shrine (Punjab Auqaf Sargodha zone) — not a conflation with Shah Yusuf Gardez (28);
  described. Patti Sahib & Panjvi Chati Patshahi coordinate collision was already fixed
  in the 2026‑07‑06 batch‑2 corrections.
- Owner: Human (source calls) + CC (apply to sheet/dataset). Depends on: nothing.
- **Acceptance:** zero known duplicates; every row has a distinct, correct identity and
  unique coordinates — **met** for the xlsx. Still open: `npm run data:snapshot` →
  `src/data/shrines-fallback.json` hasn't been run since this pass (or since the broader
  107→158‑row enrichment), so the live app's fallback data is stale relative to the xlsx;
  `npm run data:validate` should be run once that snapshot lands.

---

## M2 — English content completeness ⟵ depends on M1

Bring every row to full English content so parity is even possible (`TODO.md` §2–§4).

- **Descriptions:** write the 10 remaining (all unblocked once M1 resolves their
  duplicates/renames/sourcing); each needs a reliable source. Rows with no documentation
  (e.g. Guru Gurpat Mandir, Bhai Sant Thawan Das, Gurdas Ram, Dash Mesh Pita) → mark
  "poorly documented" rather than inventing.
- **Images (51 missing + disallowed):** one Claude‑in‑Chrome pass to pull Commons files
  (leads listed in `TODO.md` §3), replace Facebook/Flickr/CDN links, and **visually verify**
  the auto‑sourced ones flagged in `_image_unverified.md` (rows 68, 133, 138, 101, 120,
  122, 123, 132, 137).
- **Founded/Opened:** fill the 11 blanks where sourceable; otherwise "undocumented."
- **New shrines** (`TODO.md` §4): add the verified candidates (e.g. Girhor Sharif,
  Shikarpur Guru Nanak) with full fields.
- Owner: Author (descriptions) + Chrome (images) + Human (source decisions). Depends on: M1.
- **Acceptance:** 100% of rows have description + valid image (or explicit blank) + founded
  (or "undocumented"); no disallowed image hosts; provenance recorded; snapshot committed.

---

## M3 — Urdu content parity ⟵ depends on M1 + M2

Author the Urdu long‑form content that M0 wired up (`src/data/urdu-content.json`).

- Translate descriptions + section content to **native Urdu** (not MT), glossary‑enforced
  (`data/glossary.csv`), with Urdu section headings. Batches: (1) ~18 tour‑featured shrines
  incl. Kartarpur, (2) top‑traffic saints, (3) the rest. Numbers stay Western in stored
  text (render toggle handles digits).
- Extend the same treatment to `Events`, `Visiting Info`, and any facet still surfacing
  English.
- Owner: Author (reviewed). Depends on: M1 (correct rows) + M2 (final English to translate).
- **Acceptance:** the no‑English‑leak guard passes on **all** shrine pages (163 today) in
  `?lang=ur`; every ToC/heading/body is Urdu; batches flagged for human review until signed off.

---

## M4 — Trust, provenance & knowledge graph (Vision Tracks 6 + 2)

Deepen the scholarly core once the dataset is clean and bilingual.

- Provenance/confidence surfaced in `SourcesProvenance`; "how do we know this?" footnotes.
- Expand `data:validate` gates (schema, coords, dates, image reachability, Urdu‑leak).
- Enrich `data/kg.json` (lineages/silsilas/urs) + a `/graph` explorer; formalize LOD
  export and mint a **DOI** (Zenodo) with a versioned release.
- Owner: CC + Author (KG facts). Depends on: M1–M3.
- **Acceptance:** provenance visible on claims; release gate blocks on validation failure;
  citable dataset published.
- **2026-07-12: description-content trust work done under a dedicated plan** —
  see `docs/planning/DATA_QUALITY_PLAN.md`. Content-tier provenance backfilled
  for all 163 shrines, `shrine_entries/` reconciled against live data, 22
  tour-featured `ai-researched` descriptions fact-verified and corrected,
  `data:validate` gained content-quality gates, `SourcesProvenance` now shows
  tier + citations, and a correction-intake workflow is documented. Still open:
  80 more `ai-researched` shrines to fact-verify, and the DOI mint itself (see
  `docs/DATA_RELEASE.md`) still needs the maintainer's own account/login.

---

## M5 — Primary‑source library + grounded AI (Vision Tracks 1 + 5)

- `SourcesPage` + full‑text corpus search over `out/ocr/**` with page anchors.
- Semantic search in the map sidebar; "ask the archive" RAG that **cites the corpus or
  stays silent**.
- Owner: CC. Depends on: M4 (citation schema).
- **Acceptance:** every AI answer carries citations to page images; search works in
  en/ur; no ungrounded generation.

---

## M6 — Immersive pilgrimage + heritage‑at‑risk (Vision Tracks 3 + 7)

- Offline region packs (PWA), curated Urdu audio + transcripts, on‑site geofenced mode.
- Condition/threat status field + map layer + filter (many sites are damaged/lost).
- Owner: CC + Author (audio/status). Depends on: M2 (media), M4 (schema).
- **Acceptance:** a tour works fully offline; at‑risk layer filterable on the map.

---

## M7 — More languages + reach (Vision Tracks 4 + 8)

- N‑language refactor of `LanguageContext`/`uiStrings`; add Sindhi (RTL) as the proof,
  then Punjabi (Shahmukhi)/Persian.
- Per‑language prerender + `hreflang` + Urdu meta; documented embed; minimal read API.
- Owner: CC + Author (locales). Depends on: M0/M3 patterns proven.
- **Acceptance:** a third locale ships using the same architecture; Urdu pages are
  prerendered and shareable with correct SEO.

---

## Cross‑cutting / ongoing

- **Data‑ops workflow:** Google Sheet is the source of truth; paste **by column** matched
  by Name (never overwrite the whole sheet); after edits run `npm run data:snapshot` and
  commit `src/data/shrines-fallback.json`. In‑repo `src/data/urdu-content.json` holds Urdu
  long‑form until it can move into the sheet as `*_ur` columns.
- **Release cadence:** `npm run verify` + `e2e` per change; versioned data releases with
  changelog; keep Lighthouse/axe green in CI.
- **Housekeeping now:** remove stray `__probe_ur.mjs` / `__probe_ur2.mjs` from the repo
  root; archive the stale `NEXT_STEPS.md` (2026‑07‑04) into `archive/` (its live items are
  folded into `TODO.md` and this plan).
- **Reconnect Claude‑in‑Chrome** — it's the blocker for the image pass (M2) and image
  verification; several runs failed to connect.

---

## Critical path (fastest route to a credible bilingual v1)

**M0 → M1 → M2 → M3**, then M4. Everything after M4 is high‑value but optional for a
polished, trustworthy, fully bilingual public release. Start M1 the moment M0's code
lands, since M1 unblocks the most downstream work.

## Immediate next actions (this week)

1. CC finishes **M0** (Track 0) and opens M1 by applying the `TODO.md` §1 fixes.
2. Human: make the **duplicate/rename/date calls** in M1 (Jagannath, Jhollay Lal,
   Jamshoro District, Fateh Pur, Shah Yousuf) so CC can apply them.
3. Reconnect **Claude‑in‑Chrome** and run the M2 image pass.
4. Author starts **M3** Urdu descriptions for the tour‑featured shrines (Kartarpur first)
   as soon as their English rows are final.
