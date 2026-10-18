# Pass-2 brief — khulasat_ut_tawarikh (11 Oct 2026, coordinator session_01RUFK6hb2x6R1yGNjF6TF2t, §9.324)

You are ONE of several workers consolidating the 48 Pass-1 chunk notes of `khulasat_ut_tawarikh` into ONE
takeaways document, `entries/book_takeaways/khulasat_ut_tawarikh.md`, per `TAKEAWAYS_PROTOCOL.md` "Pass 2"
(read its Pass 2 section and ruling (c)'s Pass 2 line). Each worker writes only its assigned SECTION
FILES into `/home/claude/p2/out/`. The coordinator assembles them. All inputs are in `/home/claude/p2/`:
extracts in `ext/` (cut by `pass2_extract.py`; every byte of every notes file is in exactly one extract;
each chunk's material is preceded by a line `<!-- from chunk NNN -->`), the raw notes in `notes/` if an
extract makes no sense, `shrine_index.tsv`, `KHULASAT_NOTES_WORKER_BRIEF.md` (the Pass-1 brief: the
book's structure and traps), and `calib_tahqiqat_ABRIDGED.md` (a Pass-2 output for a SIBLING lithograph
book: SHAPE and density only — its facts and folio remarks are LOCAL to that book). No Bash. Read, then Write.

**READ IN SLICES.** A single Read truncates around 950 lines. Read every input with `offset`/`limit`
in slices of ~400 lines until you reach its LAST line (line counts are in your task). Report the last
line number you reached for each file.

## The book (measured at Pass 1 — do not re-measure)

Sujan Rai Bhandari of Batala, *Khulāṣat al-Tawārīkh* (خلاصة التواریخ), a **Persian** history of
Hindustan composed in regnal year 40 of Aurangzeb = 1107 AH (as the Pass-1 notes report it), in the 1918
Delhi lithograph edited by Zafar Hasan. 610 PDF pages, transcribed by the `vision` route from the
lithograph, Sept–Oct 2026. **The scan runs back to front** (PDF 1 = back cover, 610 = front). Chunk map:
001-004 the editor's index and errata (locators only), 004-039 the Muslim rulers from Aurangzeb's accession
back to Sabuktigin, then the Hindu rajas back to the Mahabharata; **040-043 the suba geography** (Kabul,
Kashmir, Lahore, Multan, Thatta, then Indian subas); 044 Bengal-Agra; **045-046 the dervishes / holy men of
Hindustan** and the sciences; 047-048 the author's preface, contents, the editor's introduction.

- **CITATION FORM: `(p. N)` = PDF page. This book cites NO folios.** Never add a folio. An index,
  errata or contents number is quoted as text ("indexed at printed page ۲۹۲"), never turned into a
  `(p. N)` — keep Pass 1's wording.
- **`حاشیہ` / "editor's footnote variant"** = the 1918 editor's MS variants, not the author's statement.
  Keep that label wherever Pass 1 used it.
- **Damage:** the history chunks (≈ pp. 49-428) carry 10-25 `[OCR?]` a page; the late pages 1-4. Carry
  every `[OCR?]` and `[illegible]` flag onto the word it is attached to, exactly as Pass 1 wrote it. Quote
  dates, names and places exactly as Pass 1 quoted them (original script and digits; many dates are in
  WORDS). Eras: Hijri, regnal, Bikrami (سمت), Saka, Kaliyuga — never convert, smooth or reconcile.

## Rules (non-negotiable)

- NOTHING enters that is not in the Pass-1 material you were given. No general knowledge, not even a
  well-known date or identification. "(not stated)" rather than fill a gap.
- Every fact keeps its page reference(s); merging duplicates keeps ALL references.
- Contradictions SIDE BY SIDE, never resolved (known: Prithviraj's reign 15 years p. 433 vs 49 years
  p. 431; the Tughluq pavilion death given as one version against "انچه تحقیق پیوسته" p. 351; the editor
  says MSS 2-4 name the author but the MS 3 colophon he quotes does not — keep these and any others).
- **Ids: only ids that appear verbatim in `shrine_index.tsv` column 1.** Every id of a multi-id bullet
  head stays on ONE physical line, copied from the extract, never retyped, never wrapped.
- **Mappings are FROZEN at Pass 1.** Keep every mapping Pass 1 made, with its Doubts line; do NOT add a
  mapping Pass 1 did not make and do NOT drop or reverse one, and do NOT convert a decline recorded in
  `ext/hedges.md`. Where Pass 1 was inconsistent between chunks, reproduce each chunk's treatment as it
  stands and record the inconsistency for Rauf — choosing one treatment is his decision. The known ones
  (C1 lists them all, A1/A2 tag the affected material with a short `*basis: …*` note):
  1. **Bare index headwords** (chunks 001-004): 002 and 004 mapped index place headwords to their toponym
     ids; 003 left the same kind of headword unmapped. Index-only material says "indexed:" and carries
     locators, not facts.
  2. **Campaign / office / transit mentions** heading place-level groups (Lahore 35, Multan 8, Peshawar 10,
     Sialkot 5, Rawalpindi 6 …; 005, 010, 011, 016, 019, 020, 022, 027-030 and others): tag them
     `*basis: passing / campaign / office mention*` where Pass 1's Doubts say so.
  3. **Contents headings only** (047: Lahore 35, Multan 8).
  4. **"شیخ رکن الدین" → `shrine-of-shah-rukn-e-alam`** by name only (027, 028, 029; never "رکن عالم",
     no tomb named) — and the index's "رکن الدین" left unmapped (003/001-004).
  5. **Bare-name person mappings:** Krishna 2 (037, 038, 043, 047), "راجه پاندو" → `panj-tirath` (038; 036
     and 039 rejected it), Aibak → `tomb-of-qutbuddin-aibak` (002, 016, 032), Jagannath, Shiva 8 (040, 043),
     Nanak Mata → Nanak 18 (045): a deity or saint named at a NON-archive site in India/Kashmir was mapped
     person-level in 040, 043, 045 but not in 041 (the protocol's many-row rule speaks of "where the book
     names no particular site").
  6. **Rohtas:** 009 mapped a bare "در حوالی رهتاس" to `gurdwara-choa-sahib`; 014 left "رہتاس" unmapped;
     019 and 021 mapped "قلعہ روہتاس" (Sher Shah's fort) to it.
  7. **Musa Gilani:** 006 left Dara's governor "شیخ موسے گیلانی" unmapped; 042 mapped the Multan saints'
     "شیخ موسی گیلانی" to `shrine-of-syed-musa-pak`; the book does not say they are one man.
  8. **Shah Abu al-Maali:** left unmapped against `darbar-abul-muali-qadri` in 019, 020, 048 and the index.
  9. **Multan as province or city:** 024 and 038 filed "ولایت ملتان" / "ولایت تهته وملتان وپنجاب" as
     PROVINCE punjab (+sindh), not as the 8 Multan rows; other chunks used the 8 rows.
  10. **013's Guru Arjan** visit at a "منزل" beyond the Beas (outside Pakistan by the route) kept on his 3 rows.
  11. 014's Eminabad 3 rests on the spelling "امن آباد" alone; 041's Sakhi Sarwar site at Dhonkal near
      Sialkot is not the row's site; 041's "Gobind Rai" → `gurdwara-dash-mesh-pita`; 042's name-only matches
      (`darbar-malik-ahmad-ayaz`, `loh-temple-lava-temple`, `ram-mandir-saidpur-ram-kund-mandir`,
      `churrio-jabal-durga-mata-temple`, `gurdwara-rori-sahib` via Mardana, `gurdwara-guru-ram-das-ji`);
      Talwandi taken as Nankana Sahib's 7 rows (042) but 026's two "تلوندی" not linked.
- **Formerly held identities (lifted by Rauf 10 Oct 2026, attached as each book's claim — still never
  resolve them here):** `langer-makhdoom` (Shah Burhan at "چندتوت[OCR?]", Chiniot); the Uch Jalal /
  Jahaniyan split ("سید جلال بخاری" put on the Surkh-Posh row by name, 042); `shrine-of-shah-shams-ud-din-sabzwari`
  ("Shams"). Keep each with its Doubts line.
- Deccan and other non-Pakistan sites take no row (Rauf, 10 Oct 2026); they belong in Figures, briefly.

## Split — by OUTPUT section. Your task message says which worker you are.

- **A1** → `out/A1_archive_single.md`: `## Shrines in the archive this book informs`, a one-line italic
  orientation, then one `### <id> — <the book's name for it, as quoted>` subsection per id in
  `ext/archive_single.md` (31 ids), MOST MATERIAL FIRST. Under each: Saint · Shrine / Darbar ·
  Practices & Events · Legends & Miracles · Significance as bold-labelled runs of bullets in that order,
  omitting empty ones; merged and deduplicated across chunks, every page kept, index lines kept as
  "indexed:" lines. A first bullet per subsection with any mapping Doubts Pass 1 recorded for it (from
  `ext/hedges.md`, which you also read — only to know the mapping caveats; do not convert anything), and
  a `*basis: …*` tag where the attachment rests on a bare name, an index headword or one of items 1-11.
- **A2** → `out/A2_archive_groups.md` and `out/A2_province.md`. From `ext/archive_place.md`: the
  place-level and person-level MULTI-ID bullets, grouped by identical id set. One `### <label>
  (place-level|person-level: N rows)` subsection per distinct id set (e.g. `### Lahore (place-level:
  35 rows)`) — the heading's N MUST equal the number of ids on the line below it — the full bold id line
  directly under the heading ON ONE PHYSICAL LINE copied verbatim from a bullet head, then a first line
  saying the attachment is place-/person-level and what kinds of mention it rests on, then the merged
  material grouped by topic, all pages, each passing / campaign / office / index / contents mention
  tagged `*basis: …*`. Where the same id set is printed in different orders or with one id more or less,
  treat each distinct SET as its own subsection and note the near-match. A2_archive_groups.md has NO
  `##` heading (it continues A1's section). `A2_province.md`: `## Province-level material` with one
  `### province: <key>` per province from `ext/s_province_level_material.md`, each bullet keeping its
  stated period (the Mughal suba wording as printed), the book's word, and page; plus a `### not
  attached` subsection if Pass 1 recorded province material it declined to attach (outside Pakistan,
  Kashmir valley, etc.). Do not copy province material under each row.
- **F1** / **F2** → `out/F1_figures.md` / `out/F2_figures.md`: `## Figures and sites not in the archive`
  (F1 writes the `##` heading; F2 does NOT) from `ext/s_other_part1_c001-025.md` (F1) or
  `ext/s_other_part2_c026-048.md` (F2). Use EXACTLY these `###` subsections, in this order, both
  workers, so the coordinator can merge them:
  `### Muslim saints, dervishes, shrines and khanqahs`,
  `### Mosques, madrasas and Muslim religious foundations`,
  `### Tombs and burials of rulers, nobles and families (no cult recorded)`,
  `### Hindu temples, tirthas, deities and holy men`,
  `### Sikh, Udasi, Jogi and other sectarian sites and figures`,
  `### Forts, cities, rivers, gardens and secular sites`,
  `### Rulers, officials, scholars and families not tied to a site`,
  `### Sites and figures outside Pakistan`.
  One bullet per figure/site: the name as printed (with flags) — what the book says in one or two lines
  (dates exactly as printed) — ALL pages. Where the line itself places the site inside present Pakistan
  only because the book names a Pakistani place (Lahore, Multan, Thatta, Uch, Sehwan, Bhakkar, Attock,
  Jhang …), start the bullet with `[PK? — book's place: <as printed>]`; never infer location from general
  knowledge. Merge the same figure/site within your half into ONE bullet. Compact, but lose no dated fact
  and no page.
- **B1** → `out/B1_crosscutting.md`: `## Cross-cutting material` and its subsections from
  `ext/s_practices_institutions_economy.md`, grouped by theme (e.g. revenue, mahals, dam and jagirs of the
  subas; land, waqf, madad-i ma'ash and grants to religious men; rulers and shrines — visits, pilgrimages,
  building, endowments, destruction; temples, tirthas, fairs and pilgrimage; Hindu and sectarian orders —
  Sannyasis, Jogis, Bairagis, Udasis, Nanakpanthis; crafts, trade, agriculture, irrigation; the author,
  his sources and the editor). Deduplicated, all pages kept. No `##` beyond the one.
- **B2** → `out/B2_whatis.md`, `out/B2_args_legends.md` and `out/B2_citable.md`.
  `B2_whatis.md`: `## What this book is` — 4-6 sentences from `notes/chunk_047.notes.md`,
  `notes/chunk_048.notes.md`, `notes/chunk_001.notes.md` and the first ~10 lines of each
  `notes/chunk_NNN.notes.md`: genre, scope, the author and editor as the book presents them, structure
  (back-to-front scan), and reliability (vision transcription of a lithograph, damage, PDF-page citations
  only, numerals unreliable, editor's footnotes are MS variants). `B2_args_legends.md` (NO `##` heading;
  it continues B1's section): `### Legends and miracles (karamat)` from
  `ext/s_legends_and_miracles_karamat.md`, one line each, attributed as the book attributes them, grouped
  by saint/site; and `### The author's judgements and interpretations` from
  `ext/s_arguments_and_interpretations_academic_b.md` (the author's own judgements, his sources, his
  explanations of names and legends; the editor's remarks kept apart). `B2_citable.md`:
  `## Citable passages` — the best twelve to fifteen from `ext/s_citable_passages.md` (prefer archive rows
  and Pakistani sites: Lahore, Multan, Uch, Thatta, Sehwan, Hinglaj, Pakpattan, Sakhi Sarwar, Shah Daula,
  Nanak; then the author's own voice), original script exactly as Pass 1 quoted it with every flag, then a
  plain English gloss, page referenced.
- **C1** → `out/C1_doubts.md`: `## Doubts and review points` from `ext/s_doubts.md` (2208 lines; and
  `ext/hedges.md` is a second view of the same bytes — use it to make sure every mapping decline is
  listed). Grouped subsections: `### Mapping inconsistencies and formerly held identities for Rauf` (the
  list in the rules above, plus any others you find, ids kept, chunks named), `### Archive mappings and
  declines` (every hedge, ids kept, deduplicated), `### Contradictions` (side by side), `### Dates and
  numerals`, `### Names`, `### Damaged and unreadable text that destroys a fact`, `### Structural and
  transcription artefacts` (back-to-front page joins, rough seams, index locators vs PDF pages, editor's
  footnotes), `### Other`. Deduplicate across chunks but keep every distinct item and every page. This
  section may be long — that is expected.

When done, reply in at most 8 lines: files written, byte counts, the last line number you reached in
each input, number of `###` subsections and bullets, and any problem (an id not in the tsv, a fact you
could not place).
