# Shrines book corpus — state of the work and how another session continues it

*Written 16 September 2026 by the cloud session that has been running the queue. Everything here is
also in the repo clone on branch `cloud-ocr-queue`, which could not be pushed: this session has no
write access to github.com/RaufNawaz/Sufi-Shrines. **Adding the repository to a session's sources
(with write access) is the single thing that would make all of this shareable between sessions.***

## What is in this folder

| path | what it is |
|---|---|
| `transcriptions/<slug>/p001-end_*_transcribed.txt` | the finished text of a book, one file per book, with `[p. N]` page markers and a provenance JSON beside it |
| `notes/<slug>/chunk_NNN.notes.md` | English research notes per chunk of a book: facts grouped by shrine, every one page referenced |
| `book_findings.csv` | every notes bullet as a row: shrine id, book, section, finding, pages, flags, source chunk |
| `queue/` | the whole machine: `queue.py`, `state.json`, the manifest, both worker protocols, the runbook, the research note |

## Numbers as of 16 September 2026

- **42 distinct books** in the corpus (45 Drive files, three exact duplicates folded).
- **28 fully transcribed**, 8,300+ of 12,422 pages (67%).
- **5 held**: the four Wasif Ali Wasif titles (see below) and `masnavi_01` (a duplicate, lower
  resolution scan of `masnavi_01_text`).
- **9 remaining**: `tareekh_lahore` (419/463, nearly done), `tahqiqat_chishti` (25/873, the hard one),
  `khulasat_ut_tawarikh` (610 pages of Persian), and the six Masnavi volumes (2,592 pages).
- **417 chunks** ready for the notes stage; 22 notes files written so far, all on `hadeeqat_ul_aulia`.

## How to continue, in one paragraph

Work in a clone of the repo. `python3 pipeline/book_queue/queue.py status` and `… next` tell you
where everything stands; `state.json` is the truth and `check` recounts it from the files on disk, so
nothing depends on what any worker claimed. To transcribe: `render <slug>` (page images are not kept,
they regenerate from the PDF in `books/`), `lease <slug>`, hand the range plus
`pipeline/book_queue/WORKER_PROTOCOL.md` to a subagent, then `check <slug>`. To write notes:
`chunk <slug>`, then hand chunks plus `TAKEAWAYS_PROTOCOL.md` and `shrine_index.tsv` to a subagent.
Then `compile_findings.py` rebuilds the CSV. Run `folio-check <slug>` after every batch.

## Things learned the hard way, so they are not rediscovered

1. **Half pages, not whole pages, for lithographs.** Tarikh e Lahore was unreadable to a worker at
   whole page resolution and readable as overlapping top and bottom halves at 2000 px
   (`render --halves`). The in-session image viewer caps the long edge at about 2000 px, so a bigger
   render buys nothing; splitting the page is what buys resolution.
2. **Tahqiqat e Chishti (1867) is beyond the models tried.** Four workers on it produced either
   honest refusals or text roughly a third invented. Its 50 page Opus attempt is parked in
   `out/ocr/tahqiqat_chishti/opus_firstpass/`, **not counted as transcription**. It needs a human
   Urdu reader, a Nastaliq specific model, or Gemini 2.5 Pro, which the literature rates best for
   Nastaliq (`docs/CLOUD_OCR_RESEARCH_2026-09.md`).
3. **Folio numbers are the most dangerous field.** A worker misreading the tens digit is invisible
   inside its own 25 page batch and obvious across the book. It happened twice on
   `hadeeqat_ul_aulia` (47 pages wrong by 10, now corrected) and once on `tareekh_lahore` (25 pages
   wrong by 8, corrected). `queue.py folio-check` is the invariant that catches it; run it every time.
4. **Tarikh e Lahore is missing four leaves.** Folio = PDF index + 3 up to page 313, then + 7: printed
   folios 317 to 320 are absent from the scan, and the text confirms the jump. Worth checking whether
   the Drive PDF or the DLI scan is defective.
5. **A Read that returns no image is silent.** One worker transcribed eight pages from
   `[media removed: request limit]` before noticing, then redid them. If a batch's text looks fluent
   but unmoored, suspect this.
6. **Save per book state per book.** A long running `render` holding stale state once wrote back over
   newer progress; `save_state(only=<slug>)` under a file lock is the fix.
7. **English books mostly need no OCR.** 22 of 24 had usable text layers (`pdftotext`); four scans went
   to Tesseract `eng` at 300 dpi, which is fine for Latin print and useless for Nastaliq.

## The Wasif Ali Wasif question, for the record

Four workers in succession declined to produce the full text of the four Wasif titles. Rauf holds
permission for the books and confirmed it twice, knowing that these particular scans are a third party
digitisation carrying IqbalCyberLibrary.net's "All rights reserved" watermark and a www.Nayaab.Net 2006
internet edition line (recorded in `state.json` under `source_stamp`). The decisive objection in the end
was not rights but quality: the worker that did transcribe a page caught itself adding iẓāfat kasras it
had inferred from grammar rather than read, on page one, with the watermark sitting over the middle of
the text block. Rauf's own fallback therefore applies: detailed notes and quotations rather than a full
text, capturing everything that bears on the `wasif-ali-wasif` row. The front matter, contents and two
body pages are transcribed. A full text later needs a two pass method against the images and,
preferably, a cleaner scan.

## Open questions for Rauf

- Repository write access, so this stops living in one session.
- Tahqiqat e Chishti: human reader, Gemini pass on his key, or leave the parked first pass as an index.
- Khulasat ut Tawarikh is the Persian original, not an Urdu translation: 610 pages worth transcribing?
- The six Masnavi volumes map to no shrine; they are for Abshaar, not the archive. Priority?
- Hadiqat al Awliya's 1974 editor overturns death dates the archive currently carries, including Data
  Ganj Bakhsh, Bulleh Shah, Bari Imam and Shah Inayat Qadiri, and places Nausha Ganj Bakhsh's mazar at
  Sahnpal Sharif rather than the archive's Ranmal Sharif. These are in `book_findings.csv` and need an
  editorial ruling, not a silent overwrite.
