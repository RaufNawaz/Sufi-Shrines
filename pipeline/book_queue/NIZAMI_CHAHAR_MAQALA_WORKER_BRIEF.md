# Worker brief — nizami_revised_translation, Pass 1 chunk notes (4 Oct 2026, §9.253)

Book: Nizami-i-'Arudi of Samarqand, *Chahar Maqala* ("Four Discourses"), **Revised Translation by
Edward G. Browne**, followed by an abridged translation of **Mirza Muhammad's** notes to the Persian
text. E. J. W. Gibb Memorial Series vol. XI.2, Cambridge University Press for the Gibb trustees,
Luzac & Co., London, **1921** (title page, PDF p. 5). Route **text_layer** (scan of a printed book,
archive.org "revisedtranslati00nizauoft"). 208 PDF pages, 13 chunks of ~8,000 words.

**What it is:** a 12th-century Persian prose work on the four classes of courtier a king needs —
secretaries, poets, astrologers, physicians — each discourse a run of numbered ANECDOTES (Ghaznavid,
Saljuq, Ghurid, Samanid courts; Mahmud of Ghazna, Firdawsi, 'Umar Khayyam, Avicenna…). Then Browne's
/ Mirza Muhammad's NOTES (I–XXXI) on dynasties, poets, astronomers, physicians. **This is not a
South Asia book.** Expect most chunks to map ZERO archive rows — that is a valid result, record it
as an explicit negative.

**THREE VOICES — attribute every claim to the right one:**
1. **Nizami-i-'Arudi, the author** ("I, the author", "the writer of these lines") — the anecdotes,
   PDF 19-116. His statements are a 12th-century primary source.
2. **Browne, translator** — the Preface (PDF 11-14), footnotes, and parts of the Notes.
3. **Mirza Muhammad, editor of the Persian text** — the Notes (PDF 117-185) are mostly Browne's
   abridged translation of HIS notes. Write "the Notes (Mirza Muhammad, as abridged by Browne)" unless
   the text says it is Browne speaking.

## Measured by the coordinator on this book (verify nothing yourself; no Bash)

**Structure (PDF pages):** 1-10 covers, series list (p. 7-8 — a publisher's list of the Gibb series
with prices), title p. 5 · 11-14 PREFACE · 15-17 TABLE OF CONTENTS · 18 blank · 19-31 Exordium (praise,
cosmography, physiology, "the missing link", plan of the work) · 32-44 First Discourse (Secretaries,
Anecdotes I–XII approx.) · 45-81 Second Discourse (Poets; Ayaz p. 55-56; Farrukhi, Mu'izzi, Azraqi,
Rashidi, Firdawsi p. 73-77) · 82-93 Third Discourse (Astrologers; al-Biruni p. 83, 'Umar Khayyam p. 89;
autobiographical p. 93) · 94-116 Fourth Discourse (Physicians; Avicenna) · 117-185 NOTES I–XXXI ·
186-199 General Index · 200-202 Index of technical terms · 203 author's other works · 204-208 blank /
library slip.

**FOLIO RULE — measured, use it:** for PDF pages **19-203, folio = PDF − 18** (PDF 19 = folio 1).
58 legible running-header numbers agree; the 13 that "disagree" are all digit damage (`3*2`=32,
`3^`=34, `3&`=38, `5"o`=50, `jo`=30, `Ig`=19, `2$`=29, `'^3`=23, `16'` on PDF 28 = 10). Zero real
violations, no plate insert, no step. Leading folio on even PDF pages, trailing on odd. Discourse-
opening pages print no number — the rule still holds there. **Front matter PDF 11-17 = roman ix–xv**
(folio = PDF − 2, in roman: p. 11 = ix, p. 12 = x … p. 17 = xv). PDF 1-10, 18 and 204-208: folio not
stated. **Citation form: `(p. 55, folio 37)`; `(p. 12, folio x)`; `(p. 7, folio not stated)`.**

**Text damage classes (scan OCR, mark inline `[text-layer?]` per ruling (b)):**
- **Digits:** `o`→0, `i`/`I`/`l`→1, `g`→9, `$`/`^`/`&`/`*` for 4/6/8/9 etc., `s`→5, `B`→8. Dates
  are printed as `A.H. 489 (A.D. 1096)`; quote them exactly as printed and flag any damaged digit —
  e.g. "igif" in the series list is a damaged year. Never repair a date from general knowledge.
- **Prices are not years:** the series list (p. 7-8) gives prices in shillings — "125.", "155.",
  "io.y.", "8*." are `12s.`, `15s.`, `10s.` damaged. Never read them as dates or pages.
- **Diacritics mangled:** macron vowels render as other letters — `Ghaznawf`/`Ghaznawl`/`Ghaznawj`
  (= Ghaznawi), `Mas'tfd`/`Mas'iid` (= Mas'ud), `Qur'dn` (= Qur'an), `Kdmilu` (= Kamilu), `Nfshapur`.
  Not total-and-mechanical (`f` is also a real f), so flag inline on names you carry over.
- **Stray scan marks** `•` `»` `«` `'` `,` `t` `>` scattered through lines and at line ends — noise,
  drop them silently; inventory once under Doubts.
- **Fused footnote markers:** "Lamghan1", "Tafhim1", "herself on her knees1" — the digit is a footnote
  number, never a date or a page. Footnotes are numbered per page and printed at the foot.
- **Internal references are never a `(p. N)`**: "Note XV at the end", "the Persian notes (pp. 142-150
  and 178-182)", "J.R.A.S. … (pp. 693-740)", "see p. 62" — these point to other works or to the
  Persian text. **No index locator ever becomes a `(p. N)`** (chunks 011-013 are the index): cite the
  PDF page the index entry is printed on.

## Mapping — measured joins and FALSE FRIENDS

Only two archive joins exist in this book that the coordinator could find:

- **Ayaz** (Anecdote XIV, "Sultan Mahmud and Ayaz", PDF 55-56, chunk 003; also index p. 188) →
  **`darbar-malik-ahmad-ayaz`** by the PERSON rule: that row's principal figure is "Malik Ahmad Ayaz …
  slave of Mahmud Ghaznavi, minister, and governor of Lahore". Map it, record ONLY what this book says
  about Ayaz (the anecdote of Mahmud, Ayaz's curls/tresses, 'Unsuri's improvisation), and add a Doubts
  line: "person-level identification — the book's Ayaz is Mahmud's favourite; the book does not
  mention Lahore, a governorship or a tomb in this anecdote".
- **Lahore** (toponym ruling (a), 35 rows — use toponym_map.txt's lahore line, ALL ids on ONE physical
  line): the real material is in the NOTES (chunk 008, PDF ~135): Mas'ud-i-Sa'd-i-Salman "was born at
  Lahore, of which, in several passages in his poems, he speaks as his native place"; Runa (nisba of
  the poet Runi) "a place near Lahore"; Jalandar "a dependency of Lahore". That earns ONE Lahore bullet
  with sub-bullets plus the Doubts line "place-level attachment; the material is about poets of
  Ghaznavid Lahore, not about any shrine". **Bare mentions are NOT material:** "lithographed at Lahore"
  / "printed at Lahore" (an edition's place of printing, chunks 006 and 011) and index entries
  "Lahore, 117", "Jalandar (near Lahore), 117" → ONE Doubts line listing them, no bullet.
- **Multan, Uch, Punjab, Karachi, Peshawar…** — the coordinator found none. If you meet one, check
  toponym_map.txt and apply ruling (a) by the same test.

**FALSE FRIENDS — never map:**
- `sind` inside **Sindibad**, **Kamilu's-Sina'at** (rendered "Sind'at", "Sindfaty"), and **"ibn Sind"**
  (= ibn Sina, Avicenna, damaged). `hind` inside "behind", "hind before". **Hindu** as a personal name
  ("Abu Sa'd ibn Hindu of Isfahan").
- `muslim` is a toponym_map key pointing at a Lahore row (Muslim Town) — the word in this book is the
  religion. Never map it.
- **Kashfu'l-Mahjub** appears only as a title in the publisher's series list (p. 7, "Sufi doctrine",
  transl. Nicholson). The book does NOT name its author there, so do NOT map `data-darbar`; one Doubts
  line: "title only, author not named in this book — not mapped (RULE 2)".
- **Ghazna/Ghaznin, Herat, Nishapur, Balkh, Samarqand, Bukhara, Khurasan, Transoxiana, Lamghan** — not
  in Pakistan's archive; "Other saints, sites and events" at most, briefly.
- **"Sind" in Anecdote VI (PDF 38, chunk 002):** "Lamghan is a city in the district of Sind, one of the
  dependencies of Ghazna". This is a statement about ONE named town (ruling (c) point 4 → a toponym,
  and Lamghan has no row) → "Other saints, sites and events", plus a Doubts line quoting the book's
  "district of Sind" and noting it is the 12th-century author's geography, not today's province. Do
  NOT write a `## Province-level material` bullet for it. Index "Sind, 20" is an index locator.
- "India" / "governor of India" (Ghaznavid sense) is not a province — record it under Other if it
  matters, never as a province bullet.
- Mahmud of Ghazna, al-Biruni, Avicenna, Firdawsi, 'Umar Khayyam, Sana'i, Shaykh 'Abdu'llah (Note XXXI)
  have NO archive row. Mahmud is NOT a principal figure of any row — only Ayaz's row mentions him.

## Rules (from BOOK_QUEUE_TASK.md — non-negotiable)

Every fact ends with a page reference as above; quote the book's own wording exactly for every date,
name and place; "(not stated)" rather than fill a gap; add NOTHING from general knowledge, not even a
well-known death year; carry every `[text-layer?]` you add onto the word it belongs to; keep **every id
of a bullet head on ONE physical line**; only use archive ids that appear verbatim in shrine_index.tsv
column 1; a zero-mapping chunk is valid — write `## Shrines and figures in the archive` with the single
line "- None. This chunk maps to no archive row (explicit negative)." and keep the other sections brief
but real (the book's courts, practices of patronage, medicine, astrology are legitimate "Practices"
and "Arguments" material — keep it compact; this book is not the archive's centre).
Output shape exactly as TAKEAWAYS_PROTOCOL.md Pass 1 (with `## Province-level material` after the
archive section only if there is real province material — the coordinator expects none), first line
`# nizami_revised_translation — chunk NNN — pp. A–B`.

Efficiency: Read this brief, TAKEAWAYS_PROTOCOL.md, shrine_index.tsv, toponym_map.txt,
province_map.txt, the abridged calibration file (its findings are LOCAL to khalid_in_search_of_shiva —
a different book, born-digital, with dense Punjab joins; copy its SHAPE, not its joins), then your chunk
(chunks run 880-1,100 lines: if a Read stops before the end, finish with a second offset Read). ONE
Write of your notes file. No Bash, no Edit, no re-reading.
