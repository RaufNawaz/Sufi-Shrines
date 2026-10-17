
### 9.360 — 17 October 2026 (overnight): a Sources tab, and three things HEAD's own gates already said

**Shipped:** `/sources` (the sixth tab) and `/source/:slug` (43 pages + `/ur` mirrors) — `ea10528`.
Full orientation in `docs/SOURCES_TAB.md`. What a next session needs from tonight:

1. **Public readers had no way to browse the sources across entries.** The "what the archive rests
   on" section of `/about` renders for the team view only, and every shrine page's "also cited by N
   other entries" link pointed into it — so the link sent the public to a page without its target.
   It points at `/sources#source-…` now.
2. **HEAD was red on three gates before tonight's work started**, all from the 15–16 October phone
   council, whose commits are recorded as unverified: the bundle budget (shell 279/275, MapPage
   626/620, Typology 335/328), `classNamesStyled.test.ts` (the palette's near-me chip and distance
   label had no CSS), and `no-overflow.spec.ts` on `/typology` at phone width in both languages
   (the tile strip's edge bleed). All three fixed (`ea10528`, `4d82f89`). The MapPage +10 KB is *not*
   the palette going static — `loadCommandPalette` is still a dynamic import — it is the map work.
3. **`npm run verify` fails at `format:check` on four files in the untracked `Claude outputs/`
   folder** from an earlier session. Not tonight's files and not touched; run the later stages by
   hand or move that folder out of the tree.
4. **Of the 31 books read in full, 29 are cited by no published entry.** The page says "In review"
   and will list entries by itself once the pending patches land — provided each book's `match`
   string occurs in the new citation. `sourceLibrary.test.ts` pins the current hits; after an import,
   read each new hit before updating it.
5. `pipeline/gis/export_outline_svg.py` makes a 5.4 KB SVG outline of the seven OCHA units from the
   GIS foundation, without geopandas (GeoPackage geometry is a header plus WKB). A closed ring gives
   Douglas–Peucker a zero-length baseline and it keeps nothing — split the ring at its farthest vertex
   first.
