"""Split one atlas theme out into its own dataset (stdlib only).

Reads pipeline/gis/atlas/{indicator_catalog.tsv, atlas_codebook.csv,
atlas_district.csv, atlas_tehsil.csv, atlas_province.csv} and this folder's
currency.tsv (the hand-written source-currency audit), and writes, beside this
script:

  <slug>_district.csv / _tehsil.csv / _province.csv  id + name columns + the
      theme's indicators, cell text copied verbatim from the atlas; a unit file
      is written only if the theme has at least one column at that unit
  <slug>_codebook.csv  the atlas codebook rows for those indicators, plus
      source_group, latest_available_wave, latest_available_url, up_to_date,
      currency_note (from currency.tsv)

The theme is chosen by the folder name (THEMES below), so the same file serves
every category folder. Exits non-zero (RULE 4) if any catalog indicator of the
theme is absent from the atlas codebook or from every atlas unit file, if any
indicator has no currency row, if an up_to_date=no row has no URL, if an output
row count differs from the atlas, or if any written value differs from the
atlas when read back.

    python build.py
"""
import csv
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parents[1] / "atlas"
SLUG = HERE.name
THEMES = {"health-and-nutrition": "Health and nutrition",
          "fertility-and-family": "Fertility and family"}
UNITS = {"district": ["district_code", "district_name", "province_code"],
         "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
         "province": ["province_code", "province_name"]}


def source_group(source_key):
    """Map an atlas codebook source_key to a row of currency.tsv."""
    if source_key in ("dhs_quickstats", "dhs_ms"):
        return source_key
    if source_key in ("map_pf", "map_pv"):
        return "map"
    if source_key.startswith("Table D"):
        return "nns_2018"
    if source_key.startswith("Table"):          # Table 4, Table 16, Tables 1, 22
        return "census_2023"
    if source_key.startswith("MICS"):
        return "mics6"
    if source_key == "PSLM 2019-20 microdata":
        return "pslm_2019_20"
    if source_key == "PSLM 2014-15 microdata":
        return "pslm_2014_15"
    return None


def read(path, delim=","):
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.DictReader(f, delimiter=delim)
        return r.fieldnames, list(r)


def main():
    fails = []
    theme = THEMES[SLUG]
    _, cat = read(ATLAS / "indicator_catalog.tsv", "\t")
    keys = [r["key"] for r in cat if r["theme"] == theme]
    if not keys:
        sys.exit(f"FAIL: no catalog indicators for theme {theme!r}")
    cb_cols, cb = read(ATLAS / "atlas_codebook.csv")
    cb = {r["indicator"]: r for r in cb}
    _, cur = read(HERE / "currency.tsv", "\t")
    cur = {r["source_group"]: r for r in cur}

    for k in keys:
        if k not in cb:
            fails.append(f"{k}: in catalog, missing from atlas_codebook.csv")

    found = set()
    counts = {}
    for unit, ids in UNITS.items():
        cols, rows = read(ATLAS / f"atlas_{unit}.csv")
        have = [k for k in keys if k in cols]
        if not have:
            continue
        found.update(have)
        out_cols = ids + have
        out = HERE / f"{SLUG}_{unit}.csv"
        with open(out, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(out_cols)
            for r in rows:
                w.writerow([r[c] for c in out_cols])
        # read back and compare cell by cell
        bcols, back = read(out)
        if len(back) != len(rows):
            fails.append(f"{unit}: {len(back)} rows written, atlas has {len(rows)}")
        diff = sum(1 for a, b in zip(rows, back) for c in out_cols if a[c] != b[c])
        if diff or bcols != out_cols:
            fails.append(f"{unit}: {diff} cells differ from the atlas on read-back")
        counts[unit] = (len(back), len(have),
                        sum(1 for r in back for c in have if r[c] != ""))

    for k in keys:
        if k not in found:
            fails.append(f"{k}: in catalog, in no atlas unit file")

    extra = ["source_group", "latest_available_wave", "latest_available_url",
             "up_to_date", "currency_note"]
    with open(HERE / f"{SLUG}_codebook.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(cb_cols + extra)
        for k in keys:
            if k not in cb:
                continue
            g = source_group(cb[k]["source_key"])
            c = cur.get(g)
            if c is None:
                fails.append(f"{k}: source_key {cb[k]['source_key']!r} has no currency.tsv row")
                c = {"newest_available": "", "latest_available_url": "",
                     "up_to_date": "unknown", "currency_note": "NO AUDIT ROW"}
            if c["up_to_date"] not in ("yes", "no", "unknown"):
                fails.append(f"{g}: up_to_date must be yes/no/unknown")
            if c["up_to_date"] == "no" and not c["latest_available_url"].startswith("http"):
                fails.append(f"{g}: up_to_date=no without a URL")
            w.writerow([cb[k][x] for x in cb_cols] +
                       [g or "", c["newest_available"], c["latest_available_url"],
                        c["up_to_date"], c["currency_note"]])

    for unit, (n, ni, nv) in counts.items():
        print(f"{SLUG}_{unit}.csv: {n} rows, {ni} indicators, {nv} non-empty values")
    print(f"{SLUG}_codebook.csv: {len(keys)} indicators")
    if fails:
        for x in fails:
            print("FAIL:", x)
        sys.exit(1)
    print("all checks pass")


if __name__ == "__main__":
    main()
