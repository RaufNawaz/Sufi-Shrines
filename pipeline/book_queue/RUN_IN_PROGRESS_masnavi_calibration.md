# COMPLETE — masnavi calibration (no run in progress)

stage:    transcription (MASNAVI CALIBRATION, Rauf's 23 Sep ruling)
slugs:    masnavi_01..06 probed, masnavi_01_text probed
started:  2026-09-23T05:08Z
finished: 2026-09-23T05:50Z

No pNNNN.txt was produced and no book's status changed. The six leases on pp. 1-4 were a claim on
the sample and are released. Full account: docs/HANDOVER.md §9.228.

Four things the next run needs:

1. **masnavi_02..06 native scan is 579-781 px ACROSS THE WHOLE PAGE** (88-112 dpi).
   `render_bands.py`'s pixel ladder cannot be climbed on them. Use
   `pipeline/book_queue/render_masnavi.py` (4x upsample, crops by type zone, all under the cap).
   masnavi_01_text is the exception: 4200 px / 600 dpi, use render_bands.py --scale 4400.
2. **Each printed row is ONE bayt** (right column misra 1, left column misra 2). WORKER_PROTOCOL's
   "right column first, then left" scrambles every couplet on this book. See the brief.
3. **Calibrate on the margin glossary, not the verse.** Four of six workers recognised the Masnavi
   and two said so unprompted; the verse confidence numbers are contaminated, the apparatus is not.
4. **masnavi_01 is daftar 1 of the set, not a duplicate of masnavi_01_text** — measured. It is one
   of Rauf's holds and was not changed. Do not act on this without his answer.

Read `pipeline/book_queue/MASNAVI_WORKER_BRIEF.md` before briefing anyone.

This file is left in place because `unlink` is blocked on this mount; it is NOT a live claim.
