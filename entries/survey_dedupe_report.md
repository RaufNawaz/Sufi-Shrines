# Field-survey dedupe report

Source: `mcp-b16a2c87-0f88-4259-bcb1-27d8fe0e0f81-read_file_content-1786344143836.txt`
(single-line JSON wrapper containing a 24-column markdown table: 1 blank spacer row, 1 alignment row, 1 header row, 23 data rows).

**Headline:** 23 rows -> 9 void (`Status = Delete`) -> **14 distinct shrines survive**, 14 surviving rows.

## Method / verification

The file is one 236,813-character line. It was split into <=240-char chunks with
`Grep -o '.{1,240}'` (`head_limit: 0`), which persists to a multi-line file that can then be
grepped and read with offsets. Chunk boundaries cut some Drive IDs in half, so **URL counts were
never taken from a raw URL grep** — every surviving row's media cells were read directly and the
IDs re-joined across chunk boundaries.

Column identity was established two ways and cross-checked:

1. Header row parsed to 24 columns, in order:
   1 Timestamp · 2 place name · 3 surveyor name · 4 surveyor phone · 5 religion · 6 sect/silsila ·
   7 founding year · 8 associated saint · 9 history · 10 life of the figure · 11 stories/legends ·
   12 why spiritually important · 13 regular activities · 14 annual events/urs · 15 visitor numbers ·
   16 current caretakers · 17 any other information · **18 photo upload** · **19 video/audio upload** ·
   20 teachings/messages · **21 book/pamphlet upload** · 22 what a first-time visitor should understand ·
   **23 Status** · **24 Column 1**.
2. Every `|` in the file was enumerated and tallied per chunk, giving an exact cell index for every
   cell of every row. **All 23 data rows have exactly 25 pipes = 24 cells** — no malformed/short rows,
   so the "count back from the end" reading of `Status` (col 23) and `Column 1` (col 24) is safe.

Timestamps are `DD/MM/YYYY HH:MM:SS`. The 23 rows are already in ascending timestamp order in the file.

---

## 1. All 23 rows

| # | Timestamp | Shrine name (exactly as written, incl. trailing spaces) | Surveyor | Phone | Status (col 23) | Column 1 (col 24) |
|---|---|---|---|---|---|---|
| 1 | 16/03/2026 15:13:08 | `Data Darbar ` | Saifullah Imtiaz | 03008842077 | `Delete` | *(empty)* |
| 2 | 18/03/2026 05:56:53 | `Shrine of Hazrat Mian Mir R.A` | Muhammad rizwan | 03009485820 | `Delete` | *(empty)* |
| 3 | 15/06/2026 16:37:56 | `Data Darbar ` | Saifullah Imtiaz | 03008842077 | *(empty)* | *(empty)* |
| 4 | 15/06/2026 16:53:03 | `Shrine of Hazrat Mian Mir R.A` | Muhammad rizwan | 03009485820 | *(empty)* | *(empty)* |
| 5 | 15/06/2026 17:22:24 | `Darbar Modho Laal Hussain ` | Saifullah | 03008842077 | `Delete` | *(empty)* |
| 6 | 17/06/2026 16:17:08 | `Darbar Bibi Pak Daman ` | Saifullah Imtiaz | 03008842077 | `Delete` | *(empty)* |
| 7 | 18/06/2026 16:27:52 | `Darbar Hazrat Gunj Anayat Sarkar ` | Saifullah Imtiaz | 03008842077 | `Delete` | *(empty)* |
| 8 | 20/06/2026 04:32:09 | `Darbar Modho Laal Hussain ` | saifullah | 03008842077 | `Delete  ` | *(empty)* |
| 9 | 20/06/2026 04:39:24 | `Darbar Bibi Pak Daman ` | saifullah | 03008842077 | `Delete  ` | *(empty)* |
| 10 | 20/06/2026 04:45:10 | `Darbar Hazrat Gunj Anayat Sarkar ` | saifullah | 03008842077 | `Delete  ` | *(empty)* |
| 11 | 22/06/2026 17:34:57 | `Mazar-e-Iqbal ` | Saifullah Imtiaz | 03008842077 | `Delete  ` | *(empty)* |
| 12 | 29/06/2026 08:59:57 | `Darbar Modho Laal Hussain ` | saifullah | 03008842077 | *(empty)* | *(empty)* |
| 13 | 29/06/2026 11:37:38 | `Darbar Bibi Pak Daman ` | Saifullah | 03008842077 | *(empty)* | *(empty)* |
| 14 | 29/06/2026 11:45:02 | `Darbar Hazrat Gunj Anayat Sarkar ` | saifullah | 03008842077 | *(empty)* | *(empty)* |
| 15 | 29/06/2026 11:54:05 | `Darbar Abul Faiz Qalandari Gilani Soharwardi ` | saifullah | 03008842077 | *(empty)* | *(empty)* |
| 16 | 29/06/2026 12:02:05 | `Mazar-e-Iqbal ` | saifullah | 03008842077 | *(empty)* | *(empty)* |
| 17 | 14/07/2026 17:58:05 | `Darbar Hazrat Shah Gohar Peer ` | Saifullah | 03008842077 | *(empty)* | `No book available` |
| 18 | 14/07/2026 18:23:32 | `Darbar Mian Qurban Ali Shah ` | Saifullah | 03008842077 | *(empty)* | `No book available` |
| 19 | 14/07/2026 18:32:32 | `Darbar Shah Jamaal ` | saifullah | 03008842077 | *(empty)* | `Book uploaded` |
| 20 | 23/07/2026 07:54:57 | `Darbar Sufi Aziz ul Deen Peer Makki Sarkar` | Saifullah | 03008842077 | *(empty)* | *(empty)* |
| 21 | 23/07/2026 08:44:33 | `Darbar Abul Muali Qadri ` | Saifullah | 3008842077 | *(empty)* | *(empty)* |
| 22 | 29/07/2026 17:49:31 | `Darbar Malik Ahmad Ayaz` | Saifullah | 03008842077 | *(empty)* | *(empty)* |
| 23 | 29/07/2026 17:58:08 | `Darbar Meera Mouj Darya Bhukari` | Saifullah | 3008842077 | *(empty)* | *(empty)* |

Note on phone numbers: rows 2 and 4 use `03009485820` (surveyor Muhammad rizwan); rows 21 and 23 use
`3008842077` (leading zero dropped). Reported verbatim.

---

## 2. Void markers — every hit, with location

**All void markers live in the `Status` column (col 23). There are exactly 9, all the literal word
`Delete`. Nothing was found in `Column 1` or buried in any free-text answer.**

| Row | Column | Exact surrounding text (cells shown as they appear, `|`-delimited) |
|---|---|---|
| 1 | Status (23) | `...continue to inspire pilgrims and devotees at Data Darbar today \|  \|  \| Delete \|  \|` |
| 2 | Status (23) | `...real spirituality is to help others and remember God sincerely  \|  \|  \| Delete \|  \|` |
| 5 | Status (23) | `...open?id=1JXAGvxVyJKqrpYFwDUET4x288bpKjW9z \|  \| Delete \|  \|` |
| 6 | Status (23) | `...Olaad Ali(R.A) or Aal e Muhammad (S.A.W) mei sy hai.  \| https://drive.google.com/open?id=1BCQElVmHOeWRMqNuxtI1ojutmo1LeUUC \|  \| Delete \|  \|` |
| 7 | Status (23) | `...wo inay Dua detay rehty KY ek din tu wali-ul-llah bnaya gha.  \|  \|  \| Delete \|  \|` |
| 8 | Status (23) | `...elevated the name of Islam within the faith. \| https://.../open?id=1Dmljka0fvXQMD_oC7MuW63wX3RZI2fmm, https://.../open?id=1JXAGvxVyJKqrpYFwDUET4x288bpKjW9z \|  \| Delete  \|  \|` |
| 9 | Status (23) | `...and the family (*Aal*) of Muhammad (S.A.W). \| https://drive.google.com/open?id=1BCQElVmHOeWRMqNuxtI1ojutmo1LeUUC \|  \| Delete  \|  \|` |
| 10 | Status (23) | `..."that one day you will become a Wali-ullah (saint of Allah)." \|  \|  \| Delete  \|  \|` |
| 11 | Status (23) | `...Shair-e-Mashriq (Poet of the East) and Mufakkir-e-Pakistan (The Thinker of Pakistan). \|  \|  \| Delete  \|  \|` |

Rows 8, 9, 10 and 11 have `Delete  ` with two trailing spaces; rows 1, 2, 5, 6, 7 have `Delete`
with none. No other capitalisation (`DELETE`, `deleted`) occurs anywhere in the file.

### Searches run and dismissed

Whole-file, case-insensitive searches for `delet`, `deleted`, `ignor`, `duplicat`, `dupli`, `void`,
`not required`, `remove`, `discard`, `cancel`, `invalid`, `superseded`, `repeat`, `test`, `wrong`,
`mistake`, `dummy`, `sample`, `trial`, `skip`, `n/a`, `old`, `draft`, `final`, `redundan`,
`use this`, `correct one`, plus Urdu `حذف`, `منسوخ`, `مکرر`, `غلط`, `پرانا`, `ٹیسٹ`.
Every non-`Delete` hit was narrative prose, verified in context and dismissed:

- `remove` — "…remove love of the world from the heart" (teachings text, rows 2 and 4).
- `ignor` — "…in an era of ignorance" (row 18 col 12).
- `test` — "…this was his last testament" (rows 8 and 12); "…the Prime Minister tested Malik Ayaz" (row 22).
- `old` / `purana` — "old name was Kabutar Pura" (rows 7, 14); "an old man (Baba ji) was making lassi" (rows 11, 16); "young and old" (row 20).
- `final` — "…his final days", "Finally, his hard work brought color", "…his final abode" (rows 11, 16, 18, 19).
- No hits at all for: `deleted`, `duplicate`, `void`, `not required`, `cancel`, `invalid`,
  `superseded`, `repeat`, `dummy`, `sample`, `trial`, `skip`, `n/a`, `draft`, or any Urdu term.

`Column 1` is non-empty on only three rows and never carries a void meaning: `No book available`
(rows 17, 18) and `Book uploaded` (row 19). Since every row's `Status` cell was resolved by exact
pipe-index counting, it is certain that **no row other than the 9 above has any Status value at all.**

---

## 3. Grouping by shrine

Every one of the 23 rows' place-name cells (col 2) reduces to one of **14 exact strings** (ignoring
trailing whitespace only). No fuzzy/transliteration merge was needed or performed.

| Group | Rows | Name string(s) present | Basis for grouping |
|---|---|---|---|
| Data Darbar | 1, 3 | `Data Darbar ` (both) | Byte-identical name; same surveyor (Saifullah Imtiaz) and phone; both name Ali Hujwiri as the associated figure. |
| Shrine of Hazrat Mian Mir R.A | 2, 4 | `Shrine of Hazrat Mian Mir R.A` (both) | Byte-identical name; same surveyor (Muhammad rizwan) and phone 03009485820; both name `Hazrat MIa MIr R.A`, both give 1635. |
| Darbar Modho Laal Hussain | 5, 8, 12 | `Darbar Modho Laal Hussain ` (all three) | Byte-identical name; all give founding "1600 Hijri" and the saint `Hazrat Madho Laal Hussain`. Rows 8 and 12 are English renderings of row 5's Urdu-Roman answers. |
| Darbar Bibi Pak Daman | 6, 9, 13 | `Darbar Bibi Pak Daman ` (all three) | Byte-identical name; all give "63 Hijri" and Hazrat Bibi Ruqayya bint Ali (R.A). |
| Darbar Hazrat Gunj Anayat Sarkar | 7, 10, 14 | `Darbar Hazrat Gunj Anayat Sarkar ` (all three) | Byte-identical name; all give mosque 1969 / shrine foundation 2011 and Peer Muhammad Inayat Ahmad Naqshbandi Mujaddidi. |
| Mazar-e-Iqbal | 11, 16 | `Mazar-e-Iqbal ` (both) | Byte-identical name; both give 21 September 1938 and Allama Muhammad Iqbal. |
| Darbar Abul Faiz Qalandari Gilani Soharwardi | 15 | as written | Single row. |
| Darbar Hazrat Shah Gohar Peer | 17 | as written | Single row. |
| Darbar Mian Qurban Ali Shah | 18 | as written | Single row. |
| Darbar Shah Jamaal | 19 | as written | Single row. |
| Darbar Sufi Aziz ul Deen Peer Makki Sarkar | 20 | as written | Single row. |
| Darbar Abul Muali Qadri | 21 | as written | Single row. |
| Darbar Malik Ahmad Ayaz | 22 | as written | Single row. |
| Darbar Meera Mouj Darya Bhukari | 23 | as written | Single row. |

### Spelling variants that turned out NOT to be alternative row names

The brief anticipated variant spellings such as "Madho Lal Hussain", "Mauj Darya Bukhari" and
"Peer Makki". In this file those forms appear **only inside person-name and free-text cells**, never
as a second spelling of a place-name cell:

- `Hazrat Madho Laal Hussain` — col 8 (associated saint) of rows 5, 8, 12, i.e. inside the
  `Darbar Modho Laal Hussain` group already merged on an identical col-2 string.
- `Mouj Darya` / `Hazrat Meera Mouj Darya` — col 6 and col 20 of row 23 only.
- `Peer Makki` — col 2 of row 20 (`Darbar Sufi Aziz ul Deen Peer Makki Sarkar`) and inside row 20's
  own narrative; also mentioned in passing in row 20's text about Data Ali Hajveri. It is not a
  place-name in any other row.

So no merge in this file rests on a judgement call about transliteration — all 6 multi-row groups
are exact string matches reinforced by matching surveyor, phone, founding date and saint name.

---

## 4. Survivor per group

Rule applied: latest timestamp whose `Status` is not `Delete`. Every group that contains a
`Delete` row also contains a later non-void row, so no shrine was lost.

| Shrine | Survivor | Supersedes (all void) |
|---|---|---|
| Data Darbar | **row 3 — 15/06/2026 16:37:56** | 16/03/2026 15:13:08 (row 1, Delete) |
| Shrine of Hazrat Mian Mir R.A | **row 4 — 15/06/2026 16:53:03** | 18/03/2026 05:56:53 (row 2, Delete) |
| Darbar Modho Laal Hussain | **row 12 — 29/06/2026 08:59:57** | 15/06/2026 17:22:24 (row 5, Delete); 20/06/2026 04:32:09 (row 8, Delete) |
| Darbar Bibi Pak Daman | **row 13 — 29/06/2026 11:37:38** | 17/06/2026 16:17:08 (row 6, Delete); 20/06/2026 04:39:24 (row 9, Delete) |
| Darbar Hazrat Gunj Anayat Sarkar | **row 14 — 29/06/2026 11:45:02** | 18/06/2026 16:27:52 (row 7, Delete); 20/06/2026 04:45:10 (row 10, Delete) |
| Darbar Abul Faiz Qalandari Gilani Soharwardi | **row 15 — 29/06/2026 11:54:05** | — |
| Mazar-e-Iqbal | **row 16 — 29/06/2026 12:02:05** | 22/06/2026 17:34:57 (row 11, Delete) |
| Darbar Hazrat Shah Gohar Peer | **row 17 — 14/07/2026 17:58:05** | — |
| Darbar Mian Qurban Ali Shah | **row 18 — 14/07/2026 18:23:32** | — |
| Darbar Shah Jamaal | **row 19 — 14/07/2026 18:32:32** | — |
| Darbar Sufi Aziz ul Deen Peer Makki Sarkar | **row 20 — 23/07/2026 07:54:57** | — |
| Darbar Abul Muali Qadri | **row 21 — 23/07/2026 08:44:33** | — |
| Darbar Malik Ahmad Ayaz | **row 22 — 29/07/2026 17:49:31** | — |
| Darbar Meera Mouj Darya Bhukari | **row 23 — 29/07/2026 17:58:08** | — |

In each superseded pair/triple the survivor is also the more complete record (more media, English
prose), which is consistent with the `Delete` marks being deliberate re-submission cleanups —
with the two exceptions flagged in section 6.

---

## 5. Media on surviving rows

Counts are per source column: **photos = col 18**, **video/audio = col 19**, **book/pamphlet = col 21**.
Drive IDs are given exactly as stored, with the markdown escape `\_` normalised back to `_`
(the file stores every underscore inside an ID as `\_`; no other characters are escaped inside IDs).
All links are of the form `https://drive.google.com/open?id=<ID>`.

### Row 3 — Data Darbar — 15/06/2026 16:37:56 — photos 1, media 0, books 10
- Photos (1): `1YVZY_JvrWaXcq0BBIOr-KcIHWbt4vohQ`
- Video/audio: none
- Book/pamphlet (10): `1ihBPa_GttbEe3ItTJllobz37o_gJsdTv`, `1z6ptiIZeGT56NsfLIhlsFqDgh7Y91gV8`, `1whJQJc6ISFuHZZ0AYMzoOykyuWAf391_`, `1Je5BwBBZLQBS1xRf3UYV5YBSULnHdxF8`, `1QwzmYoV2TfjwxrMCRV91tMqGSIv7SEbl`, `1L7704aabr-X8bAiiqYjzyvDOl_pyfWKO`, `1oMu9kMKWfjzeP3fZAgsZKNYviZ0o4qW2`, `1vksWB4CsjErDPCM1VcslEjCmqf41RzZj`, `1VQcCL6rpbFU5WANv-9UXH5LyKnDcTEa9`, `19qslA_g-f-Fax9uLxZgMwo8YDhnB2Rfh`

### Row 4 — Shrine of Hazrat Mian Mir R.A — 15/06/2026 16:53:03 — photos 0, media 0, books 4
- Photos: none
- Video/audio: none
- Book/pamphlet (4): `1t3FVpHmRw2c8lACHiGRI1TW9GeBj8cPA`, `1IQt3RHA59HqtUgySC8t4HBuhTZTbrRE8`, `11ZxWb4pAfS68l1_Q4JeYrITDr_Yft5Nd`, `1wtb2qUXvH2BDOX0Sqg2WwZLavGhzxFW2`

### Row 12 — Darbar Modho Laal Hussain — 29/06/2026 08:59:57 — photos 10, media 2, books 4
- Photos (10): `1Nxt30Vt5WFarI2Rx7l_QeitrH4nPm2K4`, `1QOi9im6RDvIJ_kcxwPqVgrNUQAIp0uBO`, `1hfHDfwGM40knYkb_3R7l7kRE4wRc9rUX`, `1IAu_pI_BWjtoQ83iNkicfNj7wxP3Htur`, `1fJk4qTuCHOk0VxJsjlQySd2I5oITfUaq`, `1fn0zXqljBNU1t7w78AK-igIXwA1fWwEG`, `1TuRTbbB-1erQF2M0yA9UBFvCn301N0sE`, `1K327P5LpbIhmVft2GbCx6EVM1W-ZaHNx`, `18USwuOrZ2Zum0pRWz7yeeK6dWPfk152S`, `1Nu3-qQBjNRuJSwlCv8Jaj6HQmvnp13p1`
- Video/audio (2): `1RVYdk6iiKI6heTVwic5cvJzv2nA9bRBe`, `1kQGsPZlhKmPgwB1eUlCjfk9gVGCZSVMy`
- Book/pamphlet (4): `1MDWgFBcDfa4aIO02WjiV8zgYAAGln-zT`, `14UbHgzYzEW2s_4jZb9dAGEM41G-FLwgx`, `1luRnOesceTCV98qyA1OfCXiKPv0dpiqQ`, `1FwkTgpdUdO1L3tpPs_ZhqkPwCR5jsmKd`

### Row 13 — Darbar Bibi Pak Daman — 29/06/2026 11:37:38 — photos 7, media 0, books 5
- Photos (7): `1l4f607i3AwXsGGw90TFO6OYMS21Cf5P7`, `1Dafly3EQXx7E8U36tiNouwoYs5j7OYvh`, `10oiHH3lMLjZfqYNCDoMu_FIVzxEcTcL4`, `1ug98tFOZIMp6UUSDrBEdsGUALRr1PO6W`, `1wgrnLIZF5dq0mEpCxfnQ-yORAY8P1Pn3`, `1oBTqJVuKBjSkOgG8xI8ZzYt7tt3vzryp`, `1KFOasRvgwhqUptkDnmOBWBfT9agSOu0Q`
- Video/audio: none
- Book/pamphlet (5): `16PZXZW4ZTes3aRkpz414_oYPvQmNbJSW`, `1sDA56SUZpLyxh30ww6_GV8WXSHO6WV9t`, `13kB5PyHd8S8_yShtHSzhuEQ4xALelldE`, `1vArDr55zvailUkz69ebzCdwCIHO5vbiw`, `1DPZhdgwyOLo61RlKb2kdOQPtgAJ9sXZq`

### Row 14 — Darbar Hazrat Gunj Anayat Sarkar — 29/06/2026 11:45:02 — photos 9, media 1, books 1
- Photos (9): `1pwTqsDgFccTGL2WiAja3lxtRfdXisW1H`, `1XlE072M4RV9ZtgDF-39kDRdvy9u1iCQr`, `1flgM2IojSvII-WyUTizj45xlGAtJduIA`, `1by5moSVV_5ZSo5OFjJLTn8thHyg3vs3v`, `1J7Sn_CiBse7pkMu5CTK6zdXvRWSbcRGO`, `1cF_m1Zv1YfGTP6LtotYeRW6tQM4cEiIL`, `1G6qxitV6XpeEnYRPpPGG1cORjkrmPPJH`, `1_i6iEAl1pm44L3hACzUfah6WP9pl3UeA`, `1k4b-F5G_K8j0P6CKxHj8sxex_DpRHDiw`
- Video/audio (1): `12w6wqER6Rg9bVIMx4z-lWKbyHWEiom0Y`
- Book/pamphlet (1): `10TfmW_k0Q2hOqgUZFYNhUGO-BhBfHvCM`

### Row 15 — Darbar Abul Faiz Qalandari Gilani Soharwardi — 29/06/2026 11:54:05 — photos 10, media 2, books 4
- Photos (10): `1hNXFTgnVWZ5INxVFTyLjKKXtzx7GKfLV`, `12tuKHHHuEFqwfo5fKnhKIKb_SWMeWq7S`, `1tMv2ikWDL9sj5P-vFOooRPK6zi2eVXSK`, `14SVLN6FD4t0HMb4CmHebR_h9aXPOgYGm`, `1LheE8pAOM8LK6Rrlt63epDeEIA2kbj9P`, `1i5gz_7xTzy8d_h37G-nvi7vGtTpKOFys`, `1uJVrYANpwr7Cm-7XqpWQeOADHDOeYqHy`, `1ZxwM7yxmiyIXOlTtRK1D2pWRBmlSHon4`, `1CMWmJ7BPBXRNe9wpxf22NJC3nKScSU68`, `11Z9o_nbtpPTLNlNnaq7L4MGbFHq4M0vD`
- Video/audio (2): `1-zGQfZT6VqAJzkM0xb2U4riSIekSD99j`, `1z5goNc9Fci_kE0iEkP9Cp1iv5Udsyl2l`
- Book/pamphlet (4): `1qFSHiGeP1_qkWqm-mO-9nTxzIv8qFUK4`, `11rZEGH61fkPYpRtwe49EeoU8uvYVZsWt`, `1JHsZleFzr_MXmmbIq1JEJWf_ew8h0-2j`, `1HQrY13sb2KBuEbdB6iEcsBAi8A-c9yUa`

### Row 16 — Mazar-e-Iqbal — 29/06/2026 12:02:05 — photos 10, media 1, books 3
- Photos (10): `1Att60BEEn4d9RUQi3a91-SqCXDLPGs4A`, `1isKEMxXIxJbNUc-QUkI8VQ6nZ3UlOGeb`, `1SFVyktDbKZLr5anS43hsYB3Z8PDq81Ck`, `1nSsq85PEx39jd8T5VnkMoaxpxa82DhwJ`, `1H_GPFwYFh_SLjuipG1QNO4UrgG1f80zD`, `1ogfOz92QCsLvbN01hDy-rQItwNbeGNAH`, `1FaPpzOw9vxGtCP_XM0xTToRyPJJE2EC6`, `1UaTKsHcRIhaBSJBIPMC-UriBTcLESAPF`, `18HRMMgHgaA0GKQBaVgtYc2wYF0Hb0nnc`, `1JJn4ipOoX68A8Nl4JedlWWqQZp0kJWdo`
- Video/audio (1): `1gKkkgqVeY93BSITlNEkguh1dN_zhAvgN`
- Book/pamphlet (3): `1r3TBETRR8ir2XBpwEb5JatnBVgI1rBUV`, `1O0IdfLsOoUYj_BDlsCwQ1W8EdfWqunv-`, `1b4PfBL7V5tt1SlKYTfow3fs9W4We3tyl`

### Row 17 — Darbar Hazrat Shah Gohar Peer — 14/07/2026 17:58:05 — photos 9, media 3, books 0
- Photos (9): `1sj6gFjSEi3pCltBqpvikhvEYP01pgggY`, `1oWuJlKoisN49ICVICGU9w7dGteCJiwor`, `1yKDyOl6KqSRwMg85F05YfQJVjlOoDay8`, `1NBeYAk93hoKpp72Rdg5beLibG_ZNVzc_`, `1Q2s6WfnMzqyh5poIeP7uDpZyJJODKTIo`, `1-19Be_jOOJKiAooKh5jk163qS22iM9ir`, `1Q-yyKZX__S3KAm9v0A61BU9EWOOpjgVr`, `1DOaHzknk0C30l-4tM_NJRgh2LnskIXo9`, `1ODMCkHKOgHrHxhTAzcdyftbRMOL1rjtO`
- Video/audio (3): `1hrL4V2bFyzmiG2M-Kuv-U1pQms9FEWZ6`, `1DxGBAPRJ5ljwFq2eRx4kk-E4agDCNuq7`, `1q7mro7GTg8WTp78fgNSKywVLrSmTJMBD`
- Book/pamphlet: none (`Column 1` = "No book available")

### Row 18 — Darbar Mian Qurban Ali Shah — 14/07/2026 18:23:32 — photos 10, media 1, books 0
- Photos (10): `14lRENB4RRq3J1pwp5rU3Qi65MKafTl4-`, `12bK8K-aY1sNUUuIp04xfJ0AOizLBv3j-`, `1AK0jextU6psZEuGZhtaeHPkPmOqlLdDK`, `18MbwFHeYWQQZs8Ce2uQXIJfq9c9rMhOL`, `13UK_kOSgKK-59rEUqC9I2w8VLjUs-4dE`, `1GV3PcxfGwLZGiw4oeJjlN1jnpIAuPPPi`, `1ma_jPDRuro2qgtgPJM9UmBZ_fiyBzEKS`, `1M_Zd74Phrh11V1c3VBCDDJTPejCnscbC`, `19FGK7vF5oi7SEhMW-I3Vlfi9GpstIP7x`, `1Vohhp711_DQ6N34ZgOLT3GRgDNNxlY-D`
- Video/audio (1): `1JRSz6f25ChpSA-NT_59Kn7OKcajy0jQ1`
- Book/pamphlet: none (`Column 1` = "No book available")

### Row 19 — Darbar Shah Jamaal — 14/07/2026 18:32:32 — photos 10, media 1, books 0
- Photos (10): `1H0NOJi-SD0AtnAFsBn4SgEw9S0QntE8U`, `1ym0RP3zK5K-WyzYjwSmYaxcRJ-a3I_w4`, `1xpCHk7tgrHEFJlQSmrSldJBwD2ZkCOwl`, `1vQ80rwO5lgXbC6ABC-_-tx1XY2Dm45qr`, `1xxajT2Scq5dzJklPExwdAx-z2HcDOqR-`, `1tzxveX_XfuuKY1XLMo8GcbTMoZnwPPtj`, `12jiTLEM9rKNqSVyp5SY-8h-DboS74Azv`, `1D-q_PCbPzyC0BGkr4o_31_vF_rP1cONO`, `1xrmFKSnMtfVOoYC00dbS7XUx5dW1-sAg`, `17q0Mc1It1Rn3WZNB5BRMGY6ernb9q_oG`
- Video/audio (1): `1oQtWn7qEC6cViMKZOGjoCftpB80OgYHT`
- Book/pamphlet: none — but `Column 1` says "Book uploaded" (see section 6)

### Row 20 — Darbar Sufi Aziz ul Deen Peer Makki Sarkar — 23/07/2026 07:54:57 — photos 10, media 1, books 0
- Photos (10): `1zaqu6yHeioCmYdh4diT7DPeUORfeclcT`, `1KPiZn7fUuWVzG6xWgFbxiSqujE-rTtB6`, `1MoielROkU21dPHzmbF7g3kNUkhE0lW1n`, `1HTCxvQ4Hq1-NNkgta9qfm3qxikekIdno`, `1aw0FK5RsN6i--z_pPt02YDbVheYOY0FP`, `1VvuHWbX-16VfsaG9DXtYElWGRm4nFgau`, `15BLyTr8l5ETVp8B_hL6TM7adCHdTAzdJ`, `1pMQ9hFfFtwMK9CblPjkuHaAgjYxLarzJ`, `1pYC9JGDynVx2NGXYucx_sEhYzgSIolQL`, `1srlqVEbBAIONnmlx44pCkP5vbTGS0vcK`
- Video/audio (1): `1hxOcXo1ct8fSRtPwpZBHepF3WDgnwsW7`
- Book/pamphlet: none

### Row 21 — Darbar Abul Muali Qadri — 23/07/2026 08:44:33 — photos 9, media 1, books 0
- Photos (9): `1UYleUn3I3jI3nnHaTrsCK4t7TqOtmAS7`, `1SRZ38xfMQjeKbUgKsoYYbUaVLTJjotcd`, `1rfYffBGSdvb9VqwdmZ1ZYcgDuMf6Q-po`, `1nAynlaz4SEnq5x9958pwO7hCAuumvH5e`, `188oQBXrgNcUNrrwhm6HeGHXhQUtQn2f9`, `1tVAog2XxfyCfOAvIlzXkYqmky_3IBbVJ`, `1lb89Sc2ljrMOdKl4_diJqINJ_ZMfnTSM`, `10Xdyq91o5bIJ6Zuq1Q-dlS0QA6O-wCM4`, `1rDHrTLg7bxBMfNidrNQhjeH99lr9gvob`
- Video/audio (1): `1SGeAx6iybjwHT6QBeEQqT7I6hGtYG7hS`
- Book/pamphlet: none

### Row 22 — Darbar Malik Ahmad Ayaz — 29/07/2026 17:49:31 — photos 10, media 1, books 0
- Photos (10): `1Sk7wDtpo4RlpXFX6Wuu6iTiTkF9nHAke`, `1CtHCJ69sc-cXXfPNNuxpASBbTis9xei0`, `1hGlBw4w_p4ikhi4BRaU6T_sTr9yMIos9`, `1kJuT0bXVSm0TV_skrh065j9wKvmjfe7c`, `1-9AQuefwPYPTiOJ28cUiSzzaTEFWRVDJ`, `14zPiv560KSSfh6lca5anee03l_vaqHYz`, `1muLtMfn_NggoRa7hNEf1vBKSmtzG1JYh`, `1BF_bVPIzt6w4LuRb3rzW0Ke-YyFAOLxy`, `1PPK4alk1xrj6_B5L2aGUhSpbeKmWz-PT`, `1Q6AkAkzdZFVtq0FRBATo1-jErRkeaSPG`
- Video/audio (1): `1MasVOPQng1TI_Ns6MPLCnPyMBPCvPO3i`
- Book/pamphlet: none

### Row 23 — Darbar Meera Mouj Darya Bhukari — 29/07/2026 17:58:08 — photos 10, media 2, books 0
- Photos (10): `1JGKdTJ94wIzJjS4MHlx0NGwSByqtzk8D`, `1LjLR3AtlHw3lfSynFRbnuLxjE_sZhur9`, `16wGSbAgcqXnSf0040OK-MMfh-vCqTPYU`, `1HtlrmHGTurGQOez8yv0vGtJuAPsbKmOq`, `1MstCKkO68Eu1m5zT1-TYYZRScHgx1P7z`, `1uEqHoFua3zTZ3fVaSRkeHyqnfMz4ItTB`, `1WUw90h_G-v5sF6DryDSNmWL96K9puNh5`, `1RYF2nc3DC3mLrlqc5PNnv36S9QspJTh_`, `1EBg894JyqiduPZggFmBKf50vIrss0iSz`, `1dZEi7-OFr4nztUIwTk8RiFSsIMkUqr4v`
- Video/audio (2): `1cKTtnkfDjHz0jkgumIhaXcg7eh3_zHGK`, `1H1ozu7KNPcmTRyp-HP5xq4JhrkZeaYVl`
- Book/pamphlet: none

**Totals across the 14 surviving rows:** 115 photos, 16 video/audio, 31 book/pamphlet = 162 Drive files.

---

## 6. UNCERTAIN — NEEDS A HUMAN DECISION

Nothing here changes which 14 rows survive. All three items are about how to *interpret* cells on
rows that are already unambiguously non-void.

### 6.1 Rows 3 and 4: uploads sit in the "book/pamphlet" column, photo column near-empty

Both of these survivors put all or nearly all of their files in column 21 (the
"upload a book or pamphlet" question) rather than column 18 (the photo question):

- **Row 3 (Data Darbar, 15/06/2026 16:37:56)** — 1 file in the photo column, **10 in the book column**.
- **Row 4 (Shrine of Hazrat Mian Mir R.A, 15/06/2026 16:53:03)** — photo column **completely empty**,
  video column empty, **4 files in the book column**.

The cell positions were confirmed by exact pipe-index counting, so the placement is not a parsing
error — the file really does put those IDs in the book column. But it is a plausible data-entry
mistake: row 4's own superseded predecessor (row 2, Delete) had 1 file in the *photo* column and
nothing in the book column, and every other surviving row follows the normal pattern of 7-10 photos
+ 1-3 video. **A human should open a couple of these IDs and decide whether they are pamphlet scans
(counts stand) or misfiled site photographs (in which case `n_photos` and `n_books` for rows 3 and 4
should be swapped/reallocated).** The TSV reports them as stored, with a flag.

### 6.2 Row 19 (Darbar Shah Jamaal): `Column 1` = "Book uploaded" but the book column is empty

Row 19's `Column 1` reads `Book uploaded`, yet column 21 (book/pamphlet) contains nothing. The two
neighbouring rows by the same surveyor say `No book available` and are indeed empty, so the note in
`Column 1` appears to be a reviewer's tick that does not match the row's contents. Either an upload
was lost, or the note is wrong. `n_books = 0` was recorded from the actual column. **Not treated as a
void marker** — "Book uploaded" carries no delete/ignore sense — but someone should confirm whether a
book file for Shah Jamaal exists elsewhere.

### 6.3 No ambiguous void statuses, and no ambiguous merges

Stated explicitly so it is not mistaken for an omission:

- **Void status:** unambiguous for all 23 rows. Nine rows carry the literal `Delete` in the `Status`
  column and nothing else in the file carries any void sense (see the dismissed-hits list in
  section 2). No row has a marker hidden in a free-text answer.
- **Merges:** unambiguous for all 23 rows. Every group is an exact string match on the place-name
  cell, backed by matching surveyor, phone, founding date and saint name. No pair of *differently
  spelled* place names had to be judged, so there is no risky merge to flag. If a later batch
  introduces e.g. `Madho Lal Hussain` or `Mauj Darya Bukhari` as a place-name in its own right, that
  will be the first case needing a human call.
