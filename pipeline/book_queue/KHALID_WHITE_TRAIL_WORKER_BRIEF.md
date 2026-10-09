# Worker brief — khalid_a_white_trail, Pass 1 chunk notes (29 Sep 2026, §9.246)

Book: Haroon Khalid, *A White Trail: A journey into the heart of Pakistan's religious minorities*
(westland ltd, first published in India 2013; "First e-book edition: 2013"), 236 PDF pages,
route text_layer. Reportage: the author attends festivals of Hindus (Holi at Multan, Navratri at
Bahawalnagar, Shivratri at Killa Katas, Baisakhi at Ram Thamman, Valmiki's birthday at Lahore,
Krishna Janamashtami at Lahore), Christians (Maryabad, Sacred Heart Cathedral Lahore, Cathedral Church
of Resurrection Lahore), Zoroastrians (Navroz, Lahore), Baha'is (Lahore), and Sikhs (Baisakhi at
Hassan Abdal; Guru Gobind Singh's birthday, Lohri, Sikh New Year and Guru Nanak's birthday at Nankana
Sahib; Guru Arjan's martyrdom at Gurdwara Dera Sahib, Lahore; Ranjit Singh's death anniversary,
Lahore). Present-day (c. 2010-2013) site material is DENSE — this is exactly what the archive wants.

## Measured by the coordinator on this book (verify nothing yourself; no Bash)

- **The text layer is clean** — a born-digital e-book. No ligature damage, no replacement chars.
  Use `[text-layer?]` only if you actually meet a garbled word; expect almost none. Say so under
  Doubts as an explicit negative ("no text-layer damage met in this chunk") if that is the case.
- **There are NO printed folios.** Zero standalone page-number lines in all 13 chunks. Cite every
  fact as `(p. N, folio not stated)` where N is the `[p. N]` marker (PDF page). Do not invent folios.
- Chapter titles are printed in CAPITALS (e.g. `RAM THAMMAN`, `HASSAN ABDAL`, `KATAS`).
- Much is quoted speech from named informants (priests, caretakers, pilgrims). Attribute it:
  "according to X, the pujari" — the book's claims vs its informants' claims are different things.

## Mapping — these joins are measured; use them

- "Hassan Abdal" (the book's spelling, double s) = map key `hasan abdal` → **gurdwara-panja-sahib**.
  "Panja Sahib" → same row.
- "Katas" / "Killa Katas" / "Katas Raj" → **katas-raj-temples**.
- Holi at Multan / Prahlad / Prahladpuri → **prahladpuri-temple**; plus ruling (a): bare "Multan"
  material takes all 8 Multan rows (see toponym_map.txt line `multan`).
- "Gurdwara Dera Sahib" (Lahore, Guru Arjan) → **gurdwara-dera-sahib**.
- Ranjit Singh's samadhi → **samadhi-of-maharaja-ranjit-singh**.
- Krishna Mandir, Lahore (Ravi Road) → **krishna-mandir-ravi-road**; a Valmiki Mandir in Lahore →
  **valmik-mandir-naqi-road** ONLY if the book's location fits Naqi Road / its description; if the
  book names another Lahore Valmiki temple (e.g. near Anarkali / Neela Gumbad), do NOT force the
  row — record under Other and add a Doubts line naming the candidate row.
- Nankana Sahib → its 7 rows (toponym_map.txt `nankana sahib`); a named gurdwara there (Janam
  Asthan, Bal Lila, Tambu, Patti, Kiara, Malji…) takes its own row. **Search variant spellings**
  (Nankana/Nanakana, Janamasthan/Janam Asthan, Tambu/Tambo) before concluding a site is absent.
- Guru Nanak as a person with no site named → person rule: all his rows (TAKEAWAYS_PROTOCOL.md).
  Shiva with no site named → his 8 rows. Krishna → 2. Valmiki: check shrine_index.tsv principal_figure.
- **Lahore bare toponym → all 35 Lahore rows (ruling (a)); this book will produce MANY such
  bullets. Gather all of a chunk's bare-Lahore material into ONE bullet with sub-bullets.**
- Ram Thamman, Bahawalnagar, Maryabad, the cathedrals, fire temple, Baha'i centre: check
  shrine_index.tsv; if there is no row, they go under "Other saints, sites and events".
- **Ruling (c), provinces (read TAKEAWAYS_PROTOCOL.md (c) carefully):** the word "Punjab" occurs
  94 times in the book, "Sindh" 10, "Khyber" 15, "Baluchistan" 4. Province material goes under
  `## Province-level material`, NO bold ids, with the PERIOD stated. Watch the timeline and the
  book's own framing: "undivided Punjab", "East Punjab", Indian Punjab, Amritsar, pre-partition —
  carry the wording; Indian-side material does NOT take the Pakistani province. "Punjab" used as a
  bare adjective for a town ("Kasur, in Punjab") is a toponym, not a province bullet. Every
  province bullet gets a Doubts line "province-level, weigh accordingly".
- Dates the book prints (e.g. "December 1992", "'47") — quote exactly; no outside knowledge.

## Rules (from BOOK_QUEUE_TASK.md — non-negotiable)

Every fact ends with `(p. N, folio not stated)`; quote the book's own wording exactly for every
date, name and place; "(not stated)" rather than fill a gap; add NOTHING from general knowledge;
keep **every id of a bullet head on ONE physical line** (a 35-id Lahore head is one line); a
zero-mapping chunk is a valid result — record it as an explicit negative. Output shape exactly as
TAKEAWAYS_PROTOCOL.md Pass 1, first line `# khalid_a_white_trail — chunk NNN — pp. A–B`.
Only use archive ids that appear verbatim in shrine_index.tsv column 1.

## Wave-2 additions (from wave-1 reports, 29 Sep 2026)

- **Chapter → site map (measured from the capitalised chapter headings).** Material that continues
  a chapter begun in an earlier chunk belongs to that chapter's site even if the city is not
  repeated on your pages:
  Sacred Heart Cathedral, Lahore pp. 100-126 · Cathedral Church of Resurrection, Lahore pp. 127-134 ·
  ZOROASTRIAN / Navroz in Lahore pp. 135-145 · Hazrat Bab's birthday in Lahore (Baha'i) pp. 146-156 ·
  Baisakhi at Hassan Abdal pp. 157-171 (→ gurdwara-panja-sahib) · Guru Gobind Singh's birthday at
  Nankana Sahib pp. 172-180 · Lohri at Nankana Sahib pp. 181-194 · Guru Arjan's martyrdom at
  Gurdwara Dera Sahib, Lahore pp. 195-204 (→ gurdwara-dera-sahib) · Ranjit Singh's death
  anniversary (at Lahore) pp. 205-212 (→ samadhi-of-maharaja-ranjit-singh) · Sikh New Year at
  Nankana Sahib pp. 213-218 · Guru Nanak's birthday at Nankana Sahib pp. 219-232 · AFTERWORD pp. 233-236.
- **A bare mention is not material.** A place named only as a distance, a route, a stop-over or a
  pilgrim's home town does not earn a ruling-(a) bullet; list such names in one Doubts line instead.
  Material ABOUT the place (its people, events, conditions) does.
- The person rule applies to ANY principal figure in shrine_index.tsv column 5 (Kali, Durga, Ram,
  Hanuman, Guru Arjan, Guru Gobind Singh, Ranjit Singh…), not just the ones named above — map it
  and add the person-level Doubts line. A figure named only as a picture on a wall or in a list of
  deities is a bare mention: map it, but say so in Doubts.
- The author's note (p. 15) says minority informants' **names were changed** and some passages
  "stray from" non-fiction. Carry informant names as printed and note once under Doubts that they
  may be pseudonyms.
- Fused footnote markers occur ("celebrations4", "Guru Nanak1") — read them as footnote numbers,
  not as part of the word; inventory once under Doubts.
