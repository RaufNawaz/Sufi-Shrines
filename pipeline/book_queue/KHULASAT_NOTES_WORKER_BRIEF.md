# khulasat_ut_tawarikh — Pass 1 chunk-notes worker brief (written 10 Oct 2026, §9.313)

You write the chunk notes for ONE chunk of `khulasat_ut_tawarikh`: Sujan Rai Bhandari of Batala,
*Khulāṣat al-Tawārīkh*, a **Persian** (not Urdu) history of Hindustan composed in regnal year 40 of
Aurangzeb = 1107 AH (1695-96), in the 1918 Delhi lithograph edited by Zafar Hasan (610 PDF pages,
transcribed by vision from the lithograph, 10 Oct 2026). Rules are in `TAKEAWAYS_PROTOCOL.md` — read
it in full first. This brief adds what was MEASURED on this book. Where they differ, this brief wins
for this book only.

## Files (all in the work directory you are given; read-only except your output)
- `TAKEAWAYS_PROTOCOL.md` — output shape and the mapping rulings (a) toponym, (b) damage marker,
  (c) province, the person rule and the many-row person rule.
- `shrine_index.tsv` — the 169 archive rows (id, name, category, location_short, principal_figure,
  figure_died, silsila, province). Every bold id you write must exist here verbatim.
- `toponym_map.txt` — place (English, lower case) → row ids. `province_map.txt` — province → rows.
- `calibration_tahqiqat_chunk_NOTES.md` — a finished notes file from a sibling lithograph book, for
  SHAPE and density only. Its damage and folio findings are local to that book.
- Your chunk `chunk_NNN.txt`. Output: `chunk_NNN.notes.md` (one Write). No Bash, no Edit.

## The book's structure (PDF page → content). THE SCAN RUNS BACK TO FRONT.
**PDF page 1 is the back of the book and PDF 610 the front.** Inside a chunk, the text is in PDF
order, so *reading order runs from the HIGHEST `[p. N]` down to the lowest*: a sentence that breaks
off at the end of `[p. 520]` continues at the start of `[p. 519]`. Read each page's paragraph forward,
but join pages high → low. Head your file `pp. A–B` with A < B as usual.
- 1-16: covers, blank leaves, library marks. ~17-48: the editor's **index** (two columns of
  `name - page, page`) and errata — locators, not facts (see below).
- ~49-428: the Muslim rulers, from Aurangzeb's accession (lowest PDF pages) back to Sabuktigin
  (~429); Babur ~310, the Langah sultans of Multan ~297, Akbar ~259-160, Jahangir ~148.
- ~429-500: the Hindu rajas from Yudhishthira to Prithviraj (mythic-historical king-lists).
- **500-566: the GEOGRAPHY of Mughal Hindustan by suba** — the part that matters most to the archive:
  Kabul ~506, Kashmir ~509, **Lahore ~509-525** (the six rivers, the Salt Range, Gujrat and Shah Daula,
  Sialkot, Batala, Achal, Baba Nanak and the Gurus), **Multan ~525-528** (Sakhi Sarwar, Uch, Pakpattan),
  **Thatta ~528-532** (Hinglaj, Sehwan, the Manchhar lake), then Gujarat, Ajmer, Malwa, the Deccan
  subas, Bengal, Bihar, Awadh, Allahabad, Agra, **Delhi ~550-561**.
- **~561-567 `درویشان هند`, the dervishes / holy men of Hindustan**; 567-576 the Indian sciences,
  arts, animals, fruits and the rains; 576-584 the author's preface and source list; 585-610 the
  preface's opening, the table of contents, the editor's list of works and his Urdu introduction.

## Citing
- **CITE PDF PAGES ONLY: `(p. N)`.** Do NOT cite folios, even though pages carry `[folio N]` lines.
  The body's folio is `589 − PDF`, but each folio was read once off a lithograph and the front
  matter has three other paginations; the consolidator can add folios later. A table-of-contents or
  index number is quoted as text ("indexed at printed page ۲۹۲"), never turned into a `(p. N)`.
- **`حاشیہ:` lines are the 1918 editor's footnotes**, almost all variant readings from his other
  manuscripts (`(۱) پرگنه` = "MS variant: pargana"). They are not the author's statements. Record a
  variant only when it touches a name, a date or a place you are noting, as "editor's footnote
  variant: …".
- **Index pages (~17-48):** do not turn index entries into facts. If the chunk is index or errata,
  write a short note: what headwords of archive interest appear (saints, sites, places in
  `toponym_map.txt`) with their printed locators quoted as text, under "Shrines and figures in the
  archive" only as "indexed: …", and say plainly that the chunk is index matter. Keep it brief.

## Measured damage
- **Damage varies widely by range (corrected §9.316):** the pages transcribed late (≈500-610) carry ~1-4 `[OCR?]` a page, but the
  history chunks transcribed in September (≈49-428) carry 10-25 `[OCR?]` a page and more `[illegible]` (measured on chunks 006, 023, 024,
  026, 031). The book-wide average is ~4 per page only because of the late pages. Carry every
  flag onto any word you quote; printed form first, your reading after it in brackets if you offer
  one. Never repair a quotation silently. Never fill an `[illegible]` gap.
- **Dates and numbers.** Many are written in WORDS (Persian), which is more reliable than digits;
  quote them as printed. Eras in use: Hijri, regnal (`سنه … جلوس`), Bikrami (`سمت` / `بکرماجیت`),
  Saka (`سالباهن`), Kaliyuga (`کلجگ`). Never convert, never smooth, never compute an interval.
- Lithograph spellings: `ے` for `ی`, `ڈ ٹ ڑ` used in Persian, `ه` for `ہ`. Quote as printed.

## Mapping — Persian names to archive rows
Look up every candidate in `shrine_index.tsv` (name AND principal_figure AND location_short) and
`toponym_map.txt`. Common Persian forms: لاهور Lahore · ملتان Multan · تهته Thatta (check the map;
no row may exist) · اچه / اوچ Uch Sharif (5 rows) · پاکپتن / اجودهن Pakpattan — **the book may write
"Ajodhan"; map to Pakpattan only where the book itself equates them or names Baba Farid's tomb
there; otherwise Doubts** · سیوستان / سهوان Sehwan · بهکر Bhakkar · سکهر Sukkur · پشاور Peshawar ·
حسن ابدال Hasan Abdal · جهنگ Jhang · سیالکوت Sialkot · گجرات Gujrat.
**Traps measured on this book:**
- **`گجرات` is TWO places.** The Punjab town of Gujrat (Shah Daula, in suba Lahore, ~p. 515) is an
  archive place; suba **Gujarat** (Ahmadabad, Somnath, Shah Alam Bukhari, ~p. 531-534) is in India
  and takes no row. Decide from context; if unsure, Doubts.
- **Outside Pakistan, no row:** Batala and the author's pargana, Kalanaur, Achal, Jalandhar, Sirhind,
  Thanesar, Kurukshetra, Delhi, Agra, Ajmer (Muin al-Din Chishti), Gujarat, the Deccan, Bengal,
  Kashmir valley (the archive's Kashmir row is Sharada in AJK — only if the book names it), Kabul.
  These go under "Other saints, sites and events", briefly. (Deccan / non-Pakistan sites are out of
  scope for rows — Rauf, 10 Oct 2026.)
- **Guru Nanak** is principal figure of 18 gurdwara rows: by the many-row person rule a passage on him
  where no site is named takes all 18 (one physical line of ids) + Doubts "person-level". A named site
  (Talwandi = Nankana Sahib, Kartarpur, Eminabad, Hasan Abdal / Panja Sahib) takes only its own row(s),
  and only if the book names it.
- **Sakhi Sarwar** (`سخی سرور` / `سلطان سرور` / `لکهداتا` …) → `sakhi-sarwar` only where the book means the
  saint or his shrine at Nigaha/Dera Ghazi Khan side; the word `سرور` alone is also "joy" and a royal
  epithet — most hits are not him.
- `شاه دوله` → `shrine-of-hazrat-shah-daula-daryai` (Gujrat). `امام علی` at Sialkot → check
  `shrine-of-imam-ali-ul-haq` (Sialkot itself is a 5-row toponym). `فرید` / `شکرگنج` → `shrine-of-fariduddin-ganjshakar` (Farid is also a common
  name — Farid Bhakkari, Sher Shah's name Farid Khan: not him). `بهاءالدین زکریا` / `شیخ الاسلام` at
  Multan → `shrine-of-bahauddin-zakariya`; `رکن عالم` → `shrine-of-shah-rukn-e-alam`; `شمس تبریز` at
  Multan → check `shrine-of-shah-shams-ud-din-sabzwari` and add Doubts. `لعل شهباز` at Sehwan →
  `lal-shahbaz-qalandar`. `هنگلاج` → `shaktipeeth-shri-hinglaj-mata-mandir`. Words like `جلال`, `جهانیان`,
  `شمس`, `عنایت`, `مخدوم`, `لعل` are ordinary vocabulary far more often than names — map only a name.
- **HELD identities — map as the book names them and add a Doubts line "held identity question",
  do not resolve:** `shrine-of-baba-shah-chiragh`, `langer-makhdoom`, the two Shah Inayats
  (`shrine-of-shah-inayat-qadiri`, `dargah-roza-sufi-shah-inayat-shaheed`), `shrine-of-pir-mangho`,
  "Shams" (Multan), and **the Uch Jalaluddin / Jahaniyan split**
  (`shrine-of-jalaluddin-surkh-posh-bukhari-jalaluddin-bukhari` vs
  `shrine-of-makhdoom-jahaniyan-jahangasht`): if the book names "Jalal" / "Makhdum Jahaniyan" at Uch,
  record exactly what it says and put BOTH ids on the bullet head only if the book gives no way to
  choose, with the Doubts line. Bulleh Shah's death year is also held.
- **Toponym ruling (a):** general material on a city with archive rows (Lahore 35, Multan 8, Peshawar
  10, Uch 5 …) heads ONE bullet per city per chunk with ALL that city's ids from `toponym_map.txt` on
  ONE physical line, plus a Doubts line "place-level". A named tomb, mosque or garden that is not
  itself a row is NOT city-in-general — "Other saints…".
- **Province ruling (c):** the book describes **Mughal subas** (`صوبه دارالسلطنت لاهور`, `صوبه دارالامان
  ملتان`, `صوبه تهته`, `صوبه کابل`). A statement about a whole suba goes under `## Province-level
  material` as `PROVINCE punjab` (suba Lahore or Multan) or `PROVINCE sindh` (suba Thatta), with the
  book's word quoted, "refers to: the author's time, c. 1107 AH, a Mughal suba" (or the period the
  book gives), and a Doubts line "province-level; a Mughal suba, not the modern province's
  boundaries — the book's own unit". **Never supply the suba's extent from general knowledge.** Suba
  Kabul material takes no province unless the book places it in what the map calls KP (Peshawar is a
  toponym, not a province). Revenue figures for a suba (`جمع`, `دام`, `روپیه`, sarkars, mahals) are
  institutional material: quote the figure as printed with its flag.
- **Two darbars on the site are NOT in this index** (Shah Gohar Peer; Mian Qurban Ali Shah): if named,
  "Other saints…" with a Doubts line "row exists on site, not in shrine_index.tsv".

## Output
- Head: `# khulasat_ut_tawarikh — chunk NNN — pp. A–B`, then a 3-6 sentence paragraph on what the chunk
  contains, section by section, as titled in the book (quote the Persian heading).
- Then the protocol headings; omit empty ones. English throughout; quote short Persian phrases in the
  original script where wording matters (names, dates, figures, headings), with a gloss.
- Add NOTHING from general knowledge — not a death year, a silsila, a location, or an identification
  the chunk does not make. A zero-mapping chunk is a valid result; say so explicitly.
- A long chunk may need a second Read with an offset — make sure you reached the last `[p. N]`.
- Your final reply to the coordinator: 5 lines max — ids mapped (count), pages covered, anything you
  could not place. Do not paste the notes.

## Added after wave 1 (§9.316)
1. **A deity or saint named AT A PARTICULAR NON-ARCHIVE SITE does NOT take the many-row person ids.** The protocol's
   many-row rule applies only "where the book names no particular site". Shiva/Mahadev at a Kashmir or Indian temple,
   Krishna at Mathura, a Guru at an Indian town: "Other saints, sites and events", no bold ids. (Wave 1's chunks 040, 043
   and 045 mapped such cases; Pass 2 should drop them.)
2. **Rulers are not shrines.** A sultan, emperor or governor takes an id only if he is a row's principal figure
   (Qutbuddin Aibak, Malik Ayaz, Ranjit Singh …). Look the principal_figure column up.
3. **A campaign passing through Lahore, Multan, Uch, Thatta, Bhakkar or Peshawar** is toponym material only when the book
   says something about the place itself; a bare "marched via" is one short bullet at most, flagged in Doubts.
4. **Saints named inside the history** (a ruler's visit to a tomb, a blessing, a death, a tomb built) are the most
   valuable material in the history chunks: record them fully in the book's words.
