"""
District indicators from the provincial MICS 6 surveys, read from the sampling-error appendix of
each Survey Findings Report: one table per district listing the survey's headline indicators (each
with its MICS code), its value, standard error and 95% confidence interval.

That appendix is the same in every MICS 6 report, so one reader serves every province whose report
is present in sources/mics/ (see REPORTS). On 17 Oct 2026 that is Punjab 2017-18 (36 districts,
Volume III) and Sindh 2018-19 (29). The Khyber Pakhtunkhwa 2019 and Balochistan 2019-20 reports
are published at mics.unicef.org, which answers scripts with 403; saved there by hand under the
names in REPORTS, they are read with no change to this script.

What it adds that nothing else in the atlas has by district: under-five, infant and neonatal
mortality and the total fertility rate (each with its standard error, because district mortality
from a survey is imprecise and the reader must see how much), children's foundational reading and
numeracy, birth registration, violent discipline, child labour, child marriage, women's sense of
safety, discrimination, and young people's life satisfaction.

Checked: in Punjab the same report prints district TFR and under-five mortality in its Volume II
tables too, and the two must agree exactly (a misaligned column in either reading breaks that).
Then against other sources: TFR against the census's child-woman ratio, child marriage against the
NNS, foundational reading against census youth literacy.

Usage (from the repo root):
  python pipeline/gis/outcomes/build_mics_district.py
"""
import csv, re, subprocess, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
SRC = GIS / "sources/mics"
CHECKS = []
REPORTS = {   # province -> (file in sources/mics, survey label)
    "Punjab": ("punjab_mics_2017_18_vol3.pdf", "Punjab MICS 2017-18"),
    "Sindh": ("sindh_mics_2018_19_sfr.pdf", "Sindh MICS 2018-19"),
    "Khyber Pakhtunkhwa": ("kp_mics_2019_sfr.pdf", "Khyber Pakhtunkhwa MICS 2019"),
    "Balochistan": ("balochistan_mics_2019_20_sfr.pdf", "Balochistan MICS 2019-20"),
}
# MICS code (+ sex where the table gives one indicator per sex) -> (column, short label, is a share)
KEEP = {
    "CS.1": ("mics_neonatal_mortality", "Neonatal mortality per 1,000 live births (5 years before the survey)", False),
    "CS.3": ("mics_infant_mortality", "Infant mortality per 1,000 live births (5 years before the survey)", False),
    "CS.5": ("mics_under5_mortality", "Under-five mortality per 1,000 live births (5 years before the survey)", False),
    "TFR": ("mics_tfr", "Total fertility rate (3 years before the survey)", False),
    "TM.1": ("mics_adolescent_birth_rate", "Births per 1,000 women aged 15-19", False),
    "TM.3": ("mics_contraceptive_prevalence", "Married women using any contraception, %", True),
    "TM.4": ("mics_demand_satisfied_modern", "Demand for family planning satisfied with modern methods, %", True),
    "TM.5b": ("mics_anc4", "Women with a recent birth who had 4+ antenatal visits, %", True),
    "TM.9": ("mics_skilled_birth_attendance", "Births with a skilled attendant, %", True),
    "TC.3": ("mics_dtp3", "Children 12-23 months with DTP3, %", True),
    "TC.10": ("mics_measles", "Children with measles vaccination, %", True),
    "TC.45a": ("mics_stunted", "Children under 5 stunted, %", True),
    "TC.46a": ("mics_wasted", "Children under 5 wasted, %", True),
    "TC.53": ("mics_ecdi", "Children 24-59 months developmentally on track (ECDI), %", True),
    "LN.2": ("mics_early_learning", "Participation in organised learning a year before primary, %", True),
    "LN.22a": ("mics_reading_skills", "Children 7-14 with foundational reading skills, %", True),
    "LN.22d": ("mics_numeracy_skills", "Children 7-14 with foundational numeracy skills, %", True),
    "PR.1": ("mics_birth_registration", "Children under 5 whose birth is registered, %", True),
    "PR.2": ("mics_violent_discipline", "Children 1-14 who experienced violent discipline in the past month, %", True),
    "PR.3": ("mics_child_labour", "Children 5-17 in child labour, %", True),
    "PR.4a women": ("mics_married_before_15", "Women 20-24 married before 15, %", True),
    "PR.4b women": ("mics_married_before_18", "Women 20-24 married before 18, %", True),
    "PR.14 women": ("mics_feel_safe_women", "Women 15-49 who feel safe walking alone after dark, %", True),
    "PR.14 men": ("mics_feel_safe_men", "Men 15-49 who feel safe walking alone after dark, %", True),
    "WS.2": ("mics_basic_water", "Household members with basic drinking water service, %", True),
    "WS.6": ("mics_safely_managed_water", "Household members with safely managed drinking water (tested free of E. coli at source, on premises, available), %", True),
    "WS.7": ("mics_handwashing", "Household members with a handwashing facility with water and soap, %", True),
    "WS.9": ("mics_basic_sanitation", "Household members with basic sanitation service, %", True),
    "EQ.1": ("mics_child_functional_difficulty", "Children 2-17 with a functional difficulty, %", True),
    "EQ.3": ("mics_social_transfers", "Household members covered by social transfers, %", True),
    "EQ.7 women": ("mics_discrimination_women", "Women 15-49 who felt discriminated against in the past year, %", True),
    "EQ.9a women": ("mics_life_satisfaction_women", "Life satisfaction index, women 15-24 (0-10)", False),
    "EQ.9a men": ("mics_life_satisfaction_men", "Life satisfaction index, men 15-24 (0-10)", False),
    "SR.10 women": ("mics_mobile_women", "Women 15-49 who own a mobile phone, %", True),
    "SR.12a women": ("mics_internet_women", "Women 15-49 who used the internet in the last 3 months, %", True),
}
WITH_SE = {"mics_under5_mortality", "mics_infant_mortality", "mics_neonatal_mortality", "mics_tfr", "mics_reading_skills"}
ALIAS = {"dgkhan": "deraghazikhan", "rykhan": "rahimyarkhan", "ttsingh": "tobateksingh", "layyah": "leiah",
         "karachisouth": "southkarachi", "karachieast": "eastkarachi", "karachiwest": "westkarachi",
         "karachicentral": "centralkarachi", "korangi": "korangikarachi", "malir": "malirkarachi",
         "kambarshahdadkot": "kambarshahdadkot", "naushahroferoze": "naushahroferoze",
         "shaheedbenazirabad": "shaheedbenazirabad", "umerkot": "umerkot", "mirpurkhas": "mirpurkhas",
         "tandoallahyar": "tandoallahyar", "tandomuhammadkhan": "tandomuhammadkhan", "dikhan": "dikhan",
         "deraismailkhan": "dikhan", "kohistan": "kohistan", "jhelum": "jhelum", "mandibahauddin": "mandibahauddin"}
CODE = r"(?:[A-Z]{2}\.\d+[a-z]?|-)"
VAL = r"-?\d[\d,]*(?:\.\d+)?"
ROW = re.compile(rf"^\s*(.*?)\s*(?<!\S)({CODE})\s+({VAL})\s+({VAL})\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+(\S+)\s+({VAL})\s+({VAL})\s*$")


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def f(x):
    return np.nan if x in ("na", "", "-") else float(x.replace(",", ""))


def text(pdf):
    t = pdf.with_suffix(".txt")
    if not t.exists() or t.stat().st_mtime < pdf.stat().st_mtime:
        subprocess.run(["pdftotext", "-layout", str(pdf), str(t)], check=True)
    return t.read_text().splitlines()


def district_tables(lines):
    """{district name: [(key, value, se, lower, upper, unweighted n)]} from every SE table."""
    out = {}
    head = re.compile(r"^\s*Table SE\.\d+: Sampling errors: (.+?) District\s*$")
    cur = None
    seen_codes = {}
    for k, l in enumerate(lines):
        m = head.match(l)
        if m:
            cur = m.group(1).strip()
            out.setdefault(cur, [])
            seen_codes.setdefault(cur, {})
            continue
        if cur is None:
            continue
        if re.match(r"^\s*Table SE\.\d+:", l):          # a non-district SE table ends the run
            cur = None
            continue
        r = ROW.match(l)
        if not r:
            continue
        label = r.group(1).strip()
        if not label and k > 0:
            label = lines[k - 1].strip()
        code = r.group(2)
        if code == "-" and "fertility" in label.lower():
            code = "TFR"
        n_seen = seen_codes[cur].get(code, 0)
        seen_codes[cur][code] = n_seen + 1
        low = label.lower()
        sex = "women" if "(women" in low else "men" if "(men" in low else ("women" if n_seen == 0 else "men")
        out[cur].append((code, sex, f(r.group(3)), f(r.group(4)), f(r.group(10)), f(r.group(11)), f(r.group(9))))
    return out


def vol2_value(lines, title, col):
    """Punjab Volume II: the District block of a table, one number per district at position col."""
    i = next(k for k, l in enumerate(lines) if l.strip().startswith(title) and "..." not in l)
    out, in_d = {}, False
    for l in lines[i + 1:i + 120]:
        if re.match(r"^\s*District\s*$", l):
            in_d = True
            continue
        if in_d:
            m = re.match(rf"^\s+([A-Za-z][A-Za-z .]*?)\s{{2,}}((?:{VAL}\s+)*{VAL})\s*$", l)
            if m:
                out[norm(m.group(1))] = f(m.group(2).split()[col])
            elif l.strip() and not re.match(r"^\s*\d", l):
                if out:
                    break
    return out


def main():
    dist = gpd.read_file(GPKG, layer="admin_district")
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    rows, long, present = [], [], []
    for prov, (fname, survey) in REPORTS.items():
        pdf = SRC / fname
        if not pdf.exists():
            check(f"{survey} report present", "integrity", "absent", f"sources/mics/{fname}", False, hard=False,
                  note="mics.unicef.org refuses scripted downloads; save the Survey Findings Report there by hand")
            continue
        present.append(survey)
        tables = district_tables(text(pdf))
        check(f"{survey}: district sampling-error tables read", "integrity", f"{len(tables)} districts",
              "every district the survey was designed for", len(tables) >= 25)
        for name, items in tables.items():
            key = ALIAS.get(norm(name), norm(name))
            code = ocha.get(key)
            row = {"district_code": code, "mics_district": name, "mics_survey": survey}
            for c, sex, v, se, lo, hi, n in items:
                k = c if c in KEEP else f"{c} {sex}"
                if k not in KEEP:
                    continue
                col, label, share = KEEP[k]
                scale = 100 if share else 1
                row[col] = v * scale
                if col in WITH_SE:
                    row[f"{col}_se"] = se * scale
                long.append({"district_code": code, "mics_district": name, "survey": survey, "code": c, "sex": sex,
                             "indicator": col, "value": v * scale, "se": se * scale, "lower": lo * scale,
                             "upper": hi * scale, "unweighted_n": n})
            rows.append(row)
    d = pd.DataFrame(rows)
    unplaced = d[d.district_code.isna()].mics_district.tolist()
    check("MICS districts placed in OCHA districts", "integrity", f"{d.district_code.notna().sum()} of {len(d)}"
          + (f"; unplaced {unplaced}" if unplaced else ""), "all", not unplaced)
    d = d.dropna(subset=["district_code"])
    dup = d[d.duplicated("district_code", keep=False)]
    check("one MICS district per OCHA district", "integrity", "none shared" if dup.empty else ", ".join(dup.mics_district),
          "none shared", dup.empty)
    missing_cols = [v[0] for v in KEEP.values() if v[0] not in d.columns or d[v[0]].isna().all()]
    check("every kept MICS indicator found", "integrity", "all" if not missing_cols else ", ".join(missing_cols), "all",
          not missing_cols, hard=False)

    # Same report, two printings: Punjab's Volume II district tables against its Volume III SE tables.
    v2 = SRC / "punjab_mics_2017_18_vol2.pdf"
    if v2.exists() and "Punjab MICS 2017-18" in present:
        L2 = text(v2)
        p = d[d.mics_survey == "Punjab MICS 2017-18"].assign(n=lambda x: x.mics_district.map(norm)).set_index("n")
        for title, col, ours, tol in [("Table D TM.2.1:", 1, "mics_tfr", 0.051), ("Table D CS.2:", 4, "mics_under5_mortality", 0.5)]:
            pub = pd.Series(vol2_value(L2, title, col))
            j = pd.concat([p[ours].rename("se_table"), pub.rename("vol2")], axis=1, join="inner").dropna()
            bad = j[(j.se_table - j.vol2).abs() > tol]
            check(f"Punjab {ours}: Volume III SE tables vs Volume II district table", "integrity",
                  f"{len(j) - len(bad)} of {len(j)} equal" + (f"; differ: {bad.index.tolist()}" if len(bad) else ""),
                  "all 36 equal to the printed rounding", len(j) >= 30 and bad.empty)

    census = pd.read_csv(HERE / "outcomes_ext_district.csv").set_index("district_code")
    nns = pd.read_csv(HERE / "outcomes_nns_district.csv").set_index("district_code")
    c1 = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    o = d.set_index("district_code")
    for a, src, b, sign in [("mics_tfr", census, "child_woman_ratio", +1),
                            ("mics_married_before_18", nns, "nns_married_before_18", +1),
                            ("mics_reading_skills", census, "youth_literacy_15_24", +1),
                            ("mics_birth_registration", c1, "literacy_female", +1)]:
        x = o[[a]].join(src[[b]], how="inner").dropna()
        rho = x[a].rank().corr(x[b].rank())
        check(f"{a} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(rho) == sign and abs(rho) >= 0.4)
    # Under-five mortality is tested within each survey. Pooled, the two provinces give rho -0.06 (17 Oct
    # 2026): Punjab's district median is 72 per 1,000, Sindh's 42, a level gap between two surveys a
    # year apart that swamps the gradient inside each. Reported in the doc, not reconciled.
    x = o[["mics_under5_mortality", "mics_survey"]].join(c1[["literacy_female"]], how="inner").dropna()
    for survey, g in x.groupby("mics_survey"):
        rho = g.mics_under5_mortality.rank().corr(g.literacy_female.rank())
        check(f"{survey}: under-five mortality vs census female literacy, within the province", "convergent",
              f"rho = {rho:+.2f}, n = {len(g)}; median U5MR {g.mics_under5_mortality.median():.0f}",
              "sign -, |rho| >= 0.3", rho <= -0.3)

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(d, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_mics_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_mics_district.csv", index=False)
    pd.DataFrame(long).to_csv(HERE / "mics_district_long.csv", index=False)
    cb = [{"indicator": v[0], "definition": f"{v[1]}. MICS indicator {k.split()[0]}; "
                                             f"{', '.join(present)}, each province in its own survey year",
           "census_table": f"MICS {k.split()[0]}", "source": "Provincial MICS 6, Survey Findings Reports, Appendix C"}
          for k, v in KEEP.items()]
    cb += [{"indicator": f"{c}_se", "definition": f"Standard error of {c}", "census_table": "MICS SE tables",
            "source": "Provincial MICS 6, Survey Findings Reports, Appendix C"} for c in sorted(WITH_SE)]
    pd.DataFrame(cb).to_csv(HERE / "outcomes_mics_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "mics_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
