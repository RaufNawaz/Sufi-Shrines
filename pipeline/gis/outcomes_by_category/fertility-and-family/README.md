# Fertility and family: outcome indicators split from the atlas

The atlas indicators whose `theme` in `pipeline/gis/atlas/indicator_catalog.tsv` is **Fertility and family**, copied out of `atlas_{district,tehsil,province}.csv` with their id and name columns. Values are the atlas's cell text verbatim; nothing is recomputed here. Built 30 October 2026.

## Files

- `fertility-and-family_district.csv`, `fertility-and-family_tehsil.csv`, `fertility-and-family_province.csv`: 160 districts (13 indicators), 577 tehsils (4), 7 provinces (5); 15 catalog indicators in all. Every atlas row is kept, including units where the theme's cells are empty.
- `fertility-and-family_codebook.csv`: the atlas codebook rows for these indicators plus `source_group`, `latest_available_wave`, `latest_available_url`, `up_to_date` (yes / no / unknown), `currency_note`.
- `currency.tsv`: the hand-written currency audit below, one row per source group; `build.py` joins it into the codebook.
- `build.py`: the builder (stdlib only; the same file serves both category folders, the theme is taken from the folder name).

## Rebuild

```
python pipeline/gis/outcomes_by_category/fertility-and-family/build.py
```

Rebuild after the atlas is rebuilt. It exits non-zero if: a catalog indicator of the theme is missing from the atlas codebook or from every atlas unit file; any indicator's source has no `currency.tsv` row; an `up_to_date = no` row lacks a URL; a written file's row count differs from the atlas; or any cell, read back, differs from the atlas. All pass as of 30 October 2026 (and the currency check was seen to fail when a row was removed).

## Currency audit (30 October 2026)

Checked by web search and, for MAP and CRAN, by querying the servers directly. `unknown` means no newer release was found but no authoritative page says the one we have is the latest.

| source group   | indicators | have                                                                 | newest available                                                                                                        | district-level, machine-readable                                                                                                                                   | up to date | URL                                                          |
| -------------- | ---------- | -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------- | ------------------------------------------------------------ |
| dhs_quickstats | 2          | PDHS 2017-18, region (province) tables via HDX                       | PDHS 2017-18 is still the latest; PBS describes a PDHS 2026-27 as designed, with no results released                    | n/a (region-level survey)                                                                                                                                          | **yes**    | https://www.pbs.gov.pk/?p=28549                              |
| dhs_ms         | 3          | DHS Program modelled surfaces from PDHS 2017-18 (5 km)               | none newer: surfaces are tied to the survey, and the next PDHS (2026-27) has no results                                 | raster (aggregated here to district/tehsil)                                                                                                                        | **yes**    | https://www.pbs.gov.pk/?p=28549                              |
| census_2023    | 7          | Census 2023 district/tehsil tables via the PakPC2023 R package 0.2.0 | Census 2023 is Pakistan's latest census; PakPC2023 is still 0.2.0 on CRAN                                               | yes                                                                                                                                                                | **yes**    | https://cran.r-project.org/web/packages/PakPC2023/index.html |
| mics6          | 3          | MICS 6 district tables: Punjab 2017-18, Sindh 2018-19                | Punjab MICS 2023-24 (titled 'MICS 2024') Key Findings Report; South Punjab MICS 2025 (3 divisions) launched 27 Oct 2026 | no machine-readable district tables found: the 2024 release is a PDF Key Findings Report whose text layer shows breakdowns by area, division, education and wealth | **no**     | https://opendata.com.pk/dataset/mics-punjab-2024             |

Notes per source:

- **dhs_quickstats**: PBS: PDHS 'last conducted in 2017-18'; PDHS 2026-27 designed after the Ministry of Planning's 10 Dec 2024 direction. No fieldwork dates or results on that page (checked 30 Oct 2026).
- **dhs_ms**: Will become stale once PDHS 2026-27 is released and the DHS Program models it.
- **census_2023**: No later census exists. CRAN version checked 30 Oct 2026.
- **mics6**: Punjab is out of date. The opendata.com.pk RAR (18 MB) holds only 'KFR MICS2023-24 Punjab Final.pdf' (downloaded to sources/outcomes_by_category/fertility-and-family/). The State of Children portal says 'additional datasets yet to be released'. South Punjab MICS 2025: https://minutemirror.com.pk/south-punjab-releases-mics-2025-survey-findings-651832/ (division findings; mentions district scorecards, not seen). Sindh: no MICS after 2018-19 found. KP MICS 2019 and Balochistan MICS 2019-20 (also MICS 6) exist but are not in the atlas; listed at https://stateofchildren.com/?p=13990.

## Newer waves: leads, none pulled

No newer release met the bar for adding a `<slug>_district_<wave>.csv` (public, machine-readable, district-level, joinable by the `outcomes/census_crosswalk.py` name logic). What exists, for Rauf to decide on:

- **Punjab MICS 2023-24** ("MICS 2024"): released as a Key Findings Report PDF only. The open-data RAR (https://opendata.com.pk/dataset/mics-punjab-2024) was downloaded to `pipeline/gis/sources/outcomes_by_category/fertility-and-family/` (gitignored) and holds just `KFR MICS2023-24 Punjab Final.pdf`; its text layer shows breakdowns by area, division, education and wealth, and most of the PDF is images, so district tables were not found. Watch for a district-tables volume or microdata (the 2017-18 round had a separate Vol. II of district tables).
- **South Punjab MICS 2025** (Multan, Bahawalpur, DG Khan divisions), launched 27 Oct 2026: https://minutemirror.com.pk/south-punjab-releases-mics-2025-survey-findings-651832/ . Findings reported by division; the article mentions district "Child Wellbeing Scorecards", not seen.
- **Malaria Atlas Project 2025 slice**: the 202608 coverages already used carry a 2025 time step. Adding it means re-running the zonal step in `welfare/build_extended_layers.py` with `time(2025-01-01)`, not a name join, so it is outside this folder's remit.
- **KP MICS 2019 and Balochistan MICS 2019-20** are MICS 6 rounds the atlas does not carry (it has Punjab and Sindh only); listed at https://stateofchildren.com/?p=13990 . Not newer, but they would extend coverage.
- **PDHS 2026-27**: designed, no results (https://www.pbs.gov.pk/?p=28549). When it lands, both the DHS region tables and the DHS modelled surfaces become stale.
