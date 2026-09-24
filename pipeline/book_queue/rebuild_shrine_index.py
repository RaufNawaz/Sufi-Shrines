#!/usr/bin/env python3
"""Rewrite shrine_index.tsv's `location_short` at FULL LENGTH from the shipped shrine data.

Why this exists
---------------
`location_short` was hard-clipped at 60 characters: 45 of 169 rows sat exactly at 60 and 14 of
those ended mid-word inside "Pakistan" ("Pakis", "Pakist", "Pakista", "Paki"). Mapping ruling (a)
(Rauf, 21 September 2026 — a bare toponym takes the id of EVERY archive row in that place) joins on
this column, so the clip made the join lossy: any place named only in the tail of a long row was
invisible. Rauf ruled on 22 September 2026 that the column be regenerated at full length and the
toponym map re-derived from it.

The source of truth is the `Location` field of `src/data/shrines-fallback.json`, which is the
shipped snapshot of the Google Sheet (CLAUDE.md RULE 3 — the sheet is production; nothing here
writes to it).

What it will NOT fix, and that is correct (RULE 2)
--------------------------------------------------
A row whose `Location` never names a city still has no city after this. `darbar-malik-ahmad-ayaz`
is the measured example: its full Location reads "Shah Alam Market; the survey places the mazar
near Darbar Ali Hajveri Ganj Bakhsh (Data Darbar). No city, district, tehsil or province is stated
anywhere in the survey..." — it names Data Darbar but never Lahore. It is therefore still NOT on
the Lahore line, and must not be hand-added. Only its `principal_figure` says "governor of Lahore",
which is a fact about the man, not the site.

Usage:  python3 rebuild_shrine_index.py <shrine_index.tsv> <shrines-fallback.json> [--write]
Without --write it reports and changes nothing. Exits non-zero if the row set would change.
"""
import csv, json, sys, argparse, shutil, re
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("index"); ap.add_argument("data")
ap.add_argument("--write", action="store_true")
a = ap.parse_args()

idx_path, data_path = Path(a.index), Path(a.data)
rows = list(csv.DictReader(idx_path.open(encoding="utf-8"), delimiter="\t"))
fields = list(rows[0].keys())
raw = json.load(data_path.open(encoding="utf-8"))
recs = raw if isinstance(raw, list) else (raw.get("shrines") or raw.get("rows")
        or next(v for v in raw.values() if isinstance(v, list)))
by_id = {r.get("id"): r for r in recs if r.get("id")}
by_name = {}
for r in recs:
    by_name.setdefault((r.get("Name") or "").strip(), r)

# RULE 4 - the two files must agree about which shrines exist. An index id that the snapshot
# does not carry is matched by Name instead, and reported LOUDLY: it means the id exists only
# in this index and not in the Google Sheet the site actually serves, so any note citing it
# points at a row production does not have. Measured 23 September 2026:
# `shaktipeeth-shri-hinglaj-mata-mandir` is exactly that - the id was filled into this index on
# 21 September but the sheet's own id cell for that row is still EMPTY.
by_name_matched = []
unmatched = []
for r in rows:
    if r["id"] in by_id:
        continue
    nm = (r.get("name") or "").strip()
    if nm in by_name and not (by_name[nm].get("id") or "").strip():
        by_name_matched.append((r["id"], nm))
    else:
        unmatched.append(r["id"])
if unmatched:
    sys.exit(f"REFUSING: {len(unmatched)} index ids are absent from the data snapshot "
             f"and could not be matched by name: {unmatched[:5]}")
if by_name_matched:
    print("WARNING - id present in this index but EMPTY in the shipped data snapshot "
          "(src/data/shrines-fallback.json), i.e. in the Google Sheet:")
    for i, nm in by_name_matched:
        print(f"    {i}   (matched by name: {nm!r})")
    print("  Notes citing that id point at a row the live site has no id for. RULE 3 - an agent "
          "does not write to the sheet; this needs a CSV patch a human imports.\n")
if len(rows) != 169:
    print(f"note: index has {len(rows)} rows, not the expected 169", file=sys.stderr)

def clean(s: str) -> str:
    # a TSV cell may not contain a tab or a newline, and the Location prose contains both
    return re.sub(r"\s+", " ", (s or "").replace("\t", " ")).strip()

changed, grew, empty = [], 0, 0
for r in rows:
    old = r["location_short"]
    rec = by_id.get(r["id"]) or by_name.get((r.get("name") or "").strip(), {})
    new = clean(rec.get("Location", ""))
    if not new:
        empty += 1
        continue                      # keep whatever is there rather than blanking it
    if new != old:
        changed.append((r["id"], len(old), len(new)))
        if len(new) > len(old): grew += 1
        r["location_short"] = new

clipped_before = sum(1 for _, o, _ in changed if o == 60)
print(f"rows {len(rows)}; location_short changed on {len(changed)} ({grew} longer, "
      f"{clipped_before} of them were clipped at exactly 60 chars); {empty} rows have no Location")
if changed[:5]:
    print("examples:")
    for i, o, n in changed[:5]:
        print(f"  {i}: {o} -> {n} chars")

if not a.write:
    print("\ndry run - nothing written. Re-run with --write, then regenerate the toponym map:")
    print("  python3 pipeline/book_queue/build_place_map.py pipeline/book_queue/shrine_index.tsv \\\n"
          "      -o pipeline/book_queue/toponym_map.txt")
    sys.exit(0)

bak = idx_path.with_suffix(".tsv.bak")
shutil.copy2(idx_path, bak)
with idx_path.open("w", encoding="utf-8", newline="") as fh:
    w = csv.DictWriter(fh, fieldnames=fields, delimiter="\t", lineterminator="\n")
    w.writeheader(); w.writerows(rows)

# read it back and prove nothing was lost
back = list(csv.DictReader(idx_path.open(encoding="utf-8"), delimiter="\t"))
assert len(back) == len(rows), f"round trip lost rows: {len(back)} != {len(rows)}"
assert [r["id"] for r in back] == [r["id"] for r in rows], "round trip reordered or changed ids"
assert all(len(r) == len(fields) for r in back), "round trip broke the column count"
print(f"\nwritten. backup at {bak.name}. Round trip verified: {len(back)} rows, {len(fields)} columns.")
