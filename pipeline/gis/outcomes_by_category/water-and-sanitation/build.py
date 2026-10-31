"""Build the per-theme outcome dataset for one indicator-catalog theme.

Reads   pipeline/gis/atlas/indicator_catalog.tsv
        pipeline/gis/atlas/atlas_codebook.csv
        pipeline/gis/atlas/atlas_{district,tehsil,province}.csv
Writes  <slug>_{district,tehsil,province}.csv   (only levels where the theme has a column)
        <slug>_codebook.csv                     (atlas codebook rows + currency audit columns)
        <slug>_checks.csv                       (every invariant and its result)

Values are copied as the exact strings in the atlas (stdlib csv, no float parsing), so
nothing is rounded or reformatted. Every row of the atlas level is kept, including units
where the theme's values are empty, so row counts and id order match the atlas exactly.

Exits non-zero (RULE 4) if:
  - a catalog indicator of the theme is absent from every atlas level, or has no codebook row
  - a written file's row count or id order differs from the atlas level
  - any written value differs from the atlas value (re-read from disk after writing)
  - an indicator's source has no entry in CURRENCY below (an unaudited source)

CURRENCY is the currency audit of 30 October 2026; README.md gives the evidence.
Re-run:  python pipeline/gis/outcomes_by_category/water-and-sanitation/build.py
"""
import csv
import sys
from pathlib import Path

THEME = "Water and sanitation"
SLUG = "water-and-sanitation"

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parent.parent / "atlas"

LEVELS = {
    "district": ["district_code", "district_name", "province_code"],
    "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
    "province": ["province_code", "province_name"],
}

# Currency audit, 30 October 2026. Keyed by source family; family() maps a codebook row
# to its family. latest_available_url is a page actually consulted on that date.
CURRENCY = {
    "census2023": dict(
        latest_available_wave="Population and Housing Census 2023 (7th census)",
        latest_available_url="https://pbs.gov.pk/release-of-national-and-provincial-census-reports-of-population-and-housing-census-2023-2/",
        up_to_date="yes",
        currency_note=(
            "Census 2023 is the latest census. Values came via the R package PakPC2023 0.2.0, "
            "still the current CRAN version on 30 Oct 2026."
        ),
    ),
    "mics6": dict(
        latest_available_wave=(
            "Punjab MICS 2024 (Key Findings Report); South Punjab MICS 2025 (division-level, "
            "launched 27 Oct 2026). Sindh: no round after 2018-19 found"
        ),
        latest_available_url="https://opendata.com.pk/dataset/mics-punjab-2024",
        up_to_date="no",
        currency_note=(
            "Punjab values (MICS6 2017-18) are superseded by Punjab MICS 2024. District-level 2024 "
            "tables not confirmed public: the KFR page (stateofchildren.com/punjab-multiple-indicator-"
            "cluster-survey-kfr-2024) says further datasets are yet to be released, and "
            "bos.punjab.gov.pk did not respond from this environment. The opendata.com.pk listing is a "
            "third-party upload of an undocumented .rar; not downloaded. Sindh 2018-19 not superseded "
            "as far as searched. Lead only."
        ),
    ),
    "pslm2019": dict(
        latest_available_wave="PSLM District Level Survey 2019-20 (8th round, PSLM 2026, in fieldwork since 15 Jul 2026)",
        latest_available_url="https://www.pbs.gov.pk/pslm/",
        up_to_date="yes",
        currency_note="No district round released after 2019-20; the 2026 round is in the field and has no results yet.",
    ),
    "nns2018": dict(
        latest_available_wave="National Nutrition Survey 2018 (no later round found)",
        latest_available_url="https://reliefweb.int/report/pakistan/national-nutrition-survey-2018-key-findings-report",
        up_to_date="unknown",
        currency_note=(
            "Web search found no NNS round after 2018, but no authoritative listing (Ministry of "
            "National Health Services / UNICEF Pakistan) was checked, so absence is not confirmed."
        ),
    ),
    "pdhs2017": dict(
        latest_available_wave="PDHS 2017-18 (PDHS 2026-27 announced; national/provincial only; not released)",
        latest_available_url="https://api.dhsprogram.com/rest/dhs/surveys?countryIds=PK&surveyStatus=all&f=json",
        up_to_date="yes",
        currency_note=(
            "DHS API lists PK2017DHS as the latest Pakistan DHS (also PK2019OTH, the 2019 Maternal "
            "Mortality Survey, which is not a source for these indicators). PBS describes PDHS 2026-27 "
            "at https://www.pbs.gov.pk/?p=28549 as national and provincial representative."
        ),
    ),
}


def family(row: dict) -> str:
    sk, pub = row["source_key"], row["publisher"]
    if "Census 2023" in pub:
        return "census2023"
    if sk.startswith("MICS"):
        return "mics6"
    if sk.startswith("PSLM 2019-20"):
        return "pslm2019"
    if "National Nutrition Survey 2018" in pub:
        return "nns2018"
    if sk in ("dhs_api", "dhs_quickstats", "dhs_ms"):
        return "pdhs2017"
    return ""


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as f:
        r = csv.DictReader(f)
        return list(r.fieldnames or []), list(r)


def write_csv(path, fields, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def main() -> int:
    checks = []

    def check(name, ok, detail=""):
        checks.append({"check": name, "result": "pass" if ok else "FAIL", "detail": detail})

    with open(ATLAS / "indicator_catalog.tsv", encoding="utf-8", newline="") as f:
        catalog = [r for r in csv.DictReader(f, delimiter="\t") if r["theme"] == THEME]
    keys = [r["key"] for r in catalog]
    check("catalog_has_theme", bool(keys), f"{len(keys)} indicators")

    cb_fields_atlas, cb_rows = read_csv(ATLAS / "atlas_codebook.csv")
    cb = {r["indicator"]: r for r in cb_rows}

    present = set()
    for level, idcols in LEVELS.items():
        fields, rows = read_csv(ATLAS / f"atlas_{level}.csv")
        cols = [k for k in keys if k in fields]
        present.update(cols)
        if not cols:
            continue
        missing_id = [c for c in idcols if c not in fields]
        check(f"{level}_id_columns", not missing_id, ",".join(missing_id))
        if missing_id:
            continue
        out_fields = idcols + cols
        path = HERE / f"{SLUG}_{level}.csv"
        write_csv(path, out_fields, [{c: r[c] for c in out_fields} for r in rows])

        # Re-read from disk and compare with the atlas, string for string.
        got_fields, got = read_csv(path)
        check(f"{level}_columns", got_fields == out_fields, f"{len(cols)} indicators")
        check(f"{level}_row_count", len(got) == len(rows), f"{len(got)} written vs {len(rows)} atlas")
        idc = idcols[0]
        check(f"{level}_id_order", [g[idc] for g in got] == [r[idc] for r in rows])
        diffs = sum(1 for g, r in zip(got, rows) for c in out_fields if g.get(c) != r[c])
        check(f"{level}_values_equal_atlas", diffs == 0 and len(got) == len(rows), f"{diffs} differing cells")
        nonempty = sum(1 for g in got for c in cols if g[c] != "")
        check(f"{level}_nonempty_cells", True, f"{nonempty} of {len(got) * len(cols)}")

    absent = [k for k in keys if k not in present]
    check("every_catalog_indicator_in_atlas", not absent, ",".join(absent))

    no_cb = [k for k in keys if k not in cb]
    check("every_indicator_has_codebook_row", not no_cb, ",".join(no_cb))

    audit_cols = ["latest_available_wave", "latest_available_url", "up_to_date", "currency_note"]
    out_cb_fields = cb_fields_atlas + audit_cols
    cb_out, unaudited = [], []
    for k in keys:
        if k not in cb:
            continue
        row = dict(cb[k])
        fam = family(row)
        if fam in CURRENCY:
            row.update(CURRENCY[fam])
        else:
            unaudited.append(f"{k}:{row['source_key']}")
            row.update({c: "" for c in audit_cols})
        cb_out.append(row)
    check("every_source_audited", not unaudited, ";".join(unaudited))
    write_csv(HERE / f"{SLUG}_codebook.csv", out_cb_fields, cb_out)
    _, cb_back = read_csv(HERE / f"{SLUG}_codebook.csv")
    check("codebook_rows", len(cb_back) == len(keys), f"{len(cb_back)} rows vs {len(keys)} indicators")
    check(
        "codebook_matches_atlas_codebook",
        all(all(r[c] == cb[r["indicator"]][c] for c in cb_fields_atlas) for r in cb_back),
    )
    bad_flag = [r["indicator"] for r in cb_back if r["up_to_date"] not in ("yes", "no", "unknown")]
    check("up_to_date_vocabulary", not bad_flag, ",".join(bad_flag))

    write_csv(HERE / f"{SLUG}_checks.csv", ["check", "result", "detail"], checks)
    for c in checks:
        print(f"{c['result']:4}  {c['check']}  {c['detail']}")
    failed = [c for c in checks if c["result"] != "pass"]
    if failed:
        print(f"{len(failed)} check(s) failed", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
