"""
A newer Ookla quarter, aggregated to districts by the atlas's own code path, kept apart from the atlas.

It imports welfare/build_extended_layers.py and calls its own ookla() and aggregate() on the same Kontur
population carrier (build_welfare_layers.carrier_cells), changing nothing but the quarter file read. Before
building any new quarter it rebuilds Q2 2025 from welfare's own source files and requires every district value
of the five Ookla indicators to equal the atlas exactly; if that reproduction fails, nothing is written and it
exits non-zero (RULE 4). It also requires the new file to cover exactly the atlas's districts.

Writes access-and-connectivity_district_<YYYY>Q<q>.csv (district_code, district_name, province_code + the five
Ookla columns, under the atlas's column names). It does NOT touch the atlas, the viewer or welfare outputs:
the module's CHECKS list is read here, never written to welfare/checks_extended.csv.

Raw files: pipeline/gis/sources/outcomes_by_category/access-and-connectivity/ookla/<quarter>_performance_
{mobile,fixed}_tiles.parquet, from
  https://ookla-open-data.s3.amazonaws.com/parquet/performance/type={mobile,fixed}/year=<YYYY>/quarter=<q>/<quarter>_performance_{mobile,fixed}_tiles.parquet

Usage (from the repo root, GIS venv):
  ~/.venvs/gis312/Scripts/python pipeline/gis/outcomes_by_category/access-and-connectivity/build_ookla_wave.py 2026-04-01 [2026-07-01 ...]
"""
import csv, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent.parent
sys.path.insert(0, str(GIS / "welfare"))
import build_welfare_layers as bw      # noqa: E402
import build_extended_layers as be     # noqa: E402

NEW_SRC = GIS / "sources" / "outcomes_by_category" / "access-and-connectivity"
COLS = ["mobile_download_mbps", "fixed_download_mbps", "mobile_devices_per_1000", "fixed_devices_per_1000",
        "share_pop_near_mobile_test"]
IDS = ["district_code", "district_name", "province_code"]


def build(k, teh, src, quarter):
    """Exactly the Ookla part of build_extended_layers.main(), for one quarter, at district level."""
    be.SRC = src
    be.OOKLA = [(quarter, "")]
    k = k.copy()
    counts = be.ookla(k, teh)
    # aggregate() also expects the other wave-two inputs; give it empty ones so it runs its own Ookla code
    # unchanged. They are dropped below and never written.
    k["walk_health_min"] = np.nan
    for c in ["conflict_events", "conflict_deaths", "conflict_civilian_deaths", "conflict_onesided_deaths"]:
        counts[("district_code", c)] = pd.Series(dtype=float)
    return be.aggregate(k, "district_code", counts)[COLS]


def fmt(v):
    """The atlas's own string for a value (pandas to_csv of a float rounded to 4 places)."""
    return "" if pd.isna(v) else repr(float(v))


def main(quarters):
    with open(GIS / "atlas" / "atlas_district.csv", encoding="utf-8-sig", newline="") as f:
        atlas = list(csv.DictReader(f))
    teh = gpd.read_file(be.GPKG, layer="admin_tehsil")
    k = bw.carrier_cells(teh)

    print("reproducing Q2 2025 from welfare's own files")
    ref = build(k, teh, bw.SRC, "2025-04-01")
    diff = [(r["district_code"], c, r[c], fmt(ref[c].get(r["district_code"], np.nan)))
            for r in atlas for c in COLS if r[c] != fmt(ref[c].get(r["district_code"], np.nan))]
    print(f"  [{'pass' if not diff else 'FAIL'}] Q2 2025 rebuilt equals the atlas, {len(atlas)} districts x {len(COLS)}: "
          f"{len(diff)} differ {diff[:5]}")
    if diff:
        sys.exit(1)

    codes = [r["district_code"] for r in atlas]
    for q in quarters:
        print(f"building {q}")
        for kind in ["mobile", "fixed"]:
            p = NEW_SRC / f"ookla/{q}_performance_{kind}_tiles.parquet"
            if not p.exists():
                sys.exit(f"  missing {p}")
        g = build(k, teh, NEW_SRC, q)
        fails = [c for c in be.CHECKS if c["result"] == "FAIL"]
        ok_cover = set(g.index.dropna()) <= set(codes)
        print(f"  [{'pass' if not fails else 'FAIL'}] build_extended_layers' own Ookla checks")
        print(f"  [{'pass' if ok_cover else 'FAIL'}] every district in the output is an atlas district")
        if fails or not ok_cover:
            sys.exit(1)
        y, m = q[:4], int(q[5:7])
        out = HERE / f"access-and-connectivity_district_{y}Q{(m - 1) // 3 + 1}.csv"
        with open(out, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(IDS + COLS)
            for r in atlas:
                w.writerow([r[c] for c in IDS] + [fmt(g[c].get(r["district_code"], np.nan)) for c in COLS])
        with open(out, encoding="utf-8", newline="") as f:
            back = list(csv.DictReader(f))
        ok = [b["district_code"] for b in back] == codes
        print(f"  [{'pass' if ok else 'FAIL'}] {out.name}: {len(back)} rows, same districts in the atlas's order")
        if not ok:
            sys.exit(1)


if __name__ == "__main__":
    main(sys.argv[1:] or ["2026-04-01"])
