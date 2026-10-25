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
- [x] A2 Map: `MapLibreBasemap` is lazy-loaded with no error boundary of its own, so a failed
  chunk takes down the whole map page. If WebGL cannot start, `addTo` throws inside an async IIFE
  and `onFailure` never runs. There is no `webglcontextlost` handler, though iOS drops contexts
  when a tab is backgrounded. Fall back to the CARTO raster in all three cases.
- [x] A3 Unguarded `localStorage`: `main.tsx:46`, `ThemeContext.tsx` (10, 39, 56, 60),
  `LanguageContext.tsx` (24, 59, 112), `detectLang.ts:46`, `tourProgress.ts:38`. Safari with
  "Block All Cookies" and some in-app webviews throw on these reads, which can leave a blank page.
- [x] A4 MapLibre canvas: cap `pixelRatio` at 2 (padding kept at 0.25, a deliberate flick-margin choice) on narrow screens (iPhone memory).
- [x] A5 Service worker (partly; see the log): stop precaching `shrines-fallback`, `provenance`, `kg-review-queue` and
  `source-notes` (about 4.4 MB on a first visit). Use NetworkFirst for the sheet CSV, so an edit
  shows on the first load. Cache images with status 200 only and fewer entries (opaque responses
  inflate the quota count).
- [x] A6 Tour audio: `useTourAudio.ts:16` ignores `BASE_URL`. The probe may never settle on iOS,
  and `speak()` runs after an `await`, outside the user's tap.
- [x] A7 (drag half) Phones: turn off heavy `backdrop-filter` under `(hover: none)`. The bottom sheet's drag
  sets `height` on every touchmove (`MapSidebar.tsx:206`).
- [x] A8 Taps feel dead on slow networks: `App.tsx:193` waits for the chunk preload before
  navigating. Navigate after about 150 ms regardless.
- [x] A9 Add a WebKit (iPhone) Playwright smoke project, so Safari regressions are caught.
- [ ] A10 Later, larger changes: per-route CSS, `srcset` thumbnails, and storing the CSV text or
  using IndexedDB instead of re-stringifying 1–2 MB per visit.

### B. Security
- [x] B1 `scripts/prerender.mjs`: JSON-LD is injected with plain `JSON.stringify`. Sheet text
  containing `</script>` would run as stored XSS. Escape `<`, `>`, `&`, U+2028 and U+2029, and use
  function replacers in `html.replace('</head>', …)` (a `$&` in sheet text corrupts pages). Gate
  it in `check-routes-prerendered.mjs`.
- [ ] B2 A MapTiler key is committed in `legacy/app.js:266,276`. Remove it with `legacy/` (C2).
  **Rauf: rotate the key in MapTiler Cloud.**
- [~] B3 Dependencies (analysed, not changed): `maplibre-gl` (critical advisory; practically unreachable here) and
  `react-router-dom` 6.30.4 (moderate). Bump within their major versions.
- [~] B4 (baseline added) A Content-Security-Policy `<meta>` (see the audit's suggested policy). Verify with e2e.
- [ ] B5 Dev tooling advisories (vite 5, vitest, storybook). Evaluate upgrades separately.
- [~] B6 (Apps Script half) `tools/utrnet` downloads model weights unpinned and loads them with
  `weights_only=False`: pin a revision and check a sha256. `google-apps-script/Code.gs`: neutralise
  leading `=+-@` and allowlist `sheetName`.

### C. Code and repository cleanup
- [x] C1 Dead functions: `kg.ts` (`getEventsByShrine`, `getSaintShrines`, `getPlaceForShrine`,
  `getOrderForSaint`, `getPlaceBySlug`), `sourceLibrary.entriesOf`, `kgFigureImages.imageCoverage`,
  `mosques.resetMosquesCache`, `urduFonts.resetUrduFontWarmForTests`,
  `useUrduArticlesReady`. Drop exports that are used only inside their own file.
- [x] C2 Delete `legacy/` (the pre-React app; git history keeps it). `scripts/backfill-slugs.mjs` is
  kept: `data/csv-source.json` (content, off-limits) and `public/_redirects` name it.
- [ ] C3 Group the manual scripts into `scripts/measure/` and `scripts/maintenance/`, and fix the
  `package.json` description ("163 sites").
- [~] C4 (storage half) Consolidate the seven preference modules into one `createStoredPreference` helper under
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
- Turn off the frosted-glass blur (`backdrop-filter`) on touch devices for speed on older iPhones?
  It is a visible design change to the tab bar, palette and map overlays, so it waits for a ruling.
- `google-apps-script/Code.gs` now stores a value beginning with `=` as literal text. The repo copy
  is not what runs: if the endpoint is still deployed, paste the file into the Apps Script editor
  and redeploy. If nothing uses it any more, take the deployment down (RULE 3).

## Progress log

- 25 Oct: clone fast-forwarded to `d368297`, branch cut, dependencies reinstalled, Playwright
  WebKit installed for Safari testing. Three read-only audits started: mobile/Safari
  performance, security, and redundancy.
- 25 Oct: D1 committed (team view Phase 1). A1 committed: lookbehind removed;
  `scripts/check-no-lookbehind.mjs` added to `npm run build` and tested both ways.
- 25 Oct: A3 committed. `src/lib/safeStorage.ts` is now used at every unguarded site; a scan
  finds no other `localStorage` call outside a `try`.
- 25 Oct (reported by Rauf): the contents rail stopped following the reader on long entries.
  `useActiveSection` now measures scroll position. On Data Darbar (one section is 5.3 screens
  tall), the old code was wrong at 48 of 169 scroll positions and the new code at 0, measured
  on the dev server.
- 25 Oct: A2 and A4 committed. A `BasemapBoundary`, a try/catch around `addTo`, and a
  `webglcontextlost` listener each fall back to the keyless raster; `pixelRatio` is capped at 2.
  **Not exercised end to end**: this machine has no `VITE_MAPTILER_KEY`, so the dev server never
  takes the vector path. Typecheck and unit tests only.
- 25 Oct: B1 committed. A full build ran in a scratch worktree (the repo's `dist/` is left
  alone while Rauf's dev server runs): JSON-LD still parses, and the new gate fires on a planted
  `<`. Bundle budgets for Graph, Source and Review were raised 3 KB with a dated reason (+1 KB
  shared by every route for the team hook, badge and safeStorage).
- 25 Oct: C1 and C2 committed (dead functions, `legacy/`, the stale `package.json` description).
  `npm run verify` is fully green, data gates included. It also caught three invariants my
  earlier commits broke (an unstyled class, a token fallback, two docs missing from the index);
  fixed in this commit.
- 25 Oct: A5 committed. Team-only payloads are out of the precache (283 entries / 5.4 MB, was
  285 / 5.6 MB). The sheet CSV is NetworkFirst with a 6 s timeout, kept 7 days. Opaque image and
  tile caches use `purgeOnQuotaError`, and images are capped at 120. `shrines-fallback` is **kept**
  in the precache on purpose: it is the offline safety net for field visits when the sheet cache
  has expired.
- 25 Oct: A9 committed. The `webkit-iphone` Playwright project runs `e2e/webkit-smoke.spec.ts`:
  ten routes plus the marker count, all 11 passing against a scratch build. CI now installs WebKit.
  Gotcha: in Git Bash, `VITE_BASE_PATH=/` is rewritten to `C:/Program Files/Git/`; prefix
  `MSYS_NO_PATHCONV=1`.
- 25 Oct: A6 committed. The narration path now carries `BASE_URL`. A HEAD probe runs when the stop
  changes, so Play starts audio or speech synchronously inside the tap, as iOS requires.
  `utterance.onerror` resets the state. Unit tests pass; the tours e2e is still to run in the
  batch e2e pass.
- 25 Oct: A8 committed. `preloadBriefly()` caps the pre-navigation chunk wait at 250 ms for in-app
  links and the tab bar. (The audit's "failed preload leaves the tap dead" was wrong: both
  preloads already catch their own errors. Only the unbounded wait was real.)
- 25 Oct: A7, drag half, committed: the bottom sheet's drag writes its height once per animation
  frame. The blur half is a design question, listed under Questions for Rauf.
- 25 Oct: **full e2e on a production build of the branch: 576 passed, 0 failed** (Chromium and
  the new WebKit iPhone project, a11y included). B3 analysed: both advisories are fixed only in
  new major versions (`maplibre-gl` 6, React Router 7). The audit judged both unreachable here,
  so the upgrade is left for a dedicated, reviewed pass rather than done unattended.
- 25 Oct: B4 baseline committed: a CSP meta with `object-src 'none'; base-uri 'self';
  form-action 'self'`. The strict `script-src` half needs per-build hashes for prerender's
  inline scripts and is the next step if wanted.
- 25 Oct: C4, storage half, committed. The seven preference modules use `safeStorage` and lose 70
  lines of duplicated try/catch. Not moved into `src/lib/preferences/`: that is cosmetic, and it
  would churn every import site for nothing a reader sees.
- 25 Oct: B6, Apps Script half, committed (formula injection neutralised). The `sheetName`
  allowlist is not done, because `tools/process_books.py` passes a configurable name; the key holder
  is trusted. The `tools/utrnet` model pin needs the real file's sha256, so it is left for whoever
  next runs the OCR machine setup (it belongs to the book-queue toolchain).
- 25 Oct: `verify-kg-proposals.mjs` imports the shared `slugify` (its copy trimmed only one
  edge dash); the gate still verifies all 247 proposals. Left alone on purpose: prerender's
  `easternDigits` and `escHtml` are small Node-side mirrors of TypeScript helpers that plain Node
  cannot import, and each is documented as a mirror.
- 25 Oct: found and fixed: `fingerprintShrines` keyed only on name, founded and description
  length. A corrected coordinate, photo or status therefore read as "no change", and returning
  readers kept the old row for up to an hour. Every cell is now in the key (long cells sampled
  every 8th character plus their exact length): about 4 ms per call on desktop Node.
- A10, cache half, analysed and left: the dataset is re-stringified into `localStorage` only
  when the content changes (`adoptCsvResult` returns early on a fingerprint match). Storing the CSV
  text instead would need the fetch path re-plumbed through a hook full of documented races.
  Not worth doing unattended.
