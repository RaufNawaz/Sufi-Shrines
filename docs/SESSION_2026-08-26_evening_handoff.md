# Handoff — 26 August 2026, evening session

Written mid-session because the reviewer had to move locations. Everything below is committed
on branch `claude/website-explorer-improvements-f5bwgk`. Nothing has been pushed.

---

## 1. What shipped

| Commit | What |
|---|---|
| `c2482cd` | **A1** — the order pages carry their own ʿurs calendar |
| `180c8db` | **The ʿurs almanac has a calendar view** (`?view=calendar`) |
| `657e7a5` | **Live-sheet sync check + the import-ready CSV**, and two new data findings |

All three were reviewed at http://localhost:5173 in **both languages**, driven with Playwright.
`npm run typecheck`, `npm run lint`, `npm run test` (937 passing) and `npm run data:validate`
are green. **`npm run e2e` has NOT been run this session** — see §4.

### A1 — `/order/:slug` → "ʿUrs in this order"

`getOrderObservances()` in `src/lib/kg.ts` walks `belongs_to_order` → `commemorated_by`. 63 ʿurs
across the five orders were on the far side of a join no page walked.

The one decision worth carrying forward: **the date does not come from `KGEvent.date`.** That
field is a bare month present on 16 of 149 nodes. The date is read off the shrine's own `Events`
cell through `parseObservances` — the almanac's reader — so day ranges, month ranges and seasons
all arrive, and the cell is printed verbatim beside what was read out of it. Roughly two thirds
of the rows have no readable date and say "date not recorded"; the count sits above the list.
Unit test: `src/lib/__tests__/orderObservances.test.ts` (14 assertions, including one that fails
if a non-ʿurs event ever reaches an order page, because the heading would then be wrong).

The Urdu no-leak budget rose by exactly the new list's runs (+11/+7/+6/+5/+1, measured per
route). Each is an `Events` segment the observance dictionary does not carry yet, so the number
falls as `urdu-i18n/build_dictionary.py` gains entries.

### The almanac calendar view

`src/lib/data/almanacCalendar.ts` + `src/components/almanac/AlmanacCalendar.tsx`.

**The rule, and it lives in the builder where it is tested: only an observance recorded with a
day gets a day.** The ten recorded to a month alone are listed under the grid, unplaced. This is
not fussiness — a month-precision entry already carries a window covering the whole month
(the list view needs it to say "Muharram"), so a placement loop that read windows would fill
thirty squares with an ʿurs nobody dated, and nothing would error. 16 unit tests pin it.

A Hijri month straddles two Gregorian months, so a month-only entry is listed under both. One
true statement about one window, twice; dropping the second would under-report for half the span.

One month at a time with prev/next, not twelve stacked grids (22 of 169 sites carry a day-precise
date). A day with observances is a button that narrows the cards beneath — which is what makes
the grid work on a phone, where cells cannot name anything. `ObservanceCard` moved to
`src/components/almanac/` and **both** views render it, so the "approximate" flag cannot go
missing from one of them.

### The sheet

- `data/snapshot_live_sheet_2026-08-26.csv` — the fetched live export (171 × 44).
- **`data/snapshot_import_2026-08-26.csv` — THE FILE TO IMPORT.** 171 rows, 44 columns, 9 cells
  changed, every invariant green.
- `data/patch_location_notes_2026-08-26.csv` — the new 2-row patch.
- `pipeline/build_import_csv.py` — rebuilds the import file from live + any patches.

```bash
curl -sSL -o data/snapshot_live_sheet_<date>.csv "$(python3 -c "import json;print(json.load(open('data/csv-source.json'))['csvUrl'])")"
python3 pipeline/build_import_csv.py \
  data/snapshot_live_sheet_<date>.csv data/snapshot_import_<date>.csv \
  data/patch_data_hygiene_2026-08-21.csv data/patch_location_notes_2026-08-26.csv
```

**Import settings (RULE 3): Replace current sheet · comma separator · "Convert text to numbers,
dates and formulas" OFF.** The file is the *whole* sheet on purpose — a partial patch imported
with Replace deletes every row it does not carry.

Findings are in `docs/HANDOVER.md` §9 under "Added 26 August 2026 (evening)". The short version:
the sheet is in sync with the repo; the internal `ask Saifullah` note is in public `Location` on
**four** rows, and the two the old patch missed are the two rows the app drops for having no
coordinates — so `publication-safety`, which reads the 169-row app snapshot, is structurally
blind to them.

---

## 2. Running when the session paused

**Four background research agents** hunting openly licensed photographs for the **51 entries
with no image at all**, split by tradition:

| Targets | Output |
|---|---|
| `pipeline/image-hunt/targets_sikh.tsv` (18) | `pipeline/image-hunt/candidates_sikh.tsv` |
| `pipeline/image-hunt/targets_udasi.tsv` (12) | `candidates_udasi.tsv` |
| `pipeline/image-hunt/targets_hindu-jain.tsv` (9) | `candidates_hindu-jain.tsv` |
| `pipeline/image-hunt/targets_muslim.tsv` (12) | `candidates_muslim.tsv` |

Each was given the A7 hard rules verbatim: Wikimedia Commons / archive.org / museum open-access
only; **the identification of an image is content, so the source's own caption is quoted verbatim
and a row is never recorded unless the source names the site**; license exactly as stated or no
row; no AI imagery; deity images tagged `tradition-review required`; an empty result recorded as
a row saying so, so the next session does not re-search it.

**Nothing from this renders anywhere.** The next steps are, in order: (1) check the four
`candidates_*.tsv` exist and merge them; (2) the editor approves per candidate; (3) only then
the wiring — RMS pixel comparison before any copy, license + attribution as required fields
behind a loud build gate. If the files are not on disk, the agents did not finish; re-run them
rather than trusting a summary.

---

## 3. Asked for, not started

Both were requested this session and are unstarted. Neither is blocked.

### Enriching the figure pages (`/saint/:slug`)

The prompt was a screenshot of `/saint/baba-pir-ratan-nath` — a page with a name, three titles,
one shrine row, and nothing else. **What the archive already holds for that exact figure and does
not show:**

| Held | Where | Rendered on the saint page? |
|---|---|---|
| Peshawar, Khyber Pakhtunkhwa | shrine `Location` + `placesForShrine` | **no** — no place anywhere |
| "Maha Shivratri" | shrine `Events`, and a `commemorated_by` event node | **no** — `nextUrs` shows only *dated* observances inside 12 months |
| A Wikimedia photograph of the site | shrine `Image 1` | **no** — the shrine row is a bare chevron |
| Hindu Temple; Temple; Active | `category`, `site_type`, `status` | **no** |
| 1850, precision `century`, "British colonial period, 19th c." | `year_built*` | **no** |
| A full `## Overview` whose second sentence is about the yogi-saint himself | shrine `Description` | **no** |

So four sections, all display of held data, none needing new content:

1. **"Where this figure rests"** — place link(s) + the recorded `Location`.
2. **"Days kept for this figure"** — every recorded observance, dates as recorded, "date not
   recorded" where there is none. *Reuse the A1 pattern directly* — `getOrderObservances` is the
   model, and `parseObservances` + `formatSourceDate` + `localizeObservance` already do the work.
3. **The site's photograph and facts on the associated-shrine rows** — the order page's member
   list already argues this: a figure has no portrait, but the shrine that holds them is
   photographed for 118 of 169 entries, and that is the closest thing to a face the archive can
   honestly show.
4. **"What the archive does not record"** — an explicit list for a figure with no dates, no
   order, no teachers. This is the project's own ethos and it is what turns an empty page into
   an informative one.

A fifth, higher-value and needing a guard: **the entry's biographical section on the figure's
page.** 26 entries carry `## The Life of the Saint`, 4 `## The Life of the Poet-Saint`, 2 `## The
Saint and the Tradition` — ~32 sections of real biography that render only on the shrine page.
The guard is mandatory: show it **only** when the entry names *this* figure as its
`principal_figure`, or when the figure is the only one `buried_at` that entry. Two figures share
some entries, and echoing one entry's biography onto both pages would misattribute it.

### Settings / customization

Requested as "expand the setting thing so people can add customizations". Today the sidebar
Settings header holds exactly two: the directory mode (`shrines_directory_mode`) and the numerals
toggle. `src/lib/storageKeys.ts` is the persistence convention; `feedback_design_direction_os_minimal`
is the design direction. No scoping done yet — worth one round of "which customizations" with the
reviewer before building, because the answer changes the shape entirely (display density? default
language? map basemap? saved-list behaviour? reduced motion?).

---

## 4. Before this branch merges

- **`npm run e2e` has not been run this session.** It needs `npm run build:e2e` first. Two specs
  are directly implicated: `e2e/urdu-no-leak.spec.ts` (budgets raised for five order routes —
  the numbers were measured against the dev server, and the baseline matched the fixture exactly
  on all five, so they should hold) and `e2e/a11y.spec.ts` (two new surfaces: the order ʿurs list
  and the calendar grid). Mind HANDOVER §9.46: the a11y sweep must wait for animations to settle
  or it reports contrast failures that do not exist.
- **No e2e spec covers either new surface yet.** That is Lane B3 in
  `docs/planning/NEXT_STEPS_2026-08-26.md`, now with two more things to cover.
- The Urdu strings added this session are **drafts, not reviewed by a fluent speaker**, and are
  marked as such in `uiStrings.ur.ts` alongside the existing order-page block.
