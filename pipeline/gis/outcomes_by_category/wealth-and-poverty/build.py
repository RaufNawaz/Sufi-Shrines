"""
One theme of the atlas as its own dataset: "Wealth and poverty".

Reads pipeline/gis/atlas/{indicator_catalog.tsv, atlas_codebook.csv, atlas_{district,tehsil,province}.csv}
and writes, next to this file:

  wealth-and-poverty_{district,tehsil,province}.csv   id + name columns + this theme's indicators only
  wealth-and-poverty_codebook.csv                      the atlas codebook rows, plus a currency audit
  wealth-and-poverty_checks.csv                        every check below, with its result

Values are copied as strings, never parsed, so they are byte-for-byte the atlas's. A unit file is written
only where the atlas carries at least one of the theme's indicators at that unit.

Exits non-zero (RULE 4) if: a catalog indicator of the theme is missing from every atlas file or from the
codebook; a row count differs from the atlas; an id is duplicated; any value read back differs from the
atlas; the codebook's declared units disagree with where the atlas actually carries the indicator; or an
indicator has no currency entry / a "no" verdict has no URL.

The currency audit (CURRENCY below) was researched on 30 October 2026; see README.md for the evidence.
It is a measurement with a date on it: re-check before quoting.

Run:  python pipeline/gis/outcomes_by_category/wealth-and-poverty/build.py
"""
import csv
import sys
from pathlib import Path

THEME = "Wealth and poverty"
SLUG = "wealth-and-poverty"
AUDITED = "2026-10-30"

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parent.parent / "atlas"

ID_COLS = {
    "district": ["district_code", "district_name", "province_code"],
    "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
    "province": ["province_code", "province_name"],
}
KEY = {"district": "district_code", "tehsil": "tehsil_code", "province": "province_code"}

# indicator -> source group
GROUP = {
    "wb_poverty_rate": "wb_pmap", "wb_poverty_gap": "wb_pmap", "wb_consumption_pae": "wb_pmap",
    "rwi_popw": "rwi",
    "gdp_pc_2023_popw": "kummu", "gdp_pc_growth_13_23": "kummu",
    "ntl_2023_popw": "ntl", "ntl_change_13_23": "ntl", "share_pop_lit_at_night": "ntl",
    "mpi": "ophi", "mpi_headcount": "ophi", "mpi_severe": "ophi", "mpi_vulnerable": "ophi",
    "ipc_phase3plus": "ipc",
    "pslm_rural_hh_own_agri_land": "pslm1920", "pslm_hh_own_agri_land": "pslm1920",
    "pslm_hh_own_cattle": "pslm1920", "pslm_hh_foreign_remittance": "pslm1920",
    "pslm_hh_domestic_remittance": "pslm1920", "pslm_fies_mod_sev": "pslm1920",
    "pslm_fies_severe": "pslm1920", "pslm_whole_day_without_food": "pslm1920",
    "mpi_district_2015": "mpi_district", "mpi_headcount_2015": "mpi_district",
    "mpi_headcount_2005": "mpi_district", "mpi_headcount_change_05_15": "mpi_district",
    "undp_hdi_2015": "undp_hdi",
    "nns_food_secure": "nns", "nns_food_insecure_severe": "nns", "nns_social_protection": "nns",
    "mics_social_transfers": "mics",
}

# group -> (latest_available_wave, latest_available_url, up_to_date, currency_note)
CURRENCY = {
    "wb_pmap": (
        "2019-20 (World Bank PRWP 11012; data catalog updated 2 Apr 2025)",
        "https://datacatalog.worldbank.org/search/dataset/0066822/pakistan-poverty-map-2019-2020",
        "yes",
        "No newer district poverty map found. HIES 2024-25 has been released "
        "(https://www.pbs.gov.pk/wp-content/uploads/2020/07/HIES-2024-25-Report-Final-1.pdf) but it is a "
        "provincial-level survey; no district small-area estimate built on it was found.",
    ),
    "rwi": (
        "2021 release (HDX dataset date range Apr 2021 - Feb 2023; metadata touched 26 May 2026)",
        "https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db95d668b843",
        "yes",
        "Checked via the HDX API: same single release; no newer RWI year for Pakistan found.",
    ),
    "kummu": (
        "Zenodo 18429133, 1990-2024 (published 13 Mar 2026; still the latest version)",
        "https://zenodo.org/records/18429133",
        "yes",
        "The release is current, but the file we already hold runs to 2024 and the atlas uses 2023 "
        "(and growth 2013-23). A 2024 value exists in the same file; division level, so it would need the "
        "welfare builder's spatial join, not a name crosswalk.",
    ),
    "ntl": (
        "2024 (figshare 9828827, Harmonized_DN_NTL_2024_simVIIRS.tif; record modified 10 Aug 2025)",
        "https://figshare.com/articles/dataset/9828827",
        "no",
        "The series now has a 2024 raster; the atlas uses 2023 and change 2013-2023. A raster, so updating "
        "means zonal statistics in pipeline/gis/welfare/, not a district-name join: a lead, not done here.",
    ),
    "ophi": (
        "Global MPI 2025, Pakistan still from PDHS 2017-18 (HDX dataset date range 2012-2018, updated Oct 2026)",
        "https://data.humdata.org/dataset/6b9b9c1c-e43c-45e2-a411-621dc1f5a641",
        "yes",
        "No newer PDHS: PBS says the next round is PDHS 2026-27 (https://www.pbs.gov.pk/?p=28549). "
        "Province level only.",
    ),
    "ipc": (
        "Analysis of Mar 2026 (HDX file ipc_pak_area_long.csv modified 5 Oct 2026)",
        "https://data.humdata.org/dataset/fff6a42e-e562-4b2a-937e-33e7deb02730",
        "yes",
        "The local download (30 Oct 2026) already contains the Mar 2026 analysis; 'latest' is by design a "
        "moving wave, so re-download before each rebuild.",
    ),
    "pslm1920": (
        "PSLM District Level Survey 2019-20 (round 2026-27 in the field since 15 Jul 2026, no results)",
        "https://www.pbs.gov.pk/pslm-3/",
        "yes",
        "PBS lists 2019-20 as the latest completed district round. HIES 2024-25 is provincial only.",
    ),
    "mpi_district": (
        "2019-20: MPDSI/UNICEF/OPHI, Multidimensional Poverty Index Report 2019-20 (2024), Appendix D, 127 districts",
        "https://ophi.org.uk/sites/default/files/2025-01/Pakistan_MPI_2019%E2%80%9320_%282024%29.pdf",
        "no",
        "Newer district MPI exists (PSLM 2019-20 based; Appendix D 'Multidimensional Poverty by District', "
        "p. 75; also change 2014-15 to 2019-20 for 110 districts). PDF only, no data table found: a lead.",
    ),
    "undp_hdi": (
        "unconfirmed: UNDP NHDR 2020 (Inequality) is said to present district HDI, not verified",
        "https://www.undp.org/pakistan/publications/pakistan-national-human-development-report-inequality",
        "unknown",
        "UNDP pages returned 403 to the fetcher, so whether NHDR 2020 carries a district HDI table could "
        "not be confirmed. Non-UNDP district HDIs exist (SDPI Provincial Development Monitor 2024, "
        "https://sdpi.org/assets/lib/uploads/PDM_2024_20251103-1.pdf) but are a different series.",
    ),
    "nns": (
        "National Nutrition Survey 2018",
        "https://www.unicef.org/pakistan/media/2861/file/NNS%20KFR.pdf",
        "yes",
        "No newer NNS round found as of Oct 2026.",
    ),
    "mics": (
        "Punjab MICS 2024 (KFR Dec 2024; microdata RAR on opendata.com.pk, Jun 2026); Sindh still 2018-19",
        "https://opendata.com.pk/dataset/mics-punjab-2024",
        "no",
        "Punjab has a newer, district-representative round "
        "(KFR: https://mics.unicef.org/sites/mics/files/2025-01/Pakistan%202024%20MICS%20(Punjab)%20KFR.pdf). "
        "Microdata in a RAR, no district table found: a lead. MICS7 for other provinces was at design stage "
        "in Oct 2025 (https://mics.unicef.org/news/first-mics7-survey-design-workshop-strengthens-data-capacity-pakistan).",
    ),
}

checks = []


def check(name, ok, measured, reference, note=""):
    checks.append({"check": name, "measured": measured, "reference": reference,
                   "result": "pass" if ok else "FAIL", "note": note})


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.reader(f)
        header = next(r)
        rows = [row for row in r]
    return header, rows


def main():
    with open(ATLAS / "indicator_catalog.tsv", encoding="utf-8", newline="") as f:
        cat = [r for r in csv.DictReader(f, delimiter="\t") if r["theme"] == THEME]
    keys = [r["key"] for r in cat]
    check("catalog keys of the theme are unique", len(keys) == len(set(keys)), len(keys), len(set(keys)))

    with open(ATLAS / "atlas_codebook.csv", encoding="utf-8", newline="") as f:
        cb_reader = csv.DictReader(f)
        cb_fields = cb_reader.fieldnames
        cb = {}
        dup = []
        for r in cb_reader:
            if r["indicator"] in cb:
                dup.append(r["indicator"])
            cb[r["indicator"]] = r
    missing_cb = [k for k in keys if k not in cb]
    check("every theme indicator has a codebook row", not missing_cb, f"{len(keys) - len(missing_cb)} of {len(keys)}",
          len(keys), ";".join(missing_cb))
    dup_mine = [k for k in dup if k in keys]
    check("no theme indicator has two codebook rows", not dup_mine, len(dup_mine), 0, ";".join(dup_mine))

    atlas = {u: read_csv(ATLAS / f"atlas_{u}.csv") for u in ID_COLS}
    present = {u: [k for k in keys if k in atlas[u][0]] for u in ID_COLS}
    nowhere = [k for k in keys if not any(k in present[u] for u in ID_COLS)]
    check("every theme indicator is in at least one atlas file", not nowhere,
          f"{len(keys) - len(nowhere)} of {len(keys)}", len(keys), ";".join(nowhere))

    # codebook's declared units vs where the atlas actually carries the indicator
    bad_units = []
    for k in keys:
        if k not in cb:
            continue
        declared = {u.strip() for u in cb[k]["units"].split(",")} & set(ID_COLS)
        actual = {u for u in ID_COLS if k in present[u]}
        if declared != actual:
            bad_units.append(f"{k}: codebook {sorted(declared)} atlas {sorted(actual)}")
    check("codebook units agree with the atlas columns", not bad_units, len(bad_units), 0, " | ".join(bad_units))

    for u in ID_COLS:
        if not present[u]:
            continue
        header, rows = atlas[u]
        cols = ID_COLS[u] + present[u]
        miss_id = [c for c in ID_COLS[u] if c not in header]
        check(f"{u}: id columns present in atlas", not miss_id, len(ID_COLS[u]) - len(miss_id), len(ID_COLS[u]),
              ";".join(miss_id))
        if miss_id:
            continue
        idx = [header.index(c) for c in cols]
        out = HERE / f"{SLUG}_{u}.csv"
        with open(out, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(cols)
            for row in rows:
                w.writerow([row[i] for i in idx])

        # read back and compare against the atlas, cell by cell, keyed by id
        bh, brows = read_csv(out)
        check(f"{u}: row count equals the atlas", len(brows) == len(rows), len(brows), len(rows))
        ki = header.index(KEY[u])
        ids = [r[ki] for r in rows]
        check(f"{u}: ids unique", len(ids) == len(set(ids)), len(set(ids)), len(ids))
        a_by_id = {r[ki]: r for r in rows}
        diffs = 0
        cells = 0
        for br in brows:
            ar = a_by_id.get(br[0])
            if ar is None:
                diffs += 1
                continue
            for c, v in zip(bh, br):
                cells += 1
                if ar[header.index(c)] != v:
                    diffs += 1
        check(f"{u}: every value equals the atlas", diffs == 0 and set(r[0] for r in brows) == set(ids),
              f"{diffs} differing of {cells} cells", "0")
        n_nonempty = sum(1 for br in brows if any(br[len(ID_COLS[u]):]))
        check(f"{u}: rows with at least one theme value (information only)", True, n_nonempty, len(brows))
        print(f"wrote {out.name}: {len(brows)} rows, {len(present[u])} indicators, {n_nonempty} rows with data")

    unassigned = [k for k in keys if k not in GROUP]
    check("every theme indicator has a currency entry", not unassigned, len(keys) - len(unassigned), len(keys),
          ";".join(unassigned))
    bad_cur = [g for g, v in CURRENCY.items() if v[2] not in ("yes", "no", "unknown") or (v[2] == "no" and not v[1])]
    check("currency verdicts are yes/no/unknown and every 'no' has a URL", not bad_cur, len(bad_cur), 0,
          ";".join(bad_cur))

    fields = list(cb_fields) + ["latest_available_wave", "latest_available_url", "up_to_date", "currency_note"]
    with open(HERE / f"{SLUG}_codebook.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        for k in keys:
            if k not in cb or k not in GROUP:
                continue
            wave, url, up, note = CURRENCY[GROUP[k]]
            w.writerow({**cb[k], "latest_available_wave": wave, "latest_available_url": url, "up_to_date": up,
                        "currency_note": f"{note} (audited {AUDITED})"})

    with open(HERE / f"{SLUG}_checks.csv", "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=["check", "measured", "reference", "result", "note"], lineterminator="\n")
        w.writeheader()
        w.writerows(checks)

    failed = [c for c in checks if c["result"] != "pass"]
    for c in failed:
        print(f"FAIL: {c['check']}: {c['measured']} vs {c['reference']} {c['note']}", file=sys.stderr)
    print(f"{len(checks) - len(failed)} of {len(checks)} checks pass")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
