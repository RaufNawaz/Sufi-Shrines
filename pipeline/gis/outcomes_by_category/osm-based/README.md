# OSM-based (read the caveat)

The 4 atlas indicators whose catalog theme is **OSM-based (read the caveat)**, as their own dataset.
Values are copied from the atlas as strings; nothing is recomputed. All four are district-level only
(OCHA ADM2 P-codes), so there is no tehsil or province file.

| File                     | Rows | Indicators                                                                                                                |
| ------------------------ | ---- | ------------------------------------------------------------------------------------------------------------------------- |
| `osm-based_district.csv` | 160  | 4 (`rural_access_index`, `share_access_hospitals_1h`, `share_access_primary_healthcare_1h`, `share_access_education_5km`) |
| `osm-based_codebook.csv` | 4    | atlas codebook columns + `latest_available_wave`, `latest_available_url`, `up_to_date`, `currency_note`                   |

Source: HeiGIT risk assessment indicators for Pakistan, via HDX (CC BY-SA 4.0), built by
`heigit_layer()` in `pipeline/gis/welfare/build_welfare_layers.py`.

**The caveat.** These are built on OpenStreetMap, and OSM's coverage of Pakistan is thin and uneven:
it holds about 3% of the country's schools (5,071 counted by HeiGIT against 313,418 institutions in
Pakistan Education Statistics 2021-22; `docs/GIS_FOUNDATION.md`). Every access share here measures
mapping effort as much as provision.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/osm-based/build.py
```

Stdlib only. Exits non-zero if any catalog indicator of the theme is missing from the atlas or codebook,
if the row count or order differs from the atlas, if any written cell differs from the atlas (read back
and compared cell by cell), if a tehsil/province file exists although the theme has no data there, or if
the currency audit is incomplete or says "no" without a URL. All pass (30 October 2026).

## Currency audit, 30 October 2026

| Source                            | Have                                                                             | Newest available | Checked at                                                             | Up to date |
| --------------------------------- | -------------------------------------------------------------------------------- | ---------------- | ---------------------------------------------------------------------- | ---------- |
| HeiGIT risk assessment indicators | the HDX release dated 2026-02-26 to 2026-08-27 (files last modified 26 Aug 2026) | the same         | https://data.humdata.org/dataset/pakistan---risk-assessment-indicators | yes        |

- HDX's API reports the dataset last modified 2026-10-12, with the same resource URLs as
  `welfare/sources.tsv`. The local copy was fetched 2026-10-30, and **all 160 atlas `rural_access_index`
  values equal `RAI_total_pop` in it, P-code by P-code**, so the atlas holds the current release.
- **The catalog's year for these four, "2023", does not describe this release.** It is not changed
  here (the catalog is outside this folder); it is flagged for the coordinator.
- HeiGIT also publishes a separate Pakistan accessibility indicators dataset
  (https://data.humdata.org/dataset/pakistan-accessibility-indicators, dated 2026-01-30). The atlas does
  not use it, and it was not assessed.
