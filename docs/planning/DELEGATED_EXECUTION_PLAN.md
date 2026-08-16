# Delegated Execution Plan — Urdu aesthetics + feature work for cheaper models

Written 16 August 2026. A menu of bounded, self-contained tasks sized for execution by
GPT-Codex-class or cheaper models, each with explicit files, steps, acceptance criteria, and
guardrails. Every task was grounded against the actual codebase state on this date — file
paths and "verify first" steps were checked, not guessed.

Relationship to existing plans: this extends `URDU_IMPLEMENTATION_PLAN.md` (whose Phases 1–7
are substantially done — the dictionary is wired, numerals/toggle exist, all 163 entries have
a `descriptionUr`, and the 16 Aug font-token remap fixed the Nastaliq-everywhere rule) and
picks bounded items from `PROJECT_VISION.md` Tracks 0/6/8. It does not replace either.

---

## 0. Contract for any executor agent (paste this into every task prompt)

1. Work in `~/shrines-repo` (symlink). Never locate the repo via `find` — the Desktop has a
   decoy directory (CLAUDE.md RULE 1).
2. Read `CLAUDE.md` in the repo root before your first edit. Its rules override anything here.
3. **Never touch the Google Sheet, `data/*.csv` values, or any content field.** Code and
   styles only, unless the task explicitly says otherwise (RULE 2/RULE 3).
4. **UI strings**: never add `lang === 'ur' ? '…' : '…'` inline in a component — an ESLint
   `no-restricted-syntax` rule in `.eslintrc.cjs` blocks it. Add a key to
   `src/lib/i18n/uiStrings.ts` (`UI_TEXT.en` + `UI_TEXT.ur`) and use `t()`.
5. **Numbers** render through `fmtNum()` from `LanguageContext`; coordinates stay Western.
6. **Latin runs inside the Urdu view** must be wrapped in `<bdi>`; the no-leak e2e
   (`e2e/urdu.spec.ts`) fails on bare `[A-Za-z]` in chips/titles.
7. **CSS**: logical properties only (`inset-inline-*`, `margin-inline-*`, `text-align:
start`). Never a hard `left/right` that breaks RTL.
8. **Do not rename these slugs** (published photo URLs): data-darbar,
   abul-faiz-qalander-ali-suharwardi, bibi-pak-daman, ganj-e-inayat-sarkar, madho-lal-hussain,
   mazar-e-iqbal, peer-makki, shah-jamal.
9. Before committing: `npm run verify` (typecheck + lint + unit) must be green. For any
   Urdu/i18n-touching task, also `npm run build:e2e && npm run e2e` (the no-leak guard must
   stay green). Do not push.
10. Commit with a scope prefix (`feat:`, `fix:`, `docs:`, `data:`, `pipeline:`), no
    Co-Authored-By trailer, and show `git diff --stat` first.
11. Every task below starts with a **Verify-first** step. If verification shows the task is
    already done or moot, stop and report that — do not manufacture work.
12. If a value/fact is missing, leave it empty and report it. Never invent content, dates, or
    citations (RULE 2). If a check fails, fix the check or report — never edit prose to
    satisfy a linter (RULE 4).

Tiers: **[cheap]** = mechanical, safe for the smallest models; **[mid]** = needs judgment,
Codex-class; **[review]** = a human must approve the diff before merge regardless of model.

---

## Part A — Urdu aesthetic work

The 16 Aug session already fixed the big one (serif tokens now remap to Nastaliq under
`[dir='rtl']`, heading letter-spacing/leading reset, `year_built_precision` localized,
infobox values bidi-isolated). What remains is deliberate polish, not firefighting.

### A1. Style Latin fallback runs inside the Urdu view as intentionally secondary — [cheap]

**Context:** Untranslated field values (e.g. an English `Events` string on a shrine with no
dictionary entry) render inside `<bdi>` in the RTL infobox. They're policy-compliant but
visually read as a glitch: full-size Latin serif inside Nastaliq.
**Files:** `src/styles/shrine.css` (infobox section, ~line 284+), possibly `global.css`.
**Verify first:** open `http://localhost:5173/shrine/sakhi-sarwar?lang=ur` (`npm run dev`);
the Events row shows full-size English.
**Steps:** Add a rule like `[dir='rtl'] .infobox-value bdi:lang(en), [dir='rtl']
.infobox-note bdi { font-size: 0.85em; color: var(--color-text-secondary); }` — but check
what `lang` attributes actually exist first; if none, scope by selector only and don't
over-match `<bdi>` runs that contain Urdu (the generic value wrapper added 16 Aug wraps
translated values too — the safe target is styling based on content being Latin, which CSS
can't detect, so instead add `lang="en"` in `ShrineInfobox.tsx` only where the value came
back untranslated — `localizeField` returning the raw input is the signal; check
`src/lib/i18n/urduFallback.ts` for how to detect that).
**Acceptance:** English fallback values render smaller/muted in the Urdu view; Urdu values
unchanged; `npm run verify` + e2e green.

### A2. Per-component Nastaliq metrics audit — [mid]

**Context:** The global remap is in; individual components may still carry Latin-tuned
`line-height`/`font-style` that clip or distort Nastaliq. Known suspects: `.infobox-note`
(check for `font-style: italic` — italic Nastaliq is typographically wrong; use color/size
for de-emphasis instead), tour cards (`tours.css:218,367`), KG panels (`kg.css:42,88,217`),
breadcrumbs, `.shrine-category-kicker` (uppercase/letter-spacing rules meaningless for
Arabic script).
**Verify first:** run a Playwright computed-style probe (pattern already used 16 Aug —
`getComputedStyle` on selectors at `?lang=ur`) across: tour list, tour panel, shrine page,
KG/lineage view, 404 page.
**Steps:** For each element whose computed `line-height / font-size < 1.7` or that has
`font-style: italic` or non-zero `letter-spacing` while containing Urdu text, add a scoped
`[dir='rtl']` override. Small diffs, one commit per stylesheet.
**Acceptance:** probe re-run shows ≥1.7 leading and zero letter-spacing on all Urdu-bearing
text; before/after screenshots attached to the report; no visual change in the English view
(probe the same selectors without `?lang=ur`).

### A3. Urdu font loading: weights + subsetting — [mid]

**Context:** `public/fonts/` self-hosts NotoNastaliqUrdu 400/600/700 woff2, but `index.html`
preloads only the 400. Headings are `font-weight: 700` — in the Urdu view the 700 face loads
late (flash of synthetic bold) or falls back. Nastaliq files are also large.
**Verify first:** `ls -la public/fonts/` for sizes; dev-tools network panel on `?lang=ur`
for load order; grep `@font-face` in `src/styles/global.css` for `font-display` values.
**Steps:** (a) preload the 700 alongside the 400 when `lang=ur` is likely (or
unconditionally — measure the byte cost first and report it); (b) confirm `font-display:
swap` on all three faces; (c) OPTIONAL, only if sizes are >200KB each: subset with
`pyftsubset --unicodes=U+0600-06FF,U+0750-077F,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F,U+0660-0669,U+06F0-06F9`
into new files, keep originals, and report before/after sizes — do NOT delete originals in
the same commit.
**Acceptance:** no synthetic-bold flash on a cold load of an Urdu page; reported byte
savings; `npm run verify` green; PWA precache (vite-plugin-pwa) still includes the fonts.

### A4. Urdu-aware search normalization — [mid]

**Context:** `src/lib/search/search.worker.ts` indexes `urduName` but uses MiniSearch's
default `processTerm` — no Urdu/Arabic character folding. Users typing ي (Arabic yeh) won't
match ی (Urdu yeh); ك won't match ک; diacritics and ZWNJ break prefix matches.
**Files:** `src/lib/search/search.worker.ts`, new unit test under
`src/lib/search/__tests__/`.
**Steps:** Add a `processTerm` (applied at both index and search time) that: strips Arabic
harakat (U+064B–U+0652) and superscript alef (U+0670); removes ZWNJ/ZWJ (U+200C/U+200D);
folds ي→ی, ك→ک, ة→ہ, ه→ہ, أ/إ/آ→ا, ئ→ی; lowercases Latin. Keep MiniSearch defaults
otherwise. Write table-driven tests: e.g. query "علي ہجويري" matches a doc containing "علی
ہجویری"; "داتا" prefix-matches "داتا دربار".
**Acceptance:** new tests pass; existing search tests pass; manual check in the Urdu view
that a couple of real shrine names are findable with Arabic-keyboard spellings.

### A5. Localize document `<title>`/meta on language switch — [cheap]

**Context:** `index.html` has a static English title; switching to Urdu leaves the tab
English. (Full per-language prerender/hreflang is B4 — this is the cheap runtime half.)
**Files:** `src/lib/i18n/LanguageContext.tsx` (it already sets `document.documentElement`
lang/dir — extend the same effect), `src/lib/i18n/uiStrings.ts` (new keys `docTitle`,
`docDescription`).
**Steps:** on language change set `document.title = t('docTitle')` and update the
`meta[name=description]` content. Urdu strings must be real Urdu (get them from the existing
mission-bar copy in uiStrings if present — do not machine-translate new prose without
flagging it for review).
**Acceptance:** tab title flips with the toggle both ways; verify green; no-leak e2e green.

### A6. RTL map chrome polish — [mid] [review]

**Context:** Leaflet renders its own controls (zoom, attribution) with physical-side CSS;
in RTL they may collide with the sidebar or look unmirrored. Never audited.
**Verify first:** screenshot `/?lang=ur` at 1280px and 390px; inspect zoom control,
attribution line, the home/reset control (`map.css` ~line 1070+), and popup text direction
when clicking a marker.
**Steps:** fix only what the screenshots show broken, with `[dir='rtl'] .leaflet-*`
overrides in `map.css` using logical properties. Marker popups containing Urdu names should
get `dir="rtl"` on their content container.
**Acceptance:** before/after screenshots at both widths in the report; English view
unchanged; human eyeballs the diff before merge (visual risk).

### A7. Numeral-toggle and language-toggle a11y polish — [cheap]

**Verify first:** in the Urdu view, check the ۱۲۳/123 toggle and اردو/EN segment for: hit
target ≥44px, `aria-pressed`, a localized `aria-label`/tooltip, and visible focus ring.
`e2e/urdu.spec.ts` already exercises the numeral toggle — read it first.
**Steps:** fix only failures found; strings via uiStrings keys.
**Acceptance:** axe (`e2e/a11y.spec.ts`) green; targets measured ≥44px in the probe.

### A8. Urdu content delta for the 16 Aug enrichment — [mid] [review, hard gate]

**Context:** All 163 entries have `descriptionUr`, but the 16 Aug English enrichment (38
web-research entries + 15 tazkira + 1 coords-fix + Shah Inayat merge + 4 brand-new shrines)
added English paragraphs and Bibliographies that have **no Urdu counterpart**. Once the
consolidated CSV is imported, the Urdu article view for those entries will be missing the
new content (or fall back per-field).
**Files/pipeline:** `urdu-i18n/` (source of truth), `npm run data:build:urdu`, `npm run
urdu:build`; read `urdu-i18n/README.md` first.
**Steps:** (1) After the sheet import happens (blocked on that — verify with the human),
diff each affected entry's English Description against the Urdu one to list what's new; (2)
draft Urdu translations of only the appended material, honorifics per `data/glossary.csv`,
keeping `## Bibliography` items untranslated (citations stay in their source language, per
the existing convention — verify against an already-translated entry first); (3) regenerate
via the pipeline; (4) **stop for human review — machine translations are drafts until
reviewed (CLAUDE.md RULE 2 provenance note). Do not merge translated prose without sign-off.**
**Acceptance:** `npm run data:validate` green (includes Urdu-parity `--check` and no-leak
gates); reviewer signs off on the Urdu prose; per-entry diff list included in the PR body.

---

## Part B — General feature-level improvements

### B1. "Nearby shrines" on the shrine page — [mid]

**Context:** `RelatedShrines` exists; geo-distance helpers exist in `src/lib/tours/`
(`tourGeo.test.ts` covers them). A distance-based "nearby" list is cheap to add and
high-value for pilgrims.
**Verify first:** read `src/components/shrine/RelatedShrines.tsx` — it may already do
distance; if so, close as no-op or improve its heuristics only.
**Steps:** compute the 3–5 nearest other shrines (haversine from the existing geo lib, no
new deps), render as a small card row with distance via `fmtNum` (km, localized label via
uiStrings). Exclude self; handle the 2 coordinate-less rows gracefully.
**Acceptance:** unit test for the selection function; renders in both languages; verify +
no-leak e2e green.

### B2. Filter UX: active-filter count and clear-all — [cheap]

**Verify first:** `src/components/map/MapSidebar.tsx` — check whether a clear-all and an
active count already exist (the filters were redesigned on 15 Aug; this may be a no-op).
**Steps (if missing):** a chip showing the active-filter count and one "clear all" button,
strings via uiStrings, 44px targets.
**Acceptance:** filters reset in one click; state persists per the existing persistence spec
(`e2e/persistence.spec.ts` green).

### B3. "Report a correction" link on the shrine page — [cheap]

**Context:** `docs/CORRECTIONS_WORKFLOW.md` documents a GitHub issue template
(`.github/ISSUE_TEMPLATE/data-correction.yml`) that nothing in the UI links to.
**Files:** `src/components/shrine/SourcesProvenance.tsx` or the article footer;
uiStrings for the label.
**Steps:** a small link `…/issues/new?template=data-correction.yml&title=[correction] <slug>`
with the slug prefilled via URL param. Verify the template's actual field ids before
choosing query params. Note: `SourcesProvenance` is team-gated (`?team=1`); put the link in
the public article footer instead so visitors can use it — that placement is the point.
**Acceptance:** link opens a prefilled issue form; renders localized in Urdu; e2e green.

### B4. Per-language SEO: prerendered Urdu routes + hreflang + sitemap — [mid] [review]

**Context:** Urdu plan Phase 8, still open. `scripts/prerender.mjs` already prerenders
English routes.
**Steps:** extend prerender to emit an Urdu variant per shrine route (`?lang=ur` snapshot or
`/ur/` prefix — read the router setup in `src/pages/` and `prerender.mjs` before choosing;
prefer whichever needs no router change), with `<html lang="ur" dir="rtl">`, Urdu
title/description from the dictionary, and reciprocal `hreflang` (`en`, `ur`, `x-default`).
Generate `sitemap.xml` listing both variants. Mind the GitHub Pages base path
(`/Sufi-Shrines/`).
**Acceptance:** view-source of a prerendered Urdu page shows real Urdu + correct
lang/dir/hreflang; `npm run build` passes; sitemap validates; human reviews the routing
choice before merge.

### B5. Open Graph meta per shrine — [mid]

**Context:** shared shrine links show the generic site card. Scope strictly to meta tags —
no image generation.
**Steps:** in `prerender.mjs`, per shrine route emit `og:title` (name, both langs per B4
variant), `og:description` (first ~160 chars of the Description, markdown-stripped), and
`og:image` (the shrine's Image 1 if it's a raufnawaz.github.io photo URL; site-default
otherwise — never hotlink third-party images into og tags).
**Acceptance:** a card-validator (or curl + grep) shows per-shrine tags on 3 sample routes,
including one with no photos; build green.

### B6. Offline/PWA UX check — [cheap]

**Verify first:** the runtime fetches the sheet CSV live; with the service worker active and
network off, what renders? (There is fallback shrine data in `src/data/`.) Reproduce before
changing anything.
**Steps (if broken/silent):** show a small localized banner "showing cached data from
<date>" when the CSV fetch fails and the fallback is used. No new deps.
**Acceptance:** airplane-mode load shows data + banner instead of a blank error; verify + e2e
green.

### B7. CI data-quality gate (warn-only) — [cheap]

**Context:** `pipeline/validate_shrines.py` runs only when someone remembers. The 16 Aug
merge work showed its invariants catch real bugs.
**Steps:** add a CI job (read `.github/workflows/` first for conventions) that runs
`npm run data:build` then `python3 pipeline/validate_shrines.py data/shrines.csv --termbase
pipeline/termbase.tsv --fail-on NONE` and uploads `validation_issues.tsv` as an artifact.
Warn-only: the job must not fail the build (`--fail-on NONE` already guarantees exit 0).
**Acceptance:** job green on main; artifact downloadable; no change to existing jobs.

### B8. Lighthouse budget wiring — [mid]

**Verify first:** the stack list mentions Lighthouse CI — check `.github/workflows/` and
`lighthouserc*` for what exists. If a config exists with no budgets, add budgets
(performance ≥ current score − 2, font byte budget informed by A3); if nothing exists, add a
minimal `lhci autorun` job against the built site, assertion-free first run, budgets in a
follow-up.
**Acceptance:** CI surfaces scores per PR; no red builds caused by flaky thresholds
(warn-level assertions only).

---

## Deliberately excluded (do not let an executor pick these up)

- Anything that writes to the Google Sheet or edits `data/*.csv` content (RULE 3).
- Marker clustering / map visual redesign — needs a product decision first.
- KG/AI features (Vision Tracks 2/5) — not bounded enough for cheap models.
- Slug or category-value renames of any kind.
- "Fixing" the 2 remaining Web-compiled entries by finding new sources — that's editorial
  work gated on Saifullah's books (see `entries/web-research-2026-08/ACQUISITION_LIST.md`).

## Suggested batching

1. **Batch 1 (all [cheap], one session):** A1, A5, A7, B2, B3, B7.
2. **Batch 2 ([mid], code-only):** A2, A4, B1, B6.
3. **Batch 3 ([mid]+[review], visual/SEO):** A3, A6, B4, B5, B8 — human reviews each diff.
4. **Batch 4 (content, hard review gate):** A8 — only after the sheet import, and never
   merged without human sign-off on the Urdu prose.

Each batch = one PR-sized unit; run the full verification (contract §9) once per batch and
per task. Report every no-op verification result explicitly — a task that turns out already
done is a finding, not a failure.

---

## Execution log

### Batch 1 — done (16 Aug 2026, same day as this plan)

- **A1** — done. `ShrineInfobox.tsx` now tags the fallback `<bdi>` `lang="en"` when
  `localizeField()` returns Latin content (the only way that happens in the Urdu view);
  `shrine.css` mutes it. Commit `2b911cf`.
- **A5** — **no-op, already implemented.** `document.title` already flips via
  `useDocumentTitle(t('siteTitle'))` on every page (`MapPage.tsx:145` and per-entity
  composites in `ShrinePage`/`SaintPage`/`OrderPage`/`GraphPage`), and both `siteTitle` and
  `siteMetaDescription` already have `ur` translations; `LanguageContext`'s effect already
  updates the meta description/OG tags on language change. Nothing to do.
- **A7** — done. `aria-pressed` added to the numerals toggle; `LanguageToggle`'s group
  `aria-label` now reads from a new `selectLanguage` uiStrings key instead of a hardcoded
  English string. Focus rings (global `:focus-visible`) and mobile 44px targets already
  existed and were left as-is (they follow the existing app-wide convention of 44px only
  under the `max-width: 768px` media query, same as `.filter-chip`). Commit `da481d2`.
- **B2** — done. Persistent `.filter-summary-bar` (active-filter count + "clear all") added
  above the category chips, wired to the existing `clearAllFilters` callback. The prior
  empty-results clear button is untouched. Commit `da481d2`.
- **B3** — done. Public "Report a correction" link in the shrine-page footer
  (`correctionIssueUrl()` in `constants.ts`), prefilling the `shrine` field and title via
  GitHub's issue-forms query-param convention. Commit `da481d2`.
- **B7** — done. New `data-quality` job in `.github/workflows/ci.yml`: `npm run data:build`
  → `pipeline/validate_shrines.py --fail-on NONE` → uploads `validation_issues.tsv`.
  Commit `0018b17`.

Full batch verified: `npm run verify` (235 tests) and `npm run e2e` (39/39, after ruling out
worker-contention flakiness in `a11y.spec.ts`/`map.spec.ts` by rerunning at `--workers=2`)
both green.

### Batch 3 note found while working Batch 1

- **B8 (Lighthouse budget wiring) is already fully done** — `.lighthouserc.cjs` exists with
  real category/CWV/a11y assertions and is wired into `ci.yml`'s `lighthouse` job. Batch 3
  can skip it; noted here so it isn't re-attempted.

### Batch 2 — done (16 Aug 2026)

- **A2** — done. Audited every named suspect plus a full grep sweep of `letter-spacing`/
  `text-transform: uppercase`/`font-style: italic` across all four stylesheets, checked each
  against the actual rendered JSX (tag + whether the content is translated) rather than
  guessing. Fixed 10 real cases where translated text landed on a `<p>`/`<span>`/`<div>` the
  global `h1-h4` remap never reaches: `.shrine-category-kicker`, `.infobox-category-badge`,
  `.infobox-note`, `.provenance-method`, `.provenance-reviewer`, `.provenance-citation-type`,
  `.entity-type-kicker`, `.filter-section-label`, `.shrine-list-group-heading`,
  `.shrine-list-empty-query`. Confirmed-fine and left alone: anything already on an h1-h4
  (the global remap's selector specificity already wins), digit-only badges (tracking is
  harmless on numerals), `.provenance-notes` (always-English bdi-wrapped prose), breadcrumbs.
  Added `e2e/nastaliq-metrics.spec.ts` as a permanent regression guard — spot-verified by
  reverting one fix and confirming the test catches it. Commit `017ab37`.
- **A4** — done. `search.worker.ts` now has a shared `processTerm` (Arabic harakat/ZWNJ/ZWJ
  stripped, ي/ك/ة/ه/أ/إ/آ/ئ folded to ی/ک/ہ/ا) applied at both index and search time.
  Verified with a MiniSearch-backed test using real shrine names. Commit `a307ce6`.
- **B1** — done. `RelatedShrines` already existed but weights category/location similarity
  ahead of distance — not a true "nearby" list. Added `findNearbyShrines()` (pure haversine,
  unit-tested) and a `NearbyShrines` component. Commit `71cc1a3`.
- **B6** — done. `useShrineData()`'s solid cache/snapshot fallback chain was never surfaced
  to the UI. Added `sourceTimestamp` + an `offline` flag (true only once a live fetch has
  actually failed, not during the normal instant-cache-then-background-refresh path every
  healthy load goes through) and an `OfflineDataBanner` on `MapPage`. Commit `2e1e28e`.

Full batch verified: `npm run verify` (251 tests) and full `npm run e2e` (42/42) green.

### Batch 3 — done (16 Aug 2026), except B8 (already done, see above)

- **A3** — done. Added a small inline script in `index.html` that preloads the 700-weight
  Nastaliq face only when the same lang-detection order as `detectInitialLang()` resolves to
  Urdu (unconditional preload would cost every English-first visitor ~154KB they don't need).
  Verified: `font-display: swap` was already set on all three weights; all three woff2 files
  were already under the 200KB subsetting threshold (157–165KB, with a unicode-range already
  restricting them to Arabic-script blocks) — no subsetting needed. Commit `3a92ea8`.
- **A6** — **no-op, verified via Playwright screenshots at 1280px/390px plus a computed-style
  probe** (the task's own prescribed method): the sidebar/map correctly mirror in RTL via
  plain flexbox (no `row-reverse` needed — `dir="rtl"` already reverses `flex-direction: row`
  visually), Leaflet's zoom/reset/layers controls stay in their coded map-relative corners
  without colliding with the sidebar at either width, and the app has **no native Leaflet
  `<Popup>` anywhere** — marker clicks open the sidebar preview card instead, which was
  already correctly Nastaliq/RTL-styled. Nothing to fix.
- **B4** — done, `[review]`. Found the existing hreflang was pointing `ur` at `?lang=ur`,
  which serves identical English content on a static host — a real bug, not just missing
  polish. Added genuine prerendered `/ur/*` pages (shrine/saint/order/home) with real Urdu
  title/description, `<html lang="ur" dir="rtl">`, self-referencing canonical, and correct
  bidirectional hreflang + sitemap entries. `/ur/*` is crawler-discovery only — never linked
  to internally; a real browser normalizes back to the existing path + `?lang=ur` scheme
  within one paint (no flash, no change to `setLang`/persistence/the rest of the e2e suite).
  Commit `22bca4c`. **Human should verify the routing choice before this ships** (per the
  task's own review gate) — verified locally: `npm run verify` (259 tests), full `npm run e2e`
  (47/47), and a production-flag build (`SITE_URL` set) all green.
- **B5** — **no-op, already correct given actual policy.** `primaryImage()` in `prerender.mjs`
  already uses whichever image is in the sheet (Wikimedia or first-party), which is exactly
  what's wanted: never drop an existing image, but prioritize a Saifullah field photo over a
  Wikimedia one when both exist for the same shrine. That exact scenario (Shah Inayat Qadiri)
  is already handled correctly in `data/patch_shah_inayat_merge.csv`, pending sheet import —
  the only such overlap the field-survey work found. Nothing to change in code.

Full batch verified: `npm run verify` (259 tests, +8 for `urlLangPrefix`) and full
`npm run e2e` (47/47, +3 `ur-prefix.spec.ts` +3 `nastaliq-metrics.spec.ts` +2
`font-preload.spec.ts` beyond Batch 1/2's baseline) green, plus a `SITE_URL`-set production
build to confirm `/ur/*` files are actually emitted.

### Batch 4 (A8) — not started, correctly gated

A8 is explicitly hard-gated on the consolidated CSV being imported into the live Google
Sheet first (a human step this plan cannot perform — RULE 3) and requires human sign-off on
the translated Urdu prose before merge regardless. Confirmed still blocked: the sheet import
hadn't happened as of this session. Left untouched, as intended.

### Photo/Drive-link investigation (16 Aug 2026, off-plan but related)

Investigated a request to download any shrine photos still sitting as raw Google Drive links.
Checked `pipeline/photo_manifest.tsv` (194 rows) and the live "Shrine Information Form
(Responses)" sheet directly (28 rows, read via Drive): every shrine with a real, non-deleted
Drive photo submission already has its images downloaded and published under
`public/photos/<slug>/`. The only two exceptions are already accounted for — Mian Mir's one
photo-bearing submission is flagged `Delete` by the sheet's own maintainers, and Mauj Darya
Bukhari's 10 Drive IDs are confirmed gone (`id_not_in_drive` in the manifest; independently
re-verified live — each returns "entity not found"). 44 manifest rows are Drive files with no
attributable shrine name (`in_drive_not_in_survey`) — left alone per RULE 2, since assigning
them a slug would mean guessing which shrine they belong to.
