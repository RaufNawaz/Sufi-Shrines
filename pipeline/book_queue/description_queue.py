#!/usr/bin/env python3
"""description_queue.py — which rows' Descriptions are to be rewritten, and how far that has got.

Rauf, 13 October 2026 (HANDOVER §9.333): rewrite from the shrine entries, starting with the rows
that have row-specific material from two or more books. Brief:
docs/prompts/DESCRIPTION_REWRITE_BRIEF.md. Counts here are computed from the files (RULE 4).

    python3 pipeline/book_queue/description_queue.py status          # counts + per-row state
    python3 pipeline/book_queue/description_queue.py next [N]        # first N rows with no draft
    python3 pipeline/book_queue/description_queue.py list [--min-books K]
    python3 pipeline/book_queue/description_queue.py sources
        rewrite out/descriptions/book_sources.md: each takeaways file's whole "*Source: …"
        paragraph (to the first blank line), for building bibliography items
    python3 pipeline/book_queue/description_queue.py view ID [--context]
        the row's entry with line numbers, minus the Province/Place/Person-level blocks (add
        --context to keep them): what a drafter reads first. The checker always reads the
        whole entry.

"Row-specific" = lines inside a book's "## From …" section that are NOT under a
"### Province-level / Place-level / Person-level material" heading, and are not that section's
italic provenance or claim-note lines or a "---" rule. Doubts attached to the row count.
Order: most books first, then id, so the richest rows are drafted first. Writes
out/descriptions/rows_2plus.json (gitignored) as a side effect of status/next/list.
"""
from __future__ import annotations

import csv
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
SHEET = os.path.join(REPO, "data", "snapshot_2026-10-08_post-import.csv")
DRAFTS = os.path.join(REPO, "entries", "descriptions")
APPROVED = os.path.join(REPO, "data", "review", "descriptions_approved.txt")
GEN = re.compile(r"^### (Province-level material|Place-level material|Person-level material)")


def rows(min_books: int = 2) -> list:
    with open(SHEET, encoding="utf-8", newline="") as fh:
        sheet = {r["id"]: r for r in csv.DictReader(fh)}
    out = []
    for i, r in sheet.items():
        f = os.path.join(REPO, "shrine_entries", i + ".md")
        if not os.path.exists(f):
            continue
        cur, mode, secs = None, "spec", {}
        for ln in open(f, encoding="utf-8").read().split("\n"):
            if ln.startswith("## "):
                cur = ln[8:].strip() if ln.startswith("## From ") else None
                mode = "spec"
                if cur:
                    secs.setdefault(cur, 0)
                continue
            if cur is None:
                continue
            if ln.startswith("### "):
                mode = "gen" if GEN.match(ln) else "spec"
                continue
            s = ln.strip()
            if mode == "spec" and s and not s.startswith("*") and not s.startswith("_") and s != "---":
                secs[cur] += 1
        books = [b for b, n in secs.items() if n]
        if len(books) >= min_books:
            out.append(dict(id=i, name=r["Name"], category=r["category"], nbooks=len(books),
                            speclines=sum(secs[b] for b in books), books=books,
                            desc_chars=len(r["Description"])))
    out.sort(key=lambda x: (-x["nbooks"], x["id"]))
    os.makedirs(os.path.join(REPO, "out", "descriptions"), exist_ok=True)
    if min_books == 2:
        json.dump(out, open(os.path.join(REPO, "out", "descriptions", "rows_2plus.json"), "w"),
                  ensure_ascii=False, indent=1)
    return out


def state(i: str, approved: set) -> str:
    if i in approved:
        return "approved"
    if not os.path.exists(os.path.join(DRAFTS, i + ".md")):
        return "todo"
    rc = subprocess.run([sys.executable, os.path.join(HERE, "check_description_draft.py"), i, "--quiet"],
                        capture_output=True).returncode
    return "drafted" if rc == 0 else "failing"


def main() -> int:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    approved = set()
    if os.path.exists(APPROVED):
        approved = {l.split("#")[0].strip() for l in open(APPROVED, encoding="utf-8") if l.split("#")[0].strip()}
    if cmd == "sources":
        import glob
        out = []
        for f in sorted(glob.glob(os.path.join(REPO, "entries", "book_takeaways", "*.md"))):
            t = open(f, encoding="utf-8").read()
            i = t.find("*Source:")
            para = t[i:].split("\n\n")[0].strip() if i >= 0 else "(no *Source: line)"
            out.append("## %s\n%s\n" % (os.path.basename(f)[:-3], para))
        open(os.path.join(REPO, "out", "descriptions", "book_sources.md"), "w", encoding="utf-8").write("\n".join(out))
        print("wrote out/descriptions/book_sources.md (%d books)" % len(out))
        return 0
    if cmd == "view":
        i = sys.argv[2]
        keep_ctx = "--context" in sys.argv
        mode = "spec"
        for n, ln in enumerate(open(os.path.join(REPO, "shrine_entries", i + ".md"), encoding="utf-8").read().split("\n"), 1):
            if ln.startswith("## "):
                mode = "spec"
            elif ln.startswith("### "):
                mode = "gen" if GEN.match(ln) else "spec"
                if mode == "gen" and not keep_ctx:
                    print("%6d  %s  [context block omitted; rerun with --context]" % (n, ln))
                    continue
            if mode == "spec" or keep_ctx:
                print("%6d  %s" % (n, ln))
        return 0
    if cmd == "list":
        k = int(sys.argv[sys.argv.index("--min-books") + 1]) if "--min-books" in sys.argv else 2
        for x in rows(k):
            print(x["nbooks"], x["speclines"], x["desc_chars"], x["id"])
        return 0
    rs = rows(2)
    if cmd == "next":
        n = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        todo = [x for x in rs if not os.path.exists(os.path.join(DRAFTS, x["id"] + ".md"))]
        for x in todo[:n]:
            print(x["id"], "books=%d" % x["nbooks"], "lines=%d" % x["speclines"])
        return 0 if todo else 4
    st = {x["id"]: state(x["id"], approved) for x in rs}
    from collections import Counter
    c = Counter(st.values())
    print("rows with row-specific material from 2+ books: %d" % len(rs))
    for k in ("approved", "drafted", "failing", "todo"):
        print("  %-9s %d" % (k, c.get(k, 0)))
    for x in rs:
        if st[x["id"]] != "todo":
            print("  %-9s %s" % (st[x["id"]], x["id"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
