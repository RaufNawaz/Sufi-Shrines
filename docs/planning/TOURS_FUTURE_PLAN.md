# Guided Tours — Future Plan

**Status: IMPLEMENTED (all 5 phases landed; kept for history).** §1 below describes the
pre-Phase-1 starting point (3 tours, no route/audio/sharing) — that's no longer current.
The app now has 8 tours with routes, richer stops, share/resume/embed, audio + autoplay,
and discovery/near-me/print (see `CHANGELOG.md`). Two open design questions from §7
(curated audio recordings vs. TTS; JSON-authored vs. KG-generated tours) remain
genuinely unresolved — see `PROJECT_VISION.md` Track 3.

_Feature roadmap for expanding the guided-tours experience. Drafted 2026-07-06._

The tours have drawn strong positive feedback, so this plan is about deepening the **experience** (not adding more tour content — the shrine dataset is growing separately). Everything below is scoped to the current stack: Vite + React 18 + TypeScript + react-leaflet, static GitHub Pages hosting, bilingual EN/Urdu with RTL, no paid runtime APIs, and design driven entirely from `tokens.css`.

---

## 1. Where the tours are today

Three curated, bilingual tours live in `src/lib/tours/tours.ts` — _Sufi Saints of the Indus Valley_ (8 stops), _Sikh Heritage Circuit_ (5), and _Ancient Sacred Temples_ (5). The data model is a `Tour` (id, title, description, stops) where each `TourStop` holds a `shrineSlug` plus an EN and Urdu narrative.

The UI is two components in `src/components/map/TourPanel.tsx`: `TourList` (an opt-in toggle plus a card per tour) and `TourPanel` (stop-by-stop narrative with Previous / Next / End, progress dots, and a "Stop N of M" badge). State lives in `MapPage.tsx` and tours are opt-in via a `localStorage` flag.

The key gap: **a tour barely uses the map.** Advancing a stop just calls `setSelectedId`, which flies the map to that one shrine. There is no route line connecting the stops, no images or audio, no way to share a tour, and no sense of the journey as a whole. That's the opportunity.

---

## 2. What great guided tours do (research digest)

I looked at the leading storytelling-map and tour platforms. The patterns worth borrowing:

**Esri ArcGIS StoryMaps** (the reference standard for place-based narrative) uses a **progress line** connecting stops for sequential itineraries, offers **map-focused vs. media-focused** layouts, supports an **explorer mode** where readers browse stops in any order, and puts a **photo or video on every stop**. Their guidance: progress lines only make sense when stops have a real order, and too many stops makes eyes glaze over — curation beats completeness.

**Mapbox Storytelling** drives the whole experience from the map: it **`flyTo`-animates the camera** as you move between chapters, highlights the **active stop's marker**, and can trigger a **custom action on entering each chapter**. Its scroll-driven progression is the mechanism that makes a map feel like it's narrating.

**Wix / 360 virtual-tour apps** center on **immersive media** — panoramic images with clickable **hotspots**, drag-and-zoom exploration, and dead-simple **embedding** (one snippet drops the tour into any page).

**Self-guided walking-tour apps** (VoiceMap, GuideAlong, GPSmyCity) add the on-the-ground layer: **audio narration** that plays hands-free, **offline/downloadable** tours that never expire, **GPS-triggered** stops so content fires when you arrive, and per-stop **practical info** (photos, hours, how to get there).

Mapping those against what we already have, the highest-leverage additions are: a **route drawn on the map** with animated movement between stops, **media on each stop**, **shareable/resumable** tours, **audio + autoplay**, and eventually **discovery** (browse by theme/region, "near me"). None of these require a paid API.

---

## 3. The vision

Turn a tour from a text panel that happens to move a pin into a **narrated journey across the map**: you see the whole route, the map glides from shrine to shrine, each stop shows a picture and (optionally) speaks, you can share a link that opens exactly where you left off, and — standing at Data Darbar with your phone — the tour knows you're there. All bilingual, all offline-capable, all free to run.

---

## 4. Phased roadmap

Phases are ordered by value-per-effort and by dependency. Phase 1 is the single biggest visible upgrade and unblocks the rest.

### Phase 1 — Put the journey on the map _(highest impact)_

**Features**

- Draw a **route polyline** connecting the tour's stops in order (styled from `tokens.css`; dashed line; optional draw-on animation).
- **Animate the camera** between stops using the `flyTo` already in `ShrineMap.tsx`, and **fit the whole route** in view when a tour starts.
- **Numbered stop markers** (1…n) that match the panel's stop numbers; **highlight the active stop** and dim non-tour markers while a tour is running.

**Why it matters** — This is what every reference platform does and what our tours conspicuously lack. It converts the feature from "a reader with a sidebar" into "a map that tells a story."

**Fits our stack** — Leaflet has `Polyline` natively; `flyTo` and a reduced-motion `setView` fallback already exist in `ShrineMap.tsx`. `Shrine.latLng` gives every coordinate needed. No new dependencies.

**Effort:** Medium · **Depends on:** nothing.

### Phase 2 — Richer stops (media + practical info)

**Features**

- Show the **shrine's image on each stop** in the panel (reuse `shrine.imageUrl`, already rendered elsewhere).
- Surface **visiting info per stop** (how to get there, timings) — the data column already exists in the sheet.
- Compute and display **distance and estimated duration** for the tour and between consecutive stops (haversine on `latLng`, done client-side).
- A **tour preview**: a mini route summary with total stops and distance shown _before_ you commit to starting.

**Why it matters** — Media makes stops vivid (StoryMaps' core principle); distance/preview sets expectations the way walking-tour apps do.

**Fits our stack** — All client-side; reuses existing image and data patterns. No new dependencies.

**Effort:** Low–Medium · **Depends on:** nothing (complements Phase 1).

### Phase 3 — Shareable & resumable

**Features**

- **Deep-linkable tours**: `?tour=<id>&stop=<n>` in the URL, extending the existing `?selected=` sync pattern in `MapPage.tsx`.
- **Resume**: remember the last tour + stop in `localStorage`; offer "Resume tour" on return.
- **Progress state**: mark tours started/completed and reflect it on the cards.
- **Share button**: copy the deep link (Web Share API where available).
- **Embed mode** (`?embed=1`): minimal chrome so a tour can be iframed into the Harvard project page or a blog post.

**Why it matters** — Sharing and embedding are how tours travel beyond the site (Wix's one-snippet embed); resume respects that pilgrims explore over multiple sessions.

**Fits our stack** — URL sync, `localStorage`, and pushState are all already in use. No new dependencies.

**Effort:** Medium · **Depends on:** nothing, but best after Phase 1 so shared links land on the animated experience.

### Phase 4 — Audio & guided playback

**Features**

- **Audio narration per stop**, bilingual. Two no-paid-API routes: (a) pre-generated audio files shipped as static assets and precached by the PWA, or (b) the browser's built-in **SpeechSynthesis** as a zero-asset fallback. Recommend (a) for quality where files exist, (b) as graceful fallback.
- **Autoplay / slideshow mode**: timed auto-advance with play/pause, off by default, respecting `prefers-reduced-motion`.
- **Offline**: ensure tour images/audio are precached by the existing service worker so tours work with no signal — directly useful for on-site pilgrims.

**Why it matters** — Audio + hands-free playback is the defining feature of the walking-tour category and a genuine accessibility win.

**Fits our stack** — SpeechSynthesis is free and built into browsers; static audio fits the existing PWA cache. Main cost is producing/licensing audio and getting a11y right.

**Effort:** Medium–High · **Depends on:** Phase 1–2.

### Phase 5 — Discovery & on-site awareness

**Features**

- **Browse/filter tours** by theme, region, era, and tradition (Sufi / Sikh / Hindu-Jain).
- **"Near me"**: opt-in browser Geolocation highlights the closest tour or stop for visitors physically at a site.
- **Related tours** / "you might also like" suggestions.
- **Data-driven tours**: move tour definitions out of hardcoded TypeScript into a validated JSON/data source (or generate from the knowledge graph) so new tours ship without code changes — this is what lets the feature scale as the dataset grows.
- **Printable itinerary** (print CSS; optional PDF export).

**Why it matters** — As tours multiply, discovery and a no-code authoring path become the bottleneck. "Near me" turns the site into an in-situ companion.

**Fits our stack** — Geolocation is a free browser API (opt-in); filtering reuses existing chip patterns; data-driven tours is a refactor, not a new dependency.

**Effort:** Medium–High · **Depends on:** Phases 1–3; data-driven tours pairs well with the separate dataset-expansion work.

---

## 5. Cross-cutting principles (every phase)

Bilingual EN/Urdu with full RTL parity; keyboard-navigable with screen-reader live regions (the panel already uses `aria-live`); honor `prefers-reduced-motion` (fall back to `setView`, disable autoplay/draw-on); style only from `tokens.css` (no ad-hoc colors/spacing); `npm run lint --max-warnings 0` and `npm run verify` stay green; new logic gets Vitest coverage and key flows get Playwright coverage; no paid APIs and 100% functionality on a fresh clone; light theme default, dark mode must work.

---

## 6. Quick reference

| Phase | Headline feature                                       | Effort   | New deps                              |
| ----- | ------------------------------------------------------ | -------- | ------------------------------------- |
| 1     | Route line + animated camera + numbered markers        | Medium   | None                                  |
| 2     | Stop images, visiting info, distance/duration, preview | Low–Med  | None                                  |
| 3     | Deep links, resume, progress, share, embed             | Medium   | None                                  |
| 4     | Audio narration, autoplay, offline caching             | Med–High | None (SpeechSynthesis / static audio) |
| 5     | Browse/filter, "near me", related, data-driven, print  | Med–High | None                                  |

**Suggested first ship:** Phase 1 alone is a dramatic, self-contained upgrade with no new dependencies — a natural first PR.

---

## 7. Open questions

- **Audio (Phase 4):** produce real recordings (best quality, needs effort/licensing — qawwali or narration?) or lean on browser TTS (free, instant, robotic)? A mix is fine.
- **Data-driven tours (Phase 5):** author tours as JSON, or generate them from the knowledge graph the enrichment pipeline is building?
- **Scope of first PR:** ship Phase 1 only, or Phase 1+2 together (they pair naturally)?
