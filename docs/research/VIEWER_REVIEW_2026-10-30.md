# Review of the Shrines and Welfare viewer, 30–30 October 2026

*The viewer is `pipeline/gis/viewer/index.html`.*

## Where the findings came from

- **ChatGPT**, given the package built by `pipeline/gis/viewer/review/make_package.py` and the
  brief `docs/prompts/WELFARE_VIEWER_CRITIQUE_BRIEF.md`.
- **Three independent Claude reviewers**, one each on statistics, presentation and code. Their
  probe scripts were kept in a session scratch folder, not in the repo.

## How it was handled

Every finding was checked against the code or the data before anything was changed. The status
column records the outcome:

- **fixed:** changed, with a test.
- **mitigated:** partly addressed; what remains is stated.
- **not a problem:** checked, and the code was right.
- **open / decision:** needs Rauf, or data that is not on this machine.

Sources are abbreviated: **G** = ChatGPT, **S** = statistics reviewer, **U** = presentation and
usability reviewer, **C** = code reviewer.

This file is the record. The questions that need Rauf are also asked in the chat (RULE 5).

## Findings, as verified

### Inference

| # | Finding | Source | Verified how | Status |
|---|---|---|---|---|
| 1 | HC1, classical and permutation p-values all assume independent units. With spatially smooth noise regressors against district literacy, about 50% are "significant" at 5% (Kelly-style placebo; 300 draws, 3–8 neighbour-smoothing passes). | G2, S1 | S ran the placebo inside the page | see Status |
| 2 | The Moran's I expectation shown is the analytic regression-residual one. Its p is a free permutation of the residuals, so the two describe different nulls. The tail is chosen from the data. The R comment calls `lm.morantest` equivalent, which it was not. | G4, S12 | code (`moranOf`) | see Status |
| 3 | A Poisson model on an archive count defaults to no exposure. For `n_site ~ z(literacy)` at district, as S reported it: "0.81, p = 0.0009" with no offset; 0.27, p = 0.22, with `pop2023` (re-measured after the fixes below). | S2 | S, in page | see Status |
| 4 | The side panel's "median where the archive has a site" is confounded by population. Districts with a site have a median population of 1.83 M, against 0.83 M without. ρ(literacy, population) = 0.66. | S2 | S, in page | see Status |
| 5 | Single units and small populations decide results. Lahore leverage is 0.732 for literacy ~ `n_site` (district), and dropping Lahore moves β from 1.33 to 2.66. `sites_per_million` peaks at 34.5 in Jhal Magsi (5 sites, 203k people). | G1, S3 | G and S | see Status |
| 6 | Indicators measured at a coarse level enter regressions at fine units as if each unit were independent. GDP is by division; MPI by province; DHS region values; DHS surfaces are predictions. | G5 | codebook | see Status |
| 7 | Benjamini–Hochberg can be pushed down by re-running: duplicates make it less strict. "Clear the log" resets the family. Choosing classical SEs changes the table but not BH or the verdicts. | S4, S9, U2 | S through the page's own `bh()` | see Status |
| 8 | The "stated sign" gate protects little. "No prediction" passes it. The timestamp is taken milliseconds before computing. The sign can be flipped and the spec re-run. The green "sign matches" prints even when p ≥ 0.05. The side-panel ρ browsed before testing is not counted anywhere. | G3, S5, U1–4 | code | see Status |
| 9 | `log(1+x)` silently drops units with x ≤ −1. `pm25_change_11_21` loses 492 of 577 tehsils. | S6 | S | see Status |
| 10 | Province runs (n = 7) still print t-tests. | S10 | code | see Status |
| 11 | The composite ranks each component among the units that have it, then averages over the units that have all of them, so the reference populations differ. Testing from Composite mode silently tests the first component, not the composite. | G7, G8, S11 | code | see Status |
| 12 | "Same test at every unit" attributes differences to boundary drawing, and claims z-scored or logged coefficients compare across units. Neither holds. | G6 | code | see Status |
| 13 | The headline BH value goes stale after "Same test at every unit" adds tests. | G9 | code | see Status |

### Display

| # | Finding | Source | Verified how | Status |
|---|---|---|---|---|
| 14 | Tertiles collapse on ties (`klass` uses `>=`). Hexagon `share_pop_within_60min_walk_health` puts all 19,197 hexagons in the top tertile. Septile legends do not say when classes merge. | G11, S7 | code and data | see Status |
| 15 | `median()` takes the upper middle value for an even n. Groups follow the selected archive measure, but the text always says "has a site". | G12 | code | see Status |
| 16 | The archive measure silently switches to `n_site` after a visit to Hexagon, and does not come back. | U5 | U, in page | see Status |
| 17 | The scatter has no y-axis title. One outlier flattens it. Its "has a site" colour clashes with the tradition colours. There is no tradition legend. Lead colours are close to site colours. | U6, U7 | U | see Status |
| 18 | The "no value" swatch does not match the map in dark mode. Jargon is not explained. | U11, U12 | U | see Status |

### Data and reproducibility

| # | Finding | Source | Verified how | Status |
|---|---|---|---|---|
| 19 | **Data defect:** `travel_city_min_popw` is negative in 14 units at each level (Gwadar district −454, Ormara −1268). Cause: `welfare/build_welfare_layers.py` `sample()` masks only the raster's declared nodata, so undeclared negative sea and nodata pixels are averaged in. `share_pop_within_60min_city` is inflated by the same pixels (they count as ≤ 60). | S8 | data and code | see Status |
| 20 | Values are rounded to 3 significant figures (`clean()`) before they are embedded, and the regressions run on them. No hash of the data travels with an exported result. | G10 | `build_viewer.py` | see Status |

### Security and robustness

| # | Finding | Source | Verified how | Status |
|---|---|---|---|---|
| 21 | **Stored XSS:** `cjLog` writes `e.id` and `e.maupOf` unescaped, and the log is read from localStorage, which every `file://` page shares in Chromium. | C1 | C demonstrated it | see Status |
| 22 | One malformed log entry stops the drawer from opening, and the Clear button with it. | C2 | C demonstrated it | see Status |
| 23 | A carriage return in a shared spec's statement injects executable lines into the Stata and R code. | C3 | C demonstrated it | see Status |
| 24 | `validSpec` can be slipped past. `sign: "toString"` passes. `__proto__` keys crash. Negative or huge permutation counts crash or hang. The errors call valid JSON "not valid JSON". | G13, C4 | G and C demonstrated it | see Status |
| 25 | If Leaflet, pako or h3 fails to load, the page dies silently. No script has SRI. | C5 | C demonstrated it | see Status |
| 26 | Lead URLs are not limited to https. | C6 | C | see Status |
| 27 | Two tabs overwrite each other's log. A failed save still says "kept". | C7 | code | see Status |
| 28 | CSV exports do not neutralise formula cells. | C11 | C | see Status |

### Accessibility and phones

| # | Finding | Source | Verified how | Status |
|---|---|---|---|---|
| 29 | **Keyboard:** no way to open a region card. Focus is lost when buttons are rebuilt and after "Record and test". Results are not announced. `#cjW` has no label (axe critical). There is no `<main>`. | G14, U8, C8 | U and C in page, axe | see Status |
| 30 | **Phone:** the header takes 42% of the first screen. The statistics sit below a map 60% of the screen high. | G14, U9 | U, measured | see Status |
| 31 | Every statistic runs on the main thread. A hexagon run takes about 3 s; the same test at every unit takes about 12 s. | C9 | C, measured | see Status |
| 32 | `GIS_FOUNDATION.md` says the page "opens with None", but it opens on Literacy. The code is intentional; the doc sentence is loose. | U10 | code and git | see Status |

*Each row's status is in "Status" below.*

## Status, 30 October 2026

All changes are in `pipeline/gis/viewer/template.html` (rebuilt into `index.html`),
`rebuild_from_embedded.py`, `build_viewer.py`, `welfare/build_welfare_layers.py` and the tests.

### Inference

| # | Status | What was done |
|---|---|---|
| 1 | **fixed**, and measured | Every result now shows Conley SEs: Bartlett kernel; cutoffs 50, 100, 200 and 500 km (hexagons up to 200). It also runs a **spatial-noise placebo** after Kelly (2019): each explanatory variable is replaced by spatially smooth noise matched to its own Moran's I, from two families (neighbour-smoothed, and a Gaussian kernel over distance at district and tehsil), 200 draws each. The **headline p** is the largest of the chosen robust p, every Conley p and the placebo p. Calibration is in the table below. |
| 2 | **fixed** | OLS residuals: the Cliff–Ord analytic test (moments as `spdep::lm.morantest`), two-sided. Poisson: a two-sided permutation test, whose shown E[I] is the permutation mean. The page now states "no test" for a degenerate case (every unit a neighbour of every other) and for runs under 10 residual df. The R comment now names the equivalent call accurately. |
| 3 | **fixed** | Choosing Poisson sets the population exposure. "None" is labelled "(mostly measures population)", and the result says so in bold. |
| 4 | **fixed** | The side panel adds a partial Spearman holding population constant, and ρ(indicator, population). It names group sizes and says each unit counts once, whatever its population. |
| 5 | **fixed** | A fragility table under every result, refitting without: Lahore district; each province; the most influential unit (Cook's distance). Flags appear when a check flips the sign, loses significance, or moves the estimate by more than half, and when one unit's leverage is high. Literacy ~ `n_site` now reads: "Without Lahore district the estimate moves from 1.333 to 2.658 (+99%)" and "Lahore has leverage 0.73". That is ChatGPT's figure exactly. |
| 6 | **mitigated** | A non-count, non-archive variable whose distinct values (apart from its most common one) number fewer than half the units that do not take that value is flagged. The flag is worded as a possibility, pointing to the definition. It catches IPC zones (18 values over 81 districts) and the 2015 UNDP schooling on older districts. It cannot see GDP per capita: built from a division-level source, but population-weighted over grid cells, it takes 130 values over 160 districts. Real native-support metadata does not exist: the codebook's `site_unit` is the level the atlas uses to attach an indicator to sites, not where it was measured (literacy says `district`, yet has true census tehsil values). See the decisions. *Not done:* propagating the DHS surfaces' prediction uncertainty. **Since 30 Oct (decision 3):** `atlas/native_support.tsv` gives every source's measured level with the quoted line that states it, checked by `atlas/check_native_support.py`; results name it (GDP per capita: 32 divisions) and flag modelled estimates. The distinct-value guess remains for anything the table does not cover. |
| 7 | **fixed** | BH covers distinct hypotheses (unit × model × variables × transforms), each counted once at its first p. "Clear" became "Hide these tests": hidden tests stay in the family and in every export. BH runs on the headline p. The chosen SE type now drives the table, the verdict, the Wald test and BH alike. |
| 8 | **fixed** (as far as a page can) | "Pre-registration" wording removed. The drawer calls itself an *exploratory specification log* and says it cannot know what the user saw first. A written conjecture is required. Each test records whether it was prefilled from the map and how many map views came before it; both appear in the result and in exports. "No prediction" is marked exploratory. The sign comparison is plain text with no success colour. A **separately frozen analysis plan** is a decision, not built. **Since 30 Oct (decision 4):** frozen plans stay outside the tool; the drawer points to OSF and AsPredicted. |
| 9 | **fixed** | log(1+x) refuses when any value is ≤ −1, and points to the new asinh transform. |
| 10 | **fixed** | Below 10 residual df: no p-values, no intervals, no Moran p, and the run stays out of BH. |
| 11 | **fixed** | The composite ranks every component within the units that have all of them. Composite mode prefills **the composite itself** as the outcome (key `composite`, components saved in the spec and exported with the data). The test checks that the tested value equals the mapped one. Theme counts are shown, since equal weights favour themes with more indicators. |
| 12 | **fixed** | Relabelled as **scale sensitivity**, with an honest account of why units differ. Shows n and the number left out per unit. Units run one at a time. |
| 13 | **fixed** | BH values on screen refresh whenever the log changes. |

### Display

| # | Status | What was done |
|---|---|---|
| 14 | **fixed** | Zero-heavy tertiles get a zero class, as the septiles do. Legends give the count of units per class and say when ties merge classes or empty one. |
| 15 | **fixed** | The median averages the two middle values. Groups are named after the chosen measure ("a Muslim shrine" for `n_mus`). |
| 16 | **fixed** | The user's archive measure is kept, and restored after a visit to hexagons; a note says when it was substituted. |
| 17 | **fixed** | The scatter has a y-axis title and a log(1+y) axis for archive measures, and "has a site" is drawn in the text colour. Tradition legend added. Leads are drawn as rings, so they cannot be mistaken for sites. |
| 18 | **fixed** | An opaque no-value swatch. Plain words for septiles and tertiles. Leads are explained. |

### Data and reproducibility

| # | Status | What was done |
|---|---|---|
| 19 | **fixed** (30 Oct, rebuilt) | `build_welfare_layers.py` masks negative travel-time pixels (31 populated cells, 0.056% of people) and fails on any negative travel time at any level. The layers, atlas and page were rebuilt from fresh downloads: the travel-time and 60-minute columns changed in 5 districts, 10 tehsils and 2 provinces, and nothing else moved but RWI (see `GIS_FOUNDATION.md`, "Rebuilt on Windows"). The page's guard finds nothing to mask and shows no note. |
| 20 | **fixed** (30 Oct, rebuilt) | Every unit, hexagons included, is embedded at full precision since the page was rebuilt from the GeoPackage (4.9 MB). `build_viewer.py` rounds only geometry. Every test and export carries `VIEWER_VERSION` and a `DATA_ID`. |

### Security and robustness

| # | Status | What was done |
|---|---|---|
| 21, 22 | **fixed** | Log entries are validated as they are read: integer ids; text allowed only under known keys; specs re-validated. Bad entries are ignored and counted. Every value written into the page is escaped. |
| 23 | **fixed** | Control characters and line separators are stripped from a statement before it goes into a code comment. |
| 24 | **fixed** | `validSpec` checks own properties, exact enums, bounds (perms 99–20,000; mperms 99–9,999; k 1–20), types and duplicate variables. Each spec in a batch runs separately, with honest error messages. |
| 25 | **fixed** | SRI hashes (sha384, computed from the exact files) on all five CDN resources. A missing library is reported on the page instead of a dead map. |
| 26 | **fixed** | Lead links are drawn only for http(s) URLs and well-formed Wikidata ids. `load_leads` enforces the same rule. All 817 current leads pass. |
| 27 | **fixed** | Two tabs merge their logs. A failed save is reported. |
| 28 | **fixed** | A text cell beginning `= + - @` gets a leading apostrophe in CSV exports. |

### Accessibility and phones

| # | Status | What was done |
|---|---|---|
| 29 | **fixed** | "Find a place" (keyboard) opens a region's card and focuses its heading; closing returns focus. Focus is kept when buttons are rebuilt. An unavailable unit button stays focusable and says why when used. After "Record and test", focus moves to the result heading and the status line announces it. `aria-label` on `#cjW`, and a `<main>` landmark. |
| 30 | **mitigated** | Tighter phone header; the map takes 50% of the screen height, not 60%. *Not done:* a collapsible one-line header, and two-finger panning. |
| 31 | **mitigated** | "Same test at every unit" yields between units and shows progress. *Not done:* moving statistics into a Web Worker. A full district run takes under 0.5 s; hexagons take several seconds. |
| 32 | **fixed** | The page now opens on None (decision 1), and `GIS_FOUNDATION.md` says so. |

### Calibration of the headline p (measured 30 Oct 2026)

Literacy regressed on pure noise that is spatially smooth; share of runs with p < 0.05. A calibrated
test gives about 5%.

- **Generators:** "passes" is neighbour averaging, 0/3/8 times. "Kernel" is a Gaussian over
  distance, 100 or 250 km. The second is a different process from the placebo's first family, so
  it tests the placebo against a mismatch.
- **Draws:** 100 per cell, every figure from one seeded run, so the Monte Carlo SE is about 2
  points.
- **Instrument:** a scratch harness that calls the page's `runSpec`.

| Unit | Noise | HC1 | Conley 200 km | Headline (with both placebo families) |
|---|---|---|---|---|
| district | none | 5% | 7% | 3% |
| district | 3 passes | 47% | 27% | 5% |
| district | 8 passes | 50% | 28% | 4% |
| district | 100 km kernel | 53% | 28% | 2% |
| district | 250 km kernel | 55% | 31% | 2% |
| tehsil | none | 11% | 9% | 0% |
| tehsil | 3 passes | 48% | 17% | 1% |
| tehsil | 8 passes | 65% | 23% | 3% |
| tehsil | 100 km kernel | 65% | 28% | 3% |
| tehsil | 250 km kernel | 78% | 56% | 4% |

**What the table shows.**

- Before the fixes, the page's p-values called smooth noise "significant" about half the time.
- Conley SEs alone (at these unit counts) roughly halve that, but no more.
- With the neighbour family alone, the headline gave 9% (100 km kernel, district) and 20% (250 km,
  tehsil). Adding the kernel family brought every cell to 5% or under.
- The headline p is conservative rather than exact, at the cost of some power.

**Not measured.**

- Hexagons, where the kernel family is not run (n² over 19,000 cells). A hexagon result carries a
  note to test it at tehsil or district too.
- Poisson models.
- Outcomes other than literacy.

### Verification of the code

- **`tests/test_conjecture.cjs`:** 41 checks, all pass. Updated for deliberate changes: the sign
  wording, rows per run rather than per hypothesis, wiping the log means wiping storage, and the
  required statement.
- **`tests/test_review_fixes.cjs`** (new): 30 checks, one or more per finding above, all pass.
- **`tests/check_conjecture_reference.py`** recomputes every logged run independently. It covers
  the OLS and Poisson fits; the analytic Moran's I via dense matrices (itself checked against the
  classical intercept-only formula to 1e-12); Conley SEs by brute force; and the refits without
  Lahore and without each province. Largest differences: coefficients 1e-13, Conley SEs 2e-13,
  Cliff–Ord variance 1e-14, refits 2e-13, Moran p 1e-15. p-values and intervals match to 1e-7,
  which is jStat's precision.

## Decisions for Rauf

Asked in the chat (RULE 5) on 30 October 2026 and answered the same day.

1. **Opening view: open on None.** *Answered: None.* The page opened on literacy, with ρ against the
   archive showing. It now opens with outlines and sites only; no correlation is offered before a
   measure is chosen. Done; `test_review_fixes.cjs` checks it.
2. **Self-contained page: inline the libraries.** *Answered: inline.* The template keeps its CDN tags
   with SRI hashes; both build scripts replace them with the files in `viewer/vendor/`, and refuse
   unless each file's sha384 equals the tag's hash. The page went from 3.1 to 3.6 MB and needs the
   internet only for map tiles. Done; tested.
3. **Native support: add it, sourced only.** *Answered: add it, filled only where a file in the
   repository states the level; blank otherwise (RULE 2).* One row per source in
   `atlas/native_support.tsv`, each with the line that states it.
4. **Frozen analysis plans: keep them outside the tool.** *Answered: outside.* A browser page cannot
   prove what its user saw first, so a plan frozen inside it certifies itself. The drawer now points
   to OSF and AsPredicted for a confirmatory test. Done.
5. **Rebuild.** *Answered: rebuild here, by downloading the sources.* Done on 30 October: every
   source re-downloaded (the 55 wave-two files byte-identical to October's), the GeoPackage, layers,
   atlas and page rebuilt, and every atlas value compared with the committed one. Only travel time to
   a city, its 60-minute share and (by at most 0.0023) the Relative Wealth Index moved. Details, and
   what a Windows rebuild needs, in `GIS_FOUNDATION.md`, "Rebuilt on Windows".
