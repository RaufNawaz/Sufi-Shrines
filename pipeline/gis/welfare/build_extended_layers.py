"""
Second wave of welfare layers, on the same population carrier as build_welfare_layers.py.

Run after build_welfare_layers.py and fetch_extended_sources.py. Adds, each checked before it is
written (welfare/checks_extended.csv, exit non-zero on any hard FAIL):

  DHS modelled surfaces   18 indicators from PDHS 2017-18 interpolated to 5 km by the DHS
                          Program (stunting, vaccination, antenatal care, facility births,
                          contraception, unmet need, literacy by sex, improved water, open
                          defecation, tobacco, bed nets). Each carries the DHS Program's own
                          out-of-sample validation correlation, read from its PDF.
  Malaria Atlas Project   P. vivax and P. falciparum incidence, 2024; walking-only travel time to
                          health care, 2020 (the motorized one is already in wave one)
  Kummu et al. (2025)     GDP per capita (PPP, 2017 int. $) 2013 and 2023, downscaled to the 32
                          divisions from provincial accounts
  UCDP GED 25.1           organised-violence events and deaths, 2015-2024
  Ookla open data         Speedtest-measured mobile and fixed download speeds, Q2 2025
  UNOSAT FL20220808PAK    share of residents inside the cumulative 2022 flood extent
  IPC                     share of the population in food-insecurity phase 3+ (latest analysis)

Every gridded value is sampled at the centre of each Kontur res-8 population cell and aggregated
with population weights, exactly as wave one does, so the two waves are comparable column for
column. Point data (conflict events, speed tests) are counted into units directly.

Usage (from the repo root):
  python pipeline/gis/welfare/build_extended_layers.py
"""
import csv, json, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import h3
import pdfplumber
import pyarrow.parquet as pq
from scipy.spatial import cKDTree

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_welfare_layers as bw          # noqa: E402  carrier, sampling and weighting
from fetch_sources import digest as _digest  # noqa: E402


def digest(path):
    return _digest(path, "sha256")

HERE = bw.HERE
SRC = bw.SRC
GPKG = bw.GPKG
CHECKS = []
CODEBOOK = {}     # indicator -> (definition, source_key, extra note)
UNITS = {"h3_id": "grid", "tehsil_code": "tehsil", "district_code": "district", "province_code": "province"}
PK_BBOX = (60.8, 23.6, 77.9, 37.1)


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference,
                   "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def spearman(a, b):
    x = pd.concat([a, b], axis=1).dropna()
    return x.iloc[:, 0].rank().corr(x.iloc[:, 1].rank()), len(x)


def coverage(k, col):
    return k.loc[k[col].notna(), "pop"].sum() / k["pop"].sum()


# ------------------------------------------------------------------------- DHS modelled surfaces
DHS_MS = {   # SDR id -> (column, short definition)
    "CNNUTSCHA2": ("dhsms_stunted", "Children under 5 stunted (height-for-age below -2 SD), %"),
    "CHVACCCBAS": ("dhsms_vacc_all_basic", "Children 12-23 months with all 8 basic vaccinations, %"),
    "CHVACCCDP1": ("dhsms_vacc_dpt1", "Children 12-23 months who received DPT1, %"),
    "CHVACCCDP3": ("dhsms_vacc_dpt3", "Children 12-23 months who received DPT3, %"),
    "CHVACSCMSL": ("dhsms_vacc_measles", "Children 12-23 months who received measles vaccine, %"),
    "CHVAC1CVCD": ("dhsms_vacc_card_seen", "Children 1-4 whose vaccination card was seen, %"),
    "RHANCNWN4P": ("dhsms_anc4", "Women with a recent live birth who had 4+ antenatal visits, %"),
    "RHDELPCDHF": ("dhsms_facility_delivery", "Live births delivered in a health facility, %"),
    "FPCUSMWMOD": ("dhsms_modern_contraception", "Married women using a modern contraceptive method, %"),
    "FPNADMWUNT": ("dhsms_unmet_need_fp", "Married women with an unmet need for family planning, %"),
    "FPNADMWPDM": ("dhsms_demand_satisfied_modern", "Demand for family planning satisfied by modern methods, %"),
    "EDLITRWLIT": ("dhsms_women_literate", "Women 15-49 who are literate, %"),
    "EDLITRMLIT": ("dhsms_men_literate", "Men 15-49 who are literate, %"),
    "WSSRCEPIMP": ("dhsms_improved_water", "Population in households with an improved drinking-water source, %"),
    "WSTLETPNFC": ("dhsms_open_defecation", "Population in households with no toilet facility (open defecation), %"),
    "AHTOBCMANY": ("dhsms_men_smoke", "Men who smoke any tobacco, %"),
    "MLITNAPACC": ("dhsms_itn_access", "Household population with access to an insecticide-treated bed net, %"),
}


def _undouble(line):
    """The DHS PDFs set bold text by printing every glyph twice ('CCoorr'): undo that per word."""
    return " ".join(w[::2] if len(w) > 1 and len(w) % 2 == 0 and all(w[i] == w[i + 1] for i in range(0, len(w), 2))
                    else w for w in line.split(" "))


def dhs_validation(pdf):
    text = "\n".join(_undouble(l) for p in pdfplumber.open(pdf).pages for l in (p.extract_text() or "").splitlines())
    m = re.search(r"Correlation\s+(\d+)%", text)
    return int(m.group(1)) / 100 if m else np.nan


def add_dhs_surfaces(k):
    print("DHS modelled surfaces (PDHS 2017-18)")
    # Invariant: no two published surfaces may be the same raster. On 17 Oct 2026 "Men who do not
    # smoke" (AHTOBCMNON, packaged Dec 2021) was byte-identical to "Men who smoke any tobacco"
    # (AHTOBCMANY, Aug 2022): its national mean came out 25.2 against DHS's 77.3. It is not used;
    # this check keeps the next such mix-up from entering silently.
    tifs = sorted((SRC / "dhs_ms").glob("PK2017DHS_*_MS_v01/*_MEAN_v01.tif"))
    seen = {}
    for t in tifs:
        seen.setdefault(digest(t), []).append(t.parent.name.split("_")[1])
    dup = [v for v in seen.values() if len(v) > 1]
    known = [["AHTOBCMANY", "AHTOBCMNON"]]
    check("DHS surfaces: no two MEAN rasters identical (except the known AHTOBCMNON copy, not used)", "integrity",
          f"{len(tifs)} rasters, identical groups: {dup or 'none'}", f"only {known}",
          sorted(map(sorted, dup)) == known and all(s_ not in DHS_MS for s_ in ["AHTOBCMNON"]))
    meta = []
    for sdr, (col, label) in DHS_MS.items():
        d = SRC / f"dhs_ms/PK2017DHS_{sdr}_MS_v01"
        mean = sample_clean(d / f"PK2017DHS_{sdr}_MS_MEAN_v01.tif", k, lo=0, hi=1)
        ci = sample_clean(d / f"PK2017DHS_{sdr}_MS_CI_v01.tif", k, lo=0, hi=1)
        k[col] = 100 * mean
        cor = dhs_validation(d / f"PK2017DHS_{sdr}_MS_v01.pdf")
        w = k["pop"].where(np.isfinite(ci))
        ci_w = 100 * np.nansum(ci * w) / np.nansum(w)
        txt = (d / f"PK2017DHS_{sdr}_MS_v01.txt").read_text()
        ind_id = re.search(r"Indicator Id:\s*(\S+)", txt).group(1)
        meta.append({"sdr": sdr, "col": col, "indicator_id": ind_id, "validation_cor": cor, "ci95_width_popw": ci_w})
        CODEBOOK[col] = (f"{label}. DHS Program modelled surface, 5 km, PDHS 2017-18; out-of-sample "
                         f"correlation {cor:.2f}, mean 95% interval width {ci_w:.0f} points", "dhs_ms")
        cov = coverage(k, col)
        check(f"{col} sampled for populated cells", "integrity", f"{cov:.2%} of people", ">= 98%", cov >= 0.98)
    meta = pd.DataFrame(meta)
    check("DHS validation correlation read from every PDF", "integrity",
          f"{meta.validation_cor.notna().sum()} of {len(meta)}", "all", meta.validation_cor.notna().all())
    return meta


def validate_dhs_surfaces(meta, prov, dist, census_d):
    """National pop-weighted surface mean against the DHS headline; provinces by rank."""
    nat = pd.DataFrame(json.load(open(SRC / "dhs_ms/api_ms_2017_national.json"))["Data"])
    nat = nat.sort_values("IsPreferred", ascending=False).drop_duplicates("IndicatorId").set_index("IndicatorId").Value
    sub = pd.DataFrame(json.load(open(SRC / "dhs_ms/api_ms_2017.json"))["Data"])
    sub = sub.sort_values("IsPreferred", ascending=False).drop_duplicates(["IndicatorId", "CharacteristicLabel"])
    code = {"Punjab excluding Islamabad (ICT)": "PK6", "Sindh": "PK7", "Balochistan": "PK2",
            "Gilgit Baltistan": "PK3", "Islamabad (ICT)": "PK4", "Azad, Jammu and Kashmir": "PK1"}
    # Khyber Pakhtunkhwa is left out of the province comparison: DHS reports it without the former
    # FATA, the boundary file's PK5 includes it.
    sub["province_code"] = sub.CharacteristicLabel.map(code)
    rows = []
    for r in meta.itertuples():
        nat_v = nat.get(r.indicator_id, np.nan)
        surf = prov[r.col]
        nat_s = bw_national[r.col]
        p = sub[(sub.IndicatorId == r.indicator_id) & sub.province_code.notna()].set_index("province_code").Value
        rho, n = spearman(surf, p.rename("dhs"))
        rows.append({"indicator": r.col, "dhs_national": nat_v, "surface_national_popw": round(nat_s, 1),
                     "province_rho": round(rho, 2) if n else np.nan, "n_provinces": n,
                     "validation_cor": r.validation_cor, "ci95_width_popw": round(r.ci95_width_popw, 1)})
        if np.isfinite(nat_v):
            # Two tiers. More than 15 points is a misread file (wrong scale, wrong indicator, a copy of
            # another surface - exactly how AHTOBCMNON was caught): FAIL. More than 5 is the surface
            # smoothing a skewed indicator or Kontur 2023 weights differing from the survey's: warn.
            gap = abs(nat_s - nat_v)
            check(f"{r.col}: national population-weighted mean vs DHS headline", "external",
                  f"{nat_s:.1f}", f"{nat_v:.1f} (DHS API, {r.indicator_id})", gap <= 15, hard=True,
                  note="> 15 points fails as a misread")
            if gap > 5:
                check(f"{r.col}: national mean more than 5 points from the headline", "external",
                      f"{nat_s - nat_v:+.1f} points", "within 5", False, hard=False,
                      note="smoothing or population weights; read the province ranking and the CI width")
        if n >= 5:
            check(f"{r.col}: province ranking vs DHS (excluding KP/FATA)", "external", f"rho = {rho:+.2f}, n = {n}",
                  "rho >= 0.6", rho >= 0.6, hard=False)
    out = pd.DataFrame(rows)
    out.to_csv(HERE / "dhs_surfaces_validation.csv", index=False)
    # Convergent: 2017-18 surfaces against Census 2023 at district level.
    m = census_d.join(dist, how="inner")
    for a, b, sign in [("dhsms_women_literate", "literacy_female", +1),
                       ("dhsms_men_literate", "literacy_male", +1),
                       ("dhsms_open_defecation", "no_toilet", +1),
                       ("dhsms_improved_water", "improved_water", +1),
                       ("dhsms_stunted", "literacy_female", -1),
                       ("dhsms_facility_delivery", "rwi_popw", +1)]:
        rho, n = spearman(m[a], m[b])
        check(f"{a} vs census/wave-one {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {n}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(rho) == sign and abs(rho) >= 0.4)


def sample_fast(path, lon, lat):
    """Same values as bw.sample (the pixel containing each point), read as one array and indexed:
    rasterio's per-point sample() made the 36 DHS rasters take ~15 minutes on 380k cells."""
    import rasterio
    with rasterio.open(path) as r:
        a = r.read(1).astype("float64")
        nd = r.nodata
        row, col = rasterio.transform.rowcol(r.transform, np.asarray(lon), np.asarray(lat))
    row, col = np.asarray(row), np.asarray(col)
    ok = (row >= 0) & (row < a.shape[0]) & (col >= 0) & (col < a.shape[1])
    v = np.full(len(row), np.nan)
    v[ok] = a[row[ok], col[ok]]
    if nd is not None:
        v[v == nd] = np.nan
    return v


def sample_clean(path, k, lo=None, hi=None):
    v = sample_fast(path, k.lon, k.lat)
    if lo is not None:
        v[(v < lo - 1e-6) | (v > hi + 1e-6)] = np.nan
    return v


# ------------------------------------------------------------------------- MAP rasters
def add_map(k):
    print("Malaria Atlas Project: malaria incidence 2024, walking time to care 2020")
    for s, name in [("pv", "P. vivax"), ("pf", "P. falciparum")]:
        v = sample_clean(SRC / f"map/{s}_incidence_rate_2024.tif", k, lo=0, hi=5)
        k[f"malaria_{s}_per_1000"] = 1000 * v
        CODEBOOK[f"malaria_{s}_per_1000"] = (f"{name} malaria clinical incidence, cases per 1,000 people per year, 2024 "
                                             "(MAP 2026 release, modelled)", f"map_{s}")
        cov = coverage(k, f"malaria_{s}_per_1000")
        # MAP's raster has no-data cells scattered through populated land (Karachi's edges, the Makran
        # coast, parts of Thal): ~1.9% of people on 17 Oct 2026. Left empty, never filled with 0.
        check(f"malaria_{s} sampled for populated cells", "integrity", f"{cov:.2%} of people", ">= 97%", cov >= 0.97,
              note="the rest fall on MAP no-data cells and stay empty")
    k["walk_health_min"] = sample_clean(SRC / "map/walking_travel_time_to_healthcare_2020.tif", k, lo=0, hi=1e5)
    cov = coverage(k, "walk_health_min")
    check("walk_health_min sampled for populated cells", "integrity", f"{cov:.2%} of people", ">= 99%", cov >= 0.99)
    rho = k[["walk_health_min", "travel_health_min"]].dropna().sample(50000, random_state=1).rank().corr().iloc[0, 1]
    check("walking vs motorized time to health care, cells", "convergent", f"rho = {rho:+.2f}", "rho >= 0.8", rho >= 0.8)
    CODEBOOK["walk_health_min_popw"] = ("Walking-only travel time to the nearest health facility, minutes, "
                                        "population-weighted, 2020", "map_walk")
    CODEBOOK["share_pop_within_60min_walk_health"] = ("Share of population within a 60-minute walk of a health facility",
                                                     "map_walk")


# ------------------------------------------------------------------------- Kummu GDP per capita
def add_gdp(k):
    print("GDP per capita (Kummu et al. 2025), 32 divisions")
    g = gpd.read_file(SRC / "kummu/polyg_adm2_gdp_perCapita_1990_2024.gpkg", where="iso3='PAK'")
    check("Kummu Pakistan admin-2 units", "integrity", f"{len(g)}", "32 (GADM divisions)", len(g) == 32, hard=False)
    pts = gpd.GeoDataFrame(geometry=gpd.points_from_xy(k.lon, k.lat), crs=4326)
    j = gpd.sjoin(pts, g[["NAME_2", "2013", "2023", "geometry"]].to_crs(4326), how="left", predicate="within")
    j = j[~j.index.duplicated()]
    k["gdp_pc_2023"] = pd.to_numeric(j["2023"], errors="coerce").to_numpy()
    k["gdp_pc_2013"] = pd.to_numeric(j["2013"], errors="coerce").to_numpy()
    cov = coverage(k, "gdp_pc_2023")
    check("GDP per capita found for populated cells", "integrity", f"{cov:.2%} of people", ">= 97%", cov >= 0.97,
          note="Cells on the Line of Control and the coast can fall between GADM and OCHA outlines")
    nat = pd.read_csv(SRC / "kummu/tabulated_adm0_gdp_perCapita.csv")
    nat = nat[nat.iso3 == "PAK"].iloc[0]
    ours = np.nansum(k.gdp_pc_2023 * k["pop"]) / k.loc[k.gdp_pc_2023.notna(), "pop"].sum()
    check("GDP per capita 2023, population-weighted national mean vs Kummu's national figure", "external",
          f"{ours:,.0f}", f"{float(nat['2023']):,.0f} (tabulated_adm0)", abs(ours / float(nat["2023"]) - 1) < 0.15,
          note="Kummu downscales with their own population grid; Kontur 2023 weights differ")
    CODEBOOK["gdp_pc_2023_popw"] = ("GDP per capita, PPP, constant 2017 international $, 2023: provincial accounts "
                                    "downscaled to 32 divisions (Kummu et al. 2025). Division-level, so it does not "
                                    "vary within a division", "kummu")
    CODEBOOK["gdp_pc_growth_13_23"] = ("Annual growth of GDP per capita 2013-2023, %, same source", "kummu")


# ------------------------------------------------------------------------- Ookla
def ookla_tiles(kind):
    t = pq.read_table(SRC / f"ookla/2025-04-01_performance_{kind}_tiles.parquet",
                      columns=["tile_x", "tile_y", "avg_d_kbps", "avg_u_kbps", "avg_lat_ms", "tests", "devices"],
                      filters=[("tile_x", ">=", PK_BBOX[0]), ("tile_x", "<=", PK_BBOX[2]),
                               ("tile_y", ">=", PK_BBOX[1]), ("tile_y", "<=", PK_BBOX[3])]).to_pandas()
    return t


def place_points(df, lon, lat, teh):
    pts = gpd.GeoDataFrame(df, geometry=gpd.points_from_xy(df[lon], df[lat]), crs=4326)
    j = gpd.sjoin(pts, teh[["tehsil_code", "district_code", "province_code", "geometry"]], how="inner", predicate="within")
    j = j[~j.index.duplicated()].drop(columns=["geometry", "index_right"])
    j["h3_id"] = [h3.latlng_to_cell(a, b, 6) for a, b in zip(j[lat], j[lon])]
    return pd.DataFrame(j)


def ookla(k, teh):
    print("Ookla Speedtest open data, Q2 2025")
    out = {}
    xy = gpd.GeoSeries(gpd.points_from_xy(k.lon, k.lat), crs=4326).to_crs(bw.PK_LAEA)
    kxy = np.c_[xy.x, xy.y]
    for kind in ["mobile", "fixed"]:
        t = place_points(ookla_tiles(kind), "tile_x", "tile_y", teh)
        t["mbps_x_tests"] = t.avg_d_kbps / 1000 * t.tests
        check(f"Ookla {kind} tiles inside Pakistan", "integrity", f"{len(t):,} tiles, {t.tests.sum():,} tests",
              "> 1,000 tiles", len(t) > 1000)
        for by in UNITS:
            g = t.groupby(by)[["mbps_x_tests", "tests", "devices"]].sum()
            out[(by, f"{kind}_download_mbps")] = g.mbps_x_tests / g.tests
            out[(by, f"{kind}_tests")] = g.tests
            out[(by, f"{kind}_devices")] = g.devices
        if kind == "mobile":
            txy = gpd.GeoSeries(gpd.points_from_xy(t.tile_x, t.tile_y), crs=4326).to_crs(bw.PK_LAEA)
            d, _ = cKDTree(np.c_[txy.x, txy.y]).query(kxy, k=1, distance_upper_bound=1000)
            k["near_mobile_test"] = np.isfinite(d).astype(float)
    CODEBOOK["mobile_download_mbps"] = ("Average mobile download speed in Speedtest results, Mbps, Q2 2025, weighted by "
                                        "tests. Measures where people test, which skews to smartphone users", "ookla")
    CODEBOOK["fixed_download_mbps"] = ("Average fixed-broadband download speed in Speedtest results, Mbps, Q2 2025, "
                                       "weighted by tests", "ookla")
    CODEBOOK["mobile_devices_per_1000"] = ("Distinct devices running a mobile Speedtest in Q2 2025 per 1,000 people: "
                                           "a smartphone-internet use proxy, not a subscription count", "ookla")
    CODEBOOK["fixed_devices_per_1000"] = ("Distinct devices running a fixed-broadband Speedtest in Q2 2025 per 1,000 "
                                          "people: a home-broadband proxy", "ookla")
    CODEBOOK["share_pop_near_mobile_test"] = ("Share of population within 1 km of a ~600 m tile with at least one mobile "
                                              "Speedtest in Q2 2025: a floor on mobile-data use reaching people", "ookla")
    return out


# ------------------------------------------------------------------------- UCDP GED
def ucdp(teh):
    print("UCDP GED 25.1, Pakistan 2015-2024")
    e = pd.read_csv(SRC / "ucdp/GEDEvent_v25_1.csv",
                    usecols=["id", "country", "year", "where_prec", "best", "deaths_civilians", "type_of_violence",
                             "latitude", "longitude"])
    e = e[(e.country == "Pakistan") & e.year.between(2015, 2024)]
    tot = e.best.sum()
    placed = place_points(e, "longitude", "latitude", teh)
    share = placed[placed.where_prec <= 3].best.sum() / tot
    check("UCDP deaths 2015-2024 located to district precision or better", "integrity",
          f"{share:.1%} of {tot:,} deaths", ">= 80%", share >= 0.8)
    out = {}
    # where_prec: 1 exact place, 2 within 25 km, 3 second-order unit (district), 4 province.
    for by, maxprec in [("h3_id", 2), ("tehsil_code", 2), ("district_code", 3), ("province_code", 4)]:
        x = placed[placed.where_prec <= maxprec].groupby(by)
        out[(by, "conflict_events")] = x.size()
        out[(by, "conflict_deaths")] = x.best.sum()
        out[(by, "conflict_civilian_deaths")] = x.deaths_civilians.sum()
    CODEBOOK["conflict_deaths_per_100k"] = ("Deaths in organised violence 2015-2024 (UCDP GED 25.1 best estimate) per "
                                            "100,000 residents. Hexagon and tehsil use events located within 25 km; "
                                            "district adds district-located events; province adds province-located", "ucdp")
    CODEBOOK["conflict_civilian_deaths_per_100k"] = ("Civilian deaths in organised violence 2015-2024 per 100,000", "ucdp")
    CODEBOOK["conflict_events"] = ("Organised-violence events 2015-2024 (UCDP GED 25.1), count", "ucdp")
    return out


# ------------------------------------------------------------------------- UNOSAT flood 2022
FLOODS = {   # column -> (UNOSAT shapefile, description). Named, not globbed: the package also holds
             # "AnalysisExtent" and "CloudObstruction" layers that a pattern would pick up.
    "flooded_2022": ("VIIRS_20220701_20220831_FloodExtent_PAK", "cumulative VIIRS flood extent, 1 July-31 August 2022"),
    "flooded_2010": ("Terra_Modis_20100827_FloodExtent_PAK", "MODIS flood extent, 27 August 2010"),
}


def flood(k):
    print("UNOSAT flood extents, 2022 and 2010")
    d = SRC / "unosat/FL20220808PAK_SHP/FL20220808PAK_SHP"
    pts = gpd.GeoDataFrame(geometry=gpd.points_from_xy(k.lon, k.lat), crs=4326)
    for col, (name, desc) in FLOODS.items():
        shp = d / f"{name}.shp"
        if not shp.exists():
            check(f"{name}.shp present", "integrity", "missing", "present", False)
            continue
        f = gpd.read_file(shp).to_crs(4326)
        j = gpd.sjoin(pts, f[["geometry"]], how="inner", predicate="within")
        inside = np.zeros(len(k), dtype=bool)
        inside[np.unique(j.index.to_numpy())] = True
        k[col] = inside.astype(float)
        exp = k.loc[inside, "pop"].sum()
        print(f"    {name}: {len(f)} polygons, {exp / 1e6:.2f} M residents (Kontur 2023) inside")
        if col == "flooded_2022":
            check("people inside the 2022 flood extent (Kontur 2023)", "external", f"{exp / 1e6:.1f} M",
                  "UNOSAT's own 27.9 M exposed, 1-31 Aug 2022 (population exposure XLSX): same order",
                  0.2 < exp / 27.9e6 < 3, hard=False,
                  note="Different snapshot (Jul-Aug cumulative), population base and cell-centre rule")
        CODEBOOK[col.replace("flooded", "share_pop_flooded")] = (
            f"Share of 2023 residents whose ~0.7 km2 cell centre lies inside UNOSAT's {desc}. Exposure of "
            "today's population to that flood's footprint, not the number affected at the time", "unosat")


# ------------------------------------------------------------------------- IPC
def ipc(dist):
    print("IPC acute food insecurity (district, latest analysis per area)")
    a = pd.read_csv(SRC / "ipc/ipc_pak_area_long.csv")
    a = a[(a["Validity period"] == "current") & a.Phase.isin(["all", "3+"])]
    a["date"] = pd.to_datetime(a["Date of analysis"], format="%b %Y")
    w = a.pivot_table(index=["Area", "date"], columns="Phase", values="Number", aggfunc="sum").reset_index()
    w = w.sort_values("date").drop_duplicates("Area", keep="last")
    norm = lambda s: re.sub(r"[^a-z]", "", str(s).lower())
    dn = dist.assign(n=dist.district_name.map(norm))[["district_code", "n"]]
    alias = {"deraismailkhan": "dikhan", "qambarshahdadkot": "kambarshahdadkot"}   # OCHA spellings
    w["n"] = w.Area.map(norm).replace(alias)
    m = w.merge(dn, on="n", how="left")
    check("IPC areas matched to a district by name", "integrity",
          f"{m.district_code.notna().sum()} of {len(m)}" + (f"; unmatched {sorted(m[m.district_code.isna()].Area)}"
                                                           if m.district_code.isna().any() else ""),
          ">= 90%", m.district_code.notna().mean() >= 0.9, hard=False)
    m = m.dropna(subset=["district_code"]).groupby("district_code").agg(
        ipc3=("3+", "sum"), ipcall=("all", "sum"), date=("date", "max"))
    m["ipc_phase3plus"] = (100 * m.ipc3 / m.ipcall).round(1)
    m["ipc_analysis"] = m.date.dt.strftime("%b %Y")
    CODEBOOK["ipc_phase3plus"] = ("Population in IPC phase 3+ (crisis or worse), %, latest current-period analysis of "
                                  "the district; only districts the IPC has analysed (mostly Balochistan, Sindh and KP)",
                                  "ipc")
    return m[["ipc_phase3plus", "ipc_analysis"]]


# ------------------------------------------------------------------------- aggregation
def aggregate(k, by, counts):
    cols = [c for c in list(DHS_MS_COLS) + ["malaria_pv_per_1000", "malaria_pf_per_1000", "walk_health_min",
                                            "gdp_pc_2023", "gdp_pc_2013", "near_mobile_test", "flooded_2022", "flooded_2010"]
            if c in k.columns]
    g = bw.wavg(k, by, cols)
    pop = k.groupby(by)["pop"].sum()
    g = g.rename(columns={"walk_health_min": "walk_health_min_popw", "gdp_pc_2023": "gdp_pc_2023_popw",
                          "near_mobile_test": "share_pop_near_mobile_test", "flooded_2022": "share_pop_flooded_2022",
                          "flooded_2010": "share_pop_flooded_2010"})
    g["share_pop_within_60min_walk_health"] = 100 * k.assign(x=(k.walk_health_min <= 60) * k["pop"]).groupby(by).x.sum() / pop
    for c in ["share_pop_near_mobile_test", "share_pop_flooded_2022", "share_pop_flooded_2010"]:
        if c in g:
            g[c] = 100 * g[c]
    if "gdp_pc_2013" in g:
        g["gdp_pc_growth_13_23"] = 100 * ((g.gdp_pc_2023_popw / g.gdp_pc_2013) ** 0.1 - 1)
        g = g.drop(columns="gdp_pc_2013")
    for (b, name), s in counts.items():
        if b == by:
            g[name] = s.reindex(g.index)
    for name in ["conflict_events", "conflict_deaths", "conflict_civilian_deaths", "mobile_tests", "fixed_tests",
                 "mobile_devices", "fixed_devices"]:
        if name in g:
            g[name] = g[name].fillna(0)
    g["conflict_deaths_per_100k"] = 1e5 * g.conflict_deaths / pop
    g["conflict_civilian_deaths_per_100k"] = 1e5 * g.conflict_civilian_deaths / pop
    g["mobile_devices_per_1000"] = 1000 * g.mobile_devices / pop
    g["fixed_devices_per_1000"] = 1000 * g.fixed_devices / pop
    g = g.drop(columns=["conflict_deaths", "conflict_civilian_deaths", "mobile_tests", "fixed_tests",
                        "mobile_devices", "fixed_devices"], errors="ignore")
    return g.round(4)


DHS_MS_COLS = [v[0] for v in DHS_MS.values()]
bw_national = {}


def main():
    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    dist = gpd.read_file(GPKG, layer="admin_district")
    prov = gpd.read_file(GPKG, layer="admin_province")
    grid = gpd.read_file(GPKG, layer="grid_h3_r6")
    census_d = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    wave1_d = gpd.read_file(GPKG, layer="welfare_district", ignore_geometry=True).set_index("district_code")

    k = bw.carrier_cells(teh)
    # travel_health_min from wave one, for the walking-vs-motorized check.
    k["travel_health_min"] = bw.sample(SRC / "map/motorized_travel_time_to_healthcare_2020.tif", k.lon, k.lat)
    # The fast sampler must agree exactly with wave one's on a raster wave one used.
    s = k.sample(5000, random_state=7)
    a = sample_fast(SRC / "map/motorized_travel_time_to_healthcare_2020.tif", s.lon, s.lat)
    same = np.allclose(a, s.travel_health_min.to_numpy(), equal_nan=True)
    check("fast raster sampler equals wave one's rasterio.sample on 5,000 cells", "integrity",
          "identical" if same else f"{np.sum(~np.isclose(a, s.travel_health_min, equal_nan=True))} differ",
          "identical", same)
    meta = add_dhs_surfaces(k)
    add_map(k)
    add_gdp(k)
    counts = {}
    counts.update(ookla(k, teh))
    counts.update(ucdp(teh))
    flood(k)

    for c in DHS_MS_COLS:
        bw_national[c] = np.nansum(k[c] * k["pop"]) / k.loc[k[c].notna(), "pop"].sum()
    out = {by: aggregate(k, by, counts) for by in UNITS}
    out["district_code"] = out["district_code"].join(ipc(dist))

    validate_dhs_surfaces(meta, out["province_code"], out["district_code"],
                          census_d.join(wave1_d[["rwi_popw"]], how="left"))
    d = census_d.join(out["district_code"], how="inner").join(wave1_d[["rwi_popw", "ntl_2023_popw"]], how="left")
    for a, b, sign in [("mobile_devices_per_1000", "rwi_popw", +1), ("fixed_devices_per_1000", "urban_share", +1),
                       ("mobile_download_mbps", "ntl_2023_popw", +1), ("gdp_pc_2023_popw", "rwi_popw", +1),
                       ("walk_health_min_popw", "literacy", -1)]:
        rho, n = spearman(d[a], d[b])
        check(f"{a} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {n}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.3", np.sign(rho) == sign and abs(rho) >= 0.3)
    if "share_pop_flooded_2022" in d:
        ex = pd.read_excel(SRC / "unosat/UNOSAT_Population_Exposure_FL20220808PAK.xlsx", sheet_name="Stat. (01-31 Aug. 2022)")
        ex.columns = ["c", "p", "district", "area", "flood_km2", "pop", "exposed", "share"]
        ex = ex.dropna(subset=["district"])
        norm = lambda s: re.sub(r"[^a-z]", "", str(s).lower())
        ex["n"] = ex.district.map(norm)
        dn = dist.assign(n=dist.district_name.map(norm)).set_index("n").district_code
        ex["district_code"] = ex.n.map(dn)
        ex = ex.dropna(subset=["district_code"]).groupby("district_code")[["exposed", "pop"]].sum()
        rho, n = spearman(d.share_pop_flooded_2022, (ex.exposed / ex["pop"]).rename("unosat"))
        check("share flooded vs UNOSAT's own district exposure, Aug 2022", "external", f"rho = {rho:+.2f}, n = {n}",
              "rho >= 0.6", rho >= 0.6)

    # Write: one layer per unit with keys, geometry and every wave-two column.
    keys = {"h3_id": grid[["h3_id", "tehsil_code", "district_code", "province_code", "geometry"]],
            "tehsil_code": teh[["tehsil_code", "tehsil_name", "district_code", "province_code", "geometry"]],
            "district_code": dist[["district_code", "district_name", "province_code", "geometry"]],
            "province_code": prov[["province_code", "province_name", "geometry"]]}
    for by, unit in UNITS.items():
        g = keys[by].merge(out[by].reset_index(), on=by, how="left" if by != "h3_id" else "inner")
        gpd.GeoDataFrame(g, geometry="geometry", crs=4326).to_file(GPKG, layer=f"welfare_ext_{unit}", driver="GPKG")
        if by != "h3_id":
            g.drop(columns="geometry").to_csv(HERE / f"welfare_ext_{unit}.csv", index=False)
    src = pd.read_csv(HERE / "sources_extended.tsv", sep="\t")
    cb = pd.DataFrame([{"indicator": i, "definition": v[0], "source_key": v[1]} for i, v in CODEBOOK.items()])
    cb = cb.merge(src[["key", "publisher", "licence"]], left_on="source_key", right_on="key", how="left").drop(columns="key")
    missing = cb[cb.publisher.isna()].source_key.unique()
    check("every extended indicator's source is listed in sources_extended.tsv", "integrity",
          "all" if not len(missing) else f"missing {list(missing)}", "all", not len(missing))
    cb.to_csv(HERE / "welfare_ext_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks_extended.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    for layer, df in [("welfare_ext_codebook", cb), ("welfare_ext_checks", pd.DataFrame(CHECKS))]:
        gpd.GeoDataFrame(df, geometry=[None] * len(df)).to_file(GPKG, layer=layer, driver="GPKG")

    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
