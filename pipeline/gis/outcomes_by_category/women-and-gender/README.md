# Women and gender — outcome dataset

Every indicator that `pipeline/gis/atlas/indicator_catalog.tsv` assigns to the theme
**Women and gender** (29 indicators), cut out of the atlas with values copied exactly as the
atlas holds them. Built 30 October 2026. Not read by the website or the viewer.

| File                            | Rows                      | Indicators | What                                                                                                        |
| ------------------------------- | ------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------- |
| `women-and-gender_district.csv` | 160 (all atlas districts) | 16         | `district_code, district_name, province_code` + Census 2023 (Table 4, 6, 25), PSLM 2019-20, NNS 2018, MICS6 |
| `women-and-gender_tehsil.csv`   | 577 (all atlas tehsils)   | 1          | `home_owner_female` (Census 2023 Table 25); 299 tehsils carry a value                                       |
| `women-and-gender_province.csv` | 7                         | 13         | PDHS 2017-18 DHS-region indicators (`dhs_*`)                                                                |
| `women-and-gender_codebook.csv` | 29                        | —          | atlas codebook rows + `latest_available_wave, latest_available_url, up_to_date, currency_note`              |
| `women-and-gender_checks.csv`   | —                         | —          | every invariant `build.py` ran and its result                                                               |

Every atlas row is kept, including units where all of the theme's values are empty, so row
counts and id order equal the atlas. A unit level is written only if the theme has at least one
column there.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/women-and-gender/build.py
```

Stdlib only. Exits non-zero if a catalog indicator of the theme is in no atlas level or has no
codebook row, if a written file's row count / id order / any cell differs from the atlas
(re-read from disk), if an indicator's source has no currency entry, or if `up_to_date` is not
`yes`/`no`/`unknown`. All 25 checks passed on 30 October 2026. Rebuild after the atlas is
rebuilt.

## Currency audit (30 October 2026)

| Source                                 | Indicators | Have    | Newest available                                                                                                                                                                                                                                                                                                                                                                                                    | District-level, machine-readable?    | up_to_date       |
| -------------------------------------- | ---------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------ | ---------------- |
| Census 2023 (PBS, via PakPC2023 0.2.0) | 6          | 2023    | Census 2023 is the latest census; PakPC2023 0.2.0 is still current on CRAN. [PBS release](https://pbs.gov.pk/release-of-national-and-provincial-census-reports-of-population-and-housing-census-2023-2/)                                                                                                                                                                                                            | yes                                  | yes              |
| PSLM District Level Survey             | 4          | 2019-20 | 2019-20 is still the latest released district round; the 8th round (PSLM 2026) has been in the field since 15 July 2026. [PBS PSLM page](https://www.pbs.gov.pk/pslm/)                                                                                                                                                                                                                                              | not yet released                     | yes              |
| National Nutrition Survey              | 4          | 2018    | No later round found by web search; no authoritative listing checked. [NNS 2018 KFR](https://reliefweb.int/report/pakistan/national-nutrition-survey-2018-key-findings-report)                                                                                                                                                                                                                                      | —                                    | unknown          |
| MICS6 Punjab 2017-18 / Sindh 2018-19   | 2          | 2017-19 | **Punjab MICS 2024** (Key Findings Report; [opendata listing](https://opendata.com.pk/dataset/mics-punjab-2024), [KFR page](https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024)); South Punjab MICS 2025 launched by division on 27 Oct 2026 ([Minute Mirror](https://minutemirror.com.pk/south-punjab-releases-mics-2025-survey-findings-651832/)). No Sindh round after 2018-19 found. | district tables not confirmed public | no (Punjab half) |
| PDHS 2017-18 (DHS API, HDX quickstats) | 13         | 2017-18 | Still the latest Pakistan DHS per the [DHS API survey list](https://api.dhsprogram.com/rest/dhs/surveys?countryIds=PK&surveyStatus=all&f=json). PDHS 2026-27 announced by PBS, national/provincial only ([PBS](https://www.pbs.gov.pk/?p=28549)).                                                                                                                                                                   | province only                        | yes              |

### Leads (nothing downloaded)

- **Punjab MICS 2024.** The only machine-readable copy found is `MICS 2024.rar` on
  opendata.com.pk, uploaded by a private account with no documentation; not a safe source. The
  KFR page says further datasets are "yet to be released". `bos.punjab.gov.pk` (the official
  source, and its _Punjab in Figures 2025_, which search snippets say carries MICS 2024 key
  findings at provincial level) did not respond from this environment. Next: fetch the BoS
  Punjab MICS page from a Pakistani connection, or the UNICEF MICS microdata catalogue once
  listed (microdata needs registration). Whether to replace the Punjab half of the two
  `mics_*` columns is a decision for Rauf.
- **Coverage, not currency:** KP MICS6 (2019) and Balochistan MICS6 (2019-20) exist
  ([Balochistan, Popcouncil listing](https://adh.popcouncil.org/datasets/pakistan-balochistan-multiple-indicator-cluster-survey/); KP per [P&D KP](https://pndkp.gov.pk/?p=26267); years from search results, not opened)
  and are not in the atlas, which is why the `mics_*` columns cover only 65 districts.
- **PDHS 2026-27** will not be district-level per PBS's own description.
