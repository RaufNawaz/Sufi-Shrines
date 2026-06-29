# Changelog

## [Unreleased] — chore/p0-stabilize

### Changed
- Archived legacy vanilla-JS files to `legacy/` (preserved via `git mv`)
- Rewrote `HANDOFF.md` and `README.md` to document the React app
- Fixed all ESLint errors and warnings (6 errors + 2 false-positive warnings)
- Added bundled data snapshot (`src/data/shrines-fallback.json`) as final offline fallback
- Added `scripts/snapshot-data.mjs` and `npm run data:snapshot`
- Added schema validation with `console.warn` in dev for invalid shrine rows
- Added `.github/workflows/ci.yml` (typecheck + lint + test + build on PRs and main)
- Generated missing PWA icons (`pwa-192x192.png`, `pwa-512x512.png`, `apple-touch-icon.png`)

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
