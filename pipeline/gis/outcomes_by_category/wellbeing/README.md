# Wellbeing: the atlas's wellbeing indicators as their own dataset

Cut from `pipeline/gis/atlas/` on 30 October 2026. These are the two indicators that
`atlas/indicator_catalog.tsv` files under **Wellbeing**: life satisfaction (0-10) for women and
for men aged 15-24, from MICS EQ.9a. The source is the MICS 6 sampling-error appendix (Punjab
2017-18, Sindh 2018-19). Values are exactly as in the atlas. Both indicators exist at district
level only.

| File                     | Rows                      | Columns                                                                                                               |
| ------------------------ | ------------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `wellbeing_district.csv` | 160 (all atlas districts) | `district_code, district_name, province_code, mics_life_satisfaction_women, mics_life_satisfaction_men`               |
| `wellbeing_codebook.csv` | 2                         | atlas codebook rows + `source_group, latest_available_wave, latest_available_url, up_to_date, currency_note, audited` |

65 districts have values (Punjab 36, Sindh 29). The rest are empty.

## Rebuild

```
python pipeline/gis/outcomes_by_category/wellbeing/build.py
```

The script and its checks are the same as `../education/build.py`, with `THEME`/`SLUG` changed. All
checks pass as of 30 October 2026.

## Currency audit (30 October 2026)

| Source                      | Have              | Newest found                                                                                                                         | District, machine-readable? | up_to_date                  |
| --------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ | --------------------------- | --------------------------- |
| MICS 6 Punjab / Sindh EQ.9a | 2017-18 / 2018-19 | Punjab MICS 2024 ([page](https://stateofchildren.com/punjab-multiple-indicator-cluster-survey-kfr-2024)); no newer Sindh round found | no                          | no (Punjab wave superseded) |

The Punjab MICS 2024 Key Findings Report has **no life-satisfaction table**. Its contents cover
child survival, nutrition, school attendance, protection and WASH. Whether the 2024 questionnaire
asked about life satisfaction at all was not confirmed. Even if it did, a district figure could
only be computed from the microdata (`MICS 2024.rar` on
[opendata.com.pk](https://opendata.com.pk/dataset/mics-punjab-2024), not inspected, no stated
licence). That is a lead only.

Task 3 was not done.
