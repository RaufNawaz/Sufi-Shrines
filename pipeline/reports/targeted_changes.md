# STEP 3 targeted fixes (shrines_merged.csv -> shrines_final.csv)

Column added: info_level (blank except where noted). Rows: 163. Columns: 43.

## Allo Mahar — `Description`
- before (3 lines):

```
## Overview

Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot District, in the fertile plain between the Chenab and the foothills of Kashmir, which has become known across Pakistani Punjab as a centre of Naqshbandi devotion. Its fame rests above all on the shrine of Sayyid Faiz-ul-Hassan Shah, the twentieth-century orator and scholar honoured by his followers as *Khatib-ul-Islam*, "… [truncated; 4637 chars — full value in CSVs/backups]
```
- after (7 lines):

```
## Overview

Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot District, in the plain between the Chenab and the Kashmir foothills. The suffix *Sharif* — "noble" — marks the sanctity local tradition ascribes to it, and the village is known across Pakistani Punjab as a centre of Naqshbandi devotion associated with a line of *sayyid* families.

## A note on identification

Two distinct… [truncated; 1449 chars — full value in CSVs/backups]
```
- note: replacement sourced verbatim from allo_mahar_resolution.md ('Proposed replacement description'); prior prose described Sayyid Faiz-ul-Hassan Shah while the row names Pir Syed Muhammad Channan Shah Nuri

## Allo Mahar — `needs_review`
- before: `''`
- after: `'figure_unresolved'`
- note: per allo_mahar_resolution.md

## Allo Mahar — `info_level`
- before: `''`
- after: `'Low'`
- note: per allo_mahar_resolution.md

## Tomb of Javindi Bibi — `Latitude`
- before: `'29.14'`
- after: `'29.238'`

## Tomb of Javindi Bibi — `Longitude`
- before: `'71.04'`
- after: `'71.064'`

## Tomb of Javindi Bibi — `principal_figure`
- before: `'Bibi Jawindi'`
- after: `'Bibi Jawindi'`
- note:  (already satisfied upstream; no-op)

## Tomb of Javindi Bibi — `qa_note`
- before: `''`
- after: `'Coordinates corrected to the Bibi Jawindi tomb on the Uch Sharif Bukhari mound (29.238, 71.064); previous value (29.14, 71.04) sat ~11 km off the Uch Sharif monument cluster.'`

## Parnami Mandir — `principal_figure`
- before: `'Dya Ram (samadhi)'`
- after: `'Dya Ram'`

## Parnami Mandir — `figure_type`
- before: `'Sant'`
- after: `'Sant'`
- note:  (already satisfied upstream; no-op)

## Garh Maharaja (Shorkot) — `principal_figure`
- before: `'Sultan Bahoo'`
- after: `'Sultan Bahu'`
- note: canonical spelling; matches the description

## Gurdwara Dera Sahib — `Latitude`
- before: `'31.3523'`
- after: `'31.588'`

## Gurdwara Dera Sahib — `Longitude`
- before: `'74'`
- after: `'74.313'`

## Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi) — `Latitude`
- before: `'32.0415'`
- after: `'32.0415'`
- note:  (already satisfied upstream; no-op)

## Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi) — `Longitude`
- before: `'74'`
- after: `'74.2470'`

## Bhai Waliram Darbar — `Events`
- before: `'Not documented'`
- after: `'Not documented'`
- note:  (already satisfied upstream; no-op)

## Dargah of Khwaja Muhammad Zaman (Luari Sharif) — `Description`
- before: `'The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman rece… [truncated; 1588 chars — full value in CSVs/backups]'`
- after: `'The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman rece… [truncated; 1588 chars — full value in CSVs/backups]'`
- note: punctuation only — 'of note: a' matched the validator's case-insensitive internal_artefact regex (NOTE:\s); meaning unchanged

## Amb Temples (Amb Sharif) — `needs_review`
- before: `''`
- after: `'dedication_unsourced'`
- note: row claims dedication to Shiva (Mahadev) but the description never mentions Shiva; no other field edited pending a source

