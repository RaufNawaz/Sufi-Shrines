# Cloud book queue — runbook

*Started 14 September 2026. Owner: Rauf. Operator: Claude (Cowork cloud session).*

## What this is

The field survey form's book upload folder on Drive holds 42 distinct books (45 files, three exact
duplicates): ten Urdu shrine and Lahore histories, twenty four English monographs, six Masnavi volumes
and one Nizami scan (about 1.36 GB). Rauf has no GPU machine for the UTRNet pipeline described in
`BOOK_OCR_WORKFLOW.md`, so the corpus is being processed in a cloud Claude session as a queue that
survives the session's usage limit ending it. Each book goes:

    download → ingest → render pages → transcribe (per page) → assemble → takeaways → shrine entries

Everything the queue knows lives in `pipeline/book_queue/`:

| file | purpose |
|---|---|
| `drive_listing_2026-09-14.json` | raw Drive listing: ids, titles, sizes, uploader (the fact base) |
| `build_manifest.py` | curated layer: slug, group, language, route, priority, target shrines |
| `manifest.json` | generated from the two above; never hand edited |
| `queue.py` | the state machine (`init`, `status`, `next`, `ingest`, `render`, `extract`, `lease`, `check`, `mark`, `export`) |
| `state.json` | progress: status per book, page counts, done page ranges, leases, file hashes. **Committed after every batch.** |
| `WORKER_PROTOCOL.md` | the transcription rules a page worker follows |

## Resuming in a fresh session (the whole point)

1. Clone or pull the branch `cloud-ocr-queue`.
2. `python3 pipeline/book_queue/queue.py status` then `queue.py next`. It names the book and the step.
3. If the step needs the PDF and `books/<file>.pdf` is not in the workspace, stage it from Rauf's Mac
   (the connected repo folder, `books/`) and run `ingest`. The `pdf_sha256_head` recorded in state.json
   must match: a different file means a different upload, stop and ask.
4. If the step is transcription, the page images may need re-rendering (`out/` is not in git):
   `queue.py render <slug> --pages A-B` at the recorded `render_scale`. Then `lease`, hand the range to
   a worker with `WORKER_PROTOCOL.md`, then `check`.
5. Page text files already written are the checkpoint. If they were mirrored to the Mac (see below) but
   the workspace is new, copy `out/ocr/<slug>/pages/` back first, then `check` recounts from disk.

`check` never trusts a worker's report: it counts the `pNNNN.txt` files that exist and have content.

## Transport and network facts (measured 14 Sep 2026)

- The cloud workspace cannot reach drive.google.com, googleapis.com, docs.google.com, archive.org or
  huggingface.co (organisation allowlist). It can reach github.com, raw.githubusercontent.com and
  api.anthropic.com. So PDFs arrive from Rauf's Mac over the desktop bridge, one file per call.
- Workspace: 2 CPU cores, 7 GB RAM, no GPU, about 30 GB free disk. Enough to hold the PDFs and the
  rendered pages of a few books at a time; delete `pages/*.png` of finished books if disk runs low
  (they are regenerable from the PDF).

## Where output lives, and why full text is not committed here

`out/`, `books/`, `summaries/` and `*.pdf` are gitignored on purpose (see `.gitignore`). This queue
keeps that rule, and adds a reason: most of these books are in copyright (the Wasif Ali Wasif titles,
the Tazkirah, the Masnavi translation, every English monograph). Full transcriptions of in copyright
books do not go into a public repository. What is committed to the public repo:

- `pipeline/book_queue/state.json` (progress), the manifest and scripts
- `entries/book_takeaways/<slug>.md` (research notes: key takeaways per book, with folio references)
- edits to `shrine_entries/*.md` and `shrine_entries/_book_to_shrine_map.md`
- this runbook and `docs/HANDOVER.md` notes

Full transcriptions (`out/ocr/<slug>/…_transcribed.txt` and the per page files) are mirrored after every
`check` to the repo folder on Rauf's Mac (`out/ocr/`, the location `finalize_books.py` already
expects). If Rauf creates a private corpus repository, `queue.py export <slug> <dir>` copies the
assembled files there.

## Routes

- `vision`: pages rendered with `pdftoppm -gray -png -scale-to <render_scale>`, read by Claude,
  transcribed under `WORKER_PROTOCOL.md`. Used for every Nastaliq scan.
- `text_probe`: `ingest` runs `pdftotext` on the first ten pages and applies the same test as
  `tools/ocr_all_books.py` (≥1200 chars, ≤2% replacement characters, script matches the book's
  language). Pass → `extract` writes one `.txt` per page from the text layer, no OCR. Fail → `vision`.
- `epub`: unpacked; each XHTML section becomes one "page".

## Render scale and image preparation

What the literature says and why these settings were chosen is in `CLOUD_OCR_RESEARCH_2026-09.md`.
In short: input resolution is the biggest lever on Nastaliq accuracy; recompression hurts; spreads
and columns cause merged or skipped lines; silent omission is the dominant error of model based OCR;
text only post correction does not help for Urdu.

- `render` extracts the embedded scan with `pdfimages` (falls back to `pdftoppm` at 2x then
  downscales), converts to 8 bit grayscale, downscales only, LANCZOS, PNG.
- Two presets: `--scale 1568` (standard vision tier, about 2,240 visual tokens a page) and
  `--scale 2290` (high resolution tier, about 4,780). Set by the pilot per print class: modern prints
  are expected to be fine at 1568; the two Digital Library of India lithographs (Tahqiqat e Chishti,
  Tarikh e Lahore) are expected to need 2290. Recorded per book as `render_scale`; `render` refuses to
  mix scales within a book.
- `ingest` reports the native pixel size of the scans and the fraction of landscape (two page) scans;
  above half, render with `--split-spreads`.
- Pages whose worker report carries `[illegible` or three or more `[OCR?]` are re-read once at 2290 by
  a different worker; disagreements are settled by a third look at the image.
- Quality is measured, not assumed: three hand verified gold pages per print class, scored with
  `queue.py eval` (wraps `eval/ocr/run_cer.py`), CER recorded in `state.json` and the research note.

## Stage rules

- **Ingest**: size must equal the Drive listing's bytes, otherwise the command refuses (`--force`
  only when the mismatch is understood, and note why in the commit message).
- **Transcribe**: workers get 25 page leases. Leases older than three hours are swept
  (`sweep-leases`), so a session that died mid batch loses nothing but the lease.
- **Assemble**: when every page has text, `check` writes `p001-end_<ts>_transcribed.txt` with
  `[p. N]` markers (PDF page index) plus a provenance JSON with `"reviewed": false`.
- **Takeaways**: grouped as in `tools/summarize_books.py` (Saint; Shrine / Darbar; Practices & Events;
  Legends & Miracles; Significance; Other), with folio references and `[OCR?]` carried through. One
  file per book in `entries/book_takeaways/`. Then `mark <slug> summarized --file <path>`.
- **Integrate**: RULE 2 applies without exception. A fact enters a shrine entry only with the book and
  folio it came from; contradictory sources are reported as contradictory, not reconciled. New
  sections are appended to existing `shrine_entries/*.md`; a new entry is drafted only for rows that
  have none. The sheet is never written (RULE 3): the entries are the sheet ready text, and a CSV
  patch is produced for Rauf to import. Then `mark <slug> integrated --file <comma separated shrine ids>`.

## Rights

**Rauf, 15 September 2026: "Ignore copyright claims because we have approval to use all these books."**
Recorded here because a worker stopped mid book over it, and the next session should not stop again.
The in copyright titles in this corpus (the four Wasif Ali Wasif books, the 1965 Tazkirah, the Urdu
Masnavi apparatus, and every English monograph) are therefore transcribed in full like the rest. The
publication rule is unchanged and is a separate question: full transcriptions stay out of the public
repository (see the section above) because the repo is an open archive, not because of the permission.

## Decisions taken by Rauf (14 Sep 2026)

- PDFs travel Drive → Rauf's Mac → this session (Drive is blocked from the cloud).
- OCR engine: Claude reading pages in session, on Rauf's plan, accepting that it takes several
  sessions. The API route (his `summarize_books.py` pattern with page images) is the drop in
  alternative if he changes his mind: only the worker changes, not the queue.
- Scope: all three groups, Masnavi and Nizami last.
- Results: committed to a GitHub branch of this repo (`cloud-ocr-queue`) after every batch; full text
  mirrored to the Mac, not committed (see above).

## Open items

- Write access from the cloud session to this repository (Rauf to attach the repo or issue a scoped
  token). Until then commits accumulate locally on `cloud-ocr-queue` and the state file is also
  mirrored to the Mac.
- Whether to create a private corpus repository for the full transcriptions.
