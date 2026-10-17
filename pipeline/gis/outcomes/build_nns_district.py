"""
District nutrition, water quality and social protection from the National Nutrition Survey 2018
(Government of Pakistan and UNICEF; 100,304 households, the first NNS designed to be representative
by district), read from the district tables of its full report, Volume 2.

It reaches places the census and PSLM do not: Azad Jammu and Kashmir, Gilgit-Baltistan and the
former tribal agencies. And it measures things nothing else in the atlas does: E. coli and arsenic
in the water households actually drink (tested, not reported), clinical anaemia in children,
women's nutritional status, marriage before 18 among women now 20-24, and coverage by government
social protection.

Read with pdftotext -layout (poppler; pdfplumber took > 10 minutes on the 380-page volume). Each
district row is an upper-case name and its numbers; a name the layout broke around its numbers
('TANDO' / 'MUHAMMAD 45.0 ...' / 'KHAN') is rebuilt from the neighbouring lines, accepted only if it
then names a real district. A page number printed on a row's line is trimmed by holding every row
to its table's usual column count.

Checked: each table's national TOTAL row against the figure the separately published Key Findings
Report states (stunting 40.2, wasting 17.7, underweight 28.9, overweight 9.5, food secure 63.1);
the two places the NNS's own reports disagree with each other are recorded as warnings, both
figures given. Then district stunting against the DHS modelled surface, and marriage before 18
against the census's girls 15-19 ever married.

District frame: the 2018 districts. Kohistan and Chitral (since split) carry their value into each
child district, the parent named. Hattian Bala is placed in Jhelum Valley (the district's present
name). The six Frontier Regions and 'Baltistan' have no unambiguous counterpart in the boundary file
and are reported, not placed.

Usage (from the repo root):
  python pipeline/gis/outcomes/build_nns_district.py
"""
import csv, re, subprocess, sys
from collections import Counter
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
SRC = GIS / "sources/nns2018"
CHECKS = []
# '*' is a suppressed cell (too few cases): read as missing. A value in parentheses rests on 25-49
# unweighted cases (the survey's own convention): kept, and flagged in nns_small_n_<indicator>.
NUM = r"(?:-?\d+(?:\.\d+)?|\*|\(-?\d+(?:\.\d+)?\))"
UPPER_ONLY = re.compile(r"^\s*[A-Z][A-Z .'&/()\-]*\s*$")
NUMS_ONLY = re.compile(rf"^\s*(?:{NUM}\s+)+{NUM}\s*$")

# indicator -> (table title as printed, column index in the row's numbers, definition)
TABLES = {
    "nns_stunted": ("Table D2.3:", 4, "Children under 5 stunted (height-for-age below -2 SD), %"),
    "nns_wasted": ("Table D2.3:", 8, "Children under 5 wasted (weight-for-height below -2 SD), %"),
    "nns_underweight": ("Table D2.3:", 0, "Children under 5 underweight (weight-for-age below -2 SD), %"),
    "nns_child_overweight": ("Table D2.3:", 10, "Children under 5 overweight (weight-for-height above +2 SD), %"),
    "nns_food_secure": ("Table D1.6:", 0, "Household members in food-secure households (FIES, NNS classification), %"),
    "nns_food_insecure_severe": ("Table D1.6:", 3, "Household members in severely food-insecure households (FIES, NNS classification), %"),
    "nns_ecoli_water": ("Table D5.1:", 7, "Households whose drinking water tested positive for E. coli (>= 1 cfu/ml), %"),
    "nns_arsenic_over_10ppb": ("Table D5.3:", 6, "Households whose drinking water has more than 10 ppb arsenic (WHO guideline), %"),
    "nns_arsenic_over_50ppb": ("Table D5.3:", 7, "Households whose drinking water has more than 50 ppb arsenic (Pakistan standard), %"),
    "nns_social_protection": ("Table.D1.18:", 1, "Households benefiting from a government social protection scheme in the last 12 months, %"),
    "nns_iodized_salt": ("Table D1.17:", 4, "Households using adequately iodized salt (>= 15 ppm), % of households tested"),
    "nns_child_clinical_anaemia": ("Table D2.13:", 1, "Children 6-59 months with clinical anaemia on physical examination, %"),
    "nns_child_disability": ("Table D2.12:", 6, "Children 24-59 months with a functional difficulty in at least one domain, %"),
    "nns_married_before_18": ("Table D4.4:", 1, "Women 20-24 who were married before age 18, %"),
    "nns_married_before_15": ("Table D4.4:", 0, "Women 20-24 who were married before age 15, %"),
    "nns_women_underweight": ("Table D4.2:", 0, "Women 15-49 underweight (BMI < 18.5), %"),
    "nns_women_obese": ("Table D4.2:", 3, "Women 15-49 obese (BMI > 30), %"),
}
# National figures stated in the Key Findings Report (KeyFindings-NationalNutritionSurvey2018.pdf),
# read from its text on 17 Oct 2026: indicator -> (value, how it is worded there).
KFR = {
    "nns_stunted": (40.2, "The national average (40.2%)"),
    "nns_wasted": (17.7, "17.7% suffer from wasting"),
    "nns_underweight": (28.9, "almost one in three children underweight (28.9%)"),
    "nns_child_overweight": (9.5, "a high prevalence of overweight (9.5%)"),
    "nns_food_secure": (63.1, "More than half of households (63.1%) are food secure"),
    "nns_ecoli_water": (36.0, "About 36.0% of households in Pakistan drink water contaminated with E. Coli"),
    "nns_child_disability": (12.7, "12.7% children have a functional disability in one of these six domains"),
    "nns_women_underweight": (14.4, "One in seven (14.4%) are undernourished"),
}
HARD_KFR = {"nns_stunted", "nns_wasted", "nns_underweight", "nns_child_overweight", "nns_food_secure"}
ALIAS = {"kashmor": "kashmore", "malir": "malirkarachi", "karachiwest": "westkarachi", "karachisouth": "southkarachi",
         "karachieast": "eastkarachi", "karachicentral": "centralkarachi", "korangi": "korangikarachi",
         "malakandprotectedarea": "malakand", "torghar": "torghar", "deraismailkhan": "dikhan", "layyah": "leiah",
         "bajauragency": "bajaur", "mohmandagency": "mohmand", "khyberagency": "khyber", "kurramagency": "kurram",
         "orakzaiagency": "orakzai", "northwaziristanagency": "northwaziristan", "southwaziristanagency": "southwaziristan",
         "hattianbala": "jhelumvalley", "torghar_": "torghar"}
SPLIT = {"kohistan": ["kohistanupper", "kohistanlower", "kolaipalaskohistan"], "chitral": ["chitralupper", "chitrallower"]}
NOT_PLACED = {"frbannu", "frdikhan", "frkohat", "frlakkimarwat", "frpeshawar", "frtank", "baltistan"}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def num(x):
    return np.nan if x == "*" else float(x.strip("()"))


def small(x):
    return x.startswith("(")


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def text():
    t = SRC / "vol2.txt"
    if not t.exists():
        subprocess.run(["pdftotext", "-layout", str(SRC / "NNS2018_Volume_2.pdf"), str(t)], check=True)
    return t.read_text().splitlines()


def section(T, title):
    starts = [k for k, l in enumerate(T) if l.startswith(title)]
    if not starts:
        sys.exit(f"{title} not found in NNS Volume 2")
    i = starts[0]
    j = next((k for k in range(i + 1, len(T)) if re.match(r"^Table\.? ?D\d+\.\d+", T[k])), len(T))
    return T[i:j]


def rows(lines, known):
    """[(name, numbers)] in order; names rebuilt across broken lines where that yields a known name."""
    out, used = [], set()
    pat = re.compile(rf"^\s*([A-Z][A-Z .'&/()\-]*?)\s{{2,}}(?:([A-Z][A-Z .'&/()\-]*?)\s{{2,}})?((?:{NUM}\s+)*{NUM})\s*$")
    for k, l in enumerate(lines):
        if k in used:
            continue
        m = pat.match(l)
        if m:
            a, b_, raw = m.group(1).strip(), (m.group(2) or "").strip(), m.group(3).split()
            nums = [(num(x), small(x)) for x in raw]
            name = f"{a} TOTAL" if b_ == "TOTAL" else (b_ or a)
            if b_ != "TOTAL" and a != "TOTAL" and norm(name) not in known:
                before = lines[k - 1].strip() if k > 0 and UPPER_ONLY.match(lines[k - 1]) else ""
                after = lines[k + 1].strip() if k + 1 < len(lines) and UPPER_ONLY.match(lines[k + 1]) else ""
                for cand, take in [(f"{before} {name} {after}", (k - 1, k + 1)), (f"{before} {name}", (k - 1,)),
                                   (f"{name} {after}", (k + 1,))]:
                    if norm(cand) in known:
                        name = cand.strip()
                        used.update(take)
                        break
            out.append((name, nums))
        elif UPPER_ONLY.match(l) and k + 1 < len(lines) and NUMS_ONLY.match(lines[k + 1]):
            after = lines[k + 2].strip() if k + 2 < len(lines) and UPPER_ONLY.match(lines[k + 2]) else ""
            name = f"{l.strip()} {after}".strip()
            if norm(name) not in known and norm(l) in known:
                name, after = l.strip(), ""
            out.append((name, [(num(x), small(x)) for x in lines[k + 1].split()]))
            used.update({k + 1, k + 2} if after else {k + 1})
    if not out:
        return out
    width = Counter(len(v) for _, v in out).most_common(1)[0][0]
    return [(n, v[:width]) for n, v in out if len(v) >= width]


def main():
    dist = gpd.read_file(GPKG, layer="admin_district")
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    known = set(ocha) | set(ALIAS) | set(SPLIT) | NOT_PLACED
    T = text()
    print("NNS 2018 Volume 2 district tables")
    vals, names_by_table, totals = {}, {}, {}
    for ind, (title, idx, _) in TABLES.items():
        r = rows(section(T, title), known)
        names_by_table[title] = [n for n, _ in r]
        for n, v in r:
            if n == "TOTAL":
                totals[ind] = v[idx][0]
            elif not n.endswith(" TOTAL"):
                vals.setdefault(norm(n), {})[ind] = v[idx][0]
                if v[idx][1]:
                    vals[norm(n)][f"nns_small_n_{ind.removeprefix('nns_')}"] = 1
    d = pd.DataFrame(vals).T
    flags = [c for c in d.columns if c.startswith("nns_small_n_")]
    d[flags] = d[flags].fillna(0)
    check("values resting on 25-49 cases (in parentheses), kept and flagged", "integrity",
          ", ".join(f"{c.removeprefix('nns_small_n_')} {int(d[c].sum())}" for c in flags) or "none",
          "flagged, not dropped", True, hard=False)
    for title, names in names_by_table.items():
        dn = [n for n in names if n != "TOTAL" and not n.endswith(" TOTAL")]
        unknown = sorted({n for n in dn if norm(n) not in known})
        check(f"{title} district rows, all recognised", "integrity", f"{len(dn)} rows"
              + (f"; unrecognised {unknown}" if unknown else ""), ">= 140 rows, none unrecognised",
              len(dn) >= 140 and not unknown)
    for ind, (val, words) in KFR.items():
        got = totals.get(ind)
        ok = got is not None and abs(got - val) <= 0.15
        check(f"{ind}: national TOTAL row vs the Key Findings Report", "external", f"{got}", f"{val} ('{words}')",
              ok, hard=ind in HARD_KFR,
              note="" if ind in HARD_KFR else "The NNS's two publications print different national figures; both recorded, neither corrected")

    rows_out, unplaced = [], []
    for key, r in d.iterrows():
        k = ALIAS.get(key, key)
        if k in NOT_PLACED or key in NOT_PLACED:
            unplaced.append(key)
            continue
        for kid in SPLIT.get(k, [k]):
            if kid in ocha:
                rows_out.append({"district_code": ocha[kid], "nns_name": key, "nns_parent": key if k in SPLIT else "",
                                 **r.to_dict()})
            else:
                unplaced.append(key)
    check("NNS districts placed in OCHA districts", "integrity", f"{len(d) - len(set(unplaced))} of {len(d)}; "
          f"not placed: {sorted(set(unplaced))}", "all but the six Frontier Regions and 'Baltistan'",
          set(unplaced) <= NOT_PLACED)
    out = pd.DataFrame(rows_out)
    dup = out[out.duplicated("district_code", keep=False)]
    check("one NNS district per OCHA district", "integrity", "none shared" if dup.empty else ", ".join(dup.nns_name),
          "none shared", dup.empty)
    miss = dist[~dist.district_code.isin(out.district_code)].district_name.tolist()
    check("OCHA districts without an NNS value", "integrity", f"{len(miss)}: {', '.join(miss)}",
          "reported, not filled", True, hard=False,
          note="NNS 2018 Vol. 1 s.2.2.8: Mansehra, Abbottabad, Haripur, Diamir and North and South Waziristan were "
               "excluded because no-objection certificates were not issued; the rest were created after 2018")

    # Convergent: against the DHS stunting surface (2017-18) and the census's early marriage (2023).
    o = out.set_index("district_code")
    w2 = pd.read_csv(GIS / "welfare/welfare_ext_district.csv").set_index("district_code")
    ce = pd.read_csv(HERE / "outcomes_ext_district.csv").set_index("district_code")
    pslm = pd.read_csv(HERE / "outcomes_pslm_district.csv").set_index("district_code")
    for a, src, b, sign, hard in [("nns_stunted", w2, "dhsms_stunted", +1, True),
                                  ("nns_married_before_18", ce, "girls_15_19_ever_married", +1, True),
                                  ("nns_food_secure", pslm, "pslm_fies_mod_sev", -1, False)]:
        x = o[[a]].join(src[[b]], how="inner").dropna()
        rho = x[a].rank().corr(x[b].rank())
        check(f"{a} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.4", np.sign(rho) == sign and abs(rho) >= 0.4, hard=hard)

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(out, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_nns_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_nns_district.csv", index=False)
    pd.DataFrame([{"indicator": k, "definition": v[2], "census_table": v[0].rstrip(":").replace("Table.", "Table "),
                   "source": "Government of Pakistan and UNICEF, National Nutrition Survey 2018, Volume 2"}
                  for k, v in TABLES.items()]).to_csv(HERE / "outcomes_nns_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "nns_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
