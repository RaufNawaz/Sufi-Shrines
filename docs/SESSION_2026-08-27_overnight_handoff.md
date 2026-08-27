# Handoff — the overnight run of 26–27 August 2026

**What this is.** One session, run unattended from about 22:00 to 01:45, working
`docs/planning/NEXT_STEPS_2026-08-26.md` — the plan written for a cheaper executing model. It
closed every task in that plan that did not need a decision from the project head, and produced
five findings that were in nobody's plan because the gates found them.

Read this if you are picking the project up. Read `docs/HANDOVER.md` §9 for the measurements
themselves; this file is the map.

---

## 1. What shipped

Twenty-two commits on `claude/website-explorer-improvements-f5bwgk`. Nothing pushed.

**Asked for directly by the project head, mid-session:**

- **The almanac opens on the calendar** (`1e9a7b4`). It was third on the page, under the coverage
  tiles and the moon-sighting caveat. Everything else scrolls to. Every month in the horizon is
  now one press away instead of seven presses of "Later", and each pill carries the count of
  observances that month can place — which doubles as the shape of the year.

**The plan, Lane A and A′:**

| | |
|---|---|
| **A2** `b7eb6f0` | An order's members on a century axis. Three refusals in the data layer: an unplaceable figure is off the axis and named beneath it; **one recorded year is a point, never a bar** (six of fifty-one members would otherwise have gained a hundred-year life); two years in the wrong order are reported, not swapped. |
| **A3** `bc126d2` | Place pages name the figures they hold and the days they keep. Deduplicated by figure — six of Nankana Sahib's seven gurdwaras name Guru Nanak. |
| **A4** `10cd64e` | The field audit. Three gaps; two escalated as new tasks. |
| **A5** `a87442b` | All 464 sources addressable by URL fragment, each naming its entries; shrine bibliographies link into the index where a source is shared. |
| **A6** `cc44976` | The almanac filters by tradition and by place. Filters the *inputs*, so the coverage block follows instead of contradicting. |
| **A10** `eed67ca` | The entry's account of a life, on the figure's page, attributed. 48 entries carry one; the plan said 32. |
| **B1/B2** `c5e659e` | Search marks the matched run, finds days, and marks a saved site. |
| **B3/B4** `7ebec1a` | `e2e/archive-search.spec.ts`; Lighthouse run for the first time. |

**Not in any plan — the gates found these:**

| | |
|---|---|
| `5964f20` | **The dark theme failed contrast on every route** and had never been scanned. 63 serious violations from three causes. Fixed at the token, plus a static check and a dark matrix in the a11y suite. |
| `b7eb6f0` | **`--header-height` is 56px and no header in the app is.** 71px desktop, 93px phone. It survived because the three offsets that use it all add `--space-4`, and 56 + 16 clears 71 by a pixel. |
| `6e8fe57` | **All twelve bundle budgets were stale** by 5–26 KB, two days after the table was last measured. |
| `e229f76` | **3 of the archive's 242 images are dead.** Two are an entry's only image, so the photograph gap is 53, not 51. |
| `e605274` | **86 of 169 figure slugs diverge** between the sheet's `principal_figure` and the graph's canonical entity. |

---

## 2. What is waiting, and on what

Nothing here is blocked on engineering. Each waits on a decision or a human afternoon.

- **A12 — the calendar is not all ʿurs.** `KGEvent.eventType` splits **77 urs / 72 observance**
  and reaches no surface: Diwali, Maha Shivratri, Guru Nanak Gurpurab and daily prakash are all
  presented under a heading reading "The Urs Almanac". Needs two editorial answers — what a
  non-ʿurs day is called in each language, and whether the most-linked page in the archive keeps
  its title when 72 of its 149 entries do not fit it.
- **A13 — two place vocabularies.** The graph has 94 places and 169 `located_in` edges that no
  page reads; `/place/:slug` uses a 69-entry hand-curated list; the JSON-LD and RDF exports
  publish the graph's. Neither is wrong; nothing has decided which is canonical.
- **A14 — the entity pages grow 1,455px** two seconds after they render, because they lay out from
  the bundled graph and then the CSV arrives. CLS 0.52 on `/saint`. Three fixes, each trading
  something different.
- **A11 — settings.** Still needs one round of scoping.
- **A7 / A8 — figure images**, and all of **Lane B**. An editor.

---

## 3. Five things that will save the next session an hour

1. **A red local `npx playwright test` is not necessarily red.** 1–2 tests fail per full local run
   and they are different tests each time; `workers: 1` and `retries: 2` are set only under `CI`.
   Every one passes in isolation and the failure is always a 30-second timeout. Re-run the named
   spec before believing it.
2. **`urllib` takes 32 seconds per request in this environment**, where curl takes 0.34. Any
   network tooling should shell out to curl.
3. **A browser pass is not a valid instrument from inside this sandbox.** Loading the archive's
   242 images in Chromium reports 80 failures; the same URLs return `206 image/jpeg` over curl
   seconds later, and on one page the *same URL* rendered once and failed once.
4. **A property-name grep does not answer "does a page render this".** Six properties looked
   unrendered in A4's first pass and all six are read by a `lib/data/` helper whose caller is the
   page.
5. **`:target` never matches in this app.** The browser resolves the fragment before a
   client-rendered list exists, and an in-app `pushState` does not set a target element at all.

---

## 4. State of the gates

`npm run verify` green. **322/322 e2e** (up from 300 — the suite gained the almanac facets, the
archive search and a nine-route dark-theme a11y matrix). **1,006 unit tests.** Every route inside
a re-measured bundle budget. axe clean in both languages *and* both themes.

Nothing has been pushed and nothing has been deployed. The release branch is `1.7`
(`project_deploy_branch_trap`), and this work is on `claude/website-explorer-improvements-f5bwgk`.
