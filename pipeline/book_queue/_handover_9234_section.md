
### 9.234 — 24 September 2026: Stage = transcription. tahqiqat 601-660 done and written back; the folio offset BREAKS from +5 to +2 inside this batch, and two cohorts hit the hundreds digit at once

**Stage: transcription.** Chosen by BOOK_QUEUE_TASK.md step 1 at 04:23Z: `notes_claim.py status`
printed **no live notes claims**, and the only two transcription leases on the board were both
deliberate HOLDs — `tahqiqat_chishti` 481-540 / `HOLD-tarball-recovery-481-540` (23 Sep 22:40Z,
§9.232) and `khulasat_ut_tawarikh` 17-38 / `HOLD-vsplit-index-errata` (22 Sep 20:08Z). Neither
stage taken, so step 2: the last `### 9.` section by SORTING was **9.233, `Stage: notes`**, and its
marker `RUN_IN_PROGRESS_pass2_wave5.md` reads COMPLETE (finished 03:47Z). Previous firing did
notes, so this firing transcribes. Leases were taken **at 04:24:33Z, before a single page was
rendered**, and `RUN_IN_PROGRESS_tahqiqat_chishti.md` was rewritten at the same moment (§9.229).

**Section numbering.** The largest number before this append was **233**. Checked by sorting twice,
at 04:23Z and again at 05:06Z immediately before appending. No sibling appended during this run.
`wc -l` 16653 before.

## What this run did

**tahqiqat_chishti pp. 601-660 transcribed, 60 pages, and they are IN THE REPO.** Six workers, ten
pages each, one message, none of which touched the desktop bridge. **87,827 Arabic-script
characters, 2,776 `[OCR?]`, 946 `[illegible*]`, zero blank pages, zero files under 800 bytes.**
Rendering took 2m37s for 60 pages in the container at `--scale 4400 --bands 4` (780 band, half and
folio-strip PNGs, never mirrored to the Mac). Write-back: 60 files in two calls, **zero rejected,
60/60 md5-identical on the Mac**, compared hash-by-hash against the container listing.
`queue.py check` now reads **600/873**, `pages_done` `1-480,541-660`; all six worker leases were
released by `check`. Nothing is committed to git — Rauf must run `git add -A && git commit` himself.

**No source stamp, watermark or rights notice anywhere in the range** — six workers, independently,
same answer as 541-600 (§9.232). The stamps on this book remain confined to p0008 and p0014.

**Duplicate check: NONE.** All 1,770 pairs in the batch were measured with
`difflib.SequenceMatcher(..., autojunk=False)` after stripping the marker vocabulary; the **highest
ratio in the whole batch was 0.33**, on the unrelated pair (602, 610), against the 0.45 threshold.
The four suppressed re-shoots on this book (338/340, 339/341, 380/382, 381/383) have no counterpart
here. *Method note for the next run: the `quick_ratio` prefilter is useless on this corpus — all
1,770 pairs survived it, because Arabic-script pages from one book share almost the same character
multiset. The full ratio over 1,770 pairs needs ~4 minutes, so give it a `timeout` above the
default 120 s or it dies half-way and tells you nothing.*

## THE FOLIO OFFSET BREAKS INSIDE THIS BATCH: +5 BEFORE p0611, +2 FROM p0621

Computed mechanically from the 43 `[folio N]` lines in the files, not from the workers' prose
(§9.231's lesson), and confirmed by `queue.py folio-check`:

    offset +5    601-610   6 pages   (+6 on p0602, flagged [OCR?] by the worker)
    offset +203..+205       611-613   3 pages   <- see below
    offset +2    621-640   17 pages  (w3 and w4, two cohorts)
    offset +202..+203       641-649   7 pages   <- see below
    offset +2    651-660   9 pages   (w6, a third cohort that met neither)

**The +5 on 601-610 is the same regime §9.232 measured on 541-600, and it ends.** From p0621 to
p0660, **26 pages across three cohorts that never communicated** read **+2**. That is the most
strongly attested offset this book has produced in 660 pages, and it is a fifth distinct offset on
top of §9.232's four. `folio-check` now ranks +6 (182 pages), +7 (79), +5 (39), +8 (34), +2 (26).
**This book's folio offset is not a constant and never was; it is a piecewise function and each new
range has to establish its own.**

## BOTH ODD COHORTS ARE THE HUNDREDS DIGIT — THE KHULASAT TRAP, NOW ON THIS BOOK TOO

w2 (611-620) and w5 (641-650) each produced offsets near **+200**, and neither is a wild reading:

- **w5, 641-649:** subtract 200 from every value and the cohort reads **+2 on six pages and +3 on
  one**, which is exactly what 631-640 and 651-660 read on either side of it. Seven pages, one
  systematic substitution, perfect agreement with both neighbours. The substitution is Urdu **۶ read
  as ۴** — §9.222's khulasat finding ("the real trap is the HUNDREDS DIGIT", wrong on fourteen of
  sixty-six pages) reproducing on a different book, a different hand and a different worker.
- **w2, 611-613:** subtract 200 and the three readable pages read **+5, +4, +3** — that is, folios
  **606, 608, 610 on PDF 611, 612, 613**. The worker described that as "a +2 cadence" and could not
  explain it; read as a transition it **gains exactly the 3 that the offset loses** between the +5
  regime ending at p0610 and the +2 regime beginning at p0621. The other seven pages of w2's range
  carry a folio the worker judged unreadable ("legible as ۴۱_ but the units glyph is a bold form I
  could not separate into ۲/۴/۶/۸") and **correctly omitted the line rather than guessing** — which
  is why the transition cannot be pinned to a page.

**Neither correction has been applied to any file and neither should be until a human or an HTR
model reads those corners.** §9.225 stands: a folio on this book is not settled by model reading,
and a glyph-shape test over 600 dpi crops was already inconclusive once. Both ranges are now
recorded with `queue.py folio-contest`:

    folio-contest tahqiqat_chishti 611-620   (transition zone, unpinnable)
    folio-contest tahqiqat_chishti 641-650   (whole-cohort hundreds-digit substitution)

`tahqiqat_chishti` now contests **7 ranges, 121 pages** (341-360, 371-380, 421-480, 611-620,
641-650). `folio-guard` will exit 1 on any notes file citing one. **601-610 is deliberately NOT
contested** — it reads +5 consistently and agrees with the established 541-600 regime.

**The instrument that made this legible was already in the brief and cost nothing:** the workers
were told the folio alternates top corners by page parity and to omit rather than infer. w4
confirmed the parity independently ("odd PDF pages print it top-left, even top-right"), and the
17 omitted lines are what let the four regimes separate cleanly instead of averaging into noise.

## FOR A HUMAN — everything flagged, by page

- **Every numeral in this range is provisional** (the standing caveat, unchanged). 2,776 `[OCR?]`
  over 60 pages.
- **Folios: do not cite 611-620 or 641-650 at all.** See above.
- p0631 and p0640 each carry a **date the worker could not read and left as `[illegible]`** rather
  than smooth — both need a human eye.
- p0633 carries an **abjad computation** (جہان / ہند) whose digits were only partly read.
- p0617 carries a **printed tree-count list** (گوندیان ۱۰ / پہروان ۱ / کیکر ۶ / لسوڑہ ۱ / ببریان),
  digits flagged individually.
- pp. 0618-0619 carry a **40-name table of "سلطان" names**, set as pipe-separated rows; the column
  order within each row is the worker's best right-to-left reading and **should be spot-checked**.
- Section headings opening inside the range, transcribed on their own lines: حال نواب سعد اللہ خان
  (p0631), احوال دہرم سالہ ملتانی (p0634), احوال تکیہ ڈنڈی گران (p0635), احوال باغ زیب النسا / موضع
  نواں کوٹ (p0636), حال خانقاہ حاجی عبد الکریم صاحب چشتی (p0639).
- Weakest pages of the batch by the workers' own account: p0611, p0612 (faint q1 band), p0634,
  p0636 (blurred/skewed top band), p0644, p0645 (verse, faint impression).

## STILL OUTSTANDING, UNCHANGED BY THIS RUN

**`HOLD-tarball-recovery-481-540` was not touched and its deadline stands: if the tarball is not
recovered by 2026-09-25, a later firing must `queue.py release tahqiqat_chishti 481-540` and
re-transcribe those 60 pages.** Recovery commands are in
`shrines/42_Cloud_OCR_Run_2026-09-23_tahqiqat_481-540_NOT_IN_REPO.md`.

**Next free range on this book: 661-873 (213 pages).** The book is 600/873 with the 481-540 hole.

**BOOK_QUEUE_TASK.md's Stage B still says "Pass 2 is the notes stage's priority".** §9.233 finished
Pass 2 at 23 of 23 and asked the next notes firing to rewrite that paragraph. This transcription
firing has done it instead, because leaving a spent instruction in the file that every future
firing reads is exactly the failure RULE 0 exists to prevent: Stage B now points at the six unnoted
books in priority order, and the "Next transcription slot goes to MASNAVI CALIBRATION" paragraph —
spent since §9.228/§9.229 — has been replaced with the measured state of the transcription front.
