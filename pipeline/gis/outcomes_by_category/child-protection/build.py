"""
One theme of the atlas as its own dataset: THEME's indicators, cut out of
pipeline/gis/atlas/atlas_{district,tehsil,province}.csv with their codebook rows, plus a currency
audit (is the source the newest release that covers Pakistan at district level?).

Nothing here is computed. Every value is the atlas's string, copied; the checks below read the
written files back and refuse (exit 1) if

  - an indicator the catalog files under THEME is absent from the atlas at a level its codebook
    `units` names (hex excepted: the atlas has no hex table), or absent from the codebook;
  - a written file's row count differs from the atlas table it was cut from;
  - a written id is duplicated, or any written value differs from the atlas;
  - an indicator has no currency-audit entry, or an entry's up_to_date is not yes/no/unknown.

The currency audit (CURRENCY below) is hand-researched, dated 30 October 2026, and every
"newer exists" claim carries the URL it was read from. README.md has the reasoning.

Usage (from the repo root):
  python pipeline/gis/outcomes_by_category/<slug>/build.py
"""
import csv, sys
from pathlib import Path

THEME = "Child protection"
SLUG = "child-protection"

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parents[1] / "atlas"
LEVELS = {  # level -> id and name columns kept ahead of the indicators
    "district": ["district_code", "district_name", "province_code"],
    "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
    "province": ["province_code", "province_name"],
}
AUDITED = "2026-10-30"

# Source group -> currency audit. Keys are produced by group() from a codebook row.
CURRENCY = {
    "census2023": dict(
        latest_available_wave="Census 2023 (7th Population and Housing Census)",
        latest_available_url="https://www.pbs.gov.pk/content/7th-population-and-housing-census-detailed-results",
        up_to_date="yes",
        currency_note="Latest census; no later census exists. Tables 12/13A are read via PakPC2023 0.2.0; "
                      "PBS also publishes the district tables as Excel (https://www.pbs.gov.pk/result-excel/).",
    ),
    "pdhs2017": dict(
        latest_available_wave="PDHS 2017-18",
        latest_available_url="https://www.pbs.gov.pk/?p=28549",
        up_to_date="yes",
        currency_note="Still the latest PDHS. PBS was directed (10 Dec 2024) to run a PDHS 2026-27; no results "
                      "found as of the audit date, and it is designed to be representative at national and "
                      "provincial level, not district. Modelled surfaces stay the only sub-provincial DHS layer.",
    ),
    "undp_nhdr2017": dict(
        latest_available_wave="unknown",
        latest_available_url="",
        up_to_date="unknown",
        currency_note="No UNDP Pakistan NHDR with district mean/expected years of schooling newer than the 2017 "
                      "report (2014-15 data) could be confirmed. The 2020 NHDR (inequality) is reported to give "
                      "provincial/urban-rural HDI; whether it has district tables was not confirmed. Lead, not "
                      "UNDP: SDPI Provincial Development Monitor 2024 derives district HDI 2019-2023 "
                      "(https://sdpi.org/assets/lib/uploads/PDM_2024_20251103-1.pdf), PDF, different method.",
    ),
    "pslm2019": dict(
        latest_available_wave="PSLM District Level Survey 2019-20",
        latest_available_url="https://www.pbs.gov.pk/docs/pakistan-social-and-living-standard-measurement-survey-pslm/",
        up_to_date="yes",
        currency_note="Latest district-representative PSLM round on the PBS PSLM page. PSLM/HIES 2024-25 exists "
                      "(https://www.pbs.gov.pk/wp-content/uploads/2020/07/PSLM_Report_2024-25-Social-2.pdf) but "
                      "is provincially representative only, so it does not replace this district wave.",
    ),
    "pslm2015": dict(
        latest_available_wave="PSLM District Level Survey 2019-20",
        latest_available_url="https://www.pbs.gov.pk/docs/pakistan-social-and-living-standard-measurement-survey-pslm/",
        up_to_date="no",
        currency_note="Superseded by PSLM 2019-20, which the atlas already carries (pslm_*). Kept as the earlier "
                      "wave for change over time, not as a current measure.",
    ),
    "mics6_pb_sd": dict(
        latest_available_wave="Punjab MICS 2024 (fieldwork Dec 2023-Feb 2024; Key Findings Report Dec 2024)",
        latest_available_url="https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024",
        up_to_date="no",
        currency_note="Punjab only: the 2017-18 wave is superseded by MICS 2024. Its Key Findings Report (read "
                      "30 Oct 2026, Google Drive link on the page above) tabulates by area, education and wealth, "
                      "not district, and has no foundational-learning or life-satisfaction table; birth "
                      "registration, discipline, child labour and child marriage are there at province level. "
                      "A 'MICS 2024.rar' is listed at https://opendata.com.pk/dataset/mics-punjab-2024 (contents "
                      "not inspected; likely microdata). No Sindh round newer than 2018-19 was found. KP 2019 and "
                      "Balochistan 2019-20 MICS 6 exist with district samples but are not in the atlas (coverage "
                      "gap, same vintage).",
    ),
}


def group(cb):
    pub, key = cb["publisher"], cb["source_key"]
    if pub.startswith("Pakistan Bureau of Statistics, Census 2023"):
        return "census2023"
    if key in ("dhs_ms", "dhs_quickstats"):
        return "pdhs2017"
    if pub.startswith("UNDP Pakistan, National Human Development Report 2017"):
        return "undp_nhdr2017"
    if key == "PSLM 2019-20 microdata":
        return "pslm2019"
    if key == "PSLM 2014-15 microdata":
        return "pslm2015"
    if key.startswith("MICS ") and "Punjab 2017-18, Sindh 2018-19" in pub:
        return "mics6_pb_sd"
    return None


def read(path, delim=","):
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.DictReader(f, delimiter=delim)
        return r.fieldnames, list(r)


def main():
    fails = []
    _, catalog = read(ATLAS / "indicator_catalog.tsv", "\t")
    keys = [r["key"] for r in catalog if r["theme"] == THEME]
    if not keys:
        sys.exit(f"no catalog indicators under theme {THEME!r}")
    cb_fields, cb_rows = read(ATLAS / "atlas_codebook.csv")
    codebook = {r["indicator"]: r for r in cb_rows}

    tables = {lvl: read(ATLAS / f"atlas_{lvl}.csv") for lvl in LEVELS}
    for k in keys:
        if k not in codebook:
            fails.append(f"{k}: in catalog, not in atlas_codebook.csv")
            continue
        want = [u for u in codebook[k]["units"].split(",") if u in LEVELS]
        if not any(k in tables[l][0] for l in LEVELS):
            fails.append(f"{k}: in catalog, in no atlas table")
        for l in want:
            if k not in tables[l][0]:
                fails.append(f"{k}: codebook units name {l}, atlas_{l}.csv has no such column")

    written = {}
    for lvl, ids in LEVELS.items():
        fields, rows = tables[lvl]
        cols = [k for k in keys if k in fields]
        if not cols:
            continue
        out = HERE / f"{SLUG}_{lvl}.csv"
        with open(out, "w", encoding="utf-8", newline="") as f:
            w = csv.writer(f, lineterminator="\n")
            w.writerow(ids + cols)
            for r in rows:
                w.writerow([r[c] for c in ids + cols])
        written[lvl] = (out, ids, cols, rows)

    # read back and compare with the atlas, value for value
    for lvl, (out, ids, cols, rows) in written.items():
        hdr, back = read(out)
        if hdr != ids + cols:
            fails.append(f"{out.name}: header differs from what was written")
        if len(back) != len(rows):
            fails.append(f"{out.name}: {len(back)} rows, atlas_{lvl}.csv has {len(rows)}")
        idset = [b[ids[0]] for b in back]
        if len(set(idset)) != len(idset):
            fails.append(f"{out.name}: duplicate {ids[0]}")
        diffs = sum(1 for a, b in zip(rows, back) for c in ids + cols if a[c] != b[c])
        if diffs:
            fails.append(f"{out.name}: {diffs} values differ from atlas_{lvl}.csv")
        filled = {c: sum(1 for b in back if b[c] != "") for c in cols}
        print(f"{out.name}: {len(back)} rows, {len(cols)} indicators; non-empty per indicator min "
              f"{min(filled.values())} max {max(filled.values())}")

    # codebook with currency audit
    extra = ["latest_available_wave", "latest_available_url", "up_to_date", "currency_note", "audited"]
    cb_out = HERE / f"{SLUG}_codebook.csv"
    with open(cb_out, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=cb_fields + ["source_group"] + extra, lineterminator="\n")
        w.writeheader()
        for k in keys:
            if k not in codebook:
                continue
            g = group(codebook[k])
            cur = CURRENCY.get(g)
            if cur is None:
                fails.append(f"{k}: no currency-audit entry (source group {g!r})")
                cur = {}
            if cur and cur["up_to_date"] not in ("yes", "no", "unknown"):
                fails.append(f"{k}: up_to_date {cur['up_to_date']!r}")
            if cur and cur["up_to_date"] == "no" and not cur["latest_available_url"]:
                fails.append(f"{k}: says a newer release exists but cites no URL")
            w.writerow({**codebook[k], "source_group": g, **cur, "audited": AUDITED})
    print(f"{cb_out.name}: {sum(1 for k in keys if k in codebook)} indicators")

    if fails:
        print("FAIL\n  " + "\n  ".join(fails))
        sys.exit(1)
    print(f"OK: {THEME}, {len(keys)} indicators, every check passed")


if __name__ == "__main__":
    main()
