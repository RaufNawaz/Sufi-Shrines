# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- Guided pilgrimage tours, phases 1–5: routes on the map, richer stops (media,
  visiting info, distances), share/resume/embed, audio narration + autoplay
  slideshow, and discovery/on-site awareness. Five new tours (Multan, Uch Sharif,
  Nankana Sahib, Pashtun frontier, Karachi living temples) bring the total to 8.
- Photo credits: optional `Image 1 Credit` / `Image 2 Credit` sheet columns,
  rendered under gallery and hero images.
- Standalone knowledge-graph explorer at `/graph`.
- Urdu parity (phases 1–10): Nastaliq on every control, Eastern numerals with a
  persisted toggle (`fmtNum()` at every number site), seed dictionary wired in
  (no transliteration), consolidated `uiStrings.ts`, RTL/bidi polish, per-language
  SEO/hreflang, a Playwright `?lang=ur` no-English-leak guard, generic
  heading-label map, and in-repo Urdu content overrides (`src/data/urdu-content.json`).
- Data pipeline gates: `data:validate` now also runs the Urdu-parity check
  (`build_dictionary.py --check`) and a no-English-leak validator.
- GitHub Pages deployment: `.github/workflows/deploy-pages.yml` plus a correct
  Vite base path.
- Repo professionalization: `docs/README.md` documentation index, Prettier
  (`format` / `format:check`), `.nvmrc` (Node 20) + `engines >=20`, shared slug
  logic in `scripts/data/lib/slugs.mjs`, shared Python helpers in `tools/_lib.py`,
  `data/csv-source.json` as the single CSV-URL source, `AppErrorBoundary`, and
  `useDebounce` / `useDocumentTitle` / `useFocusHeadingOnMount` hooks.

### Changed

- Dataset grown to 163 sites; enrichment passes filled Founded/Opened, Events,
  images, and descriptions; all 163 Urdu descriptions completed (AI-translated,
  pending human review).
- Planning docs (`TODO`, `EXECUTION_PLAN`, `PROJECT_VISION`, `ENRICHMENT_RUNBOOK`,
  `URDU_IMPLEMENTATION_PLAN`, `TOURS_FUTURE_PLAN`) moved to `docs/planning/`.
- npm script `data:validate:urdu` renamed to `data:build:urdu`; validation now
  uses a pure `--check` mode (no writes).
- `MapSidebar` / `TourPanel` split into `WelcomeCard`, `ShrinePreview`,
  `TourList`, and `TourPreview` components.
- Noto Nastaliq Urdu is self-hosted instead of loaded from the Google Fonts CDN.
- E2E coverage rewritten for all 5 tour phases; brittle search-count assertion fixed.
- OCR pipeline: `pdftoppm` timeout handling for large books, auto-detection of
  two-page spreads.

### Removed

- `netlify.toml` — GitHub Pages is the only deploy target.
- `scripts/snapshot-data.mjs` — `data:snapshot` now aliases
  `scripts/data/build-dataset.mjs`.
- `tools/build_translation_cache.py`, the generated
  `urdu-i18n/shrine-translations.seed.js` artifact, `src/lib/data/dates.ts`, and
  `e2e/visual.spec.ts`.
- Unused dependencies: `eslint-plugin-react`, stray `playwright` package,
  `@vitest/coverage-v8`.

### Fixed

- GitHub Pages 404s from a missing base path.
- Real English leaks in the Urdu view found by end-to-end screenshot verification.
- Brittle `map.spec.ts` search assertion broken by the growing dataset.

## [2.1.0]

### Added

- T1.1: URL sync — `?selected=<slug>` with `pushState`/`popstate` for back/forward navigation.
- T1.3: Marker clustering — `leaflet.markercluster` with branded cluster bubbles (later removed in favour of individual markers).
- T1.4: Faceted filtering — Region and Sufi Saint filter chips alongside Category; active filters reflected in the URL (`?category=&region=&saint=`).
- T2.1: SSG prerender — `scripts/prerender.mjs` generates per-shrine HTML files post-build.
- T2.2: JSON-LD, Open Graph tags, `sitemap.xml`.
- T2.3: Stable slugs — no row-index suffix, collision detection, `scripts/backfill-slugs.mjs`.
- T2.5: Data integrity validator in CI.
- T3.1: Worker-based fuzzy search — MiniSearch Web Worker (`src/lib/search/`).
- T3.2: Copy-link share button on preview card and shrine detail page.
- T4.1: All ad-hoc inline styles moved to named CSS token classes.
- T5.1: Vitest component tests.
- T5.2: Playwright E2E tests (map flow, shrine detail, preference persistence).
- T5.3: axe-core a11y tests (0 critical/serious violations); Lighthouse CI budgets (`.lighthouserc.cjs`); fixed 3 a11y bugs (infobox `<dl>`, `--color-text-muted` contrast, footer link underline).
- T5.4: CI triggers on `feat/**` and `fix/**` branches (with a Netlify build config, since removed).
- T6.1: `ShrineImage` component — `loading="lazy"`, `decoding="async"`, category-gradient placeholder on missing/broken images.
- T6.2: Offline fallback — `public/offline.html` served by Workbox when network + cache both fail; `UpdateToast` "New version available" banner on SW updates.
- T6.3: `web-vitals` integration — CLS/FCP/INP/LCP/TTFB to console in dev, beaconed to `VITE_BEACON_URL` in production, along with unhandled JS errors and promise rejections.

### Changed

- `Shrine` type: added `region` field (province extracted from `Location` value).
- `MapSidebar` filter state lifted to `MapPage` and URL-synced.
- `useShrineData` cache key bumped so stale cached objects missing `region` are discarded.

## [2.0.0]

### Changed

- **Rewrite: vanilla JS → Vite 5 + React 18 + TypeScript 5**, React Router v6,
  react-leaflet 4 replacing direct Leaflet DOM manipulation, Vitest unit test suite.
- Heritage-editorial design language with CSS design tokens; refined search, filter
  chips, shrine list, welcome card, preview card; shrine detail page with hero image,
  sticky infobox, article sections, location mini-map; custom shrine dot markers with
  selection glow and pulse ring; themed Leaflet controls; full Urdu/RTL and dark mode
  support throughout.

### Fixed

- LocationMap on shrine detail pages replaced a Google Maps iframe stuck on
  "Loading map…" with a Leaflet embed.
- Map markers and list items fly to and zoom in on selection.
- Main map tile loading (CARTO Voyager, no API key; `invalidateSize` via ResizeObserver).
- Sidebar no longer full-screen on desktop; reactive mobile layout with backdrop and
  close button.
- Light theme is the default on first load (no dark-mode flash).

## [1.x]

Original hand-written vanilla JavaScript app (archived in `legacy/`) using Leaflet.js
from CDN, Google Sheets CSV via PapaParse, `app.js` / `shrine.js` / `shrine.html` /
`style.css`. Translations pre-built via LibreTranslate and committed as `translations.js`.
