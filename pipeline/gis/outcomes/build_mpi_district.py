"""
District Multidimensional Poverty Index, six rounds 2004/05 to 2014/15, from the Statistical Annex of
"Multidimensional Poverty in Pakistan" (Ministry of Planning, Development and Reform with UNDP and
OPHI, 2016), computed by them from the PSLM district surveys.

The annex prints MPI, headcount (H) and intensity (A) for 116 districts on a two-page spread whose
halves sit at slightly different heights, so plain text extraction splits each row in two. Rows are
rebuilt from word positions instead, and every row must satisfy MPI = H x A to the printed rounding
before anything is written (a misaligned column breaks that identity at once).

District frame: the 2014/15 districts. Karachi (one district then), Kohistan and Chitral were later
split; each child district in the boundary file carries the parent's value and names it in
`mpi_parent`. Districts created after 2015 from parts of others are left empty.

Usage (from the repo root):
  python pipeline/gis/outcomes/build_mpi_district.py
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
PDF = GIS / "sources/mpi_district/Multidimensional-Poverty-in-Pakistan.pdf"
ROUNDS = ["2004", "2006", "2008", "2010", "2012", "2014"]     # 2004/05 ... 2014/15
CHECKS = []
ALIAS = {"bolankachhi": "kachhi", "dgkhan": "deraghazikhan", "gawadar": "gwadar", "kechturbat": "kech",
         "layyah": "leiah", "naushehroferoze": "naushahroferoze", "nawabshahshaheedbenazirabad": "shaheedbenazirabad",
         "nowshehra": "nowshera", "sarghodha": "sargodha", "ttsingh": "tobateksingh", "torgarh": "torghar",
         "kambarshahdadkot": "kambarshahdadkot", "mirpurkhas": "mirpurkhas"}
SPLIT = {"karachi": ["centralkarachi", "eastkarachi", "southkarachi", "westkarachi", "korangikarachi", "malirkarachi"],
         "kohistan": ["kohistanupper", "kohistanlower", "kolaipalaskohistan"],
         "chitral": ["chitralupper", "chitrallower"]}


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def num(t):
    if t == "*":
        return np.nan
    return float(t.rstrip("%")) / (100 if t.endswith("%") else 1)


def parse():
    pdf = pdfplumber.open(PDF)
    rows = []
    for i in (44, 45):
        words = sorted(pdf.pages[i - 1].extract_words(), key=lambda x: (x["top"], x["x0"]))
        lines = []
        for w in words:                         # the spread's halves differ by < 1 pt in height
            if lines and abs(lines[-1][0] - w["top"]) < 3:
                lines[-1][1].append(w)
            else:
                lines.append([w["top"], [w]])
        for _, ws in lines:
            ws = sorted(ws, key=lambda x: x["x0"])
            name = " ".join(x["text"] for x in ws if x["x0"] < 180)
            vals = [x["text"] for x in ws if x["x0"] >= 180]
            if name and name != "Districts" and len(vals) == 18:
                rows.append([name] + [num(v) for v in vals])
    cols = ["district_2015"] + [f"mpi_{r}" for r in ROUNDS] + [f"h_{r}" for r in ROUNDS] + [f"a_{r}" for r in ROUNDS]
    return pd.DataFrame(rows, columns=cols)


def main():
    print("district MPI 2004/05-2014/15 (Planning Commission / UNDP / OPHI 2016)")
    t = parse()
    check("district rows parsed from the annex", "integrity", f"{len(t)}", "116 (the annex's district list)", len(t) == 116)
    # MPI = H x A, to the printed rounding (MPI 3 decimals, H and A one decimal of a percent).
    bad = []
    for r in ROUNDS:
        prod = t[f"h_{r}"] * t[f"a_{r}"]
        err = (prod - t[f"mpi_{r}"]).abs()
        bad += [f"{n} {r}" for n, e in zip(t.district_2015, err) if np.isfinite(e) and e > 0.0015]
    n_vals = int(t[[f"mpi_{r}" for r in ROUNDS]].notna().sum().sum())
    check("every district-round satisfies MPI = H x A", "integrity", f"{n_vals - len(bad)} of {n_vals}"
          + (f"; off: {bad[:6]}" if bad else ""), "all, within 0.0015", not bad)
    # The annex's own national 2014/15 figure (page 43).
    p43 = pdfplumber.open(PDF).pages[42].extract_text()
    m = re.search(r"2014/15\s+(0\.\d+)", p43)
    nat = float(m.group(1)) if m else np.nan
    check("annex national MPI 2014/15", "external", f"{nat}", "0.197 (UNDP/OPHI launch figure)", nat == 0.197)

    dist = gpd.read_file(GPKG, layer="admin_district")
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    ocha.update({"dikhan": ocha.get("dikhan")})
    rows, miss = [], []
    for _, r in t.iterrows():
        n = ALIAS.get(norm(r.district_2015), norm(r.district_2015))
        targets = [(k, r.district_2015) for k in SPLIT[n]] if n in SPLIT else [(n, "")]
        for k, parent in targets:
            if ocha.get(k):
                rows.append({**r.to_dict(), "district_code": ocha[k], "mpi_parent": parent})
            else:
                miss.append(k)
    check("annex districts placed in OCHA districts", "integrity", f"{len(t) - len(set(miss))} of {len(t)}"
          + (f"; unplaced {sorted(set(miss))}" if miss else ""), "all", not miss)
    out = pd.DataFrame(rows)
    dup = out[out.duplicated("district_code", keep=False)]
    check("one annex district per OCHA district", "integrity", "none shared" if dup.empty else
          ", ".join(dup.district_2015), "none shared", dup.empty)

    o = pd.DataFrame({"district_code": out.district_code, "mpi_district_2015_name": out.district_2015,
                      "mpi_parent": out.mpi_parent})
    o["mpi_district_2015"] = out.mpi_2014
    o["mpi_headcount_2015"] = 100 * out.h_2014
    o["mpi_intensity_2015"] = 100 * out.a_2014
    o["mpi_district_2005"] = out.mpi_2004
    o["mpi_headcount_2005"] = 100 * out.h_2004
    o["mpi_headcount_change_05_15"] = 100 * (out.h_2014 - out.h_2004)
    for r in ROUNDS:                     # the full series, for the CSV and the layer
        o[f"mpi_{r}_{int(r[2:]) + 1:02d}"] = out[f"mpi_{r}"]
        o[f"mpi_h_{r}_{int(r[2:]) + 1:02d}"] = 100 * out[f"h_{r}"]
    o = o.round(3)

    census = gpd.read_file(GPKG, layer="outcomes_district", ignore_geometry=True).set_index("district_code")
    x = o.set_index("district_code").join(census, how="inner")
    for a, b, sign in [("mpi_headcount_2015", "literacy", -1), ("mpi_headcount_2015", "flush_toilet", -1)]:
        rho = x[a].rank().corr(x[b].rank())
        check(f"{a} vs census 2023 {b}", "convergent", f"rho = {rho:+.2f}, n = {x[[a, b]].dropna().shape[0]}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.6", np.sign(rho) == sign and abs(rho) >= 0.6)
    pslm = HERE / "outcomes_pslm_district.csv"
    if pslm.exists():
        y = o.set_index("district_code").join(pd.read_csv(pslm).set_index("district_code"), how="inner")
        rho = y.mpi_headcount_2015.rank().corr(y.pslm_fully_immunised.rank())
        check("MPI headcount 2014/15 vs PSLM 2019-20 full immunisation", "convergent",
              f"rho = {rho:+.2f}, n = {y[['mpi_headcount_2015', 'pslm_fully_immunised']].dropna().shape[0]}",
              "sign -, |rho| >= 0.3", rho <= -0.3)

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(o, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_mpi_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_mpi_district.csv", index=False)
    cb = pd.DataFrame([
        ("mpi_district_2015", "Multidimensional Poverty Index 2014/15 (15 indicators: education, health, living standards)"),
        ("mpi_headcount_2015", "MPI poor, % of population, 2014/15"),
        ("mpi_intensity_2015", "Average share of indicators in which the poor are deprived, %, 2014/15"),
        ("mpi_district_2005", "Multidimensional Poverty Index 2004/05"),
        ("mpi_headcount_2005", "MPI poor, % of population, 2004/05"),
        ("mpi_headcount_change_05_15", "Change in MPI headcount 2004/05 to 2014/15, points (negative is a fall in poverty)"),
    ], columns=["indicator", "definition"])
    cb["census_table"] = "Statistical Annex, pp. 68-73"
    cb["source"] = "Ministry of Planning, Development and Reform, UNDP and OPHI (2016), Multidimensional Poverty in Pakistan"
    cb.to_csv(HERE / "outcomes_mpi_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "mpi_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
