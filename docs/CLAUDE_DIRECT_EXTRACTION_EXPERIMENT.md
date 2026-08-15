# Experiment: reading OCR'd Urdu directly with Claude, vs. the LibreTranslate pipeline

Written 15 August 2026, prompted by a request to try "OCR → translate → summarize" directly
through Claude end-to-end and see if it returns better results than the current pipeline.

## The current pipeline

`docs/BOOK_OCR_WORKFLOW.md`'s stack is three separate stages, each lossy on its own:

1. **OCR** (`tools/ocr_all_books.py`, UTRNet) — Urdu script image → Urdu text. Rough on old
   scans; `out/ocr/` transcripts contain visible artifacts (stray characters, garbled digit
   runs where a date should be).
2. **Translate** (`tools/translate.py`) — Urdu text → English, via a self-hosted **LibreTranslate**
   container. A dedicated NMT model, not tuned for classical/religious Urdu register, honorifics,
   or Sufi technical vocabulary (*silsila*, *khilafat*, *bay'ah*, *waseela*...).
3. **Summarize** (`tools/summarize_books.py`) — already Claude-based (claude-sonnet-5 via the
   Messages API), but working from stage 2's translation, not the original Urdu — so any
   mistranslation in stage 2 is baked in before Claude ever sees the material.

## What was tried instead, this session

Rather than build a new isolated script, this session's enrichment work (see
`docs/HANDOVER.md` §8c) *was* the experiment: two agents were given raw `out/ocr/` Urdu text —
Alam Faqri's *Tazkirah Awliya-e-Pakistan*, un-translated, artifacts and all — plus a list of
target shrine/figure names, and asked to find real mentions and produce cited English prose
directly from the Urdu, in one pass, with no LibreTranslate step at all.

Result: 16 of 32 targeted shrines got a real, specific hit, each with a verbatim Urdu quote,
an accurate English gloss, and correct handling of exactly the vocabulary a generic NMT model
struggles with — *kunya*, *laqab*, *khalifa*, honorifics, Hijri-calendar month names, and
cross-references between figures mentioned in different parts of the text (e.g. correctly
identifying that Akhund Darweza Baba and Pir Baba/Syed Ali Tirmizi, given under different
headings pages apart, are teacher and student — a relationship a sentence-by-sentence MT pass
would have no way to surface). Garbled OCR digit runs were correctly flagged as unusable
rather than mistranslated into a false-precision date.

## Why this is likely better, not just adequate

- **One interpretive pass instead of two.** LibreTranslate's output is itself an imperfect
  source that Claude's summarize step then has to interpret — errors compound. Reading the
  Urdu directly removes a whole lossy stage.
- **Register and vocabulary.** A general-purpose NMT model has no special handling for Sufi
  technical terms or Perso-Arabic honorifics; it will translate literally where a domain-aware
  reader recognizes a term of art (this project's own `termbase.tsv` exists precisely because
  this vocabulary needs curation, not literal translation).
- **Structural extraction for free.** Asking directly for "does this mention X, and if so quote
  it and gloss it" gets citation-ready output in one step, instead of translate → summarize →
  a human or a third pass reformatting into the project's citation convention.

## What this doesn't replace

The 30 books already in `out/ocr/` are all monographs about the archive's existing flagship
shrines (Data Darbar, Bibi Pak Daman, Madho Lal Hussain, etc.) — this experiment didn't need
LibreTranslate for those either, but it also didn't test **long-document, single-subject**
translation (a whole book about one shrine, translated cover-to-cover), which is
LibreTranslate's actual current job per `docs/BOOK_OCR_WORKFLOW.md`. For that use case, a
Claude-direct pass would mean sending an entire book's OCR text through the Messages API
(the existing `summarize_books.py` already chunks long books for exactly this reason) — doable,
but untested here, and worth a real side-by-side on one full book before retiring
`tools/translate.py`.

## Recommendation

Keep `tools/summarize_books.py`'s chunking/retry infrastructure, but for any future OCR
integration work — new books, or the remaining 16 not-found names in this session's sweep —
skip the LibreTranslate stage and give Claude the raw OCR text directly, the same way this
session's enrichment agents worked. Not a new script: the pattern is "read `out/ocr/<book>/*.txt`,
ask directly for cited claims about named targets," which is a prompt, not new code — see the
agent prompts used in this session as the template. A full side-by-side of Claude-direct vs.
LibreTranslate on one complete book's translation (not extraction) is the natural next step if
`tools/translate.py` is to be replaced outright rather than supplemented.
