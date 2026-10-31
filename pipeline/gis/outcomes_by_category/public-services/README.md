# Public services

The 5 atlas indicators whose catalog theme is **Public services**, as their own dataset. Values are
copied from the atlas as strings; nothing is recomputed. All five are district-level only, so there is
no tehsil or province file.

| File                           | Rows | Indicators                                                                                                                                     |
| ------------------------------ | ---- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `public-services_district.csv` | 160  | 5 (`pslm_satisfied_bhu`, `pslm_satisfied_hospital`, `pslm_satisfied_primary_school`, `pslm_satisfied_police`, `undp_health_satisfaction_2015`) |
| `public-services_codebook.csv` | 5    | atlas codebook columns + `latest_available_wave`, `latest_available_url`, `up_to_date`, `currency_note`                                        |

Sources: PSLM 2019-20 district microdata (Pakistan Bureau of Statistics), built by
`pipeline/gis/outcomes/build_pslm_district.py`; UNDP Pakistan National Human Development Report 2017,
Tables 1-2 (2015 data), built by `pipeline/gis/outcomes/build_undp_hdi_district.py`. These are
satisfaction among users, as reported; they are not measures of provision.

## Rebuild

```bash
python pipeline/gis/outcomes_by_category/public-services/build.py
```

Stdlib only. Exits non-zero if any catalog indicator of the theme is missing from the atlas or codebook,
if the row count or order differs from the atlas, if any written cell differs from the atlas (read back
and compared cell by cell), if a tehsil/province file exists although the theme has no data there, or if
the currency audit is incomplete or says "no" without a URL. All pass (30 October 2026).

## Currency audit, 30 October 2026

| Source                                  | Have             | Newest available                                                               | Checked at                     | Up to date |
| --------------------------------------- | ---------------- | ------------------------------------------------------------------------------ | ------------------------------ | ---------- |
| PSLM district                           | 2019-20          | 2019-20; the eighth round, PSLM 2026, began field work 15 Jul 2026, no results | https://www.pbs.gov.pk/pslm-3/ | yes        |
| UNDP NHDR district HDI health component | 2015 (NHDR 2017) | not established                                                                | web search                     | unknown    |

- **PSLM:** HIES 2024-25 (https://www.pbs.gov.pk/hies/) is newer but provincial-level only. When the
  2026 district microdata appear on the PSLM page, `build_pslm_district.py` is the route.
- **UNDP:** no newer UNDP Pakistan district HDI with a health-facility satisfaction component was found.
  A 2026 policy brief on district HDI exists
  (https://resdev.org/wp-content/uploads/2026/04/Policy-Brief-75-Pakistans-Human-Development-Index-at-the-District-Level.pdf)
  but was not opened; whether it carries this component, or is UNDP's, is unconfirmed.

No newer machine-readable district release was found, so nothing was downloaded or built.
