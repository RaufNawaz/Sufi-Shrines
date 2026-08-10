#!/usr/bin/env python3
"""
merge_patch.py - join shrines_clean.csv (sheet) with shrines_field_patch.tsv (patch).

Usage:  python3 merge_patch.py

Inputs (never modified):
  shrines_clean.csv        - produced by:
                             python3 apply_description_fixes.py shrines.csv shrines_clean.csv
                             27 comma-delimited columns: the 25 original sheet
                             columns, then qa_note, then needs_review.
  shrines_field_patch.tsv  - 17-column TSV keyed on `name`

Outputs (overwritten on every run):
  shrines_merged.csv       - comma-delimited CSV, utf-8, no BOM. 163 rows x 42
                             columns: the 27 original columns in original order,
                             then 15 appended patch columns.
                             * Events is overwritten with the patch `events`
                               value for matched rows; unmatched rows keep it.
                             * Description and qa_note pass through untouched.
                             * needs_review is reused (no second column):
                               matched rows keep the clean stage's value, except
                               that a stale "events_placeholder" token is removed
                               when the patched Events no longer matches the
                               clean script's placeholder regex; unmatched sheet
                               rows get "unmatched_in_patch" appended.
                             * The 15 appended patch columns are empty strings
                               for unmatched rows.
  reports/join_report.txt  - join statistics, unmatched/duplicate details, and
                             placeholder-flag re-evaluation counts

Join rules:
  1. exact match on whitespace-trimmed Name <-> name
  2. case-insensitive match on the trimmed keys for rows still unmatched
  No other fuzzy matching. Rows with duplicated join keys on either side are
  treated as unmatched and reported. Trimming/casefolding is for comparison
  only; written values are never altered (needs_review is the one column this
  script is allowed to edit, per the rules above).

Guarantee: every output Description (and qa_note) is asserted byte-for-byte
identical to its input (embedded newlines intact); exits non-zero if not.
"""

import csv
import os
import re
import sys
from collections import Counter

HERE        = os.path.dirname(os.path.abspath(__file__))
LEFT_PATH   = os.path.join(HERE, "shrines_clean.csv")
RIGHT_PATH  = os.path.join(HERE, "shrines_field_patch.tsv")
OUT_PATH    = os.path.join(HERE, "shrines_merged.csv")
REPORT_DIR  = os.path.join(HERE, "reports")
REPORT_PATH = os.path.join(REPORT_DIR, "join_report.txt")

# The 27 original sheet columns, in the order they must appear in the output.
SHEET_COLS = (
    ["Name", "Location", "Category", "Latitude", "Longitude",
     "Founded/Opened", "Sufi Saint"]
    + [f"Image {i}" for i in range(1, 17)]
    + ["Events", "Description", "qa_note", "needs_review"]
)

# The patch's full header, in order (strict check).
PATCH_COLS = ["name", "id", "category", "site_type", "status",
              "principal_figure", "figure_type", "silsila",
              "year_built", "year_built_precision", "year_built_note",
              "figure_born", "figure_died", "event_year", "event_note",
              "events", "flags"]

# Patch columns appended to the output, in this exact order
# (`name` is the join key; `events` lands in the legacy Events column).
APPEND_COLS = ["id", "category", "site_type", "status", "principal_figure",
               "figure_type", "silsila", "year_built", "year_built_precision",
               "year_built_note", "figure_born", "figure_died",
               "event_year", "event_note", "flags"]

UNMATCHED_FLAG    = "unmatched_in_patch"
PLACEHOLDER_TOKEN = "events_placeholder"
# Same regex apply_description_fixes.py uses to flag placeholder Events.
PLACEHOLDER = re.compile(
    r"no events scheduled right now|undocumented|not documented", re.I)


def die(msg):
    sys.exit(f"merge_patch.py: ERROR: {msg}")


def sniff_delimiter(path):
    """The clean file is comma-delimited today, but older runs of
    apply_description_fixes.py wrote tabs; accept either."""
    with open(path, newline="", encoding="utf-8") as fh:
        first = fh.readline()
    return "\t" if "\t" in first else ","


def read_table(path, delimiter):
    with open(path, newline="", encoding="utf-8") as fh:
        rows = list(csv.reader(fh, delimiter=delimiter))
    if not rows:
        die(f"{path} is empty")
    header, data = rows[0], rows[1:]
    for n, row in enumerate(data, start=2):
        if len(row) != len(header):
            die(f"{path}, record {n}: {len(row)} fields, expected {len(header)}")
    return header, data


def has_token(value, token):
    return any(part.strip() == token for part in value.split(";"))


def remove_token(value, token):
    kept = [p.strip() for p in value.split(";")
            if p.strip() and p.strip() != token]
    return "; ".join(kept)


def main():
    if not os.path.exists(LEFT_PATH):
        die("shrines_clean.csv not found. Create it first with:\n"
            "  python3 apply_description_fixes.py shrines.csv shrines_clean.csv")
    if not os.path.exists(RIGHT_PATH):
        die("shrines_field_patch.tsv not found")

    try:  # descriptions are long; never let the csv module truncate a field
        csv.field_size_limit(sys.maxsize)
    except OverflowError:
        csv.field_size_limit(2 ** 31 - 1)

    # ---- read sheet -------------------------------------------------------
    left_header, left_rows = read_table(LEFT_PATH, sniff_delimiter(LEFT_PATH))
    missing = [c for c in SHEET_COLS if c not in left_header]
    if missing:
        die(f"shrines_clean.csv is missing required columns: {missing}\n"
            "  (qa_note/needs_review come from apply_description_fixes.py)")
    li = {c: left_header.index(c) for c in SHEET_COLS}

    # ---- read patch (tab-delimited, default QUOTE_MINIMAL quoting) --------
    right_header, right_rows = read_table(RIGHT_PATH, "\t")
    if right_header != PATCH_COLS:
        die(f"shrines_field_patch.tsv header drifted.\n"
            f"  expected: {PATCH_COLS}\n  found:    {right_header}")
    ri = {c: n for n, c in enumerate(PATCH_COLS)}

    def skey(row):   # sheet join key (comparison only, never written)
        return row[li["Name"]].strip()

    def pkey(row):   # patch join key (comparison only, never written)
        return row[ri["name"]].strip()

    # ---- duplicate join keys: affected rows are unmatched, and reported ---
    sheet_counts = Counter(skey(r) for r in left_rows)
    patch_counts = Counter(pkey(r) for r in right_rows)
    sheet_dups = sorted(k for k, v in sheet_counts.items() if v > 1)
    patch_dups = sorted(k for k, v in patch_counts.items() if v > 1)

    patch_by_key = {pkey(r): j for j, r in enumerate(right_rows)
                    if patch_counts[pkey(r)] == 1}

    # ---- pass 1: exact match on trimmed keys ------------------------------
    match      = [None] * len(left_rows)   # index into right_rows
    match_kind = [None] * len(left_rows)   # "exact" | "ci"
    used_patch = set()

    for i, row in enumerate(left_rows):
        k = skey(row)
        if sheet_counts[k] > 1:
            continue                        # duplicated sheet key: unmatched
        j = patch_by_key.get(k)
        if j is not None:
            match[i], match_kind[i] = j, "exact"
            used_patch.add(j)

    # ---- pass 2: case-insensitive match for the leftovers -----------------
    rem_sheet = [i for i in range(len(left_rows))
                 if match[i] is None and sheet_counts[skey(left_rows[i])] == 1]
    rem_patch = [j for j in range(len(right_rows))
                 if j not in used_patch and patch_counts[pkey(right_rows[j])] == 1]

    ci_sheet_counts = Counter(skey(left_rows[i]).casefold() for i in rem_sheet)
    ci_patch_counts = Counter(pkey(right_rows[j]).casefold() for j in rem_patch)
    ci_sheet_dups = sorted(k for k, v in ci_sheet_counts.items() if v > 1)
    ci_patch_dups = sorted(k for k, v in ci_patch_counts.items() if v > 1)

    ci_patch_by_key = {pkey(right_rows[j]).casefold(): j for j in rem_patch
                       if ci_patch_counts[pkey(right_rows[j]).casefold()] == 1}

    for i in rem_sheet:
        ck = skey(left_rows[i]).casefold()
        if ci_sheet_counts[ck] > 1:
            continue                        # ambiguous at CI level: unmatched
        j = ci_patch_by_key.get(ck)
        if j is not None:
            match[i], match_kind[i] = j, "ci"
            used_patch.add(j)

    # ---- build output rows -------------------------------------------------
    out_header = SHEET_COLS + APPEND_COLS
    if len(out_header) != 42:
        die(f"internal error: output header has {len(out_header)} columns, not 42")
    events_pos = SHEET_COLS.index("Events")
    review_pos = SHEET_COLS.index("needs_review")

    placeholder_removed = []   # names whose stale events_placeholder was dropped
    placeholder_kept    = []   # names whose Events still look like a placeholder

    out_rows = []
    for i, row in enumerate(left_rows):
        base = [row[li[c]] for c in SHEET_COLS]
        j = match[i]
        if j is not None:
            patch_row = right_rows[j]
            base[events_pos] = patch_row[ri["events"]]
            # re-evaluate the clean stage's events_placeholder flag against
            # the NEW Events value; drop the token only when it went stale
            review = base[review_pos]
            if has_token(review, PLACEHOLDER_TOKEN):
                if PLACEHOLDER.search(base[events_pos]):
                    placeholder_kept.append(row[li["Name"]])
                else:
                    base[review_pos] = remove_token(review, PLACEHOLDER_TOKEN)
                    placeholder_removed.append(row[li["Name"]])
            extra = [patch_row[ri[c]] for c in APPEND_COLS]
        else:
            review = base[review_pos]
            base[review_pos] = (review + "; " + UNMATCHED_FLAG) if review else UNMATCHED_FLAG
            extra = [""] * len(APPEND_COLS)
        out_rows.append(base + extra)

    with open(OUT_PATH, "w", newline="", encoding="utf-8") as fh:
        writer = csv.writer(fh)             # comma, QUOTE_MINIMAL
        writer.writerow(out_header)
        writer.writerows(out_rows)

    # ---- assertion: Description (and qa_note) survive byte-for-byte -------
    # Re-read what actually landed on disk and compare to the input values.
    with open(OUT_PATH, newline="", encoding="utf-8") as fh:
        written = list(csv.reader(fh))
    if written[0] != out_header:
        die("round-trip check failed: output header mutated")
    if len(written) - 1 != len(left_rows):
        die(f"round-trip check failed: wrote {len(written) - 1} rows, "
            f"expected {len(left_rows)}")
    for col in ("Description", "qa_note"):
        d_out = out_header.index(col)
        for i, (src_row, out_row) in enumerate(zip(left_rows, written[1:]), start=2):
            a, b = src_row[li[col]], out_row[d_out]
            if a != b or a.encode("utf-8") != b.encode("utf-8"):
                die(f"{col} mutated for row {i} "
                    f"(Name={src_row[li['Name']]!r}): input and output differ")

    # ---- join report -------------------------------------------------------
    exact_n = sum(1 for k in match_kind if k == "exact")
    ci_n    = sum(1 for k in match_kind if k == "ci")
    unmatched_sheet = [i for i in range(len(left_rows)) if match[i] is None]
    unmatched_patch = [j for j in range(len(right_rows)) if j not in used_patch]

    lines = []
    lines.append("join report: shrines_clean.csv <-> shrines_field_patch.tsv")
    lines.append("generated by merge_patch.py")
    lines.append("")
    lines.append(f"sheet rows (shrines_clean.csv):        {len(left_rows)}")
    lines.append(f"patch rows (shrines_field_patch.tsv):  {len(right_rows)}")
    lines.append(f"exact matches (trimmed keys):          {exact_n}")
    lines.append(f"case-insensitive matches:              {ci_n}")
    lines.append(f"unmatched sheet rows:                  {len(unmatched_sheet)}")
    lines.append(f"unmatched patch rows:                  {len(unmatched_patch)}")
    lines.append("")
    lines.append("events_placeholder flag re-evaluation after Events patch:")
    lines.append(f"  removed (Events no longer a placeholder): {len(placeholder_removed)}")
    for name in placeholder_removed:
        lines.append(f"    {name}")
    lines.append(f"  retained (Events still placeholder-like): {len(placeholder_kept)}")
    for name in placeholder_kept:
        lines.append(f"    {name}")
    lines.append("")
    lines.append("unmatched sheet rows (Name | Location | Category):")
    if unmatched_sheet:
        for i in unmatched_sheet:
            r = left_rows[i]
            lines.append(f"  {r[li['Name']]} | {r[li['Location']]} | {r[li['Category']]}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("unmatched patch rows (name):")
    if unmatched_patch:
        for j in unmatched_patch:
            lines.append(f"  {right_rows[j][ri['name']]}")
    else:
        lines.append("  (none)")
    lines.append("")
    lines.append("duplicate join keys (affected rows treated as unmatched):")
    lines.append(f"  sheet duplicate trimmed Names:            "
                 f"{', '.join(repr(k) for k in sheet_dups) if sheet_dups else '(none)'}")
    lines.append(f"  patch duplicate trimmed names:            "
                 f"{', '.join(repr(k) for k in patch_dups) if patch_dups else '(none)'}")
    lines.append(f"  case-insensitive pass, sheet collisions:  "
                 f"{', '.join(repr(k) for k in ci_sheet_dups) if ci_sheet_dups else '(none)'}")
    lines.append(f"  case-insensitive pass, patch collisions:  "
                 f"{', '.join(repr(k) for k in ci_patch_dups) if ci_patch_dups else '(none)'}")

    os.makedirs(REPORT_DIR, exist_ok=True)
    with open(REPORT_PATH, "w", newline="", encoding="utf-8") as fh:
        fh.write("\n".join(lines) + "\n")

    print(f"wrote {OUT_PATH}: {len(out_rows)} rows x {len(out_header)} columns")
    print(f"wrote {REPORT_PATH}")
    print(f"matches: {exact_n} exact + {ci_n} case-insensitive; "
          f"{len(unmatched_sheet)} sheet / {len(unmatched_patch)} patch unmatched")
    print(f"events_placeholder flags: {len(placeholder_removed)} removed, "
          f"{len(placeholder_kept)} retained")
    print("Description/qa_note byte-for-byte assertion: PASSED")


if __name__ == "__main__":
    main()
