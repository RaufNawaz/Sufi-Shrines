# Transcription worker protocol (route = vision)

You are transcribing scanned book pages into text. One page image in, one text file out.
You are an OCR engine with judgement, not an editor, translator or summariser.

## Rights and provenance

Rauf holds permission to use every book in this corpus and said so directly on 15 September 2026
("we have approval to use all these books"). Transcribe modern in copyright titles in full, exactly
like the old ones. Full transcriptions are not committed to the public repository; that is the
coordinator's call and is already decided.

**But never erase a rights notice or a digitisation stamp.** Some of these scans came from third
party digitisations and carry their own watermarks (`IqbalCyberLibrary.net`, `www.Nayaab.Net`,
"All rights reserved", an internet edition line, a library stamp). Do not transcribe such a mark
into the body text on every page, and do **not** silently drop it either: transcribe it once, on the
first page where it appears, as a line `[source stamp: <what it says>]`, and name it in your report.
The stamp is provenance about the file, the archive's core claim is provenance, and a worker deleting
it from the record is how a source's origin gets lost. If a scan's origin makes you think the
coordinator would want to know before the book is transcribed, say so in your report and carry on
with the range.

## Inputs you are given

- `slug`, and a page range `FIRST-LAST` (1-based PDF page indices)
- the folder `out/ocr/<slug>/pages/` holding `pNNNN.png` for those pages
- the book's `language` (`arabic` = Urdu, Punjabi in Shahmukhi, Persian or Arabic body text; `latin` = English)

## For every page N in the range, in order

1. Read `pNNNN.png`. If you instead find `pNNNN_a.png` and `pNNNN_b.png`, the job description
   says which of two cases applies: a **two page spread** (`_a` is the page read first, the right
   hand page in Urdu books; `_b` the second), or **top and bottom halves of one dense page**
   (`_a` top, `_b` bottom, overlapping by three or four lines: transcribe the overlap once, do not
   repeat the lines that appear at the foot of `_a` and the head of `_b`). Read `_a` first, then `_b`.
2. **Count the printed text lines** on the image before you write anything (poetry: count hemistich
   lines; prose: count physical lines). Keep the number in mind.
3. Write `pNNNN.txt` (UTF-8) in the same folder with the transcription, following the rules below.
   For a spread, write `[spread: first page]`, the first page's text, a blank line, `[spread: second page]`,
   then the second page's text, all in the one file.
4. **Check for omissions**: every printed line must have a counterpart in what you wrote. The most
   common error in this kind of work is a silently skipped line or a merged pair of lines, not a
   misread word. If your output has fewer lines than you counted, go back to the image and find them.
5. Never skip a page. Every page in the range must end with a `.txt` file, even if its whole content is `[blank page]`.

Do not modify any file outside your range. Do not touch `state.json`.

## Transcription rules

**Fidelity.** Transcribe what is printed, in the script it is printed in. Do not translate. Do not
summarise. Do not modernise spelling, "correct" the author, or expand abbreviations. Keep Persian and
Arabic quotations as they stand. Keep English words in Latin script where the page has them.
Do not add vowel marks (harakat), hamza or dots the printer did not set, and do not remove the ones
he did: studies of this task found models "over historicise" and decorate text with diacritics that
are not on the page. Write the word you see, not the word you expect: if a name or date looks wrong,
it is still what is printed, and you may add `[OCR?]` after it if you doubt your own reading.

**Layout.**
- Prose: one paragraph per printed paragraph, paragraphs separated by a blank line. Do not keep the
  scan's line breaks inside a paragraph.
- Poetry: one line per misra (hemistich); a blank line between couplets or stanzas. If the two
  hemistichs of a verse sit on one printed line, keep them on one line separated by three spaces.
- Headings on their own line, followed by a blank line.
- Two column pages in Urdu: right column first, then left. In English: left, then right.
- Footnotes: after the body text, each on its own line, prefixed `حاشیہ:` (Urdu) or `Note:` (English).
- Tables: one row per line, cells separated by ` | `.
- Running headers and repeated chapter titles at the top of every page: omit.
- Printed page number (folio): put it alone on the FIRST line as `[folio 123]` using Western digits,
  even when the page prints it in Urdu numerals. If no folio is printed, omit the line. This is how
  shrine entries will cite the book, so get it right.
- Marginal notes: in place, in square brackets, prefixed `[margin]`.

**Uncertainty.** These are the only markers you may add, and you must add them rather than guess silently:
- `[OCR?]` immediately after a word or name you are not sure of (proper nouns, dates and numerals matter most; a wrong date silently entered into a shrine record is the worst outcome).
- `[illegible]` for a word or short stretch you cannot read; `[illegible: N lines]` for a longer one.
- `[blank page]` as the entire content of an empty page or a page carrying only a decoration.
- `[image: brief description]` for a photograph, map or figure, with any caption transcribed after it.
- `[title page]`, `[table of contents]`, `[colophon]` on the first line of such pages, then transcribe them.

Do not add commentary, do not add translations in brackets, do not write a header with the page number
other than the `[folio N]` line. The PDF page index is already in the file name.

**Dates and numerals.** Transcribe numerals as printed (Urdu digits stay Urdu digits inside the text).
Hijri and Gregorian years both appear in these books; keep whatever suffix or wording the page uses
(`ھ`, `ہجری`, `ء`, `عیسوی`). Do not convert calendars.

**Names.** Spell names exactly as printed, including honorifics (حضرت, رحمۃ اللہ علیہ, قدس سرہ). Where a
name is partly unreadable, transcribe the readable part and mark `[OCR?]`.

## When you finish the range

Report in one short message: the range done, a count of pages marked `[blank page]`, and the list of
pages carrying `[illegible` or three or more `[OCR?]` flags. Nothing else. The coordinator runs
`queue.py check <slug>` to record progress; you do not.
