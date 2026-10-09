# Pass-2 brief — nizami_revised_translation (4 Oct 2026, coordinator session_016TtAVkEGA1yHc2nkRvFYaw, §9.255)

You are ONE of two workers consolidating the 13 Pass-1 chunk notes of this book into ONE takeaways
document, `entries/book_takeaways/nizami_revised_translation.md`, per `TAKEAWAYS_PROTOCOL.md` "Pass 2".
Each worker writes its assigned SECTIONS as separate files in `/home/claude/p2/out/`. The coordinator
assembles them. All inputs are in `/home/claude/p2/` (extracts in `/home/claude/p2/ext/`, the raw
notes in `/home/claude/p2/notes/` if an extract makes no sense). No Bash. Read, then Write.

## The book (measured at Pass 1, §9.253 + NIZAMI_CHAHAR_MAQALA_WORKER_BRIEF.md — do not re-measure)

Nizami-i-'Arudi of Samarqand, *Chahar Maqala* ("Four Discourses"), **Revised Translation by Edward G.
Browne**, with an abridged translation of **Mirza Muhammad's** notes to the Persian text. E. J. W. Gibb
Memorial Series vol. XI.2, Cambridge University Press for the Gibb trustees, Luzac & Co., London, 1921.
Route `text_layer` (scanned printed book, archive.org). 208 PDF pages, 13 chunks.
- Structure (PDF pages): 1-10 covers / series list (p. 7-8) / title (p. 5) · 11-14 Preface · 15-17
  Contents · 19-31 Exordium · 32-44 First Discourse (Secretaries) · 45-81 Second (Poets) · 82-93 Third
  (Astrologers) · 94-116 Fourth (Physicians) · 117-185 Notes I-XXXI · 186-202 Indexes · 203 author's
  other works.
- **Citation form — keep it exactly as Pass 1 wrote it:** `(p. 55, folio 37)` (folio = PDF − 18 on PDF
  19-203); `(p. 12, folio x)` front matter; `(p. 7, folio not stated)`. No index locator, no "Note XV",
  no "pp. 142-150 of the Persian notes" and no J.R.A.S. page is ever a `(p. N)`.
- **THREE VOICES — keep them attributed:** Nizami (the author, anecdotes, PDF 19-116, 12th-century
  primary source); Browne (Preface, footnotes, parts of the Notes); "the Notes (Mirza Muhammad, as
  abridged by Browne)".
- **This is not a South Asia book.** Only two archive joins exist and Pass 1 made exactly those:
  `darbar-malik-ahmad-ayaz` (person rule; chunk 003 Anecdote XIV p. 55-56 + chunk 012 index p. 188) and
  the 35-id Lahore group (ruling (a); chunk 008 Note XIV p. 134-135 only). **No province material
  anywhere** — the `## Province-level material` section is an explicit negative (see Worker A).
- Text damage: digits, macron vowels (`Ghaznawf`, `Mas'iid`, `Qur'dn`), stray scan marks, fused footnote
  digits ("Lamghan1" — a footnote number, never a date), shilling prices in the series list (p. 7-8,
  never dates), and two-column interleaving on ~30 pages (p. 55, the Ayaz description, is one).

## Rules (non-negotiable)

- NOTHING enters that is not in the Pass-1 material you were given. No general knowledge, not even a
  well-known date. "(not stated)" rather than fill a gap.
- Every fact keeps its page reference(s); merging duplicates keeps ALL references. Quote dates, names
  and places exactly as Pass 1 quoted them, with every `[text-layer?]` flag and bracketed reading kept.
- Contradictions SIDE BY SIDE, never resolved. Known (§9.253): Mas'ud-i-Sa'd's prison terms (Nizami
  12 + 8 years, p. 69; p. 69 fn. "seven or eight years in Maranj"; the Notes "ten years", then "eight or
  nine", p. 135 — CORRECTED after worker B: an earlier draft of this brief misquoted the p. 69 footnote);
  'Ala'u'd-Din Husayn's reign "A.H. 544-556" (p. 21 fn. / p. 114 fn. — CORRECTED: the draft said p. 12) vs "545 to 556" (p. 119); 'Umar
  Khayyam's death "A.H. 526 … not … 515" (p. 89 fn.) vs index "d. 1122 or 1132" (p. 199); the Venice
  print years "1500, 1596, 1509 and 1542" (p. 97) out of order; Runi's death per Taqiyyu'd-Din (A.H. 489)
  vs the Notes (p. 134-135). Keep any others you meet.
- **Ids: only ids that appear verbatim in `shrine_index.tsv` column 1.** The Ayaz subsection heading is
  exactly `### darbar-malik-ahmad-ayaz — Darbar Malik Ahmad Ayaz`. The Lahore group heading is
  `### Lahore (place-level: 35 rows)` and directly under it ALL 35 bold ids on ONE physical line, copied
  from `ext/archive_place.md`'s bullet head — never wrap, never retype.
- Do NOT reverse any decline in `ext/hedges.md` and do NOT add a mapping Pass 1 did not make. In
  particular: Kashfu'l-Mahjub (title only) → NOT data-darbar; Muhammad Iqbal the Cambridge research
  student → NOT mazar-e-iqbal; "Lamghan … in the district of Sind" (p. 38) → NOT a province bullet;
  bare "lithographed/printed at Lahore" (p. 97, p. 172) and index "Lahore, 117" → Doubts only.
- **FALSE FRIENDS (never map):** `sind` in Sindibad / Kamilu's-Sina'at / "ibn Sind" (= ibn Sina) /
  the damaged index line "re- … Sind, 20 … vived" (= "revived", chunk 012, p. 197); `hind` in "behind"; "Hindu" as a personal
  name; `muslim` (the religion).
- **SILENT OCR REPAIRS INSIDE QUOTATIONS (§9.253's finding — fix them now, per ruling (b)).** The
  coordinator measured the Pass-1 quotations against the source text; `repairs.md` lists the printed
  form of words that Pass 1 quoted in repaired form without a flag. When you carry one of those quotes,
  write the word as **printed, then `[text-layer?]`, then the reading in brackets** — e.g.
  `"O Mahmud, mingte [text-layer?] [mingle] not sin with love"`. Exempt (drop silently, as the Pass-1
  brief allowed): stray scan marks (`•` `»` `^` `'` `,` inserted between letters or at word ends),
  line-break hyphens, and fused footnote digits. If a word on the list is not in a quote you carry,
  ignore it.
- `calib_excerpt.md` is a Pass-2 output for a DIFFERENT book (Khalid, *In Search of Shiva*): SHAPE
  only. Its citation form and its joins are local to that book.

## Split — by OUTPUT section

**Worker A** writes three files:
1. `out/A1_head.md` — the title line `# Chahar Maqala (Browne's revised translation) — takeaways`, the
   italic source paragraph (author, title, edition as above; "208 PDF pages, transcribed text_layer;
   provenance in out/ocr/nizami_revised_translation/. Page references are PDF page indices; folio =
   printed page number where known." then on its own line `Reviewed: no.*`), and `## What this book is`
   (3-5 sentences: genre, scope, the three voices, that it is not a South Asia book and touches the
   archive only through Ayaz and Ghaznavid Lahore poets, reliability: scan OCR damage, interleaving).
2. `out/A2_archive.md` — `## Shrines in the archive this book informs` with a one-line italic
   orientation, then `### darbar-malik-ahmad-ayaz — Darbar Malik Ahmad Ayaz` (sub-bullets Saint ·
   Significance per protocol, ALL the anecdote material, the index entry, first line saying it is a
   person-level identification and the book says nothing of Lahore, a governorship or a tomb), then
   `### Lahore (place-level: 35 rows)` (first line: place-level attachment, the material is about poets
   of Ghaznavid Lahore, not about any shrine; then all the chunk-008 material grouped by person: Runi,
   Mas'ud-i-Sa'd-i-Salman, Jalandar). Then `## Province-level material` with the single line
   `- None. No chunk of this book carries province-level material (explicit negative; the one "district
   of Sind" is a statement about the town Lamghan — see Doubts).`
3. `out/A3_figures.md` — `## Figures and sites not in the archive`, from `ext/s_other_…md` (59 KB).
   Subsections `### Rulers and dynasties`, `### Poets`, `### Astronomers, astrologers and physicians`,
   `### Secretaries, viziers and other courtiers`, `### Places`, `### Books and works` (adjust if the
   material wants another split). One bullet per figure/place: name as printed (with flags) — the
   book's key facts in one or two lines (dates exactly as printed, voice attributed) — ALL pages. Merge
   the same person across chunks into one bullet. This book's content lives mainly here; be compact
   but lose no dated fact and no page.

**Worker B** writes three files:
1. `out/B1_crosscutting.md` — `## Cross-cutting material` with `### Practices, institutions, economy`,
   `### Legends and miracles (karamat)`, `### Arguments and interpretations`, merged from the three
   matching extracts, deduplicated, all pages kept, voices attributed.
2. `out/B2_citable.md` — `## Citable passages`: the best twelve to fifteen from `ext/s_citable_passages.md`
   (prefer the Ayaz anecdote, the Lahore/Mas'ud-i-Sa'd passage, and passages on patronage of poets and
   on the four classes of courtier), page referenced, quoted with the repairs rule applied.
3. `out/B3_doubts.md` — `## Doubts and review points`: merge `ext/s_doubts.md` (34 KB) into grouped
   subsections — `### Archive mappings and declines` (every item of `ext/hedges.md`, ids kept),
   `### Contradictions` (side by side), `### Dates and numerals` (every damaged date/numeral flag),
   `### Names` (damaged names), `### Text damage inventory` (the classes once, plus ONE bullet
   recording that Pass 1 repaired OCR damage inside quotations silently and Pass 2 flagged the listed
   words per ruling (b); list the `repairs.md` pairs compactly), `### Structural and other`. Deduplicate
   across chunks but keep every distinct item and every page.

Work efficiently: one Read of each input (offset reads for any file over ~900 lines), then Write each
file once. When done, reply with: files written, byte counts, number of subsections/bullets, and any
problem (an id not in the tsv, a fact you could not place, a contradiction you noticed).
