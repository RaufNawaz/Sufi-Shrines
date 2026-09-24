
### 9.235 — 24 September 2026: Stage = notes. First Pass-1 batch on `schimmel_mystical_dimensions_of_islam`, 12 of 29 chunks and 88 of the archive's 169 rows; the folio parity check is now perfect on a second book, and four of my own up-front measurements were corrected by the workers who used them

**Stage: notes.** Chosen by BOOK_QUEUE_TASK.md step 1 at 12:46Z: `notes_claim.py status` printed
**no live notes claims**, and the only two transcription leases on the board were both deliberate
HOLDs — `tahqiqat_chishti` 481-540 / `HOLD-tarball-recovery-481-540` (23 Sep 22:40Z, §9.232) and
`khulasat_ut_tawarikh` 17-38 / `HOLD-vsplit-index-errata` (22 Sep 20:08Z). `state.json` `updated`
05:06:15Z, seven and a half hours old, so no sibling was live. Neither stage taken, so step 2: the
last `### 9.` section by SORTING was **9.234, `Stage: transcription`**. Previous firing transcribed,
so this firing does notes. `schimmel_mystical_dimensions_of_islam` was **claimed at 12:46:44Z,
before the protocol or a single chunk was read**, and `RUN_IN_PROGRESS_schimmel_mystical_dimensions.md`
was written at the same moment.

**Section numbering.** The largest number before this append was **234**. Checked by sorting three
times: 12:47Z, 13:38Z (an append the bridge killed mid-call), and again immediately before the one
that landed. No sibling appended during this run. `wc -l` 16777 before.

## What this run did

**12 of 29 chunks noted — 001-006, 019, 020-024 — 616,916 bytes, and they ARE in the repo**, in
both the committed `entries/book_takeaways/schimmel_mystical_dimensions_of_islam/` and the scanned
`out/ocr/schimmel_mystical_dimensions_of_islam/chunks/`, per the PATH TRAP. Write-back: 12 files,
**zero rejected, 24/24 md5-identical on the Mac** across both locations. Two waves of six, each wave
in ONE message. **88 of the archive's 169 rows are touched**; `check_note_ids.py` (confirmed to be
the PATCHED `logical_lines` copy) **exits 0** — every bullet-head id resolves, 0 backticked
near-misses; `folio-guard` exits 0 (this book records no contested ranges); `notes-status` now reads
**12 present, 17 missing (007-018, 025-029), `chunks_ok: true`**. Full detail in
`shrines/47_Cloud_OCR_Run_2026-09-24_schimmel_mystical_dimensions_PASS1.md`. Nothing is committed to
git — `git add -A && git commit` is Rauf's.

**The chunks were not on disk** — the known CHUNKS-ARE-NOT-IN-GIT trap (`chunks_recorded: 29,
chunks: 0`). Re-chunked with `--words 8000`, the value in this book's own `state.json` log line. No
page was re-transcribed.

**Chunk order was deliberately not sequential, and it should be copied.** Chapter 8, `SUFISM IN
INDO-PAKISTAN` (PDF 375-433), holds essentially all of this book's archive material; strictly
sequential noting would have spent three or four firings on Arabic and Persian material before
reaching it. Wave 1 took **020-023 plus 001-002**; wave 2 took 003-006, 019, 024. The yield proves
the point: chunks 020-023 alone carry **83 of the 88 rows**, against 1-3 rows each for the
formative-period chunks. `notes-status` lists missing chunks by name, so resumability is unaffected.
**On any survey book whose South Asian material sits in one chapter, note that chapter first.**

## THE PARITY INSTRUMENT IS NOW PROVED ON A SECOND BOOK, PERFECTLY

`folio = PDF − 31` on **386 of 387** header lines. The folio prints *inside* the running header, and
**a leading folio is EVEN (186/186) and a trailing folio is ODD (201/201) — zero violations**, the
same result the instrument gave on `schimmel_as_through_a_veil` (340/340, §9.230). Workers used it
to catch digit misreads rather than to supply folios, and it caught several: `2Q`=29, `go`=30,
`8o`=80, `8l`=81, `Ql`=91, `34°`=340, `35O`=350, `39!`=391, `3Q2`=392, `40O`=400, `4O2`=402,
`42O`=420, `33O`=330 — every one confirmed independently by the rule AND by parity, so none is a
guess. **Two books, two different routes, zero violations: treat leading-even/trailing-odd as a
standing instrument, not a per-book discovery.**

One refinement it forced, and it contradicts what the briefs have been saying: **chapter-, section-
and appendix-opening pages in this book DO print a folio — alone at the foot of the page, below the
last footnote**, not in a header (confirmed on pp. 34, 54, 375, 434, 442, 457). Parity does not
apply to a foot folio. **A worker who defaults a chapter opening to `folio not stated` without
checking the foot throws a real folio away.** The arabic run accordingly begins at PDF 34 (folio 3),
not 35.

## FOUR OF MY OWN UP-FRONT MEASUREMENTS WERE WRONG, AND THE WORKERS CAUGHT ALL FOUR

The up-front measurement discipline (§9.226; abbas; veil) is working. This run is the reminder that
**a measurement is only as good as its instrument, and the check is a worker reading the actual page** —
the same lesson as §9.231's six-prose-reports and §9.226's blind `folio-check`, one level up again.

1. **The back-matter map.** I located `BIBLIOGRAPHY` by a flattened-whitespace line match and got
   PDF 440. **PDF 440 is the part-title `APPENDIXES / BIBLIOGRAPHY / INDEXES`.** The true map, from
   the Contents (chunk 001) and from the pages themselves (chunks 023, 024): **Appendix 1** (Letter
   Symbolism) **442-456**, **Appendix 2** (The Feminine Element in Sufism) **457-467**,
   **BIBLIOGRAPHY 468-527**, **Indexes 528-543**. And **chapter 8 ends at PDF 433 (folio 402)**, not
   439 — pp. 434-439 are **chapter 9, the Epilogue**, which ranges over Egypt, Turkey and North
   Africa. Two workers found this independently. **Anyone briefing chunks 025-029 must use this
   table.** General lesson: a flattened-text match on a heading word finds the part-title before the
   section.
2. **The abbreviations key holds 31 sigla, not 34.** My prose figure contradicted my own enumerated
   table, and the page settled it.
3. **Six digit substitutions beyond the measured table** — `2`→`a`/`s`/`g`, `5`→`s`, `1`→`l`,
   `11`→`n`, `S`→`8`, `z`→`2` — plus four further ʿayn/hamza renderings (`V`, `'v`, `*`, `j`, `>`),
   an ʿayn that **detaches and glues to the END of the preceding word** (`replied thatc this`), and
   `ff` standing for a final `āʾ` (`al-auliyff`, `Fawffid al-fifad`).
4. **`dina` fires inside `Medina`**, not only inside "Ferdinand" as the standing note says. On a book
   whose first six chapters are formative-period, that is the false friend that would have done real
   damage. **Add `Medina` to the `dina` warning wherever it is recorded.**

**And an error of mine that cost nothing but must be recorded.** Six wave-2 prompts told the worker
to read "a CORRECTIONS block at the top of `WORKER_BRIEF.md`". **I never wrote one** — the
corrections were in the prompt text instead. Five workers flagged the discrepancy and proceeded on
the brief as found rather than inventing content, which is exactly right and is why nothing was
lost. **If you promise a worker a file, write the file.**

## THE SIGLA TRAP, AND WHY IT BELONGS IN EVERY SURVEY BOOK'S BRIEF

Schimmel cites her sources by **one- and two-letter sigla in the running text** — `(L 31)`,
`(T 2:113)`, `(H 293)`, `(N 292)`, and `[AD 100]` in **square** brackets, which reads exactly like a
year. These are pages, paragraphs and poem numbers in **other** books; the key that expands them is
printed once, on PDF 22-24. The key went into the brief before any worker opened a chunk, and
**not one siglum was converted into a `(p. N)`**. Two refinements the workers added:

- **A saying Schimmel attributes to someone else but cites as `(H …)` is REPORTED BY Hujwīrī, not
  spoken by him**, and must not silently become `data-darbar` material. Chunk 006 carried `H 6` (his
  own view) and refused `H 67` (Ḥamdūn al-Qaṣṣār's); chunk 002 refused sixteen such.
- Chunk 003 mapped `data-darbar` **from the bare siglum alone**, the name being nowhere on its
  pages, and flagged that a consolidator may drop it without losing content. That is the honest
  shape for a siglum-only mapping.

## TWO MAPPING QUESTIONS FOR RAUF THAT WILL RECUR ON EVERY ENGLISH BOOK LEFT

Asked in this run's chat report (RULE 5); this is the record, not the asking.

1. **Do publishers' imprint cities in footnotes fire ruling (a)?** **Six workers, independently and
   unable to see each other, declined** to expand `Karachi, 1964` / `Lahore, 1968` / `Hyderabad,
   Sind, 1952` / `Peshawar, 1958` into those places' rows — each reasoning that (a)'s stated basis is
   place-*tradition* material and an imprint carries none, and each listing the ids so reversal is
   one step. Six independent readings agreeing is evidence about how the ruling reads; it is not a
   ruling. **Chunk 023 alone gains ~46 ids if imprints count.**
2. **Is there a PROVINCE level to ruling (a)?** `toponym_map.txt` has **no province key at all** —
   no `sind`, `sindh`, `punjab`, `balochistan` — while ~30 rows carry Sindh in `location_short`.
   This book says *"they also reached Sind … and laid the foundation of a Muslim rule that still
   continues in present Pakistan"* (chunk 003) and, of Ḥallāj, *"the seeds he sowed there grew in
   later centuries in the mystical poetry of this province"* (chunk 005). Three workers called it
   their chunk's biggest judgement and left it unmapped. **If province joins fire, chunks 003 and
   005 need redoing and much of chapter 8 gets heavier.**

Smaller, same family: chunk 022 mapped the `peshawar` 10 **on a demonym alone** — `the Sufi is no
longer Arab, Hindu, Turk, or Peshawari`, a verse about transcending identity that says nothing about
the city — mapping it because (a) is heavy by design, and flagging it as the file's weakest bullet.
A consolidator may strike all ten.

## CONTENT A HUMAN MUST CHECK

**Eight death-year disagreements with `shrine_index.tsv`, every one with CLEAN digits** — genuine
source conflicts, not OCR damage: Hujwīrī `1071` vs 1072 (twice, pp. 37 and 119); Bābā Farīd `1265`
vs 1266; Jalāluddīn Surkhpūsh `1292` vs 1291; Makhdūm-i Jahāniyān `1383` vs 1384; Bahāʾuddīn
Zakariyā `ca. 1262`, the book's own hedge, vs 1267; Sachal `1826` vs this book's own index 1827;
Raḥmān Bābā `1709` vs its index 1711; Makhdūm Nūḥ "in the seventeenth century" vs 1590.

Two of those matter against the standing rule. **Bābā Farīd's 1265 is a THIRD book agreeing with
`data/review/PATCH_figure_died_2026-09-23.csv`** (kugle + rafat), which strengthens an already-ruled
patch. **Hujwīrī's 1071 is a new single-book dissent and does NOT meet the two-book rule** — §9.231
measured two books at 1072 confirming the archive. Recorded, not patched.

**`data-darbar` is the batch's richest single gain.** Chunk 006 has Schimmel naming his arrival at
Lahore, his death there in 1071, and *"His shrine, called that of Data Ganj Bakhsh, is still a
popular place of pilgrimage in Lahore"* (p. 119, folio 88), plus his writing the *Kashf al-maḥjūb*
in Persian and Jāmī's praise of it. Chunks 001-005 add author-only mentions under the 18 Sep rule.

**Other substantive material:** **Sehwan stands on an old Shiva sanctuary, "a lingam close to the
actual tomb"** (chunk 021 — which is what maps Shiva's 8 rows). **Melā Chirāghān is dated: the last
Saturday in March, at the Shalimar Garden** (chunk 022). **The Bhit Shah tomb is described
architecturally, with a weekly Thursday-night music practice by dervishes resident at the
threshold**; Raḥmān Bābā carries an end-of-April anniversary; **Shāh ʿInāyat of Jhok has a full
dargāh-economy-and-land narrative ending in a four-month siege and an execution in January 1718**
(chunk 023). Mīān Mīr and the Qādiriyya seated at Lahore, with Dara Shikoh's `Sakinat al-auliya` as
their biography (chunk 021).

**Near-misses refused, each flagged rather than taken:** `Omarkot` vs the map's `umarkot`/`umerkot`
— the substring join fails and the archive row carries a **third** variant, "Amarkot"; `Bulrri` vs
`bulri shah karim`, which if confirmed puts `shrine-of-shah-abdul-karim-bulri` and
`dargah-roza-sufi-shah-inayat-shaheed` on opposite sides of a violent episode; `Bilawal` in Sachal's
litany, refused **on the book's own authority** — its footnote says flatly "Karmal and Bilawal have
not yet been identified". `Ucch` was mapped to the `uch sharif` 5 on content, not on a key match.

**Person false friends refused, all worth carrying forward:** `Fariduddin ʿAṭṭār` is NOT Bābā Farīd
of Pakpattan (the shared first element recurs book-wide and heads five sigla entries);
`Shams-i Tabrīz` is not Shāh Shams of Multan; `Sarmad`, Dara Shikoh's companion executed 1661, is
not Sachal Sarmast; `Shāh ʿInāyat` the seventeenth-century poet is not Shāh ʿInāyat Shahīd of Jhok;
`Qutbuddīn Aybek` and `Qutbuddīn Bakhtiyār Kākī` appear **nine lines apart on p. 377**; and `CA1I`
on p. 113 is the Prophet's son-in-law, colliding with `data-darbar`'s `principal_figure` string.

**Toponym false friends that fired and were refused every time:** `muslim` — a parse artefact of
"Muslim Town … Lahore" — **is the most dangerous key in `toponym_map.txt`**, firing a dozen times
per chunk on the ordinary adjective; `mall` fires on "small"; `gujrat` on Schimmel's western-Indian
Gujarat; `alamgiri gate` on "ʿAlamgir"; `hyderabad` on "Hyderabad, Deccan". §9.233's note that the
map needs cleaning is confirmed from a second direction.

## BRIDGE — SIX DROPS, AND THE MITIGATIONS THAT MADE IT SURVIVABLE

The bridge dropped at ~13:10Z (right after wave 1), at 13:22Z, twice more between 13:25Z and 13:35Z,
at 13:38Z **in the middle of this very append**, and again at 13:53Z. The notes write-back landed at
13:35Z on the fourth attempt; this section went in piecewise at 13:55Z. All 33 sources were staged
into the container **before any worker started**, so **not one of the twelve workers touched the
bridge** through any of it — the fifth run this mitigation has saved, and the second where the drop
was mid-run rather than between waves.

**A new measured technique, and it is the one to copy: on a flapping bridge, append in pieces to a
staging file in the repo, then concatenate in one tiny call.** A 14 KB heredoc failed twice in a row
while three short ones succeeded back to back. The long call is not more fragile per byte — it is
just in flight longer, and the window only has to close once. Build the section as
`docs/_APPEND_9235.md`, verify with `wc -l`, then `cat docs/_APPEND_9235.md >> docs/HANDOVER.md`,
which is one short command and atomic enough to retry safely. **`docs/_APPEND_9235.md` is left
behind on purpose — `unlink` is blocked on this mount, so Rauf should delete it by hand.**

Two other things worth keeping. This §9 text was written to the project **before** the append was
attempted (§9.233's rule) — and it earned its keep twice over, since it was then **corrected twice
as the facts changed**, once to say the files were lost and once to say they were not; it is also
what the piecewise append was typed from after the heredoc died. And an insurance tarball went to
the chat **after wave 1**, not only at the end, so a mid-run death would still have left six files
recoverable rather than zero.

**What this run did wrong, and the fix.** Wave 1's write-back was deferred until wave 2 finished,
and the bridge died in between; for thirteen minutes **twelve** finished files existed only in a
chat tarball rather than six, and `shrines/49_PENDING_..._NOT_IN_REPO.md` was written against that.
BOOK_QUEUE_TASK.md already says *"commit each wave back to the Mac before launching the next"*.
**It is not advice. Commit wave 1 before launching wave 2** — retry the commit while the next wave
runs if you must, but never batch two waves into one write-back. (Doc 49 is kept as the record of
the near-miss, exactly like doc 42; its header says it is resolved.)

## Still open, unchanged by this run

`data/review/PATCH_hinglaj_id_2026-09-23.md` (the sheet's Hinglaj `id` cell) and
`data/review/PATCH_figure_died_2026-09-23.csv` are both still unapplied. **`tahqiqat_chishti`
481-540's HOLD deadline is 25 September — tomorrow.** If the tarball named in doc 42 is still
unrecovered, the next transcription firing should release `HOLD-tarball-recovery-481-540` and
re-transcribe the range. Nothing is committed to git.
