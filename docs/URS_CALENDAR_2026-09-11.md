# The Urs Calendar — layout, and what is deliberately not on it

*Written 11 September 2026, the day `/almanac` became a month grid in the shape a reader knows
from Google Calendar. The route is unchanged (`/almanac` is a published URL); the English name is
now **Urs Calendar** (`almanacTitle`, tab label `Calendar`); the Urdu was already عرس تقویم.*

## What the page is now

One toolbar, one grid, then the caveats and the accounting.

- **Toolbar** (`AlmanacCalendar.tsx`): *Today* · ‹ · › · the month and year (the section's `h2`),
  and at the far end the view switch (**Month | List**), *Add to calendar (.ics)*, and *Filters*
  with a count of active filters on it. The thirteen-pill month rail is gone — on a phone it was
  440 px of chrome above the thing the page is named after. The horizon starts in the current
  month, so *Today* is the first grid.
- **Grid**: a real `<table>` (caption, `scope="col"` headings, `aria-current="date"` on today),
  seven columns, `table-layout: fixed`. Day numbers sit in the top-start corner; today's is a filled
  accent circle (`--color-on-accent` on `--color-accent`, never white). Outside-month cells are
  present and dimmed.
- **Bars**: each day-precise observance is one coloured bar across every day its projected window
  covers, wrapping at the week edge with its start squared off so it reads as one thing.
  Colour is the tradition's (`--color-cat-*` edge on the `-pale` ground, page text on top, so it
  survives dark mode). Overlapping observances stack in lanes; more than three lanes folds into
  **+N more**, which opens the day's full list.
- **Popover** (`ObservancePopover.tsx`): a chip opens a small panel anchored under it, inside the
  calendar's box, rendering the same `ObservanceCard` the list view uses. `role="dialog"`,
  labelled by the date, focus moves to its close button and returns to the chip; Escape and
  pressing outside close it. Not `aria-modal` — it is a disclosure, not a modal.
- **Phone** (≤ 640 px): a cell is ~55 px wide, so the bars are hidden and each day with an
  observance is one button carrying category dots; pressing it lists that day's cards under the
  grid. The chips are `display: none` there and the day button is `display: none` on a desktop,
  so no day ever has two controls in the accessibility tree.
- **Below the grid**: the moon-sighting note, a one-row coverage line (the *N of M sites*
  denominator leads it; the five counts follow on coloured rules), the seasonal list, and the
  undated list behind a `<details>` whose summary carries the count. The *Coming up* section was
  removed — a month grid makes it redundant.

## The layout algorithm (`src/lib/data/almanacCalendar.ts`)

`buildCalendarMonths` is unchanged: it places **only day-precision observances**, on exactly the
days their projected window covers, and returns month-only observances in `monthOnly`, off the
grid. Its tests pin that.

New, and tested in `almanacCalendar.test.ts`:

- `layoutWeek(week)` → `{ spans, lanes }`. For every distinct entry that appears in a week's cells
  it emits one **span** with `startCol`/`endCol` (0–6, Monday first), `continuesBefore` (the
  window began before this week's first covered day) and `continuesAfter`. Spans are sorted
  earliest-start first, then longest first, then by name; lanes are assigned greedily — the first
  lane free for every column the span covers — so two spans sharing a column never share a lane.
- `hiddenInColumn(layout, col, visibleLanes)` counts a column's spans in lanes beyond the visible
  ones, including bars that *pass through* the column, so "+N more" is right on a Wednesday that a
  Tuesday-to-Thursday bar crosses.

The view draws each bar once, in the cell it starts in, `position: absolute`, `--span × 100%` wide.
That works because the table is `table-layout: fixed`: every column is the same width, so N × 100 %
of one cell is N cells. The `<tr>` carries `--lanes` so every cell in a week reserves the same
height; `--lane-h` is the lane pitch (24 px, 30 px in Urdu for Nastaliq's ascent). All five
runtime-written custom properties (`--lanes`, `--lane`, `--span`, `--pop-top`, `--pop-left`) are
declared with defaults in `almanac.css` and overridden inline, which is what
`cssTokensDefined.test.ts` requires.

## What is deliberately not placed on the grid

- **Month-only observances** ("Annual urs (Muharram)"). A square is a day; putting one on the 1st
  or the 15th would be this archive inventing a date (RULE 2). They sit in the strip beneath the
  grid, under every Gregorian month their Hijri month touches.
- **Seasons** never reach the grid at all — `buildAlmanac` keeps them in their own bucket.
- **Undated observances** (79 sites) are a list with a count, not squares.

## The "approximate" badge, and who sees it

A Hijri projection is a forecast. In the **public view** the per-date *approximate* pill is
withheld (project head, 11 September 2026); instead projected bars are **dashed** and one caveat
line under the grid says why, with the dashed swatch as its key (`almanacProjectedCaveat`). The
**project team** (`hasProjectAccess()`, `?team=1`) still sees the pill on every projected date, on
cards in the popover, the phone day list, the month-only strip and the list view. The projection
itself is identical in both views, and the `.ics` notes carry the approximation regardless.

## What did not change

`observanceDateDisplay` is still the single formatter for the recorded/projected pair. The facets
(`?cat=`, `?place=`) still narrow the sites the whole page is built from. `?view=list` and the
`#<slug>` deep link (a hash with no explicit view opens the list) behave as before.
`e2e/almanac-facets.spec.ts` selectors (`.almanac-calendar-grid`, `.almanac-calendar-cell--marked`,
`.almanac-coverage-total`, `.almanac-facet .filter-chip`, `.almanac-empty`) are unchanged.
