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

## 8. The Urdu reading surface — type metrics and de-carded chrome (19 August 2026)

A full aesthetic pass on the Urdu view ("clean, professional, minimalist,
flows like part of the OS" was the brief). The direction: Urdu print sets
Nastaliq dense on unadorned paper — ornament lives in the script, not in
boxes — so the work was removing the widget layer, not adding a theme.

**Type metrics (`tokens.css`, `global.css`):**

- `--leading-urdu` is **1.9**, down from 2.1. Noto Nastaliq's own line box is
  already tall (its `normal` computes ≈ 2.5); stacking 2.1 on top of that
  read as a sprawling diary rather than set prose. 1.9 still clears the
  diacritic stacks in running text. Headings keep `--leading-urdu-heading`
  (1.45) and data rows keep `--leading-urdu-ui` (1.7) — three tokens, three
  jobs.
- The RTL `word-spacing: 0.05em` bump is gone. Nastaliq words carry their own
  rhythm; extra word gaps read as sprawl.
- The Urdu **lead paragraph** now uses full ink (`--color-text`) and body
  leading. The Latin lead's muted-grey/loose treatment washed out Nastaliq's
  thin strokes at large sizes.

**Digits:** the lead and the raw-Description fallback in `ShrineArticle.tsx`
bypassed `localizeProseDigits`, so Urdu leads showed Western digits
("993 ہجری (تقریباً 1585 عیسوی)") while section prose was already Eastern.
Both paths now localize. If a new prose path is ever added to the article, it
must call `localize()` — the pattern is at the top of `ShrineArticle`.

**Chrome (`shrine.css`):**

- The h1 gets `outline: none` on focus: the router focuses it after
  navigation for screen readers, and the visible ring made the Nastaliq
  masthead look like a text input (it's `tabindex="-1"`, nothing keyboard-
  reachable is lost).
- Contents nav is a quiet rail, not a card — no border/shadow/fill; the
  active item is cobalt text plus a 2px inline-start hairline.
- Infobox is a hairline fact sheet — no shadow, no gradient accent bar, no
  tinted category band. The category band was the *third* rendering of the
  category above the fold (breadcrumb, kicker, band), so it was removed
  outright (`ShrineInfobox.tsx`); the e2e check on `.infobox-category-badge`
  is conditional, so it passes vacuously. Labels are now xs/muted in English;
  in Urdu they stay `--text-sm` because Nastaliq is unreadable at 12px —
  the same reason `[dir='rtl'] .infobox-title` and `.contents-nav-title`
  get a size step up over their Latin versions.
- An untranslated Latin source note in the RTL infobox renders on its own
  block line (`[dir='rtl'] .infobox-note bdi { display: block }`) — inline it
  interleaved with the Urdu "نوٹ:" label into a bidi zigzag.
- Buttons are quiet: Share is a borderless toolbar button, Get Directions is
  a full-width cobalt text button. Cobalt is reserved for interactive states.

**Guardrails that constrained this work** (all still green, checked against
the dev server): `e2e/typography.spec.ts` ratios (h1/body > 1.8 both
languages, |en−ur| scale shape < 0.3, Urdu infobox < 1.3× English — measured
2.25 / 2.25 / 0.00 / 1.20 after the change) and
`e2e/nastaliq-metrics.spec.ts` (kicker must exist and have zero tracking —
this is why the kicker survived the de-duplication instead of the band).

## 8a. Follow-ups to the Urdu pass (19 August 2026, same day)

Four user-reported items after §8 shipped:

- **Masthead overflow.** `--leading-urdu-heading` (1.45) fits single-line
  section headings but not the masthead: Noto Nastaliq's ink box is ~2.57em,
  so at display size wrapped title lines interpenetrated and swash ascenders
  (the lam of لنگر) struck through the kicker above. `.shrine-title--nastaliq`
  now carries its own metrics: `line-height: 1.8` + `padding-block-start:
  0.2em` (padding absorbs ascender ink that paints above the line box at any
  leading) + `text-wrap: balance`. Do not "fix" this by raising the shared
  heading token — the section headings are correct at 1.45.
- **Events translations.** The infobox تقریبات row was showing English for
  116 of 134 distinct `Events` values: the phrase map only covered the
  pre-18-August sheet wording. All 116 are now in `SPECIAL_URDU_PHRASES`
  (`src/lib/i18n/urduFallback.ts`) — that in-source map **is** the home of
  Events phrase translations (they are not in `urdu-i18n/`). If the sheet's
  Events wording changes again, the same leak returns: diff distinct sheet
  values against the map's keys (the check script pattern is in this
  session's git history, commit message below) and top it up. Conventions:
  Western digits in the map (fmtNum localizes at render), ؛/، punctuation,
  keep markdown `*…*` pairs balanced, drop an English parenthetical only when
  it is a transliteration gloss of the Urdu word itself.
- **Verse as verse.** Couplets in `Description` are authored as paragraphs
  with a single `\n` between hemistichs. The renderer collapsed those into
  run-on prose (HTML whitespace). Measured across the whole dataset: every
  multi-line paragraph that is not a list/heading is such a couplet — all
  lines Arabic-script. `ShrineArticle`'s `ProseParagraphs` now renders those
  as `<blockquote class="article-verse">`, centred with one line per
  hemistich (Urdu print sets poetry centred; no Latin left-bar). Unit tests
  guard both the rendering and the not-a-verse cases (lists, Latin lines).
- **Trust badges in the masthead.** `.shrine-summary-badge` unfills the
  info/support pills into dot + colored label on the shrine page only; list
  cards keep the filled pill.

## 9. Running the e2e suite in the Claude Code web sandbox (21 August 2026)

Two things break the suite in the remote sandbox, and both have in-repo fixes now:

1. **The pinned browser mismatch.** `@playwright/test` 1.61 wants
   `chromium_headless_shell-1228`; the sandbox pre-installs build 1194 under
   `/opt/pw-browsers` and blocks `npx playwright install`. Every spec then fails in 2 ms
   with "Executable doesn't exist" — which reads like a broken suite, not a missing
   download. Fix: `PLAYWRIGHT_CHROMIUM_EXECUTABLE=/opt/pw-browsers/chromium npx playwright test`.
   The config honours that variable and is byte-identical behaviour when it is unset.
   Deliberately **not** wired into `.claude/settings.json` env: the path exists only in the
   sandbox, and exporting it unconditionally would break the suite on any machine where
   `/opt/pw-browsers` is absent.

2. **External requests hang instead of failing.** The sandbox's egress proxy leaves
   basemap-tile and image requests to external hosts pending forever. Pending `<img>`
   subresources hold the window `load` event hostage, so every `page.reload()` in
   `persistence.spec.ts` timed out at 30 s while 54 other specs passed — a genuinely
   misleading failure signature. Fix in `e2e/fixtures.ts`: the suite is now hermetic by
   construction — nothing leaves localhost. The CSV is fulfilled from the fixture (as
   before), any external image resolves to a 1×1 PNG, everything else is aborted. This is
   the right behaviour everywhere, not just in the sandbox: a test suite should not
   depend on carto.com being reachable.

Related: `tours.spec.ts`'s "near me degrades gracefully" asserted the error state with a
5 s expect while `TourList`'s own `getCurrentPosition` timeout is 10 s — on a browser
that only rejects at the deadline (this sandbox's build), the test raced the app and
lost. The expect now outlives the app's timeout (15 s).

Full run recorded 21 Aug 2026: build 1194 via the env var, 62 specs. Remember the base
path: `npm run build:e2e` (root `/`), not `npm run build`, before `npx playwright test`.


## 10. Two shipped outages the suite could not see (23 August 2026)

Both were live on production at the same time. Neither turned a test red, and the
reason in both cases was the *kind* of assertion the suite makes, not a missing spec.
Recorded together because the lesson is one lesson.

### 10a. The map rendered zero markers — `return` where `continue` was meant

**Symptom:** the basemap drew, the sidebar listed all 171 shrines, and there was not a
single pin on the map. No console error, no failed request, no error card.

Measured against the live site before touching anything: `.leaflet-marker-icon` count 0,
`.leaflet-marker-pane` childElementCount 0, `localStorage.shrines_csv_cache_v5` holding
171 shrines of which **169 carried coordinates**, and `#shrine-directory` listing all
171. So the data was never the problem.

**Cause,** in `ShrineMarkers.tsx`'s build effect, from the 22 Aug unmapped-rows work:

```js
for (const shrine of shrines) {
  ...
  if (!shrine.latLng) return;   // meant: continue
```

That is a `for...of` in the effect body, not a `forEach` callback. `return` leaves the
whole effect — and `map.addLayer(group)` is *after* the loop. So the two coordinate-less
rows did not skip themselves, they discarded all 169 markers and the layer group with
them. A `forEach` would have made the same word mean the right thing, which is exactly
why it reads as correct.

**Why nothing caught it.** Every marker-ish assertion in the suite counted
`.shrine-list-item`. Nothing anywhere distinguished a map drawing 168 markers from a map
drawing none. `map.spec.ts` now asserts marker count == rows with coordinates *and* list
count == all rows — the "marker-count vs row-count" check CLAUDE.md RULE 4 names as one
that has actually worked, which this suite simply did not have.

**The fixture was the second half of the bug.** That check only means something if the
two counts differ, and they did not: all 169 fixture rows carried coordinates, so the
unmapped branch was unreachable in tests no matter how many specs existed. The generator
now exports one row (`Umarkot (Amarkot) Shiv Mandir` — not a tour stop, referenced by no
spec) without coordinates, chosen by name and asserted to exist so it cannot quietly
lapse back. Verified to fail: reintroducing `return` gives `Expected: 168, Received: 0`.

**Still open, and the reason the fixture had to fake it:** `src/data/shrines-fallback.json`
holds **169 rows where the live sheet holds 171**. `scripts/data/build-dataset.mjs` was
already fixed to keep coordinate-less rows; the committed snapshot predates that fix and
was never regenerated. Until someone runs `npm run data:build`, the offline fallback is
missing Shah Gohar Peer and Mian Qurban Ali Shah entirely, and the e2e fixture inherits
the same gap.

### 10b. On a phone, the entire sidebar painted under the basemap

**Symptom:** at any viewport under 769px the site was a bare map. No brand, no language
toggle, no search, no filters, no shrine list. Tapping a marker showed a tooltip and
nothing else. The sheet handle did not respond, so there was no way to open any of it.

**Cause:** `.map-container` was `position: relative` with no z-index, so it never became
a stacking context. Leaflet numbers its own panes 200–700 and the maplibre-gl-leaflet
layer sits among them; with no stacking context those numbers land in the *root* context,
where they outrank `--z-sidebar` (20). On desktop the sidebar sits beside the map, so
nothing ever overlapped and nothing looked wrong. `--z-map: 0` had been sitting in
`tokens.css` since the token system was written, applied to nothing.

**Why nothing caught it.** `a11y.spec.ts` already tests the 390px viewport — it asserts
`getBoundingClientRect()` on every map control. Every box was the correct size. They were
merely buried, and a size assertion cannot see occlusion.

`e2e/mobile-sheet.spec.ts` hit-tests instead: `document.elementFromPoint` at a control's
own centre must resolve to that control or a descendant. Two details it needs to not be
flaky — probe the centre of the element's *visible* rectangle (a tall card in a scrolling
sheet legitimately has its midpoint off-screen), and poll, because the sheet animates its
height and a card measured mid-transition is still below the fold. All four tests verified
to fail with the `z-index` line removed.

**Generalisable:** for any control that can be overlapped, "is it big enough" and "is it
on top" are different questions, and only the second one is about whether a user can use
it.

### 10c. iCloud conflict copies, including inside .git

Eleven `* 2.ts`/`* 2.tsx` copies of tracked test files were sitting untracked in `src/`,
and `npm run verify` was red because of three of them that predated a `prettier --write`
run — a red format gate on paths that are not in git at all. The other eight were
byte-identical, so vitest collected and ran them: nothing failed, the suite just ran the
same assertions twice.

`src/test/repoHygiene.test.ts` now fails on the pattern, naming the paths. The fix when
it fires is to delete the duplicate, never to reformat it.

The same duplication had also reached `.git/refs/remotes/origin/`, where `1.6 2` and
`main 2` broke `git fetch` outright (`fatal: bad object refs/remotes/origin/1.6 2` —
git rejects a ref name containing a space). Removed by hand; both pointed at an old
commit that is still reachable. Git's ref store is deliberately outside the hygiene
check's scope, but if `git fetch` ever fails with "bad object" on a ref whose name has a
space in it, that is this.

## 11. The two-branch merge (23 August 2026), and what it left open

`main` and `claude/keep-working-on-this-ewipvq` had both been developed from the same
19 August commit and never merged — 58 commits one way, 55 the other, 99 conflicting
files. The merge commit message carries the full resolution policy; three things from it
are worth having here, because they will come up again.

**"Newest per file" is a decision you can make mechanically, and should still spot-check.**
All 65 conflicting Urdu articles resolved to main by last-commit date (21 Aug vs 20 Aug).
That is the right rule, but it is only safe because the *content* was checked at the point
where it mattered: the other branch had fixed `allo-mahar`'s Urdu, which was still serving
prose the English had retracted as a misidentification. main's newer file already carried
the retraction. Had it not, "newest wins" would have re-shipped a hallucination.

**Derived files are regenerated, never merged.** `urdu-dictionary.json`,
`shrine-translations.seed.json`, `urdu-seed.json` and `urdu-content.json` were resolved by
taking either side and then re-running `build_dictionary.py`, `build_urdu_content.py` and
the seed sync (`urdu-i18n/build-all.sh` steps 1–3). Hand-merging a generated JSON produces
a file that matches neither source.

**Two designs for one concern: keep the superset, port the difference.** Both branches had
independently solved "don't ship the Urdu edition to English readers" and "the map paints
over the mobile sheet". For the payload the other line's version was a strict superset
(gated on language, content *and* dictionary, with a mid-session re-merge), so it won and
main's call sites were adapted. For the stacking context both fixes are kept —
`z-index: var(--z-map)` names where the map sits, `isolation: isolate` states the intent —
because each documents the other.

### The search field and the command palette

The palette (⌘K) did not replace the sidebar's search field, though the branch that built
it had removed it. `ShrineFilters` exists precisely so both surfaces can render the same
controls with the same class names, and its own docstring says so. So: the field stays in
the sidebar, the palette is the faster way in, and both render `ShrineFilters`.

One mechanical consequence worth knowing before touching either: **the sidebar field
unmounts while the palette is open.** Two live `.search-input` elements are two focusable
copies of one control, and every selector that reaches for it would have to choose. The
palette trigger, by contrast, must stay mounted — the palette returns focus to whatever
opened it, and a remounted button is a different element.

### Still open: Urdu dates on order and shrine pages

The no-leak guard's budgets went up, deliberately, and one entry is a genuine gap rather
than source data. Order pages render each figure's dates verbatim, which is correct for a
hedged phrase — `8 Muharram 1040 AH / 8 August 1630 CE` must not be paraphrased (RULE 2) —
but the *calendar vocabulary* inside it is interface copy and is not translated: month
names, `AH`/`CE`, and weekday names have no dictionary entries.

`GREGORIAN_MONTH_NAMES_UR` and `HIJRI_MONTH_NAMES_UR` already exist in
`src/lib/data/ursDates.ts` and `formatDateWindow` uses them, so projected almanac dates are
fine. What leaks is the *recorded* strings, which never pass through a formatter. Closing
it means a translated era/calendar vocabulary in `urdu-i18n/` (reviewed, not authored in a
hurry) plus a parser willing to localise the parts it recognises and leave the rest as
recorded. Until then it is declared `data-latin` and counted, which is honest but is not
parity.

Same category, smaller: an order page's shrine tag falls back to a title-cased slug
("Dargah Of Pir Muhammad Rashid Roze Dhani Pir Jo Goth") when the Urdu name is unknown.
That one is a dictionary gap, not a formatter gap.
