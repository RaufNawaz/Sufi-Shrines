# Performance, stability, security and repository cleanup — October 2026

Branch `cleanup/perf-stability-security`, cut from `d368297` (25 October 2026), in the Windows
clone `C:\Users\g16\Desktop\Shrines Project`. Not merged and not pushed until Rauf says so.

## Brief (Rauf, 25 October 2026)

No new features. Two things:

1. **Performance and stability**, especially on mobile browsers and Safari, where several
   features do not work well or at all.
2. **Clean up the code and the repository**: remove what is redundant, and harden the code's
   security, efficiency and stability so the repository reads as professional work.

## Do not touch while the descriptions session is running

That session works in the Mac folder. These are its uncommitted files as of 25 October:

- every content directory: `entries/`, `shrine_entries/`, `data/`, `urdu-i18n/` content,
  `pipeline/book_queue/`
- `docs/HANDOVER.md`, `docs/_APPEND_*.md`, `docs/prompts/*`
- `src/components/shrine/ProseParagraphs.tsx` and `src/components/shrine/__tests__/proseVerse.test.tsx`
- `scripts/data/validate-publication-safety.mjs`, `scripts/data/lib/publicationSafetyRules*`,
  `src/lib/data/__tests__/publicationSafety.test.ts`
- the root `RUN_IN_PROGRESS_*.md` files, which belong to the book-queue claim protocol

## Method

- Every change keeps `npm run verify` green. Logs go to the session scratchpad, never beside the repo.
- Commit in coherent units with a scope prefix (`perf:`, `fix:`, `security:`, `chore:`).
- Nothing is pushed.

## Plan (from the three audits of 25 October; tick as done)

The audits were read-only. Their findings, condensed, with file references as of `d368297`:

### A. Mobile / Safari stability (highest impact first)
- [x] A1 `src/lib/i18n/localizeRecordedDate.ts:155,157`: a regex lookbehind built at module scope.
  Safari before 16.4 throws a SyntaxError, so **every `/saint/*` page crashes on iOS 15 and
  16.0–16.3**. Rewrite it without lookbehind, and add a build gate that fails if `dist/assets/*.js`
  contains `(?<=` or `(?<!`.
- [ ] A2 Map: `MapLibreBasemap` is lazy-loaded with no error boundary of its own, so a failed
  chunk takes down the whole map page. If WebGL cannot start, `addTo` throws inside an async IIFE
  and `onFailure` never runs. There is no `webglcontextlost` handler, though iOS drops contexts
  when a tab is backgrounded. Fall back to the CARTO raster in all three cases.
- [x] A3 Unguarded `localStorage`: `main.tsx:46`, `ThemeContext.tsx` (10, 39, 56, 60),
  `LanguageContext.tsx` (24, 59, 112), `detectLang.ts:46`, `tourProgress.ts:38`. Safari with
  "Block All Cookies" and some in-app webviews throw on these reads, which can leave a blank page.
- [ ] A4 MapLibre canvas: cap `pixelRatio` at 2 and lower `padding` on narrow screens (iPhone memory).
- [ ] A5 Service worker: stop precaching `shrines-fallback`, `provenance`, `kg-review-queue` and
  `source-notes` (about 4.4 MB on a first visit). Use NetworkFirst for the sheet CSV, so an edit
  shows on the first load. Cache images with status 200 only and fewer entries (opaque responses
  inflate the quota count).
- [ ] A6 Tour audio: `useTourAudio.ts:16` ignores `BASE_URL`. The probe may never settle on iOS,
  and `speak()` runs after an `await`, outside the user's tap.
- [ ] A7 Phones: turn off heavy `backdrop-filter` under `(hover: none)`. The bottom sheet's drag
  sets `height` on every touchmove (`MapSidebar.tsx:206`).
- [ ] A8 Taps feel dead on slow networks: `App.tsx:193` waits for the chunk preload before
  navigating. Navigate after about 150 ms regardless.
- [ ] A9 Add a WebKit (iPhone) Playwright smoke project, so Safari regressions are caught.
- [ ] A10 Later, larger changes: per-route CSS, `srcset` thumbnails, and storing the CSV text or
  using IndexedDB instead of re-stringifying 1–2 MB per visit.

### B. Security
- [ ] B1 `scripts/prerender.mjs`: JSON-LD is injected with plain `JSON.stringify`. Sheet text
  containing `</script>` would run as stored XSS. Escape `<`, `>`, `&`, U+2028 and U+2029, and use
  function replacers in `html.replace('</head>', …)` (a `$&` in sheet text corrupts pages). Gate
  it in `check-routes-prerendered.mjs`.
- [ ] B2 A MapTiler key is committed in `legacy/app.js:266,276`. Remove it with `legacy/` (C2).
  **Rauf: rotate the key in MapTiler Cloud.**
- [ ] B3 Dependencies: `maplibre-gl` (critical advisory; practically unreachable here) and
  `react-router-dom` 6.30.4 (moderate). Bump within their major versions.
- [ ] B4 A Content-Security-Policy `<meta>` (see the audit's suggested policy). Verify with e2e.
- [ ] B5 Dev tooling advisories (vite 5, vitest, storybook). Evaluate upgrades separately.
- [ ] B6 `tools/utrnet` downloads model weights unpinned and loads them with
  `weights_only=False`: pin a revision and check a sha256. `google-apps-script/Code.gs`: neutralise
  leading `=+-@` and allowlist `sheetName`.

### C. Code and repository cleanup
- [ ] C1 Dead functions: `kg.ts` (`getEventsByShrine`, `getSaintShrines`, `getPlaceForShrine`,
  `getOrderForSaint`, `getPlaceBySlug`), `sourceLibrary.entriesOf`, `kgFigureImages.imageCoverage`,
  `mosques.resetMosquesCache`, `urduFonts.resetUrduFontWarmForTests`,
  `useUrduArticlesReady`. Drop exports that are used only inside their own file.
- [ ] C2 Delete `legacy/` (the pre-React app; git history keeps it) and `scripts/backfill-slugs.mjs`.
- [ ] C3 Group the manual scripts into `scripts/measure/` and `scripts/maintenance/`, and fix the
  `package.json` description ("163 sites").
- [ ] C4 Consolidate the seven preference modules into one `createStoredPreference` helper under
  `src/lib/preferences/`, and the JS duplicates (slug copies, Eastern digits in prerender,
  haversine, `parseCsv`).
- [ ] C5 After the content session ends: root `RUN_IN_PROGRESS_*`, `docs/` archive layout,
  `.gitignore` vs tracked `data/*.csv`, `tools/` → `pipeline/ocr/`, `requirements-translate.txt`.

### D. Team view
- [x] D1 Phase 1 of `docs/TEAM_ACCESS_PLAN.md`: reactive `useTeamAccess()`, `?team` stripped from
  the URL, a visible Team-view badge. Phase 2 waits for Rauf's ruling.

## Questions for Rauf

- Team view Phase 2: option A, B or C, and must any fields become truly private?
  See `docs/TEAM_ACCESS_PLAN.md`.
- Rotate the MapTiler key committed in `legacy/app.js` (B2). Only Rauf can do that.
- `docs/` holds personal correspondence (`email_to_adil_data_layer.md`,
  `message_to_saifullah_2026-08-16.md`, `ADIL_UPDATE_2026-10-08.md`) in a public repository.
  Keep it, move it out, or archive it?

## Progress log

- 25 Oct: clone fast-forwarded to `d368297`, branch cut, dependencies reinstalled, Playwright
  WebKit installed for Safari testing. Three read-only audits started: mobile/Safari
  performance, security, and redundancy.
- 25 Oct: D1 committed (team view Phase 1). A1 committed: lookbehind removed;
  `scripts/check-no-lookbehind.mjs` added to `npm run build` and tested both ways.
- 25 Oct: A3 committed. `src/lib/safeStorage.ts` is now used at every unguarded site; a scan
  finds no other `localStorage` call outside a `try`.
