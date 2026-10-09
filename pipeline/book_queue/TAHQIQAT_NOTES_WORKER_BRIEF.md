# tahqiqat_chishti — Pass 1 chunk-notes worker brief (written 9 Oct 2026, §9.272)

You write the chunk notes for ONE chunk of `tahqiqat_chishti` (Tahqiqat-e Chishti, an Urdu
lithograph survey of Lahore's shrines, tombs, mosques and families; 873 PDF pages, transcribed
by vision from scribal Nastaliq). Rules are in `TAKEAWAYS_PROTOCOL.md` — read it in full first.
This brief adds what was MEASURED on this book.

## Files (all in /home/claude/tq/, read-only except your output)
- `TAKEAWAYS_PROTOCOL.md` — the output shape and all mapping rulings (a), (b), (c), person rule.
- `shrine_index.tsv` — the 169 archive rows (id, name, location_short, principal_figure, province).
- `toponym_map.txt` — place → row ids (substring-derived). `lahore` = 35 ids.
- `province_map.txt` — province → rows.
- `calibration_tareekh_lahore_c004_ABRIDGED.md` — an abridged notes file from a SIBLING Lahore
  book, for SHAPE and density only. Its folio offset and damage findings are LOCAL to that book.
- Your chunk: `chunks/chunk_NNN.txt`. Output: `out/chunk_NNN.notes.md` (one Write). No Bash, no Edit.

## Measured on this book
- **Damage is heavy**: 300-700 `[OCR?]` and 300-800 `[illegible]` per chunk. Carry every flag onto
  any word you quote (printed form first, your reading after in brackets if you offer one). Never
  repair a quotation silently. Never fill an `[illegible]` gap with a plausible word.
- **CITE PDF PAGES ONLY: `(p. N)`.** Do NOT cite folios. This book's printed folios were read once
  each off a scribal lithograph and the offset wanders (−2 … +8, several contested ranges); the
  queue's rule is that no folio on a scribal lithograph is cited from a single reading. `(p. N)` is
  the `[p. N]` marker above the text. Never turn a table-of-contents or index number into a `(p. N)`
  — a ToC entry is cited at the PDF page it is printed on, with the printed number quoted as text.
- **Numerals are unreliable** (hijri/vikrami/AD years, ages, sums). Quote every date exactly as
  printed, in the original digits, with its flag. Never convert or smooth a date.
- `[p. 338]`, `[p. 341]`, `[p. 380]`, `[p. 381]` are suppressed duplicate photographs — if a chunk
  has a pointer there, do not note the page twice.
- Almost everything in this book is in LAHORE. Apply ruling (a): material on Lahore *in general*
  (the city, its walls, gates as a whole, its history) heads ONE bullet per chunk with ALL 35 `lahore`
  ids from `toponym_map.txt`, every id on ONE physical line, plus a Doubts line "place-level".
  But a named tomb/mosque/takia that is NOT itself an archive row is NOT Lahore-in-general — it goes
  under "Other saints, sites and events" (a mohalla or gate named as a location is not a toponym bullet).
- Archive rows in Lahore you are likely to meet (check names AND principal_figure in the index):
  `data-darbar` (Data Ganj Bakhsh / Hujwiri), `bibi-pak-daman`, `shah-jamal`, `madho-lal-hussain`,
  `shrine-of-mian-mir`, `peer-makki`, `shrine-of-baba-shah-chiragh`, `shrine-of-miran-hussain-zanjani-zanjani-sahib`,
  `shrine-of-syed-musa-pak`, `darbar-malik-ahmad-ayaz` (reach it by the person rule from Ayaz, never as a
  Lahore toponym id), `samadhi-of-maharaja-ranjit-singh`, the Lahore gurdwaras and `jain-mandir-lahore`.
  Look every id up — do not guess one; every bold id must exist verbatim in `shrine_index.tsv`.
  **Held identity questions — map as the book names them, and add a Doubts line, do not resolve:**
  `shrine-of-baba-shah-chiragh` (whether "Shah Chiragh" conflates two men), `langer-makhdoom`.
- Two darbars now on the site are NOT in this index (Shah Gohar Peer; Mian Qurban Ali Shah). If the
  book names either, put it under "Other saints…" with a Doubts line "row exists on site, not in
  shrine_index.tsv".
- Province: a statement about "Punjab" in general → `## Province-level material` per ruling (c), with
  period and the Doubts line. The Sikh state / "سرکار" / Ranjit Singh's kingdom wording is carried as
  printed, never mapped to modern boundaries from general knowledge.
- A chunk over ~950 lines truncates in one Read; if your Read stops short of the last `[p. N]`
  shown in your task, read again with an offset.
- Head the file `# tahqiqat_chishti — chunk NNN — pp. A–B`, then a 3-6 sentence paragraph on what
  this chunk contains (its sections in order, as titled in the book). Then the protocol headings.
- Add NOTHING from general knowledge — not a death year, not a silsila, not an identification the
  chunk does not make. A zero-mapping chunk is a valid result: say so explicitly.
- Your final reply to the coordinator: 5 lines max — ids mapped (count), pages covered, anything you
  could not place. Do not paste the notes.
