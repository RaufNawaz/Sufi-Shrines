# khulasat_ut_tawarikh — body-page worker brief (PDF 363-610)

Written 4 October 2026 (session_01KMBZFV8zWnEzhvNQVUzsBa) for the first batch past PDF 362, PDF 363-422.
Distils HANDOVER §9.207/9.209/9.210/9.222/9.245/9.249. Read `WORKER_PROTOCOL.md` (same folder) first;
this brief adds to it and never overrides it.

## The book

Persian prose history (Sujan Rai Bhandari's *Khulasat ut-Tawarikh*, 1918 lithograph edition) in a
clear Nastaliq/naskh-ish scribal hand, with verse quotations, occasional footnotes (`حاشیہ:` lines)
and marginal years. **Persian, not Urdu** — do not "correct" Persian spellings toward Urdu.
Transcribe AS PRINTED (Rauf's 29 Sep 2026 ruling): keep the printer's orthography; report once
whether you see any non-standard features (e.g. undotted final ی, `ه` vs `ہ`).

## Your images, per page NNNN (all in `/home/claude/kh/pages/`)

- `pNNNN_q1.png` … `pNNNN_q4.png` — four horizontal bands top→bottom, 2763 px wide, ~3% overlap.
  **The image tool downsamples anything over 2000 px**, so the full band is for STRUCTURE (line count,
  which line follows which) — not for reading words.
- `pNNNN_qI_r.png` / `pNNNN_qI_l.png` — right and left halves of band I (1551 px, ~340 px overlap,
  RIGHT FIRST: the text runs right to left). **Read the words off the halves.** Join the halves at the
  overlap; transcribe the overlap once.
- `pNNNN_ft.png` — a centred top strip carrying the printed folio, at native resolution.

Read every band: q1 → q4, each as band then right half then left half. Band overlaps repeat a line:
transcribe it once. **A worker short of context drops PAGES, never images** — leave a page unwritten
and say so rather than write it from a partial read.

## "media removed" / request limit

If any image comes back as `[media removed …]` or fails to load: **sleep 30-60 s (Bash `sleep 45`)
and re-read it**. Never write a page from an image you did not see. If an image still will not load
after three tries, leave that page's `.txt` UNWRITTEN and name it in your report. A page written
blind is worse than a missing page — a missing page is redone; a blind page is trusted.

## The folio — this book's real trap

- The scan runs **back to front**: the printed folio DESCENDS by exactly one per PDF page.
- The folio is printed in Persian digits, centred above the text block; read it from `_ft` (and
  confirm on `_q1_r`/`_q1_l`). Write it as `[folio N]` in Western digits on the first line.
- **The HUNDREDS digit was misread on 14 of 66 pages in a previous batch** (۲ read as ۳, by workers
  who were certain). The fix that worked: **calibrate the hundreds glyph against the units/tens
  glyphs of folios in your own range** — across your consecutive pages the units digit cycles through
  several values, which gives you a ۱, ۲, ۳ in the same hand at the same scale to compare with.
  Also watch the ۲/۳/۴ teeth count and ۶/۹, ۰ (a dot) vs nothing.
- Within your range consecutive folios must step by −1. If your reads do not, re-read; if they still
  do not, write what you see with `[OCR?]` and say so in your report. **Never write a folio by
  sequence without reading it**; if you cannot read it, omit the `[folio]` line and say so.

## Source stamp

Every page carries at its foot `Sri Satguru Jagjit Singh Ji eLibrary` / `NamdhariElibrary@gmail.com`.
It is already recorded for this book (p0049). **Do not transcribe it** on your pages, but if it
covers text, mark the covered words `[illegible]` and say "stamp" in your report.

## Numerals and dates

In-text years are set small and are the least reliable thing on the page. `[OCR?]` on every digit you
are not sure of. Years printed as two-digit superscripts over `سنه` with no hundreds digit: transcribe
exactly what is printed — **never supply a missing digit**, never "correct" a date to the one you know
from history, never compute a chronogram. Spelled-out numbers: as printed.

## Output

One `pNNNN.txt` per page in `/home/claude/kh/pages/`, UTF-8, per WORKER_PROTOCOL.md (folio line,
paragraphs, verse one misra per line or two hemistichs separated by three spaces, `حاشیہ:` footnotes
after the body, `[margin]` notes in place). Write nothing else, touch no other page.

## Report (short)

Per page: printed lines counted vs written; folio read and how sure; count of `[illegible]` and
`[OCR?]`; any image that failed to load; any page left unwritten. Then: names and dates you flagged
that a human must check, and whether the orthography looked non-standard anywhere.
