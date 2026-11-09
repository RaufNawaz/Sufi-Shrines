# Visual redesign — branch `redesign/visual-2026-11` (8–9 November 2026)

Asked by Rauf on the night of 8 November 2026: a local, branched version of the site that keeps
every function and is visually much more appealing, to test in the morning. Nothing here is pushed
or deployed. The branch lives in its own worktree (`../Shrines-redesign`) so the uncommitted Urs
Shock work on `research/shrines-econometrics` is untouched, and its dev server runs on
**http://localhost:5180** (5173 stays the current site, for side-by-side comparison; 5174 and 5175
were taken by other projects).

The live site (spiritualsitespakistan.com) was compared on 8 November before starting: its pages
are the same build as this branch's base commit `6cd37413`.

## Diagnosis of the current look

The Apple pass (9 October 2026, `docs/planning/APPLE_PASS_2026-10-09.md`) made the site clean and
consistent, but it also made it anonymous: grey-white page, white rounded cards with the same soft
shadow on every page, one sans at every size, tracked all-caps eyebrows (`ON THE MAP`, `SHRINE
FACTS`, `CONTENTS`, `MUSLIM SHRINE`). That is the generic "SaaS card kit". Nothing in it says
*Pakistan*, *shrine*, or *archive*. The front door on the map is a grey icon disc and "Explore the
archive".

## Direction: Kashi

The material skin of the archive's most iconic sites — Shah Rukn-e-Alam, the Uch tombs, Sehwan —
is kashi-kari, cobalt and turquoise glaze on brick. `DESIGN_VISION.md` already chose those two
blues as the chrome; this pass takes the rest of that document's unbuilt proposals (the bilingual
masthead, a tile motif, Spectral as the display face) and builds them.

- **Palette.** A glaze-white ground with a hair of blue (`#f3f5f9`), white surfaces, lapis ink
  (`#0f1729`) instead of neutral black, and a deep lapis band (`#13265a`) used for the few
  surfaces that carry identity (the map's masthead). Kashi cobalt stays the one interactive
  colour, firozi the secondary, gold the gilding. The six tradition colours are unchanged — they
  are join keys for the reader's eye. Dark theme keeps its neutral-warm ground (`tokenSplit.test.ts`
  holds red above blue there).
- **Type.** Spectral (Production Type, designed for screen reading, SIL OFL) for titles and section
  headings — sharper and lighter at display sizes than Merriweather, which is everyone's default
  heritage serif. Source Sans 3 stays the body and interface face; its metric-matched fallbacks
  stay. Nastaliq untouched.
- **No all-caps eyebrows.** Every tracked uppercase label becomes a sentence-case small semibold
  label. Cheapest de-templating move available, and it was already a no-op in Urdu.
- **Fewer boxes.** Cards keep their hairline edges but lose the drop shadow at rest; numerals in
  tiles are set in Spectral.
- **One signature: the kashi tile.** An eight-pointed star-and-cross pattern (the commonest
  glazed-tile repeat in the Multan and Uch tombs) drawn once as an SVG, used in exactly three places:
  the map sidebar masthead, under page titles as a thin band, and as the placeholder for entries
  with no photograph.
- **Bilingual masthead.** In the English view a shrine page shows the site's Urdu name in Nastaliq
  beside the Latin title (`<bdi lang="ur" dir="rtl">`), the cheapest distinctive move named in
  `DESIGN_VISION.md` Part 2.

## What does not change

Routes, data, components' behaviour, the sheet, the Urdu content, the badges' meanings, the honesty
devices (hollow projected dots, "approximate" pills, undated counts). This is a CSS-and-markup pass.

## Found on the way (also in HANDOVER §9)

- **CARTO's keyless raster tiles now answer every request with an "API KEY REQUIRED" image**, HTTP
  200, `image/png`, light and dark alike, with or without the production Referer (measured 8 November
  2026). Production reaches CARTO only when MapTiler fails, so the live map is fine today, but the
  fallback is dead, and any local checkout without `VITE_MAPTILER_KEY` shows a watermarked map. This
  branch points the *vector* basemap at OpenFreeMap (keyless, OpenMapTiles schema, so
  `localizeStyle` applies unchanged) when no key is set. Whether production should adopt it is
  Rauf's call.

## Log

(appended as the work proceeds)
