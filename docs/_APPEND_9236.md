
### 9.236 — 24 September 2026: Stage = transcription. tahqiqat 661-720 done and written back; the +2 offset is now 48 of 48 unbroken and the corner-parity rule is SETTLED — my own up-front sample was the thing that was wrong

**Stage: transcription.** Chosen by BOOK_QUEUE_TASK.md step 1 at 14:24Z: `notes_claim.py status`
printed **no live notes claims**, and the only two transcription leases on the board were both
deliberate HOLDs — `tahqiqat_chishti` 481-540 / `HOLD-tarball-recovery-481-540` (23 Sep 22:40Z,
§9.232) and `khulasat_ut_tawarikh` 17-38 / `HOLD-vsplit-index-errata` (22 Sep 20:08Z).
`state.json` `updated` 12:47:07Z, an hour and three quarters old, so no sibling was live. Neither
stage taken, so step 2: the last `### 9.` section by SORTING was **9.235, `Stage: notes`**.
Previous firing did notes, so this firing transcribes. Leases were taken **at 14:35:36Z, before a
single page was rendered**, and `RUN_IN_PROGRESS_tahqiqat_chishti.md` was rewritten at the same
moment.

**Section numbering.** The largest number before this append was **235**. Checked by sorting twice,
at 14:24Z and again immediately before appending. No sibling appended during this run.
`wc -l` 16992 before.

## What this run did

**tahqiqat_chishti pp. 661-720 transcribed, 60 pages, and they are IN THE REPO.** Six workers, ten
pages each, one message, none of which touched the desktop bridge. **86,601 Arabic-script
characters, 5,376 `[OCR?]`, 2,070 `[illegible*]`, zero blank pages, zero files under 800 bytes.**
Rendering took 2m25s for 60 pages in the container at `--scale 4400 --bands 4` (780 band, half and
folio-strip PNGs, never mirrored to the Mac). Write-back: 60 files in two calls, **zero rejected,
60/60 md5-identical on the Mac** — verified by hashing the whole 60-line md5 listing on both sides,
`d8e63d297a6c6f0adb8748fe0b00c1e5` in the container and on the Mac, which is a cheaper and stricter
check than eyeballing sixty hashes. `queue.py check` now reads **660/873**; all six worker leases
were released by `check`. Nothing is committed to git — Rauf must run `git add -A && git commit`.

**No source stamp, watermark or rights notice anywhere in the range** — six workers, independently.
That is the **third consecutive 60-page range** with the same answer (541-600 §9.232, 601-660
§9.234, 661-720 here). This book's stamps remain confined to p0008 and p0014, and after 180 pages
of agreement that can be treated as settled rather than re-asked every batch.

**Duplicate check: NONE.** All 1,770 pairs measured with `difflib.SequenceMatcher(..., autojunk=False)`
after stripping the marker vocabulary; the **highest ratio in the batch was 0.276**, on the
unrelated pair (697, 710), against the 0.45 threshold. Same shape as 601-660 (0.33). §9.234's method
note holds: budget ~4 minutes and raise the shell timeout, and do not bother with `quick_ratio`.

## THE +2 REGIME IS NOW OVERWHELMING: 48 OF 48, ZERO VIOLATIONS, SIX COHORTS

Computed mechanically from the `[folio N]` lines in the files, not from the workers' prose
(§9.231's lesson), and confirmed by `queue.py folio-check`:

    offset +2   48 of 48 folios read   661-720   six cohorts, zero violations
    omitted     12 pages               663, 671, 673, 681, 683, 685, 687, 689, 695, 701, 719, 720

**Every folio any worker could read across 60 pages is PDF − 2.** `folio-check` now ranks **+2 at
74 pages** — 621-720 continuously — where §9.234 left it at 26. It has overtaken +5 (39) and +8 (34)
and is now third behind only the early-book +6 (182) and +7 (79). §9.234 called +2 "the most
strongly attested offset this book has produced in 660 pages"; at 74 pages and 100 pages of
continuous agreement it is now the established regime for the book's second half.
**661-720 is deliberately NOT contested.** `tahqiqat_chishti` still contests 7 ranges / 121 pages
(341-360, 371-380, 421-480, 611-620, 641-650), unchanged by this run. That the +200 cohorts sit
*inside* an otherwise unbroken +2 stretch is further evidence for §9.234's reading of them as a
hundreds-digit substitution rather than a real offset break.

**The twelve omissions are the instrument working, not a shortfall.** Every worker omitted the
`[folio N]` line rather than computing PDF − 2 where the corner was unreadable, exactly as the
brief demanded. w2 on p0671 saw a three-glyph numeral clipped flush by the top edge of the scan and
still declined to complete it; w4 on p0695 found both corners bare; w6 declined on 719 and 720
where the top margin is cropped above the frame rule. An omitted folio is what keeps the offset
ranking honest.

## CORNER PARITY IS SETTLED, AND THE UP-FRONT MEASUREMENT THAT WAS WRONG WAS MINE

§9.234's w4 claimed the folio alternates corners by page parity. §9.230 and §9.235 made
leading-even/trailing-odd a standing instrument on two English books. **On this book the rule is
now confirmed as: odd PDF page = TOP-LEFT corner, even PDF page = TOP-RIGHT.** Four workers
(w2 671-680, w4 691-700, w5 701-710, w6 711-720) reported it independently, unable to see each
other, with **zero violations across 34 readable pages**.

**I told them the opposite, and I was wrong.** My up-front measurement tiled the corners of three
pages (661, 662, 718) at native resolution, found the folio top-right on all three including the
odd 661, and the brief accordingly said "§9.234's parity claim is NOT confirmed — expect top-right,
but read both corners". What actually happened:

- p0661 **is** a genuine exception: w1 confirms it independently, odd and top-RIGHT. From p0665
  onward w1 reads odd = top-left like everyone else. So p0661 is the one violation in 60 pages.
- p0662 and p0718 are both **even**, so they were never evidence against parity at all. **A
  three-page sample that happens to contain two pages of one parity and one true exception is how
  a measurement produces a confident wrong answer.** The sampling error was mine, not the workers'.

**This is the fifth consecutive run in which workers corrected the coordinator's own up-front
measurement** (§9.226 abbas, veil, §9.231's six prose reports, §9.235's four errors, this).
The discipline is still right and still cheap — *the offset half of the same brief was correct and
is what caught several digit misreads* — but the lesson has now recurred often enough to state
flatly: **sample both parities, and at least six pages, before writing a parity claim into a
brief.** And because the brief told workers to read BOTH corners regardless, the wrong half cost
nothing: reading both is what let four workers find the rule and one find the exception.

## ONE THING NOT RESOLVED, AND IT SHOULD NOT COST A FIRING

**w3 (681-690) read a legible folio on the five EVEN pages only** — 682→680, 684→682, 686→684,
688→686, 690→688, all top-right, all +2 — and reports that it cropped and magnified both corners
over the whole top margin on all ten pages and found the odd pages carrying "only show-through
speckles". Every other worker on this batch read odd-page folios at top-left without difficulty.
So either that stretch of leaves genuinely lost its odd folios in this scan, or w3 missed five
folios that were there. **Not resolved, and §9.225 governs: do not spend a firing settling a folio
by model reading.** It is recorded because the +2 evidence on 681-690 rests on even pages alone,
which is worth knowing to anyone weighting the ranking. w3 also noted that p0681's top-left marks
are, on measurement of position, the mirrored show-through of p0682's folio and header — a real
observation that would explain the speckles.

Two smaller measurements worth keeping: **p0704's folio sits ~350 px lower than its neighbours'**
because that page's frame starts low (w5) — relevant to anyone automating the corner crop. And the
`_ft` folio strip `render_bands.py` produces is a **centred** top strip, so on this book, whose
folio is in a corner, it contains nothing; the brief told workers to ignore it and they did. That
is worth fixing in `render_bands.py` or documenting in its docstring, since every tahqiqat batch
renders 60 useless PNGs.

## THIS RANGE IS THE LAHORE TOPOGRAPHICAL SURVEY — THE HIGHEST-YIELD STRETCH OF THE BOOK SO FAR

Not a transcription finding, but the notes stage will want to know. pp. 661-720 are a
shrine-by-shrine and monument-by-monument survey of Lahore and its neighbourhoods, and the section
headings the workers lifted name, among others: **شاہ کمال** (661), **مادہو لال حسین** (662),
**شاہ جمال صاحب** (690, 703, 706), **حضرت داتا گنج صاحب** (674, named as three words only — w2
explicitly refused to supply `بخش` that is not on the page), **حضرت پیر مکی صاحب** (674),
**حضرت شاہ حسین زنجانی** (705), **تالاب لکھپت و جسپت رای** (667, 669), **آوہ بدہو کا** /
Budhu da Awa (689), **ناگ دیوتا** (678), **شوالہ** temples and **ٹہاکر دوارہ** (661, 676),
**گورو سری چند** and the succession of the ten Gurus (679, 680, 684, 686), Nanak at Talwandi (685),
the **عیدگاہ** of Jahangir with **خواجہ ایاز** (708, 709), and the Ranjit Singh queens and
`مہاراجہ کھڑک سنگھ` household (664, 665). Ruling (a) will make this stretch heavy for the Lahore
35. It also means the folio accuracy on these pages matters more than on most of the book.

## FOR A HUMAN — everything flagged, by page

- **Every numeral in this range is provisional** (the standing caveat, unchanged). 5,376 `[OCR?]`
  over 60 pages, roughly double the 601-660 rate, because three workers chose to write a flagged
  literal letter-skeleton where they could see glyphs rather than fall back to `[illegible]`.
  Their `[illegible*]` counts are correspondingly below the batch mean. Both are honest; they are
  different trade-offs and the counts are not comparable between workers.
- **Dates left `[illegible]` rather than smoothed, each needing an eye:** p0666 (a 4-digit Hijri
  year, plus `سنہ ۱۲۱۱[OCR?]` whose second digit is ambiguous ۲/۳), p0670 (a 4-digit year under
  `سرکار انگریزی`), p0675 (two — a Hijri year set partly as superscript, and a probable 18xx year),
  p0692, p0694, p0696 (Shah Jamal's death year, a small raised numeral), p0705 (**two** year
  figures unresolved at 10x in the Shah Hussain Zanjani section).
- **p0695 is the highest-priority single page:** a marble-slab inscription (`یہ عبارت کندہ ہے`)
  whose year w4 read as `۱۲۹[OCR?]۹[OCR?]`, the last two digits genuinely ambiguous between ۳۳ and
  ۷۷ — **and this page also has no readable folio**, so it cannot be cross-checked by position.
- **p0685's Nanak birth date** reads `۱۴-۱۵ ماہ اپریل ۱۴۶۹ء`; w3 calls the last two digits and the
  day range the weakest reading on its ten pages. This is a date a reader would take on trust.
- **p0699 carries a قطعہ chronogram** for Wajih al-Din Gujarati's death, set multi-column at 3-4
  hemistichs per printed line. w4 wrote one misra per line right-to-left but says the **column
  order is its reading and the rhyme does not close cleanly on that ordering** — which it correctly
  flags as its own warning. Since the piece encodes the year by abjad, order and chronogram word
  both need checking.
- **Tables and ruled lists, all with right-to-left cell order as the worker's reading:** p0673
  (eight graves, given as one table row), p0701 (`اشجار موجودہ` tree list with unread interlinear
  numerals), p0706 (`تفصیل اسماء جنگلی`, same shape), **pp. 0707-0708 (a 3-column ruled table of a
  versified Qadiri shajra, ~25 rows)**. Possible tables the worker left as prose because cell
  boundaries were unreadable: p0668 (an itemised property list), p0672 q3 (unusually wide
  inter-word gaps that may be columnar), p0693 lines 19-21 (a register of graves set off by rules).
- **Name decisions a human should rule on, all left as printed rather than harmonised:**
  `شیخ علی شاہ` (662) vs `شیر علی شاہ` (664); `فتا شاہ` (697) vs `فتح شاہ` (696, 699);
  `نواب خان بہادر` (715, 719) vs `نواب جاں بہادر` (714); `شہنواز خان` (717, 719) vs `شہوار خاں`
  (716, six instances); `وجہ` where `زوجہ` is the obvious sense (664); `تھڑہ` vs `چبوترہ`, which
  recur as distinct words on 693/695 (w4 wants one human confirmation because it propagates).
  **Every one of these is a worker declining to correct the page, which is right.**
- **p0708 `ملازم ریلوی`** — w5 reads "railway employee" in the Eidgah passage. Period-plausible for
  this book but conspicuous if wrong.
- **An orthographic ruling is wanted for the corpus (RULE 5 — this is the record, it went to Rauf
  in this run's chat report):** w3 reports this hand does not reliably distinguish final ی from ے,
  and it normalised the grammatical particles (نے/کے/سے) while leaving content words as written
  (مین، ہی، تہا). Other workers may have chosen differently. One rule should govern the corpus.
- **A layout question the workers answered consistently and a human may want to revisit:** on almost
  every page of 661-720 a line prints in the top margin above the frame rule which **duplicates a
  section heading printed on that page or the preceding one** (proved by w2 on p0680, whose margin
  line reads `حال گورو سری چند`, exactly p0679's in-page heading; confirmed by w1 on 662/665/668 and
  w3 on 686/687/689/690). All six treated it as a repeated chapter title and omitted it per
  protocol, keeping the in-frame heading. **If those margin lines are wanted they must be re-OCR'd**
  — w2 offered to redo its range as `[margin]` lines.
- Weakest pages of the batch by the workers' own account: p0666, p0668, p0670 (w1: heavy blotchy
  impression, ~30-35% read), p0672 and p0676 (w2), p0682, p0684, p0688 (w3: faint impression,
  Udasi/mahant succession name-lists), p0694, p0696, p0700 (w4), p0702, p0706, p0708 (w5),
  p0714, p0720 (w6). Worker self-estimates of words actually read: **50-70%, mean ~58%**, in line
  with the 48% mean §9.201 measured over 66 pages and well short of anything citable without a
  human eye.

## BRIDGE — DOWN BEFORE THE RUN STARTED, AND DOWN AGAIN DURING THE WRITE-BACK

The bridge dropped at **14:25Z, before any work had begun** — after the stage decision was made but
before a lease was taken — and flapped until **14:35Z** (up at 14:33Z, down again on the next call,
up at 14:35Z). It dropped a second time at ~**15:44Z**, on the first attempt at the write-back, and
returned about four minutes later; both halves then landed on the retry. Nothing was lost.

**What made the ten-minute opening outage survivable is worth recording, because it is the one case
the mitigations do not cover.** Up-front staging protects workers, but a transcription firing cannot
start at all without the bridge: it needs the PDF, and it must not lease or work without it. So the
wait was genuinely idle. Two things made it cheap: the 14:35Z window was used for **the lease first
and nothing else** (one short command taking all six leases, per §9.235's short-calls rule), and the
staging of the 49 MB PDF was the very next call, after which the container was self-sufficient for
the entire hour of worker time. **On a flapping bridge, spend the first window you get on the one
transfer that makes you independent of it.** The idle ten minutes were also not wasted: the last two
tahqiqat run records were read out of the attached project, which needs no bridge.

An insurance tarball went to the chat during the second outage (`db1f8505`, tarball md5
`3284df5fcde02ada0a68307ca1ca6bf8`) before the write-back was retried, per §9.235.

## STILL OUTSTANDING

**`HOLD-tarball-recovery-481-540`'s DEADLINE IS TOMORROW, 25 SEPTEMBER.** It was not touched by this
run. If the tarball named in `shrines/42_Cloud_OCR_Run_2026-09-23_tahqiqat_481-540_NOT_IN_REPO.md`
is still unrecovered, **the next transcription firing must `queue.py release tahqiqat_chishti
481-540` and re-transcribe those 60 pages.** This is the second consecutive §9 section to say so.

**Next free range on this book: 721-873 (153 pages).** The book is 660/873 with the 481-540 hole.
`docs/_APPEND_9236.md` is left behind on purpose — `unlink` is blocked on this mount, so Rauf
should delete it by hand.

`data/review/PATCH_hinglaj_id_2026-09-23.md` and `data/review/PATCH_figure_died_2026-09-23.csv` are
both still unapplied. Nothing is committed to git.
