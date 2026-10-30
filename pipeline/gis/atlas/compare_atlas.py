"""
Compare the atlas tables on disk with a committed version, indicator by indicator: what a rebuild moved.

For each of atlas_district.csv, atlas_tehsil.csv and atlas_province.csv it matches rows on the unit's
code and reports, per column, how many values changed beyond rounding (relative difference > 1e-9),
how many went from a value to empty or back, and the largest change. Rows and columns present on one
side only are listed. Line endings and column order do not count as changes.

Python standard library only. Usage, from the repo root:
  python pipeline/gis/atlas/compare_atlas.py              # against HEAD
  python pipeline/gis/atlas/compare_atlas.py --ref main   # against another commit
  python pipeline/gis/atlas/compare_atlas.py --out docs/research/atlas_rebuild_diff.csv
Exits 0 either way: a change is a finding to read, not an error.
"""
import argparse, csv, io, math, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TABLES = {"district": "district_code", "tehsil": "tehsil_code", "province": "province_code"}


def read(text, key):
    rows = list(csv.DictReader(io.StringIO(text)))
    if rows and key not in rows[0]:
        key = next(k for k in rows[0] if k.endswith("_code"))
    return {r[key]: r for r in rows}, (list(rows[0]) if rows else [])


def num(v):
    try:
        x = float(v)
        return x if math.isfinite(x) else None
    except (TypeError, ValueError):
        return None


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--ref", default="HEAD")
    ap.add_argument("--out", type=Path, help="write one row per changed column to this CSV")
    a = ap.parse_args()
    out = []
    for unit, key in TABLES.items():
        rel = f"pipeline/gis/atlas/atlas_{unit}.csv"
        old_text = subprocess.run(["git", "show", f"{a.ref}:{rel}"], cwd=ROOT, capture_output=True,
                                  encoding="utf-8").stdout
        if not old_text:
            print(f"{unit}: not in {a.ref}")
            continue
        old, oc = read(old_text, key)
        new, nc = read((ROOT / rel).read_text(encoding="utf-8"), key)
        print(f"\n{unit}: {len(old)} rows in {a.ref}, {len(new)} now")
        for side, xs in (("only before", set(old) - set(new)), ("only now", set(new) - set(old))):
            if xs:
                print(f"  rows {side}: {sorted(xs)[:10]}{' ...' if len(xs) > 10 else ''}")
        for side, xs in (("only before", [c for c in oc if c not in nc]), ("only now", [c for c in nc if c not in oc])):
            if xs:
                print(f"  columns {side}: {xs}")
        both = [k for k in old if k in new]
        for c in [c for c in oc if c in nc]:
            changed = appeared = vanished = 0
            worst, where = 0.0, ""
            for k in both:
                u, v = old[k][c], new[k][c]
                x, y = num(u), num(v)
                if x is None and y is None:
                    if u != v:
                        changed += 1
                        where = where or k
                    continue
                if x is None:
                    appeared += 1
                    continue
                if y is None:
                    vanished += 1
                    continue
                d = abs(x - y) / max(abs(x), abs(y), 1e-12)
                if d > 1e-9:
                    changed += 1
                    if d > worst:
                        worst, where = d, k
            if changed or appeared or vanished:
                out.append({"unit": unit, "column": c, "changed": changed, "appeared": appeared, "vanished": vanished,
                            "max_rel_change": f"{worst:.3g}", "at": where, "of": len(both)})
                print(f"  {c}: {changed} changed (max relative {worst:.3g} at {where}), "
                      f"{appeared} newly present, {vanished} now empty, of {len(both)}")
    if not out:
        print("\nno value changed")
    if a.out:
        with open(a.out, "w", encoding="utf-8", newline="") as f:
            w = csv.DictWriter(f, fieldnames=["unit", "column", "changed", "appeared", "vanished", "max_rel_change", "at", "of"],
                               lineterminator="\n")
            w.writeheader()
            w.writerows(out)
        print(f"wrote {a.out}")


if __name__ == "__main__":
    sys.exit(main())
