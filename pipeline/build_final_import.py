#!/usr/bin/env python3
"""
build_final_import.py — merge all pending patches onto a fresh raw sheet export,
producing one CSV ready for a single "Replace current sheet" import.

Usage:  python3 build_final_import.py

Why a fresh raw fetch, not data/shrines.csv: the app's own build step
(scripts/data/build-dataset.mjs) silently drops any row with unparseable
Latitude/Longitude, which as of 16 Aug 2026 is exactly the 4 field-survey rows
patch_field_survey_coordinates.csv exists to fix. Those rows are still live in
the actual sheet (just invisible on site) — this script fetches the sheet
directly so it can find them.

Patches applied, in order, each with its own precondition/postcondition checks
(RULE 4 — encode invariants, don't rely on intentions):

  1. patch_bibi_pak_daman_dates.csv   (1 row)   fill year_built* for bibi-pak-daman
  2. patch_tazkira_enrichment.csv     (15 rows) Description+qa_note, full overwrite
     -- EXCLUDES darbar-abul-muali-qadri: that row's tazkira draft dumped its
        entire qa_note into the Description as a fenced ```qa_note code block```
        with an empty qa_note column -- a formatting defect in that one row,
        not the shape the other 15 rows have. patch_field_survey_coordinates.csv
        already carries a clean, later, more complete version of this same row
        (its own qa_note item #10 shows it already incorporated the tazkira
        cross-reference properly) -- that version is used for this id instead.
  3. patch_web_research.csv          (37 rows) Description+qa_note, full overwrite
  4. patch_field_survey_coordinates.csv (4 rows) Latitude/Longitude/Location/
     Description/qa_note, full overwrite (this patch IS the correction)
  5. patch_shah_inayat_merge.csv      (1 row)   overwrite a column only when the
     patch's value is non-empty -- its own Category cell is blank, and blindly
     applying it would silently wipe the existing "Muslim Shrine" value even
     though HANDOVER/TODO describe this patch as "corrects nothing, only adds"
  6. patch_new_field_survey_shrines.csv (4 rows) appended as brand-new rows

Then support_level/info_level are NOT taken from patch_provenance_badges.csv --
that patch was generated on 15 Aug, before the coords content-fix, the tazkira
enrichment, and this session's web-research patch all added new Bibliography
citations to entries it had already scored. Using it now would regress e.g.
the 4 field-survey rows from their current (correct) info_level=Full down to
a stale Low. Instead this script re-runs build_sources_registry.py's own
classify() logic fresh, against the FINAL merged Description of all 171 rows,
producing a support_level/info_level pairing that is never stale by
construction.

Output: data/shrines_final_import_2026-08-16.csv (171 rows, 44 columns: the
original 43 plus a new support_level column).
"""

import csv
import hashlib
import io
import os
import re
import subprocess
import sys
import urllib.request
from collections import Counter

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DATA = os.path.join(REPO, "data")


def die(msg):
    sys.exit(f"build_final_import.py: ERROR: {msg}")


def fetch_raw_sheet():
    import json
    src = json.load(open(os.path.join(DATA, "csv-source.json"), encoding="utf-8"))
    url = src["csvUrl"]
    with urllib.request.urlopen(url, timeout=30) as resp:
        raw = resp.read().decode("utf-8")
    # NEVER raw.splitlines() before handing text to csv.DictReader: a quoted
    # multi-paragraph field (every long Description) contains embedded
    # newlines, and splitting on them first hands the csv module pre-broken
    # rows -- it silently flattens every Description in the file. io.StringIO
    # lets csv's own quote-aware parser do the line-splitting.
    rows = list(csv.DictReader(io.StringIO(raw)))
    if len(rows) < 160:
        die(f"raw sheet fetch looks wrong: only {len(rows)} rows")
    return rows


def load(path):
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main():
    csv.field_size_limit(2**31 - 1)

    print("fetching raw sheet...")
    raw_rows = fetch_raw_sheet()
    by_id = {r["id"]: r for r in raw_rows}
    if len(by_id) != len(raw_rows):
        die("duplicate ids in raw sheet fetch")
    base_ids = set(by_id)
    print(f"  {len(raw_rows)} rows, {len(raw_rows[0])} columns")

    changes = Counter()  # for the human-readable report
    touched_ids = set()  # rows whose Description this script itself rewrote

    # ---- 1. bibi pak daman dates -------------------------------------------
    bibi = load(os.path.join(DATA, "patch_bibi_pak_daman_dates.csv"))
    assert len(bibi) == 1
    b = bibi[0]
    if b["id"] not in by_id:
        die(f"patch_bibi_pak_daman_dates.csv: id {b['id']!r} not in raw sheet")
    for col in ("year_built", "year_built_precision", "year_built_note"):
        by_id[b["id"]][col] = b[col]
    changes["bibi_pak_daman_dates"] = 1

    # ---- 2. tazkira enrichment, excluding the one malformed row ------------
    EXCLUDED_TAZKIRA_ID = "darbar-abul-muali-qadri"
    tazkira = load(os.path.join(DATA, "patch_tazkira_enrichment.csv"))
    tazkira_applied = 0
    for t in tazkira:
        if t["id"] == EXCLUDED_TAZKIRA_ID:
            continue  # superseded by the coords patch's clean version, applied in step 4
        if t["id"] not in by_id:
            die(f"patch_tazkira_enrichment.csv: id {t['id']!r} not in raw sheet")
        row = by_id[t["id"]]
        row["Description"] = t["Description"]
        row["qa_note"] = t["qa_note"]
        touched_ids.add(t["id"])
        tazkira_applied += 1
    assert tazkira_applied == 15, f"expected 15 tazkira rows applied, got {tazkira_applied}"
    changes["tazkira_enrichment"] = tazkira_applied

    # ---- 3. this session's web-research patch ------------------------------
    webr = load(os.path.join(DATA, "patch_web_research.csv"))
    assert len(webr) == 37, f"expected 37 web-research rows, got {len(webr)}"
    for w in webr:
        if w["id"] not in by_id:
            die(f"patch_web_research.csv: id {w['id']!r} not in raw sheet")
        row = by_id[w["id"]]
        row["Description"] = w["Description"]
        row["qa_note"] = w["qa_note"]
        touched_ids.add(w["id"])
    changes["web_research"] = len(webr)

    # ---- 4. field-survey coordinates + content fix -------------------------
    coords = load(os.path.join(DATA, "patch_field_survey_coordinates.csv"))
    assert len(coords) == 4, f"expected 4 coordinate-fix rows, got {len(coords)}"
    for c in coords:
        if c["id"] not in by_id:
            die(f"patch_field_survey_coordinates.csv: id {c['id']!r} not in raw sheet")
        row = by_id[c["id"]]
        for col in ("Latitude", "Longitude", "Location", "Description", "qa_note"):
            row[col] = c[col]
        touched_ids.add(c["id"])
    changes["field_survey_coordinates"] = len(coords)

    # ---- 5. Shah Inayat merge: only overwrite non-empty patch cells --------
    shah = load(os.path.join(DATA, "patch_shah_inayat_merge.csv"))
    assert len(shah) == 1
    s = shah[0]
    if s["id"] not in by_id:
        die(f"patch_shah_inayat_merge.csv: id {s['id']!r} not in raw sheet")
    row = by_id[s["id"]]
    shah_changed_cols = []
    for col, val in s.items():
        if col in ("id", "Name"):
            continue
        if val.strip() == "":
            continue  # blank patch cell = no change intended (see module docstring)
        if row.get(col, "") != val:
            row[col] = val
            shah_changed_cols.append(col)
    if "Description" in shah_changed_cols:
        touched_ids.add(s["id"])
    changes["shah_inayat_merge_columns"] = len(shah_changed_cols)
    print(f"  shah-inayat merge changed columns: {shah_changed_cols}")

    # ---- 6. append the 4 brand-new field-survey shrines --------------------
    new4 = load(os.path.join(DATA, "patch_new_field_survey_shrines.csv"))
    assert len(new4) == 4, f"expected 4 new rows, got {len(new4)}"
    base_header = list(raw_rows[0].keys())
    new_rows = []
    for n in new4:
        if n["id"] in by_id:
            die(f"patch_new_field_survey_shrines.csv: id {n['id']!r} already exists")
        full_row = {col: n.get(col, "") for col in base_header}
        new_rows.append(full_row)
        by_id[n["id"]] = full_row
    changes["new_field_survey_shrines"] = len(new_rows)

    all_ids = list(by_id.keys())
    assert len(all_ids) == len(base_ids) + 4, "row count didn't increase by exactly 4"
    print(f"  total rows after merge: {len(all_ids)}")

    # ---- invariant checks before badge recomputation -----------------------
    # Asterisk balance is checked on every row (a cheap, universal markdown
    # sanity check). The no-newlines flattening check is scoped to rows THIS
    # script rewrote: 49 legacy Web-compiled entries in the live sheet are
    # already single flowing paragraphs with no section structure at all
    # (the standing finding in CLAUDE.md/HANDOVER) -- that is pre-existing
    # and not this script's business to flag. What matters here is that MY
    # OWN patches, which always add "## Bibliography" + paragraph structure,
    # didn't get flattened somewhere in the merge.
    pre_existing_flat = 0
    for rid, row in by_id.items():
        desc = row.get("Description", "")
        if desc.count("*") % 2 != 0:
            die(f"unbalanced asterisks in Description for {rid!r}")
        flat = len(desc) > 500 and "\n" not in desc
        if flat and rid in touched_ids:
            die(f"Description for {rid!r} looks flattened (no newlines, >500 chars) "
                f"-- this row WAS patched by this script, so this is a regression")
        if flat and rid not in touched_ids:
            pre_existing_flat += 1
    print(f"  pre-existing flattened Descriptions, untouched by this merge: {pre_existing_flat}")

    # ---- write intermediate merged CSV (pre-badges) for the classifier -----
    ordered_ids = sorted(by_id, key=lambda k: by_id[k].get("Name", k))
    interim_path = os.path.join(HERE, "_final_merge_interim.csv")
    with open(interim_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=base_header)
        w.writeheader()
        for rid in ordered_ids:
            w.writerow(by_id[rid])
    print(f"  wrote interim merge: {interim_path}")

    # ---- fresh support_level/info_level from the FINAL merged content -----
    # Deliberately NOT patch_provenance_badges.csv: that patch was generated
    # 15 Aug, before the coords content-fix, the tazkira enrichment, and this
    # session's web-research patch all added new citations to rows it had
    # already scored -- applying it now would regress e.g. the 4 field-survey
    # rows from their current, correct info_level=Full down to a stale Low.
    print("\nrecomputing support_level/info_level from final content...")
    registry_script = os.path.join(HERE, "build_sources_registry.py")
    result = subprocess.run(
        [sys.executable, registry_script, interim_path],
        cwd=HERE, capture_output=True, text=True,
    )
    if result.returncode != 0:
        die(f"build_sources_registry.py failed:\n{result.stderr}")
    support_by_name = {
        r["name"]: r
        for r in csv.DictReader(
            open(os.path.join(HERE, "support_levels.tsv"), newline="", encoding="utf-8"),
            delimiter="\t",
        )
    }

    regressions = []
    for rid, row in by_id.items():
        s = support_by_name.get(row["Name"])
        if s is None:
            die(f"no support_levels.tsv row for {row['Name']!r} ({rid})")
        old_info = row.get("info_level", "").strip()
        new_info = s["info_level"]
        if old_info == "Full" and new_info != "Full":
            regressions.append((rid, old_info, new_info))
        row["support_level"] = s["support_level"]
        row["info_level"] = new_info

    if regressions:
        die(
            "info_level REGRESSION(S) detected (currently Full, would become "
            f"something else): {regressions} -- refusing to write a final CSV "
            "that downgrades an already-Full entry. Investigate before proceeding."
        )
    print(f"  {len(support_by_name)} rows scored; no Full->non-Full regressions")

    # ---- write the final CSV -----------------------------------------------
    final_header = base_header + ["support_level"]
    final_path = os.path.join(DATA, "shrines_final_import_2026-08-16.csv")
    with open(final_path, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=final_header)
        w.writeheader()
        for rid in ordered_ids:
            w.writerow({col: by_id[rid].get(col, "") for col in final_header})

    # ---- final round-trip assertion: row/column counts, no truncation ------
    with open(final_path, newline="", encoding="utf-8") as fh:
        written = list(csv.DictReader(fh))
    assert len(written) == len(all_ids), \
        f"round-trip row count mismatch: wrote {len(all_ids)}, read back {len(written)}"
    for w_row in written:
        if w_row["Description"].count("*") % 2 != 0:
            die(f"round-trip check: unbalanced asterisks survived for {w_row['id']!r}")
    print(f"\nwrote {final_path}: {len(written)} rows x {len(final_header)} columns")

    print("\nchange summary:")
    for k, v in changes.items():
        print(f"  {k}: {v}")
    print(f"  support_level/info_level: recomputed fresh for all {len(written)} rows")


if __name__ == "__main__":
    main()
