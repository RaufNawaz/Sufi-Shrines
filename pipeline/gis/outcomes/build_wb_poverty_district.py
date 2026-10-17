"""
Monetary poverty by district, 2019-20: the World Bank's Pakistan Poverty Map (Policy Research Working
Paper 11012), small-area estimates that carry the HIES 2018-19 consumption model onto the PSLM
2019-20 district sample. The one consumption-based poverty measure in the atlas at district level.

Read from Annex 1 (tables A1-A4, one per province, 126 districts) with pdftotext -layout: poverty
rate and its mean squared error, poverty gap, the PSLM population, the number of poor, mean
monthly consumption per adult equivalent, and the mean consumption of the poor.

Checked: each row's number of poor must equal rate x population; the population-weighted average
of each province's district rates must reproduce the province rate the paper's Table 6 prints for
its national-level model (which is how the annex was identified as that model's estimates); and one value the annex prints that cannot be right as printed (Multan's
mean consumption, 35,473 PKR against 5,000-7,000 for its neighbours) is reported by a check, not
corrected (RULE 2). Then convergent: against the district MPI and the RWI.

District frame: 2019 districts, as in PSLM. Kohistan and Chitral carry their value into their
present-day parts, the parent named.

Usage (from the repo root):
  python pipeline/gis/outcomes/build_wb_poverty_district.py
"""
import csv, re, subprocess, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
PDF = GIS / "sources/wb_povmap/wb_prwp11012_pakistan_poverty_map_2019_20.pdf"
CHECKS = []
# Table 6 of the paper prints each province's rate under two models. The annex's district rows
# reproduce the 'National level model' figures to two decimals in all four provinces (and miss the
# province-model ones: KP 29.03, Punjab 16.21, Sindh 25.75, Balochistan 42.50), so the annex is the
# national model's district estimates. Read 17 Oct 2026; this check is what established it.
PROVINCE_RATE = {"KP": 30.04, "Punjab": 16.56, "Sindh": 26.17, "Balochistan": 38.73}
ALIAS = {"deraismailkhan": "dikhan", "malakandprotectedarea": "malakand", "layyah": "leiah", "torghar": "torghar",
         "karachisouth": "southkarachi", "karachieast": "eastkarachi", "karachiwest": "westkarachi",
         "karachicentral": "centralkarachi", "korangi": "korangikarachi", "malir": "malirkarachi",
         "karachimalir": "malirkarachi", "kachhibolan": "kachhi", "kachhi": "kachhi", "sibbi": "sibi",
         "qillaabdullah": "killaabdullah", "qillasaifullah": "killasaifullah", "kech": "kech", "kechturbat": "kech",
         "nasirabadtamboo": "nasirabad", "panjgoor": "panjgur", "shaheedbenazirabad": "shaheedbenazirabad",
         "naushahroferoze": "naushahroferoze", "nowsheroferoze": "naushahroferoze", "mirpurkhas": "mirpurkhas",
         "tandomuhammadkhan": "tandomuhammadkhan", "shahdadkot": "kambarshahdadkot", "jaffarabad": "jaffarabad",
         "kashmor": "kashmore",
         "surab": "shaheedsikandarabad"}   # renamed; outcomes/census_crosswalk.py maps the census's SURAB the same way
SPLIT = {"kohistan": ["kohistanupper", "kohistanlower", "kolaipalaskohistan"], "chitral": ["chitralupper", "chitrallower"]}
NUM = r"[\d,]+(?:\.\d+)?"
ROW = re.compile(rf"^\s*(KP|Punjab|Sindh|Balochistan)\s+(.+?)\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s+({NUM})\s*$")


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def norm(s):
    return re.sub(r"[^a-z]", "", str(s).lower())


def f(x):
    return float(x.replace(",", ""))


def main():
    t = PDF.with_suffix(".txt")
    if not t.exists():
        subprocess.run(["pdftotext", "-layout", str(PDF), str(t)], check=True)
    lines = t.read_text().splitlines()
    start = next(k for k, l in enumerate(lines) if l.strip().startswith("Annex 1: Tables of Results"))
    end = next(k for k, l in enumerate(lines) if l.strip().startswith("A5. KP: variable comparison"))
    rows = []
    for l in lines[start:end]:
        m = ROW.match(l)
        if m:
            v = [f(x) for x in m.groups()[2:]]
            rows.append({"province": m.group(1), "wb_district": m.group(2).strip(), "rate": v[0], "rate_mse": v[1],
                         "gap": v[2], "gap_mse": v[3], "population": v[4], "poor": v[5], "consumption": v[6],
                         "consumption_poor": v[7]})
    d = pd.DataFrame(rows)
    print("World Bank Pakistan Poverty Map 2019-20 (PRWP 11012), Annex 1")
    check("district rows read from Annex 1", "integrity", f"{len(d)} ({d.province.value_counts().to_dict()})",
          "126, as the paper states", len(d) == 126)
    off = d[(d.poor - d.rate * d.population).abs() > 0.005 * d.population]
    check("number of poor = rate x population, every district", "integrity",
          f"{len(d) - len(off)} of {len(d)}" + (f"; off: {off.wb_district.tolist()}" if len(off) else ""),
          "all within 0.5% of population", off.empty)
    check("poverty gap below the poverty rate, every district", "integrity", f"{(d.gap <= d.rate).sum()} of {len(d)}",
          "all", bool((d.gap <= d.rate).all()))
    for prov, ref in PROVINCE_RATE.items():
        g = d[d.province == prov]
        got = 100 * (g.rate * g.population).sum() / g.population.sum()
        check(f"{prov}: population-weighted district rates vs the paper's province rate", "external",
              f"{got:.2f}%", f"{ref}% (Table 6, national-level model)", abs(got - ref) <= 0.3)
    med = d.consumption.median()
    odd = d[(d.consumption > 3 * med) | (d.consumption < d.consumption_poor)]
    check("mean consumption plausible (below 3x the median, above the mean of the poor)", "integrity",
          "; ".join(f"{r.wb_district} {r.consumption:,.0f} PKR" for r in odd.itertuples()) or "all",
          f"all (median {med:,.0f} PKR)", odd.empty, hard=False,
          note="Printed so in the paper's annex; kept as printed, not corrected (RULE 2)")

    dist = gpd.read_file(GPKG, layer="admin_district")
    ocha = {norm(n): c for n, c in zip(dist.district_name, dist.district_code)}
    out, unplaced = [], []
    for r in d.itertuples():
        k = ALIAS.get(norm(r.wb_district), norm(r.wb_district))
        for kid in SPLIT.get(k, [k]):
            if kid in ocha:
                out.append({"district_code": ocha[kid], "wb_district": r.wb_district,
                            "wb_parent": r.wb_district if k in SPLIT else "",
                            "wb_poverty_rate": round(100 * r.rate, 2),
                            "wb_poverty_rate_se": round(100 * np.sqrt(r.rate_mse), 2),
                            "wb_poverty_gap": round(100 * r.gap, 2),
                            "wb_poor_headcount": r.poor,
                            "wb_consumption_pae": r.consumption,
                            "wb_consumption_pae_poor": r.consumption_poor})
            else:
                unplaced.append(r.wb_district)
    check("annex districts placed in OCHA districts", "integrity", f"{len(d) - len(set(unplaced))} of {len(d)}"
          + (f"; unplaced {sorted(set(unplaced))}" if unplaced else ""), "all", not unplaced)
    o = pd.DataFrame(out)
    dup = o[o.duplicated("district_code", keep=False)]
    check("one annex district per OCHA district", "integrity", "none shared" if dup.empty else ", ".join(dup.wb_district),
          "none shared", dup.empty)

    mpi = pd.read_csv(HERE / "outcomes_mpi_district.csv").set_index("district_code")
    w1 = gpd.read_file(GPKG, layer="welfare_district", ignore_geometry=True).set_index("district_code")
    oo = o.set_index("district_code")
    for a, src, b, sign in [("wb_poverty_rate", mpi, "mpi_headcount_2015", +1), ("wb_poverty_rate", w1, "rwi_popw", -1)]:
        x = oo[[a]].join(src[[b]], how="inner").dropna()
        rho = x[a].rank().corr(x[b].rank())
        check(f"{a} vs {b}, districts", "convergent", f"rho = {rho:+.2f}, n = {len(x)}",
              f"sign {'+' if sign > 0 else '-'}, |rho| >= 0.5", np.sign(rho) == sign and abs(rho) >= 0.5)

    g = dist[["district_code", "district_name", "province_code", "geometry"]].merge(o, on="district_code", how="inner")
    g.to_file(GPKG, layer="outcomes_wb_poverty_district", driver="GPKG")
    g.drop(columns="geometry").to_csv(HERE / "outcomes_wb_poverty_district.csv", index=False)
    src = "World Bank (2024), Pakistan Poverty Map 2019-2020, Policy Research Working Paper 11012, Annex 1"
    pd.DataFrame([
        ("wb_poverty_rate", "Population below the national poverty line, %, 2019-20 (small-area estimate: the paper's national-level HIES 2018-19 model applied to PSLM 2019-20)"),
        ("wb_poverty_rate_se", "Standard error of the poverty rate, points (square root of the published MSE)"),
        ("wb_poverty_gap", "Poverty gap index, %: the average shortfall below the poverty line as a share of it"),
        ("wb_poor_headcount", "Number of people below the poverty line"),
        ("wb_consumption_pae", "Mean monthly consumption per adult equivalent, PKR, 2019-20 (as printed; Multan's value is flagged)"),
        ("wb_consumption_pae_poor", "Mean monthly consumption per adult equivalent of the poor, PKR"),
    ], columns=["indicator", "definition"]).assign(census_table="Annex 1", source=src).to_csv(
        HERE / "outcomes_wb_poverty_codebook.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "wb_poverty_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(g)} districts | {len(CHECKS)} checks: {sum(c['result'] == 'pass' for c in CHECKS)} pass, "
          f"{sum(c['result'] == 'warn' for c in CHECKS)} warn, {len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
