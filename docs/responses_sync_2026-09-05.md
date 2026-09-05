# Field-survey responses sync — 5 September 2026

Reconciliation of the **Shrine Information Form (Responses)** sheet
(`1zf7byAFp2Uf-LXNh2_wL3zazfZsuaUKn2t7Lr9S2oWw`, single tab `gid=1290048597`), the production
database sheet (`1Cl50TENr7m56kzeiSnV_406TRNgvOYAQCjHXQd3SHOo`), and the Shrine Book Form's
upload folder. **Point-in-time document** (see the `docs/README.md` warning for this section);
the durable lessons belong in `HANDOVER.md` §9.

## Verdict in one line

**No new survey responses since 11 August 2026** — but three entries have been publishing
survey-derived content with no citation and at the wrong provenance level since 16 August, and
that is now a patch: `data/patch_field_survey_orphans_2026-09-05.csv`.

## The responses sheet, read in full

28 submissions, 16 March – 11 August 2026. 11 marked `Delete` (superseded drafts). **19 live
responses covering 19 shrines**, eighteen of them surveyed by Saifullah Imtiaz and one — Mian Mir,
18 March — by **Muhammad Rizwan**. (This paragraph said "every one of them" until the mapping was
written down as a file; the 26 August note said the same, and the Mian Mir entry's own bibliography
has named Rizwan all along. A count is easier to copy than to check.) Newest submission
11 August 2026, 07:11:01. Every figure here is identical to the 26 August run's, which
is the point: nothing has arrived in three weeks.

The sheet has exactly one tab. Both sheets export cleanly over
`https://docs.google.com/spreadsheets/d/<id>/export?format=csv&gid=<gid>` from this environment,
which is a better instrument than the Drive reader — it returns real CSV, so no cell is
markdown-escaped (`\_`) and no long cell is cut short. The production export is byte-identical to
the published CSV the site fetches (856,607 B, 171 rows × 44 columns), so the published feed is
not lagging the master.

Today's export is committed as `data/live_sheet_2026-09-05.csv`.

### Instrument warning: `modifiedTime` on a form-response sheet is not a freshness signal

Drive reports the responses sheet as last modified **12 August 2026**, which happens to agree
with "nothing since 11 August" — and reports the **Shrine Book Form (Responses)** as last
modified **29 July 2026**, while that sheet holds rows submitted on **13 and 18 August**. A form
submission does not reliably bump the sheet's `modifiedTime`. Read the rows; never infer "no new
responses" from the metadata. (This is the fourth instrument in this project to be caught giving
a confident wrong answer — see the memory note *Measure the instrument first*.)

## The correction to the 26 August verdict

`docs/responses_sync_2026-08-26.md` recorded three responses as "never merged" — Shah Jamal,
Peer Makki, Mauj Darya Bukhari — and proposed recovering them from the 9 August TSV. Reading the
three production Descriptions against the three responses shows that verdict is **half wrong,
and the half matters**:

| | Shah Jamal | Peer Makki | Mauj Darya |
|---|---|---|---|
| Survey content in production | nearly all of it | outline only | nearly all of it |
| Field-survey citation | **absent** | **absent** | **absent** |
| `support_level` | Source-seeded | Source-seeded | Source-seeded |

Shah Jamal's Damdama and the princess who wanted it lowered, Mauj Darya's cook sitting unharmed
in the cauldron, and all three shrines' daily and *ʿurs* visitor counts are in production, fact
for fact, rewritten editorially. So the content mostly arrived; the **attribution** never did.
Only Peer Makki matches the "never merged" description, and there the gap is large — a
9,627-character survey biography against a 3,724-character entry.

Three instruments agree on which rows those are, and the agreement is exact:

- rows whose Description carries a `Shrines Project field survey` bibliography line: **16**
- rows at `support_level = Field-verified`: **16**
- rows at `info_level = Full`: **16**

They are the *same 16 rows*, and they are 16 of the 19 live responses. The three missing are the
three above.

**A fourth instrument was built and thrown away, and is worth recording.** Verbatim n-gram
overlap between each response and its production Description reported ~0 % coverage for *every
one of the nineteen* — including the sixteen known to be merged. It measures whether prose was
copied, and this archive never copies its prose. Had it been trusted, this run would have
reported nineteen unmerged responses instead of three.

## What the patch does

`data/patch_field_survey_orphans_2026-09-05.csv` (three rows) and `data/import_2026-09-05.csv`
(the same change as a full-sheet replace), built and re-buildable with
`pipeline/build_survey_orphan_patch.py` under six write-time invariants. Full account in
`data/patch_field_survey_orphans_2026-09-05.INSTRUCTIONS.md`. In short: the survey citation, the
provenance upgrade to `Field-verified` / `Full`, the survey detail those entries lacked, and —
where survey and entry disagree — both accounts left standing with the disagreement in `qa_note`.

`pipeline/validate_shrines.py` on input versus output differs by exactly three lines, all
removals: the `expansion_ratio` warning on each of the three rows, which fires on a long entry
resting on a single source. No other row changes by a byte.

## Books — the 26 August picture does not hold

The **Shrine Book Form (Responses)** is a second form, and its own upload folder
(`1gaTDwDobg…`) holds **44 PDFs**, three of them byte-identical duplicate re-uploads → 41 unique.
Uploads are dated 29 July, 9 August, 12–13 August and 17–18 August 2026. The 26 August note's
"No uploads to the folder since 29 June" does not describe this folder; that run did not record
which folder id it counted, so the two cannot be reconciled from the documents alone.

Two specific corrections:

1. **The Shah Jamaal book flagged as missing on 26 August exists.** The 14 July survey's trailing
   column claimed "Book uploaded" while its book column was empty, and the flag was to ask
   Saifullah to re-upload. He already had — through the *other* form, on 29 July:
   `Sawaneh Mubarak Hazrat Syed Shah Jamal-ul-Bahr - saifullah imtiaz.pdf`, 2,274,011 B.
   **Do not cite it before a reader opens it.** Its opening pages describe a Syed Shah Jamal
   titled *Ma'shuq-e-Rabbani*, born in Baghdad, of the line of Abdul Qadir Jilani, with a fort of
   Warangal among its sources — which does not obviously describe the Shah Jamal of Ichhra. It may
   be a different saint of the same name. That is a question for a reader of Urdu, not for a
   file-size match.
2. **One of the two books `books/links.txt` has wanted since 9 August is in Drive again.**
   `2015.398396.Tareeq-Lahore - saifullah imtiaz.pdf`, uploaded 12 August, is **70,388,397 B** —
   the exact size recorded for *Tarikh-e-Lahore* (1884), Kanhaiya Lal. Same file, second file id
   (`1LTUSOKbpfNmAUyQbyXAWal2qdwMRMmlO`). It still needs downloading on a network-capable
   machine; nothing about the blocker has changed. *Haqeeqat ul Fuqara* (21,767,071 B) is not in
   this folder under that size.

Local `books/` still holds 30 PDFs. The 13 August batch filed under Malik Ahmad Ayaz is ten
files: seven of Rumi's *Masnavi* (volumes 1–6 plus a separate text of volume 1),
*Tahqiqaat-e-Chishti*, *Khulasat ut-Tawarikh*, and a Nizami translation. The 9 and 18 August
batches are Adil's academic library (Schimmel, Eaton, Ernst & Lawrence, Rizvi, Shackle, Kugle,
Qureshi, Boivin, Khalid). None of that has been triaged against `out/ocr/` here, and the folder
listing is a single instrument — one Drive search, unverified against a second reading.

## Photos — the outstanding fetch does not exist, and never did

**Retracted, same session.** The paragraph that stood here said Mauj Darya Bukhari's ten
photographs were mapped in `data/new-photos-manifest.json` and waiting on a human with a network.
Then the fetch was actually run. All ten fail, and not for the reason five documents assumed:

- `pipeline/photo_manifest.tsv` types all twelve of that shrine's Drive ids `id_not_in_drive`.
- An **authenticated** Drive read (as Rauf, not anonymous `gdown`) answers *Requested entity was
  not found* for four ids sampled across the set — while a control id from the same folder, same
  uploader and the same weeks (`1zaqu6yHeioCmYdh4diT7DPeUORfeclcT`, Peer Makki, 2,165,477 B)
  resolves fine. The instrument distinguishes; the files are gone.
- Listing the form's upload folder for the whole 29–31 July window returns exactly ten files, and
  they are the **Malik Ahmad Ayaz** batch, id for id. Nothing of Mauj Darya's was left behind.

**And the manifest said so all along.** Its first key is `_deprecated`, dated 10 August 2026:
"every mauj-darya-bukhari Drive ID returns not-found — those photos are gone and the shrine needs
re-shooting. **Do not fetch from this file.**" `docs/responses_sync_2026-08-26.md` cited that file
as the source of the outstanding batch without reading its first key, and this document repeated
it. The claim survived two reconciliations because both quoted the same file and neither ran it.

`tools/fetch_shrine_photos.py` now refuses a manifest carrying a `_deprecated` note unless forced,
runs `gdown` as `sys.executable -m gdown` (this repo's `.venv/bin/gdown` has a dead shebang, which
the old code surfaced as an unreadable stderr tail), and no longer creates the target directory
before a download succeeds — ten failures had left an empty `public/photos/mauj-darya-bukhari/`
behind, which is exactly the shape of a shrine whose photos *had* been fetched.

**The remedy is re-shooting, not fetching.** It is the only entry in the archive in that
position, and it is on the standing list in CLAUDE.md.

One more thing the fetch turned up: Malik Ahmad Ayaz's seventh "photograph" in the form is a
26 MB gzipped database backup (`backup_2026-07-23-0630_Versatile_Consultants…gz`) uploaded into
the photo question by mistake. It never reached `public/photos/malik-ahmad-ayaz/`, whose nine
files are all real JPEGs from a different pass — so nothing is broken, but a manifest built
mechanically from that column would publish it.

## Decisions needed from a human

1. Import the patch (either file — see the INSTRUCTIONS).
2. Decide whether Shah Jamal's and Peer Makki's `year_built` should carry the survey's answers —
   1671 and 612 AH — which are the saints' **death** years. Left blank by the patch.
3. Open the Shah Jamaal book and say whether it is the right saint before anything cites it.
4. Decide whether Mauj Darya Bukhari gets **re-shot** — its ten photographs are gone from Drive
   and no fetch will bring them back. Separately, download *Tarikh-e-Lahore* while a network is
   available.
5. The weekly-sync scheduled task is still stale in the way 26 August described — its baseline
   (`shrines_updated*.tsv`) is dead. Nothing here revives it; this run was done by hand.
