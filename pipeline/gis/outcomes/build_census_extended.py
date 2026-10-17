"""
More Census 2023 welfare outcomes from tables build_census_outcomes.py does not read.

The first census step reads Tables 1, 9, 11, 12, 16 and 22-25. This one adds what the rest of the
published tables can say about individual welfare, demography and housing:

  Table 4   single years of age by sex (district)  -> child-woman ratio (the standard fertility
            proxy where births are not tabulated), dependency ratio, under-5 sex ratio
  Table 6   marital status by age and sex (district) -> share of girls and boys aged 15-19, and of
            women 20-24, ever married (early marriage)
  Table 13A education by age bracket (tehsil)       -> youth (15-24) literacy by sex
  Table 20  households by housing type (tehsil)     -> kacha (mud / unbaked) housing
  Table 21  population by housing unit type (tehsil)-> homeless per 100,000
  Table 22  kitchen (tehsil)                        -> households with no kitchen
  Table 24  washroom (tehsil)                       -> households with no bathing room
  Table 25  owner gender (tehsil)                   -> owned homes whose owner is a woman
  Table 26  structures (tehsil)                     -> jhuggi (shack) structures

Same rules as the first step: counts are summed first and turned into rates last; tehsil values
only for districts whose census units matched OCHA tehsils at >= 99.5% of population; every
claim is a row in census_extended_checks.csv, and the script exits non-zero if a hard check fails.

Writes outcomes_ext_district / outcomes_ext_tehsil / outcomes_ext_codebook into the GeoPackage and
flat copies (tracked) beside this script.

Usage (from the repo root; pyreadr needs Python >= 3.10 on this Mac, see docs/GIS_FOUNDATION.md):
  python pipeline/gis/outcomes/build_census_extended.py --census <PakPC2023>/data
"""
import argparse, csv, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import pyreadr

sys.path.insert(0, str(Path(__file__).resolve().parent))
from build_census_outcomes import rd, KEY, _n          # noqa: E402  same unit keying as step one
from census_crosswalk import match, DISTRICT_FIX        # noqa: E402

HERE = Path(__file__).resolve().parent
GPKG = HERE.parent / "shrines_foundation.gpkg"
CHECKS = []


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference,
                   "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def district_key(s):
    return s.map(lambda x: DISTRICT_FIX.get(_n(x), _n(x)))


# Table 6 carries a total row per province with the province's name in DISTRICT. Islamabad's
# district and territory share a name, so it is not in this set (excluding it lost Islamabad).
PROVINCE_ROWS = {"BALOCHISTAN", "KHYBER PAKHTUNKHWA", "PUNJAB", "SINDH"}


def rd_by(d, name, cats):
    """rd() keyed per category: step one's SEQ counts repeats within district, tehsil and its own
    category columns, which do not include AGE_BRACKET or HH_TYPE, so here SEQ is recounted with
    the table's own category columns or every row after the first in a unit falls off the join."""
    t = rd(d, name)
    t["SEQ"] = t.groupby(["D", "T"] + [c for c in cats + ["REGION"] if c in t.columns]).cumcount()
    return t


def district_codes(dist):
    dn = dist[["district_code", "district_name"]].copy()
    dn["D"] = dn.district_name.str.upper().str.replace(r"[^A-Z0-9 ]", " ", regex=True).str.split().str.join(" ")
    return dn[["D", "district_code"]]


# ---------------------------------------------------------------- district-only tables (4, 6)
def age_counts(d, dn, t1_by_d):
    t = pyreadr.read_r(str(Path(d) / "TABLE_04.RData"))["TABLE_04"]
    t["D"] = district_key(t.DISTRICT)
    lab = t.SEX_AGE_GROUP_IN_YEARS.astype(str).str.strip()
    t["age"] = pd.to_numeric(lab.replace({"BELOW 1": "0", "75 & ABOVE": "75"}), errors="coerce")
    tot = t[lab == "ALL AGES"]
    t = t[t.age.notna()].merge(dn, on="D", how="left")
    miss = t[t.district_code.isna()].D.unique()
    check("Table 4 districts found in the boundary file", "integrity",
          f"{t.D.nunique() - len(miss)} of {t.D.nunique()}" + (f"; missing {list(miss)}" if len(miss) else ""),
          "all", len(miss) == 0)
    # Single years must add up to the table's own ALL AGES row, and to Table 1.
    s = t.groupby("D").ALL_SEXES_OVERALL.sum()
    a = tot.groupby("D").ALL_SEXES_OVERALL.sum()
    gap = (s - a).abs().max()
    check("Table 4 single years sum to its ALL AGES row", "integrity", f"max gap {gap:,.0f} persons",
          "<= 0.1% of the smallest district", gap <= 0.001 * a.min())
    nat, pop_t1 = a.sum(), t1_by_d.sum()
    check("Table 4 total vs Table 1 total", "integrity", f"{nat:,.0f}", f"{pop_t1:,.0f} (Table 1)",
          abs(nat / pop_t1 - 1) < 0.01, note="Table 4 is short of Table 1 almost everywhere; ratios are unaffected")
    x = pd.concat([t1_by_d.rename("table_1"), a.rename("table_4")], axis=1)
    x["gap_pct"] = (100 * (x.table_4 / x.table_1 - 1)).round(2)
    bad = x[x.gap_pct.abs() > 2].sort_values("gap_pct")
    bad.rename_axis("district_census_name").to_csv(HERE / "census_table4_vs_table1.csv")
    check("districts where Table 4 and Table 1 populations differ by > 2%", "integrity",
          "; ".join(f"{i} {v.gap_pct:+.1f}%" for i, v in bad.iterrows()) or "none", "none", bad.empty,
          hard=False, note="Published tables disagree; recorded in census_table4_vs_table1.csv, not corrected")

    def band(lo, hi, col):
        return t[(t.age >= lo) & (t.age <= hi)].groupby("district_code")[col].sum()
    out = pd.DataFrame({
        "u5": band(0, 4, "ALL_SEXES_OVERALL"), "u5_m": band(0, 4, "MALE_OVERALL"),
        "u5_f": band(0, 4, "FEMALE_OVERALL"), "u15": band(0, 14, "ALL_SEXES_OVERALL"),
        "a15_64": band(15, 64, "ALL_SEXES_OVERALL"), "a65": band(65, 200, "ALL_SEXES_OVERALL"),
        "f15_49": band(15, 49, "FEMALE_OVERALL"), "all_ages": band(0, 200, "ALL_SEXES_OVERALL"),
        "u5_rur": band(0, 4, "ALL_SEXES_RURAL"), "f15_49_rur": band(15, 49, "FEMALE_RURAL"),
        "u5_urb": band(0, 4, "ALL_SEXES_URBAN"), "f15_49_urb": band(15, 49, "FEMALE_URBAN"),
    })
    # Age heaping: Whipple's index on ages 23-62 (UN standard). 100 = no heaping, > 175 = very rough.
    w = t[(t.age >= 23) & (t.age <= 62)]
    heap = w[w.age % 5 == 0].groupby("district_code").ALL_SEXES_OVERALL.sum()
    out["whipple"] = 500 * heap / w.groupby("district_code").ALL_SEXES_OVERALL.sum()
    return out


def marital_counts(d, dn):
    t = pyreadr.read_r(str(Path(d) / "TABLE_06.RData"))["TABLE_06"]
    t["D"] = district_key(t.DISTRICT)
    t = t[~t.D.isin(PROVINCE_ROWS)].merge(dn, on="D", how="left")
    check("Table 6 districts found in the boundary file", "integrity",
          f"{t[t.district_code.notna()].D.nunique()} of {t.D.nunique()}", "all", t.district_code.notna().all())
    t["ag"] = t.AGE_GROUP.astype(str).str.replace(r"\s+", "", regex=True)
    t["ever"] = t.MARITAL_STATUS.astype(str).str.strip() != "NEVER MARRIED"
    out = {}
    for ag, tag in [("15-19", "1519"), ("20-24", "2024")]:
        x = t[t.ag == ag]
        for sex, s in [("FEMALE_OVERALL", "f"), ("MALE_OVERALL", "m"), ("FEMALE_RURAL", "frur")]:
            out[f"ever_{s}{tag}"] = x[x.ever].groupby("district_code")[sex].sum()
            out[f"pop_{s}{tag}"] = x.groupby("district_code")[sex].sum()
    return pd.DataFrame(out)


# ---------------------------------------------------------------- tehsil tables
def tehsil_counts(d):
    rd(d, "TABLE_01")                       # sets the canonical unit list the other tables snap to
    t1 = rd(d, "TABLE_01")
    c = t1[t1.REGION == "OVERALL"][KEY + ["PROVINCE", "DISTRICT", "TEHSIL", "ALL_SEXES"]].rename(
        columns={"ALL_SEXES": "pop_t1"})

    t = rd_by(d, "TABLE_13A", ["VARS", "AGE_BRACKET"])
    # "Primary Completed" is left out: at a 6% mean among 15-24 it is primary as the highest level
    # reached, not primary attainment, and the table does not say which.
    for var, lab in [("Population", "pop"), ("Literate", "lit")]:
        x = t[(t.VARS == var) & (t.AGE_BRACKET.astype(str).str.replace(" ", "") == "15-24")]
        x = x.groupby(KEY)[["ALL_SEXES_OVERALL", "FEMALE_OVERALL", "MALE_OVERALL"]].sum(min_count=1)
        x.columns = [f"y_{lab}_all", f"y_{lab}_f", f"y_{lab}_m"]
        x = x.reset_index().drop_duplicates(KEY).set_index(KEY)
        c = c.merge(x.reset_index(), on=KEY, how="left")

    t = rd_by(d, "TABLE_20", ["HH_TYPE"])
    x = t.pivot_table(index=KEY, columns="HH_TYPE", values="OVERALL", aggfunc="sum")
    x = x.rename(columns={"KACHA": "hh_kacha", "SEMI PAKKA": "hh_semi", "PAKKA": "hh_pakka", "TOTAL": "hh_t20"})
    c = c.merge(x.reset_index(), on=KEY, how="left")

    t = rd_by(d, "TABLE_21", ["TYPE_OF_HOUSING_UNITS"])
    t = t[t.REGION == "OVERALL"]
    x = t.pivot_table(index=KEY, columns="TYPE_OF_HOUSING_UNITS", values="ALL_SEXES", aggfunc="sum")
    x = x.rename(columns={"HOMELESS": "homeless", "TOTAL": "pop_t21"})[["homeless", "pop_t21"]]
    c = c.merge(x.reset_index(), on=KEY, how="left")

    for name, cols in [("TABLE_22", ["HOUSEHOLDS", "NO_KITCHEN"]), ("TABLE_24", ["WASHROOM_NONE"]),
                       ("TABLE_25", ["RES_ST_OWNED", "OWNER_GENDER_FEMALE", "OWNER_GENDER_MALE"]),
                       ("TABLE_26", ["ALL_STRUCTURES", "OTHER_JUGHI"])]:
        t = rd_by(d, name, [])
        t = t[t.REGION == "OVERALL"].groupby(KEY)[cols].sum(min_count=1)
        t.columns = [f"{k.lower()}_{name[-2:]}" for k in cols]
        c = c.merge(t.reset_index(), on=KEY, how="left")
    num = [k for k in c.columns if k not in KEY + ["PROVINCE", "DISTRICT", "TEHSIL"]]
    c[num] = c[num].apply(pd.to_numeric, errors="coerce")
    return c


def tehsil_rates(g):
    def s(a, b, k=100):
        return (k * g[a] / g[b]).where(g[b] > 0).round(2)
    o = pd.DataFrame(index=g.index)
    o["youth_literacy_15_24"] = s("y_lit_all", "y_pop_all")
    o["youth_literacy_female_15_24"] = s("y_lit_f", "y_pop_f")
    o["youth_literacy_male_15_24"] = s("y_lit_m", "y_pop_m")
    o["youth_literacy_gender_gap"] = (o.youth_literacy_male_15_24 - o.youth_literacy_female_15_24).round(2)
    o["housing_kacha"] = s("hh_kacha", "hh_t20")
    o["housing_pakka"] = s("hh_pakka", "hh_t20")
    o["homeless_per_100k"] = s("homeless", "pop_t21", 1e5)
    o["no_kitchen"] = s("no_kitchen_22", "households_22")
    o["no_washroom"] = s("washroom_none_24", "households_22")
    owners = g.owner_gender_female_25 + g.owner_gender_male_25
    o["home_owner_female"] = (100 * g.owner_gender_female_25 / owners).where(owners > 0).round(2)
    o["jhuggi_structures"] = s("other_jughi_26", "all_structures_26")
    return o


def district_rates(g):
    o = pd.DataFrame(index=g.index)
    o["child_woman_ratio"] = (1000 * g.u5 / g.f15_49).round(1)
    o["child_woman_ratio_rural"] = (1000 * g.u5_rur / g.f15_49_rur).round(1)
    o["child_woman_ratio_urban"] = (1000 * g.u5_urb / g.f15_49_urb).where(g.f15_49_urb > 0).round(1)
    o["share_under5"] = (100 * g.u5 / g.all_ages).round(2)
    o["share_under15"] = (100 * g.u15 / g.all_ages).round(2)
    o["dependency_ratio_census"] = (100 * (g.u15 + g.a65) / g.a15_64).round(1)
    o["sex_ratio_under5"] = (100 * g.u5_m / g.u5_f).round(1)
    o["age_heaping_whipple"] = g.whipple.round(1)
    for s, lab in [("f1519", "girls_15_19_ever_married"), ("m1519", "boys_15_19_ever_married"),
                   ("frur1519", "girls_15_19_ever_married_rural"), ("f2024", "women_20_24_ever_married")]:
        o[lab] = (100 * g[f"ever_{s}"] / g[f"pop_{s}"]).where(g[f"pop_{s}"] > 0).round(2)
    return o


CODEBOOK = {
    "child_woman_ratio": ("Children aged 0-4 per 1,000 women aged 15-49: the census fertility proxy (rises with fertility, falls with child mortality and under-count of infants)", "Table 4"),
    "child_woman_ratio_rural": ("Child-woman ratio, rural", "Table 4"),
    "child_woman_ratio_urban": ("Child-woman ratio, urban", "Table 4"),
    "share_under5": ("Population aged 0-4, %", "Table 4"),
    "share_under15": ("Population aged 0-14, %", "Table 4"),
    "dependency_ratio_census": ("Persons aged 0-14 and 65+ per 100 aged 15-64", "Table 4"),
    "sex_ratio_under5": ("Boys per 100 girls aged 0-4 (the biological norm is about 105)", "Table 4"),
    "age_heaping_whipple": ("Whipple's index of age heaping on ages ending 0 and 5 (23-62): 100 none, above 175 very rough. A data-quality measure, read before trusting the age-based indicators", "Table 4"),
    "girls_15_19_ever_married": ("Girls aged 15-19 ever married, %", "Table 6"),
    "boys_15_19_ever_married": ("Boys aged 15-19 ever married, %", "Table 6"),
    "girls_15_19_ever_married_rural": ("Rural girls aged 15-19 ever married, %", "Table 6"),
    "women_20_24_ever_married": ("Women aged 20-24 ever married, %", "Table 6"),
    "youth_literacy_15_24": ("Literate share of population aged 15-24", "Table 13A"),
    "youth_literacy_female_15_24": ("Literate share of young women aged 15-24", "Table 13A"),
    "youth_literacy_male_15_24": ("Literate share of young men aged 15-24", "Table 13A"),
    "youth_literacy_gender_gap": ("Young men's minus young women's literacy, 15-24, points", "Table 13A"),
    "housing_kacha": ("Households in kacha (mud or unbaked brick) housing, %", "Table 20"),
    "housing_pakka": ("Households in pakka (fired brick or concrete) housing, %", "Table 20"),
    "homeless_per_100k": ("Persons enumerated as homeless per 100,000", "Table 21"),
    "no_kitchen": ("Households with no kitchen, %", "Table 22"),
    "no_washroom": ("Households with no bathing room, %", "Tables 22, 24"),
    "home_owner_female": ("Owned homes whose owner is a woman, %", "Table 25"),
    "jhuggi_structures": ("Structures that are jhuggis (shacks), % of all structures", "Table 26"),
}


def main(a):
    dist = gpd.read_file(GPKG, layer="admin_district")
    teh = gpd.read_file(GPKG, layer="admin_tehsil")
    census_d = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    dn = district_codes(dist)

    print("Tables 4 and 6 (district)")
    t1 = pyreadr.read_r(str(Path(a.census) / "TABLE_01.RData"))["TABLE_01"]
    t1 = t1[t1.REGION == "OVERALL"]
    ages = age_counts(a.census, dn, t1.groupby(district_key(t1.DISTRICT)).ALL_SEXES.sum())
    mar = marital_counts(a.census, dn)
    g = ages.join(mar, how="outer")
    od = district_rates(g)

    print("Tables 13A, 20-26 (tehsil)")
    c = tehsil_counts(a.census)
    cw = match(c[KEY + ["PROVINCE", "DISTRICT", "TEHSIL"]], teh.drop(columns="geometry"))
    c = c.merge(cw[KEY + ["tehsil_code"]], on=KEY, how="left")
    c = c.merge(dn.rename(columns={"D": "D2"}), left_on="D", right_on="D2", how="left")
    num = [k for k in c.columns if k not in KEY + ["PROVINCE", "DISTRICT", "TEHSIL", "tehsil_code",
                                                   "district_code", "D2"]]
    gd = c.groupby("district_code")[num].sum(min_count=1)
    od = od.join(tehsil_rates(gd), how="outer")
    pop_by_d = c.groupby("district_code").pop_t1.sum()
    matched = c[c.tehsil_code.notna()].groupby("district_code").pop_t1.sum()
    good = (100 * matched / pop_by_d).reindex(pop_by_d.index).fillna(0)
    good = good.index[good >= 99.5]
    ct = c[c.tehsil_code.notna() & c.district_code.isin(good)]
    ot = tehsil_rates(ct.groupby("tehsil_code")[num].sum(min_count=1))

    # Same district set as step one, and the same tehsil set.
    check("districts with extended outcomes vs step one", "integrity", f"{len(od)}",
          f"{len(census_d)} (outcomes_district)", set(od.index) == set(census_d.index))
    t_one = gpd.read_file(GPKG, layer="outcomes_tehsil", ignore_geometry=True)
    check("tehsils with extended outcomes vs step one", "integrity", f"{len(ot)}",
          f"{len(t_one)} (outcomes_tehsil)", set(ot.index) == set(t_one.tehsil_code))

    # Internal consistency: Table 13A's 15-24 literacy can never be below 10+ literacy by much in
    # Pakistan (literacy rises steeply in younger cohorts), and must correlate with it.
    m = census_d.join(od, how="inner")
    r = m.youth_literacy_15_24.rank().corr(m.literacy.rank())
    check("youth (15-24) literacy vs 10+ literacy, districts", "convergent", f"rho = {r:+.2f}, n = {len(m)}",
          "rho >= 0.8", r >= 0.8)
    frac = (m.youth_literacy_15_24 >= m.literacy).mean()
    check("youth literacy at least the 10+ rate", "convergent", f"{frac:.0%} of districts", ">= 90%", frac >= 0.9)
    # Fertility proxy: expected to fall with women's literacy and rise with early marriage.
    for x, y, sign in [("child_woman_ratio", "literacy_female", -1),
                       ("child_woman_ratio", "girls_15_19_ever_married", +1),
                       ("girls_15_19_ever_married", "literacy_female", -1),
                       ("housing_kacha", "flush_toilet", -1),
                       ("housing_kacha", "electricity", -1)]:
        r = m[x].rank().corr(m[y].rank())
        check(f"{x} vs {y}", "convergent", f"rho = {r:+.2f}, n = {m[[x, y]].dropna().shape[0]}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.3", np.sign(r) == sign and abs(r) >= 0.3)

    # External: child-woman ratio by province against DHS 2017-18 total fertility (rank order).
    p = g.join(dist.set_index("district_code").province_code).groupby("province_code")[["u5", "f15_49"]].sum()
    p["cwr"] = 1000 * p.u5 / p.f15_49
    wp = pd.read_csv(HERE.parent / "welfare/welfare_province.csv").set_index("province_code")
    x = p.join(wp[["dhs_tfr"]], how="inner").dropna()
    r = x.cwr.rank().corr(x.dhs_tfr.rank())
    check("child-woman ratio 2023 vs DHS 2017-18 TFR, provinces", "external",
          f"rho = {r:+.2f}, n = {len(x)} ({', '.join(f'{i} {v.cwr:.0f}/{v.dhs_tfr:.1f}' for i, v in x.iterrows())})",
          "rho >= 0.7", r >= 0.7)
    sr = 100 * g.u5_m.sum() / g.u5_f.sum()
    check("national sex ratio under 5", "external", f"{sr:.1f} boys per 100 girls",
          "103-110 (biological norm ~105; higher where girls are missing or under-counted)",
          103 <= sr <= 110, hard=False)

    # Write.
    outd = dist[["district_code", "district_name", "province_code", "geometry"]].merge(
        od.reset_index(), on="district_code", how="inner")
    outt = teh[["tehsil_code", "tehsil_name", "district_code", "province_code", "geometry"]].merge(
        ot.reset_index(), on="tehsil_code", how="inner")
    cb = pd.DataFrame([{"indicator": k, "definition": v[0], "census_table": v[1],
                        "source": "Pakistan Bureau of Statistics, Census 2023, via PakPC2023 0.2.0"}
                       for k, v in CODEBOOK.items()])
    outd.to_file(GPKG, layer="outcomes_ext_district", driver="GPKG")
    outt.to_file(GPKG, layer="outcomes_ext_tehsil", driver="GPKG")
    gpd.GeoDataFrame(cb, geometry=[None] * len(cb)).to_file(GPKG, layer="outcomes_ext_codebook", driver="GPKG")
    outd.drop(columns="geometry").to_csv(HERE / "outcomes_ext_district.csv", index=False)
    outt.drop(columns="geometry").to_csv(HERE / "outcomes_ext_tehsil.csv", index=False)
    cb.to_csv(HERE / "outcomes_ext_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "census_extended_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)

    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(outd)} districts, {len(outt)} tehsils | {len(CHECKS)} checks: "
          f"{sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    p = argparse.ArgumentParser()
    p.add_argument("--census", required=True)
    main(p.parse_args())
