"""
Helpers for layering new data onto shrines_foundation.gpkg.

Every function returns a plain table keyed on the foundation's ids (h3_id, tehsil_code,
district_code, province_code), so new data merges through keys rather than ad hoc
geometry joins.

  attach_points   survey clusters, mauzas, schools, police stations, polling stations
  raster_to_grid  nightlights, population, elevation, any GeoTIFF
  aggregate       move any grid or point table up to tehsil, district or coarser H3
  morans_i        warning light for spatial autocorrelation in residuals (Kelly 2019)
"""
import numpy as np
import pandas as pd
import geopandas as gpd
import h3
from scipy.spatial import cKDTree

PK_LAEA = "+proj=laea +lat_0=30 +lon_0=69 +datum=WGS84 +units=m +no_defs"
DIST_BANDS = [0, 5, 10, 25, 50, 100, np.inf]
BAND_LABELS = ["lt5", "5to10", "10to25", "25to50", "50to100", "gt100"]


def load(gpkg, layer):
    return gpd.read_file(gpkg, layer=layer)


def _sites(gpkg, muslim_only=True, pre1857=False, field_verified_only=False):
    s = load(gpkg, "sites")
    if muslim_only:
        s = s[s.is_muslim_shrine.eq(1)]
    if pre1857:
        s = s[s.built_pre1857.eq(1)]
    if field_verified_only:
        s = s[s.support_level.eq("Field-verified")]
    return s


def attach_points(df, gpkg, lat="lat", lon="lon", radii_km=(5, 10, 25),
                  muslim_only=True, pre1857=False):
    """Give each point the foundation keys plus shrine exposure measures.

    For DHS clusters, use the distance bands and the counts within radii rather than the
    exact distance: DHS displaces clusters up to 2 km (urban), 5 km (rural) and 10 km for
    1 percent of rural clusters, so differences below about 5 km are not real.
    """
    pts = gpd.GeoDataFrame(df.copy(), geometry=gpd.points_from_xy(df[lon], df[lat]), crs=4326)
    teh = load(gpkg, "admin_tehsil")[["tehsil_code", "district_code", "province_code", "geometry"]]
    pts = gpd.sjoin(pts, teh, how="left", predicate="within").drop(columns="index_right")
    pts = pts[~pts.index.duplicated()]
    pts["h3_id"] = [h3.latlng_to_cell(y, x, 6) for y, x in zip(pts[lat], pts[lon])]
    pts["h3_parent"] = [h3.cell_to_parent(c, 5) for c in pts.h3_id]
    p = pts.to_crs(PK_LAEA).geometry
    xy = np.c_[p.x, p.y]
    pts["x_m"], pts["y_m"] = xy[:, 0].round(1), xy[:, 1].round(1)

    s = _sites(gpkg, muslim_only=muslim_only, pre1857=pre1857)
    tree = cKDTree(s[["x_m", "y_m"]].to_numpy())
    d, i = tree.query(xy, k=1)
    pts["dist_km_shrine"] = np.round(d / 1000, 3)
    pts["nearest_shrine_id"] = s.site_id.to_numpy()[i]
    pts["dist_band_shrine"] = pd.cut(pts.dist_km_shrine, DIST_BANDS, labels=BAND_LABELS,
                                     right=False).astype(str)
    for r in radii_km:
        pts[f"n_shrines_within_{r}km"] = [len(v) for v in tree.query_ball_point(xy, r * 1000)]
    return pd.DataFrame(pts.drop(columns="geometry"))


def raster_to_grid(raster_path, gpkg, stats=("mean",), layer="grid_h3_r6", prefix=None,
                   all_touched=False):
    """Zonal statistics of a raster over every grid cell (or admin polygon via layer=).

    If the raster is coarser than about 5 km, set all_touched=True so small cells still
    receive a value; otherwise cells that contain no pixel centre come back empty.
    """
    from rasterstats import zonal_stats
    import rasterio
    units = load(gpkg, layer)
    key = {"grid_h3_r6": "h3_id", "admin_tehsil": "tehsil_code",
           "admin_district": "district_code", "admin_province": "province_code"}[layer]
    with rasterio.open(raster_path) as r:
        units = units.to_crs(r.crs)
    zs = zonal_stats(units, raster_path, stats=list(stats), all_touched=all_touched)
    out = pd.DataFrame(zs)
    prefix = prefix or raster_path.split("/")[-1].rsplit(".", 1)[0]
    out.columns = [f"{prefix}_{c}" for c in out.columns]
    out.insert(0, key, units[key].values)
    return out


def aggregate(df, value_cols, to="district_code", how="mean", weight=None, gpkg=None):
    """Aggregate a keyed table up a level. If df has only h3_id, keys are added from gpkg."""
    if to not in df.columns:
        keys = pd.DataFrame(load(gpkg, "keys_crosswalk").drop(columns="geometry"))
        df = df.merge(keys, on="h3_id", how="left")
    if weight:
        g = df.assign(**{c: df[c] * df[weight] for c in value_cols})
        res = g.groupby(to)[value_cols].sum().div(df.groupby(to)[weight].sum(), axis=0)
    else:
        res = df.groupby(to)[value_cols].agg(how)
    return res.reset_index()


def morans_i(values, x, y, k=8):
    """Global Moran's I with row standardised k nearest neighbour weights.

    Run it on regression residuals. High values mean nominal t statistics are likely
    inflated (Kelly 2019; Conley and Kelly 2025): add a spatial basis, use Conley or large
    cluster standard errors, and run spatial noise placebos before believing a result.
    """
    v = np.asarray(values, float)
    z = v - v.mean()
    xy = np.c_[x, y]
    _, idx = cKDTree(xy).query(xy, k=k + 1)
    lag = z[idx[:, 1:]].mean(axis=1)
    return float((z * lag).sum() / (z ** 2).sum())
