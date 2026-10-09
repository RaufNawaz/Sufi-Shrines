# Worker brief — khalid_in_search_of_shiva, Pass 1 chunk notes (3 Oct 2026, §9.250)

Book: Haroon Khalid, *In Search of Shiva: A Study of Folk Religious Practices in Pakistan*
(Rupa Publications India, New Delhi, "First impression 2015", eISBN 978-81-291-3902-3). Route **epub**:
the EPUB was unpacked into **21 sections, and each section is one `[p. N]`**. So `[p. N]` is an EPUB
SECTION index (= roughly one chapter), NOT a printed page. Travel-writing / ethnography: the author
visits folk shrines across Punjab (phallic/fertility shrines, sacred trees, animal shrines, malang
lodges), argues that pre-Islamic (Shaivite, animistic) practice survives inside Sufi shrine culture,
and sets this against orthodoxy (Deobandi, Barelvi), the two-nation theory, and identity politics.
Shrine-level PRESENT-DAY material (c. 2010-2014: custodians, offerings, festivals, legends told by
informants) is dense — exactly what the archive wants, though most of the shrines are NOT archive rows.

## Measured by the coordinator on this book (verify nothing yourself; no Bash)

- **Section → chapter map** (measured from the headings):
  p. 1-7 front matter, Contents, Introduction, ch. 1 "Muslim Rage: Innocence of Muslims" ·
  p. 8 ch. 2 "Fertility Cult" · p. 9 ch. 3 "Sacred Trees" · p. 10 ch. 4 "Into the Heart of Orthodoxy" ·
  p. 11 ch. 5 "A Mutiny from within" · p. 12 ch. 6 "Animistic Cults" · p. 13 ch. 7 "Syncretism in the
  Mainstream" · p. 14 ch. 8 "The Two-nation Theory" · p. 15 ch. 9 "The Counter-narrative" ·
  p. 16 ch. 10 "Identity Crisis" · p. 17 ch. 11 "The Changing Landscape" · p. 18 Acknowledgments ·
  p. 19 Notes (endnotes, numbered CONTINUOUSLY 1, 2, 3… across the whole book) · p. 20 Bibliography ·
  p. 21 cover/CSS residue.
- **Citation form, every fact:** `(p. N, ch. K, folio not stated)` — e.g. `(p. 11, ch. 5, folio not
  stated)`. There are NO printed page numbers anywhere; do not invent any. Because one `[p. N]` is a
  whole chapter, quote enough of the book's wording that a human can find the sentence by search.
- **The text is clean** (born-digital EPUB): zero replacement characters, zero ligatures measured. Use
  `[text-layer?]` only if you actually meet a garbled word; record "no text damage met" under Doubts
  as an explicit negative if so.
- **Fused endnote markers**: "worship16", "dhoan17", "love38", "dum45", "emerged64", "women1" — the
  digits are ENDNOTE numbers (the notes are on p. 19), not part of the word and never a date or a page.
  Inventory once under Doubts. **No endnote number may ever become a `(p. N)`.**
- The running line "In Search of Shiva" recurs at section starts — it is a header, not content.
- Lots of quoted dialogue with named informants (custodians, malangs, devotees, guides). Attribute:
  "according to X, the caretaker". The author's claims and his informants' claims are different things.
  **Iqbal Qaiser** (a Punjabi historian who guides the author; "Iqbal" occurs ~120 times) is a PERSON
  in the book, NOT Allama Iqbal — never map him to `mazar-e-iqbal`. Only the poet Muhammad/Allama
  Iqbal, if named, takes that row (person rule, with a Doubts line).

## Mapping — measured joins and FALSE FRIENDS

- Most shrines this book visits (phallic shrine at "50 Chak PS"/"Chak PS 50", "Moron wali sarkar",
  "Peer Waliyat", the shrine of cats, toy-horse offerings, Baba Mastan, malang dera, sacred trees…)
  have NO archive row → "Other saints, sites and events" (keep the book's location wording). Check
  shrine_index.tsv before concluding; a zero-mapping chunk is valid.
- **Shiva** (~51 mentions, chunks 001-009): the book's thesis figure. Where the book speaks of Shiva
  as a deity/cult with no specific archive site named, apply the many-row PERSON rule: head the bullet
  with all of Shiva's rows from shrine_index.tsv column 5 ("Shiva (Mahadev)" / "Shiva (associated)":
  amb-temples-amb-sharif, bhagnari-mandir, chandragup-baba-chandragup, katas-raj-temples,
  shahwala-teja-singh-mandir, shiv-mandir-chiti-ghati, shree-ratneshwar-mahadev-temple-karachi,
  umarkot-amarkot-shiv-mandir — verify against the tsv), ONE line, plus the Doubts line "person-level,
  not site-specific". Gather a chunk's Shiva material into ONE bullet with sub-bullets. A purely
  metaphorical/title use ("in search of Shiva") is a bare mention — map once if it carries content,
  else list it in Doubts.
- Same person rule for **Guru Nanak** (all his rows, column 5 = "Guru Nanak…"), **Krishna** (2 rows),
  **Durga**, **Valmiki**, **Guru Hargobind**, **Guru Gobind Singh**, **Ranjit Singh**
  (samadhi-of-maharaja-ranjit-singh). **Baba Farid** / Fariduddin Ganjshakar (chunks 006, 008, 009) →
  `shrine-of-fariduddin-ganjshakar` — BUT **Khwaja Ghulam Farid** (Mithankot / Kot Mithan) is a
  DIFFERENT row, `mithankot-kot-mithan`; a bare "Farid"/"Fareed" (e.g. "Fareed Gharib" in a verse,
  or an informant called Fareed) is neither — check the context, and put a genuinely ambiguous Farid
  under Doubts. **Bulleh Shah** → `mazar-of-bulleh-shah`. **Waris Shah** →
  `mausoleum-of-waris-shah`. **Shah Hussain** → `madho-lal-hussain`. **Sakhi Sarwar** → `sakhi-sarwar`.
  **Abdullah Shah Ghazi** → `shrine-of-abdullah-shah-ghazi`. **Rahman Baba** →
  `rahman-baba-mausoleum-rehman-baba-shrine`. **Data Darbar** → `data-darbar`. **Shergarh** /
  Daud Bandagi Kirmani → `shergarh`. Ram Thamman (13 mentions in chunk 007) has NO row → Other.
- **Toponyms, ruling (a)** — join via toponym_map.txt. Real toponym keys this book hits: lahore (35
  rows; ~56 mentions — gather ALL of a chunk's bare-Lahore material into ONE bullet), multan (8),
  karachi (11), islamabad (4), peshawar (10), rawalpindi (6), sialkot (5), jhelum (2), pakpattan,
  kasur, jhang, chiniot, gujrat, sargodha, phalia, shergarh, quetta, nankana sahib (7), mozang.
  **A bare mention is not material**: a place named only as a route, a distance, a highway, a
  stop-over or someone's home town does NOT earn a ruling-(a) bullet — list such names in ONE Doubts
  line. Material ABOUT the place (its people, shrines, events, conditions) does.
- **FALSE FRIENDS in toponym_map.txt — never map these:** `chak` (here a village-number prefix,
  "50 Chak PS", "Chak 22" — the map key points at a Sindh temple); `dadu` (a NAME in a Punjabi verse,
  chunk 002); `ayub` (Ayub Khan, the president); `muslim`; `place`; `data darbar` as a map key (it
  lists two neighbouring rows — use the row `data-darbar` itself by name instead); "Multan Road" is a
  highway in Lahore, not Multan.
- **Ruling (c), provinces** (read TAKEAWAYS_PROTOCOL.md (c) carefully): "Punjab" occurs ~70 times,
  "Sindh" 6, "Baluchistan" 1, "Kashmir" 2. Province material goes under `## Province-level material`,
  NO bold ids, with the PERIOD stated in the book's terms (or "period not stated"). This book talks a
  lot about Punjab's pre-Islamic/Indus past, "the division of Punjab between India and Pakistan",
  canal colonies, "indigenous Punjabis" (jungli) vs migrants — carry the book's framing; Indian-side
  material does NOT take the Pakistani province; "Punjab" as a bare adjective for one town is a
  toponym, not a province bullet; "Punjabi" as a language/ethnic label is not a province statement
  unless it says something about the province. Every province bullet gets the Doubts line
  "province-level, weigh accordingly".

## Rules (from BOOK_QUEUE_TASK.md — non-negotiable)

Every fact ends with `(p. N, ch. K, folio not stated)`; quote the book's own wording exactly for every
date, name and place; "(not stated)" rather than fill a gap; add NOTHING from general knowledge, not
even a well-known death year; keep **every id of a bullet head on ONE physical line** (a 35-id Lahore
head is one line); only use archive ids that appear verbatim in shrine_index.tsv column 1; a
zero-mapping chunk is valid — record it as an explicit negative. Output shape exactly as
TAKEAWAYS_PROTOCOL.md Pass 1 (with `## Province-level material` after the archive section), first line
`# khalid_in_search_of_shiva — chunk NNN — pp. A–B`.

Efficiency: Read this brief, TAKEAWAYS_PROTOCOL.md, shrine_index.tsv, toponym_map.txt,
province_map.txt, the abridged calibration file (its findings are LOCAL to khalid_a_white_trail — a
different book with different joins), then your chunk (if it is longer than ~900 lines, finish with a
second offset Read). ONE Write of your notes file. No Bash, no Edit, no re-reading.
