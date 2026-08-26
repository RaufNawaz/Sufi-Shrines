# Field-survey responses sync — 26 August 2026

Weekly reconciliation of the "Shrine Information Form (Responses)" sheet, the production
database sheet, and the Drive book-uploads folder. **Point-in-time document** (see the
`docs/README.md` warning for this section); the durable lessons are in `HANDOVER.md` §9 under
"Added 26 August 2026".

## Verdict in one line

No new field-survey responses since 11 August; every surveyed shrine is in production except
that **three entries never received their survey enrichment** (Shah Jamal, Peer Makki, Mauj
Darya Bukhari), and the scheduled task's own output lineage (`shrines_updated*.tsv`) is dead —
so this run wrote a report, not a TSV.

## Why no `shrines_updated_2026-08-26.tsv` was written

The task instructs: use the newest `shrines_updated*.tsv` as baseline, and if it disagrees with
the production sheet on row count, say so and stop. It disagrees on both count and shape,
measured today:

| Surface | Rows | Columns |
| --- | --- | --- |
| `data/shrines_updated_2026-08-09.tsv` (baseline, never imported) | 167 | 25 (legacy) |
| Production sheet (Drive fileId `1Cl50TENr…`) | 171 | 44 (post-16-August schema) |

The production row count is corroborated locally (169 in `src/data/shrines-fallback.json` +
the 2 coordinate-less rows `build-dataset` drops — Darbar Hazrat Shah Gohar Peer, Darbar Mian
Qurban Ali Shah; both visible in today's Drive read). The Drive reader truncates the master
sheet (~297 k characters covered only ~54 of the rows), so it cannot be used for a full count
either — another reason a mechanically merged full-file TSV would be a guess.

A 25-column full-sheet TSV produced today would, if imported, silently drop the 19 columns and
4 rows added since 16 August (RULE 3 territory). **Recommendation: retire the
`shrines_updated` lineage and rewrite the scheduled task against the 44-column snapshot +
`data/patch_*.csv` route.**

## The responses sheet, reconciled

28 submissions total (16 March – 11 August 2026); 11 are marked `Delete` (superseded drafts);
the live set covers 19 shrines, all by surveyor Saifullah Imtiaz. Newest submission:
11 August 2026, 07:11. Nothing has arrived since.

**(a) Shrines with no production row at all: none.**

**(b) Response never merged — production Description carries no "Shrines Project field survey"
citation: three.** All three *were* merged into the 9 August TSV (rows intact there,
citation lines included), which was then bypassed by the 16 August patch-based import:

| Entry | Response date | Orphaned content |
| --- | --- | --- |
| Shrine of Shah Jamal | 14 July | survey detail + citation (photos already live: 10) |
| Shrine of Peer Makki | 23 July | survey detail + citation (photos already live: 10) |
| Shrine of Mauj Darya Bukhari | 29 July | survey detail + citation **+ all 10 replacement photos** |

Recovery route: derive a 44-column `data/patch_field_survey_orphans.csv` from the three rows
of `data/shrines_updated_2026-08-09.tsv`. Not done mechanically here because production's
Descriptions for these entries have since been enriched by other passes (e.g. Shah Jamal is
now *longer* in production than in the TSV), so this is a fold-in, not an overwrite — an
editorial merge a human should review.

**(c) Responses newer than the last processing: none.** The five 11 August responses (Wasif
Ali Wasif; Feroz-ud-Din Gharib Nawaz; Tahir Bandagi; Ghazi Ilm Din Shaheed; Shah Anayat Qadri
Shartari) all reached production via `data/patch_new_field_survey_shrines.csv` and
`data/patch_shah_inayat_merge.csv`.

## Books

Drive folder: 34 PDFs, of which 2 are duplicate uploads (byte-identical sizes: Jamal-e-Rasool;
"Bibi Pakdaman kon hain") → 32 unique. Local `books/`: 30. Matched on byte size, the missing
two are the same two `books/links.txt` has carried since 9 August — **Haqeeqat ul Fuqara**
(21,767,071 B) and **Tarikh-e-Lahore (1884), Kanhaiya Lal** (70,388,397 B). Both links already
recorded with a dated comment, so nothing was appended today; they still need downloading on a
network-capable machine. No uploads to the folder since 29 June.

**Flag:** the 14 July *Darbar Shah Jamaal* response's trailing column claims "Book uploaded",
but its column 21 (book upload) is empty, none of its 11 Drive links match any book-folder
file, and the folder has nothing after 29 June. Ask Saifullah to re-upload.

## Photos

`data/new-photos-manifest.json` already maps every outstanding survey photo batch (since
10 August), including the full `mauj-darya-bukhari` set of 10 — the replacement for the entry
whose 12 original files 404'd. `public/photos/` has no `mauj-darya-bukhari/` directory: the
fetch never ran, because every external host is blocked through the agent proxy (HANDOVER
§9.53). Needs a human run of `tools/fetch_shrine_photos.py`, then `tools/swap_photo_urls.py`.
No manifest changes were needed or made today.

## Decisions needed from a human

1. Fold the three orphaned survey enrichments into production (44-column patch; editorial
   merge, not overwrite).
2. Retire or rewrite the weekly-sync scheduled task (its baseline, schema description, and
   output format are all stale).
3. Run the photo fetch for `mauj-darya-bukhari` from a machine with network access.
4. Download the two missing books; ask Saifullah for the Shah Jamaal book that the form says
   was uploaded but wasn't, ideally alongside the re-shoot requests already drafted in
   `docs/message_to_saifullah_2026-08-16.md`.
