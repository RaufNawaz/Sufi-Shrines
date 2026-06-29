# Sufi Shrines of Pakistan — Handoff Document

A bilingual interactive map of Sufi shrines across Pakistan. This document is for anyone taking over or contributing to the project.

---

## Project Overview

The site is a **static, read-only web application** that displays Sufi shrine locations on an interactive map. Visitors can browse shrine details — history, architecture, gallery, location, related shrines — in English or Urdu.

All shrine data lives in a **Google Sheet**, published as a CSV fetched at runtime. No server is required; the site deploys from the `dist/` folder to any static host.

The live app is built with **Vite 5 + React 18 + TypeScript 5**. Legacy vanilla-JS files are archived under `legacy/` for reference only.

---

## Quick Start

Requires Node 20+.

```powershell
npm install
npm run dev        # Dev server at http://localhost:5173
```

### All scripts

| Command | What it does |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | TypeScript type-check + Vite production build → `dist/` |
| `npm run preview` | Serve the `dist/` build locally |
| `npm run typecheck` | TypeScript check only (no emit) |
| `npm run lint` | ESLint with `--max-warnings 0` |
| `npm run test` | Vitest (runs once) |
| `npm run test:watch` | Vitest in watch mode |
| `npm run data:snapshot` | Fetch live CSV → write `src/data/shrines-fallback.json` |

---

## Architecture

| Layer | Technology | Notes |
|---|---|---|
| Build | Vite 5 | TypeScript compile + bundle |
| Framework | React 18 | Functional components + hooks throughout |
| Routing | React Router v6 | `/` = map, `/shrine/:slug` = detail, `/shrine.html` = legacy redirect |
| Map | Leaflet 1.9 / react-leaflet 4 | CARTO Voyager tiles (free, no key), Esri fallback |
| Data | Google Sheets CSV | Published CSV; no authentication |
| CSV parsing | PapaParse 5 | Runs in the browser |
| i18n | Custom context + hook | English/Urdu, RTL layout, no runtime API calls |
| Fonts | Google Fonts | Merriweather, Source Sans 3, Noto Nastaliq Urdu |
| PWA | vite-plugin-pwa | Service worker, offline shell, app icons |
| Testing | Vitest | Unit tests in `src/**/*.test.ts` |
| Hosting | Static `dist/` | Deploy to Netlify, Vercel, GitHub Pages, or any CDN |

### Data flow

```
Google Sheet → published CSV URL (VITE_CSV_URL or hardcoded fallback)
  → useShrineData hook: network fetch → localStorage cache (1h TTL)
                                      → bundled src/data/shrines-fallback.json
  → shrineModel.ts: parse CSV rows → Shrine objects (invalid rows skipped)
  → MapPage: Leaflet map + sidebar
  → ShrinePage: detail article
```

The production **build does not fetch live data** — `shrines-fallback.json` is a committed snapshot. Refresh it with `npm run data:snapshot` before major releases.

---

## Key Source Files

```
src/
  main.tsx                    Entry point; theme FOUC guard
  App.tsx                     Router + context providers
  pages/
    MapPage.tsx               Full-screen map + sidebar
    ShrinePage.tsx            Shrine detail article page
  components/
    map/
      ShrineMap.tsx           Leaflet MapContainer + MapController
      MapSidebar.tsx          Search, filter chips, list, preview card
    shrine/
      ShrineArticle.tsx       Wikipedia-style article sections
      ShrineInfobox.tsx       Sidebar facts table
      LocationMap.tsx         Embedded Leaflet mini-map on detail page
      RelatedShrines.tsx      Related shrine cards
      ShrineGallery.tsx       Image gallery
  hooks/
    useShrineData.ts          Data fetch + cache + snapshot fallback
    useMediaQuery.ts          Reactive window.matchMedia hook
  lib/
    data/
      constants.ts            CSV_URL, column configs, section defs
      shrineModel.ts          buildShrine / buildShrines parsers
      fieldAliasing.ts        Urdu field lookups
      articleParsing.ts       Heading-based article section parsing
    i18n/
      LanguageContext.tsx     Lang state, t(), localizeField()
      ThemeContext.tsx        Dark/light theme state
      uiStrings.ts            All UI strings in en + ur
      urduFallback.ts         Transliteration fallback
  data/
    shrines-fallback.json     Committed data snapshot (refresh via data:snapshot)
  styles/
    tokens.css                Design tokens (colors, spacing, type, shadows)
    global.css                Reset, body, Leaflet control theming
    map.css                   MapPage layout, sidebar, markers, chips
    shrine.css                ShrinePage layout, article, infobox
  types/
    shrine.ts                 Shrine, ShrineDataState, Lang, Theme types

scripts/
  snapshot-data.mjs           Fetches CSV and writes shrines-fallback.json
  generate-icons.mjs          Generates PWA icons from favicon.svg

legacy/                       Original vanilla-JS app (archived, not deployed)
```

---

## Updating Shrine Data

All content changes happen in the **Google Sheet** — never edit `shrines-fallback.json` by hand.

1. Open the Google Sheet (URL in `src/lib/data/constants.ts` as `CSV_URL`).
2. Edit rows directly.
3. The published CSV updates automatically within a few minutes.
4. Refresh the live site to see the changes.
5. Before a major release, run `npm run data:snapshot` and commit the updated snapshot.

### Supported column names

| Column | Required | Purpose |
|---|---|---|
| `Name` | Yes | Shrine name (English) |
| `Latitude` | Yes | Decimal degrees |
| `Longitude` | Yes | Decimal degrees |
| `Slug` | Recommended | URL-safe ID for permalink stability |
| `Category` | Recommended | Groups shrines in the sidebar list |
| `Location` | Recommended | City / district |
| `Founded` | Optional | Year or period |
| `Sufi Saint` | Optional | Associated saint |
| `Image Link` | Optional | Direct image URL |
| `Description` | Optional | Lead paragraph; supports `## Heading` sections inline |
| `History`, `Architecture`, `Rituals`, `Saint Biography`, `Events & Urs`, `Visiting Info`, `Sources` | Optional | Article section columns |
| `Gallery 1 Image`, `Gallery 1 Caption`, … | Optional | Image gallery |
| `Name Urdu`, `Description Urdu`, … | Optional | Urdu language variants (preferred over transliteration) |

Invalid rows (missing `Name`, non-numeric `Latitude`/`Longitude`) are skipped and `console.warn`'d in dev.

---

## Language & Translation

The site supports English and Urdu without any runtime API calls.

**Priority order for Urdu text:**
1. Explicit Urdu column in the sheet (`Name Urdu`, `Description Urdu`, etc.)
2. Word-by-word transliteration fallback (`src/lib/i18n/urduFallback.ts`)
3. English text as final fallback

To extend the translation dictionary, add `Name Urdu` / `Description Urdu` / etc. columns to the sheet.

---

## Deploying

```powershell
npm run build   # produces dist/
```

Deploy `dist/` to any static host:

**Netlify / Vercel:** Connect the Git repo. Set build command: `npm run build`, publish directory: `dist`. The `public/_redirects` file handles SPA routing on Netlify.

**GitHub Pages:** Push and enable Pages. You may need `base` in `vite.config.ts` if deploying to a sub-path.

**Custom server:** Upload `dist/` to any web host. Configure a catch-all to serve `index.html` for all routes.

---

## Environment Variables

| Variable | Default | Purpose |
|---|---|---|
| `VITE_CSV_URL` | Hardcoded Google Sheets URL | Override data source (e.g. staging sheet) |

Variables prefixed `VITE_` are inlined at build time. Never put secrets in `VITE_*` variables.

---

## OCR & Translation Pipeline (Maintainer-Only)

For processing Urdu PDF books:

```powershell
# Install Python dependencies
py -3 -m pip install gradio_client

# Test with a local PDF
py -3 process_books.py --test-pdf "path/to/book.pdf" --max-pages 5

# Process all unfinished books in the sheet
$env:SHRINES_APPS_SCRIPT_URL = "https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
$env:SHRINES_APPS_SCRIPT_API_KEY = "your-api-key"
py -3 process_books.py
```

Full setup: `BOOK_OCR_WORKFLOW.md` and `LOCAL_OCR_QUICKSTART.md`.

---

## Branch & PR Workflow

- Work on feature branches, open PRs against `main`.
- CI runs `typecheck` + `lint` + `test` + `build` on every PR (`.github/workflows/ci.yml`).
- Enable branch protection on `main` in GitHub → Settings → Branches → Require status checks.

---

## Known Issues / Future Work

See `REDESIGN_FOLLOWUP.md` for the next UX improvements backlog.

- `AFADA-E-KABIR.pdf` (258 MB) and `tessdata/` are git-ignored but may be in earlier history — consider Git LFS or external storage if the repo history is trimmed.
- Stale branches `1.1` and `1.2` can be deleted once `chore/p0-stabilize` is merged to `main`.

---

## Contact & Context

This project is maintained as part of Harvard research on South Asian religious sites. For questions about the data, contact the project team. For technical issues, open a GitHub issue.
