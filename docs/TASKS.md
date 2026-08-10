# TASKS.md — autonomous work plan

Work through these **in order**. Each task has an acceptance test; do not move on until
it passes. Append a line to `PROGRESS.md` as you complete each one. If a task is blocked,
write the blocker to `QUESTIONS.md` and skip to the next task that isn't downstream of it.

Read `CLAUDE.md` first. The newline rule is not negotiable.

---

## PHASE 0 — Preflight

### T0.1 Set up
```bash
mkdir -p backups reports
cp shrines.csv backups/shrines.$(date +%Y%m%d-%H%M%S).csv
```

### T0.2 Assert the export is lossless
Read `shrines.csv`. For the row whose `Name` contains "Pak Daman", assert
`Description.count("\n") > 0`.

**If it is 0: STOP ALL WORK.** Write to `QUESTIONS.md`:
> `shrines.csv` has flattened descriptions. Re-export from Google Sheets using
> File → Download → **Comma-separated values (.csv)**, not TSV. All other tasks are blocked.

Also delete any stale `shrines_clean.tsv` left over from a TSV-based run — it is lossy
and must not be reused.

**Accept:** newline count > 0, and you report the row count and column list.

---

## PHASE 1 — Repair the tooling

These are known bugs in scripts written before the flattening problem was understood.
Fix them before generating any numbers, because the current outputs are unreliable.

### T1.1 Fix the bibliography parser
In `build_sources_registry.py`, the `LINE` regex only matches per-line bullets.

Add a fallback: if the bibliography section contains no `\n`, split it on ` - `
(space-hyphen-space) instead. Guard against splitting inside citations — hyphens in
`Bibian-e-Pak Daman` have no surrounding spaces, so the delimiter is safe, but write a
test to confirm.

**Accept:** running against `shrines.csv`, the "Shrine of Bibi Pak Daman" row reports
**≥ 5** specific sources (it cites at least six Urdu monographs). It currently reports 0.

### T1.2 Fix the coordinate false positives
In `validate_shrines.py`, `PLACES` maps names to *town* points, but `Location` strings
usually name a *district*. This produces ~33 false warnings.

Implement: if the matched place name is immediately followed by "District" / "Distt" /
"Tehsil" in the Location string, treat it as an administrative unit and widen the
tolerance to 120 km (WARN only, never ERROR). Keep the tight 20/60 km thresholds for
bare town names.

**Accept:** Chandragup, Garh Maharaja, Mohra Sharif and Shah Noorani no longer raise
ERROR. Gurdwara Dera Sahib **still** raises (its Location is "Lahore, Punjab" — a city,
and it is genuinely 39 km out).

### T1.3 Regression test
Write `test_tools.py` covering: the flattened-bibliography fallback, the district
tolerance, the `figure_not_in_description` check, and idempotency of
`apply_description_fixes.py` (run twice, second run makes zero changes).

**Accept:** `python3 test_tools.py` passes.

---

## PHASE 2 — Clean and measure

### T2.1 Clean descriptions
```bash
python3 apply_description_fixes.py shrines.csv shrines_clean.csv
```
Note the output is `.csv`, not `.tsv`.

**Accept:** `shrines_clean.csv` still has newlines in Description. Zero occurrences of
`NOTE:`, `=====`, or `row NN` in any Description. `fixes_applied.log` written.

### T2.2 Baseline validation
```bash
python3 validate_shrines.py shrines_clean.csv --termbase termbase.tsv --fail-on NONE
cp validation_issues.tsv reports/validation_baseline.tsv
```

### T2.3 Provenance
```bash
python3 build_sources_registry.py shrines_clean.csv
cp sources_report.txt reports/
```

**Accept:** `Source-documented` count is now > 0. Record the corrected support-level and
info-level distribution in `PROGRESS.md`. The earlier figures (94 Source-seeded,
62 Web-compiled, 0 Source-documented) were produced from flattened input and are wrong —
supersede them.

---

## PHASE 3 — Merge the field patch, offline

This replaces a manual VLOOKUP session in Google Sheets. Doing it here means the human
imports one finished file instead of hand-building 15 columns.

### T3.1 Reconcile the row sets
Join `shrines_clean.csv` (`Name`) against `shrines_field_patch.tsv` (`name`), trimming
whitespace on both sides. Report to `reports/join_report.txt`:
- names in sheet but not patch
- names in patch but not sheet
- near-misses (case/whitespace/punctuation differences you can safely auto-match)

The sheet has 163 rows and the patch 162, so expect at least one unmatched. **Do not
guess** — list it in `QUESTIONS.md` with its Location and Category so the human can
identify it.

### T3.2 Write `merge_patch.py`
Produce `shrines_merged.csv`:
- Every original column preserved, in original order.
- Append: `id`, `category`, `site_type`, `status`, `principal_figure`, `figure_type`,
  `silsila`, `year_built`, `year_built_precision`, `year_built_note`, `figure_born`,
  `figure_died`, `event_year`, `event_note`, `flags`, `support_level`, `info_level`.
- **Overwrite `Events`** from the patch's `events` column. This carries 66 filled and
  6 corrected festival entries — including Lal Shahbaz Qalandar, currently reading
  "No events scheduled right now" beside a description of one of Pakistan's largest urs.
- Leave the legacy `Category`, `Founded/Opened` and `Sufi Saint` columns **in place and
  untouched**. The human will retire them after verifying the new ones.
- **Never modify `Description`.**
- Unmatched rows keep their original values and get `needs_review=unmatched_in_patch`.

**Accept:** `shrines_merged.csv` has 163 rows, all original columns intact, descriptions
byte-identical to `shrines_clean.csv`, and no cell contains `⚠` or `#N/A`.

---

## PHASE 4 — Targeted fixes

Apply to `shrines_merged.csv`, writing `shrines_final.csv`. Log every change to
`CHANGES.md` with before → after.

### T4.1 Allo Mahar — figure mismatch
The row names Pir Syed Muhammad Channan Shah Nuri; the description is 700 words about
Sayyid Faiz-ul-Hassan Shah. Both are real men from that village.

Replace the Description with the short replacement text in `allo_mahar_resolution.md`
(section "Proposed replacement description"). Set `info_level=Low`,
`needs_review=figure_unresolved`. **Do not write a new biography of either man.**

### T4.2 Tomb of Javindi Bibi
`principal_figure` says Jalaluddin Surkh-Posh Bukhari; the description is about Bibi
Jawindi and is correct. Set `principal_figure` to `Bibi Jawindi`. Coordinates
(29.14, 71.04) sit 11 km off the other Uch Sharif tombs — set to `29.238, 71.064` to
match the Bukhari mound cluster, and note the change in `qa_note`.

### T4.3 Parnami Mandir
`principal_figure` is "Smadhi of Dya Ram" — a monument type, misspelled, not a name.
Set to `Dya Ram`, `figure_type=Sant`. Note the samadhi in `qa_note`.

### T4.4 Garh Maharaja
Field says "Sultan Bahoo", description says "Sultan Bahu". Normalise the field to
`Sultan Bahu` per the termbase.

### T4.5 Amb Temples — STOP
Row claims dedication to Shiva (Mahadev); the description never mentions Shiva. This
needs a source, not a guess. Set `needs_review=dedication_unsourced` and write the
question to `QUESTIONS.md`. **Do not edit the Description.**

### T4.6 Coordinates
- `Gurdwara Dera Sahib`: longitude is `74` (truncated), 39 km from Lahore. Set to
  `31.588, 74.313`, note in `qa_note`.
- `Gurdwara Khoohi Bhai Lalo`: longitude `74` truncated; Eminabad is ≈`32.0415, 74.2470`.
- Scan every row for a latitude or longitude with fewer than 3 decimal places and list
  them in `reports/coord_precision.txt` — flag only, don't invent precision.

### T4.7 Remaining artefact
One `internal_artefact` ERROR survives, in "Dargah of Khwaja Muhammad Zaman (Luari
Sharif)". Find and remove it; it is probably a `NOTE:` not at end-of-field. Extend the
regex in `apply_description_fixes.py` if the pattern is general.

### T4.8 Placeholder Events
Five rows still carry placeholder Events. The patch fixes four. For
`Bhai Waliram Darbar` (`Events = "Undocumented"`) set it to `Not documented`, matching
the convention used elsewhere.

---

## PHASE 5 — Verify and hand back

### T5.1 Final validation
```bash
python3 validate_shrines.py shrines_final.csv --termbase termbase.tsv --fail-on NONE
cp validation_issues.tsv reports/validation_final.tsv
```

**Accept:** ERROR count is 0, or every remaining ERROR is listed in `QUESTIONS.md` with
a reason it cannot be auto-fixed.

### T5.2 Diff report
Write `reports/before_after.md`: baseline vs final counts per check, and the full list of
changed rows with field-level before → after.

### T5.3 Import instructions
Write `IMPORT_INSTRUCTIONS.md` for a non-technical reader:
- Which file to import (`shrines_final.csv`)
- `File → Import → Upload → Replace current sheet` (**not** "Insert new sheet")
- Verify: row count 163, spot-check that Bibi Pak Daman's description still renders
  headings, confirm Lal Shahbaz Qalandar's Events field
- Which legacy columns can be deleted once the new ones look right
- A rollback line pointing at `backups/`

### T5.4 Summary
Append to `PROGRESS.md`: what changed, what's left, and the open questions.

---

## Explicitly out of scope

Do not attempt these — they need human judgement or access you don't have:

- Editing the Google Sheet directly.
- Rewriting the ~100 thinly-sourced entries. That waits on the gold-standard audit.
- Replacing web-hosted images. The decision is to keep them until enumerator photos exist.
- Adding new shrines.
- Changing the front-end code in the Sufi-Shrines repo.
- Inventing any historical fact, date, lineage or silsila affiliation.
