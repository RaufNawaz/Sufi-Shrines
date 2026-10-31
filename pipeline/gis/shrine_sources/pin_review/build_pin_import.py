"""
Build the sheet import that moves the archive pins data/review/pin_check_2026-10-30.csv recommends
moving (RULE 3: agents never write to the sheet; a person imports this file).

Reads the published sheet as it stands (the CSV URL in data/csv-source.json, or --live FILE), changes,
for each row whose `recommend` is `move`, only: Latitude and Longitude (to the proposed point), qa_note
(one sentence appended saying where the point comes from) and flags (COORD_FIXED appended). Every other
cell of every row is the live sheet's.

Checks, exit 1 on any failure (RULE 4): each moved id is in the sheet exactly once and still carries the
pin the review started from (if someone moved it since, the review is stale); exactly the intended cells
differ from the live sheet, cell by cell; every Description cell keeps its newlines and asterisks; the
written file reads back exactly.

Usage (from the repo root):
  python -I pipeline/gis/shrine_sources/pin_review/build_pin_import.py --date 2026-10-31
"""
import argparse, csv, io, json, sys, urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[4]
REVIEW = ROOT / "data/review/pin_check_2026-10-30.csv"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--date", required=True)
    ap.add_argument("--live", type=Path, help="a CSV export of the sheet, instead of fetching it")
    ap.add_argument("--review", type=Path, default=REVIEW, help="the review round to apply (one CSV per round)")
    ap.add_argument("--name", help="import file stem after data/import_ (default: the date)")
    a = ap.parse_args()
    if a.live:
        raw = a.live.read_text(encoding="utf-8")
    else:
        url = json.loads((ROOT / "data/csv-source.json").read_text(encoding="utf-8"))["csvUrl"]
        raw = urllib.request.urlopen(url, timeout=60).read().decode("utf-8")
    live = list(csv.reader(io.StringIO(raw, newline="")))
    cols, body = live[0], live[1:]
    ix = {c: i for i, c in enumerate(cols)}
    for c in ("id", "Latitude", "Longitude", "qa_note", "flags", "Description"):
        if c not in ix:
            sys.exit(f"refusing: the sheet has no {c!r} column")
    review = a.review.resolve().relative_to(ROOT).as_posix()
    moves = [r for r in csv.DictReader(open(a.review, encoding="utf-8")) if r["recommend"] == "move"]
    by_id = {}
    for n, row in enumerate(body):
        by_id.setdefault(row[ix["id"]], []).append(n)
    out = [list(r) for r in body]
    want, bad = set(), []
    for m in moves:
        hits = by_id.get(m["id"], [])
        if len(hits) != 1:
            bad.append(f"{m['id']}: {len(hits)} rows in the sheet")
            continue
        n = hits[0]
        row = out[n]
        if (row[ix["Latitude"]], row[ix["Longitude"]]) != (m["current_lat"], m["current_lon"]):
            bad.append(f"{m['id']}: the sheet's pin is {row[ix['Latitude']]},{row[ix['Longitude']]}, "
                       f"the review started from {m['current_lat']},{m['current_lon']}: rerun pin_review.py")
            continue
        src = m["point_from"].split(";")
        src = src[0] if len(src) == 1 else ", ".join(src[:-1]) + " and " + src[-1]
        note = (f"Pin moved {a.date} ({m['move_m']} m) to the point of {src} for this place, after a satellite check "
                f"({review}); it was {m['current_lat']}, {m['current_lon']}.")
        row[ix["Latitude"]], row[ix["Longitude"]] = f"{float(m['proposed_lat']):.6f}", f"{float(m['proposed_lon']):.6f}"
        q = row[ix["qa_note"]].rstrip()
        row[ix["qa_note"]] = (q + "\n\n" + note) if q else note
        f = [x for x in row[ix["flags"]].split(";") if x]
        row[ix["flags"]] = ";".join(f + ([] if "COORD_FIXED" in f else ["COORD_FIXED"]))
        want |= {(n, c) for c in ("Latitude", "Longitude", "qa_note", "flags") if out[n][ix[c]] != body[n][ix[c]]}
    if bad:
        sys.exit("refusing:\n  " + "\n  ".join(bad))
    diff = {(n, c) for n in range(len(body)) for c in cols if out[n][ix[c]] != body[n][ix[c]]}
    if diff != want:
        sys.exit(f"refusing: unexpected cell changes {sorted(diff ^ want)[:5]}")
    for n in range(len(body)):
        for c in cols:
            if c.startswith("Description") and (out[n][ix[c]].count("\n"), out[n][ix[c]].count("*")) != \
                    (body[n][ix[c]].count("\n"), body[n][ix[c]].count("*")):
                sys.exit(f"refusing: row {n + 2} {c} lost newlines or asterisks")
    b = io.StringIO()
    w = csv.writer(b, lineterminator="\n")
    w.writerow(cols)
    w.writerows(out)
    text = b.getvalue()
    dst = ROOT / f"data/import_{a.name or a.date}.csv"
    if dst.exists():
        sys.exit(f"refusing: {dst} exists")
    with open(dst, "w", encoding="utf-8", newline="") as fh:
        fh.write(text)
    with open(dst, encoding="utf-8", newline="") as fh:
        back = fh.read()
    if back != text:
        sys.exit("refusing: the written file does not read back exactly")
    print(f"{dst}: {len(body)} rows, {len(moves)} pins moved, {len(diff)} cells changed, nothing else")


if __name__ == "__main__":
    main()
