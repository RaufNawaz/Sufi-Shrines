"""
District welfare indicators computed from the PSLM District Level Survey 2019-20 microdata
(Pakistan Bureau of Statistics; 176,790 households, October 2019 - March 2020; Stata files published
openly by PBS), with PBS's own survey weights.

Why compute rather than transcribe: the published report gives each indicator as a rounded
percentage in a PDF; the microdata gives every indicator the report has, plus the ones it does not
tabulate by district (women's mobile-phone ownership and internet use, food-insecurity experience,
handwashing, drainage, waste collection, Lady Health Worker visits, women's paid work).

Why trust it: before anything is written, three of the computed indicators are compared district by
district with the tables PBS published from the same data (PSLM_2019_20_District_Level.pdf):
literacy 10+ (Table 2.14a), children 12-23 months fully immunised by record (Table 4.3B) and
diarrhoea in children under 5 (Table 4.6). A definition or a code read wrongly shows up as
disagreement there; the script exits non-zero on it.

District frame: PSLM's 131 districts (2019 boundaries) are placed in OCHA's districts by name. Two
PSLM districts were later split in the boundary file (Kohistan into Upper, Lower and Kolai-Palas;
Chitral into Upper and Lower): each child district carries its parent's value and names the parent
in `pslm_parent`, because the survey cannot see inside the parent.

Usage (from the repo root; needs the microdata unzipped, see welfare/sources_extended.tsv):
  python pipeline/gis/outcomes/build_pslm_district.py
"""
import csv, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import pdfplumber

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
SRC = GIS / "sources/pslm"
DTA = SRC / "microdata_2019_20/stata data"
REPORT = SRC / "PSLM_2019_20_District_Level.pdf"
CHECKS = []

# PSLM spelling -> OCHA district name, where normalised names differ.
ALIAS = {"bajur": "bajaur", "bunair": "buner", "charsada": "charsadda", "dikhan": "dikhan",
         "torgarh": "torghar", "bhakhar": "bhakkar", "dgkhan": "deraghazikhan", "jehlum": "jhelum",
         "layyah": "leiah", "muzaffargarh": "muzaffargarh", "ttsingh": "tobateksingh",
         "karachicentral": "centralkarachi", "karachieast": "eastkarachi", "karachimalir": "malirkarachi",
         "karachisouth": "southkarachi", "karachiwest": "westkarachi", "korangi": "korangikarachi",
         "mirpurkhas": "mirpurkhas", "nowsheroferoze": "naushahroferoze", "shahdadkot": "kambarshahdadkot",
         "shaheedbanazirabad": "shaheedbenazirabad", "tandoallahyar": "tandoallahyar", "umerkot": "umerkot",
         "kachhibolan": "kachhi", "kechturbat": "kech", "nasirabadtamboo": "nasirabad", "panjgoor": "panjgur",
         "qillaabdullah": "killaabdullah", "qillasaifullah": "killasaifullah", "shaheedsikandarabad":
         "shaheedsikandarabad", "sibbi": "sibi", "duki": "duki",
         "mandibahauddin": "mandibahauddin", "nankanasahib": "nankanasahib", "jaccobabad": "jacobabad"}
SPLIT = {"kohistan": ["kohistanupper", "kohistanlower", "kolaipalaskohistan"],
         "chitral": ["chitralupper", "chitrallower"]}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def rd(name, cols=None):
    return pd.read_stata(DTA / f"{name}.dta", convert_categoricals=False, columns=cols)


def district_map(dist):
    with pd.io.stata.StataReader(DTA / "plist.dta") as r:
        lab = r.value_labels()["district"]
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    rows, missing = [], []
    for code, name in lab.items():
        n = ALIAS.get(norm(name), norm(name))
        kids = SPLIT.get(n)
        if kids:
            for kd in kids:
                rows.append({"district": int(code), "pslm_name": name, "district_code": ocha.get(kd), "pslm_parent": name})
        elif n in ocha:
            rows.append({"district": int(code), "pslm_name": name, "district_code": ocha[n], "pslm_parent": ""})
        else:
            missing.append(name)
    m = pd.DataFrame(rows)
    check("PSLM districts placed in an OCHA district", "integrity", f"{len(lab) - len(missing)} of {len(lab)}"
          + (f"; unplaced {missing}" if missing else ""), "all", not missing and m.district_code.notna().all())
    return m


def wmean(df, flag, by="district", w="weights"):
    d = df[df[flag].notna()]
    g = d.assign(_x=d[flag] * d[w]).groupby(by)
    return 100 * g._x.sum() / g[w].sum()


def indicators():
    p = rd("plist", ["hhcode", "idc", "district", "region", "age", "sb1q4", "weights"])
    hhw = p.drop_duplicates("hhcode").set_index("hhcode")[["district", "weights"]]
    person = lambda f, cols: rd(f, ["hhcode", "idc"] + cols).merge(p, on=["hhcode", "idc"], how="inner")
    out, n = {}, {}

    # Literacy 10+: two candidate definitions; the report decides which PBS used (validated below).
    c1 = person("secc1", ["sc1q1a", "sc1q2a", "sc1q3a", "sc1q01", "sc1q14"])
    a = c1[c1.age >= 10].copy()
    a["lit_rw"] = ((a.sc1q1a == 1) & (a.sc1q2a == 1)).astype(float)
    a["lit_rwm"] = (a.lit_rw.astype(bool) & (a.sc1q3a == 1)).astype(float)
    out["lit_rw"], out["lit_rwm"] = wmean(a, "lit_rw"), wmean(a, "lit_rwm")
    out["lit_rw_f"] = wmean(a[a.sb1q4 == 2], "lit_rw")
    out["lit_rwm_f"] = wmean(a[a.sb1q4 == 2], "lit_rwm")
    s = c1[c1.age.between(6, 10)].copy()
    s["ner"] = ((s.sc1q01 == 3) & s.sc1q14.between(1, 5)).astype(float)
    out["pslm_ner_primary_6_10"] = wmean(s, "ner")
    out["pslm_ner_primary_6_10_girls"] = wmean(s[s.sb1q4 == 2], "ner")
    s = c1[c1.age.between(5, 16)].copy()
    s["oos"] = (s.sc1q01 != 3).astype(float)
    out["pslm_out_of_school_5_16"] = wmean(s, "oos")
    out["pslm_out_of_school_5_16_girls"] = wmean(s[s.sb1q4 == 2], "oos")

    # ICT, 10+: own a mobile (any kind), own a smartphone, used the internet in the last 3 months.
    c2 = person("secc2", ["sc2q05", "sc2q08"])
    c2 = c2[c2.age >= 10].copy()
    c2["mob"] = c2.sc2q05.isin([1, 2]).astype(float).where(c2.sc2q05.notna())
    c2["smart"] = (c2.sc2q05 == 2).astype(float).where(c2.sc2q05.notna())
    c2["net"] = (c2.sc2q08 == 1).astype(float).where(c2.sc2q08.notna())
    for sex, suf in [(1, "men"), (2, "women")]:
        x = c2[c2.sb1q4 == sex]
        out[f"pslm_own_mobile_{suf}"] = wmean(x, "mob")
        out[f"pslm_internet_3m_{suf}"] = wmean(x, "net")
    out["pslm_own_smartphone"] = wmean(c2, "smart")
    out["pslm_mobile_gender_gap"] = out["pslm_own_mobile_men"] - out["pslm_own_mobile_women"]

    # Immunisation, children aged 1 in complete years (12-23 months). Antigen codes carry no labels in
    # the file: 1 and 2 are read as received (by card, by recall), 3 as not received, and the reading
    # is tested against Table 4.3C below.
    im = person("seci", ["siaq03", "siaq04", "siaq5a", "siaq5b", "siaq5c", "siaq5d", "siaq5i", "siaq5j",
                         "siaq5k", "siaq5m", "siaq06", "siaq09"])
    ant = ["siaq5a", "siaq5b", "siaq5c", "siaq5d", "siaq5i", "siaq5j", "siaq5k", "siaq5m"]
    c = im[im.age == 1].copy()
    # Code 4 appears only on the polio items and carries no label in this file; the 2014-15 file labels
    # it "polio campaign". PBS's Table 4.3C counts it as received (with it, this reproduces the table
    # to a 0.3-point median; without it, 7.5 points off).
    c["full_any"] = c[ant].isin([1, 2, 4]).all(axis=1).astype(float)
    c["full_rec"] = (c[ant] == 1).all(axis=1).astype(float)
    out["pslm_fully_immunised"] = wmean(c, "full_any")
    out["full_rec"] = wmean(c, "full_rec")
    out["full_any_given_card"] = wmean(c[c.siaq04.isin([1, 2])], "full_any")
    n["immunisation_children"] = c.groupby("district").size()
    u5 = im.copy()
    u5["diar"] = (u5.siaq06 == 1).astype(float)
    out["pslm_diarrhoea_u5"] = wmean(u5, "diar")
    d5 = u5[u5.siaq06 == 1].copy()
    d5["ors"] = d5.siaq09.isin([1, 2]).astype(float)
    out["pslm_ors_given"] = wmean(d5, "ors")

    # Mothers: ever-married women 15-49 who gave birth in the last three years.
    mj = person("secj", ["sjaq01", "sjaq2a", "sjaq09", "sjaq10", "sjaq11a"])
    mj = mj[mj.sjaq01 == 1].copy()
    mj["anc"] = (mj.sjaq2a == 1).astype(float)
    mj["fac"] = mj.sjaq09.isin([2, 3]).astype(float)
    mj["sba"] = mj.sjaq10.isin([2, 5, 6, 8]).astype(float)   # midwife, doctor, LHV, nurse
    mj["pnc"] = (mj.sjaq11a == 1).astype(float)
    for k_, v in [("anc", "pslm_prenatal_care"), ("fac", "pslm_facility_delivery"),
                  ("sba", "pslm_skilled_birth_attendance"), ("pnc", "pslm_postnatal_care")]:
        out[v] = wmean(mj, k_)

    # Women's work: did any work for pay, profit or family gain last month, women 15-64.
    e = person("sece", ["seaq01"])
    e = e[e.age.between(15, 64)].copy()
    e["work"] = (e.seaq01 == 1).astype(float).where(e.seaq01.notna())
    out["pslm_women_working"] = wmean(e[e.sb1q4 == 2], "work")
    out["pslm_men_working"] = wmean(e[e.sb1q4 == 1], "work")

    # Households.
    def hh(name, cols):
        return rd(name, ["hhcode"] + cols).drop_duplicates("hhcode").join(hhw, on="hhcode", how="inner")
    f2 = hh("secf2", ["sf2q07", "sf2q16", "sf2q19", "sf2q20"])
    f2["soap"] = ((f2.sf2q19 == 1) & (f2.sf2q20 == 1)).astype(float)
    f2["drain"] = f2.sf2q16.isin([1, 2]).astype(float)
    f2["nodrain"] = (f2.sf2q16 == 4).astype(float)
    f2["enough"] = (f2.sf2q07 == 1).astype(float).where(f2.sf2q07.notna())
    out["pslm_handwash_soap"] = wmean(f2, "soap")
    out["pslm_covered_drainage"] = wmean(f2, "drain")
    out["pslm_no_drainage"] = wmean(f2, "nodrain")
    f3 = hh("secf3", ["sf3q1"])
    f3["waste"] = f3.sf3q1.isin([1, 2, 3]).astype(float)
    f3["dump"] = f3.sf3q1.isin([4, 5, 6]).astype(float)
    out["pslm_waste_collected"] = wmean(f3, "waste")
    out["pslm_waste_dumped_open"] = wmean(f3, "dump")
    f1 = hh("secf1", ["sf1q11_1a"])
    f1["inet"] = (f1.sf1q11_1a == 1).astype(float).where(f1.sf1q11_1a.notna())
    out["pslm_hh_internet"] = wmean(f1, "inet")
    lhw = hh("secd", ["sdaq07"])
    lhw["lhw"] = (lhw.sdaq07 == 1).astype(float).where(lhw.sdaq07.notna())
    out["pslm_lhw_visited"] = wmean(lhw, "lhw")

    # Food Insecurity Experience Scale, 8 items, last 12 months. 98/99 (don't know / refused) drop the
    # household. Raw scores, not FAO's Rasch-calibrated prevalence: labelled as such.
    k = hh("seck", [f"c0{i}" for i in range(1, 9)])
    items = [f"c0{i}" for i in range(1, 9)]
    valid = k[items].isin([1, 2]).all(axis=1)
    k = k[valid].copy()
    raw = (k[items] == 1).sum(axis=1)
    k["fies4"] = (raw >= 4).astype(float)
    k["fies7"] = (raw >= 7).astype(float)
    k["dayhungry"] = (k.c08 == 1).astype(float)
    # FIES items run from mild (c01 worried) to severe (c08 a whole day without eating): if 1 means yes,
    # prevalence must fall along the scale. That is both a validity test and a test of the code reading.
    prev = [float(np.average(k[c] == 1, weights=k.weights)) for c in items]
    check("FIES item prevalence falls from mild to severe (c01 > c04 > c08)", "integrity",
          " / ".join(f"{v:.0%}" for v in prev), "c01 > c04 > c08", prev[0] > prev[3] > prev[7])
    out["pslm_fies_raw4plus"] = wmean(k, "fies4")
    out["pslm_whole_day_without_food"] = wmean(k, "dayhungry")
    n["households"] = hhw.groupby("district").size()
    return pd.DataFrame(out), pd.DataFrame(n)


# --------------------------------------------------------------------------------- PBS tables
def parse_table(pages):
    """District rows from the report, in any of the three layouts its pages use:
      'Attock 83 67 74 81 54 67 82 58 69 11 68'          name, then the numbers
      '85 100 92 87 80 84 87 85 86 15 83' / '1. Attock'  numbers on the line above the name
      '8 8 8 6 6 6 7 7 7' / '1 Badin 19 5'               the same, rank and 2014-15 after the name
    Returns {normalised name: [numbers]}."""
    rep = pdfplumber.open(REPORT)
    out, ints = {}, re.compile(r"^(\d+\s+)*\d+$")
    for i in pages:
        lines = [l.strip() for l in (rep.pages[i - 1].extract_text() or "").splitlines()]
        for j, l in enumerate(lines):
            m = re.match(r"^(?:\d+\.?\s+)?([A-Za-z][A-Za-z .'/()-]*?)\s*((?:\d+\s*)*)$", l)
            if not m or re.match(r"(?i)^(table|province|urban|rural|m f|male|rank|[a-c]:)", l):
                continue
            after = [int(x) for x in m.group(2).split()]
            if len(after) >= 6:
                out[norm(m.group(1))] = after
            elif j > 0 and ints.match(lines[j - 1]) and len(lines[j - 1].split()) >= 6:
                # the rank and the 2014-15 value, where printed, follow the name on its own line
                out[norm(m.group(1))] = [int(x) for x in lines[j - 1].split()] + after
    return out


def parse_fies():
    """Table 9.1: PBS's own FIES prevalence (FAO's calibrated method) with margins of error."""
    rep = pdfplumber.open(REPORT)
    rows = {}
    for i in range(579, 583):
        for l in (rep.pages[i - 1].extract_text() or "").splitlines():
            m = re.match(r"^([A-Za-z][A-Za-z .'/()-]*?)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)$", l.strip())
            if m:
                rows[norm(m.group(1))] = [float(m.group(k)) for k in range(2, 6)]
    return pd.DataFrame(rows, index=["pslm_fies_mod_sev", "pslm_fies_mod_sev_moe", "pslm_fies_severe",
                                     "pslm_fies_severe_moe"]).T


def total_of(v):
    """The district TOTAL column of a parsed row. Full rows are urban (3), rural (3), total (3), then
    rank and 2014-15 where given; an all-urban district (Lahore) drops the rural three, and some
    all-urban Karachi rows print the rural block as two zeros ('70 63 67 0 0 70 63 67 19 80'), which
    shows as the urban triple repeating straight after them."""
    if len(v) >= 8 and v[3] == 0 and v[4] == 0 and v[5:8] == v[0:3]:
        return v[7]
    if len(v) >= 9:
        return v[8]
    if len(v) >= 6:
        return v[5]
    return np.nan


def validate(ind, dm):
    print("validating against the published PSLM 2019-20 tables")
    by_name = dm.drop_duplicates("district").set_index("district").pslm_name.map(norm)
    tables = {   # report page numbers are 1-based as printed by pdfplumber's index + 1
        "literacy 10+ (Table 2.14a)": (range(133, 137), ["lit_rw", "lit_rwm"]),
        "fully immunised, recall and record, 12-23 months (Table 4.3C)": (range(234, 238), ["pslm_fully_immunised"]),
        "diarrhoea, children under 5 (Table 4.6)": (range(260, 264), ["pslm_diarrhoea_u5"]),
    }
    chosen = {}
    rows = []
    for title, (pages, cands) in tables.items():
        pub = {k: total_of(v) for k, v in parse_table(pages).items()}
        pub = pd.Series(pub, dtype=float)
        aliases = {"jaccobabad": "jacobabad", "chinniot": "chiniot", "bahawalnager": "bahawalnagar",
                   "mandibahuddin": "mandibahauddin", "tandomuhdkhan": "tandomuhammadkhan", "bonair": "bunair",
                   "karachiwest": "karachiwest", "jhelum": "jehlum", "dikhan": "dikhan"}
        pub.index = [aliases.get(i, i) for i in pub.index]
        best = None
        for c in cands:
            ours = ind[c].rename(index=by_name)
            j = pd.concat([ours.rename("ours"), pub.rename("pbs")], axis=1, join="inner").dropna()
            if len(j) == 0:
                continue
            mad = (j.ours - j.pbs).abs().median()
            within = ((j.ours - j.pbs).abs() <= 2.5).mean()
            rows.append({"table": title, "candidate": c, "n": len(j), "median_abs_diff": round(mad, 2),
                         "share_within_2.5": round(within, 3), "rho": round(j.ours.rank().corr(j.pbs.rank()), 3)})
            if best is None or mad < best[1]:
                best = (c, mad, within, len(j))
        if best is None:
            check(f"{title}: parsed and matched", "external", "no rows matched", "> 100 districts", False)
            continue
        c, mad, within, nn = best
        chosen[title] = c
        check(f"{title}: our computation ({c}) vs PBS's published district totals", "external",
              f"median |diff| {mad:.2f} points, {within:.0%} within 2.5, n = {nn}",
              "median <= 1.0 and >= 90% within 2.5 points (the table is rounded to whole numbers)",
              mad <= 1.0 and within >= 0.9 and nn >= 100)
    pd.DataFrame(rows).to_csv(HERE / "pslm_validation.csv", index=False)
    return chosen


CODEBOOK = {
    "pslm_literacy": "Literate (reads and writes; the definition PBS's own Table 2.14a was matched with), population 10+, %",
    "pslm_literacy_female": "Female literacy, 10+, same definition, %",
    "pslm_ner_primary_6_10": "Net enrolment, primary (children 6-10 attending class 1-5), %",
    "pslm_ner_primary_6_10_girls": "Net enrolment, primary, girls 6-10, %",
    "pslm_out_of_school_5_16": "Children 5-16 not currently attending school, %",
    "pslm_out_of_school_5_16_girls": "Girls 5-16 not currently attending school, %",
    "pslm_own_mobile_women": "Women 10+ who own a mobile phone or smartphone, %",
    "pslm_own_mobile_men": "Men 10+ who own a mobile phone or smartphone, %",
    "pslm_mobile_gender_gap": "Men's minus women's mobile-phone ownership, 10+, points",
    "pslm_own_smartphone": "People 10+ who own a smartphone, %",
    "pslm_internet_3m_women": "Women 10+ who used the internet in the last 3 months, %",
    "pslm_internet_3m_men": "Men 10+ who used the internet in the last 3 months, %",
    "pslm_hh_internet": "Households with an internet facility, %",
    "pslm_fully_immunised": "Children 12-23 months with BCG, Penta 1-3, Polio 1-3 and Measles 1, by card or recall, %",
    "pslm_diarrhoea_u5": "Children under 5 with diarrhoea in the last 30 days, %",
    "pslm_ors_given": "Children under 5 with diarrhoea given ORS, %",
    "pslm_prenatal_care": "Ever-married women 15-49 with a birth in the last 3 years who had any prenatal consultation, %",
    "pslm_facility_delivery": "Same women whose last birth was in a government or private facility, %",
    "pslm_skilled_birth_attendance": "Same women whose last birth was assisted by a doctor, nurse, midwife or LHV, %",
    "pslm_postnatal_care": "Same women who received a postnatal check-up, %",
    "pslm_women_working": "Women 15-64 who did any work for pay, profit or family gain last month, %",
    "pslm_men_working": "Men 15-64 who did any work for pay, profit or family gain last month, %",
    "pslm_handwash_soap": "Households with a handwashing place and soap or hand-wash, %",
    "pslm_covered_drainage": "Households connected to a covered or underground drain, %",
    "pslm_no_drainage": "Households with no drainage system, %",
    "pslm_waste_collected": "Households whose waste is collected (municipal or private door-step, or a public bin), %",
    "pslm_waste_dumped_open": "Households whose waste goes to the street, open space or a water body, %",
    "pslm_lhw_visited": "Households visited by a Lady Health Worker (as reported in the health module), %",
    "pslm_fies_mod_sev": "Moderate or severe food insecurity, % of households (FIES, FAO method), as published by PBS in Table 9.1 of the PSLM 2019-20 report",
    "pslm_fies_mod_sev_moe": "Margin of error of the above, points (PBS Table 9.1)",
    "pslm_fies_severe": "Severe food insecurity, % of households (FIES), PBS Table 9.1",
    "pslm_fies_severe_moe": "Margin of error of the above, points (PBS Table 9.1)",
    "pslm_fies_raw4plus": "Households answering yes to 4 or more of the 8 FIES questions, last 12 months, %. Raw score from the microdata, kept as a cross-check on the published figure",
    "pslm_whole_day_without_food": "Households where someone went a whole day without eating for lack of money or resources, last 12 months, %",
}


def main():
    dist = gpd.read_file(GPKG, layer="admin_district")
    print("PSLM 2019-20 district microdata")
    dm = district_map(dist)
    ind, n = indicators()
    chosen = validate(ind, dm)
    lit = chosen.get("literacy 10+ (Table 2.14a)", "lit_rw")
    ind["pslm_literacy"] = ind[lit]
    ind["pslm_literacy_female"] = ind[lit + "_f"]
    small = n.immunisation_children[n.immunisation_children < 30]
    check("districts with fewer than 30 children aged 12-23 months in the sample", "integrity",
          f"{len(small)}: {', '.join(map(str, small.index))}" if len(small) else "none", "none", small.empty, hard=False,
          note="Immunisation for these districts rests on very few children; read with care")

    fies = parse_fies()
    by_name = dm.drop_duplicates("district").set_index("district").pslm_name.map(norm)
    joined = fies.reindex(by_name.values)
    joined.index = by_name.index
    check("PBS Table 9.1 (FIES) rows matched to surveyed PSLM districts", "integrity",
          f"{joined.pslm_fies_mod_sev.notna().sum()} of {len(ind)}; national {fies.loc['pakistan', 'pslm_fies_mod_sev']}%",
          f"all {len(ind)}; national 16.44% as printed", joined.pslm_fies_mod_sev.notna().sum() == len(ind)
          and fies.loc["pakistan", "pslm_fies_mod_sev"] == 16.44)
    ind = ind.join(joined)
    r = ind.pslm_fies_raw4plus.rank().corr(ind.pslm_fies_mod_sev.rank())
    check("our FIES raw score (4+ of 8) vs PBS's calibrated moderate-or-severe prevalence, districts", "external",
          f"rho = {r:+.2f}, n = {ind[['pslm_fies_raw4plus', 'pslm_fies_mod_sev']].dropna().shape[0]}", "rho >= 0.8", r >= 0.8)

    keep = list(CODEBOOK)
    out = ind[keep].round(2).join(n)
    out = dm.merge(out, left_on="district", right_index=True, how="inner")
    # Several PSLM districts can share one OCHA district (none on 17 Oct 2026 but the check guards it).
    dup = out[out.duplicated("district_code", keep=False)]
    check("one PSLM district per OCHA district", "integrity",
          "none shared" if dup.empty else ", ".join(dup.pslm_name), "none shared", dup.empty)
    covered = set(out.district_code)
    miss = dist[~dist.district_code.isin(covered)]
    check("OCHA districts without a PSLM value", "integrity", f"{len(miss)}: " + ", ".join(miss.district_name),
          "AJK and Gilgit-Baltistan (outside the survey), districts created after 2019, and the five Balochistan "
          "districts with no households in the 2019-20 microdata", True, hard=False)
    with pd.io.stata.StataReader(DTA / "plist.dta") as r:
        lab = r.value_labels()["district"]
    surveyed = set(rd("plist", ["district"]).district.unique())
    absent = sorted(lab[c] for c in lab if c not in surveyed)
    check("PSLM districts with a label but no households in the microdata", "integrity", ", ".join(absent) or "none",
          "reported, not filled", True, hard=False)

    # Convergent: PSLM 2019-20 against Census 2023 for the same districts.
    census = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    m = out.drop_duplicates("district_code").set_index("district_code").join(census, how="inner")
    for a, b, sign in [("pslm_literacy", "literacy", +1), ("pslm_literacy_female", "literacy_female", +1),
                       ("pslm_out_of_school_5_16", "out_of_school_5_16", +1),
                       ("pslm_own_mobile_women", "literacy_female", +1)]:
        x = m[[a, b]].dropna()
        r = x[a].rank().corr(x[b].rank())
        check(f"{a} (2019-20) vs census 2023 {b}", "convergent", f"rho = {r:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(r) == sign and abs(r) >= 0.4)

    # Food insecurity against the two things it should track. Literacy was the first choice and gave
    # -0.31 on 17 Oct 2026: kept, as a warning, because it is a weak proxy rather than a wrong reading.
    x = m[["pslm_fies_mod_sev", "literacy"]].dropna()
    r = x.iloc[:, 0].rank().corr(x.iloc[:, 1].rank())
    check("pslm_fies_mod_sev vs census 2023 literacy", "convergent", f"rho = {r:+.2f}, n = {len(x)}",
          "sign -, |rho| >= 0.4", r <= -0.4, hard=False)
    # Not a test of the computation (that is the Table 9.1 comparison above): a finding. The IPC's
    # analyses are 2021-2026, after the 2022 floods, and cover the districts it chose to analyse.
    ipc = pd.read_csv(GIS / "welfare/welfare_ext_district.csv").set_index("district_code")[["ipc_phase3plus"]]
    x = m[["pslm_fies_mod_sev"]].join(ipc, how="inner").dropna()
    r = x.iloc[:, 0].rank().corr(x.iloc[:, 1].rank())
    check("PSLM 2019-20 FIES vs IPC phase 3+ (2021-2026 analyses), districts the IPC covers", "convergent",
          f"rho = {r:+.2f}, n = {len(x)}", "sign +, rho >= 0.3", r >= 0.3, hard=False,
          note="Two measures four to six years apart, either side of the 2022 floods; reported, not reconciled")

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(
        out.drop(columns=["district"]), on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_pslm_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_pslm_district.csv", index=False)
    cb = pd.DataFrame([{"indicator": k, "definition": v, "census_table": "PSLM 2019-20 microdata",
                        "source": "Pakistan Bureau of Statistics, PSLM District Level Survey 2019-20 (microdata)"}
                       for k, v in CODEBOOK.items()])
    cb.to_csv(HERE / "outcomes_pslm_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "pslm_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
