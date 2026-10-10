# Pass-2 brief — tahqiqat_chishti (9 Oct 2026, coordinator session_01FTAepxtGSXhyEnCRDgp59w, §9.279)

You are ONE of several workers consolidating the 79 Pass-1 chunk notes of `tahqiqat_chishti` into ONE
takeaways document, `entries/book_takeaways/tahqiqat_chishti.md`, per `TAKEAWAYS_PROTOCOL.md` "Pass 2"
(read its Pass 2 section and ruling (c)'s Pass 2 line). Each worker writes only its assigned SECTION
FILES into `/home/claude/p2/out/`. The coordinator assembles them. All inputs are in `/home/claude/p2/`:
extracts in `ext/` (cut by `pass2_extract.py`, every byte of every notes file in exactly one extract;
each chunk's material is preceded by a line `<!-- from chunk NNN -->`), the raw notes in `notes/` if an
extract makes no sense, `shrine_index.tsv`, `calib_tareekh_lahore_ABRIDGED.md` (a Pass-2 output for a
SIBLING Lahore book, Kanhaiya Lal's *Tarikh-e-Lahore*: SHAPE and density only — its folio citations are
LOCAL to that book and must NOT be imitated here). No Bash. Read, then Write.

**READ IN SLICES.** A single Read truncates around 950 lines. Read every input with `offset`/`limit`
in slices of ~400 lines until you have reached its LAST line (line counts are given in your task).
Report the line count you reached for each file.

## The book (measured at Pass 1 — do not re-measure)

*Tahqiqat-e Chishti* (تحقیقات چشتی), an Urdu survey of Lahore's shrines, tombs, mosques, temples,
gurdwaras, gardens and families, by a Chishti maulvi of Lahore. Manifest: author "Noor Ahmad Chishti
(to confirm)", "1867 original; DLI scan 2015.315235" — neither confirmed by the notes unless a chunk
quotes it. 873 PDF pages, transcribed by the `vision` route from a scribal Nastaliq lithograph,
22 Sep – 3 Oct 2026. Chunk 001 = table of contents + preface; 073-077 = general dynastic history;
078 = Jahangir / Asif Khan / Nur Jahan tombs; 079 = afterword.

- **CITATION FORM: `(p. N)` = PDF page. This book cites NO folios** (they were read once each off a
  scribal lithograph, the offset wanders, and contested ranges exist). Never add a folio. Never turn a
  table-of-contents number into a `(p. N)` — Pass 1 quoted ToC numbers as text at the PDF page the ToC
  line is printed on; keep them that way.
- **Damage is heavy.** Carry every `[OCR?]` and `[illegible]` flag onto the word it is attached to,
  exactly as Pass 1 wrote it. Quote dates, names and places exactly as Pass 1 quoted them (original
  digits and script). Never convert, smooth or reconcile a date.

## Rules (non-negotiable)

- NOTHING enters that is not in the Pass-1 material you were given. No general knowledge, not even a
  well-known date or identification. "(not stated)" rather than fill a gap.
- Every fact keeps its page reference(s); merging duplicates keeps ALL references.
- Contradictions SIDE BY SIDE, never resolved (known: Zakariya Khan's father Abdus Samad Khan pp. 714,
  716 vs "ابو محمد خان" p. 719; Masjid Chiniyan's founder; hammam 1056 vs mosque 1046; samvat 183 vs
  1830; Gulab vs Gulzar Singh; the 1865/1895 reburial deed — keep these and any others you meet).
- **Ids: only ids that appear verbatim in `shrine_index.tsv` column 1.** Every id of a multi-id bullet
  head stays on ONE physical line, copied from the extract, never retyped, never wrapped.
- **Mappings are frozen at Pass 1.** Keep every mapping Pass 1 made, with its Doubts line; do NOT add a
  mapping Pass 1 did not make and do NOT reverse a decline recorded in `ext/hedges.md`. Where Pass 1
  was inconsistent between chunks (Shahid Ganj: mapped in 010, left unmapped in 065/070/079; Ayaz:
  mapped to `darbar-malik-ahmad-ayaz` in 073/079 but not in 064/066/075; "گجرات" mapped in 079, not in
  073; the bare "قصور" → `mazar-of-bulleh-shah` in 065/073), reproduce each chunk's treatment as it
  stands and record the inconsistency for Rauf — choosing one treatment is his decision.
- **Held identity questions — never resolve:** `langer-makhdoom`; whether `shrine-of-baba-shah-chiragh`
  conflates two men ("سید عبد الرزاق پاک" 071, "جنگلی چراغ شاہ" 064, "سید چراغ شاہ" 079 were left
  unmapped); the two Shah Inayats; Bulleh Shah's death year.
- Drop the stray placeholder line in chunk_068 (`- "دیوان"? none. …`) — it is not content.

## Split — by OUTPUT section. Your task message says which worker you are.

- **A1** → `out/A1_archive_single.md`: `## Shrines in the archive this book informs`, a one-line italic
  orientation, then one `### <id> — <the book's name for it, as quoted>` subsection per id in
  `ext/archive_single.md` (42 ids), MOST MATERIAL FIRST. Under each: Saint · Shrine / Darbar ·
  Practices & Events · Legends & Miracles · Significance as bold-labelled runs of bullets in that order,
  omitting empty ones; merged and deduplicated across chunks, every page kept, ToC lines kept as ToC
  lines. A first bullet per subsection with any mapping Doubts Pass 1 recorded for it (from
  `ext/hedges.md`, which you also read — only to know the mapping caveats; do not convert anything).
- **A2** → `out/A2_archive_groups.md` and `out/A2_province.md`. From `ext/archive_place.md`: the
  place-level and person-level MULTI-ID bullets, grouped by identical id set. One `### <label>
  (place-level|person-level: N rows)` subsection per distinct id set (e.g. `### Lahore (place-level:
  35 rows)`), the full bold id line directly under the heading ON ONE PHYSICAL LINE copied verbatim
  from a bullet head, then a first line saying the attachment is place-/person-level, then the merged
  material grouped by topic, all pages. Where the same id set is printed in slightly different orders
  or with one id more or less, treat each distinct SET as its own subsection and note the near-match.
  A2_archive_groups.md has NO `##` heading (it continues A1's section). `A2_province.md`: `##
  Province-level material` with one `### province: <key>` per province from
  `ext/s_province_level_material.md`, each bullet keeping its stated period, the book's word, and page;
  plus a `### not attached` subsection if Pass 1 recorded province material it declined to attach.
  Do not copy province material under each row.
- **F1** / **F2** → `out/F1_figures.md` / `out/F2_figures.md`: `## Figures and sites not in the archive`
  (F1 writes the `##` heading; F2 does NOT) from `ext/s_other_part1_c001-040.md` (F1) or
  `ext/s_other_part2_c041-079.md` (F2). Use EXACTLY these `###` subsections, in this order, both
  workers, so the coordinator can merge them: `### Muslim saints, shrines, khanqahs and takias`,
  `### Mosques and madrasas`, `### Graveyards and tombs of rulers, nobles and families (no cult recorded)`,
  `### Hindu temples, shivalas, thakurdwaras, samadhs of Hindu figures`, `### Sikh, Udasi and Jain sites`,
  `### Gardens, gates, bazaars, mohallas, wells, baths and secular sites`, `### People (rulers, officials,
  scholars, families) not tied to a site`, `### Places outside Lahore`. One bullet per figure/site: the
  name as printed (with flags) — what the book says in one or two lines (dates exactly as printed) —
  ALL pages. Merge the same figure/site across chunks into ONE bullet. Compact, but lose no dated fact
  and no page.
- **B1** → `out/B1_crosscutting.md`: `## Cross-cutting material` and its subsections from
  `ext/s_practices_institutions_economy.md`, grouped by theme (e.g. custodianship and sajjada nashini;
  waqf, jagir, muafi and land; offerings and income; the state and religious property — grants,
  demolition, confiscation, repair; urs, mela, rites and langar; building, repair and dating;
  the author's family and his own position). Deduplicated, all pages kept. No `##` beyond the one.
- **B2** → `out/B2_whatis.md` and `out/B2_args_legends.md` and `out/B2_citable.md`.
  `B2_whatis.md`: `## What this book is` — 4-6 sentences from `notes/chunk_001.notes.md`,
  `notes/chunk_079.notes.md` and the chunk-opening paragraphs (read the first ~10 lines of each
  `notes/chunk_NNN.notes.md`): genre, scope, the author as the book presents himself, structure, and
  reliability (vision transcription of a scribal lithograph, heavy damage, PDF-page citations only,
  numerals unreliable). `B2_args_legends.md` (NO `##` heading; it continues B1's section):
  `### Legends and miracles (karamat)` from `ext/s_legends_and_miracles_karamat.md`, one line each,
  attributed as the book attributes them, grouped by saint/site; and `### The author's judgements and
  interpretations` from `ext/s_arguments_and_interpretations_academic_b.md`. `B2_citable.md`:
  `## Citable passages` — the best twelve to fifteen from `ext/s_citable_passages.md` (prefer archive
  rows, the state and religious property, the author's own voice), original script exactly as Pass 1
  quoted it with every flag, then a plain English gloss, page referenced.
- **C1** → `out/C1_doubts.md`: `## Doubts and review points` from `ext/s_doubts.md` (and `ext/hedges.md`
  is a second view of the same bytes — use it to make sure every mapping decline is listed). Grouped
  subsections: `### Mapping inconsistencies and held identities for Rauf` (the list in the rules above,
  plus any others you find, ids kept, chunks named), `### Archive mappings and declines` (every hedge,
  ids kept, deduplicated), `### Contradictions` (side by side), `### Dates and numerals`,
  `### Names`, `### Damaged and unreadable text that destroys a fact`, `### Structural and
  transcription artefacts` (ToC-number vs PDF-page, suppressed duplicate pages, chunk seams),
  `### Other`. Deduplicate across chunks but keep every distinct item and every page. This section may
  be long — that is expected for this book.

When done, reply in at most 8 lines: files written, byte counts, the last line number you reached in
each input, number of `###` subsections and bullets, and any problem (an id not in the tsv, a fact
you could not place).
