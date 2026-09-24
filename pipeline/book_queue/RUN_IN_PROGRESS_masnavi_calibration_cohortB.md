# COMPLETE — masnavi calibration, SECOND COHORT (no run in progress)

stage:    transcription (MASNAVI CALIBRATION, Rauf's 23 Sep ruling)
slugs:    masnavi_01..06 + masnavi_01_text probed; masnavi_01 (held/skipped) probed for comparison only
started:  2026-09-23T05:05Z
finished: 2026-09-23T06:0xZ

No pNNNN.txt was produced and no book's status changed. This run took NO lease before starting —
that was the mistake that let a sibling firing (05:08Z) run the identical calibration blind. A
calibration must lease its sample pages or write this marker FIRST. See docs/HANDOVER.md §9.229.

Read `pipeline/book_queue/MASNAVI_CALIBRATION_COHORT_B.md` alongside `MASNAVI_WORKER_BRIEF.md`;
three statements in the brief are contradicted by measurement and a pointer section is appended
to it. Evidence: `out/ocr/_calibration/masnavi/`.

The three:
1. `masnavi_01` IS the same edition as `masnavi_01_text` — same printed page at p100, both 416 pp.
   The brief compared masnavi_01_text p30 (prose FRONT MATTER) against the daftar set's body.
   masnavi_01's `skipped` hold is correct; do not reopen it.
2. masnavi_01_text's margin glossary scores 40.3% two-reader agreement at 2.05x from the bitonal
   mask, against masnavi_02's 83.3% at 5.5x greyscale — despite 5.7x the native resolution.
   Split the margin column left/right and derive its bands from ink extent before transcribing.
3. Folio units digit contested: this cohort reads 92 on daftar 1 p100 (two workers + a coordinator
   read of BOTH scans of that page), the brief reads 94. §9.225: do not settle it by model reading.

Also released here: six stale tahqiqat_chishti leases on pp. 481-540 from the dead 00:07Z firing,
individually, so khulasat's HOLD-vsplit-index-errata lease survived. tahqiqat is 480/873, next
free page 481.

This file is left in place because `unlink` is blocked on this mount; it is NOT a live claim.
