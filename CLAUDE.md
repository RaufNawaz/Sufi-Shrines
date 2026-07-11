# CLAUDE.md — working guide for the Sufi Shrines project

Guidance for Claude Code (and any AI agent) working in this repo. Read this first.

## What this is

An interactive, bilingual (English/Urdu) map and digital archive of **143 shrines,
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
npm run e2e            # playwright
npm run lint / typecheck
npm run data:build     # build dataset from source
npm run data:validate  # validate dataset + tours   ← extend with the Urdu-parity check
npm run data:export    # KG + JSON-LD + RDF
npm run storybook
```

## Architecture (where things live)

- `src/pages/` — routes: `MapPage`, `ShrinePage`, `SaintPage`, `OrderPage`, `NotFoundPage`.
- `src/components/map/` — `ShrineMap`, `MapSidebar` (browser + filters), `ShrineMarkers`,
  `TimeSlider` (era filter), `TourPanel`/`TourList`/`TourRoute` (guided tours).
- `src/components/shrine/` — `ShrineArticle`, `ShrineInfobox`, `ContentsNav` (ToC),
  `RelatedShrines`, `ShrineGallery`, `LocationMap`, `SourcesProvenance`, `useArticleContent`.
- `src/components/kg/` — `LineageView`, `NetworkGraph` (saints/orders graph).
- `src/lib/i18n/` — `LanguageContext`, `uiStrings`, `numerals`, `urduFallback`,
  `localizeShrineName`. **All user‑facing strings and localization flow through here.**
- `src/lib/data/` — `articleParsing`, `fieldAliasing`, `era`, `categoryKey`, `constants`,
  `shrineModel`, `slugify`, `fieldLabels`.
- `src/lib/tours/` — tour model, geo/distance, progress, audio (TTS), autoplay.
- `src/data/` — `tours.json`, `urdu-seed.json` (from `urdu-i18n/`), fallback shrine data.
- `urdu-i18n/` — **Urdu dictionary source of truth** (see below).
- `scripts/` — data build/validate/export, prerender, snapshot.
- `docs/` — data dictionary, KG vocabulary, OCR workflow, data release.

## Data model & source of truth

- Live shrine data is fetched at runtime from a **Google Sheets CSV** (`CSV_URL` in
  `src/lib/data/constants.ts`); a local JSON acts as offline fallback. Columns today:
  `Name, Location, Category, Latitude, Longitude, Founded/Opened, Sufi Saint, Image 1,
  Image 2, Events, Description` (11 columns, **no Urdu columns** — see i18n rules).
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
is in `URDU_IMPLEMENTATION_PLAN.md`; the current push is tracked in `PROJECT_VISION.md`
(Track 0). Hard rules:

1. **UI strings** live in `src/lib/i18n/uiStrings.ts` (`UI_TEXT.en`/`.ur`, `t()`,
   `tFn()`). Do **not** add inline `lang === 'ur' ? '…' : '…'` in components — add a key.
   (An ESLint rule should block new ones.)
2. **Data translations** (names, saints, places, categories, facets, dates) live in
   `urdu-i18n/` and are wired via `src/data/urdu-seed.json` → the cache in
   `src/lib/i18n/urduFallback.ts`. Regenerate with `python3 urdu-i18n/build_dictionary.py`.
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

### Known Urdu gaps (as of the latest screenshots)

- **Article body + section headings + Table of Contents are still English** because there
  is no `Description Urdu` (and per‑section `*_ur`) content, so `useArticleContent`
  (`src/components/shrine/useArticleContent.ts`) falls back to English and inline headings
  render raw. Only the app‑generated "گیلری" (Gallery) is localized. → Add Urdu
  description/section content (with Urdu headings) and a generic heading‑label map.
- **`fmtNum()` not applied** in `ShrineInfobox.tsx` (founded year `1539`),
  `ContentsNav.tsx` (`{i + 1}.` numbering), `RelatedShrines`/`TourPanel` distances
  (`71 کلومیٹر`), and `era.ts` century labels → Eastern digits don't reach these sites.

## Coding conventions

- TypeScript strict; keep `npm run verify` green. No new lint warnings (`--max-warnings 0`).
- Components are functional + hooks; prefer existing patterns (see `TRADITION_LABELS` in
  `src/lib/tours/tours.ts` as the model for enum label maps).
- Accessibility is a requirement, not a nice‑to‑have (axe + Storybook a11y). 44px targets,
  correct `lang`/`dir`, focus states.
- Respect provenance and the three traditions in copy, imagery, and terminology
  (honorifics per `data/glossary.csv`).
- Tests: unit for logic (`src/**/__tests__`), Playwright for journeys. Add a
  **"no‑English‑leak"** guard for `?lang=ur` (fail on `[A-Za-z]` under `[dir='rtl']`
  except URLs/coordinates/`<bdi>`).

## Definition of done (for any Urdu/i18n change)

`npm run verify` + `npm run e2e` green (incl. the no‑leak guard); ESLint blocks new inline
ternaries; Nastaliq on all controls; Eastern numerals reach every number site; no English
or transliteration in the Urdu view outside URLs/coordinates.

## Pointers

- `URDU_IMPLEMENTATION_PLAN.md` — full phased Urdu plan.
- `urdu-i18n/README.md` — dictionary files, coverage, regeneration.
- `PROJECT_VISION.md` — blue‑sky roadmap (Track 0 = finish Urdu; Tracks 1–8 = the future).
- `CLAUDE_CODE_PROMPT.md` — ready‑to‑run kickoff prompt.
