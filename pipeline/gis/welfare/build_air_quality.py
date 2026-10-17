"""
Air pollution exposure: annual mean fine particulate matter (PM2.5) where people live, from LGHAP v2
(Bai et al. 2024, ESSD; global gap-free 1 km monthly PM2.5, Zenodo 14280025, CC BY 4.0), on the same
Kontur population carrier as the welfare layers.

The annual mean is the mean of the twelve monthly grids (a cell needs at least ten valid months).
Each populated Kontur cell takes the 0.01-degree pixel its centre falls in; units then get the
population-weighted mean and the share of residents above WHO's 2021 annual guideline (5 ug/m3) and
above its first interim target (35 ug/m3, the least strict level WHO sets). 2021 is the latest year
LGHAP v2 publishes; 2011, if fetched, gives the decade's change.

The NetCDF files carry no geotransform and store PM25 as (lon, lat), so the reader takes the lat and
lon axes from the file itself, and a check that Lahore's annual mean exceeds Gilgit's would fail at
once on a swapped or flipped axis. The zip's MD5 must equal the one Zenodo publishes.

Writes welfare_air_grid / _tehsil / _district / _province, flat copies and checks_air.csv.

Usage (from the repo root, after build_welfare_layers.py):
  python pipeline/gis/welfare/build_air_quality.py              # 2021 and 2011
  python pipeline/gis/welfare/build_air_quality.py --years 2021  # 2021 alone
"""
import argparse, csv, hashlib, json, sys, urllib.request, zipfile
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import netCDF4

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_welfare_layers as bw          # noqa: E402

HERE, SRC, GPKG = bw.HERE, bw.SRC / "lghap", bw.GPKG
RECORD = "https://zenodo.org/api/records/14280025"
YEARS = [2021, 2011]
BOX = (60.8, 23.6, 77.9, 37.1)
CHECKS = []
CITIES = {"Lahore": (74.35, 31.55), "Gilgit": (74.31, 35.92), "Karachi": (67.03, 24.86), "Quetta": (66.99, 30.18)}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def md5(path):
    h = hashlib.md5()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(1 << 20), b""):
            h.update(chunk)
    return h.hexdigest()


def annual(year, published):
    z = SRC / f"LGHAP.Global_PM25.M001.Y{year}.zip"
    got = md5(z)
    want = published.get(z.name, "")
    check(f"{z.name} MD5 vs Zenodo's", "integrity", got, want or "(not published)", got == want)
    d = SRC / f"Y{year}"
    if len(list(d.glob("*.nc"))) < 12:
        zipfile.ZipFile(z).extractall(d)
    total = count = None
    for f in sorted(d.glob("*.nc")):
        ds = netCDF4.Dataset(f)
        lat, lon = ds["lat"][:], ds["lon"][:]
        li = np.where((lon >= BOX[0]) & (lon <= BOX[2]))[0]
        la = np.where((lat >= BOX[1]) & (lat <= BOX[3]))[0]
        a = ds["PM25"][li.min():li.max() + 1, la.min():la.max() + 1]       # (lon, lat), masked fill
        v = np.ma.filled(a.astype("float64"), np.nan)
        total = np.nan_to_num(v) if total is None else total + np.nan_to_num(v)
        count = np.isfinite(v).astype(int) if count is None else count + np.isfinite(v)
        lon_ax, lat_ax = lon[li.min():li.max() + 1], lat[la.min():la.max() + 1]
        ds.close()
    months = len(list(d.glob("*.nc")))
    check(f"{year}: monthly grids", "integrity", f"{months}", "12", months == 12)
    mean = np.where(count >= 10, total / np.maximum(count, 1), np.nan)
    return mean, np.asarray(lon_ax, dtype="float64"), np.asarray(lat_ax, dtype="float64")


def sample(grid, lon_ax, lat_ax, lon, lat):
    i = np.rint((np.asarray(lon) - lon_ax[0]) / (lon_ax[1] - lon_ax[0])).astype(int)
    j = np.rint((np.asarray(lat) - lat_ax[0]) / (lat_ax[1] - lat_ax[0])).astype(int)
    ok = (i >= 0) & (i < grid.shape[0]) & (j >= 0) & (j < grid.shape[1])
    out = np.full(len(i), np.nan)
    out[ok] = grid[i[ok], j[ok]]
    return out


def main(a):
    published = {f["key"]: f["checksum"].removeprefix("md5:") for f in
                 json.load(urllib.request.urlopen(urllib.request.Request(RECORD, headers={"User-Agent": "shrines-gis/1.0"})))["files"]}
    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    k = bw.carrier_cells(teh)
    years = []
    for y in a.years:
        if not (SRC / f"LGHAP.Global_PM25.M001.Y{y}.zip").exists():
            check(f"LGHAP {y} present", "integrity", "absent", "fetched", False, hard=(y == 2021),
                  note="2011 only gives the decade's change; fetch_extended_sources.py downloads it")
            continue
        print(f"LGHAP v2 PM2.5 {y}")
        g, lon_ax, lat_ax = annual(y, published)
        c = {n: sample(g, lon_ax, lat_ax, [x], [y_])[0] for n, (x, y_) in CITIES.items()}
        check(f"{y}: annual PM2.5 at four cities (orientation)", "integrity",
              ", ".join(f"{n} {v:.0f}" for n, v in c.items()), "Lahore > Gilgit and Lahore > Quetta",
              c["Lahore"] > c["Gilgit"] and c["Lahore"] > c["Quetta"],
              note="A swapped or flipped axis would put mountain air in Lahore")
        k[f"pm25_{y}"] = sample(g, lon_ax, lat_ax, k.lon, k.lat)
        cov = k.loc[k[f"pm25_{y}"].notna(), "pop"].sum() / k["pop"].sum()
        check(f"{y}: PM2.5 found for populated cells", "integrity", f"{cov:.2%} of people", ">= 99%", cov >= 0.99)
        years.append(y)

    y0 = years[0]
    k["above_who"] = (k[f"pm25_{y0}"] > 5).astype(float).where(k[f"pm25_{y0}"].notna())
    k["above_it1"] = (k[f"pm25_{y0}"] > 35).astype(float).where(k[f"pm25_{y0}"].notna())
    cols = [f"pm25_{y}" for y in years] + ["above_who", "above_it1"]
    out = {}
    for by, unit in [("h3_id", "grid"), ("tehsil_code", "tehsil"), ("district_code", "district"), ("province_code", "province")]:
        g = bw.wavg(k, by, cols)
        g = g.rename(columns={f"pm25_{y}": f"pm25_{y}_popw" for y in years} |
                     {"above_who": f"share_pop_pm25_above_who_{y0}", "above_it1": f"share_pop_pm25_above_35_{y0}"})
        for c in [f"share_pop_pm25_above_who_{y0}", f"share_pop_pm25_above_35_{y0}"]:
            g[c] = 100 * g[c]
        if len(years) == 2:
            g[f"pm25_change_{str(years[1])[2:]}_{str(years[0])[2:]}"] = g[f"pm25_{years[0]}_popw"] - g[f"pm25_{years[1]}_popw"]
        out[unit] = g.round(3)

    nat = np.nansum(k[f"pm25_{y0}"] * k["pop"]) / k.loc[k[f"pm25_{y0}"].notna(), "pop"].sum()
    w1 = gpd.read_file(GPKG, layer="welfare_district", ignore_geometry=True).set_index("district_code")
    x = out["district"].join(w1[["ntl_2023_popw"]], how="inner").dropna()
    rho = x[f"pm25_{y0}_popw"].rank().corr(x.ntl_2023_popw.rank())
    check(f"district PM2.5 {y0} vs night lights 2023", "convergent", f"rho = {rho:+.2f}, n = {len(x)}",
          "sign + (pollution concentrates where activity does), rho >= 0.3", rho >= 0.3)
    print(f"  population-weighted national annual mean {y0}: {nat:.1f} ug/m3")

    keys = {"grid": gpd.read_file(GPKG, layer="grid_h3_r6")[["h3_id", "geometry"]],
            "tehsil": teh[["tehsil_code", "tehsil_name", "geometry"]],
            "district": gpd.read_file(GPKG, layer="admin_district")[["district_code", "district_name", "geometry"]],
            "province": gpd.read_file(GPKG, layer="admin_province")[["province_code", "province_name", "geometry"]]}
    by = {"grid": "h3_id", "tehsil": "tehsil_code", "district": "district_code", "province": "province_code"}
    for unit, g in out.items():
        df = keys[unit].merge(g.reset_index(), on=by[unit], how="inner")
        gpd.GeoDataFrame(df, geometry="geometry", crs=4326).to_file(GPKG, layer=f"welfare_air_{unit}", driver="GPKG")
        if unit != "grid":
            df.drop(columns="geometry").to_csv(HERE / f"welfare_air_{unit}.csv", index=False)
    defs = {f"pm25_{y}_popw": f"Annual mean PM2.5 where people live, ug/m3, {y} (population-weighted; LGHAP v2 1 km)"
            for y in years}
    defs[f"share_pop_pm25_above_who_{y0}"] = f"Residents in a 1 km cell above WHO's 2021 annual PM2.5 guideline (5 ug/m3), %, {y0}"
    defs[f"share_pop_pm25_above_35_{y0}"] = (f"Residents in a 1 km cell above WHO's first interim target (35 ug/m3, its "
                                             f"least strict level), %, {y0}")
    if len(years) == 2:
        defs[f"pm25_change_{str(years[1])[2:]}_{str(years[0])[2:]}"] = f"Change in population-weighted PM2.5, {years[1]} to {years[0]}, ug/m3"
    pd.DataFrame([{"indicator": i, "definition": v, "source_key": "lghap", "publisher":
                   "Bai et al. (2024), LGHAP v2, Earth System Science Data; Zenodo 14280025", "licence": "CC BY 4.0"}
                  for i, v in defs.items()]).to_csv(HERE / "welfare_air_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks_air.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--years", type=int, nargs="+", default=YEARS, help="latest first; default 2021 2011")
    main(p.parse_args())
