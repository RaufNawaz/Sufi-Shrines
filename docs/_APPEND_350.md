
### 9.350 — 15 October 2026 (night): the Apple/Spotlight UI pass, picked up from Antigravity

Antigravity drafted `docs/planning/APPLE_UI_REFINEMENT_PLAN.md` and left four files half-done when its quota ran out; Claude Code picked them up. What shipped is recorded in that plan's "What shipped" section. Three findings that would each cost an hour to rediscover:

- **`check-bundle-budget.mjs` could silently stop measuring a route.** When a lazy chunk statically imports something Rollup hoisted *into* a page's chunk, the page's manifest key changes from `src/pages/X.tsx` to `_X-<hash>.js`, and the script — which matched on the `src/pages/` prefix — dropped it from the table and still printed OK. It happened to ShrinePage, the tightest route. Routes are now also found by `isDynamicEntry` + `name`, and a budgeted route that is not measured fails the build.
- **ShrinePage carried 127 KB of team-only data to every public reader.** `SourcesProvenance` (rendered only under `hasProjectAccess()`) statically imported `data/provenance.json`. Lazy now: the route's eager JS went 535 → 408 KB, budget lowered 534 → 415.
- **`Sheet` keys its open effect on `onClose`.** An inline arrow re-ran the effect every render, re-recording the element to return focus to. Pass a `useCallback`.

Also: the machine ran at a load average of 60–85 for most of the session (Google Drive, iCloud, thumbnailing — not ours). Two e2e timeouts and one Playwright "not stable" click were that, not the app; no timing was recorded as a performance number tonight.
