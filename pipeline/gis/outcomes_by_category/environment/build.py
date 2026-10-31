"""Cut one theme out of the GIS atlas into its own dataset, and refuse to write a copy that drifts.

Reads  pipeline/gis/atlas/indicator_catalog.tsv   (which indicators belong to the theme)
       pipeline/gis/atlas/atlas_codebook.csv       (one row per indicator)
       pipeline/gis/atlas/atlas_{district,tehsil,province}.csv
Writes <slug>_{district,tehsil,province}.csv      (id + name columns + the theme's indicators,
                                                    only for units where the theme has data)
       <slug>_codebook.csv                         (the codebook rows + a currency audit)

Values are copied as strings, never parsed, so nothing is re-rounded. After writing, every file is
read back and compared cell by cell with the atlas. Exits non-zero (RULE 4) if:
  - a catalog indicator of the theme is absent from every atlas file,
  - an indicator is absent from a unit the codebook says it covers,
  - an indicator has no row, or more than one row, in the codebook,
  - a written file's row count differs from the atlas file's,
  - any written value differs from the atlas value for the same unit and column,
  - an indicator's source_key has no entry in the currency audit below.

Usage (from the repo root, any Python 3):
  python pipeline/gis/outcomes_by_category/<slug>/build.py

The script is identical in each of this agent's four theme folders apart from THEME and SLUG.
"""
import csv
import sys
from pathlib import Path

THEME = "Environment"
SLUG = "environment"

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parents[1] / "atlas"
UNITS = {  # unit -> id and name columns carried before the indicators
    "district": ["district_code", "district_name", "province_code"],
    "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
    "province": ["province_code", "province_name"],
}

# Currency audit, 30 October 2026. One entry per source_key in the codebook. Every "no" names the
# newer release and a URL that was fetched on that date; "yes" means the newest listing found is
# the one already used. See README.md for how each was checked.
CURRENCY = {
    "lghap": dict(
        latest_available_wave="LGHAP v2 daily 1-km PM2.5, 2022, 2023 and 2024 (Zenodo 22816222, 22822484, "
                              "22841795, published 17-19 Sep 2026)",
        latest_available_url="https://zenodo.org/records/22841795",
        up_to_date="no",
        currency_note="We use the monthly-mean record (Zenodo 14280025), which stops at 2021; no monthly or annual "
                      "PM2.5 record past 2021 was found. The 2022-2024 releases are daily grids, 12 zips of about "
                      "1.1 GB per year (13.8 GB for 2024): over the 1 GB limit for this pass, so recorded as a lead, "
                      "not built. CC BY 4.0, gridded, machine-readable."),
    "ucdp": dict(
        latest_available_wave="UCDP GED 26.1 (events 1989-2025; file dated 8 Jun 2026)",
        latest_available_url="https://ucdp.uu.se/downloads/ged/ged261-csv.zip",
        up_to_date="no",
        currency_note="We use GED 25.1. 26.1 is public CSV (39 MB, point events, aggregable to districts). A "
                      "2015-2024 rebuild from 26.1 through the existing builder's code path is in "
                      "shocks-and-security/shocks-and-security_district_ged261.csv; not wired into the atlas."),
    "unosat": dict(
        latest_available_wave="No revision of the 2022 (or 2010) extent found. Newer event: UNOSAT FL20250818PAK, "
                              "VIIRS flood water 26 Aug-7 Sep 2025",
        latest_available_url="https://data.humdata.org/dataset/satellite-detected-water-extents-from-26-august-to-7-september-2025-over-pakistan",
        up_to_date="yes",
        currency_note="The indicator measures exposure to the 2022 and 2010 footprints, and those products have not "
                      "been reissued, so it is current for what it claims. A later flood exists: the 2025 extent is a "
                      "different event over a 13-day window (2022 is two months), so it is a new indicator, not a "
                      "new wave. Built as a separate file, shocks-and-security_district_unosat2025.csv."),
    "Table 1": dict(
        latest_available_wave="Census 2023 via PakPC2023 0.2.0 (CRAN, 2 Nov 2024)",
        latest_available_url="https://cran.r-project.org/package=PakPC2023",
        up_to_date="yes",
        currency_note="2023 is Pakistan's latest census. 0.2.0 is the latest PakPC2023 on CRAN; the GitHub repo "
                      "has only README commits since (16 May 2026). Not re-checked against PBS directly: the two PBS "
                      "census URLs tried returned 404 on 30 Oct 2026."),
    "Table 4": dict(
        latest_available_wave="Census 2023 via PakPC2023 0.2.0 (CRAN, 2 Nov 2024)",
        latest_available_url="https://cran.r-project.org/package=PakPC2023",
        up_to_date="yes",
        currency_note="As Table 1."),
    "Table 9": dict(
        latest_available_wave="Census 2023 via PakPC2023 0.2.0 (CRAN, 2 Nov 2024)",
        latest_available_url="https://cran.r-project.org/package=PakPC2023",
        up_to_date="yes",
        currency_note="As Table 1."),
    "kontur": dict(
        latest_available_wave="Kontur Population Pakistan, release 2023-11-01",
        latest_available_url="https://data.humdata.org/dataset/kontur-population-pakistan",
        up_to_date="yes",
        currency_note="HDX lists 2022-06-30 and 2023-11-01 only (dataset metadata touched 7 May 2026, no new file); "
                      "the global Kontur dataset also ends at 2023-11-01."),
    "rwi": dict(
        latest_available_wave="Meta Relative Wealth Index, April 2021 release (India and Pakistan file)",
        latest_available_url="https://data.humdata.org/dataset/relative-wealth-index",
        up_to_date="yes",
        currency_note="The HDX dataset was re-touched in May 2026, but the India-and-Pakistan file is still the "
                      "8 Apr 2021 one; no newer RWI edition found."),
}
CURRENCY_COLS = ["latest_available_wave", "latest_available_url", "up_to_date", "currency_note"]

FAILS = []


def fail(msg):
    FAILS.append(msg)
    print(f"  [FAIL] {msg}")


def read(path, delim=","):
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.reader(f, delimiter=delim)
        head = next(r)
        return head, [row for row in r]


def write(path, head, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(head)
        w.writerows(rows)


def main():
    ch, crows = read(ATLAS / "indicator_catalog.tsv", "\t")
    keys = [r[ch.index("key")] for r in crows if r[ch.index("theme")] == THEME]
    if not keys:
        fail(f"no catalog indicators for theme {THEME!r}")
    print(f"{THEME}: {len(keys)} catalog indicators")

    bh, brows = read(ATLAS / "atlas_codebook.csv")
    book = {}
    for k in keys:
        hits = [r for r in brows if r[bh.index("indicator")] == k]
        if len(hits) != 1:
            fail(f"{k}: {len(hits)} codebook rows, expected 1")
        else:
            book[k] = dict(zip(bh, hits[0]))

    atlas = {u: read(ATLAS / f"atlas_{u}.csv") for u in UNITS}
    for k in keys:
        if not any(k in h for h, _ in atlas.values()):
            fail(f"{k}: in the catalog, absent from every atlas file")
        for u in (book.get(k, {}).get("units") or "").split(","):
            if u in atlas and k not in atlas[u][0]:
                fail(f"{k}: codebook says it covers {u}, atlas_{u}.csv has no such column")

    written = {}
    for u, ids in UNITS.items():
        head, rows = atlas[u]
        cols = [k for k in keys if k in head]
        idx = [head.index(c) for c in cols]
        if not cols or not any(row[i] != "" for row in rows for i in idx):
            print(f"  {u}: no {THEME} data, no file")
            continue
        missing_ids = [c for c in ids if c not in head]
        if missing_ids:
            fail(f"atlas_{u}.csv lacks id columns {missing_ids}")
            continue
        out_head = ids + cols
        sel = [head.index(c) for c in out_head]
        out = HERE / f"{SLUG}_{u}.csv"
        write(out, out_head, [[row[i] for i in sel] for row in rows])
        written[u] = (out, out_head)

        # Read back and compare with the atlas, cell by cell, as strings.
        oh, orows = read(out)
        if len(orows) != len(rows):
            fail(f"{out.name}: {len(orows)} rows, atlas_{u}.csv has {len(rows)}")
        bad = 0
        for orow, arow in zip(orows, rows):
            for j, c in enumerate(oh):
                if orow[j] != arow[head.index(c)]:
                    bad += 1
        if bad:
            fail(f"{out.name}: {bad} cells differ from atlas_{u}.csv")
        nonempty = sum(1 for row in orows for j in range(len(ids), len(oh)) if row[j] != "")
        if not bad and len(orows) == len(rows):
            print(f"  [pass] {out.name}: {len(orows)} rows = atlas, {len(cols)} indicators, "
                  f"{nonempty} non-empty values, 0 cells differ")

    cb_head = bh + CURRENCY_COLS
    cb_rows = []
    for k in keys:
        if k not in book:
            continue
        sk = book[k]["source_key"]
        if sk not in CURRENCY:
            fail(f"{k}: source_key {sk!r} has no currency entry")
            continue
        if CURRENCY[sk]["up_to_date"] not in ("yes", "no", "unknown"):
            fail(f"{sk}: up_to_date must be yes / no / unknown")
        cb_rows.append([book[k][c] for c in bh] + [CURRENCY[sk][c] for c in CURRENCY_COLS])
    write(HERE / f"{SLUG}_codebook.csv", cb_head, cb_rows)
    if len(cb_rows) != len(keys):
        fail(f"codebook has {len(cb_rows)} rows for {len(keys)} indicators")
    else:
        print(f"  [pass] {SLUG}_codebook.csv: {len(cb_rows)} rows, one per catalog indicator")

    if FAILS:
        print(f"{len(FAILS)} check(s) failed")
        sys.exit(1)
    print("all checks pass")


if __name__ == "__main__":
    main()
