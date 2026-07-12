# Proposing a correction

This project tracks the origin and confidence of every shrine description in
`data/provenance.json` (see `docs/planning/DATA_QUALITY_PLAN.md`). If you spot a
factual error, an unsourced claim, or a citation that doesn't hold up, here's how
to report it — and what happens after.

## How to report

Open a **[Data correction issue](../../issues/new?template=data-correction.yml)**
(uses `.github/ISSUE_TEMPLATE/data-correction.yml`). Include:

- The shrine's name or URL slug.
- The specific sentence/claim you believe is wrong.
- A source for the correct fact, if you have one — even an informal one (a book,
  a news article, a local account) is useful; say so if you don't.

## What happens next (review queue)

1. A maintainer checks the claim against `data/provenance.json`'s existing
   citations (if any) and, where possible, an independent source.
2. If confirmed, the fix is applied to `data/shrines.json` /
   `src/data/shrines-fallback.json` (and the live Google Sheet, which is the
   actual source of truth the app reads from at runtime) and the corresponding
   `data/provenance.json` entry is updated — `notes` records what changed and
   why, `citations` gets the new source, and `reviewedBy`/`date` are set.
3. `npm run data:validate` re-runs the content-quality gates (Phase D of
   `DATA_QUALITY_PLAN.md`) to confirm the fix didn't introduce a new problem
   (leaked placeholder text, a length outlier, an uncited `ai-researched` claim).
4. The issue is closed with a link to the commit/Sheet edit that fixed it.

## Why this matters

Every claim in this archive should be traceable to a source, and machine-drafted
content (`contentTier: ai-researched` in `data/provenance.json`) is a draft until
someone with source access confirms it — see the project's north star in
`docs/planning/PROJECT_VISION.md`. A correction reported and fixed this way is
exactly how that trust gets built one shrine at a time.
