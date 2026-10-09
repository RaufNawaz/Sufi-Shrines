# RUN IN PROGRESS — advisory marker, not a code change

slug:     khulasat_ut_tawarikh
pages:    363-410 (48 pages)
started:  2026-09-22T20:09Z
finished: (in progress)

Book was at 330/610 at start. Ranges done: 1-16, 49-362. Target 378/610.

Why this book and not tahqiqat_chishti (priority 30, named first in the brief): at
2026-09-22T20:06Z `queue.py status` showed tahqiqat_chishti holding TWELVE leases — w1-w6 on
301-360 taken at 19:27:06Z and **w7-w12 on 361-420 taken at 20:04:05-06Z, ninety seconds before
this run's first command**. state.json's mtime matched (20:04:06Z). A sibling firing of this
hourly task is live on that book right now. Its RUN_IN_PROGRESS marker is stale (21 Sep 21:26Z,
still "in progress") and was NOT refreshed by that sibling — **the leases, not the marker, were
the live evidence this time.** Per the collision rule (§9.218/§9.219/§9.222) this run took the
next free book down the priority list instead. khulasat's own marker read COMPLETE and it held
no working leases.

Leases taken 20:08:30Z via lease_bands.py: w1 363-370, w2 371-378, w3 379-386, w4 387-394,
w5 395-402, w6 403-410.

The deliberate `HOLD-vsplit-index-errata` lease on 17-38 had been expired AGAIN by a
`sweep-leases --hours 3` at 2026-09-22T19:23:06Z (second time; first was 21 Sep 21:24:16Z).
**RESTORED at 20:08:30Z by this run.** pp. 17-38 need a vertical split before transcription and
must not be handed to a worker. This is now twice in two days, which makes the §9.222 RULE 4
candidate — `sweep-leases` must skip any lease whose worker name begins `HOLD-` — worth doing
rather than noting.

Folio prior for this range: the book is descending, `folio = 589 - pdf`, 314/314 with no
deviation over pp. 49-362. So 363 -> 226 and 410 -> 179, and **the hundreds digit changes from
۲ to ۱ at pdf 390 (folio 199)** — a transition this book has never been transcribed across.
§9.222 found the hundreds digit wrong on fourteen of sixty-six pages. Workers are briefed to
calibrate the hundreds glyph against the folio's own units digit in the same image, and every
folio in this batch is verified by the coordinator against the `_ft` crop.

finished: superseded — this 22 Sep run produced no pages; 363-404 were transcribed 4 Oct 2026, §9.251.
