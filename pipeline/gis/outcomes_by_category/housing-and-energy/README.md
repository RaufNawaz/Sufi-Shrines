# Housing and energy — outcome dataset

Every indicator that `pipeline/gis/atlas/indicator_catalog.tsv` assigns to the theme
**Housing and energy** (13 indicators), cut out of the atlas with values copied exactly as the
atlas holds them. Built 30 October 2026. Not read by the website or the viewer.

| File                              | Rows                      | Indicators | What                                                                                                          |
| --------------------------------- | ------------------------- | ---------- | ------------------------------------------------------------------------------------------------------------- |
| `housing-and-energy_district.csv` | 160 (all atlas districts) | 12         | `district_code, district_name, province_code` + Census 2023 Tables 20-22, 25, 26 (135 districts carry values) |
| `housing-and-energy_tehsil.csv`   | 577 (all atlas tehsils)   | 12         | same Census 2023 columns (≈299 tehsils with values)                                                           |
| `housing-and-energy_province.csv` | 7                         | 1          | `dhs_hh_electricity` (PDHS 2017-18, DHS region)                                                               |
| `housing-and-energy_codebook.csv` | 13                        | —          | atlas codebook rows + `latest_available_wave, latest_available_url, up_to_date, currency_note`                |
| `housing-and-energy_checks.csv`   | —                         | —          | every invariant `build.py` ran and its result                                                                 |

Every atlas row is kept, including units where all of the theme's values are empty, so row
counts and id order equal the atlas.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/housing-and-energy/build.py
```

Stdlib only. Exits non-zero if a catalog indicator of the theme is in no atlas level or has no
codebook row, if a written file's row count / id order / any cell differs from the atlas
(re-read from disk), if an indicator's source has no currency entry, or if `up_to_date` is not
`yes`/`no`/`unknown`. All 25 checks passed on 30 October 2026. Rebuild after the atlas is
rebuilt.

## Currency audit (30 October 2026)

| Source                                 | Indicators | Have    | Newest available                                                                                                                                                                                                                                  | District-level, machine-readable? | up_to_date |
| -------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------- | ---------- |
| Census 2023 (PBS, via PakPC2023 0.2.0) | 12         | 2023    | Census 2023 is the latest census; PakPC2023 0.2.0 is still current on CRAN. [PBS release](https://pbs.gov.pk/release-of-national-and-provincial-census-reports-of-population-and-housing-census-2023-2/)                                          | yes                               | yes        |
| PDHS 2017-18 (HDX quickstats)          | 1          | 2017-18 | Still the latest Pakistan DHS per the [DHS API survey list](https://api.dhsprogram.com/rest/dhs/surveys?countryIds=PK&surveyStatus=all&f=json). PDHS 2026-27 announced by PBS, national/provincial only ([PBS](https://www.pbs.gov.pk/?p=28549)). | province only                     | yes        |

No newer district-level release exists for any source in this theme, so there is no Task 3
file. The next refresh points are the PSLM 2026 district round (in the field since 15 July
2026, [PBS](https://www.pbs.gov.pk/pslm/); whether its questionnaire covers these indicators was not checked) and PDHS 2026-27 (province only).
