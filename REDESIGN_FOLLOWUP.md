# Sufi Shrines — Complete Build Plan (Claude Code)

This is the **single source of truth** for the remaining work on the Sufi Shrines app — work through it as lead designer + senior front-end engineer. (The earlier standalone prompts — original Part 1/2 redesign, P0 stabilization, and the advanced roadmap — are folded in here or archived under `archive/old-prompts/`.) It has four parts:

- **Part A — Core fixes:** four correctness/UX bugs that must be right.
- **Part B — Professional polish:** the portfolio-grade design pass.
- **Part C — Foundation roadmap (P0–P5):** stabilize the foundation — archive legacy code, add CI, make the data layer fail-safe, fix PWA icons, stable permalinks.
- **Part D — Advanced roadmap:** the ambitious, longer-horizon features — advanced map (including a **nearby-amenities / restaurants & POI layer**), SSG/SEO, worker search, design system, testing, performance.

**Suggested execution order:** Part A → Part C's **P0** (stabilize) → Part B (polish) → then Part D's tracks in the recommended sequence at the end. Each part has its own Definition of Done — satisfy it before moving on, and work in small, reviewable PRs.

**The bar:** treat this like a piece you'd put at the top of your portfolio and ship to a real client. Every screen intentional, cohesive, and finished — no default browser styling, no ragged states, no dead ends, nothing that looks unfinished in either theme or either language.

**Constraints:** don't break Urdu/RTL or dark mode; light theme stays the default; build everything on the existing tokens in `src/styles/tokens.css` (no ad-hoc colors/spacing/radii). Prefer minimal dependencies, but small, well-maintained additions (e.g. a marker-cluster plugin or a lightweight accessible lightbox) are acceptable where they clearly elevate the result. Run `npm run typecheck`, `npm run lint`, and `npm run build` before finishing, and verify both themes and both languages.

---

# Part A — Core fixes

## 1. The search bar still looks weird — make it one clean, modern control
**Files:** `src/components/map/MapSidebar.tsx` (the `.search-bar` / `.search-input-wrap` / `.search-input` markup), `src/styles/map.css`.
Right now the search field reads as a thin, half-styled input. Rebuild it as a single, polished search control:
- One pill (or soft 10–12px radius) container with a subtle border + faint inner/elevation shadow that sits on `--color-bg-surface`, clearly distinct from the panel background.
- Magnifier icon inline on the leading side, properly centered; the clear (×) button on the trailing side, only visible when there's text, with a hover state.
- Smooth focus state: border turns `--color-primary` with a soft `--color-primary-pale` focus ring (no harsh default outline).
- Comfortable height (~40–44px) and padding so the icon, text, and × never crowd or overlap. Placeholder in `--color-text-muted`.
- Must mirror correctly in RTL (icon/clear swap sides) and look right in dark mode.
Make it feel like the search field in a polished maps app, not a raw `<input>`.

## 2. The left panel must never feel full-screen
**Files:** `src/styles/map.css` (`.sidebar` and the `@media (max-width: 768px)` block), `src/pages/MapPage.tsx`, `src/components/map/MapSidebar.tsx`.
- Desktop/laptop: the sidebar is a fixed docked panel (≈360–400px) with the map always clearly visible beside it. It must not stretch wider than that or cover the map.
- Tablet/mobile: a contained slide-over of sensible width (e.g. `min(380px, 90vw)`) with a dim backdrop — never the entire viewport.
- The panel's width must stay constant whether the search list or the shrine detail is showing (see #3); switching views should not resize or "take over" the screen.
- Confirm by resizing the browser live: no full-width takeover at any width, and no content clipped at the panel edges.

## 3. Clicking a shrine should collapse the list and show only that shrine
**File:** `src/components/map/MapSidebar.tsx`.
Today, selecting a shrine from the "Table of Shrines" list keeps the full search/list view open (it only collapses on `window.innerWidth <= 768`). Change it so that **selecting any shrine — from the list, from search results, or by clicking its map marker — collapses the list and shows the compact shrine detail/preview card** (the `ShrinePreview`), on every screen size. In other words, drive the detail view from selection: when a shrine is selected, hide the list and show its preview; the user can reopen the full list via the "Table of Shrines" button. This should match the behavior shown in the second reference screenshot (search → click result → panel switches to just the Data Darbar card). Keep the transition smooth.

## 4. The shrine detail page is missing its main body text ("does not show the information")
**Files:** `src/components/shrine/ShrineArticle.tsx`, `src/lib/data/articleParsing.ts` (helpers), with the page assembled in `src/pages/ShrinePage.tsx`.
On a detail page (e.g. `/shrine/data-darbar-0`) the hero image and Gallery render, but the article body — the actual description/overview text about the shrine — never appears, even though the sidebar preview card clearly has description text for the same shrine.
**Root cause:** `ShrineArticle` builds `leadText` as "everything before the first heading line," which is empty whenever the Description field *starts* with a heading; and it pulls sections only from dedicated columns via `buildArticleSections`, so any content authored as inline headings inside the Description is dropped. The Description's real content is therefore never rendered.
**Fix:** Render the full article from the Description. There's already a `parsedArticleFromRow` / `parseInlineSections` / `extractLeadPreviewText` set of helpers in `articleParsing.ts` built for exactly this — use them so the page shows (a) the lead/overview paragraphs and (b) the inline sections parsed from the Description, in addition to any dedicated-column sections. As a safety net, if no lead and no sections are found but the Description has text, render the Description text directly. Verify on Data Darbar (and a couple of other shrines) that the overview paragraphs and section headings now appear between the hero image and the Gallery, with the Contents nav reflecting them. Must work in English and Urdu.

---

## Definition of done — Part A (core fixes)
1. Search bar is a single, polished control with proper icon/clear placement, smooth focus ring, correct in RTL + dark mode.
2. The left panel is a tasteful docked sidebar (desktop) / contained slide-over (mobile) — never full-screen, never clipped, constant width across views (resize live to confirm).
3. Clicking a shrine anywhere (list, search, or map marker) collapses the list and shows just that shrine's preview card, on all screen sizes; the "Table of Shrines" button reopens the list.
4. Shrine detail pages show the full article body (overview + sections) from the Description; verified on Data Darbar + 2 others, in English and Urdu.
5. `npm run typecheck` and `npm run build` pass; Urdu/RTL and dark mode still work.

# Part B — Professional polish (portfolio-grade)

Goal: take the app from "works and looks decent" to "a senior product designer obviously shipped this." North-star references: the spatial clarity of **Apple Maps** place cards, the editorial calm of a **National Geographic / Smithsonian** feature, and the quiet confidence of **Linear / Vercel** UI. Implement these on top of Part A.

**Design language — apply consistently, all from `src/styles/tokens.css`:**
- Light, warm, quiet: cream/ivory canvas, white elevated surfaces, deep-green primary for action/brand, gold strictly as a sparing accent.
- Type: Merriweather for titles/headings only; Source Sans 3 for everything else; Noto Nastaliq Urdu for Urdu (taller line-height). Reuse one type scale (`--text-*`).
- One rhythm each for spacing (`--space-*`), radius (`--radius-*`), elevation (`--shadow-*`), and motion (`--duration-*` / `--easing*`). Nothing should bypass the tokens with ad-hoc px values.
- One icon system: keep the inline Feather-style line icons, all `0 0 24 24` viewBox at a consistent ~1.75 stroke. No mixed icon styles.

## B1. The map (the centerpiece)
- **Theme-aware tiles:** in dark mode default the base layer to CARTO `dark_all` (`https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png`); in light mode use Voyager. Keep the layer switcher, but auto-select the correct base layer when the theme changes so the map never looks out of place.
- **Custom markers:** replace the plain dot with a refined marker — a clean teardrop pin or a solid dot with a soft drop shadow and white ring. Differentiate the three categories (Muslim Shrine / Hindu Temple / Sikh Gurdwara) by color and/or a tiny inline glyph, via a shared category-color map (define category color tokens). Selected = larger, gold ring, subtle pulse (respect `prefers-reduced-motion`); hover = gentle scale + raise.
- **Hover tooltip:** on desktop, show the shrine name in a small branded tooltip on marker hover.
- **Clustering:** add marker clustering (e.g. `leaflet.markercluster`) with branded cluster bubbles (green circle, white count, smooth spiderfy/zoom on click). This is the single biggest "professional" upgrade for a dense map — Lahore/Punjab currently overlap badly.
- **Controls:** restyle the zoom + layer controls to match the UI (rounded, soft-shadowed, themed), shrink/mute the attribution, and add a small "Reset view" control that flies back to the default center/zoom.
- **Selection framing:** the `flyTo` from Part A should offset horizontally by ~half the sidebar width on desktop so the selected marker lands in the visible map area, not behind the panel.

## B2. Sidebar, search & list
- **Category color-coding:** the filter chip, the list-row image placeholder, and the map marker for a category should share one accent color so the taxonomy reads instantly.
- **List rows:** fixed thumbnail (~56–64px, rounded); when `imageUrl` is missing, render a category-tinted placeholder tile with the category glyph (never a ragged row); name truncated with ellipsis; muted location meta; a chevron that appears on hover; selected = left accent bar + faint tint.
- **Sticky group headers:** category group headings stick to the top while scrolling within that group.
- **Search niceties:** focus the field with the `/` key; bold the matched substring in results; clearly show "N results" and the active filter; slim, custom-styled scrollbar.
- **Skeletons:** while data loads show shimmer skeleton rows, not a bare spinner.

## B3. Shrine detail page (make it editorial)
- **Breadcrumb:** Home › Category › Shrine name (localized), subtle and clickable.
- **Hero:** large rounded image with a soft bottom gradient scrim and an optional caption/credit; if there's no image, a tasteful branded gradient block with the dome glyph instead of empty space.
- **Lead paragraph:** slightly larger, calm color, with line length capped (~70ch) for readability.
- **ContentsNav:** sticky on desktop with **scroll-spy** (the current section highlights as you scroll); on mobile it collapses into a compact "On this page" dropdown or hides.
- **Section rhythm:** consistent spacing between sections; headings get a subtle accent rule; tasteful pull-quote styling for notable lines is welcome.
- **Infobox:** sticky on desktop; clean label/value rows; a colored category badge; coordinates; and clear external actions (Wikipedia link if present, Get Directions).
- **Gallery:** uniform responsive grid, hover zoom, click → an accessible **lightbox** (focus trap, Esc to close, arrow-key nav, captions); fix the RTL column order in Urdu.
- **Related shrines:** uniform cards with the same image-fallback treatment, a category badge, the existing distance ("· 33 km away"), and a gentle hover lift.
- **Reading progress bar:** a slim brand-colored progress indicator pinned to the very top of the page.
- **Share:** show a small toast ("Link copied") on success instead of copying silently.

## B4. Motion & micro-interactions
Use the motion tokens for: sidebar slide, list hover/select, chip select, marker hover/select, theme + language toggle, a subtle page transition (cross-fade/slide) between map and detail, lightbox open/close, toast in/out, and the map fly-to easing. Everything subtle and consistent; everything curbed under `prefers-reduced-motion`. No instant, janky state flips.

## B5. States — never leave a dead end
Design every state instead of falling back to browser defaults:
- **Loading:** shimmer skeletons (sidebar list + detail page).
- **Empty search:** on-brand "no matches" showing the search term, with a "clear filters" action.
- **Welcome / no selection:** the existing welcome card, refined — inviting icon, one-line value prop, a hint to search or tap a marker.
- **Error:** friendly message + Retry, on-brand (not a raw alert).
- **404 / unknown route:** a designed not-found page with a route back to the map.
- **Offline (PWA):** a simple branded offline notice; the app still shows cached/bundled shrines.

## B6. Header, brand & navigation
- A cohesive brand lockup (dome mark + "Sufi Shrines" wordmark, with the Urdu wordmark in Urdu mode), consistent across the map header and the shrine-page header.
- Theme and language toggles as polished, equally-sized controls with clear hover/active/focus states (consider a small segmented control for language: `EN | اردو`).
- A persistent, unobtrusive way back to the map from any shrine page.

## B7. Responsive, like a real maps product
- **Mobile:** the shrine preview should appear as a **bottom sheet** over the map (drag handle, snaps between peek and full) the way Apple/Google Maps do — not a panel that hides the map. The full list is a sheet that expands from the bottom. The map stays the primary surface.
- **Tablet:** a narrower docked sidebar.
- **Desktop:** docked sidebar + map (per Part A #2).
- Touch targets ≥ 44px; test explicitly at 360, 768, 1024, and 1440px.

## B8. Accessibility to a professional standard
- Visible token-based `:focus-visible` rings on every interactive element; a skip-to-content link; logical tab order.
- Full keyboard operation of the map markers and the list; move focus to the shrine heading on route change; trap focus in the lightbox.
- AA contrast verified in **both** light and dark themes (re-check muted text especially).
- Correct `aria-*`, `lang`/`dir` on Urdu content, and `prefers-reduced-motion` honored everywhere.

## B9. Performance & finishing details
- Images: set explicit aspect ratios/dimensions to eliminate layout shift, lazy-load below the fold, and use the category-gradient fallback on error.
- Fonts: `preconnect` to font hosts + `font-display: swap`; verify no flash/jank; tune the Urdu line-height.
- Route-level code splitting for the shrine page; run a Lighthouse pass targeting ≥90 Performance / 100 Accessibility / 100 Best-Practices / ≥90 SEO.
- A consistent favicon/app-icon set (coordinate with the PWA icon work in P0).

*(B1 clustering and B9 image/code-split overlap with P3 in Part C — implementing them here as part of the polish is encouraged.)*

---

## Definition of done — Part B (professional polish)
1. **Map:** theme-aware tiles, custom category markers with hover/selected states, hover tooltips, clustering with branded bubbles, restyled controls + reset-view, sidebar-aware fly-to.
2. **Sidebar/list:** category color-coding, polished rows with image fallbacks, sticky group headers, search niceties (/, match highlighting), shimmer skeletons.
3. **Detail page:** breadcrumb, hero with scrim, scroll-spy ContentsNav, sticky infobox with badges, accessible gallery lightbox (RTL fixed), polished related cards, reading-progress bar, share toast.
4. **System:** designed loading/empty/error/404/offline states; cohesive brand header; mobile bottom-sheet; motion + micro-interactions on all controls.
5. **A11y & perf:** AA contrast both themes, full keyboard + focus management, reduced-motion honored; no layout shift; Lighthouse targets met.
6. Cohesive across both themes and both languages; nothing uses default browser styling; no dead-end states.
7. `npm run typecheck`, `npm run lint`, and `npm run build` pass.

## Global QA & consistency checklist (run before calling it done)
1. Walk **every** screen in light + dark and EN + Urdu — visuals cohesive, nothing clipped, RTL correct.
2. Resize 360 → 1440px — sidebar/sheet behaves, map always usable, no overflow.
3. Tab through every screen — visible focus everywhere, logical order, lightbox/route focus handled.
4. Go offline — cached/bundled data renders, the offline state shows, nothing crashes.
5. Every interactive element has hover / active / focus / disabled states drawn from the tokens.
6. No ad-hoc colors/spacing/radii/shadows bypassing `tokens.css`; one icon style throughout.
7. Turn on reduced-motion — large animations gone, transitions curbed.

---

# Part C — Foundation roadmap (senior engineering review · P0–P5)

*Written as the project's lead engineer / engineering director after reviewing the repo as it stands. The four fixes above are the immediate UX work. This section is the bigger picture: what's healthy, what's risky, and the order I'd actually do things in. Read this first, then execute in phases — don't skip P0 to chase features.*

## Executive summary

The product is in good shape on the surface — the React + Vite + TypeScript rewrite is a real upgrade over the old vanilla-JS site, the design is modern, and the core flows work. But the repo is carrying **hidden risk and tech debt that will slow every future change and can take the live site down**. Before we build anything new, we stabilize the foundation: kill the dead legacy codebase, lock the build with CI, and make the data layer fail safe. Then finish the in-flight UX fixes, add tests for the things that actually broke, and only then invest in scale and growth.

**The one-line priority:** *Stabilize → Finish → Prove it with tests → Scale.* Roughly 1–2 focused weeks gets us to "production-ready and safe to iterate on."

## What's healthy (keep doing this)
- Clean React/Vite/TS architecture: sensible folder structure, typed data model, separated data/i18n/UI layers.
- Thoughtful i18n (English/Urdu with a 3-tier fallback) and RTL awareness baked in from the start.
- PWA + runtime caching configured (Sheets/tiles/fonts), manual vendor chunking, a `useMediaQuery` hook already added.
- Some unit tests exist for the data/parsing layer.

## Top risks (in priority order)

**R1 — Split-brain repo (HIGH).** ~5,900 lines of legacy vanilla JS (`app.js`, `shrine.js` @ 2,389 lines, `style.css` @ 2,100, `shrine.html`, `data-source.js`, `editor-config.js`, `translations.js`) are still in the tree and show as modified, even though `index.html` only loads `/src/main.tsx`. This is dead code that confuses contributors, doubles the surface area, and will cause someone to "fix" the wrong file. `HANDOFF.md` still documents this old app, so the project's own docs are actively misleading.

**R2 — No CI / no quality gate (HIGH).** There's no `.github/workflows`. Nothing runs typecheck, lint, tests, or build on push. The map/zoom/loading bugs we just chased could have been caught (or at least not regressed) by an automated gate. Right now "it works on my machine" is the only check.

**R3 — Single-point-of-failure data layer (HIGH).** The app fetches a single **public Google Sheets CSV at runtime**. If Sheets is slow, rate-limits, changes its export format, or is blocked on a network, the site degrades to a stale localStorage cache or an empty map. The committed `data.csv` is a 1-row stub and isn't even wired into the fallback path. There's no schema validation, so one malformed row silently breaks a shrine.

**R4 — Missing PWA assets (MEDIUM).** `vite.config.ts`/`index.html` reference `pwa-192x192.png`, `pwa-512x512.png`, and `apple-touch-icon.png`, but `public/` only contains `_redirects`, `favicon.svg`, and `robots.txt`. Install/manifest will 404 and the "Add to home screen" experience is broken.

**R5 — Thin test coverage where it matters (MEDIUM).** Tests cover parsing helpers, but nothing covers selection→map-zoom, the location mini-map, sidebar responsiveness, or article rendering — i.e. exactly the areas that have been breaking.

**R6 — Branch & release hygiene (LOW–MEDIUM).** Active work is on branch `1.2` (not `main`), stale `1.1`/`1.2` branches linger, commit history mixes numeric tags (`1.11.5.3`) with semantic messages, and the legacy-file modifications are uncommitted. A 258 MB `AFADA-E-KABIR.pdf` and OCR `traineddata` are now git-ignored but may already be bloating git history.

---

## The roadmap

### P0 — Stabilize the foundation (do first; ~2–4 days)
1. **Retire the legacy app.** Confirm the React app is the only entry (it is), then move `app.js`, `shrine.js`, `style.css`, `shrine.html`, `data-source.js`, `editor-config.js`, `translations.js`, and the old `data.csv`/`map.geojson` into an `legacy/` archive folder or — cleaner — delete them and preserve them via a `pre-react` git tag. Net: ~5,900 LOC removed from the active surface. *(S)*
2. **Rewrite `HANDOFF.md`** to describe the actual React app (entry, build, data flow, deploy). Fold `CLAUDE_CODE_PROMPT.md` history into a short `CHANGELOG`. *(S)*
3. **Add CI (GitHub Actions):** on every PR run `npm ci`, `typecheck`, `lint`, `test`, `build`. Turn on branch protection for `main` requiring the check to pass. This is the single highest-leverage change in the whole list. *(S)*
4. **Make the data layer fail safe:** commit a real, full CSV/JSON snapshot of the sheet (generated at build time) as the genuine offline/error fallback, wire it into `useShrineData`'s catch path (today it only falls back to localStorage), and add lightweight schema validation that logs/skips malformed rows instead of breaking silently. *(M)*
5. **Fix PWA assets:** generate the referenced icons into `public/` (or remove the references) so the manifest and Apple touch icon resolve. *(S)*
6. **Branch cleanup:** commit or revert the dangling legacy modifications, merge work onto `main`, delete stale branches, adopt a simple `main` + short-lived feature branches + semver tags convention. *(S)*

### P1 — Finish the in-flight UX work (~1–2 days)
Land the four fixes at the top of this file (search bar, sidebar width, click-to-collapse, missing article body), **then immediately add regression tests for each** so they can't silently break again.

### P2 — Prove correctness with tests (~2–3 days)
1. **Component/interaction tests** (Vitest + React Testing Library): selecting a shrine from list/search/marker calls `flyTo`; sidebar opens/collapses across breakpoints; `LocationMap` renders a map rather than a permanent skeleton; `ShrineArticle` renders body text from `Description`. *(M)*
2. **One Playwright smoke test** for the critical path: load map → search "data" → click result → assert detail card shows + map zoomed; open a shrine page → assert article text present + location map rendered. Wire it into CI (can be nightly to keep PRs fast). *(M)*
3. Add a top-level **error boundary** and audit empty/error/loading states. *(S)*

### P3 — Performance & scale (~2–4 days)
1. **Marker rendering:** `ShrineMarkers` currently tears down and re-creates *all* markers on every `selectedId` change (the effect depends on `selectedId`). At 109 shrines it's tolerable but causes churn/flicker and won't scale. Refactor to create markers once and update only the changed marker's icon, keyed by id. *(M)*
2. **Marker clustering** (`leaflet.markercluster` or supercluster) for dense regions (Lahore/Punjab) and future growth. *(M)*
3. **Image hardening:** set width/height to avoid layout shift, lazy-load below the fold, and proxy/cache external images (many are Wikipedia hotlinks — fragile and a mixed-content risk). *(M)*
4. **Route-level code splitting:** lazy-load `ShrinePage` so the map route ships less JS; run a bundle analysis. *(S)*

### P4 — Data model & content pipeline (~3–5 days, ongoing)
1. **Stable permalinks:** add an immutable `Slug` column in the sheet (e.g. `data-darbar-lahore`) instead of the index-suffixed `data-darbar-0`, with redirects for old URLs. Reordering rows must never change a shrine's URL. *(M)*
2. **Mature the OCR/translation pipeline** (`process_books.py`): document it, add a QA/validation step, and record source/provenance for each generated section so content is auditable for a research project. *(M)*
3. **Plan the editorial backend's future:** a single Google Sheet is fine at ~100 shrines but will strain editorially as it grows and offers no validation, versioning, or review. Evaluate moving content into versioned JSON-in-repo (PR-reviewed) or a lightweight headless CMS when the dataset or contributor count grows. *(L, later)*
4. **Move large research assets** (the 258 MB PDF, `traineddata`) to Git LFS or external storage; assess whether git history needs cleanup. *(S–M)*

### P5 — SEO, accessibility & insight (~2–4 days)
1. **SEO / shareability:** the site is a client-rendered SPA, so shrine links have weak previews and poor indexing. Add per-shrine meta/OG tags and **prerender/SSG the ~109 shrine routes** (e.g. `vite-react-ssg` or a prerender step) plus a sitemap. High value for a public research artifact. *(M–L)*
2. **Accessibility pass:** keyboard nav for map markers, focus management on route change, AA contrast in both themes, and the known RTL gallery-order fix. *(M)*
3. **Privacy-friendly analytics** (e.g. Plausible) to learn which shrines and languages people actually use, informing content priorities. *(S)*

---

## Definition of "production-ready"
We can confidently call this done and safe to iterate on when: the legacy code is gone, CI gates every PR, the site renders correctly even if Google Sheets is unavailable, the critical user path is covered by automated tests, shrine URLs are stable, and the PWA installs cleanly. Everything in P3–P5 is real value but should come *after* that foundation is solid.

*Effort key: S ≈ <½ day, M ≈ ½–2 days, L ≈ multi-day. Sizes assume one engineer working with Claude Code.*

---

# Part D — Advanced roadmap (beyond the foundation)

*The full advanced roadmap. It builds **above** Parts A–C — it assumes the core fixes, the polish pass, and the P0–P5 foundation are done or in flight, and does not repeat them.*

## Assumptions (stated up front)
1. **Ambition level:** flagship public-facing product *and* a credible Harvard research artifact — citable, accessible, durable. I'm proceeding at the most ambitious reasonable bar rather than asking, because every prior instruction has pushed toward "very professional / portfolio-grade."
2. **The foundation is being handled separately and is a prerequisite.** This roadmap assumes the four core fixes (Part A), the polish pass (Part B), and the P0–P5 foundation work (Part C) are done or in flight: legacy archived, CI exists, the data layer is fail-safe with a committed snapshot, PWA icons exist, and slug-based permalinks are in place. I **build above** those and explicitly do not repeat them.
3. **Scale:** the dataset grows from ~109 toward several hundred entries across multiple faiths/regions. Design for 500+.
4. **Hosting stays static** (Netlify/Cloudflare Pages — note the existing `public/_redirects`). No always-on backend. Advanced features must remain static-compatible or add only build-time / lightweight serverless steps.
5. **New dependencies introduced here** (MapLibre GL, a search index lib, Playwright, Storybook, Lighthouse CI) are each justified per item; adopt them deliberately, not all at once.

*Effort key: **S** ≈ <½ day · **M** ≈ ½–2 days · **L** ≈ 3–5 days · **XL** ≈ 1–2 weeks. Sizes assume one engineer working with Claude Code.*

---

## 1. Executive summary

The foundation work makes the site stable and the redesign makes it beautiful. This roadmap makes it *significant*: a spatial, bilingual, citable atlas that scales in content and holds up to scholarly and public scrutiny.

Six tracks, with a deliberate sequence. **Do the force-multipliers first** — a real design system (Track 4) and a test/quality pyramid (Track 5) — because every later change rides on them and they prevent the regressions we've already seen (map zoom, stuck map, missing article body). Then invest in the headline product bets:

- **Track 1 — Spatial experience:** make the map a *product*, not a backdrop — deep-linkable state, vector tiles (MapLibre), real clustering + heatmap, faceted + time-aware filtering, and guided "story-map" tours.
- **Track 2 — Content, integrity & SEO:** prerender every shrine to a fast, citable, richly-previewed page with structured data; mature the OCR→review→publish pipeline with source provenance.
- **Track 3 — Discovery:** worker-based fuzzy/full-text/geo search that stays instant at 500+ entries.
- **Track 6 — Performance, resilience & observability:** image CDN, offline-first PWA, web-vitals + error tracking, accessibility beyond AA.

**Recommended order:** T4 + T5 (foundation for quality) → T1.1 deep-linkable state + T3 search (cheap, high-impact) → T2 SSG/SEO → T1.2–T1.6 advanced map → T6 polish/resilience. Trade-off to accept early: investing ~1 week in design-system + testing before shipping new features feels slow, but it's what turns this from "a nice project" into "a maintainable product."

---

## 2. Current-state assessment (grounded in the code)

What exists today (verified):
- **Stack:** React 18 + Vite 5 + TS, `react-leaflet` 4 / Leaflet 1.9 with CARTO Voyager default (`src/components/map/ShrineMap.tsx`), data via PapaParse from a published Google Sheets CSV (`CSV_URL` in `src/lib/data/constants.ts`, fetched in `src/hooks/useShrineData.ts` with a localStorage cache + background refresh). PWA configured in `vite.config.ts`. ~4,850 LOC in `src/`.
- **Data model (`src/types/shrine.ts`, `src/lib/data/shrineModel.ts`):** `Shrine.id` is the **CSV row index**; `slug` uses an explicit `Slug` column if present, else `buildSlug(name, id)` → **unstable** (`data-darbar-0`) if rows reorder. `Founded` is **free-text** ("11th Cent") with no numeric/era value. There is **no "Sufi order/silsila" field**. `haversineKm` and `findRelatedShrines` (category+location+distance scoring) already exist.
- **Search (`src/components/map/MapSidebar.tsx`):** a `useMemo` substring scan over all fields, debounced 200ms, **on the main thread**. No fuzziness, no ranking, no highlighting.
- **Map state:** selection lives in `MapPage.tsx` React state; **nothing is reflected in the URL** — you can't share or deep-link a selected shrine, filter, or viewport.
- **SEO:** `ShrinePage.tsx` sets `document.title` and the meta description **imperatively at runtime**. No SSG/prerender, no JSON-LD, no per-shrine OG image, no sitemap — so as a client-rendered SPA, shrine links preview poorly and index weakly.
- **PWA:** runtime caching is configured for Sheets/tiles/fonts, but `public/` contains only `_redirects`, `favicon.svg`, `robots.txt` — **the manifest icons are missing** (addressed in P0).
- **Quality:** three unit tests only (`src/lib/data/__tests__/*`, `src/lib/i18n/__tests__/*`). **No component, E2E, visual, or a11y tests; no CI** (`.github/` absent).
- **UI engineering debt:** several components carry **inline styles** that bypass the token system (e.g. the "Table of Shrines" button block in `MapSidebar.tsx`, the header in `ShrinePage.tsx`, parts of `LocationMap.tsx`).
- **Images:** external hotlinks (largely Wikipedia) — fragile, no responsive sizing, layout-shift risk.

Constraints to respect: static hosting, no backend, a single editable Google Sheet as the source of truth, and bilingual EN/Urdu (RTL) as a first-class requirement.

---

## 3. Vision / north star

**"The definitive bilingual digital atlas of South Asian Sufi and allied sacred sites."** A pilgrim plans a visit, a traveller discovers nearby shrines, and a scholar cites a durable, sourced page — all from the same product.

Design principles:
- **Spatial-first.** The map is the primary interface and is shareable, filterable, and time-aware.
- **Editorial depth, sourced.** Every shrine page reads like a feature and carries citations/provenance.
- **Citable & durable.** Stable URLs, prerendered pages, structured data, archival-friendly.
- **Bilingual as first-class.** EN/Urdu parity in content, typography, numerals, and RTL behavior — never an afterthought.
- **Radically accessible & fast everywhere.** AA minimum (AAA where feasible), offline-capable, sub-second on a mid-range Android.

---

## 4. The advanced roadmap (phased by track)

### Track 1 — Spatial experience (make the map a product)

**T1.1 — Deep-linkable, shareable map state · (M)**
- *Rationale:* Today you can't share "the map centered on Lahore with Muslim shrines filtered and Data Darbar selected." This is the single cheapest high-impact upgrade and unlocks T3.2 and social sharing.
- *Scope:* Encode viewport (`lat,lng,z`), `selected` slug, active `category`/facets, and search query in URL query params; restore on load; update on interaction (debounced, `history.replaceState`). Make the selected-shrine fly-to read its target from the URL.
- *Files:* `src/pages/MapPage.tsx` (lift state to URL via `useSearchParams`), `src/components/map/ShrineMap.tsx`, `src/components/map/MapSidebar.tsx`.
- *Dependencies:* none (react-router already present).
- *Risks:* history spam / back-button noise — use `replaceState` for viewport, `pushState` only for selection.
- *Acceptance:* copying the URL and opening it in a fresh tab reproduces viewport + filters + selection exactly; back/forward behaves sanely; verified EN + Urdu.

**T1.2 — Migrate the base map to MapLibre GL (vector tiles) · (XL)**
- *Rationale:* Raster Leaflet is fine but caps the ceiling: vector tiles give crisp retina rendering, runtime light/dark styling without swapping tile servers, client-side label localization, smooth pitch/zoom, and far better clustering/heatmap performance at scale.
- *Scope:* Introduce `maplibre-gl` (+ `@vis.gl/react-maplibre` or a thin wrapper); self-host or key a vector style (e.g. MapTiler/Protomaps — note `VITE_MAPTILER_KEY` already supported); port markers, popups, controls, and the fly-to; wire `mapbox-gl-rtl-text` for Arabic/Urdu labels; keep a Leaflet fallback flag until parity is proven.
- *Files:* replace internals of `src/components/map/ShrineMap.tsx`, `ShrineMarkers.tsx`; new `src/components/map/style/` for map styles; `src/styles/map.css`.
- *Dependencies:* T1.1 (state model) should land first; coordinate with T6.2 (tile caching).
- *Risks:* largest item here — bundle size (~200–800KB), a style/key cost, and a real porting effort. **Trade-off:** only do this once clustering/heatmap/perf demands exceed what Leaflet handles. If time-boxed, T1.3–T1.6 can ship on Leaflet first.
- *Acceptance:* feature-parity with the Leaflet version (markers, selection fly-to, layer/zoom controls, RTL labels, light/dark), equal-or-better Lighthouse, and a documented rollback flag.

**T1.3 — Real clustering + optional density heatmap · (M)**
- *Rationale:* Lahore/Punjab markers overlap badly today; clustering is the biggest legibility win at current scale and essential at 500+.
- *Scope:* Branded clusters (count bubbles, spiderfy/zoom on click) via `leaflet.markercluster` (Leaflet) or native MapLibre cluster layers; a toggleable heatmap layer (`leaflet.heat` or MapLibre `heatmap`) for density storytelling.
- *Files:* `src/components/map/ShrineMarkers.tsx` (and refactor it — see note), `src/styles/map.css`.
- *Dependencies:* benefits from T1.2; works on Leaflet today.
- *Risks:* `ShrineMarkers.tsx` currently **tears down and recreates all markers on every `selectedId` change** — clustering will amplify that churn. Refactor to build markers once and update only the changed marker (P3 in Part C). Do that refactor as part of this item.
- *Acceptance:* dense regions cluster smoothly, expand on click, and selection still flies to the right marker; no full marker-layer rebuild on selection; heatmap toggles cleanly.

**T1.4 — Faceted filtering (category · region · saint · order) · (M, content-dependent)**
- *Rationale:* "All / Hindu Temple / Muslim Shrine / Sikh Gurdwara" chips are a start; scholars and pilgrims want to filter by Sufi order (silsila), saint, province/region, and era.
- *Scope:* A facet panel driving both map and list, combinable, reflected in URL (T1.1). Derive region from `Location`; saint from `Sufi Saint`; **order/silsila requires a new `Sufi Order` column** (content dependency — coordinate with T2.4) — degrade gracefully when absent.
- *Files:* `src/components/map/MapSidebar.tsx`, `src/lib/data/constants.ts` (facet config), `src/types/shrine.ts` (+ optional `sufiOrder`), `src/lib/data/shrineModel.ts`.
- *Dependencies:* T1.1; content for order/region.
- *Risks:* facet explosion / empty states — cap, group, and show counts per facet value.
- *Acceptance:* multiple facets combine correctly, counts are accurate, state is shareable, and missing fields hide their facet rather than showing empties.

**T1.5 — Time-slider by founding era · (M, needs an era parser)**
- *Rationale:* A "scrub through centuries" control is a signature, research-grade feature that turns the atlas into a temporal story.
- *Scope:* New `src/lib/data/era.ts` to normalize free-text `Founded` ("11th Cent", "1325", "Mughal era") into a century/decade range with confidence; a brushed range slider that filters map + list and animates.
- *Files:* `src/lib/data/era.ts` (+ unit tests), a new `src/components/map/TimeSlider.tsx`, wire into `MapPage.tsx`/`MapSidebar.tsx` + URL.
- *Dependencies:* T1.1; data quality of `Founded`.
- *Risks:* messy/ambiguous source data — parser must bucket conservatively and exclude (not guess) unparseable values; surface "undated" as its own bucket.
- *Acceptance:* slider filters correctly, undated entries handled explicitly, parser covers the real values in the sheet (test against the live data), bilingual labels.

**T1.6 — Guided "story-map" tours · (L)**
- *Rationale:* Curated narrative journeys (e.g. "The Chishti trail", "Shrines of Lahore") are the difference between a database and an experience, and are highly shareable/teachable.
- *Scope:* A lightweight tour format (ordered stops + narrative + camera targets) authored in data; a step UI that flies between stops with scroll/next controls; deep-linkable per tour and step (T1.1).
- *Files:* new `src/components/map/StoryMode.tsx`, `src/lib/data/tours.ts` (+ a tours data source), routing `/?tour=chishti-trail&step=2`.
- *Dependencies:* T1.1, ideally T1.2 for smooth camera; tour content (T2.4).
- *Risks:* scope creep — ship one hand-authored tour end-to-end before generalizing.
- *Acceptance:* one complete tour works on desktop + mobile, is shareable at a given step, respects reduced-motion, and is fully bilingual.

**T1.7 — Nearby amenities & points-of-interest layer · (M–L)**
- *Rationale:* A pilgrim or tourist planning a real visit needs more than the shrine itself — where to eat, stay, park, pray, refuel, and find an ATM, pharmacy, or transport nearby. This turns the atlas from a catalog into a trip-planning tool and is a high-value, frequently-wanted feature. (The user explicitly asked for the map to show restaurants and other places alongside the shrines.)
- *Scope:* A toggleable **"Nearby" layer** on the same map showing categorized POIs — restaurants & cafés, hotels/guesthouses, transport (bus/rail/rickshaw stands), fuel, parking, ATMs/banks, pharmacies, public washrooms, and other nearby mosques — sourced from **OpenStreetMap via the Overpass API**, queried client-side around the selected shrine and/or the current viewport. Per-category toggles; **distinctly styled markers/icons** clearly separable from shrine markers; and a **"Nearby this shrine"** section on the detail page listing the closest amenities with distance (reuse `haversineKm` from `shrineModel.ts`) and a directions link. Cache responses (localStorage/IndexedDB), debounce by viewport, and query on demand to respect Overpass rate limits.
- *Files:* new `src/lib/poi/` (Overpass client, category config, cache), new `src/components/map/PoiLayer.tsx` + a layer-toggle in `src/components/map/MapSidebar.tsx`, a `NearbyAmenities` section in `src/pages/ShrinePage.tsx`, POI marker styles in `src/styles/map.css`.
- *Effort:* M–L.
- *Dependencies:* T1.1 (URL/viewport state); benefits from T1.3 clustering for dense POIs; T1.2 (MapLibre) optional.
- *Risks / trade-offs:* Overpass **rate limits + latency** (mitigate with on-demand queries, caching, and optionally a self-hosted Overpass or a prebuilt regional extract); OSM coverage varies across Pakistan; **ODbL attribution is required**. Google/Mapbox Places is higher-quality but adds **cost, an API key, and ToS limits** — recommend **OSM-first**, with a Places adapter behind a common interface if quality later demands it.
- *Acceptance:* toggling a category renders correctly-styled, visually-distinct POI markers near the shrine/viewport; the detail page lists the nearest restaurants/hotels with distance + directions; results are cached and Overpass is not hammered (debounced/on-demand); OSM is attributed; works in EN + Urdu and respects reduced-motion.

### Track 2 — Content, data integrity & SEO

**T2.1 — Prerender / SSG every shrine page · (L)**
- *Rationale:* The biggest gap for a public research artifact: a client-rendered SPA gives weak link previews and poor indexing. Prerendering ~109 (→500+) shrine routes makes each a fast, crawlable, citable document.
- *Scope:* Add SSG (`vite-react-ssg` or a prerender step) that builds the data snapshot at build time and emits static HTML per `/shrine/:slug` plus the map shell; hydrate to the current SPA. Reuse the committed data snapshot from P0 so the build needs no live fetch.
- *Files:* `vite.config.ts`, a new `src/routes.tsx`/entry for SSG, `src/pages/ShrinePage.tsx` (make data-loading SSG-friendly), build scripts in `package.json`.
- *Dependencies:* P0 committed data snapshot; stable slugs (T2.3).
- *Risks:* SSG + Leaflet/MapLibre need careful client-only guards; build time grows with content. **Trade-off:** adds build complexity vs. huge SEO/perf/shareability gain — worth it for a public artifact.
- *Acceptance:* `dist/` contains real HTML per shrine with correct `<title>`/meta in the markup (view-source, not just runtime); Lighthouse SEO ≥ 95 on a shrine page; no client-only crashes.

**T2.2 — Structured data, OG images & sitemap · (M)**
- *Rationale:* Make shrine pages first-class web citizens: rich Google results, clean social cards, full crawlability.
- *Scope:* Per-shrine JSON-LD (`Place` / `LandmarksOrHistoricalBuildings` with geo, name, image, sameAs→Wikipedia); replace runtime meta with build-time `<head>` tags; generate `sitemap.xml` and `hreflang` for EN/Urdu; per-shrine OG image (static hero or a build-time/edge-generated card).
- *Files:* `ShrinePage.tsx` head emission (SSG), a `scripts/generate-sitemap.mjs`, `public/` outputs, `index.html` defaults.
- *Dependencies:* T2.1.
- *Risks:* OG image generation can balloon — start with the existing hero image as the OG image; add generated cards later.
- *Acceptance:* JSON-LD validates in Google's Rich Results test; sitemap lists all shrines with hreflang; social cards render correctly for a sampled shrine.

**T2.3 — Stable, immutable permalinks · (S–M, builds on P0)**
- *Rationale:* `slug = buildSlug(name, id)` ties URLs to the CSV **row index** — reorder the sheet and shared/cited links break. Unacceptable for a citable artifact.
- *Scope:* Make an explicit, immutable `Slug` column the source of truth (the model already prefers it); generate-and-backfill slugs once; add a redirect map for any legacy `*-<index>` URLs.
- *Files:* `src/lib/data/slugify.ts`, `src/lib/data/shrineModel.ts`, `public/_redirects`, a one-off `scripts/backfill-slugs.mjs`.
- *Dependencies:* coordinates with P0 data work.
- *Risks:* existing shared links — ship redirects before flipping.
- *Acceptance:* every shrine has a stable slug independent of row order; reordering the sheet doesn't change any URL; legacy URLs redirect.

**T2.4 — Content model & pipeline maturation · (L, ongoing)**
- *Rationale:* For research credibility, content needs structure, provenance, and review — not just free-text cells.
- *Scope:* Extend the schema (`Sufi Order`, `Region/Province`, structured `Sources` with citations, image credits/licences); mature `process_books.py` into OCR → human review → publish with per-section source provenance surfaced on the page; document the editorial workflow; **evaluate** migrating from a single Sheet to git-based JSON (PR-reviewed) or a lightweight headless CMS as contributors/scale grow.
- *Files:* `src/types/shrine.ts`, `src/lib/data/constants.ts`, `HANDOFF.md`/new `CONTENT.md`, the Python tooling.
- *Dependencies:* informs T1.4/T1.5/T2.2.
- *Risks:* editorial process is human, not just code — keep the Sheet workflow working throughout any migration.
- *Acceptance:* a documented content model + workflow; at least the `Sources`/credits render with provenance on shrine pages; a written recommendation on Sheet-vs-git/CMS with a trigger threshold.

**T2.5 — Data integrity validation in CI · (M)**
- *Rationale:* One malformed row silently drops a shrine today. Validate the dataset as a build gate.
- *Scope:* A schema validator (e.g. Zod) run against the committed snapshot in CI: required fields, numeric lat/lng in-range, valid image URLs, unique slugs, parseable eras; fail the build (or warn) on violations and emit a report.
- *Files:* `src/lib/data/validate.ts`, `scripts/validate-data.mjs`, `.github/workflows/ci.yml`.
- *Dependencies:* P0 CI + snapshot.
- *Acceptance:* CI flags a deliberately broken row; report lists row, field, and reason; valid data passes clean.

### Track 3 — Discovery & search

**T3.1 — Worker-based fuzzy / full-text / geo search · (M)**
- *Rationale:* The current main-thread substring scan won't stay instant at 500+ and offers no ranking, typo-tolerance, or highlighting.
- *Scope:* Build a search index (FlexSearch / MiniSearch / Orama) over name, location, saint, category, and description; run it in a **Web Worker**; add ranked results, typo tolerance, matched-term highlighting, and a "near me / near this point" geo mode reusing `haversineKm`.
- *Files:* new `src/lib/search/` (+ worker), refactor the search/list in `src/components/map/MapSidebar.tsx`.
- *Dependencies:* none; pairs with T1.1 for shareable queries.
- *Risks:* index build cost on load — build lazily/off-thread and cache.
- *Acceptance:* <50ms perceived query latency at 500 entries; typo ("dat" → "Data Darbar") and highlighting work; main thread stays unblocked (no input jank); EN + Urdu.

**T3.2 — Saved & shareable views · (S)**
- *Rationale:* Let users bookmark "Sikh Gurdwaras in Punjab, 18th c." — pure leverage on T1.1.
- *Scope:* Since all view state is in the URL (T1.1), add a "copy link" affordance and optional named local presets.
- *Files:* `src/components/map/MapSidebar.tsx`, small `useSavedViews` hook.
- *Dependencies:* T1.1, T1.4.
- *Acceptance:* a filtered view is one click to copy and restores exactly when reopened.

### Track 4 — Design system & UI engineering (force multiplier — do early)

**T4.1 — Tokenized primitive component library · (M)**
- *Rationale:* Tokens exist (`src/styles/tokens.css`) but components re-implement buttons/cards/chips and several use inline styles, so polish drifts and changes are risky.
- *Scope:* Extract `Button`, `IconButton`, `Chip`, `Card`, `Badge`, `Toggle`, `Skeleton`, `Toast`, `Tooltip` as typed components consuming only tokens; **remove the inline-style blocks** in `MapSidebar.tsx` (the Table-of-Shrines button), `ShrinePage.tsx` (header), and `LocationMap.tsx`.
- *Files:* new `src/components/ui/` primitives + `src/styles/components.css`; refactor call sites.
- *Dependencies:* none; unblocks Parts A/B polish and everything visual after.
- *Risks:* a broad refactor — do it behind unchanged visuals and lean on T5/T4.3 to prove no regressions.
- *Acceptance:* no component ships ad-hoc colors/spacing/radii; primitives cover all current UI; visuals unchanged (visual-regression clean).

**T4.2 — Storybook with bilingual + theme matrix · (M)**
- *Rationale:* A living catalog to develop and review components in light/dark × EN/Urdu without clicking through the app.
- *Scope:* Storybook 8 with theme + language toggles (decorators wrapping `ThemeContext`/`LanguageContext`), stories for every primitive and key composite (list row, shrine card, infobox, marker states).
- *Files:* `.storybook/`, `*.stories.tsx` beside components.
- *Dependencies:* T4.1.
- *Acceptance:* every primitive + key composite has stories rendering in all four theme/lang combinations; Storybook builds in CI.

**T4.3 — Visual regression · (M)**
- *Rationale:* Catch the silent visual breakage the redesign keeps hitting.
- *Scope:* Snapshot stories (and/or key pages) via Playwright component screenshots or Chromatic; gate PRs on diffs.
- *Files:* Playwright/Chromatic config, `.github/workflows/ci.yml`.
- *Dependencies:* T4.2 (or T5.2 for page-level).
- *Acceptance:* an intentional CSS change produces a reviewable diff; baselines stored; CI blocks unreviewed visual changes.

### Track 5 — Quality, testing & delivery (force multiplier — do early)

**T5.1 — Component / interaction tests · (M)** — RTL + Vitest for the things that broke: selection from list/search/marker calls fly-to; sidebar responsive collapse; `LocationMap` renders a map not a stuck skeleton; `ShrineArticle` renders body text from `Description`. *Files:* `src/**/__tests__/*`. *Acceptance:* these behaviors are covered and fail if regressed.

**T5.2 — E2E critical paths (Playwright) · (M)** — load map → search "data" → click result → assert detail card + zoom; open `/shrine/:slug` → assert article + location map; toggle theme/lang persists. *Files:* `e2e/`, `playwright.config.ts`, CI (nightly + pre-deploy). *Acceptance:* green E2E on the critical path across Chromium/WebKit.

**T5.3 — Automated a11y + Lighthouse CI budgets · (M)** — `axe` in component/E2E tests; Lighthouse CI with enforced budgets on the map and a shrine page. *Files:* CI workflow, `lighthouserc.json`. *Acceptance:* zero serious axe violations; budgets enforced and failing on regression.

**T5.4 — Preview deploys per PR + release flow · (S)** — Netlify/CF preview per PR; tagged releases + `CHANGELOG`. *Files:* host config, `.github/`. *Acceptance:* every PR gets a shareable preview URL; releases are tagged.

### Track 6 — Performance, resilience & observability

**T6.1 — Image pipeline / CDN · (M)** — proxy external hotlinks through an image CDN (Cloudinary/imgix/Cloudflare Images) or build-time optimize; responsive `srcset`, AVIF/WebP, explicit dimensions (kill layout shift), blur-up/LQIP placeholders, category-gradient fallback. *Files:* a small `<ShrineImage>` component, `galleryParsing.ts`, hero/related/list call sites. *Acceptance:* CLS ≈ 0 on shrine pages; images responsive; no broken-image gaps.

**T6.2 — Offline-first PWA maturation · (M)** — precache the data snapshot + app shell; offline route/state; "new version available" update toast; verify install on iOS/Android. *Files:* `vite.config.ts` (Workbox), an offline fallback, an update prompt. *Acceptance:* full offline browse of cached shrines + map shell; clean install; update prompt works.

**T6.3 — Web-vitals + error observability · (S–M)** — `web-vitals` reporting + lightweight error tracking (Sentry or a minimal endpoint), privacy-friendly analytics (Plausible) to learn which shrines/languages are used. *Files:* `src/main.tsx`, a tiny `src/lib/telemetry.ts`. *Acceptance:* CWV + JS errors visible in a dashboard; analytics respects privacy (no PII, documented).

**T6.4 — Accessibility beyond AA · (M)** — full keyboard map operation, a screen-reader-friendly **list alternative** to the map, focus management on route change, lightbox focus trap, AAA contrast where feasible, complete RTL audit (logical properties, gallery order, numerals/era localization). *Files:* map components, `ShrinePage.tsx`, `src/styles/*`, i18n. *Acceptance:* keyboard-only and screen-reader walkthroughs of the core journeys pass; documented a11y statement.

### Recommended sequence (at a glance)
1. **Foundation for quality:** T4.1 → T5.1 → T5.3/T5.4 → T4.2/T4.3 (so everything after is safe to change).
2. **Cheap, high-impact product:** T1.1 (deep links) → T3.1 (search) → T3.2.
3. **Citability:** T2.3 (stable slugs) → T2.1 (SSG) → T2.2 (structured data/sitemap) → T2.5 (data CI).
4. **Signature map:** T1.3 (cluster/heatmap + marker refactor) → T1.4 (facets) → T1.7 (nearby amenities/POIs) → T1.5 (time-slider) → T1.6 (story tours); **T1.2 (MapLibre) only when the map's ambitions outgrow Leaflet.**
5. **Resilience & reach:** T6.1 → T6.2 → T6.3 → T6.4, plus T2.4 content maturation running in parallel throughout.

---

## 5. Design system (detail)

- **Single source of truth:** all visual values come from `src/styles/tokens.css`. Add semantic aliases where missing (e.g. `--focus-ring`, category accent tokens used by chips + markers + list placeholders) so the taxonomy is colored consistently across map and list.
- **Primitives (T4.1):** `Button`, `IconButton`, `Chip`, `Card`, `Badge`, `Toggle`, `Skeleton`, `Toast`, `Tooltip`, `Sheet` (mobile bottom-sheet from Part B). Typed props, no inline styles, theme- and RTL-aware by construction.
- **Inline-style cleanup targets (verified):** `MapSidebar.tsx` (Table-of-Shrines button + assorted inline blocks), `ShrinePage.tsx` (header/error inline styles), `LocationMap.tsx`. Migrate these into primitives/`components.css`.
- **Theming & i18n in components:** every component must render correctly under `[data-theme='dark']` and `dir="rtl"`; bake this into the primitives and prove it in Storybook's theme×lang matrix.
- **Documentation:** Storybook is the contract; visual regression (T4.3) is the enforcement. Treat a token change as a reviewed, snapshot-diffed event.

## 6. Testing & quality strategy (detail)

- **Pyramid:** many unit tests (data/i18n/era/search/validation — fast, already partly present) → a solid band of component/interaction tests (T5.1) → a thin set of E2E critical-path tests (T5.2) → visual regression (T4.3) and automated a11y (T5.3) across the matrix.
- **What must always be covered (it has regressed before):** map selection → fly-to/zoom; map tiles actually render (no stuck skeleton); shrine article body renders from `Description`; sidebar responsive behavior; theme/lang persistence.
- **CI wiring:** extend the P0 workflow to run typecheck + lint + unit + component + build on every PR; run E2E + visual + Lighthouse CI on a schedule and pre-deploy to keep PRs fast. Gate `main` on the fast checks.
- **Budgets & policy:** enforce JS/CSS bundle budgets and Lighthouse budgets in CI; zero-serious-axe-violations gate; a documented flaky-test quarantine policy so the suite stays trusted.
- **Coverage targets:** ≥80% on `src/lib/**` (pure logic), critical-path E2E green on Chromium + WebKit, every primitive snapshotted.

## 7. Definition of excellent (measurable targets)

The product is "excellent" when, verifiably:
- **Performance:** Lighthouse ≥ 90 (map) / ≥ 95 (shrine page); LCP < 2.5s and CLS < 0.1 on a throttled mid-range mobile; initial JS within an agreed budget (e.g. ≤ 200KB gzip for the map route, map libs lazy-loaded).
- **SEO/citability:** all shrine pages prerendered with valid JSON-LD (passes Google Rich Results), present in `sitemap.xml` with `hreflang`, correct social cards; stable, index-independent slugs.
- **Accessibility:** zero serious/critical axe violations in both themes; keyboard-only and screen-reader walkthroughs of core journeys pass; AAA contrast where feasible; documented a11y statement.
- **Search:** < 50ms perceived query latency at 500+ entries, off the main thread, with typo tolerance and highlighting.
- **Reliability:** full offline browse of cached shrines; renders even if Google Sheets is unavailable (committed snapshot); CI blocks data-integrity, visual, a11y, and perf regressions.
- **i18n:** complete EN/Urdu parity in UI strings, content fields, numerals/era formatting, and RTL layout — no clipped or mis-mirrored screens.
- **Maintainability:** no ad-hoc styles outside tokens; every component in Storybook; the behaviors that previously broke are all under test.
