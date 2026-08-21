# Sufi Shrines of Pakistan

An interactive, bilingual (English / Urdu) map and citable open dataset of **169 sacred
sites across Pakistan** — Muslim Sufi shrines, Hindu temples, Sikh gurdwaras,
Nanakpanthi/Udasi darbars, Jain temples and secular memorials — built for Harvard research.
Browse shrine histories, architecture, rituals, guided pilgrimage tours, a saints/orders
knowledge graph, an ʿurs almanac, and visitor information.

The archive's distinguishing claim is not coverage but **honesty about provenance**: every
entry says how it was established, and [what the archive does not
know](https://raufnawaz.github.io/Sufi-Shrines/coverage) is published alongside what it does.

**Live site:** <https://raufnawaz.github.io/Sufi-Shrines/> · [About &
licence](https://raufnawaz.github.io/Sufi-Shrines/about) · [What this archive
knows](https://raufnawaz.github.io/Sufi-Shrines/coverage)
**Stack:** Vite 5 + React 18 + TypeScript 5 + Leaflet + react-leaflet + MapLibre GL

---

## Features

- Interactive Leaflet map with shrine markers and a founding-era time slider
- Sidebar search (MiniSearch web worker), category/region/saint filters, shrine list, preview cards
- Full shrine detail pages: article sections, infobox, gallery with photo credits, related shrines, embedded mini-map
- 8 guided pilgrimage tours with routes, audio narration, and shareable progress
- Saints/orders knowledge graph: lineage views, network graph, standalone explorer at `/graph`
- The ʿurs almanac at `/almanac`: when the gatherings fall, computed from each entry's recorded dates, with the Hijri reading shown alongside
- `/coverage`: the archive's own limits, computed from the shipped data on every load rather than asserted in a document
- `/place/:slug`: 29 places as readable subjects — which sites stand there, which traditions, and the span of the dates the archive can read (35 of the 169 sites are in or around Lahore, and five of the six traditions stand within a few streets of one another there)
- `/about`: licence, copy-able citations for the archive and for a single entry, and how to report a correction
- Shared ground: where a site stands within 800 m of one from another tradition, shown on the shrine page
- Bilingual: English and Urdu (RTL layout, Nastaliq type, Eastern numerals), zero runtime translation API calls — and the Urdu edition is held to the same bar as the English one, enforced by e2e guards over visible text _and_ accessible names
- Dark mode / light mode toggle
- PWA: installable, offline-capable via service worker
- Data from a public Google Sheet; committed fallback so the site works offline

---

## Quick Start

Requires Node 20+ (`.nvmrc`).

```bash
npm ci
npm run dev      # http://localhost:5173
```

The Python research tooling (OCR, translation drafts, enrichment) lives in `tools/` —
`pip install -r requirements.txt`, then see `docs/BOOK_OCR_WORKFLOW.md` (Windows) or
`docs/BOOK_OCR_WORKFLOW_MAC.md` (macOS).

### Key commands

| Command                   | What it does                                                                                                           |
| ------------------------- | ---------------------------------------------------------------------------------------------------------------------- |
| `npm run dev`             | Vite dev server with HMR                                                                                               |
| `npm run build`           | Type-check + Vite build + SSG prerender → `dist/`                                                                      |
| `npm run verify`          | Typecheck + lint + **format:check** + unit tests + data gates — deliberately a superset of CI; run before every commit |
| `npm run test`            | Vitest unit tests                                                                                                      |
| `npm run e2e`             | Playwright E2E (build first with `npm run build:e2e`)                                                                  |
| `npm run format`          | Prettier write (`format:check` in CI)                                                                                  |
| `npm run data:build`      | Fetch sheet CSV → `data/shrines.json` + CSV mirror + app snapshot                                                      |
| `npm run data:validate`   | Schema, tours, Urdu-parity (`--check`), and no-leak gates                                                              |
| `npm run data:build:urdu` | Regenerate the Urdu seed files                                                                                         |
| `npm run data:export`     | Knowledge graph + JSON-LD + RDF exports                                                                                |
| `npm run data:release`    | Validated, citable release bundle → `dist-data/`                                                                       |
| `npm run storybook`       | Component catalogue                                                                                                    |

Architecture, i18n rules, and working conventions live in [`CLAUDE.md`](CLAUDE.md).
All documentation is indexed in [`docs/README.md`](docs/README.md).

---

## Data & Citation

All shrine content lives in a Google Sheet (URL in `data/csv-source.json`). The browser
fetches the published CSV at runtime; a committed snapshot (`src/data/shrines-fallback.json`)
ensures the site renders even without network access.

To refresh the canonical dataset and snapshot:

```bash
npm run data:build
git add data/ src/data/shrines-fallback.json && git commit -m "data: refresh dataset"
```

The dataset (169 rows) ships as a schema-validated Frictionless Data Package with
field-level provenance — see `docs/DATA_DICTIONARY.md` for the column reference and
`docs/DATA_RELEASE.md` for producing a DOI-ready release (Zenodo / Harvard Dataverse).
Cite via [`CITATION.cff`](CITATION.cff). Data is licensed
[ODbL-1.0](https://opendatacommons.org/licenses/odbl/1-0/); code is MIT.

See `docs/HANDOFF.md` for maintainer documentation including data-update workflow,
deploy instructions, and the OCR pipeline for Urdu book processing.

---

## Repository Layout

| Path                                      | Purpose                                                                       |
| ----------------------------------------- | ----------------------------------------------------------------------------- |
| `src/`                                    | React app (pages, components, lib, styles)                                    |
| `public/`                                 | Static assets served as-is (PWA icons, fonts)                                 |
| `data/`                                   | Canonical research dataset: KG, schema, provenance, exports                   |
| `scripts/`                                | Node build/data scripts (`data:*` npm commands, prerender, icons)             |
| `tools/`                                  | Python research pipeline: OCR, post-correction, MT, extraction, enrichment    |
| `urdu-i18n/`                              | Urdu dictionary + article content source of truth                             |
| `eval/`                                   | Evaluation harnesses (OCR CER/WER)                                            |
| `docs/`                                   | Reference docs, OCR guides, and `docs/planning/` (roadmaps, runbooks)         |
| `e2e/`                                    | Playwright tests                                                              |
| `google-apps-script/`                     | Sheets-side script for the book-processing pipeline                           |
| `legacy/`                                 | Pre-rewrite vanilla-JS site, kept for reference (not built)                   |
| `books/`, `out/`, `chunks/`, `summaries/` | Local research data (gitignored): source PDFs, OCR output, pipeline artifacts |

---

## Deploying

GitHub Pages is the deploy target: `.github/workflows/deploy-pages.yml` builds and
publishes `dist/` (the Vite `base` path is set for Pages). CI
(`.github/workflows/ci.yml`) runs typecheck, lint, tests, data validation, build,
Storybook, format:check, E2E + axe, and Lighthouse on every push and PR.

**GitHub Pages serves files, not routes.** Every route gets a prerendered `index.html`
(`scripts/prerender.mjs`), and `dist/404.html` is the app shell so an unknown path still boots
the router. `scripts/check-routes-prerendered.mjs` fails the build if a route declared in
`App.tsx` has no file — four of them once had none, and returned GitHub's own 404 to anyone
following a shared link. Note that `public/_redirects` is Netlify syntax and does nothing here;
its header says so.

---

## License

Code: MIT (`LICENSE`). Data: ODbL-1.0 (`LICENSE-data.md`). All dependencies are MIT,
BSD, Apache-2.0, ISC, MPL, or SIL OFL licensed. No proprietary SDKs or paid runtime APIs.
