# Child protection: the atlas's child-protection indicators as their own dataset

Cut from `pipeline/gis/atlas/` on 30 October 2026. These are the four indicators that
`atlas/indicator_catalog.tsv` files under **Child protection**, with values exactly as in the
atlas. All four come from the MICS 6 sampling-error appendix (Punjab 2017-18, Sindh 2018-19), read
by `outcomes/build_mics_district.py`. They exist at district level only.

| File                            | Rows                      | Columns                                                                                                                                       |
| ------------------------------- | ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `child-protection_district.csv` | 160 (all atlas districts) | `district_code, district_name, province_code` + `mics_birth_registration, mics_violent_discipline, mics_child_labour, mics_married_before_18` |
| `child-protection_codebook.csv` | 4                         | atlas codebook rows + `source_group, latest_available_wave, latest_available_url, up_to_date, currency_note, audited`                         |

Non-empty: 65 districts (Punjab 36, Sindh 29); violent discipline 64. The other 95 rows are empty
because MICS for KP and Balochistan is not in the atlas.

## Rebuild

```
python pipeline/gis/outcomes_by_category/child-protection/build.py
```

The script and its checks are the same as `../education/build.py`, with `THEME`/`SLUG` changed. It
exits 1 on any of the following:

- an indicator is missing from the catalog or the atlas
- the row count differs
- an id is duplicated
- a value differs from the atlas
- a currency entry is missing or invalid

All of these pass as of 30 October 2026.

## Currency audit (30 October 2026)

| Source        | Have                              | Newest found                                                                                                                                                                                 | District, machine-readable? | up_to_date                                                                 |
| ------------- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------- | -------------------------------------------------------------------------- |
| MICS 6 Punjab | 2017-18 (PR.1, PR.2, PR.3, PR.4b) | **Punjab MICS 2024**, KFR Dec 2024 ([page](https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024), [data listing](https://opendata.com.pk/dataset/mics-punjab-2024)) | KFR: no; RAR: not inspected | no                                                                         |
| MICS 6 Sindh  | 2018-19                           | no newer Sindh round found                                                                                                                                                                   | n/a                         | yes as far as found (the codebook row is shared with Punjab and says `no`) |

- The Punjab MICS 2024 Key Findings Report has birth registration (PR.1.1), child discipline
  (PR.2.1), child labour (PR.3.3) and child marriage (PR.4.1W/M). These are tabulated by area,
  functional difficulty, age, education and wealth, **not by district**. A district wave would
  have to be computed from the `MICS 2024.rar` microdata listed on opendata.com.pk, which has no
  stated licence and whose contents were not inspected. That is a lead for Rauf and was not acted on.
- MICS 6 KP (2019) and Balochistan (2019-20) would fill the empty 95 districts at the same
  vintage. See `../education/README.md`.
- Task 3 was not done, because no newer district table exists.
