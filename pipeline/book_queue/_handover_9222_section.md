
### 9.222 — 21 September 2026: khulasat pp. 297-362, the hundreds digit caught on fourteen pages, and the collision rule worked for the first time

**What this run did.** `khulasat_ut_tawarikh` (priority 190, 610 pp., vision) went from **264/610 to 330/610**.
Twelve workers in two waves transcribed **PDF pp. 297-362**, one `pNNNN.txt` per page. **No page skipped, none
thin (<400 Arabic characters), none `[blank page]`, and all 66 carry a `[folio N]` line.** Ranges now done on
this book: **1-16 and 49-362**. The 66 files were tarred, committed to the Mac and extracted into
`out/ocr/khulasat_ut_tawarikh/pages/`, then **verified byte-identical** — the md5-of-sorted-md5s over pp. 297-362
is `cab78f276a9e5fe8dad02a1ba63a4958` on both sides. `queue.py check` records 330 and cleared all six working
leases. Corpus total **8,880 → 8,946** of 13,926.

**Quality: the best figures this book has produced.** 93,662 Arabic characters, **51 `[illegible]`, 0 lines inside
`[illegible: N lines]`, 876 `[OCR?]`** — **0.54 `[illegible]` per 1,000 Arabic characters**, against 0.86 over
pp. 231-296, 1.43 over pp. 165-230, 0.6 over pp. 99-164, and 14.4 on `tahqiqat_chishti` pp. 199-264. Second-wave
worker self-assessment per page 0.66-0.88, per-worker means **0.85 / 0.84 / 0.83 / 0.83 / 0.76 / 0.76**, overall
**≈ 0.81**. *The 20 first-wave pages carry no self-assessment at all* — see the rate-limit note below — so that
0.81 is measured on 46 of the 66 pages, and the objective counts are the only figures covering all 66.

| worker | pages | Arabic chars | `[illegible]` | per 1,000 | `[OCR?]` | self |
|---|---|---|---|---|---|---|
| w1 | 297-299 | 4,420 | 7 | 1.58 | 54 | — (killed) |
| w1b | 300-307 | 11,284 | 1 | 0.09 | 144 | 0.85 |
| w2 | 308-310 | 4,077 | 2 | 0.49 | 43 | — (killed) |
| w2b | 311-318 | 11,524 | 6 | 0.52 | 101 | 0.84 |
| w3 | 319-321 | 4,223 | 6 | 1.42 | 38 | — (killed) |
| w3b | 322-329 | 11,816 | 11 | 0.93 | 79 | 0.83 |
| w4 | 330-332 | 4,790 | 0 | 0.00 | 36 | — (killed) |
| w4b | 333-340 | 10,576 | 9 | 0.85 | 82 | 0.83 |
| w5 | 341-344 | 5,442 | 5 | 0.92 | 51 | — (killed) |
| w5b | 345-351 | 9,964 | 1 | 0.10 | 129 | 0.76 |
| w6 | 352-355 | 5,566 | 0 | 0.00 | 27 | — (killed) |
| w6b | 356-362 | 9,980 | 3 | 0.30 | 92 | 0.76 |

## The finding: the hundreds digit is this book's real trap, and it was wrong on fourteen of sixty-six pages

§9.210 read 66 of 66 folios correctly and said so with an explicit caveat: the range it covered had ۲ or ۳ in the
hundreds position on every page, **"۴ is read correctly in the tens and units positions; this run says nothing
about the hundreds. Do not record the trap as fixed."** This run exercised the hundreds position across 66 pages
whose folios all begin ۲, and the caveat was right.

**Three of twelve workers read the hundreds ۲ as ۳, over fourteen consecutive pages between them**, each internally
consistent and each descending cleanly, so nothing in the worker's own output looked wrong:

| worker | pages | wrote | actual | error |
|---|---|---|---|---|
| w3 | 319-321 | 350, 349, 348 | 270, 269, 268 | ۲→۳ **and** ۷→۵, ۶→۴ |
| w4 | 330-332 | 359, 358, 357 | 259, 258, 257 | ۲→۳ only |
| w3b | 322-329 | 347 … 340 | 267 … 260 | ۲→۳ **and** ۶→۴ |

A fourth worker, w1b, **first wrote p0300 as folio 309 and corrected itself to 289** before delivering, by
calibrating the hundreds glyph against the units glyph *within the same image* — the units digits over its eight
pages run ۹۸۷۶۵۴۳۲ and therefore supply a ۳ and a ۲ at the same scale and blur as the hundreds glyph. w4b and w5b
used the same trick unprompted and got it right; w6b used a different one (comparing whether digits #1 and #2 are
the same glyph). **That technique is the finding worth keeping: a folio's own units digit is the only in-image
calibration standard available, and the workers who used it were right, the ones who read the hundreds glyph in
isolation were wrong.** It should go into `WORKER_PROTOCOL.md`; it was not edited unilaterally.

All fourteen were caught by the coordinator reading the `_ft` crops directly — p0319, p0320, p0321, p0330, p0331,
p0332, p0322, p0326 and p0329 were each read off the image, and the remaining five are bracketed between two
image-verified neighbours with the worker's own (correct) units-digit sequence in between, so the values are
arithmetically forced rather than pattern-matched. **The corrected files are what is on disk.** After correction:
`check_folio_direction.py --pages 49-362` reports **descending, `folio = 589 − pdf`, 314/314, no deviation**, and
`check_folio_continuity.py --pages 49-362` is **silent — every adjacent pair steps by −1, no break** (up from 248
pages and 248/248 in §9.210).

**The uncomfortable part: the worker's confidence was unrelated to whether it was right.** w3b wrote "the first
glyph is the same broad flat-topped, square-peaked, descending form on all eight pages = ۳ … the descending run is
read, not inferred" and was wrong on all eight. w1b wrote "please spot-check … this is the *opposite* direction to
the documented −100 error" and was right. **A worker's stated certainty about a folio carries no information on
this book. Only an independent read of the image does.** Every folio in these 66 pages was verified against the
image or bracketed by one, and that check must be run on every future batch — it is not optional.

**Note also that `queue.py folio-check` is the wrong instrument for this book and says so misleadingly.** It
computes `folio − pdf` and, on a descending book, returns 314 distinct "offsets" each with one page, each tagged
`<-- CHECK: a minority offset this small is usually a misread tens digit`. All 314 of those warnings are false.
`check_folio_direction.py` and `check_folio_continuity.py` are the instruments that understand this book. A RULE 4
candidate: `folio-check` should detect the descending case and defer to them rather than emit 314 false alarms.

## The collision rule worked — for the first time, and by the margin of five minutes

§9.218/§9.219 recorded two firings of this same hourly task noting the same eleven chunks in parallel, the later
write winning each time, and eleven chunks of duplicated model work lost. **This run is the first where the rule
those sections produced actually fired.** At 21:35Z `queue.py status` showed `tahqiqat_chishti` (priority 30, the
book this run's brief names first) holding six leases taken at **21:25:50Z**, five minutes earlier, with a
`RUN_IN_PROGRESS_tahqiqat_chishti.md` marker timestamped 21:30Z and `finished: (in progress)`. That marker's own
rule — *"a header less than 3 hours old with `finished: (in progress)` means take a different book"* — sent this
run to `khulasat_ut_tawarikh` (priority 190), whose own marker was 32 hours old and had produced no files.
**No overlap occurred**: at the end of this run the sibling stood at `tahqiqat` 300/873 with leases on 298-330, and
this run had khulasat 330/610. The marker cost about four minutes to read and saved 66 pages of duplicated work.

**But the sibling's `sweep-leases --hours 3` expired the deliberate `HOLD-vsplit-index-errata` lease on khulasat
17-38 along with the genuinely stale ones.** That hold is not a stale lease; it records a decision that pp. 17-38
need a vertical split before transcription. It was restored at 22:09:15Z and is in `state.json` now. **`sweep-leases`
has no notion of a hold, so any run that uses it silently frees held pages** — and the next `lease` call would then
hand 17-38 to a worker and transcribe them at the wrong rendering, which a `pNNNN.txt` makes permanent. RULE 4
candidate: `sweep-leases` should skip any lease whose worker name begins `HOLD-`.

## Two scripts written into the repo rather than re-improvised

**`pipeline/book_queue/lease_bands.py` (new).** `queue.py lease` computes its free list from `page_images()`, which
looks only for `pNNNN.png`; the band renders are `pNNNN_q1..q4.png` and live in the cloud container, never mirrored.
So on this repo `lease` reports no free pages for exactly the ranges that are ready and hands out the wrong pages
for the ones that are not. **Four consecutive runs hand-rolled the same inline `load_state`/`save_state` snippet to
get round this** (state log, 18 Sep 20:47Z, 19 Sep 02:43Z, 20 Sep 13:41Z, and this one). That is a workaround being
rediscovered, not an invariant encoded — RULE 4. `lease_bands.py` is that snippet, named, with the reason in its
docstring; it writes through `queue.py`'s own `save_state(only=slug)` so it takes the same `fcntl` lock and cannot
clobber a concurrent run working on another book, and it **refuses** to lease a page that already has a `pNNNN.txt`.

**`pipeline/book_queue/render_bands.py` (extended).** Three changes, all defaults:
- `--halves` writes `pNNNN_qI_r.png` / `_l.png`, 1551 x 1133 with 340 px of horizontal overlap, right half first.
- `--folio-strip` writes `pNNNN_ft.png`, a centred top crop at 1105 x 528 — this book's folio is centred above the
  text block and drifts vertically (§9.210), so `tahqiqat`'s corner crop does not apply. **Folio capture was 100%
  (66/66) against 79% on tahqiqat pp. 199-264 and 85% on pp. 133-198.**
- `--pdf` / `--outdir` let it run in the cloud container against a staged PDF with no `state.json` present, which is
  where it should run: 600 s per call there against 180 s on the Mac.

**The 2000 px cap is no longer a hypothesis.** §9.210 had three workers *inferring* that the image tool downsamples
a 2763 px band before the model sees it. This run read a 2763 x 616 crop of p. 297 directly and the tool annotated
it `original 2763x616, displayed at 2000x446`. **Confirmed.** That is why the halves are load-bearing and why
§9.201's resolution table, which is indexed on rendered width, overstates the distance between its own rows.

## The rate limit killed the first wave at 20 pages, and the 20 were mirrored before anything else

Six workers launched at ~22:12Z were all terminated at ~22:40Z by a session rate limit, none having delivered a
report. Between them they had written **20 complete `pNNNN.txt` files** (the first 3-4 pages of each range).
Those 20 were **committed to the Mac immediately, before the second wave was launched** — RULE 0, and specifically
the 25 pages of `tahqiqat_chishti` reported done on 15 September and never mirrored. The second wave then took the
46 remaining pages with the ranges narrowed to 7-8 pages each. Nothing was redone. **The checkpoint design worked
exactly as intended: a killed run costs its reports, not its pages.** What is lost is the first wave's
self-assessment and its `[illegible]`/name/date flags as *prose* — the in-file markers survive, the commentary does
not, which is why the table above has six blanks in its last column.

## Things a human must check

**Every numeral out of this book still needs a human.** Folio digits are set large and are now readable at 100%;
in-text years are set small and are not. The full per-page flags are in the files; these are the ones the workers
singled out.

- **p0313 — the lithograph contradicts itself.** Body gives the reign as `بست و شش سال و پنج ماه` (26 y 5 m); the
  page's *own footnote* gives `بست و هشت سال و پنج ماه ۔ فرشتہ جلد اول صفحہ ۱۸۸` (28 y 5 m). Transcribed as
  printed, both. Also on p0313 a marginal year `۹۲۵` against footnote 3's `ھ۹۲۳`.
- **p0304/p0305 — Babur's five expeditions.** The page as read gives ۹۱۲ and ۹۳۳ where the conventional dates are
  910 and 932. Not smoothed. Could be misread ۰/۲ and ۲/۳, or genuine variants of this text.
- **p0301 chronogram** `که تاریخ آمد شش[OCR?] فتح بدولت` — the abjad of `فتح بدولت` is 930, not 932, and `شش` may be
  `آمدش`.
- **p0333-p0338 — years printed as two-digit superscripts over `سنه`, with no hundreds digit on the page at all**
  (۹۶, ۹۲, ۹۶, ۹۰, ۹۱, ۸۹). The worker did *not* supply a leading digit. Context implies 78x-79x AH; that is
  inference and was kept out of the files.
- **p0339 — the Firuz Shah building list.** Every figure is spelled out. `قریب شصت[OCR?] گز ارتفاع` for the Firuz
  Shah Lat looks too tall at sixty gaz and needs checking.
- **p0340 — the abolished-cess list is the densest doubt on any page** (17 flags): `نیل گری`, `ندافی`, `دکانانه`,
  `قصابانه`, `طومانه`, `حبزات`, `کاه چراسے`, `فروعی` and others. Someone who knows Sultanate fiscal vocabulary
  should read it.
- **p0361 `در سنه ۷۱۶[OCR?]`** (accession of Shihabuddin) — the only date in pp. 356-362 and the worker could
  separate neither ۵ from ۶ in the units nor confirm the leading ۷.
- **p0315 `در سنه ۷۹۶`** — ۶/۷ is a confusion pair for this hand; could be ۶۹۷.
- **p0336 → p0335 may be a genuine break in the back-to-front order.** p0336 ends `…در دهلی نزول اجلال نموده بیعت`
  and p0335 opens `بفرخی و سعادت در ان دیار آمد`, which do not join. There is a short blank at the start of p0335
  line 1, so a faded word may be lost, or `بیعت` may be a catchword. Every other join in all 66 pages holds.
- **Footnote page numbers do not run monotonically** in reading order across pp. 325-327 (165, 167, 162, 164), so at
  least one is misread. All flagged.
- **p0323 has a horizontal rule ~70 px from the page foot with nothing legible below it.** The worker read this as a
  footnote clipped by the crop and recorded `حاشیہ: [illegible]`. **It is not a crop failure** — band q4 reaches the
  page edge, checked directly. Either there is no footnote there or it is lost in the original scan.
- **Names the workers would not resolve**, transcribed as letter-shapes rather than as sense: `ملک بهرام ابنه`
  (p0347, almost certainly ایبه/Aiba), `مسلم آهنی` (p0349, context suggests مسمار), `سلطان محمد شاه الف خان`
  (p0339, one dot from الغ خان), `ملک شه غوش دل` (p0336), `اعظم همایون شروانی` (p0311-312, س/ش unresolvable at this
  resolution), `جابهر` (p0356), and the place names `کنپله` / `کنبله`, `بهونگانو`, `ملتهه`, `تربله`, `مونهه`
  (footnote gives دلمو), `موضع ملاوقی از اعمال سکیت`.

**Substantively relevant to the project, and new**: p0339 records Firuz Shah forbidding both Muslim and Hindu women
from visiting `مزارات و بتخانه` — shrines and temples — and p0340 lists among the cesses he abolished one on
`کوله استخوان هندوان که بگنگ می برند`, bundles of bones carried to the Ganges, alongside taxes on `خوانق`
endowments. That is shrine-economy and shared-ground material of exactly the kind
`Rauf_Field_Map_Economics_of_Religion.md` is looking for, and it is in a book nobody was reading for that.

**Git, unchanged from §9.196 onward.** Not attempted; `unlink` is blocked on this mount and even
`git status --porcelain` bus-errors. Every file above — 66 page transcriptions, `lease_bands.py`, the extended
`render_bands.py`, this section — is left **uncommitted** in the working tree. `git add -A && git commit` is Rauf's
to run.

**Next on this book: pp. 363-610** (248 pages, ~4 more batches). Pages 17-48 remain out: 17-38 held for the vertical
split, 39-48 have no full-page PNG.
