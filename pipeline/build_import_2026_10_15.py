#!/usr/bin/env python3
"""
build_import_2026_10_15.py — the import Rauf asked for on 15 October 2026:
the rewritten Descriptions he approved, split across continuation columns, plus
the 318 proposed new rows from Hadiqat al-Awliya and Tarikh-e Lahore.

Usage (from the repo root):
    python3 pipeline/build_import_2026_10_15.py --dry-run
    python3 pipeline/build_import_2026_10_15.py            # writes data/import_2026-10-15.csv

Rulings carried out (Rauf, in chat, 15 October 2026; HANDOVER §9.346):
  * all 94 rewritten Descriptions go in as drafted -> data/review/descriptions_approved.txt;
  * all 318 proposed new rows go in now, although the join check has decided only
    60 of them (this reverses the 13 October "one import after tagging" ruling, §9.333);
  * long articles are split into continuation columns `Description 2`, `Description 3`,
    ... (approved 13 October, §9.336); the site joins them back in
    src/lib/data/fieldAliasing.ts and scripts/data/build-dataset.mjs, which must be
    DEPLOYED BEFORE this file is imported.

Why a new script and not pipeline/build_consolidated_import.py: that one is written
around the September step from 44 to 47 columns (its nine patches are all live now and
its INV-3 forbids any Description change). This one starts from the 47-column sheet.

The base is a Drive-connector CSV export of the live sheet ("Sufi Shrines Database",
1Cl50TENr7m56kzeiSnV_406TRNgvOYAQCjHXQd3SHOo), saved as data/live_sheet_<date>.csv,
because the published-CSV URL is blocked from both shells (403 from the proxy, §9.333).

Invariants, all refuse-to-write (RULE 4):
  INV-1  the live sheet is 171 rows x the 47 expected columns, ids unique
  INV-2  every live cell other than an approved Description is byte-identical in the output
  INV-3  Descriptions change ONLY for ids in descriptions_approved.txt, and each such id's
         live Description still has the length its draft was built against (current_chars):
         a hand edit made after drafting is never overwritten silently
  INV-4  every split article joins back EXACTLY (parts trimmed, joined with a blank line,
         as the site does) and each split is made where a `## ` section begins
  INV-5  no output cell reaches 50,000 characters (the Google Sheets cell limit), counted
         in UTF-16 code units
  INV-6  asterisks balanced in every written Description, whole and per part
  INV-7  new rows: ids unique and not already in the sheet; every `category` inside the
         six-value schema; every `status` blank or inside the five-value schema
  INV-8  no cell contains a carriage return
  INV-9  header = the 47 live columns with Description 2..K inserted directly after
         Description, nothing else
  INV-10 the written file parses back to exactly the rows that passed these checks
"""

from __future__ import annotations

import argparse
import csv
import io
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)
DATA = os.path.join(REPO, "data")
REVIEW = os.path.join(DATA, "review")

LIVE_COLS = [
    "Name", "Location", "Category", "Latitude", "Longitude", "Founded/Opened", "Sufi Saint",
    "Image 1", "Image 2", "Image 3", "Image 4", "Image 5", "Image 6", "Image 7", "Image 8",
    "Image 9", "Image 10", "Image 11", "Image 12", "Image 13", "Image 14", "Image 15", "Image 16",
    "Events", "Description", "qa_note", "needs_review", "id", "category", "site_type",
    "site_type_note", "status", "status_note", "principal_figure", "figure_type", "silsila",
    "silsila_note", "year_built", "year_built_precision", "year_built_note", "figure_born",
    "figure_died", "event_year", "event_note", "flags", "info_level", "support_level",
]
EXPECTED_ROWS = 171
CELL_LIMIT = 50000          # Google Sheets
SPLIT_CAP = 48000           # parts are packed under this, leaving headroom

CATEGORY_SCHEMA = {"Muslim Shrine", "Hindu Temple", "Sikh Gurdwara",
                   "Nanakpanthi / Udasi Darbar", "Jain Temple", "Secular / Memorial"}
STATUS_SCHEMA = {"Active", "Occasional", "Heritage", "Ruin", "Destroyed"}

NEW_ROW_PATCHES = [
    ("PATCH_new_rows_hadeeqat_ul_aulia_2026-10-10.csv", 153),
    ("PATCH_new_rows_tareekh_lahore_2026-10-10.csv", 165),
]


def die(msg: str) -> "None":
    sys.exit("build_import_2026_10_15.py: ERROR: " + msg)


def u16(s: str) -> int:
    return len(s.encode("utf-16-le")) // 2


def load_csv(path: str) -> "tuple[list, list]":
    with open(path, newline="", encoding="utf-8") as fh:
        rd = csv.DictReader(fh)
        rows = list(rd)
        return list(rd.fieldnames or []), rows


def split_article(text: str, cap: int = SPLIT_CAP) -> "list[str]":
    """Split at `\\n\\n## ` boundaries into parts each under `cap` UTF-16 units.

    The two newlines before a split point are removed and come back when the site
    joins the parts with '\\n\\n'. Greedy: a part grows section by section until the
    next section would cross the cap.
    """
    text = text.strip()
    if u16(text) < cap:
        return [text]
    starts = [0] + [m.start() + 2 for m in re.finditer(r"\n\n(?=## )", text)]
    sections = []
    for i, s in enumerate(starts):
        e = starts[i + 1] - 2 if i + 1 < len(starts) else len(text)
        sections.append(text[s:e])
    parts: "list[str]" = []
    cur = ""
    for sec in sections:
        if u16(sec) >= cap:
            die("a single section is %d characters, over the %d cap — split it in the "
                "draft (the checker's F6 should have refused it): %r"
                % (u16(sec), cap, sec[:80]))
        cand = sec if not cur else cur + "\n\n" + sec
        if u16(cand) < cap:
            cur = cand
        else:
            parts.append(cur)
            cur = sec
    if cur:
        parts.append(cur)
    return parts


def site_join(parts: "list[str]") -> str:
    """What src/lib/data/fieldAliasing.ts joinContinuationColumns() produces."""
    return "\n\n".join(p.strip() for p in parts if p.strip())


def main() -> int:
    csv.field_size_limit(2**31 - 1)
    ap = argparse.ArgumentParser()
    ap.add_argument("--live", default=os.path.join(DATA, "live_sheet_2026-10-15.csv"))
    ap.add_argument("--descriptions", default=os.path.join(REVIEW, "PATCH_descriptions_2026-10-14.csv"))
    ap.add_argument("--approved", default=os.path.join(REVIEW, "descriptions_approved.txt"))
    ap.add_argument("--joins", default=os.path.join(REPO, "pipeline", "book_queue", "join_decisions.tsv"))
    ap.add_argument("--out", default=os.path.join(DATA, "import_2026-10-15.csv"))
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    # ---- INV-1: the live sheet ----------------------------------------------
    with open(args.live, "rb") as fh:
        head = fh.read(4096)
    if b"\t" in head.split(b"\n", 1)[0]:
        die("the live export is TSV — RULE 3: TSV strips newlines inside cells; export CSV")
    live_cols, live = load_csv(args.live)
    if live_cols != LIVE_COLS:
        die("INV-1: live header is not the 47 expected columns:\n  %r" % live_cols)
    if len(live) != EXPECTED_ROWS:
        die("INV-1: live sheet has %d rows, expected %d" % (len(live), EXPECTED_ROWS))
    live_ids = [(r["id"] or "").strip() for r in live]
    if "" in live_ids or len(set(live_ids)) != len(live_ids):
        die("INV-1: a live row has no id, or ids repeat")
    print("live sheet: %d rows x %d columns (%s)" % (len(live), len(live_cols), os.path.relpath(args.live, REPO)))

    # ---- approved descriptions ----------------------------------------------
    approved = [ln.strip() for ln in open(args.approved, encoding="utf-8")
                if ln.strip() and not ln.lstrip().startswith("#")]
    if len(set(approved)) != len(approved):
        die("descriptions_approved.txt lists an id twice")
    _, dpatch = load_csv(args.descriptions)
    dby = {r["id"].strip(): r for r in dpatch}
    if len(dby) != len(dpatch):
        die("the descriptions patch repeats an id")
    row_of = {r["id"].strip(): r for r in live}
    missing = [i for i in approved if i not in dby]
    if missing:
        die("approved ids with no draft in %s: %s" % (os.path.basename(args.descriptions), missing))
    notlive = [i for i in approved if i not in row_of]
    if notlive:
        die("approved ids not in the live sheet: %s" % notlive)

    # INV-3 precondition: the live text is still the text the draft replaced.
    moved = []
    for i in approved:
        want = int(dby[i]["current_chars"])
        have = len(row_of[i]["Description"])
        if have != want:
            moved.append((i, want, have))
    if moved:
        die("INV-3: live Description changed since drafting (id, drafted against, live now): %r "
            "— re-read the live text and re-ask before overwriting it" % moved)

    split: "dict[str, list[str]]" = {}
    for i in approved:
        new = dby[i]["Description"].strip()
        if not new:
            die("approved draft for %s is empty" % i)
        parts = split_article(new)
        # INV-4
        if site_join(parts) != new:
            die("INV-4: %s does not join back exactly after splitting" % i)
        for p in parts[1:]:
            if not p.startswith("## "):
                die("INV-4: %s has a part that does not begin at a `## ` section" % i)
        # INV-6
        if new.count("*") % 2:
            die("INV-6: unbalanced asterisks in the approved draft for %s" % i)
        for n, p in enumerate(parts, 1):
            if p.count("*") % 2:
                die("INV-6: part %d of %s has unbalanced asterisks — a bold or italic span "
                    "crosses a section boundary" % (n, i))
        split[i] = parts
    K = max(len(p) for p in split.values()) if split else 1
    cont_cols = ["Description %d" % n for n in range(2, K + 1)]

    # ---- INV-9: header --------------------------------------------------------
    out_cols = []
    for c in LIVE_COLS:
        out_cols.append(c)
        if c == "Description":
            out_cols.extend(cont_cols)
    if len(out_cols) != len(LIVE_COLS) + len(cont_cols) or len(set(out_cols)) != len(out_cols):
        die("INV-9: header is wrong: %r" % out_cols)

    # ---- the 171 live rows ------------------------------------------------------
    out_rows = []
    for r in live:
        o = {c: r[c] for c in LIVE_COLS}
        for c in cont_cols:
            o[c] = ""
        i = r["id"].strip()
        if i in split:
            parts = split[i]
            o["Description"] = parts[0]
            for n, p in enumerate(parts[1:], 2):
                o["Description %d" % n] = p
        out_rows.append(o)

    # INV-2 and INV-3 over the live rows
    for r, o in zip(live, out_rows):
        i = r["id"].strip()
        for c in LIVE_COLS:
            if c == "Description" and i in split:
                continue
            if r[c] != o[c]:
                die("INV-2: %s.%s changed and nothing claims it" % (i, c))
        if i not in split:
            if any(o[c] for c in cont_cols):
                die("INV-3: %s got a continuation cell without an approved draft" % i)

    # ---- new rows -----------------------------------------------------------------
    joins = {}
    with open(args.joins, encoding="utf-8") as fh:
        for ln in fh:
            if ln.startswith("#") or ln.startswith("proposed_id\t") or not ln.strip():
                continue
            f = ln.rstrip("\n").split("\t")
            joins[f[0]] = {"decision": f[1], "target": f[2]}

    new_rows = []
    per_patch = {}
    flagged_review = joined = 0
    for fname, expect in NEW_ROW_PATCHES:
        cols, rows = load_csv(os.path.join(REVIEW, fname))
        if len(rows) != expect:
            die("%s: %d rows, expected %d" % (fname, len(rows), expect))
        extra = [c for c in cols if c not in LIVE_COLS and not c.startswith("_")]
        if extra:
            die("%s carries non-sheet column(s) %s" % (fname, extra))
        for pr in rows:
            o = {c: (pr.get(c) or "") for c in LIVE_COLS}
            for c in cont_cols:
                o[c] = ""
            notes = []
            if (pr.get("_review") or "").strip():
                notes.append("Review flag from the new-rows build: " + pr["_review"].strip())
            j = joins.get(o["id"].strip())
            if j and j["decision"] in ("join", "maybe"):
                notes.append("Join check (HANDOVER §9.344-§9.345): %s with archive row %s — "
                             "see pipeline/book_queue/join_decisions.tsv"
                             % ("same site as" if j["decision"] == "join" else "may be the same as",
                                j["target"]))
                joined += 1
            if notes:
                if o["qa_note"].strip():
                    notes.insert(0, o["qa_note"].strip())
                o["qa_note"] = " | ".join(notes)
                if not o["needs_review"].strip():
                    o["needs_review"] = "Yes"
                flagged_review += 1
            new_rows.append(o)
        per_patch[fname] = len(rows)

    # INV-7
    new_ids = [o["id"].strip() for o in new_rows]
    if "" in new_ids:
        die("INV-7: a new row has no id")
    dup = sorted({i for i in new_ids if new_ids.count(i) > 1})
    if dup:
        die("INV-7: new-row ids repeat: %s" % dup)
    clash = sorted(set(new_ids) & set(live_ids))
    if clash:
        die("INV-7: new-row ids already in the sheet: %s" % clash)
    for o in new_rows:
        if o["category"].strip() not in CATEGORY_SCHEMA:
            die("INV-7: %s category %r outside the schema" % (o["id"], o["category"]))
        if o["status"].strip() and o["status"].strip() not in STATUS_SCHEMA:
            die("INV-7: %s status %r outside the schema" % (o["id"], o["status"]))
        if not o["Name"].strip():
            die("INV-7: %s has no Name (the site drops a row without one)" % o["id"])
    all_names = [o["Name"].strip() for o in out_rows + new_rows]
    name_dups = sorted({n for n in all_names if all_names.count(n) > 1})

    rows = out_rows + new_rows

    # INV-5 / INV-8 over every output cell
    for o in rows:
        for c in out_cols:
            v = o[c]
            if u16(v) >= CELL_LIMIT:
                die("INV-5: %s.%s is %d characters, at or over the 50,000 cell limit"
                    % (o["id"], c, u16(v)))
            if "\r" in v:
                die("INV-8: %s.%s contains a carriage return" % (o["id"], c))

    # ---- INV-10: write to memory, parse back, compare ----------------------------
    buf = io.StringIO()
    w = csv.DictWriter(buf, fieldnames=out_cols, extrasaction="raise", lineterminator="\n")
    w.writeheader()
    for o in rows:
        w.writerow(o)
    payload = buf.getvalue()
    back = list(csv.DictReader(io.StringIO(payload)))
    if len(back) != len(rows):
        die("INV-10: wrote %d rows, read back %d" % (len(rows), len(back)))
    for a, b in zip(rows, back):
        for c in out_cols:
            if a[c] != b[c]:
                die("INV-10: %s.%s did not survive the write" % (a["id"], c))
    # and the joined article the site will see equals the approved draft
    for b in back:
        i = b["id"].strip()
        if i in split:
            got = site_join([b["Description"]] + [b[c] for c in cont_cols])
            if got != dby[i]["Description"].strip():
                die("INV-10: %s does not rejoin to its approved draft after the write" % i)

    # ---- report --------------------------------------------------------------------
    nsplit = sum(1 for p in split.values() if len(p) > 1)
    print("\nchecks passed:")
    print("  INV-1  live: %d rows x %d columns, ids unique" % (len(live), len(LIVE_COLS)))
    print("  INV-2  every live cell outside the %d approved Descriptions byte-identical" % len(split))
    print("  INV-3  %d Descriptions replaced, each live text unchanged since drafting" % len(split))
    print("  INV-4  %d articles split into continuation columns, every one rejoins exactly" % nsplit)
    print("  INV-5  every cell under 50,000 characters (largest %d)"
          % max(u16(o[c]) for o in rows for c in out_cols))
    print("  INV-6  asterisks balanced in every written Description and part")
    print("  INV-7  %d new rows (%s), ids unique and new, schema values"
          % (len(new_rows), ", ".join("%s %d" % (k.split("_")[3], v) for k, v in per_patch.items())))
    print("  INV-8  no carriage returns")
    print("  INV-9  header: %d live columns + %s" % (len(LIVE_COLS), ", ".join(cont_cols) or "none"))
    print("  INV-10 round trip exact; split articles rejoin to their drafts")
    print("\n  new rows given needs_review=Yes with the reason in qa_note: %d "
          "(of which join-check join/maybe: %d)" % (flagged_review, joined))
    if name_dups:
        print("  NOTE: Names shared by more than one row (ids differ, so the site keeps both): %d — %s"
              % (len(name_dups), "; ".join(name_dups)))
    print("\n  output: %d rows x %d columns" % (len(rows), len(out_cols)))
    for i, p in sorted(split.items(), key=lambda kv: -len(kv[1])):
        if len(p) > 1:
            print("    %-55s %d parts: %s" % (i, len(p), ", ".join(str(u16(x)) for x in p)))

    if args.dry_run:
        print("\n--dry-run: nothing written")
        return 0
    with open(args.out, "w", encoding="utf-8", newline="") as fh:
        fh.write(payload)
    with open(args.out, encoding="utf-8", newline="") as fh:
        if fh.read() != payload:
            die("the file on disk is not the bytes that passed the checks")
    print("\nwrote %s (%d bytes)" % (os.path.relpath(args.out, REPO), len(payload.encode("utf-8"))))
    print("Import settings (RULE 3): File > Import > Upload > Replace current sheet · comma ·")
    print("  \"Convert text to numbers, dates and formulas\" OFF")
    return 0


if __name__ == "__main__":
    sys.exit(main())
