"""
The atlas: one layer per unit with every welfare indicator the GIS foundation holds as a column,
for opening in ArcGIS / QGIS without joining anything, plus one codebook for all of them.

Run last, after every layer builder (see docs/GIS_FOUNDATION.md, "Full run order"). Reads:

  census           outcomes_district / outcomes_tehsil            (build_census_outcomes.py)
                   outcomes_ext_district / outcomes_ext_tehsil    (build_census_extended.py)
  welfare, wave 1  welfare_grid_h3_r6 / _tehsil / _district / _province   (build_welfare_layers.py)
  welfare, wave 2  welfare_ext_grid / _tehsil / _district / _province     (build_extended_layers.py)
  surveys          outcomes_pslm_district (build_pslm_district.py), outcomes_pslm15_district
                   (build_pslm_2015.py), outcomes_nns_district (build_nns_district.py),
                   outcomes_mics_district (build_mics_district.py),
                   outcomes_mpi_district (build_mpi_district.py)

Writes atlas_grid_h3_r6, atlas_tehsil, atlas_district, atlas_province and atlas_codebook into the
GeoPackage, and flat copies (tracked, no geometry) of all but the grid beside this script.

indicator_catalog.tsv (hand-written) gives each indicator its short label, theme, direction and
year; the viewer reads the same catalog, so the menu and the codebook cannot drift apart.

Checks, exit non-zero on failure (RULE 4): no indicator column arrives from two sources; every
catalog key exists in some unit; every indicator column has a definition; archive site counts are
unchanged by the joins.

Usage (from the repo root):
  python pipeline/gis/atlas/build_atlas.py
"""
import csv, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
CHECKS = []
H3_R6_KM2 = 36.13       # mean area of an H3 resolution-6 cell
KEYS = {"h3_id", "h3_parent", "tehsil_code", "tehsil_name", "district_code", "district_name", "province_code",
        "province_name", "area_km2", "cx_m", "cy_m", "geometry"}
ARCHIVE = ["n_site", "n_mus", "n_mus_pre1857", "n_field_verified", "dist_km_mus", "dist_band_mus"]
# Columns carried for reference but not indicators: the census's own match quality and the like.
AUX = {"census_pop_matched_to_tehsils", "n_census_units", "heigit_pop", "ntl_2013_popw", "note", "ipc_analysis",
       "mus_per_1000km2", "sites_per_1000km2", "osm_education_count", "osm_hospitals_count",
       "osm_primary_healthcare_count", "rural_pop_perc", "dependency_ratio", "rwi_cell_share",
       "immunisation_children", "households", "pslm_name", "pslm_parent", "mpi_district_2015_name", "mpi_parent", "pslm15_name", "pslm15_parent", "nns_name", "nns_parent", "mics_district", "mics_survey"}
AUX_PREFIX = ("mpi_20", "mpi_h_20",     # the district MPI's full six-round series, defined in its codebook
              "nns_small_n_")           # NNS small-sample flags, one per indicator


def check(name, measured, reference, ok, hard=True):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "measured": measured, "reference": reference, "result": res})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def L(name, geom=False):
    return gpd.read_file(GPKG, layer=name, ignore_geometry=not geom)


def join_all(base, key, parts, unit):
    """Left-join each part's non-key columns onto base, refusing a column that already exists."""
    out = base.copy()
    clashes = []
    for label, df in parts:
        cols = [c for c in df.columns if c not in KEYS and c not in ARCHIVE and c != key]
        clash = [c for c in cols if c in out.columns]
        clashes += [f"{c} ({label})" for c in clash]
        out = out.merge(df[[key] + [c for c in cols if c not in clash]], on=key, how="left")
    check(f"{unit}: no indicator column arrives from two sources", "none" if not clashes else ", ".join(clashes),
          "none", not clashes)
    return out


def derived(g, unit):
    pop = g["pop_kontur_2023"]
    area = H3_R6_KM2 if unit == "grid" else g["area_km2"]
    g["pop_density"] = pop / area
    g["sites_per_million"] = 1e6 * g.n_site / pop
    if unit != "grid":
        g["sites_per_1000km2"] = 1000 * g.n_site / g.area_km2
    return g


DERIVED_DEFS = {
    "pop_density": ("People per km2: Kontur 2023 population over the unit's area", "kontur"),
    "sites_per_million": ("Archive sites per million residents (Kontur 2023)", "archive"),
    "n_site": ("Archive sites with coordinates in the unit, all traditions", "archive"),
    "n_mus": ("Archive Muslim shrines in the unit", "archive"),
}


def main():
    print("loading layers")
    adm_p = L("admin_province", geom=True)
    w1 = {u: L(f"welfare_{u}", geom=True) for u in ["grid_h3_r6", "tehsil", "district"]}
    w1["province"] = L("welfare_province", geom=True)
    w2 = {u: L(f"welfare_ext_{u}") for u in ["grid", "tehsil", "district", "province"]}
    c1 = {"tehsil": L("outcomes_tehsil"), "district": L("outcomes_district")}
    c2 = {"tehsil": L("outcomes_ext_tehsil"), "district": L("outcomes_ext_district")}
    surveys = [("PSLM 2019-20", L("outcomes_pslm_district")), ("PSLM 2014-15", L("outcomes_pslm15_district")),
               ("NNS 2018", L("outcomes_nns_district")), ("MICS 6", L("outcomes_mics_district")),
               ("district MPI", L("outcomes_mpi_district"))]
    for d in (c1["tehsil"], c1["district"]):     # step one copies the old shrine columns; the welfare base has them
        d.drop(columns=[c for c in ["n_mus", "n_mus_pre1857", "mus_per_1000km2"] if c in d], inplace=True)

    print("joining")
    out = {
        "grid": join_all(w1["grid_h3_r6"], "h3_id", [("wave 2", w2["grid"])], "grid"),
        "tehsil": join_all(w1["tehsil"], "tehsil_code",
                           [("census", c1["tehsil"]), ("census ext", c2["tehsil"]), ("wave 2", w2["tehsil"])], "tehsil"),
        "district": join_all(w1["district"], "district_code",
                             [("census", c1["district"]), ("census ext", c2["district"]), ("wave 2", w2["district"])]
                             + surveys,
                             "district"),
    }
    prov = w1["province"].merge(adm_p[["province_code", "n_site", "n_mus", "n_mus_pre1857", "area_km2"]],
                                on="province_code", how="left")
    out["province"] = join_all(prov, "province_code", [("wave 2", w2["province"])], "province")
    out["province"] = out["province"][out["province"].geometry.notna()]          # FATA: data row, no polygon
    for u in out:
        out[u] = derived(out[u], u)

    sites = L("sites")
    n_xy = int(sites.lat.notna().sum())
    for u in ["district", "tehsil"]:
        n = int(out[u].n_site.fillna(0).sum())
        check(f"{u}: archive sites after the joins", f"{n}", f"{n_xy} sites with coordinates", n == n_xy)

    print("codebook")
    cat = pd.read_csv(HERE / "indicator_catalog.tsv", sep="\t", dtype=str).fillna("")
    defs = pd.concat([
        pd.read_csv(GIS / "welfare/welfare_codebook.csv").assign(wave="welfare 1"),
        pd.read_csv(GIS / "welfare/welfare_ext_codebook.csv").assign(wave="welfare 2"),
        L("outcomes_codebook").rename(columns={"census_table": "source_key"})
        .assign(publisher="Pakistan Bureau of Statistics, Census 2023 (via PakPC2023 0.2.0)", licence="PBS", wave="census"),
        pd.read_csv(GIS / "outcomes/outcomes_ext_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Pakistan Bureau of Statistics, Census 2023 (via PakPC2023 0.2.0)", licence="PBS", wave="census"),
        pd.read_csv(GIS / "outcomes/outcomes_pslm_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Pakistan Bureau of Statistics, PSLM District Level Survey 2019-20", licence="PBS", wave="survey"),
        pd.read_csv(GIS / "outcomes/outcomes_pslm15_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Pakistan Bureau of Statistics, PSLM 2014-15", licence="PBS", wave="survey"),
        pd.read_csv(GIS / "outcomes/outcomes_nns_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Government of Pakistan and UNICEF, National Nutrition Survey 2018", licence="Government of Pakistan / UNICEF publication", wave="survey"),
        pd.read_csv(GIS / "outcomes/outcomes_mics_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Provincial Bureaus of Statistics and UNICEF, MICS 6 (Punjab 2017-18, Sindh 2018-19)", licence="Government of Pakistan provinces / UNICEF publication", wave="survey"),
        pd.read_csv(GIS / "outcomes/outcomes_mpi_codebook.csv").rename(columns={"census_table": "source_key"})
        .assign(publisher="Ministry of Planning, Development and Reform, UNDP and OPHI (2016)", licence="Government of Pakistan publication", wave="survey"),
        pd.DataFrame([{"indicator": k, "definition": v[0], "source_key": v[1], "wave": "derived",
                       "publisher": "This project" if v[1] == "archive" else "Kontur via HDX",
                       "licence": "" if v[1] == "archive" else "CC BY 4.0"} for k, v in DERIVED_DEFS.items()]),
    ], ignore_index=True)[["indicator", "definition", "source_key", "publisher", "licence", "wave"]]
    dup = defs[defs.indicator.duplicated()].indicator.tolist()
    check("every indicator defined once", "none" if not dup else ", ".join(dup), "none", not dup)

    units = {}
    for u, g in out.items():
        for c in g.columns:
            if c not in KEYS and pd.api.types.is_numeric_dtype(g[c]) and g[c].notna().any():
                units.setdefault(c, []).append("hex" if u == "grid" else u)
    missing = sorted(set(cat.key) - set(units))
    check("every catalog indicator present in some unit", "all" if not missing else ", ".join(missing), "all", not missing)
    undefined = sorted(c for c in units if c not in set(defs.indicator) | AUX | set(ARCHIVE) | {"sites_per_1000km2"}
                       and not c.startswith(AUX_PREFIX) and not c.startswith(("lang_", "share_muslim", "share_hindu", "share_sc", "literacy_",
                                             "flush_toilet_", "improved_water_", "electricity_")))
    check("every indicator column has a definition", "all" if not undefined else ", ".join(undefined), "all", not undefined)

    cb = defs.merge(cat.rename(columns={"key": "indicator"}), on="indicator", how="left")
    cb["units"] = cb.indicator.map(lambda k: ",".join(units.get(k, [])))
    cb["in_viewer"] = cb.indicator.isin(cat.key)
    cb = cb[cb.units != ""]
    cb = cb[["indicator", "label", "theme", "higher_is_better", "year", "units", "definition", "source_key",
             "publisher", "licence", "wave", "in_viewer"]].sort_values(["theme", "indicator"], na_position="last")

    print("writing")
    for u, g in out.items():
        layer = "atlas_grid_h3_r6" if u == "grid" else f"atlas_{u}"
        gpd.GeoDataFrame(g, geometry="geometry", crs=4326).to_file(GPKG, layer=layer, driver="GPKG")
        if u != "grid":
            g.drop(columns="geometry").to_csv(HERE / f"atlas_{u}.csv", index=False)
    gpd.GeoDataFrame(cb, geometry=[None] * len(cb)).to_file(GPKG, layer="atlas_codebook", driver="GPKG")
    cb.to_csv(HERE / "atlas_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    print({u: g.shape for u, g in out.items()}, f"| codebook {len(cb)} indicators")
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    if fails:
        sys.exit(f"{len(fails)} atlas check(s) failed")


if __name__ == "__main__":
    main()
