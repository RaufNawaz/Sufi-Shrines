# Importing shrines_final.csv back into Google Sheets

File to import: **`shrines_final.csv`** (163 data rows + 1 header row; 43 columns; UTF-8, no BOM; descriptions contain real newlines inside quoted cells — this is correct and Sheets handles it).

## Import steps

1. Open the archive spreadsheet, select the shrines tab.
2. **File → Import → Upload** → choose `shrines_final.csv`.
3. Import location: **Replace current sheet**.
4. Separator type: **Comma** (do not use "Detect automatically" — it has been known to mis-sniff).
5. **Turn OFF "Convert text to numbers, dates and formulas."** This matters: conversion mangles
   coordinates (e.g. trailing-zero and precision changes to `74.2470`) and re-interprets
   Hijri/era dates in `Founded/Opened` and the year columns.
6. Click **Import data**.

## Verify after import (2 minutes)

- Row count: **164 rows including the header** (163 shrines). Column A ends at row 164.
- Open **Shrine of Bibi Pak Daman** → its Description cell still shows `## Overview` and the
  other `##` markdown headings on their own lines (multi-line cell). If the cell is one long
  line, the import flattened newlines — stop and re-import (you likely imported a TSV export
  or pasted instead of importing).
- **Lal Shahbaz Qalandar** → Events reads
  `Annual urs (Sha'ban); Thursday-evening dhamal and qawwali; daily langar` —
  **not** "No events scheduled right now".
- Spot-check the new columns exist to the right (through `flags`, `info_level`), and that
  `Gurdwara Dera Sahib` Longitude is `74.313` (not `74`).

## Column layout (43)

- Original 25, unchanged order: `Name, Location, Category, Latitude, Longitude,
  Founded/Opened, Sufi Saint, Image 1 … Image 16, Events, Description`
  (legacy `Category`, `Founded/Opened`, `Sufi Saint` untouched; `Events` refreshed from the
  field patch; four coordinate values corrected — full log in `CHANGES.md`).
- `qa_note`, `needs_review` — QA columns added by the cleanup (lifted `NOTE:` blocks; flags
  such as `unmatched_in_patch`, `figure_unresolved`, `dedication_unsourced`,
  `events_placeholder`).
- 15 structured columns from `shrines_field_patch.tsv`: `id, category, site_type, status,
  principal_figure, figure_type, silsila, year_built, year_built_precision, year_built_note,
  figure_born, figure_died, event_year, event_note, flags`.
- `info_level` — set only where decided (`Low` for Allo Mahar per `allo_mahar_resolution.md`).

## Exporting in future

Always export as **File → Download → Comma-separated values (.csv)**. Never use the
tab-separated export: Sheets' TSV export strips the newlines inside Description cells, which
is exactly the damage this repair had to guard against.

## Rollback

The pre-repair sheet is preserved verbatim at `backups/shrines.20260809-130538.csv`
(and the discarded lossy TSV at `backups/shrines_clean.tsv.removed-*` if it ever existed).
To roll back, import that backup with the same steps above. Intermediate pipeline stages
(`shrines_clean.csv`, `shrines_merged.csv`) are kept for audit alongside
`CHANGES.md`, `QUESTIONS.md`, and `reports/` (join report, validation baseline/final,
before/after summary, targeted-changes rationale).
