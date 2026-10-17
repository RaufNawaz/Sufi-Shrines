"""
Distance to public health care, and facility density: government and private health facilities with
coordinates, compiled by Alhasan Systems from government sources (released CC0 on HDX, 2017
compilation; 25,704 points, 7,399 of them government), on the Kontur population carrier.

For each populated ~0.7 km2 cell: the straight-line distance to the nearest government primary
facility (Basic Health Unit, Rural Health Centre, sub-health centre, MCH centre, family welfare or
urban health centre) and to the nearest tehsil or district headquarters hospital. Units get the
population-weighted mean distance, the share of residents within 5 km of primary care and within
25 km of a headquarters hospital, and facilities per 100,000 residents.

How complete it is, measured: the Pakistan Economic Survey 2017-18 (Health chapter) counts 5,508
BHUs and 676 RHCs in 2017; this file has 4,023 BHUs (73%) and 567 RHCs (84%). Distances are
therefore an upper bound where a facility is missing, and that is in every definition. The
distance to primary care is checked against the Malaria Atlas Project's modelled motorized travel
time to care, an independent measure of the same access.

Usage (from the repo root, after build_welfare_layers.py):
  python pipeline/gis/welfare/build_health_facilities.py
"""
import csv, sys, zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import h3
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_welfare_layers as bw          # noqa: E402

HERE, GPKG = bw.HERE, bw.GPKG
SRC = bw.SRC / "health_facilities"
CHECKS = []
PRIMARY = {"BHU", "RHC", "SHC", "MCH", "FWC", "UHC"}
HQ = {"THQ", "DHQ", "AHQ"}
NOT_HUMAN_CARE = {"VETERINARY", "OPTICS", "MEDICAL STORES"}
# Pakistan Economic Survey 2017-18, ch. 11 Health, read 17 Oct 2026: "By the year 2017, the number of
# public sector hospitals has increased to 1,211, 5,508 basic health units (BHUs), 676 rural health
# centers (RHCs) and 5,697 dispensaries."
ES_2017 = {"BHU": 5508, "RHC": 676}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def main():
    shp = SRC / "x/Pakistan_Health_Facilities.shp"
    if not shp.exists():
        sys.exit(f"{shp} missing: run welfare/fetch_extended_sources.py (it unpacks the HDX .rar with tar)")
    f = gpd.read_file(shp).to_crs(4326)
    f["gov"] = f.Gov_Pvt.astype(str).str.upper().str.startswith("GOV")
    prim = f[f.gov & f.Sub_Cat.isin(PRIMARY)]
    hq = f[f.gov & f.Sub_Cat.isin(HQ)]
    priv = f[~f.gov & ~f.Category.isin(NOT_HUMAN_CARE)]
    print(f"facilities: {len(f)}; government primary {len(prim)}, headquarters hospitals {len(hq)}, private {len(priv)}")
    for sub, ref in ES_2017.items():
        n = int((f.gov & (f.Sub_Cat == sub)).sum())
        check(f"{sub}s in the file vs Pakistan Economic Survey 2017-18", "external", f"{n:,} ({n / ref:.0%})",
              f"{ref:,} in 2017", n / ref >= 0.9, hard=False,
              note="The file is incomplete; distances are an upper bound where a facility is missing")

    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    k = bw.carrier_cells(teh)
    xy = gpd.GeoSeries(gpd.points_from_xy(k.lon, k.lat), crs=4326).to_crs(bw.PK_LAEA)
    kxy = np.c_[xy.x, xy.y]
    for name, pts in [("primary", prim), ("hq", hq)]:
        p = pts.geometry.to_crs(bw.PK_LAEA)
        d, _ = cKDTree(np.c_[p.x, p.y]).query(kxy, k=1)
        k[f"km_{name}"] = d / 1000
    k["near_primary"] = (k.km_primary <= 5).astype(float)
    k["near_hq"] = (k.km_hq <= 25).astype(float)

    # Facilities placed in units.
    pts = gpd.sjoin(f[["Sub_Cat", "Category", "gov", "geometry"]], teh[["tehsil_code", "district_code", "province_code",
                                                                         "geometry"]], how="inner", predicate="within")
    pts["h3_id"] = [h3.latlng_to_cell(g.y, g.x, 6) for g in pts.geometry]
    inside = len(pts) / len(f)
    check("facilities placed inside the boundary file", "integrity", f"{inside:.1%}", ">= 97%", inside >= 0.97)
    pts["prim"] = pts.gov & pts.Sub_Cat.isin(PRIMARY)
    pts["hq"] = pts.gov & pts.Sub_Cat.isin(HQ)
    pts["priv"] = ~pts.gov & ~pts.Category.isin(NOT_HUMAN_CARE)

    out = {}
    for by, unit in [("h3_id", "grid"), ("tehsil_code", "tehsil"), ("district_code", "district"), ("province_code", "province")]:
        g = bw.wavg(k, by, ["km_primary", "km_hq", "near_primary", "near_hq"])
        g.columns = ["km_to_gov_primary_popw", "km_to_hq_hospital_popw", "share_pop_within_5km_gov_primary",
                     "share_pop_within_25km_hq_hospital"]
        g[["share_pop_within_5km_gov_primary", "share_pop_within_25km_hq_hospital"]] *= 100
        pop = k.groupby(by)["pop"].sum()
        c = pts.groupby(by)[["prim", "hq", "priv"]].sum().reindex(g.index).fillna(0)
        g["gov_primary_per_100k"] = 1e5 * c.prim / pop
        g["private_facilities_per_100k"] = 1e5 * c.priv / pop
        out[unit] = g.round(3)

    w1 = gpd.read_file(GPKG, layer="welfare_district", ignore_geometry=True).set_index("district_code")
    x = out["district"].join(w1[["travel_health_min_popw"]], how="inner").dropna()
    rho = x.km_to_gov_primary_popw.rank().corr(x.travel_health_min_popw.rank())
    check("distance to government primary care vs MAP motorized travel time to care, districts", "convergent",
          f"rho = {rho:+.2f}, n = {len(x)}", "sign +, rho >= 0.5", rho >= 0.5)
    nat = np.average(k.km_primary, weights=k["pop"])
    print(f"  population-weighted national distance to government primary care: {nat:.1f} km")

    keys = {"grid": gpd.read_file(GPKG, layer="grid_h3_r6")[["h3_id", "geometry"]],
            "tehsil": teh[["tehsil_code", "tehsil_name", "geometry"]],
            "district": gpd.read_file(GPKG, layer="admin_district")[["district_code", "district_name", "geometry"]],
            "province": gpd.read_file(GPKG, layer="admin_province")[["province_code", "province_name", "geometry"]]}
    by = {"grid": "h3_id", "tehsil": "tehsil_code", "district": "district_code", "province": "province_code"}
    for unit, g in out.items():
        df = keys[unit].merge(g.reset_index(), on=by[unit], how="inner")
        gpd.GeoDataFrame(df, geometry="geometry", crs=4326).to_file(GPKG, layer=f"welfare_health_{unit}", driver="GPKG")
        if unit != "grid":
            df.drop(columns="geometry").to_csv(HERE / f"welfare_health_{unit}.csv", index=False)
    caveat = " The 2017 compilation holds ~73% of BHUs and ~84% of RHCs, so this is an upper bound where one is missing."
    defs = {
        "km_to_gov_primary_popw": "Straight-line distance to the nearest government primary facility (BHU, RHC, SHC, MCH, FWC, UHC), km, population-weighted." + caveat,
        "km_to_hq_hospital_popw": "Straight-line distance to the nearest tehsil or district headquarters hospital, km, population-weighted.",
        "share_pop_within_5km_gov_primary": "Residents within 5 km (straight line) of a government primary facility, %." + caveat,
        "share_pop_within_25km_hq_hospital": "Residents within 25 km of a tehsil or district headquarters hospital, %.",
        "gov_primary_per_100k": "Government primary facilities per 100,000 residents (Kontur 2023)." + caveat,
        "private_facilities_per_100k": "Private clinics, hospitals, laboratories and practitioners per 100,000 residents, as compiled in 2017 (completeness unmeasured).",
    }
    pd.DataFrame([{"indicator": i, "definition": v, "source_key": "health_facilities",
                   "publisher": "Alhasan Systems (government facility lists, 2017 compilation), via HDX", "licence": "CC0"}
                  for i, v in defs.items()]).to_csv(HERE / "welfare_health_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks_health.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
