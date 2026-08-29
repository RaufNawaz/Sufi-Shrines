# Reviewing the knowledge graph's machine-extracted claims

*Written 24 August 2026. Counts measured that day; `npm run data:review` reprints them.*

The graph carries **235 machine-extracted proposals** — 80 teacher–disciple edges, 50 order
memberships, 105 date/title records — and **20 findings that are not proposals at all**. Every
one of the 235 is already live on the site, marked `reviewed: false`, rendered with an
"unreviewed" badge and the source sentence beside it. That is the honest way to publish a
machine reading, and it is not the finish line: a human verdict is what turns it into a
reviewed claim.

Until now there was no way to record that verdict except reading three JSON files of a hundred
objects each and hand-editing `data/kg-seeds.json`.

## What the machine has already proved, and what it cannot

`npm run data:validate` runs `verify-kg-proposals.mjs` on every proposal. It proves, mechanically:

- every `quote` is a **byte-exact substring** of the file or row its `source` names;
- every 3–4 digit year in a date proposal occurs **literally** in that quote;
- the relation vocabulary is closed, no self-loops, no contradictory pairs, no duplicates of an
  existing seed;
- `asRecorded` on an order proposal matches the sheet cell byte-for-byte.

Its green line means **nothing is fabricated**. It does not mean anything is right. Three things
stay a human's job, and they are the three that went wrong in `allo_mahar_resolution.md` — a
confident 700-word biography of the wrong man, assembled from real sentences about a real saint:

1. whether the quote **means** what the proposal says it means;
2. whether two similarly-named figures are **one person**;
3. which side of a **contradiction** is right.

## The queue

```bash
npm run data:review          # (re)build data/review/kg-review.csv
npm run data:review:check    # fail if the worksheet is missing anything
```

One CSV, 255 rows, ordered so the scarce resource — a reviewer's attention — goes where a
verdict changes the answer:

| priority | rows | what it is |
|---|---|---|
| 1 | 89 | The extractor's own flagged conflicts, plus the 20 non-proposal findings. **Review changes the answer here.** |
| 2 | 44 | Anything the extractor hedged (confidence below 0.9). Review confirms or drops it. |
| 3 | 122 | The rest. Review is a rubber stamp — and still the difference between "unreviewed" and "reviewed" on the page. |

Columns: `id`, `kind`, `priority`, `claim`, `as_recorded`, `confidence`, `flags`, `is_new`,
`quote`, `source`, `notes`, and the two you fill in — **`verdict`** and **`reviewer_note`**.

Fill `verdict` with `accept`, `reject`, or `unsure`. On a `finding/*` row there is nothing to
accept: use it to record the resolution, which for several of them is "needs a field visit".

Verdicts already recorded are **carried across by `id`** when the worksheet is regenerated, so a
dataset refresh does not throw away an afternoon's work.

### The `id`, and why it carries a digest

`id` ends in eight hex characters — a digest of the quote. The slug alone is not unique: Guru
Nanak has one date proposal read out of a birth sentence and another out of a death sentence, and
five saints have two order proposals apiece for the same parent order from different sources.
Keyed on the slug those collided, and a verdict typed against one carried onto the other on the
next regeneration.

The digest is over the evidence, so it is stable across regenerations and changes exactly when
the sentence behind the claim changes — which is precisely when a recorded verdict should stop
being carried forward, because it was a verdict about different evidence.

## The ten conflict buckets

Six flag a proposal row. Four record the *absence* of a claim and so have no proposal to flag —
they are rows of their own, `kind: finding/*`.

| bucket | n | what it means |
|---|---|---|
| `contradictions` | 17 | The row contradicts itself about the silsila. |
| `disagreesWithColumn` | 17 | The extracted date disagrees with the sheet's own date column. |
| `nameVariantsSeen` | 16 | One figure appears under several names across the corpus. |
| `nameCollisions` | 15 | Two saint nodes are probably one person. |
| `disputedDates` | 11 | The sources give two dates and neither is obviously wrong. |
| `disagreesWithExistingSeed` | 5 | The proposal contradicts a hand-written seed. |
| `explicitNonRelations` | 6 | The sources say these two were **not** master and disciple. |
| `subjectMismatch` | 6 | The row's only dated figure is **not** its recorded figure. This is the allo-mahar case. |
| `newOrdersNeeded` | 4 | The corpus names an order the taxonomy does not have (e.g. Rashidi), with no parent. |
| `proseValuedSilsila` | 4 | The silsila cell is a sentence that declines to name an order. |

A bucket whose findings reach no row is a silently short queue, which reads as a finished review.
`src/lib/data/__tests__/reviewWorksheet.test.ts` fails if any populated bucket contributes
nothing — it was written because the first generator knew four of the six keys these buckets use
to name their subject, and 33 findings were being filed as priority-3 rubber stamps.

## Applying verdicts

There is no apply script yet, and writing one before a single verdict exists would be guessing at
the shape of the answer. The manual path, for now:

1. An `accept` on a proposal → set `reviewed: true` on that edge in `data/kg-seeds.json`, then
   `npm run data:kg`.
2. A `reject` → move the proposal into the file's own `rejected` array with the reviewer's reason,
   so the rejection is recorded rather than the row simply vanishing.
3. A `finding/*` resolution → the fix usually belongs in the sheet (a CSV patch under `data/`,
   per RULE 3) rather than in the graph.

Once there are enough verdicts to see the shape, that becomes a script. Not before.

## The queue's real shape — measured 28 August 2026

Still **0 verdicts of 255**. Before spending an afternoon on it, three measurements about what
the 255 actually are, because the row count overstates the work in one direction and understates
it in another.

**Priority 1 is 89 rows but 66 figures, and 20 of the 89 have nothing to accept.**

```
89 priority-1 rows  =  69 proposals + 20 finding/* rows
                       over 66 distinct figures
```

The `finding/*` rows are not proposals and cannot be accepted or rejected — they record the
*absence* of a claim (an order the taxonomy lacks, a silsila cell that declines to name one). Six
figures carry three or more contested rows apiece, and those are worth taking together rather than
in queue order: `abul-faiz-qalander-ali-suharwardi` (5), then `khawaja-shah-muhammad-sulaiman-taunsvi`,
`khwaja-muhammad-qasim`, `khwaja-muhammad-qasim-sadiq`, `syed-shah-jamal-uddin-naqvi-bukhari` and
`akhund-darweza-baba` (3 each).

**No duplicate order proposals survive.** The workflow's note above says five saints have two order
proposals apiece from different sources; keyed on the evidence digest, zero `(figure, claim)` pairs
now repeat. Nothing to collapse there.

**The overlap with the figure-identity worksheet is small.** Of the 31 rows flagged
`nameCollisions` or `nameVariantsSeen`, only **4** name a figure that
`data/review/figure-identity-review.csv` also leaves open (`bari-imam`, `guru-nanak` ×2,
`sheikh-tahir`). The two queues were expected to be substantially the same question and they are
not — answering one does not clear the other.

### A worked `nameCollisions` case, and it resolves against merging

`khwaja-muhammad-qasim` and `khwaja-muhammad-qasim-sadiq` are flagged as possibly one person and
carry six contested rows between them. They are not one person, and the data says so without any
judgement being required:

| | `khwaja-muhammad-qasim` | `khwaja-muhammad-qasim-sadiq` |
|---|---|---|
| dates | b. 1912, d. 21 March 1999 | b. about 1846 (1263 AH) |
| alt names | "Zinda Pir" | Khawaja Muhammad Qasim **Moharwi** |
| order branch | Naqshbandiyya Ghamkolia | Naqshbandi Mujaddidi Qasimiya |
| recorded master | Baba Ji Muhammad Qasim **of Mohra Sharif** | Khwaja Nizamuddin Aulia of Kahiyan Sharif |

Born sixty-six years apart, so not one man. And the interesting part is the last row: the first is
recorded as the disciple of a *"Muhammad Qasim of Mohra Sharif"*, and the second's own alt name is
*"Moharwi"* — of Mohra. The likeliest relation between these two is **master and disciple**, which
is precisely the edge a merge would delete.

That is the standing warning made concrete: in a silsila corpus a shared name usually means someone
standing one edge away, and 19 of 21 name-similarity merges proposed here were wrong. This pair is
the recommended first entry for `saintDoNotMerge` in `kg-seeds.json` — **not added here**, because
that array requires a byte-exact corpus quote per entry and the quotes should be pulled by whoever
records the verdict rather than assembled at the end of a session.

## Rules this workflow is shaped by

- **RULE 2 — never invent.** Dates stay exactly as the source expresses them, calendar and hedge
  included. A normalised date is a different claim.
- **RULE 3 — the sheet is production.** Agents produce a CSV for a human; they do not write the
  store. This worksheet applies the same shape one step earlier in the pipeline.
- **RULE 4 — encode invariants.** The worksheet is checked for completeness and for byte-exact
  quotes rather than trusted to be complete and faithful.
