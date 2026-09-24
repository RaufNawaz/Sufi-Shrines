# RUN IN PROGRESS — advisory marker, not a code change

slug:     masnavi_01_text
pages:    1-66 (66 pages) — FIRST pages ever transcribed on this book
started:  2026-09-19T03:45Z
finished: (in progress)

Book was at 0/416 at start. pages_done: "" (empty).

Why this book and not khulasat_ut_tawarikh (priority 190): a run that started at
2026-09-19T02:45Z holds six leases on khulasat pp. 297-362 and its RUN_IN_PROGRESS marker is
under three hours old. Per that marker's own rule (and HANDOVER §9.206, where two scheduled
runs transcribed the identical 66 pages), this run took a different book.

Why not tahqiqat_chishti (priority 30): unchanged from §9.203/§9.207/§9.209/§9.210 —
§9.201's three decisions remain unanswered and two of them govern that book's remaining
807 pages. A page that gets a pNNNN.txt is never redone.

Bands rendered in the cloud container with render_bands.py --scale 4400 --bands 4.
Leases 1-11 / 12-22 / 23-33 / 34-44 / 45-55 / 56-66 written directly through queue.py
load_state/save_state, because `queue.py lease` still cannot see `_qN` band files (§9.210).

If you are another run: read the timestamps, not the existence of this file — deletes are
blocked on this mount, so it is overwritten rather than removed. A "RUN IN PROGRESS" header
less than 3 hours old means take a different book.
