# Province sweep worker brief (ruling (c)) — 5 October 2026, §9.257

You are adding ONE new section, `## Province-level material`, to a book's EXISTING consolidated
takeaways file. The Pass-1 notes predate ruling (c), so you must read the RAW CHUNKS, not the notes.
Template: §9.243 worker D (khalid_walking_with_nanak). Root: /home/claude/ps

## Read first
1. `pipeline/book_queue/TAKEAWAYS_PROTOCOL.md` lines 100-140 — ruling (c), verbatim. Obey it.
2. `out/province_sweep/TEMPLATE_khalid_walking_with_nanak_province.md` — the finished shape to copy
   (intro paragraph in italics, `### province: <key>` subsections, one bullet per statement, each
   with book's word / period / register, then the fact with a page reference).
3. `pipeline/book_queue/province_map.txt` — the province keys: `punjab`, `sindh`,
   `khyber pakhtunkhwa`, `balochistan`, `islamabad capital territory`, `azad kashmir`.
   Aliases: sind→sindh, baluchistan→balochistan, nwfp / frontier province→khyber pakhtunkhwa.
4. Your book's takeaways file `entries/book_takeaways/<slug>.md`: read the header and
   `## What this book is` (it states the FOLIO RULE and damage classes for this book — use them),
   and skim `## Doubts and review points` for damage notes. Do NOT re-read the whole file.
   For schimmel_mystical_dimensions_of_islam also read `pipeline/book_queue/SCHIMMEL_MDI_WORKER_BRIEF.md`.

## Method
- Grep the raw chunks `out/ocr/<slug>/chunks/chunk_*.txt` (case-insensitive) for:
  `Punjab|Panjab|Panjāb|Sind\b|Sindh\b|Sind,|Sind\.|Baluchistan|Balochistan|Frontier|Pakhtunkhwa|NWFP|Kashmir|Multan province|suba`
  and ALSO the adjectives `Sindhi|Punjabi|Panjabi|Baluchi|Kashmiri` — but an adjective about a
  LANGUAGE or a poem's language is NOT a province statement unless the sentence is about the region
  (e.g. "Sindhi villages", "the Punjabi countryside" can be; "a Sindhi verse" is not). Use judgement
  and keep the bar high: a bullet must say something about the province/region IN GENERAL.
- Find page references: chunks carry page markers; locate the PDF page for each hit and apply the
  book's folio rule as stated in its takeaways header. Cite `(p. N, folio F)` or `(p. N, folio not stated)`.
- Read context around every hit (use Grep -C or Read with offset). Large chunks truncate past ~950 lines in one Read — use offsets.

## Rules (RULE 2 — never invent)
- Quote the book's own wording for every date, name, place. Add NOTHING from general knowledge — no
  boundary history, no dates, no glosses the book does not give.
- Every bullet: `(book's word: "..."; refers to: <period as the book states it, or "period not stated">; <register>)`.
  Registers: book's historical prose / author's argument / translation of the poet's verse /
  quoted source (name it) / ethnographic present / author's anecdote — whichever the book's own
  framing shows.
- Material the book places in a part of a historical province now outside Pakistan (Amritsar,
  Jalandhar, Sirhind, Delhi, Indian Kashmir, Jammu, "East Punjab", Gujarat, Rajasthan, Kutch...) does
  NOT take the Pakistani province — list it under a final `### not attached` subsection with the reason.
  An unspecified "Kashmir" also goes to `not attached` (only Azad Kashmir has a row) unless the book itself names the Pakistani part.
- A statement about "Punjab"/"Sind" that is really about ONE named town or site is a toponym, not a
  province bullet — omit it and list it in the closing Doubts line.
- If the book itself marks the unit as historical or differently bounded ("the Mughal suba", "Sind
  under Bombay", "undivided Punjab", "the Sikh kingdom"), carry its wording and note it.
- Carry every `[OCR?]`/`[text-layer?]` damage inline: printed form, then `[text-layer?] [reading]`.
- Index and endnote locators are never a `(p. N)`; cite the PDF page the entry is printed on. Skip
  index/bibliography hits unless they carry substantive text.
- NO bold ids anywhere in this section. No `**id**` heads.
- Zero bullets for a province = omit that subsection; if the whole book has none, write the heading
  and an explicit negative sentence.

## Output
Write ONE file: `out/province_sweep/<slug>.province.md`, starting with the line
`## Province-level material`, then the italic intro (name the chunks swept, the registers used, and
"Every bullet is province-level: weigh accordingly."), then `### province: punjab`, `### province: sindh`,
etc. in that order (only those with content), then `### not attached` if any, then a final paragraph
`*Sweep notes:*` listing: hit counts per term, toponym-only hits you excluded (with page), and any
digits/names you flagged. Nothing else. Do not edit any other file. Do not run Bash.
Report back: bullet counts per province, the file's line count, and anything a human must check.
