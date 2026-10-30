"""
District Human Development Index, 2005-2015, from UNDP Pakistan's National Human Development Report
2017 (district HDI volume, "HDI Report 2017"): Table 1, HDI 2015 and its components (immunisation,
satisfaction with health facilities, expected and mean years of schooling, living standard), and
Table 2, the HDI for 2005, 2007, 2009, 2011, 2013 and 2015. 114 districts, computed by UNDP from the
PSLM rounds.

Read with pdftotext -layout. Checked: the 2015 HDI Table 1 prints must equal the 2015 column Table 2
prints for every district (same report, two printings: a misaligned parse breaks it at once); the
2013 HDI likewise; and the HDI tracks the district MPI and census literacy as it must.

District frame: 2015 districts. Karachi (one district then), Kohistan and Chitral carry their
values into their present-day parts, the parent named.

Usage (from the repo root):
  python pipeline/gis/outcomes/build_undp_hdi_district.py
"""
import csv, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
from pdftext import pdftotext  # poppler only, UTF-8 (see pdftext.py)

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
PDF = GIS / "sources/undp_hdi/undp_pakistan_hdi_report_2017.pdf"
CHECKS = []
PROVS = r"(Punjab|Sindh|Khyber Pakhtunkhwa|Balochistan|Islamabad Capital Territory|Federally Administered Tribal Areas|Gilgit[- ]Baltistan|Azad Jammu (?:and|&) Kashmir|AJK|GB|FATA|ICT|KP)"
NUM = r"(?:-?\d+(?:\.\d+)?|\.\.)"     # '..' is a value the report does not have (Sujawal's 2013, a new district)
T1 = re.compile(rf"^\s*(\d+)\s+(.+?)\s{{2,}}{PROVS}\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$")
T2 = re.compile(rf"^\s*(\d+)\s+(.+?)\s{{2,}}{PROVS}\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$")
ALIAS = {"dgkhan": "deraghazikhan", "deraghazikhan": "deraghazikhan", "dikhan": "dikhan", "deraismailkhan": "dikhan",
         "layyah": "leiah", "nankanasahab": "nankanasahib", "nankanasahib": "nankanasahib", "ttsingh": "tobateksingh",
         "tobateksingh": "tobateksingh", "naushahroferoze": "naushahroferoze", "naushehroferoze": "naushahroferoze",
         "nowsheroferoze": "naushahroferoze", "shaheedbenazirabad": "shaheedbenazirabad", "nawabshah": "shaheedbenazirabad",
         "kambarshahdadkot": "kambarshahdadkot", "qambarshahdadkot": "kambarshahdadkot", "torghar": "torghar",
         "kachhi": "kachhi", "bolan": "kachhi", "kachhibolan": "kachhi", "kech": "kech", "turbat": "kech", "kechturbat": "kech",
         "killaabdullah": "killaabdullah", "qillaabdullah": "killaabdullah", "killasaifullah": "killasaifullah",
         "qillasaifullah": "killasaifullah", "gawadar": "gwadar", "sibbi": "sibi", "kashmor": "kashmore",
         "mirpurkhas": "mirpurkhas", "umerkot": "umerkot", "tandoallahyar": "tandoallahyar",
         "tandomuhammadkhan": "tandomuhammadkhan", "malakandprotectedarea": "malakand", "jaffarabad": "jaffarabad",
         "jafarabad": "jaffarabad", "musakhel": "musakhel", "sherani": "sherani", "sheerani": "sherani",
         "panjgur": "panjgur", "panjgoor": "panjgur", "battagram": "batagram", "bolankachhi": "kachhi",
         "chaghi": "chagai", "kambershahdadkot": "kambarshahdadkot", "musakhail": "musakhel", "naseerabad": "nasirabad",
         "nawabshahshaheedbenazirabad": "shaheedbenazirabad", "noshki": "nushki"}
SPLIT = {"karachi": ["centralkarachi", "eastkarachi", "southkarachi", "westkarachi", "korangikarachi", "malirkarachi"],
         "kohistan": ["kohistanupper", "kohistanlower", "kolaipalaskohistan"], "chitral": ["chitralupper", "chitrallower"]}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def unwrap(lines):
    """Rejoin a row the layout wrapped: '61   Nawabshah/ Shaheed Benazir' / '   Sindh  0.572 ...' / '   Abad'."""
    out, k = [], 0
    while k < len(lines):
        l = lines[k]
        m = re.match(r"^\s*(\d+)\s+([A-Za-z].*?)\s*$", l)
        if m and k + 1 < len(lines) and re.match(rf"^\s+{PROVS}\s+{NUM}", lines[k + 1]):
            tail = lines[k + 2].strip() if k + 2 < len(lines) and re.match(r"^\s+[A-Za-z][A-Za-z .]*$", lines[k + 2]) else ""
            name = f"{m.group(2)} {tail}".strip()
            out.append(f"{m.group(1)} {name}   {lines[k + 1].strip()}")
            k += 3 if tail else 2
            continue
        out.append(l)
        k += 1
    return out


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def main():
    t = PDF.with_suffix(".txt")
    if not t.exists():
        pdftotext(str(PDF), str(t))
    L = t.read_text(encoding="utf-8").splitlines()
    i1 = next(k for k, l in enumerate(L) if "Human Development Index and its Components" in l)
    i2 = next(k for k, l in enumerate(L) if "Human Development Index trends, 2005-2015" in l)
    # Table 2 runs over several pages, each repeating its TABLE header; it ends where Table 3 begins.
    i3 = next(k for k in range(i2 + 1, len(L)) if "Multidimensional Poverty Index and its components" in L[k])
    t1 = [m.groups() for l in unwrap(L[i1:i2]) if (m := T1.match(l))]
    t2 = [m.groups() for l in unwrap(L[i2:i3]) if (m := T2.match(l))]
    a = pd.DataFrame(t1, columns=["rank", "name", "province", "hdi_2015", "immunisation", "health_satisfaction",
                                  "expected_schooling", "mean_schooling", "living_standard", "hdi_2013", "rank_change"])
    b = pd.DataFrame(t2, columns=["rank", "name", "province", "hdi_2005", "hdi_2007", "hdi_2009", "hdi_2011",
                                  "hdi_2013", "hdi_2015", "rank_change_2", "rank_change_10"])
    for d in (a, b):
        for c in d.columns[3:]:
            d[c] = pd.to_numeric(d[c].replace("..", np.nan))
        d["n"] = d.name.map(norm)
    print("UNDP Pakistan district HDI (NHDR 2017)")
    check("Table 1 and Table 2 district rows", "integrity", f"{len(a)} and {len(b)}", "114 each (the report's count)",
          len(a) == 114 and len(b) == 114)
    j = a.merge(b, on="n", suffixes=("", "_t2"))
    bad15 = j[(j.hdi_2015 - j.hdi_2015_t2).abs() > 0.0005]
    bad13 = j[(j.hdi_2013 - j.hdi_2013_t2).abs() > 0.0005]      # NaN (Sujawal) compares as not-different
    check("HDI 2015 and 2013: Table 1 equals Table 2, every district", "integrity",
          f"{len(j) - len(bad15)} and {len(j) - len(bad13)} of {len(j)} equal"
          + (f"; differ: {bad15.name.tolist() + bad13.name.tolist()}" if len(bad15) or len(bad13) else ""),
          "all", bad15.empty and bad13.empty and len(j) == 114)
    rng = a[["hdi_2015", "hdi_2013"]].stack()
    check("every HDI between 0 and 1", "integrity", f"{rng.min():.3f}-{rng.max():.3f}", "0-1", 0 < rng.min() and rng.max() < 1)

    dist = gpd.read_file(GPKG, layer="admin_district")
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    rows, unplaced = [], []
    for r in j.itertuples():
        k = ALIAS.get(r.n, r.n)
        for kid in SPLIT.get(k, [k]):
            if kid in ocha:
                rows.append({"district_code": ocha[kid], "hdi_name": r.name, "hdi_parent": r.name if k in SPLIT else "",
                             "undp_hdi_2015": r.hdi_2015, "undp_hdi_2005": r.hdi_2005, "undp_hdi_change_05_15": round(r.hdi_2015 - r.hdi_2005, 3),
                             "undp_immunisation_2015": r.immunisation, "undp_health_satisfaction_2015": r.health_satisfaction,
                             "undp_expected_schooling_2015": r.expected_schooling, "undp_mean_schooling_2015": r.mean_schooling,
                             "undp_living_standard_2015": r.living_standard})
            else:
                unplaced.append(r.name)
    check("HDI districts placed in OCHA districts", "integrity", f"{len(j) - len(set(unplaced))} of {len(j)}"
          + (f"; unplaced {sorted(set(unplaced))}" if unplaced else ""), "all", not unplaced)
    o = pd.DataFrame(rows)
    dup = o[o.duplicated("district_code", keep=False)]
    check("one HDI district per OCHA district", "integrity", "none shared" if dup.empty else ", ".join(dup.hdi_name),
          "none shared", dup.empty)

    mpi = pd.read_csv(HERE / "outcomes_mpi_district.csv").set_index("district_code")
    cen = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    oo = o.set_index("district_code")
    for a_, src, b_, sign, thr in [("undp_hdi_2015", mpi, "mpi_headcount_2015", -1, 0.8),
                                   ("undp_hdi_2015", cen, "literacy", +1, 0.7)]:
        x = oo[[a_]].join(src[[b_]], how="inner").dropna()
        rho = x[a_].rank().corr(x[b_].rank())
        check(f"{a_} vs {b_}, districts", "convergent", f"rho = {rho:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= {thr}", np.sign(rho) == sign and abs(rho) >= thr)

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(o, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_undp_hdi_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_undp_hdi_district.csv", index=False)
    src = "UNDP Pakistan, National Human Development Report 2017, district HDI volume (HDI Report 2017), Tables 1-2"
    pd.DataFrame([
        ("undp_hdi_2015", "District Human Development Index, 2015 (UNDP Pakistan; health, education and living-standard indices)"),
        ("undp_hdi_2005", "District Human Development Index, 2005"),
        ("undp_hdi_change_05_15", "Change in the district HDI, 2005 to 2015"),
        ("undp_immunisation_2015", "HDI health component: immunisation rate, %, 2015"),
        ("undp_health_satisfaction_2015", "HDI health component: households satisfied with the health facility, %, 2015"),
        ("undp_expected_schooling_2015", "HDI education component: expected years of schooling, 2015"),
        ("undp_mean_schooling_2015", "HDI education component: mean years of schooling, 2015"),
        ("undp_living_standard_2015", "HDI living-standard component, %, 2015"),
    ], columns=["indicator", "definition"]).assign(census_table="Tables 1-2", source=src).to_csv(
        HERE / "outcomes_undp_hdi_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "undp_hdi_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
