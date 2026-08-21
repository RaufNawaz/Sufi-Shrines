# Session checkpoint — 21 August 2026

**Read this first if you are picking the project up in a new session.** It is a pointer document:
what is on the branch, what is live, what is half-finished, and what to do next. Detail lives in
`docs/HANDOVER.md` §9 (numbered findings) and `docs/TODO.md` §0 (session log).

---

## 1. The single most important fact

**Nothing from this session is on the live site.** Everything is on
`claude/keep-working-on-this-ewipvq`, which is **~57 commits ahead of `main`**. GitHub Pages
deploys from `main`, so `raufnawaz.github.io/Sufi-Shrines/` still shows the pre-session build.

This caused real confusion mid-session — the site was checked on a phone and looked unchanged,
because it was unchanged. To publish: merge the branch into `main` (or open a PR from it). No PR
has been opened; agents in this repo do not open one without being asked.

```bash
git fetch origin
git log --oneline origin/main..claude/keep-working-on-this-ewipvq   # what would ship
```

## 2. What shipped onto the branch this session

| | |
|---|---|
| **Places as entities** (Track B) | `/place/:slug` + `/ur/place/:slug`, **29 pages** from a closed **66-entry** vocabulary. Indexed on `/coverage`, pills on every shrine masthead, prerendered both languages, in the sitemap. Lahore holds 35 sites and five of the six traditions. |
| **The Urdu dictionary left the English critical path** | `urdu-seed.json` (80 KB) is loaded on demand. `index.html` **322 KB → 248 KB** of eager JS; the map route **611 → 537**. The service worker was *also* prefetching both language payloads for every visitor (1.1 MB) — precache **4980 KiB → 3865 KiB**. |
| **Command palette** (⌘K / `/`) | Spotlight-style overlay: search in the middle of the screen, filters behind a button at the trailing end of the field, live results with keyboard navigation, translucent panel. The sidebar's inline search + five chip rows are gone; the chips moved into `ShrineFilters`, used by both surfaces. |
| **Mobile bottom sheet fixed** | It was **2201px wide starting at x = −1811** with the list open, because `inset-inline-start: auto` cancelled `left: 0`. Peek raised 108 → 184px so the way in is visible; the list button expands the sheet in the same tap. |
| **Tour panel** | Four rows of filter chips folded behind one Filters control with a count, plus the result count. |
| **Order pages** | Each member now carries the photograph of the shrine that holds them and the dates the graph records; new "Where this order stands" (place pills, derived) and "Sites of this order" (photo cards) sections. |
| **Glass / translucency** | `--glass-bg` / `--glass-blur` / `--glass-border` tokens (light + dark), applied to the palette, the map controls and the sheet header, each behind `@supports` so a browser without `backdrop-filter` gets an opaque surface rather than text over a live map. |
| **Motion vocabulary** | `.hover-lift`, `.pulse-once`, `.js-reveal` + `useRevealOnScroll` (article sections arrive as you reach them). Every keyframe is switched off under `prefers-reduced-motion`, enforced by `motion.test.ts`. |

## 3. New checks (the ones a future session will thank us for)

Each of these was written because something real slipped past everything else:

| Check | Catches |
|---|---|
| `src/styles/__tests__/classNamesStyled.test.ts` | A `className` that exists in **no stylesheet**. Written after doing it twice in one afternoon; found a third case on `/saint/:slug`. |
| `src/styles/__tests__/cssTokensDefined.test.ts` | `var(--x)` where `--x` is never declared, and needless fallbacks. Found **six live references to four properties that never existed** — including the two that made the tour chips "ugly" (`--color-surface`, `--radius-pill`). |
| `src/styles/__tests__/sheetPeekHeight.test.ts` | The mobile peek height diverging across the three rules that use it. |
| `src/lib/data/__tests__/placesVocabSync.test.ts` | The place vocabulary drifting between `places.ts` and `scripts/data/lib/places.mjs`, and the two sides reading the `Location` column differently. |
| `e2e/no-overflow.spec.ts` | **Anything overflowing its box, 9 routes × 2 languages × 3 widths.** Found a real Urdu-only overflow (`.sidebar-title` at 390px). This is the check for "does the Urdu overflow anywhere". |
| `e2e/mobile-sheet.spec.ts` (extended) | The sheet's width and position with the list open, in both directions. |
| `scripts/check-routes-prerendered.mjs` (extended) | Every sitemap URL resolving to a file, and dist ↔ sitemap counts per language. |
| `e2e/payload.spec.ts` (extended) | The dictionary staying off the English critical path *and* arriving in time to be used. |

## 4. Where to pick up — in priority order

The last instructions in the session were: **animations, database enrichment (Sufi orders),
more features, an aesthetic overhaul of tours and the table of shrines, translucency, coherence,
no Urdu overflow.** Most of that is done (§2); what remains:

1. **Verify the new UI end to end.** `npm run verify` and the full Playwright run were green
   before the palette landed; the palette's own e2e coverage does **not** exist yet. Write
   `e2e/palette.spec.ts`: open on ⌘K / `/` / the trigger, type, ↑↓ + Enter selects, Esc closes,
   focus returns to the trigger, filters button reveals the chips, both languages.
2. **The a11y sweep has never seen the palette or any mobile-only UI.** `e2e/a11y.spec.ts`,
   `urdu-no-leak.spec.ts` and `urdu-accessible-names.spec.ts` all run at a desktop viewport with
   no overlay open. That is how the sheet handle kept a hardcoded English `aria-label` for
   months. Add an open-palette state and a phone viewport pass.
3. **Database enrichment for the orders is still shallow.** What shipped is derived (places,
   sites, dates). The KG holds 235 verified-but-unreviewed proposals
   (`npm run data:validate:kg-proposals`), 50 of them about orders; importing any of them is a
   human review decision (RULE 2), not an agent's.
4. **Track C (chronology)** remains the last unstarted track in
   `docs/planning/SHARED_GROUND_VISION.md`, still gated on date quality.
5. **Deferred to a human** (unchanged): import `data/patch_data_hygiene_2026-08-21.csv` (2 rows);
   review the ~80 new Urdu draft strings from this session; the graph's 253 declared Latin runs;
   the almanac's 157 single-occurrence observance segments; 51 entries with no photograph.

## 5. Gotchas that will cost you an hour otherwise

- **Playwright needs an explicit browser path here.** The bundled expectation is
  `chromium_headless_shell-1228`; this container has `-1194`. Run e2e as:
  ```bash
  PLAYWRIGHT_CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome npx playwright test
  ```
- **Five e2e failures are environmental, not yours.** Four `persistence.spec.ts` cases and one
  `tours.spec.ts` geolocation case fail because every external subresource times out through the
  agent proxy (a reload of `/` takes ~12.6 s). Verified by rebuilding a pre-session commit and
  watching them fail identically. Do **not** loosen the timeouts to make them pass.
- **Never rebuild `dist` while a Playwright run is in flight.** It silently invalidates the run;
  it happened once this session and the results had to be thrown away.
- **`vite preview` cannot serve a subpath build.** For the production base path use
  `npm run verify:pages`, which brings its own GitHub-Pages-shaped static server.
- **`npm run build:e2e` builds with base `/`; `npm run build` builds with the Pages base.** The
  e2e suite needs the former, `verify:pages` the latter.

## 6. The commands that matter

```bash
npm run verify        # typecheck + lint + format + 585 unit tests + data gates
npm run build         # + bundle budgets + prerender + route/sitemap gates
npm run build:e2e     # same, base '/' — required before Playwright
npm run verify:pages  # production base path, 13 routes, GitHub-Pages semantics
npm run e2e           # Playwright (see the browser-path gotcha above)
```

---

*Written as the session's own handover, per RULE 0: if it is not in the repository, it does not
exist. Every number in it was measured in this session, not estimated.*
