# ADVANCED_ROADMAP — Sufi Shrines

*A principal-engineer / design-director roadmap that goes beyond the core fixes and the P0–P5 foundation. This is the leap from "an excellent site" to "the definitive, durable, flagship digital atlas of South Asian Sufi sacred sites — equally indispensable to a pilgrim, a tourist, and a scholar." Written to be executed directly by Claude Code.*

> This document is also merged into `REDESIGN_FOLLOWUP.md` (as Part D) so there is one combined master plan. The two copies are identical; keep them in sync or treat the master as canonical.

---

## Assumptions (stated up front)
1. **Ambition level:** flagship public-facing product *and* a credible Harvard research artifact — citable, accessible, durable. I'm proceeding at the most ambitious reasonable bar rather than asking, because every prior instruction has pushed toward "very professional / portfolio-grade."
2. **The foundation is being handled separately and is a prerequisite.** This roadmap assumes the four core fixes (`REDESIGN_FOLLOWUP.md` Part A), the polish pass (Part B), and the P0–P5 work (`P0_STABILIZE_PROMPT.md` + the appendix roadmap) are done or in flight: legacy archived, CI exists, the data layer is fail-safe with a committed snapshot, PWA icons exist, and slug-based permalinks are in place. I **build above** those and explicitly do not repeat them.
3. **Scale:** the dataset grows from ~109 toward several hundred entries across multiple faiths/regions. Design for 500+.
4. **Hosting stays static** (Netlify/Cloudflare Pages — note the existing `public/_redirects`). No always-on backend. Advanced features must remain static-compatible or add only build-time / lightweight serverless steps.
5. **New dependencies introduced here** (MapLibre GL, a search index lib, Playwright, Storybook, Lighthouse CI) are each justified per item; adopt them deliberately, not all at once.

*Effort key: **S** ≈ <½ day · **M** ≈ ½–2 days · **L** ≈ 3–5 days · **XL** ≈ 1–2 weeks. Sizes assume one engineer working with Claude Code.*

---

## 1. Executive summary

The foundation work makes the site stable and the redesign makes it beautiful. This roadmap makes it *significant*: a spatial, bilingual, citable atlas that scales in content and holds up to scholarly and public scrutiny.

Six tracks, with a deliberate sequence. **Do the force-multipliers first** — a real design system (Track 4) and a test/quality pyramid (Track 5) — because every later change rides on them and they prevent the regressions we've already seen (map zoom, stuck map, missing article body). Then invest in the headline product bets:

- **Track 1 — Spatial experience:** make the map a *product*, not a backdrop — deep-linkable state, vector tiles (MapLibre), real clustering + heatmap, faceted + time-aware filtering, and guided "story-map" tours.
- **Track 2 — Content, integrity & SEO:** prerender every shrine to a fast, citable, richly-previewed page with structured data; mature the OCR→review→publish pipeline with source provenance.
- **Track 3 — Discovery:** worker-based fuzzy/full-text/geo search that stays instant at 500+ entries.
- **Track 6 — Performance, resilience & observability:** image CDN, offline-first PWA, web-vitals + error tracking, accessibility beyond AA.

**Recommended order:** T4 + T5 (foundation for quality) → T1.1 deep-linkable state + T3 search (cheap, high-impact) → T2 SSG/SEO → T1.2–T1.6 advanced map → T6 polish/resilience. Trade-off to accept early: investing ~1 week in design-system + testing before shipping new features feels slow, but it's what turns this from "a nice project" into "a maintainable product."

---

## 2. Current-state assessment (grounded in the code)

What exists today (verified):
- **Stack:** React 18 + Vite 5 + TS, `react-leaflet` 4 / Leaflet 1.9 with CARTO Voyager default (`src/components/map/ShrineMap.tsx`), data via PapaParse from a published Google Sheets CSV (`CSV_URL` in `src/lib/data/constants.ts`, fetched in `src/hooks/useShrineData.ts` with a localStorage cache + background refresh). PWA configured in `vite.config.ts`. ~4,850 LOC in `src/`.
- **Data model (`src/types/shrine.ts`, `src/lib/data/shrineModel.ts`):** `Shrine.id` is the **CSV row index**; `slug` uses an explicit `Slug` column if present, else `buildSlug(name, id)` → **unstable** (`data-darbar-0`) if rows reorder. `Founded` is **free-text** ("11th Cent") with no numeric/era value. There is **no "Sufi order/silsila" field**. `haversineKm` and `findRelatedShrines` (category+location+distance scoring) already exist.
- **Search (`src/components/map/MapSidebar.tsx`):** a `useMemo` substring scan over all fields, debounced 200ms, **on the main thread**. No fuzziness, no ranking, no highlighting.
- **Map state:** selection lives in `MapPage.tsx` React state; **nothing is reflected in the URL** — you can't share or deep-link a selected shrine, filter, or viewport.
- **SEO:** `ShrinePage.tsx` sets `document.title` and the meta description **imperatively at runtime**. No SSG/prerender, no JSON-LD, no per-shrine OG image, no sitemap — so as a client-rendered SPA, shrine links preview poorly and index weakly.
- **PWA:** runtime caching is configured for Sheets/tiles/fonts, but `public/` contains only `_redirects`, `favicon.svg`, `robots.txt` — **the manifest icons are missing** (addressed in P0).
- **Quality:** three unit tests only (`src/lib/data/__tests__/*`, `src/lib/i18n/__tests__/*`). **No component, E2E, visual, or a11y tests; no CI** (`.github/` absent).
- **UI engineering debt:** several components carry **inline styles** that bypass the token system (e.g. the "Table of Shrines" button block in `MapSidebar.tsx`, the header in `ShrinePage.tsx`, parts of `LocationMap.tsx`).
- **Images:** external hotlinks (largely Wikipedia) — fragile, no responsive sizing, layout-shift risk.

Constraints to respect: static hosting, no backend, a single editable Google Sheet as the source of truth, and bilingual EN/Urdu (RTL) as a first-class requirement.

---

## 3. Vision / north star

**"The definitive bilingual digital atlas of South Asian Sufi and allied sacred sites."** A pilgrim plans a visit, a traveller discovers nearby shrines, and a scholar cites a durable, sourced page — all from the same product.

Design principles:
- **Spatial-first.** The map is the primary interface and is shareable, filterable, and time-aware.
- **Editorial depth, sourced.** Every shrine page reads like a feature and carries citations/provenance.
- **Citable & durable.** Stable URLs, prerendered pages, structured data, archival-friendly.
- **Bilingual as first-class.** EN/Urdu parity in content, typography, numerals, and RTL behavior — never an afterthought.
- **Radically accessible & fast everywhere.** AA minimum (AAA where feasible), offline-capable, sub-second on a mid-range Android.

---

## 4. The advanced roadmap (phased by track)

### Track 1 — Spatial experience (make the map a product)

**T1.1 — Deep-linkable, shareable map state · (M)**
- *Rationale:* Today you can't share "the map centered on Lahore with Muslim shrines filtered and Data Darbar selected." This is the single cheapest high-impact upgrade and unlocks T3.2 and social sharing.
- *Scope:* Encode viewport (`lat,lng,z`), `selected` slug, active `category`/facets, and search query in URL query params; restore on load; update on interaction (debounced, `history.replaceState`). Make the selected-shrine fly-to read its target from the URL.
- *Files:* `src/pages/MapPage.tsx` (lift state to URL via `useSearchParams`), `src/components/map/ShrineMap.tsx`, `src/components/map/MapSidebar.tsx`.
- *Dependencies:* none (react-router already present).
- *Risks:* history spam / back-button noise — use `replaceState` for viewport, `pushState` only for selection.
- *Acceptance:* copying the URL and opening it in a fresh tab reproduces viewport + filters + selection exactly; back/forward behaves sanely; verified EN + Urdu.

**T1.2 — Migrate the base map to MapLibre GL (vector tiles) · (XL)**
- *Rationale:* Raster Leaflet is fine but caps the ceiling: vector tiles give crisp retina rendering, runtime light/dark styling without swapping tile servers, client-side label localization, smooth pitch/zoom, and far better clustering/heatmap performance at scale.
- *Scope:* Introduce `maplibre-gl` (+ `@vis.gl/react-maplibre` or a thin wrapper); self-host or key a vector style (e.g. MapTiler/Protomaps — note `VITE_MAPTILER_KEY` already supported); port markers, popups, controls, and the fly-to; wire `mapbox-gl-rtl-text` for Arabic/Urdu labels; keep a Leaflet fallback flag until parity is proven.
- *Files:* replace internals of `src/components/map/ShrineMap.tsx`, `ShrineMarkers.tsx`; new `src/components/map/style/` for map styles; `src/styles/map.css`.
- *Dependencies:* T1.1 (state model) should land first; coordinate with T6.2 (tile caching).
- *Risks:* largest item here — bundle size (~200–800KB), a style/key cost, and a real porting effort. **Trade-off:** only do this once clustering/heatmap/perf demands exceed what Leaflet handles. If time-boxed, T1.3–T1.6 can ship on Leaflet first.
- *Acceptance:* feature-parity with the Leaflet version (markers, selection fly-to, layer/zoom controls, RTL labels, light/dark), equal-or-better Lighthouse, and a documented rollback flag.

**T1.3 — Real clustering + optional density heatmap · (M)**
- *Rationale:* Lahore/Punjab markers overlap badly today; clustering is the biggest legibility win at current scale and essential at 500+.
- *Scope:* Branded clusters (count bubbles, spiderfy/zoom on click) via `leaflet.markercluster` (Leaflet) or native MapLibre cluster layers; a toggleable heatmap layer (`leaflet.heat` or MapLibre `heatmap`) for density storytelling.
- *Files:* `src/components/map/ShrineMarkers.tsx` (and refactor it — see note), `src/styles/map.css`.
- *Dependencies:* benefits from T1.2; works on Leaflet today.
- *Risks:* `ShrineMarkers.tsx` currently **tears down and recreates all markers on every `selectedId` change** — clustering will amplify that churn. Refactor to build markers once and update only the changed marker (P3 in the appendix). Do that refactor as part of this item.
- *Acceptance:* dense regions cluster smoothly, expand on click, and selection still flies to the right marker; no full marker-layer rebuild on selection; heatmap toggles cleanly.

**T1.4 — Faceted filtering (category · region · saint · order) · (M, content-dependent)**
- *Rationale:* "All / Hindu Temple / Muslim Shrine / Sikh Gurdwara" chips are a start; scholars and pilgrims want to filter by Sufi order (silsila), saint, province/region, and era.
- *Scope:* A facet panel driving both map and list, combinable, reflected in URL (T1.1). Derive region from `Location`; saint from `Sufi Saint`; **order/silsila requires a new `Sufi Order` column** (content dependency — coordinate with T2.4) — degrade gracefully when absent.
- *Files:* `src/components/map/MapSidebar.tsx`, `src/lib/data/constants.ts` (facet config), `src/types/shrine.ts` (+ optional `sufiOrder`), `src/lib/data/shrineModel.ts`.
- *Dependencies:* T1.1; content for order/region.
- *Risks:* facet explosion / empty states — cap, group, and show counts per facet value.
- *Acceptance:* multiple facets combine correctly, counts are accurate, state is shareable, and missing fields hide their facet rather than showing empties.

**T1.5 — Time-slider by founding era · (M, needs an era parser)**
- *Rationale:* A "scrub through centuries" control is a signature, research-grade feature that turns the atlas into a temporal story.
- *Scope:* New `src/lib/data/era.ts` to normalize free-text `Founded` ("11th Cent", "1325", "Mughal era") into a century/decade range with confidence; a brushed range slider that filters map + list and animates.
- *Files:* `src/lib/data/era.ts` (+ unit tests), a new `src/components/map/TimeSlider.tsx`, wire into `MapPage.tsx`/`MapSidebar.tsx` + URL.
- *Dependencies:* T1.1; data quality of `Founded`.
- *Risks:* messy/ambiguous source data — parser must bucket conservatively and exclude (not guess) unparseable values; surface "undated" as its own bucket.
- *Acceptance:* slider filters correctly, undated entries handled explicitly, parser covers the real values in the sheet (test against the live data), bilingual labels.

**T1.6 — Guided "story-map" tours · (L)**
- *Rationale:* Curated narrative journeys (e.g. "The Chishti trail", "Shrines of Lahore") are the difference between a database and an experience, and are highly shareable/teachable.
- *Scope:* A lightweight tour format (ordered stops + narrative + camera targets) authored in data; a step UI that flies between stops with scroll/next controls; deep-linkable per tour and step (T1.1).
- *Files:* new `src/components/map/StoryMode.tsx`, `src/lib/data/tours.ts` (+ a tours data source), routing `/?tour=chishti-trail&step=2`.
- *Dependencies:* T1.1, ideally T1.2 for smooth camera; tour content (T2.4).
- *Risks:* scope creep — ship one hand-authored tour end-to-end before generalizing.
- *Acceptance:* one complete tour works on desktop + mobile, is shareable at a given step, respects reduced-motion, and is fully bilingual.

**T1.7 — Nearby amenities & points-of-interest layer · (M–L)**
- *Rationale:* A pilgrim or tourist planning a real visit needs more than the shrine itself — where to eat, stay, park, pray, refuel, and find an ATM, pharmacy, or transport nearby. This turns the atlas from a catalog into a trip-planning tool and is a high-value, frequently-wanted feature. (The user explicitly asked for the map to show restaurants and other places alongside the shrines.)
- *Scope:* A toggleable **"Nearby" layer** on the same map showing categorized POIs — restaurants & cafés, hotels/guesthouses, transport (bus/rail/rickshaw stands), fuel, parking, ATMs/banks, pharmacies, public washrooms, and other nearby mosques — sourced from **OpenStreetMap via the Overpass API**, queried client-side around the selected shrine and/or the current viewport. Per-category toggles; **distinctly styled markers/icons** clearly separable from shrine markers; and a **"Nearby this shrine"** section on the detail page listing the closest amenities with distance (reuse `haversineKm` from `shrineModel.ts`) and a directions link. Cache responses (localStorage/IndexedDB), debounce by viewport, and query on demand to respect Overpass rate limits.
- *Files:* new `src/lib/poi/` (Overpass client, category config, cache), new `src/components/map/PoiLayer.tsx` + a layer-toggle in `src/components/map/MapSidebar.tsx`, a `NearbyAmenities` section in `src/pages/ShrinePage.tsx`, POI marker styles in `src/styles/map.css`.
- *Effort:* M–L.
- *Dependencies:* T1.1 (URL/viewport state); benefits from T1.3 clustering for dense POIs; T1.2 (MapLibre) optional.
- *Risks / trade-offs:* Overpass **rate limits + latency** (mitigate with on-demand queries, caching, and optionally a self-hosted Overpass or a prebuilt regional extract); OSM coverage varies across Pakistan; **ODbL attribution is required**. Google/Mapbox Places is higher-quality but adds **cost, an API key, and ToS limits** — recommend **OSM-first**, with a Places adapter behind a common interface if quality later demands it.
- *Acceptance:* toggling a category renders correctly-styled, visually-distinct POI markers near the shrine/viewport; the detail page lists the nearest restaurants/hotels with distance + directions; results are cached and Overpass is not hammered (debounced/on-demand); OSM is attributed; works in EN + Urdu and respects reduced-motion.

### Track 2 — Content, data integrity & SEO

**T2.1 — Prerender / SSG every shrine page · (L)**
- *Rationale:* The biggest gap for a public research artifact: a client-rendered SPA gives weak link previews and poor indexing. Prerendering ~109 (→500+) shrine routes makes each a fast, crawlable, citable document.
- *Scope:* Add SSG (`vite-react-ssg` or a prerender step) that builds the data snapshot at build time and emits static HTML per `/shrine/:slug` plus the map shell; hydrate to the current SPA. Reuse the committed data snapshot from P0 so the build needs no live fetch.
- *Files:* `vite.config.ts`, a new `src/routes.tsx`/entry for SSG, `src/pages/ShrinePage.tsx` (make data-loading SSG-friendly), build scripts in `package.json`.
- *Dependencies:* P0 committed data snapshot; stable slugs (T2.3).
- *Risks:* SSG + Leaflet/MapLibre need careful client-only guards; build time grows with content. **Trade-off:** adds build complexity vs. huge SEO/perf/shareability gain — worth it for a public artifact.
- *Acceptance:* `dist/` contains real HTML per shrine with correct `<title>`/meta in the markup (view-source, not just runtime); Lighthouse SEO ≥ 95 on a shrine page; no client-only crashes.

**T2.2 — Structured data, OG images & sitemap · (M)**
- *Rationale:* Make shrine pages first-class web citizens: rich Google results, clean social cards, full crawlability.
- *Scope:* Per-shrine JSON-LD (`Place` / `LandmarksOrHistoricalBuildings` with geo, name, image, sameAs→Wikipedia); replace runtime meta with build-time `<head>` tags; generate `sitemap.xml` and `hreflang` for EN/Urdu; per-shrine OG image (static hero or a build-time/edge-generated card).
- *Files:* `ShrinePage.tsx` head emission (SSG), a `scripts/generate-sitemap.mjs`, `public/` outputs, `index.html` defaults.
- *Dependencies:* T2.1.
- *Risks:* OG image generation can balloon — start with the existing hero image as the OG image; add generated cards later.
- *Acceptance:* JSON-LD validates in Google's Rich Results test; sitemap lists all shrines with hreflang; social cards render correctly for a sampled shrine.

**T2.3 — Stable, immutable permalinks · (S–M, builds on P0)**
- *Rationale:* `slug = buildSlug(name, id)` ties URLs to the CSV **row index** — reorder the sheet and shared/cited links break. Unacceptable for a citable artifact.
- *Scope:* Make an explicit, immutable `Slug` column the source of truth (the model already prefers it); generate-and-backfill slugs once; add a redirect map for any legacy `*-<index>` URLs.
- *Files:* `src/lib/data/slugify.ts`, `src/lib/data/shrineModel.ts`, `public/_redirects`, a one-off `scripts/backfill-slugs.mjs`.
- *Dependencies:* coordinates with P0 data work.
- *Risks:* existing shared links — ship redirects before flipping.
- *Acceptance:* every shrine has a stable slug independent of row order; reordering the sheet doesn't change any URL; legacy URLs redirect.

**T2.4 — Content model & pipeline maturation · (L, ongoing)**
- *Rationale:* For research credibility, content needs structure, provenance, and review — not just free-text cells.
- *Scope:* Extend the schema (`Sufi Order`, `Region/Province`, structured `Sources` with citations, image credits/licences); mature `process_books.py` into OCR → human review → publish with per-section source provenance surfaced on the page; document the editorial workflow; **evaluate** migrating from a single Sheet to git-based JSON (PR-reviewed) or a lightweight headless CMS as contributors/scale grow.
- *Files:* `src/types/shrine.ts`, `src/lib/data/constants.ts`, `HANDOFF.md`/new `CONTENT.md`, the Python tooling.
- *Dependencies:* informs T1.4/T1.5/T2.2.
- *Risks:* editorial process is human, not just code — keep the Sheet workflow working throughout any migration.
- *Acceptance:* a documented content model + workflow; at least the `Sources`/credits render with provenance on shrine pages; a written recommendation on Sheet-vs-git/CMS with a trigger threshold.

**T2.5 — Data integrity validation in CI · (M)**
- *Rationale:* One malformed row silently drops a shrine today. Validate the dataset as a build gate.
- *Scope:* A schema validator (e.g. Zod) run against the committed snapshot in CI: required fields, numeric lat/lng in-range, valid image URLs, unique slugs, parseable eras; fail the build (or warn) on violations and emit a report.
- *Files:* `src/lib/data/validate.ts`, `scripts/validate-data.mjs`, `.github/workflows/ci.yml`.
- *Dependencies:* P0 CI + snapshot.
- *Acceptance:* CI flags a deliberately broken row; report lists row, field, and reason; valid data passes clean.

### Track 3 — Discovery & search

**T3.1 — Worker-based fuzzy / full-text / geo search · (M)**
- *Rationale:* The current main-thread substring scan won't stay instant at 500+ and offers no ranking, typo-tolerance, or highlighting.
- *Scope:* Build a search index (FlexSearch / MiniSearch / Orama) over name, location, saint, category, and description; run it in a **Web Worker**; add ranked results, typo tolerance, matched-term highlighting, and a "near me / near this point" geo mode reusing `haversineKm`.
- *Files:* new `src/lib/search/` (+ worker), refactor the search/list in `src/components/map/MapSidebar.tsx`.
- *Dependencies:* none; pairs with T1.1 for shareable queries.
- *Risks:* index build cost on load — build lazily/off-thread and cache.
- *Acceptance:* <50ms perceived query latency at 500 entries; typo ("dat" → "Data Darbar") and highlighting work; main thread stays unblocked (no input jank); EN + Urdu.

**T3.2 — Saved & shareable views · (S)**
- *Rationale:* Let users bookmark "Sikh Gurdwaras in Punjab, 18th c." — pure leverage on T1.1.
- *Scope:* Since all view state is in the URL (T1.1), add a "copy link" affordance and optional named local presets.
- *Files:* `src/components/map/MapSidebar.tsx`, small `useSavedViews` hook.
- *Dependencies:* T1.1, T1.4.
- *Acceptance:* a filtered view is one click to copy and restores exactly when reopened.

### Track 4 — Design system & UI engineering (force multiplier — do early)

**T4.1 — Tokenized primitive component library · (M)**
- *Rationale:* Tokens exist (`src/styles/tokens.css`) but components re-implement buttons/cards/chips and several use inline styles, so polish drifts and changes are risky.
- *Scope:* Extract `Button`, `IconButton`, `Chip`, `Card`, `Badge`, `Toggle`, `Skeleton`, `Toast`, `Tooltip` as typed components consuming only tokens; **remove the inline-style blocks** in `MapSidebar.tsx` (the Table-of-Shrines button), `ShrinePage.tsx` (header), and `LocationMap.tsx`.
- *Files:* new `src/components/ui/` primitives + `src/styles/components.css`; refactor call sites.
- *Dependencies:* none; unblocks Parts A/B polish and everything visual after.
- *Risks:* a broad refactor — do it behind unchanged visuals and lean on T5/T4.3 to prove no regressions.
- *Acceptance:* no component ships ad-hoc colors/spacing/radii; primitives cover all current UI; visuals unchanged (visual-regression clean).

**T4.2 — Storybook with bilingual + theme matrix · (M)**
- *Rationale:* A living catalog to develop and review components in light/dark × EN/Urdu without clicking through the app.
- *Scope:* Storybook 8 with theme + language toggles (decorators wrapping `ThemeContext`/`LanguageContext`), stories for every primitive and key composite (list row, shrine card, infobox, marker states).
- *Files:* `.storybook/`, `*.stories.tsx` beside components.
- *Dependencies:* T4.1.
- *Acceptance:* every primitive + key composite has stories rendering in all four theme/lang combinations; Storybook builds in CI.

**T4.3 — Visual regression · (M)**
- *Rationale:* Catch the silent visual breakage the redesign keeps hitting.
- *Scope:* Snapshot stories (and/or key pages) via Playwright component screenshots or Chromatic; gate PRs on diffs.
- *Files:* Playwright/Chromatic config, `.github/workflows/ci.yml`.
- *Dependencies:* T4.2 (or T5.2 for page-level).
- *Acceptance:* an intentional CSS change produces a reviewable diff; baselines stored; CI blocks unreviewed visual changes.

### Track 5 — Quality, testing & delivery (force multiplier — do early)

**T5.1 — Component / interaction tests · (M)** — RTL + Vitest for the things that broke: selection from list/search/marker calls fly-to; sidebar responsive collapse; `LocationMap` renders a map not a stuck skeleton; `ShrineArticle` renders body text from `Description`. *Files:* `src/**/__tests__/*`. *Acceptance:* these behaviors are covered and fail if regressed.

**T5.2 — E2E critical paths (Playwright) · (M)** — load map → search "data" → click result → assert detail card + zoom; open `/shrine/:slug` → assert article + location map; toggle theme/lang persists. *Files:* `e2e/`, `playwright.config.ts`, CI (nightly + pre-deploy). *Acceptance:* green E2E on the critical path across Chromium/WebKit.

**T5.3 — Automated a11y + Lighthouse CI budgets · (M)** — `axe` in component/E2E tests; Lighthouse CI with enforced budgets on the map and a shrine page. *Files:* CI workflow, `lighthouserc.json`. *Acceptance:* zero serious axe violations; budgets enforced and failing on regression.

**T5.4 — Preview deploys per PR + release flow · (S)** — Netlify/CF preview per PR; tagged releases + `CHANGELOG`. *Files:* host config, `.github/`. *Acceptance:* every PR gets a shareable preview URL; releases are tagged.

### Track 6 — Performance, resilience & observability

**T6.1 — Image pipeline / CDN · (M)** — proxy external hotlinks through an image CDN (Cloudinary/imgix/Cloudflare Images) or build-time optimize; responsive `srcset`, AVIF/WebP, explicit dimensions (kill layout shift), blur-up/LQIP placeholders, category-gradient fallback. *Files:* a small `<ShrineImage>` component, `galleryParsing.ts`, hero/related/list call sites. *Acceptance:* CLS ≈ 0 on shrine pages; images responsive; no broken-image gaps.

**T6.2 — Offline-first PWA maturation · (M)** — precache the data snapshot + app shell; offline route/state; "new version available" update toast; verify install on iOS/Android. *Files:* `vite.config.ts` (Workbox), an offline fallback, an update prompt. *Acceptance:* full offline browse of cached shrines + map shell; clean install; update prompt works.

**T6.3 — Web-vitals + error observability · (S–M)** — `web-vitals` reporting + lightweight error tracking (Sentry or a minimal endpoint), privacy-friendly analytics (Plausible) to learn which shrines/languages are used. *Files:* `src/main.tsx`, a tiny `src/lib/telemetry.ts`. *Acceptance:* CWV + JS errors visible in a dashboard; analytics respects privacy (no PII, documented).

**T6.4 — Accessibility beyond AA · (M)** — full keyboard map operation, a screen-reader-friendly **list alternative** to the map, focus management on route change, lightbox focus trap, AAA contrast where feasible, complete RTL audit (logical properties, gallery order, numerals/era localization). *Files:* map components, `ShrinePage.tsx`, `src/styles/*`, i18n. *Acceptance:* keyboard-only and screen-reader walkthroughs of the core journeys pass; documented a11y statement.

### Recommended sequence (at a glance)
1. **Foundation for quality:** T4.1 → T5.1 → T5.3/T5.4 → T4.2/T4.3 (so everything after is safe to change).
2. **Cheap, high-impact product:** T1.1 (deep links) → T3.1 (search) → T3.2.
3. **Citability:** T2.3 (stable slugs) → T2.1 (SSG) → T2.2 (structured data/sitemap) → T2.5 (data CI).
4. **Signature map:** T1.3 (cluster/heatmap + marker refactor) → T1.4 (facets) → T1.7 (nearby amenities/POIs) → T1.5 (time-slider) → T1.6 (story tours); **T1.2 (MapLibre) only when the map's ambitions outgrow Leaflet.**
5. **Resilience & reach:** T6.1 → T6.2 → T6.3 → T6.4, plus T2.4 content maturation running in parallel throughout.

---

## 5. Design system (detail)

- **Single source of truth:** all visual values come from `src/styles/tokens.css`. Add semantic aliases where missing (e.g. `--focus-ring`, category accent tokens used by chips + markers + list placeholders) so the taxonomy is colored consistently across map and list.
- **Primitives (T4.1):** `Button`, `IconButton`, `Chip`, `Card`, `Badge`, `Toggle`, `Skeleton`, `Toast`, `Tooltip`, `Sheet` (mobile bottom-sheet from Part B). Typed props, no inline styles, theme- and RTL-aware by construction.
- **Inline-style cleanup targets (verified):** `MapSidebar.tsx` (Table-of-Shrines button + assorted inline blocks), `ShrinePage.tsx` (header/error inline styles), `LocationMap.tsx`. Migrate these into primitives/`components.css`.
- **Theming & i18n in components:** every component must render correctly under `[data-theme='dark']` and `dir="rtl"`; bake this into the primitives and prove it in Storybook's theme×lang matrix.
- **Documentation:** Storybook is the contract; visual regression (T4.3) is the enforcement. Treat a token change as a reviewed, snapshot-diffed event.

## 6. Testing & quality strategy (detail)

- **Pyramid:** many unit tests (data/i18n/era/search/validation — fast, already partly present) → a solid band of component/interaction tests (T5.1) → a thin set of E2E critical-path tests (T5.2) → visual regression (T4.3) and automated a11y (T5.3) across the matrix.
- **What must always be covered (it has regressed before):** map selection → fly-to/zoom; map tiles actually render (no stuck skeleton); shrine article body renders from `Description`; sidebar responsive behavior; theme/lang persistence.
- **CI wiring:** extend the P0 workflow to run typecheck + lint + unit + component + build on every PR; run E2E + visual + Lighthouse CI on a schedule and pre-deploy to keep PRs fast. Gate `main` on the fast checks.
- **Budgets & policy:** enforce JS/CSS bundle budgets and Lighthouse budgets in CI; zero-serious-axe-violations gate; a documented flaky-test quarantine policy so the suite stays trusted.
- **Coverage targets:** ≥80% on `src/lib/**` (pure logic), critical-path E2E green on Chromium + WebKit, every primitive snapshotted.

## 7. Definition of excellent (measurable targets)

The product is "excellent" when, verifiably:
- **Performance:** Lighthouse ≥ 90 (map) / ≥ 95 (shrine page); LCP < 2.5s and CLS < 0.1 on a throttled mid-range mobile; initial JS within an agreed budget (e.g. ≤ 200KB gzip for the map route, map libs lazy-loaded).
- **SEO/citability:** all shrine pages prerendered with valid JSON-LD (passes Google Rich Results), present in `sitemap.xml` with `hreflang`, correct social cards; stable, index-independent slugs.
- **Accessibility:** zero serious/critical axe violations in both themes; keyboard-only and screen-reader walkthroughs of core journeys pass; AAA contrast where feasible; documented a11y statement.
- **Search:** < 50ms perceived query latency at 500+ entries, off the main thread, with typo tolerance and highlighting.
- **Reliability:** full offline browse of cached shrines; renders even if Google Sheets is unavailable (committed snapshot); CI blocks data-integrity, visual, a11y, and perf regressions.
- **i18n:** complete EN/Urdu parity in UI strings, content fields, numerals/era formatting, and RTL layout — no clipped or mis-mirrored screens.
- **Maintainability:** no ad-hoc styles outside tokens; every component in Storybook; the behaviors that previously broke are all under test.
