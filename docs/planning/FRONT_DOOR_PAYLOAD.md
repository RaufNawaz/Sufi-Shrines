# The front door downloads 672 KB of prose to draw 169 dots

*Measured 29 August 2026 by the features session, against the live sheet and a `npm run build`
preview. Written for whoever owns the generators — the fix is a data-shape change and the
rendering half is mine.*

---

## The measurement

A first-time visitor on a phone, throttled to slow 4G (1.6 Mbps, 150 ms RTT) and 4× CPU:

| | |
|---|---|
| First contentful paint | **1,200 ms** |
| CSV request starts | 1,081 ms |
| CSV request takes | **3,372 ms** |
| First marker on the map | **5,059 ms** |

FCP is healthy. The reader then looks at an empty map for **another four seconds**.

Nothing is slow about the request. It is the size of it:

```
rows 171 · columns 44 · total 837 KB  (≈295 KB gzipped over the wire)

   672 KB   80.3%  Description
    56 KB    6.7%  qa_note
    12 KB    1.4%  Image 1
    10 KB    1.2%  Location
    10 KB    1.2%  year_built_note
     8 KB    0.9%  Events

what the map needs (Name, Latitude, Longitude, category):  12 KB = 1.4%
```

**The map downloads the complete text of every article in the archive in order to place a
pin.** 80% of the front door's data cost is prose that is not rendered until someone opens an
entry — and most visitors open none.

## What does *not* fix it, and why

- **Serving the bundled snapshot first.** The obvious "render stale, revalidate" move. Measured:
  `shrines-fallback.json` is 925 KB raw / **294 KB gzipped**, and the live CSV is 837 KB raw /
  **295 KB gzipped**. They are the same weight. Swapping one for the other transfers the same
  bytes; the only gain is a warm same-origin connection, worth a few hundred ms, not four
  seconds.
- **Starting the fetch earlier.** Worth ~900 ms and genuinely available — the request begins at
  1,081 ms because that is when `main.tsx` runs, and an `index.html` preload would start it at
  ~200 ms. But `csvPrefetch.ts`'s own docstring already weighed a version of this and was right
  to be careful: a preload that fails to match the later `fetch()` downloads a megabyte **twice**
  on a metered phone. Worth doing, second.
- **Parsing progressively.** Real, and in the front-end's lane, but it treats the symptom: the
  bytes still cross the network.

## What would fix it

**A slim index the map can render from, generated beside the full dataset.** Name, slug, lat,
lng, category — 12 KB raw, perhaps 4 KB gzipped. The map draws from that at ~1.5 s; the full
CSV continues in the background and the archive upgrades in place, exactly as the existing
`localStorage` cache path already upgrades.

That would take first-marker from **5.0 s to under 2 s** on the connection most of this
archive's readers actually have.

### What the front end will do with it

Nothing until it exists, and then this, in `useShrineData`: a third path above the cache path
that renders the slim index immediately and lets the CSV replace it. The hook already has the
shape — `adoptCsvResult` exists precisely so a later, better answer can supersede an earlier
one without rebuilding the search index for a no-op.

### Two things the generator has to get right

1. **A slim row must be a real `Shrine`, not a partial one.** Anything the map or the sidebar
   list reads before the CSV lands has to be present, or the reader gets a card with holes in
   it that fills in a second later — which reads as breakage rather than as loading. The
   sidebar shows name, location, category and the two provenance badges, so those belong in the
   slim shape too. That is still well under 40 KB.
2. **It must be generated, never hand-maintained.** The row count moves with the sheet, and a
   slim index that drifts from the full one would put a pin at a place the entry does not
   claim. `data:build` already writes `src/data/shrines-fallback.json` from the same fetch; this
   is one more emit from that pass, and the drift guard is that both come out of one read.

## Why this is worth doing at all

The archive's stated audience is readers in Pakistan on phones. The front door currently spends
its entire data budget on content that route does not render. Every other performance number on
this project is good — scroll is a flat 60 fps at 4× CPU throttle with zero long tasks, FCP is
1.2 s, the map's TBT was taken from 1,386 ms to ~87 ms. This is the one remaining number that a
reader actually feels, and it is the largest single win left on mobile.
