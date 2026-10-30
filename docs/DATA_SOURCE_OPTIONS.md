# Replacing the Google Sheet: options

Written 30 October 2026 at Rauf's request ("Is there a way to switch to a different description engine and database rather than a google sheet"; asked for a write up first). Status: **needs a ruling** (questions at the end). Nothing has been changed.

## What the sheet does today

- **It is production.** The site fetches the sheet as published CSV on every visit (`CSV_URL` in `src/lib/data/constants.ts`): 489 rows by 51 columns, about 837 KB, 80% of it `Description`. A slim index draws the map first, and `src/data/shrines-fallback.json` is the offline copy.
- **The repository already holds the articles.** The public English and Urdu articles are one file per site (`entries/descriptions_public/<id>.md` and `.ur.md`), the team versions too (`entries/descriptions/<id>.md`), and the Urdu the site shows comes from `urdu-i18n/content/<slug>.md`, never from the sheet. The sheet holds a copy of the English only so the site can fetch it.
- **`npm run data:build`** copies the sheet into `data/shrines.json`, `data/shrines.csv` and the app snapshot, and CI (`deploy-pages.yml`) runs `data:validate` before every deploy. But the live site does not wait for any of that: it reads the sheet directly.

## What it costs

1. **No review.** A sheet edit is live the moment it is typed, with no check and no history worth the name (CLAUDE.md RULE 3). Every data gate in the repository runs only on the snapshot, after the fact.
2. **The 50,000 character cell.** Long articles are split across `Description 2` to `Description 5` at `## ` headings, and the site rejoins them.
3. **The import ritual.** Anything written in the repository reaches readers only through a whole sheet CSV import ("Replace current sheet", comma, conversion off), built on a fresh export or it overwrites whatever was edited since. The 94 public descriptions are waiting on one now.
4. **Silent damage modes.** A TSV export strips newlines; "convert text to numbers" turns `1041` into a number and mangles Hijri dates. Neither errors.
5. **Two copies of every article** (the repository file and the cell), which drift.
6. **Everything is public.** A published CSV cannot hold a private field; the team view decides only what is shown (`docs/TEAM_ACCESS_PLAN.md`).

What the sheet gives: a grid anyone on the team can edit without tools, and instant updates.

## Options

### A. Files in the repository are the source; the sheet retires (recommended destination)

Each site becomes a file with its fields at the top and its article below (the public files already are the article half):

```
---
id: data-darbar
name: Data Darbar
category: Muslim Shrine
latitude: 31.5793
longitude: 74.3049
year_built: ...
---
## Overview
...
```

A build script compiles the files into the JSON the app loads (the shape `shrines-fallback.json` has now), split per article the way the Urdu articles already are. The site stops fetching anything at runtime. A push to GitHub runs the checks and deploys; a failing check stops the deploy instead of shipping the fault.

- **Gains:** review and history (git diffs, pull requests); no cell limit, no continuation columns, no import; one copy of each article; every RULE 4 check runs *before* readers see a change; smaller pages (a reader downloads the article they open, not 672 KB of everyone's); team only fields can be compiled out of the public build (pairs with option B of the team access plan).
- **Costs:** editing means git, or asking Claude; a change is live a few minutes after a push, not instantly; a migration.
- **Migration:** one script writes the current sheet out as files, and a check proves the compiled JSON equals what `data:build` produces from the sheet, row for row and field for field, before the site switches. The sheet stays as a read only archive for a while.

### B. Option A plus a web editor

The same files, edited through a browser form: Decap CMS, Sveltia CMS or TinaCMS, served at `/admin` on the same GitHub Pages site. Fields become form inputs and the article a Markdown editor; saving makes a commit, or a pull request for review.

- **Gains:** team members edit without git, and every save is still reviewed and checked.
- **Costs:** each editor needs a GitHub account; Decap needs a small sign in helper on hosts other than Netlify (Sveltia does not); Urdu right to left editing in these editors must be tried before anyone relies on it.

### C. A hosted database or headless CMS

Supabase (Postgres), Sanity, Directus and the like: an admin interface, user roles, an API, and fields that could be truly private.

- **Costs:** accounts and a service to run or pay for; the site depends on it at runtime or needs a build hook; instant production edits come back unless a publishing workflow is set up; the largest migration; lock in. For 489 rows on a static site it buys little that A and B do not.

### D. Keep the sheet as an input, but stop reading it live (smallest step)

GitHub Actions fetches the sheet (on a schedule or on demand), runs every data check, compiles the JSON and deploys. The site never reads the sheet. Editors keep the grid, but a bad edit fails the build instead of going live.

- Does not fix the cell limit, the import ritual for repository written articles, or the two copies.

## Recommendation

In three steps, each useful on its own:

1. **Articles from files now.** Compile `Description` from `entries/descriptions_public/` at build time; the sheet keeps the other 50 columns. This ends the import ritual and the cell limit for articles, removes the second copy, and makes the 94 public descriptions live without a CSV import.
2. **The rest of the sheet through the build (option D).** No live reads, every edit checked before it ships.
3. **Then decide** whether to move the structured fields into the files too (option A) and whether the team needs the web editor (option B).

## Questions for Rauf

1. Who edits the data besides you, and are they comfortable with GitHub, or do they need a form?
2. May an edit take a few minutes to appear (after the checks), or must it be instant?
3. Should any field ever be truly private, rather than hidden in the public view?
4. Shall I start with step 1 (articles from the repository files)?
