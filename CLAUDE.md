# CLAUDE.md — Mapping the Shrines of Pakistan

Read this file before doing anything. It is the operating contract for this repository.

Public archive of Sufi shrines and other religious sites in Pakistan — Muslim shrines, Hindu
temples, Sikh gurdwaras, Nanakpanthi/Udasi darbars, Jain temples, and secular memorials.
Live at `raufnawaz.github.io/Sufi-Shrines/`. React + TypeScript + Vite → GitHub Pages,
reading a Google Sheet as published CSV at runtime. Bilingual English/Urdu — the mission bar
is **equally excellent in both languages**, not English with an Urdu afterthought.

**Stack:** React 18 + TypeScript + Vite · React Router · Leaflet/react-leaflet · MiniSearch
(web worker) · PWA (vite-plugin-pwa) · Vitest + Testing Library · Playwright (e2e) ·
Storybook · axe (a11y) · Lighthouse CI. Data tooling in Python (`pipeline/`, OCR via
Tesseract `urd`/`fas`, translation drafts via NLLB/LibreTranslate).

---

## RULE 0 — This repository is the only place work is retained

**This folder is where I actually work. Anything that matters must end up here, in the repo,
before a session ends.** Not in a chat transcript, not in a scratch directory, not in a
temporary outputs folder that gets cleared. If it is not committed here, it does not exist.

That applies to all of the following:

| Kind of thing | Where it goes |
|---|---|
| Decisions, plans, roadmaps, proposals | `docs/` |
| Engineering notes (how a subsystem works, orientation for the next session) | `docs/` |
| Handover / status / runbooks | `docs/` |
| Prompts written for Claude Code or other agents | `docs/prompts/` |
| Pipeline scripts, termbase, manifests | `pipeline/` |
| CSV snapshots and patches | `data/` |
| Drafted shrine entries, field survey transcriptions | `entries/` |
| Raw downloaded media (gitignored, but kept here) | `media-source/` |
| Findings, measured numbers, gotchas | this file or `docs/HANDOVER.md` |

**Applies to any agent working on this project:** if you produce a document, a script, a
measurement, or a non-obvious finding, write it into the correct folder above as part of the
same task. Do not finish a task by describing a file that only exists in your reply. If you
learn something that would cost the next person an hour to rediscover, append it to
`docs/HANDOVER.md` §9 and say that you did.

**Why this rule exists:** work has repeatedly been produced in scratch locations, then lost or
re-derived. A `image_urls.tsv` reported as written could not be found afterwards. Multiple
sessions rediscovered the same directory trap. The fix is not better memory, it is putting
things in one place on purpose.

The repository also sits inside an iCloud-synced Desktop folder, so files kept here are backed
up. Files in `~/shrines` are not.

---

## RULE 1 — The path trap

Two directories on the Desktop render identically in a terminal, differing only in the
apostrophe of "rauf's MacBook Air":

- straight `'` (U+0027) → one stale `archive/` folder, **no git. A decoy.**
- curly `’` (U+2019) → **this repository.**

`find ~/Desktop -maxdepth 3 -type d -name "Shrines Project" -print -quit` returns the decoy.
**Never derive this path by `find`.** Use the symlink:

```bash
ln -sfn "/Users/rauf/Desktop/Desktop - rauf’s MacBook Air/Harvard/Shrines Project" ~/shrines-repo
```

`~/shrines` (no suffix) is a legacy pipeline directory being folded into `pipeline/` here. It is
unversioned and unbacked-up. Prefer this repo; when you touch something in `~/shrines`, move it
in rather than editing in place.

Do not touch anything under `Awqaf/` on the Desktop. Separate project.

---

## RULE 2 — Never invent content

Not a date, not a coordinate, not a *silsila*, not a citation, not a founding year.

If a value is missing, leave it empty and report it. If a referenced file is missing, stop and
say so — do not reconstruct its contents from general knowledge.

The editorial standard is: **report whatever the data says, including when the data is
contradictory.** A field reading *"1416 AH is the survey's answer to 'in which year was this
place built', but may refer to the saint's death rather than construction"* is **correct** and
must not be tidied into a clean number. Those qualifying notes are the most honest content in
the archive.

Provenance matters beyond dates too: sources come from OCR'd primary texts under `out/ocr/`
and `shrine_entries/`. Keep claims sourced; machine translations are drafts until reviewed.

---

## RULE 3 — The Google Sheet is production

The live site fetches it at runtime (`CSV_URL` in `src/lib/data/constants.ts`, URL recorded
once in `data/csv-source.json`). A sheet edit deploys instantly, with no review step and no
history discipline. Therefore:

- Agents do not write to the sheet. Produce a CSV patch for a human to import.
- **Export CSV, never TSV.** Sheets' TSV export silently strips newlines inside cells, which
  destroys the markdown structure of every Description. Nothing errors; you find out later.
- Import settings: **Replace current sheet, comma separator, "Convert text to numbers, dates
  and formulas" OFF.** Left on, `1041` becomes a number and Hijri date strings mangle.
- **Sheet values are join keys. Code labels are cosmetic.** Never rename a value in the sheet to
  get a nicer label — change the display mapping in the code.

---

## RULE 4 — Encode invariants, don't rely on intentions

Every serious error in this project's history was a plausible assumption that was never cheaply
checked. What has actually worked is checks that fail loudly:

- unbalanced-asterisk check before writing a CSV
- refuse-to-write if any long Description has lost its newlines
- marker-count vs row-count after a front-end change
- RMS pixel comparison before any media sync (filenames lie — one filename spans two shrines)

When you fix a class of bug, add the invariant. Prefer a check that exits non-zero over a note
saying "be careful here".

And: **do not edit content to satisfy a failing check.** A linter once flagged the phrase "a
poet of note:" as a generation artefact, and a session responded by editing the prose. The
linter was wrong. Fix the check.

---

## Schema

**`category`** — exactly one of: `Muslim Shrine` · `Hindu Temple` · `Sikh Gurdwara` ·
`Nanakpanthi / Udasi Darbar` · `Jain Temple` · `Secular / Memorial`

**`site_type`** — the built form (short term; prose belongs in `site_type_note`)

**`status`** — `Active` · `Occasional` · `Heritage` · `Ruin` · `Destroyed`
(prose belongs in `status_note`)

**`support_level`** — `Field-verified` · `Source-documented` · `Source-seeded` · `Web-compiled`
**`info_level`** — `Full` · `Moderate` · `Low`

**Dates, split:** `year_built`, `year_built_precision`, `year_built_note`, `figure_born`,
`figure_died`, `event_year`, `event_note`. Legacy `Category`, `Sufi Saint`, `Founded/Opened`
are still read as fallbacks — nothing goes blank mid-migration.

**`Description` contains meaningful markdown** — `*ʿurs*` italics, `## History` headings, `- `
bibliography items. Render as markdown; never strip or normalise it. Article sections can be
authored **inline** inside `Description` or in **dedicated columns** (`History`, `Architecture`,
`Rituals`, `Saint Biography`, `Events & Urs`, `Visiting Info`, `Sources`) — see
`ARTICLE_SECTION_DEFINITIONS` in `src/lib/data/constants.ts`, parsed by
`src/lib/data/articleParsing.ts`.

---

## Do not break these

**Eight slugs carry live photo URLs.** Renaming any of them breaks published images:

```
data-darbar · abul-faiz-qalander-ali-suharwardi · bibi-pak-daman · ganj-e-inayat-sarkar
madho-lal-hussain · mazar-e-iqbal · peer-makki · shah-jamal
```

**MapTiler "Invalid key" tiles** are *not* an origin restriction, and not localhost-only —
that was this file's standing diagnosis until 18 August 2026, when it was actually measured.
The key is valid from every origin; what returns 403 is **raster tiles of a custom Map Designer
style** on this account, production included. MapTiler serves that 403 with an `image/png` body,
so Leaflet renders the error text as a basemap. The default is now the built-in `streets-v2`
style plus `language=en` (same English labels the custom style existed for, and it does serve
raster), and `ThemeAwareTileLayer` falls back to keyless CARTO after 4 `tileerror`s. Full
measurements and the "if it recurs" probe in `docs/FRONTEND_NOTES.md` §6. Never commit a key.

---

## Internationalization — READ BEFORE TOUCHING URDU

The Urdu experience must be **as complete and native-feeling as English**. The full plan is in
`docs/planning/URDU_IMPLEMENTATION_PLAN.md`; roadmap in `docs/planning/PROJECT_VISION.md`. Hard
rules:

1. **UI strings** live in `src/lib/i18n/uiStrings.ts` (`UI_TEXT.en`/`.ur`, `t()`, `tFn()`). Do
   **not** add inline `lang === 'ur' ? '…' : '…'` in components — add a key. An ESLint rule
   blocks new inline ternaries.
2. **Data translations** (names, saints, places, categories, facets, dates) live in
   `urdu-i18n/` and are wired via `src/data/urdu-seed.json` → the cache in
   `src/lib/i18n/urduFallback.ts`. Regenerate with `npm run data:build:urdu` (or the full
   pipeline `npm run urdu:build`); `npm run data:validate` runs the same script in `--check`
   mode (no writes).
3. **Never render character-by-character transliteration.** Unknown Latin input returns the
   original string (+ a DEV warning). The old `CHAR_URDU_MAP` path must stay removed.
4. **Nastaliq everywhere.** `--font-urdu` must apply to all elements including
   buttons/inputs/chips in `[dir='rtl']`.
5. **Numerals:** Eastern (۰–۹) by default in Urdu with a persisted toggle. Use `fmtNum()`
   from `LanguageContext` at **every** number render site. **Coordinates stay Western.**
   (`toEasternDigits`/`localizeDigits` in `src/lib/i18n/numerals.ts`.)
6. **RTL/bidi:** logical CSS properties (`inset-inline-*`, `margin-inline-*`,
   `text-align: start`), `<bdi>` around mixed Latin/number runs (e.g. an unreviewed English
   source note shown in the Urdu view), locale-aware `localeCompare(…, 'ur')`.

**Definition of done for any Urdu/i18n change:** `npm run verify` + `npm run e2e` green
(including the no-leak guard); ESLint blocks new inline ternaries; Nastaliq on all controls;
Eastern numerals reach every number site; no English or transliteration in the Urdu view
outside URLs/coordinates/`<bdi>`.

---

## Coding conventions

- TypeScript strict; keep `npm run verify` green. No new lint warnings (`--max-warnings 0`).
- Components are functional + hooks; prefer existing patterns (see `TRADITION_LABELS` in
  `src/lib/tours/tours.ts` as the model for enum label maps).
- Accessibility is a requirement, not a nice-to-have (axe + Storybook a11y). 44px targets,
  correct `lang`/`dir`, focus states.
- Respect provenance and the three traditions in copy, imagery, and terminology (honorifics
  per `data/glossary.csv`).
- Tests: unit for logic (`src/**/__tests__`), Playwright for journeys. The
  **"no-English-leak"** guard for `?lang=ur` (`e2e/urdu.spec.ts` — fails on `[A-Za-z]` under
  `[dir='rtl']` except URLs/coordinates/`<bdi>`) must stay green.

---

## Standing findings

- **49 of 167 entries (29%) have no bibliography at all** — single-paragraph prose giving
  specific dates and lineages with nothing cited. Verified not a formatting artefact. These
  should compute to `Web-compiled` / `Low`; if they render better than that, the computation is
  wrong — report it rather than adjusting the badge.
- Coverage is ~31% of Punjab Auqaf's Punjab register alone (167 vs 534).
- 18 video files, **zero audio recordings**, despite oral history being the stated purpose.
- Mauj Darya Bukhari lost all 12 media files (verified 404s). Data Darbar and Bibi Pak Daman
  photos are WhatsApp-compressed. All need re-shooting.

Full detail, plus a list of previously-confident-but-wrong diagnoses, in `docs/HANDOVER.md`.

---

## Layout

```
docs/          plans, roadmaps, handover, proposals, briefs
docs/prompts/  prompts written for agents
pipeline/      python scripts, termbase.tsv, photo_manifest.tsv
data/          CSV snapshots and import patches
entries/       drafted entries and field survey transcriptions
media-source/  raw downloaded media (gitignored, kept for backup)
public/        the site's published assets, including photos/<slug>/
```

Front-end source layout, for orientation:

- `src/pages/` — routes: `MapPage`, `ShrinePage`, `SaintPage`, `OrderPage`, `NotFoundPage`.
- `src/components/map/` — `ShrineMap`, `MapSidebar` (browser + filters, with
  `WelcomeCard`/`ShrinePreview`), `ShrineMarkers`, `TimeSlider` (era filter),
  `TourPanel`/`TourList`/`TourPreview`/`TourRoute` (guided tours).
- `src/components/shrine/` — `ShrineArticle`, `ShrineInfobox`, `ContentsNav` (ToC),
  `RelatedShrines`, `ShrineGallery`, `LocationMap`, `SourcesProvenance`, `useArticleContent`.
- `src/components/kg/` — `LineageView`, `NetworkGraph` (saints/orders graph).
- `src/lib/i18n/` — `LanguageContext`, `uiStrings`, `numerals`, `urduFallback`,
  `localizeShrineName`. **All user-facing strings and localization flow through here.**
- `src/lib/data/` — `articleParsing`, `fieldAliasing`, `era`, `categoryKey`, `constants`,
  `shrineModel`, `slugify`, `fieldLabels`, `infoLevel`, `supportLevel`, `siteStatus`.
- `src/lib/tours/` — tour model, geo/distance, progress, audio (TTS), autoplay.
- `src/data/` — `tours.json` (8 tours), `urdu-seed.json` + `urdu-content.json` (from
  `urdu-i18n/`), fallback shrine data.
- `urdu-i18n/` — **Urdu dictionary + article content source of truth.**

---

## Commands

```bash
npm run dev              # local dev server — then check the console for errors
npm run build            # tsc + vite build + scripts/prerender.mjs — must pass before any commit
npm run verify           # typecheck + lint + unit tests  ← run before every commit
npm run test             # vitest run
npm run e2e              # playwright (build first with npm run build:e2e — root base path)
npm run lint / typecheck
npm run format           # prettier --write (format:check in CI)
npm run data:build       # fetch sheet CSV → data/shrines.json + csv + app snapshot
npm run data:build:urdu  # regenerate Urdu seed files (build_dictionary.py)
npm run data:validate    # dataset + tours + Urdu-parity (--check) + no-leak gates
npm run data:export      # KG + JSON-LD + RDF
npm run urdu:build       # full Urdu pipeline (urdu-i18n/build-all.sh, 4 steps)
npm run storybook

cd pipeline
python3 validate_shrines.py <sheet-export>.csv --termbase termbase.tsv --fail-on NONE
```

Commit in coherent units with a scope prefix (`data:`, `media:`, `feat:`, `docs:`). Show
`git diff --stat` before committing. Do not push without being asked.

---

## Pointers

- `docs/README.md` — index of all reference and planning docs.
- `docs/HANDOVER.md` — full state, trust calibration, risks. Read §1, §2, §9 first.
- `docs/planning/URDU_IMPLEMENTATION_PLAN.md` — full phased Urdu plan.
- `urdu-i18n/README.md` — dictionary files, coverage, regeneration.
- `docs/planning/PROJECT_VISION.md` — blue-sky roadmap.
