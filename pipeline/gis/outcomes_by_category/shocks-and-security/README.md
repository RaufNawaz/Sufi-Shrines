# Shocks and security

One theme of the GIS atlas, cut out as its own dataset: the indicators that `pipeline/gis/atlas/indicator_catalog.tsv`
files under "Shocks and security", with values exactly as in `atlas_{district,tehsil,province}.csv` (id and name columns
first). A unit file is written only where the theme has data. Built 30 October 2026.

| File                                          | Rows     | Indicators                |
| --------------------------------------------- | -------- | ------------------------- |
| `shocks-and-security_district.csv`            | 160      | 6                         |
| `shocks-and-security_tehsil.csv`              | 577      | 6                         |
| `shocks-and-security_province.csv`            | 7        | 6                         |
| `shocks-and-security_codebook.csv`            | 6        |                           |
| `shocks-and-security_district_ged261.csv`     | 160      | 4 (newer wave, see below) |
| `shocks-and-security_district_unosat2025.csv` | 160      | 1 (new event, see below)  |
| `shocks-and-security_newer_waves_checks.csv`  | 7 checks |                           |

Indicators: `share_pop_flooded_2022`, `share_pop_flooded_2010` (UNOSAT), `conflict_deaths_per_100k`,
`conflict_civilian_deaths_per_100k`, `conflict_onesided_deaths_per_100k`, `conflict_events` (UCDP GED
25.1), all built by `welfare/build_extended_layers.py`.

The codebook is the atlas codebook's rows for these indicators plus `latest_available_wave`,
`latest_available_url`, `up_to_date` and `currency_note`.

## Rebuild

```
python pipeline/gis/outcomes_by_category/shocks-and-security/build.py
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

| Source               | What we have                                              | Newest available                                                                         | URL                                                                                                                | Unit / format                                    | up_to_date                         |
| -------------------- | --------------------------------------------------------- | ---------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------ | ---------------------------------- |
| UCDP GED             | GED 25.1 (events 1989-2024)                               | GED 26.1 (events to 2025; file dated 8 Jun 2026)                                         | https://ucdp.uu.se/downloads/ged/ged261-csv.zip                                                                    | Point events, CSV 39 MB, aggregable to districts | **no**                             |
| UNOSAT flood extents | FL20220808PAK: VIIRS 1 Jul-31 Aug 2022; MODIS 27 Aug 2010 | No revision of either. Newer _event_: FL20250818PAK, VIIRS flood water 26 Aug-7 Sep 2025 | https://data.humdata.org/dataset/satellite-detected-water-extents-from-26-august-to-7-september-2025-over-pakistan | Polygon shapefile, 19.5 MB                       | yes (for the 2022 and 2010 events) |

## Newer releases, built but not wired in

`build_newer_waves.py` (GIS venv: `~/.venvs/gis312/Scripts/python
pipeline/gis/outcomes_by_category/shocks-and-security/build_newer_waves.py`) takes `ucdp()` and `flood()`
from `welfare/build_extended_layers.py` by `inspect.getsource`, swaps only the input path (each swap must
match exactly once), and uses the builder's own Kontur carrier. **Before writing anything it reruns the
same code on the old inputs and requires every district value to equal `atlas_district.csv`:** 0 of 640
conflict values and 0 of 320 flood values differ. It also checks the sha256 of both downloads and that
all 160 atlas districts get a value. All 7 checks pass (`shocks-and-security_newer_waves_checks.csv`).
Raw inputs are in `pipeline/gis/sources/outcomes_by_category/shocks-and-security/` (gitignored).

- **`_district_ged261.csv`**: the same four conflict indicators, same 2015-2024 window and definitions,
  from GED 26.1. UCDP revised its back data: Pakistan deaths 2015-2024 go from 9,933 to 10,042 and
  district-located events from 2,340 to 2,396; 24 districts change their event count, 27 their death
  rate (largest change 7.62 per 100,000). The builder's console label still prints "GED 25.1" during
  this run; it is a hardcoded print, the file read is 26.1. A 2016-2025 window was not built, since that
  is a different definition.
- **`_district_unosat2025.csv`**: `share_pop_flooded_2025`, share of Kontur 2023 residents whose cell
  centre lies in UNOSAT's `VIIRS_20250826_20250907_FloodWaterExtent_PAK` (FL20250818PAK). Same attribute
  schema as the 2022 layer (`Flood Water`, `New Water / Water Increase`, not field-validated), but a
  **13-day window against 2022's two months**, so it is not comparable as a trend: 3.27 M residents
  inside, against 32.9 M for 2022.

Whether either goes into the atlas and viewer is Rauf's decision; nothing here touches them.
