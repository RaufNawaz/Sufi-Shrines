#!/usr/bin/env python3
"""
finalise_sheet.py — strip markdown artefacts and merge the image URLs. One import.

    python3 finalise_sheet.py shrines_final_v2.csv image_urls.tsv shrines_v3.csv

WHAT IT FIXES
1. Markdown leakage. My append_new_shrines.py parser let `**bold**`, `*italic*` and
   stray backticks through into the four new rows across several columns — Name,
   principal_figure, year_built_note and others. Cleans EVERY cell in EVERY row, so it
   also catches any I have not spotted.
   The Description column is deliberately EXEMT: `*italic*` is meaningful markdown there
   and the site renders it. Only its leading/trailing whitespace is touched.
2. Image URLs. Merges image_urls.tsv (Name + Image 1..16) into the matching rows, keyed
   on the CLEANED name so the `**` prefix no longer breaks the join.

SAFETY
 - Never changes row count or column order.
 - Reports every cell it alters, and every image row that fails to match.
 - Refuses to write if any Description loses its newlines.
"""

import csv, re, sys
from collections import defaultdict

# NO "whole value is wrapped" rule. It looked sensible and was wrong: a cell reading
# "** *ʿUrs*, 19-21 Ramzan ... *mehfil*" both starts and ends with "*", so a wrap rule
# unwraps it, eats the closing marker of *mehfil* and leaves a stray "*" at the front.
# The boundary rules below handle "**Name**" on their own.

# An ORPHANED artefact marker at a boundary. Two or more asterisks only — a LONE
# leading "*" is almost always the opening of a real italic ("*ʿurs* on 24 Rabīʿ")
# and must not be touched. This was the bug: stripping "** " then looping again ate
# the "*" of "*ʿUrs*" and left an unbalanced closing marker behind.
LEAD_ART  = re.compile(r"^\s*(?:\*{2,}|_{2,})\s*")
TRAIL_ART = re.compile(r"\s*(?:\*{2,}|_{2,})\s*$")
LEAD_TICK  = re.compile(r"^\s*`+\s*")
TRAIL_TICK = re.compile(r"\s*`+\s*$")

WS = re.compile(r"[ \t]{2,}")


def clean(v):
    if not v:
        return v
    out = v.strip()
    multiline = "\n" in out

    # 2. orphaned artefact markers at the boundaries
    out = LEAD_ART.sub("", out)
    out = TRAIL_ART.sub("", out)
    out = LEAD_TICK.sub("", out)
    out = TRAIL_TICK.sub("", out)

    # 3. if asterisks are now odd, one stray marker survives at a boundary
    if out.count("*") % 2 == 1:
        if out.startswith("*"):
            out = out[1:].lstrip()
        elif out.endswith("*"):
            out = out[:-1].rstrip()

    # 4. never reflow multi-line prose (qa_note); collapse runs of spaces elsewhere
    if not multiline:
        out = WS.sub(" ", out)
    return out.strip()


def main(src, urls, dst, allow_flat=False):
    with open(src, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        header = rdr.fieldnames
        rows = list(rdr)
    if not header:
        sys.exit("no header in " + src)

    lower = {h.strip().lower(): h for h in header}
    def col(n): return lower.get(n.strip().lower())

    DESC = col("Description")
    NAME = col("Name")
    if not NAME:
        sys.exit("no Name column found")

    # ---------- 1. clean markdown artefacts ----------
    # URLs are not markdown. Medium serves paths like "/1*eyT2zQwnT7gT4J6YiR_xIQ.jpeg",
    # where the asterisk is a real character. Never run the emphasis cleaner over them.
    def is_url(s):
        return "://" in s

    changes = []
    for i, r in enumerate(rows, start=2):          # sheet row numbers
        for h in header:
            if h == DESC:
                if r[h] and r[h] != r[h].strip():
                    r[h] = r[h].strip()
                continue
            before = r.get(h) or ""
            if is_url(before):
                if before != before.strip():
                    r[h] = before.strip()
                continue
            after = clean(before)
            if after != before:
                r[h] = after
                changes.append((i, r.get(NAME, "?"), h, before[:60], after[:60]))

    # ---------- 2. merge image URLs ----------
    img_cols = [h for h in header if h.strip().lower().startswith("image")]
    by_name = {(r.get(NAME) or "").strip().lower(): r for r in rows}

    delim = "\t" if urls.lower().endswith((".tsv", ".tab")) else ","
    merged, unmatched = [], []
    with open(urls, newline="", encoding="utf-8") as fh:
        for u in csv.DictReader(fh, delimiter=delim):
            ulower = {k.strip().lower(): k for k in u}
            uname = clean((u.get(ulower.get("name", "")) or "")).strip()
            target = by_name.get(uname.lower())
            if not target:
                unmatched.append(uname)
                continue
            n_set = 0
            for c in img_cols:
                src_key = ulower.get(c.strip().lower())
                if src_key is None:
                    continue
                val = (u.get(src_key) or "").strip()
                if val:
                    target[c] = val
                    n_set += 1
            merged.append((uname, n_set))

    # ---------- 2b. integrity: no cell may leave with unbalanced emphasis ----------
    odd = []
    for i, r in enumerate(rows, start=2):
        for h in header:
            if h == DESC:
                continue
            v = r.get(h) or ""
            if is_url(v):
                continue
            if v.count("*") % 2 == 1:
                odd.append((i, r.get(NAME, "?"), h, v[:70]))
    if odd:
        print(f"UNBALANCED ASTERISKS AFTER CLEANING ({len(odd)}) — cleaner is wrong:")
        for i, n, h, v in odd:
            print(f"   row {i:<4} {h:<22} {v!r}")
        sys.exit(1)

    # ---------- 3. guard ----------
    if DESC:
        flat = [(r.get(NAME), len(r[DESC] or "")) for r in rows
                if (r.get(DESC) or "") and "\n" not in r[DESC] and len(r[DESC]) > 400]
        if flat:
            # This guard exists to catch flattening CAUSED HERE. If the input arrived
            # flat, blocking is the wrong call — this script never edits Description
            # bodies, so proceeding cannot make it worse. Warn loudly and continue.
            label = ("WARNING — these Descriptions were ALREADY flat on input"
                     if allow_flat else
                     "REFUSING TO WRITE — long Descriptions with no newlines")
            print(label + ":")
            for n, l in flat:
                print(f"   {n}  ({l} chars)")
            if not allow_flat:
                print("\nThese are pre-existing, not caused by this script. Either:")
                print("  python3 reflow_descriptions.py <in.csv> <reflowed.csv>   (repair)")
                print("  ...or re-run this with --allow-flat to import them as-is.")
                sys.exit(1)
            print()

    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader(); w.writerows(rows)

    # ---------- report ----------
    print(f"{src}  ->  {dst}")
    print(f"rows {len(rows)}   columns {len(header)}\n")

    print(f"MARKDOWN ARTEFACTS CLEANED: {len(changes)}")
    per_col = defaultdict(int)
    for _, _, h, _, _ in changes:
        per_col[h] += 1
    for h, n in sorted(per_col.items(), key=lambda x: -x[1]):
        print(f"   {h:<24}{n}")
    if changes:
        print("\n   detail:")
        for row_n, name, h, b, a in changes:
            print(f"   row {row_n:<4} {h:<22} {b!r} -> {a!r}")

    print(f"\nIMAGE ROWS MERGED: {len(merged)}")
    for n, c in merged:
        print(f"   {n[:52]:<54}{c} URLs")
    if unmatched:
        print(f"\n!! UNMATCHED image rows ({len(unmatched)}) — these did NOT get their URLs:")
        for n in unmatched:
            print(f"   {n}")
        print("   Check the Name spelling in image_urls.tsv against the CSV.")

    print(f"\nNow import {dst}: File > Import > Replace current sheet, comma separator,")
    print("conversion OFF. Then run validate_shrines.py against a fresh export.")


if __name__ == "__main__":
    argv = [a for a in sys.argv[1:] if a != "--allow-flat"]
    if len(argv) != 3:
        sys.exit(__doc__)
    main(*argv, allow_flat="--allow-flat" in sys.argv)
