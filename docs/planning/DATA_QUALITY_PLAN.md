# Shrine Description Data-Quality Plan

A detailed execution plan for the highest-value, least-glamorous work left in this
project: making every one of the 163 shrine **descriptions** — and the pipeline that
produces and maintains them — actually trustworthy, not just complete. This is the
detailed spec for `PROJECT_VISION.md` Track 6 ("Trust, provenance & data quality") and
`EXECUTION_PLAN.md` M4, picking up exactly where the 2026-07-12 provenance/KG session
left off.

Read alongside: `CLAUDE.md` (conventions), `docs/planning/PROJECT_VISION.md` (north
star), `docs/planning/EXECUTION_PLAN.md` (how this fits the overall milestone chain),
`docs/planning/ENRICHMENT_RUNBOOK.md` (the house style + research rules this plan
builds on), `docs/DATA_DICTIONARY.md` (field reference).

---

## 0. How to use this document

Section 1 is a factual diagnosis — read it to understand *why* this work matters and
what's actually broken today (not hypothetical risk, observed gaps). Section 2 states
the principles that should resolve any judgment call not explicitly covered. Sections
3–5 are the actual work, phased and sequenced. Section 6 is what's deliberately
excluded. Section 7 is the finish line. This plan is additive to already-resolved work
(`EXECUTION_PLAN.md` M1's duplicate/rename fixes, the 2026-07-12 provenance backfill and
KG rebuild) — it does not revisit those decisions.

---

## 1. Diagnosis — where we actually stand

Grounded in a direct read of `data/provenance.json`, `scripts/data/{schema,validate,build-provenance}.mjs`, `shrine_entries/_INDEX.md`, `src/data/{shrines-fallback,urdu-content}.json`, `archive/_ENRICHMENT_LOG.md`, and `docs/planning/{PROJECT_VISION,TODO,EXECUTION_PLAN,ENRICHMENT_RUNBOOK}.md` on 2026-07-12.

### 1.1 We don't actually know where most descriptions came from

`data/provenance.json` has a `fields` map per shrine, and `build-provenance.mjs`
(landed 2026-07-12) guarantees every one of the 163 shrines has at least a baseline
**`Description Urdu`** entry (`method: "llm"`, unreviewed). That closed the Urdu
provenance gap. It did **not** touch the English **`Description`** field itself — only
**1 of 163** shrines (`allo-mahar`) has any provenance entry for
`Description` at all (`data-darbar` has extra entries too — Image 1, Latitude,
Longitude — but no `Description` entry either). For the other 162, there is no
machine-readable record of whether
the text is:

- drawn from a Tier-1 `shrine_entries/*.md` file (OCR'd primary texts + field survey,
  the richest and most rigorously cited material this project has),
- drawn from a Tier-2 `shrine_entries/*.md` file (the *Tazkirah Awliya-e-Pakistan*
  compendium),
- written by the automated enrichment pipeline (`tools/shrines_enrich.py` +
  Claude-assisted web research, per `ENRICHMENT_RUNBOOK.md` — the highest fabrication
  risk of the four, precisely because it's the least tied to a primary source), or
- original content that predates all of this tooling (whoever first populated the
  sheet).

This isn't a hypothetical gap — it's already produced a real contradiction. For
**Allo Mahar**: `shrine_entries/_INDEX.md` lists it as one of the 11 shrines the
project *deliberately declined to write a biography for* ("did not want to invent
biographies for a public site"). Yet the live `Description` field has a full
4,724-character description. And `provenance.json`'s own entry for Allo Mahar's
`Description` field says `method: "ocr"`, confidence `0.72`, with a note reading
*"Placeholder: OCR text awaiting human translation and summary."* Three different,
mutually inconsistent stories about the same 300 words a reader sees on the page. If
one shrine we happened to look at has this, others likely do too — we don't know how
many, because nothing checks for it.

### 1.2 No citation/Sources model exists in the data itself

The live schema (`scripts/data/schema.mjs`) has 11 fields — Name, Location, Category,
Latitude, Longitude, Founded/Opened, Sufi Saint, Image 1/2 (+ credits), Events,
Description. **There is no Sources field.** `PROJECT_VISION.md` Track 1 describes a
"citation object model (page, book, confidence, translator, reviewed?)" as a **future**
task ("First Claude Code task: design the source/citation schema") — it has never been
built. The only place real citations exist today is inside the `## Bibliography`
section of the 37 `shrine_entries/*.md` files (3–5 references each, per
`ENRICHMENT_RUNBOOK.md` house style) — and that's disconnected from the live dataset;
nothing links a rendered shrine page back to those bibliographies.

### 1.3 Two content-creation pipelines, never reconciled

There are two independent ways a shrine's `Description` gets written:

1. **Manual, cited**: hand-research a `shrine_entries/<Name>.md` file with sourced
   prose and a bibliography, then copy-paste the block into the sheet (the *only*
   documented merge step, per every file's own header instruction — it is not
   automated).
2. **Automated, uncited by default**: `tools/shrines_enrich.py --write` applies
   Claude-researched batches from `archive/_enrichment_batch.md` directly into empty
   cells, following the web-search-and-hedge rules in `ENRICHMENT_RUNBOOK.md` but
   without producing a structured citation record.

37 shrines have a `shrine_entries/` file; 163 have a live `Description`. Nothing
verifies that where both exist, the sheet actually contains the cited version rather
than an earlier or independently-drafted one (the Allo Mahar case above is exactly
this failure mode). `_INDEX.md`'s tier labels are consequently unreliable as a map of
"what's actually live and cited" — they record intent to write, not merge status.

### 1.4 Validation is schema-shape only, not content quality

`npm run data:validate` (`scripts/data/validate.mjs`) checks: Zod schema conformance
(required fields, coordinate bounding box, URL shape, controlled vocabularies), slug
uniqueness, and — as of 2026-07-12 — that every shrine has ≥1 provenance entry with a
valid `method`/`source`/`confidence`. The **only** content-level check on `Description`
prose itself is one warning: *"no Description or Events text."* There is no check for:
outlier length (too short to be substantive, or suspiciously long), near-duplicate text
across rows, leaked internal/placeholder strings (the exact "Placeholder: OCR text
awaiting..." string from §1.1 would pass validation silently forever), or presence of
any citation for AI-researched content.

### 1.5 No automated fact-verification exists anywhere in the pipeline

Every tool in `tools/` that touches text (`ocr_postcorrect.py`, `translate.py`,
`extract.py`) explicitly tags its own output `reviewed=false` and defers to a human.
`finalize_books.py` verifies OCR **completeness** (chars/page, script-language match),
never **correctness**. Nothing cross-checks a `Description`'s factual claims (dates,
lineage, founding stories) against the 30 OCR'd primary texts in `out/ocr/` that are
supposed to back this project's scholarly claim — and there isn't even a manifest
mapping which book covers which shrine, so that cross-check isn't currently possible
even manually without re-deriving the mapping from book titles by hand.

### 1.6 Urdu content: 100% AI-translated, 0% reviewed

All 163 `Description Urdu` entries are machine-translated "native prose," and
`archive/_ENRICHMENT_LOG.md` states plainly that *every* entry still carries the
standing NEEDS-HUMAN-REVIEW flag — none has been checked by a native speaker or
subject-matter expert. `FieldProvenance.reviewedBy` (`src/types/provenance.ts:14`) and
the `SourcesProvenance.tsx` UI to display it **already exist and work** (verified live
in-browser during the 2026-07-12 session) — the gap is purely that no review has
happened yet, so the field sits empty for all 163 entries. This is a populate-the-data
problem, not a build-the-feature problem.

### 1.7 What's already solid (don't rebuild this)

- `FieldProvenance` (`source`, `page`, `method`, `confidence`, `reviewedBy`, `date`,
  `notes`) is a well-designed, if under-populated, schema — extend it, don't replace
  it.
- `SourcesProvenance.tsx` already renders method, confidence, unreviewed badge, and
  reviewer — the `isUnreviewed()` bug (missing `llm` method) was fixed 2026-07-12.
- `build-provenance.mjs`'s pattern (idempotent, additive-only, never touches
  hand-curated entries) is exactly the right shape for the new backfill scripts this
  plan proposes — reuse it.
- `ENRICHMENT_RUNBOOK.md`'s research rules (web-search before writing, hedge uncertain
  claims, never fabricate, prefer authoritative sources) are the correct house style —
  this plan makes them *checkable*, not new rules.

---

## 2. Principles

1. **Machine-readable provenance, not tribal knowledge.** If a fact about a
   description's origin is known, it must live in `data/provenance.json`, not only in
   a person's memory, a prose log, or a `_INDEX.md` status label that can drift out of
   sync with reality (§1.1, §1.3).
2. **AI-drafted content is a draft until a human with source access says otherwise** —
   and that status must be visible on the page, not buried in a JSON file nobody reads.
3. **No new fabrication tolerance.** Every rule already in `ENRICHMENT_RUNBOOK.md`
   (hedge disputed/legendary claims, prefer authoritative sources, never invent) stays
   in force; this plan adds tooling that can catch violations instead of relying on
   memory of the rule.
4. **Backfill honestly.** Where the true origin of a description can no longer be
   determined precisely, tag it `unknown` explicitly. A confident-looking wrong guess
   is worse than an honest gap — this is the same ethic that led the project to decline
   writing biographies for the 11 under-documented shrines rather than invent them.
5. **Don't relitigate M1.** The duplicate/rename/coordinate-collision decisions in
   `EXECUTION_PLAN.md` M1 are resolved; this plan is purely additive on top of a dataset
   already treated as structurally sound.
6. **Non-blocking before blocking.** New validation rules land as warnings first (like
   the provenance completeness gate did), then get promoted to hard failures once the
   backlog they'd flag is actually cleared — never gate on a rule the current data
   can't pass yet.

---

## 3. Data model changes

### 3.1 `contentTier` — provenance for the English `Description` field itself

Add a `contentTier` value to the existing `ProvenanceMethod`-shaped world, but as its
own field so it doesn't collide with the existing `method` (which describes *how* text
was produced technically — human/ocr/mt/llm) — `contentTier` describes *which content
pipeline* it came from, which is the missing dimension from §1.1:

```ts
type ContentTier = 'tier1-ocr' | 'tier2-compendium' | 'ai-researched' | 'sheet-original' | 'unknown';
```

Extend `FieldProvenance` (`src/types/provenance.ts`) with an optional `contentTier?:
ContentTier`, populated on the `Description` field entry specifically. This is the
single highest-leverage change in this plan — everything in Phase A–C below depends on
it existing.

### 3.2 Multi-source citations

Today `FieldProvenance` supports exactly one `source` string + one optional `page` per
field — adequate for "this photo came from Wikimedia" but not for "this description
draws on 3 different references," which is the normal case for a `shrine_entries/*.md`
Bibliography (3–5 entries per house style). Add an optional array field:

```ts
interface Citation {
  title: string;
  author?: string;
  type: 'book' | 'website' | 'academic' | 'oral' | 'gazetteer';
  url?: string;
  page?: string;
  confidence?: number; // 0–1, defaults to the parent FieldProvenance's confidence if absent
}
```

`FieldProvenance.citations?: Citation[]` — additive, backward compatible (existing
single-`source` entries keep working unchanged; `citations` is populated going forward
for anything with real bibliographic backing, starting with the Tier-1/2 migration in
Phase A).

Deliberately **not** proposing a new `Sources` column in the live Google Sheet — the
sheet is edited by hand and by non-technical processes, and a structured citation array
doesn't fit a spreadsheet cell well. Keep citations in `provenance.json` (code-adjacent,
schema-checked) and surface them through the UI (§5, Phase F) — this avoids scope creep
into re-architecting the Sheet, which is out of scope here (§6).

### 3.3 Review tracking that gets populated, not just displayed

No schema change needed — `reviewedBy`/`date` already exist and render correctly
(§1.7). The gap is purely that they're unpopulated for all 163 Urdu entries. Phase E
below is about *populating* this, and `validate.mjs` should start reporting an
aggregate "X/163 Description Urdu entries reviewed" line (not a hard gate, since 0/163
is the honest current state) so progress is visible release over release.

---

## 4. Content-quality validation gates (extending `npm run data:validate`)

All land as **warnings** first (per Principle 6), in `scripts/data/validate.mjs`,
alongside the existing provenance checks:

| Check | What it catches | Threshold (initial) |
| --- | --- | --- |
| Length outliers | Suspiciously thin (nothing substantive to say, or truncated) or suspiciously long (runaway generation) `Description` text | warn <300 or >8,000 chars — informed by the observed 1,118–22,540 char range across current data, so real long-form entries like Mazar-e-Iqbal (22,540) don't false-positive |
| Near-duplicate detection | Copy-paste-and-forgot-to-edit across rows (cheap shingling/n-gram similarity across all 163 `Description` fields) | warn >80% similarity between any two rows |
| Placeholder/leak detector | Internal notes leaking into rendered content — the exact failure mode found in §1.1 (`"Placeholder:"`, `"awaiting human translation"`, `"TODO"`, `"Lorem ipsum"`, `"[NEEDS REVIEW]"` literal strings inside `Description`/`Description Urdu`) | any match = warn (hard-fail once clean) |
| Fabrication-risk lint | A `Description` tagged `contentTier: ai-researched` (§3.1) with zero `citations` and no explicit "no sources found" note | warn until Phase C's citation backfill lands, then promote to hard gate |
| Content-provenance completeness | Any shrine whose `Description` field has no `contentTier` at all | warn until Phase A completes for all 163, then hard gate (mirrors how the 2026-07-12 session promoted the Urdu-provenance-completeness check to a hard gate only after the backfill landed) |

---

## 5. Phased implementation

### Phase A — Content-provenance backfill (foundational; unblocks B–D)

New script `scripts/data/build-content-provenance.mjs`, modeled directly on
`build-provenance.mjs`'s proven pattern (idempotent, additive-only, never touches a
hand-curated entry):

- Cross-reference `shrine_entries/_INDEX.md`'s tier table against `data/shrines.json`
  slugs → tag matches `tier1-ocr` or `tier2-compendium`.
- Cross-reference `archive/_ENRICHMENT_LOG.md`'s per-batch row lists (which rows each
  enrichment run filled) → tag matches `ai-researched`.
- Anything left over: tag `sheet-original` only if there's positive evidence (e.g. the
  row predates the earliest enrichment log entry) — otherwise tag `unknown` (Principle
  4). Do not guess.
- **Deliverable**: a committed coverage table (counts per tier) in this doc's §7
  appendix once run — the point is zero silently-untagged shrines, not 100%
  `tier1-ocr` coverage.

### Phase B — Reconcile the two content pipelines

A systematic, one-pass-per-shrine audit (batchable across subagents) for the 37
shrines that have a `shrine_entries/*.md` file:

- Diff the file's `## Overview`–`## Legacy` block against the live `Description` for
  the same shrine. Classify each as: (a) already merged, matches — fine, tag
  `tier1-ocr`/`tier2-compendium` with citations migrated (§3.2); (b) live content
  differs and is weaker/uncited — flag for a human decision on whether to supersede
  with the cited version; (c) contradiction found (the Allo Mahar pattern) — fix the
  `_INDEX.md` tier label and the `provenance.json` entry to match observed reality, not
  stale intent.
- **Deliverable**: a reconciliation log (same shape as the existing
  `archive/_image_unverified.md` checkbox-list pattern, e.g.
  `archive/_description_reconciliation.md`) plus a corrected `_INDEX.md`.

### Phase C — Fact-verification pass on `ai-researched` content

The highest-risk bucket, by construction (§1.1): content least tied to a primary
source. For each `ai-researched`-tagged shrine with no citations yet:

- Re-verify factual claims (names, dates, founding narratives, saint identities) via
  web search, following `ENRICHMENT_RUNBOOK.md`'s existing rules — hedge disputed
  claims, prefer authoritative sources, never fabricate. Correct any outright errors
  found, with a `notes` entry documenting the correction and why.
- Where a topical match exists in `out/ocr/Final/` (30 processed books, currently
  linked to shrines only by inference from filenames — building this shrine↔book
  mapping as a byproduct closes the manifest gap noted in §1.5), cross-check against
  the primary text directly rather than general web search.
- Write the resulting references into `citations[]` (§3.2), scored by confidence.
- **Deliverable**: a verification log, and every `ai-researched` shrine ends Phase C
  with either ≥1 citation or an explicit, logged "no reliable source found" note (never
  silence).

### Phase D — Land the validation gates (§4)

Independent script work, can start any time after Phase A produces `contentTier` data
to check against. Land as warnings; promote specific checks to hard gates only once
Phase A/C clear their respective backlogs (Principle 6).

### Phase E — Urdu human review

Owner: a human/native-speaker reviewer (Claude's role here is tracking and tooling,
not the review itself — same ownership split `EXECUTION_PLAN.md` already uses:
"Author" = human/reviewed prose or translation). Batch order, reusing the precedent
from `URDU_IMPLEMENTATION_PLAN.md`'s Urdu rollout: the ~18 tour-featured shrines first
→ highest-traffic saints → the rest. Populate `reviewedBy`/`date` on the `Description
Urdu` field as each batch clears. Independent of Phases A–D — can run in parallel.

### Phase F — UI surfacing

Extend `SourcesProvenance.tsx` (small diff on an already-working component):

- Render a `contentTier` badge alongside the existing method/confidence/reviewed
  badges.
- Render the `citations[]` list when present (title, author, type, link) instead of
  just the single `source` string.
- Stretch goal (only after A–C land and there's real citation data to point at): a
  "how do we know this?" hover affordance on article claims, per `PROJECT_VISION.md`
  Track 1 — inline footnotes linking prose to a citation.

### Phase G — Editorial pipeline (ongoing maintenance, prevents regression)

- Document a lightweight "how to propose a correction" convention (a short doc + a
  GitHub issue template is enough — no new infrastructure needed) so future edits
  don't quietly bypass the provenance model this plan builds.
  data:release chain (`scripts/data/release.mjs`) already requires `data:validate` to
  pass — once Phase D's gates are promoted to hard, releases (and the eventual Zenodo
  DOI mint) are automatically protected from regressing this work.

---

## 6. Explicitly out of scope (tracked elsewhere — don't duplicate)

- **Image quality/reachability** — already tracked in `docs/planning/TODO.md` §3 and
  gated by `validate:images`; this plan is about text content only.
- **Sindhi/Punjabi/Persian translations** — Track 4 of `PROJECT_VISION.md`; depends on
  Urdu review (Phase E) proving the pattern first, but is not part of this plan.
- **"Ask the archive" RAG / semantic search** — Track 5; explicitly *depends on* this
  plan's citation model (§3.2) landing first, so sequence after, not alongside.
- **Google Sheet ↔ xlsx sync** — a separate operational gap (still open per project
  memory as of 2026-07-12); orthogonal to content-quality work and not blocked by it.
- **Full corpus search / `SourcesPage`** (Track 1's broader vision) — this plan only
  builds the citation *data model*; the browsing/search UI over `out/ocr/**` is a
  larger, separate effort.

---

## 7. Definition of done

- All 163 shrines have a `contentTier` value on their `Description` provenance entry —
  zero silently untagged (`unknown` is an acceptable value; missing is not).
- Every `ai-researched`-tagged shrine has ≥1 `citations[]` entry or an explicit,
  logged "no reliable source found" note.
- The reconciliation log for all 37 `shrine_entries/*.md` files is closed, and
  `_INDEX.md`'s tier labels match observed live-data reality (no more Allo-Mahar-style
  contradictions).
- `npm run data:validate` implements every check in §4; each is either passing or its
  outliers are explicitly acknowledged/logged (not silently ignored).
- Urdu review has non-zero, tracked progress (even just the tour-featured batch counts
  as real forward motion from today's 0/163) — `reviewedBy` populated and rendering in
  `SourcesProvenance`.
- `SourcesProvenance.tsx` renders content tier and citations.
- `npm run verify` and `npm run data:validate` stay green throughout every phase.

### Appendix — baseline snapshot (2026-07-12, before this plan starts)

| Metric | Value |
| --- | --- |
| Shrines with a `Description` provenance entry at all | 1 / 163 |
| Shrines with `contentTier` tagged | 0 / 163 |
| `shrine_entries/*.md` files (Tier 1 / Tier 2 / declined) | 7 / 30 / 11 |
| `Description` length range (chars) | 1,118 – 22,540 (mean ~3,620) |
| Shrines with any `citations[]` entry | 0 / 163 (field doesn't exist yet) |
| `Description Urdu` entries reviewed (`reviewedBy` populated) | 0 / 163 |
| Known content-provenance contradictions found | 1 (Allo Mahar — see §1.1) |
