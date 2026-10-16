"""
Welfare layers on top of shrines_foundation.gpkg, each one checked before it is written.

Run after build_foundation.py and build_census_outcomes.py (it reads the census outcomes to
validate the new sources against them), and after fetch_sources.py.

How every gridded source reaches the foundation's units
-------------------------------------------------------
Kontur's population hexagons (H3 resolution 8, ~0.74 km2, 380,718 populated cells) are the
carrier. Each populated res-8 cell gets a value from every source (raster sampled at its centre;
RWI from the nearest wealth tile within 2.5 km), is placed in a tehsil by point-in-polygon, and
then everything is aggregated with population weights to the res-6 grid, tehsil, district and
province. So "district RWI" means the wealth of the average *resident*, not of the average square
kilometre, and an empty desert does not drag a district's score down.

What "verified" means here
--------------------------
Every claim this script makes about a source is a row in the `welfare_checks` layer and in
welfare/checks.csv: what was measured, what it was compared against, pass or FAIL. The script
exits non-zero if any hard check fails (RULE 4). The comparisons are of three kinds:
  * integrity  - file hashes against the publisher's own (where one is published)
  * external   - a total or value against an independent official figure
  * convergent - the new measure against Census 2023 at district level: a wealth index that
                 did not track literacy, electricity and toilets would be measuring something else

Usage (from the repo root):
  python pipeline/gis/welfare/build_welfare_layers.py
"""
import csv, json, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import h3
import rasterio
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
SRC = GIS / "sources"
GPKG = GIS / "shrines_foundation.gpkg"
PK_LAEA = "+proj=laea +lat_0=30 +lon_0=69 +datum=WGS84 +units=m +no_defs"
CHECKS = []

# Official figures used as external references. Each is cited where it is used.
CENSUS_2023_POP_4PROV_ICT = 241.5e6       # PBS Census 2023 headline (four provinces + ICT)
PES_2021_22_INSTITUTIONS = 313_418        # Pakistan Education Statistics 2021-22 (PIE), via Dawn
# https://hdr.undp.org/sites/default/files/Country-Profiles/MPI2024/PAK.pdf, read 16 Oct 2026:
# "Pakistan 2017/2018 0.198 38.3 51.7 12.9 21.5" (MPI, H %, A %, vulnerable %, severe %).
UNDP_MPI_2024_PAK = (0.198, 38.3, 51.7, 12.9, 21.5)


def check(name, kind, measured, reference, ok, hard=True, note=""):
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference,
                   "result": "pass" if ok else ("FAIL" if hard else "warn"), "note": note})
    print(f"  [{'pass' if ok else ('FAIL' if hard else 'warn')}] {name}: {measured} vs {reference}")


def wavg(df, by, cols, w="pop"):
    """Population-weighted means of cols, ignoring missing values cell by cell."""
    out = {}
    for c in cols:
        m = df[c].notna() & (df[w] > 0)
        g = df[m].assign(_x=df.loc[m, c] * df.loc[m, w]).groupby(by)
        out[c] = g["_x"].sum() / g[w].sum()
    return pd.DataFrame(out)


def sample(path, lon, lat, nodata_extra=()):
    with rasterio.open(path) as r:
        v = np.array([x[0] for x in r.sample(zip(lon, lat))], dtype="float64")
        nd = [r.nodata, *nodata_extra]
    for n in nd:
        if n is not None:
            v[v == n] = np.nan
    return v


# --------------------------------------------------------------------------------------------
def carrier_cells(teh):
    """Kontur res-8 population cells, located in tehsils and res-6 parents."""
    print("population carrier (Kontur 2023)")
    k = gpd.read_file(SRC / "kontur/kontur_population_PK_20231101.gpkg", ignore_geometry=True)
    lat, lon = np.array([h3.cell_to_latlng(c) for c in k.h3]).T
    k["lat"], k["lon"] = lat, lon
    k["h3_id"] = [h3.cell_to_parent(c, 6) for c in k.h3]
    k = k.rename(columns={"population": "pop"})
    pts = gpd.GeoDataFrame(k, geometry=gpd.points_from_xy(k.lon, k.lat), crs=4326)
    j = gpd.sjoin(pts, teh[["tehsil_code", "district_code", "province_code", "geometry"]],
                  how="left", predicate="within")
    j = j[~j.index.duplicated()]
    k[["tehsil_code", "district_code", "province_code"]] = j[["tehsil_code", "district_code",
                                                              "province_code"]].values
    inside = k.tehsil_code.notna()
    check("Kontur cells fall inside the boundary file", "integrity",
          f"{inside.mean():.4%} of cells, {k.loc[inside, 'pop'].sum() / k['pop'].sum():.4%} of people",
          ">= 99% of people", k.loc[inside, "pop"].sum() / k["pop"].sum() >= 0.99)
    return k[inside].reset_index(drop=True)


def add_sources(k, census_d):
    xy = gpd.GeoSeries(gpd.points_from_xy(k.lon, k.lat), crs=4326).to_crs(PK_LAEA)
    kxy = np.c_[xy.x, xy.y]

    # Kontur population against the census, four provinces + ICT, and district by district.
    print("Kontur population")
    four = k.province_code.isin(["PK2", "PK4", "PK5", "PK6", "PK7"])
    tot = k.loc[four, "pop"].sum()
    check("Kontur population, four provinces + ICT", "external", f"{tot / 1e6:.1f} M",
          f"Census 2023 {CENSUS_2023_POP_4PROV_ICT / 1e6:.1f} M (PBS)",
          abs(tot / CENSUS_2023_POP_4PROV_ICT - 1) < 0.10, note="Kontur is modelled, released 2023-11")
    dpop = k.groupby("district_code")["pop"].sum()
    m = census_d.join(dpop.rename("kontur_pop"), how="inner")
    r = np.corrcoef(np.log(m.pop2023), np.log(m.kontur_pop))[0, 1]
    check("Kontur vs census district population (log r)", "external", f"r = {r:.3f}, n = {len(m)}",
          "r >= 0.90", r >= 0.90)

    # Relative Wealth Index: nearest tile within 2.5 km (tiles are ~2.4 km across).
    print("Relative Wealth Index (Meta)")
    rwi = pd.read_csv(SRC / "rwi/ind_pak_relative_wealth_index.csv")
    rxy = gpd.GeoSeries(gpd.points_from_xy(rwi.longitude, rwi.latitude), crs=4326).to_crs(PK_LAEA)
    d, i = cKDTree(np.c_[rxy.x, rxy.y]).query(kxy, k=1, distance_upper_bound=2500)
    hit = np.isfinite(d)
    k["rwi"] = np.where(hit, rwi.rwi.to_numpy()[np.minimum(i, len(rwi) - 1)], np.nan)
    k["rwi_error"] = np.where(hit, rwi.error.to_numpy()[np.minimum(i, len(rwi) - 1)], np.nan)
    cov = k.loc[hit, "pop"].sum() / k["pop"].sum()
    check("RWI tile found for populated cells", "integrity", f"{cov:.2%} of people", ">= 95%", cov >= 0.95)

    # Night lights 2013 and 2023, travel times. DN 0 is real darkness, not missing.
    print("night lights, travel times")
    k["ntl_2023"] = sample(SRC / "ntl/Harmonized_DN_NTL_2023_simVIIRS.tif", k.lon, k.lat)
    k["ntl_2013"] = sample(SRC / "ntl/DN_NTL_2013_simVIIRS.tif", k.lon, k.lat)
    k["travel_city_min"] = sample(SRC / "map/accessibility_to_cities_2015.tif", k.lon, k.lat)
    k["travel_health_min"] = sample(SRC / "map/motorized_travel_time_to_healthcare_2020.tif", k.lon, k.lat)
    for c in ["ntl_2023", "ntl_2013", "travel_city_min", "travel_health_min"]:
        cov = k.loc[k[c].notna(), "pop"].sum() / k["pop"].sum()
        check(f"{c} sampled for populated cells", "integrity", f"{cov:.2%} of people", ">= 99%", cov >= 0.99)
    k["lit_2023"] = (k.ntl_2023 > 0).astype(float)
    return k


def aggregate(k, by):
    cols = ["rwi", "ntl_2023", "ntl_2013", "travel_city_min", "travel_health_min", "lit_2023"]
    g = wavg(k, by, cols)
    g.columns = ["rwi_popw", "ntl_2023_popw", "ntl_2013_popw", "travel_city_min_popw",
                 "travel_health_min_popw", "share_pop_lit_at_night"]
    g["share_pop_lit_at_night"] = (100 * g.share_pop_lit_at_night).round(2)
    g["pop_kontur_2023"] = k.groupby(by)["pop"].sum().round(0)
    g["share_pop_within_60min_city"] = (100 * k.assign(x=(k.travel_city_min <= 60) * k["pop"])
                                        .groupby(by).x.sum() / g.pop_kontur_2023).round(2)
    g["share_pop_within_30min_health"] = (100 * k.assign(x=(k.travel_health_min <= 30) * k["pop"])
                                          .groupby(by).x.sum() / g.pop_kontur_2023).round(2)
    g["rwi_cell_share"] = (100 * k.assign(x=k.rwi.notna() * k["pop"]).groupby(by).x.sum()
                           / g.pop_kontur_2023).round(2)
    g["ntl_change_13_23"] = (g.ntl_2023_popw - g.ntl_2013_popw).round(3)
    return g.round(4)


def validate_against_census(dist, census_d):
    print("convergent validity against Census 2023 (districts)")
    m = census_d.join(dist, how="inner")
    tests = [("rwi_popw", "literacy", +1), ("rwi_popw", "electricity", +1),
             ("rwi_popw", "flush_toilet", +1), ("rwi_popw", "out_of_school_5_16", -1),
             ("ntl_2023_popw", "urban_share", +1), ("ntl_2023_popw", "electricity", +1),
             ("travel_city_min_popw", "urban_share", -1), ("travel_city_min_popw", "literacy", -1),
             ("travel_health_min_popw", "literacy", -1)]
    for a, b, sign in tests:
        x = m[[a, b]].dropna()
        r = x[a].rank().corr(x[b].rank())        # Spearman: robust to skewed travel times
        check(f"{a} vs census {b}", "convergent", f"rho = {r:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(r) == sign and abs(r) >= 0.4)
    return m


def province_layer(prov):
    print("DHS 2017-18 and OPHI MPI (province level)")
    q = pd.read_csv(SRC / "dhs/dhs-quickstats_subnational_pak.csv", skiprows=[1])
    # One value per indicator and region: DHS's own preferred breakdown (mortality is the 10 years
    # before the survey, facility delivery the 2 years), else the only one published (partner
    # violence: ever-married women). Filtering on ByVariableId == 0 silently dropped four indicators.
    def preferred(t):
        return (t.sort_values("IsPreferred", ascending=False)
                 .drop_duplicates(["IndicatorId", "CharacteristicLabel"]))
    q = preferred(q[q.SurveyYear == 2017])
    api = preferred(pd.DataFrame(json.load(open(SRC / "dhs/api_2017.json"))["Data"]))
    name_to_code = {"Punjab excluding Islamabad (ICT)": "PK6", "Sindh": "PK7",
                    "Khyber Pakhtunkhwa": "PK5", "Balochistan": "PK2", "Gilgit Baltistan": "PK3",
                    "Islamabad (ICT)": "PK4", "Azad, Jammu and Kashmir": "PK1",
                    "Federally Administered Tribal Areas": "FATA"}
    keep = {"CM_ECMR_C_U5M": "dhs_under5_mortality", "CM_ECMR_C_IMR": "dhs_infant_mortality",
            "CN_NUTS_C_HA2": "dhs_stunted", "CN_NUTS_C_WH2": "dhs_wasted",
            "CN_NUTS_C_WA2": "dhs_underweight", "CH_VACC_C_BAS": "dhs_fully_vaccinated",
            "RH_DELP_C_DHF": "dhs_facility_delivery", "ED_LITR_W_LIT": "dhs_women_literate",
            "ED_EDUC_W_SEH": "dhs_women_secondary_plus", "HC_ELEC_H_ELC": "dhs_hh_electricity",
            "FE_FRTR_W_TFR": "dhs_tfr", "FP_CUSM_W_MOD": "dhs_modern_contraception",
            "DV_SPVL_W_POS": "dhs_partner_violence"}
    q = q[q.IndicatorId.isin(keep) & q.CharacteristicLabel.isin(name_to_code)]
    # Every value this layer uses must be present in the DHS API too, and equal to it.
    both = q.merge(api[["IndicatorId", "CharacteristicLabel", "ByVariableId", "Value"]],
                   on=["IndicatorId", "CharacteristicLabel", "ByVariableId"], how="left",
                   suffixes=("_hdx", "_api"))
    agree = (both.Value_hdx - both.Value_api).abs() < 1e-9
    check("DHS values used: HDX copy vs DHS Program API", "external",
          f"{agree.sum()} of {len(both)} identical ({both.Value_api.isna().sum()} absent from API)",
          "all present and identical", bool(agree.all()) and len(both) > 0)
    missing = sorted(set(keep) - set(q.IndicatorId))
    check("DHS indicators requested vs found in HDX quickstats", "integrity",
          f"{len(keep) - len(missing)} of {len(keep)}" + (f"; missing {missing}" if missing else ""),
          "all", not missing)
    q["province_code"] = q.CharacteristicLabel.map(name_to_code)
    w = q.pivot_table(index="province_code", columns="IndicatorId", values="Value").rename(columns=keep)

    mpi = pd.read_csv(SRC / "ophi/pak_mpi.csv")
    mpi["province_code"] = mpi["Admin 1 PCode"].fillna(
        mpi["Admin 1 Name"].map({"Federally Administered Tribal Areas (FATA)": "FATA"}))
    nat = mpi[mpi["Admin 1 Name"].isna()].iloc[0]
    got = [nat.MPI, nat["Headcount Ratio"], nat["Intensity of Deprivation"],
           nat["Vulnerable to Poverty"], nat["In Severe Poverty"]]
    ok = all(abs(g - e) <= tol for g, e, tol in zip(got, UNDP_MPI_2024_PAK, [5e-4, .05, .05, .05, .05]))
    check("OPHI national MPI, H, A, vulnerable, severe (2017-18)", "external",
          " / ".join(f"{v:g}" for v in got),
          " / ".join(f"{v:g}" for v in UNDP_MPI_2024_PAK) + " (UNDP HDR MPI 2024 country profile, PAK.pdf)", ok)
    mpi = mpi.dropna(subset=["province_code"]).set_index("province_code")[
        ["MPI", "Headcount Ratio", "Intensity of Deprivation", "Vulnerable to Poverty", "In Severe Poverty"]]
    mpi.columns = ["mpi", "mpi_headcount", "mpi_intensity", "mpi_vulnerable", "mpi_severe"]
    out = w.join(mpi, how="outer")
    out.loc["FATA", "note"] = ("Merged into Khyber Pakhtunkhwa in 2018; no polygon of its own in the "
                               "boundary file. Its DHS under-5 mortality (33) is the lowest of any "
                               "region while its MPI is the highest: read with caution.")
    g = prov[["province_code", "province_name", "geometry"]].merge(out.reset_index(), on="province_code", how="right")

    # Convergent: DHS 2017 household electricity vs census 2023 household electricity, by province.
    return g


def heigit_layer(dist):
    print("HeiGIT district indicators (OSM-based access)")
    h = None
    for n in ["demographics", "rural_population", "facilities", "access", "rai"]:
        t = pd.read_csv(SRC / f"heigit/PAK_ADM2_{n}.csv").drop(columns=["ADM_PCODE"], errors="ignore")
        h = t if h is None else h.merge(t, on="ADM2_PCODE", how="outer", suffixes=("", "_dup"))
    h = h[[c for c in h.columns if not c.endswith("_dup")]].rename(columns={"ADM2_PCODE": "district_code"})
    matched = h.district_code.isin(dist.district_code)
    check("HeiGIT district codes found in the boundary file", "integrity",
          f"{matched.sum()} of {len(h)}", "all", matched.all())
    for c in ["access_pop_education_5km", "access_pop_hospitals_1h", "access_pop_primary_healthcare_1h"]:
        h[c.replace("access_pop_", "share_access_")] = (100 * h[c] / h.total_pop).round(2)
    n_edu = int(h.education_count.sum())
    check("OSM education facilities vs official count", "external",
          f"{n_edu:,} in HeiGIT/OSM", f"{PES_2021_22_INSTITUTIONS:,} institutions (PES 2021-22)",
          n_edu / PES_2021_22_INSTITUTIONS >= 0.5, hard=False,
          note="OSM holds a small fraction of Pakistan's schools; facility counts and access shares "
               "from OSM measure mapping effort as much as provision. Flagged, not used as welfare.")
    keep = ["district_code", "total_pop", "rural_pop_perc", "dependency_ratio", "education_count",
            "hospitals_count", "primary_healthcare_count", "share_access_education_5km",
            "share_access_hospitals_1h", "share_access_primary_healthcare_1h", "RAI_total_pop"]
    h = h[keep].rename(columns={"total_pop": "heigit_pop", "RAI_total_pop": "rural_access_index",
                                "education_count": "osm_education_count",
                                "hospitals_count": "osm_hospitals_count",
                                "primary_healthcare_count": "osm_primary_healthcare_count"})
    return h.set_index("district_code")


CODEBOOK = {
    "pop_kontur_2023": ("Population, Kontur 2023 (modelled)", "kontur"),
    "rwi_popw": ("Relative Wealth Index, population-weighted mean (relative within country; 0 is the country's average tile, higher is wealthier)", "rwi"),
    "rwi_cell_share": ("Share of population whose cell has an RWI tile within 2.5 km", "rwi"),
    "ntl_2023_popw": ("Night-light brightness where people live, 2023, DN 0-63", "ntl_2023"),
    "ntl_2013_popw": ("Same, 2013", "ntl_2013"),
    "ntl_change_13_23": ("Change in population-weighted night lights, 2013 to 2023, DN", "ntl_2023"),
    "share_pop_lit_at_night": ("Share of population in a cell with any detectable night light, 2023", "ntl_2023"),
    "travel_city_min_popw": ("Travel time to the nearest city of 50,000+, minutes, population-weighted, 2015", "travel_city"),
    "share_pop_within_60min_city": ("Share of population within 60 minutes of a city of 50,000+", "travel_city"),
    "travel_health_min_popw": ("Motorized travel time to the nearest health facility, minutes, population-weighted, 2020", "travel_health"),
    "share_pop_within_30min_health": ("Share of population within 30 motorized minutes of a health facility", "travel_health"),
    "rural_access_index": ("Rural Access Index: share of rural population within 2 km of an all-season road (HeiGIT, OSM roads)", "heigit"),
    "osm_education_count": ("Education facilities mapped in OpenStreetMap. NOT a count of schools: OSM holds ~3% of the official total", "heigit"),
    "osm_hospitals_count": ("Hospitals mapped in OpenStreetMap (completeness unverified)", "heigit"),
    "osm_primary_healthcare_count": ("Primary health care facilities mapped in OpenStreetMap (completeness unverified)", "heigit"),
    "share_access_education_5km": ("Share of population within 5 km of an OSM-mapped education facility. Inherits OSM's gaps", "heigit"),
    "share_access_hospitals_1h": ("Share of population within 1 hour of an OSM-mapped hospital. Inherits OSM's gaps", "heigit"),
    "share_access_primary_healthcare_1h": ("Share of population within 1 hour of OSM-mapped primary care. Inherits OSM's gaps", "heigit"),
    "dhs_under5_mortality": ("Under-five mortality per 1,000 live births, 10 years before PDHS 2017-18", "dhs_quickstats"),
    "dhs_infant_mortality": ("Infant mortality per 1,000, PDHS 2017-18", "dhs_quickstats"),
    "dhs_stunted": ("Children under 5 stunted, %, PDHS 2017-18", "dhs_quickstats"),
    "dhs_wasted": ("Children under 5 wasted, %", "dhs_quickstats"),
    "dhs_underweight": ("Children under 5 underweight, %", "dhs_quickstats"),
    "dhs_fully_vaccinated": ("Children 12-23 months fully vaccinated (8 basic antigens), %", "dhs_quickstats"),
    "dhs_facility_delivery": ("Births delivered in a health facility, %", "dhs_quickstats"),
    "dhs_women_literate": ("Women 15-49 who are literate, %", "dhs_quickstats"),
    "dhs_women_secondary_plus": ("Women 15-49 with secondary or higher education, %", "dhs_quickstats"),
    "dhs_hh_electricity": ("Households with electricity, %", "dhs_quickstats"),
    "dhs_tfr": ("Total fertility rate", "dhs_quickstats"),
    "dhs_modern_contraception": ("Married women using a modern method, %", "dhs_quickstats"),
    "dhs_partner_violence": ("Ever-married women who experienced physical or sexual violence by husband, %", "dhs_quickstats"),
    "mpi": ("Multidimensional Poverty Index (OPHI), 2017-18", "ophi_mpi"),
    "mpi_headcount": ("MPI poor, % of population", "ophi_mpi"),
    "mpi_intensity": ("Average deprivation share among the poor, %", "ophi_mpi"),
    "mpi_vulnerable": ("Vulnerable to poverty, %", "ophi_mpi"),
    "mpi_severe": ("In severe poverty, %", "ophi_mpi"),
}


def main():
    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    dist = gpd.read_file(GPKG, layer="admin_district")
    prov = gpd.read_file(GPKG, layer="admin_province")
    census_d = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    grid = gpd.read_file(GPKG, layer="grid_h3_r6")

    print("integrity")
    fetched = pd.read_csv(SRC / "fetched.tsv", sep="\t")
    pub = fetched[fetched.md5_published.notna()]
    check("published MD5 hashes", "integrity", f"{(pub.md5 == pub.md5_published).sum()} of {len(pub)} match",
          "all", (pub.md5 == pub.md5_published).all())

    k = add_sources(carrier_cells(teh), census_d)
    g_grid = aggregate(k, "h3_id")
    g_teh = aggregate(k, "tehsil_code")
    g_dist = aggregate(k, "district_code")
    g_prov = aggregate(k, "province_code")
    validate_against_census(g_dist, census_d)
    h = heigit_layer(dist)
    p = province_layer(prov)

    # Convergent check at province level: DHS 2017 electricity vs census 2023 electricity.
    ce = census_d.assign(n=census_d.pop2023 * census_d.electricity / 100).groupby("province_code")[["n", "pop2023"]].sum()
    ce = (100 * ce.n / ce.pop2023).rename("census_elec")
    x = p.set_index("province_code")[["dhs_hh_electricity"]].join(ce, how="inner")
    r = x.dhs_hh_electricity.rank().corr(x.census_elec.rank())
    check("DHS 2017 vs census 2023 household electricity, provinces", "convergent",
          f"rho = {r:+.2f}, n = {len(x)}", "rho >= 0.8", r >= 0.8)

    # Write layers.
    shrine_cols = ["n_site", "n_mus", "n_mus_pre1857"]
    wg = grid[["h3_id", "h3_parent", "tehsil_code", "district_code", "province_code", "cx_m", "cy_m",
               *shrine_cols, "dist_km_mus", "dist_band_mus", "geometry"]].merge(
        g_grid.reset_index(), on="h3_id", how="left")
    wt = teh[["tehsil_code", "tehsil_name", "district_code", "province_code", "area_km2", "cx_m", "cy_m",
              *shrine_cols, "n_field_verified", "geometry"]].merge(g_teh.reset_index(), on="tehsil_code", how="left")
    wd = dist[["district_code", "district_name", "province_code", "area_km2", "cx_m", "cy_m",
               *shrine_cols, "n_field_verified", "geometry"]].merge(g_dist.reset_index(), on="district_code", how="left")
    wd = wd.merge(h.reset_index(), on="district_code", how="left")
    p = p.merge(g_prov.reset_index(), on="province_code", how="left")

    for layer, df in [("welfare_grid_h3_r6", wg), ("welfare_tehsil", wt), ("welfare_district", wd)]:
        gpd.GeoDataFrame(df, geometry="geometry", crs=4326).to_file(GPKG, layer=layer, driver="GPKG")
    gpd.GeoDataFrame(p, geometry="geometry", crs=4326).to_file(GPKG, layer="welfare_province", driver="GPKG")
    src = pd.read_csv(HERE / "sources.tsv", sep="\t")
    cb = pd.DataFrame([{"indicator": k_, "definition": v[0], "source_key": v[1]} for k_, v in CODEBOOK.items()])
    cb = cb.merge(src[["key", "publisher", "licence"]], left_on="source_key", right_on="key", how="left").drop(columns="key")
    for layer, df in [("welfare_codebook", cb), ("welfare_sources", fetched), ("welfare_checks", pd.DataFrame(CHECKS))]:
        gpd.GeoDataFrame(df, geometry=[None] * len(df)).to_file(GPKG, layer=layer, driver="GPKG")

    # Flat copies (tracked) for use without GIS software.
    wd.drop(columns="geometry").to_csv(HERE / "welfare_district.csv", index=False)
    wt.drop(columns="geometry").to_csv(HERE / "welfare_tehsil.csv", index=False)
    p.drop(columns="geometry").to_csv(HERE / "welfare_province.csv", index=False)
    cb.to_csv(HERE / "welfare_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)

    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
