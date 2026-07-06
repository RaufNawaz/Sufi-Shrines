# Sufi Shrines of Pakistan

An interactive bilingual (English / Urdu) map of Sufi shrines across Pakistan, built for Harvard research. Browse shrine histories, architecture, rituals, and visitor information.

**Live site:** hosted on Netlify / GitHub Pages  
**Stack:** Vite 5 + React 18 + TypeScript 5 + Leaflet + react-leaflet

---

## Features

- Interactive Leaflet map with shrine markers
- Sidebar search, category filters, shrine list, and preview cards
- Full shrine detail pages: article sections, infobox, gallery, related shrines, embedded mini-map
- Bilingual: English and Urdu (RTL layout), zero runtime translation API calls
- Dark mode / light mode toggle
- PWA: installable, offline-capable via service worker
- Data from a public Google Sheet; committed fallback so the site works offline

---

## Quick Start

Requires Node 20+.

```bash
npm install
npm run dev      # http://localhost:5173
```

```bash
npm run build    # TypeScript check + Vite build → dist/
npm run test     # Vitest unit tests
npm run lint     # ESLint (0 warnings allowed)
npm run typecheck
```

---

## Data

All shrine content lives in a Google Sheet. The browser fetches a public CSV at runtime; a committed snapshot (`src/data/shrines-fallback.json`) ensures the site renders even without network access.

To refresh the snapshot:

```bash
npm run data:snapshot
git add src/data/shrines-fallback.json && git commit -m "chore: refresh data snapshot"
```

See `docs/HANDOFF.md` for full documentation including column reference, deploy instructions, and the OCR pipeline for Urdu book processing.

---

## Repository Layout

| Path | Purpose |
|---|---|
| `src/` | React app (pages, components, lib, styles) |
| `public/` | Static assets served as-is (PWA icons, redirects) |
| `data/` | Canonical research dataset: KG, schema, provenance, exports |
| `scripts/` | Node build/data scripts (`data:*` npm commands, prerender, icons) |
| `tools/` | Python research pipeline: OCR, post-correction, MT, extraction, summarization |
| `eval/` | Evaluation harnesses (OCR CER/WER) |
| `docs/` | Handoff, data dictionary, OCR workflow guides |
| `e2e/` | Playwright tests + visual snapshots |
| `google-apps-script/` | Sheets-side script for the book-processing pipeline |
| `legacy/` | Pre-rewrite vanilla-JS site, kept for reference (not built) |
| `books/`, `out/`, `chunks/`, `summaries/` | Local research data (gitignored): source PDFs, OCR output, pipeline artifacts |

---

## License

Open source. All dependencies are MIT, BSD, Apache-2.0, ISC, MPL, or SIL OFL licensed. No proprietary SDKs or paid runtime APIs.
