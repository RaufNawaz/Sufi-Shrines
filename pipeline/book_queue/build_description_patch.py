#!/usr/bin/env python3
"""build_description_patch.py — collect every passing Description draft into one review patch.

    python3 pipeline/book_queue/build_description_patch.py [--stamp YYYY-MM-DD]

Writes data/review/PATCH_descriptions_<stamp>.csv (id, Name, current_chars, proposed_chars,
books_cited, Description) and a .md summary. Only drafts that pass
check_description_draft.py go in; failing ones are listed and left out. Refuses (exit 1) if a
draft's text would gain a carriage return, or loses the markdown newlines (RULE 3/4: a cell
with no newline at all in a long Description is the TSV-flattening signature).
Nothing here touches the sheet; the consolidated import reads only the ids listed in
data/review/descriptions_approved.txt (Rauf's review), never this file whole.
"""
from __future__ import annotations

import argparse
import csv
import datetime
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
from check_description_draft import CITE_GROUP, load_sheet, DEFAULT_SHEET  # noqa: E402

DRAFTS = os.path.join(REPO, "entries", "descriptions")


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--stamp", default=datetime.date.today().isoformat())
    a = ap.parse_args()
    sheet = load_sheet(DEFAULT_SHEET)
    ids = sorted(f[:-3] for f in os.listdir(DRAFTS) if f.endswith(".md") and not f.endswith(".notes.md"))
    good, bad = [], []
    for i in ids:
        rc = subprocess.run([sys.executable, os.path.join(HERE, "check_description_draft.py"), i, "--quiet"],
                            capture_output=True).returncode
        (good if rc == 0 else bad).append(i)
    out_csv = os.path.join(REPO, "data", "review", "PATCH_descriptions_%s.csv" % a.stamp)
    rows = []
    for i in good:
        d = open(os.path.join(DRAFTS, i + ".md"), encoding="utf-8").read().strip("\n")
        if "\r" in d or (len(d) > 1500 and "\n" not in d):
            print("REFUSE %s: carriage return or no newlines in a long Description" % i)
            return 1
        titles = sorted({m for g in CITE_GROUP.finditer(d) for m in re.findall(r"\*([^*]+)\*", g.group(1))})
        rows.append(dict(id=i, Name=sheet[i]["Name"], current_chars=len(sheet[i]["Description"]),
                         proposed_chars=len(d), books_cited="; ".join(titles), Description=d))
    with open(out_csv, "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["id", "Name", "current_chars", "proposed_chars", "books_cited", "Description"])
        w.writeheader()
        w.writerows(rows)
    # read it back: the csv module must round-trip every cell byte for byte (the default
    # 131,072-char field limit is below the longest whole article, §9.334)
    csv.field_size_limit(10_000_000)
    back = list(csv.DictReader(open(out_csv, encoding="utf-8", newline="")))
    assert [r["Description"] for r in back] == [r["Description"] for r in rows], "CSV round-trip changed a cell"
    md = out_csv[:-4] + ".md"
    with open(md, "w", encoding="utf-8") as fh:
        fh.write("# Rewritten Descriptions for review, %s\n\n" % a.stamp)
        fh.write("Built by `pipeline/book_queue/build_description_patch.py` from `entries/descriptions/`, under "
                 "Rauf's ruling of 13 October 2026 (HANDOVER §9.333; brief `docs/prompts/DESCRIPTION_REWRITE_BRIEF.md`). "
                 "**Not an import file.** Approve a row by adding its id to `data/review/descriptions_approved.txt`; "
                 "only approved ids go into the consolidated import. Each row's review notes are "
                 "`entries/descriptions/<id>.notes.md`.\n\n")
        fh.write("%d drafts pass the checks; %d fail and are left out%s.\n\n" % (len(good), len(bad), (": " + ", ".join(bad)) if bad else ""))
        fh.write("| id | current | proposed | books cited |\n|---|---:|---:|---|\n")
        for r in rows:
            fh.write("| `%s` | %d | %d | %s |\n" % (r["id"], r["current_chars"], r["proposed_chars"], r["books_cited"]))
    print("wrote %s (%d rows), %s; %d failing left out" % (os.path.relpath(out_csv, REPO), len(rows), os.path.relpath(md, REPO), len(bad)))
    return 0


if __name__ == "__main__":
    sys.exit(main())
