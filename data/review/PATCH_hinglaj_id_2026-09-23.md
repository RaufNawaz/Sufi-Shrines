# Sheet patch needed — the Hinglaj row has no `id` in production

*Raised 23 September 2026. RULE 3: agents do not write to the Google Sheet. This is the record of
the ask; the ask itself was made in the chat (RULE 5).*

## What is wrong

`pipeline/book_queue/shrine_index.tsv` carries

    id:   shaktipeeth-shri-hinglaj-mata-mandir
    name: Shaktipeeth Shri Hinglaj Mata Mandir

but the shipped snapshot of the sheet, `src/data/shrines-fallback.json`, has that row with an
**empty `id` cell**. The id was filled into the index on 21 September 2026 and never reached the
sheet.

Found by the cross-check in `pipeline/book_queue/rebuild_shrine_index.py`, which refuses to
regenerate `location_short` if the index and the shipped data disagree about which shrines exist.
It now matches this one row by `Name` and prints a warning instead of refusing, so the pipeline
runs — but the mismatch stands until the sheet is fixed.

## Why it matters

`schaflechner_hinglaj_devi` is fully noted (19 chunks) and awaiting Pass 2. Its notes head their
bullets with `shaktipeeth-shri-hinglaj-mata-mandir`. **Every one of those points at a row the live
site has no id for**, so nothing in that book can resolve to a shrine page until the sheet carries
the id. Other books' notes reference it too.

## The fix — one cell

In the Google Sheet, on the row whose `Name` is **`Shaktipeeth Shri Hinglaj Mata Mandir`**, set

    id  =  shaktipeeth-shri-hinglaj-mata-mandir

This is a **single-cell edit**, not a sheet replacement — do not run it through the
export/replace-current-sheet import path, which is for full snapshots.

Then `npm run data:build` to refresh `data/shrines.json` and `src/data/shrines-fallback.json`, and
re-run:

    python3 pipeline/book_queue/rebuild_shrine_index.py \
        pipeline/book_queue/shrine_index.tsv src/data/shrines-fallback.json

It should then print no warning at all. That silence is the test.

## Also still empty on that row, and deliberately left alone

Its **`category`** cell. RULE 2 — it is not this pipeline's to fill, and guessing between
`Hindu Temple` and something else would be inventing content. Flagged here so it is not mistaken
for an oversight. Note that `category` is one of the schema's closed vocabularies
(`Muslim Shrine` · `Hindu Temple` · `Sikh Gurdwara` · `Nanakpanthi / Udasi Darbar` · `Jain Temple` ·
`Secular / Memorial`), so an empty cell there may affect faceting and filtering on the live site.
