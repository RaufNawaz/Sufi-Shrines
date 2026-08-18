# Legacy exports

## shrines_flat_export.tsv

Found untracked at the repo root, undated, no extension (`shrines`). It's a **TSV** export
of the shrines database in the old flat schema (`Name`, `Location`, `Category`,
`Founded/Opened`, `Sufi Saint`, `Image 1`-`Image 16`, `Events`, `Description`) — from before
the three-axis schema split (`category`/`site_type`/`status`) and before provenance/date
fields existed.

Kept for reference only, not as a usable source: Google Sheets' TSV export strips newlines
inside cells (see RULE 3 in CLAUDE.md), so any multi-paragraph or bulleted Description in this
file has already lost its structure. Do not reflow or re-import it — treat `data/shrines.csv`
and the live sheet as authoritative instead.

---

## Rescued from `~/shrines` — 18 August 2026

`~/shrines` is the legacy pipeline directory: unversioned, unbacked-up, and named as risk #1
in `docs/HANDOVER.md` §10. A file-by-file SHA-256 comparison against this repo (excluding
`node_modules`, `.git`, build output and `media/`) found **11 files with no byte-identical
copy anywhere in the repo**. All 11 were copied in and verified byte-identical:

| Rescued file | Landed at |
|---|---|
| `CHANGES.md` (184KB) | `pipeline/legacy-exports/CHANGES.md` |
| `fixes_applied.log` | `pipeline/legacy-exports/fixes_applied.log` |
| `IMPORT_INSTRUCTIONS.md` | `pipeline/legacy-exports/IMPORT_INSTRUCTIONS.md` |
| `QUESTIONS.md` | `pipeline/legacy-exports/QUESTIONS.md` |
| `survey_canonical.tsv` | `pipeline/legacy-exports/survey_canonical.tsv` |
| `validation_baseline.tsv` (root) | `pipeline/reports/validation_baseline_root.tsv` |
| `reports/validation_baseline.tsv` | `pipeline/reports/validation_baseline.tsv` |
| `reports/validation_final.tsv` | `pipeline/reports/validation_final.tsv` |
| `reports/before_after.md` | `pipeline/reports/before_after.md` |
| `reports/targeted_changes.md` | `pipeline/reports/targeted_changes.md` |
| `reports/join_report.txt` | `pipeline/reports/join_report.txt` |

`fixes_applied.log` needed an explicit `!` negation in `.gitignore` (the blanket `*.log` rule
would otherwise have silently dropped it — the exact failure mode this rescue exists to fix).

**Everything else in `~/shrines` is already safe**, verified rather than assumed:

- Every `.py` script has a byte-identical or newer counterpart in `pipeline/`.
- The `.csv`/`.tsv` snapshots there are older versions of files the repo already carries;
  `data/` and the live sheet are authoritative.
- **All 104 files in `~/shrines/media/photos` are already byte-identical in
  `media-source/photos`** (152 files — a strict superset). Media was never at risk; the
  earlier concern was correct about the directory but wrong about the photos.

These are archival copies. Nothing here is an input to any current pipeline step — read
`CHANGES.md` for *why* a 9 August edit was made, not for what the data says now.
