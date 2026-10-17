"""
The same district indicators from the PSLM 2014-15 district microdata, and the change to 2019-20.

PBS publishes both rounds' Stata files; build_pslm_district.py does 2019-20. This script computes
the indicators both rounds ask in the same way - literacy 10+ (by sex), children 5-16 out of school,
full immunisation at 12-23 months, child diarrhoea, prenatal care, facility births, skilled birth
attendance, postnatal care, Lady Health Worker visits - and the change, 2019-20 minus 2014-15.

Checked the same way as 2019-20: the 2019-20 report prints each district's 2014-15 value in its
last column ("14-15"), so literacy (Table 2.14a), full immunisation (4.3C) and diarrhoea (4.6) are
compared district by district with PBS's own 2014-15 figures.

The 2014-15 file labels the vaccination codes that 2019-20 leaves bare: 1 yes on card, 2 yes on
recall, 3 no, 4 polio campaign. That confirms the reading build_pslm_district.py had to infer.

District frame: 2014-15's 114 districts. Karachi was one district (now six), Kohistan one (three),
Chitral one (two): children carry the parent's value, and **change is left empty wherever either
round's value is a parent's**, because it would compare a district with a different area.

Usage (from the repo root, after build_pslm_district.py):
  python pipeline/gis/outcomes/build_pslm_2015.py
"""
import csv, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

sys.path.insert(0, str(Path(__file__).resolve().parent))
import build_pslm_district as b       # noqa: E402  names, aliases, weighting and the report parser

HERE = b.HERE
GPKG = b.GPKG
DTA = b.SRC / "microdata_2014_15/Data in stata"
CHECKS = []
ALIAS15 = {**b.ALIAS, "bolankachhi": "kachhi", "tandomohammadkhan": "tandomuhammadkhan", "sheerani": "sherani",
           "killaabdullah": "killaabdullah", "killasaifullah": "killasaifullah", "naushahroferoze": "naushahroferoze",
           "shaheedbenazirabad": "shaheedbenazirabad"}
SPLIT15 = {**b.SPLIT, "karachi": ["centralkarachi", "eastkarachi", "southkarachi", "westkarachi", "korangikarachi",
                                  "malirkarachi"]}
SAME = {   # 2014-15 column -> the 2019-20 column it is the same question as
    "pslm15_literacy": "pslm_literacy", "pslm15_literacy_female": "pslm_literacy_female",
    "pslm15_out_of_school_5_16": "pslm_out_of_school_5_16", "pslm15_fully_immunised": "pslm_fully_immunised",
    "pslm15_diarrhoea_u5": "pslm_diarrhoea_u5", "pslm15_prenatal_care": "pslm_prenatal_care",
    "pslm15_facility_delivery": "pslm_facility_delivery", "pslm15_skilled_birth_attendance": "pslm_skilled_birth_attendance",
    "pslm15_postnatal_care": "pslm_postnatal_care", "pslm15_lhw_visited": "pslm_lhw_visited",
}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def rd(name, cols=None):
    return pd.read_stata(DTA / f"{name}.dta", convert_categoricals=False, columns=cols)


def district_map(dist):
    with pd.io.stata.StataReader(DTA / "plist.dta") as r:
        lab = r.value_labels()["district"]
    ocha = {b.norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    rows, missing = [], []
    for code, name in lab.items():
        n = ALIAS15.get(b.norm(name), b.norm(name))
        kids = SPLIT15.get(n)
        for k in (kids or [n]):
            if k in ocha:
                rows.append({"district": int(code), "pslm15_name": name, "district_code": ocha[k],
                             "pslm15_parent": name if kids else ""})
            else:
                missing.append(f"{name}->{k}")
    check("PSLM 2014-15 districts placed in OCHA districts", "integrity",
          f"{len(lab)} labels" + (f"; unplaced {missing}" if missing else ""), "all", not missing)
    return pd.DataFrame(rows)


def indicators():
    p = rd("plist", ["hhcode", "idc", "district", "age", "sbq04", "weight"]).rename(
        columns={"weight": "weights", "sbq04": "sb1q4"})
    hhw = p.drop_duplicates("hhcode").set_index("hhcode")[["district", "weights"]]
    person = lambda f, cols: rd(f, ["hhcode", "idc"] + cols).merge(p, on=["hhcode", "idc"], how="inner")
    out = {}

    c = person("sec_c", ["scq01", "scq03", "scq05"])
    a = c[c.age >= 10].copy()
    a["lit"] = (a.scq01 == 1).astype(float).where(a.scq01.notna())
    out["pslm15_literacy"] = b.wmean(a, "lit")
    out["pslm15_literacy_female"] = b.wmean(a[a.sb1q4 == 2], "lit")
    s = c[c.age.between(5, 16)].copy()
    s["oos"] = (s.scq05 != 1).astype(float)        # never attended (scq05 empty) or not now studying
    out["pslm15_out_of_school_5_16"] = b.wmean(s, "oos")

    h = person("sec_h", ["shq6a", "shq6b", "shq6c", "shq6d", "shq6e", "shq6f", "shq6g", "shq6k", "shq07"])
    ant = ["shq6a", "shq6b", "shq6c", "shq6d", "shq6e", "shq6f", "shq6g", "shq6k"]   # BCG, penta 1-3, polio 1-3, measles 1
    k = h[h.age == 1].copy()
    k["full"] = k[ant].isin([1, 2, 4]).all(axis=1).astype(float)
    out["pslm15_fully_immunised"] = b.wmean(k, "full")
    h["diar"] = (h.shq07 == 1).astype(float)
    out["pslm15_diarrhoea_u5"] = b.wmean(h, "diar")

    m = person("sec_i", ["siq01", "siq02", "siq08", "siq09", "siq10"])
    m = m[m.siq01 == 1].copy()
    m["anc"] = (m.siq02 == 1).astype(float)
    m["fac"] = m.siq08.isin([2, 3]).astype(float)
    m["sba"] = m.siq09.isin([2, 5, 6, 8]).astype(float)
    m["pnc"] = (m.siq10 == 1).astype(float)
    for k_, v in [("anc", "pslm15_prenatal_care"), ("fac", "pslm15_facility_delivery"),
                  ("sba", "pslm15_skilled_birth_attendance"), ("pnc", "pslm15_postnatal_care")]:
        out[v] = b.wmean(m, k_)

    d = rd("sec_d", ["hhcode", "sdq07"])
    d = d[d.sdq07.notna()].drop_duplicates("hhcode").join(hhw, on="hhcode", how="inner")
    d["lhw"] = (d.sdq07 == 1).astype(float)
    out["pslm15_lhw_visited"] = b.wmean(d, "lhw")
    return pd.DataFrame(out)


def fifteen_of(v):
    """The '14-15' column of a 2019-20 report row: urban, rural and total triples, rank, then 14-15.
    Districts created after 2015 (and Karachi's parts) print no 14-15 value."""
    if len(v) == 11:
        return v[10]
    if len(v) == 8 and not (v[3] == 0 and v[4] == 0):      # all-urban district: urban, total, rank, 14-15
        return v[7]
    return np.nan


def validate(ind, dm):
    print("validating against the '14-15' column of the PSLM 2019-20 report")
    by_name = dm.drop_duplicates("district").set_index("district").pslm15_name.map(b.norm)
    al = {"jaccobabad": "jacobabad", "chinniot": "chiniot", "bahawalnager": "bahawalnagar", "bhakhar": "bhakkar",
          "mandibahuddin": "mandibahauddin", "tandomuhdkhan": "tandomohammadkhan", "tandomuhammadkhan": "tandomohammadkhan",
          "bonair": "buner", "bunair": "buner", "torgarh": "torghar", "charsada": "charsadda", "bajur": "bajaur",
          "jehlum": "jhelum", "muzaffargarh": "muzaffargarh", "nowsheroferoze": "naushahroferoze",
          "shaheedbanazirabad": "shaheedbenazirabad", "mirpurkhas": "mirpurkhas", "sibi": "sibbi", "kachhibolan": "bolankachhi",
          "nasirabadtamboo": "nasirabadtamboo", "qillaabdullah": "killaabdullah", "qillasaifullah": "killasaifullah",
          "sherani": "sheerani", "tandoallahyar": "tandoallahyar", "umerkot": "umerkot", "dgkhan": "dgkhan"}
    rows = []
    for title, pages, col in [("literacy 10+ (Table 2.14a)", range(133, 137), "pslm15_literacy"),
                              ("fully immunised, recall and record (Table 4.3C)", range(234, 238), "pslm15_fully_immunised"),
                              ("diarrhoea under 5 (Table 4.6)", range(260, 264), "pslm15_diarrhoea_u5")]:
        pub = pd.Series({al.get(k, k): fifteen_of(v) for k, v in b.parse_table(pages).items()}, dtype=float).dropna()
        ours = ind[col].rename(index=by_name)
        j = pd.concat([ours.rename("ours"), pub.rename("pbs")], axis=1, join="inner").dropna()
        mad = (j.ours - j.pbs).abs().median() if len(j) else np.nan
        within = ((j.ours - j.pbs).abs() <= 2.5).mean() if len(j) else 0
        rows.append({"table": title, "n": len(j), "median_abs_diff": round(mad, 2), "share_within_2.5": round(within, 3)})
        check(f"2014-15 {title}: ours vs PBS's '14-15' column", "external",
              f"median |diff| {mad:.2f} points, {within:.0%} within 2.5, n = {len(j)}",
              "median <= 1.0 and >= 90% within 2.5 points", mad <= 1.0 and within >= 0.9 and len(j) >= 90)
    pd.DataFrame(rows).to_csv(HERE / "pslm15_validation.csv", index=False)


def main():
    dist = gpd.read_file(GPKG, layer="admin_district")
    print("PSLM 2014-15 district microdata")
    dm = district_map(dist)
    ind = indicators()
    validate(ind, dm)

    out = dm.merge(ind.round(2), left_on="district", right_index=True, how="inner").drop(columns="district")
    p20 = pd.read_csv(HERE / "outcomes_pslm_district.csv").set_index("district_code")
    out = out.join(p20[list(SAME.values()) + ["pslm_parent"]], on="district_code")
    same_area = (out.pslm15_parent.fillna("") == "") & (out.pslm_parent.fillna("") == "")
    for c15, c20 in SAME.items():
        out[f"chg_{c20.removeprefix('pslm_')}_15_20"] = (out[c20] - out[c15]).where(same_area).round(2)
    out = out.drop(columns=list(SAME.values()) + ["pslm_parent"])
    n_chg = int(out.chg_literacy_15_20.notna().sum())
    check("districts with a like-for-like change 2014-15 to 2019-20", "integrity", f"{n_chg}",
          ">= 100 (all but split and new districts)", n_chg >= 100)
    # A swapped pair of columns would make every district's change one-signed; real change is not.
    s = out.chg_literacy_15_20.dropna()
    check("literacy change has both signs across districts", "integrity",
          f"{(s > 0).sum()} up, {(s < 0).sum()} down", "both present", (s > 0).any() and (s < 0).any())

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(out, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_pslm15_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_pslm15_district.csv", index=False)
    defs = {
        "pslm15_literacy": "Literate (can read and write), population 10+, %, PSLM 2014-15",
        "pslm15_literacy_female": "Female literacy 10+, %, PSLM 2014-15",
        "pslm15_out_of_school_5_16": "Children 5-16 not currently studying, %, PSLM 2014-15",
        "pslm15_fully_immunised": "Children 12-23 months with BCG, penta 1-3, polio 1-3 (card, recall or campaign) and measles 1, %, PSLM 2014-15",
        "pslm15_diarrhoea_u5": "Children under 5 with diarrhoea in the last 30 days, %, PSLM 2014-15",
        "pslm15_prenatal_care": "Recent mothers with any prenatal care, %, PSLM 2014-15",
        "pslm15_facility_delivery": "Recent mothers whose last birth was in a facility, %, PSLM 2014-15",
        "pslm15_skilled_birth_attendance": "Recent mothers whose last birth was assisted by a doctor, nurse, midwife or LHV, %, PSLM 2014-15",
        "pslm15_postnatal_care": "Recent mothers with a postnatal check-up, %, PSLM 2014-15",
        "pslm15_lhw_visited": "Households visited by a Lady Health Worker, %, PSLM 2014-15",
    }
    for c15, c20 in SAME.items():
        defs[f"chg_{c20.removeprefix('pslm_')}_15_20"] = (f"Change 2014-15 to 2019-20 in: {defs[c15].rsplit(', PSLM', 1)[0]}"
                                                          ", points. Empty where either round's value is a parent district's")
    pd.DataFrame([{"indicator": k, "definition": v, "census_table": "PSLM 2014-15 microdata",
                   "source": "Pakistan Bureau of Statistics, PSLM 2014-15 (microdata)"} for k, v in defs.items()]
                 ).to_csv(HERE / "outcomes_pslm15_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "pslm15_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
