# Sheet snapshots — restore points

`data/snapshot_<date>[_<label>].csv` is a full-fidelity CSV of the archive as the repository
held it on that date: every row, every column, with the newlines inside every `Description`
intact.

```bash
npm run data:restore-point                      # snapshot_<date>.csv
npm run data:restore-point -- --label pre-import # snapshot_<date>_pre-import.csv
```

## Why these are committed when `data/*.csv` is gitignored

The Google Sheet **is** production (CLAUDE.md RULE 3). An import replaces the current sheet, has
no review step, and keeps no history. So the state immediately before an import is exactly the
state you most want recoverable — and recoverable *from a commit*, not from whoever happened to
run the export (RULE 0). `.gitignore` therefore carries `!data/snapshot_*.csv` alongside the
existing `!data/patch_*.csv`.

## What the date means

It is the `generated` stamp of `src/data/shrines-fallback.json`, **not** the day the script ran.
Two runs over unchanged data produce the same filename, because a snapshot named for the day
someone happened to type a command is not a fact about the data. If the date looks older than
you expect, the sheet has not been re-fetched since then (`npm run data:build`).

## What it is not

- **Not a patch.** It changes nothing and proposes nothing. Patches are `data/patch_*.csv`, and
  they are what you import. The one currently pending is
  `data/patch_data_hygiene_2026-08-21.csv` (two rows: moves an internal note out of a public
  column, repairs a `category` value the schema does not allow).
- **Not the Urdu data.** Urdu names, saints, places, founding phrases and observance strings
  live in `urdu-i18n/` and are built into `src/data/urdu-seed.json`. They are deliberately *not*
  sheet columns — the sheet has no Urdu column at all — so they are versioned in the repository
  already and are not part of this file.
- **Not a live fetch.** It is generated from the committed snapshot, so it is reproducible from
  the commit. This is also the only thing possible in an environment that cannot reach the
  sheet.

## Restoring one

`File → Import → Upload`, then, per RULE 3:

- **Replace current sheet**
- **Comma** separator
- **"Convert text to numbers, dates and formulas" OFF** — left on, `1041` becomes a number and
  every Hijri date string mangles.

## What the script refuses to write

`scripts/data/snapshot-sheet.mjs` will not produce a file if:

- the proportion of long `Description`s containing a newline collapses below 90% (a TSV
  round-trip flattens every cell at once; 99.4% of 169 carry newlines today), or
- reading the file it just wrote back gives a different row or column count.

It **reports without refusing** for things that are legitimately part of the data: a single-
paragraph entry with no newline (Sant Baba Asudaram Darbar is one — it has no bibliography
section, so there is no heading to break the line), and any `Description` with an odd number of
`*`. Refusing on those would be editing content to satisfy a check, which RULE 4 forbids.
