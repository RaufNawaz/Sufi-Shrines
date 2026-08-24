# The Review Desk

**Written 24 August 2026.** Status: phases 1–3 implemented; phase 4 needed no work.

## The problem, stated as a number

`/about` now publishes this, because it is true:

- **94** figures whose dates and titles were read out of prose by a machine and by no editor
- **80 of 86** recorded teacher–disciple links, unreviewed
- **44 of 64** recorded silsila affiliations, unreviewed

**218 claims** in total. Every one of them carries the source quote it was read from and an
`unreviewed` badge wherever it appears, so nothing is hidden and nothing is presented as settled.
That is the honest minimum. It is not the goal.

The goal is that the number goes down. And the reason it has not is not that nobody would review
these — it is that reviewing one currently means opening `data/review/kg-review.csv` (255 rows),
finding the claim, reading the quote in a spreadsheet cell, and hand-editing a proposals JSON. The
evidence and the verdict live in different tools. **The archive made its unreviewed state visible
and gave nobody a way to act on it.**

## What this is

A team-only page at `/review` that puts the claim, its evidence and the verdict in one place, and
emits a CSV patch a human imports. Four phases; the first two are built.

### Phase 1 — the desk (built)

`/review`, behind the existing soft `?team=1` gate (`src/lib/projectAccess.ts`). Not in the tab
bar, not linked from any public page, and honest about what that gate is: the data is a published
CSV, so this keeps casual visitors out of editorial detail and claims nothing more.

Each queue item shows:

- what is being claimed, in words a reader can judge ("Data Ganj Bakhsh was a disciple of
  Abu'l-Fadl Muhammad al-Khuttali");
- the **verbatim quote** it was extracted from, and the file it came from;
- for a biography, the dates and titles the extraction produced;
- three verdicts — **confirm · reject · needs work** — and a note field.

Verdicts are held in `localStorage`, per reviewer, per browser. No server, no account, nothing to
deploy. A half-finished session survives a reload, which is the only persistence a volunteer
reviewer actually needs.

### Phase 2 — the export (built)

A **Download verdicts** button writes a CSV whose columns match
`scripts/data/build-review-worksheet.mjs`, so the file drops straight into the existing worksheet
flow. Agents do not write the sheet and do not write the proposals (RULE 3); a human takes the
file and imports it.

### Phase 3 — the loop back (built)

`scripts/data/apply-review-verdicts.mjs` (`npm run data:review:apply -- verdicts.csv [--write]`):
reads a returned verdict CSV and for each **confirmed** claim sets `reviewed: true` on the matching
proposal, so `build-kg.mjs` stops emitting the `unreviewed` badge. Dry run by default — the files
it edits are hand-curated data in a provenance archive, and the default for a script like that is
to show its work first. `build-kg.mjs` had `reviewed: false` hardcoded in three places, which is
why a verdict could not previously land at all; it now reads the flag off the proposal, so the flag
lives with the claim it is about. A **rejected** claim is *removed from the proposal set*, not silently dropped —
the rejection is recorded with its reviewer note, because "an editor looked at this and said no" is
itself provenance and the extractor should not propose it again next run.

Three invariants, all asserted against the **real** proposal documents and the real queue rather
than against fixtures:

- **A verdict may only ever narrow what the graph asserts.** No path writes a value into a
  proposal's fields; the confirm test compares every other key before and after and requires them
  identical.
- **All or nothing.** One bad row refuses the whole file — a stale file half-applied is worse than
  one refused, because then somebody has to work out which half landed. The applier is pure and
  returns the *original* documents on error, so a caller that ignored the error list would still
  write nothing.
- **The digest is checked, not trusted.** A mismatch means the quote changed after the verdict was
  recorded, so the verdict is a judgement about text that no longer exists.

A **rejected** claim moves into the file's existing `rejected` array with the reviewer's note, and
is spliced out of `proposals` in descending index order — three rejections at once is what catches
the off-by-one that one at a time never would. It is recorded rather than deleted because "an
editor looked at this and said no" is itself provenance, and the extractor should not propose it
again next run. **Needs work** changes nothing about the claim, which is the truth, and keeps the
note: "supports the link but not the date" is the next reviewer's head start.

### Phase 4 — the measure (already built, by accident)

Nothing to do. `/about`'s "How well it knows it" recomputes from the graph on every load, so as
verdicts land those three numbers fall on their own. The progress bar for this project is a page
that already exists — which is the argument for computing figures from data rather than writing
them down.

## What this deliberately is not

- **Not an editor.** No field on this page writes a value into the archive. A reviewer's verdict is
  a judgement *about* a claim, and the claim's text is never editable here. Letting a reviewer
  retype a date would put an unsourced value into a provenance archive through its provenance
  tooling.
- **Not authenticated.** The gate is visibility, not security, and the file says so. If this ever
  needs real access control it needs a server, and that is a different project.
- **Not a queue with an owner.** No assignment, no locking, no "claimed by". Two reviewers working
  the same claim independently and agreeing is *better* evidence than one reviewer holding a lock.

## Payload

The queue is `data/kg-review-queue.json`, generated by `build-kg.mjs` — 218 items with their
quotes and resolved names, ~100 KB raw. Loaded by **dynamic import inside the route**, so it is not
in the eager bundle and `/review` costs a public reader nothing. Same reasoning as
`kg-sources.json` and `kg-stats.json`: `src/lib/kg.ts` imports the graph statically, and a page
that needs a slice of it should not pay 426 KB for the whole.

## Why this is the right next phase

The archive's distinguishing claim is provenance. Today it can *state* its provenance debt
precisely — which is more than most archives do — and cannot reduce it. Everything needed to
reduce it already exists: the claims, the quotes, the digests, the worksheet schema, the CSV import
discipline, and a page that measures the result. What was missing was one screen where a person can
read a quote and say yes or no.
