# Environment

One theme of the GIS atlas, cut out as its own dataset: the indicators that `pipeline/gis/atlas/indicator_catalog.tsv`
files under "Environment", with values exactly as in `atlas_{district,tehsil,province}.csv` (id and name columns
first). A unit file is written only where the theme has data. Built 30 October 2026.

| File                       | Rows | Indicators |
| -------------------------- | ---- | ---------- |
| `environment_district.csv` | 160  | 4          |
| `environment_tehsil.csv`   | 577  | 4          |
| `environment_province.csv` | 7    | 4          |
| `environment_codebook.csv` | 4    |            |

Indicators: `pm25_2021_popw`, `share_pop_pm25_above_35_2021`, `share_pop_pm25_above_who_2021`,
`pm25_change_11_21`, all from LGHAP v2 (built by `welfare/build_air_quality.py`).

The codebook is the atlas codebook's rows for these indicators plus `latest_available_wave`,
`latest_available_url`, `up_to_date` and `currency_note`.

## Rebuild

```
python pipeline/gis/outcomes_by_category/environment/build.py
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

| Source                           | What we have                                                               | Newest available                                                                                               | URL                                 | Unit / format                                                           | up_to_date |
| -------------------------------- | -------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ----------------------------------- | ----------------------------------------------------------------------- | ---------- |
| LGHAP v2 PM2.5 (Bai et al. 2024) | Monthly-mean 1 km grids, 2011 and 2021 (Zenodo 14280025, covers 2000-2021) | Daily 1 km PM2.5 grids for 2022, 2023 and 2024 (Zenodo 22816222, 22822484, 22841795; published 17-19 Sep 2026) | https://zenodo.org/records/22841795 | Gridded, CC BY 4.0; 12 zips of about 1.1 GB per year (13.8 GB for 2024) | **no**     |

**Lead, not built:** LGHAP 2022-2024 now exists, but only as daily grids at about 13.8 GB a year.
A 2024 annual population-weighted mean would need all twelve ~1.1 GB monthly zips and a
daily-to-annual step that `build_air_quality.py` does not have (it reads monthly means), so it is
neither under the 1 GB limit nor the same code path. A decision for Rauf: whether a 2024 PM2.5 wave is
worth a ~14 GB download.
