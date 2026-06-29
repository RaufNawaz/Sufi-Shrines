# P0 — Stabilize the Foundation (Claude Code)

You are the senior engineer on this repo (a bilingual React + Vite + TypeScript map of Sufi shrines). The active app lives in `src/` and `index.html` loads only `/src/main.tsx`. An older vanilla-JS version of the app is still sitting in the repo root and creating confusion. This task is **foundation work, not features** — archive the old code, lock the build with CI, make the data layer fail safe, and fix the broken PWA assets.

Work on a branch named `chore/p0-stabilize`. Use `git mv` so history is preserved. Make small, logically-grouped commits. At the end, run `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` and confirm all pass. **Do not** start the UX work from `REDESIGN_FOLLOWUP.md` or any new features here — keep this PR surgical and limited to the tasks below.

First, restate the plan as a checklist and flag anything you think is risky before you start.

---

## 1. Archive the legacy vanilla-JS app (don't delete it)
These files are the pre-React version and are no longer loaded by `index.html`. Move them into a new `legacy/` folder using `git mv` (preserve git history):

- `app.js`
- `shrine.js`
- `shrine.html`
- `style.css`
- `data-source.js`
- `editor-config.js`
- `translations.js`
- `map.geojson`
- the existing root `data.csv` (1-row stub — superseded by the fallback created in step 3)

Then:
- Add `legacy/README.md` explaining: *"This is the original vanilla-JS version of the site, retained for reference only. It is not built, imported, or deployed. The live app is the React/Vite/TypeScript project in `src/`."*
- **Verify nothing in `src/` or `index.html` imports or references any archived file** (grep for them). If any reference exists, stop and report it rather than breaking the app.
- Confirm `index.html` still loads only `/src/main.tsx`.
- Run `npm run build` and confirm the archived files are **not** included in `dist/` (Vite only bundles the module graph + `public/`, so files under `legacy/` should never ship — verify this is true).

Note: the OCR/Python tooling (`process_books.py`, `build_translation_cache.py`, `BOOK_OCR_WORKFLOW.md`, `LOCAL_OCR_QUICKSTART.md`) is still useful maintainer tooling — **leave it where it is** for now (do not archive it).

## 2. Update the docs to match reality
- Rewrite `HANDOFF.md` so it documents the **React app** (entry point `src/main.tsx`, `npm run dev/build/test`, the data flow via `useShrineData` → Google Sheets CSV with committed fallback, deploy as static `dist/`). The current `HANDOFF.md` describes the old vanilla app and is now misleading.
- Update the root `README.md` the same way if it also describes the old app.
- Add a short `CHANGELOG.md` noting the React rewrite, the redesign passes, and this stabilization.

## 3. Make the data layer fail safe
Today the app fetches a single public Google Sheets CSV at runtime (`CSV_URL` in `src/lib/data/constants.ts`) and only falls back to a localStorage cache. If Sheets is unavailable on first visit, the map is empty.

- Add an npm script (e.g. `data:snapshot`) that downloads the current CSV from `CSV_URL` and writes a committed fallback at `src/data/shrines-fallback.json` (parsed/normalized rows). Run it once now and **commit the real snapshot** (replacing reliance on the old 1-row stub).
- Wire this committed snapshot into `useShrineData` as the **final fallback**: try network → then localStorage cache → then the bundled snapshot, so the site always renders shrines even fully offline / if Sheets is blocked. Keep the existing background-refresh behavior.
- Add lightweight **schema validation**: a row must have `Name`, valid numeric `Latitude`, and `Longitude` to become a marker. Invalid rows should be skipped (and `console.warn`'d in dev), never crash the app.
- Important: the production **build must not depend on a live network fetch** — the snapshot is refreshed manually via the script and committed, not fetched during `npm run build` (so CI and offline builds work).

## 4. Add CI (quality gate)
- Add `.github/workflows/ci.yml` that runs on pull requests and pushes to `main`: `npm ci`, then `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build`. Use Node 20 and cache npm.
- Make sure all four commands actually pass on the current code. If `npm run lint` (which runs with `--max-warnings 0`) fails, fix only the lint errors you can resolve cleanly; if something needs a broader change, list it for me instead of doing a large unrelated refactor.
- In the PR description, include a note that I need to enable **branch protection on `main`** (require the CI check to pass) in GitHub settings — that's a UI step you can't do from code.

## 5. Fix the missing PWA assets
`vite.config.ts` and `index.html` reference icons that don't exist in `public/` (which currently only has `_redirects`, `favicon.svg`, `robots.txt`):

- Generate `public/pwa-192x192.png`, `public/pwa-512x512.png`, and `public/apple-touch-icon.png` from the existing `public/favicon.svg` (a small one-off `sharp` script is fine; remove the script after or keep it under `scripts/`). Match the brand color background (`#1a5c4e`) where a maskable/filled icon is needed.
- Verify the generated icons satisfy the manifest in `vite.config.ts` and the `apple-touch-icon` link in `index.html`, and that `npm run build` produces a valid manifest with resolvable icons.

## 6. Branch & repo hygiene
- Make sure all the work above is committed on `chore/p0-stabilize` with clean, scoped commits, targeting `main`.
- In the PR description, list the manual follow-ups I should do in GitHub (enable branch protection; delete stale `1.1`/`1.2` branches once merged; consider moving the 258 MB `AFADA-E-KABIR.pdf` and `tessdata` to Git LFS or external storage — note these are already git-ignored, so just flag whether they're bloating history).

---

## Definition of done
1. Legacy files live under `legacy/` (moved via `git mv`, history preserved) with a `legacy/README.md`; nothing in `src/`/`index.html` references them; `dist/` contains none of them.
2. `HANDOFF.md` and `README.md` describe the React app; `CHANGELOG.md` exists.
3. The app renders the full shrine set even with no network and no localStorage cache (verify by temporarily blocking/forcing-failure of the CSV fetch); malformed rows are skipped, not fatal; the production build does no live data fetch.
4. `.github/workflows/ci.yml` runs typecheck + lint + test + build and all pass.
5. `public/` has the three PWA icons and the manifest/`apple-touch-icon` resolve.
6. `npm run typecheck`, `npm run lint`, `npm run test`, and `npm run build` all pass locally; changes are on `chore/p0-stabilize` with a PR description listing the manual GitHub steps.

When done, summarize what changed, how much code was archived vs. active, and exactly which manual steps remain for me.
