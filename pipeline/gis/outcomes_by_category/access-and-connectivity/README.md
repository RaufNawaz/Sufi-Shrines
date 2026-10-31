# Access and connectivity

The 25 atlas indicators whose catalog theme is **Access and connectivity**, as their own dataset.
Values are copied from the atlas as strings; nothing is recomputed.

| File                                                         | Rows     | Indicators                                                                                              |
| ------------------------------------------------------------ | -------- | ------------------------------------------------------------------------------------------------------- |
| `access-and-connectivity_district.csv`                       | 160      | 25                                                                                                      |
| `access-and-connectivity_tehsil.csv`                         | 577      | 21 (the four PSLM indicators are district-only)                                                         |
| `access-and-connectivity_province.csv`                       | 7        | 21                                                                                                      |
| `access-and-connectivity_codebook.csv`                       | 25       | atlas codebook columns + `latest_available_wave`, `latest_available_url`, `up_to_date`, `currency_note` |
| `access-and-connectivity_district_2026Q2.csv`, `_2026Q3.csv` | 160 each | 5 Ookla indicators, newer quarters (see below). **Not in the atlas or viewer.**                         |

Sources: MAP travel time to cities (2015), MAP motorized and walking travel time to health care (2020),
GRIP4 road density (~2018), Alhasan Systems' 2017 government facility compilation, Ookla Speedtest open
data (Q2 2025, with a Q2 2020 baseline), PSLM 2019-20 district microdata. Definitions, publishers and
licences are in the codebook; the method is in `docs/GIS_FOUNDATION.md` and the builders in
`pipeline/gis/welfare/` and `pipeline/gis/outcomes/`.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/access-and-connectivity/build.py
```

Stdlib only. It exits non-zero if any catalog indicator of the theme is missing from the atlas or
codebook, if a written file's row count or row order differs from the atlas, if any written cell differs
from the atlas (read back after writing and compared cell by cell), or if the currency audit does not
cover every source/wave, uses a value other than yes/no/unknown, or says "no" without a URL. All pass
(30 October 2026). Rerun it whenever the atlas is rebuilt.

## Currency audit, 30 October 2026

| Source                                   | Have    | Newest available                                            | Checked at                                                                                                                | Up to date               |
| ---------------------------------------- | ------- | ----------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------ |
| MAP travel time to cities                | 2015    | 2015                                                        | MAP WCS GetCapabilities (`https://data.malariaatlas.org/geoserver/ows?service=WCS&version=2.0.1&request=GetCapabilities`) | yes                      |
| MAP motorized travel time to health care | 2020    | 2020                                                        | same                                                                                                                      | yes                      |
| MAP walking travel time to health care   | 2020    | 2020                                                        | same                                                                                                                      | yes                      |
| GRIP4 road density                       | ~2018   | GRIP4                                                       | https://dataportaal.pbl.nl/downloads/GRIP4/ (`/GRIP5/` answers "not found")                                               | yes                      |
| Alhasan health facilities                | 2017    | 2017 (HDX last modified 2017-11-15)                         | https://data.humdata.org/dataset/pakistan-health-facilities                                                               | yes (but nine years old) |
| Ookla open data                          | 2025 Q2 | **2026 Q3** (also 2025 Q3, Q4, 2026 Q1, Q2)                 | https://ookla-open-data.s3.amazonaws.com/?list-type=2&prefix=parquet/performance/type=mobile/year=2026/                   | **no**                   |
| Ookla 2020 baseline                      | 2020 Q2 | (a fixed baseline)                                          |                                                                                                                           | yes                      |
| PSLM district                            | 2019-20 | 2019-20; the 2026 round is in the field (began 15 Jul 2026) | https://www.pbs.gov.pk/pslm-3/                                                                                            | yes                      |

Notes:

- **MAP:** no coverage newer than 2015 (cities) or 2020 (health care) in MAP's own catalogue. A lead,
  not a successor: arXiv 2609.12696 (https://arxiv.org/abs/2609.12696, Sept 2026) maps travel time to
  emergency and tertiary hospitals, a different measure; its data repository was not opened.
- **GRIP4 licence:** the PBL portal page links a CC0 1.0 deed; the atlas codebook says "No licence named
  in the download". Recorded here, not changed in the atlas.
- **Health facilities:** newer Pakistan facility lists exist but are different sources, not successors,
  and both are OpenStreetMap-based: Healthsites.io (https://data.humdata.org/dataset/pakistan-healthsites,
  to 2026-09-29) and HOT (https://data.humdata.org/dataset/hotosm_pak_health_facilities, 2026-10-12).
- **PSLM:** HIES 2024-25 (https://www.pbs.gov.pk/hies/) is newer but provincial-level only.

## Newer Ookla quarters (Task 3)

`build_ookla_wave.py` (GIS venv) builds Ookla quarters through the atlas's own code: it imports
`welfare/build_extended_layers.py` and calls its `ookla()` and `aggregate()` on the same Kontur carrier,
changing only the quarter file. **Before building anything it rebuilds Q2 2025 from welfare's own files
and requires all 160 districts x 5 indicators to equal the atlas exactly** (they do: 0 differ), and it
requires the output to hold exactly the atlas's districts. It writes nothing outside this folder.

```bash
# raw files (public, CC BY-NC-SA 4.0; ~185 MB mobile + ~355 MB fixed per quarter)
D=pipeline/gis/sources/outcomes_by_category/access-and-connectivity/ookla
for k in mobile fixed; do
  curl -o $D/2026-04-01_performance_${k}_tiles.parquet \
    https://ookla-open-data.s3.amazonaws.com/parquet/performance/type=$k/year=2026/quarter=2/2026-04-01_performance_${k}_tiles.parquet
done   # likewise quarter=3/2026-07-01
~/.venvs/gis312/Scripts/python pipeline/gis/outcomes_by_category/access-and-connectivity/build_ookla_wave.py 2026-04-01 2026-07-01
```

Built 30 October 2026: `_2026Q2.csv` (like-for-like season with the atlas's Q2 2025) and `_2026Q3.csv`
(newest). Columns keep the atlas names (`mobile_download_mbps`, `fixed_download_mbps`,
`mobile_devices_per_1000`, `fixed_devices_per_1000`, `share_pop_near_mobile_test`).

**Read before comparing waves.** Mobile Speedtest volume inside Pakistan more than doubled between the
quarters: 583,157 tests on 59,434 tiles in Q2 2025, 1,276,153 on 85,444 in Q2 2026, 1,369,365 on 87,377
in Q3 2026 (fixed: 2.06 M, 2.70 M, 3.37 M tests). The devices-per-1,000 and near-a-test columns measure
testing, so a rise between waves is not by itself a rise in use. Four districts have no mobile speed in
2026 Q2 and Q3 (none in Q2 2025).

Whether to replace the atlas's Q2 2025 columns, add a 2026 column, or leave them is Rauf's decision;
nothing here is wired into the atlas or the viewer.
