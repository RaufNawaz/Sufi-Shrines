
### 9.224 — 22 September 2026: tahqiqat_chishti 300→360, the PDF duplicates a two-page opening, and the folio crop has been looking in the wrong place on this book since it was written

**Section numbering.** The largest number before this append was **223**. Checked by sorting.

**What this run did.** `tahqiqat_chishti` went from **300/873 to 360/873** — PDF pp. 301–360, six
workers, ten pages each, 4 bands + both halves + folio strip per page at scale 4400. Output: 60
files, 143,384 characters, **3,598 `[OCR?]`**, **667 `[illegible]`**, 10 `[margin]`, 0 blank pages.
Rendering in the container took 85 s per 30 pages (~2.8 s/page), far cheaper than the ~9 s/page the
old estimate assumed. Every worker reported all ten of its pages as carrying `[illegible` or 3+
`[OCR?]`, which is the expected result on this book (measured norm ~48% confident words), not a
failure. Four stale leases from the 21 September failed run were swept first — without that, 33
pages would have been skipped as leased-out.

## The PDF duplicates a two-page opening, and that is what breaks the folio offset

**PDF 340 repeats PDF 338, and PDF 341 repeats PDF 339.** Measured two ways. A worker noticed
p0338/p0340 were line-for-line identical and said so. Then the folio strips for p0339 and p0341 were
read directly: same running header (`احوال مکان گھوڑی شاہ`), same opening line
(`اور مراد علی شاہ … برادران حقیقی`). Then text similarity, on the transcriptions with markers
stripped: **p338≡p340 at 0.84 and p339≡p341 at 0.86**, against **0.07–0.23 for every genuine
neighbour pair** in pp. 335–360.

p0338's scan is badly degraded (the right half of every line in band q1 has faded) while p0340's is
clean, so **p0340 is the better record of that printed page and p0338 is a candidate for
suppression** — but they must not both be counted as distinct pages of the book.

**This is why `folio-check` reports three competing offsets after p. 339.** The dominant offset is
`folio = PDF − 6` over 181 pages. After the duplication the printed sequence falls two further
behind the PDF, so the offset should become **−8** from p. 342 on. The workers instead recorded −2
on pp. 341–350 and +4 on pp. 351–360, which cannot both be right and which together would have the
folio run 352 and then drop to 347 across one page boundary. **`queue.py folio-check` flagged all
three ranges unprompted** (its "a minority offset this small is usually a misread tens digit"),
which is the check doing exactly its job.

**A MEASURING TOOL WAS THE CAUSE. `--folio-strip` crops the wrong part of this book's page.**
`render_bands.py` emits `_ft` as a **centred** strip, 40% of page width. Its own docstring records
why: §9.215 found the folio in a top *corner* on `tahqiqat_chishti`, but §9.210 found it *centred*
on `khulasat_ut_tawarikh`, and the crop was written for the second case. On tahqiqat the centred
crop covers x = 0.30W–0.70W and **the folio sits outside it**. Verified directly: the `_ft` images
for p0342 and p0360 contain the running header and no digits at all, while the same page re-rendered
with `--folio-width 1.0` shows the folio plainly in the corner.

So on this book every folio a worker reported was read off the **degraded 2462 px full band**
(delivered at 2000 px), not off the high-resolution strip that exists for exactly this purpose —
and 11 of 60 pages got no folio line at all. **The remedy is one flag:**

    python3 pipeline/book_queue/render_bands.py tahqiqat_chishti … --folio-width 1.0 --folio-top 0.10

**Do this for every future tahqiqat batch, and re-render pp. 301–360's strips to recover the folios
already lost.** The §9.215 measurement that lifted folio capture to 85% was real; the crop that
implements it has been pointed at the wrong column on this book ever since.

**The folio lines now in pp. 341–360 should not be trusted or cited.** They are left exactly as the
workers read them (RULE 2 — they are honest readings, several already `[OCR?]`), and are not
corrected by inference here. A re-read of twenty full-width strips settles it cheaply.

## A worker caught itself composing, and named the mechanism

The pp. 321–330 worker found its first pass had produced **near-identical opening word-strings for
two different pages** (p0328 and p0330), where the line-initial words sit in the gutter shadow. Its
reasoning is worth quoting as the standard: *"Two different pages cannot open their lines
identically, so that was pattern-completion, not reading."* It rewrote both files with those
positions as `[illegible]` and warned that **other workers on this book may carry the same phantom
text in that column**. That warning should be treated as open until checked: the gutter-shadow
column is a systematic invitation to compose, not a one-worker lapse.

## A measurement trap in the duplicate-detection itself

The first similarity pass reported **0.01–0.04 for every pair, including the true duplicates** —
which would have buried the finding. Cause: `difflib.SequenceMatcher`'s **autojunk** heuristic
discards any character appearing in more than 1% of the string, and on an Arabic-script text with a
small alphabet that is nearly every character. `autojunk=False` gives the real figures (0.84/0.86 vs
0.07–0.23). **Any similarity check over Urdu, Persian or Arabic text in this repo must pass
`autojunk=False`.**

## State and what is next

`queue.py check` recorded **360/873** and advanced the frontier itself, auto-leasing 361–420 to
w7–w12; those leases were swept at the end of this run, so the next firing starts clean at **p. 361**.
No book's status changed (`tahqiqat_chishti` remains `transcribing`). Nothing is committed to git.

Remaining in the transcription stage: **3,385 pages** — tahqiqat_chishti 513, khulasat_ut_tawarikh
280, masnavi_01_text 416, masnavi_02 366, masnavi_03 462, masnavi_04 374, masnavi_05 432,
masnavi_06 542. Note the masnavis have never been rendered; four are still at `ingested`.
