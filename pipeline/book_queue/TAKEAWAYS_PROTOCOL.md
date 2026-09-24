# Notes and takeaways protocol (the stage after transcription)

Purpose: turn each finished transcription into research notes that a shrine entry can cite, in the
grouping `tools/summarize_books.py` already uses, with a page reference on every claim. Two passes:
**chunk notes** (one worker per chunk) and **consolidation** (one worker per book).

The archive's editorial rule applies to every line you write: **never invent content** (CLAUDE.md
RULE 2). Report what the book says, including where it contradicts itself or other sources. Write
nothing from general knowledge: if you know a date the book does not give, leave it out.

## Pass 1 — chunk notes

Input: `out/ocr/<slug>/chunks/chunk_NNN.txt`, a slice of the transcription with `[p. N]` markers
(N = PDF page index, 1-based). Urdu chunks may also carry `[folio N]` lines (the printed page
number) and `[OCR?]` / `[illegible]` flags left by the transcriber.
Reference: `pipeline/book_queue/shrine_index.tsv` (id, name, location, principal figure of the 169
archive rows). Read it once.
Output: `chunk_NNN.notes.md` beside the chunk, in **English**, in this shape:

```
# <slug> — chunk NNN — pp. A–B
## Shrines and figures in the archive
- **<archive id>** (<book's name for the saint or site>): what this chunk says about them, one
  bullet per fact, each ending with a page reference like (p. 27) or (p. 27, folio 42). Quote a
  short phrase in the original script where wording matters, e.g. a date as printed: "۱۰۰۸ھ" (p. 70).
## Other saints, sites and events (not in the archive)
- one bullet per distinct figure or place with what is said, page referenced. Keep this brief.
## Practices, institutions, economy
- urs and mela, langar, offerings, custodianship (sajjada nashin, Auqaf, family), endowments, land,
  revenue, visitor numbers, disputes, state involvement, architecture and building dates: page referenced.
## Legends and miracles (karamat)
- one line each, page referenced, attributed as the book attributes them.
## Arguments and interpretations (academic books)
- the author's claims and evidence in this chunk, page referenced; for a primary source, the
  author's own judgements ("the author disputes…").
## Citable passages
- up to five short quotations (under 25 words each) worth quoting in an entry, with page and,
  for Urdu, the original script followed by a plain English gloss.
## Doubts
- anything the transcriber flagged `[OCR?]`/`[illegible]` that affects a fact above; any internal
  contradiction; anything you could not place.
```

Rules: omit an empty heading; keep the transcriber's flags on any word you carry over; write
"(not stated)" rather than filling a gap; do not translate whole passages; do not add background
the chunk does not contain. Mapping to an archive id is a judgement — when a name could be two rows
(Shah Jamal of Lahore vs. another Shah Jamal), say so under Doubts rather than picking one.

**Mapping a person, ruled 18 September 2026 (Rauf, in chat).** A person who is an archive row's
principal figure takes that row's bold id **even where the book names them only as an author or a
literary reference** — Hujwiri quoted for a saying, Iqbal for a doctrine, Bulleh Shah named as a
contemporary poet, Sachal Sarmast as a contrast. The reason is the one that settles it: the shrine
descriptions are written and updated *from these books*, so an author-only mention is material for
that row's entry, and parking it under "Other saints, sites and events" loses exactly what the notes
exist to collect. Record only what the book actually says, in the book's own words, with its page —
"named as the Panjabi contemporary" is a legitimate whole bullet — and add a Doubts line where the
evidence is a bare name, so the consolidator can weigh it. Do not enrich it: a tomb, a date or a
silsila the chunk does not give stays out (RULE 2).

**Both mapping questions were RULED by Rauf in chat on 21 September 2026, and the many-row PERSON
sub-case on 22 September 2026. None of them is interim.**

**(a) A bare TOPONYM takes the id of EVERY archive row in that place.** Rauf, 21 September 2026: *"so if
a book has information on multan in general then all the shrines in multan have to have that because it
is part of multan's tradition."* The reasoning is that place-level material is part of the tradition of
every site in that place, so it belongs to all of them rather than to none. This **reverses** the earlier
interim convention (which parked bare toponyms under "Other saints, sites and events") and it **replaces**
the old "when a name could match two rows, say so under Doubts instead of picking one" for the *toponym*
case specifically: you no longer pick one and you no longer refuse — you list them all.

How to apply it: look the toponym up in `shrine_index.tsv`'s `location_short` column, and head one bullet
with every matching row's id, e.g. `- **shrine-of-bahauddin-zakariya**, **shrine-of-shah-rukn-e-alam**,
**shrine-of-hafiz-muhammad-jamal-multani**, … (the book's "Multan"): …`. Record the material once, with
its page reference, and add a Doubts line saying the attachment is place-level rather than site-specific,
so a consolidator can weigh it. **Multan has 8 rows, Bahawalpur 5, Islamabad 4, Uch Sharif 5, Lahore
many** — that is expected, not a problem to solve. A toponym with no matching row still goes under "Other
saints, sites and events".

**A PERSON who is the principal figure of MANY rows also takes ALL of them. Ruled by Rauf, 22 September
2026 — this closes the last open mapping sub-case.** Where a person is the principal figure of several
rows and the book names no particular site, head the bullet with **every** row they are principal figure
of, exactly as a toponym does: Guru Nanak takes all 18 gurdwara rows, Shiva 8, Goraknath and Krishna 2
each. Enumerating the candidates under Doubts is **no longer** the answer — map them, and add a Doubts
line saying the attachment is person-level rather than site-specific so a consolidator can weigh it.

The 18 September ruling still governs the ordinary single-row case and is unchanged: a person who is an
archive row's principal figure takes that row's bold id even where the book names them only as an author
or a literary reference.

**With this, every mapping question in this protocol is ruled. Nothing here is interim. Do not
re-litigate (a), (b), the person rule or the many-row sub-case; if one of them seems wrong in a
particular book, record the case under Doubts and say so in the run report — do not quietly deviate.**

**(b) The inline damage marker IS standing convention: do both.** Rauf, 21 September 2026. Mark the
damaged word inline — `[OCR?]` on a tesseract or vision route, `[text-layer?]` on a text_layer route,
printed form first and your reading after it in square brackets — **and** inventory the damage class once
per chunk under Doubts. **The one exemption, also ratified:** damage that is a *total and mechanical*
mapping, such as a typographic ligature (`ﬁ`, `ﬀ`), is inventoried once per chunk and quoted as normal
letters rather than flagged on every token. The test is total-and-mechanical, **not merely systematic** —
qureshi's diacritic loss was systematic but not reversible token by token (you cannot tell a real `l` from
an `ī`), so it got the full inline treatment.



Efficiency: one Read of the chunk, one Read of the index (first chunk only for a given worker),
one Write per chunk. No Bash, no Edit, no re-reading.

## Pass 2 — consolidation

Input: all `chunk_NNN.notes.md` of a book, plus the manifest entry (author, year, group).
Output: `entries/book_takeaways/<slug>.md`, committed to the repo. Shape:

```
# <Short title> — takeaways
*Source: <author>, <title> (<year/edition>). <pages> pages, transcribed <route> on <date>; provenance
in out/ocr/<slug>/. Page references are PDF page indices; folio = printed page number where known.
Reviewed: no.*

## What this book is
Two or three sentences: genre, scope, author's stance, reliability notes (edition, OCR quality).

## Shrines in the archive this book informs
One subsection per archive id, most material first:
### <archive id> — <name>
- merged, deduplicated facts with page references; contradictions kept side by side
- Saint · Shrine / Darbar · Practices & Events · Legends & Miracles · Significance, as sub-bullets
  or short runs, in that order, omitting empty ones

## Cross-cutting material
Practices, institutions, economy, arguments: merged from the chunk notes, page referenced.

## Figures and sites not in the archive
Compact list (name — one line — pages), useful for future rows.

## Citable passages
The best ten to fifteen, page referenced, original script plus gloss for Urdu.

## Doubts and review points
Everything a human must check before a fact enters an entry: OCR flags on names, dates, numerals;
contradictions; placement doubts.
```

Rules: every fact keeps at least one page reference; nothing enters from outside the notes; the
`Reviewed: no.` line stays until Rauf changes it. Then the coordinator runs
`queue.py mark <slug> summarized --file entries/book_takeaways/<slug>.md`.
