"""
The 2024 wave of two indicators the atlas holds for 2023, built by the atlas's own code path.

  Night lights   ntl_2024_popw, ntl_change_13_24, share_pop_lit_at_night_2024
                 Li, Zhou, Zhao and Zhao (2020) harmonized DMSP/VIIRS, figshare 9828827 v10,
                 file 57065306 (Harmonized_DN_NTL_2024_simVIIRS.tif)
  Kummu GDP pc   gdp_pc_2024_popw, gdp_pc_growth_13_24
                 Kummu et al. (2025), Zenodo 18429133, the "2024" column of the 1990-2024 file the
                 atlas already reads

Method (RULE 4): the wave-one and wave-two welfare builders are imported, not copied, and run on
the same Kontur carrier. FIRST the 2023 values are rebuilt through them and compared with
pipeline/gis/atlas/atlas_{district,tehsil,province}.csv; any difference exits 1 before anything
2024 is written. Only then is the 2024 input swapped in, through the same functions.

  ntl:  bw.add_sources() then bw.aggregate() exactly as build_welfare_layers.py does; for 2024 the
        cell column ntl_2023 is resampled from the 2024 raster (bw.sample) and lit_2023 recomputed
        with the builder's own rule (DN > 0), then bw.aggregate() again, and the columns renamed.
  gdp:  ext.add_gdp() then ext.aggregate() as build_extended_layers.py does; for 2024 the same
        point-in-division join reads the "2024" column (held equal to ext.add_gdp on 2023, cell by
        cell), aggregated with bw.wavg. Growth 2013-2024 is the same compound annual rate over 11
        years instead of 10.

Writes, beside this script: wealth-and-poverty_{district,tehsil,province}_2024.csv and
newer_waves_2024_checks.csv. Changes nothing else.

Usage (from the repo root):
  python pipeline/gis/outcomes_by_category/wealth-and-poverty/build_newer_waves_2024.py
"""
import csv, hashlib, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import rasterio

HERE = Path(__file__).resolve().parent
GIS = HERE.parents[1]
sys.path.insert(0, str(GIS / "welfare"))
import build_welfare_layers as bw        # noqa: E402
import build_extended_layers as ext      # noqa: E402

ATLAS = GIS / "atlas"
NTL_2024 = GIS / "sources/outcomes_by_category/wealth-and-poverty/Harmonized_DN_NTL_2024_simVIIRS.tif"
NTL_2024_MD5 = "47fa4a4b4ec7eac15f6bfc046186a595"      # figshare API computed_md5 for file 57065306
UNITS = [("district", "district_code"), ("tehsil", "tehsil_code"), ("province", "province_code")]
OLD = ["ntl_2023_popw", "ntl_2013_popw", "share_pop_lit_at_night", "ntl_change_13_23",
       "gdp_pc_2023_popw", "gdp_pc_growth_13_23"]
NEW = ["ntl_2024_popw", "ntl_change_13_24", "share_pop_lit_at_night_2024",
       "gdp_pc_2024_popw", "gdp_pc_growth_13_24"]
CHECKS = []


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference,
                   "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def finish():
    pd.DataFrame(CHECKS).to_csv(HERE / "newer_waves_2024_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {len(CHECKS) - len(fails)} pass/warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


def gdp_join(k, year):
    """ext.add_gdp's point-in-division join, for any year column of the same file."""
    g = gpd.read_file(bw.SRC / "kummu/polyg_adm2_gdp_perCapita_1990_2024.gpkg", where="iso3='PAK'")
    pts = gpd.GeoDataFrame(geometry=gpd.points_from_xy(k.lon, k.lat), crs=4326)
    j = gpd.sjoin(pts, g[["NAME_2", str(year), "geometry"]].to_crs(4326), how="left", predicate="within")
    j = j[~j.index.duplicated()]
    return pd.to_numeric(j[str(year)], errors="coerce").to_numpy()


def zero_counts(k):
    """ext.aggregate expects the conflict and Ookla counts; this wave uses none of them."""
    names = ["conflict_events", "conflict_deaths", "conflict_civilian_deaths", "conflict_onesided_deaths"] + \
        [f"{t}_{w}{suf}" for _, suf in ext.OOKLA for t in ["mobile", "fixed"] for w in ["tests", "devices"]]
    out = {}
    for by in ext.UNITS:
        idx = k[by].dropna().unique()
        for n in names:
            out[(by, n)] = pd.Series(0.0, index=idx)
    return out


def ndiff(a, b):
    a, b = np.asarray(a, float), np.asarray(b, float)
    same = (np.isnan(a) & np.isnan(b)) | (np.abs(a - b) <= 1e-9)
    return int((~same).sum())


def main():
    print("integrity")
    md5 = hashlib.md5(NTL_2024.read_bytes()).hexdigest()
    check("NTL 2024 raster MD5 vs figshare's published hash", "integrity", md5, NTL_2024_MD5, md5 == NTL_2024_MD5)
    with rasterio.open(bw.SRC / "ntl/Harmonized_DN_NTL_2023_simVIIRS.tif") as a, rasterio.open(NTL_2024) as b:
        same_grid = a.crs == b.crs and a.transform == b.transform and a.shape == b.shape and a.nodata == b.nodata
        check("NTL 2024 raster on the same grid as 2023 (CRS, transform, shape, nodata)", "integrity",
              "identical" if same_grid else f"{b.crs} {b.transform} {b.shape} {b.nodata}", "identical", same_grid)

    teh = gpd.read_file(bw.GPKG, layer="admin_tehsil")
    census_d = gpd.read_file(bw.GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    k = bw.add_sources(bw.carrier_cells(teh), census_d)
    ext.add_gdp(k)

    # ---------------------------------------------------------------- 2023 rebuild against the atlas
    print("2023 rebuild through the builders' own code")
    counts = zero_counts(k)
    rebuilt = {}
    for unit, by in UNITS:
        w1 = bw.aggregate(k, by)
        # walk_health_min is a column ext.aggregate always computes from; this wave does not use it.
        w2 = ext.aggregate(k.assign(walk_health_min=np.nan), by, counts)
        rebuilt[unit] = w1[OLD[:4]].join(w2[OLD[4:]], how="outer")
    total = 0
    for unit, by in UNITS:
        at = pd.read_csv(ATLAS / f"atlas_{unit}.csv", dtype={by: str}).set_index(by)
        r = rebuilt[unit].reindex(at.index)
        for c in OLD:
            n = ndiff(r[c], at[c])
            total += n
            check(f"2023 rebuild = atlas, {unit} {c}", "rebuild", f"{n} of {len(at)} differ", "0", n == 0)
    check("2023 rebuild = atlas, all units and columns", "rebuild", f"{total} differences", "0", total == 0)
    if total:
        print("rebuild does not reproduce the atlas; nothing 2024 is built")
        finish()

    # ---------------------------------------------------------------- 2024
    print("2024 inputs through the same code")
    k24 = k.copy()
    k24["ntl_2023"] = bw.sample(NTL_2024, k24.lon, k24.lat)
    cov = k24.loc[k24.ntl_2023.notna(), "pop"].sum() / k24["pop"].sum()
    check("ntl_2024 sampled for populated cells", "integrity", f"{cov:.2%} of people", ">= 99%", cov >= 0.99)
    k24["lit_2023"] = (k24.ntl_2023 > 0).astype(float)

    g23 = gdp_join(k, 2023)
    same = ndiff(g23, k.gdp_pc_2023.to_numpy())
    check("gdp_join(2023) equals ext.add_gdp cell by cell", "integrity", f"{same} cells differ", "0", same == 0)
    k24["gdp_pc_2024"] = gdp_join(k, 2024)
    cov = ext.coverage(k24, "gdp_pc_2024")
    check("GDP per capita 2024 found for populated cells", "integrity", f"{cov:.2%} of people", ">= 97%", cov >= 0.97)
    nat = pd.read_csv(bw.SRC / "kummu/tabulated_adm0_gdp_perCapita.csv")
    nat = float(nat[nat.iso3 == "PAK"].iloc[0]["2024"])
    ours = np.nansum(k24.gdp_pc_2024 * k24["pop"]) / k24.loc[k24.gdp_pc_2024.notna(), "pop"].sum()
    check("GDP per capita 2024, population-weighted national mean vs Kummu's national figure", "external",
          f"{ours:,.0f}", f"{nat:,.0f} (tabulated_adm0)", abs(ours / nat - 1) < 0.15,
          note="same tolerance as the 2023 check in build_extended_layers.py")

    out = {}
    for unit, by in UNITS:
        w1 = bw.aggregate(k24, by).rename(columns={"ntl_2023_popw": "ntl_2024_popw",
                                                   "ntl_change_13_23": "ntl_change_13_24",
                                                   "share_pop_lit_at_night": "share_pop_lit_at_night_2024"})
        g = bw.wavg(k24, by, ["gdp_pc_2024", "gdp_pc_2013"])
        g["gdp_pc_growth_13_24"] = 100 * ((g.gdp_pc_2024 / g.gdp_pc_2013) ** (1 / 11) - 1)
        g = g.rename(columns={"gdp_pc_2024": "gdp_pc_2024_popw"}).round(4)
        out[unit] = w1[["ntl_2024_popw", "ntl_change_13_24", "share_pop_lit_at_night_2024"]].join(
            g[["gdp_pc_2024_popw", "gdp_pc_growth_13_24"]], how="outer")

    d = out["district"].join(rebuilt["district"], how="inner").join(census_d[["electricity", "urban_share"]], how="left")
    for a, b, lo in [("ntl_2024_popw", "ntl_2023_popw", 0.9), ("share_pop_lit_at_night_2024", "share_pop_lit_at_night", 0.9),
                     ("gdp_pc_2024_popw", "gdp_pc_2023_popw", 0.9), ("ntl_2024_popw", "electricity", 0.4),
                     ("ntl_2024_popw", "urban_share", 0.4)]:
        rho, n = ext.spearman(d[a], d[b])
        check(f"{a} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {n}", f"rho >= {lo}", rho >= lo)
    for unit, _ in UNITS:
        o = out[unit]
        n = int((~o.share_pop_lit_at_night_2024.dropna().between(0, 100)).sum())
        check(f"share lit 2024 within 0-100, {unit}", "integrity", f"{n} outside", "0", n == 0)
        n = int((~o.ntl_2024_popw.dropna().between(0, 63)).sum())
        check(f"ntl_2024_popw within DN 0-63, {unit}", "integrity", f"{n} outside", "0", n == 0)

    for unit, by in UNITS:
        at = pd.read_csv(ATLAS / f"atlas_{unit}.csv", dtype={by: str})
        keys = [c for c in at.columns if c in ("tehsil_code", "tehsil_name", "district_code", "district_name",
                                                 "province_code", "province_name")]
        if unit == "district":
            keys = ["district_code", "district_name", "province_code"]
        f = at[keys].merge(out[unit][NEW].reset_index(), on=by, how="left")
        check(f"{unit} file rows = atlas rows", "integrity", f"{len(f)}", f"{len(at)}", len(f) == len(at))
        f.to_csv(HERE / f"wealth-and-poverty_{unit}_2024.csv", index=False)
    finish()


if __name__ == "__main__":
    main()
