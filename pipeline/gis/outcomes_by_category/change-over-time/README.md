# Change over time: the atlas theme as its own dataset

Every indicator that `pipeline/gis/atlas/indicator_catalog.tsv` files under the theme **Change over time**
(10 indicators), cut out of the merged atlas with values copied unchanged. All ten are district-level, so
there is no tehsil or province file.

| File                            | Rows                                       | Columns                                                                                            |
| ------------------------------- | ------------------------------------------ | -------------------------------------------------------------------------------------------------- |
| `change-over-time_district.csv` | 160 (= atlas; 122 with at least one value) | `district_code, district_name, province_code` + 10 indicators                                      |
| `change-over-time_codebook.csv` | 10                                         | the atlas codebook rows + `latest_available_wave, latest_available_url, up_to_date, currency_note` |
| `change-over-time_checks.csv`   | 12                                         | every check `build.py` ran, with its result                                                        |

The indicators: `undp_hdi_change_05_15` (UNDP district HDI, 2005 to 2015) and nine `chg_*_15_20`
(PSLM 2014-15 to 2019-20, in points; empty where either round's value is a parent district's, per the
codebook). Rows with no value are kept so the file joins one to one with the atlas.

Three other change measures are catalogued under "Wealth and poverty", not here, and live in that folder:
`mpi_headcount_change_05_15`, `ntl_change_13_23`, `gdp_pc_growth_13_23`.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/change-over-time/build.py
```

Stdlib only. It exits non-zero if a catalog indicator of the theme is missing from the codebook or the
atlas, if the codebook's `units` disagree with the atlas columns, if the row count differs from the atlas,
if an id repeats, if any written value read back differs from the atlas, or if an indicator lacks a
currency verdict. (Tested by tampering one cell: it fails.)

## Currency audit (30 October 2026)

| Source                                                  | What the atlas has  | Newest found                                                                                                                                                                                                                                                        | District, machine-readable? | Up to date |
| ------------------------------------------------------- | ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ---------- |
| PSLM district rounds (both ends of the `chg_*` changes) | 2014-15 and 2019-20 | the same two; the 2026-27 district round has been in the field since 15 Jul 2026, no results ([PBS](https://www.pbs.gov.pk/pslm-3/)). HIES 2024-25 ([report](https://www.pbs.gov.pk/wp-content/uploads/2020/07/HIES-2024-25-Report-Final-1.pdf)) is provincial only | microdata                   | yes        |
| UNDP district HDI (NHDR 2017)                           | 2005 to 2015        | not confirmed: NHDR 2020 (Inequality) is reported to present district HDI, but UNDP's pages refused the fetcher ([page](https://www.undp.org/pakistan/publications/pakistan-national-human-development-report-inequality))                                          | unknown                     | unknown    |

### Leads

- **District MPI change 2014-15 to 2019-20**, 110 districts, in the MPI Report 2019-20 (MPDSI, UNICEF,
  OPHI, 2024), sections 3.4-3.5 ([PDF](https://ophi.org.uk/sites/default/files/2025-01/Pakistan_MPI_2019%E2%80%9320_%282024%29.pdf)).
  PDF only, so not extracted here; a copy is in
  `pipeline/gis/sources/outcomes_by_category/wealth-and-poverty/`. It would extend the atlas's MPI change
  (2004-05 to 2014-15) by one more interval.
- The next PSLM change (2019-20 to 2026-27) becomes possible when PBS publishes the round now in the field.

No newer wave was machine-readable at district level, so no `_district_<wave>.csv` was written. Whether
to adopt any newer wave is a decision for Rauf.
