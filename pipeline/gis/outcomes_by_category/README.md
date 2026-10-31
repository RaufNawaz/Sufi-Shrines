# Outcome datasets, one folder per category

_Built 30 October 2026 by six research agents, one per group of themes, at Rauf's request ("build
datasets for each of the outcome categories, so that they are separate, and check that all the
datasets for the outcome variables are up to date"). Coordinator's summary; each folder's README has
the detail and its sources._

**What each folder is.** One theme of `atlas/indicator_catalog.tsv`, split out of the atlas: its
indicators only, at every unit where the theme has data (`<slug>_district.csv`, `_tehsil.csv`,
`_province.csv`), with the atlas codebook rows plus a currency audit (`latest_available_wave`,
`latest_available_url`, `up_to_date`, `currency_note`). The atlas stays the master: every
`build.py` re-reads `atlas/atlas_*.csv` and **exits 1 if any value, row count, id or indicator differs
from it**, or if a source has no currency verdict. All seventeen pass (re-run by the coordinator,
30 October 2026).

| Folder                     | Themes' indicators |
| -------------------------- | ------------------ |
| `wealth-and-poverty/`      | 31                 |
| `change-over-time/`        | 10 (district only) |
| `education/`               | 24                 |
| `child-protection/`        | 4 (district only)  |
| `wellbeing/`               | 2 (district only)  |
| `health-and-nutrition/`    | 40                 |
| `fertility-and-family/`    | 15                 |
| `women-and-gender/`        | 29                 |
| `water-and-sanitation/`    | 17                 |
| `housing-and-energy/`      | 13                 |
| `access-and-connectivity/` | 25                 |
| `public-services/`         | 5 (district only)  |
| `osm-based/`               | 4 (district only)  |
| `environment/`             | 4                  |
| `shocks-and-security/`     | 6                  |
| `population-and-identity/` | 9                  |
| `data-quality/`            | 2                  |

The "Archive" theme (the shrine counts) is not an outcome and is not split out.

Rebuild all: `for d in pipeline/gis/outcomes_by_category/*/; do (cd "$d" && python -I build.py) || echo "FAIL $d"; done`

## Is each source up to date? (30 October 2026)

Every "newer exists" carries a URL in the folder's codebook; "unknown" means no newer release could be
confirmed either way.

**Current:** Census 2023 (PakPC2023 0.2.0); PSLM district round 2019-20 (PSLM 2026 is in the field, no
results; HIES 2024-25 is provincial only); PDHS 2017-18 and the DHS surfaces (PDHS 2026-27 is
designed, no results); World Bank poverty map 2019-20; Meta RWI 2021; OPHI provincial MPI; IPC (March
2026, already held); Kontur population; MAP travel time (2015, 2020); GRIP4 roads; HeiGIT indicators.

**Newer release exists:**

| Source                | Held                 | Newest                                                                       | Built here?                                                                                                                                                                                                                     |
| --------------------- | -------------------- | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Ookla open data       | 2025 Q2              | 2026 Q3                                                                      | yes, `access-and-connectivity/…_district_2026Q2.csv`, `_2026Q3.csv` (the existing code path; Q2 2025 rebuilt to 0 differences first). Mobile tests doubled, so per-1,000 rates are not comparable across waves without a caveat |
| UCDP GED              | 25.1                 | 26.1                                                                         | yes, `shocks-and-security/…_district_ged261.csv` (UCDP revised its past: deaths 9,933 → 10,042, 27 districts change)                                                                                                            |
| UNOSAT floods         | 2010, 2022           | a new event, 26 Aug–7 Sep 2025                                               | yes, `shocks-and-security/…_district_unosat2025.csv`; 13 days against 2022's two months, so not a trend                                                                                                                         |
| Night lights          | 2023                 | 2024                                                                         | no: a lead                                                                                                                                                                                                                      |
| Kummu GDP             | 2023                 | file runs to 2024                                                            | no                                                                                                                                                                                                                              |
| Malaria Atlas Project | year 2024            | year 2025 in the same release                                                | no: needs the zonal step re-run; whether 2025 is modelled or projected is unconfirmed                                                                                                                                           |
| District MPI (OPHI)   | 2014-15              | 2019-20, 127 districts                                                       | no: PDF only (saved under `sources/`, gitignored)                                                                                                                                                                               |
| MICS 6 Punjab         | 2017-18              | Punjab MICS 2024 (key findings Dec 2024); South Punjab MICS 2025 by division | no: no district tables found; microdata only as an unlicensed RAR on opendata.com.pk                                                                                                                                            |
| LGHAP PM2.5           | 2011, 2021 (monthly) | daily grids 2022–24, ~13.8 GB a year                                         | no: too large, and needs a new monthly-mean step                                                                                                                                                                                |

**Unknown:** UNDP district HDI after 2015; National Nutrition Survey after 2018; newer MICS for Sindh,
KP or Balochistan.

**In the atlas since 30 October 2026** (Rauf: go ahead). Every newer wave sits beside the wave it
follows under its own key, never replacing it, and is listed in `newer_waves.tsv` (key, unit, file,
column, label, definition, source, licence), which `atlas/build_atlas.py` reads; the atlas refuses to
build if the registry and `atlas/indicator_catalog.tsv` disagree, if a file lacks a registered column,
or if a file has other than one row per unit. 25 new indicators: Ookla 2026 Q2 and Q3 (district), UCDP
GED 26.1 (district), the 2025 flood (district), night lights 2024 and Kummu GDP 2024 (tehsil, district,
province), MAP malaria 2025 (tehsil, district, province), district MPI 2019-20 (district; 129 of 160
districts). Each newer file was built only after its builder reproduced the wave the atlas already held
with 0 differences. Against the atlas at the start of 30 October, not one existing cell changed.

Not taken: Punjab MICS 2024 (the only copy is an unlicensed archive uploaded by a private account) and
LGHAP daily PM2.5 2022-24 (~13.8 GB a year, needs a new monthly-mean step).

Kummu GDP is in **2021** international dollars (Zenodo 18429133 v4: "Unit changed to USD in 2021
international dollars"); the atlas codebook said constant 2017 dollars until 30 October 2026.
(asked in the chat, 30 October 2026).

## Found on the way, outside these folders (not yet acted on)

- The catalog dates the four HeiGIT indicators "2023"; the values match the HDX release of 2026
  (all 160 districts' `rural_access_index`). The label looks wrong; check before changing it.
- GRIP4's download page links a CC0 licence; the atlas codebook says no licence was named.
