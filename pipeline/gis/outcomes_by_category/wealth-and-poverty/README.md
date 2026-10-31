# Wealth and poverty: the atlas theme as its own dataset

Every indicator that `pipeline/gis/atlas/indicator_catalog.tsv` files under the theme **Wealth and
poverty** (31 indicators), cut out of the merged atlas with values copied unchanged.

| File                              | Rows          | Columns                                                                                                |
| --------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------ |
| `wealth-and-poverty_district.csv` | 160 (= atlas) | `district_code, district_name, province_code` + 27 indicators                                          |
| `wealth-and-poverty_tehsil.csv`   | 577 (= atlas) | `tehsil_code, tehsil_name, district_code, province_code` + 6 indicators (RWI, Kummu GDP, night lights) |
| `wealth-and-poverty_province.csv` | 7 (= atlas)   | `province_code, province_name` + 10 indicators (the six gridded ones + OPHI MPI)                       |
| `wealth-and-poverty_codebook.csv` | 31            | the atlas codebook rows + `latest_available_wave, latest_available_url, up_to_date, currency_note`     |
| `wealth-and-poverty_checks.csv`   | 22            | every check `build.py` ran, with its result                                                            |

All rows of each atlas file are kept, including rows where every theme value is empty, so the files join
back to the atlas one to one. Where a value is empty in the atlas it is empty here. Definitions, publishers,
licences and caveats are in the codebook; nothing has been added to them except the currency audit.

Note the catalog's own filing: `mpi_headcount_change_05_15`, `ntl_change_13_23` and `gdp_pc_growth_13_23`
are changes over time but are catalogued here, not under "Change over time". This folder follows the catalog.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/wealth-and-poverty/build.py
```

Stdlib only. Rebuild after the atlas is rebuilt. It exits non-zero if a catalog indicator of the theme is
missing from the codebook or from every atlas file, if the codebook's `units` disagree with where the atlas
carries the indicator, if a row count differs from the atlas, if an id repeats, if any written value read
back differs from the atlas cell, or if an indicator has no currency verdict. (The value check was tested
by tampering one cell: it fails as it should.)

## Currency audit (30 October 2026)

Is a newer release, covering Pakistan at district level or finer, available today? Researched by web
search and by the HDX, figshare and Zenodo APIs. A measurement with a date on it: re-check before quoting.

| Source                                        | What the atlas has                            | Newest found                                                                                                                                                                                                                                                                                                                                                                                                                                    | District, machine-readable? | Up to date                                             |
| --------------------------------------------- | --------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | ------------------------------------------------------ |
| World Bank Pakistan Poverty Map (PRWP 11012)  | 2019-20                                       | 2019-20 ([data catalog](https://datacatalog.worldbank.org/search/dataset/0066822/pakistan-poverty-map-2019-2020), updated 2 Apr 2025). HIES 2024-25 is out ([report](https://www.pbs.gov.pk/wp-content/uploads/2020/07/HIES-2024-25-Report-Final-1.pdf)) but provincial                                                                                                                                                                         | xlsx, district              | yes                                                    |
| Meta Relative Wealth Index                    | 2021 release                                  | same ([HDX](https://data.humdata.org/dataset/76f2a2ea-ba50-40f5-b79c-db95d668b843))                                                                                                                                                                                                                                                                                                                                                             | csv, ~2.4 km tiles          | yes                                                    |
| Kummu et al. GDP per capita                   | 2023 (growth 2013-23) from the 1990-2024 file | Zenodo 18429133, 1990-2024, still latest version ([Zenodo](https://zenodo.org/records/18429133))                                                                                                                                                                                                                                                                                                                                                | gpkg, 32 divisions          | yes (but a 2024 value sits unused in the file we hold) |
| Night lights, Li et al. harmonized DMSP/VIIRS | 2023 (change 2013-23)                         | **2024** raster in figshare 9828827, modified 10 Aug 2025 ([figshare](https://figshare.com/articles/dataset/9828827))                                                                                                                                                                                                                                                                                                                           | GeoTIFF, needs zonal stats  | **no**                                                 |
| OPHI Global MPI                               | PDHS 2017-18, province                        | same; Pakistan's next DHS is PDHS 2026-27 ([PBS](https://www.pbs.gov.pk/?p=28549); [HDX](https://data.humdata.org/dataset/6b9b9c1c-e43c-45e2-a411-621dc1f5a641))                                                                                                                                                                                                                                                                                | province only               | yes                                                    |
| IPC acute food insecurity                     | "latest"                                      | analysis of Mar 2026; HDX file modified 5 Oct 2026, our download of 30 Oct 2026 contains it ([HDX](https://data.humdata.org/dataset/fff6a42e-e562-4b2a-937e-33e7deb02730))                                                                                                                                                                                                                                                                      | csv, district               | yes                                                    |
| PSLM District Level Survey                    | 2019-20                                       | 2019-20; the 2026-27 district round has been in the field since 15 Jul 2026, no results ([PBS](https://www.pbs.gov.pk/pslm-3/))                                                                                                                                                                                                                                                                                                                 | microdata                   | yes                                                    |
| District MPI (MoPDR, UNDP, OPHI 2016)         | 2014-15, 2004-05                              | **2019-20**: MPI Report 2019-20 (MPDSI, UNICEF, OPHI, 2024), Appendix D "Multidimensional Poverty by District", 127 districts ([PDF](https://ophi.org.uk/sites/default/files/2025-01/Pakistan_MPI_2019%E2%80%9320_%282024%29.pdf))                                                                                                                                                                                                              | PDF only                    | **no**                                                 |
| UNDP district HDI (NHDR 2017)                 | 2015                                          | not confirmed. NHDR 2020 (Inequality) is reported to present district HDI, but UNDP's pages refused the fetcher ([page](https://www.undp.org/pakistan/publications/pakistan-national-human-development-report-inequality)). A different series, SDPI's derived district HDI, is in its [Provincial Development Monitor 2024](https://sdpi.org/assets/lib/uploads/PDM_2024_20251103-1.pdf)                                                       | unknown                     | unknown                                                |
| National Nutrition Survey                     | 2018                                          | 2018; no newer round found ([KFR](https://www.unicef.org/pakistan/media/2861/file/NNS%20KFR.pdf))                                                                                                                                                                                                                                                                                                                                               | PDF tables                  | yes                                                    |
| MICS 6 (Punjab 2017-18, Sindh 2018-19)        | 2017-19                                       | **Punjab MICS 2024**, district-representative ([KFR](<https://mics.unicef.org/sites/mics/files/2025-01/Pakistan%202024%20MICS%20(Punjab)%20KFR.pdf>); microdata RAR at [opendata.com.pk](https://opendata.com.pk/dataset/mics-punjab-2024), June 2026, no licence stated). MICS7 for other provinces at design stage in Oct 2025 ([UNICEF](https://mics.unicef.org/news/first-mics7-survey-design-workshop-strengthens-data-capacity-pakistan)) | microdata                   | **no** (Punjab)                                        |

### Leads (Task 3 not done, and why)

No newer release was both district-level and a machine-readable table joinable by the
`census_crosswalk.py` logic, so no `_district_<wave>.csv` was written:

1. **District MPI 2019-20**: PDF only. Downloaded (gitignored) to
   `pipeline/gis/sources/outcomes_by_category/wealth-and-poverty/pakistan_mpi_2019-20_2024.pdf`;
   Appendix D begins on p. 75 and parses as fixed-width text under `pdftotext -layout`. Needs a parser in
   the style of `pipeline/gis/outcomes/build_mpi_district.py` (poppler, not xpdf; see `outcomes/pdftext.py`).
2. **Night lights 2024**: raster; extend the zonal statistics in `pipeline/gis/welfare/`.
3. **Kummu GDP 2024**: already in the file we hold; a one-year change in the welfare builder.
4. **Punjab MICS 2024**: microdata in a RAR with no licence stated; needs the MICS tabulation logic.
5. **UNDP NHDR 2020**: open the full report and check for a district HDI annex.

Whether to move the atlas to any of these waves is a decision for Rauf, not taken here.

Could not confirm: whether NHDR 2020 has a district HDI table; the licence of the Punjab MICS 2024 microdata.
