# Data quality

One theme of the GIS atlas, cut out as its own dataset: the indicators that `pipeline/gis/atlas/indicator_catalog.tsv`
files under "Data quality", with values exactly as in `atlas_{district,tehsil,province}.csv` (id and name columns
first). A unit file is written only where the theme has data. Built 30 October 2026.

| File                        | Rows | Indicators                                     |
| --------------------------- | ---- | ---------------------------------------------- |
| `data-quality_district.csv` | 160  | 2                                              |
| `data-quality_tehsil.csv`   | 577  | 1 (`rwi_cell_share`; Whipple is district-only) |
| `data-quality_province.csv` | 7    | 1 (`rwi_cell_share`)                           |
| `data-quality_codebook.csv` | 2    |                                                |

Indicators: `age_heaping_whipple` (Census 2023 Table 4, `outcomes/build_census_extended.py`) and
`rwi_cell_share` (Meta RWI coverage, `welfare/build_welfare_layers.py`).

The codebook is the atlas codebook's rows for these indicators plus `latest_available_wave`,
`latest_available_url`, `up_to_date` and `currency_note`.

## Rebuild

```
python pipeline/gis/outcomes_by_category/data-quality/build.py
```

Stdlib only. Reads `pipeline/gis/atlas/indicator_catalog.tsv`, `atlas_codebook.csv` and
`atlas_{district,tehsil,province}.csv`; never writes to them. Rerun after the atlas is rebuilt.

**Checks (exit non-zero on any):** a catalog indicator of the theme absent from every atlas file; an
indicator absent from a unit its codebook `units` says it covers; not exactly one codebook row per
indicator; a written file's row count differing from the atlas file's; any written cell differing from
the atlas cell (values are copied and compared as strings, so nothing is re-rounded); a `source_key`
with no currency entry. All pass on 30 October 2026. A negative test (a fake catalog key added to a
scratch copy of the catalog) made it exit 1 with three failures, as it should.

## Currency audit (30 October 2026)

Every source was checked for a newer release on 30 October 2026, against the publisher's own listing
(UCDP downloads page, the Zenodo API, the HDX CKAN API, CRAN). The same entries are in the
`latest_available_*`, `up_to_date` and `currency_note` columns of the codebook, set in `CURRENCY` in
`build.py`.

| Source                      | What we have                                | Newest available                                                                                                                                                                   | URL                                                    | Unit / format              | up_to_date |
| --------------------------- | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | -------------------------- | ---------- |
| Census 2023, Tables 1, 4, 9 | PakPC2023 0.2.0                             | PakPC2023 0.2.0 (CRAN, 2 Nov 2024) is still the latest; GitHub has only README commits since (16 May 2026). Not re-checked on the PBS site: two PBS census URLs tried returned 404 | https://cran.r-project.org/package=PakPC2023           | District and tehsil tables | yes        |
| Meta Relative Wealth Index  | India-and-Pakistan file, April 2021 release | Same file (dated 8 Apr 2021); the HDX dataset was re-touched in May 2026 without a new Pakistan edition                                                                            | https://data.humdata.org/dataset/relative-wealth-index | ~2.4 km tile points, CSV   | yes        |

Nothing newer to build.
