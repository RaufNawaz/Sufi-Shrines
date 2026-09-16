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
