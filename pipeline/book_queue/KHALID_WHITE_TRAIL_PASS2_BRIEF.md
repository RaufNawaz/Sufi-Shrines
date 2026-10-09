# Pass-2 brief — khalid_a_white_trail (3 Oct 2026, coordinator session_01GD1QAsNSJXAMahyzknYFJ5)

You are ONE of four workers consolidating the 13 Pass-1 chunk notes of this book into ONE takeaways
document, `entries/book_takeaways/khalid_a_white_trail.md`, per `TAKEAWAYS_PROTOCOL.md` "Pass 2".
Each worker writes ONE OR MORE SECTIONS of that document, as separate files in `/home/claude/p2/out/`.
The coordinator assembles them. All inputs are in `/home/claude/p2/`. No Bash. Read, then Write.

## The book (measured at Pass 1, §9.246 — do not re-measure)

Haroon Khalid, *A White Trail: A journey into the heart of Pakistan's religious minorities*
(westland ltd, 2013; "First e-book edition: 2013"), 236 PDF pages, route `text_layer`. Reportage
of festivals the author attended c. 2010-2012, one chapter per festival/site.
- **Born-digital text layer, essentially undamaged.** Only: `BAIAISAKHI` (chapter headings p. 54,
  p. 157), `Babar (14831530)` (p. 21), fused footnote markers (`Guru Nanak1`, `celebrations4`,
  `192425` p. 190 — 1924 + note 25, or 1924-25?). The introduction (pp. 9-11) has sentences spliced
  out of order in the e-book itself.
- **No printed folios anywhere** — every reference is `(p. N, folio not stated)`. Keep that form.
- **Chapter → page map:** Holi at Multan to p. ~28 · Navratri at Bahawalnagar · Shivratri at Killa
  Katas to ~p. 53 · Baisakhi at Ram Thamman 54-~68 · Valmiki's birthday (Lahore) · Krishna
  Janmashtami (Lahore) · Maryabad to 99 · Sacred Heart Cathedral 100-126 · Cathedral Church of
  Resurrection 127-134 · Navroz 135-145 · Baha'i 146-156 · Hassan Abdal 157-171 · Gobind Singh at
  Nankana 172-180 · Lohri at Nankana 181-194 · Dera Sahib 195-204 · Ranjit Singh 205-212 · Sikh New
  Year at Nankana 213-218 · Guru Nanak's birthday 219-232 · Afterword 233-236.
- **The author's note (p. 15) says informant names were changed and some passages "stray from"
  non-fiction.** Every informant name may be a pseudonym. Keep attribution ("according to X, the
  pujari") — the book's claims and its informants' claims are different things.

## Rules (non-negotiable)

- NOTHING enters that is not in the Pass-1 extracts you were given. No general knowledge, not even
  a well-known date. Write "(not stated)" rather than fill a gap.
- Every fact keeps its page reference(s) `(p. N, folio not stated)`; merging duplicates keeps ALL
  pages. Quote the book's wording exactly for dates, names and places; keep every `[text-layer?]` /
  `[OCR?]` flag on its word.
- Contradictions are kept SIDE BY SIDE, never resolved (e.g. Shanti Nagar 5th vs 6th February 1997).
- Deduplicate: the same fact reported by two chunks appears once with both pages.
- **Ids: only ids that appear verbatim in `shrine_index.tsv` column 1.** Every `### <id> — <name>`
  heading uses the row's `name` from the tsv. A group heading keeps its ids on ONE physical line
  (as bold ids in a line directly under the heading, like the calibration excerpt) — never wrap.
- Do NOT reverse any decline or deferred mapping on your own judgement (hedges.md) — those go to
  Doubts. Do NOT add a mapping Pass 1 did not make.
- Read `calib_excerpt.md` for SHAPE only (a Pass-2 output for a different Khalid book). Its folio
  rule, OCR damage, Talwandi mapping and reconstruction register are LOCAL to that book. This book
  has no reconstruction register; its registers are: **reportage** (the author's own observation
  at the festival), **informant** (what a named person told him — name may be a pseudonym),
  **book's historical prose** (background the author gives), **author's argument**.

## Judgement mappings §9.246 flagged for Pass 2 to weigh (keep the material where Pass 1 put it,
## and say in the subsection's first line, in one sentence, that the mapping is a judgement call)

- `prahladpuri-temple` mapped on location/"Prahlad" — the book never prints "Prahladpuri" or Narasimha.
- `krishna-mandir-ravi-road` for "Krishna Mandir, the only other functional Hindu temple in the city"
  (005) from the chapter title (Lahore) only.
- `gurdwara-sacha-sauda` from "Mandi Chuharkhana", the name Sacha Sauda never printed (010).
- `darbar-malik-ahmad-ayaz` from "Shah Alami" vs map key "shah alam market" (004; 010 declined it).
- `shrine-of-baba-shah-chiragh` from toponym keys "mall"/"lahore high court" (006; 007 declined).
- `mazar-of-bulleh-shah` from bare "Kasur" (003, 004, 007, 011) — thin.
- Kali's third row `kalka-cave-temple-asthan-of-kalka-devi`.
- Neela Gumbad Valmiki Mandir (Anarkali) was NOT forced onto `valmik-mandir-naqi-road` — keep it so.
- Person-rule bullets that are only a bare wall-picture or name mention (Kali, Durga, Ram, Hanuman,
  Saraswati → sharada-peeth, Laxmi, …): keep them, but group them compactly and mark "bare mention".

Work efficiently: one Read of each input (use offset reads for any file over ~900 lines), then Write.
When done, reply with: files written, byte counts, number of subsections/bullets, and any problem
(an id not in the tsv, a fact you could not place, a contradiction you noticed).
