
### 9.213 — 19 September 2026: tahqiqat_chishti pp. 67-132, the half-crop render tested on the hard book, and a folio that goes 115, 114, 116

**What this run did.** `tahqiqat_chishti` (priority 30, 873 pp., vision) went from **66/873 to 132/873** —
the first pages added to this book since 18 September, and the end of the four-run hold. Six workers
transcribed **PDF pp. 67-132**, eleven pages each (67-77 / 78-88 / 89-99 / 100-110 / 111-121 / 122-132),
one `pNNNN.txt` per page, written into `out/ocr/tahqiqat_chishti/pages/` and mirrored to the Mac.
**No page skipped, none thin (<400 Arabic characters), none `[blank page]`.** `queue.py check` records
`1-132` and cleared all six leases. Corpus total **8,682 → 8,748** of 13,926.

**Why this book, after four runs of passing it over.** Two independent warrants, and the second is the
one to keep. (1) `RUN_IN_PROGRESS_tahqiqat_chishti.md`, written by the 19 Sep 16:20Z run, states that
Rauf ruled on §9.201 decision 1 on 18 September — run the book as a **finding aid**, with an explicit
skip-and-log policy. **That ruling could not be verified from the repository**: the claim file cites its
own previous version as the record, deletes are blocked on this mount so the file was overwritten, and
the project run record written at 03:56Z on 19 September still says the three decisions are "unanswered,
for the fifth run running". (2) This run's own brief from Rauf sets the goal — every queued book except
the five skipped reaches at least `transcribed` — and names `tahqiqat_chishti` first in priority. **The
brief is the warrant this run acted on.** If the 18 September ruling is real it should be written into
`docs/` rather than into a file that overwrites itself; if it is not, the brief settles the same question
anyway.

**Quality.** 79,601 Arabic characters, **2,517 `[illegible]`, 0 lines inside `[illegible: N lines]`,
2,077 `[OCR?]`**. That is **31.6 `[illegible]` per 1,000 Arabic characters**, against **40.1 over
pp. 1-66** — the first movement in that number on this book since it was first measured. Characters read
rose 61,616 → 79,601 (+29%) on the same page count. **These are different pages, so this is not the
controlled repeat §9.201's table was**; what makes it worth recording is the direction and the size, and
that the bulk-illegible measure went **14 lines → 0**. Worker self-assessment per page 0.22-0.60,
per-worker means 0.36 / 0.41 / 0.41 / 0.36 / 0.33 / 0.44, **overall ≈ 0.38** — *lower* than pp. 1-66's
~0.48 while every objective count improved, which is §9.211's paradox recurring on a second book and one
more reason not to trust the self-number. Weakest pages: **p0067, p0100, p0116 (0.22)**, then p0073,
p0079, p0088, p0108, p0114, p0118, p0120 (0.25). w1 flags p0067 as a different order of difficulty from
the rest of its range — thin ink, dots essentially absent — and it is the first page anyone should re-run.

## The finding: §9.211's half-crop render transfers to this book, and all six workers say it was decisive

The render was §9.210/§9.211's: four horizontal bands at `--scale 4400` (**2462 x 1133 px** on this
book's page geometry, 3% vertical overlap), each band then cropped in the container into `_r` (right
half, read first) and `_l` halves at **1378 x 1133 px with ~6% horizontal overlap** — under the ~2000 px
cap at which the image tool downsamples, so the halves are delivered unscaled. 264 bands + 528 crops for
66 pages, ~12 minutes of container time; the PDF was staged once and no worker touched the bridge.

All six workers reported the crops as load-bearing without being asked to rank them. w4: "the halves were
decisive — they are what let me read `ٹکسالی`, `چنانچہ`, `روشن`, `باغباں پورہ`, `چتورگڑھ`, `مکلوڈ`,
`دفتر اکونٹس`". w3: "roughly a third of the words I retained came only from the halves." **The warned
one-row offset between `_r` and `_l` (the ~50 px leftward rise of the printed line) bit four times and
was caught every time** — w3 on p0089 q1, w6 on p0124 q3 and p0130 q3, w2 on p0087 q3 — each by checking
the shared word in the overlap. Writing that warning into the job description paid for itself.

**`render_bands.py` still has not been edited.** The crops were again produced by a throwaway loop in the
container. §9.211's decision 3 is therefore live for a second book and is re-asked below.

## The second finding: the printed folio runs 115, 114, 116 across pp. 121-123, read directly at 400 ppi

`queue.py folio-check` reports 94 of 132 pages carrying a folio line, in two offset populations — **+7
over pp. 10-90** and **+6 over pp. 91-132** — plus p0122 alone at +8, flagged as "usually a misread tens
digit". It is not a misread. Three folios were re-rendered at **400 ppi and read directly by the
coordinator**, independently of any arithmetic:

| page | printed folio | glyph evidence |
|---|---|---|
| p0121 | **۱۱۵** | third glyph a closed loop with an interior dot — the ۵ form |
| p0122 | **۱۱۴** | open hook with a straight descender — the ۴ form, unmistakably not the ۶ |
| p0123 | **۱۱۶** | filled blob with a tail rising right — the ۶ form, unmistakably not the ۷ |

Two consequences, and neither was acted on in the files.

1. **The book's own numbering is non-monotonic here: 115, 114, 116.** w6 read p0122 as 114, said
   `۱۱۶` "would close the run", and **deliberately did not smooth it**. It was right to refuse and its
   reading is correct. A human should settle pp. 0120-0123 from the images; the bands are in
   `bands_for_human_check_a_67-132_2026-09-19.tar.gz`.
2. **w6's folio run for pp. 123-132 is one too high throughout** — it read p0123 as 117 where the page
   prints 116, i.e. the ۶/۷ trap, on the one digit it was warned about. Its readings 117…124, 126 should
   probably be 116…123, 125. **Nothing was changed**: correcting one page inside a uniformly shifted run
   would make the set less consistent, and unlike §9.209 the two ends are not both anchored. The whole
   stretch pp. 0120-0132 wants a folio re-read, and the +6/+7 split over pp. 88-91 wants the same
   treatment — w3's two unambiguous anchors there (**p0094 = ۸۸**, **p0096 = ۹۰**, the latter with an
   unmistakable ۰) are where to start, and they imply w3's own p0089 and p0090 are each one low.

## The third finding, and it corrects §9.201: the missing folios are cut off in the source scan, not by the band

§9.201 diagnosed the missing folio lines on pp. 49 and 51 as band q1 clipping a number that "sits above
the frame rule", and asked for a taller q1 as a cheap fix. **That diagnosis is wrong and the fix would
not work.** q1 begins at y=0 of the rendered page and cannot clip anything. Rendered at 400 ppi,
**p0089's folio is cut in half by the top edge of the page image itself** — only the lower halves of two
glyphs are inside the PDF. No render setting recovers pixels that were never scanned.

That is one of three distinct causes behind the **20 pages with no `[folio N]` line** in this batch, and
they want different remedies:

- **The scan's own top crop** (p0089 and, on the same evidence, the other pages whose corner is sliced).
  Unrecoverable without a re-scan.
- **Verso set-off over the corner** — w5's five pages (p0111, p0113, p0115, p0117, p0119), where mirror
  ink specks sit exactly where the numeral is. w5 notes a worker re-reading *only* that corner would
  probably recover them; a black backing sheet on a re-scan certainly would.
- **A worker declining to guess a tens digit** — all eleven of w2's pages (pp. 78-88). w2 can see the
  units digit on ten of them (۳,۴,…,۰ with p0086 the rollover) but reads the tens glyph as ۵ on one page
  and ۸ on another, so it wrote no folio line at all rather than a wrong one. **That is the protocol
  working and the cheapest of the three to fix**: a single worker re-reading eleven top corners at
  400 ppi settles pp. 78-88.

Also: p0076, p0095, p0101 and p0131 have no folio for the same corner-damage reasons, each flagged by its
worker; **p0131's was refused explicitly** — w6 reports it nearly wrote `[folio 125]` by arithmetic from
its neighbours and omitted the line instead.

## Provenance: no stamp anywhere in pp. 67-132, and the absence is measured

**All six workers checked all four bands and both halves of all eleven of their pages and state
explicitly that no watermark, library stamp, accession mark, rights notice or press mark appears.**
Nothing was transcribed as `[source stamp: …]` in this range. §9.201's two marks (the accession stamp on
p0008, the unidentified circular Latin-capital stamp on p0014 reading `RES` … `RAJA`) remain the only
ones known on this book, and the second is still unidentified — matching it against Indian
research-institute wordmarks is still a job for a human.

Four marks that are *not* stamps and want an eye: **p0107** carries, beside the folio, a superscript pair
and a small dotted glyph that read like a printer's quire signature and appear on no other page in that
range (w4); **p0118** has an isolated mark above the frame between folio and running head, possibly a
gathering signature (w5); **p0069** has two faint sub-frame marks at the foot of q4, possibly the same
(w1); **p0122** shows descenders below the last line at bottom-left that may be a catchword (w6). None
was transcribed. If any is a press mark it is provenance, and the quire signatures would date the
gathering structure.

## A render defect worth fixing before the next batch: page skew loses line-starts on p0080

w2 reports that the band crops do not always contain the full text block, because the page is skewed
inside the scan. **p0080 is the worst: q1 loses ~280 px and q2 ~120 px at the line-start (right) edge,
and in q4 the left frame runs off the image** — so p0080 is missing a word or so at the start of its
first ~8 lines and possibly at the end of its last ~5. p0078 q1 loses ~45 px the same way. This is a
horizontal loss, so neither a taller q1 nor the half-crops address it; **a small horizontal margin, or
deskewing before banding, would**. p0080 also carries a sliver of the adjacent leaf across the top of q1
— a second frame rule and a header fragment — which w2 correctly excluded as not that page's text.

## Numerals, dates and names a human must settle, worst first

**Nothing in pp. 67-132 may put a date into a shrine record.** Bands for the 21 pages concerned are
packaged as `bands_for_human_check_a_67-132_2026-09-19.tar.gz` (full bands) and `…_b_…` (the half-crops
for the ten worst), so a person can settle these without re-rendering.

- **p0072 — the death date of Madho, and the single worst item in the batch.**
  `سنِ ایک ہزار [illegible] ہجری ماہ ذی الحجج کی بائیسویں[OCR?]` — the year word between "ہزار" and
  "ہجری" is unreadable; the day is **22 or 25**. The same page's birth chronogram prints `عدد ۲۲[OCR?]`
  (could be ۲۳/۳۲) with Persian number-words `سہ[OCR?] ہشتاد[OCR?] … نہ صد[OCR?]`, **deliberately not
  resolved to a year** — w1 records it could have produced a clean "983" and did not. Age
  `بہتر[OCR?] سال` (72) has a dot that reads above the letter, which yields no number at all.
- **p0109 — two chronogram years printed `۱۰۹۲`**, once above `سنہ` in Shah Chiragh's death sentence and
  once opening the line after the qitʿa. Third digit is the ۶/۹-inseparable glyph → **1092 or 1062**;
  the ۲ could be ۷. **The abjad of the chronogram hemistich `گفت سرور میر شمس العارفین` would settle
  it** and w4 did not compute it — that is the cheapest unresolved item in the batch.
- **p0097 — an inscription date on a marble slab** under `افضل الذکر لا الہ الا اللہ محمد رسول اللہ`:
  only the last two glyphs resolve, read `۸۵`, leading digits crushed against the frame. Written
  `[illegible]۸۵[OCR?] سنۃ الہجری[OCR?]`. w3 records it did **not** smooth toward 1285 even though 1285
  AH fits the book. Same page: the mosque foundation year `سنہ بارہ سو [illegible]` (Moran Begum's
  mother the patron) — the unit word reads `چوہتر`/`چہتر`/`ستر` and was left unread.
- **p0108 `۱۰۶۰`** superscript with the written-out hundreds untraceable → **1060 or 1090**, no verbal
  check available.
- **p0110** — `۱۲۶۸` in the wall inscription and `۱۲۶۹` in `سال سنہ … ہجری میں سردار جان موت ہو گیا`.
  Two dates one year apart on one page: either real or one glyph misread.
- **p0107 `۱۲۵۳` and `۱۲۴۳`** — w4 is not confident these are two numbers rather than one number read
  two ways.
- **p0116** — a **3-digit superscript beside `ماہ محرم پانچویں تاریخ`, unreadable**: this is the **urs
  date of Shah Abu Ishaq**, the highest-value shrine datum lost in w5's range. Same page, the chronogram
  `۹۴۴[OCR?]` → candidates 944 / 644 / 933.
- **p0113 `۱۲۵۱[OCR?]`** (Shah Abdullah Shah's death chronogram), **p0119 `سنہ ۱۲۶۴[OCR?]`** (khanqah
  rebuild), **p0120** `سنہ [illegible: digits]` with `غرہ[OCR?] ماہ رجب[OCR?]` for Shaykh Jauhar's death
  — day, month and year all unsafe. **p0118** Shaykh Musa's death in words, `سال [illegible] صد و بیست و
  [illegible]`, unusable as read.
- **p0105 `۱۷ ماہ ربیع الاول … یکہزار تیرہ ہجری`** — death of **Mauj Darya**, the most secure date in
  w4's range because the year is written out in words. The day's second glyph is ۲/۷-class. Note that
  `۱۷ ربیع الاول` recurs as the urs date lower on the same page **and again on p0109 for a different
  saint**; w4 asks whether that is the text or its own glyph habit. Worth one check.
- **p0130** birth `روز دوشنبہ[OCR?] سنہ ۹۶۰[OCR?] نہصد و شست ہجری` — the raised digits are unreadable
  alone and the reading rests on the spelled-out form, itself flagged; `دوشنبہ` vs `دسمبر` is a genuine
  ambiguity. **p0128 `۱۲۱۸[OCR?]`**, **p0129 `۱۲۸۱` plus `۱۲۸` twice** where a fourth digit may be lost,
  **p0125 `۱۲۳[?]ھ`**, **p0126 `۷[OCR?] ربیع الاول`** (۷ or ۲).
- **p0087 — the author's own dating of his investigation**, `بتاریخ ششم ماہ رمضان المبارک سنہ بارہ سو
  اکاسی` with a superscript **۱۲۸۱**: the word-form (81) and the superscript agree, which makes it the
  strongest date in the batch, but the superscript's hundreds/tens are the warned glyph class. An
  earlier `بارہ سو ستر[OCR?]` on the same page is much weaker — **and it sits on the one line w2 flags
  as its least certain assembly on the page** (the p0087 q3 half-join offset).
- **p0083** — Shah Hussain's death `سن ایک ہزار آٹھ[OCR?]` in words, where "آٹھ" could be "اٹھارہ";
  Madho's age `تہتر[OCR?]` with superscript **۷۳** agreeing.
- **Counts, all load-bearing for the topography and all uncertain:** p0122 "گیارہ دروازہ" against p0123
  "بارہ دروازہ"; p0124's three door-counts in one sentence; p0089's `۱۶[OCR?]` bighas (۶/۹); p0098's
  `ساتہہ[OCR?] ستر[OCR?] قبریں`; p0109's `۳۴ قبریں` (could be 33/43/44); p0115's `۱۶[OCR?] عشرہ[OCR?]
  قبریں`; p0121's `[illegible] کنال اور گیارہ مرلہ`; p0132's entire inheritance passage.
- **Names contested rather than merely uncertain.** The recurring ones matter most because one
  correction propagates: **`سائیں موت شاہ`** (w3, ~6 times across pp. 90-98 — could be بوت/ہوت/مست);
  **`حضرت رنگ[OCR?] بلاول[OCR?]` vs `حضرت رنگ[OCR?] لادل[OCR?]`** (p0091 vs p0094, the same builder of
  the khanqah, read two ways by one worker, neither right); **`شیخ عبد الخلیل` vs `شیخ عبد الجلیل`**
  (p0118 running head vs in-text heading, recurring on p0119); **`شیخ ارادی` vs `شیخ ارزانی`** (p0073
  against pp. 74-76, same person). Single-witness names: p0079's `[illegible] سنگھ` — **w2 refused to
  write "شیر سنگھ" because that is the historically expected form**; p0106's `تورہ صاحب فرانسیس[OCR?]`
  and p0123's "کوٹھی مکنائی صاحب", both European names in an Urdu lithograph; p0131's
  **`ملا نعمت اللہ`, where the glyph equally supports `لعنت اللہ`**; p0098's burial register of nine
  names, each single-witness; p0104's genealogical stretch, w4's least reliable block. p0130's
  "مہا راجہ رنجیت[OCR?] سنگہ" — the glyph reads رعیت as easily as رنجیت.

## Where the workers caught themselves composing — still the behaviour these runs want

All six reported it, every instance was replaced with a mark, and the count is higher than on khulasat
because this hand gives less to hold on to. The sharpest, worth naming:

- **w4 on p0100 q4** recognised Rumi's `کار پاکاں را قیاس از خود مگیر` the moment it traced `شیر و شیر`,
  and still left `ماند` as `[illegible]` because it could not trace it.
- **w6 on p0123** began writing out the hadith `إن أولياء الله لا يموتون…` from memory; the page's tail
  is genuinely unreadable and the output stops at `بل ینتقلون[OCR?] [illegible]`.
- **w5 on p0121** recognised the Punjabi rhyme after "میر منو" and wrote none of the remembered wording.
  **This is the single place a checker will most want to look.**
- **w3 on p0089** kept `شب برات[OCR?]` but reports the reading is context-driven, not glyph-driven — the
  three dots of ش are not visible — and flags it as a hypothesis rather than a reading.
- **w4 on p0102** traced `ا-ل-ل-ہ م-ی-ر-ی` and "corrected" it to `اندھیری` because tents breaking and
  lamps going out demanded a storm; it says so, and flagged the whole phrase.
- **w2 on p0079** stopped one keystroke short of "شیر سنگھ"; **w1 on p0072** stopped short of a clean 983;
  **w6 on p0131** stopped short of a folio by arithmetic; **w3 on p0092** stopped short of inventing a
  fourth name into a spaced list.

w4's closing judgement on its range is the honest summary of the whole batch: at ~0.36 this is **a
locating index — it will support "which shrine, which saint, roughly where" but not quotation.** That is
exactly the finding-aid the third option in §9.201 decision 1 described, and it is what the book is good
for.

## Structural: this book's verse is not two-column anywhere, and §9.201 decision 3 generalises

**Not one of the six workers met a genuine two-column verse passage in 66 pages.** Every verse passage in
pp. 67-132 is set **run-on inside the prose lines**, several hemistichs to a printed line, separated by a
small printed mark (`٭` w1, `۞` w2, `؞` w5), and reads **straight right-to-left across the line and then
down** — the pp. 36-38 qasida reading, not the protocol's flat "right column first, then left". Four
workers derived that independently; w4 proved it from metre on p0105 (ramal, rhyme on the even
hemistichs: `الیقین / زمین / گزین`), where the flat rule would scramble it. **§9.201 decision 3 is
therefore not an exception for pp. 36-38 — it is the rule for this book**, and `WORKER_PROTOCOL.md`
should say so. It was not edited unilaterally.

One caveat on layout: on p0105 the hemistichs do not align with printed lines at all (line 12 holds three
and a half), so w4 could not use the "two hemistichs on one printed line, three spaces" form and set one
hemistich per line. Anyone re-deriving a chronogram from these files **must work from the printed line,
not from the transcription's line breaks** — w2 says the same about p0078's qitʿa.

Other structural notes: rubrics (`شعر`, `قطعہ`, `تاریخ`, `تنبیہ`, `حکایت`) and section headings are set
**run-in mid-line** throughout and were lifted onto their own lines. **No footnotes anywhere in pp.
67-132** — so nothing was lost to a crop edge or an overprint, unlike khulasat. Interlinear printer's
corrections (a small word or numeral above the line) occur on at least fourteen pages and were recorded
as `[margin] …`; w3 and w4 both note `[margin]` is the wrong token for them and ask for a better one.
w3 also used a `[gap]` token for genuine blank stretches inside justified lines (p0092 l.7, p0093 l.3,
p0096 l.6, p0097 l.1, p0098 l.21, p0099 l.19) — **not in the protocol**; nothing is hidden behind them
and they can be stripped, but the token should be either adopted or banned.

**Shrine-relevant content, securely read:** the Madho Lal Husain complex dominates pp. 78-99 — the
sarguruhi/sajjada-nashin succession (p0090, p0083), the construction history of the mazar (p0090), a
room-by-room architectural survey of the khanqah (pp. 91-99), the land-grant and income account with
named villages and bigha figures (pp. 89-90, all numerals flagged), the `میلہ شب برات و چراغاں`
(pp. 78-80), and `بیان سیر گردی و معافیات متعلقہ خانقاہ` (pp. 87-88). pp. 100-110 are **Mauj Darya
Bukhari**; pp. 111-121 a sequence of Qadiri tombs (Shah Abdullah Shah, Shah Abu Ishaq, Muhammad Husain,
Shaykh Musa, Shaykh Abd al-Jalil/Khalil al-Suhrawardi, Shaykh Jauhar); pp. 122-132 Shah Khairuddin Abu
al-Maʿali Qadri, Miyan Mir and Mulla Shah, plus **a cemetery register of some twenty `شاہ` graves on
p0132** whose names are effectively all single-witness. Every one of these is a shrine the archive either
holds or should.

## Housekeeping

- **`khulasat_ut_tawarikh` pp. 297-362 are lost and must be re-transcribed.** The 02:43Z run transcribed
  all 66 and lost the bridge before write-back, leaving them only in a chat file card; §9.211's sweep of
  `/Users/rauf/Downloads` (granted to that run) found **nothing newer than 18 Sep 23:49 and no matching
  tarball**, which settles the same question for this file as for ernst's. **The six stale leases
  (297-307 … 352-362, taken 02:43Z, zero pages written) were released individually by name this run**, so
  the deliberate `HOLD-vsplit-index-errata` lease on 17-38 was untouched. That book stands at 264/610,
  ranges 1-16 and 49-296. This is the second 66-page loss in two days to the same cause.
- **This run committed its pages before writing anything else**, per §9.211's rule. The bridge dropped
  twice during the run (21:36Z and 21:41Z, the Mac unreachable for ~13 minutes) and the folder had to be
  re-granted at session start, so the rule earned itself again.
- **A concurrent session was working the takeaways front throughout** and wrote §9.211 and §9.212 while
  this run was transcribing. Its housekeeping correctly attributed this run's `state.json` write from the
  counters. `RUN_IN_PROGRESS_tahqiqat_chishti.md` at session start was that session's 16:20Z claim on
  pp. 67-114; **it held no leases and had written no pages**, so it was superseded rather than collided
  with — §9.209's rule again, that only `pNNNN.txt` is evidence of work.
- **`queue.py lease` still cannot see band renders** (`page_images()` globs `pNNNN.png` and
  `pNNNN_{a,b}.png`, never `pNNNN_qN.png`), so the six leases were again written through queue.py's own
  `load_state`/`save_state`. Third run running. **Either `page_images` learns about `_qN` bands or
  `lease` takes an explicit `--pages`.**
- **`queue.py folio-check` is usable on this book** — unlike khulasat, this one ascends, so the
  `folio = pdf + offset` model fits. Read its two offset populations as a real feature of the book, not
  as noise.
- New files: 66 × `pNNNN.txt` in `out/ocr/tahqiqat_chishti/pages/`, `pages_67-132_2026-09-19.tar.gz`,
  `bands_for_human_check_a_67-132_2026-09-19.tar.gz`, `…_b_…`, the rewritten
  `RUN_IN_PROGRESS_tahqiqat_chishti.md`, the cleared/updated leases in `state.json`, and this entry.

## Decisions for Rauf — RULE 5. Recorded here as the record of the asking, not as the asking.

1. **Is the 18 September ruling on §9.201 decision 1 real, and will you write it into `docs/`?** This run
   proceeded on your brief, not on the claim file, and the two agree — but a ruling whose only record
   overwrites itself is not a record. If the finding-aid framing is the standing policy for this book,
   `docs/` should say so and `WORKER_PROTOCOL.md` should carry the skip-and-log clause.
2. **§9.211's decision 3, now asked for a second book.** The half-crop render moved this book's
   `[illegible]`/1,000 from 40.1 to 31.6 and all six workers call it decisive. **May `render_bands.py`
   grow a flag that emits `_r`/`_l` crops as standard for route=vision, and may `WORKER_PROTOCOL.md`
   gain "read the full band for structure, the crops for numerals, names and hemistich position"?**
   Neither file was edited.
3. **May `WORKER_PROTOCOL.md` record that this book's verse is read straight across the line?**
   §9.201 decision 3 asked this as an exception for pp. 36-38; 66 more pages say it is the rule for
   `tahqiqat_chishti`. Related and smaller: adopt or ban w3's `[gap]` token, and give the interlinear
   printer's corrections a token of their own instead of `[margin]`.
4. **Two render fixes, both now diagnosed rather than guessed.** (a) §9.201's "taller q1" should be
   **dropped** — the folio loss is in the source scan, not the band. (b) **A horizontal margin or a
   deskew before banding** should replace it: p0080 loses ~280 px of line-starts to page skew, which no
   vertical adjustment touches.
5. **Should a single worker re-read just the folio corners of pp. 78-88 and 120-132 at 400 ppi?**
   Twenty-two top corners, no re-transcription, and it would close both the w2 tens-digit gap and the
   115/114/116 anomaly. Cheaper than any other quality step available on this book.

**Git, unchanged from §9.196 through §9.212.** Not attempted; `unlink` is blocked on this mount and even
`git status --porcelain` bus-errors. Every file above is left uncommitted in the working tree.
**`git add -A && git commit` is Rauf's to run.** Nothing was pushed.
