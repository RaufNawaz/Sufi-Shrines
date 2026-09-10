#!/usr/bin/env python3
"""
build_consolidated_import.py — merge every pending patch onto a fresh raw sheet
export, producing ONE CSV for a single "Replace current sheet" import.

Usage:  python3 pipeline/build_consolidated_import.py [--out data/import_<date>.csv]
        python3 pipeline/build_consolidated_import.py --dry-run

Why this exists rather than a re-run of build_final_import.py: that script
consolidated the *August* pending set, and every patch it applies is now live.
The set that is still pending is a different nine files, and three of them want
to write into `site_type_note`, `status_note` and `silsila_note` — columns
`src/lib/data/shrineModel.ts` reads and **the sheet does not have**. Measured
10 September 2026: the live sheet is 171 rows x 44 columns and contains none of
the three. That is why these patches have sat unimported; a value-only patch
cannot add a column.

Why a fresh raw fetch and not data/live_sheet_*.csv or data/shrines.csv:
`scripts/data/build-dataset.mjs` drops rows it cannot parse, and a dated export
is a snapshot of a sheet that is production (RULE 3). The sheet is fetched here
so the merge is against what is actually live at the moment it runs.

**`data/import_2026-09-05.csv` is not a usable base and is not read here.** It
looks like a consolidated current state and is a mirror of the un-patched sheet:
it carries `category` = 'Islam' for two rows and 'Sufi shrine (Islam)' for a
third, verbatim. Confirmed 10 September 2026.

Patches applied, ascending by the date they were added to git, so that a later
patch overwrites an earlier one on a shared cell. Every overlap in this set was
enumerated before the order was chosen, and each one is a later patch refining
an earlier patch's own row:

  1. patch_schema_and_truncation.csv        (2026-08-18)  5 rows
  2. patch_data_hygiene_2026-08-21.csv      (2026-08-21)  2 rows
  3. patch_location_notes_2026-08-26.csv    (2026-08-26)  2 rows
  4. patch_schema_hygiene_2026-08-27.csv    (2026-08-27)  4 rows
  5. patch_javindi_bibi_figure_2026-08-28   (2026-08-28)  1 row
  6. patch_site_type_2026-08-30.csv         (2026-08-29)  4 rows
  7. patch_location_hygiene_2026-08-30.csv  (2026-08-30)  4 rows
  8. patch_field_survey_orphans_2026-09-05  (2026-09-05)  3 rows

The one overlap worth naming: (1) writes Shah Gohar Peer's built-form prose into
`site_type`, and (6) is the patch that exists to move exactly that prose into
`site_type_note` and leave a short term behind. Date order gives the right
answer on its own, and INV-9 asserts it rather than trusting it.

DELIBERATELY EXCLUDED — patch_provenance_badges.csv. build_final_import.py
already recorded why on 16 August 2026: it was generated 15 August, before three
separate enrichment passes added Bibliography citations to rows it had already
scored, so applying it now regresses rows from a correct info_level down to a
stale one. 58 of its 167 rows disagree with the live sheet today. Re-deriving
support_level/info_level is a separate job with its own instrument
(build_sources_registry.py's classify()), not a side effect of this merge.

DELIBERATELY EXCLUDED — patch_year_built_precision_2026-08-29.csv, found stale
on 10 September 2026 while building this file. It sets `year_built_precision` to
the bare token `unknown` on three rows that now hold a real qualification:

    Darbar Abul Muali Qadri   'Uncertain — field value is a Hijri day-and-year,
                               not a building date'            -> 'unknown'
    Darbar Malik Ahmad Ayaz   "Uncertain — date derived from the figure's death
                               date; calendar era not stated"  -> 'unknown'
    Shrine of Bibi Pak Daman  'uncertain / referent disputed'  -> 'unknown'

Three reasons it must not be applied, and they agree:

  * RULE 2. Those sentences are the qualification, and the rule's own worded
    example is a date field that "may refer to the saint's death rather than
    construction" being **correct** and not to be tidied into a clean value.
  * `src/lib/data/yearPrecision.ts` supports this **by design** — its docstring
    says free-form qualifiers "return null and are rendered verbatim in <bdi>,
    like the source notes", naming 'uncertain / referent disputed' as the
    example. The column is not a closed vocabulary; the code was built to carry
    prose here.
  * The ruling of 5 September, six days *after* this patch, writes prose into
    this very column for Shah Jamal and Peer Makki — and
    patch_field_survey_orphans_2026-09-05.INSTRUCTIONS.md cites
    darbar-malik-ahmad-ayaz's value, one of the three above, as the established
    shape it is imitating. Applying the older patch would delete the model the
    newer ruling was built on.

INV-11 now refuses this class of write generally, so the next stale patch of the
same shape fails the build instead of quietly flattening a note.

Invariants, all of them refuse-to-write (RULE 4):

  INV-1  row count in == row count out == 171; ids unique and preserved
  INV-2  every cell no patch claims is byte-identical to the live fetch
  INV-3  no Description changes at all — the only patch here carrying one is (8),
         whose Description is already live, so it must apply as a no-op
  INV-4  asterisks stay balanced (even count) in every cell this script writes
  INV-5  no cell loses a newline
  INV-6  no cell gains a soft wrap (a single \\n inside a paragraph)
  INV-7  every `category` lands inside the six-value schema
  INV-8  every `status` lands inside the five-value schema, or is blank
  INV-9  every `site_type` this script writes is a short term (no newline, <= 28
         chars), and its prose is preserved somewhere — not silently dropped
  INV-10 the output header is the 44 live columns in their original order with
         exactly three inserted, each directly after the column it annotates
  INV-11 no write flattens a qualification into a bare token — if the live cell
         is a multi-word sentence and the patch's value is a short single token,
         the build fails rather than tidying it away (RULE 2)
"""

from __future__ import annotations

import argparse
import csv
import io
import json
import os
import re
import sys
import urllib.request
from collections import Counter, OrderedDict

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DATA = os.path.join(REPO, "data")

EXPECTED_ROWS = 171
EXPECTED_COLS = 44

# The three note columns the sheet lacks, each mapped to the column it annotates
# so it can be inserted directly after it (INV-10).
NEW_COLUMNS = OrderedDict(
    [("site_type_note", "site_type"), ("status_note", "status"), ("silsila_note", "silsila")]
)

CATEGORY_SCHEMA = {
    "Muslim Shrine",
    "Hindu Temple",
    "Sikh Gurdwara",
    "Nanakpanthi / Udasi Darbar",
    "Jain Temple",
    "Secular / Memorial",
}
STATUS_SCHEMA = {"Active", "Occasional", "Heritage", "Ruin", "Destroyed"}

SITE_TYPE_TERM_MAX = 28

# (filename, expected row count, the columns this patch is permitted to write).
# The allowlist is the point: a patch cannot quietly carry a column nobody
# reasoned about into production.
PATCHES = [
    (
        "patch_schema_and_truncation.csv",
        5,
        ["category", "site_type", "principal_figure", "Sufi Saint", "silsila",
         "silsila_note", "year_built_note", "Events"],
    ),
    ("patch_data_hygiene_2026-08-21.csv", 2, ["category", "Location", "qa_note"]),
    ("patch_location_notes_2026-08-26.csv", 2, ["Location", "qa_note"]),
    ("patch_schema_hygiene_2026-08-27.csv", 4, ["category", "status", "status_note"]),
    ("patch_javindi_bibi_figure_2026-08-28.csv", 1, ["Sufi Saint"]),
    ("patch_site_type_2026-08-30.csv", 4, ["site_type", "site_type_note"]),
    ("patch_location_hygiene_2026-08-30.csv", 4, ["Location", "qa_note"]),
    (
        "patch_field_survey_orphans_2026-09-05.csv",
        3,
        ["Description", "qa_note", "info_level", "support_level", "silsila",
         "year_built", "year_built_precision", "year_built_note"],
    ),
]

EXCLUDED = {
    "patch_provenance_badges.csv":
        "stale by construction — see the module docstring",
    "patch_year_built_precision_2026-08-29.csv":
        "would flatten three real qualifications to 'unknown' — RULE 2, "
        "yearPrecision.ts's by-design free-form support, and the 5 Sept ruling "
        "all say no; see the module docstring",
}

# INV-11. A "bare token" is one word, no space, no sentence punctuation. A
# "qualification" is a live value that is longer and carries a space — the shape
# of a sentence someone wrote on purpose. Replacing the second with the first is
# how the archive's most honest content gets tidied away.
#
# But shortening a cell is only a LOSS when the sentence goes nowhere. The
# site_type patch replaces built-form prose with 'Dargah/Mazar' and puts the
# prose in site_type_note — that is the patch's whole purpose, and the first
# version of this check failed it, which is a wrong check and not a wrong patch
# (RULE 4: "the linter was wrong. Fix the check."). So the test is not "did the
# cell get shorter" but "did the sentence survive anywhere in this row".
BARE_TOKEN = re.compile(r"^[A-Za-z][A-Za-z/_-]*$")
QUALIFICATION_MIN_LEN = 14


def qualification_preserved(old: str, new: str, row: "dict", col: str) -> bool:
    """True if the sentence displaced out of `col` landed in `col`_note.

    Two shapes are legitimate and both appear in this merge:

      site_type  'Shrine complex (tomb, mosque, graveyard; ...)' -> 'Complex'
                 with the WHOLE old value copied into site_type_note.
      status     'Active; in use daily, construction ongoing'    -> 'Active'
                 with only the REMAINDER in status_note, the leading schema
                 token having been consumed as the new value.

    Anything else — including a column that has no companion note, which is the
    year_built_precision case — is a loss, and INV-11 fails on it. Checking the
    specific companion column rather than the whole row is deliberate: a loose
    "does this text appear anywhere" probe passes on coincidental word overlap
    with a neighbouring date note, which is how a check like this quietly stops
    checking.
    """
    note = row.get(col + "_note") or ""
    if not note.strip():
        return False
    o = old.strip()
    if o in note:
        return True
    remainder = re.sub(
        r"^" + re.escape(new.strip()) + r"\s*[;,:.\-–—]*\s*", "", o, flags=re.I
    ).strip()
    return bool(remainder) and remainder in note


def die(msg: str) -> "None":
    sys.exit("build_consolidated_import.py: ERROR: " + msg)


def soft_wraps(text: str) -> int:
    """Single newlines inside a paragraph — the signature of a re-wrapped cell."""
    return len(re.findall(r"(?<!\n)\n(?!\n)", text or ""))


def fetch_raw_sheet() -> "list":
    src = json.load(open(os.path.join(DATA, "csv-source.json"), encoding="utf-8"))
    with urllib.request.urlopen(src["csvUrl"], timeout=60) as resp:
        raw = resp.read().decode("utf-8")
    # NEVER splitlines() before the csv module sees this: every long Description
    # is a quoted multi-paragraph cell with embedded newlines, and pre-splitting
    # hands csv pre-broken rows — it flattens the markdown of the whole file and
    # nothing errors. io.StringIO lets csv's own quote-aware parser split lines.
    rows = list(csv.DictReader(io.StringIO(raw)))
    if len(rows) != EXPECTED_ROWS:
        die("live sheet has %d rows, expected %d — re-read the sheet before trusting this script"
            % (len(rows), EXPECTED_ROWS))
    if len(rows[0]) != EXPECTED_COLS:
        die("live sheet has %d columns, expected %d" % (len(rows[0]), EXPECTED_COLS))
    return rows


def load(path: str) -> "list":
    with open(path, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh))


def main() -> int:
    csv.field_size_limit(2**31 - 1)
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", default=os.path.join(DATA, "import_2026-09-10.csv"))
    ap.add_argument("--dry-run", action="store_true",
                    help="run every check and report, write nothing")
    args = ap.parse_args()

    print("fetching the live sheet (production — RULE 3: read only)...")
    live = fetch_raw_sheet()
    live_cols = list(live[0].keys())
    print("  %d rows x %d columns" % (len(live), len(live_cols)))

    for name, why in EXCLUDED.items():
        print("  excluded: %s — %s" % (name, why))

    by_id = {(r.get("id") or "").strip(): r for r in live if (r.get("id") or "").strip()}
    by_name = {(r.get("Name") or "").strip(): r for r in live}
    if len(by_name) != len(live):
        die("duplicate Name in the live sheet — the Name join key is not unique")

    # A pristine copy to compare against at the end (INV-2).
    before = [dict(r) for r in live]

    # ---- build the output header (INV-10) ---------------------------------
    out_cols: "list" = []
    for c in live_cols:
        out_cols.append(c)
        for new, after in NEW_COLUMNS.items():
            if after == c:
                out_cols.append(new)
    for new in NEW_COLUMNS:
        if new not in out_cols:
            die("could not place new column %r — its base column is missing" % new)
    if len(out_cols) != EXPECTED_COLS + len(NEW_COLUMNS):
        die("output header is %d columns, expected %d"
            % (len(out_cols), EXPECTED_COLS + len(NEW_COLUMNS)))

    rows = [dict(r) for r in live]
    for r in rows:
        for new in NEW_COLUMNS:
            r.setdefault(new, "")

    row_of_name = {(r.get("Name") or "").strip(): r for r in rows}
    row_of_id = {(r.get("id") or "").strip(): r for r in rows if (r.get("id") or "").strip()}

    written: "dict" = {}     # (Name, column) -> patch that last wrote it
    site_type_prose: "dict" = {}   # Name -> prose displaced out of site_type
    changes = Counter()

    # ---- apply the patches, ascending by date ------------------------------
    for fname, expect_rows, allowed in PATCHES:
        path = os.path.join(DATA, fname)
        if not os.path.exists(path):
            die("patch not found: %s" % fname)
        patch = load(path)
        if len(patch) != expect_rows:
            die("%s: %d rows, expected %d" % (fname, len(patch), expect_rows))

        unknown = [c for c in patch[0]
                   if c not in allowed and c not in ("id", "Name", "name", "_why")]
        if unknown:
            die("%s: carries column(s) %s that this script has no rule for — add them to "
                "the allowlist deliberately or drop them" % (fname, unknown))

        applied = 0
        for pr in patch:
            rid = (pr.get("id") or "").strip()
            nm = (pr.get("Name") or pr.get("name") or "").strip()
            row = row_of_id.get(rid) or row_of_name.get(nm)
            if row is None:
                die("%s: row not in the live sheet: id=%r name=%r" % (fname, rid, nm))
            key = (row.get("Name") or "").strip()

            for col in allowed:
                if col not in pr:
                    continue
                val = pr.get(col) or ""
                if not val.strip():
                    # An empty patch cell never wipes a live value. patch_shah_inayat_merge
                    # taught this in August: its blank Category would have erased a correct
                    # "Muslim Shrine" while the docs described the patch as additive.
                    continue
                if col == "site_type" and (len(val.strip()) > SITE_TYPE_TERM_MAX or "\n" in val):
                    # Prose arriving in site_type from an earlier patch. Remember it so
                    # INV-9 can prove a later patch preserved it, and let the write stand;
                    # the later patch overwrites the cell.
                    site_type_prose[key] = val.strip()
                row[col] = val
                written[(key, col)] = fname
                applied += 1
        changes[fname] = applied
        print("  applied %-45s %3d cell(s) over %d row(s)" % (fname, applied, len(patch)))

    # ---- INV-1 -------------------------------------------------------------
    if len(rows) != EXPECTED_ROWS:
        die("INV-1: row count changed to %d" % len(rows))
    ids = [(r.get("id") or "").strip() for r in rows if (r.get("id") or "").strip()]
    if len(ids) != len(set(ids)):
        die("INV-1: duplicate ids in the output")
    if {(r.get("Name") or "").strip() for r in rows} != set(by_name):
        die("INV-1: the set of Names changed")

    # ---- INV-2 -------------------------------------------------------------
    untouched_checked = 0
    for b, a in zip(before, rows):
        key = (b.get("Name") or "").strip()
        for col in live_cols:
            if (key, col) in written:
                continue
            if (b.get(col) or "") != (a.get(col) or ""):
                die("INV-2: %s.%s changed and no patch claims it" % (key, col))
            untouched_checked += 1

    # ---- INV-3 -------------------------------------------------------------
    for b, a in zip(before, rows):
        if (b.get("Description") or "") != (a.get("Description") or ""):
            die("INV-3: Description changed for %r — the only patch carrying one here is "
                "already live and must apply as a no-op"
                % (b.get("Name") or "").strip())

    # ---- INV-4 / 5 / 6 over every cell this script wrote -------------------
    for (key, col), fname in sorted(written.items()):
        row = row_of_name[key]
        new = row.get(col) or ""
        old = next((b.get(col) or "") for b in before if (b.get("Name") or "").strip() == key)
        if new.count("*") % 2 != 0:
            die("INV-4: unbalanced asterisks (%d) in %s.%s from %s"
                % (new.count("*"), key, col, fname))
        if new.count("\n") < old.count("\n"):
            die("INV-5: %s.%s lost a newline (%d -> %d) from %s"
                % (key, col, old.count("\n"), new.count("\n"), fname))
        if soft_wraps(new) > soft_wraps(old) and old.strip():
            die("INV-6: %s.%s gained a soft wrap (%d -> %d) from %s"
                % (key, col, soft_wraps(old), soft_wraps(new), fname))
        # INV-11 — refuse to flatten a qualification into a bare token.
        o, n = old.strip(), new.strip()
        if (len(o) >= QUALIFICATION_MIN_LEN and " " in o
                and BARE_TOKEN.match(n) and len(n) < len(o)
                and not qualification_preserved(o, n, row, col)):
            die("INV-11: %s would flatten %s.%s from a qualification to the bare "
                "token %r, and the sentence did not land in %s_note.\n"
                "         live:  %r\n"
                "         RULE 2 — that sentence IS the content. Either the patch is "
                "stale (exclude it,\n         with the reason recorded) or the "
                "qualification belongs in a *_note column. Do not\n"
                "         edit the content to satisfy the patch."
                % (fname, key, col, n, col, o))

    # ---- INV-7 / INV-8 -----------------------------------------------------
    off_cat = [((r.get("Name") or "").strip(), (r.get("category") or "").strip())
               for r in rows
               if (r.get("category") or "").strip()
               and (r.get("category") or "").strip() not in CATEGORY_SCHEMA]
    if off_cat:
        die("INV-7: category still outside the schema: %r" % off_cat)

    off_status = [((r.get("Name") or "").strip(), (r.get("status") or "").strip())
                  for r in rows
                  if (r.get("status") or "").strip()
                  and (r.get("status") or "").strip() not in STATUS_SCHEMA]
    if off_status:
        die("INV-8: status still outside the schema: %r" % off_status)

    # ---- INV-9 -------------------------------------------------------------
    for key, prose in sorted(site_type_prose.items()):
        row = row_of_name[key]
        final = (row.get("site_type") or "").strip()
        if len(final) > SITE_TYPE_TERM_MAX or "\n" in final:
            die("INV-9: %s.site_type is still prose after every patch: %r" % (key, final))
        note = (row.get("site_type_note") or "")
        head = prose.rstrip(".").strip()[:40]
        if head and head not in note:
            die("INV-9: %s lost its built-form prose — site_type became %r and "
                "site_type_note does not carry it" % (key, final))
        print("  site_type prose preserved for %s -> site_type_note" % key)
    for (key, col) in written:
        if col != "site_type":
            continue
        final = (row_of_name[key].get("site_type") or "").strip()
        if len(final) > SITE_TYPE_TERM_MAX or "\n" in final:
            die("INV-9: %s.site_type written as prose: %r" % (key, final))

    # ---- report ------------------------------------------------------------
    print("\nchecks passed:")
    print("  INV-1  171 rows, ids unique, Name set unchanged")
    print("  INV-2  %d untouched cells byte-identical" % untouched_checked)
    print("  INV-3  no Description changed")
    print("  INV-4/5/6  %d written cells: asterisks balanced, no newline lost, "
          "no soft wrap gained" % len(written))
    print("  INV-7  every category inside the six-value schema")
    print("  INV-8  every status inside the five-value schema, or blank")
    print("  INV-9  every written site_type is a term; displaced prose preserved")
    print("  INV-10 header is %d columns (%d live + %s)"
          % (len(out_cols), EXPECTED_COLS, " + ".join(NEW_COLUMNS)))
    print("  INV-11 no qualification flattened to a bare token")

    blanks = {f: [(r.get("Name") or "").strip() for r in rows if not (r.get(f) or "").strip()]
              for f in ("category", "status", "site_type")}
    for f, names in blanks.items():
        if names:
            print("\n  STILL BLANK after this import — %s: %s" % (f, ", ".join(names)))
            print("    Left blank on purpose (RULE 2): no patch supplies a value and none is "
                  "invented here. Reported, not filled.")

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0

    # ---- write -------------------------------------------------------------
    # A cell carrying a CR would be silently rewritten by .gitattributes'
    # `* text=auto` normalization, so the committed file would not be the file
    # that passed these checks. There are none today; assert it rather than
    # assume it, because a future sheet fetch could introduce one.
    for r in rows:
        for c in out_cols:
            if "\r" in (r.get(c) or ""):
                die("a cell contains a carriage return (%s.%s) — git's text=auto would "
                    "rewrite it after these checks passed" % ((r.get("Name") or "").strip(), c))

    tmp = args.out + ".tmp"
    # lineterminator="\n" so the bytes on disk are the bytes git stores: the repo
    # normalizes to LF (.gitattributes), and csv's "\r\n" default otherwise makes
    # every commit warn and makes the round-trip check below test bytes that are
    # not the ones committed.
    with open(tmp, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=out_cols, extrasaction="raise",
                           lineterminator="\n")
        w.writeheader()
        for r in rows:
            w.writerow({c: r.get(c, "") for c in out_cols})

    # Round-trip: read the file back and prove it parses to the same thing.
    back = load(tmp)
    if len(back) != EXPECTED_ROWS:
        os.unlink(tmp)
        die("round-trip: wrote %d rows, read back %d" % (EXPECTED_ROWS, len(back)))
    if list(back[0].keys()) != out_cols:
        os.unlink(tmp)
        die("round-trip: header changed on the way through the file")
    for a, b in zip(rows, back):
        for c in out_cols:
            if (a.get(c) or "") != (b.get(c) or ""):
                os.unlink(tmp)
                die("round-trip: %s.%s did not survive the write"
                    % ((a.get("Name") or "").strip(), c))
    for b in back:
        d = b.get("Description") or ""
        if d.count("*") % 2 != 0:
            os.unlink(tmp)
            die("round-trip: unbalanced asterisks in Description for %r"
                % (b.get("Name") or "").strip())
    os.replace(tmp, args.out)

    print("\nwrote %s" % os.path.relpath(args.out, REPO))
    print("  %d rows x %d columns; round-trip verified" % (len(back), len(out_cols)))
    print("\nImport settings (RULE 3): Replace current sheet · comma separator ·")
    print("  \"Convert text to numbers, dates and formulas\" OFF")
    return 0


if __name__ == "__main__":
    sys.exit(main())
