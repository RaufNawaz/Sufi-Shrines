# New rows from *Tarikh-e Lahore*, 10 October 2026

**165 proposed rows**, one per site, built by `pipeline/book_queue/build_tagged_rows.py` from the
takeaways' "Figures and sites not in the archive", read through the tag file
`pipeline/book_queue/figure_tags/tareekh_lahore.tsv` (this book's list is free-form, Urdu-headed and
has no `[PK]` lines, so `build_new_rows.py` cannot read it). Ruled by Rauf on 10 October 2026
(HANDOVER §9.286 and §9.313): one row per grave or shrine, and also Hindu temples and samadhs, Sikh,
Udasi and Jain sites, rulers' tombs and graveyards, and mosques. A site the book records as already
demolished still gets a row, with `status` blank. **Do not import this file on its own**: it goes into
the consolidated import, which must **drop every column whose name starts with `_`**.

## What is in each row

`Name` is the tagger's transliteration of the item's bold head; the head as printed is in `_name_ur`.
`category` and `site_type` follow the item's own section heading and words. `silsila` is set only
where the line names the person's own order (2 rows). `figure_died` is the line's own `d. …` clause
**as printed**, Urdu numerals and `[OCR?]` kept. It is set only where the site is one person's
burial (16 rows), never for a mosque's founder or one of a graveyard's many dead. `Location` is
Lahore for all 165. `support_level` is Source-seeded, `info_level` Low, and `flags` is
`NEW_FROM_BOOK_TAREEKH_LAHORE`. **Blank on purpose:** coordinates, `Description`, `status`,
`principal_figure`.

By category: Hindu Temple 65, Muslim Shrine 66 (of them 36 mosques, 4 graveyards, 1 madrasa),
Secular / Memorial 27 (rulers' tombs, and the Lahore Darbar's samadhs, following the archive's own
Samadhi of Maharaja Ranjit Singh), Sikh Gurdwara 5, Nanakpanthi / Udasi Darbar 2.
**Mosques:** the sheet has no mosque category, so they are `Muslim Shrine` with `site_type` Mosque.

## Joined, not new rows (41 lines into 42 entries)

Most of this book's Lahore saints are already among Hadiqat al-Awliya's proposed rows, and some
are archive rows. Where the two books' lines agree on what identifies a burial (the master, the
address, the companions), the line was **appended verbatim to that entry**, under
`## From Kanhaiya Lal, Tarikh-e Lahore`, with the basis in an italic line. The basis of each is
in the tag file's `note`. Backups are in `out/integration/tareekh_lahore/before_tags/`.

## Kept as rows but flagged "may be the same as" (76 rows flagged in all)

Where only a name agrees, the line got its own row and `_review` names the other row (for
example: Shah Zia Qadiri and Hadiqat's Shah Raza, both the pir of Shah Inayat, with different
names and years; the Chishti family graves at Maidan Zarin Khan and Hadiqat's three Chishti Sabri
rows). Nothing was merged.

## Not rows (17)

The two Chiragh Shah lines were first skipped as held; when Rauf lifted the holds (10 Oct, §9.313) line 810 became a row and line 821 joined Hadiqat's new `mazar-chiragh-shah`, both flagged against the archive's Shah Chiragh, as is line 804. Left out: Shaikh Tahir's
enclosure (named only as a wall, possibly the archive's Tahir Bandagi); the Brahmo Samaj and three
churches (no archive category fits; not covered by the ruling); the six secular groups (the notes
themselves say none is a shrine candidate); six bare contents-list lines.
