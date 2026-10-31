"""
District Multidimensional Poverty Index 2019-20, from Appendix-D "Multidimensional Poverty by District"
(pp. 75-82) of "Multidimensional Poverty Index Report 2019-20" (Ministry of Planning, Development and
Special Initiatives, Government of Pakistan, with OPHI and UNICEF; published 2024), computed by them
from PSLM 2019-20.

Source PDF (gitignored; Content-Length 12,643,274 bytes, same as the file held, checked 30 Oct 2026):
  https://ophi.org.uk/sites/default/files/2025-01/Pakistan_MPI_2019%E2%80%9320_%282024%29.pdf
held at pipeline/gis/sources/outcomes_by_category/wealth-and-poverty/pakistan_mpi_2019-20_2024.pdf

The appendix is printed rotated 90 degrees, so plain text extraction reverses every string
("lanoitaN"). Rows are rebuilt from character positions instead: a table row is a column of characters
at one x, read along the PDF baseline (matrix f). A row must carry exactly eleven numbers (MPI, H and A
with their 95% intervals, population share, number of poor) and a district name; every row must then
satisfy MPI = H x A to the printed precision before anything is written.

Values are kept exactly as printed (the appendix prints them unrounded: MPI to five decimals, H and A
in percent to four), never rounded here.

District frame and crosswalk: the rules of pipeline/gis/outcomes/build_mpi_district.py (its norm(),
ALIAS and SPLIT are imported, not copied). A report district whose territory was later divided wholly
into current districts (Chitral, Kohistan) gives its value to every child, named in `mpi_parent_2020`.
A current district carved out of a report district that still exists (Chaman from Killa Abdullah,
Lehri from Sibi) is left empty, as the 2014-15 build leaves Sohbatpur empty. Districts the report does
not list are left empty and named in mpi_2019_20_crosswalk.csv with the reason.

Writes, in this folder:
  wealth-and-poverty_district_mpi2020.csv   160 rows (every current district; empty where no value)
  mpi_2019_20_crosswalk.csv                 report district -> current district, rule used
  mpi_2019_20_checks.csv                    every check, with result
Exits 1 if any hard check fails, and then writes only the checks file.

Usage (from the repo root, GIS venv; needs pdfplumber, pandas, geopandas):
  python pipeline/gis/outcomes_by_category/wealth-and-poverty/build_mpi_2019_20.py
"""
import csv, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import pdfplumber

HERE = Path(__file__).resolve().parent
GIS = HERE.parents[1]
sys.path.insert(0, str(GIS / "outcomes"))
from build_mpi_district import norm, ALIAS, SPLIT  # noqa: E402  (the 2014-15 crosswalk rules)

GPKG = GIS / "shrines_foundation.gpkg"
PDF = GIS / "sources/outcomes_by_category/wealth-and-poverty/pakistan_mpi_2019-20_2024.pdf"
MPI15 = GIS / "outcomes/outcomes_mpi_district.csv"
CENSUS = GIS / "outcomes/outcomes_district.csv"
PAGES = range(75, 83)          # Appendix-D, 1-based
COLS = ["mpi", "mpi_lo", "mpi_hi", "h", "h_lo", "h_hi", "a", "a_lo", "a_hi", "pop_share", "poor_000"]
PROVINCES = {"KHYBER PAKHTUNKHWA": "PK5", "PUNJAB": "PK6", "SINDH": "PK7", "BALOCHISTAN": "PK2"}
NUM = re.compile(r"^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+\.\d+$")

# Report spellings the 2014-15 ALIAS does not cover (each verified by eye against the OCHA list).
ALIAS_2020 = {
    "bunair": "buner", "charsada": "charsadda", "bhakhar": "bhakkar", "jehlum": "jhelum",
    "karachicentral": "centralkarachi", "karachieast": "eastkarachi", "karachimalir": "malirkarachi",
    "karachisouth": "southkarachi", "karachiwest": "westkarachi", "korangi": "korangikarachi",
    "nowsheroferoze": "naushahroferoze", "shahdadkot": "kambarshahdadkot",
    "kachhibolan": "kachhi", "nasirabadtamboo": "nasirabad", "qillaabdullah": "killaabdullah",
    "qillasaifullah": "killasaifullah", "sibbi": "sibi",
}
# Current districts carved out of a report district that still exists: left empty (2014-15 rule).
CARVED = {"PK235": "not in Appendix-D; left empty by the 2014-15 build's rule for a district carved from one the report "
                   "still lists (parent Killa Abdullah, whose value is not copied; the parent is not stated by the report)",
          "PK218": "not in Appendix-D; left empty by the 2014-15 build's rule for a district carved from one the report "
                   "still lists (parent Sibi, whose value is not copied; the parent is not stated by the report)"}
NOT_IN_REPORT = {"PK203": "Chagai", "PK208": "Jhal Magsi", "PK221": "Musakhel", "PK231": "Zhob"}  # report p. 31 item 4
CHECKS = []


def check(name, kind, measured, reference, ok, hard=True, note=""):
    res = "pass" if ok else ("FAIL" if hard else "warn")
    CHECKS.append({"check": name, "kind": kind, "measured": measured, "reference": reference, "result": res, "note": note})
    print(f"  [{res}] {name}: {measured} vs {reference}")


def lines_of(page):
    """Group rotated characters into table rows (one x) and split each into words along the baseline."""
    cs = [c for c in page.chars if not c["upright"]]
    lines = []
    for c in sorted(cs, key=lambda c: (c["x0"] + c["x1"]) / 2):
        xc = (c["x0"] + c["x1"]) / 2
        if lines and abs(lines[-1]["x"] - xc) < 1.5:
            lines[-1]["c"].append(c)
        else:
            lines.append({"x": xc, "c": [c]})
    out = []
    for L in lines:
        words, end = [], None
        for c in sorted(L["c"], key=lambda c: c["matrix"][5]):
            f = c["matrix"][5]
            if end is None or f - end > 1.5:
                words.append([f, ""])
            words[-1][1] += c["text"]
            end = f + (c["bottom"] - c["top"])
        out.append((L["x"], [(f, w.strip()) for f, w in words if w.strip()]))
    return out


def parse(pdf):
    rows, unclassified = [], []
    prov = None
    for pn in PAGES:
        lines = lines_of(pdf.pages[pn - 1])
        hdr = [x for x, ws in lines if any(w in ("Value", "(Thousands)") or w.endswith("(95%)") for _, w in ws)]
        if not hdr:
            sys.exit(f"page {pn}: no 'Value' header row; the PDF is not the one this parser was written for")
        x_body = max(hdr) + 3
        vals, names = [], []
        for x, ws in lines:
            texts = [w for _, w in ws]
            if x <= x_body:
                continue
            if len(ws) == 1 and texts[0] in PROVINCES:
                prov = texts[0]
                names.append(None)        # placeholder so the province header is not counted unclassified
            elif len(ws) == 11 and all(NUM.match(t) for t in texts):
                vals.append({"x": x, "vals": texts, "province": prov, "page": pn, "names": []})
            elif len(ws) == 1 and ws[0][0] < 100:
                names.append((x, texts[0]))
            else:
                unclassified.append(f"p{pn} x={x:.0f}: {' | '.join(texts)}")
        for item in [n for n in names if n]:
            x, t = item
            near = min(vals, key=lambda v: abs(v["x"] - x)) if vals else None
            if near is None or abs(near["x"] - x) > 12:
                unclassified.append(f"p{pn} name without a row: {t}")
            else:
                near["names"].append((x, t))
        rows += vals
    for r in rows:
        r["name"] = " ".join(t for _, t in sorted(r["names"])).replace("  ", " ").strip()
    return rows, unclassified


def fnum(t):
    return float(t.replace(",", ""))


def main():
    print("district MPI 2019-20 (MPDSI with OPHI and UNICEF, 2024), Appendix-D")
    pdf = pdfplumber.open(PDF)
    title = "".join(c["text"] for c in pdf.pages[74].chars if not c["upright"])
    check("page 75 carries Appendix-D", "integrity", "found" if "D-xidneppA" in title or "Appendix-D" in title
          else "not found", "Appendix-D title", "D-xidneppA" in title or "Appendix-D" in title)
    rows, uncl = parse(pdf)
    check("every body line classified (row, name, province header)", "integrity",
          "all" if not uncl else f"{len(uncl)} not: {uncl[:4]}", "all", not uncl)
    nameless = [r["page"] for r in rows if not r["name"]]
    check("every numeric row has a district name", "integrity", "all" if not nameless else f"pages {nameless}",
          "all", not nameless)
    nat = [r for r in rows if r["name"] == "National"]
    dist = [r for r in rows if r["name"] != "National"]
    check("national row present once", "integrity", f"{len(nat)}", "1", len(nat) == 1)

    t = pd.DataFrame([{"report_district": r["name"], "report_province": r["province"], "page": r["page"],
                       **dict(zip(COLS, r["vals"]))} for r in dist])
    f = t[COLS].map(fnum)

    # The report's own district count: Table A1 (p. 72) uses 126 districts, 7,875 = 126*125/2 pairs;
    # the text (pp. 8, 22 and 45) says "127 districts". The appendix is checked against Table A1.
    p72 = pdf.pages[71].extract_text()
    m = re.search(r"\n(\d{3}) (\d{1,2},\d{3}) ", p72)
    n_a1, pairs = (int(m.group(1)), int(m.group(2).replace(",", ""))) if m else (None, None)
    check("Table A1 district count is self-consistent", "integrity", f"{n_a1} districts, {pairs} pairs",
          "pairs = n(n-1)/2", bool(m) and pairs == n_a1 * (n_a1 - 1) // 2)
    check("district rows parsed = Table A1 count", "integrity", f"{len(t)}", f"{n_a1} (Table A1, p. 72)",
          len(t) == n_a1)
    stated = len(re.findall(r"127\s+districts", " ".join(pdf.pages[i].extract_text() for i in (7, 21, 44))))
    check("district rows parsed = count stated in the text", "external", f"{len(t)}",
          f"127 (text, pp. 8, 22 and 45; found {stated} times)", len(t) == 127, hard=False,
          note="The report contradicts itself: the text says 127 districts, Table A1 and Appendix-D have 126. "
               "Recorded, not resolved.")
    dup = t[t.report_district.duplicated(keep=False)]
    check("no district repeated", "integrity", "none" if dup.empty else ", ".join(dup.report_district), "none",
          dup.empty)

    # MPI = H x A. MPI printed to 5 decimals: rounding alone allows 0.000005; H, A add < 1e-6.
    err = (f.h * f.a / 1e4 - f.mpi).abs()
    bad = t.report_district[err > 1e-5].tolist()
    check("every district satisfies MPI = H x A", "integrity",
          f"{len(t) - len(bad)} of {len(t)}; max |H*A - MPI| = {err.max():.2e}" + (f"; off: {bad}" if bad else ""),
          "all, within 0.00001", not bad)
    inside = [n for n, r in zip(t.report_district, f.itertuples())
              if not (r.mpi_lo <= r.mpi <= r.mpi_hi and r.h_lo <= r.h <= r.h_hi and r.a_lo <= r.a <= r.a_hi)]
    check("every value lies inside its printed 95% interval", "integrity",
          "all" if not inside else ", ".join(inside), "all", not inside)

    # National row against Appendix-C (p. 74) and the district rows.
    nv = dict(zip(COLS, map(fnum, nat[0]["vals"])))
    p74 = pdf.pages[73].extract_text()
    c = {}
    for label, key in [("National", "national"), ("Punjab18", "PK6+PK4"), ("Sindh", "PK7"), ("KPK", "PK5"),
                       ("Balochistan", "PK2")]:
        mm = re.search(rf"^{label} ([\d.]+) [\d.]+ [\d.]+ ([\d.]+) [\d.]+ [\d.]+ ([\d.]+) [\d.]+ [\d.]+ ([\d.]+) ([\d,]+)$",
                       p74, re.M)
        c[key] = tuple(fnum(g) for g in mm.groups()) if mm else None
    check("Appendix-C parsed (national + 4 provinces)", "integrity", f"{sum(v is not None for v in c.values())} of 5",
          "5", all(v is not None for v in c.values()))
    cn = c["national"]
    check("Appendix-D national row = Appendix-C national (MPI, H, A)", "external",
          f"{nv['mpi']}, {nv['h']}, {nv['a']}", f"{cn[0]}, {cn[1]}, {cn[2]}",
          (nv["mpi"], nv["h"], nv["a"]) == cn[:3])
    check("national number of poor: Appendix-D vs Appendix-C", "external", f"{nv['poor_000']:,.0f} thousand (D)",
          f"{cn[4]:,.0f} thousand (C)", nv["poor_000"] == cn[4], hard=False,
          note="The two appendices print different national counts of poor people; the text (p. 8) says "
               "'69 million'. Recorded, not resolved.")
    s = f.pop_share.sum()
    check("district population shares sum to 100", "integrity", f"{s:.4f}", "100.0 (national row)",
          abs(s - 100) < 0.01)
    w = f.pop_share / 100
    rec = {"mpi": (w * f.mpi).sum(), "h": (w * f.h).sum()}
    check("population-weighted district MPI = national MPI", "integrity", f"{rec['mpi']:.5f}", f"{nv['mpi']}",
          abs(rec["mpi"] - nv["mpi"]) <= 0.0005,
          note="The report: higher-level results are population-weighted averages of the districts (p. 31).")
    check("population-weighted district H = national H", "integrity", f"{rec['h']:.3f}", f"{nv['h']}",
          abs(rec["h"] - nv["h"]) <= 0.05)
    poor = f.poor_000.sum()
    check("district number of poor sums to the national row", "integrity", f"{poor:,.0f}",
          f"{nv['poor_000']:,.0f} (Appendix-D national)", abs(poor - nv["poor_000"]) <= len(t) * 0.5 + 1,
          note="Each district count is rounded to the thousand, so the sum may differ by up to half a "
               "thousand per district.")

    # Provinces: the report puts Islamabad under Punjab ("the PSLM data includes it in Punjab", p. 74 n. 18).
    t["prov_for_c"] = t.report_province.map(PROVINCES).replace({"PK6": "PK6+PK4"})
    for key, cv in c.items():
        if key == "national":
            continue
        sel = t.prov_for_c == key
        ws = f.pop_share[sel]
        m_ = (ws * f.mpi[sel]).sum() / ws.sum()
        h_ = (ws * f.h[sel]).sum() / ws.sum()
        check(f"province {key}: weighted district MPI, H, population share vs Appendix-C", "integrity",
              f"{m_:.4f}, {h_:.2f}, {ws.sum():.2f}", f"{cv[0]}, {cv[1]}, {cv[3]}",
              abs(m_ - cv[0]) <= 0.0005 and abs(h_ - cv[1]) <= 0.05 and abs(ws.sum() - cv[3]) <= 0.05)

    # Claims in the text (pp. 22, 45).
    lo, hi = t.loc[f.h.idxmin()], t.loc[f.h.idxmax()]
    check("lowest H is Islamabad at 2.6% (text pp. 22, 45)", "external", f"{lo.report_district} {round(fnum(lo.h), 1)}",
          "Islamabad 2.6", lo.report_district == "Islamabad" and round(fnum(lo.h), 1) == 2.6)
    check("highest H is Sherani at 95.1% (text pp. 22, 45)", "external", f"{hi.report_district} {round(fnum(hi.h), 1)}",
          "Sherani 95.1", hi.report_district == "Sherani" and round(fnum(hi.h), 1) == 95.1)

    # Crosswalk to the 160 current (OCHA) districts, with the 2014-15 build's rules.
    cur = gpd.read_file(GPKG, layer="admin_district", ignore_geometry=True)[["district_code", "district_name",
                                                                             "province_code"]]
    check("current district frame", "integrity", f"{len(cur)}", "160", len(cur) == 160)
    ocha = {norm(n): k for n, k in zip(cur.district_name, cur.district_code)}
    oprov = dict(zip(cur.district_code, cur.province_code))
    xw, miss = [], []
    for _, r in t.iterrows():
        n0 = norm(r.report_district)
        n = ALIAS_2020.get(n0) or ALIAS.get(n0, n0)
        rule = "exact (normalised name)" if n == n0 else ("alias (2014-15 build)" if n0 in ALIAS else "alias (this build)")
        targets = [(k, r.report_district, "split: parent value to child") for k in SPLIT[n]] if n in SPLIT else [(n, "", rule)]
        for k, parent, ru in targets:
            code = ocha.get(k)
            if not code:
                miss.append(f"{r.report_district}->{k}")
                continue
            xw.append({"report_district": r.report_district, "report_province": r.report_province,
                       "district_code": code, "rule": ru, "mpi_parent_2020": parent})
    check("every report district placed in a current district", "integrity",
          f"{len(t) - len({m.split('->')[0] for m in miss})} of {len(t)}" + (f"; unplaced {miss}" if miss else ""),
          "all", not miss)
    x = pd.DataFrame(xw)
    d2 = x[x.district_code.duplicated(keep=False)]
    check("one report district per current district", "integrity",
          "none shared" if d2.empty else ", ".join(d2.report_district), "none shared", d2.empty)
    wrong = [f"{a}->{b}" for a, p, b in zip(x.report_district, x.report_province, x.district_code)
             if not (PROVINCES[p] == oprov[b] or (a == "Islamabad" and oprov[b] == "PK4"))]
    check("report province section = current district's province", "integrity",
          "all" if not wrong else ", ".join(wrong), "all (Islamabad under Punjab in the report, PK4 here)", not wrong)

    got = set(x.district_code)
    rest = cur[~cur.district_code.isin(got)]
    reasons = []
    for r in rest.itertuples():
        if r.province_code in ("PK1", "PK3"):
            why = "Azad Jammu and Kashmir / Gilgit-Baltistan: outside the PSLM 2019-20 frame"
        elif r.district_code in CARVED:
            why = CARVED[r.district_code]
        elif r.district_code in NOT_IN_REPORT:
            why = "no 2019-20 data: the report names it among districts not available (p. 31, item 4)"
        else:
            why = "not in Appendix-D, and the report does not say why"
        reasons.append({"report_district": "", "report_province": "", "district_code": r.district_code,
                        "rule": "no value", "mpi_parent_2020": "", "note": why})
    unexplained = [r["district_code"] for r in reasons if r["note"].startswith("not in Appendix-D")]
    check("current districts without a value, each with a stated reason", "integrity",
          f"{len(rest)} without; unexplained by the report: "
          + (", ".join(cur.set_index('district_code').district_name[c] for c in unexplained) or "none"),
          "listed in mpi_2019_20_crosswalk.csv", True,
          note="Panjgur is absent from Appendix-D but not in the report's list of unavailable districts.")

    # Convergent: against the atlas's 2014-15 district MPI and Census 2023 literacy.
    out = x.merge(t, on=["report_district", "report_province"])
    m15 = pd.read_csv(MPI15)[["district_code", "mpi_district_2015", "mpi_parent"]]
    j = out.merge(m15, on="district_code")
    j = j[(j.mpi_parent_2020 == "") & j.mpi_parent.isna()].dropna(subset=["mpi_district_2015"])           # one value per district, no shared parents
    rho = j.mpi.map(fnum).rank().corr(j.mpi_district_2015.rank())
    pear = np.corrcoef(j.mpi.map(fnum), j.mpi_district_2015)[0, 1]
    check("MPI 2019-20 vs atlas MPI 2014-15 (district)", "convergent",
          f"rho = {rho:+.2f}, r = {pear:+.2f}, n = {len(j)}; mean {j.mpi.map(fnum).mean():.3f} vs "
          f"{j.mpi_district_2015.mean():.3f}", "rho >= 0.7", rho >= 0.7,
          note="Not a like-for-like comparison: the 2019-20 specification changes two indicators; the report's "
               "harmonised national MPI for 2014-15 is 0.162 (Table 2, p. 54), the 2016 report's is 0.197. "
               "The report prints no district values for 2014-15 (Figs 27, 29 are images).")
    cen = pd.read_csv(CENSUS)[["district_code", "literacy"]]
    k = out[out.mpi_parent_2020 == ""].merge(cen, on="district_code")
    rho = k.h.map(fnum).rank().corr(k.literacy.rank())
    check("MPI headcount 2019-20 vs census 2023 literacy", "convergent", f"rho = {rho:+.2f}, n = {len(k)}",
          "sign -, |rho| >= 0.6", rho <= -0.6)
    h_tab2 = re.search(r"2014-15 (0\.\d+) ([\d.]+)% ([\d.]+)%", pdf.pages[53].extract_text())
    check("report's harmonised national 2014-15 vs the 2016 annex national 2014-15", "external",
          f"{h_tab2.group(1) if h_tab2 else 'not found'} (Table 2, harmonised)", "0.197 (2016 annex)",
          False, hard=False,
          note="Different specifications, documented by the report (p. 54): a comparison, not an error.")

    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    pd.DataFrame(CHECKS).to_csv(HERE / "mpi_2019_20_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    if fails:
        print(f"\n{len(fails)} FAIL; nothing but the checks written")
        sys.exit(1)

    keep = {"mpi": "mpi_district_2020", "mpi_lo": "mpi_district_2020_ci_low", "mpi_hi": "mpi_district_2020_ci_high",
            "h": "mpi_headcount_2020", "h_lo": "mpi_headcount_2020_ci_low", "h_hi": "mpi_headcount_2020_ci_high",
            "a": "mpi_intensity_2020", "a_lo": "mpi_intensity_2020_ci_low", "a_hi": "mpi_intensity_2020_ci_high",
            "pop_share": "mpi_pop_share_2020", "poor_000": "mpi_poor_thousands_2020"}
    o = out.rename(columns=keep).rename(columns={"report_district": "mpi_district_2020_name"})
    o["mpi_poor_thousands_2020"] = o.mpi_poor_thousands_2020.str.replace(",", "")
    o = cur.merge(o[["district_code", "mpi_district_2020_name", "mpi_parent_2020"] + list(keep.values())],
                  on="district_code", how="left").sort_values("district_code")
    o.to_csv(HERE / "wealth-and-poverty_district_mpi2020.csv", index=False)
    xw_out = pd.concat([x.assign(note=""), pd.DataFrame(reasons)], ignore_index=True)
    xw_out = xw_out.merge(cur[["district_code", "district_name"]], on="district_code", how="left")
    xw_out[["report_district", "report_province", "district_code", "district_name", "rule", "mpi_parent_2020",
            "note"]].to_csv(HERE / "mpi_2019_20_crosswalk.csv", index=False)
    # Read back: every written value equals the printed text.
    rb = pd.read_csv(HERE / "wealth-and-poverty_district_mpi2020.csv", dtype=str).dropna(subset=["mpi_district_2020"])
    src = out.set_index("district_code")
    diff = [c for c in rb.itertuples() if c.mpi_district_2020 != src.loc[c.district_code, "mpi"]
            or c.mpi_headcount_2020 != src.loc[c.district_code, "h"] or c.mpi_intensity_2020 != src.loc[c.district_code, "a"]]
    check("written values read back equal to the printed text", "integrity",
          f"{len(rb) - len(diff)} of {len(rb)}", "all", not diff)
    check("current districts with a value", "integrity", f"{len(rb)} of {len(cur)}", "report rows + split children",
          len(rb) == len(t) + sum(len(v) - 1 for k, v in SPLIT.items() if k in {norm(n) for n in t.report_district}))
    pd.DataFrame(CHECKS).to_csv(HERE / "mpi_2019_20_checks.csv", index=False, quoting=csv.QUOTE_MINIMAL)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(rb)} of {len(cur)} districts | {len(CHECKS)} checks: "
          f"{sum(c['result'] == 'pass' for c in CHECKS)} pass, {sum(c['result'] == 'warn' for c in CHECKS)} warn, "
          f"{len(fails)} FAIL")
    if fails:
        sys.exit(1)


if __name__ == "__main__":
    main()
