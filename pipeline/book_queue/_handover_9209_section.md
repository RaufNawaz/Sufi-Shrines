
### 9.209 — 18 September 2026: khulasat pp. 165-230, and the ۳/۴ trap caught at the boundary by the check written for it

**What this run did.** `khulasat_ut_tawarikh` (priority 190) went from **132/610** to **198/610**.
Six workers transcribed **PDF pp. 165-230** from 4-band renders at `--scale 4400` (2791 x 1133 px
per band, 3% overlap), eleven pages each, one `pNNNN.txt` per page, written into
`out/ocr/khulasat_ut_tawarikh/pages/` and mirrored to the Mac. No page skipped, none thin
(<40 chars), none `[blank page]`, every page carries a folio line. Ranges now done on this book:
**1-16 and 49-230**. Corpus total 8,550 → **8,616** of 13,926.

**Quality.** 91,600 Arabic characters, **131** `[illegible]`, **0** lines inside
`[illegible: N lines]`, 946 `[OCR?]`. That is **1.43 `[illegible]` per 1,000 Arabic characters**,
against 0.6 over pp. 99-164 and **40.1** on `tahqiqat_chishti` (§9.201). Worker self-assessment
0.72-0.96 per page, overall **≈ 0.90**, consistent with §9.206's 90.0% blind-pass agreement. No
second pass was run, so this is self-assessment and carries §9.206's caveat. The weakest pages are
**p0220** (0.72, faint ink plus heavy verso bleed-through) and **p0229** (0.78, florid descriptive
prose); both would be the first to re-run.

**Why this book and not `tahqiqat_chishti` (priority 30) — for the third run running.** Unchanged
from §9.203 and §9.207: §9.201's three decisions are still unanswered and two of them govern that
book's remaining 807 pages. A page that has a `pNNNN.txt` is never redone, so transcribing it at
the disputed rendering would spend the batch *and* foreclose the render fixes. They are re-surfaced
in this run's report (RULE 5).

**A lease is not work, and neither is a claim file.** The 11:40Z firing wrote
`RUN_IN_PROGRESS_tahqiqat_chishti.md` for pp. 67-132 and took **six leases** (67-77 … 122-132) on
that book. It then wrote **zero page files** — `out/ocr/tahqiqat_chishti/pages/` still ended at
`p0066.txt`. The claim was 3h57m old at the start of this run, past the 3-hour rule, and the leases
would have sat until a `sweep-leases` that nobody dares run (it would also expire the deliberate
`HOLD-vsplit-index-errata`). **The six leases were released individually**, by name, so the hold on
khulasat 17-38 was untouched; `tahqiqat_chishti` is back to 66/873 with no leases. This is §9.199's
lesson recurring with a second symptom: a claim file is evidence of intent, a lease is evidence of
intent, and **only `pNNNN.txt` is evidence of work**.

## The finding: the ۳/۴ trap recurred exactly as predicted, and only where the digit really is ۴

§9.207 measured that **۳ and ۴ are not separable in this hand at band resolution** and are separable
at 400 ppi. This run is the controlled repeat. Six fresh workers were told the trap exists and told
to flag the hundreds digit — but were **not** told the relation `folio = 589 − pdf`, so the folio
reading stayed an independent signal. They were unanimous and they split cleanly:

| PDF pages | folios as read | correct | verdict |
|---|---|---|---|
| 165-189 | 324 … 300 | 424 … 400 | **all 25 wrong by exactly −100** |
| 190-230 | 399 … 359 | 399 … 359 | all 41 correct |

**The trap bites only when the printed digit is ۴.** Not one worker misread a genuine ۳ as a ۴, on
41 consecutive pages. So the failure is not "the hundreds digit is unreliable" but the sharper and
more useful **"۴ is read as ۳; ۳ is read correctly"** — a one-directional substitution, which is
what makes the +100 correction safe to apply wholesale rather than page by page.

**Three workers detected it themselves, from arithmetic rather than from the glyph.** w3 read
`302, 301, 300, 399, 398 …` across pp. 187-191, said in its report that the run is "arithmetically
impossible", worked out that pp. 187-189 must be 402/401/400, **and deliberately did not smooth its
own files** because the brief said to report what the glyphs show. w4 and w5 independently noted
that the neighbouring `p0187.txt` did not fit. That is the behaviour the protocol wants: the worker
reports the contradiction and leaves the resolution to a pass that can re-render.

**It was then settled from the image at 400 ppi, not from the relation** (RULE 2 — the relation is a
hypothesis, the page is the evidence). Three readings, two of them independent of any arithmetic:

| page | reading | why it is decisive |
|---|---|---|
| p0155 | ۴۳۴ | §9.207's control re-verified: **first and third glyphs identical**, middle visibly broader. Fixes both glyph forms from one page — ۴ is the swooping hook with a descender, ۳ the broader flat-topped form with square peaks. |
| p0164 | ۴۲۵ | the page immediately before this batch; matches §9.207's hand-verified value. |
| p0189 | **۴۰۰** | read directly off the crop — leading swoop then two plain circles. The worker wrote 300. |

With **both ends of the batch anchored by direct 400 ppi readings** (p0164 = 425, p0189 = 400) and
the run descending by one, pp. 165-189 are fully determined as 424 … 400 without trusting any single
leading glyph. **Only the `[folio N]` first line was changed, on 25 pages**; every body line is
byte-identical to what the workers delivered, which was checked mechanically against the archived
originals rather than asserted. Raw output is preserved at
`out/ocr/khulasat_ut_tawarikh/_worker_raw_before_folio_correction_165-230_2026-09-18.tar.gz` and the
400 ppi crops the correction rests on at `_folio_digit_evidence_165-230_2026-09-18.tar.gz`.

**The check written in §9.207 did its job, on its first real outing.**
`check_folio_continuity.py --pages 49-230` is now **silent — 182 pages, every adjacent pair steps by
−1, no break**, where against the uncorrected files it would have reported the 101-folio jump at
189/190. `check_folio_direction.py --pages 49-230` reports **descending, `folio = 589 − pdf`,
182/182, no deviation**. §9.207 said its tool "cannot see an error that is uniform across every
transcribed page of a book, only one that breaks at a boundary" — this batch broke at a boundary,
which is precisely the case it covers, and it held.

**`queue.py folio-check` is the wrong instrument for this book and its output should be ignored
here.** It models `folio = pdf + offset` and therefore reports every page of a descending book as
its own "minority offset" (−157, −155, −153 … one page each, each flagged "usually a misread tens
digit"). Nothing is wrong with those pages. Use `check_folio_direction.py` and
`check_folio_continuity.py` on this book; the §9.200 note that folio-check "cannot run on this book
and this is not a fault" now has a second, different reason standing behind it.

## The other finding: all six workers independently discovered the PDF runs back-to-front

Every one of the six reported, unprompted, that **the prose continues from page N into page N−1**,
and each verified it at its own range's internal joins — roughly forty sentence-level splices in
total, e.g. w3's p0190 `…در سنه ۸۹۵ که سلطان` → p0189 `بهلول لودی رحلت نمود…`, and w5's p0210
`…از فرط هجوم با` → p0209 `کشتی غرق گشتند…`. The descending relation was already known from
§9.206-§9.207 and `check_folio_direction` already prints "assembly must reverse it" — **what is new
is that it is now corroborated from the text rather than from folio arithmetic**, by six readers who
were not told the relation. Two consequences worth stating plainly: the reading order of this book
is the reverse of its PDF order, and **any assembly that concatenates by PDF index produces a book
running backwards**. Worth checking whether pp. 1-16 and 49-98 were read under the same assumption.

## Numerals and names a human must settle, worst first

Nothing in pp. 165-230 may put a date into a shrine record. Bands for the eighteen pages concerned
are packaged as `_bands_for_human_check_a_165-230_2026-09-18.tar.gz` and `…_b_…` so a person can
settle these without re-rendering.

- **p0224: a three-digit year is wholly `[illegible]`.** The worker resolved that there are exactly
  three digits and got them to high magnification but could not identify them (shapes "most
  consistent with ۶-or-۴, ۹-or-۵, ۹"). Context is the death of Sultan Muhammad Shah of Delhi just
  before Timur's invasion, so a 79x/80x AH year is expected — **which is exactly why it was not
  written**. The single best example in this batch of the protocol working.
- **p0193 carries two load-bearing years that could not be read**: `در سنه ۱۵[OCR?]` (apparently
  only two visible digits, dating Sāhū's arrival) and `در سنه [illegible]`, the death year of the
  last Hindu raja of Kashmir before Kota Devi's regency.
- **p0208 footnote (۱): `سنه ۷۳۹[OCR?]`.** The middle digit is the ۳/۴ trap and the last could be ۹
  or ۶, so 739 / 749 / 736 / 746 are all live. The point of the footnote is that Firishta gives a
  *different* year from the body, so it **must not** be smoothed to 746.
- **p0222 `لغایت سنه ۹۸۳[OCR?]`** — the year Gujarat entered Mughal control; the conventional figure
  is 980, and the worker declined to move it.
- **p0215** `سنه ۹۷۷[OCR?]` (Salim's birth) and `سنه ۶۳۳[OCR?]` (death of Khwaja Muin al-Din
  Chishti) — the second is directly shrine-relevant and was read as printed, not adjusted.
- **p0206** `سنه ۹۸۳` / `از ابتداے ۷۴۶` with "دوصد وسی وهفت سال" (237 years): 983 − 746 = 237
  exactly, so these three check each other — the one internally corroborated date cluster in the
  batch.
- **Footnote citation page numbers throughout** (Firishta vol. 2, Tabaqat-i Akbari, Akbarnama,
  Ain-i Akbari) — dozens of isolated three-digit numbers at the limit of this rendering; on
  pp. 206-208 the units digits 2/3/4/5 are "not reliably separable". All flagged.
- **Names where the reading is contested, not merely uncertain:** p0221 `رانا و دلیسنگه[OCR?]`
  (very likely Rana Udai Singh — "the whole question is one lam") and `سکست سنگ[OCR?]` (Shakti
  Singh); p0167 `راجه رامچند زمیندار پتنه`, where the text says *tābiʿ ṣūba Allāhābād*, which fits
  **Bhatta/Rewa**, not Patna, and was left as the glyphs give it; p0170 `رو در سنگه مرزبان کمایون`
  (the 1590s Kumaon ruler was **Rudra Chand**); p0169-70 `گوالیار`/`گوالیاری`, where the context —
  a fort of Raja Basu of Mau — points to **Guler**, not Gwalior; p0228 `در حوالی تهتهه[OCR?] تابع
  ملتان`, and Thatta is in Sindh, not a dependency of Multan, so either the place or the attribution
  is off; p0216, where `بمخدوم[OCR?] الملک` is applied to `مولانای عبدالنبی سلطان پوری`, apparently
  merging two men. Every one of these was transcribed as printed and flagged rather than corrected
  toward the expected name — which is the standing instruction, and is why they are findable.
- **p0225 names a cluster of shrine-relevant Gujarat/Sorath sites that read cleanly** — `سورتھ`,
  `جوناگڑھ`, `سومنات`, `دوارکا`, `کچھه` — and were left unflagged; worth a second eye precisely
  because they are unflagged.

## Two convention questions this batch raised — RULE 5, and both are in the chat

1. **Is the digitisation stamp recorded once per worker range, or once per page?** The convention
   inferred from pp. 1-164 and imposed on all six workers was **once on the first page of each
   range**, which is what the existing files show (`p0001, p0049, p0059, p0069 …` at roughly
   eleven-page intervals — i.e. the previous runs' range starts, not a deliberate rule). w4 spotted
   this and asked whether the real convention is *every page*. The stamp
   (`Sri Satguru Jagjit Singh Ji eLibrary / NamdhariElibrary@gmail.com`) is at the foot of **every**
   page of this scan, so the current record understates it. Six stamp lines were written this run
   (pp. 165, 176, 187, 198, 209, 220). No other watermark, library mark or rights notice appears
   anywhere in pp. 165-230; all six workers checked every band and said so explicitly, so the
   absence is measured rather than assumed.
2. **How should hemistich order within a single printed line be recorded when it cannot be seen?**
   Five of the six workers reported independently that at 2791 x 1133 they **cannot reliably judge
   left/right position within a band**, so where two hemistichs share a printed line they ordered
   them by sense and metre. w1 caught one such ordering and fixed it from the rhyme scheme
   (only even hemistichs rhyme), which is a real check but only works on rhymed verse. The content
   of every hemistich is read off the image; **only the within-line order is inferred**, on
   pp. 0166-0169, 0178-0179, 0183-0184, 0201, 0204, 0211, 0213 and 0215. This is the same class of
   limit as §9.201's finding that band seams are resolved by semantic continuity and so cannot be
   re-checked mechanically. It is also §9.201's decision 3 in a second book, and wants one ruling.

**Also recorded, smaller.** The digitisation stamp **overprints the printed footnotes** at the page
foot on pp. 0166, 0169, 0171, 0176, 0179, 0182-0185, 0192-0193, 0204-0205 and 0223, and on p0166 the
footnote is almost entirely lost under it. Those footnotes are this edition's editorial apparatus —
source citations to Ain-i Akbari, Tarikh-i Firishta and Tabaqat-i Akbari — so **the digitiser's
overprint is destroying exactly the apparatus that makes the book citable**. A differently cropped
scan of the page feet would recover them; no re-shoot of the body is needed. Separately, w6 recorded
a method that is worth reusing: flat-field-correcting each band and reading it as three overlapping
tiles at ~1.4x was "materially better than reading the band whole".

**Bridge stability, as bad as §9.200 recorded.** The desktop link dropped six times during this run,
twice mid-call, and the folder was **not connected at session start** (re-requested and granted).
Two things kept it survivable and should stay standard: the PDF was staged into the cloud container
**once** and all rendering and transcription happened there, so the six workers never touched the
bridge; and the 66 finished pages were also delivered into the chat as a tar the moment the first
mirror attempt failed, so they could not be lost with the session. §9.200's rule proved itself
twice more: **a long `cat >> file <<EOF` heredoc is the wrong shape for this bridge** — two appends
of this entry returned an error or a timeout and wrote nothing, verified both times by
`grep -c '^### 9.209'` rather than assumed. What worked was writing the section to a file in the
container, committing it with `device_commit_files`, and appending it with a one-line `cat`.

**Git, unchanged from §9.196 through §9.208.** Not attempted; `unlink` is blocked on this mount and
even `git status --porcelain` bus-errors. The 66 page files, the four tarballs, the updated
`RUN_IN_PROGRESS_khulasat_ut_tawarikh.md`, the released leases in `state.json` and this entry are all
left uncommitted in the working tree. **`git add -A && git commit` is Rauf's to run.** Nothing was
pushed.
