# Protected-monument lists of Pakistan: `heritage_monuments.csv`

Built 30 October 2026 by `fetch_heritage_lists.py` (stdlib Python; `pdftotext` once for the 1997
PDF). Every row comes from a list that was downloaded and parsed; nothing is reconstructed from
general knowledge. Raw downloads are in `pipeline/gis/sources/shrine_dbs/heritage/` (gitignored),
each recorded with URL, size, SHA-256 and time in `heritage/fetch_manifest.csv`.

```
python -I fetch_heritage_lists.py fetch     # resumable; --refresh re-downloads everything
python -I fetch_heritage_lists.py parse     # writes heritage_monuments.csv; exits 1 on any parse error
```

**The table holds several overlapping lists, not one deduplicated register.** The same monument
(Jahangir's tomb, say) appears once in the 1997 federal list, once in the Wikipedia list, once
in DOAM's protected list and once in DOAM's inventory. Count within one `list` value, never across
the whole file. Cross-list linking is not done (see Gaps).

## Sources and how they relate

Which list to count for what (all figures measured 30 Oct 2026):

| Purpose                                             | Use `list =`                                                                                                                                     | Why                                                  |
| --------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| Federally protected, current                        | `doam_protected` (382)                                                                                                                           | the department's own list; districts partly borrowed |
| Federally protected, with districts as compiled     | `epa1997_federal` (386)                                                                                                                          | 1996 gazette-derived list, district headings         |
| Punjab provincial (Special Premises)                | `epa1997_punjab_special_premises` (246, as of 1996) or `punjab_doa_gallery_2021` rows whose note says "Special Premises, 1985" (258, as of 2021) |                                                      |
| Sindh provincial (Protected Heritage)               | `epa1997_sindh_protected_heritage` (210, the 1995 notification; overwhelmingly Karachi buildings)                                                | later Sindh notifications not parsed (Gaps)          |
| District counts of heritage sites incl. unprotected | `doam_inventory` (6,200; 5,345 district-coded; coordinates on most)                                                                              |                                                      |

Three independent instruments agree on the federal count: DOAM's protected tab lists **382**;
DOAM's inventory has **382** records whose legal status reads "Protected by The Antiquity Act
1975 (As amended in 1992)"; the Punjab gallery's item pages give **135** "Antiquities Act, 1975"
items against DOAM's **135** for Punjab. The 1997 list printed 386 items (its own table says 389).

9030 rows in all. Columns: kind counts; last two = rows, rows with district_code.

**epa1997_federal** — 386 rows, 165 with district_code

| province           | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Balochistan        |           3 |      0 |        0 |       0 |         2 |      0 |      0 |          0 |       22 |   27 |    16 |
| Gilgit Baltistan   |           0 |      0 |        0 |       0 |         0 |      0 |      0 |          0 |        1 |    1 |     0 |
| Khyber Pakhtunkhwa |           4 |      2 |        0 |       0 |         1 |      0 |      0 |         15 |       63 |   85 |    11 |
| Punjab             |          49 |      6 |        0 |       4 |         0 |     12 |      0 |          7 |       69 |  147 |   113 |
| Sindh              |          49 |      5 |        0 |       0 |         6 |     13 |      0 |          5 |       48 |  126 |    25 |

**epa1997_punjab_special_premises** — 246 rows, 172 with district_code

| province | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| -------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Punjab   |         131 |      5 |        1 |       0 |         0 |     40 |      0 |          0 |       69 |  246 |   172 |

**epa1997_sindh_protected_heritage** — 210 rows, 6 with district_code

| province | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| -------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Sindh    |           4 |      2 |        0 |       0 |         0 |      4 |     10 |          4 |      186 |  210 |     6 |

**doam_protected** — 382 rows, 300 with district_code

| province           | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Balochistan        |           4 |      0 |        0 |       0 |         1 |      0 |      0 |          0 |       24 |   29 |    24 |
| Gilgit Baltistan   |           0 |      0 |        0 |       0 |         0 |      0 |      0 |          1 |        0 |    1 |     1 |
| Islamabad          |           1 |      0 |        0 |       0 |         0 |      1 |      0 |          1 |        3 |    6 |     6 |
| Khyber Pakhtunkhwa |           3 |      2 |        0 |       0 |         1 |      0 |      0 |          5 |       41 |   52 |    49 |
| Punjab             |          46 |      7 |        0 |       4 |         0 |     13 |      0 |          6 |       59 |  135 |   130 |
| Sindh              |          77 |      6 |        0 |       0 |         5 |     16 |      0 |          3 |       52 |  159 |    90 |

**punjab_doa_gallery_2021** — 456 rows, 157 with district_code

| province | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| -------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Punjab   |         196 |     14 |        1 |       7 |         0 |     65 |      0 |          6 |      167 |  456 |   157 |

**wlm_federal** — 306 rows, 226 with district_code

| province    | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ----------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Balochistan |           3 |      0 |        0 |       0 |         2 |      0 |      0 |          0 |       23 |   28 |    17 |
| Punjab      |          47 |      7 |        0 |       5 |         0 |     13 |      0 |         11 |       76 |  159 |   149 |
| Sindh       |          43 |      6 |        0 |       0 |         4 |     13 |      0 |          4 |       49 |  119 |    60 |

**wlm_punjab_special_premises** — 215 rows, 205 with district_code

| province | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| -------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Punjab   |         121 |      5 |        1 |       2 |         0 |     33 |      0 |          0 |       53 |  215 |   205 |

**wlm_sindh_protected_heritage** — 241 rows, 81 with district_code

| province | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| -------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Sindh    |           3 |      2 |        0 |       0 |         1 |      2 |      8 |          3 |      222 |  241 |    81 |

**wlm_kp** — 90 rows, 43 with district_code

| province           | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Khyber Pakhtunkhwa |           4 |      2 |        0 |       0 |         1 |      2 |      0 |         15 |       66 |   90 |    43 |

**wlm_kp_ex_fata** — 8 rows, 8 with district_code

| province           | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Khyber Pakhtunkhwa |           0 |      0 |        0 |       0 |         0 |      2 |      0 |          1 |        5 |    8 |     8 |

**wlm_islamabad** — 51 rows, 51 with district_code

| province  | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| --------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Islamabad |           4 |      0 |        0 |       0 |         0 |      2 |      0 |          3 |       42 |   51 |    51 |

**wlm_azad_kashmir** — 31 rows, 28 with district_code

| province     | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Azad Kashmir |           7 |      0 |        2 |       0 |         0 |      1 |      0 |          0 |       21 |   31 |    28 |

**wlm_gilgit_baltistan** — 25 rows, 13 with district_code

| province         | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ---------------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Gilgit Baltistan |           0 |      0 |        0 |       0 |         0 |      4 |      0 |          5 |       16 |   25 |    13 |

**wlm_unprotected** — 183 rows, 139 with district_code

| province    | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ----------- | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Balochistan |          21 |      1 |        0 |       0 |         2 |      3 |      0 |          0 |       34 |   61 |    55 |
| Punjab      |           6 |      2 |        3 |       0 |         1 |     13 |     11 |          0 |       50 |   86 |    69 |
| Sindh       |           8 |      6 |        0 |       0 |         1 |      7 |      1 |          1 |       12 |   36 |    15 |

**doam_inventory** — 6200 rows, 5345 with district_code

| province           | tomb_shrine | temple | gurdwara | samadhi | graveyard | mosque | church | other_rel. | not_rel. | rows | coded |
| ------------------ | ----------: | -----: | -------: | ------: | --------: | -----: | -----: | ---------: | -------: | ---: | ----: |
| Azad Kashmir       |           1 |     16 |        2 |       0 |         2 |      4 |      0 |          0 |       66 |   91 |    91 |
| Balochistan        |          24 |      3 |        0 |       0 |        20 |      2 |      0 |          2 |      423 |  474 |   417 |
| Gilgit Baltistan   |          53 |      0 |        2 |       0 |        14 |     83 |      0 |          8 |      213 |  373 |   350 |
| Islamabad          |           6 |      3 |        0 |       0 |         1 |      5 |      0 |          2 |       29 |   46 |    46 |
| Khyber Pakhtunkhwa |          54 |     23 |        7 |       0 |        47 |     38 |      9 |        235 |     1143 | 1556 |  1332 |
| Punjab             |         239 |     89 |       23 |      46 |        15 |     82 |      1 |         29 |     1661 | 2185 |  2172 |
| Sindh              |         410 |     32 |        0 |       1 |        41 |    129 |      4 |         34 |      824 | 1475 |   937 |

DOAM inventory records whose legal status is anything other than "Not Protected": 676 — tomb_shrine 262, temple 26, gurdwara 1, samadhi 6, graveyard 8, mosque 73, church 0, other_religious 49, not_religious 251.

Notes on the counts: `punjab_doa_gallery_2021` has 456 rows because 61 gallery tiles link to
slug pages (museums, and "key monument" tiles such as "Jahangir's Tomb, Asif Khan and Akbari
Sarai, Lahore") that duplicate node items — they are kept, with the note "item page not
fetched"; the 395 node items split 135 Antiquities Act / 258 Special Premises / 2 unstated.
`epa1997_sindh_protected_heritage` and `wlm_sindh_protected_heritage` are mostly Karachi
commercial buildings, which is why so few rows are religious and so few are district-coded
(Karachi has since been divided). `other_religious` in KP is mostly Buddhist stupas and
monasteries.

### A. Pakistan EPA, _Guidelines for Sensitive and Critical Areas_ (October 1997), Appendix II

`list = epa1997_federal | epa1997_punjab_special_premises | epa1997_sindh_protected_heritage`

- URL: <https://web.archive.org/web/20131014185608id_/http://www.environment.gov.pk/eia_pdf/f_Crit_%20Areas.pdf>
  (the environment.gov.pk original is dead; Wayback copy of 14 Oct 2013. The non-`id_` Wayback
  URL returns an HTML wrapper, not the PDF — the script checks for `%PDF`.)
- §5.3 of the PDF says the appendix "is a 1996 Publication by the Pakistan Heritage Society
  Peshawar-Lahore and has been prepared by Mr. M. Rafique Mughal" — i.e. the federal list under
  the Antiquities Act 1975 as compiled in 1996 by a former DG of the federal Department of
  Archaeology. This is the closest thing to the gazette list that is openly available. It is
  _not_ the gazette: no notification numbers or dates per item.
- Sections: I Sindh federal; II Sindh "Protected Heritage" (Sindh Cultural Heritage
  (Preservation) Act 1994, notification of 7 Sept 1995); III Punjab federal; IV Punjab "Special
  Premises" (Punjab Special Premises (Preservation) Ordinance 1985); V Balochistan federal;
  VI NWFP and Northern Areas federal. `official_id` = the serial printed in that section.
- District = the printed "X District" heading, as written (typos kept: _Rawalpini_, _Sheikupura_,
  _Rajanjpur_...). Every federal item also ends ", <District>."; where that tail disagrees with
  the heading the note says so and the code is resolved from the tail. Two such places are
  defects in the source/PDF: there is **no "Swat District" heading**, so Swat's 20 items
  (VI 67–86) print under Peshawar; and Balochistan item V-1 (Pirak, "…, Kachhi.") prints under a
  "Karachi District" heading.
- The source's own serials skip numbers: II has no 151, IV has no 232, VI has no 30. Its own
  summary tables disagree with its lists (Table 5: Punjab federal 149, list ends at 147; NWFP+NA
  87, list has 86 items). Counts here are of items actually printed.
- Special Premises items (§IV) rarely carry a place beyond the district heading; Lodhran items
  sit under Multan, Chiniot items under Jhang (resolved from the item text where it names them).

### B. Wikipedia "List of cultural heritage sites in …" (Wiki Loves Monuments lists)

`list = wlm_federal | wlm_punjab_special_premises | wlm_sindh_protected_heritage | wlm_kp |
wlm_kp_ex_fata | wlm_islamabad | wlm_azad_kashmir | wlm_gilgit_baltistan | wlm_unprotected`

Pages and revisions parsed (source_url is the `oldid` permalink):

| Page                  | revid      | revision time |
| --------------------- | ---------- | ------------- |
| Punjab, Pakistan      | 1349613596 | 2026-04-18    |
| Lahore                | 1371322596 | 2026-08-25    |
| Sindh                 | 1351645605 | 2026-04-29    |
| Karachi               | 1371858524 | 2026-08-28    |
| Khyber Pakhtunkhwa    | 1333343756 | 2026-01-17    |
| Balochistan, Pakistan | 1375256691 | 2026-09-16    |
| Islamabad             | 1351790935 | 2026-04-30    |
| Azad Kashmir          | 1193661872 | 2024-01-04    |
| Gilgit-Baltistan      | 1259509763 | 2024-11-25    |

("List of cultural heritage sites in Pakistan" is a redirect to an article, not a list.) The Punjab
and Sindh pages hand Lahore and Karachi off to the city pages with `{{For}}`; ids are therefore
parsed from all nine pages. Every `{{PKmonument row}}` is checked against the count of templates
and of `number=` parameters on its page.

**Relation to the gazette lists.** The pages cite the same 1997 EPA PDF. Their ids are Wikipedia's
own (`PB-`, `PB-P-` special premises, `SD-P-` protected heritage, `-U-` unprotected), **not**
gazette serials: measured on 30 Oct 2026, only 23 of 152 `PB-n` share a name word with EPA
Punjab serial _n_, but 141 of 152 share one with _some_ EPA Punjab item. So the WLM federal and
provincial sections are re-transcriptions of the 1996 lists, renumbered, with districts sometimes
updated by editors ("Dadu (now Jamshoro)") and coordinates added for some rows. Ids are **reused
across pages** (PB-40 is the Shrine of Khalid Walid on the Punjab page and Akbari Sarai on the
Lahore page; also PB-U-64…67, SD-89, SD-P-48): both rows are kept and the note says so.
`wlm_kp` mixes protected and unprotected ("Protected/Unprotected sites"); `wlm_islamabad`,
`wlm_azad_kashmir`, `wlm_gilgit_baltistan` are self-described "incomplete" lists that are not
gazette transcriptions; `wlm_unprotected` is explicitly not protected. `wikidata` is filled only
when the whole description is one wikilink (a link inside "Tomb of [[X]]" is the person).

### C. Department of Archaeology & Museums, Government of Pakistan (doam.gov.pk)

`list = doam_protected | doam_inventory`

- <https://doam.gov.pk/public/heritage-sites>, tab **"Protected Monument & Sites"**: the current
  federal list as the department publishes it, by province, **name only — no district, no
  serial**. `official_id` is the website record (`heritage-sites/<n>`), not a gazette number.
  Item pages carry a description only. District is filled only when exactly one DOAM inventory
  record of the same name and province exists (preferring one whose legal status says
  protected); otherwise empty with a note.
- Same page, tab **"All Heritage Sites"**: DOAM's national inventory, linking to
  `https://doam.gov.pk/public/sites/<id>`. Each record has Type, Province, **District**, Period,
  Latitude/Longitude, Ownership and **Legal Status** (e.g. _Not Protected_, _Protected by The
  Antiquity Act 1975 (As amended in 1992)_, _Protected by Azad Jammu & Kashmir … Act, 1986_).
  Type, legal status, period and ownership are in `note`. This is not a protected list; it is
  the largest district-coded list of heritage sites found, and its protected subset can be
  selected from `note`.
- doam.gov.pk publishes an IPv6 address that does not answer; urllib waited ~21 s per request
  before falling back (22.2 s vs 1.1 s measured). The script resolves IPv4 only.

### D. Punjab Directorate General of Archaeology (archaeology.punjab.gov.pk)

`list = punjab_doa_gallery_2021`

The live site shows "Website Under Maintenance" (30 Oct 2026). Its menu links a "List of Protected
Monuments" (`/list-of-monuments-museums`) that the Wayback Machine never captured;
`/religious_monuments` is captured but empty. What is archived is the gallery "Protection of
Monuments/Museums" (`/gallery_protect_monument_museum?page=0…37`, captured 8–22 June 2021): name
and node id per item, and each item's page (where archived) states "Protected Under: Antiquities
Act, 1975" or the Special Premises Ordinance. No district: one is borrowed only from a single
exact-name match among the EPA/Wikipedia Punjab rows, and the note says so.

## Columns

`kind` is from the name as written (first religious keyword that is not a locator — "Mosque near
the tomb of…" is a mosque; "Gate on North-East of Wazir Khan's Mosque" is `not_religious` with
`kind_basis = locator-only:Mosque`), falling back to the source's type field (`type:Monument - Tomb`).
`kind_basis` is the matched word; other kinds the name also matches are in `note` ("also matches").
Buddhist stupas/monasteries, imambargahs, idgahs, dharamshalas and Parsi Dar-e-Meher are
`other_religious`. Graveyards and necropolises (Makli graveyard, Chaukhandi, Sonda) are
`graveyard`; separately listed tombs on Makli Hill are `tomb_shrine` with a note "within the
Makli necropolis". `name_ur` is empty throughout: no source carries Urdu names.

`district_code` (pk_dictionary.csv) is given when:

1. the written district maps to exactly one present-day district (spelling aliases in the
   script, e.g. _Nawabshah_ → Shaheed Benazir Abad, _Khyber Agency_ → Khyber); or
2. the written district has been divided since the notification (table `SPLITS` in the script:
   Karachi → six districts, Hyderabad → four, Dadu → Jamshoro, Multan → Lodhran, Abbottabad →
   Haripur, Peshawar → Charsadda/Nowshera …) **and** the item's own text names a tehsil of
   exactly one successor (e.g. "Sehwan" → Jamshoro, "Landhi" → Korangi Karachi); or
3. it was divided but every other successor appears in the same source as a district of its
   own ("code by elimination": the EPA lists name Kasur as a district, so their "Lahore" items
   are Lahore).

Otherwise it is empty and `note` says why. The `SPLITS` table is administrative history used only
to _withhold_ a code; it is the one piece of the script written from general knowledge and should
be checked if counts near a boundary matter.

## Gaps and completeness judgment

**Dead ends (tried 30 Oct 2026):**

- Wikidata: `P2186` (Wiki Loves Monuments ID) is on **one** Pakistani item (Q101027517, `PB-11`).
  The WLM ids were never loaded into Wikidata; not usable.
- archaeology.punjab.gov.pk: live site "Website Under Maintenance". `/list-of-monuments-museums`
  never archived; `/religious_monuments` archived but empty. Only the gallery (source D) survives.
- KP: kparchaeology.gov.pk does not resolve; archaeology.kp.gov.pk is a JavaScript portal shell
  with no list; DOAM links `kparchaeology.gkp.pk` (not fetched). No KP Antiquities Act 2016
  schedule found; DOAM's inventory has 25 records "Protected by The Khyber Pakhtunkhwa Antiquities
  Act, 2016".
- Sindh: antiquities.sindhculture.gov.pk shows a few dozen showcase sites by type, not the list.
  Its /publication/notification/ page embeds the gazettes as Google Drive PDFs ("Gazzette
  Notification Of Heritage Buildings (2021)", "Notification of Buildings Listed in 2023", and
  per-quarter Karachi notifications). Two were downloaded to `heritage/sindh_gazettes/`: **scanned
  images with no text layer** (the 2021 gazette is 112 pages). Not parsed — needs OCR. They are
  Karachi-heavy building listings.
- Balochistan: no provincial list found; the Wikipedia page only has the 1997 federal list plus an
  unprotected list. heritage.gov.pk, culture.sindh.gov.pk and nhd.gov.pk did not resolve.
- The 1997 EPA PDF's Wayback URL without `id_` returns an HTML wrapper (first download was 9 KB
  of HTML); fixed.

**Gaps:**

1. **No row is linked across lists.** The same tomb is in four lists under four spellings.
   Matching them is the next step and should use coordinates (WLM, DOAM inventory) plus names.
2. **Districts withheld for divided districts.** 2,091 of 9,030 rows have no `district_code`;
   the largest blocks are Karachi (≈730 rows across lists), Mansehra, Hyderabad, Thatta,
   Peshawar, Multan. Most DOAM inventory and many WLM rows carry coordinates, so a point-in-polygon
   join against `pipeline/gis/boundaries/pk_districts.gpkg` would resolve most of them; this script
   deliberately does not, because the column is meant to record what the list says.
3. Sindh's post-1995 notifications (Dawn, 2014: ~1,600 protected sites in Sindh) are not here
   except as far as DOAM's inventory records them (8 records cite the Sindh 1994 Act).
4. Punjab Special Premises: the 2021 gallery has names and law but no district; districts are
   borrowed from same-name 1997/WLM rows only (157 of 456).
5. `kind` is keyword classification of names. Known limits: "Tajjar" (a Talpur enclosure tomb, but
   also the Larkana treasury) is not a keyword; names that are only a person's name with no
   building word fall to `not_religious` unless the source's type field says otherwise; DOAM
   records typed "Monument - Tomb" but named "… Graveyard" or "… Mosque" follow the name.
   19 rows are `not_religious` with `kind_basis = locator-only:…` — review those by hand.
6. The `SPLITS` table (district divisions) is from general administrative knowledge, not from a
   fetched source; it only ever withholds codes.

**Judgment.** For _federally_ protected monuments the picture is complete and reliable: three
independent instruments agree on 382, and the 1996 list gives districts for 386. For _Punjab's_
provincial list the 2021 gallery (258 Special Premises) is authoritative for membership and the
1996 list for districts; the 12-item difference is post-1996 notifications without districts.
For _Sindh's_ provincial list this table holds only the 1995 notification (210) — far short of the
~1,600 reported — so Sindh provincial counts here are a floor, not a count. KP, Balochistan, AJK
and GB have no provincial list here beyond what DOAM's inventory records. For per-district counts
of religious-funerary sites beyond the protected lists, `doam_inventory` (6,200 records, 1,841
of them classed as some religious kind by name or type, 5,345 district-coded) is the largest and best-coded
source found, but it is an inventory, not a register: it is uneven (Sindh and Punjab dense, KP
dominated by archaeological sites) and should not be read as complete.
