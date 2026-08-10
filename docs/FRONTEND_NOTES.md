# FRONTEND_NOTES — how the front end reads and renders the sheet

Orientation notes written before the new-columns work (category / site_type / status /
info_level / …). File references are to the state of the code at the time of writing.

## 1. How the sheet is fetched

- The published Google Sheets CSV URL lives in `src/lib/data/constants.ts` (`CSV_URL`,
  overridable via `VITE_CSV_URL`). The same URL is recorded in `data/csv-source.json`
  for the Python/data tooling.
- `src/hooks/useShrineData.ts` is the single runtime entry point. It parses the CSV with
  PapaParse (`header: true`, so **column names become row keys verbatim** after
  `normalizeRow()` trims them), then builds domain objects via
  `buildShrines()`. Load order: module-level shared result → `localStorage` cache
  (`shrines_csv_cache_v3`, 1 h TTL) → network fetch → bundled snapshot
  (`src/data/shrines-fallback.json`) as last resort. Background refreshes are
  fingerprinted so a no-op sheet fetch doesn't rebuild markers/search.
- `src/lib/data/shrineModel.ts` (`buildShrine`) maps raw rows to the `Shrine` type
  (`src/types/shrine.ts`). Today it reads the **legacy columns**: `Category`,
  `Founded/Opened` (falling back to `Founded`), `Sufi Saint`. The whole raw row is kept
  on `shrine.raw`, which is how every other component reaches columns that aren't
  modelled explicitly.
- Field access goes through `src/lib/data/fieldAliasing.ts` — `getFieldValue(row, key)`
  (trimmed, '' for blank) and `getUrduFieldValue(row, key)` (checks `<key> Urdu`,
  `<key>_ur`, … variants).

## 2. Where `Category` drives the map filters

- `src/pages/MapPage.tsx` owns `FilterState` (`category`, `region`, `saint`,
  `eraMin/Max`), synced to URL params (`?category=…` holds the raw sheet value,
  single-select). It passes `activeCategory` + `onCategoryChange` down to `MapSidebar`.
- `src/components/map/MapSidebar.tsx`:
  - builds the chip list from the data: `new Set(shrines.map(s => s.category))`, sorted
    alphabetically — so today's "four" categories are whatever distinct values the
    `Category` column holds;
  - filters with `s.category === activeCategory` (exact raw-value match, single choice,
    `''` = all — this is the current "default all-on" behaviour);
  - groups the browse list by raw `shrine.category` and labels groups/chips via
    `localizeField(row, 'Category')` (Urdu comes from `urdu-seed.json` /
    `SPECIAL_URDU_PHRASES` in `src/lib/i18n/urduFallback.ts`).
- Pin colours: `src/lib/data/categoryKey.ts` normalizes free-text category →
  `'muslim' | 'hindu' | 'sikh' | 'default'`. `ShrineMarkers.tsx` builds a Leaflet
  `divIcon` with class `shrine-dot--<key>`; the colours are design tokens
  (`--color-cat-muslim` etc.) in `src/styles/tokens.css` (light + dark), applied in
  `src/styles/map.css`. The same key drives list thumb placeholders
  (`shrine-list-thumb-slot--<key>`, map.css), image placeholders
  (`shrine-img-placeholder--<key>`, components.css via `ShrineImage`), and the infobox
  category badge (`infobox-category-badge--<key>`, shrine.css).
- Search: `src/lib/search/useSearch.ts` indexes `s.category` (MiniSearch field
  `category`) — it follows whatever `buildShrine` puts on the model.

## 3. Where the Shrine Facts box is built

- `src/components/shrine/ShrineInfobox.tsx` ("Shrine facts", `t('shrineFacts')`).
  It iterates **all keys of `shrine.raw`** and renders every non-blank value that isn't
  excluded (exclusions: `NON_DETAIL_KEYS`, Urdu variant keys, `Name`/`Slug`, article
  section columns, gallery columns). Order: `INFOBOX_PRIORITY_KEYS` in
  `src/lib/data/constants.ts` (`Category`, `Location`, `Founded`, `Sufi Saint`, …)
  first, then the rest, capped at `MAX_INFOBOX_ROWS` (8).
  ⚠️ Consequence: any brand-new sheet column will appear as a raw row (snake_case
  label, untranslated) unless it's excluded or given a label in
  `src/lib/data/fieldLabels.ts`.
- The coloured category badge at the top of the box comes from
  `categoryKey(shrine.category)`.
- `Founded/Opened` values are cleaned by `resolveFoundedDate()`
  (`src/lib/i18n/urduFallback.ts`), which strips qualifier prefixes and handles Urdu.

## 4. How a shrine page is rendered

- Route `/shrine/:slug` → `src/pages/ShrinePage.tsx`. It looks the shrine up by slug
  (legacy `id-N` slugs still supported) from the same `useShrineData()` dataset.
- `ShrineContent` renders: breadcrumb (Map → category → name) → category kicker →
  `<h1>` → summary meta row (location / founded / saint icons) → share actions → the
  article grid: hero image (`ShrineImage`), `ContentsNav` rail, `ShrineArticle`
  (lead + inline `## sections` from `Description` or dedicated columns, parsed by
  `src/lib/data/articleParsing.ts`), `LocationMap`, `RelatedShrines`,
  `SourcesProvenance`, and `ShrineInfobox` in the side rail.
- All strings go through `useLang()` (`src/lib/i18n/LanguageContext.tsx`): `t()` for UI
  keys (`uiStrings.ts`), `localizeField()` for sheet values (Urdu column variant →
  seed dictionary → word-level fallback → original), `fmtNum()` for Eastern numerals.
- The sidebar preview card (`src/components/map/ShrinePreview.tsx`) is the compact
  "card view" of the same data shown on the map page when a marker is selected.

## 5. Notes for the new-columns change

- New columns arrive on `shrine.raw` automatically (nothing filters unknown columns
  out at parse time); `getFieldValue(row, 'info_level')` etc. just works.
- Legacy `Category`/`Founded/Opened`/`Sufi Saint` reads must keep working — the new
  `category` column (lowercase) is a _separate_ key on the row, so
  `category || Category` fallback is safe and non-destructive.
- Enum → bilingual label maps should follow the `TRADITION_LABELS` model in
  `src/lib/tours/tours.ts` (`Record<key, { en, ur }>`) — no inline `lang === 'ur'`
  ternaries in components (ESLint blocks them).
- The Urdu no-leak guard (`e2e/urdu.spec.ts`, `findLatinLeaks` in `src/test/utils.tsx`)
  means every new visible string needs a real Urdu label (URLs/`<a>`/`<bdi>` exempt).
