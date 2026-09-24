
### 9.NNN — 20 September 2026: Kasmani's *Queer Companions* fully noted at 12/12, a folio rule that held on every page, and the richest shrine in the book has no archive row

`kasmani_queer_companions` (priority 111, Omar Kasmani, *Queer Companions: Religion, Public Intimacy,
and Saintly Affects in Pakistan*, Duke University Press 2022, 225 pp., text_layer route, 12 chunks)
has **Pass 1 notes on every chunk**, written from zero in this run. Twelve workers, two waves of six,
all inputs staged into the container up front; the bridge did not drop once. `notes-status` reports
`{"chunks": 12, "notes_missing": [], "notes_present": 12}`, exit 0. Measured across the twelve files:
**2,218 page references**, **11 distinct archive ids, zero invalid**, ~103,000 words of notes, 74
`[text-layer?]` flags and 109 explicit `folio not stated` citations. Full run record in
`shrines/23_Cloud_OCR_Run_2026-09-20_kasmani_queer_companions.md` in the attached project.

The eleven ids: `lal-shahbaz-qalandar` (all twelve files), `bibi-pak-daman` and `data-darbar` and
`shrine-of-fariduddin-ganjshakar` (two files each), and `bhit-bhit-shah`,
`dargah-roza-sufi-shah-inayat-shaheed`, `madho-lal-hussain`, `shrine-of-abdullah-shah-ghazi`,
`shrine-of-bahauddin-zakariya`, `shrine-of-jalaluddin-surkh-posh-bukhari-jalaluddin-bukhari`,
`shrine-of-sachal-sarmast` (one each). Every one but the first rests on a bare name, a bibliography
title or a single clause, and every one carries a Doubts line saying so.

**The folio rule was measured before the workers ran and then held on every page any worker read —
the first time in this corpus that has happened.** Relation: **printed folio = PDF page − 17**,
continuous from p. 19 (folio 2) to p. 225 (folio 208), with front matter pp. 13–17 printing roman
xii–xvi instead (that band is PDF − 1). Pre-measured over 193 pages by scanning first and last
non-empty lines; the three apparent mismatches were all false positives (a contents line, a note
number, an index locator). Twelve workers then read the folio off their own pages and **not one
found a contradiction**. The parity rule also held everywhere: **verso (odd PDF page) prints the
folio first, recto (even PDF page) prints it last.** Eight pages print no folio and all eight are
named rather than predicted — pp. 1–12 and 18 (front matter and Introduction opener), p. 22
(a plate leaf with an empty text layer), p. 47 and p. 106 (full-page maps), pp. 53, 77, 101, 124,
147, 169, 182, 198, 202 (chapter, coda, notes, glossary and references openers), p. 201 (blank).
**But a plate page is not automatically headerless here** — p. 161 is dominated by a full-width
plate and prints its folio, 144. This is the §9.210/§9.212 lesson landing the right way round for
once: the relation was cheap to measure, the instruction was still "read it off your own page,
never compute it", and the two together cost nothing and would have caught a wrong rule.

**Two more running-header traps, and one of them is the third occurrence of the same failure mode.**
(1) **The References pages carry the folio in a far-right *footer*, not a header** — a first-line
header scan would report all fifteen as headerless, exactly as §9.212's index band did and §9.211's
roman front matter did before that. **Three books, three sections, one instrument.** `folio_map.py`
should be assumed blind to any section whose folio is not on the first line until it is fixed.
(2) **The Notes section's running foot mis-files a whole chapter.** It names the section the page
*ends* in on recto pages but the section the page *begins* in on verso pages, so the string
`Notes to chapter three` is **never printed** even though chapter three's notes 1–18 are, and
chapter one's notes 1–11 sit under a foot reading `Notes to introduction`. **Any script assigning
notes to chapters from the running header is wrong for chapters one and three in this book.** The
worker took every chapter attribution from the printed section headings inside the notes instead.

**The richest institutional material in the book belongs to a shrine the archive does not hold.**
**Bodlo**, in Sehwan — named 168 times across the notes — has his own shrine ("the second most
important site for pilgrims in Sehwan today", p. 21, folio 4), his own fakir lodge, a named
custodian line claiming descent from the saint's brother, a dismemberment legend, daily *dhamal*,
a bazaar economy, a saying that compels pilgrims to visit him before Lal, and **an Auqaf court
case**: "the shrine of Bodlo, despite its economic viability and promise, was secured back through
a court case when the Pakistani state had sought to take control of the shrine under the Department
of Auqaf" (p. 142, folio 125). **Chapter 4 of this book is set at his shrine.** He is not among the
169 rows, and `shrine-of-lakhi-shah-saddar` — the only other Sehwan-area row — is never mentioned
in the book at all. Two further named Sindh shrines are likewise unheld: **Juman-Jatti**, whose
shrine is "half-fallen" from repeated flooding (chunk 009), and **Gaji-Shah**, a small village
shrine (chunk 006). **Whether Bodlo gets a row is Rauf's call and is asked in the chat, not parked
here (RULE 5).** If it is ever added, chunks 007, 008 and 009 must be re-mined in full; the workers
were explicitly warned not to let Bodlo's material drift onto `lal-shahbaz-qalandar`, and did not.

**The book's own dates for its own saint are thinner than the archive's row, and one of them is not
the author's.** Kasmani gives "Laʿl Shahbaz Qalandar (d. 1274 ce, henceforth Lal)" (p. 20, folio 3)
and "1272 ce" as the more reliable *arrival* year in Sehwan, plus "the last year or two of his life"
(p. 62, folio 45). **The birth year 1177 appears only in the Library of Congress cataloguing block
on p. 5 — "Qalandar Lal Shahbaz, 1177–1274" — and must be cited as the Library of Congress's, never
as Kasmani's.** After p. 20 the book prints the saint's name in full almost nowhere: in eight of the
twelve chunks he is only ever "Lal", and chunks 006, 007 and 008 map him on the short form plus
Sehwan. The name is also printed three ways in two pages — `Lal Shahbaz Qalandar` and
`Lal Shahbaz Qalander` in the LC data against the author's `Laʿl Shahbaz Qalandar` — while the
orthography note declares diacritics minimised (p. 10). **No chunk gives him a silsila or an ʿurs
date**, and the 2017 bombing is dated in chunk 001 ("16 February 2017", "More than eighty people
were killed", p. 28, folio 11) but left undated in chunks 002 and 006, which say only "a year
earlier" than a February 2018 visit. Institutional dates that are clean: the 1959 federal ordinance
and the takeover from traditional custodians "on June 24, 1960" (p. 61, folio 44).

**The glossary is a termbase and was recorded complete: 56 headwords, definitions verbatim,
page-referenced** (15 on p. 198, 22 on p. 199, 19 on p. 200), alphabetically continuous with no loss
at the page joins. **The explicit negatives are as useful as the entries: the book does not gloss
*malang*, *dargah*, *mazar*, *langar*, *qawwali* or *baraka*.** The References are a
**Lal Shahbaz Qalandar corpus** — 18+ entries including four Government of Sindh Department of
Culture imprints and a West Pakistan Government Press item — plus one pre-modern primary source,
`Namkin, Yusuf. (1634) 2009. Tarikh Mazhar Shahjahani`, Jamshoro: Sindhi Adabi Board, and a
colonial Burnes 1837 / Burton 1851 / Cunningham 1871 layer. A citation-completeness check was run
across the notes and the References and passed.

**The index's two columns are interleaved line by line by the text layer, and five entries are
therefore reconstructions.** `Amma`, `fakir women`, `Lal`, `saint's fairs (mela)` and
`shrine of Sehwan` are recorded with their splice points named; in the `Amma` entry the locator
`photographs, 63` has its word and its number in **different columns** and needs image confirmation.
**Italics are wholly lost**, so the index's own rubric "Page numbers in italics refer to figures"
**cannot be applied to a single locator in the chunk** — a finding aid whose figure references are
unrecoverable. The index prints no `urs`, `langar`, `malang` or `sama` headword, indexing
`saint's fairs (mela)` and `drumming rituals (dhamal)` instead; **but eight works in the References
have no index entry at all, which the worker used as in-chunk proof that an absent headword is not
evidence the book is silent.** Every index locator is a **printed folio, not a PDF index**, and the
notes say so on their face. Two digit problems, both recorded as printed and neither repaired:
`127n32` printed identically twice (pp. 222 and 223) and falling outside the index's 165n–180n note
band — more likely the book's own misprint for `177n32` than text-layer damage — and a **descending,
impossible page range** in a citation, `143 – 14` (p. 203, folio 186), in an entry that also prints
the saint's name as `Qalandar Lʿal Shahbaz` with the ʿayn displaced.

**Text-layer damage profile for this book, five classes, none repaired.** This layer is markedly
cleaner than Kugle's or Rizvi's — **no proper name, year or numeral is destroyed anywhere in 225
pages** — and the damage is structural rather than glyph-level. (1) Soft hyphens (U+00AD) rendered
inside words **including words that are not hyphenated in print** — `Seh­wan`, `grand­father`,
`homo­sociality`, `Naj­mabadi` — so a name search over the text misses those occurrences silently;
"Sehwan" is split across the pp. 88–89 break this way. (2) **Endnote numbers fused to the preceding
word or numeral with no space and no superscript — the one class that reads as data.** The worst
instance is `on June 24, 1960.11`, where the date is correct and the `11` is a note; also
`(1998, 27).18`, `1970s.34`, `(Karamustafa 2015, 118).23`, `privately run.4`. Every worker stripped
these from quotations, and genuine parenthetical citations (`Ridgeon 2010, 248 – 49`) were kept.
(3) **Small capitals rendered lowercase** — `ce` for CE and `id` for ID, the latter readable as the
psychoanalytic term and not. (4) **A glossary-only class**: the two-column layout opens a space
inside the headword after the soft hyphen (`be-­s har`, `sajdah-­g ah`, `sajjadah-­n ashin`) and
splits the ʿayn off its word (`ʿ ishq`, `ʿ urs`, and `shari atʿ` with the ʿayn moved to the end).
(5) **Four URLs and one DOI broken** by inserted spaces or a soft hyphen inside a hostname.
The single Perso-Arabic line in the book is damaged both times it appears: `| قُربqurb[text-layer?]`
(p. 18) and `| صحبتsuhbet` (p. 169), script fused to transliteration behind a stray vertical bar —
**both pages should be read as images before either word is reproduced.**

**The deity question now has a large reversible corpus behind it, and this book is the strongest
case for settling it.** §9.208's third unruled question — whether a Hindu deity can be an archive
row's principal figure — fires in **eleven of the twelve chunks**. Every worker refused and named
the candidate rows: Shiva (8 rows) at the tomb and as the temple said to have stood where Lal's
shrine now stands; Jhule Lal / Udero Lal (3 rows — `jhollay-lal-mandir`,
`darya-lal-mandir-darya-lal-sankat-mochan-mandir`, `shrine-at-odero-lal-udero-lal-teerath-asthan`);
Krishna (2 rows); Ram, Varuna, Devraj. **Note that a reversal would still not resolve Jhule Lal or
Krishna to a single row**, so ruling the question open does not by itself make those mappings
mechanical. Intro n. 37 (p. 185, folio 168) is the sharpest single instance: it names Udero Lal,
Jhule Lal and Shaykh Tahir together, and two of those are the exact `principal_figure` cell of
`shrine-at-odero-lal-udero-lal-teerath-asthan`.

**Hinglaj checked in every chunk and absent from all twelve, so the archive's empty-id defect did
not bite and no id was invented.** `check_note_ids.py` confirms it independently, printing
`168 rows with an id, 1 with an EMPTY id cell ['Shaktipeeth Shri Hinglaj Mata Mandir']` on every
run — the check names the defect out loud, which is the right behaviour and worth keeping.

**A measurement gotcha of my own, recorded because it is the project's favourite failure and it
nearly landed again.** My first `check_note_ids.py` call passed a *directory* instead of
`<shrine_index.tsv> <notes_file> …`, so the script printed its usage — and the shell reported
`exit=0`, which looks exactly like a pass. **The script was innocent.** It exits 1 on bad usage and
2 on a real failure, both verified afterwards with a fake-id probe (`- **data-darbar**,
**totally-fake-id-xyz**` → exit 2, id named). The false green came from writing
`python3 … | tail -20; echo "exit=$?"`: **`$?` after a pipeline reports the LAST command in it**, so
I measured `tail`'s exit code, not python's. Never put a check behind a pipe and then read `$?`;
use `PIPESTATUS[0]`, or run the check bare. The instrument was fine and the reading of it was not —
the same shape as §9.212's folio brief, one level down.

**Pass 2 still not run, and kasmani is now the sixth book waiting on it.** sorley (24 chunks),
schimmel (16), kugle (22), ernst_lawrence (17), rizvi (28) and kasmani (12) are all fully noted and
all held on the same unanswered decisions: (a) the bare toponym, (b) the inline damage marker, and
§9.208's deity question. **All twelve chunks are reversible** — every withheld toponym names the row
it would take (`Lahut`/`Lahut-­lamakan` → `shah-noorani-shrine-syed-bilawal-shah-noorani`, twice
independently; `Lakki`/`Lakkiyari` → `shrine-of-lakhi-shah-saddar`, three times; Multan, Lahore,
Karachi, Sargodha and Sindh each named with the finding that a reversal would still not pick one of
the archive's 30+ Lahore or 11 Karachi rows), and every refused deity names its candidates.
**Next by priority with missing notes: 112 `boivin_hindu_sufis_south_asia`** (253 pp., text_layer) —
and note that Boivin is the single most-cited author in this book's References, so the two books
should be consolidated with each other in view. Then 113–123 and `nizami_revised_translation` (210).

**Housekeeping.** All twelve notes files written to **both** locations required by §9.195 —
`entries/book_takeaways/kasmani_queer_companions/` (committed) and
`out/ocr/kasmani_queer_companions/chunks/` (what `notes-status` and `compile_findings.py` read) —
and `cmp`-verified identical pairwise, with md5s matched against the cloud originals on both waves.
The bridge was up for the whole run; no recovery copies were needed. **`state.json` carries no line
from this run** — no `mark` was issued, because Pass 2 is held; its md5 and mtime are unchanged from
the transcription task's 19 Sep 23:09Z write, checked either side. No `git` command of any kind was
run on the mount. **Work is uncommitted: Rauf must run `git add -A && git commit` himself.** Nothing
pushed.
