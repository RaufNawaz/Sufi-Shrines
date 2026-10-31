# Population and identity

One theme of the GIS atlas, cut out as its own dataset: the indicators that `pipeline/gis/atlas/indicator_catalog.tsv`
files under "Population and identity", with values exactly as in `atlas_{district,tehsil,province}.csv` (id and name columns
first). A unit file is written only where the theme has data. Built 30 October 2026.

| File                                   | Rows | Indicators                                                                             |
| -------------------------------------- | ---- | -------------------------------------------------------------------------------------- |
| `population-and-identity_district.csv` | 160  | 9                                                                                      |
| `population-and-identity_tehsil.csv`   | 577  | 9                                                                                      |
| `population-and-identity_province.csv` | 7    | 2 (`pop_kontur_2023`, `pop_density`; the census columns are not in the province atlas) |
| `population-and-identity_codebook.csv` | 9    |                                                                                        |

Indicators: `pop2023`, `urban_share`, `pop_growth_17_23` (Census 2023 Table 1), `share_hindu_all`,
`share_christian`, `share_ahmadi`, `share_sikh` (Table 9), `pop_kontur_2023`, `pop_density` (Kontur).

The codebook is the atlas codebook's rows for these indicators plus `latest_available_wave`,
`latest_available_url`, `up_to_date` and `currency_note`.

## Rebuild

```
python pipeline/gis/outcomes_by_category/population-and-identity/build.py
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

| Source                      | What we have                 | Newest available                                                                                                                                                                   | URL                                                         | Unit / format                 | up_to_date |
| --------------------------- | ---------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------- | ----------------------------- | ---------- |
| Census 2023, Tables 1, 4, 9 | PakPC2023 0.2.0              | PakPC2023 0.2.0 (CRAN, 2 Nov 2024) is still the latest; GitHub has only README commits since (16 May 2026). Not re-checked on the PBS site: two PBS census URLs tried returned 404 | https://cran.r-project.org/package=PakPC2023                | District and tehsil tables    | yes        |
| Kontur Population           | Pakistan, release 2023-11-01 | Same; HDX lists 2022-06-30 and 2023-11-01 only, and the global dataset also ends at 2023-11-01                                                                                     | https://data.humdata.org/dataset/kontur-population-pakistan | H3 res-8 hexagons, GeoPackage | yes        |

Nothing newer to build. Census values that are blank in the atlas (all 10 Azad Kashmir and 14
Gilgit-Baltistan districts, which the census tables do not cover, and Lehri, PK218, in Balochistan) are copied as blank.
