# Urdu Parity Implementation Plan — *Sufi Shrines of Pakistan*

**Goal:** make the Urdu experience (`?lang=ur`) as polished, complete, and native‑feeling as the English one.

**Status of this doc:** written to be pasted into Claude Code as a working brief. Each phase lists the exact files, concrete edits, code, and acceptance criteria. A ready‑to‑use Urdu dictionary ships alongside it in `urdu-i18n/`.

---

## 0. How to use this document

1. Read §1 (Diagnosis) and §2 (Vision) once for context.
2. Wire the dictionary (§3) — this alone removes ~90% of the visible "gibberish."
3. Work through Phases 1‑9 (§4) in order. They are sequenced so each phase is shippable on its own.
4. Use §5 as a literal checklist and §6 as the definition of done.

Suggested kickoff prompt for Claude Code:

> Implement Phase 1 and Phase 3 of `URDU_IMPLEMENTATION_PLAN.md`. Wire `urdu-i18n/shrine-translations.seed.json` into the translation layer, remove the char‑by‑char transliteration fallback, and make Nastaliq apply to all form controls in RTL. Run `npm run verify` when done and show me the diff.

---

## 1. Diagnosis — why the Urdu site looks bad today

The English UI chrome is already translated well (`src/lib/i18n/uiStrings.ts` has a complete EN/UR map, and `src/data/tours.json` has hand‑authored `titleUr`/`descriptionUr`). The problems are in four specific layers:

### 1.1 The data has no Urdu at all (root cause)

`Shrines_with_Descriptions.xlsx` and the derived `src/data/shrines*.json` have **11 columns and 0 Urdu columns** for **143 shrines**. So `getUrduFieldValue()` (`src/lib/data/fieldAliasing.ts`) always returns `''`, and every data value — names, locations, categories, saints, descriptions — falls through to `translateToUrdu()` in `src/lib/i18n/urduFallback.ts`.

That function's last resort is `buildUrduFallback()` → `transliterateWord()`, a **character‑by‑character Latin→Urdu map** (`CHAR_URDU_MAP`). For proper nouns this produces meaningless letter‑soup (e.g. a saint's name rendered as disconnected transliterated glyphs). **This is the single biggest reason the Urdu site "looks really bad."**

### 1.2 Facet chips are never localized

In the tour browser (`src/components/map/TourPanel.tsx` → `TourList`), the **Region / Theme / Era** chips render the raw English strings:

- region chip: `{r}` (~line 570)
- theme chip: `{th}` (~line 591)
- era chip: `{e}` (~line 612)

These come from `src/data/tours.json` (`region: "Sindh & Punjab"`, `theme: "Pilgrimage route"`, `era: "8th–20th century"`). Only `tradition` is localized (via `TRADITION_LABELS` in `src/lib/tours/tours.ts`). That is exactly the "Punjab / Sindh & Punjab / Pilgrimage route / 8th–20th century" English text visible in the screenshot.

The shrine sidebar has the same bug: **Region** chips render `{reg}` and **Saint** chips render `{saint}` raw (`src/components/map/MapSidebar.tsx`, ~lines 396 and 423).

### 1.3 Numbers stay Western

Counts, distances, dates and stop numbers are interpolated as raw JS numbers everywhere (e.g. `` `${tour.stops.length} مقامات` `` and `` `${Math.round(km)} ${t(lang,'kmUnit')}` `` in `TourPanel.tsx`). In formal Urdu these should be Eastern Arabic‑Indic digits (۰–۹). You chose **Eastern by default + a toggle**.

### 1.4 Nastaliq isn't reliably applied, and RTL is under‑polished

- `--font-urdu` is defined (`tokens.css:55`) and `[dir='rtl']` sets it (`global.css:43`), **but form controls don't inherit `font-family`** — there is no `button, input, select, textarea { font-family: inherit }` rule. So chips, search box, and buttons render Urdu in a system Naskh/serif, not Nastaliq. Nastaliq also needs more line‑height and size than Latin to be legible.
- Terminology drift: the region label is `صوبہ` in the sidebar but `علاقہ` in tours. Sorting uses `a.localeCompare(b)` with no locale (`MapSidebar.tsx:218`).
- **83 inline `lang === 'ur' ? … : …` ternaries** across 15 files (38 in `TourPanel.tsx` alone) — brittle, easy to miss, and the reason some strings are localized while their neighbours aren't.

---

## 2. Vision — what "as good as English" means

A reader who lands on `?lang=ur` should get an experience that feels **authored in Urdu**, not translated into it:

1. **Script:** everything in elegant Nastaliq (Noto Nastaliq Urdu, ideally self‑hosted), including buttons, inputs and chips, with comfortable line height.
2. **Completeness:** no English leaking into the Urdu view — names, places, saints, categories, facets, dates, and body text all in Urdu. No transliterated gibberish, ever.
3. **Numerals:** Eastern digits (۱۲۳) by default, with a one‑tap toggle to Western for anyone who prefers them; coordinates always Western.
4. **Bidi‑correct layout:** proper RTL mirroring, correct handling of mixed Urdu/Latin/number runs, locale‑aware sorting.
5. **First‑class SEO/sharing:** prerendered Urdu pages, `hreflang`, Urdu `<title>`/meta, and RTL print styles.
6. **Maintainable:** one source of truth for strings and one for data translations; adding a shrine can't silently reintroduce English.

---

## 3. The Urdu dictionary (ships with this plan)

Folder: **`urdu-i18n/`**

| File | What it is |
|---|---|
| `urdu-dictionary.json` | **Source of truth.** Structured, human‑readable sections: `categories`, `traditions`, `tourRegions`, `tourThemes`, `tourEras`, `placeTokens` (243), `shrineNames` (143), `saints` (123), `foundedPhrases` (86), `locations` (123 full strings), `sufiGlossary` (49). |
| `shrine-translations.seed.json` | **Flat `en → ur` map (538 entries)** for runtime lookup — every full field value the app resolves. |
| `shrine-translations.seed.js` | Same map as a drop‑in `window.SHRINE_TRANSLATIONS = …` script. |
| `build_dictionary.py` | Regenerates all of the above from the source dict + `_shrine_rows.json`. Run it after adding shrines; it validates coverage and fails loudly on any value that still contains Latin letters. |
| `_shrine_rows.json` | Snapshot of the 143 rows used to build/validate. |

Coverage is **100% of current structured data** with **zero Latin‑script leakage**. Numbers inside values are deliberately kept Western so the Phase‑2 numeral toggle can switch them at render time.

> **Not included (by design):** the 133 long‑form **descriptions**. Those are prose and belong in a `Description Urdu` column, not a key‑value dictionary — see Phase 7.

### 3.1 Wiring — quick path (do this first)

Prefer a static import over the global (SSR/prerender‑safe):

```
cp urdu-i18n/shrine-translations.seed.json src/data/urdu-seed.json
```

Then in `src/lib/i18n/urduFallback.ts`, seed the cache from the import instead of only `window.SHRINE_TRANSLATIONS`:

```ts
import urduSeed from '../../data/urdu-seed.json';

function loadSeedTranslations(): Map<string, string> {
  const w = typeof window !== 'undefined'
    ? (window as unknown as Record<string, unknown>) : {};
  const win = (w.SHRINE_TRANSLATIONS && typeof w.SHRINE_TRANSLATIONS === 'object')
    ? (w.SHRINE_TRANSLATIONS as Record<string, string>) : {};
  let persisted: Record<string, string> = {};
  try {
    const raw = localStorage.getItem(TRANSLATION_CACHE_KEY);
    if (raw) persisted = JSON.parse(raw) || {};
  } catch { /* ignore */ }
  // seed file wins over stale persisted cache; window can still override in dev
  return new Map(Object.entries({ ...persisted, ...(urduSeed as Record<string,string>), ...win }));
}
```

Also bump `TRANSLATION_CACHE_KEY` to `…_v4` so old transliterated junk in visitors' `localStorage` is discarded.

### 3.2 Kill the gibberish fallback (critical)

In `urduFallback.ts`, the char‑by‑char path must never render. Change `translateToUrdu()` so an unknown Latin string returns **the original** (readable) instead of transliterating, and warns in dev:

```ts
const generated = buildUrduFallback(raw);          // keeps WORD_URDU_MAP + "Nth century"
if (generated && generated !== raw && !/[A-Za-z]/.test(generated)) {
  cache.set(raw, generated); persistCache(); return generated;
}
if (import.meta.env.DEV) console.warn('[urdu] missing translation:', raw);
return raw; // never emit transliterated letter-soup
```

Then delete (or dev‑gate) `transliterateWord`, `DIGRAPH_URDU_MAP`, and `CHAR_URDU_MAP`. Keep `WORD_URDU_MAP`/`SPECIAL_URDU_PHRASES` — they're fine.

### 3.3 Durable path (recommended follow‑up)

Fold the dictionary into the data build so each row carries real Urdu columns (`Name Urdu`, `Location Urdu`, `Category Urdu`, `Founded/Opened Urdu`, `Sufi Saint Urdu`). Add `scripts/data/apply-urdu.mjs` that reads `urdu-i18n/shrine-translations.seed.json` and writes `*_ur` fields into `src/data/shrines.json` during `npm run data:build`. `getUrduFieldValue()` already looks for `"<Field> Urdu"`/`"<Field>_ur"` (`fieldAliasing.ts`), so **no component changes are needed** — and prerendered Urdu HTML then contains real Urdu (huge SEO win). The runtime seed stays as the safety net.

---

## 4. Phased implementation

### Phase 1 — Nastaliq typography foundation

**Files:** `src/styles/global.css`, `src/styles/tokens.css`, `index.html`

1. Make **all controls** inherit the Urdu font in RTL. Add to `global.css`:

   ```css
   [dir='rtl'] button,
   [dir='rtl'] input,
   [dir='rtl'] select,
   [dir='rtl'] textarea,
   [dir='rtl'] .filter-chip,
   [dir='rtl'] .search-input {
     font-family: var(--font-urdu);
   }
   ```

2. Tune Nastaliq metrics (it sits tall and needs breathing room). In the existing `[dir='rtl']` block (`global.css:43`) keep `line-height: var(--leading-urdu)` and consider `--leading-urdu: 2.1`; add `letter-spacing: normal` and `word-spacing: .05em`. Bump control text to `font-size: 1.1rem` in RTL so Nastaliq ligatures don't collapse.

3. **Self‑host** Noto Nastaliq Urdu (perf + reliability) instead of the Google Fonts `<link>` (`index.html:28`). Add `woff2` to `public/fonts/`, define `@font-face` with `font-display: swap`, and preload the 400 weight. Optional upgrade for a more premium look: **Gulzar** or **Mehr Nastaliq** as `--font-urdu` primary, Noto as fallback.

4. Give the two scripts independent scale. Add `--font-scale-urdu: 1.06` and apply to headings/body in RTL so Nastaliq matches the visual weight of Merriweather/Source Sans.

**Acceptance:** In `?lang=ur`, every chip, button, search field, heading and body paragraph renders in Nastaliq (verify by screenshotting the filter panel from the original bug report). No control falls back to Naskh/serif.

---

### Phase 2 — Eastern numerals + toggle

**New file:** `src/lib/i18n/numerals.ts`

```ts
import type { Lang } from '../../types/shrine';
const EASTERN = ['۰','۱','۲','۳','۴','۵','۶','۷','۸','۹'];
export const toEasternDigits = (s: string | number): string =>
  String(s).replace(/[0-9]/g, d => EASTERN[+d]);
export function localizeDigits(text: string, lang: Lang, eastern: boolean): string {
  return lang === 'ur' && eastern ? toEasternDigits(text) : text;
}
```

**Extend `src/lib/i18n/LanguageContext.tsx`:**

- Add `numerals: 'eastern' | 'western'` state, persisted under `shrines_numerals` (default `'eastern'`), plus `setNumerals`.
- Expose `fmtNum: (n: number | string) => string` = `localizeDigits(String(n), lang, numerals === 'eastern')`.

**Use `fmtNum` at every number render site** (replace raw interpolation):

- `TourPanel.tsx`: stop label `${stopIdx+1}/${length}`, `${tour.stops.length} مقامات`, `${Math.round(km)}`, drive time, autoplay seconds, `tour-preview-stats`.
- `MapSidebar.tsx`: `tCount()` result, era slider readouts.
- `TimeSlider.tsx`: century labels.
- `src/lib/data/era.ts`: add `formatCenturyUr(century)` → e.g. `۸ویں صدی`; keep coordinates (`copyCoordinates`) **Western** always.

**UI control:** add a small ۱۲۳/123 toggle next to `LanguageToggle`/`DarkModeToggle` in the sidebar header (`MapSidebar.tsx:262`). Only show it in `?lang=ur`.

**Acceptance:** In Urdu with Eastern on, all counts/distances/dates show ۰–۹; toggling flips them live and the choice persists across reloads; coordinates remain Western.

---

### Phase 3 — Wire the data dictionary

Covered in §3.1–3.3. After wiring, these render in real Urdu automatically because they already route through `localizeField`/`localizeShrineName`:

- shrine names (list, preview, article title, tour stops)
- locations & categories (list meta, infobox, preview)
- saint names (infobox, preview)
- founding dates (infobox)

**Acceptance:** Open the shrine list and 5 shrine pages in Urdu — names, locations, categories, saints, dates are correct Urdu with no Latin and no transliteration. Grep the rendered DOM for `[A-Za-z]` inside `[dir='rtl']` content nodes → none (outside URLs/coordinates).

---

### Phase 4 — Localize tour & shrine facets (enums)

**Goal:** the Region/Theme/Era/Saint/Category chips read Urdu.

Add typed label maps sourced from the dictionary (or read `urdu-dictionary.json` sections). Two clean options:

**A. Enum label maps** in `src/lib/tours/tours.ts` (mirrors the existing `TRADITION_LABELS`):

```ts
export const REGION_LABELS: Record<string,{en:string;ur:string}> = {
  'Sindh & Punjab': { en:'Sindh & Punjab', ur:'سندھ اور پنجاب' },
  'Punjab': { en:'Punjab', ur:'پنجاب' },
  'Punjab, Sindh & Balochistan': { en:'Punjab, Sindh & Balochistan', ur:'پنجاب، سندھ اور بلوچستان' },
};
// THEME_LABELS, ERA_LABELS similarly (values in urdu-dictionary.json → tourThemes / tourEras)
```

Then in `TourPanel.tsx` render `REGION_LABELS[r]?.[lang] ?? r` (and theme/era), and for the era chips pass the value through `fmtNum` so `8ویں–20ویں صدی` gets Eastern digits.

**B. Generic helper** on the context: `localizeEnum(value)` = dictionary lookup with English fallback — less boilerplate, but A is more type‑safe. Pick one and be consistent.

**Shrine sidebar** (`MapSidebar.tsx`): region chips → `localizeField(sampleRowForRegion, 'Region')` or a `REGION_LABELS`‑style map; saint chips → `localizeField(row,'Sufi Saint')` (now seeded). Unify the region **label** to one term (recommend `علاقہ`) in both places and in `uiStrings.ts`.

**Sorting:** change `a.localeCompare(b)` → `a.localeCompare(b, lang === 'ur' ? 'ur' : 'en')` (`MapSidebar.tsx:218`, and any other `localeCompare`).

**Acceptance:** Every filter chip in both the tour browser and the shrine sidebar is Urdu in `?lang=ur`; era chips use Eastern digits; groups sort in Urdu collation order.

---

### Phase 5 — Consolidate inline ternaries into `uiStrings.ts`

Move the 83 `lang === 'ur' ? … : …` literals into `UI_TEXT` keys and call `t('…')`. Add the missing keys, e.g.: `guidedTours`, `guidedToursHint`, `turnOnTours`, `turnOffTours`, `endTour`, `finishTour`, `previousStop`, `nextStop`, `stopOf` (function), `viewFullDetails`, `copyLink`, `linkCopied`, `clearFilters`, `regionLabel`, `saintLabel`, `stops`, `nextIn` (function), plus the brand string `صوفی مزارات` (used raw in `MapSidebar.tsx:259`).

Do it file‑by‑file, highest count first: `TourPanel.tsx` (38) → `MapSidebar.tsx` (15) → `TimeSlider.tsx` (6) → the rest. Add an ESLint guard (`no-restricted-syntax`) to fail CI on new `lang === 'ur'` conditional expressions in JSX so this doesn't regress.

**Acceptance:** `grep -rn "lang === 'ur'" src` returns ~0 in components (only the provider needs it); `npm run lint` blocks new ones; UI is unchanged in both languages.

---

### Phase 6 — RTL layout & bidi polish

- **Logical properties:** replace physical `left/right`, `margin-left`, `padding-right`, `text-align: left`, and `border-radius` corners in `map.css`/`shrine.css`/`global.css` with logical equivalents (`inset-inline-start`, `margin-inline-start`, `text-align: start`, `border-start-start-radius`, …) so the layout mirrors correctly. Audit icon directions (chevrons/back arrows) — they should flip in RTL.
- **Bidi isolation:** wrap any unavoidable mixed runs (a Latin place name inside Urdu, coordinates, URLs) in `<bdi>` or `unicode-bidi: isolate` so punctuation and parentheses don't jump. The dictionary already uses the Urdu comma `،`.
- **Inputs:** search `<input>` in RTL needs `dir="rtl"` and `text-align: start`; the clear (×) button must sit on the correct side.
- **Leaflet & lightbox:** verify zoom/attribution controls and the image lightbox close button mirror; the map itself stays LTR (geographic), which is correct.
- **Print:** `tour-print-itinerary` and shrine article print styles should set `direction: rtl` when in Urdu.

**Acceptance:** A11y/RTL pass on mobile + desktop: nothing clips or overlaps, arrows point the right way, mixed number/text runs read correctly, and the sheet/handle gestures work in RTL.

---

### Phase 7 — Long‑form descriptions (the remaining content lift)

133 English descriptions currently have no Urdu, so the article body still transliterates. Plan:

1. Add a **`Description Urdu`** column to `Shrines_with_Descriptions.xlsx` (and `Events Urdu`, `Visiting Info Urdu`, `History/Architecture/Rituals/... Urdu` for the structured sections defined in `constants.ts` — those already have Urdu **headings**).
2. Translate to a consistent standard: honorifics/terms per `data/glossary.csv` (Hazrat, Pir, dargah, urs, silsila…), Eastern digits off in stored text (render‑time toggle handles it), preserve the structured `## History / ## Architecture …` headings using their Urdu equivalents already in `constants.ts` / `STRUCTURED_DESCRIPTION_HEADING_ALIASES`.
3. Feed through the existing `data:build` so `getUrduFieldValue(row,'Description')` resolves (the article renderer and `ShrineArticle.tsx` need no change).
4. Prioritize order: the ~18 tour‑featured shrines first, then the most‑visited (Data Darbar, Lal Shahbaz Qalandar, Bahauddin Zakariya, Baba Farid, Bulleh Shah, Shah Rukn‑e‑Alam, Bibi Pak Daman, Mian Mir…), then the rest.

> This is bounded, careful prose work. It can be produced in batches to the same "correct, native Urdu" bar as the dictionary; call it out as its own deliverable so it gets real review rather than being rushed.

**Acceptance:** Each shrine page in Urdu shows a fully Urdu article body (lead + sections), no transliteration, headings in Urdu, `dir="rtl"` on the prose.

---

### Phase 8 — SEO, prerender & metadata per language

**Files:** `index.html`, `scripts/prerender.mjs`, router.

- Language is currently a query param (`?lang=ur`) set on `document.documentElement` at runtime (`LanguageContext.tsx:50`). For SEO, **prerender an Urdu variant** of each route (e.g. `/ur/...` or `?lang=ur` snapshots) with `<html lang="ur" dir="rtl">`, Urdu `<title>`/`<meta description>`/`og:*`, and reciprocal `hreflang` (`en`, `ur`, `x-default`) tags.
- Localize the document title and meta on language switch (currently static English in `index.html:11‑40`).
- Add Urdu strings for PWA `manifest`/apple‑web‑app title.

**Acceptance:** View‑source of a prerendered Urdu page shows real Urdu content + correct `lang/dir/hreflang`; Lighthouse SEO ≥ existing English score; sharing an Urdu link shows Urdu preview text.

---

### Phase 9 — QA, tests, accessibility

- **Unit:** extend `src/lib/i18n/__tests__/urduFallback.test.ts` — assert the seed resolves known names/saints/locations, and that unknown Latin input returns the original (never transliteration). Add tests for `numerals.ts` and enum label maps.
- **Guard test — "no English leaks":** a Vitest that renders the sidebar + a shrine page in `ur`, walks text nodes under `[dir='rtl']`, and fails if any contain `[A-Za-z]` except inside `.coords`, links, or `<bdi data-latin>`.
- **E2E (Playwright):** a `?lang=ur` journey — switch language, open list, open a shrine, start a tour — asserting Nastaliq is applied (`getComputedStyle(...).fontFamily` includes Nastaliq), chips are Urdu, numerals are Eastern, and `dir=rtl`.
- **A11y:** run the existing axe setup in RTL; check focus order, `lang`/`dir` on mixed content, and 44px targets for the new numeral toggle.
- **Visual:** Storybook stories for `LanguageToggle`, chips, and `TourPanel` in Urdu; snapshot the exact filter panel from the bug report.

**Acceptance:** `npm run verify` (typecheck + lint + unit) and `npm run e2e` green, including the new no‑leak and RTL tests.

---

## 5. File‑by‑file change checklist

- [ ] `urdu-i18n/shrine-translations.seed.json` → copy to `src/data/urdu-seed.json`
- [ ] `src/lib/i18n/urduFallback.ts` — import seed; bump cache key to `v4`; remove char‑by‑char transliteration; unknown → return original + dev warn
- [ ] `src/lib/i18n/numerals.ts` — **new**; `toEasternDigits`, `localizeDigits`
- [ ] `src/lib/i18n/LanguageContext.tsx` — `numerals` state + `setNumerals` + `fmtNum`
- [ ] `src/lib/i18n/uiStrings.ts` — add facet/label keys + the strings moved out of components
- [ ] `src/lib/tours/tours.ts` — `REGION_LABELS`, `THEME_LABELS`, `ERA_LABELS`
- [ ] `src/components/map/TourPanel.tsx` — localize region/theme/era chips; `fmtNum` on all numbers; replace 38 ternaries
- [ ] `src/components/map/MapSidebar.tsx` — localize region/saint chips; unify region label; `fmtNum`; locale‑aware sort; replace 15 ternaries; use `t('title')` for brand
- [ ] `src/components/map/TimeSlider.tsx` — Urdu century labels + `fmtNum`
- [ ] `src/lib/data/era.ts` — `formatCenturyUr()`
- [ ] `src/styles/global.css` — RTL font inheritance for controls; Nastaliq metrics
- [ ] `src/styles/tokens.css` — `--font-urdu` (self‑hosted/Gulzar), `--leading-urdu`, `--font-scale-urdu`
- [ ] `index.html` — self‑host font; per‑lang `<title>`/meta/hreflang
- [ ] `scripts/data/apply-urdu.mjs` — **new**; bake `*_ur` columns (durable path)
- [ ] `scripts/prerender.mjs` — emit Urdu variants
- [ ] tests — `urduFallback.test.ts`, new `numerals.test.ts`, no‑leak guard, Playwright `ur` journey
- [ ] `.eslintrc.cjs` — forbid new `lang === 'ur'` conditionals in JSX
- [ ] data — add `Description Urdu` (+ section columns) and translate (Phase 7)

---

## 6. Definition of done

1. In `?lang=ur`, **no English or transliterated text** appears in names, places, categories, saints, dates, facets, or article bodies (URLs/coordinates excepted).
2. **Nastaliq** renders everywhere including chips, inputs, and buttons.
3. **Eastern numerals** by default with a working, persisted toggle; coordinates stay Western.
4. Layout is **bidi‑correct** (mirrored controls, isolated mixed runs, Urdu‑collated sorting).
5. Urdu pages are **prerendered** with correct `lang/dir/hreflang` and Urdu meta.
6. `npm run verify` + `npm run e2e` pass, including the **no‑English‑leak** guard; ESLint blocks new inline ternaries.
7. Adding a shrine without Urdu **fails the data build** (via `build_dictionary.py`'s Latin‑leak check wired into `data:validate`), so parity can't silently regress.

---

## 7. Appendix

### 7.1 Eastern digit map
`0123456789` → `۰۱۲۳۴۵۶۷۸۹`  (Urdu also uses `٫` decimal and `٬` thousands separators if you localize those later.)

### 7.2 Terminology decisions (baked into the dictionary)
- Category: *Muslim Shrine* → **مسلم مزار**, *Hindu Temple* → **ہندو مندر**, *Sikh Gurdwara* → **سکھ گوردوارہ**
- "Shrine of X" → **مزارِ X**; "Tomb/Mausoleum of X" → **مقبرہ X**; "Dargah" → **درگاہ**; "Gurdwara" → **گوردوارہ**; "Mandir/Temple" → **مندر**
- Honorifics kept per `data/glossary.csv`: حضرت, پیر, خواجہ, سید, شاہ, بابا (not translated, transliterated in Urdu script)
- Region label unified to **علاقہ**
- Locations composed from `placeTokens` with Urdu class‑word order (**ضلع** X, X **کے قریب**) and the Urdu comma **،**

### 7.3 Regeneration
After editing `urdu-i18n/build_dictionary.py` (e.g. new shrines), run:

```
cd urdu-i18n && python3 build_dictionary.py
```

It rebuilds all outputs and prints coverage + a Latin‑leak report. Wire that check into `npm run data:validate` so CI enforces Urdu parity.
