# Runbook — what to do next, in order

> ## ⚠ Dated 9 August 2026. Read it as a record, not as instructions.
>
> Its STEP 0 is "this afternoon's meeting"; its baseline filename is
> `Shrines DB — backup 2026-08-09`. The live working log is
> [`TODO.md`](TODO.md), and current state is [`HANDOVER.md`](HANDOVER.md).
>
> **One step in it is actively harmful and has been corrected in place:** STEP 1 told you to
> download the sheet as **Tab-separated values**. Google Sheets' TSV export silently strips the
> newlines inside cells, which flattens the markdown structure of every Description in the
> archive — headings, bibliography bullets, verse breaks. Nothing errors; you find out later.
> That is CLAUDE.md RULE 3, and this repository documents the discovery in three other places
> (`HANDOVER.md` §"Every Description is markdown", `STATUS_AND_ROADMAP.md`,
> `email_to_adil_data_layer.md`) — this file simply predated it. `docsNoTsvExport.test.ts` now
> fails any doc that instructs a TSV download of this sheet: it is forbidden here.


Tick through these. Each step says what to do, how to know it worked, and roughly how long.

**One dependency before you start:** your responses-sheet → TSV task needs to land first. If it renames any shrine, the field patch joins on `name` and those rows will fail to match. Finish that, then start here.

---

## STEP 0 — This afternoon's meeting · 30 min

Get answers to two things. The other three can slide.

- [ ] **Auqaf records + an access letter for Saifullah.** The relationship is warm now. These registers exist nowhere else.
- [ ] **~$200–400 for a book scanner.** Long procurement lead time, and it gates every piece of anthology work.

Can wait: subject-matter reader, model budget, post-CID funding.

---

## STEP 1 — Back up and take a baseline · 30 min

**Do:**

1. In Google Sheets: `File → Make a copy` → name it `Shrines DB — backup 2026-08-09`.
2. `File → Download → Comma-separated values (.csv)` → save as `shrines.csv` next to the
   scripts. **Not TSV** — see the banner at the top of this file and CLAUDE.md RULE 3. (This
   line originally said "Tab-separated values"; it was written before the TSV newline-stripping
   was discovered.)
3. Run the validator **before changing anything**:

```bash
python3 validate_shrines.py shrines.csv --termbase termbase.tsv --fail-on NONE
cp validation_issues.tsv validation_baseline.tsv
```

**Why baseline first:** you get a number to improve against, and three weeks from now you won't be wondering whether a problem was pre-existing or something you introduced.

**Done when:** you have a backup copy and `validation_baseline.tsv` with a known ERROR/WARN count. Write the numbers down.

---

## STEP 2 — Clean the descriptions · 1 hr

**Do:**

```bash
python3 apply_description_fixes.py shrines.csv shrines_clean.csv
cut -f2 fixes_applied.log | sort -u    # which shrines actually changed
```

**Do NOT re-import all 162 descriptions.** Multi-thousand-word cells with embedded newlines and markdown are exactly what Google Sheets mangles on import. Instead:

4. Open `fixes_applied.log`. Only ~20–30 rows changed.
5. For each, copy the cleaned description out of `shrines_clean.csv` and paste into that one cell in the live sheet.
6. Add a `qa_note` column and paste the lifted `NOTE:` text into the handful of rows that had one — Luari Sharif, Chitti Gatti, Tilganji Sahib, Ustad Nuriya.

**Done when:** searching the sheet for `NOTE:` and for `=====` returns nothing.

---

## STEP 3 — Merge the field patch · 1.5 hr

This step only **adds columns**. It never touches descriptions, so it's low-risk.

**Do:**

1. `File → Import → Upload` → `shrines_field_patch.tsv` → **Insert new sheet**. Call the tab `patch`.
2. In the main sheet add these 15 columns: `id`, `category`, `site_type`, `status`, `principal_figure`, `figure_type`, `silsila`, `year_built`, `year_built_precision`, `year_built_note`, `figure_born`, `figure_died`, `event_year`, `event_note`, `flags`.
3. Populate each with a lookup on name. In the first data row of `id`:

```
=IFERROR(VLOOKUP($A2, patch!$A:$Q, 2, FALSE), "⚠ NO MATCH")
```

Then column 3 for `category`, 4 for `site_type`, and so on across.

4. **Scan for `⚠ NO MATCH`.** Every one is a name that differs between the patch and your sheet — usually trailing whitespace or a renamed row. Fix the name, don't fix the formula.
5. Overwrite the `Events` column from patch column 16. This is where the 66 filled and 6 corrected festival entries land.
6. Once clean, `Copy → Paste special → Values only` to freeze the formulas.

**Done when:** zero `⚠ NO MATCH`, and Lal Shahbaz Qalandar's Events field reads the Sha'ban urs rather than "No events scheduled right now".

---

## STEP 4 — Work the validator to zero ERRORs · 2 hr

**Do:**

```bash
# re-export the sheet as shrines.tsv, then
python3 validate_shrines.py shrines.csv --termbase termbase.tsv --fail-on NONE
awk -F'\t' '$2=="ERROR"' validation_issues.tsv
```

Fix in this order:

1. **`internal_artefact`** — anything Step 2 missed.
2. **`figure_not_in_description`** — expect Allo Mahar (apply `allo_mahar_resolution.md`) and Javindi Bibi (swap the figure to Bibi Jawindi; the description is already correct).
3. **`coord_far_from_place` / `coord_suspicious`** — Dera Sahib is the known one, ≈31.588 / 74.313. Check every longitude ending `.0000`.
4. **`date_before_birth` / `died_before_born`** — the patch fixes the five known cases; anything else is new.

Then triage WARNs. `coord_off_cluster` is the highest-value one — it's how Javindi Bibi's 11 km drift surfaces.

**Done when:** ERROR count is 0. WARNs can stay for now; note the number.

---

## STEP 5 — Build the provenance layer · 1 hr

**Do:**

```bash
python3 build_sources_registry.py shrines.tsv
less sources_report.txt
```

1. Read the **expansion ratio** table. The top of that list is your rewrite queue.
2. Open `sources.tsv` and do one human pass merging near-duplicate citations of the same work — the classifier is regex-based and will split some.
3. Import `support_levels.tsv` as a tab and VLOOKUP `support_level` and `info_level` into the main sheet, same method as Step 3.

**Done when:** every row has an `info_level` of Full / Moderate / Low, and you know how many entries are `Source-seeded`.

---

## STEP 6 — Front end · 2–3 hr

**Do:**

1. Add the three new category filters: **Nanakpanthi (Hindu–Sikh)**, **Jain Temple**, **Secular / Memorial**.
2. Add `info_level` badges — green Field-verified, amber Documented from sources, grey Limited information.
3. On grey entries, add a line inviting contributions: *"We know little about this site. If you know it, tell us."*
4. Optionally surface `status` so ruins and destroyed sites read honestly.
5. Push, then hard-refresh and confirm it's live — remember the branch-tracking issue that once made fixes look like they hadn't deployed.

**Done when:** the map filters on six categories and every pin carries an honest badge.

---

## STEP 7 — Start the slow track · ongoing, from now

These have long lead times. Start them **in parallel**, don't wait for Step 6.

- [ ] **Gold standard, Bibi Pak Daman.** Read the Urdu source and write down every checkable claim. ~8 hours, best spread over weeks. No dependencies. This is the long pole of the whole quality track — starting it today matters more than finishing it fast.
- [ ] **Gazetteer harvest.** Punjab and Sindh district gazetteers from digitised archives. English, so no OCR or translation loss, and no Pakistan-side dependency at all.
- [ ] **Saifullah review grid.** 9 shrines × field categories, present/partial/missing. Then one sitting with Adil, then a single consolidated document to Saifullah — not a trickle of email comments.
- [ ] **Chase Mian Mir's field photos** from Muhammad Rizwan. The survey exists; the photos never landed.

---

## Not yet

Things that feel urgent and aren't:

- **Rewriting the ~25 source-seeded entries.** Wait for the gold standard. Rewriting before you can measure means doing it twice.
- **Replacing web images.** You decided to keep them until enumerator photos exist. Just tag them so the queue is queryable.
- **Adding new shrines.** Every row added before Step 3 lands is a row you migrate twice.
- **The new pipeline.** Prompts are written and ready, but run the bake-off against a baseline first — otherwise "it seems better" is all you'll have.

---

## Rough total

| Step | Time |
|---|---|
| 1 · Backup + baseline | 0.5 h |
| 2 · Clean descriptions | 1 h |
| 3 · Merge patch | 1.5 h |
| 4 · ERRORs to zero | 2 h |
| 5 · Provenance | 1 h |
| 6 · Front end | 2.5 h |
| **Steps 1–6** | **~8.5 h** |

That's one focused weekend, or a week of evenings — and at the end of it the schema is stable, the live errors are gone, and every entry carries an honest badge. Step 7 then runs for months at whatever pace term allows.
