# Education: the atlas's education indicators as their own dataset

Cut from `pipeline/gis/atlas/` on 30 October 2026. Every indicator that
`atlas/indicator_catalog.tsv` files under the theme **Education** (24), with its values exactly as
the atlas has them. Nothing is recomputed here.

| File                     | Rows                      | Columns                                                                                                                       |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `education_district.csv` | 160 (all atlas districts) | `district_code, district_name, province_code` + 23 indicators                                                                 |
| `education_tehsil.csv`   | 577 (all atlas tehsils)   | `tehsil_code, tehsil_name, district_code, province_code` + 12 indicators (Census 2023 and DHS surfaces)                       |
| `education_province.csv` | 7                         | `province_code, province_name` + 3 DHS indicators                                                                             |
| `education_codebook.csv` | 24                        | the atlas codebook rows, plus `source_group, latest_available_wave, latest_available_url, up_to_date, currency_note, audited` |

Rows are every unit in the atlas table, so an empty cell means the source does not cover that unit.
Non-empty districts: Census 2023 135 (134 youth, 130 rural female), PSLM 2019-20 129, UNDP and
PSLM 2014-15 122, MICS 65 (Punjab 36 + Sindh 29; numeracy 63), DHS surfaces 160.
`dhs_women_secondary_plus` is province only.

## Rebuild

```
python pipeline/gis/outcomes_by_category/education/build.py
```

Stdlib only. Rerun after the atlas is rebuilt. It exits 1 if a catalog indicator of the theme is
missing from the codebook or from an atlas level its codebook `units` names; if a written file's
row count differs from the atlas; if an id is duplicated; if any written value (read back from
disk) differs from the atlas string; or if an indicator has no currency entry, an invalid
`up_to_date`, or a "no" without a URL. Tested on 30 October 2026 that dropping one column from a
copy of the atlas makes it fail.

## Currency audit (30 October 2026)

Question: is a newer release that covers Pakistan at district level (or finer) available?

| Source                                          | Have                              | Newest found                                                                                                                                                                                                                                                                 | District, machine-readable?                 | up_to_date                               |
| ----------------------------------------------- | --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------- | ---------------------------------------- |
| Census                                          | 2023, Tables 12/13A via PakPC2023 | Census 2023 is the latest ([PBS detailed results](https://www.pbs.gov.pk/content/7th-population-and-housing-census-detailed-results))                                                                                                                                        | yes, Excel                                  | yes                                      |
| PDHS (surfaces, region table)                   | 2017-18                           | 2017-18 is still the latest; PBS directed to run a [PDHS 2026-27](https://www.pbs.gov.pk/?p=28549), national/provincial design, no results yet                                                                                                                               | no                                          | yes                                      |
| UNDP NHDR schooling                             | 2017 report (2014-15 data)        | not confirmed                                                                                                                                                                                                                                                                | n/a                                         | unknown                                  |
| PSLM                                            | 2019-20 district round            | 2019-20 is the latest district round ([PBS PSLM page](https://www.pbs.gov.pk/docs/pakistan-social-and-living-standard-measurement-survey-pslm/)); [PSLM/HIES 2024-25](https://www.pbs.gov.pk/wp-content/uploads/2020/07/PSLM_Report_2024-25-Social-2.pdf) is provincial only | 2019-20: microdata                          | yes                                      |
| PSLM 2014-15                                    | 2014-15                           | 2019-20, already in the atlas                                                                                                                                                                                                                                                | microdata                                   | no (kept as the earlier wave on purpose) |
| MICS 6 learning (Punjab 2017-18, Sindh 2018-19) | LN.2, LN.22a, LN.22d              | **Punjab MICS 2024** ([KFR page](https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024), [data listing](https://opendata.com.pk/dataset/mics-punjab-2024)); no newer Sindh round found                                                               | KFR: no district tables; RAR: not inspected | no (Punjab)                              |

### Notes and leads (none acted on)

- **Punjab MICS 2024.** Fieldwork Dec 2023 to Feb 2024, Key Findings Report dated December 2024,
  over 45,000 households. The KFR was downloaded (gitignored) to
  `pipeline/gis/sources/outcomes_by_category/education/punjab_mics_2024_kfr.pdf`. Its learning
  section has school attendance only (LN.2.3/2.4/2.6). There are **no foundational reading or
  numeracy tables** and no early-learning table, and it breaks down by area, education and wealth,
  **not by district**. So nothing in it replaces our district MICS learning columns. The landing
  page says "additional datasets yet to be released". `opendata.com.pk` lists a `MICS 2024.rar`
  with no stated licence. It is probably microdata. Getting district estimates from it would mean
  computing weighted estimates rather than joining a table, so this goes to Rauf rather than being
  done here.
- **MICS 6 for KP (2019) and Balochistan (2019-20)** exist with district samples. They are the
  same vintage, so this is a coverage gap rather than a currency gap. `outcomes/build_mics_district.py`
  already reads them if the PDFs are saved by hand (mics.unicef.org refuses scripts).
- **ASER Pakistan** is not in the atlas. It is a citizen-led learning assessment by district. A
  [2025 national report](https://aserpakistan.org/document/2025/aser_national_2025.pdf) is
  listed, and the latest district dictionaries are for 2023
  ([DD1](https://aserpakistan.org/document/aser/2023/reports/ASER-District-Dictionary-DD1-2023.pdf)).
  Raw data is behind a request form (`aserpakistan.org/index.php?func=raw_data_frm`), and the
  district tables are PDFs. Lead only.
- **UNDP schooling.** No UNDP Pakistan NHDR newer than 2017 with district schooling tables was
  confirmed. It was not established whether the 2020 NHDR has district tables. SDPI's
  [Provincial Development Monitor 2024](https://sdpi.org/assets/lib/uploads/PDM_2024_20251103-1.pdf)
  gives district HDI for 2019-2023, but it is a PDF from a different publisher with a different
  method. Lead only.
- **AEPAM Pakistan Education Statistics 2023-24** reports out-of-school children. No verified
  district table was found. Not checked further.

Task 3 (add a newer wave) was **not done**. No newer district-level source was found that is both
public and machine-readable as a table.
