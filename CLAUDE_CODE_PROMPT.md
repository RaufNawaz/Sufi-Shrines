# Claude Code Task — Modernize & Elevate the *Sufi Shrines of Pakistan* Website

You are taking over an existing, working website and tasked with a **significant functional and aesthetic overhaul**, including a **migration from vanilla HTML/CSS/JS to a modern framework**. Read this whole brief before writing any code. Then **produce a migration plan and get sign-off before the large rewrite** (see "How to work" at the end). Bias toward the simplest approach that meets the goals — do not add speculative features or abstractions.

---

## 1. What this project is

A static, **read-only, bilingual (English / Urdu)** interactive map of Sufi shrines across Pakistan, maintained as part of Harvard research on South Asian religious sites. Visitors browse shrines on a Leaflet map and open Wikipedia-style detail pages (history, architecture, rituals, saint biography, gallery, location, related shrines) in either language with full right-to-left (RTL) support for Urdu.

All shrine content lives in a **published Google Sheet CSV**, fetched in the browser at runtime. There is no backend for the public site. It is hosted as static files (GitHub Pages / Netlify class hosting).

**Audience:** general public + researchers, on desktop and mobile, on variable connections. Cultural-heritage tone: respectful, scholarly, calm.

---

## 2. Current architecture (study before changing)

| File | Role |
|------|------|
| `index.html` | Map page shell (Leaflet + PapaParse from CDN) |
| `shrine.html` | Shrine detail page shell |
| `app.js` (~1,300 lines) | Map, dot markers, sidebar, "Table of Shrines" control with category grouping + search, language toggle, Urdu fallback translation |
| `shrine.js` (~2,390 lines) | Detail page rendering: infobox, contents nav + scrollspy, article sections, gallery + lightbox, related shrines, location embed, share, editor panel |
| `style.css` (~2,100 lines) | All styles: map, sidebar, detail page, RTL variants, animations |
| `data-source.js` | CSV fetcher (PapaParse), local-override + Google Sheet write-back plumbing for the (disabled) editor |
| `editor-config.js` | Editor on/off + credentials holder. Currently `enabled: false` → public site is read-only |
| `translations.js` | Pre-built English→Urdu dictionary (`window.SHRINE_TRANSLATIONS`) |
| `process_books.py`, `build_translation_cache.py`, `google-apps-script/Code.gs` | **Maintainer-only** tooling (OCR of Urdu PDF books, translation cache build, sheet write-back). Out of scope — do not rewrite. |

**Data flow:** Google Sheet → published CSV URL → browser fetches via PapaParse → markers on Leaflet map → click marker → `shrine.html?id=<row-index>` renders detail.

**Map specifics:** Leaflet 1.9.4; default center `[31.5204, 74.3587]`, zoom 6; custom `divIcon` dot markers (teal default, amber selected with a pulse ring); five tile layers — MapTiler Streets/Topo (**API key currently hard-coded in `app.js`**), CARTO Voyager, Esri Streets, Esri Satellite.

**i18n logic (valuable — port it, don't discard it):**
- Language persisted in `localStorage` and via `?lang=en|ur`; `body.lang-rtl` + `dir="rtl"` drive RTL.
- Urdu text priority: (1) explicit Urdu column in the sheet (`Name Urdu`, `Description Urdu`, …) → (2) `translations.js` dictionary → (3) a built-in word/digraph/character **transliteration fallback** (`WORD_URDU_MAP`, `DIGRAPH_URDU_MAP`, `CHAR_URDU_MAP`, `buildUrduFallback`). **No paid translation API at runtime.**

**Content parsing logic (valuable — port it):** flexible column aliasing (`getFieldValue` / `getUrduFieldValue`), heading-based article splitting inside `Description` (`## History`, `Architecture:`, etc.), numbered gallery columns (`Gallery N Image/Caption`, `Image N`), infobox priority ordering, related-shrine ranking by category + haversine distance.

**Sheet schema (columns):** `Name`, `Latitude`, `Longitude`, `Category`, `Location`, `Founded`, `Sufi Saint`, `Image Link`, `Description` (supports inline `## Heading` sections), section columns (`History`, `Architecture`, `Rituals`, `Saint Biography`, `Events & Urs`, `Visiting Info`, `Sources`), `Gallery N Image` / `Gallery N Caption`, and Urdu variants (`<Field> Urdu`).

---

## 3. Hard constraints — do NOT break these

1. **Bilingual EN/UR with full RTL must keep working** everywhere (map, sidebar, list, detail pages, lightbox, forms, footer).
2. **The Google Sheet CSV stays the single source of truth, and the "edit the sheet → site updates without a code change/redeploy" workflow must be preserved.** This is the most important constraint. A pure build-time-only SSG that requires a rebuild for every content edit is **not acceptable unless** you also wire up automatic rebuilds (see §4) and the maintainer explicitly approves that tradeoff. Default to runtime fetching.
3. **No paid APIs at runtime** for translation or geocoding. Keep the free translation/transliteration cascade.
4. **Public site stays read-only.** Keep the editor disabled by default; the editor + Apps Script + Python pipeline are maintainer tooling and out of scope.
5. **Static-deployable output.** The final build must deploy to GitHub Pages / Netlify-class static hosting.
6. **No secrets in client code or git.** Move the MapTiler key out of source into an env var; fall back gracefully to keyless tile layers (CARTO/Esri) when it is absent.
7. **Do not commit large binaries.** The 258 MB `AFADA-E-KABIR.pdf` and OCR model files (`urd.traineddata`, `tessdata/`) must be kept out of the web bundle and out of git history going forward (gitignore / LFS note).
8. Preserve existing shareable links where feasible (`shrine.html?id=N`) via redirects when you introduce nicer URLs.
9. **Free to run — open-source and zero ongoing cost.** This is a firm requirement: the whole site must build, deploy, and run at **$0**, with no paid plans, metered/billed APIs, required accounts, or "free tiers" that expire or charge at scale.
   - **Every dependency must be free and open source** (OSI-approved permissive license: MIT, BSD, Apache-2.0, ISC, MPL, or SIL OFL for fonts). No proprietary SDKs, no trial-ware. Provide a dependency license/cost audit listing every package in the final report.
   - **No required API keys or paid accounts.** The site must be 100% functional on a fresh clone with nothing to sign up for. Map tiles must **default to genuinely free open-data tiles** (OpenStreetMap / CARTO Voyager under ODbL). The freemium MapTiler/Esri layers may remain *only* as optional extras behind a user-supplied env key — never required, never the default.
   - **Free static hosting.** Output must deploy to a free static host (GitHub Pages / Netlify / Cloudflare Pages free tier). No server or paid build infrastructure. (If the Astro + scheduled-rebuild option is chosen, it must fit within the free GitHub Actions allowance.)
   - **Free assets and data.** Self-host fonts or load them from a free open CDN (no licensed/paid fonts), use open-set icons, omit paid analytics/image services, and keep the free Google Sheets published-CSV data source plus the no-paid-API translation cascade.
   - **Keep the existing free/open components** (Leaflet — BSD-2-Clause; PapaParse — MIT; Noto / Merriweather / Source Sans — SIL OFL). If anything you want to add is not both free and open, flag it and find an alternative before adding it.

---

## 4. Phase 1 — Framework migration

**Recommended stack (default): Vite + React + TypeScript**, client-rendered SPA with a small router (e.g., React Router) and Leaflet via `react-leaflet`. Rationale: it preserves the runtime-CSV "no redeploy" workflow with the least friction, gives a real component model and type safety, code-splits cleanly, and still builds to static files.

**Acceptable alternative (only if the maintainer accepts a rebuild step): Astro + React islands.** Pre-render detail pages for excellent SEO/perf, hydrate the map as an island, and fetch the CSV at build time **plus** add a scheduled rebuild (GitHub Action cron and/or a Google-Sheet-change webhook) so edits still appear automatically. Present this tradeoff explicitly and let the maintainer choose; otherwise use the default.

Migration requirements:
- **TypeScript throughout.** Define a typed `Shrine` model and a single typed data layer that parses the CSV (PapaParse or equivalent) and **ports the existing column-aliasing, heading-splitting, gallery-numbering, infobox-priority, related-ranking, and Urdu-fallback logic** into well-named, tested functions. Do not naively reimplement — preserve current behavior, then improve.
- **Componentize.** Break the 2,390-line `shrine.js` and 1,300-line `app.js` into focused components/hooks. No giant files.
- **Centralize i18n** (strings + direction + language state) in one module/provider. Keep the translation cascade intact.
- **Config via env** (`.env`, gitignored): MapTiler key, CSV URL. Provide `.env.example`.
- Set up **ESLint + Prettier**, a clean folder structure, and npm scripts (`dev`, `build`, `preview`, `lint`, `typecheck`).
- Keep `main` deployable at every step; migrate incrementally.

---

## 5. Phase 2 — Functional improvements (priority area)

### Map UX (high priority)
- **Marker clustering** for dense regions (e.g., `react-leaflet-cluster` / supercluster), with smooth expand on zoom.
- **Filtering**: by `Category` and by region/province, combinable with search; show an active-filter state and a results count.
- **Better, full-text search**: match across `Name`, `Sufi Saint`, `Location`, and `Description` — not just name — with debounced input and keyboard navigation of results.
- **"Near me" geolocation** (opt-in): center on the user and sort the list/related shrines by distance (reuse the existing haversine logic).
- **Fit-to-bounds** for the current filtered set and a "reset view" control; persist the last map view (optional, low priority).
- Keep the map ↔ detail flow intact; make markers keyboard-focusable and popups accessible.

### Performance (high priority)
- **Route-level code splitting**; lazy-load the map libs, lightbox, and detail route.
- **Responsive, lazy-loaded images** with width hints; improve the current low-res hero handling; document/prefer CDN-friendly image sources (e.g., Wikimedia thumb URLs).
- **CSV caching** with stale-while-revalidate: render cached data instantly, then refresh in the background; handle fetch failure with retry + cached fallback.
- **PWA / offline**: web app manifest, icons, and a service worker caching the app shell + last CSV (and tiles within provider ToS) so the site is usable offline.
- Debounce search; virtualize the shrine list if it grows large; tree-shake Leaflet; keep the bundle lean.
- **Target Lighthouse ≥ 90** in Performance, Accessibility, Best Practices, and SEO on both the map and a detail page (mobile profile).

### Accessibility (high priority)
- **Full keyboard operability**: markers, list/table, filters, lightbox (focus trap + Escape, formalize the existing Escape handling), language/dark-mode toggles; visible `:focus-visible` styles; skip-to-content link.
- **ARIA**: proper roles/labels; `aria-live` regions for loading status and result counts; an accessible list alternative to the visual map for screen readers.
- **Correct `lang`/`dir`** on mixed EN/UR content; ensure Urdu blocks are announced correctly.
- **Contrast audit** of the beige/teal palette (current muted greys may fail AA) and fix to WCAG AA.
- **`prefers-reduced-motion`**: disable the marker pulse, rise-in, and hover transforms when requested.
- Run **axe / pa11y**; target zero serious/critical violations.

### Secondary (cheap, do if time allows — not the focus)
- **Stable slug URLs** (`/shrine/data-darbar-lahore`) using a `Slug` column with fallback to a generated slug, plus redirects from legacy `?id=N`. Improves sharing/deep-linking.
- **Basic SEO**: per-shrine `<title>`, meta description, Open Graph/Twitter tags, and a generated `sitemap.xml`.

---

## 6. Phase 3 — Visual redesign (priority area, weighted equally with function)

- **Design system**: a coherent token set (color, type scale, spacing, radius, shadow, motion) — via CSS custom properties or a Tailwind theme. Replace ad-hoc values with tokens.
- **Typography**: keep Merriweather / Source Sans 3 for English, and **properly load and tune real Urdu fonts — Noto Nastaliq Urdu (display) and Noto Naskh Arabic (body).** Note: the CSS already *references* these fonts but the pages never load them — wire them into the build and set Urdu-specific line-height/size so Urdu reads beautifully, not as a fallback sans.
- **Dark mode**: the variables are already structured for it. Add a real dark theme with a toggle, system-preference default, and persistence; include a dark-appropriate map tile style.
- **Refined map experience**: cleaner default basemap styling, well-placed controls, branded/legible markers, tasteful transitions.
- **Detail-page polish**: stronger hero treatment, refined infobox, a nicer gallery (masonry/grid) and lightbox, cleaner contents nav, and a consistent vertical rhythm. **Fix the known RTL gallery bug** (gallery column order doesn't reverse in Urdu).
- **States**: loading skeletons, and improved empty/error states (build on the existing welcome card and error card).
- **Micro-interactions**: subtle and consistent, always reduced-motion aware.
- Deliver **before/after screenshots** (desktop + mobile, EN + UR, light + dark).

---

## 7. Engineering quality bar

- TypeScript, typed data model, no `any` escape hatches without justification.
- Small, single-responsibility components/hooks; no mega-files.
- Unit tests for the data layer (CSV parsing, column aliasing, heading splitting, gallery numbering, Urdu fallback) and any non-trivial utilities.
- Error boundaries + graceful degradation when the CSV fails (retry + cached data).
- No secrets in client/git; `.env.example` documented; keyless tile fallback verified.
- Update `README.md` and `HANDOFF.md` to reflect the new stack, dev/build/deploy steps, env vars, and the data workflow.

## 8. Out of scope / do not touch

- Do **not** rewrite the Python OCR pipeline, `build_translation_cache.py`, or `google-apps-script/Code.gs`.
- Do **not** change the Google Sheet's column schema (the new data layer must read the existing columns).
- Do **not** introduce paid runtime APIs, enable the public editor, or commit API keys / the large PDF / OCR models.

---

## 9. Definition of done (verification)

Verify and report on all of the following before calling it complete:
1. App builds and `preview` runs; output deploys as static files.
2. **Both languages fully functional, including RTL** — manually toggle EN↔UR on the map and on a detail page and confirm layout, fonts, and direction.
3. **Data workflow preserved** — demonstrate that editing the sheet (or its cached CSV) surfaces on the running site without a code change (or, if Astro was chosen, that the auto-rebuild fires).
4. **Lighthouse ≥ 90** (Perf/A11y/Best Practices/SEO) on the map page and a detail page, mobile profile — paste the scores.
5. **Accessibility**: axe/pa11y report with no serious/critical violations, and a keyboard-only walkthrough passes.
6. **Responsive QA** at mobile/tablet/desktop with screenshots; light + dark; EN + UR.
7. No secrets in the repo; large binaries excluded; README/HANDOFF updated.
8. **Free-to-run verified**: a dependency audit shows every package is free + OSI-permissive (list them); the site builds and deploys to free static hosting; and it loads and is fully usable on a fresh clone with **no** API keys, accounts, or paid services (open-data tiles by default).

---

## 10. How to work

1. **Explore first**, then post a concise **plan**: the recommended stack with the runtime-vs-build-time data tradeoff spelled out, the proposed folder structure, the phase order, and any decisions you need from the maintainer (MapTiler key handling, data strategy, dark-mode default). **Wait for sign-off before the large rewrite.**
2. Work in **reviewable phases** with incremental commits; keep `main` deployable throughout.
3. **Port, then improve** the existing parsing/i18n logic — don't discard hard-won behavior.
4. State assumptions explicitly; if something is ambiguous, ask rather than guess. Prefer the simplest solution that satisfies the goal; flag anything that feels over-engineered.
5. Keep documentation current as you go.

**Questions to confirm with the maintainer up front:** (a) default stack Vite+React+TS, or Astro with auto-rebuilds? (b) how should the MapTiler key be provisioned, or should we standardize on keyless CARTO/Esri tiles? (c) dark mode default — follow system, or light-first?
