"""
One theme of the welfare atlas as its own dataset: Access and connectivity.

Reads pipeline/gis/atlas/indicator_catalog.tsv, atlas_codebook.csv and atlas_{district,tehsil,province}.csv
and writes, next to this file:

  access-and-connectivity_<level>.csv   id + name columns + this theme's indicators, for each level where the theme has data;
                         every value copied as the atlas's own string, never re-parsed or re-rounded
  access-and-connectivity_codebook.csv  the atlas codebook rows for these indicators, plus the currency audit columns
                         latest_available_wave, latest_available_url, up_to_date, currency_note

Exits non-zero (RULE 4) if any catalog indicator of the theme is missing from the atlas or the codebook,
if a written file's row count or row order differs from the atlas, if any written value differs from the
atlas, or if the currency audit does not cover every source the theme uses.

Usage (from the repo root):  python pipeline/gis/outcomes_by_category/access-and-connectivity/build.py
Stdlib only.
"""
import csv, sys
from pathlib import Path

THEME = "Access and connectivity"
SLUG = "access-and-connectivity"

HERE = Path(__file__).resolve().parent
ATLAS = HERE.parent.parent / "atlas"
LEVELS = {   # level -> id and name columns, as the atlas carries them
    "district": ["district_code", "district_name", "province_code"],
    "tehsil": ["tehsil_code", "tehsil_name", "district_code", "province_code"],
    "province": ["province_code", "province_name"],
}
CURRENCY_COLS = ["latest_available_wave", "latest_available_url", "up_to_date", "currency_note"]

# Currency audit, 30 October 2026. Keyed by (source_key, wave_held); every claim carries the URL it was
# checked against. up_to_date: yes = nothing newer from this publisher for this measure; no = a newer
# release exists at the URL given; unknown = could not be confirmed either way.
CURRENCY = {('travel_city', '2015'): {'latest_available_wave': '2015 (MAP '
                                                    'Accessibility__201501_Global_Travel_Time_to_Cities)',
                           'latest_available_url': 'https://data.malariaatlas.org/geoserver/ows?service=WCS&version=2.0.1&request=GetCapabilities',
                           'up_to_date': 'yes',
                           'currency_note': "MAP's WCS catalogue, queried 30 Oct 2026, holds no "
                                            'travel-time-to-cities coverage newer than 2015.'},
 ('travel_health', '2020'): {'latest_available_wave': '2020 (MAP '
                                                      'Accessibility__202001_Global_Motorized_Travel_Time_to_Healthcare)',
                             'latest_available_url': 'https://data.malariaatlas.org/geoserver/ows?service=WCS&version=2.0.1&request=GetCapabilities',
                             'up_to_date': 'yes',
                             'currency_note': "MAP's WCS catalogue, queried 30 Oct 2026, holds no motorized "
                                              'travel-time-to-healthcare coverage newer than 2020. Lead '
                                              'only, not a successor: arXiv 2609.12696 (Sept 2026, '
                                              'https://arxiv.org/abs/2609.12696) maps travel time to '
                                              'emergency and tertiary hospitals, a different measure; its '
                                              'data repository was not opened.'},
 ('map_walk', '2020'): {'latest_available_wave': '2020 (MAP '
                                                 'Accessibility__202001_Global_Walking_Only_Travel_Time_To_Healthcare)',
                        'latest_available_url': 'https://data.malariaatlas.org/geoserver/ows?service=WCS&version=2.0.1&request=GetCapabilities',
                        'up_to_date': 'yes',
                        'currency_note': "MAP's WCS catalogue, queried 30 Oct 2026, holds no walking-only "
                                         'coverage newer than 2020.'},
 ('grip4', '~2018'): {'latest_available_wave': 'GRIP4 (2018)',
                      'latest_available_url': 'https://dataportaal.pbl.nl/downloads/GRIP4/',
                      'up_to_date': 'yes',
                      'currency_note': "PBL's download portal serves GRIP4 only; /downloads/GRIP5/ answers "
                                       "'Folder of bestand is niet gevonden' (30 Oct 2026). The GRIP4 portal "
                                       "page links a CC0 1.0 deed, which the atlas codebook's licence field "
                                       "('No licence named in the download') does not record."},
 ('health_facilities', '2017'): {'latest_available_wave': '2017-11-15 (the same compilation)',
                                 'latest_available_url': 'https://data.humdata.org/dataset/pakistan-health-facilities',
                                 'up_to_date': 'yes',
                                 'currency_note': 'HDX metadata (API, 30 Oct 2026): dataset date and last '
                                                  'modification 2017-11-15; Alhasan Systems has published no '
                                                  'newer release. The data are nine years old. Other, '
                                                  'different sources are newer but are not successors: '
                                                  'Healthsites.io '
                                                  '(https://data.humdata.org/dataset/pakistan-healthsites, '
                                                  'to 2026-09-29) and HOT OSM health facilities '
                                                  '(https://data.humdata.org/dataset/hotosm_pak_health_facilities, '
                                                  '2026-10-12), both OpenStreetMap-based.'},
 ('ookla', '2025 Q2'): {'latest_available_wave': '2026 Q3 (2026-07-01 tiles); like-for-like season: 2026 Q2 '
                                                 '(2026-04-01)',
                        'latest_available_url': 'https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=mobile/year=2026/quarter=3/2026-07-01_performance_mobile_tiles.parquet',
                        'up_to_date': 'no',
                        'currency_note': 'The ookla-open-data bucket listing (30 Oct 2026) holds 2025 Q3, '
                                         '2025 Q4, 2026 Q1, Q2 and Q3 for both mobile and fixed '
                                         '(type=fixed/... same path). Public, CC BY-NC-SA 4.0, ~185 MB '
                                         'mobile and ~355 MB fixed per quarter. District builds of 2026 Q2 '
                                         'and Q3 by the atlas code path (Q2 2025 reproduced exactly first) '
                                         'are in access-and-connectivity_district_2026Q2.csv and '
                                         '_2026Q3.csv, not wired into the atlas; see README.'},
 # The newer quarters, in the atlas since 30 October 2026 (outcomes_by_category/newer_waves.tsv).
 ('ookla', '2026 Q2'): {'latest_available_wave': '2026 Q3',
                        'latest_available_url': 'https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=mobile/year=2026/quarter=3/2026-07-01_performance_mobile_tiles.parquet',
                        'up_to_date': 'no',
                        'currency_note': 'Held as the like-for-like season of the 2025 Q2 wave; 2026 Q3 is '
                                         'also in the atlas. District only.'},
 ('ookla', '2026 Q3'): {'latest_available_wave': '2026 Q3',
                        'latest_available_url': 'https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=mobile/year=2026/quarter=3/2026-07-01_performance_mobile_tiles.parquet',
                        'up_to_date': 'yes',
                        'currency_note': 'Newest quarter in the bucket listing of 30 Oct 2026. District only.'},
 ('ookla', '2020'): {'latest_available_wave': '2020 Q2 (fixed baseline)',
                     'latest_available_url': 'https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=mobile/year=2020/quarter=2/2020-04-01_performance_mobile_tiles.parquet',
                     'up_to_date': 'yes',
                     'currency_note': 'A deliberate baseline for change since 2020, not meant to be current; '
                                      'the current wave is the 2025 Q2 columns.'},
 ('PSLM 2019-20 microdata', '2019-20'): {'latest_available_wave': '2019-20 (district level); the 2026 '
                                                                  'district round is in the field',
                                         'latest_available_url': 'https://www.pbs.gov.pk/pslm-3/',
                                         'up_to_date': 'yes',
                                         'currency_note': "PBS's PSLM page (read 30 Oct 2026) lists 2019-20 "
                                                          'as the latest district-level round with report '
                                                          'and microdata; it says field work of the eighth '
                                                          'round, PSLM 2026, began 15 July 2026 for six '
                                                          'months, with no results yet. HIES 2024-25 '
                                                          '(https://www.pbs.gov.pk/hies/) is newer but '
                                                          'provincial-level only, so it is not a district '
                                                          'successor.'}}

FAILS = []


def check(name, ok, detail=""):
    print(f"  [{'pass' if ok else 'FAIL'}] {name}" + (f": {detail}" if detail else ""))
    if not ok:
        FAILS.append(name)


def read(path, delimiter=","):
    with open(path, encoding="utf-8-sig", newline="") as f:
        r = csv.DictReader(f, delimiter=delimiter)
        return r.fieldnames, list(r)


def write(path, fields, rows):
    with open(path, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fields, lineterminator="\n")
        w.writeheader()
        w.writerows(rows)


def currency_key(ind):
    """The (source_key, wave) an indicator belongs to; a column suffix _2020 marks the 2020 baseline."""
    return ind["source_key"], ("2020" if ind["indicator"].endswith("_2020") else ind["year"])


def main():
    print(f"{THEME} -> outcomes_by_category/{SLUG}/")
    _, cat = read(ATLAS / "indicator_catalog.tsv", "\t")
    keys = [r["key"] for r in cat if r["theme"] == THEME]
    check("theme has catalog indicators", len(keys) > 0, f"{len(keys)}")
    check("no duplicate keys in the catalog for this theme", len(keys) == len(set(keys)))

    cb_fields, cb = read(ATLAS / "atlas_codebook.csv")
    cbk = {}
    for r in cb:
        cbk.setdefault(r["indicator"], []).append(r)
    missing_cb = [k for k in keys if len(cbk.get(k, [])) != 1]
    check("every indicator has exactly one codebook row", not missing_cb, ", ".join(missing_cb))
    wrong_theme = [k for k in keys if k in cbk and cbk[k][0]["theme"] != THEME]
    check("codebook theme agrees with the catalog", not wrong_theme, ", ".join(wrong_theme))

    found = set()
    for level, ids in LEVELS.items():
        fields, rows = read(ATLAS / f"atlas_{level}.csv")
        cols = [k for k in keys if k in fields]
        found.update(cols)
        out = HERE / f"{SLUG}_{level}.csv"
        if not cols:
            check(f"{level}: theme has no data, so no file", not out.exists(),
                  f"stale {out.name} present" if out.exists() else "")
            continue
        check(f"{level}: id columns present in the atlas", all(c in fields for c in ids))
        write(out, ids + cols, [{c: r[c] for c in ids + cols} for r in rows])
        # Read back what was written and hold it against the atlas, cell by cell.
        wf, back = read(out)
        check(f"{level}: header is ids + {len(cols)} indicators", wf == ids + cols)
        check(f"{level}: row count equals the atlas", len(back) == len(rows), f"{len(back)} vs {len(rows)}")
        same_order = all(b[ids[0]] == a[ids[0]] for b, a in zip(back, rows))
        check(f"{level}: rows in the atlas's order", same_order)
        diff = [(a[ids[0]], c) for b, a in zip(back, rows) for c in ids + cols if b[c] != a[c]]
        check(f"{level}: every value equals the atlas", not diff, f"{len(diff)} differ, e.g. {diff[:3]}")
        filled = sum(1 for r in back for c in cols if r[c] != "")
        print(f"     {out.name}: {len(back)} rows x {len(cols)} indicators, {filled} non-empty values")

    absent = [k for k in keys if k not in found]
    check("every catalog indicator of the theme is in the atlas", not absent, ", ".join(absent))

    # Codebook with the currency audit.
    rows = []
    uncovered = []
    for k in keys:
        if k not in cbk:
            continue
        r = dict(cbk[k][0])
        cur = CURRENCY.get(currency_key(r))
        if cur is None:
            uncovered.append(f"{k} {currency_key(r)}")
            cur = {c: "" for c in CURRENCY_COLS}
        rows.append({**r, **cur})
    check("currency audit covers every source and wave", not uncovered, "; ".join(uncovered))
    bad = [f"{k}" for k, v in CURRENCY.items() if v["up_to_date"] not in ("yes", "no", "unknown")]
    check("up_to_date is yes / no / unknown", not bad, ", ".join(bad))
    nourl = [f"{k}" for k, v in CURRENCY.items() if v["up_to_date"] == "no" and not v["latest_available_url"].startswith("http")]
    check("every 'no' names the URL of the newer release", not nourl, ", ".join(nourl))
    write(HERE / f"{SLUG}_codebook.csv", cb_fields + CURRENCY_COLS, rows)
    _, back = read(HERE / f"{SLUG}_codebook.csv")
    check("codebook rows equal the atlas codebook for these indicators",
          len(back) == len(keys) and all(b[c] == cbk[b["indicator"]][0][c] for b in back for c in cb_fields))

    print(f"{'FAILED: ' + '; '.join(FAILS) if FAILS else 'all checks pass'}")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
