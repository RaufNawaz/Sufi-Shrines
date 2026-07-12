# Sufi Shrines of Pakistan — Handoff Document

A bilingual interactive map and open dataset of 163 sacred sites (Muslim shrines, Hindu
temples, Sikh gurdwaras) across Pakistan. This document is for anyone taking over or
contributing to the project. Quick start, key commands, and repository layout are in the
root `README.md`; working conventions and i18n rules are in `CLAUDE.md`. This file
covers the operational detail that doesn't fit there.

---

## Project Overview

The site is a **static, read-only web application** that displays sacred-site locations
on an interactive map. Visitors can browse site details — history, architecture, gallery,
location, related shrines, guided tours — in English or Urdu.

All shrine data lives in a **Google Sheet**, published as a CSV fetched at runtime. No
server is required; the site deploys from the `dist/` folder to GitHub Pages.

The live app is built with **Vite 5 + React 18 + TypeScript 5**. Legacy vanilla-JS files
are archived under `legacy/` for reference only.

---

## All scripts

| Command                                                  | What it does                                                                                  |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `npm run dev`                                            | Vite dev server with HMR                                                                      |
| `npm run build`                                          | Type-check + Vite production build → `dist/` + SSG prerender                                  |
| `npm run build:e2e`                                      | Same build with root base path (`/`) — required before `e2e`                                  |
| `npm run preview`                                        | Serve the `dist/` build locally                                                               |
| `npm run verify`                                         | `typecheck` + `lint` + `test` — run before every commit                                       |
| `npm run typecheck`                                      | TypeScript check only (app + node + e2e configs)                                              |
| `npm run lint`                                           | ESLint with `--max-warnings 0`                                                                |
| `npm run format` / `format:check`                        | Prettier write / check                                                                        |
| `npm run test` / `test:watch`                            | Vitest (once / watch mode)                                                                    |
| `npm run e2e` / `e2e:report`                             | Playwright E2E (serves `dist/` via preview) / open report                                     |
| `npm run lighthouse`                                     | Lighthouse CI budgets                                                                         |
| `npm run data:build`                                     | Fetch live CSV → `data/shrines.json`, `data/shrines.csv`, `src/data/shrines-fallback.json`    |
| `npm run data:snapshot`                                  | Alias of `data:build`                                                                         |
| `npm run data:validate`                                  | Schema + tours + Urdu-parity (`--check`) + no-English-leak gates                              |
| `npm run data:validate:tours` / `:images` / `:urdu-leak` | Individual validators                                                                         |
| `npm run data:build:urdu`                                | Regenerate Urdu seed files (`urdu-i18n/build_dictionary.py`)                                  |
| `npm run urdu:build`                                     | Full Urdu pipeline (`urdu-i18n/build-all.sh`: dictionary → seed sync → article content → log) |
| `npm run data:kg` / `data:export`                        | Knowledge graph build / JSON-LD + RDF exports                                                 |
| `npm run data:release`                                   | Citable release bundle → `dist-data/` (see `DATA_RELEASE.md`)                                 |
| `npm run storybook` / `build-storybook`                  | Component catalogue                                                                           |

---

## Architecture

| Layer       | Technology                         | Notes                                                                                                                     |
| ----------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Build       | Vite 5                             | TypeScript compile + bundle + SSG prerender                                                                               |
| Framework   | React 18                           | Functional components + hooks throughout                                                                                  |
| Routing     | React Router v6                    | `/` map · `/shrine/:slug` detail · `/saint/:slug`, `/order/:slug` KG pages · `/graph` explorer                            |
| Map         | Leaflet 1.9 / react-leaflet 4      | CARTO Voyager tiles (free, no key); individual styled markers                                                             |
| Data        | Google Sheets CSV                  | Published CSV; canonical URL in `data/csv-source.json` (scripts/tools) and `CSV_URL` in `src/lib/data/constants.ts` (app) |
| CSV parsing | PapaParse 5                        | Runs in the browser                                                                                                       |
| Search      | MiniSearch Web Worker              | Fuzzy full-text search in background thread                                                                               |
| i18n        | Custom context + hook              | English/Urdu, RTL layout, no runtime API calls                                                                            |
| Fonts       | Google Fonts (Latin) + self-hosted | Merriweather, Source Sans 3; Noto Nastaliq Urdu served from `public/fonts/`                                               |
| PWA         | vite-plugin-pwa                    | Service worker, offline fallback (`public/offline.html`), update toast                                                    |
| Telemetry   | web-vitals                         | CWV reported in dev console; beaconed via `VITE_BEACON_URL` in prod                                                       |
| Unit tests  | Vitest                             | `src/**/__tests__`, `npm run test`                                                                                        |
| E2E tests   | Playwright                         | `e2e/` — map, shrine, tours, Urdu no-leak, a11y, persistence                                                              |
| A11y        | axe-core / Lighthouse CI           | 0 critical violations; budgets in `.lighthouserc.cjs`                                                                     |
| CI          | GitHub Actions                     | `.github/workflows/ci.yml` — typecheck + lint + test + data validation + build + e2e                                      |
| Hosting     | GitHub Pages                       | `.github/workflows/deploy-pages.yml` builds and publishes `dist/`                                                         |

### Data flow

```
Google Sheet → published CSV URL
  (app: CSV_URL in src/lib/data/constants.ts, overridable via VITE_CSV_URL;
   scripts/tools read the same URL from data/csv-source.json)
  → useShrineData hook: network fetch → localStorage cache (1h TTL)
                                      → bundled src/data/shrines-fallback.json
  → shrineModel.ts: parse CSV rows → Shrine objects (invalid rows skipped)
  → MapPage: Leaflet map + sidebar        → ShrinePage: detail article
```

The production **build does not fetch live data** — `shrines-fallback.json` is a
committed snapshot, synced by `npm run data:build` (`scripts/data/build-dataset.mjs`)
alongside the canonical `data/shrines.json`. Refresh it before major releases.

---

## Updating Shrine Data

All content changes happen in the **Google Sheet** — never edit `shrines-fallback.json`
or `data/shrines.json` by hand.

1. Open the Google Sheet (URL in `data/csv-source.json`).
2. Edit rows directly.
3. The published CSV updates automatically within a few minutes.
4. Refresh the live site to see the changes.
5. Before a release, run `npm run data:build` + `npm run data:validate` and commit the
   updated dataset + snapshot.

### Supported column names

The current sheet columns (see `scripts/data/schema.mjs` and `DATA_DICTIONARY.md`):

| Column                                                                                              | Required    | Purpose                                                                         |
| --------------------------------------------------------------------------------------------------- | ----------- | ------------------------------------------------------------------------------- |
| `Name`                                                                                              | Yes         | Site name (English)                                                             |
| `Latitude` / `Longitude`                                                                            | Yes         | Decimal degrees (Pakistan bounding box enforced)                                |
| `Slug`                                                                                              | Optional    | URL-safe ID for permalink stability (auto-generated otherwise)                  |
| `Category`                                                                                          | Recommended | `Muslim Shrine` / `Hindu Temple` / `Sikh Gurdwara`                              |
| `Location`                                                                                          | Recommended | City / district / province                                                      |
| `Founded/Opened`                                                                                    | Optional    | Year or period (drives the era time slider)                                     |
| `Sufi Saint`                                                                                        | Optional    | Associated saint (drives the saint filter + KG)                                 |
| `Image 1`, `Image 2`                                                                                | Optional    | Direct image URLs (http/https)                                                  |
| `Image 1 Credit`, `Image 2 Credit`                                                                  | Optional    | Photo credit line shown under non-Commons images                                |
| `Events`                                                                                            | Optional    | Annual urs, festivals, pilgrimage details                                       |
| `Description`                                                                                       | Optional    | Lead paragraph; supports `## Heading` sections inline                           |
| `Description Urdu`                                                                                  | Optional    | Urdu article text (in-repo overrides in `src/data/urdu-content.json` fill gaps) |
| `History`, `Architecture`, `Rituals`, `Saint Biography`, `Events & Urs`, `Visiting Info`, `Sources` | Optional    | Dedicated article-section columns (each also accepts an ` Urdu` variant)        |

Invalid rows (missing `Name`, non-numeric or out-of-range coordinates) are skipped and
`console.warn`'d in dev; `npm run data:validate` fails CI on schema violations.

---

## Language & Translation

The site supports English and Urdu without any runtime API calls.

**Priority order for Urdu text:**

1. Explicit Urdu column in the sheet (`Name Urdu`, `Description Urdu`, etc.)
2. In-repo Urdu content overrides (`src/data/urdu-content.json`, built from `urdu-i18n/content/`)
3. Dictionary lookup (`src/data/urdu-seed.json`, built from `urdu-i18n/urdu-dictionary.json`)
4. English text as final fallback (never character transliteration)

All 163 descriptions currently have Urdu text (AI-translated drafts pending human
review — tracked in `urdu-i18n/TRANSLATION_LOG.md`). See `urdu-i18n/README.md` for
regeneration and `CLAUDE.md` for the hard i18n rules.

---

## Deploying

GitHub Pages is the only deploy target. `.github/workflows/deploy-pages.yml` builds
(`npm run build`, with the Vite `base` set to `/Sufi-Shrines/` for Pages) and publishes
`dist/` — it triggers on pushes to the version branch it tracks (see the `branches:`
list in the workflow; update it when cutting a new version branch) or manually via
`workflow_dispatch`. No Netlify/Vercel configuration exists in the repo.

---

## Environment Variables

| Variable          | Default                                | Purpose                                                              |
| ----------------- | -------------------------------------- | -------------------------------------------------------------------- |
| `VITE_CSV_URL`    | `data/csv-source.json` value           | Override data source (e.g. staging sheet)                            |
| `VITE_BASE_PATH`  | `/Sufi-Shrines/` for production builds | Base path override; `build:e2e` sets `/`                             |
| `VITE_BEACON_URL` | _(unset)_                              | Endpoint for web-vitals and error beacons; omit to disable telemetry |

Variables prefixed `VITE_` are inlined at build time. Never put secrets in `VITE_*`
variables — they are publicly visible in the bundle.

---

## OCR & Translation Pipeline (Maintainer-Only)

For processing Urdu PDF books:

```bash
# Install Python dependencies
python3 -m pip install -r requirements.txt

# Test with a local PDF (OCR only by default; add --translate for an MT draft)
python3 tools/process_books.py --test-pdf "path/to/book.pdf" --max-pages 5

# Process all unfinished books in the sheet
export SHRINES_APPS_SCRIPT_URL="https://script.google.com/macros/s/DEPLOYMENT_ID/exec"
export SHRINES_APPS_SCRIPT_API_KEY="your-api-key"
python3 tools/process_books.py --write-sheet
```

Full setup: `BOOK_OCR_WORKFLOW.md` and `LOCAL_OCR_QUICKSTART.md` (Windows/PowerShell);
on macOS use `BOOK_OCR_WORKFLOW_MAC.md` and `LOCAL_OCR_QUICKSTART_MAC.md`. Dataset
enrichment (descriptions, new rows, images) has its own runbook:
`planning/ENRICHMENT_RUNBOOK.md`.

---

## Branch & PR Workflow

- Work on feature branches, open PRs against `main`.
- CI runs typecheck + lint + test + data validation + build + e2e on every PR
  (`.github/workflows/ci.yml`, triggered on `main`, `feat/**`, and `fix/**`).
- Enable branch protection on `main` in GitHub → Settings → Branches → Require status checks.

---

## Known Issues / Future Work

Roadmaps live in `planning/`: `PROJECT_VISION.md` (tracks), `TODO.md` (live backlog),
`EXECUTION_PLAN.md` (milestones), `TOURS_FUTURE_PLAN.md` (tour experience).

**Maintenance:**

- All 163 Urdu descriptions are machine-translated drafts pending human review
  (`urdu-i18n/TRANSLATION_LOG.md` tracks review status).
- `AFADA-E-KABIR.pdf` (258 MB) and `tessdata/` are git-ignored — consider Git LFS or
  external storage if the repo history is trimmed.
- `npm audit` reports vulnerabilities in dev dependencies (testing tools). These are not
  in the production bundle and are acceptable at current risk level.

---

## Contact & Context

This project is maintained as part of Harvard research on South Asian religious sites.
For questions about the data, contact the project team. For technical issues, open a
GitHub issue.
