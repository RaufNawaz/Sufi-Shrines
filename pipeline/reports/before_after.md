# Validation before/after — shrines_merged.csv (baseline) vs shrines_final.csv

Baseline: `reports/validation_baseline.tsv` (after description cleanup + patch merge, before targeted fixes). Final: `reports/validation_final.tsv`. Both runs: `validate_shrines.py --termbase termbase.tsv --fail-on NONE`, 163 rows, 915 termbase rules.

| severity | baseline | final |
|---|---|---|
| ERROR | 3 | 1 |
| WARN | 306 | 300 |
| INFO | 27 | 25 |
| **total** | **336** | **326** |

| severity | check | baseline | final | delta |
|---|---|---|---|---|
| ERROR | figure_not_in_description | 2 | 1 | -1 |
| ERROR | internal_artefact | 1 | 0 | -1 |
| WARN | coord_far_from_place | 7 | 5 | -2 |
| WARN | coord_off_cluster | 26 | 25 | -1 |
| WARN | coord_suspicious | 2 | 0 | -2 |
| WARN | events_empty | 1 | 1 |  |
| WARN | expansion_ratio | 22 | 22 |  |
| WARN | hotlinked_image | 24 | 24 |  |
| WARN | no_bibliography | 52 | 52 |  |
| WARN | no_image | 51 | 51 |  |
| WARN | placeholder_text | 5 | 5 |  |
| WARN | termbase_violation | 116 | 115 | -1 |
| INFO | coord_precision | 21 | 18 | -3 |
| INFO | duplicate_coord | 1 | 2 | +1 |
| INFO | termbase_violation | 5 | 5 |  |

## Issues resolved by the targeted fixes (19)

- **Garh Maharaja (Shorkot)** — ERROR `figure_not_in_description`: 'Sultan Bahoo' — no distinctive token appears in the description
- **Dargah of Khwaja Muhammad Zaman (Luari Sharif)** — ERROR `internal_artefact`: ...ovince. He was also a poet of note: a body of mystical verse in Sindhi is attributed to hi...
- **Gurdwara Dera Sahib** — INFO `coord_precision`: 31.3523, 74
- **Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)** — INFO `coord_precision`: 32.0415, 74
- **Tomb of Javindi Bibi** — INFO `coord_precision`: 29.14, 71.04
- **Gurdwara Dera Sahib** — WARN `coord_far_from_place`: 39 km from Lahore
- **Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)** — WARN `coord_far_from_place`: 24 km from Eminabad
- **Gurdwara Babay Nanki** — WARN `coord_off_cluster`: 20.2 km from the Lahore cluster centre
- **Gurdwara Chhevin Patshahi, Jhalian (Jhalian Dhilwan)** — WARN `coord_off_cluster`: 25.6 km from the Lahore cluster centre
- **Gurdwara Dera Sahib** — WARN `coord_off_cluster`: 38.3 km from the Lahore cluster centre
- **Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)** — WARN `coord_off_cluster`: 23.4 km from the Eminabad cluster centre
- **Gurdwara Patshahi Chhevin (Hadiara), Lahore** — WARN `coord_off_cluster`: 27.3 km from the Lahore cluster centre
- **Shrine of Baba Shah Kamal** — WARN `coord_off_cluster`: 5.0 km from the Lahore cluster centre
- **Shrine of Ganj e Inayat Sarkar** — WARN `coord_off_cluster`: 5.7 km from the Lahore cluster centre
- **Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)** — WARN `coord_off_cluster`: 5.9 km from the Lahore cluster centre
- **Tomb of Javindi Bibi** — WARN `coord_off_cluster`: 11.0 km from the Uch Sharif cluster centre
- **Gurdwara Dera Sahib** — WARN `coord_suspicious`: truncated value: 31.3523, 74
- **Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)** — WARN `coord_suspicious`: truncated value: 32.0415, 74
- **Allo Mahar** — WARN `termbase_violation`: 'khatm' -> 'khatam'

## Issues introduced (9)

- **Tomb of Javindi Bibi** — INFO `duplicate_coord`: identical to Tomb of Baha'al-Halim (Uch Sharif)
- **Gurdwara Babay Nanki** — WARN `coord_off_cluster`: 20.7 km from the Lahore cluster centre
- **Gurdwara Chhevin Patshahi, Jhalian (Jhalian Dhilwan)** — WARN `coord_off_cluster`: 25.9 km from the Lahore cluster centre
- **Gurdwara Patshahi Chhevin (Hadiara), Lahore** — WARN `coord_off_cluster`: 27.7 km from the Lahore cluster centre
- **Shrine of Baba Shah Kamal** — WARN `coord_off_cluster`: 5.7 km from the Lahore cluster centre
- **Shrine of Ganj e Inayat Sarkar** — WARN `coord_off_cluster`: 6.2 km from the Lahore cluster centre
- **Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)** — WARN `coord_off_cluster`: 5.7 km from the Lahore cluster centre
- **Shrine of Mian Mir** — WARN `coord_off_cluster`: 5.1 km from the Lahore cluster centre
- **Shrine of Shah Jamal** — WARN `coord_off_cluster`: 5.3 km from the Lahore cluster centre

## Notes

- The surviving ERROR (Amb Temples `figure_not_in_description`) is deliberate: the row claims dedication to Shiva (Mahadev) but its description never mentions Shiva. Per instructions the row was not edited; it carries `needs_review=dedication_unsourced` (see QUESTIONS.md).
- `coord_off_cluster` churn (rows appearing in both lists with slightly different km): the cluster centre is the member median, so correcting Gurdwara Dera Sahib's coordinates moved the Lahore cluster centre by ~0.5 km. Seven Lahore-area rows re-report at marginally different distances, and two borderline sites (Shrine of Mian Mir, Shrine of Shah Jamal — both genuinely ~5 km from the Walled City) now just cross the 5 km threshold. Net: 26 -> 25, with Dera Sahib, Khoohi Bhai Lalo and Javindi Bibi resolved.
- `duplicate_coord` +1 (INFO): Tomb of Javindi Bibi's corrected point (29.238, 71.064) is byte-identical to Tomb of Baha'al-Halim's — the two monuments stand side by side on the Uch Sharif Bukhari mound, and 3-decimal precision (~110 m) cannot separate them. See QUESTIONS.md §3.
- WARN-level counts (no_bibliography, no_image, hotlinked_image, termbase_violation, expansion_ratio, placeholder_text) concern content sourcing/completeness that is out of scope for this repair (no prose may be invented).
