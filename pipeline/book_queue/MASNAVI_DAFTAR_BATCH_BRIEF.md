# Masnavi daftar-set production brief — masnavi_01..06 (the maktabah lithograph)

Written 23 September 2026 by the **first production batch** (masnavi_02 pp. 1-30, §9.231), which
is the first time any of these six volumes was transcribed rather than sampled. It supersedes the
calibration's crop instructions where the two disagree and is the file a worker should be pointed
at. Give every worker, in this order:

1. `pipeline/book_queue/WORKER_PROTOCOL.md` — the general rules.
2. `pipeline/book_queue/MASNAVI_WORKER_BRIEF.md` — the calibration's account of the edition. Its
   **STAGE A** applies; its **STAGE B** (`masnavi_01_text`) is a different file and does not.
3. **This file, which wins on any conflict.**

The books: مثنوی مولانا روم, daftars 1-6, lithograph, Urdu translation by **Qazi Sajjad Husain**,
Hamid & Co., Urdu Bazar, Lahore; digitised by maktabah.org. Persian verse with an interlinear
Urdu gloss and a numbered Urdu margin glossary. Native scan 579-830 px for the WHOLE page.

---

## 1. TWO PAGE LAYOUTS PER VOLUME, AND THE RENDERER LABELS THEM

`render_masnavi.py` writes `layout.tsv` beside the crops: every page is `prose` or `body`. On
masnavi_02 the split was **pp. 1-16 prose, pp. 17-366 body**, with a clean separation in the
detector (prose dip <= 8.6, body >= 18.2). Expect a comparable front matter in the other volumes
and **read `layout.tsv` rather than assuming where it ends.**

**prose** — p1 is the printed cover; p2 is a blank flyleaf carrying only a very pale dome
silhouette plus the watermark; from p3 the translator's Urdu prose introduction runs full width
inside an ornate floral frame. Folio **top centre**. No margin box.
**body** — daftar 2 opens at p17 with an illuminated basmala panel. Two columns of Persian verse,
a small Urdu gloss under each hemistich, a boxed numbered margin glossary. Folio in a
**bottom-centre medallion**.

`layout.tsv` says `body`; this brief and the addendum language say `verse`. Same pages.

## 2. THE MARGIN GLOSSARY ALTERNATES SIDES BY PAGE PARITY

Even PDF page: verse frame on the left of the image, margin box on the right (x ~0.68-0.88).
Odd page: mirrored — margin box left (x ~0.14-0.33), verse frame right (x ~0.35-0.94). The
calibration measured p30 and p100 only, both even, which is why the first renderer hardcoded
even-page geometry. **The boundary also drifts page to page** (0.606 to 0.687 over fourteen
consecutive pages), so it is detected per page, not fixed.

A worker does not need to care: the crops are already cut for that page. **Tell every worker never
to judge horizontal position from inside an image** — a calibration worker reported its sense of
"this is on the left" was repeatedly wrong.

## 3. THE COLUMN RULE: RIGHT = MISRA 1, LEFT = MISRA 2. ON BOTH PARITIES.

Each printed ROW is ONE bayt. **One printed row → ONE output line, the two hemistichs separated by
three spaces.** The interlinear Urdu row beneath does the same, on its own line prefixed `[urdu]`.
Transcribing one whole column and then the other scrambles every couplet on the page.

The calibration wrote this as "outer column is misra 1". **Two workers independently reported that
that inverts on even pages** — on an even page the misra-1 column is the one *adjacent* to the
margin box. Both verified it by rhyme and by the gloss running the same way. So the rule is simply
**right-to-left within the verse block**, which held on every row of thirty pages.

## 4. THE NUMBERS ON THE PAGE — THERE ARE TWO, AND ONLY ONE IS THE FOLIO

- **Folio** = the printed page number, in Eastern Arabic-Indic digits, in the bottom-centre
  medallion (body) or top centre (prose). masnavi_02 measured offset **folio = PDF − 2**,
  100% of 28 pages, `queue.py folio-check` clean, no uncertainty markers. **Read it anyway on
  every page; never derive it** (§9.225). Offsets differ per volume.
- **Handwritten number below the frame** = **PDF + 406** on masnavi_02 (409 on p3 → 436 on p30;
  pp. 1-2 carry none). **It is handwritten, in WESTERN digits, and it is NOT the folio.** Four of
  six workers in the first batch read its leading `4` as an Urdu `۹` and reported PDF+906; two
  read it correctly and said so. Settled by reading all 28 off two labelled evidence sheets at 220
  and 429 dpi (`out/ocr/masnavi_02/evidence/`). Transcribe as
  `[below frame: 435]` on its own line, in Western digits as printed.
  daftar 2's PDF p1 = hand number 407, and masnavi_01 is 416 pages, so this is almost certainly a
  continuous hand-pagination of **one bound composite volume** — independent support for §9.229's
  finding that the six daftars are one edition. **Check the offset on each volume; it will differ.**
- Numerals stay the least reliable thing in this corpus. Flag every uncertain digit `[OCR?]`;
  never smooth a date or a verse number.

## 5. THE CROPS

`render_masnavi.py SLUG --pages A-B --pdf <staged.pdf> --outdir <dir>`, ~18 s a page in the cloud
container (a single `pdftoppm` for the range saves nothing — the cost is rasterisation, measured).

Every page: `pNNNN_full.png` (**structure and LINE COUNTING only — never read words off it**),
`pNNNN_foliotop.png`, `pNNNN_belowframe.png`, `pNNNN_foot.png`.
body pages also: `_header`, `_verse1..3` (7% overlap), `_margin1..3` (10% overlap).
prose pages also: `_band1..4_r` and `_band1..4_l` — four horizontal bands, each split into a RIGHT
and a LEFT half. **Urdu reads right to left: `_r` then `_l`.** The halves overlap ~2.4% of the page
width; transcribe the overlap once.

`_foot` and `_belowframe` were added by this batch because the first batch had neither:
- the folio medallion sits on the **verse frame's** centre, so on an odd page (frame offset right)
  a page-centred crop missed it and three workers had to read the folio off `_full`;
- the handwritten number was in **no crop at all** on any page, which is why four workers misread it;
- a **footnote / margin-overflow strip** sits inside the frame below the verse block on some pages
  (seen on pp. 18, 19, 20, 21, 22, 23, 26) and no `_margin` crop reached it. On p20 it is a direct
  continuation of the margin glossary, which ends mid-entry. `_foot` covers all three.

## 6. THINGS THAT LOOK LIKE EXCEPTIONS AND ARE NOT

- **Verse appears on prose pages.** masnavi_02 p5 and p11 set Persian couplets in two columns with
  an interlinear gloss inside the prose introduction. Apply the column rule there too.
- **Boxed headings appear on prose pages**, and some are **run-in**: the box occupies ~2 line
  heights at the right of the column and body text flows to its left before resuming full width.
  A worker counting lines off `_full` gets this wrong. Fence every box `[boxed heading]` /
  `[end of boxed heading]`.
- **The `؎` verse-key glyph is drawn like a `۵`/`ه`** and reads as a second digit at first glance.
  One worker wrote margin keys as 15/16/17 before a cleaner crop settled them as `۱؎ ۲؎ ۳؎`. The
  keys restart at 1 on each page. This is a systematic error, worth naming to every worker.
- **A part-empty or empty margin box is normal** (25-60% full). Write `[margin]` then `[blank]`.
- **Pages begin and end mid-sentence** throughout the prose introduction. Transcribe as printed;
  close nothing.
- **masnavi_02 p11's couplets are printed in reverse of canonical Masnavi order, and the gloss row
  runs reversed with them** — so verse and gloss agree. Transcribe as printed. (This is not the
  `masnavi_01_text` p30 anomaly, where only the verse was reversed.)
- Index/endnote locators: none in this edition so far.

## 7. HOUSE CONVENTIONS FOR THIS EDITION

- `[urdu]` prefix on interlinear gloss lines; `[margin]` before the glossary; `؎` kept as printed.
- Footnote strip inside the frame: `حاشیہ:` per the protocol, one printed line per output line.
- Final nun: the lithograph sets dotless `ں` in `آں، چوں، جاں، دستاں`. **Keep as printed.** One
  convention, not a reading per word.
- `ه`/`ہ` and `که`/`کہ` are the same printed glyph: Persian forms in Persian lines, Urdu forms in
  Urdu lines, applied silently.
- `[source stamp: www.maktabah.org]` once per page. It sits below the frame, covers no printed
  text — but it does overlap the handwritten number.
- Ink blots on the stone: `[ink blot: illegible]`.

## 8. THE TWO WAYS THIS GOES WRONG, AND THEY ARE BOTH ON THE WORKER

1. **You know this poem.** Four of six calibration workers recognised the text; two named places
   where metre and memory made them supply a word they had not read. If a word arrives faster than
   you read it, mark it. **A page 60% read and honestly marked beats a page 95% recited.**
2. **The gloss is a second witness and using it must be visible.** The Urdu gloss and the margin
   lemma legitimately settle ambiguous Persian. But if a reading came from the gloss rather than
   the glyphs, **mark the word `[OCR?]` and name it in the report** — otherwise it is a guess
   wearing a citation. The first batch produced 15 such readings across 30 pages, all named.
   **Where the verse and its gloss disagree, transcribe the verse and report the disagreement.**
   Do not harmonise (a worker found `قیانوس` printed under a gloss reading `دقیانوس`, and was
   right to leave it).

## 9. OUTPUT AND REPORT

One UTF-8 `pNNNN.txt` per page, nothing else. Shape:

    [folio 27]
    [below frame: 435]
    ...text...
    [margin]
    ...glossary...
    [source stamp: www.maktabah.org]

Count the printed lines before writing and account for every one. Never skip a page.
Report: range; per page the folio read and whether it matched the volume's offset, the below-frame
number, printed line counts vs written; pages with `[illegible` or 3+ `[OCR?]`; every word settled
from the gloss rather than the glyphs; anything contradicting this brief.

**Expected shape of a body page:** 11-13 bayts (22-26 hemistichs), the same number of gloss lines,
18-41 margin lines, 3 numbered notes. **Prose page:** 26-30 printed lines.
