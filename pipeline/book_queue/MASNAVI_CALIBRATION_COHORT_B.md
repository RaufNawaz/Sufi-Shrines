# Masnavi calibration — SECOND COHORT (independent), 23 September 2026

Two firings of the hourly book-queue task ran the masnavi calibration **concurrently and blind to
each other**: one started 05:08Z (its account is §9.227/§9.228 and
`MASNAVI_WORKER_BRIEF.md`), this one started 05:05Z (§9.229). Neither saw the other's leases,
because this run took no lease before it started work — a mistake, and the reason the duplication
happened; see §9.229.

The duplication is not wasted. Two blind cohorts, four workers each, on the same books is the
strongest instrument this project has, and the two cohorts **agree on the mechanism and disagree on
three facts**. This file records only what THIS cohort measured. Where it contradicts
`MASNAVI_WORKER_BRIEF.md` it says so and says how, as that brief asks.

Evidence: `out/ocr/_calibration/masnavi/` — four worker transcriptions, the crop manifest, and five
labelled evidence images. (The other cohort's samples are in `out/ocr/_calibration_2026-09-23/`.)

---

## 1. `masnavi_01` IS the same book as `masnavi_01_text`. The 14 September note was right.

`MASNAVI_WORKER_BRIEF.md` states that the two are different editions and that the 14 September note
calling `masnavi_01` a "duplicate of masnavi_01_text (same edition, lower resolution scan)" is
"measurably wrong". **That is itself wrong, and the error is a front-matter-vs-body comparison:**
the other cohort measured `masnavi_01_text` **p30**, which is in the editor's Urdu prose
introduction, against the daftar set's **p100**, which is body text.

Measured here on the SAME page index in both files:

- **`masnavi_01` p100 and `masnavi_01_text` p100 are the same printed page, line for line** — same
  header cartouche, the same two boxed headings in the same positions
  (`نومید کردن وزیر مریدان را در نقص خلوت`, `ولی عہد ساختن وزیر یک یک مرید را جدا جدا`), the same
  verses in the same order, the same margin glossary, the same folio medallion.
  Image: `EVIDENCE_masnavi_01_is_same_book_as_masnavi_01_text.png`.
- **Both files are exactly 416 pages** and both are 504 x 792 pt.
- `masnavi_01_text` **p30** is a completely different layout — an ornate floral frame with dense
  Urdu prose. That is front matter, not the book's shape.

So: `masnavi_01_text` is a **600 dpi scan of daftar 1**, the same edition as daftars 1–6, with a
prose introduction in its front matter. It is not a separate commentary work, and STAGE B of the
brief describes only its opening pages. A worker briefed with "Urdu prose commentary with Persian
couplets quoted inside it" will be wrong from roughly p40 to p416.

**Consequences.** `masnavi_01`'s `skipped` hold is CORRECT and should stay — transcribing both would
double-count daftar 1. Rauf's hold needs no revisiting on these grounds. And the corpus now has
something it has never had: **the same printed pages at 777 px and at 4200 px**, which is a
controlled resolution experiment on identical content, better than the tahqiqat duplicate-opening
control because the content is identical by construction rather than by luck.

## 2. Delivered glyph size beats native resolution — measured, and it inverts the ranking

Four workers, two per book, same page each, blind to their partner. Inter-reader agreement on
exact Arabic-script tokens with all markers stripped (`difflib`, `autojunk=False`):

| zone | `masnavi_01_text` p100 — 4200 px native, BITONAL mask, margin delivered **2.05x** | `masnavi_02` p100 — 742 px native, GREYSCALE, margin delivered **5.5x** |
|---|---|---|
| verse + interlinear gloss | **91.4%** | 84.7% |
| **margin glossary** | **40.3%** | **83.3%** |
| whole page | 82.9% | 84.0% |
| `[illegible]` per 1,000 Arabic chars | 4.78 / 14.48 | 2.58 / 3.00 |
| worker self-assessed, whole page | 82% / 80% | 92% / 85% |

The other cohort's contamination warning is right and this table is the cleanest demonstration of
it: **on the verse the high-resolution book wins, on the glossary — which no model can recite — the
743 px book wins by 43 points.** The verse column is measuring recall of the Masnavi; the glossary
column is measuring the scan.

**So the 4200 px scan, the best in the corpus, is currently being squandered on the layer that
matters most.** It is not the scan that binds, it is what reaches the model. Both `masnavi_01_text`
workers said so unprompted: *"if a greyscale layer exists, using it for the small-type crops would
be worth more than any other change"*, and *"roughly 2-3x the given scale, plus a right/left half
split like the main block, would likely push this from ~35% to something usable."*

**Prescription for `masnavi_01_text`, and this contradicts STAGE B of the brief:**

- The margin glossary column is 968 px native out of 4200. Delivered whole it can only reach 2.05x
  under the cap. **Split it left/right like the main block** (a half is ~530 px native → 3.75x), and
  **derive its bands from ink extent, not from fixed quarters** — on p100 the top and bottom
  quarters of the column were empty frame, so two of four crops carried no text at all and the
  magnification they could have spent was thrown away.
- The crops this cohort used came from the JBIG2 **bitonal mask**, extracted with `pdfimages -png`
  and inverted. That is excellent for the large verse (crisp, no MRC background tint) and **lossy on
  small type: it fuses i'jam dots**, which is where most `[OCR?]` marks landed (`عنا` vs `غنا`,
  `حطب` vs `خطب`). A coordinator comparison of mask vs autocontrasted greyscale composite at the
  same scale was **inconclusive at 2.05x** (`EVIDENCE_bitonal_mask_vs_greyscale.png`) — the measured
  complaint was magnification, not tone. Fix the magnification first; supply both renditions for the
  small type and let the next cohort measure.

## 3. Folio: the two cohorts read the same medallion differently. Contest it.

Both cohorts agree the folio on the daftar set is **bottom centre in a half-medallion on the frame's
bottom rule**, in Eastern digits.

- `masnavi_02` p100: this cohort's two workers **both read ۹۸ = 98** (offset PDF − 2). The other
  cohort measured d2 p30 → 28, also − 2. **Agreed.**
- `masnavi_01_text` p100: this cohort's two workers **both read ۹۲ = 92**, and a coordinator read of
  the medallion in both scans of that same printed page also reads ۹۲
  (`EVIDENCE_folio_control_same_page_two_scans.png`). The other cohort read **94** for
  `masnavi_01` p100. Same printed page, two cohorts, **92 vs 94** — the units digit, exactly the
  class §9.225 and §9.226 found irreducible on tahqiqat.
- **This cohort's folio for `masnavi_01_text` is BOTTOM centre on p100.** The brief says top centre,
  measured on p30. Both are probably true of their own section: the front matter is a different
  frame. **A folio crop for this book must not be hard-coded to one edge.**

Per §9.225's standing rule, this is not settled by another model reading. Record it contested.

## 4. What this cohort confirms in the brief, independently

- Each printed row is ONE bayt, right column misra 1, left column misra 2. Confirmed by all four
  workers; `WORKER_PROTOCOL.md`'s "right column first, then left" would scramble every couplet.
- The maktabah mark is a separate PDF overlay on daftars 1–6 (object id 2, 1050 x 1290 with an
  smask, byte-identical across the files: it is the Green Dome graphic plus `www.maktabah.org`) and
  is **not** in the `masnavi_01_text` bitonal mask either. Rendering from the image objects rather
  than from a composite page raster removes it everywhere. It still must be recorded once per book
  as `[source stamp: www.maktabah.org]` — suppressed at render is not the same as absent from the
  source, and provenance is this archive's core claim.
- Handwritten accession numerals below the frame on some pages (`۵۰۶` on d2 p100, `554` on d4 p100).
  Not the folio. Record, do not smooth.
- The margin box is often only part full; an empty margin crop is a normal result.
- Boxed section headings interrupt the verse and break the verse/gloss alternation.

## 5. Crop-geometry defects this cohort hit, all cheap to fix

1. **3% band overlap is too little.** A verse line split across the q2/q3 boundary showed only
   ascender tips in one band; read alone it gave `…من تنہا نشیں`, and only the two bands together
   gave `رو بدیوار کن تنہا نشیں`. **Use 8–10%, or cut bands in the inter-couplet gutter.**
2. **Add ~3% left-margin bleed.** On both books text runs to the frame and the last word of a
   hemistich was lost to the crop edge — twice on `masnavi_02` p100, three times on
   `masnavi_01_text` p100.
3. **The margin-column crops truncated at the bottom** on `masnavi_02` p100: c3 ended mid-sentence
   (`…ملامتیہ فرقہ میں آپ`) and the sentence in fact continues into the footnote. A worker caught
   this from the sense. Derive the column's extent from the frame, not from a guessed box.
4. `masnavi_02`'s crops had no `_l`/`_r` split, and both its workers said **column assignment was
   harder than word recognition** and that they resolved it from rhyme and the Urdu gloss rather
   than from pixel position. Give the daftar set the same halves `masnavi_01_text` got.

## 6. One thing the two cohorts disagree about that neither settled

Whether the interlinear Urdu under a verse row is **per-hemistich** (B1: the Urdu under the right
half translates the right hemistich) or **one running sentence across the whole row** (A2: join
right-half then left-half, it is a running translation). Different books, so both may be right, but
a worker who gets it backwards produces fluent, plausible, wrong alignment that no marker flags.
**Measure this on one page of each volume before a production run.**

## 7. The decision this run could not take

The interlinear gloss and the margin glossary are roughly two thirds of the work on every daftar
page and the two lowest-confidence zones — and, for a shrine archive, the margin glossary is
arguably the most valuable layer on the page: `masnavi_02` p100's glossary is biographical notes on
Bayazid Bistami, Maʿruf Karkhi, Ibrahim b. Adham, Shaqiq, Fudayl, Bishr Hafi, Dhu'l-Nun and Sari
al-Saqati, which is shrine material in a way that Rumi's verse is not. The other cohort asked the
same question from the other side. **Rauf's call, asked in the run report, not parked here.**
