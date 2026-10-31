"""
Malaria Atlas Project incidence, year 2025, built by the atlas's own code path.

The atlas carries malaria_pv_per_1000 and malaria_pf_per_1000 for 2024 (source keys map_pv,
map_pf), made by add_map() in welfare/build_extended_layers.py from the MAP 202608 release.
That release also carries a 2025 time slice. This script:

  1. rebuilds the 2024 values by calling the builder's own functions (bw.carrier_cells,
     ext.add_map, bw.wavg + round(4) as in ext.aggregate) and requires zero differences from
     atlas/atlas_{district,tehsil,province}.csv and the gpkg layer atlas_grid_h3_r6;
  2. calls the same add_map() again with only the raster year changed (its sample_clean is
     wrapped so that map/{s}_incidence_rate_2024.tif resolves to the 2025 download);
  3. writes health-and-nutrition_{district,tehsil,province}_2025.csv and
     newer_waves_2025_checks.csv.

Raw files (WCS GetCoverage, same URL as welfare/sources_extended.tsv with time 2025-01-01) are
in sources/outcomes_by_category/health-and-nutrition/map/. A fresh 2024 download is kept there
too and must be byte-identical to the one the atlas was built from (MAP has not revised it).

Exits 1 on any FAIL. Does not modify the atlas, the builders or the gpkg.

Usage (from the repo root):
  ~/.venvs/gis312/Scripts/python pipeline/gis/outcomes_by_category/health-and-nutrition/build_newer_waves_2025.py
"""
import csv, hashlib, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parents[1]
sys.path.insert(0, str(GIS / "welfare"))
import build_welfare_layers as bw          # noqa: E402
import build_extended_layers as ext        # noqa: E402

RAW = GIS / "sources/outcomes_by_category/health-and-nutrition/map"
ATLAS = GIS / "atlas"
COLS = ["malaria_pv_per_1000", "malaria_pf_per_1000"]
NEW = {c: f"{c}_2025" for c in COLS}
CHECKS = []
WCS = ("https://data.malariaatlas.org/geoserver/ows?service=WCS&version=2.0.1&request=GetCoverage"
       "&format=image/geotiff&subset=Long(60.5,78.0)&subset=Lat(23.5,37.2)"
       "&coverageId=Malaria__202608_Global_{S}_Incidence_Rate&subset=time(%22{Y}-01-01T00:00:00.000Z%22)")


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference,
                   "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def sha(p):
    return hashlib.sha256(Path(p).read_bytes()).hexdigest()


def run_add_map(k, year):
    """ext.add_map unchanged; for 2025 only the incidence raster path is redirected."""
    orig = ext.sample_clean
    if year != 2024:
        def redirected(path, k_, lo=None, hi=None):
            p = Path(path)
            if p.name in ("pv_incidence_rate_2024.tif", "pf_incidence_rate_2024.tif"):
                path = RAW / p.name.replace("2024", str(year))
            return orig(path, k_, lo, hi)
        ext.sample_clean = redirected
    n0 = len(ext.CHECKS)
    try:
        ext.add_map(k)
    finally:
        ext.sample_clean = orig
    for c in ext.CHECKS[n0:]:
        check(f"[add_map {year}] {c['check']}", c["kind"], c["measured"], c["reference"], c["result"] == "pass",
              hard=c["result"] != "warn", note=c["note"])
    return k[COLS].copy()


def aggregate(k, by, cols):
    # The malaria part of ext.aggregate(): bw.wavg(...) then round(4).
    return bw.wavg(k, by, cols).round(4)


def diff_count(ours, ref, key):
    ref = ref.set_index(key)[COLS]
    ours = ours.reindex(ref.index)
    n = 0
    for c in COLS:
        a, b = ours[c].to_numpy(float), ref[c].to_numpy(float)
        both_nan = np.isnan(a) & np.isnan(b)
        n += int(np.sum(~both_nan & ~(np.abs(a - b) <= 1e-9)))
    return n


def main():
    print("raw files")
    for s in ["pv", "pf"]:
        a, b = sha(GIS / f"sources/map/{s}_incidence_rate_2024.tif"), sha(RAW / f"{s}_incidence_rate_2024.tif")
        check(f"{s} 2024 raster re-downloaded 30 Oct 2026 equals the one the atlas used", "integrity",
              b[:16], a[:16], a == b, note=WCS.format(S=s.capitalize(), Y=2024))
        c = sha(RAW / f"{s}_incidence_rate_2025.tif")
        check(f"{s} 2025 raster differs from 2024 (server honoured the time subset)", "integrity",
              c[:16], f"!= {b[:16]}", c != b, note=WCS.format(S=s.capitalize(), Y=2025))

    gpkg = bw.GPKG
    teh = gpd.read_file(gpkg, layer="admin_tehsil")
    k = bw.carrier_cells(teh)
    for c in bw.CHECKS:
        check(f"[carrier] {c['check']}", c["kind"], c["measured"], c["reference"], c["result"] != "FAIL")
    # add_map's walking-vs-motorized check needs this column; ext.main proves sample_fast == bw.sample.
    k["travel_health_min"] = ext.sample_fast(bw.SRC / "map/motorized_travel_time_to_healthcare_2020.tif", k.lon, k.lat)

    print("\n2024 rebuild")
    v24 = run_add_map(k, 2024)
    refs = {"district_code": pd.read_csv(ATLAS / "atlas_district.csv"),
            "tehsil_code": pd.read_csv(ATLAS / "atlas_tehsil.csv"),
            "province_code": pd.read_csv(ATLAS / "atlas_province.csv"),
            "h3_id": gpd.read_file(gpkg, layer="atlas_grid_h3_r6", ignore_geometry=True)}
    total = 0
    for by, ref in refs.items():
        n = diff_count(aggregate(k, by, COLS), ref, by)
        total += n
        where = "gpkg atlas_grid_h3_r6" if by == "h3_id" else f"atlas_{by.split('_')[0]}.csv"
        check(f"2024 rebuild vs {where}", "rebuild", f"{n} differing values of {2 * len(ref)}", "0", n == 0)

    print("\n2025 build")
    v25 = run_add_map(k, 2025)
    k25 = k.copy()
    k25[COLS] = v25.to_numpy()
    same_mask = (v24.isna() == v25.isna()).all().all()
    check("2025 no-data cells are the 2024 no-data cells", "integrity",
          "same" if same_mask else "differ", "same", bool(same_mask), hard=False)

    keys = {"district_code": ("district", refs["district_code"][["district_code", "district_name", "province_code"]]),
            "tehsil_code": ("tehsil", refs["tehsil_code"][["tehsil_code", "tehsil_name", "district_code", "province_code"]]),
            "province_code": ("province", refs["province_code"][["province_code", "province_name"]])}
    for by, (unit, kf) in keys.items():
        g = aggregate(k25, by, COLS).rename(columns=NEW)
        out = kf.merge(g.reset_index(), on=by, how="left")
        check(f"{unit} rows = atlas rows", "integrity", f"{len(out)}", f"{len(kf)}", len(out) == len(kf))
        g24 = refs[by].set_index(by)[COLS]
        for c in COLS:
            filled = (out[NEW[c]].notna() == out[by].map(g24[c]).notna()).all()
            check(f"{unit} {NEW[c]} filled exactly where the 2024 value is", "integrity",
                  f"{out[NEW[c]].notna().sum()} filled", f"{g24[c].notna().sum()} in 2024", filled)
            if unit != "province":
                x = pd.concat([out.set_index(by)[NEW[c]], g24[c]], axis=1).dropna()
                rho = x.rank().corr().iloc[0, 1]
                check(f"{unit} {c}: 2025 vs 2024 rank correlation", "convergent", f"rho = {rho:+.3f}, n = {len(x)}",
                      "rho >= 0.8", rho >= 0.8, hard=False)
        out.to_csv(HERE / f"health-and-nutrition_{unit}_2025.csv", index=False)
        print(f"  wrote health-and-nutrition_{unit}_2025.csv ({len(out)} rows)")

    pd.DataFrame(CHECKS).to_csv(HERE / "newer_waves_2025_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks, {len(fails)} FAIL; 2024 rebuild differences: {total}")
    if fails or total:
        sys.exit(1)


if __name__ == "__main__":
    main()
