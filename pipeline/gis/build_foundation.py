"""
Build the spatial foundation for the Sufi shrines project.

Produces one GeoPackage (opens in QGIS, ArcGIS Pro, ArcGIS Online, R sf, Python geopandas)
with a fixed set of layers that every later dataset joins onto through shared keys.

Design (see README.md for the reasoning and sources):
  1. Stable keys, not geometry, are the join backbone (the SHRUG approach). Every unit carries
     OCHA COD-AB P-codes (province, district, tehsil) and H3 cell ids.
  2. A fixed hexagonal grid (H3) is the neutral analysis spine (the PRIO-GRID approach): cells
     do not move when district boundaries change and nest cleanly from fine to coarse.
  3. Distances are computed in an equal area metric projection, never in degrees.
  4. Every unit stores projected centroid coordinates so spatial inference (Conley standard
     errors, Moran's I, spatial noise placebos) can be run later without rebuilding.
  5. Exposure is kept per source with provenance flags; the archive is one source among several.

Usage:
  python build_foundation.py --shrines ../../data/shrines.csv --boundaries ./boundaries \
      --out shrines_foundation.gpkg
"""
import argparse, hashlib, datetime, json, re
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import h3
from shapely.geometry import Polygon, mapping
from scipy.spatial import cKDTree

# Lambert azimuthal equal area centred on Pakistan: metres, area preserving.
PK_LAEA = "+proj=laea +lat_0=30 +lon_0=69 +datum=WGS84 +units=m +no_defs"
H3_RES = 6          # mean cell about 36 km2; fine enough for tehsil scale variation
H3_PARENT = 5       # about 250 km2; for robustness checks across scales (MAUP)
H3_CHILD = 7        # stored on points only, about 5 km2
DIST_BANDS = [0, 5, 10, 25, 50, 100, np.inf]   # km; bands >= 5 km tolerate DHS displacement
BAND_LABELS = ["lt5", "5to10", "10to25", "25to50", "50to100", "gt100"]


def sha256(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()[:16]


def load_sites(path):
    """All website rows and every archive column, so the layer mirrors spiritualsitespakistan.com."""
    s = pd.read_csv(path)
    s = s.rename(columns={"Name": "name", "Latitude": "lat", "Longitude": "lon",
                          "Location": "location_text", "Category": "category_original"})
    # GIS safe field names (ArcGIS rejects spaces and slashes).
    s.columns = [re.sub(r"[^0-9a-zA-Z]+", "_", c).strip("_").lower() for c in s.columns]
    s["site_id"] = s["id"].astype(str)
    s["year_built_num"] = pd.to_numeric(s["year_built"], errors="coerce")
    s["is_muslim_shrine"] = (s["category"] == "Muslim Shrine").astype(int)
    s["built_pre1857"] = (s["year_built_num"] < 1857).astype(int)
    s["exposure_source"] = "archive"
    s["coord_missing"] = s[["lat", "lon"]].isna().any(axis=1).astype(int)
    lead = ["site_id", "name", "category", "site_type", "status", "is_muslim_shrine",
            "built_pre1857", "year_built_num", "support_level", "exposure_source", "lat", "lon"]
    s = s[lead + [c for c in s.columns if c not in lead]]
    g = s.dropna(subset=["lat", "lon"]).copy()
    # Flag pins shared by several sites (landmark coordinates rather than exact positions).
    g["shared_pin"] = g.duplicated(["lat", "lon"], keep=False).astype(int)
    return gpd.GeoDataFrame(g, geometry=gpd.points_from_xy(g.lon, g.lat), crs=4326), s


def add_centroid_xy(gdf, prefix="c"):
    pts = gdf.to_crs(PK_LAEA).geometry.representative_point()
    gdf[f"{prefix}x_m"] = pts.x.round(1)
    gdf[f"{prefix}y_m"] = pts.y.round(1)
    return gdf


def build_h3_grid(country, res, extra_cells=()):
    cells = set(extra_cells)   # cells holding a site but whose centre falls just outside the outline
    geom = country.geometry.union_all()
    polys = getattr(geom, "geoms", [geom])
    for p in polys:
        cells |= set(h3.geo_to_cells(mapping(p), res))
    rows = []
    for c in sorted(cells):
        b = h3.cell_to_boundary(c)                 # (lat, lng) pairs
        rows.append({"h3_id": c, "h3_parent": h3.cell_to_parent(c, H3_PARENT),
                     "area_km2": round(h3.cell_area(c, "km^2"), 3),
                     "geometry": Polygon([(lng, lat) for lat, lng in b])})
    return gpd.GeoDataFrame(rows, crs=4326)


def nearest_km(target_xy, source_xy):
    if len(source_xy) == 0:
        return np.full(len(target_xy), np.nan), np.full(len(target_xy), -1)
    d, i = cKDTree(source_xy).query(target_xy, k=1)
    return np.round(d / 1000, 3), i


def main(a):
    bdir = Path(a.boundaries)
    prov = gpd.read_file(bdir / "pk_provinces.gpkg")
    dist = gpd.read_file(bdir / "pk_districts.gpkg")
    teh = gpd.read_file(bdir / "pk_tehsils.gpkg")
    country = gpd.read_file(bdir / "pk_country.gpkg")

    # Admin keys. Tehsil codes nest district codes (PK10101 inside PK101); province = first 3.
    teh["district_code"] = teh["tehsil_code"].str[:5]
    dist["province_code"] = dist["district_code"].str[:3]
    teh["province_code"] = teh["tehsil_code"].str[:3]
    prov_codes = dist.groupby("province_name")["province_code"].first()
    prov["province_code"] = prov["province_name"].map(prov_codes)

    sites, sites_all = load_sites(a.shrines)

    # Attach admin keys to points (within, then nearest for coastal pins just outside a polygon).
    j = gpd.sjoin(sites, teh[["tehsil_code", "district_code", "province_code", "geometry"]],
                  how="left", predicate="within").drop(columns="index_right")
    miss = j["tehsil_code"].isna()
    if miss.any():
        near = gpd.sjoin_nearest(j.loc[miss, ["geometry"]].to_crs(PK_LAEA),
                                 teh[["tehsil_code", "district_code", "province_code",
                                      "geometry"]].to_crs(PK_LAEA), how="left")
        for col in ["tehsil_code", "district_code", "province_code"]:
            j.loc[miss, col] = near[col].values
        j["admin_assigned_by_nearest"] = miss.astype(int)
    else:
        j["admin_assigned_by_nearest"] = 0
    sites = j
    sites["h3_id"] = [h3.latlng_to_cell(y, x, H3_RES) for y, x in zip(sites.lat, sites.lon)]
    sites["h3_parent"] = [h3.cell_to_parent(c, H3_PARENT) for c in sites.h3_id]
    sites["h3_child"] = [h3.latlng_to_cell(y, x, H3_CHILD) for y, x in zip(sites.lat, sites.lon)]
    sites = add_centroid_xy(sites, prefix="")
    sites = sites.rename(columns={"x_m": "x_m", "y_m": "y_m"})

    # H3 grid spine.
    grid = build_h3_grid(country, H3_RES, extra_cells=sites.h3_id)
    cen = grid.to_crs(PK_LAEA).geometry.centroid
    grid["cx_m"], grid["cy_m"] = cen.x.round(1), cen.y.round(1)
    cpts = gpd.GeoDataFrame(grid[["h3_id"]], geometry=cen.to_crs(4326), crs=4326)
    ck = gpd.sjoin(cpts, teh[["tehsil_code", "district_code", "province_code", "geometry"]],
                   how="left", predicate="within").drop_duplicates("h3_id")
    grid = grid.merge(ck.drop(columns=["geometry", "index_right"]), on="h3_id", how="left")
    # Border and coastal cells whose centre misses every tehsil polygon: take the nearest tehsil.
    gm = grid["tehsil_code"].isna()
    grid["admin_assigned_by_nearest"] = gm.astype(int)
    if gm.any():
        near = gpd.sjoin_nearest(cpts.loc[gm.values, ["geometry"]].to_crs(PK_LAEA),
                                 teh[["tehsil_code", "district_code", "province_code",
                                      "geometry"]].to_crs(PK_LAEA), how="left")
        near = near[~near.index.duplicated()]
        for col in ["tehsil_code", "district_code", "province_code"]:
            grid.loc[gm, col] = near[col].values

    # Exposure on the grid: counts in cell and distance from cell centroid to nearest site.
    gxy = grid[["cx_m", "cy_m"]].to_numpy()
    for label, mask in {"site": np.ones(len(sites), bool),
                        "mus": sites.is_muslim_shrine.eq(1).to_numpy(),
                        "mus_pre1857": (sites.is_muslim_shrine.eq(1)
                                        & sites.built_pre1857.eq(1)).to_numpy()}.items():
        sub = sites[mask]
        grid[f"n_{label}"] = grid.h3_id.map(sub.groupby("h3_id").size()).fillna(0).astype(int)
        km, idx = nearest_km(gxy, sub[["x_m", "y_m"]].to_numpy())
        grid[f"dist_km_{label}"] = km
        if label == "mus":
            grid["nearest_mus_site_id"] = np.where(idx >= 0, sub.site_id.to_numpy()[idx], None)
    grid["dist_band_mus"] = pd.cut(grid.dist_km_mus, DIST_BANDS, labels=BAND_LABELS,
                                   right=False).astype(str)

    # Admin layers with counts, area and centroids.
    def admin_counts(gdf, key):
        g = gdf.copy()
        g["area_km2"] = (g.to_crs(PK_LAEA).area / 1e6).round(2)
        for label, col in {"n_site": None, "n_mus": "is_muslim_shrine",
                           "n_mus_pre1857": "built_pre1857"}.items():
            sub = sites if col is None else sites[sites[col].eq(1)]
            if label == "n_mus_pre1857":
                sub = sub[sub.is_muslim_shrine.eq(1)]
            g[label] = g[key].map(sub.groupby(key).size()).fillna(0).astype(int)
        g["n_field_verified"] = g[key].map(
            sites[sites.support_level.eq("Field-verified")].groupby(key).size()).fillna(0).astype(int)
        g["mus_per_1000km2"] = (g.n_mus / g.area_km2 * 1000).round(4)
        return add_centroid_xy(g)

    prov = admin_counts(prov, "province_code")
    dist = admin_counts(dist, "district_code")
    teh = admin_counts(teh, "tehsil_code")

    # Key crosswalk (non spatial): one row per grid cell, the table every dataset merges through.
    keys = grid[["h3_id", "h3_parent", "tehsil_code", "district_code", "province_code"]].copy()
    keys = keys.merge(teh[["tehsil_code", "tehsil_name"]], on="tehsil_code", how="left")
    keys = keys.merge(dist[["district_code", "district_name"]], on="district_code", how="left")
    keys = keys.merge(prov[["province_code", "province_name"]], on="province_code", how="left")

    manifest = pd.DataFrame([
        {"item": "built_utc", "value": datetime.datetime.now(datetime.timezone.utc).isoformat(timespec="seconds")},
        {"item": "shrines_csv_sha256_16", "value": sha256(a.shrines)},
        {"item": "boundaries_source", "value": "OCHA COD-AB Pakistan via pkmapr 1.4.0 (GPL-3)"},
        {"item": "analysis_crs", "value": PK_LAEA},
        {"item": "storage_crs", "value": "EPSG:4326"},
        {"item": "h3_res_grid", "value": H3_RES},
        {"item": "h3_res_parent", "value": H3_PARENT},
        {"item": "h3_res_points_child", "value": H3_CHILD},
        {"item": "n_sites_geocoded", "value": len(sites)},
        {"item": "n_sites_missing_coords", "value": int(sites_all.coord_missing.sum())},
        {"item": "n_grid_cells", "value": len(grid)},
        {"item": "h3_version", "value": h3.__version__},
    ])

    out = Path(a.out)
    if out.exists():
        out.unlink()
    sites.to_file(out, layer="sites", driver="GPKG")
    grid.to_file(out, layer="grid_h3_r6", driver="GPKG")
    teh.to_file(out, layer="admin_tehsil", driver="GPKG")
    dist.to_file(out, layer="admin_district", driver="GPKG")
    prov.to_file(out, layer="admin_province", driver="GPKG")
    nocoord = sites_all[sites_all.coord_missing.eq(1)]
    gpd.GeoDataFrame(nocoord, geometry=[None] * len(nocoord)).to_file(out, layer="sites_no_coordinates", driver="GPKG")
    gpd.GeoDataFrame(keys, geometry=[None] * len(keys)).to_file(out, layer="keys_crosswalk", driver="GPKG")
    gpd.GeoDataFrame(manifest, geometry=[None] * len(manifest)).to_file(out, layer="manifest", driver="GPKG")
    print(manifest.to_string(index=False))


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--shrines", required=True)
    p.add_argument("--boundaries", required=True)
    p.add_argument("--out", default="shrines_foundation.gpkg")
    main(p.parse_args())
