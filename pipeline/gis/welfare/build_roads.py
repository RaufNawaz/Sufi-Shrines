"""
Road density where people live, from the Global Roads Inventory Project v4 (Meijer et al. 2018,
Environmental Research Letters; PBL Netherlands; 5 arc-minute rasters of metres of road per km2).

Each populated Kontur cell takes the density of the ~9 km GRIP cell it falls in; units get the
population-weighted density for all roads and for main roads (GRIP types 1-3: highways, primary,
secondary), so a district's figure is the road network around its average resident. GRIP compiles
national and OpenStreetMap road data as of about 2018; where both are thin, so is GRIP.

Checked: density for populated cells found almost everywhere; main-road density not above total
density anywhere; and main-road density against two independent access measures, travel time to a
city (MAP) and HeiGIT's Rural Access Index. All-road density fails the same test (local roads follow
mapping effort), which is recorded and stated in its definition.

Usage (from the repo root, after build_welfare_layers.py):
  python pipeline/gis/welfare/build_roads.py
"""
import csv, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_welfare_layers as bw          # noqa: E402
from build_extended_layers import sample_fast   # noqa: E402  the sampler checked against rasterio's

HERE, GPKG = bw.HERE, bw.GPKG
SRC = bw.SRC / "grip4"
CHECKS = []


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def main():
    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    k = bw.carrier_cells(teh)
    print("GRIP4 road density")
    k["road_total"] = sample_fast(SRC / "total/grip4_total_dens_m_km2.asc", k.lon, k.lat)
    main_ = None
    for t in (1, 2, 3):
        v = np.nan_to_num(sample_fast(SRC / f"tp{t}/grip4_tp{t}_dens_m_km2.asc", k.lon, k.lat))
        main_ = v if main_ is None else main_ + v
    k["road_main"] = np.where(np.isfinite(k.road_total), main_, np.nan)
    cov = k.loc[k.road_total.notna(), "pop"].sum() / k["pop"].sum()
    check("GRIP4 density found for populated cells", "integrity", f"{cov:.2%} of people", ">= 99%", cov >= 0.99)
    over = int((k.road_main > k.road_total + 1).sum())
    check("main-road density never above total density", "integrity", f"{over} cells", "none", over == 0)

    out = {}
    for by, unit in [("h3_id", "grid"), ("tehsil_code", "tehsil"), ("district_code", "district"), ("province_code", "province")]:
        g = bw.wavg(k, by, ["road_total", "road_main"])
        g.columns = ["road_density_popw", "main_road_density_popw"]
        out[unit] = g.round(1)

    w1 = gpd.read_file(GPKG, layer="welfare_district", ignore_geometry=True).set_index("district_code")
    x = out["district"].join(w1[["travel_city_min_popw", "rural_access_index"]], how="inner")
    # First run, 17 Oct 2026: all-road density tracked travel time and the RAI only weakly (rho -0.32,
    # +0.33), main roads strongly (-0.66, +0.51). Local-road coverage in OSM-derived data follows mapping
    # effort, as OSM's schools do. Main roads are the access measure and are held to the threshold set
    # before that run; all roads are kept, caveated, with their result recorded as a warning.
    for col, b, sign, hard in [("main_road_density_popw", "travel_city_min_popw", -1, True),
                               ("main_road_density_popw", "rural_access_index", +1, True),
                               ("road_density_popw", "travel_city_min_popw", -1, False),
                               ("road_density_popw", "rural_access_index", +1, False)]:
        y = x[[col, b]].dropna()
        rho = y[col].rank().corr(y[b].rank())
        check(f"{col} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {len(y)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(rho) == sign and abs(rho) >= 0.4, hard=hard,
              note="" if hard else "All-road density follows mapping effort; read main roads for access")

    keys = {"grid": gpd.read_file(GPKG, layer="grid_h3_r6")[["h3_id", "geometry"]],
            "tehsil": teh[["tehsil_code", "tehsil_name", "geometry"]],
            "district": gpd.read_file(GPKG, layer="admin_district")[["district_code", "district_name", "geometry"]],
            "province": gpd.read_file(GPKG, layer="admin_province")[["province_code", "province_name", "geometry"]]}
    by = {"grid": "h3_id", "tehsil": "tehsil_code", "district": "district_code", "province": "province_code"}
    for unit, g in out.items():
        df = keys[unit].merge(g.reset_index(), on=by[unit], how="inner")
        gpd.GeoDataFrame(df, geometry="geometry", crs=4326).to_file(GPKG, layer=f"welfare_roads_{unit}", driver="GPKG")
        if unit != "grid":
            df.drop(columns="geometry").to_csv(HERE / f"welfare_roads_{unit}.csv", index=False)
    pd.DataFrame([
        {"indicator": "road_density_popw", "definition": "Road density around residents, metres of road per km2, all road types "
         "(GRIP4, ~2018; population-weighted). Local roads dominate it and their coverage follows mapping effort: it tracks "
         "travel time to a city only weakly (rho -0.32). For access, read main-road density"},
        {"indicator": "main_road_density_popw", "definition": "Density of highways, primary and secondary roads around "
         "residents, metres per km2 (GRIP4 types 1-3; population-weighted)"},
    ]).assign(source_key="grip4", publisher="Meijer et al. (2018), GRIP4, PBL Netherlands Environmental Assessment Agency",
              licence="CC0 1.0 (stated on the PBL download page, https://dataportaal.pbl.nl/downloads/GRIP4/, checked 30 October 2026); its ReadMe asks that Meijer et al. (2018) be cited").to_csv(HERE / "welfare_roads_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks_roads.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
