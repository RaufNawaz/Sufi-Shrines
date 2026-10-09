# Worker brief — khulasat_ut_tawarikh PDF pp. 17-48 (index + errata), split render

Read `/home/claude/work/WORKER_PROTOCOL.md` first; it governs. This brief adds the specifics.

## What these pages are (measured by the coordinator)
The book is *Khulasat ut-Tawarikh* (Persian, lithograph, ed. Zafar Hasan, Delhi 1918). The PDF was
scanned back to front, so these front-matter pages run in REVERSE:
- PDF 17-46 = the name/place INDEX, printed pages ۳۲ (PDF 17) down to ۳ (PDF 46). PDF 46 carries the
  index's title (`فہرست اسمائے مردمان و بلاد ...`) and the `الف` heading.
- PDF 47 = errata page ۲, PDF 48 = errata page ۱ (`فہرست اغلاط ...`), a 4-column table:
  صفحہ | سطر | غلط | صحیح.
- **PDF 17-24 have THREE columns** separated by vertical rules. **PDF 25-48 have TWO.**

## Images (in `/home/claude/work/pages/`)
Each page is cut into overlapping vertical PANELS, each cut into 4 horizontal bands (b1 top → b4 bottom):
- 3-column pages (17-24): `pNNNN_w1b1..b4` = RIGHT column, `w2` = MIDDLE column, `w3` = LEFT column.
- 2-column pages (25-48): `pNNNN_w1b1..b4` = RIGHT column, `w2` = LEFT column.
- Panels deliberately OVERLAP heavily (each is 44-60% of the page width) so that every column is whole
  in its own panel. **In each panel transcribe ONLY its own column** (the one bounded by the vertical
  rule(s) as described above); ignore the fragments of the neighbouring column that show past the rule.
- Bands overlap by ~3%: an entry at the foot of b1 reappears at the head of b2 — transcribe it once.
- PDF 46, 47, 48 also have FULL-WIDTH bands `pNNNN_fb1..fb4` (lower resolution). On the errata
  tables (47, 48) the rows run across both panels: use the fb images to keep each row's four cells
  aligned, and the w panels to read the digits and words.

Reading order per page: w1 b1→b4, then w2 b1→b4, then (3-col) w3 b1→b4.

## Output: one file `/home/claude/work/out/pNNNN.txt` per page, nothing else
- First line `[folio N]` with the printed page number at the top centre, in Western digits (e.g. ۳۲ →
  `[folio 32]`). These are the index's own page numbers. If you are not certain of it, omit the
  folio line and say so in your report (the coordinator checks folios against the page sequence).
- Then `[column 1]`, the right column's entries, blank line, `[column 2]`, … (`[column 3]` on 3-col pages).
- **Index: one entry per line**, as printed: the headword, then its page locators in the order printed
  (read right to left), separated by ` - ` exactly as the page's dashes separate them, e.g.
  `سامانہ - ۴۴ - ۱۶۲ - ۲۲۰ - ۲۲۳ - ۲۴۶`. When an entry's locators wrap onto following printed lines,
  JOIN the continuation onto that entry's line. Superscript / squeezed numbers written above the line
  end belong to that entry; add them in place and mark `[OCR?]` if their position is unclear.
- Keep the digits in the script printed (Urdu/Persian digits stay ۰-۹ style). **Index locators are the
  whole point of these pages: put `[OCR?]` after EVERY number you are not certain of, digit by digit
  certainty — ۲/۳/۴ and ۶/۹ and ۰/dot are the known traps in this hand.** Never smooth a sequence
  (locators usually ascend; do NOT "fix" one that does not, and do not infer a missing one).
- The large alphabet letters (`ی`, `ک`, `ل`, `ب` …) that head each letter-section: put on their own
  line as `[letter: ک]`.
- Errata (47, 48): header row then one row per line, cells ` | `-separated in the printed order
  right→left: `صفحہ | سطر | غلط | صحیح`. Every page and line number `[OCR?]` unless certain.
- ORTHOGRAPHY: exactly as printed; no added dots, hamza or harakat. Report whether any as-printed
  non-standard orthography occurs on your pages.
- The footer stamp `Sri Satguru Jagjit Singh Ji eLibrary / NamdhariElibrary@gmail.com` is already
  recorded for this book: do NOT transcribe it; just confirm in your report it is present.
- Never write a word or digit you did not read off the image. `[illegible]` rather than a guess. If you
  find yourself composing plausible names rather than reading, stop and mark.

## Report (short)
Range done; per page: folio read, entries transcribed (count), and number of `[OCR?]` / `[illegible]`
marks; any page where columns or rows could not be aligned; stamp present yes/no; orthography note.
