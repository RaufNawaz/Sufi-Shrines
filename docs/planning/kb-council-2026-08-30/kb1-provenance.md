# KB-1 — Provenance and citation integrity

Read-only review, 30 August 2026. Repository:
`/Users/rauf/Desktop/Desktop - rauf’s MacBook Air/Harvard/Shrines Project`.

Measured against `src/data/shrines-fallback.json` (169 rows, `generated 2026-08-18T16:25:08.798Z`),
`data/kg.json` and `data/kg-sources.json` (both `generated 2026-08-30T19:39:25.695Z`), and
`data/provenance.json` (`updated: 2026-07-12`).

*The tree moved under this review — five commits landed while it ran. Where that changed a
finding, the finding says so.*

Five findings, ranked by what a reader loses. Ten retractions, three of them findings I formed and
then killed.

---

## Section 1 — Findings

### KB1-1 — Four order memberships are asserted on figure and order pages with no source, no quote, no sheet cell and no supporting prose anywhere in the archive — and because they carry no `reviewed` flag they render as *more* trustworthy than the machine-extracted ones beside them

**Measured:** `data/kg.json` holds 67 `belongs_to_order` relations, 43 `machine-extracted` and 24
hand-seeded:

```
belongs_to_order  n=67 source=43 quote=43 rev(t/f/absent)=0/43/24 {"human":24,"machine-extracted":43}
human memberships 24  with asRecorded 20  with source 0
machine memberships 43  with asRecorded 43
```

The four `human` edges that carry no `asRecorded` either:

```
saint:rahman-baba              -> order:chishtiyya     confidence 0.9  method human
saint:makhdoom-burhan-ud-din   -> order:suhrawardiyya  confidence 0.9  method human
saint:sufi-shah-inayat-shaheed -> order:qadiriyya      confidence 0.9  method human
saint:sachal-sarmast           -> order:qadiriyya      confidence 0.9  method human
```

Their only basis is `data/kg-seeds.json#saintOrders`, which is a bare `slug → orderSlug` map
(`"rahman-baba": "chishtiyya"`) — 23 entries, no `source`, no `quote`, no `_why`, no provenance
field of any kind. All four shrine rows' `silsila` cell is empty, and none of the four
Descriptions ever names the order:

```
== dargah-roza-sufi-shah-inayat-shaheed          (0 mentions of /qadir/i)
== langer-makhdoom                               (0 mentions of /suhraward/i)
== rahman-baba-mausoleum-rehman-baba-shrine      (0 mentions of /chisht/i)
== shrine-of-sachal-sarmast                      (0 mentions of /qadir/i)
```

`build-kg.mjs`'s own guard against a wrong seed cannot see them. The
`seeded-order-contradicts-sheet` check (`scripts/data/build-kg.mjs:1050-1066`) is nested inside
`if (asRecorded)`, so the four seeds with no sheet basis *at all* are exactly the four it is
structurally unable to question.

They render unmarked. `getOrderMemberships` (`src/lib/kg.ts:626`) sets `reviewed: r.reviewed !==
false`, and `reviewed` is absent on all 24 hand-seeded edges, so it resolves to `true`.
`SaintPage.tsx:692` and `OrderPage.tsx:638` show the `unreviewed` chip only when
`!membership.reviewed`. With no `quote`, no `source` and no `asRecorded`, the list item is a bare
order badge with nothing beside it — while all 43 machine-extracted memberships carry a verbatim
quote and a cited file underneath.

**What a reader loses:** `/saint/rahman-baba` states that Rahman Baba belonged to the Chishtiyya
and `/order/chishtiyya` lists him among its members, with no chip, no quote and no citation, and
nothing in this archive says it. Same for Sachal Sarmast and Makhdoom Burhan-ud-Din and Sufi Shah
Inayat Shaheed. On an archive whose whole claim is traceability the presentation inverts the
truth: the *unsourced* claim is the one with no marker on it, and the reader's only cue —
"unreviewed" — is attached to the claims that do have evidence.

**Scale:** 4 memberships · 4 figures · 3 orders · 8 pages (4 saint, 3 order, ×2 languages = 16
page-language pairs).

**Remedy:** two halves, and only one is an agent's.
*Agent-safe:* lift `seeded-order-contradicts-sheet` out of `if (asRecorded)` so a seed with no
sheet cell **and** no prose support is reported rather than silently trusted; and give
`saintOrders` an optional `source` / `note` field, the shape `kinNotes`, `saintOrdersNotInCell`
and `orderProse` already use in the same file.
*Not an agent's:* supplying the affiliations. Rahman Baba is widely called Chishti and Sachal
Sarmast Qadiri in the general literature, and writing that in from general knowledge is exactly
what RULE 2 forbids — the basis must be an entry, a survey or a work the archive holds. Either a
human names the source, or the four edges get `reviewed: false` until one does.

**Confidence:** high. Every step is a field read from the shipped graph or a line of the shipped
render path; the "no prose" half is a regex over the four Descriptions; and the four are the
complete set, not a sample.

---

### KB1-2 — `/about` tells a reader the archive rests on "464 distinct sources", and 57 of those are lines the archive's own pipeline defines as placeholders rather than citations — one of them a notice that a source was *withdrawn*

**Measured:** `data/kg-sources.json` holds 464 `source` nodes and 533 `attested_in` edges.
Applying the `GENERIC` regex from `pipeline/build_sources_registry.py:55-66` — the archive's own
definition of a placeholder — to each source node's `name`:

```
source nodes: 464   attestations: 533
source nodes matching the archive's own placeholder pattern: 57
   Pending. Prior source attribution for this entry has been withdrawn as unreliable.
   General established histories of the Chishti revival in nineteenth-century Punjab.
   General established histories of the Qadiri order in the Punjab.
   Comparative literature on the Katas Raj and Tilla Jogian sites of the Salt Range.
   General literature on the *bhakti* movements of western India and their spread into Sindh and the Punjab.
   Local hagiographical tradition concerning Hazrat Makhdoom Burhan-ud-din (to be used with due caution).
   … 51 more
```

The first is a *withdrawal notice* holding an id and a slug: `source:387e8ef241bd`.

The same 57 reach the reader. `buildSourceIndex` (`src/lib/data/sourceIndex.ts`) rebuilds the
index in the browser from the shipped rows, and `ArchiveKnows.tsx:241` renders
`Fact value={restsOn.sources.length}` under `coverageRestsDistinct: 'distinct sources'`, beneath
the heading `coverageRestsHeading: 'What the archive rests on'`. Re-derived with the shipped
dedupe key:

```
citations 533  distinct 464  singleSourced 27  uncited 1  triangulated(>=3) 103
shared (cited by >1 entry): 28   collapsed tail: 436
placeholder rows in the SHARED list: 2
   x2  General established histories of the Chishti revival in nineteenth-century Punjab.
   x2  General established histories of the Suhrawardi order and of Uch Sharif.
placeholder rows in the collapsed tail: 55
```

The separation exists, and is documented as load-bearing in three places:
`build_sources_registry.py`'s docstring ("One is a citation; the other is a placeholder. Until
they are separated you cannot tell a sourced claim from an unsourced one"), `docs/HANDOVER.md` §3
"Provenance layers", and `docs/planning/BADGE_GLOSSARY.md` ("the registry separates the two before
counting. Without that separation the badge would be flattering rather than honest"). It is
applied to the **badge** — Python, offline, writing TSVs that nothing ships — and not to the
**count**, which runs through `build-kg.mjs` → `kg-sources.json` and `sourceIndex.ts` → `/about`.

**What a reader loses:** on `/about`, 12.3% of the number labelled "distinct sources" is not a
source. Two placeholder rows sit in the *prominent* shared list rather than the collapsed tail,
and a reader can arrive at one from a shrine page: `SourceReach` in `ShrineArticle.tsx:51` links
any citation shared by two or more entries to `/about#source-…`, so following "also cited by 1"
under a Uch Sharif bibliography lands on "General established histories of the Suhrawardi order
and of Uch Sharif."

**Scale:** 57 of 464 source nodes (12.3%) · 43 of 533 citations before dedupe · 2 in the shared
list, 55 in the tail.

**Remedy:** the classification exists in Python and does not exist in JS. Port `GENERIC` into
`scripts/data/lib/` beside the existing `bibliography.mjs` mirror, tag each source node with it in
`build-kg.mjs`, and let `sourceIndex.ts` report placeholders as their own count instead of folding
them into "distinct sources" — the move `/about` already makes for its "not recorded" rows.
**Do not delete or rewrite the lines** (RULE 2): "Pending. Prior source attribution for this entry
has been withdrawn as unreliable" is among the most honest lines in the archive and belongs on the
page, counted as what it is. Whether the fix is the number or the label is a wording call for a
human; either closes it.

**Confidence:** high for the counts; medium only on which of the two surfaces should change.

---

### KB1-3 — The per-field provenance store is frozen at 12 July by design and cannot notice that what it describes has changed: 62 entries have a substantively different Description under an unchanged record, six field-verified entries added in August are recorded as "pre-existing entry", and all 167 Urdu translations carry one hardcoded date — including six that predate the English they translate

**Measured:** `data/provenance.json` says `updated: 2026-07-12`. It covers all 169 route slugs
with 340 field records:

```
records: 169   with a Description provenance entry: 169
field kinds: { 'Image 1': 2, Description: 169, 'Description Urdu': 167, Latitude: 1, Longitude: 1 }
Description contentTier: { 'ai-researched': 102, 'tier2-compendium': 30, 'sheet-original': 30, 'tier1-ocr': 7 }
Description method:      { llm: 102, human: 67 }
Description Urdu provenance records: 167   dated 2026-07-11: 167   other dates: {}
field records carrying reviewedBy: 0
```

`build-content-provenance.mjs` is "additive-only, idempotent … never overwrites an existing
hand-curated `Description` entry", and `build-provenance.mjs:82` bumps `updated` only when a
*record* or an Urdu field is **added** — never when the described field changes. So the record is
frozen and there is no hash, no length, no digest of the text it describes.

Diffing today's Descriptions against `git show ebdfa5f:data/shrines.json` (the 12 July commit, the
date the store asserts), normalising away the known `=====` separator artefact, smart quotes and
whitespace, and counting only entries whose **word count moved**:

```
entries existing on 12 July whose Description changed substantively: 62
  by the contentTier their provenance record still asserts:
      { 'ai-researched': 43, 'tier1-ocr': 7, 'sheet-original': 12 }
  of those, gained a ## Bibliography section they did not have: 51
  net words added across them: 8714
```

Forty-three entries are recorded as *"Automated enrichment pipeline (tools/shrines_enrich.py,
Claude-assisted web research) … run 2026-07-06"*, `method: llm`, `contentTier: ai-researched`,
`confidence: 0.6` — and 51 entries have since gained an entire bibliography. The store cannot say
which.

The six entries that did not exist on 12 July are the sharpest case. Every one is
**`Field-verified` / `Full`** and cites the Shrines Project field survey in its own prose:

```
darbar-abul-muali-qadri                                          support=Field-verified  cites field survey: true
darbar-ghazi-ilm-din-shaheed                                     support=Field-verified  cites field survey: true
darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami   support=Field-verified  cites field survey: true
darbar-hazrat-tahir-bandagi-qadri                                support=Field-verified  cites field survey: true
darbar-malik-ahmad-ayaz                                          support=Field-verified  cites field survey: true
darbar-wasif-ali-wasif                                           support=Field-verified  cites field survey: true
```

and all six are recorded as:

```json
"Description": {
  "source": "Pre-existing sheet content — not found in shrine_entries/_INDEX.md or archive/_ENRICHMENT_LOG.md",
  "method": "human", "contentTier": "sheet-original",
  "notes": "Origin inferred by elimination (absent from both tracked content pipelines), not independently confirmed."
},
"Description Urdu": {
  "source": "In-repo AI translation (overnight Urdu enrichment pass, 2026-07-11)",
  "method": "llm", "date": "2026-07-11"
}
```

`CONTENT_TIER_LABEL['sheet-original']` renders that first record to a reader as **"pre-existing
entry"**. The second asserts that an Urdu translation was produced on 11 July of an English
description that did not exist until August — and it is not a slip on six rows: the date is the
hardcoded constant `BASELINE_URDU_DESCRIPTION_PROVENANCE` in `build-provenance.mjs:46-54`, stamped
onto every slug that has a `descriptionUr`, all 167 of them.

**What a reader loses:** the panel is behind `hasProjectAccess()`
(`ShrinePage.tsx:494`), so the audience is the project team — which is precisely who consults it
to decide whether a sentence needs re-checking. On six shrine pages it reports the archive's most
strongly evidenced entries as pre-existing sheet content of unconfirmed origin, and on 43 more it
reports a 60%-confidence AI draft for text that has since been rewritten and cited. `data/`
is also the published data directory, so `provenance.json` ships as an artefact independent of the
panel.

**Scale:** 62 stale `Description` records · 6 mislabelled `sheet-original` records on
`Field-verified` entries · 167 `Description Urdu` records on one hardcoded date, 6 of them
predating the text they describe · 0 records anywhere carrying `reviewedBy`.

**Remedy:** *Agent-safe and small:* record a digest of the described text at the time the record
is written (`descriptionSha` beside `contentTier`), and add a gate that fails when a shipped
Description's digest does not match its provenance record — RULE 4's shape, and it turns 62
invisible drifts into a build error. Also stop stamping a literal date onto `Description Urdu`:
take it from the Urdu content's own build stamp, or omit it, because a wrong date is worse than
none.
*Needs a human:* re-tiering the 62. `contentTier` is a claim about how a passage was written and
the archive's own docstring calls `sheet-original` "inferred by elimination, not independently
confirmed" — an agent re-deriving it from today's text would be inventing provenance, which is
RULE 2. The six field-survey entries are the exception: their tier is answerable from the survey
records the project already holds.

**Confidence:** high on every count. Medium on one framing point: the 12 July baseline is the
commit `ebdfa5f` of that date, and `build-content-provenance.mjs` may have been run against the
pre-commit state of the same day — that would move the 62 by a handful, in the same direction. The
six impossible Urdu dates and the six `sheet-original` labels do not depend on the baseline at all.

---

### KB1-4 — `classify()` consults the placeholder pattern only after nine type patterns have already claimed the line, so 15 placeholder lines count as specific checkable works and two entries wear "Source-documented" on the strength of one

**Measured:** `pipeline/build_sources_registry.py:92-98` — `classify()` returns on the first
`TYPES` match and reaches `GENERIC` only if none matched. Lines the placeholder pattern matches
that a type pattern claimed first:

```
lines the GENERIC placeholder pattern matches but classify() types otherwise: 16
{ tazkira: 3, encyclopaedia: 1, press: 8, monograph: 2, book: 2 }
of those, counted as a SPECIFIC checkable work (raises the badge): 15 across 15 entries
  [press]     ramapir-temple-tando-allahyar :: Contemporary press coverage of the annual Ramapir Mela (Dawn, The Express Tribune).
  [press]     shahwala-teja-singh-mandir    :: Contemporary press coverage of the 2019 restoration (Dawn, The Express Tribune, and international agencies).
  [monograph] jagannath-temple-sialkot      :: Community and press accounts of Hindu temple grants in Sialkot under the Pervaiz Elahi provincial government (2007) …
  [book]      parnami-mandir                :: General literature on the *bhakti* movements of western India and their spread into Sindh and the Punjab.
  … 11 more
```

`.*\bcontemporary press\b` and `.*\bcommunity (and press )?accounts\b` are in `GENERIC`
*specifically* to catch these, and the `press` and `monograph` patterns above them intercept any
such line that names a newspaper or contains a year — `\b(19|20)\d{2}\b` on its own types a line
as a `monograph`. The `contemporary press` branch of `GENERIC` is dead code for every line that
mentions a masthead.

Recomputing every badge with `GENERIC` checked first:

```
entries whose support badge would drop if GENERIC were checked first: 2
  Source-documented -> Source-seeded  (info Moderate -> Moderate)  nSpec 2->1  jagannath-temple-sialkot
  Source-documented -> Source-seeded  (info Moderate -> Moderate)  nSpec 2->1  parnami-mandir
```

**What a reader loses:** two entries wear "Source-documented", whose published rule is "two or
more specific, checkable works are cited" (`BADGE_GLOSSARY.md`), where one of the two is a line
the same pipeline defines as a placeholder. `/shrine/jagannath-temple-sialkot`,
`/shrine/parnami-mandir`, and their rows in `/about`'s support-level distribution.

**Scale:** 15 misclassified lines · 2 support badges change · 0 `info_level` badges change (both
stay Moderate on word count).

**Remedy:** in `pipeline/build_sources_registry.py`, test `GENERIC` before the `TYPES` loop and
keep the matched type for display. Two lines — but it **changes two published badges**, so it also
needs the sheet patch that follows and a human to accept the downgrade. The argument the other way
is real: "Contemporary press coverage … (Dawn, The Express Tribune)" does name two mastheads. This
is a decision about the wording of the rule, not a bug fix; whichever way it goes the ordering
should be deliberate and commented.

**Confidence:** high on the 15 and the 2 (both computed from the shipped rows against the shipped
regexes). Medium on whether the archive wants the reorder — that is editorial.

---

### KB1-5 — The 544→533 citation correction was half-applied; its other half survives in two files after being fixed in a third mid-session

**Measured:** mirror of `src/lib/data/bibliography.ts` over the shipped rows:

```
rows 169
citations(items) 533
withAny 168  withNone 1  with3+ 103
distinct citationKey 464
  0 citations: Sant Baba Asudaram Darbar (Panno Aqil)
```

The old rule (`/^\s*[-*]\s+\S|https?:\/\//gm`), the one the repo documents as double-matching:

```
OLD rule total 544   entries with >=3: 107
```

544 and 107 are the same instrument; 533 and 103 are the fixed one. `CLAUDE.md:251` was corrected
to **103** by commit `cf07f5d` *while this review was running* — found independently by the UI
council's scholar lens (`docs/planning/UI_COUNCIL_2026-08-30.md:222`). Still stale:

- `docs/HANDOVER.md:1334` — "533 citations — 544 until the counting rule was corrected on 24 August; **107** citing three or more."
- `docs/TODO.md:441` — "168 of 169 now carry one, **544** citations, **107** citing three or more."

**What a reader loses:** nothing on the site — `/about` computes it and renders 103. The loss is to
the next agent, and the placement is the sting: HANDOVER §9.45 is the entry that exists *to teach*
that a standing finding is a measurement with a date on it, and it is one of the two places still
quoting the pre-correction number.

**Scale:** 2 files, 3 numbers (107 twice, 544 once).

**Remedy:** `docs/HANDOVER.md:1334` and `docs/TODO.md:441`: 107 → 103, 544 → 533. Agent-safe — a
re-measurement of numbers shipped code already computes on every page load.

**Confidence:** high. The instrument reproduces 533 / 464 / 168-of-169 / one-entry-cites-nothing
exactly, and reproduces 544 / 107 when the old regex is substituted, which is what identifies 107
as the old instrument's output rather than a different quantity.

---

## Section 2 — Retractions

Three findings formed and killed, and seven things checked that were sound.

### KILLED — "161 of 169 Descriptions have changed since the provenance record describing them was written." It is 62.
The first pass compared Descriptions to the 12 July commit after normalising only whitespace, and
reported **161 changed, 2 unchanged** — a spectacular number, and the shape of it should have been
the warning. Stripping the `=====` separator artefact and smart quotes as well took it to 71
changed, 92 identical; requiring the *word count* to have moved took it to **62**. HANDOVER §9's 18
August entry records exactly this: "87 of them differ from the July baseline *only* by removal of
the `=====` separator artefact." The lesson had been written down and I hit it anyway. KB1-3 quotes
62.

### KILLED — "`data/provenance.json` is stale and 14 entries render an empty provenance panel." Wrong key.
The first measurement compared `provenance.json`'s `shrineSlug` against the `id` column of the
shipped rows and reported **14 entries with no provenance record and 14 orphan records**, with
`shrine-of-bibi-pak-daman` and `shrine-of-peer-makki` among the orphans — a convincing
slug-rename story. But `src/lib/data/shrineModel.ts:98` computes `slug` as
`getFieldValue(row, 'Slug') || buildStableSlug(name)`, and there is no `Slug` column: **the route
slug is `slugify(Name)`, not `id`.** Re-measured against the real key:

```
distinct slugify(Name) 169 of 169
slugify(Name) === id column: 155 of 169
route slugs with NO provenance record: 0
provenance records matching no route slug: 0
```

The store covers all 169 exactly. This is the "reading a data file measures the wrong surface when
the render layer transforms it" trap, and it is worth recording *why* it was convincing: the 14
mismatching `id` values are real, and 7 of them are the "do not break these" photo slugs, which
made the wrong key look like the right one.

### KILLED — "the badges have drifted from the bibliographies they are computed from." They have not, on any of the 169 rows.
`support_level` and `info_level` are stored in the sheet, so a bibliography edited after import
could leave the badge behind. Re-derived both for all 169 rows from the Description alone, with a
JS mirror of `pipeline/build_sources_registry.py`:

```
=== computed support === { 'Web-compiled': 2, 'Source-seeded': 53, 'Source-documented': 100, 'Field-verified': 14 }
=== stored  support === { 'Web-compiled': 2, 'Source-seeded': 53, 'Source-documented': 100, 'Field-verified': 14 }
=== computed info === { Low: 2, Moderate: 153, Full: 14 }
=== stored  info === { Low: 2, Moderate: 153, Full: 14 }
=== support mismatches: 0 ===
=== info mismatches: 0 ===
```

**Instrument validated twice, once against a known answer and once by breaking it.** (a) The real
Python was run on a CSV built from those same 169 rows, in a scratch directory, and printed the
same distribution: `Source-documented 100 / Source-seeded 53 / Field-verified 14 / Web-compiled 2`,
`Moderate 153 / Full 14 / Low 2`. (b) The comparison was damaged on purpose — all but one
bibliography bullet stripped from three `Source-documented` entries, a field-survey line added to
one `Web-compiled` entry — and produced exactly 4 support and 3 info mismatches, correctly labelled
in both directions (`STORED-BETTER` and `stored-worse`). A drifted badge would have been caught.

### CHECKED, CLEAN — the unreviewed / machine-derived layer is the best-instrumented thing in the repository
`data/kg.json` carries 110 saints and 135 relations at `reviewed: false`, 104 with
`biographyReviewed: false` and a `biographySource`, and **not one node anywhere at `reviewed:
true`** — which reads at first like a layer of machine output presented as fact. It is not.
`LineageView`, `LineageChainView`, `DescentView`, `KinView`, `RecordedObservanceList`, `GraphPage`,
`SaintPage` and `OrderPage` all render an `unreviewed` chip with a help string; `SaintPage` and
`GraphPage` print the verbatim quote and the source file beside the claim; `/about` publishes
`orderMembershipsUnreviewed` and `lineageLinksUnreviewed` as stats; `/review` exists as a route;
and `src/lib/data/figureProvenance.ts` was written for precisely the gap I went looking for. Only
KB1-1's four edges escape, and they escape by having no `reviewed` field at all.

### CHECKED, CLEAN — "/about counts 43 unreviewed memberships while the pages chip all 67"
`reviewed` is *absent*, not `false`, on the 24 hand-seeded memberships, so a naive
`!membership.reviewed` would chip every one and contradict the published 43. Every reader of the
flag in `src/lib/kg.ts` (lines 198, 247, 348, 424, 537, 626) normalises with `r.reviewed !== false`
first — all six paths. The empty-value class of bug this repo has been bitten by twice is not
present here.

### CHECKED, CLEAN — the citation count itself
533 citations, 464 distinct keys, 168 of 169 entries carrying a bibliography, exactly one citing
nothing: all four reproduce from the shipped data using the shipped rule. The `bibliographyItems`
fix is sound — the bare-URL branch fires only on lines that are *not* list items, so the
double-count cannot recur. 168 entries use the heading `## Bibliography`, and no entry uses
`## Sources`, `## References` or `## Further reading`, so the wider heading set in
`bibliography.ts` and the narrower `##\s*Bibliograph\w*` in the Python agree on the current data.

### CHECKED, CLEAN — the archive's own padding check clears the archive
`docs/HANDOVER.md` §3 defines "expansion ratio = words of prose per specific source" and gives "a
900-word entry citing one encyclopaedia" as the failure case. `build_sources_registry.py` computes
it into `support_levels.tsv`, which nothing ships and no gate runs, so I expected a tail. Computed
over the 155 non-field entries:

```
median ratio 257   p90 444   max 744
entries over 500 words per specific source: 9
entries over 800: 0
single-source entries with >=10 dated/lineage assertions: 0
```

The worst case is `shrine-of-mauj-darya-bukhari` at 744 words on one source — under the documented
threshold, and that source is a named tazkira volume. Wiring the check is still worth doing; it is
not currently hiding anything.

### CHECKED, CLEAN — there is no population of confidently-dated, uncited entries
Only 2 of 169 entries carry no specific checkable work at all:

```
claims=3 words=224 support=Web-compiled  allo-mahar
claims=6 words=229 support=Web-compiled  sant-baba-asudaram-darbar-panno-aqil
```

Both are correctly badged `Web-compiled` / `Low`; Sant Baba Asudaram is named in CLAUDE.md as the
one entry citing nothing, and Allo Mahar has its own resolution document
(`docs/allo_mahar_resolution.md`). 27 entries rest on a single distinct source and 103 cite three
or more.

### CHECKED, CLEAN — `biographySource` resolves, and a figure merge does not pool provenance
All 104 `biographySource` values parsed, fragments checked against the route slugs:

```
biographySource fragments that are NOT a route slug: 0
biographySource pointing elsewhere: 2  (entries/entry_shah_gohar_peer.md, entries/entry_mian_qurban_ali_shah.md)
```

The two exceptions are `entries/*.md` — a real citable location with no page behind it, which
`figureProvenance.ts` documents as deliberate. `retiredSlugs` maps 19 retired figure slugs to
survivors, and the survivors' relations keep their own per-edge `source` and `quote`
(`disciple_of` 70/70, `successor_of` 29/29, `kin_of` 67/67), so a merge does not blur where each
claim came from. `kinNotes` is the model of the practice: 12 relationships the archive can evidence
but cannot draw, each with a verbatim quote, a source and a note saying why no edge exists.

### CHECKED, CLEAN — source concentration is measured, and measured honestly
`scripts/data/measure-source-works.mjs` exists to answer "how heavily does the archive lean on one
*work*, as against one citation string". Its docstring states the uncomfortable answer in the
archive's own voice ("`/about` reports 464 distinct sources and lists the Tazkirah as three
separate rows … roughly twice what the biggest number on the page suggests"), the grouping is a
hand-curated 14-work list in `kg-seeds.json#sourceWorks` with a `_why` on each, periodicals are
deliberately excluded with the reason given, and `ArchiveKnows.tsx:145` now renders
`buildWorkRollup` on `/about`. Nothing to add.

### NOT RE-REPORTED — resolvability of citations
9 of 533 citations contain a URL (2%), and 52 of the 378 lines classified as a specific work carry
no italic title, no quoted title and no URL. The UI council already shipped this as **S-5, "456 of
464 sources leave the reader nothing to click"** (`docs/planning/UI_COUNCIL_2026-08-30.md`; 8 of
464 by their unit). Recorded only to note that the two measurements agree — theirs counts distinct
sources, mine counts citations.
