# Sufi Shrines of Pakistan

An interactive, bilingual (English / Urdu) map and citable open dataset of **163 sacred
sites across Pakistan** — Muslim Sufi shrines, Hindu temples, and Sikh gurdwaras — built
for Harvard research. Browse shrine histories, architecture, rituals, guided pilgrimage
tours, a saints/orders knowledge graph, and visitor information.

**Live site:** GitHub Pages (deployed via `.github/workflows/deploy-pages.yml`)
**Stack:** Vite 5 + React 18 + TypeScript 5 + Leaflet + react-leaflet

---

## Features

- Interactive Leaflet map with shrine markers and a founding-era time slider
- Sidebar search (MiniSearch web worker), category/region/saint filters, shrine list, preview cards
- Full shrine detail pages: article sections, infobox, gallery with photo credits, related shrines, embedded mini-map
- 8 guided pilgrimage tours with routes, audio narration, and shareable progress
- Saints/orders knowledge graph: lineage views, network graph, standalone explorer at `/graph`
- Bilingual: English and Urdu (RTL layout, Nastaliq type, Eastern numerals), zero runtime translation API calls
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

| Command                   | What it does                                                      |
| ------------------------- | ----------------------------------------------------------------- |
| `npm run dev`             | Vite dev server with HMR                                          |
| `npm run build`           | Type-check + Vite build + SSG prerender → `dist/`                 |
| `npm run verify`          | Typecheck + lint + unit tests — run before every commit           |
| `npm run test`            | Vitest unit tests                                                 |
| `npm run e2e`             | Playwright E2E (build first with `npm run build:e2e`)             |
| `npm run format`          | Prettier write (`format:check` in CI)                             |
| `npm run data:build`      | Fetch sheet CSV → `data/shrines.json` + CSV mirror + app snapshot |
| `npm run data:validate`   | Schema, tours, Urdu-parity (`--check`), and no-leak gates         |
| `npm run data:build:urdu` | Regenerate the Urdu seed files                                    |
| `npm run data:export`     | Knowledge graph + JSON-LD + RDF exports                           |
| `npm run data:release`    | Validated, citable release bundle → `dist-data/`                  |
| `npm run storybook`       | Component catalogue                                               |

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

The dataset (163 rows) ships as a schema-validated Frictionless Data Package with
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
(`.github/workflows/ci.yml`) runs typecheck, lint, tests, data validation, build, and
E2E on every push and PR.

---

## License

Code: MIT (`LICENSE`). Data: ODbL-1.0 (`LICENSE-data.md`). All dependencies are MIT,
BSD, Apache-2.0, ISC, MPL, or SIL OFL licensed. No proprietary SDKs or paid runtime APIs.
