"""
Census 2023 welfare outcomes (PBS, via the PakPC2023 package) onto the foundation.

Everything is aggregated as counts first and turned into rates last, so tehsils that the
census split after the OCHA boundaries were drawn can be added back together correctly.

Writes to the foundation GeoPackage:
  outcomes_tehsil     OCHA tehsils with census indicators (clean matches only)
  outcomes_district   every OCHA district in the four provinces and Islamabad
  outcomes_codebook   definition and source table of every indicator
  census_crosswalk    each census unit, the OCHA tehsil it matched and how

Usage:
  git clone --depth 1 https://github.com/myaseen208/PakPC2023.git
  python build_census_outcomes.py --census PakPC2023/data --gpkg ../shrines_foundation.gpkg
"""
import argparse, re
from pathlib import Path
import numpy as np
import pandas as pd
import geopandas as gpd
import pyreadr

from census_crosswalk import match, DISTRICT_FIX

import difflib
KEY = ["D", "T", "SEQ"]   # normalised district, normalised tehsil, repeat number
CATS = ["REGION", "VARS", "RELIGION", "LANGUAGE", "DISAB_FUNC_LIM"]
_CANON = {}


def _n(x, space=" "):
    x = re.sub(r"[^A-Z0-9 ]", " ", str(x).upper())
    return re.sub(r"\s+", space, x).strip()


def rd(d, name):
    """Read a census table and key it to the canonical unit list from Table 1.

    Tables disagree on labels for the same unit (TEHSIL vs TALUKA, KAR KAHAR vs KALLAR KAHAR,
    AI vs ALLAI), so units are keyed on district and tehsil name only, and names that differ
    from Table 1 are snapped to the closest Table 1 name in the same district.
    """
    t = pyreadr.read_r(str(Path(d) / f"{name}.RData"))[name]
    t["D"] = t.DISTRICT.map(lambda x: DISTRICT_FIX.get(_n(x), _n(x)))
    t["T"] = t.TEHSIL.map(lambda x: _n(x, ""))
    if name == "TABLE_01":
        _CANON.update({dd: set(g["T"]) for dd, g in t.groupby("D")})
    else:
        def snap(row):
            opts = _CANON.get(row["D"], set()); tt = row["T"]
            if tt in opts or not opts:
                return tt
            pre = [o for o in opts if o.startswith(tt) or tt.startswith(o)]
            if len(pre) == 1:
                return pre[0]
            c = difflib.get_close_matches(tt, list(opts), n=1, cutoff=0.6)
            return c[0] if c else tt
        pairs = t[["D", "T"]].drop_duplicates()
        pairs["T2"] = pairs.apply(snap, axis=1)
        t = t.merge(pairs, on=["D", "T"], how="left").drop(columns="T").rename(columns={"T2": "T"})
    t["SEQ"] = t.groupby(["D", "T"] + [c for c in CATS if c in t.columns]).cumcount()
    return t


def wide_by_region(t, cols, prefix=""):
    """Tables with a REGION column (OVERALL/RURAL/URBAN): one row per unit, suffix _all/_rur/_urb."""
    out = None
    for reg, suf in [("OVERALL", "all"), ("RURAL", "rur"), ("URBAN", "urb")]:
        x = t[t.REGION == reg][KEY + cols].rename(columns={c: f"{prefix}{c.lower()}_{suf}" for c in cols})
        out = x if out is None else out.merge(x, on=KEY, how="outer")
    return out


def long_to_wide(t, var_col, picks, value_cols):
    """Tables with a category column: pick rows, spread to columns."""
    rows = []
    for label, cat in picks.items():
        x = t[t[var_col] == cat][KEY + list(value_cols)].rename(
            columns={v: f"{label}_{s}" for v, s in value_cols.items()})
        rows.append(x.set_index(KEY))
    return pd.concat(rows, axis=1).reset_index()


def build_counts(d):
    t1 = rd(d, "TABLE_01")
    c = wide_by_region(t1, ["ALL_SEXES", "POP_2017"])
    names = t1[t1.REGION == "OVERALL"][KEY + ["PROVINCE", "DISTRICT", "TEHSIL"]]
    c = names.merge(c, on=KEY, how="left")
    area = t1[t1.REGION == "OVERALL"][KEY + ["AREA_SQKM"]].rename(columns={"AREA_SQKM": "area_km2_census"})
    c = c.merge(area, on=KEY, how="left")

    t12 = rd(d, "TABLE_12")
    v12 = {"pop10": "Population >=10", "lit10": "Literate >=10", "oosc": "Out of School Children (5-16)",
           "enr_pri": "Enrolment Primary", "enr_mid": "Enrolment Middle", "enr_mat": "Enrolment Matric",
           "pop5": "Population >=5", "never5": "Never to School (all)"}
    c = c.merge(long_to_wide(t12, "VARS", v12, {"ALL_SEXES_OVERALL": "all", "FEMALE_OVERALL": "fem",
                                                "MALE_OVERALL": "mal", "ALL_SEXES_RURAL": "rur",
                                                "FEMALE_RURAL": "femrur"}), on=KEY, how="left")

    for name, cols in [("TABLE_22", ["HOUSEHOLDS", "LIGHT_ELECT", "LIGHT_SOLAR", "FUEL_GAS",
                                     "FUEL_LPGCNG", "FUEL_FIREWOOD"]),
                       ("TABLE_23", ["DRINK_WTR_IMPROVE", "DRINK_WTR_TAP", "DRINK_WTR_INSIDE"]),
                       ("TABLE_24", ["TOILET_FLUSH", "TOILET_NONE"]),
                       ("TABLE_25", ["RES_ST_OWNED", "RES_ST_RENTED", "NO_ROOMS_ONE"])]:
        t = rd(d, name)
        w = wide_by_region(t, cols, prefix="")
        if name != "TABLE_22":   # households already taken from table 22
            w = w[[k for k in w.columns if not k.startswith("households")]]
        c = c.merge(w, on=KEY, how="left")

    t16 = rd(d, "TABLE_16")
    c = c.merge(long_to_wide(t16, "DISAB_FUNC_LIM", {"dis": "Disability", "dispop": "Population"},
                             {"ALL_SEXES_OVERALL": "all"}), on=KEY, how="left")

    t9 = rd(d, "TABLE_09")
    rel = {"rel_muslim": "MUSLIM", "rel_hindu": "HINDU JATI", "rel_sc": "SCHEDULED CASTE",
           "rel_christian": "CHRISTIAN", "rel_ahmadi": "QADIANI/AHMADI", "rel_sikh": "SIKH"}
    c = c.merge(long_to_wide(t9, "RELIGION", rel, {"ALL_SEXES_OVERALL": "n"}), on=KEY, how="left")

    t11 = rd(d, "TABLE_11")
    lang = {f"lang_{k.lower()}": k for k in ["PUNJABI", "SARAIKI", "SINDHI", "PUSHTO", "BALOCHI",
                                            "BRAHVI", "URDU", "HINDKO", "TOTAL"]}
    c = c.merge(long_to_wide(t11, "LANGUAGE", lang, {"ALL_SEXES_OVERALL": "n"}), on=KEY, how="left")
    num = [k for k in c.columns if k not in KEY + ["PROVINCE", "DISTRICT", "TEHSIL"]]
    c[num] = c[num].apply(pd.to_numeric, errors="coerce")
    return c


def rates(g):
    """Indicators from summed counts. Shares are 0 to 100."""
    def s(a, b):
        return (100 * g[a] / g[b]).where(g[b] > 0).round(2)
    o = pd.DataFrame(index=g.index)
    o["pop2023"] = g.all_sexes_all
    o["pop_growth_17_23"] = (100 * ((g.all_sexes_all / g.pop_2017_all) ** (1 / 6) - 1)).round(2)
    o["urban_share"] = (100 * g.all_sexes_urb.fillna(0) / g.all_sexes_all).round(2)
    o["hh_size"] = (g.all_sexes_all / g.households_all).round(2)
    o["literacy"] = s("lit10_all", "pop10_all")
    o["literacy_female"] = s("lit10_fem", "pop10_fem")
    o["literacy_male"] = s("lit10_mal", "pop10_mal")
    o["literacy_rural"] = s("lit10_rur", "pop10_rur")
    o["literacy_female_rural"] = s("lit10_femrur", "pop10_femrur")
    o["literacy_gender_gap"] = (o.literacy_male - o.literacy_female).round(2)
    enr = g.enr_pri_all + g.enr_mid_all + g.enr_mat_all
    o["out_of_school_5_16"] = (100 * g.oosc_all / (g.oosc_all + enr)).round(2)
    enr_f = g.enr_pri_fem + g.enr_mid_fem + g.enr_mat_fem
    o["out_of_school_5_16_female"] = (100 * g.oosc_fem / (g.oosc_fem + enr_f)).round(2)
    o["never_attended_school"] = s("never5_all", "pop5_all")
    o["electricity"] = s("light_elect_all", "households_all")
    o["electricity_rural"] = s("light_elect_rur", "households_rur")
    o["solar_lighting"] = s("light_solar_all", "households_all")
    o["cooking_gas"] = (100 * (g.fuel_gas_all + g.fuel_lpgcng_all) / g.households_all).round(2)
    o["cooking_firewood"] = s("fuel_firewood_all", "households_all")
    o["improved_water"] = s("drink_wtr_improve_all", "households_all")
    o["improved_water_rural"] = s("drink_wtr_improve_rur", "households_rur")
    o["piped_water"] = s("drink_wtr_tap_all", "households_all")
    o["water_inside_home"] = s("drink_wtr_inside_all", "households_all")
    o["flush_toilet"] = s("toilet_flush_all", "households_all")
    o["flush_toilet_rural"] = s("toilet_flush_rur", "households_rur")
    o["no_toilet"] = s("toilet_none_all", "households_all")
    o["home_owned"] = s("res_st_owned_all", "households_all")
    o["one_room_home"] = s("no_rooms_one_all", "households_all")
    o["disability"] = s("dis_all", "dispop_all")
    pop = g.all_sexes_all
    for k in ["muslim", "hindu", "sc", "christian", "ahmadi", "sikh"]:
        o[f"share_{k}"] = (100 * g[f"rel_{k}_n"] / pop).round(3)
    o["share_hindu_all"] = (o.share_hindu + o.share_sc).round(3)
    for k in ["punjabi", "saraiki", "sindhi", "pushto", "balochi", "brahvi", "urdu", "hindko"]:
        o[f"lang_{k}"] = (100 * g[f"lang_{k}_n"] / g.lang_total_n).round(2)
    return o


CODEBOOK = {
    "pop2023": ("Population 2023", "Table 1"), "pop_growth_17_23": ("Annual growth 2017 to 2023, %", "Table 1"),
    "urban_share": ("Urban population share", "Table 1"), "hh_size": ("Persons per household", "Tables 1, 22"),
    "literacy": ("Literate share of population aged 10+", "Table 12"),
    "literacy_female": ("Female literacy, 10+", "Table 12"), "literacy_male": ("Male literacy, 10+", "Table 12"),
    "literacy_rural": ("Rural literacy, 10+", "Table 12"), "literacy_female_rural": ("Rural female literacy, 10+", "Table 12"),
    "literacy_gender_gap": ("Male minus female literacy, points", "Table 12"),
    "out_of_school_5_16": ("Out of school children aged 5 to 16 as share of out of school plus primary, middle and matric enrolment (approximation: census gives no 5 to 16 population)", "Table 12"),
    "out_of_school_5_16_female": ("Same, girls", "Table 12"),
    "never_attended_school": ("Never attended school, share of population 5+", "Table 12"),
    "electricity": ("Households lit by grid electricity", "Table 22"), "electricity_rural": ("Rural households lit by electricity", "Table 22"),
    "solar_lighting": ("Households lit by solar", "Table 22"), "cooking_gas": ("Households cooking with gas, LPG or CNG", "Table 22"),
    "cooking_firewood": ("Households cooking with firewood", "Table 22"),
    "improved_water": ("Households with improved drinking water", "Table 23"), "improved_water_rural": ("Rural households, improved water", "Table 23"),
    "piped_water": ("Households with tap water", "Table 23"), "water_inside_home": ("Drinking water source inside the home", "Table 23"),
    "flush_toilet": ("Households with flush toilet", "Table 24"), "flush_toilet_rural": ("Rural households, flush toilet", "Table 24"),
    "no_toilet": ("Households with no toilet", "Table 24"), "home_owned": ("Households owning their home", "Table 25"),
    "one_room_home": ("Households living in one room", "Table 25"), "disability": ("Population with a disability", "Table 16"),
    "share_muslim": ("Muslim population share", "Table 9"), "share_hindu_all": ("Hindu (jati and scheduled caste) share", "Table 9"),
    "share_christian": ("Christian share", "Table 9"), "share_ahmadi": ("Ahmadi share", "Table 9"), "share_sikh": ("Sikh share", "Table 9"),
    "lang_punjabi": ("Mother tongue Punjabi, share", "Table 11"), "lang_saraiki": ("Mother tongue Saraiki", "Table 11"),
    "lang_sindhi": ("Mother tongue Sindhi", "Table 11"), "lang_pushto": ("Mother tongue Pashto", "Table 11"),
    "lang_balochi": ("Mother tongue Balochi", "Table 11"), "lang_brahvi": ("Mother tongue Brahui", "Table 11"),
    "lang_urdu": ("Mother tongue Urdu", "Table 11"), "lang_hindko": ("Mother tongue Hindko", "Table 11"),
}


def main(a):
    counts = build_counts(a.census)
    teh = gpd.read_file(a.gpkg, layer="admin_tehsil")
    dist = gpd.read_file(a.gpkg, layer="admin_district")

    cw = match(counts[KEY + ["PROVINCE", "DISTRICT", "TEHSIL"]], teh.drop(columns="geometry"))
    counts = counts.merge(cw[KEY + ["tehsil_code", "match_type"]], on=KEY, how="left")
    ID = KEY + ["PROVINCE", "DISTRICT", "TEHSIL", "tehsil_code", "match_type"]
    num = [k for k in counts.columns if k not in ID + ["d"]]

    # District codes for every census unit, through its district name.
    dn = dist[["district_code", "district_name"]].copy()
    dn["d"] = dn.district_name.str.upper().str.replace(r"[^A-Z0-9 ]", " ", regex=True).str.split().str.join(" ")
    counts["d"] = counts.D
    counts = counts.merge(dn[["d", "district_code"]], on="d", how="left")

    # District outcomes: complete.
    gd = counts.groupby("district_code")[num].sum(min_count=1)
    od = rates(gd)
    pop_by_d = counts.groupby("district_code").all_sexes_all.sum()
    matched_by_d = counts[counts.tehsil_code.notna()].groupby("district_code").all_sexes_all.sum()
    od["census_pop_matched_to_tehsils"] = (100 * matched_by_d / pop_by_d).round(1).reindex(od.index).fillna(0)
    outcomes_d = dist[["district_code", "district_name", "province_code", "area_km2", "n_mus",
                       "n_mus_pre1857", "mus_per_1000km2", "cx_m", "cy_m", "geometry"]].merge(
        od.reset_index(), on="district_code", how="inner")

    # Tehsil outcomes: only where the whole district matched cleanly, so no tehsil is partial.
    good_d = od.index[od.census_pop_matched_to_tehsils >= 99.5]
    ct = counts[counts.tehsil_code.notna() & counts.district_code.isin(good_d)]
    gt = ct.groupby("tehsil_code")[num].sum(min_count=1)
    ot = rates(gt)
    ot["n_census_units"] = ct.groupby("tehsil_code").size()
    outcomes_t = teh[["tehsil_code", "tehsil_name", "district_code", "province_code", "area_km2",
                      "n_mus", "n_mus_pre1857", "mus_per_1000km2", "cx_m", "cy_m", "geometry"]].merge(
        ot.reset_index(), on="tehsil_code", how="inner")

    cb = pd.DataFrame([{"indicator": k, "definition": v[0], "census_table": v[1],
                        "source": "Pakistan Bureau of Statistics, Census 2023, via PakPC2023 0.2.0"}
                       for k, v in CODEBOOK.items()])
    outcomes_t.to_file(a.gpkg, layer="outcomes_tehsil", driver="GPKG")
    outcomes_d.to_file(a.gpkg, layer="outcomes_district", driver="GPKG")
    gpd.GeoDataFrame(cb, geometry=[None] * len(cb)).to_file(a.gpkg, layer="outcomes_codebook", driver="GPKG")
    x = counts[["PROVINCE", "DISTRICT", "TEHSIL", "district_code", "tehsil_code", "match_type", "all_sexes_all"]].rename(columns={"all_sexes_all": "pop2023"})
    gpd.GeoDataFrame(x, geometry=[None] * len(x)).to_file(a.gpkg, layer="census_crosswalk", driver="GPKG")

    print(f"districts with outcomes: {len(outcomes_d)} | clean districts at tehsil level: {len(good_d)}"
          f" | tehsils with outcomes: {len(outcomes_t)}")
    print("census units by match type:", cw.match_type.value_counts().to_dict())


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--census", required=True)
    p.add_argument("--gpkg", required=True)
    main(p.parse_args())
