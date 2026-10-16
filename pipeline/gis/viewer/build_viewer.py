"""
Build pipeline/gis/viewer/index.html: one self-contained page for looking at welfare across
Pakistan with the archive's sites (and the open-source leads) laid over it.

Reads shrines_foundation.gpkg after build_foundation.py, build_census_outcomes.py,
build_welfare_layers.py and build_external_sites.py have run. Writes one HTML file with the data
embedded, so it opens from disk with a double-click (map tiles and Leaflet/h3-js load from CDNs).

Only public columns go in: no qa_note, needs_review or flags (see docs/GIS_FOUNDATION.md).

Usage (from the repo root):
  python pipeline/gis/viewer/build_viewer.py
"""
import json, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
SITE = "https://raufnawaz.github.io/Sufi-Shrines/shrine/"

# Indicator -> (label, group, higher_is_better or None, units). Order is menu order.
IND = {
    # Census 2023 (district: all of the four provinces + ICT; tehsil: the 77 cleanly matched districts)
    "literacy": ("Literacy, 10+ (%)", "Census 2023", True),
    "literacy_female": ("Female literacy, 10+ (%)", "Census 2023", True),
    "literacy_gender_gap": ("Literacy gender gap (points)", "Census 2023", False),
    "out_of_school_5_16": ("Out of school, 5-16 (%, approx.)", "Census 2023", False),
    "electricity": ("Households on grid electricity (%)", "Census 2023", True),
    "improved_water": ("Improved drinking water (%)", "Census 2023", True),
    "flush_toilet": ("Flush toilet (%)", "Census 2023", True),
    "no_toilet": ("No toilet (%)", "Census 2023", False),
    "cooking_firewood": ("Cooking with firewood (%)", "Census 2023", False),
    "urban_share": ("Urban population (%)", "Census 2023", None),
    "pop2023": ("Population 2023", "Census 2023", None),
    "share_hindu_all": ("Hindu population (%)", "Census 2023", None),
    "share_christian": ("Christian population (%)", "Census 2023", None),
    "share_ahmadi": ("Ahmadi population (%)", "Census 2023", None),
    # Satellite and modelled, population-weighted (district, tehsil, hexagon)
    "rwi_popw": ("Relative Wealth Index (Meta)", "Wealth, light, access", True),
    "ntl_2023_popw": ("Night lights where people live, 2023", "Wealth, light, access", True),
    "ntl_change_13_23": ("Change in night lights, 2013-2023", "Wealth, light, access", True),
    "share_pop_lit_at_night": ("People in a lit cell (%)", "Wealth, light, access", True),
    "travel_city_min_popw": ("Minutes to a city of 50k+", "Wealth, light, access", False),
    "share_pop_within_60min_city": ("Within 60 min of a city (%)", "Wealth, light, access", True),
    "travel_health_min_popw": ("Minutes to a health facility (motorized)", "Wealth, light, access", False),
    "share_pop_within_30min_health": ("Within 30 min of health care (%)", "Wealth, light, access", True),
    "pop_density": ("People per km2 (Kontur)", "Wealth, light, access", None),
    # HeiGIT, OSM-based (district only) - flagged
    "rural_access_index": ("Rural Access Index (OSM roads)", "OSM-based (read the caveat)", True),
    "share_access_hospitals_1h": ("Within 1 h of an OSM hospital (%)", "OSM-based (read the caveat)", True),
    # DHS 2017-18 and OPHI MPI (province / region only)
    "mpi": ("Multidimensional Poverty Index", "DHS 2017-18 / MPI (province)", False),
    "mpi_headcount": ("MPI poor (%)", "DHS 2017-18 / MPI (province)", False),
    "dhs_under5_mortality": ("Under-5 mortality per 1,000", "DHS 2017-18 / MPI (province)", False),
    "dhs_stunted": ("Children stunted (%)", "DHS 2017-18 / MPI (province)", False),
    "dhs_fully_vaccinated": ("Fully vaccinated (%)", "DHS 2017-18 / MPI (province)", True),
    "dhs_women_literate": ("Women literate (%)", "DHS 2017-18 / MPI (province)", True),
    "dhs_facility_delivery": ("Births in a facility (%)", "DHS 2017-18 / MPI (province)", True),
    "dhs_partner_violence": ("Partner violence, ever-married women (%)", "DHS 2017-18 / MPI (province)", False),
    # Shrine measures
    "n_site": ("Archive sites (all traditions)", "Archive", None),
    "n_mus": ("Archive Muslim shrines", "Archive", None),
    "sites_per_million": ("Archive sites per million people", "Archive", None),
}
SHRINE_Y = ["n_site", "n_mus", "n_mus_pre1857", "sites_per_million", "sites_per_1000km2"]
SEQ_RE = re.compile(r"^(n_|pop|sites_)")


def clean(v):
    if v is None or (isinstance(v, float) and not np.isfinite(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        return round(float(v), 4)
    return v


def feature_collection(gdf, id_col, name_col, cols, tol):
    g = gdf.copy()
    g["geometry"] = g.geometry.simplify(tol, preserve_topology=True)
    feats = []
    for _, r in g.iterrows():
        props = {"id": r[id_col], "name": r[name_col]}
        props.update({c: clean(r[c]) for c in cols if c in g.columns})
        feats.append({"type": "Feature", "properties": props,
                      "geometry": json.loads(gpd.GeoSeries([r.geometry]).to_json())["features"][0]["geometry"]})
    return {"type": "FeatureCollection", "features": feats}


def round_coords(obj, nd=4):
    if isinstance(obj, list):
        return [round_coords(x, nd) for x in obj]
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, dict):
        return {k: round_coords(v, nd) for k, v in obj.items()}
    return obj


def slugify(t):
    """Port of src/lib/data/slugify.ts; checked against dist/shrine/ (169 of 169) on 16 Oct 2026."""
    t = str(t).lower()
    t = re.sub(r"[&@%+]", lambda m: " " + {"&": "and", "@": "at", "%": "percent", "+": "plus"}[m.group()] + " ", t)
    t = re.sub(r"[^\w\s-]", "", t, flags=re.ASCII)
    t = re.sub(r"[\s_]+", "-", t)
    return re.sub(r"-+", "-", t).strip("-").strip()


def main():
    L = lambda n, **k: gpd.read_file(GPKG, layer=n, **k)
    wd, wt, wp = L("welfare_district"), L("welfare_tehsil"), L("welfare_province")
    cd = L("outcomes_district", ignore_geometry=True).drop(columns=["n_mus", "n_mus_pre1857", "mus_per_1000km2",
                                                                     "area_km2", "cx_m", "cy_m", "district_name", "province_code"], errors="ignore")
    ct = L("outcomes_tehsil", ignore_geometry=True)[["tehsil_code"] + [c for c in IND if c in L("outcomes_tehsil", ignore_geometry=True).columns]]
    d = wd.merge(cd, on="district_code", how="left")
    t = wt.merge(ct, on="tehsil_code", how="left")
    for g in (d, t):
        g["pop_density"] = g.pop_kontur_2023 / g.area_km2
        g["sites_per_million"] = 1e6 * g.n_site / g.pop_kontur_2023
        g["sites_per_1000km2"] = 1000 * g.n_site / g.area_km2
    pa = gpd.read_file(GPKG, layer="admin_province")[["province_code", "n_site", "n_mus", "n_mus_pre1857", "area_km2"]]
    wp = wp.merge(pa, on="province_code", how="left")
    wp["sites_per_million"] = 1e6 * wp.n_site / wp.pop_kontur_2023
    wp["sites_per_1000km2"] = 1000 * wp.n_site / wp.area_km2
    wp = wp[wp.geometry.notna()]

    cols = list(IND) + SHRINE_Y
    data = {
        "district": round_coords(feature_collection(d, "district_code", "district_name", cols, 0.01)),
        "tehsil": round_coords(feature_collection(t, "tehsil_code", "tehsil_name", cols, 0.006)),
        "province": round_coords(feature_collection(wp, "province_code", "province_name", cols, 0.02)),
    }
    grid = L("welfare_grid_h3_r6", ignore_geometry=True)
    grid["pop_density"] = grid.pop_kontur_2023 / 36.13
    hex_cols = ["rwi_popw", "ntl_2023_popw", "ntl_change_13_23", "share_pop_lit_at_night",
                "travel_city_min_popw", "travel_health_min_popw", "share_pop_within_60min_city",
                "share_pop_within_30min_health", "pop_density", "n_site", "n_mus"]
    grid = grid[grid.pop_kontur_2023.fillna(0) > 0]       # unpopulated hexagons carry no welfare value
    data["hex"] = {"cols": hex_cols, "rows": [[r.h3_id] + [clean(getattr(r, c)) for c in hex_cols]
                                              for r in grid.itertuples()]}

    sites = L("sites", ignore_geometry=True)
    data["sites"] = [{"name": r.name, "cat": r.category, "lat": round(r.lat, 5), "lon": round(r.lon, 5),
                      "support": r.support_level, "status": r.status, "shared_pin": int(r.shared_pin),
                      "url": SITE + slugify(r.name)} for r in sites.itertuples()]
    ext = pd.read_csv(GIS / "shrine_sources/external_sites.csv")
    ext = ext[ext.place_archive_site_id.isna() & ext.tehsil_code.notna()]
    data["leads"] = [{"src": r.source, "name": r.name if isinstance(r.name, str) else "(unnamed)", "kind": r.kind,
                      "rel": r.religion if isinstance(r.religion, str) else "", "lat": round(r.lat, 5),
                      "lon": round(r.lon, 5), "url": r.url} for r in ext.itertuples()]

    cb = pd.concat([pd.read_csv(GIS / "welfare/welfare_codebook.csv"),
                    L("outcomes_codebook", ignore_geometry=True).rename(columns={"census_table": "source_key"})
                    .assign(publisher="Pakistan Bureau of Statistics, Census 2023 (via PakPC2023 0.2.0)", licence="PBS")])
    defs = {r.indicator: f"{r.definition} — {r.publisher}" for r in cb.itertuples()}
    data["indicators"] = [{"key": k, "label": v[0], "group": v[1], "good": v[2], "def": defs.get(k, ""),
                           "units": [u for u, gj in [("hex", None), ("tehsil", "tehsil"), ("district", "district"),
                                                     ("province", "province")]
                                     if (u == "hex" and k in hex_cols) or
                                     (gj and any(f["properties"].get(k) is not None for f in data[gj]["features"]))]}
                          for k, v in IND.items()]
    wc = pd.read_csv(GIS / "welfare/checks.csv")
    ec = pd.read_csv(GIS / "shrine_sources/checks.csv")
    data["checks"] = [{"check": r.check, "result": r.result, "measured": str(r.measured), "reference": str(r.reference)}
                      for r in pd.concat([wc, ec]).itertuples()]
    cov = pd.read_csv(GIS / "shrine_sources/archive_coverage_by_source.csv")
    data["coverage"] = cov.replace({np.nan: None}).to_dict("records")

    for k in ("district", "tehsil", "province"):
        n = sum(f["properties"].get("n_site") or 0 for f in data[k]["features"])
        if k != "tehsil" and k != "province" and n != len(data["sites"]):
            sys.exit(f"site count mismatch: {k} sums to {n}, sites layer has {len(data['sites'])}")

    # Prettier formats the template (npm run verify checks it) and turns "/*__DATA__*/null" into
    # "/*__DATA__*/ null"; a plain replace then matched nothing and wrote an empty page. Match any
    # spacing, and refuse to write unless exactly one placeholder was filled.
    tpl = (HERE / "template.html").read_text()
    payload = json.dumps(data, separators=(",", ":"))
    html, n = re.subn(r"/\*__DATA__\*/\s*null", lambda m: payload, tpl)
    if n != 1:
        sys.exit(f"template.html: expected one /*__DATA__*/ null placeholder, found {n}")
    (HERE / "index.html").write_text(html)
    print(f"index.html {len(html) / 1e6:.1f} MB: {len(data['district']['features'])} districts, "
          f"{len(data['tehsil']['features'])} tehsils, {len(data['hex']['rows'])} hexagons, "
          f"{len(data['sites'])} sites, {len(data['leads'])} leads")


if __name__ == "__main__":
    main()
