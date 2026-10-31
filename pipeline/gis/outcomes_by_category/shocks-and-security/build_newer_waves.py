"""Newer releases of two Shocks-and-security sources, built district by district through the existing
builder's own code, and kept OUT of the atlas (wiring them in is Rauf's decision).

  shocks-and-security_district_ged261.csv     the four conflict indicators, 2015-2024, from UCDP GED 26.1
                                              instead of 25.1 (same window, same definitions)
  shocks-and-security_district_unosat2025.csv share_pop_flooded_2025: UNOSAT FL20250818PAK, VIIRS flood
                                              water 26 Aug-7 Sep 2025 (a new event, not a revision of 2022)
  shocks-and-security_newer_waves_checks.csv  every check below with its result

"Same code path" is enforced, not asserted. The event and flood functions are taken from
welfare/build_extended_layers.py by inspect.getsource, with only the input path swapped (each swap must
match exactly once), and the population carrier is welfare/build_welfare_layers.carrier_cells. Before
any new file is written the script runs the same code on the OLD inputs (GED 25.1; the 2022 and 2010
UNOSAT layers) and requires every district value to equal atlas_district.csv exactly. It exits
non-zero if that reproduction fails, if any atlas district is missing from a new file, or if a
download's sha256 differs from the one recorded below.

Inputs (gitignored) in pipeline/gis/sources/outcomes_by_category/shocks-and-security/:
  ged261-csv.zip -> ged261/GEDEvent_v26_1.csv        https://ucdp.uu.se/downloads/ged/ged261-csv.zip
  FL20250818PAK_SHP.zip -> fl2025/FL20250818PAK_SHP/  https://unosat.org/static/unosat_filesystem/4197/FL20250818PAK_SHP.zip
  both fetched 30 Oct 2026.

Usage (from the repo root; needs the GIS venv, geopandas + h3 + the welfare builders' imports):
  ~/.venvs/gis312/Scripts/python pipeline/gis/outcomes_by_category/shocks-and-security/build_newer_waves.py
"""
import csv
import hashlib
import inspect
import sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parents[1]
sys.path.insert(0, str(GIS / "welfare"))
import build_welfare_layers as bw      # noqa: E402
import build_extended_layers as be     # noqa: E402

RAW = GIS / "sources/outcomes_by_category/shocks-and-security"
GED261 = RAW / "ged261/GEDEvent_v26_1.csv"
FL2025 = RAW / "fl2025/FL20250818PAK_SHP"
SHA256 = {
    RAW / "ged261-csv.zip": "8c941d84954e555ee2e54f40fa04d9203bf1e2f962203d0a9930966c4947c667",
    RAW / "FL20250818PAK_SHP.zip": "831c65e71561c0af56ac10b240ae800bbc89ee2267b039710f7cdebfc1456ed9",
}
CONFLICT = ["conflict_events", "conflict_deaths_per_100k", "conflict_civilian_deaths_per_100k",
            "conflict_onesided_deaths_per_100k"]
BY = "district_code"
CHECKS = []


def check(name, measured, reference, ok):
    CHECKS.append({"check": name, "measured": measured, "reference": reference, "result": "pass" if ok else "FAIL"})
    print(f"  [{'pass' if ok else 'FAIL'}] {name}: {measured} vs {reference}")


def swapped(fn, old, new, extra_globals=None):
    """fn recompiled from its own source with one literal replaced, in a copy of its module's globals."""
    src = inspect.getsource(fn)
    n = src.count(old)
    if n != 1:
        sys.exit(f"{fn.__name__}: expected exactly one {old!r} in the builder's source, found {n}")
    ns = dict(vars(be))
    ns.update(extra_globals or {})
    exec(compile(src.replace(old, new), f"<{fn.__name__} with {old} swapped>", "exec"), ns)
    return ns[fn.__name__]


def conflict_table(counts, pop):
    """The district rows of build_extended_layers.aggregate, for the conflict columns only."""
    g = pd.DataFrame(index=pop.index)
    for (b, name), s in counts.items():
        if b == BY:
            g[name] = s.reindex(g.index)
    for name in ["conflict_events", "conflict_deaths", "conflict_civilian_deaths", "conflict_onesided_deaths"]:
        g[name] = g[name].fillna(0)
    g["conflict_deaths_per_100k"] = 1e5 * g.conflict_deaths / pop
    g["conflict_civilian_deaths_per_100k"] = 1e5 * g.conflict_civilian_deaths / pop
    g["conflict_onesided_deaths_per_100k"] = 1e5 * g.conflict_onesided_deaths / pop
    return g[CONFLICT].round(4)


def flood_table(k, cols):
    """The district rows of build_extended_layers.aggregate, for the flood columns only."""
    g = bw.wavg(k, BY, cols)
    g = 100 * g.rename(columns={c: c.replace("flooded", "share_pop_flooded") for c in cols})
    return g.round(4)


def same_as_atlas(name, ours, atlas, cols):
    a = atlas.set_index(BY)[cols].astype(float)
    o = ours.reindex(a.index)[cols]
    diff = int(((o != a) & ~(o.isna() & a.isna())).sum().sum())
    check(f"{name}: reproduces atlas_district.csv", f"{diff} of {a.size} values differ", "0", diff == 0)


def main():
    for p, h in SHA256.items():
        got = hashlib.sha256(p.read_bytes()).hexdigest() if p.exists() else "missing"
        check(f"sha256 {p.name}", got[:16], h[:16], got == h)
    atlas = pd.read_csv(GIS / "atlas/atlas_district.csv", dtype={BY: str})

    teh = gpd.read_file(bw.GPKG, layer="admin_tehsil")
    k = bw.carrier_cells(teh)
    pop = k.groupby(BY)["pop"].sum()

    # 1. Reproduce the atlas from the old inputs with the builder's own functions.
    old = conflict_table(be.ucdp(teh), pop)
    same_as_atlas("UCDP GED 25.1 through the builder's ucdp()", old, atlas, CONFLICT)
    be.flood(k)
    oldf = flood_table(k, ["flooded_2022", "flooded_2010"])
    same_as_atlas("UNOSAT 2022 and 2010 through the builder's flood()", oldf, atlas,
                  ["share_pop_flooded_2022", "share_pop_flooded_2010"])

    # 2. The same functions on the new inputs.
    ucdp261 = swapped(be.ucdp, '"ucdp/GEDEvent_v25_1.csv"', repr(str(GED261)))
    new = conflict_table(ucdp261(teh), pop)
    flood25 = swapped(be.flood, '"unosat/FL20220808PAK_SHP/FL20220808PAK_SHP"', repr(str(FL2025)),
                      {"FLOODS": {"flooded_2025": ("VIIRS_20250826_20250907_FloodWaterExtent_PAK",
                                                   "VIIRS flood water extent, 26 August-7 September 2025")}})
    flood25(k)
    newf = flood_table(k, ["flooded_2025"])

    ids = atlas[[BY, "district_name", "province_code"]]
    for df, cols, fname in [(new, CONFLICT, "shocks-and-security_district_ged261.csv"),
                            (newf, ["share_pop_flooded_2025"], "shocks-and-security_district_unosat2025.csv")]:
        out = ids.merge(df[cols], left_on=BY, right_index=True, how="left")
        missing = int(out[cols].isna().all(axis=1).sum())
        check(f"{fname}: every atlas district has a value", f"{len(out) - missing} of {len(atlas)}",
              f"{len(atlas)}", missing == 0 and len(out) == len(atlas))
        if all(c["result"] == "pass" for c in CHECKS):
            out.to_csv(HERE / fname, index=False)
    # How far 26.1 moves the 2015-2024 numbers (reported, not a pass/fail).
    a = atlas.set_index(BY)[CONFLICT].astype(float)
    for c in CONFLICT:
        d = (new[c].reindex(a.index) - a[c])
        print(f"    {c}: {int((d != 0).sum())} districts change; national sum "
              f"{a[c].sum():.1f} -> {new[c].reindex(a.index).sum():.1f}" if c == "conflict_events"
              else f"    {c}: {int((d != 0).sum())} districts change; max |change| {np.nanmax(np.abs(d)):.2f}")

    with open(HERE / "shocks-and-security_newer_waves_checks.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["check", "measured", "reference", "result"], lineterminator="\n")
        w.writeheader()
        w.writerows(CHECKS)
    if any(c["result"] != "pass" for c in CHECKS):
        sys.exit("a check failed; new-wave files not written")
    print("all checks pass")


if __name__ == "__main__":
    main()
