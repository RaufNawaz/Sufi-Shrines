# Viewer expansion plan, 31 October 2026 (overnight)

Rauf, 31 October 2026: "work overnight to expand the functionality of the tool … first plan then implement
and make substantial improvements … keep this going until usage runs out and then reset after usage
resets."

The tool is the research viewer, `pipeline/gis/viewer/` (`template.html` → `index.html`; the welfare map,
the shrine layers and "Test a conjecture"). This plan is the work queue. Each item is done in order,
tested, and committed on its own (`feat(gis):`) once `npm run verify` passes; its box is ticked here in
the same commit, so a session resuming after a usage reset starts at the first unticked item.

## What the tool already does (31 October 2026)

Choropleths at hexagon, tehsil, district and province level (one measure, two compared, a composite);
archive sites, leads and all 3,689 places from every source with a source filter; place names;
"Test a conjecture": OLS (HC1 or classical) and Poisson (robust, exposure), Conley SEs at several
cutoffs, a spatial-noise placebo, Moran's I on the residuals, leave-one-out fragility, the same test at
every unit, Benjamini-Hochberg across the log, self-contained Stata and R code, and a run in local Stata.

## What is missing, and the plan

Chosen for what a regression-minded reader of this map needs next, largest first.

1. [x] **Fixed effects and clustered standard errors.** Pakistan's provinces differ in almost everything
   (Census practice, Auqaf administration, data coverage), so a cross-district association that is a
   province difference is the first thing a referee asks about. Add to the form: fixed effects for
   province (any unit below province) or district (tehsil and hexagon), and standard errors clustered by
   province or district alongside HC1 and classical. Clustered SEs use the CR1 small-sample factor
   G/(G−1)·(n−1)/(n−k), Stata's `vce(cluster)`, with t on G−1 df. Fixed effects enter as dummies (so the
   QR path, Conley, placebo and Moran carry over unchanged); the coefficient table hides them and says how
   many there are. Stata code: `i.prov` / `vce(cluster prov)`; R: `factor(prov)` and
   `sandwich::vcovCL(type = "HC1")`. Checked against Stata and R by `tests/check_stata_r.py`, as now.
   With few clusters (the province has 4 to 7), say so: CR1 with under ~30 clusters overstates certainty.
2. [x] **The filtered places as a variable.** The "All shrine records" filter (sources, match, how many
   agree, tradition) defines a set; count that set in each unit and offer it as a map indicator and as an
   outcome or regressor in "Test a conjecture" (count, per million people, per 1,000 km²). The count is
   made in the browser: district from each place's district code, hexagon from `h3.latLngToCell`, tehsil
   and province by point in polygon. A check refuses the layer if the district sum differs from the
   filtered total by more than the places with no district. The spec records the filter, so a logged test
   can be re-run and exported with the same set, and the Stata/R code embeds the counts it used.
3. [x] **Specification curve.** For a recorded test, re-estimate it over every subset of its controls
   (up to 2⁶ = 64), at every unit, and with each transformation of the outcome the form offers, and show
   the coefficient of interest sorted, with its interval, and below it which choices made each estimate.
   Report the share of specifications with the expected sign and with p < 0.05. All of them run in the
   browser on the existing estimator; the curve's numbers download as CSV.
4. [x] **Download the table behind the map.** Every indicator at the current unit as one CSV (unit id,
   name, province, every measure), with a codebook CSV (key, label, definition, source, units); so the
   data can go into Stata or R without the conjecture form.
5. [x] **A link to this view.** The unit, the measure(s), the mode, the map's centre and zoom, the layers
   switched on and the places filter, kept in the address's `#` part and restored on opening, so a view
   can be bookmarked or sent.
6. [ ] **Export the map as an image.** The choropleth, the layers shown, the legend, a title and the
   sources credit as an SVG (and PNG from it), drawn from the vector data rather than a screenshot, for
   papers and slides.

Each item gets a browser test in `pipeline/gis/viewer/tests/` (Playwright, as the existing ones) and a
HANDOVER §9 entry. Nothing here writes to the Google Sheet or changes `sites.csv`.

## Progress log

(Appended as items land: date, commit, what was measured.)

- **Item 1, 31 October 2026.** Fixed effects (province; district at tehsil only, since at hexagon
  level 160 dummies over 19,162 units took 4.5 minutes) and SEs clustered by province or district,
  for OLS and Poisson, in the form, the results, the Stata and R code and the Stata service's
  allowlist. Poisson with fixed effects drops the units of groups whose count is zero everywhere,
  as fixest does. Without that, the first Stata comparison failed: a province with no archive site
  in any tehsil had an infinite fixed effect. Checks: `tests/test_fixed_effects.cjs` (slopes equal
  the within regression to 1e-14; form; absorbed regressor; 50 checks), then Stata and R on 9
  specifications, 80 comparisons, largest relative difference 4.7e-7. The earlier suites all
  still pass (test_conjecture, the reference check, the original Stata/R check, review fixes,
  places filter, place names, the Stata service on both logs). Formulas: `docs/GIS_FOUNDATION.md`.
- **Item 2, 31 October 2026.** The places filter as three measures per unit (count, per million
  people, per 1,000 km²), on the map and in "Test a conjecture", with the filter saved in the spec.
  Offshore points snap to the nearest unit within 2 km, as the Python build does. After that, the
  totals equal the build's exactly (3,684 places; 207 verified), and 133 of 160 districts agree
  exactly. Areas are within 0.2% (median) of the GIS layer's. The plan's "refuse if the district
  sum differs" became the test's check that district counts plus places in no district equal the
  filter's total. Stata/R: 28 comparisons, largest relative difference 3.2e-7. Details in
  `docs/GIS_FOUNDATION.md`, "Shrines per district beyond the archive".
- **Item 3, 31 October 2026.** "Specification curve" under each result. It varies the controls,
  the unit (where every variable exists), the outcome's transform and province fixed effects.
  The chart is sorted, with intervals and a choice matrix, plus a table by choice and a CSV. It is
  not logged. The recorded specification reproduces the test exactly, and full refits of a sample
  agree exactly. As planned, except that the unit choice skips units a variable does not reach,
  rather than reporting them as failures.
- **Item 4, 31 October 2026.** A "Download the data" section in the side panel offers, for any
  unit, the table, a codebook, a Stata do-file and an R script. The table already existed in the
  conjecture drawer; the codebook and the two loaders are new. Run in Stata and R on all three
  sub-province units: every label is right, and values are exact to 1.5e-15. That needed
  `asdouble`, since without it Stata stored float, accurate only to 1e-7.
- **Item 5, 31 October 2026.** The view lives in the address after `#` and is restored on
  opening: unit, mode, measures, centre and zoom, layers and the places filter. There is a "Copy a
  link to this view" button. Unknown parts are dropped with a notice, and panning adds no history
  entries. As planned.
