# Water and sanitation — outcome dataset

Every indicator that `pipeline/gis/atlas/indicator_catalog.tsv` assigns to the theme
**Water and sanitation** (17 indicators), cut out of the atlas with values copied exactly as
the atlas holds them. Built 30 October 2026. Not read by the website or the viewer.

| File                                | Rows                      | Indicators | What                                                                                                                             |
| ----------------------------------- | ------------------------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `water-and-sanitation_district.csv` | 160 (all atlas districts) | 17         | `district_code, district_name, province_code` + Census 2023 (Tables 22-24), DHS modelled surfaces, PSLM 2019-20, NNS 2018, MICS6 |
| `water-and-sanitation_tehsil.csv`   | 577 (all atlas tehsils)   | 8          | 6 Census 2023 columns (≈299 tehsils with values) + 2 DHS modelled-surface columns (all 577)                                      |
| `water-and-sanitation_province.csv` | 7                         | 2          | `dhsms_improved_water`, `dhsms_open_defecation`                                                                                  |
| `water-and-sanitation_codebook.csv` | 17                        | —          | atlas codebook rows + `latest_available_wave, latest_available_url, up_to_date, currency_note`                                   |
| `water-and-sanitation_checks.csv`   | —                         | —          | every invariant `build.py` ran and its result                                                                                    |

Every atlas row is kept, including units where all of the theme's values are empty, so row
counts and id order equal the atlas.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/water-and-sanitation/build.py
```

Stdlib only. Exits non-zero if a catalog indicator of the theme is in no atlas level or has no
codebook row, if a written file's row count / id order / any cell differs from the atlas
(re-read from disk), if an indicator's source has no currency entry, or if `up_to_date` is not
`yes`/`no`/`unknown`. All 25 checks passed on 30 October 2026. Rebuild after the atlas is
rebuilt.

## Currency audit (30 October 2026)

| Source                                    | Indicators | Have    | Newest available                                                                                                                                                                                                                                                                                                                                                                                                    | District-level, machine-readable?    | up_to_date       |
| ----------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| Census 2023 (PBS, via PakPC2023 0.2.0)    | 6          | 2023    | Census 2023 is the latest census; PakPC2023 0.2.0 is still current on CRAN. [PBS release](https://pbs.gov.pk/release-of-national-and-provincial-census-reports-of-population-and-housing-census-2023-2/)                                                                                                                                                                                                            | yes                                  | yes              |
| DHS modelled surfaces (PDHS 2017-18)      | 2          | 2017-18 | PDHS 2017-18 is still the latest Pakistan DHS per the [DHS API](https://api.dhsprogram.com/rest/dhs/surveys?countryIds=PK&surveyStatus=all&f=json); PDHS 2026-27 announced, not released ([PBS](https://www.pbs.gov.pk/?p=28549)).                                                                                                                                                                                  | 5 km raster                          | yes              |
| PSLM District Level Survey                | 5          | 2019-20 | 2019-20 is still the latest released district round; the 8th round (PSLM 2026) has been in the field since 15 July 2026. [PBS PSLM page](https://www.pbs.gov.pk/pslm/)                                                                                                                                                                                                                                              | not yet released                     | yes              |
| National Nutrition Survey (water quality) | 3          | 2018    | No later round found by web search; no authoritative listing checked. [NNS 2018 KFR](https://reliefweb.int/report/pakistan/national-nutrition-survey-2018-key-findings-report)                                                                                                                                                                                                                                      | —                                    | unknown          |
| MICS6 Punjab 2017-18 / Sindh 2018-19      | 1          | 2017-19 | **Punjab MICS 2024** (Key Findings Report; [opendata listing](https://opendata.com.pk/dataset/mics-punjab-2024), [KFR page](https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024)); South Punjab MICS 2025 launched by division on 27 Oct 2026 ([Minute Mirror](https://minutemirror.com.pk/south-punjab-releases-mics-2025-survey-findings-651832/)). No Sindh round after 2018-19 found. | district tables not confirmed public | no (Punjab half) |

### Leads (nothing downloaded)

- **Punjab MICS 2024** for `mics_safely_managed_water`: the only machine-readable copy found is
  an undocumented `MICS 2024.rar` uploaded to opendata.com.pk by a private account; not a safe
  source. `bos.punjab.gov.pk` did not respond from this environment. Whether to replace the
  Punjab half of this column is a decision for Rauf.
- **WHO/UNICEF JMP** published its 2000-2024 household update in August 2025
  ([JMP 2025 report](https://washdata.org/report/jmp-2025-annual-report)). It is national
  (urban/rural) for Pakistan, not district-level, so it is not a replacement for any column here.
- **Coverage, not currency:** KP MICS6 (2019) and Balochistan MICS6 (2019-20) exist
  ([Balochistan, Popcouncil listing](https://adh.popcouncil.org/datasets/pakistan-balochistan-multiple-indicator-cluster-survey/); KP per [P&D KP](https://pndkp.gov.pk/?p=26267); years from search results, not opened) and are not in the
  atlas, which is why `mics_safely_managed_water` covers only 65 districts.
