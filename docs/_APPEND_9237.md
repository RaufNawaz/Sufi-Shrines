
### 9.237 — 24 September 2026: Stage = notes. `schimmel_mystical_dimensions_of_islam` FINISHED at 29/29 in one batch of three waves; the recorded back-matter map was wrong by 29 pages; and the imprint-city question is now the single biggest open mapping decision

**Stage: notes.** Chosen by BOOK_QUEUE_TASK.md step 1 at 21:53Z: `notes_claim.py status` printed
**no live notes claims**, and the only two transcription leases on the board were both deliberate
HOLDs — `tahqiqat_chishti` 481-540 / `HOLD-tarball-recovery-481-540` (23 Sep 22:40Z, §9.232) and
`khulasat_ut_tawarikh` 17-38 / `HOLD-vsplit-index-errata` (22 Sep 20:08Z). `state.json` `updated`
15:49:44Z, six hours old, so no sibling was live. Neither stage taken, so step 2: the last `### 9.`
section by SORTING was **9.236, `Stage: transcription`**. Previous firing transcribed, so this
firing does notes. `schimmel_mystical_dimensions_of_islam` was **claimed at 21:53:35Z, before the
protocol or a single chunk was read**, and `RUN_IN_PROGRESS_schimmel_mystical_dimensions.md` was
rewritten at the same moment.

**This run is the 16:22Z firing, resumed at 21:52Z after a five-and-a-half-hour outage.** Its first
act, at 17:05Z, was `device_request_folder_access` on the repo path, which **succeeded**; the very
next call, a bare `ls "$HOME/mnt/"`, hung for the full 190 s timeout and the bridge then dropped and
stayed down through roughly 17:35Z despite retries. No work was attempted in that window and
nothing was invented — the run reported the repo unreachable and stopped, exactly as
BOOK_QUEUE_TASK.md requires, and picked up when Rauf said the bridge was back. **A 190 s hang on a
bare directory listing of the mount root is a signature worth recording**: it is not the ordinary
drop, and it suggests the mount stalled hydrating an iCloud-synced Desktop folder rather than the
connection simply failing.

**Section numbering.** The largest number before this append was **236**. Checked by sorting twice,
at 21:54Z and again at 22:43Z immediately before appending. No sibling appended during this run.
`wc -l` 17204 before.

## What this run did

**All 17 remaining chunks noted — 007-018 and 025-029 — 754,241 bytes, and they ARE in the repo**,
in both the committed `entries/book_takeaways/schimmel_mystical_dimensions_of_islam/` and the
scanned `out/ocr/schimmel_mystical_dimensions_of_islam/chunks/`, per the PATH TRAP. **`notes-status`
now reads 29 present, 0 missing, `chunks_ok: true`. THE BOOK IS FULLY NOTED — the eighteenth book
to reach that state.** `check_note_ids.py` (confirmed the PATCHED `logical_lines` copy) **exits 0**
over all 29 files — every bullet-head id resolves, 0 backticked near-misses; `folio-guard` exits 0
(this book records no contested ranges).

**Write-back: 18 files in one call, zero rejected, then mirrored into `out/` with `cp` on the Mac
rather than a second 17-file transfer.** All 34 copies verified by hashing the whole 17-line md5
manifest on both sides — `e31e2a7171ac49fc879d95e5fcfcbbd4` in the container and on the Mac, and
`diff` of the two manifests empty. That manifest-hash check (§9.236's method) is again cheaper and
stricter than eyeballing hashes, and the `cp`-on-the-Mac mirror is worth copying: it halves the
bridge exposure of every notes batch from here on.

**Archive coverage: the book touches 99 of the archive's 169 rows**, 78 of them from this batch's
17 chunks, of which **11 rows are ones the first 12 chunks never reached**. Total notes for the book
are 1,371,157 bytes across 29 files. Nothing is committed to git — Rauf must run
`git add -A && git commit` himself.

**Wave shape: 6 + 6 + 5, each wave in ONE message, all 23 sources staged into the container before
any worker started, so not one of the seventeen workers touched the desktop bridge.** That is the
sixth run this mitigation has saved and it was needed: the bridge dropped on the wave-1 write-back
at 22:11Z and did not return until 22:41Z, thirty minutes later.

## THE RECORDED BACK-MATTER MAP WAS WRONG BY 29 PAGES — CORRECTED HERE, CONFIRMED BY FOUR WORKERS

§9.235 recorded **"BIBLIOGRAPHY 468-527, Indexes 528-543"**. Measured this run from **every running
header on PDF 457-543**, and then independently confirmed by the four workers who read those pages:

    Appendix 2 (The Feminine Element in Sufism)   PDF 457-466   (467 blank)
    BIBLIOGRAPHY                                  PDF 468-498   (499 blank)
    ADDENDUM TO THE BIBLIOGRAPHY                  PDF 500-504   (505 blank)
    INDEX OF KORANIC QUOTATIONS                   PDF 506-507
    INDEX OF PROPHETIC TRADITIONS                 PDF 508-509
    INDEX OF NAMES AND PLACES                     PDF 510-527
    INDEX OF SUBJECTS                             PDF 528-543

The bibliography ends at 498, not 527. **PDF 500-527 — twenty-eight pages — is an Addendum and four
indexes, and `INDEX OF NAMES AND PLACES` is the most archive-relevant stretch of the entire back
matter.** Under the old map it would have been briefed as bibliography and skimmed. The chunk-028
worker recorded ~150 index entries from it and mapped 32 archive rows.

**How the old map was got wrong, and the cheap instrument that fixes it.** §9.235 located
`BIBLIOGRAPHY` by a flattened-whitespace heading match and landed on the part-title (it recorded
that lesson itself). The correction it then wrote came from the **Contents**, which prints printed
folios, and folio 437 → PDF 468 is right for the *start* — but the Contents' next line,
`ADDENDUM TO THE BIBLIOGRAPHY 469`, was not carried into the table, so the *end* stayed wrong.
**The instrument that settles a book's structure in one command is the running headers, not the
Contents and not a heading search**: split the chunk on `[p. N]` and print the first non-empty line
of each page. Seventeen chunks' worth of structure in one script, and it is what every worker then
confirmed page by page.

**The book ends where the index ends** (chunk 029, asked as an explicit question): the last entry is
`Zulf ("tresses"): symbolic meaning of, 300` on PDF 543, and nothing is printed after it — no
colophon, no publisher's note, no trailing blank.

## THE FOLIO RULE AND THE PARITY INSTRUMENT NOW HOLD OVER THE WHOLE BOOK, BACK MATTER INCLUDED

`folio = PDF − 31` and leading-even / trailing-odd were verified by seventeen workers independently
across all 17 chunks, **zero violations anywhere**, including all 23 bibliography headers, all 18
index-of-names headers and all 13 index-of-subjects headers. Two books, three routes, and now a
complete back matter: **treat leading-even/trailing-odd as settled, not as a per-book discovery.**
Dozens of digit misreads were caught with it and none was guessed — `gOO`→300, `3O2`→302, `1J2`→132,
`2g8`→298, `24Q`→249, `l6o`→160, `44°`→440, `49°`→490, `4Q2`→492 among them.

**One refinement, and it narrows §9.235's own rule.** §9.235 said chapter-, section- and
appendix-opening pages print the folio alone at the foot. Confirmed for **chapter and appendix**
openings (pp. 34, 54, 129, 218, 259, 290, 318, 375, 434, 442, 457, 468, 528, each checked by the
worker who had the page). **But a SECTION heading dropped mid-page does not**: `STATIONS AND STAGES`
(p. 140) and `FORMS OF WORSHIP` (p. 179) both carry ordinary running headers and their folio IS
stated. Two workers caught this against briefs that told them otherwise. **Check the foot, then
check the header — and narrow the rule to chapter and appendix openings.**

## THE IMPRINT-CITY QUESTION IS NOW THE BIGGEST OPEN MAPPING DECISION, AND THIS RUN MEASURED ITS SIZE

§9.235 asked it and six workers declined imprints independently. **This run put the decline in the
brief as established precedent, and seventeen more workers followed it. That is 23 independent
readings; it is still not a ruling, and it now governs a lot of material.** The measurement that
makes it urgent, which no previous run had:

- **chunk 026 is 23 pages of pure bibliography and fires `lahore` 20 times, `karachi` 13 and
  `hyderabad` 12.** Its worker recorded 134 entries and passed over ~415. If imprints fire ruling
  (a), those 45 firings alone attach Lahore's 35 rows, Karachi's 11 and Hyderabad's 1 to a
  publisher's address, repeatedly.
- Imprints were also declined in chunks 007, 008, 009, 010, 011, 012, 013, 014, 015, 016, 017, 018,
  025 and 027 — **fifteen of the seventeen**. In most of them it is the chunk's ONLY toponym hit, so
  the decline is the difference between a zero-mapping chunk and a 35-row one.
- **Every decline lists its ids on one physical line under Doubts**, so a reversal is one step per
  chunk. Nothing is lost either way; that was the point of the discipline.

**The sub-case the workers split on, which Rauf should rule on at the same time.** Chunk 026's
worker found `"Les entretiens de Lahore."` — a toponym inside an *article title*, not an imprint —
and **fired ruling (a) on it**, reasoning that §6(ii) covers imprints only, while flagging it for
one-step reversal. Chunk 016's worker found `Multan` only inside the line-broken nisba
`BahaDuddin Zakariya Mul-/tani` and **declined** it as a name element. Chunk 028's worker declined
`Peshawari, 386`, a demonym, which would otherwise have pulled Peshawar's 10 rows. Three different
non-imprint cases, three defensible answers, one rule needed.

**And the extension this run made, which is new and also wants ratifying: a BARE INDEX ENTRY does
not fire ruling (a) either.** `Multan, 54, 344` is a pointer, not a statement about Multan, so there
is no place-tradition material to attach. Put in the brief, applied by the three back-matter
workers, all declines enumerated. **Chunk 028's worker found the one place it bites**: it declined
every toponym on that reasoning but mapped `Krishna, 271, 434` and `Shiva, 355` — equally bare index
headwords — because the 22 September many-row PERSON rule takes 2 and 8 rows from them. **If the
pointer reasoning extends to persons, ten attachments fall at once.** The two rules currently pull
against each other on identical evidence, and only in the index.

## THE GAP THAT COST THE MOST MATERIAL THIS BATCH: `toponym_map.txt` HAS NO PROVINCE KEYS

§9.235 asked whether ruling (a) has a province level. **This batch shows what the absence costs.**
Chunk 015 (`The First Orders`) and chunk 025 (Appendix 2) between them carry the densest Sind and
Punjab material outside chapter 8 — the Qādiriyya's spread in Sind with vow-flags, sweetmeats and
the `Ghauth Bakhsh` naming custom; the whole bridal-soul argument running from Krishna through Sikh
and Ismāʿīlī *ginān* to Hīr, Sassuī and Sohnī; the *faqīrānī* rising to *murshid*. **None of it
reaches a single archive id, because `sind`, `sindh`, `punjab`, `balochistan` and `kashmir` are not
keys in the map**, while ~30 rows carry Sindh in `location_short`. Both workers called it the
biggest gap in their chunk, independently. Chunk 015 is otherwise a **zero-mapping chunk** and would
not be if province joins fired.

**Separately: the `location_short` regeneration Rauf ruled on 22 September IS DONE and
BOOK_QUEUE_TASK.md's "do this before the next notes batch" is spent.** Verified this run: 45 of 169
rows now carry a `location_short` longer than 60 characters (up to 398), so the column is no longer
truncated and `toponym_map.txt` was re-derived from it on 23 Sep 04:35 (Lahore 35, Karachi 11 —
the substring-method figures). **`darbar-malik-ahmad-ayaz` is still not on the Lahore line, but the
reason has changed**: its full-length field genuinely never says Lahore (it says "Shah Alam Market;
… near Darbar Ali Hajveri Ganj Bakhsh"). It is no longer a truncation casualty and must still not be
hand-added. Two workers reached it anyway this batch by the person rule, from `Ayaz, Mahmud of
Ghazna's favorite slave` (chunks 012 and 017) — which is the correct route.

## DAMAGE FINDINGS THAT ARE NEW AND SHOULD GO INTO EVERY FUTURE BRIEF ON THIS BOOK

The brief's measured table was right as far as it went; seventeen workers extended it. The extended
version is written into `pipeline/book_queue/SCHIMMEL_MDI_WORKER_BRIEF.md`, committed this run as a
CORRECTIONS section, so it does not have to be rediscovered.

- **`°` is a THREE-WAY ambiguity, not two.** Measured 0 (`44°`=440) and 8 (`45°`=458) in headers;
  workers found it **also rendering ʿayn** (`°Ad`, `Schah °Abdul Latif's`, `cAla°uddIn`) and the
  letter **o** (`l^e eYe °f certainty`, `f°r tne`). **Never resolve a `°` anywhere.**
- **`g` is itself ambiguous.** It renders 9 (`2g8`=298) AND 3 (`lig`=113, footnote `g.` between 2
  and 4). Chunk 016's `Ibn Taymiyya (d. igaS)` is therefore **1928 or 1328 and was left unresolved**
  — correctly, since nothing on the page settles it.
- **Substitutions not in the old table**, each used only against the parity check and never to
  guess: `J`→3, `C`→0, `$`→3, `&`→ā, `1`→`l` (the inverse direction), `!`→**ī** as well as 1
  (`Rum!`, `Sana3!`), ʿayn as a **double quotation mark** (`"Attar`), and a digit standing for a
  letter (`MAN AN0 HIS` in a running header).
- **The `fi`/`fl` ligature loss produces REAL ENGLISH WORDS and is the most dangerous class in this
  book, because nothing looks wrong.** `denned` (defined), `Suns` (Sufis), `to fmd`, `shark` (sharḥ),
  `Ibn Sma`, `Carnal` (ʿamal — betrayed only by the book's own gloss), and **`Sanaa's` for Sanāʾī's,
  eleven times in chunk 018, which reads as the name of a city.**
- **Right-margin truncation happens in the CHAPTER TEXT, not only the bibliography** — `in hono`,
  `stated, an`, `According to th`, `there is no v` (chunk 015). A word cut short is not a variant.
- **Inside index locators, `no`, `in` and `n` are damaged NUMBERS** (`95, no, 137`; `100, in, 120-24`;
  `Saints, n, 21, 72`), and **on PDF 536 the index's two columns collide on several lines**. That
  page should be re-checked against the image. Locators are also truncated mid-number at the right
  margin (`178, 25`; `396, 39`).
- **A lone capital on its own physical line is usually a DETACHED ʿAYN, not a siglum** — measured on
  `G` (p. 190) and `c` (pp. 185, 187, 222). Check the next word before reading any lone capital.

## THE SIGLA KEY IS NOW COMPLETE, AND `AM` IS RESOLVED BY THE BOOK ITSELF

The brief carried all 31 printed sigla before any worker opened a chunk, and **not one siglum was
converted into a `(p. N)` in any of the 17 files.** Three tokens used in the chunks are not in the
key: chunk 027's worker found the book resolving one of them on **PDF 508 (folio 477)** —
*"The AM citation gives the location of the full Arabic text of the tradition in Badīʿuz-Zamān
Furūzānfar's Aḥādīth-i Mathnawī"* — so **`AM no. N` is a hadith number, never a page.** `CV` and
`DS` remain unplaced and were flagged, not expanded, even where context made a guess tempting
(`(DS 1059)` beside `SD = Sanāʾī, Dīwān` is an obvious transposition and chunk 018's worker
still declined it, which is right).

**Two traps worth carrying to every survey book.** A siglum letter can appear as an ordinary
catalogue number and not be a siglum (`no. Y 21*`, `no. K 9*` = Hickman's dissertation numbers;
`no. M 7` = a poem number; `(Divan 1:386)` = Bedil's Dīwān, not the key's `D`). And **the book's own
internal cross-references use PRINTED FOLIOS**: `(see pp. 167-78)` on PDF 166 points at PDF 198-209.
Chunk 009's worker flagged it as the most confusable item in its chunk and did not convert it.
**Treat an internal cross-reference exactly like an index locator.**

**The `(H …)` voice test held up across five more chunks.** Workers split Hujwīrī citations three
ways — his own voice (mapped to `data-darbar`), explicitly someone else's words reported by him
(refused, per chunk 006's `H 6`/`H 67` precedent), and **no speaker named at all**, which several
workers carried as material from his book while flagging it and one worker refused to attach to any
figure. That third bucket is the judgement call most worth a consolidator's eye.

## A MEASUREMENT METHOD NOTE: MY SUBSTRING AND REGEX PRE-SCANS WERE NOISY, AND THE WORKERS WERE RIGHT

This is the sixth consecutive run in which workers corrected the coordinator's up-front measurement,
and the pattern is now specific enough to state as method.

- **The sigla density figures in every worker prompt UNDERCOUNT**, because the pattern matched bare
  `(X N)` only. It misses `cf. X N`, compound citations (`Sura 27:90; N 188`), space-damaged ones
  (`(N 4 i i )`, `(CL8 3 )`) and line-split ones. Eight workers reported higher counts; all eight
  were right. **Give workers the pattern's limits, not just its output** — the brief's correction
  C6 did that for wave 3 and those workers used it as a prompt to look harder rather than as a
  contradiction.
- **The toponym hit counts are substring counts and are noisy in both directions.** `dina` was
  reported in chunks 008, 012, 015 and 025 and the workers who read those pages could not find it
  (in 007 it was inside *ordinary*, in 012 inside *extraordinary*, in 016 inside *longitudinal*);
  conversely chunk 016's `multan` and chunk 026's twelfth `hyderabad` were **missed** because both
  were split across a line break (`Mul-/tani`, `Hydera-/bad`). **A substring count cannot see a
  hyphenated line break, and it fires on any embedded string.** It is a hint for the worker, never a
  finding, and the brief said so.
- **`dina` fires inside `Medina` — but on this book's formative-period chapters it mostly did not
  fire at all.** §9.235's warning stands and should be kept; this batch just shows the key is noisy
  rather than specifically dangerous here.

The discipline remains right and cheap: **the folio and structure halves of the brief were correct
and are what caught dozens of digit misreads and confirmed the corrected back-matter map.** The rule
from §9.236 — sample both parities and at least six pages — generalises: **a pre-scan is a hint to
the worker; only the page is evidence.** Say which is which in the brief, and workers will correct
you rather than defer.

**And §9.235's lesson was applied rather than repeated: the CORRECTIONS block promised to wave 3
was WRITTEN INTO THE BRIEF FILE before wave 3 launched**, not left in the prompt text. All five
wave-3 workers cited it by correction number (C1, C2, C4, C6, C7, C9, C11) and two of them used it
to refuse a reconstruction they would otherwise have made. **If you promise a worker a file, write
the file** — and the corrections are worth writing even when the wave is the last one, because the
file is what the next firing inherits.

## CONTENT A HUMAN MUST CHECK

**Seven death-year disagreements with `shrine_index.tsv`, all from chunk 028's index run**, which
sits in the second most digit-damaged chunk of the seventeen — so none should be treated as a
substantive variant without an eye on the page. Book vs archive: Makhdūm-i Jahāniyān **1382-83**
vs 1384; Jalāluddīn Surkhpūsh **1292** vs 1291; **Lāl Shahbāz Qalandar 1262 vs 1274**; Mādho Lāl
Ḥusayn **1593** vs 1599; Quṭbuddīn Aybek **1206** vs 1210; Sachal Sarmast **1826** vs 1827; and the
big one, **`Makhdum Nuh (i7th century)` against `shrine-of-makhdoom-nooh-hala`'s 1590**. Chunk 027's
index run adds Raḥmān Bābā **1709** vs 1711, Bullhe Shah **1752** vs 1757 and Farīduddīn Ganj-i
Shakar **1265** vs 1266.

**Two of these now meet or approach the two-book rule.** Sachal's 1826 and Jalāluddīn Surkhpūsh's
1292 and Makhdūm-i Jahāniyān's 1383 all **repeat §9.235's readings from the same book's running
text**, so they are the same book twice, not two books — recorded, not patched. **Bābā Farīd's 1265
appears again** and remains a third book agreeing with `data/review/PATCH_figure_died_2026-09-23.csv`.
**Bullhe Shah's `1752` is suspect on its face**: chunk 027's worker notes the identical year is
printed for Shāh ʿAbduʾl-Laṭīf two pages away, in a chunk where `!` stands for `1` ten times.

**The strongest negative of the batch, and it is a real finding about this book.** Chunk 028's
worker checked the `INDEX OF NAMES AND PLACES` and reports that **`Nanak` is absent from the entire
`N` run and `Ranjit Singh` from the `R` run**. All 18 gurdwara rows and the samadhi row are
therefore unreachable from this book's own index of names. For a survey of Islamic mysticism that is
unsurprising, but it bounds what a consolidator should expect this book to give the Sikh rows.

**Substantive material worth knowing before Pass 2.** Chunk 014 ("Community Life") is the
institutional core of the whole book for this archive: khānqāh / ribāṭ / zāwiya / tekke / dargāh
vocabulary, the compound built around a grave, *futūḥ* versus stipends, the khirqa and *bayʿa*,
the khalīfa and a definition of *sajjāda-nishīn*, hereditary succession and pīr families, **waqf
glossed as "a tax-exempt endowment"**, **the ʿurs defined as "'wedding,' the anniversary of the
saint's death"**, the full pilgrim-practice paragraph (vows, circumambulation three or seven times,
cloths on windows and trees, women for children, children before examinations), and — directly
relevant to this archive's Hindu and Sikh rows — **"Christian or Hindu places of worship were
transformed into Muslim sanctuaries"** (p. 270). Chunk 029's index of subjects yields ~120 glossed
practice terms including **`Mela chiraghdn (festival in Lahore), 384`** and **`Mdlang (dervish at
the sanctuary in Sehwan), 355`** and **`Jagir (India) (endowment of land), 347`**. Chunk 011 adds
the Naqshbandī masters' visitation of saints' tombs to draw on a departed Sufi's power (p. 206).
Chunk 025's Appendix 2 has Schimmel's own visit to **an unnamed small women's shrine in Multan
"to which men are not admitted"** — mapped to Multan's 8 rows under ruling (a), and its worker
rightly flags that **no Multan row in the archive is a women's shrine**.

**Thin mappings the workers flagged themselves, each one line to remove:**
`shrine-of-fariduddin-ganjshakar` from a book *title* in a footnote (chunk 014 — subject-of-a-cited-
title is arguably a case the 18 Sep ruling does not name); `shrine-of-makhdoom-abdul-rahim-girhori`
from the nisba in `Kaldm-i Girhorl` alone, where the book never says Girhorī is a person or a saint
(chunks 008 and 025); `darbar-malik-ahmad-ayaz` from one Rūmī allegory (chunks 012, 017);
`shrine-of-pir-mangho` from a ten-word parenthesis (chunk 013); the two Krishna rows from a single
comparative clause (chunk 016). **Also: chunk 013's worker warns that a quotation on p. 244 is given
only as "the saint was right who said", with a footnote pointing at Sorley's book ABOUT Shāh
ʿAbduʾl-Laṭīf — a page in a book about him is not a saying by him, and a consolidator will be
tempted to promote it.**

## STILL OUTSTANDING

**`HOLD-tarball-recovery-481-540`'s DEADLINE IS TOMORROW, 25 SEPTEMBER, AND THIS IS THE THIRD
CONSECUTIVE §9 SECTION TO SAY SO.** Untouched by this run (a notes firing). If the tarball named in
`shrines/42_Cloud_OCR_Run_2026-09-23_tahqiqat_481-540_NOT_IN_REPO.md` is still unrecovered, **the
next transcription firing must `queue.py release tahqiqat_chishti 481-540` and re-transcribe those
60 pages.**

**NEXT NOTES FIRING: PASS 2 ON THIS BOOK.** `schimmel_mystical_dimensions_of_islam` is 29/29 and is
the first book to become consolidatable since Pass 2 closed at 23 of 23 (§9.233). Its notes total
**1,371,157 bytes across 29 files — the largest book in the corpus by notes volume**, so use
§9.233's proved shape: **three workers split by the OUTPUT document's own sections, not by chunk
range** (one worker is proved to 950 KB). Then
`queue.py mark schimmel_mystical_dimensions_of_islam summarized --file entries/book_takeaways/schimmel_mystical_dimensions_of_islam.md`.
**Read this section first** — the imprint-city, province-join and bare-index-entry questions all
land on the consolidator, and every decline is enumerated in the chunk files ready to reverse.

**After that, the notes queue is:** 120 `khalid_walking_with_nanak` (324 pp, 14 chunks) → 121
`dhillon_janamsakhis` (271, 9) → 122 `khalid_a_white_trail` (236, 13) → 123
`khalid_in_search_of_shiva` (21, 9) → 210 `nizami_revised_translation` (208, 13). **Three of those
five are Sikh-subject books, so the province-join and many-row-person questions above will govern
them heavily** — Guru Nanak alone heads 18 rows.

`data/review/PATCH_hinglaj_id_2026-09-23.md` and `data/review/PATCH_figure_died_2026-09-23.csv` are
both still unapplied. Nothing is committed to git.

**`docs/_APPEND_9237.md` is left behind on purpose — `unlink` is blocked on this mount, so Rauf
should delete it by hand, along with `docs/_APPEND_9235.md` and `docs/_APPEND_9236.md` from the two
previous runs, which are also still there.**
