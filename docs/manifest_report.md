# Shrine → Drive media manifest report

Join key: **Google Drive file ID** only. Filenames were never used to attribute a file to a shrine.

Sources:
- Survey response sheet (authoritative shrine→file mapping), read as a single-line markdown table.
- Google Drive folder listings + per-ID `get_file_metadata`.
- `survey_canonical.tsv` (14 non-void rows; the 9 `Delete` rows were excluded from attribution but were used to explain leftover Drive files).

## Headline numbers

| | photo | video_audio | book | total |
|---|---|---|---|---|
| Files in Drive folder | 142 | 18 | 34 | **194** |
| Matched to a surviving survey | 105 | 14 | 31 | **150** |
| In Drive, not in any surviving survey | 37 | 4 | 3 | **44** |
| Referenced by a surviving survey, absent from Drive | 10 | 2 | 0 | **12** |
| Survey references total (14 rows) | 115 | 16 | 31 | **162** |

Both directions close exactly: 150 + 44 = 194 Drive files; 150 + 12 = 162 survey references. Every one of the 44 unreferenced Drive files is accounted for by a void row (see below) — there are **no orphan files of unknown provenance**.

### Methodological warning: the Drive folder listing is unreliable

`search_files` with `parentId = <folder>`, `pageSize: 50`, following `nextPageToken` to exhaustion, **silently omitted 4 files** from the photos folder. All 4 sat in the upload batch that straddled the page-2/page-3 boundary (`createdTime` 2026-06-29T12:59:35–12:59:48). They were recovered by (a) `get_file_metadata` on the individual IDs and (b) re-querying the folder with a `createdTime` window and `pageSize: 100`.

The affected files are the ones initially mis-flagged as missing for Darbar Modho Laal Hussain:
`1hfHDfwGM40knYkb_3R7l7kRE4wRc9rUX`, `1TuRTbbB-1erQF2M0yA9UBFvCn301N0sE`, `1K327P5LpbIhmVft2GbCx6EVM1W-ZaHNx`, `1Nu3-qQBjNRuJSwlCv8Jaj6HQmvnp13p1` — all four have `parentId` = the photos folder and are genuine `image/jpeg`.

Consequence: the photos folder count is **142**, not the 138 the paginated listing reported. Every `id_not_in_drive` verdict in this report was confirmed by a direct `get_file_metadata` call returning `Requested entity was not found` — not by absence from a listing.

Per-batch cross-check that the corrected listing is complete: each upload batch in the photos folder has a file count exactly equal to one survey row's photo count (10, 9, 10, 10, 10, 9, 10, 10, 9, 7, 10, 10, 9, 7, 10, 1, 1 = 142). Video (20 references, 2 absent → 18) and books (34 references → 34) also close exactly.

## Per shrine: expected vs matched

`expected` is from `survey_canonical.tsv`; `in sheet` is what the sheet's upload cells actually contain.

| shrine | slug | photo exp/sheet/matched | video exp/sheet/matched | book exp/sheet/matched |
|---|---|---|---|---|
| Data Darbar | data-darbar | 1 / 1 / 1 | 0 / 0 / 0 | 10 / 10 / 10 |
| Shrine of Hazrat Mian Mir R.A | mian-mir | 0 / 0 / 0 | 0 / 0 / 0 | 4 / 4 / 4 |
| Darbar Modho Laal Hussain | madho-lal-hussain | 10 / 10 / 10 | 2 / 2 / 2 | 4 / 4 / 4 |
| Darbar Bibi Pak Daman | bibi-pak-daman | 7 / 7 / 7 | 0 / 0 / 0 | 5 / 5 / 5 |
| Darbar Hazrat Gunj Anayat Sarkar | ganj-e-inayat-sarkar | 9 / 9 / 9 | 1 / 1 / 1 | 1 / 1 / 1 |
| Darbar Abul Faiz Qalandari Gilani Soharwardi | abul-faiz-qalander-ali-suharwardi | 10 / 10 / 10 | 2 / 2 / 2 | 4 / 4 / 4 |
| Mazar-e-Iqbal | mazar-e-iqbal | 10 / 10 / 10 | 1 / 1 / 1 | 3 / 3 / 3 |
| Darbar Hazrat Shah Gohar Peer | shah-gohar-peer | 9 / 9 / 9 | 3 / 3 / 3 | 0 / 0 / 0 |
| Darbar Mian Qurban Ali Shah | mian-qurban-ali-shah | 10 / 10 / 10 | 1 / 1 / 1 | 0 / 0 / 0 |
| Darbar Shah Jamaal | shah-jamal | 10 / 10 / 10 | 1 / 1 / 1 | 0 / 0 / 0 |
| Darbar Sufi Aziz ul Deen Peer Makki Sarkar | peer-makki | 10 / 10 / 10 | 1 / 1 / 1 | 0 / 0 / 0 |
| Darbar Abul Muali Qadri | abul-muali-qadri | 9 / 9 / 9 | 1 / 1 / 1 | 0 / 0 / 0 |
| Darbar Malik Ahmad Ayaz | malik-ahmad-ayaz | 10 / 10 / 10 | 1 / 1 / 1 | 0 / 0 / 0 |
| **Darbar Meera Mouj Darya Bhukari** | meera-mouj-darya-bhukari | 10 / 10 / **0** | 2 / 2 / **0** | 0 / 0 / 0 |

The sheet agrees with `survey_canonical.tsv` on all 42 counts. The only shortfall against Drive is Darbar Meera Mouj Darya Bhukari.

### Column mapping used
The sheet has 24 columns. Upload columns were located by counting cell separators from each row start: **col 18 = photo**, **col 19 = video/audio**, **col 21 = book** (col 20 is the "teachings/messages" free-text question). This was cross-validated against Drive folder membership: every ID in col 18 lives in the photos folder, every col-19 ID in the video/audio folder, every col-21 ID in the books folder. Zero disagreements.

### Derived slugs (please check)
Eight slugs were supplied and used verbatim. The remaining six were derived following the convention visible in the supplied eight — lowercase, hyphenated, with the generic `Darbar` / `Shrine of` prefix dropped (e.g. supplied: `Darbar Shah Jamaal` → `shah-jamal`; `Darbar Sufi Aziz ul Deen Peer Makki Sarkar` → `peer-makki`):

| shrine name as written | derived slug |
|---|---|
| Shrine of Hazrat Mian Mir R.A | `mian-mir` |
| Darbar Hazrat Shah Gohar Peer | `shah-gohar-peer` |
| Darbar Mian Qurban Ali Shah | `mian-qurban-ali-shah` |
| Darbar Abul Muali Qadri | `abul-muali-qadri` |
| Darbar Malik Ahmad Ayaz | `malik-ahmad-ayaz` |
| Darbar Meera Mouj Darya Bhukari | `meera-mouj-darya-bhukari` |

If the convention should instead be a literal transliteration of the full name (`shrine-of-hazrat-mian-mir-ra`, `darbar-hazrat-shah-gohar-peer`, …), these six need a search-and-replace in `photo_manifest.tsv`.

## IDs in a surviving survey that do not exist in Drive (12)

All 12 belong to **Darbar Meera Mouj Darya Bhukari** (row_n 23, submitted 29/07/2026 17:58:08) — the entire submission's media is gone. Each ID was individually probed with `get_file_metadata` and returned `Requested entity was not found`.

Photo column (10):
```
1JGKdTJ94wIzJjS4MHlx0NGwSByqtzk8D
1LjLR3AtlHw3lfSynFRbnuLxjE_sZhur9
16wGSbAgcqXnSf0040OK-MMfh-vCqTPYU
1HtlrmHGTurGQOez8yv0vGtJuAPsbKmOq
1MstCKkO68Eu1m5zT1-TYYZRScHgx1P7z
1uEqHoFua3zTZ3fVaSRkeHyqnfMz4ItTB
1WUw90h_G-v5sF6DryDSNmWL96K9puNh5
1RYF2nc3DC3mLrlqc5PNnv36S9QspJTh_
1EBg894JyqiduPZggFmBKf50vIrss0iSz
1dZEi7-OFr4nztUIwTk8RiFSsIMkUqr4v
```
Video/audio column (2):
```
1cKTtnkfDjHz0jkgumIhaXcg7eh3_zHGK
1H1ozu7KNPcmTRyp-HP5xq4JhrkZeaYVl
```

Note the pattern: the immediately preceding submission (Darbar Malik Ahmad Ayaz, 29/07/2026 17:49:31) landed in Drive at `createdTime` 2026-07-29T21:49:05–21:49:28, i.e. sheet time + 4h. Meera Mouj's uploads would sit at ~21:58; there is nothing in any of the three folders at that time. The files were created (the form recorded IDs) and subsequently removed. **These 12 are unrecoverable without restoring them from the Drive trash / the surveyor's device.**

## Drive files not referenced by any surviving survey (44)

Every one traces to one of the 9 `Delete`-marked (void) survey rows — these are the superseded first attempts. **None is an orphan.**

| void row timestamp | superseded by | photos | video | books |
|---|---|---|---|---|
| 22/06/2026 17:34:57 | Mazar-e-Iqbal | 10 | 1 | 0 |
| 18/06/2026 16:27:52 **and** 20/06/2026 04:45:10 (same file IDs in both) | Darbar Hazrat Gunj Anayat Sarkar | 9 | 1 | 0 |
| 17/06/2026 16:17:08 **and** 20/06/2026 04:39:24 (same file IDs) | Darbar Bibi Pak Daman | 7 | 0 | 1 |
| 15/06/2026 17:22:24 **and** 20/06/2026 04:32:09 (same file IDs) | Darbar Modho Laal Hussain | 10 | 2 | 2 |
| 18/03/2026 05:56:53 | Shrine of Hazrat Mian Mir R.A | 1 | 0 | 0 |
| **total** | | **37** | **4** | **3** |

Three of the void rows (the 20/06 batch) re-cite the *identical* Drive IDs as their 15/06–18/06 predecessors rather than re-uploading, which is why 9 void rows yield only 5 distinct file sets.

One void row is **not** in this list: 16/03/2026 15:13:08 (superseded by Data Darbar). Its single photo `1YVZY_JvrWaXcq0BBIOr-KcIHWbt4vohQ` is re-cited verbatim by the surviving Data Darbar row, so it is `matched`, not orphaned.

Full ID list is in `photo_manifest.tsv` rows with `join_status = in_drive_not_in_survey`.

## MIME type does not match upload question

**One mismatch across all 194 files.**

| drive_id | filename | mime_type | bytes | sits in | cited as | shrine |
|---|---|---|---|---|---|---|
| `1muLtMfn_NggoRa7hNEf1vBKSmtzG1JYh` | `backup_2026-07-23-0630_Versatile_Consultants_d64e2157d691-db - saifullah imtiaz.gz` | `application/x-gzip` | 26,955,762 (25.7 MB) | photos folder | photo seq 7 | Darbar Malik Ahmad Ayaz |

This is a gzipped database backup ("Versatile_Consultants...-db"), almost certainly dragged in by mistake while selecting screenshots. **It must not be treated as an image**: any thumbnailing/EXIF/decode pass will fail on it, and it must be excluded from Darbar Malik Ahmad Ayaz's photo set. Note it is also the only non-image content in the whole corpus, and it is unrelated to shrine documentation — it may contain third-party business data and should be reviewed before being copied anywhere.

Effective photo count for Darbar Malik Ahmad Ayaz is therefore **9 usable images, not 10**.

Clean elsewhere:
- photos folder: remaining 141 files are all `image/jpeg` or `image/png`.
- video/audio folder: all 18 are `video/mp4`. No audio files were submitted anywhere in the corpus, despite the question inviting them.
- books folder: all 34 are `application/pdf`.

Cosmetic, not a mismatch: 61 photos and 12 videos have an empty `fileExtension` and a title with no extension (e.g. `IMG_2026_143618_463  - saifullah imtiaz`). MIME type is correct in all these cases, but any download tooling must set the extension from `mimeType`, not from the filename.

## The two reported misfilings — verified

### Data Darbar: "1 file in photos and 10 in books" — CONFIRMED, but the misfiling hypothesis is WRONG

The counts are right: photo column holds 1 ID, book column holds 10. But the 10 book-column files are **not** misfiled photos. All 10 are genuine `application/pdf` in the books folder, and all 10 are titled as Data Ganj Bakhsh / Hujwiri literature:

`Exegetical-Notes-of-Holy-Quran-by-Shaykh-Hujwiri1`, `Fatih-e-Quloob Syeduna Data Ganj Bakhsh Ali Hajveri`, `Hadrat-Data-Ganj-Bakhsh-ur`, `Hazrat Data Ali Hajvairy No by Anwar e Raza`, `Kashf-ul-Mahjoob`, `maslik_data_ganj_baksh`, `Seerat Hazrat Ali Hajveri`, `Seerat Hazrat Data Ganj Bakhsh Rehmatullah Alaih`, `00529_Tazkirah-Awliya-e-Pakistan_1`, `00530_Tazkirah-Awliya-e-Pakistan_2`.

**Correction: Data Darbar is not misfiled. It is a genuinely book-rich, photo-poor record — an unusually thorough bibliography (1.4 GB of PDFs) paired with a single WhatsApp photo.** The one photo (`WhatsApp Image 2026-03-16 at 7.50.19 PM`, 133 KB, `image/jpeg`) is carried over from the superseded 16/03/2026 submission; no new photography was ever done for this shrine. That is the real gap to chase, not a filing error.

### Mian Mir: "0 in photos and 4 in books" — CONFIRMED

Photo and video columns are genuinely empty. All 4 book-column IDs are real PDFs in the books folder: `04_v38_2_2025`, `Hazrat Mian Mir And The Sufi Tradition`, `Sakinat al-Auliya - main meer`, `2.-Sufis-and-the-Pre-colonial-Muslim-rulers-of-India-2-1-1`. Two of the four are shrine-specific by title, so these are correctly-filed books.

Note: the superseded 18/03/2026 row for this shrine did have 1 photo (`1bTTe_BbGAkKplStWWeSvFBOC8pKeWUqD`, `front view - Muhammad Rizwan.png`, 2.5 MB). It still exists in Drive and is currently listed as `in_drive_not_in_survey`. Unlike Data Darbar, the surviving Mian Mir row did **not** carry it forward — so the shrine has zero photos in the authoritative mapping while a perfectly good "front view" photo sits unreferenced in the folder. **Recommend a human decide whether to re-attach it.**

## Duplicate filenames

### Exact duplicate titles spanning two different shrines — 1 case, and it matters

`dfdfdfdfd - Saifullah Imtiaz.jpg` exists **three times**, across **two different surviving shrines**:

| drive_id | bytes | created_time | shrine | seq |
|---|---|---|---|---|
| `1yKDyOl6KqSRwMg85F05YfQJVjlOoDay8` | 143,251 | 2026-07-14T21:57:44.640Z | Darbar Hazrat Shah Gohar Peer | photo 3 |
| `1Q2s6WfnMzqyh5poIeP7uDpZyJJODKTIo` | 253,397 | 2026-07-14T21:57:48.441Z | Darbar Hazrat Shah Gohar Peer | photo 5 |
| `12bK8K-aY1sNUUuIp04xfJ0AOizLBv3j-` | 3,937,671 | 2026-07-14T22:23:12.746Z | **Darbar Mian Qurban Ali Shah** | photo 2 |

Three distinct images, three distinct sizes, one filename, two shrines. This is the case that makes filename-based attribution unsafe.

### Exact duplicate titles within the same shrine (surviving row vs its own void predecessor) — 15 cases

Photos (11 pairs, all Mazar-e-Iqbal surviving vs the 22/06 void row — the surveyor re-uploaded the same screenshots):
`20260621-023909 - - saifullah imtiaz`, `20260621-023219 -  - saifullah imtiaz`, `20260621-021422  - saifullah imtiaz`, `20260621-023824 - - saifullah imtiaz`, `20260621-023109  - saifullah imtiaz`, `20260621-023142  - saifullah imtiaz`, `20260621-023042  - saifullah imtiaz`, `20260621-022838 - saifullah imtiaz`, `20260621-023444  - saifullah imtiaz`, `20260621-023848  - saifullah imtiaz` (10 pairs) — plus the byte-identical sizes confirm they are the same images.

Videos (4 pairs): `VID_20260617_181055 - Muhammad Haris Amjad - saifullah imtiaz.mp4` (Gunj Anayat vs void), `VID_20260614_163516 - …` and `VID_20260614_163649 - …` (Modho Laal vs void), `VID-20260621-WA0011  - saifullah imtiaz` (Mazar-e-Iqbal vs void).

Books: no exact duplicate titles.

### Case-only collision spanning two shrines — 1 case

`1 - Saifullah Imtiaz.jpg` (`1H0NOJi-SD0AtnAFsBn4SgEw9S0QntE8U`, 5,235,792 B, Darbar Shah Jamaal photo 1) vs `1 - saifullah imtiaz.jpg` (`1g2PYcnAhe4PHyt4EiWc00fclmdRUQmz5`, 4,238,746 B, void 15/06 Modho Laal predecessor). Different files, differ only by letter case. On a case-insensitive filesystem (macOS default, Windows) these collide. The second is a void-row file, so this does not corrupt any *surviving* attribution today — but it will bite anyone who dumps all three folders into one directory.

### Same-content-different-name across two shrines

Two videos are byte-size identical at 690,926,632 B but differently named and attributed to different shrines: `2026 - saifullah imtiaz` (`1MasVOPQng1TI_Ns6MPLCnPyMBPCvPO3i`, Darbar Malik Ahmad Ayaz) and `VID_202660452  - saifullah imtiaz` (`1SGeAx6iybjwHT6QBeEQqT7I6hGtYG7hS`, Darbar Abul Muali Qadri). Identical size strongly suggests identical content, i.e. the same 690 MB video was submitted for two different shrines a week apart. **Do not run content-hash deduplication** — it would collapse these two and destroy one of the two shrine attributions. Flagging for human review: one of the two attributions is probably a surveyor error.

Similar name-differs/size-matches pairs exist within shrines (Modho Laal, Gunj Anayat, Bibi Pak Daman, Abul Faiz surviving rows vs their void predecessors), which is expected re-uploading.

## DOWNLOAD STRATEGY

**Download by Drive file ID. Filename+timestamp is not sufficient and must not be used.**

Reasoning, in order of severity:

1. **Filename alone is fatally ambiguous across shrines.** `dfdfdfdfd - Saifullah Imtiaz.jpg` names three different images belonging to two different shrines (Shah Gohar Peer ×2, Mian Qurban Ali Shah ×1). A filename-keyed download or a bulk "Download folder" from the Drive web UI produces `dfdfdfdfd - Saifullah Imtiaz.jpg`, `…(1).jpg`, `…(2).jpg` in **collision order that Drive does not guarantee**, so there is no reliable way to map the three downloaded files back to the right shrine. 15 further titles collide within-shrine, and one collides across shrines case-insensitively.

2. **Filename+timestamp is technically unique but practically unusable.** No two files in the corpus share both title and `createdTime` (millisecond precision), so the pair *is* a unique key on paper. But: you only learn `createdTime` from the Drive API — at which point you already hold the `id`, so the composite key buys nothing and adds two failure modes. Downloaded files do not carry `createdTime` (local mtime is set at download), and 61 photos + 12 videos have no filename extension, so the on-disk artifact retains neither half of the key reliably. Any degradation of timestamp granularity (second-level, or a re-exported filename list) starts merging the 07-14 21:57 batch, whose files are 2–3 seconds apart.

3. **The folder listing cannot be trusted as an enumeration.** `parentId` + `nextPageToken` pagination silently dropped 4 of 142 photos at a page boundary. Any strategy that starts by listing a folder and matching names risks both missing files and, worse, quietly attributing a shrine's photo to "missing". Driving the download from the survey sheet's ID list and fetching each `id` explicitly makes the process complete by construction and turns every failure into a loud 404 rather than a silent gap.

Recommended procedure:
1. Iterate `photo_manifest.tsv` rows where `join_status = matched` (150 rows).
2. Fetch each by `drive_id`; write to `<slug>/<upload_question>/<seq>_<drive_id>.<ext>` with `ext` derived from `mime_type`, **not** from `drive_filename`. Keep `drive_filename` in a sidecar manifest for provenance only.
3. Skip `1muLtMfn_NggoRa7hNEf1vBKSmtzG1JYh` from the image pipeline (gzip DB backup) — quarantine it for review.
4. Treat the 12 `id_not_in_drive` rows as data loss to escalate, not as retry candidates — all 12 were confirmed 404 by direct metadata lookup.
5. Do not deduplicate by content hash (see the 690 MB video pair above).
