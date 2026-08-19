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

## 6. The map basemap, and the "Invalid key" wallpaper (18 August 2026)

**Symptom:** the map tiles itself with a repeating grey graphic reading "Invalid key —
Get a valid key at www.maptiler.com" behind the shrine markers.

**CLAUDE.md's standing note on this was wrong**, and the wrong diagnosis was the reason
it stayed unfixed: it said this is an *origin restriction* that bites only on localhost,
fixable by adding the dev origin in the MapTiler dashboard. Measured, it is neither
localhost-only nor an origin problem.

What is actually true, measured 18 August 2026 against the key in `.env`:

| request | result |
|---|---|
| `…/maps/<custom-style-id>/{z}/{x}/{y}.png?key=…` | **403** (body is a 10,260-byte PNG of the error text) |
| same, with `Referer: http://localhost:5173/` | **403** |
| same, with `Referer: https://raufnawaz.github.io` | **403** |
| `…/maps/<custom-style-id>/style.json?key=…` | 200 |
| `…/maps/<custom-style-id>/tiles.json?key=…` | 200 — and it *advertises the raster URL that 403s* |
| `…/maps/streets-v2/{z}/{x}/{y}.png?key=…` | 200 |
| `…/maps/streets-v2/{z}/{x}/{y}.png?key=…&language=en` | 200 |
| `…/style.json?key=BOGUS` | 403 `Invalid key` |
| `…/style.json` (no key) | 403 `Missing key` |

So: **the key is valid, and the origin is irrelevant. What 403s is raster tiles of a
*custom Map Designer style* on this account** — every format (`.png`, `.webp`, `.jpg`,
`@2x`, `256/`). Production was affected identically; this was never localhost-only.

Two things made it hard to see:

1. MapTiler returns the failure as **HTTP 403 with an `image/png` body**. Leaflet has no
   reason to treat that differently from a tile, so it renders it — the map looks
   "configured wrong" rather than "erroring".
2. The custom style's own `tiles.json` still advertises the raster URL that 403s, so
   every piece of MapTiler's own metadata says the URL should work.

**The fix.** The custom style existed only to force English place-name labels
(Map Designer > Worldview > Language = English), because OSM's Pakistan tagging is mixed
Urdu/English — `docs/planning/PROJECT_HEAD_FEEDBACK_PLAN.md` item 1. The built-in styles
accept a **`language=en` query parameter** that produces the same thing *and* serve
raster tiles. So `ShrineMap.tsx` now defaults to `streets-v2` + `language=en`, and the
custom style is used only if `VITE_MAPTILER_CUSTOM_STYLE_RASTER=1` opts in explicitly.

**The durable part (RULE 4).** Fixing the URL alone would leave the same failure mode
waiting for the next key/quota/plan change. `ThemeAwareTileLayer` now counts `tileerror`
events on a MapTiler layer and, after `MAPTILER_ERROR_BUDGET` (4) of them, swaps to the
keyless CARTO basemap for the rest of the session and warns in DEV. Four, not one,
because a single 404 at the edge of coverage is normal — a rejected key fails *every*
tile. The result: a basemap outage degrades to a working map instead of wallpapering
Pakistan in an error message.

**If it recurs:** probe before theorising. `curl -o /dev/null -w '%{http_code}'` the tile
URL, then the same style's `style.json`. Tile 403 + style.json 200 is this bug (plan
doesn't serve that style's raster); both 403 with `Invalid key` is a genuinely bad key;
both 403 with `Missing key` means the env var never reached the bundle.

---

## 6a. MapTiler raster ignores `language` — corrected 18 August 2026

§6 above concluded that switching to a built-in style plus `?language=en` gave English labels.
**It does not.** The style serves raster (that part was right), but the raster endpoint ignores
the parameter completely.

Measured on `streets-v2`, tile `12/2889/1667` (Sheikhupura):

| request | result |
|---|---|
| `?language=en` | MD5 `001057e5fb038dc2c34330c7613c2b0e` |
| `?language=latin` | identical |
| `?language=local` | identical |
| `?language=ur` | identical |
| no parameter | identical |

Byte-identical output for every value, including one that should have produced Urdu. Nothing
was localising anything — the map was rendering OpenStreetMap's raw tagging, which in Punjab
means Latin for the places carrying a `name:en` and Urdu for everything else. That is exactly
the mixed map a reader reported.

The style JSON says the same thing: of its 32 label layers, **12 use a bare `"{name}"`** and
only 7 use `name:en` with a fallback.

**Fix: the basemap is now vector.** `src/components/map/MapLibreBasemap.tsx` loads
`style.json` and `src/lib/map/localizeStyle.ts` rewrites each `text-field` to a per-language
preference chain — `name:en → name:latin → name` for English, `name:ur → name → name:latin`
for Urdu. Vector tiles carry all of these (verified: `name:latin`, `name:nonlatin`, `name_int`
and ~50 `name:xx` fields are present in `tiles/v3`). 25 of 32 layers are rewritten; the 7 left
alone are `{ref}` road shields, `{housenumber}` and `{iata}` — rewriting those would replace
the M-2 motorway shields with words.

Raster survives only as the fallback path, and its URL no longer sends `language`, which
implied a localisation that never happened.

**Still true from §6:** raster tiles of a *custom* Map Designer style still 403 on this
account (re-verified 18 Aug 2026). Do not re-enable `VITE_MAPTILER_CUSTOM_STYLE_RASTER`.

### 6b. Verified 19 August 2026 — what the vector switch actually needed

Rendering it revealed three things the plan did not anticipate.

**maplibre-gl 6.4.1 does not work here; pinned to v5.** On v6 the basemap renders as a blank
background. Everything looks healthy — style.json, sprite and TileJSON all 200,
`transformRequest` fires with correct `.pbf` URLs, the worker spawns, the render loop runs and
`render` events fire — but **not one tile request ever leaves the browser**. Verified over CDP,
which sees worker traffic that Playwright's page-level listeners miss. Reproduced in dev and in
a production build, on SwiftShader and on a real M4 GPU via Metal, and with a plain style URL
and no Leaflet involved at all. v5.24.0 fetches tiles and renders first try. **Do not bump the
major without re-running that check** — the failure is silent and looks like a config problem.

**Do not pass `attributionControl: false` to the layer.** The plugin already forces it off for
the inner GL map; setting it in the layer options makes its `getAttribution()` return nothing,
silently dropping the MapTiler and OpenStreetMap credits. Attribution is passed explicitly as
`attributionControl: { customAttribution }` — left to the plugin it concatenates every source's
attribution, and this style has two sources carrying the same credit, so it renders twice.

**The raster fallback must go straight to keyless.** If the vector basemap fails, MapTiler
itself is unusable, so falling back to MapTiler *raster* fails again and leaves a blank map.
Measured with a deliberately broken key: before the fix, 8 MapTiler 4xx and **zero** CARTO
tiles. After, CARTO loads and the attribution updates.

**Cost.** maplibre-gl adds ~285 KB gzip, split into its own `vendor-maplibre` chunk. Page
weight went 1,199 KB → 1,489 KB, still 96% below the 41 MB this all started at, and FCP
measured *faster* (440 ms vs 644 ms) because vector tiles replace dozens of raster requests.

---

## 7. Vite rewrites `href` attributes in index.html, not strings inside `<script>`

Both Nastaliq preloads were 404ing on the production deploy, and nothing showed
it: the *font itself* loads fine, because the `@font-face` rule lives in CSS
and Vite rewrites `url()` there (`/Sufi-Shrines/fonts/...`, 200). Only the
preload hints missed, so Urdu rendered correctly while paying for two failed
requests and logging two console errors on every page load.

The cause is a rule that is easy to forget: **Vite rewrites `href`/`src`
attributes in `index.html` against `base`, but not string literals inside an
inline `<script>`.** The 700-weight preload had been injected from script since
the A3 work and was broken from the start; moving the 400-weight preload into
the same script (19 Aug, to gate it on language) broke the one that worked.

Use `%BASE_URL%` in script strings — Vite substitutes it at build time:

```js
link.href = '%BASE_URL%fonts/NotoNastaliqUrdu-400.woff2';
```

`e2e/font-preload.spec.ts` now fetches every preloaded URL and asserts 200, so
a preload that points nowhere fails the suite instead of hiding behind a
working stylesheet.

**Related trap, same shape:** the e2e build uses `VITE_BASE_PATH=/`, so a
base-path bug is invisible there. Checking `dist/index.html` after a plain
`npm run build` is what surfaces it.
