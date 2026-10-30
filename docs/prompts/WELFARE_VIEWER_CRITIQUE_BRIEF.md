# Brief: critique the "Shrines and welfare" viewer

*Written 30 October 2026, revised the same day after the first round of review (the record:
`docs/research/VIEWER_REVIEW_2026-10-30.md`), for an outside reviewer (ChatGPT, or anyone without the repository). It is
packed as `BRIEF.md` at the top of the review zip built by
`pipeline/gis/viewer/review/make_package.py`. Paste this file as the first message, then upload
the zip.*

---

You are reviewing a single-page research tool. Be a hard, specific critic. I want to know what is
wrong, misleading, fragile or missing, ranked by how much it matters. Praise is not useful to me.

## What it is

*Mapping the Shrines of Pakistan* is a public bilingual archive of 171 religious sites (Sufi
shrines, Hindu temples, Sikh gurdwaras, Jain temples, memorials). This viewer is a separate
**research** page, not the public website. It lays the archive's 169 geocoded sites over **243
welfare indicators in 18 themes** (Census 2023, PSLM, DHS surfaces, MICS, World Bank poverty,
Meta Relative Wealth Index, night lights, travel time, air quality, health facilities, roads and
others) at four spatial units: H3 hexagons (resolution 6, ~36 km², ~19,000 cells), tehsils (577),
districts (160) and provinces.

The intended use is exploratory social science on shrines and welfare. The obvious danger, and
the one I most want you to press on, is that **the archive is curated, not a census**: 80
geocoded Muslim shrines, a quarter of them in Lahore, and every field-verified site in Lahore. A
correlation between "sites per million people" and literacy may measure where the archive's
authors have worked, not where shrines are.

It is one self-contained HTML file (`viewer/index.html`, data embedded gzipped + base64, inflated
by pako). It opens from disk with a double-click and opens on "None", with no measure and no correlation
shown until one is chosen. Its four libraries (Leaflet, h3-js, pako, jStat) are inside the file;
only map tiles come from the internet. Nothing is sent anywhere.

### Features

- **Modes:** none (outlines only), **One measure** (septile choropleth), **Compare two** (3×3
  bivariate tertile map, Joshua Stevens' scheme), **Composite** (unweighted mean of each
  indicator's percentile rank, each turned by the catalog's `higher_is_better`; indicators with no
  stated direction are refused).
- **Side panel:** the indicator against the archive (Spearman ρ, scatter, median where the
  archive has a site vs where it has none), definitions, sources, verification checks.
- **Region card** on click: hierarchy, every active value with rank and percentile, population,
  the archive sites inside.
- **Leads:** optional markers from Wikidata + OpenStreetMap for places that might be shrines not
  yet in the archive.
- **Test a conjecture**, a drawer (an *exploratory specification log*).
  - **Input:** a written conjecture, an outcome, explanatory variables each with an expected sign,
    controls and transforms (log(1+x), asinh, z).
  - **Models:** OLS (HC1 or classical), or Poisson with a population exposure by default.
  - **Every result shows:**
    - Conley SEs at 50, 100, 200 and 500 km;
    - a Kelly-style **spatial-noise placebo** p (two noise families matched to the variable's
      Moran's I);
    - a **headline p**, the largest of the robust, Conley and placebo p-values;
    - Benjamini–Hochberg over the distinct hypotheses in the log;
    - the Cliff–Ord test of the OLS residuals;
    - a fragility table: without Lahore, without each province, without the most influential unit.
  - **Also:** "Same test at every unit" (scale sensitivity), a residual map, and exports (CSV,
    Markdown, JSON spec, the data, Stata and R code).
  - **Below 10 residual degrees of freedom,** no p-values are printed.
  - **Where the detail is:** the estimators are in `docs/GIS_FOUNDATION.md` ("Test a conjecture",
    and "Revised after review"); the measured calibration is in the review record.

## What is in the package

| Path | What |
|---|---|
| `screenshots/` | Nine Chromium screenshots of the live page, in order of use. **Start here.** |
| `viewer/index.html` | The page itself, data and libraries embedded (4.9 MB). Open it in a browser if you can. |
| `viewer/template.html` | The same page without the data: all the HTML, CSS and JavaScript. Review this for code. |
| `viewer/build_viewer.py`, `viewer/rebuild_from_embedded.py` | How the page is built from the GeoPackage. |
| `viewer/tests/` | The browser test (Playwright) and an independent Python re-implementation of the statistics. |
| `docs/GIS_FOUNDATION.md` | The working notes: what was measured, caveats, the viewer's design and estimators, what was and was not verified. |
| `docs/GIS_README.md` | The method of the spatial foundation and its sources (SHRUG, PRIO-GRID, Kelly on spatial noise, DHS displacement). |
| `data/indicator_catalog.tsv` | Every indicator: label, theme, direction (`higher_is_better`), year. |
| `data/atlas_codebook.csv` | Every indicator's definition and source. |
| `data/native_support.tsv` | Where each source was measured (district, division, DHS region, modelled surface...), with the line that says so. |

The underlying GeoPackage and the per-source CSVs are not included (too large); the numbers you
need are embedded in `index.html`.

## Already known (do not spend time re-reporting these unless you think I have them wrong)

- The first round's 32 findings and what was done about each: `docs/research/VIEWER_REVIEW_2026-10-30.md`
  (in the package as `docs/VIEWER_REVIEW.md`). Please check whether the fixes are right, not
  only whether the original problems existed.
- The data was rebuilt from fresh downloads after round one: travel time to a city had a coastal
  defect (sea pixels averaged in), now fixed at source; every unit is at full precision. What moved
  is in `docs/GIS_FOUNDATION.md`, "Rebuilt on Windows".
- Each indicator now names where it was measured (`data/native_support.tsv`, each level with the repository line that states it;
  the level shows in the side panel and in result flags).

- The archive is curated and Lahore-heavy (above). The page says so under every result that uses
  an archive variable. I want your view on whether saying so is **enough**.
- 25 of 80 Muslim shrines have no numeric founding year and count as "not pre-1857".
- Associations are ecological (among units, not people). The page's wording is tested to never
  say "effect", "impact", "leads to" or "drives".
- The Stata and R replication code has never been run. WebKit/Safari has not been tested.
- Tehsil-level census values exist only in 77 districts whose census tehsils match the boundary
  file one to one. AJK and Gilgit-Baltistan are outside the census.
- Two hexagon checks fail with leads switched on (a known marker artefact).

## What I want from you

Critique along these lines, in this order of importance to me:

1. **Research design and statistics.** Is the conjecture tool sound? Wrong estimator choices,
   wrong defaults, misleading p-values, missing checks (e.g. Conley SEs, spatial placebo, MAUP),
   Moran's I implementation, the BH family definition, the composite index, the septile and
   tertile classing, the "median where there is a site vs not" comparison. Does the
   pre-registration-lite (stated sign, timestamp) actually protect against anything, or is it
   theatre?
2. **Honesty of presentation.** Where could a careful reader still be misled? Which caveats are
   missing, buried or too weak? Does the design invite fishing across 243 indicators × 4 units?
3. **Usability.** From the screenshots and the page: what is confusing, cluttered or
   undiscoverable? Is the workflow from "I see a pattern" to "I tested it" clear? Mobile?
4. **Code quality and robustness** of `template.html` and the build scripts: bugs, fragile
   assumptions, performance, accessibility.
5. **What is missing** that a social scientist would expect before trusting or citing a result
   from this page.

### Format

- A ranked list of findings, most serious first. For each: **what**, **where** (file and line,
  or screenshot number), **why it matters**, and **a concrete fix**.
- Mark each one *certain* (you checked it in the code or data) or *suspected* (inferred). Do not
  present a suspicion as a finding.
- Then, separately, the three changes you would make first.
- Keep it under about 2,000 words. Skip general advice that is not tied to something in the
  package.
