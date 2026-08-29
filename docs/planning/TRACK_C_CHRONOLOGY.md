# Track C — Chronology

**Status:** in progress, 28 August 2026 (overnight). The last unstarted track of
[`SHARED_GROUND_VISION.md`](SHARED_GROUND_VISION.md).

---

## Why it was blocked, and why it is not any more

That document deferred Track C on one ground, and it was the right ground:

> Track C — last, because it depends on date quality that is not there yet … a timeline must
> render those as intervals or it launders uncertainty into false precision.

That was written on 20 August 2026. **Re-measured tonight against the 169-row committed
snapshot** (`src/data/shrines-fallback.json`) — and it is no longer true. `year_built_precision`
is populated on **168 of 169 rows**:

| precision | rows |
|---|---|
| `exact` | 44 |
| `unknown` | 43 |
| `circa` | 41 |
| `century` | 35 |
| `range` | 2 |
| prose sentences (3 distinct) | 3 |
| empty | 1 |

`year_built` itself is on 127 of 169 (75%), and 38 more rows have a legacy `Founded/Opened`
with no `year_built`.

**The blocker was never the dates. It was the absence of a column saying how much to trust
them — and that column now exists and is nearly complete.** 126 rows carry a precision from the
controlled set, which is exactly the input an interval needs. This is the standing-findings
lesson again: a deferral is a measurement with a date on it, and this one had gone stale.

## The rule this page exists to obey

**Uncertainty is rendered as width, never as a point.** A row's precision decides its span:

- `exact` → the year itself
- `circa` → a band around the year
- `century` → the whole century (`950` + `century` → 900–999)
- `range` → the stated range
- `unknown`, prose, or no year → **not plotted at all**, and counted in plain sight

The last one is the one that matters. An undated entry is not dropped quietly and is never
given a plausible year: it is reported as a number on the page, so a reader sees the shape of
what the archive does *not* know. Rendering 43 unknowns as if they were somewhere would be
precisely the laundering the vision document warned about.

## What it must not do

- **No invented dates** (RULE 2). Nothing is inferred from a saint's death, a dynasty, or a
  style. If the row does not say, the page does not say.
- **No tidying of the three prose precisions.** `"Uncertain — field value is a Hijri
  day-and-year, not a building date"` is the most honest cell in that column and must not be
  normalised into `unknown` to make a chart simpler. It is treated as undated and its sentence
  is shown.
- **No new colour-only distinction** (WCAG 1.4.1, HANDOVER §9.48). Tradition bands carry a
  label or a pattern, not a hue alone.

## Definition of done

`npm run verify` and `npm run e2e` green; the page prerendered in both languages with the route
check passing; Eastern numerals through `fmtNum()` at every number; Nastaliq on all controls;
axe clean in both languages and in the dark theme; and the undated count visible on the page
rather than in this file.

## Deliberately out of scope tonight

Figure dates (`figure_born`/`figure_died`) and `event_year`. The knowledge base is another
session's lane tonight and its figure identity is actively moving; a second consumer of those
dates would be reading a moving target. Sites only, from the shrine snapshot.
