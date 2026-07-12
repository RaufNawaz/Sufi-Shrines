# CLAUDE.md — working guide for the Sufi Shrines project

Guidance for Claude Code (and any AI agent) working in this repo. Read this first.

## What this is

An interactive, bilingual (English/Urdu) map and digital archive of **163 shrines,
temples, and gurdwaras across Pakistan** — Muslim Sufi shrines, Hindu temples, and Sikh
gurdwaras — with histories, architecture, rituals, visiting info, guided pilgrimage
tours, a saints/orders knowledge graph, and provenance‑tracked sources drawn from OCR'd
primary texts. It aims to be both a **public heritage experience** and a **citable
scholarly dataset**.

Mission bar: accurate, well‑sourced, respectful of three living religious traditions, and
**equally excellent in Urdu and English**.

## Stack

React 18 + TypeScript + Vite · React Router · Leaflet/react‑leaflet · MiniSearch (web
worker) · PWA (vite‑plugin‑pwa) · Vitest + Testing Library · Playwright (e2e) · Storybook
· axe (a11y) · Lighthouse CI. Data tooling in Python (`tools/`, OCR via Tesseract
`urd`/`fas`, translation drafts via NLLB/LibreTranslate). Data exported as JSON‑LD/RDF
with a datapackage, `CITATION.cff`, and `codemeta.json`.

## Commands

```
npm run dev            # local dev server
npm run build          # tsc + vite build + scripts/prerender.mjs
npm run verify         # typecheck + lint + unit tests  ← run before every commit
npm run test           # vitest run
npm run e2e            # playwright (build first with npm run build:e2e — root base path)
npm run lint / typecheck
npm run format         # prettier --write (format:check in CI)
npm run data:build     # fetch sheet CSV → data/shrines.json + csv + app snapshot
npm run data:build:urdu # regenerate Urdu seed files (build_dictionary.py)
npm run data:validate  # dataset + tours + Urdu-parity (--check) + no-leak gates
npm run data:export    # KG + JSON-LD + RDF
npm run urdu:build     # full Urdu pipeline (urdu-i18n/build-all.sh, 4 steps)
npm run storybook
```

## Architecture (where things live)

- `src/pages/` — routes: `MapPage`, `ShrinePage`, `SaintPage`, `OrderPage`, `NotFoundPage`.
- `src/components/map/` — `ShrineMap`, `MapSidebar` (browser + filters, with
  `WelcomeCard`/`ShrinePreview`), `ShrineMarkers`, `TimeSlider` (era filter),
  `TourPanel`/`TourList`/`TourPreview`/`TourRoute` (guided tours).
- `src/components/shrine/` — `ShrineArticle`, `ShrineInfobox`, `ContentsNav` (ToC),
  `RelatedShrines`, `ShrineGallery`, `LocationMap`, `SourcesProvenance`, `useArticleContent`.
- `src/components/kg/` — `LineageView`, `NetworkGraph` (saints/orders graph).
- `src/lib/i18n/` — `LanguageContext`, `uiStrings`, `numerals`, `urduFallback`,
  `localizeShrineName`. **All user‑facing strings and localization flow through here.**
- `src/lib/data/` — `articleParsing`, `fieldAliasing`, `era`, `categoryKey`, `constants`,
  `shrineModel`, `slugify`, `fieldLabels`.
- `src/lib/tours/` — tour model, geo/distance, progress, audio (TTS), autoplay.
- `src/data/` — `tours.json` (8 tours), `urdu-seed.json` + `urdu-content.json` (from
  `urdu-i18n/`), fallback shrine data.
- `urdu-i18n/` — **Urdu dictionary + article content source of truth** (see below).
- `scripts/` — data build/validate/export, prerender, icons.
- `docs/` — index at `docs/README.md`; data dictionary, KG vocabulary, OCR workflow,
  data release, handoff; planning docs under `docs/planning/`.

## Data model & source of truth

- Live shrine data is fetched at runtime from a **Google Sheets CSV** (URL defined once
  in `data/csv-source.json`; `CSV_URL` in `src/lib/data/constants.ts` for the app); a
  local JSON acts as offline fallback. Columns today:
  `Name, Location, Category, Latitude, Longitude, Founded/Opened, Sufi Saint, Image 1,
Image 1 Credit, Image 2, Image 2 Credit, Events, Description, Description Urdu`
  (the credit and Urdu columns are optional — see `scripts/data/schema.mjs`).
- Category is one of: `Muslim Shrine`, `Hindu Temple`, `Sikh Gurdwara`.
- Article sections can be authored **inline** inside `Description` (markdown‑ish headings)
  or in **dedicated columns** (`History`, `Architecture`, `Rituals`, `Saint Biography`,
  `Events & Urs`, `Visiting Info`, `Sources`) — see `ARTICLE_SECTION_DEFINITIONS` in
  `src/lib/data/constants.ts` and parsing in `src/lib/data/articleParsing.ts`.
- **Provenance matters.** Sources come from OCR'd primary texts under `out/ocr/` and
  `shrine_entries/`. Keep claims sourced; machine translations are drafts until reviewed
  (`tools/translate.py` tags `reviewed=false`). Don't invent facts or citations.

## Internationalization — READ BEFORE TOUCHING URDU

The Urdu experience must be **as complete and native‑feeling as English**. The full plan
is in `docs/planning/URDU_IMPLEMENTATION_PLAN.md`; the current push is tracked in `docs/planning/PROJECT_VISION.md`
(Track 0). Hard rules:

1. **UI strings** live in `src/lib/i18n/uiStrings.ts` (`UI_TEXT.en`/`.ur`, `t()`,
   `tFn()`). Do **not** add inline `lang === 'ur' ? '…' : '…'` in components — add a key.
   (An ESLint rule should block new ones.)
2. **Data translations** (names, saints, places, categories, facets, dates) live in
   `urdu-i18n/` and are wired via `src/data/urdu-seed.json` → the cache in
   `src/lib/i18n/urduFallback.ts`. Regenerate with `npm run data:build:urdu` (or the full
   pipeline `npm run urdu:build`); `npm run data:validate` runs the same script in
   `--check` mode (no writes).
3. **Never render character‑by‑character transliteration.** Unknown Latin input returns
   the original string (+ a DEV warning). The old `CHAR_URDU_MAP` path must stay removed.
4. **Nastaliq everywhere.** `--font-urdu` must apply to all elements including
   buttons/inputs/chips in `[dir='rtl']`.
5. **Numerals:** Eastern (۰–۹) by default in Urdu with a persisted toggle. Use
   `fmtNum()` from `LanguageContext` at **every** number render site. **Coordinates stay
   Western.** (`toEasternDigits`/`localizeDigits` in `src/lib/i18n/numerals.ts`.)
6. **RTL/bidi:** logical CSS properties (`inset-inline-*`, `margin-inline-*`,
   `text-align: start`), `<bdi>` around mixed Latin/number runs, locale‑aware
   `localeCompare(…, 'ur')`.

Urdu parity has been reached: all 163 descriptions have Urdu text (AI‑translated, pending
human review), `fmtNum()` is applied at every number site, and a generic heading‑label map
covers inline headings — see `docs/planning/URDU_IMPLEMENTATION_PLAN.md` for the history.

## Coding conventions

- TypeScript strict; keep `npm run verify` green. No new lint warnings (`--max-warnings 0`).
- Components are functional + hooks; prefer existing patterns (see `TRADITION_LABELS` in
  `src/lib/tours/tours.ts` as the model for enum label maps).
- Accessibility is a requirement, not a nice‑to‑have (axe + Storybook a11y). 44px targets,
  correct `lang`/`dir`, focus states.
- Respect provenance and the three traditions in copy, imagery, and terminology
  (honorifics per `data/glossary.csv`).
- Tests: unit for logic (`src/**/__tests__`), Playwright for journeys. The
  **"no‑English‑leak"** guard for `?lang=ur` (`e2e/urdu.spec.ts` — fails on `[A-Za-z]`
  under `[dir='rtl']` except URLs/coordinates/`<bdi>`) must stay green.

## Definition of done (for any Urdu/i18n change)

`npm run verify` + `npm run e2e` green (incl. the no‑leak guard); ESLint blocks new inline
ternaries; Nastaliq on all controls; Eastern numerals reach every number site; no English
or transliteration in the Urdu view outside URLs/coordinates.

## Pointers

- `docs/README.md` — index of all reference and planning docs.
- `docs/planning/URDU_IMPLEMENTATION_PLAN.md` — full phased Urdu plan.
- `urdu-i18n/README.md` — dictionary files, coverage, regeneration.
- `docs/planning/PROJECT_VISION.md` — blue‑sky roadmap (Track 0 = finish Urdu; Tracks 1–8 = the future).
