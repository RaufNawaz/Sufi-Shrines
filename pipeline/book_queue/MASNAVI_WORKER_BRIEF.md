# Masnavi worker brief — the maktabah daftar set (masnavi_01..06) and masnavi_01_text

Written 23 September 2026 by the calibration firing Rauf asked for before any masnavi page was
transcribed ("do not transcribe 2,592 pages first and discover the settings were wrong, which is
what cost tahqiqat_chishti six failed worker batches"). Full account: `docs/HANDOVER.md` §9.227.
Sample transcriptions and the folio evidence sheet: `out/ocr/_calibration_2026-09-23/`.

**Everything here is measured. Do not re-derive it. If you contradict it, say so and say how.**

---

## THERE ARE TWO DIFFERENT BOOKS HERE, NOT SEVEN VOLUMES OF ONE

| | `masnavi_01` .. `masnavi_06` | `masnavi_01_text` |
|---|---|---|
| edition | مثنوی مولانا روم, daftars 1–6, lithograph, Persian verse + interlinear Urdu + margin glossary | "Masnavi Rumi with Urdu translation by Qazi Sajjad", Urdu prose commentary with Persian couplets quoted inside it |
| PDF producer | cairo 1.10.2 | LuraDocument, "Digitized by the Internet Archive" |
| native scan | **579–781 px across the whole page** (88–112 dpi) | **4200 px, 600 dpi** |
| maktabah mark | separate PDF overlay, object id 2, 1050×1290, byte-identical in all six files | burned into the 600 dpi scan itself |
| folio | bottom centre, in a medallion on the frame's bottom rule | **top centre**, inside the arc of the frame |
| render with | `render_masnavi.py` | `render_bands.py --scale 4400 --folio-top 0.10` |

**`masnavi_01` is daftar 1 of the six-volume set** — its cartouche reads `دفتر اوّل | مثنوی مولانا روم`,
its producer, page size, scan resolution and maktabah overlay object all match daftars 2–6 exactly.
It is currently `skipped`, on a 14 September note calling it a "duplicate of masnavi_01_text (same
edition, lower resolution scan)". **The "same edition" half of that is measurably wrong.** It is one
of Rauf's three standing holds, so nothing was changed; the question is with him.

---

## STAGE A — masnavi_01..06 (the daftar set)

### Render

    python3 pipeline/book_queue/render_masnavi.py <slug> --pages A-B \
        --pdf <staged pdf> --outdir <dir>

~5 s a page in the cloud container. Emits, per page: `_full` (structure only), `_header`,
`_verse1..3`, `_margin1..3`, `_folio`. All crops are under the 2000 px delivery cap and arrive whole.
The script **refuses** to run on a book whose scan is over 1500 px — that would mean a real scan had
turned up and upsampling it through this recipe would be the wrong move.

**Why not `render_bands.py`.** The scans are 579–781 px across the WHOLE PAGE. There is no 2462 px
text line to reach and no amount of `--scale` will invent one. A full-width band of a 750 px page is
still 750 px, so banding alone magnifies nothing — measured directly: a control worker given native
full-width bands reported the small type stayed at 8–10 px in the bands exactly as in the whole page.
What works is spending the 2000 px cap on the type instead of on blank paper and frame ornament:
render at ~3000 px (4× native) and crop by zone. Same page, two workers, blind to each other:

| | native + full-width bands | 4× + zone crops |
|---|---|---|
| Persian verse | 85% | 93% |
| interlinear Urdu | 45% | **88%** |
| margin commentary | 30% | **85%** |
| `[illegible]` per 1,000 chars | 7.83 | **1.12** |
| `[OCR?]` on the page | 37 | 6 |

**No information is added by the upsample.** The gain is entirely in delivered glyph size, the same
mechanism as §9.210's halves.

### THE COLUMN TRAP — read this before you transcribe a single line

**Each printed ROW is ONE bayt: the right column is misra 1, the left column is misra 2 of the SAME
couplet.** `WORKER_PROTOCOL.md` says "two column pages in Urdu: right column first, then left". Applied
literally here that produces all twelve first-hemistichs followed by all twelve second-hemistichs and
**scrambles every couplet on the page.** Two workers spotted this independently and one proved it from
the sense of a couplet split across the two columns.

**So: one printed row → one output line, the two hemistichs separated by three spaces**, per the
protocol's own rule for two hemistichs on one printed line. The Urdu gloss row beneath does the same.

A worker also reported that it **could not reliably judge horizontal position inside a single image** —
its sense of "this text is on the left" was repeatedly wrong. Column identity comes from which crop a
complete hemistich appears in, not from where it looks like it sits. Do not ask a worker to infer
columns from within-image coordinates.

### THE GLOSS IS A SECOND WITNESS — and that cuts both ways

Every hemistich carries a small Urdu translation printed directly beneath it, and the margin column is
a numbered glossary keyed to the verse with `؎`. Five of six workers used the gloss to settle a
Persian word whose letterforms alone were ambiguous (`سگ` vs `سنگ`, settled by a gloss reading `کتّا`;
`کُہ`, by `پہاڑ`; `ارمغاں`, by `تحفہ`).

**That is reading a second printed witness on the same page, and it is legitimate — but it must be
visible.** Rule for this book: when a reading was settled by the gloss rather than by the glyphs,
mark the word `[OCR?]` and say so in your report. Otherwise it is a guess wearing a citation.

### FOUR WORKERS RECOGNISED THE TEXT. THE VERSE NUMBERS ARE CONTAMINATED.

This is the most reprinted Persian poem there is and every worker has read it before. Two said plainly
that their verse confidence was recognition-assisted and would fall to 88–90% on an unfamiliar page;
one wrote *"a worker who knows the text is a worker whose confidence numbers run ahead of their eyes."*
Two named specific near-misses where metre and memory pushed them to supply a word they had not read
(`شد` in `آنکہ از نورِ الٰہش ___ ضیا`; a `-ید` rhyme in a bayt whose rhyme had failed).

**Judge this scan by the margin column, not by the verse.** The glossary and the interlinear gloss are
this edition's own apparatus, they cannot be recited from anywhere, and their 70–85% is the honest
measure of what these 600–750 px scans support. Treat every verse figure as the soft one.

### Page furniture, measured on all six volumes

- Header: two linked cartouches, `دفتر اوّل/دوم/سوم/چہارم/پنجم/ششم` and `مثنوی مولانا روم رح`.
  Transcribe as a running header only if the job asks; otherwise omit per protocol.
- Folio: Eastern Arabic-Indic digits in a decorated half-medallion centred on the frame's bottom rule.
  **The PDF→folio offset differs per volume** — measured d1 100→94, d2 30→28, d3 100→96 (second digit
  96/97 unresolved), d4 100→98, d5 100→94, d6 100→98. **Read it on every page; never derive it.**
  §9.225's rule stands: no folio on a scribal lithograph may be cited from a single reading.
- `www.maktabah.org`: grey script across the blank margin **below** the frame. Four workers confirmed
  independently that **it covers no printed text.** Transcribe once as `[source stamp: www.maktabah.org]`.
- Handwritten accession marks appear on some pages and not others (a pencil `554` below the folio on
  d4 p100, nothing on d5 p100). Record them; do not smooth them into the folio.
- The margin box is often only 25–60% full. **A blank margin crop is a normal result, not a failure.**
- d5 p100 carries a soft grey rectangular scan shadow over the lower-right quadrant, and two margin
  lemmas there are destroyed by ink blots on the stone — `[ink blot: ... illegible]`, and no rescan
  recovers those.
- A boxed section heading (large Persian inside a rule, with its own Urdu glosses) interrupts the verse
  on some pages. Fence it `[boxed heading]` / `[end of boxed heading]` so it is not miscounted as extra
  hemistichs.

### Conventions this edition needs and WORKER_PROTOCOL.md does not yet have

Decide these centrally rather than per worker — two workers asked for exactly that:

- **Interlinear gloss lines** are prefixed `[urdu]` in the calibration samples. Structural, easy to
  strip. Keep it unless Rauf says otherwise.
- **Final nun.** The lithograph sets dotless `ں` in `آں، چوں، جاں، دستاں`. One worker wrote it dotless
  eight times as a single repeated convention, not eight readings. Keep as printed; do not normalise
  to `ن`.
- **`ه` / `ہ` and `که` / `کہ`** are the same printed glyph here. The calibration used Persian forms in
  Persian lines and Urdu forms in Urdu lines. That is a convention, applied silently — say so.
- **Margin column line counts.** The protocol's prose rule ("do not keep the scan's line breaks inside
  a paragraph") destroys the line count that step 4's omission check depends on. Three workers hit this.
  Report the printed margin line count in your message even though your file reflows it.

### Expected shape of a page

12–13 bayts (24–26 hemistichs), the same number of interlinear gloss lines, 20–37 margin lines,
3 numbered notes. Count before you write, account for every line, and report the counts.

---

## STAGE B — masnavi_01_text (416 pp, 600 dpi)

Render with the existing tool — this book has a real scan and deserves it:

    python3 pipeline/book_queue/render_bands.py masnavi_01_text --pages A-B \
        --pdf <staged pdf> --outdir <dir> --scale 4400 --bands 4

**Note the band width is 2800 px here, not tahqiqat's 2462** — the page is 504×792 pt, so `--scale
4400` gives a different width. 2800 px still exceeds the 2000 px cap and **is delivered downsampled**;
the `_r`/`_l` halves at 1570 px arrive whole. §9.216's rule holds unchanged: **read the band for
structure and line count, both halves for the words.** The calibration worker confirmed the bands are
"mushy" for dots and the halves are not.

Measured on p30: Urdu prose commentary 85%, Persian verse 95%, small Urdu gloss 70%. 21 prose lines,
10 hemistichs, 10 gloss lines. **The best page the corpus has seen** — compare tahqiqat_chishti's
measured mean of ~48%.

- Layout: an ornate floral frame; dense Urdu prose commentary across the full width, interrupted by
  Persian couplets in two columns in a larger hand, each with a small Urdu gloss beneath.
- **Folio is TOP CENTRE**, inside the arc of the frame (p30 → 24). `--folio-strip`'s centred crop is
  right for this book, unlike tahqiqat. The calibration's own dedicated folio crop was cut too high
  and the worker read the folio off `q1` instead — if you add a folio crop, take y 0.015–0.115 H.
- This scan **also carries the maktabah watermark**, burned into the image rather than overlaid, so
  it is a maktabah digitisation and not a clean IA file. Provenance, not decoration: record it.
- One anomaly to expect a disagreement on: at p30 the first couplet's hemistichs appear in reverse of
  the canonical order while the gloss row beneath runs canonically. The calibration transcribed as
  printed. If a second worker reads that row the other way round, that is the known split.

---

## What this brief does not settle

- **Scope.** The interlinear gloss and the margin glossary are roughly two thirds of the work on every
  daftar page and are the two lowest-confidence zones. They are also the only part of these volumes
  that is not the Masnavi itself. Whether the archive wants them is Rauf's call and it is worth
  ~2,000 pages of effort. Asked in the run report; not parked here.
- **masnavi_01's hold**, above.
- **masnavi_03's folio second digit** (96 vs 97) and every other single-reading folio. The evidence
  sheet `out/ocr/_calibration_2026-09-23/masnavi_folio_evidence_2026-09-23.png` puts all six in one
  image; a human reading it once ends the question, exactly as §9.225 recommended for tahqiqat.


---

## SECOND COHORT, same day — three of these statements are contradicted by measurement

A second firing of this same hourly task ran the calibration **concurrently and blind to this one**
(05:05Z vs 05:08Z; neither took a lease before starting, which is why both ran). Its measurements
are in `pipeline/book_queue/MASNAVI_CALIBRATION_COHORT_B.md` and `docs/HANDOVER.md` §9.229.
**Read that file before briefing anyone on `masnavi_01_text`.** In brief:

1. **`masnavi_01` IS the same edition as `masnavi_01_text` — the 14 September note was right.**
   `masnavi_01` p100 and `masnavi_01_text` p100 are the same printed page line for line, both files
   are exactly 416 pages, and `masnavi_01_text` p30 — the page this brief's STAGE B was measured on
   — is the editor's Urdu prose **front matter**, not the book's shape. STAGE B's description of the
   book, and its "top centre" folio, hold for the front matter only; from roughly p40 the book is
   the daftar-set layout with a **bottom-centre** folio. Evidence image in
   `out/ocr/_calibration/masnavi/`. `masnavi_01`'s `skipped` hold is correct and needs no revisiting.

2. **`masnavi_01_text`'s margin glossary is the worst-served zone in the corpus, not the best.**
   Two blind readers agreed on only **40.3%** of its tokens (delivered at 2.05x from the bitonal
   JBIG2 mask) against **83.3%** for `masnavi_02`'s glossary delivered at 5.5x from the greyscale
   scan — despite `masnavi_01_text` having 5.7x the native resolution. On the verse the ranking
   reverses (91.4% vs 84.7%), which is this brief's own contamination effect measured. **Split the
   margin column left/right and derive its bands from ink extent before transcribing this book.**

3. **The folio units digit is contested.** Two workers and a coordinator read of both scans of the
   same printed page give `masnavi_01_text`/`masnavi_01` p100 = **92**; this brief gives 94. Do not
   settle it by another model reading (§9.225). `masnavi_02` p100 = 98 is agreed, offset −2.

Everything else in this brief was independently confirmed: the one-bayt-per-row column trap, the
contamination of the verse numbers, the maktabah overlay object, the part-full margin box, the
boxed headings, and the per-volume folio offsets.
