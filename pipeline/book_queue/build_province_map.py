#!/usr/bin/env python3
"""Tag every archive row with its PROVINCE and build province -> ids (ruling (c)).

Ruling (c), Rauf, 29 September 2026, in chat: "to each shrines add a province tag and then any
information on sindh in general shows up in the summary of all shrines in that province but be
careful of the timeline of the information."

So a bare PROVINCE name in a book (Sindh, Punjab, Balochistan, Khyber Pakhtunkhwa, ...) attaches
to every row in that province -- ruling (a) one level up. It is kept SEPARATE from toponym_map.txt
on purpose: Punjab is ~90 rows, and province-level material is written ONCE per book under its own
heading and joined to rows by this tag at display time, not by pasting 90 ids into a bullet head.

"Careful of the timeline": a book's "Punjab" or "Sind" may be a historical unit whose extent is
not the modern province (pre-1947 Punjab, a Mughal suba, a Sikh-kingdom Punjab, a colonial Sind).
That caution is enforced in the NOTES (every province-level bullet states the period the book's
statement refers to, as the book gives it, and flags a historical unit) -- this script only tags.

How the tag is derived (RULE 2 -- nothing from general knowledge):
  1. `stated`   : the row's own location_short names exactly one province.
  2. `via-city` : it names none, but another row naming the same leading place (first comma
                  segment) states one, and every such row agrees.
  3. empty      : neither. Reported, never guessed.
A row naming TWO provinces is an error (exit 1) until a human settles it.

Usage: build_province_map.py <shrine_index.tsv> [--write]
  Without --write: report only. With --write: adds/refreshes `province` and `province_source`
  columns in shrine_index.tsv (appended at the end; tools read columns by header) and writes
  province_map.txt beside it.
"""
import csv, sys, re, argparse, collections
from pathlib import Path

PROV = [  # (canonical key, patterns) -- order matters only for reporting
    ("sindh", [r"\bsindh\b", r"\bsind\b"]),
    ("punjab", [r"\bpunjab\b"]),
    ("balochistan", [r"\bbalochistan\b", r"\bbaluchistan\b"]),
    ("khyber pakhtunkhwa", [r"khyber[\s-]+pakhtunkhwa", r"\bkpk\b", r"\bnwfp\b"]),
    ("islamabad capital territory", [r"islamabad capital territory"]),
    ("azad kashmir", [r"azad (jammu (and|&) )?kashmir", r"\bajk\b"]),
    ("gilgit-baltistan", [r"gilgit[\s-]+baltistan"]),
]
ap = argparse.ArgumentParser(); ap.add_argument("index"); ap.add_argument("--write", action="store_true")
a = ap.parse_args()
p = Path(a.index)
rows = list(csv.DictReader(p.open(encoding="utf-8"), delimiter="\t"))
fields = [f for f in rows[0].keys() if f not in ("province", "province_source")]

def stated(loc):
    l = (loc or "").lower()
    hits = [k for k, pats in PROV if any(re.search(x, l) for x in pats)]
    return hits

def lead(loc):
    return re.split(r"[.,;]", loc or "")[0].strip().lower()

err = []
for r in rows:
    h = stated(r["location_short"])
    if len(h) > 1:
        err.append((r["id"], h))
    r["province"] = h[0] if len(h) == 1 else ""
    r["province_source"] = "stated" if len(h) == 1 else ""
city = collections.defaultdict(set)
for r in rows:
    if r["province"]:
        city[lead(r["location_short"])].add(r["province"])
for r in rows:
    if not r["province"]:
        c = city.get(lead(r["location_short"]), set())
        if len(c) == 1:
            r["province"] = next(iter(c)); r["province_source"] = "via-city"

if err:
    print("ERROR: rows naming more than one province -- settle by hand:", file=sys.stderr)
    for i, h in err: print("  ", i, h, file=sys.stderr)
    sys.exit(1)
m = collections.defaultdict(list)
for r in rows:
    if r["province"]: m[r["province"]].append(r["id"])
src = collections.Counter(r["province_source"] or "EMPTY" for r in rows)
print(f"{len(rows)} rows: " + ", ".join(f"{k} {v}" for k, v in src.items()))
for k, v in sorted(m.items(), key=lambda kv: -len(kv[1])): print(f"  {k:30s} {len(v)}")
empty = [r for r in rows if not r["province"]]
for r in empty: print("  NO PROVINCE:", r["id"], "|", r["location_short"][:90])
if a.write:
    with p.open("w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=fields + ["province", "province_source"], delimiter="\t", lineterminator="\n")
        w.writeheader(); [w.writerow(r) for r in rows]
    out = p.with_name("province_map.txt")
    with out.open("w", encoding="utf-8") as fh:
        fh.write("province\tn_rows\tids\n")
        for k, v in sorted(m.items(), key=lambda kv: -len(kv[1])):
            fh.write(f"{k}\t{len(v)}\t{','.join(sorted(v))}\n")
        # aliases a book may print -- same rows, so a worker can look up the book's own word
        for alias, k in [("sind", "sindh"), ("baluchistan", "balochistan"), ("nwfp", "khyber pakhtunkhwa"), ("frontier province", "khyber pakhtunkhwa")]:
            if k in m: fh.write(f"{alias}\t{len(m[k])}\t= {k}\n")
    print("wrote", p, "and", out)
