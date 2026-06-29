# Changelog

## [Unreleased] — feat/part-a-core-fixes

### Added
- T6.3: `web-vitals` integration — reports CLS, FCP, INP, LCP, TTFB to console in dev; beacons to `VITE_BEACON_URL` in production. Unhandled JS errors and promise rejections are also beaconed.
- T6.2: Offline fallback — `public/offline.html` served by Workbox when network + cache both fail. `UpdateToast` component shows "New version available" banner when SW updates.
- T1.4: Faceted filtering — Region (extracted from `Location` province) and Sufi Saint filter chips alongside the existing Category chips. Active filters are reflected in the URL (`?category=&region=&saint=`) so filtered views are shareable. Filter active indicator dot on the list-toggle button.
- T6.1: `ShrineImage` component (`src/components/ui/ShrineImage.tsx`) — `loading="lazy"`, `decoding="async"`, category-gradient placeholder on missing/broken images.

### Changed
- `Shrine` type: added `region` field (province extracted from `Location` value).
- `MapSidebar` filter state lifted to `MapPage` and URL-synced. Category, Region, Saint filters all controlled props.
- `useShrineData` cache key bumped to `v3` so stale cached Shrine objects missing `region` are discarded.
- Added `decoding="async"` to image elements in sidebar list and preview card.

---

## [2.1.0] — feat/part-a-core-fixes (prior commits)

### Added
- T1.1: URL sync — `?selected=<slug>` with `pushState`/`popstate` for back/forward navigation.
- T1.3: Marker clustering — `leaflet.markercluster` with branded cluster bubbles.
- T2.1: SSG prerender — `scripts/prerender.mjs` generates 109 shrine HTML files post-build.
- T2.2: JSON-LD, Open Graph tags, `sitemap.xml`.
- T2.3: Stable slugs — no row-index suffix, collision detection, `scripts/backfill-slugs.mjs`.
- T2.5: Data integrity validator — `scripts/validate-data.mjs` in CI.
- T3.1: Worker-based fuzzy search — MiniSearch Web Worker (`src/lib/search/`).
- T3.2: Copy-link share button on preview card and shrine detail page.
- T4.1: All ad-hoc inline styles moved to named CSS token classes.
- T5.1: Vitest component tests (35 passing).
- T5.2: Playwright E2E tests (17 passing — map flow, shrine detail, preference persistence).
- T5.3: axe-core a11y tests (0 critical/serious violations); Lighthouse CI budgets (`.lighthouserc.cjs`); fixed 3 a11y bugs (infobox `<dl>`, `--color-text-muted` contrast, footer link underline).
- T5.4: `netlify.toml` build config; CI triggers on `feat/**` and `fix/**` branches.

---

## [2.0.0] — branch 1.2

### Rewrite: Vanilla JS → Vite + React 18 + TypeScript 5

Complete rewrite of the client from scratch.

**Framework**
- Vite 5, React 18, TypeScript 5, React Router v6
- react-leaflet 4 replacing direct Leaflet DOM manipulation
- Vitest unit test suite (25 tests)

**Bug fixes (from REDESIGN_PROMPT.md)**
- LocationMap on shrine detail pages replaced Google Maps iframe with Leaflet embed — no longer stuck on "Loading map…"
- Map markers and list items now fly to and zoom in on selection (`flyTo`, zoom ≥ 13)
- Main map tile loading fixed (CARTO Voyager, no API key needed; `invalidateSize` via ResizeObserver)
- Sidebar no longer full-screen on desktop; reactive mobile layout with backdrop and close button
- Light theme is the default on first load (no dark-mode flash)

**Aesthetic overhaul (from REDESIGN_PROMPT.md)**
- Heritage-editorial design language with CSS design tokens
- Refined search, filter chips, shrine list, welcome card, and preview card
- Shrine detail page: hero image, sticky infobox, article sections, location mini-map
- Custom shrine dot markers with glow on selection and pulse ring
- Leaflet zoom/layer controls themed to match the design system
- Full Urdu/RTL and dark mode support throughout

---

## [1.x] — Vanilla JS app (archived in `legacy/`)

Original hand-written vanilla JavaScript app using Leaflet.js loaded from CDN, Google Sheets CSV via PapaParse, `app.js` / `shrine.js` / `shrine.html` / `style.css`. Translations pre-built via LibreTranslate and committed as `translations.js`.
