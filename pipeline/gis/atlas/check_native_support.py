"""
Check pipeline/gis/atlas/native_support.tsv: where each source's values were actually measured.

The table has one row per source_key in atlas_codebook.csv. It says the native unit (district,
division, DHS region, 5 km surface, points...), how many such units exist where a file says so, the
kind of value (measured, modelled, raster, points), whether the unit is coarser than a district, and
the evidence: path:line "verbatim quote", joined by " | " when there are several. RULE 2: a level that
no file in this repository states stays blank, and the research viewer then says nothing about it.

This exits non-zero when:
  - a source_key shown in the viewer (in_viewer True) has no row, or more than one;
  - a row has no evidence, or a quote is no longer in the file it cites (a line that has only moved
    is reported, not failed, with its new line number);
  - kind or coarser_than_district is not one of the allowed values, or n_units is not a whole number.

Python standard library only. Usage, from the repo root:
  python pipeline/gis/atlas/check_native_support.py
"""
import csv, re, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
ATLAS = ROOT / "pipeline/gis/atlas"
KINDS = {"", "measured", "modelled", "raster", "points"}
EVIDENCE_RE = re.compile(r'([^\s|"]+):(\d+) "([^"]+)"')


def load(path=ATLAS / "native_support.tsv"):
    with open(path, encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f, delimiter="\t", quoting=csv.QUOTE_NONE))


def main():
    rows = load()
    with open(ATLAS / "atlas_codebook.csv", encoding="utf-8", newline="") as f:
        cb = list(csv.DictReader(f))
    bad, moved, cache = [], [], {}
    keys = [r["source_key"] for r in rows]
    for k in sorted({r["source_key"] for r in cb if r["in_viewer"] == "True"}):
        if keys.count(k) != 1:
            bad.append(f"{k}: shown in the viewer, {keys.count(k)} rows in native_support.tsv")
    for r in rows:
        k = r["source_key"]
        if r["kind"] not in KINDS:
            bad.append(f"{k}: kind {r['kind']!r} not in {sorted(KINDS)}")
        if r["coarser_than_district"] not in ("", "0", "1"):
            bad.append(f"{k}: coarser_than_district {r['coarser_than_district']!r}")
        if r["n_units"] and not r["n_units"].isdigit():
            bad.append(f"{k}: n_units {r['n_units']!r}")
        ev = EVIDENCE_RE.findall(r["evidence"])
        if not ev:
            if r["support"]:
                bad.append(f"{k}: a support level with no evidence")
            continue
        for p, n, q in ev:
            if p not in cache:
                f = ROOT / p
                cache[p] = f.read_text(encoding="utf-8").splitlines() if f.exists() else None
            lines = cache[p]
            if lines is None:
                bad.append(f"{k}: {p} does not exist")
            elif not (0 < int(n) <= len(lines) and q in lines[int(n) - 1]):
                at = [i + 1 for i, l in enumerate(lines) if q in l]
                (moved if at else bad).append(f"{k}: {p}:{n} " + (f"now at line {at[0]}" if at else f"no longer says {q!r}"))
    for m in moved:
        print("moved:", m)
    if bad:
        sys.exit("native_support.tsv:\n  " + "\n  ".join(bad))
    print(f"native_support.tsv: {len(rows)} sources, {sum(bool(r['support']) for r in rows)} with a stated level, "
          f"{sum(r['coarser_than_district'] == '1' for r in rows)} coarser than a district; every quote found")


if __name__ == "__main__":
    main()
