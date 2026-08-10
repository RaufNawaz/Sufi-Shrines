# FAST_PLAN.md — 30-minute run

Goal: produce **`shrines_final.csv`**, ready to import into Google Sheets.
Read `CLAUDE.md` first — the newline rule is absolute.

Do not ask the user anything. Log blockers to `QUESTIONS.md` and keep going.
Never invent a historical fact. If a fix needs a source you don't have, flag the row.

---

## STEP 0 — Preflight (2 min, blocking)

```bash
cd ~/shrines && mkdir -p backups reports
cp shrines.csv backups/shrines.$(date +%Y%m%d-%H%M%S).csv
rm -f shrines_clean.tsv          # lossy leftover from a TSV run
```

Assert: in `shrines.csv`, the row whose `Name` contains "Pak Daman" has
`Description.count("\n") > 0`.

**If 0 → STOP EVERYTHING.** Write to `QUESTIONS.md`: *"shrines.csv is flattened. Re-export
from Sheets as Comma-separated values (.csv), not TSV."* Nothing else can proceed.

Print row count and column names.

---

## STEP 1 — Three subagents IN PARALLEL (10 min)

Launch all three at once. They touch different files and cannot conflict.

### Agent A — fix the bibliography parser
File: `build_sources_registry.py`.
`LINE` only matches per-line bullets, so a flattened bibliography yields one citation
instead of six. Add a fallback: when the bibliography section contains no `\n`, split on
` - ` (space-hyphen-space). Hyphens inside titles like `Bibian-e-Pak Daman` have no
surrounding spaces, so this is safe — but write a quick assertion proving it.
**Accept:** "Shrine of Bibi Pak Daman" reports ≥ 5 specific sources (currently 0).

### Agent B — fix the coordinate false positives
File: `validate_shrines.py`.
`PLACES` holds *town* points, but `Location` strings usually name a *district*, producing
~33 false warnings. If the matched place is followed by "District"/"Distt"/"Tehsil" in the
Location string, widen tolerance to 120 km and cap severity at WARN. Keep 20/60 km for
bare town names.
**Accept:** Chandragup, Garh Maharaja, Mohra Sharif, Shah Noorani stop raising ERROR;
Gurdwara Dera Sahib still does (Location is "Lahore, Punjab", genuinely 39 km out).

### Agent C — write the merge script
New file: `merge_patch.py`. Joins `shrines_clean.csv` (`Name`) to
`shrines_field_patch.tsv` (`name`), whitespace-trimmed, case-insensitive fallback.
Writes `shrines_merged.csv`:
- all original columns preserved in original order
- append `id, category, site_type, status, principal_figure, figure_type, silsila,
  year_built, year_built_precision, year_built_note, figure_born, figure_died,
  event_year, event_note, flags`
- **overwrite `Events`** from the patch's `events` column
- leave legacy `Category`, `Founded/Opened`, `Sufi Saint` untouched
- **never touch `Description`**
- unmatched rows keep original values, get `needs_review=unmatched_in_patch`
- write `reports/join_report.txt` listing unmatched names both directions

Sheet has 163 rows, patch has 162 — expect ≥1 unmatched. **Do not guess its identity**;
list it with Location and Category in `QUESTIONS.md`.

---

## STEP 2 — Run the pipeline (5 min, sequential)

```bash
python3 apply_description_fixes.py shrines.csv shrines_clean.csv
python3 merge_patch.py
python3 validate_shrines.py shrines_merged.csv --termbase termbase.tsv --fail-on NONE
cp validation_issues.tsv reports/validation_baseline.tsv
python3 build_sources_registry.py shrines_merged.csv
```

Verify descriptions still contain newlines after every step. If any step flattens them,
stop and fix that step.

---

## STEP 3 — Targeted fixes (8 min)

Write `apply_content_fixes.py` producing `shrines_final.csv` from `shrines_merged.csv`.
Log every change to `CHANGES.md` as before → after. Do not touch any other row.

| Row | Fix |
|---|---|
| **Allo Mahar** | Replace Description with the "Proposed replacement description" text in `allo_mahar_resolution.md`. Set `info_level=Low`, `needs_review=figure_unresolved`. **Write no new biography.** |
| **Tomb of Javindi Bibi** | `principal_figure` → `Bibi Jawindi`. Coords → `29.238, 71.064` (Uch Sharif Bukhari mound). Note both in `qa_note`. |
| **Parnami Mandir** | `principal_figure` → `Dya Ram`, `figure_type=Sant`. |
| **Garh Maharaja (Shorkot)** | `principal_figure` "Sultan Bahoo" → `Sultan Bahu`. |
| **Gurdwara Dera Sahib** | Coords → `31.588, 74.313` (longitude was truncated to `74`). |
| **Gurdwara Khoohi Bhai Lalo** | Coords → `32.0415, 74.2470` (Eminabad). |
| **Bhai Waliram Darbar** | `Events` "Undocumented" → `Not documented`. |
| **Dargah of Khwaja Muhammad Zaman (Luari Sharif)** | One `internal_artefact` survives — find and remove it (likely a `NOTE:` not at end of field). |
| **Amb Temples (Amb Sharif)** | **DO NOT EDIT.** Row claims dedication to Shiva; description never mentions Shiva. Set `needs_review=dedication_unsourced` and log to `QUESTIONS.md`. |

If `allo_mahar_resolution.md` isn't present, set the flags and log it — don't compose
replacement prose yourself.

---

## STEP 4 — Verify and hand back (5 min)

```bash
python3 validate_shrines.py shrines_final.csv --termbase termbase.tsv --fail-on NONE
cp validation_issues.tsv reports/validation_final.tsv
```

Then write **`IMPORT_INSTRUCTIONS.md`**, short and non-technical:

1. Google Sheets → `File → Import → Upload` → `shrines_final.csv`
2. Choose **Replace current sheet** (not "Insert new sheet")
3. Separator: comma. **Leave "Convert text to numbers/dates" OFF** — it mangles
   coordinates and Hijri dates.
4. Check: 163 rows; Bibi Pak Daman's description still shows `## Overview` headings;
   Lal Shahbaz Qalandar's Events shows the Sha'ban urs, not "No events scheduled".
5. Rollback: the timestamped copy in `backups/`.

Finish with a summary in `PROGRESS.md`: ERROR count before → after, rows changed,
open questions.

**Note on pasting:** import the CSV, don't paste it. Pasting multi-line cells into Sheets
breaks the markdown structure — the exact failure this plan exists to avoid.

---

## Out of scope — do not attempt

Rewriting thinly-sourced entries · replacing images · adding shrines · editing the
front-end repo · inventing any date, lineage or silsila.
