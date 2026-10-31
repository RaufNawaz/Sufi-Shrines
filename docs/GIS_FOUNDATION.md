# GIS foundation — orientation

*Written 15 October 2026, when the foundation was imported. Every number below was measured on
that day against `pipeline/gis/shrines_foundation.gpkg` with `sqlite3` (a GeoPackage is a SQLite
file), not copied from the README. Re-measure rather than quote.*

## What it is

A research layer, separate from the website. **To look at it, open
`pipeline/gis/viewer/index.html`** (see "The viewer" below). It takes the archive's sites and places them on a
fixed spatial frame (Pakistan's admin boundaries and an H3 hexagon grid), so other datasets —
Census 2023, DHS clusters, nightlights, Auqaf lists, colonial gazetteers — can be joined onto the
shrines through shared keys. The intended use is social-science analysis of shrine exposure
against welfare outcomes. The website does not read any of it.

The method — why H3, why an equal-area projection, why distance bands, why Moran's I — is
written up with sources in **`pipeline/gis/README.md`**. Read that for the reasoning. This note
covers how it fits this repository.

## Files

All in `pipeline/gis/` (imported 15 Oct 2026 as `shrines_gis_foundation.zip` and an unpacked copy
`pipeline 2/`; the two were byte-identical by `diff -r`, merged here and both removed):

| File | What it is |
|---|---|
| `README.md` | Method, layer reference, sources. The primary reference. |
| `build_foundation.py` | Builds the GeoPackage from `data/shrines.csv` + OCHA boundaries (via `pkmapr`). Writes 8 layers. |
| `layering.py` | Helpers for adding new data: `attach_points`, `raster_to_grid`, `aggregate`, `morans_i`. |
| `outcomes/build_census_outcomes.py` | Adds Census 2023 indicators (via `PakPC2023`) to the GeoPackage. Writes 4 more layers. |
| `outcomes/census_crosswalk.py` | Matches census tehsil names to OCHA tehsil codes (exact → fuzzy within district → exact in another district). |
| `outcomes/outcomes_district.csv`, `outcomes_tehsil.csv` | Flat CSV copies of the two outcome layers (135 and 299 rows, 53 columns), for use without GIS software. |
| `shrines_foundation.gpkg` | The built output, 14 MB. Opens in QGIS / ArcGIS / geopandas / R `sf`. |

## Measured on import

**It was built from this repository's current data.** The manifest's `shrines_csv_sha256_16`
is `f2c0151b8f136802`, which is the hash of `data/shrines.csv` as it stood on 15 October 2026.
So the 169 sites are the shipped snapshot, not the 171-row live sheet and not the
`data/import_2026-10-15.csv` patch. **Rebuild after the next `npm run data:build`.**

| Layer | Rows | Matches README |
|---|---:|---|
| `sites` | 169 (65 columns) | yes |
| `sites_no_coordinates` | 2 — Shah Gohar Peer, Mian Qurban Ali Shah | yes |
| `grid_h3_r6` / `keys_crosswalk` | 22,982 each | yes |
| `admin_tehsil` / `admin_district` / `admin_province` | 577 / 160 / 7 | yes |
| `outcomes_district` | 135 (population sums to 241.2 M) | yes |
| `outcomes_tehsil` | 299, from the 77 districts at ≥ 99.5 % match | yes |
| `outcomes_codebook` | 41 indicators | — |
| `census_crosswalk` | 591 census units: 418 exact, 48 fuzzy, 4 other-district, 121 unmatched | — |
| `manifest` | 12 items; built 2026-10-16 01:41 UTC, h3 4.5.0 | — |

Sites by category: Muslim Shrine 80 · Hindu Temple 36 · Sikh Gurdwara 33 · Nanakpanthi/Udasi 14 ·
Jain 3 · Secular/Memorial 3. Support level: Field-verified 17 · Source-documented 100 ·
Source-seeded 50 · Web-compiled 2. Lahore district holds 20 of the 80 Muslim shrines (the
README's "a quarter"). Pre-1857 (`built_pre1857`): 38 of the 80 Muslim shrines.

## Caveats that come from this repository

These are things the archive already knows that the foundation, on its own, does not show.

1. **Coordinate precision is uneven, and `shared_pin` catches only half of it.** The archive's
   own audit (`pipeline/audit_coordinates.py`, verdicts in
   `data/review/coordinate-review-2026-08-30.csv`) found 22 placeholder-grade coordinates:
   10 that share a point with another row, and 12 typed to only 1–2 decimal places (~1.1 km or
   worse). `shared_pin` flags exactly the 10. **The 12 low-precision rows carry no flag in the
   GeoPackage** — among them Mauj Darya Bukhari, Rahman Baba, Sharada Peeth, Mohra Sharif and
   two of the four Jhal Magsi sites. They are fine for the 5 / 10 / 25 km bands; they are not
   fine at H3 resolution 7 (~5 km² cells, stored as `h3_child`). A `coord_precision` column
   joined from the review CSV would close this.
2. **`built_pre1857` treats unknown as "not pre-1857".** It is `year_built_num < 1857`, and a
   missing or non-numeric `year_built` becomes 0, not null — **25 of the 80 Muslim shrines have
   no numeric year**, so the 38 / 42 split is really 38 / 17 / 25 unknown. Many `year_built` values are
   qualified by `year_built_note` (RULE 2) — some are the saint's death year, not construction.
   Anything that uses the pre-1857 split should read the note, and should treat 0 as
   "not known to be pre-1857".
3. **`is_muslim_shrine` is `category == "Muslim Shrine"` exactly.** That is the sheet value, so it
   is stable (RULE 3: sheet values are join keys). Nanakpanthi/Udasi darbars, which many visitors
   of every tradition attend, are not counted.
4. **The archive is curated, not a census** — as the README says. All 17 field-verified sites are
   in Lahore. The planned second exposure source, Auqaf notified lists, is already being worked
   on in this repo (`docs/auqaf_records_brief.md`).
5. **`sites` copies every archive column**, including `description` and the review columns. A
   GeoPackage shared outside the team therefore carries team-only content (`qa_note`,
   `needs_review`, `flags` — all present in the layer).
   Drop those columns before any export leaves the project.

## Rebuilding in this repository

Not runnable on this machine as of 15 Oct 2026: `geopandas` and `h3` are not installed (and
`python3` may need `DEVELOPER_DIR=/Library/Developer/CommandLineTools`, see the memory note on the
Xcode licence). Install into a virtualenv rather than the system Python:

```bash
python3 -m venv ~/.venvs/gis && source ~/.venvs/gis/bin/activate
pip install geopandas h3 scipy rasterstats rasterio pyreadr

npm run data:build                                   # refreshes data/shrines.csv from the sheet
git clone --depth 1 https://github.com/abdullahumer1101/pkmapr.git /tmp/pkmapr
cp -r /tmp/pkmapr/inst/extdata pipeline/gis/boundaries
python pipeline/gis/build_foundation.py --shrines data/shrines.csv \
    --boundaries pipeline/gis/boundaries --out pipeline/gis/shrines_foundation.gpkg

git clone --depth 1 https://github.com/myaseen208/PakPC2023.git /tmp/PakPC2023
cd pipeline/gis/outcomes
python build_census_outcomes.py --census /tmp/PakPC2023/data --gpkg ../shrines_foundation.gpkg
```

Then check the manifest hash against `shasum -a 256 data/shrines.csv | cut -c1-16`.

`build_foundation.py` deletes and rewrites the whole GeoPackage, which removes the outcome
layers, so **always run `build_census_outcomes.py` after it**. The outcome CSVs in
`outcomes/` are not written by either script; they were exported by hand and must be re-exported
after a rebuild. `pipeline/gis/boundaries/` is a downloaded copy and should not be committed.

**`pyreadr` does not build on this Mac's system Python 3.9** (16 Oct 2026). Since 17 Oct 2026
there is a second environment on Homebrew's Python 3.12, `~/.venvs/gis312`, where it does, with
the whole stack (`pyreadr geopandas h3 rasterio scipy pyarrow pdfplumber openpyxl`; h3 4.5.0, the
version the foundation was built with). Use it for everything.

### Rebuilt on Windows (30 October 2026)

The whole chain ran on a Windows 11 machine from fresh downloads (`docs/research/VIEWER_REVIEW_2026-10-30.md`, decision 5). What it took:

- **Python:** `python -m venv ~/.venvs/gis312`, then `pip install geopandas "h3==4.5.0" rasterio scipy
  pyarrow pdfplumber openpyxl pyreadr netCDF4`; the interpreter is `~/.venvs/gis312/Scripts/python`
  (set `PY` for `rebuild.sh`). Set `PYTHONIOENCODING=utf-8`.
- **GRIP4** fails in Python with `CERTIFICATE_VERIFY_FAILED` (the host's intermediate certificate is
  not in Python's store). `C:/Windows/System32/curl.exe` uses the Windows store and fetches the six
  zips; the fetcher then hashes them.
- **pdftotext.** Git for Windows puts **xpdf's** `pdftotext` on the PATH, not poppler's. Its layout
  differs: the NNS parser placed 144 of 156 districts and failed ten checks. `outcomes/pdftext.py` now
  refuses anything but poppler (set `PDFTOTEXT`) and asks for UTF-8 (xpdf's default is Latin-1).
  Poppler 26.09 for Windows (github.com/oschwartz10612/poppler-windows, unzipped to
  `~/tools/poppler`) then parsed all four PDFs with every hard check passing and tables identical
  to the committed ones. With no poppler on a machine, `outcomes/load_committed_pdf_layers.py` loads the NNS, MICS, World Bank
  and UNDP layers from their committed CSVs, after checking each PDF's SHA-256 against
  `welfare/fetched_extended.tsv`, so the tables are the poppler parse of the same bytes.
- **A failing builder can still write its CSV.** The NNS builder wrote its broken table to
  `outcomes_nns_district.csv` while reporting ten FAILs; it was restored from git. Check `git diff`
  after any failed step.
- **pandas writes CRLF on Windows.** 43 tracked CSVs came out with identical values and CRLF line
  ends; they were restored from git, and the changed ones converted to LF.
- **Leads were not re-fetched.** The atlas does not read them; the viewer reads the committed
  `merged_leads.json`, unchanged.

**What changed.** Every one of the 55 wave-two downloads was byte-identical to October's (the hashes
in `welfare/fetched_extended.tsv`). `atlas/compare_atlas.py` against the committed atlas: of every
value at district (160 × 337), tehsil (577 × 132) and province, three columns moved and nothing else:

| Column | Districts | Tehsils | Provinces | Why |
|---|---|---|---|---|
| `travel_city_min_popw` | 5 | 10 | 2 | negative sea pixels masked |
| `share_pop_within_60min_city` | 5 | 10 | 2 | the same pixels |
| `rwi_popw` | 7 (at most 0.0012) | 14 (0.0023) | 0 | duplicate tiles averaged |

**RWI.** Meta's file lists 173 locations twice, 167 of them with different values (by up to 0.78), and
623 populated cells sat at exactly the same distance from two tiles. Which one a k-d tree returns for
a tie depends on the build, which is why the Mac and this machine disagreed. `build_welfare_layers.py`
now averages duplicate rows before matching, and averages any exact tie (none remain), and reports
both. The wave-one downloads have no October hashes to compare with (their record,
`sources/fetched.tsv`, is gitignored), so a re-published file cannot be ruled out; the tie is a
sufficient explanation.

### Full run order

**`pipeline/gis/rebuild.sh`** runs every builder in dependency order and stops at the first one
whose hard checks fail (`--full` also rebuilds the foundation, census outcomes, wave one and the
shrine leads first). The script is the order; this note does not repeat it. Each builder's
docstring says what it reads. The census step takes
`--census pipeline/gis/sources/census_pakpc2023/PakPC2023/data` (a clone of PakPC2023, fetched by
`welfare/fetch_extended_sources.py`).

Every builder writes into the one GeoPackage. **Do not run two at once**: they are SQLite
writers on the same file.

## The viewer

**Open `pipeline/gis/viewer/index.html` in a browser** (double-click; it needs the internet only
for map tiles: since 30 Oct 2026 its four libraries are inside the file). Choose a unit (hexagon, tehsil, district, province) and any
indicator; the archive's 169 sites sit on top, coloured by tradition, each linking to its page on
the live site; OSM, Wikidata and GeoNames leads can be switched on. The side panel lines the
indicator up against the archive (sites per million people, counts, density) with a Spearman ρ, a
scatter, and the median of the indicator where the archive has a site against where it has none.
It also shows each indicator's definition and source, each open source's measured offset, and
every verification check.

Checked in Chromium on 16 Oct 2026: every unit draws, all four lead toggles work, no console
errors, no sideways scroll at 390 px. The file is 4.9 MB since the 30 Oct 2026 rebuild (3.1 MB before; full-precision hexagons and inline libraries account for the rest) and committed, so it opens from any
clone; rebuild it after any layer changes. It carries no team-only column.

**Since 17 Oct 2026 it reads the atlas** (below): 243 indicators in 18 themes, the menu and labels
from `atlas/indicator_catalog.tsv`. The data is embedded gzipped and base64-encoded and inflated
in the page by `pako` (inlined since 30 Oct 2026), so 7.1 MB of JSON ships as a 2.4 MB file. Two things
that would each cost an hour: **`JSON.parse` rejects `NaN`**, which the old JS-literal embedding
accepted, so the builder turns every NaN into null and dumps with `allow_nan=False`; and **do not
move the page script into a `type="text/plain"` block** to run it later — Prettier formats that as
prose and re-wraps the code. A search field above the menu filters it by label, theme or definition (Enter takes the first
match). Zero-inflated indicators (flood exposure, conflict deaths) get a
"zero" class of their own, or their septiles collapse to three faint classes. Re-checked in
Chromium on 17 Oct 2026: all 243 indicators at all 467 indicator-unit pairs draw with data, no
console errors, no sideways scroll at 390 px.

**Since 29 Oct 2026: a blank map, overlays, a raised tile and one set of leads.** (The paragraphs
above still describe the data; where they mention GeoNames, that is gone from the page.)

- **Modes.** The menu's first entry is **None (no welfare measure)** (and since 30 Oct 2026, Rauf's decision, the page opens on it, so no correlation is shown before a measure is chosen): the basemap and the unit's
  boundaries as outlines, still hoverable and clickable, and a panel that counts sites per unit
  instead of statistics. Then three modes, as buttons: **One measure** (as before); **Compare
  two**, a 3×3 bivariate map of the two indicators' tertiles at the current unit, in Joshua
  Stevens' pink × blue scheme, with a 2-D legend square naming both and the Spearman ρ between
  them as well as each one's ρ with the archive; and **Composite**. Chosen indicators show as
  removable chips. In Compare two and Composite an indicator the current unit lacks is disabled
  in the menu with the reason; in One measure it stays choosable and moves the map to a unit that
  has it, as before. A unit button is disabled, with the reason in its tooltip, when a chosen
  indicator does not reach it.
- **The composite** is the unweighted mean of each indicator's percentile rank among the units
  that have it (mid-rank for ties, scaled 0–1), each turned with the catalog's
  `higher_is_better` so that higher means better off, times 100. Only units with every component
  get a value; the panel says how many were left out. The 23 indicators whose direction is blank
  in the catalog are disabled with the reason; the page does not give them one. It is labelled
  on the page as an unweighted rank average, not an official index.
- **Interaction.** The choropleth is one canvas that takes no events. Hover and click are
  resolved by the page: an H3 lookup for a hexagon (about 17 µs) and a bbox-filtered
  point-in-polygon for the others (about 7 µs over 577 tehsils), one per animation frame. So
  hover costs nothing at 19,000 hexagons, and markers no longer fight the regions for clicks. The
  hovered region is copied into an SVG pane and lifted 2 px; a light tooltip gives its name and
  values. A click lifts it 7 px with a CSS drop shadow over a dark footprint left in place, dims
  the rest, and opens a card. The card shows the hierarchy (read from the codes: `PK10101` is in
  `PK101`, which is in `PK1`; a hexagon is placed by its centre), every active value with its
  rank and percentile among units, population, the archive sites inside with links to their
  pages, and the number of leads inside. It sits beside the region, or docks to the bottom of the
  map when the map is narrower than 560 px. Esc, the × button or a click outside closes it.
  `prefers-reduced-motion` drops the transition and keeps the shadow.
- **Leads.** One toggle, **Leads (Wikidata + OSM)**, reads `shrine_sources/merged_leads.json`
  (one object per place, Wikidata given priority, GeoNames dropped). Markers are coloured by
  `src`, and a small amber badge marks `disagree`. Places with `in_archive: true` stay hidden
  unless a second box is ticked. A page built before that file existed carries the old
  per-source rows, which the page maps onto the same shape and from which it drops GeoNames.
  GeoNames is also left out of the source-offset table and of the verification list.
- **Also fixed:** 19,000 per-shape tooltips were bound on every redraw (now none); every change
  of indicator rebuilt every shape (now restyled, and only a unit change rebuilds); marker clicks
  also reached the map; the zoom is whole levels only, because at 5.5 the scaled basemap tiles
  drew a hairline rectangle around Pakistan; and a `hidden` label stayed visible under
  `display: inline-flex`.

**`rebuild_from_embedded.py`** (Python standard library only) exists because the GeoPackage is not
in the repository and `build_viewer.py` needs it and geopandas. It takes the payload out of the
current `index.html`, optionally swaps in `--leads merged_leads.json` (each lead checked against
the 18-key schema, as `build_viewer.py` now checks it too, through the same function), and fills
the same single `/*__DATA__*/ null` placeholder in `template.html`. It refuses to write if the
decoded JSON does not re-serialise to the same bytes. `--check` runs only that test. Unchanged
data keeps the original base64 literal, so a template-only rebuild leaves the payload
byte-identical. Re-gzipping gives the same deflate stream but a different gzip header: byte 9 is
the OS code, `03` from macOS and `0a` from Windows.

Verified in Chromium (Playwright, file://) on 29 Oct 2026, against both the current payload and
a four-lead fixture in the merged schema:

- none, single, bivariate and composite each draw at all four units;
- the composite for Lahore district equals an independent recomputation;
- hover and click lift the region, and the card's literacy for Lahore (79.6, 8th of 135
  districts) and its 36 site links match the embedded data;
- marker clicks open their popup without selecting the region, and a region click closes the
  popup;
- `in_archive` leads are hidden by default;
- the word GeoNames appears nowhere on the page;
- no console errors, and no sideways scroll at 390 px in any mode, with the card on screen;
- reduced motion keeps the shadow without the transition.

**Not checked:** the real `merged_leads.json`, which did not exist yet, and WebKit.

### Test a conjecture (added 30 October 2026)

A **Test a conjecture** button in the header opens a drawer (480 px on the right; full width on a
phone). It exists so that a pattern noticed on the map can be stated, then tested, without leaving
the page. Everything is computed in the browser from the embedded data; nothing is sent anywhere.

**The workflow.**

1. **State it.** Write the conjecture in words. Choose the unit and an outcome: any indicator, or
   an archive variable (`n_site`, `n_mus`, `n_mus_pre1857`, `sites_per_million`,
   `sites_per_1000km2`; the last two are not in the catalog and are labelled in the page). Then
   choose one or more explanatory variables, each with the **sign you expect** (+, − or "no
   prediction"), and any controls. Each variable can be taken as is, as log(1+x), standardised
   (z), or log(1+x) then z. The page **refuses to run until every explanatory variable has a stated
   sign**. The spec is timestamped before the numbers are computed, which makes this a light
   pre-registration. The drawer opens prefilled from the map: in One measure, the indicator is the
   outcome and the side panel's archive measure is the explanatory variable; in Compare two, "up"
   is regressed on "across"; in Composite, the first indicator is the outcome and the rest are
   controls. **Start from the map** refills it.
2. **Test it.** **Record and test** runs, at the chosen unit:
   - OLS, or Poisson when the outcome is a count;
   - Pearson and Spearman correlations, each with a permutation p;
   - Moran's I of the residuals;
   - a residual-against-fitted plot.

   **Show residuals on the map** draws the residuals on the main map with a diverging scale, and
   the hover tooltip and card show each unit's residual, observed and fitted values. **Back to the
   indicator map** (in the legend) or any change of indicator, mode or unit returns to the
   indicators. **Same test at every unit** re-runs the identical spec at every unit where all its
   variables exist and shows the runs side by side. If a variable is missing at a unit, that row
   says why.
3. **Keep it.** Every run, the unit re-runs included, is appended to a log. The log is saved in
   `localStorage` (key `shrines_viewer_conjectures_v1`, wrapped in try/catch; if storage is
   blocked the page says the log will not be kept). It can be exported as:
   - **CSV**, one row per explanatory variable;
   - **Markdown**;
   - **JSON**, carrying every spec and the full log.

   **Re-run a JSON spec…** takes one spec, an array of specs, or a whole export, and re-runs and
   re-logs each one with identical numbers (all randomness is seeded). **Download data** writes
   the analysis-ready table for the drawer's unit, `shrines_<unit>.csv`. It holds the id, the name
   and the parent admin codes and names (for a hexagon: its H3 index, its centre, and the tehsil,
   district and province holding that centre), then every column in the data at that unit. Under
   each result, **Stata and R code for this test** (open by default) gives complete code that
   carries its own data (every unit's id and the columns the test reads, as an `input … end` block
   in Stata and `read.csv(text = …)` in R) and ends with the viewer's estimates as comments, so it
   can be pasted into either program and run with nothing else (since 30 October 2026; until then
   it read the downloaded CSV).

**Exported findings belong in the repository** (for example `docs/research/`), not only in a
browser's storage or a Downloads folder: RULE 0. The Markdown export ends with that line.

**Estimators** (n units in the fit, k coefficients including the intercept, x_i the i-th row of X):

- **Sample.** Listwise deletion: a unit is left out if it is missing any variable (or the
  exposure), or if a transform or the model is undefined there (log(1+x) of x ≤ −1, exposure ≤ 0,
  or a negative or non-integer Poisson count). z-scores use the mean and the n−1 standard
  deviation of the units that remain. The result states both counts.
- **OLS.** β̂ = (X′X)⁻¹X′y, computed by Householder QR of X after scaling each column to unit
  length; X′X is never inverted directly.
  - The design is refused if a diagonal of R is ≤ 1e-10, or if the 1-norm condition number of
    the scaled X is ≥ 1e12; the message names the collinear term. Above 1e7, the result is marked
    unstable.
  - Classical: V = s²(X′X)⁻¹, with s² = e′e/(n−k).
  - **HC1** (the default): V = n/(n−k) · (X′X)⁻¹ (Σ eᵢ² xᵢxᵢ′) (X′X)⁻¹. This is Stata's
    `regress, vce(robust)`, and R's `vcovHC(type = "HC1")`.
  - Inference: t on n−k df, with the 95% CI β̂ ± t₀.₉₇₅ · SE.
  - Fit: R² and adjusted R².
  - Joint robust Wald test of all slopes: F = b′V⁻¹b/q on (q, n−k).
- **Poisson** (outcome `n_*` only), log link, optional exposure as the offset log(population).
  Exposure is `pop2023` (census, tehsil and district) or `pop_kontur_2023` (Kontur, all units),
  whichever exists at the unit; no other population is invented.
  - Fitted by IRLS: weights μ, working response η − offset + (y − μ)/μ, and each step a weighted
    QR solve.
  - Started from μ = y + 0.5. It stops when the deviance changes by less than 1e-12 relative, or
    reports non-convergence after 100 iterations.
  - Robust (sandwich) covariance: V = n/(n−1) · B (Σ (yᵢ − μᵢ)² xᵢxᵢ′) B, with B = (X′WX)⁻¹ at
    the final μ. This is Stata's `poisson, vce(robust)`; the R code multiplies `vcovHC(type =
    "HC0")` by n/(n−1) to match.
  - Inference: z, normal. The table also shows exp(β), the rate ratio.
  - Fit:
    - McFadden pseudo-R² = 1 − LL/LL₀. LL₀ is the intercept-only model with the same offset.
    - Pearson dispersion Σ((y − μ)²/μ)/(n − k). Above 1.5 the page notes that only the robust
      SEs allow for it.
  - Joint robust Wald test: χ²(q).
- **Correlations.** Pearson r and Spearman ρ (mid-ranks) between the outcome and each regressor,
  on the same units and transforms as the regression.
  - Two-sided permutation p = (1 + #{|r*| ≥ |r|}) / (1 + R), with R = 2,000 shuffles of the
    outcome.
  - The same shuffles serve every regressor and both coefficients.
- **Moran's I of the residuals.** OLS uses the residuals; Poisson uses Pearson residuals. Both
  are centred, as z.
  - I = (n/S₀) · Σᵢ zᵢ · mean_{j∈N(i)} zⱼ / Σᵢ zᵢ². The weights are row-standardised, N(i) is
    restricted to units in the fit, and S₀ is the number of units with at least one neighbour.
    Isolates are counted and reported.
  - Neighbours:
    - **contiguity**: polygons sharing a boundary point, holes included. Without the holes,
      Faisalabad City and Multan City tehsils, which are enclosed, had no neighbours. The
      simplified boundaries share vertices exactly: every district has a neighbour, with 5.1 on
      average.
    - **k nearest centroids** (k = 6 by default): area-weighted polygon centroids, distance on
      (lon · cos 30°, lat), ties broken by index.
    - **H3 ring-1 neighbours** for hexagons, always: kNN over 19,000 cells is too slow in a page,
      and for an interior hexagon the ring is exactly its 6 nearest centres.
  - Expected value: for OLS, E[I] = (n/S₀) · tr(MW)/(n−k), with tr(MW) = −tr((X′X)⁻¹X′WX).
    Poisson uses −1/(n−1).
  - p is a permutation pseudo-p from 999 shuffles, one-sided in the direction of the observed I
    against the permutation mean, as PySAL's `p_sim`.
  - The page says in plain words when the residuals are positively autocorrelated (p < 0.05): the
    SEs are likely too small.
- **Benjamini–Hochberg** across the log. The family is every explanatory-variable test in the log,
  unit re-runs included. With robust p sorted p₍₁₎ ≤ … ≤ p₍ₘ₎, the adjusted p₍ᵢ₎ =
  min over j ≥ i of min(1, m·p₍ⱼ₎/j).
- **Distributions.** jStat 1.9.6 from cdnjs supplies the t, normal, F and χ² functions. The page
  works without it, and says that p-values need it.
- **Randomness.** The permutations come from mulberry32 seeded with 20261030 (Moran: seed + 1). The
  seed and the counts are in the spec, so a re-run reproduces every permutation p.

**Caveats, shown where results are shown** (briefly, under every result):

- **Multiple testing.** The note counts the tests run this session and in the log, and the BH
  column adjusts for all of them.
- **Ecological inference.** The associations are among units, not people or shrines, and nothing
  here shows what causes what. The wording is never causal: the browser test fails on "effect",
  "impact", "leads to" or "drives" in a result.
- **Curated archive.** Whenever an archive variable is used, the note says the archive is not a
  census.
- **Pre-1857.** Whenever `n_mus_pre1857` is used, the note adds that 25 of 80 Muslim shrines have
  no numeric year and count as not pre-1857 (see "Caveats" above).
- **Sign.** The pre-stated sign is compared with the estimate. If p ≥ 0.05, the note adds that
  the data do not tell the estimate apart from zero.
- **Units.** The unit table flags runs on fewer than 30 units (a province run has n = 7), and says
  that a raw coefficient may not compare across units.

**Verified on 30 October 2026, in Chromium (Playwright, file://).**
`pipeline/gis/viewer/tests/test_conjecture.cjs`: every check passes.

- **Model runs:**
  - OLS at district level: literacy ~ log(1+`n_mus_pre1857`) + night lights, n = 135, with 25
    districts left out for a missing value.
  - Poisson on `n_site` with census exposure: 6 IRLS iterations.
  - Tehsil OLS with 6-nearest-centroid weights.
  - The same test at all four units, logged as re-runs.
  - In the browser, the H3 ring equals the 6 nearest centres for 231 sampled interior hexagons.
- **Residual map:** all 577 tehsils coloured, with the hover and the card.
- **Exports and downloads:**
  - CSV, Markdown and JSON exports.
  - Data downloads: tehsil 577 rows × 108 columns; district 160 rows, with Lahore's literacy and
    province matching the data; hexagon 19,197 rows in about 0.6 s.
  - The log survives a reload. A JSON re-run reproduces every number byte for byte.
- **Drawer and page:**
  - With storage blocked, the page still runs and says so.
  - Esc closes the drawer, and focus returns to its button.
  - At 390 px, light and dark, there is no sideways scroll and every control is at least 44 px.
  - No console errors.
  - The existing viewer checks still pass. Two hexagon checks fail with leads on, as they do
    against the committed page: the known marker artefact.
- **Independent reference:** `pipeline/gis/viewer/tests/check_conjecture_reference.py` (standard
  library; numpy is not installed here) reads the data from `index.html` itself. It recomputes
  the page's exported log with different algorithms: Gauss–Jordan normal equations for OLS,
  Newton–Raphson for Poisson, and its own incomplete beta and gamma. It covers all six runs above,
  district, tehsil, hexagon and province.
  - Largest differences:
    - coefficients 1.6e-13 relative, robust SEs 1.8e-12, classical 6.4e-13;
    - Wald statistics 2.5e-12;
    - Moran's I 1.3e-15 and E[I] 8.8e-15;
    - R² 3e-13 absolute;
    - Poisson log-likelihood and pseudo-R² ~1e-15.
  - Every permutation p-value (Pearson, Spearman, Moran) and every n is **identical**: the
    reference ports the seeded generator.
  - p-values differ by up to 8e-8 absolute, and CI bounds by 5e-7 relative. That difference is
    **jStat's**: its two-sided t p at t = 2 on 10 df is 7.6e-11 from the exact 0.0733880347707,
    and its 0.975 quantile on 10 df is 9.5e-9 from 2.228138851986; the reference matches both to
    1e-14. The tolerance is set at 1e-6, and the page shows four decimals.

**Not verified:**

- ~~The Stata and R code has not been run.~~ **Run, 30 October 2026**, in StataNow 19.5 MP and
  R 4.6.1 (sandwich, lmtest 0.9.40): `tests/export_replication.cjs` asks the page for the code of
  every test `test_conjecture.cjs` logs, and `tests/check_stata_r.py` runs it with no data file
  beside it and compares each coefficient and SE. 6 tests (OLS HC1 with a log1p regressor and a
  control, Poisson with exposure, z-scored OLS at hexagon, tehsil, district and province), 72
  comparisons, largest relative difference **4.9e-8**. Variable names over 32 characters are now cut
  and numbered in the code itself (`stataName`), so the old `import delimited` label assumption is
  gone; no logged test yet uses one, so that path is unexercised.
- Moran's I at hexagon level against an outside implementation: the reference has no h3.
- WebKit.

### Revised after review (30 October 2026)

*The full record, finding by finding, with the calibration table and what is still open, is
`docs/research/VIEWER_REVIEW_2026-10-30.md`. Where it and the section above disagree, it is
current.*

The viewer was reviewed by ChatGPT and by three independent Claude reviewers (statistics,
presentation, code), using the package from `pipeline/gis/viewer/review/make_package.py`. Every
finding was checked before anything was changed. What changed in how a result is computed:

- **The headline p** is the largest of:
  - the chosen robust (or classical) p;
  - the Conley p at every cutoff;
  - the spatial-noise placebo p.

  It drives the verdict, the log and Benjamini–Hochberg.
- **Conley SEs.** B (Σᵢ Σⱼ K(dᵢⱼ) uᵢuⱼ xᵢxⱼ′) B, with:
  - the Bartlett kernel 1 − d/c;
  - cutoffs 50, 100, 200 and 500 km (hexagons up to 200);
  - distances between centroids on a local tangent plane;
  - the robust SEs' small-sample factor, so that 0 km reproduces HC1.

  The score u is the residual (OLS) or y − μ (Poisson). A covariance that is not positive definite
  is reported as missing.
- **Spatial-noise placebo** (after Kelly 2019). Each explanatory variable is replaced by Gaussian
  noise with the same Moran's I; there are 200 draws per family:
  - neighbour-smoothed over the contiguity graph, up to 16 passes;
  - a Gaussian kernel over distance, bandwidth 25–600 km (not for hexagons).

  p = (1 + #{|t\*| ≥ |t|}) / (1 + R), and the larger of the two families' p is used.
  **Measured:**
  - smooth noise is called significant 47–78% of the time under HC1, and 17–56% under Conley at
    200 km;
  - under the headline p it is called significant 0–5% of the time.
- **Moran's I of OLS residuals.** The Cliff–Ord test:
  - E[I] = (n/S₀) tr(MW)/(n−k);
  - Var[I] = (n/S₀)²[tr(MWMW′) + tr(MWMW) + tr(MW)²]/((n−k)(n−k+2)) − E[I]²;
  - two-sided normal p.

  The traces are computed sparsely. The dense check in the reference reduces to the classical
  formula when X is an intercept alone. For Poisson residuals: a two-sided permutation test, with
  E[I] the permutation mean.
- **Fragility** under every result. The specification is refitted without:
  - Lahore district;
  - each province;
  - the most influential unit (Cook's distance; Poisson by the weighted hat).

  Flags appear when the sign flips, significance is lost, the estimate moves by more than half, or
  one unit's leverage is high.
- **Inference only above 10 residual df.** Below that, no p-values and no intervals; the run stays
  out of the family.
- **The BH family** counts each distinct hypothesis once, at its first run. Hidden tests stay in it.
- **Poisson** defaults to the population exposure.
- **log(1+x)** refuses when any value is ≤ −1; asinh(x) is offered.
- **The composite** is ranked within the units that have every component, and can be tested as
  itself (`composite`, with its components in the spec).
- **Embedded data.**
  - District, tehsil and province values are now at full precision (`rebuild_from_embedded.py
    --precise pipeline/gis/atlas`, 77,520 values, checked against the old rounding).
  - Hexagons too since the rebuild of 30 Oct 2026 (below): every value at full precision.
  - Exports carry `VIEWER_VERSION` and `DATA_ID`.

**Data defect, fixed at source on 30 Oct 2026.** `travel_city_min_popw` was negative in 28 units:
the 2015 raster's undeclared negative sea and nodata pixels were averaged in, and the same pixels
inflated `share_pop_within_60min_city`. `build_welfare_layers.py` now masks them (31 populated cells,
0.056% of people) and fails on any negative travel time at any level, and the layers and the page
were rebuilt (below). The page still sets a negative travel time missing and says so, for older
data; on the rebuilt data it finds none and shows no note.

**Verified** (30 Oct 2026, Chromium, file://):

- `tests/test_conjecture.cjs`: 41 checks.
- `tests/test_review_fixes.cjs`: 35 checks, one or more per finding and per decision of 30 Oct.
- `tests/check_conjecture_reference.py`, extended to the Cliff–Ord moments (dense), Conley (brute
  force) and the refits. It matches to 1e-13, and to jStat's 1e-7 for p-values.

**Native support** (30 Oct 2026). `atlas/native_support.tsv` says, per source, where its values were
measured (district, division, DHS region, a 5 km modelled surface, points...), with the line in this
repository that says so; `atlas/check_native_support.py` fails if a quote has gone from its file or a
source shown in the viewer has no row. Both builds attach it to each indicator. The side panel names
the level, and a result flags a variable measured for fewer units than the run uses (GDP per capita:
32 divisions, shown at 160 districts), one whose split districts repeat their parent's value, and a
modelled estimate whose prediction error is not in the standard errors. The distinct-value guess is
kept for any source the table does not cover.

**Not verified:**

- the placebo's calibration for hexagons, Poisson models, or outcomes other than literacy;
- the Stata and R code (neither is installed here);
- WebKit.

## Welfare layers (added 16 October 2026)

`pipeline/gis/welfare/`. Every source, its licence and its URL are in `sources.tsv`; every file's
size and SHA-256 at fetch time in `sources/fetched.tsv` and the `welfare_sources` layer.

| Source | What | Level reached |
|---|---|---|
| Meta Relative Wealth Index (Chi et al. 2022) | wealth estimate per ~2.4 km tile, relative within country | hexagon, tehsil, district, province |
| Harmonized night lights 2013 and 2023 (Li et al. 2020, figshare v10) | DN 0-63 | same |
| Weiss et al. 2018 / 2020 (Malaria Atlas Project) | minutes to a city of 50k+; motorized minutes to health care | same |
| Kontur population 2023 (H3 res 8) | the carrier for population weighting | same |
| HeiGIT risk indicators | rural access index, OSM-based facility access | district |
| DHS 2017-18 (13 indicators) and OPHI MPI | mortality, stunting, vaccination, literacy, poverty | province / region |

**Method.** Kontur's 380,718 populated res-8 hexagons carry every value: rasters are sampled at
each cell's centre, RWI comes from the nearest tile within 2.5 km, each cell is placed in a tehsil
by point-in-polygon, and everything is aggregated with population weights. So a district's RWI is
the wealth of its average resident, not of its average square kilometre.

Layers: `welfare_grid_h3_r6`, `welfare_tehsil`, `welfare_district`, `welfare_province`,
`welfare_codebook`, `welfare_sources`, `welfare_checks`. Flat CSVs of all but the grid are
tracked in `welfare/`.

**Verification: 24 checks, 23 pass, 1 deliberate warning** (`welfare/checks.csv`). Highlights:

- Both published MD5 hashes (night lights) match.
- Kontur, four provinces + ICT: 236.2 M against the census's 241.5 M; district log-correlation
  r = 0.978 over 135 districts.
- **Convergent validity against Census 2023, 135 districts (Spearman):** RWI vs literacy +0.76,
  electricity +0.76, flush toilet +0.83, out of school −0.71; night lights vs urban share +0.73;
  travel time to a city vs literacy −0.77; travel time to health care vs literacy −0.81.
  Measures built from satellites and phones agree with the census about which districts are
  better off, which is the evidence they measure welfare and not something else.
- All 104 DHS values used are identical between the HDX copy and the DHS Program API.
- OPHI's national figures (MPI 0.1982, H 38.33%, A 51.72%, vulnerable 12.92%, severe 21.47%)
  match UNDP's 2024 country profile (0.198 / 38.3 / 51.7 / 12.9 / 21.5), read from the PDF.
- DHS 2017 and census 2023 household electricity rank the five provinces identically.

**Findings that would each cost an hour to rediscover:**

- **OpenStreetMap holds ~3% of Pakistan's schools**: 9,091 education facilities in the HOT
  export, 5,071 counted by HeiGIT, against **313,418 institutions** in Pakistan Education
  Statistics 2021-22 (PIE, reported by Dawn). Every OSM-derived count and "access" share
  measures mapping effort as much as provision. They are in the layers, labelled, and are not
  used as welfare. The check stays a warning on purpose.
- **DHS's headline value is not `ByVariableId == 0`.** Mortality is reported over the 10 years
  before the survey and facility delivery over 2 years, both with a non-zero breakdown id;
  filtering on 0 silently dropped four indicators. Use `IsPreferred`, else the only row.
- FATA's DHS under-5 mortality (33 per 1,000) is the lowest of any region while its MPI (0.383)
  is the highest. Reported as the data says, flagged in the layer's `note`.
- Census tehsil outcomes exist only for 77 districts (the clean matches); the satellite measures
  exist for all 577 tehsils.

## The atlas and the second wave (added 17 October 2026)

The aim: every measured welfare outcome for people in Pakistan that is openly available, on one
frame. **`atlas_district`, `atlas_tehsil`, `atlas_province` and `atlas_grid_h3_r6`** in the
GeoPackage hold every indicator as a column (336 at district), so ArcGIS or QGIS opens one layer
and needs no joins; `atlas_codebook` (313 indicators) gives each one's definition, publisher,
licence, year and the units it reaches. Flat copies are tracked in `pipeline/gis/atlas/`.
`build_atlas.py` refuses a column that arrives from two sources, an indicator with no
definition, and any change to the archive's site counts.

**`atlas_sites`** (layer and `atlas/atlas_sites.csv`) is the table the shrine-exposure analysis
starts from: each of the 169 archive sites with all 240 catalog indicators for the place it stands
in. Each indicator is taken at the finest unit that reaches nearly all sites — hexagon for the
satellite and modelled layers (56), district for most surveys (153), province for DHS's region figures (28) — and that unit is the codebook's `site_unit`, so no column mixes units. Census
tehsil values reach only the 77 cleanly matched districts, so for sites they fall back to district.
Only the sites layer's public columns are carried; the build fails if a team-only one appears.

What was added, by builder. Each writes its own checks file; every number below is from them.

| Builder | Source | Indicators | Reaches |
|---|---|---|---|
| `outcomes/build_census_extended.py` | Census 2023 tables 4, 6, 13A, 20-26 | child-woman ratio (fertility proxy), dependency ratio, under-5 sex ratio, girls / boys 15-19 ever married, youth literacy by sex, kacha / pakka housing, jhuggis, homelessness, no kitchen, no washroom, women home-owners, age heaping | district (all 23); tehsil (11) |
| `welfare/build_extended_layers.py` | DHS modelled surfaces (17), MAP, Kummu GDP, UCDP, Ookla, UNOSAT, IPC | stunting, vaccination, ANC, facility births, contraception, unmet need, literacy by sex, water, open defecation, bed nets, tobacco; malaria (Pv, Pf) 2024; walking time to care; GDP per capita 2023 and growth; conflict deaths 2015-24; mobile / fixed internet speed and use; share living in the 2022 and 2010 flood extents; IPC phase 3+ | hexagon, tehsil, district, province (IPC district only) |
| `outcomes/build_pslm_district.py` | PSLM 2019-20 microdata (PBS) | literacy, net enrolment, out of school, women's and men's mobile ownership and internet use, full immunisation, child diarrhoea, ORS, prenatal care, skilled birth attendance, facility births, postnatal care, women's work, handwashing with soap, drainage, waste collection, LHW visits, FIES food insecurity, ownership of agricultural land and of cattle, remittances received, users' satisfaction with BHUs, hospitals, primary schools and the police, distance to a BHU | district (129) |
| `outcomes/build_mpi_district.py` | Planning Commission / UNDP / OPHI 2016 | district MPI, headcount and intensity, six rounds 2004/05-2014/15 | district (124) |
| `outcomes/build_pslm_2015.py` | PSLM 2014-15 microdata (PBS) | the same literacy, schooling, immunisation, diarrhoea, maternal-care and LHW indicators for 2014-15, and the change to 2019-20 | district (122; change for 107) |
| `outcomes/build_nns_district.py` | National Nutrition Survey 2018, Vol. 2 | stunting, wasting, underweight, overweight, clinical anaemia, child disability, iodized salt, women's underweight and obesity, marriage before 18 and 15, **E. coli and arsenic tested in household drinking water**, FIES, social-protection coverage | district (146, incl. AJK, GB, ex-FATA) |
| `welfare/build_dhs_regions.py` | DHS Program API, PDHS 2017-18 | women's agency and safety by region: attitudes to wife-beating (women, men), say in household decisions, controlling husbands, physical and partner violence and whether help was sought, house ownership, bank accounts, control of earnings, health insurance, media access, marriage by 18, neonatal mortality | province (and FATA as a data row) |
| `welfare/build_health_facilities.py` | Government and private health facilities with coordinates (Alhasan Systems' 2017 compilation, CC0 on HDX) | distance to government primary care (BHU/RHC…) and to an HQ hospital, share within 5 km / 25 km, facilities per 100,000 | hexagon, tehsil, district, province |
| `welfare/build_roads.py` | GRIP4 road density (Meijer et al. 2018, PBL), 5 arc-minute | main-road and all-road density around residents | hexagon, tehsil, district, province |
| `welfare/build_air_quality.py` | LGHAP v2 (Bai et al. 2024), 1 km monthly PM2.5 | annual PM2.5 where people live; share above WHO's guideline (5) and its least strict interim target (35 µg/m³) | hexagon, tehsil, district, province |
| `outcomes/build_wb_poverty_district.py` | World Bank, *Pakistan Poverty Map 2019-2020* (PRWP 11012), Annex 1 | **monetary poverty rate (with SE)**, poverty gap, number of poor, consumption per adult equivalent | district (129) |
| `outcomes/build_undp_hdi_district.py` | UNDP Pakistan, *NHDR 2017*, district HDI volume, Tables 1-2 | district HDI 2005-2015 and its 2015 components (immunisation, satisfaction with health facilities, expected and mean schooling, living standard) | district (122) |
| `outcomes/build_mics_district.py` | Provincial MICS 6, sampling-error appendices | **under-five, infant and neonatal mortality and TFR (with standard errors)**, foundational reading and numeracy, birth registration, violent discipline, child labour, child marriage, feeling safe, discrimination, life satisfaction, and more | district (65: Punjab, Sindh) |

**Verification.** Census extension 15 pass + 1 warning; wave two 73 pass + 5 warnings; PSLM 15 +
2; district MPI 8 of 8; atlas 9 of 9. Highlights:

- **The PSLM computation reproduces PBS's own published district tables** from the same survey:
  literacy 10+ (Table 2.14a, 116 districts, median gap 0.20 points), full immunisation (Table
  4.3C, 113, 0.26) and child diarrhoea (Table 4.6, 117, 0.22) — every district within 2.5 points
  of a table rounded to whole numbers, rank correlation 1.00. Food insecurity is PBS's own
  calibrated FIES prevalence (Table 9.1, with margins of error); the raw score computed from the
  microdata ranks districts the same way (ρ 0.91).
- DHS surfaces: population-weighted national means within 5 points of the DHS headline for 15 of
  17 (DPT1 −6.5, card seen +5.8); province rankings agree at ρ ≥ 0.6 for 12 of the 15 that DHS
  reports by province, not for stunting (0.43), modern contraception (0.43) or tobacco (0.09).
  Each carries the DHS Program's own out-of-sample correlation in its definition, from 0.52
  (tobacco) to 0.97 (open defecation); `welfare/dhs_surfaces_validation.csv` has all of it.
- Flood exposure: 32.9 M residents inside the July-August 2022 extent, against UNOSAT's own
  27.9 M for August alone; by district the two agree at ρ 0.95.
- District MPI: all 652 district-rounds satisfy MPI = headcount × intensity; national 0.197.
- PSLM 2014-15 reproduces PBS's own 2014-15 figures, which the 2019-20 report prints in its
  "14-15" column: literacy median gap 0.22 points (102 districts), immunisation 0.27, diarrhoea 0.25.
- NNS 2018: the national TOTAL rows of Volume 2 match the Key Findings Report for stunting 40.2,
  wasting 17.7, underweight 28.9, overweight 9.5 and food security 63.1.
- MICS: Punjab prints district TFR and under-five mortality twice (Vol. II tables, Vol. III
  sampling-error tables) and the two readings agree for every district. TFR tracks the census
  child-woman ratio (ρ 0.78); MICS and NNS child marriage agree (0.76).
- World Bank poverty map: every district's number of poor equals rate × population; the
  population-weighted district rates reproduce the paper's province rates to two decimals. The
  poverty rate tracks the 2014/15 district MPI (ρ 0.79) and the RWI (−0.67).
- UNDP district HDI: the report prints 2015 and 2013 values twice (Tables 1 and 2) and the two
  readings agree for all 114 districts; HDI tracks the district MPI at ρ −0.97.
- GDP per capita lands within 1% of Kummu's national figure (6,004 against 6,037).
- A fast raster sampler replaced rasterio's per-point `sample()` (15 minutes → seconds) only after
  it returned identical values on 5,000 cells.

**How far the sources agree** (`atlas/agreement.csv`, rebuilt with the atlas): where several
sources measure one concept, each pair is compared across districts. Agreement is strong for
literacy (census and PSLM, ρ 0.92; women 0.94), water (census and DHS 0.84), fertility (MICS TFR
and the census child-woman ratio 0.78) and stunting between NNS and MICS (0.84; the DHS surface
less so, 0.43 with NNS). It is **weak to absent for food insecurity** — PSLM's FIES, the NNS's FIES
and the IPC's phase 3+ rank districts differently (ρ −0.01 to 0.33) — and the NNS's "social
protection" and MICS's "social transfers" are different measures (means 8% and 40%, ρ −0.16).
Choose among these deliberately and say which.

**Findings that would each cost an hour to rediscover:**

- **The DHS Program's "men who do not smoke" surface (AHTOBCMNON) is byte-identical to "men who
  smoke any tobacco" (AHTOBCMANY)**, packaged eight months apart. Its national mean came out 25.2
  against the survey's 77.3. Not used; the build refuses identical surfaces from now on.
- **PSLM 2019-20's polio items carry an unlabelled code 4** (probably a campaign dose). PBS
  counts it as received; without it full immunisation is 7.5 points short of PBS's table.
- **Census Table 4 (ages) and Table 1 disagree on seven districts' populations**: Tando Muhammad
  Khan +60%, Kolai-Palas Kohistan −15.5%, Quetta −12.5%, the other two Kohistans −11%,
  Islamabad −3.4%, Rajanpur −2.4% (`outcomes/census_table4_vs_table1.csv`). Ratios from Table 4
  are internally consistent; the totals are reported, not corrected.
- **The PSLM report's tables come in three layouts** (name then numbers; numbers on the line
  above the name; and the same with rank after the name), and all-urban Karachi rows print the
  rural block as two zeros. `parse_table()` handles all of them; a naive parser reads the rank
  as the total.
- **Chagai, Jhal Magsi, Musakhel, Panjgur and Zhob have district labels in the PSLM 2019-20
  microdata but no households.** They stay empty.
- PSLM's FIES (2019-20) and the IPC's phase 3+ (2021-2026 analyses) do not rank the same
  districts alike (ρ −0.01 over 76). Different years either side of the 2022 floods and a
  different method; reported as a finding, not reconciled.
- Census "Primary Completed" by age averages 6% among 15-24: it is primary as the *highest*
  level, and the table does not say so. Left out.
- MAP's malaria rasters have no-data cells where 1.9% of people live (Karachi's edges, the
  Makran coast, parts of Thal). Left empty, never filled with zero.
- **The PSLM 2014-15 file labels the vaccination code that 2019-20 leaves bare**: 4 is "polio
  campaign". The PBS microdata page names its 2014-15 Stata file `Data-in-stata.zip`, and
  `data-in-stata-2.zip` is 2013-14 — read the headings on https://www.pbs.gov.pk/pslm-3/, not
  the file names.
- **NNS 2018 never surveyed Mansehra, Abbottabad, Haripur, Diamir or the two Waziristans**:
  no-objection certificates were refused (Vol. 1 §2.2.8). Its two publications disagree on
  E. coli in drinking water (Vol. 2 31.3%, Key Findings 36.0%) and child disability (14.0% vs
  12.7%); both figures are in the checks, neither corrected. Values in parentheses rest on 25-49
  cases and are kept with a flag (`nns_small_n_*`) — most of the arsenic tests.
- **MICS under-five mortality falls with female literacy within each province** (Punjab ρ −0.56,
  Sindh −0.44) **but not pooled** (−0.06): Punjab's district median is 72 per 1,000, Sindh's 42,
  a level gap between two surveys a year apart. Compare districts within a province.
- **The World Bank poverty map's annex is its national-level model**, not the province models
  its Table 6 also reports: the district rows reproduce the national model's province rates (KP
  30.04, Punjab 16.56, Sindh 26.17, Balochistan 38.73) exactly and miss the province models'
  (29.03, 16.21, 25.75, 42.50). The annex prints **Multan's mean consumption as 35,473 PKR** against
  a 5,140 median — kept as printed, flagged by a check.
- **LGHAP's NetCDF files have no geotransform and store PM25 as (lon, lat)**: rasterio opens them
  as an identity-transformed 36,000 × 12,000 array. Read the `lat` and `lon` variables with
  netCDF4. The build's orientation check (Lahore's annual mean 90 µg/m³ above Gilgit's 15) is
  what guards this. Population-weighted national mean, 2021: 47.1 µg/m³. 2011 is read the same way
(MD5 checked; Lahore 104 µg/m³ then, 90 in 2021) for the decade's change.
- **The health-facility file holds 73% of BHUs and 84% of RHCs** (4,023 of the 5,508 and 567 of
  the 676 the Pakistan Economic Survey 2017-18 counts for 2017), so distance to care is an upper
  bound where a facility is missing; every definition says so. It still tracks MAP's modelled
  travel time to care (ρ 0.64). National population-weighted distance: 4.5 km.
- **All-road density measures mapping effort, main-road density measures access.** In GRIP4 the
  first tracks travel time to a city only weakly (ρ −0.32), the second strongly (−0.66). Both are
  in the atlas; the definitions say which to read.
- **PSLM's land area and owner's sex are not usable as published**: the owner codes carry no
  labels, and the file's acre conversion is inconsistent (an 11-acre plot converts to 38; the
  maximum is 240,000 acres). Only whether a household owns land is used.
- pdfplumber took over ten minutes on a 380-page report; `pdftotext -layout` (poppler, installed)
  takes seconds and keeps table columns aligned. Both NNS and MICS are read that way.

**Not reached, and why** (so the next attempt does not start from zero):

- Satellite PM2.5 from ACAG (V6.GL.02) sits behind Box and NASA Earthdata logins — LGHAP v2 on
  Zenodo is used instead; IHME's gridded
  child mortality, growth failure and WASH estimates behind a GHDx login; SEDAC's relative
  deprivation and infant mortality grids behind Earthdata. All would add real outcomes.
- **The Khyber Pakhtunkhwa 2019 and Balochistan 2019-20 MICS reports** are published only at
  mics.unicef.org, which answers scripts with 403. Saved by hand as
  `pipeline/gis/sources/mics/kp_mics_2019_sfr.pdf` and `balochistan_mics_2019_20_sfr.pdf` (URLs in
  `welfare/sources_extended.tsv`), `build_mics_district.py` reads them with no change, and MICS
  then covers all four provinces.
- AJK and Gilgit-Baltistan are outside the census tables, PSLM, MICS and the MPI annex; for them
  the atlas has the satellite and modelled layers, DHS's region figures and the NNS 2018.

## Other shrine databases (added 16 October 2026)

`pipeline/gis/shrine_sources/`. OpenStreetMap (773 features: tombs, darbars, temples,
gurdwaras), Wikidata (93 items under shrine, tomb, mausoleum, temple, gurdwara and samadhi
classes; churches excluded by name) and GeoNames (1,856 SHRN/TMB/TMPL/RLG/PGDA features). The
Punjab Auqaf website has pages for 12 major shrines and no register or coordinates.

**These are leads, not entries (RULE 2).** After deduplication across sources, **2,525 places are
not in the archive.** Each is in `external_sites.csv` with its source record's URL, admin codes and
H3 cell, and in the viewer.

**How far each source can be trusted**, measured where the answer is known, against the
archive's own sites (unshared pins only):

| Source | Archive sites it contains | Median offset | 90th percentile |
|---|---|---|---|
| OSM | 63 of 169 | 22 m | 437 m |
| Wikidata | 42 | 19 m | 578 m |
| GeoNames | 27 | 148 m | 1,082 m |

That is agreement, not independent accuracy: some archive pins were checked against OSM in the
August coordinate review. GeoNames' points come largely from old gazetteer maps and are an order
of magnitude coarser.

**The matcher was measured before it was trusted.** `match_gold.tsv` holds 61 hand-labelled
pairs (same place or not). The build fails if precision on them falls below 95%; it is 97%
(30/31), recall 91%. Human verdicts then override the matcher, after it is scored. Getting there
took four fixes, each found by reading matches by eye: stripping "Data" and "Bibi" as generic
words made Data Darbar unmatchable; gluing aliases together diluted every score; honorifics
("Syed … Shah", "Samadhi … Singh") made different people's tombs one; and place and deity names
("Multan" vs "Multani", "Shiv") matched temples to Sufi shrines. Transliteration is handled
by a consonant skeleton (Hujwiri and Hajveri are both `hjwr`).

**16 archive sites are placed > 300 m from the archive's pin by a name-matched OSM or Wikidata
record** (`archive_coordinate_disagreements.csv`, both points given). Five are already in the
30 August coordinate review. The strongest is Shah Ali Akbar (Multan), where three records in two
independent sources agree with each other 1.5 km from the archive's pin. Others: Hafiz Muhammad
Jamal Multani 1.5 km, Malik Ahmad Ayaz 1.2 km, Lal Shahbaz Qalandar 885 m, Abul Muali Qadri
905 m (whose pin is a Mochi Gate placeholder). Either point may be the wrong one.

**Gotchas:** Overpass answers 406 to a request with no User-Agent; on 16 Oct 2026 it and two
mirrors returned 502/500 for every query, and Wikidata 429 after repeated runs, so
`fetch_shrine_sources.sh` keeps the previous file for a failed source and exits non-zero naming
it. **A site's URL slug is `slugify(name)`, not `id`:** slugify reaches all 169 prerendered pages,
`id` only 156.

## Merged leads (Wikidata over OSM) (added 29 October 2026)

`pipeline/gis/shrine_sources/merged_leads.csv` (one row per place, every attribute),
`merged_leads.json` (the viewer's compact array) and `merged_leads_checks.csv` (counts, fill
rates, the live property table, invariants). Built by `build_merged_leads.py`, Python stdlib
only. **Leads, not entries (RULE 2).**

**GeoNames is out.** Against the archive's own pins its median offset is 148 m (p90 1,082 m);
OSM's is 22 m (437 m) and Wikidata's 19 m (578 m). The table above is the measurement.

**Precedence, per field: Wikidata if non-empty, else OSM.** Coordinates likewise: wherever a
place has a Wikidata item its point is the item's, and the build fails if not. `name_from`,
`coord_from`, `religion_from`, `year_built_from`, `admin_from` and `figure_from` say which
source gave each value. Places are the existing `place_id` groups of `external_sites.csv` (no
name matching is redone), plus a union wherever an OSM `wikidata` tag or a Wikidata OSM
node/way/relation ID statement links the two.

**The figure columns come only from structured statements**: Wikidata P547 (commemorates),
P825 (dedicated to), people whose own item gives P119 (place of burial) as the site, and the OSM
tags `buried:wikidata` / `subject:wikidata` / `subject` / `memorial:name`. A saint's name is never
parsed out of a shrine's title, so a darbar named for its saint and carrying no such statement
has an empty figure. P138 (named after) goes in `named_after`, not in the figure. On a Hindu
temple P825 is usually a deity (Varuna, Durga): that is what the site is dedicated to.

**Measured 29 October 2026** (OSM base 2026-10-30T02:43Z; 773 OSM elements, 94 Wikidata items
after the church exclusion):

| | |
|---|---|
| Places | 817 |
| In both sources | 36 (Wikidata–OSM offset median 14 m, p90 132 m) |
| Wikidata only / OSM only | 57 / 724 |
| Coordinates from Wikidata / OSM | 93 / 724 |
| Sources disagree by > 300 m | 2: Bibi Pak Daman 550 m, Valmiki Temple 3.7 km |
| In the archive | 93 (92 by the matcher, 1 by a person's verdict) |
| Leads (not in the archive) | 724 |
| Places with a figure | **25 (3.1%)**: P825 12, P119 inverse 10, P547 4, OSM `subject:wikidata` 1 (one place can have two) |

The figure fill rate is the finding: the structured sources almost never say whose shrine a
shrine is. OSM in Pakistan carries one `subject:wikidata` (Waris Shah) and no `buried:wikidata`
or `memorial:name` at all; of 773 elements 115 have `name:en`, 91 `name:ur`, 35 `wikidata`, 3
`start_date`, 0 `heritage`. Burial statements (P119) are on the people's items, not the shrines',
which is why the inverse query exists: they bring whole families (five Bhuttos, six people at the
Mazar-e-Quaid).

**Dates are as Wikidata gives them**, with the precision named: `2000` at *century* precision
is Wikidata's encoding of "20th century", not the year 2000, and `(Julian)` marks a Julian-calendar
value. Several items carry two inception or birth values; both are kept, separated by `;`.

**A Wikidata duplicate**: Gurdwara Chowa Sahib is Q30641887 and Q63343676, 24 m apart, same
label and class. The "no place carries two QIDs" invariant fired on it. It is now paired in
`wikidata_duplicates.tsv` with the evidence (the OSM node links Q30641887, which has the
Wikipedia sitelinks), **confirmed by Rauf on 30 October 2026**; any other two-QID place still
fails the build. It should still be merged on Wikidata itself.

**One new item since 16 October**, Samadhi of Bhai Vasti Ram (Q137739251), is not in
`external_sites.csv`, so the archive matcher has never seen it: `archive_unchecked = 1`, and its
`in_archive = 0` is not a finding. The archive has a row "Samadh Bhai Vasti Ram" (Lahore), very
likely the same place, and **Rauf judged it so on 30 October 2026** ("probably the same"). That
verdict is in `archive_match_verdicts.tsv`, which the build applies to records the matcher has
not seen, failing if a verdict names an archive id that does not exist or a record no longer in
the sources. The place is now `in_archive = 1`. Its admin codes and H3 cell stay empty until
`build_external_sites.py` is rerun (needs the gis venv and the GeoPackage).

**Rerun** (from the repo root; curl and any Python 3, no venv):

```bash
pipeline/gis/shrine_sources/fetch_merged_sources.sh      # ~6 min, mostly Overpass
python pipeline/gis/shrine_sources/build_merged_leads.py # exits non-zero on any invariant
```

The fetch keeps the previous files for a source that fails and exits non-zero; the build falls
back to `external_sites.csv`'s thin rows for a missing source and fails its "fresh fetch"
invariant, so a fallback never passes silently. `fetch_manifest.csv` beside the downloads records
each file's SHA-256 and fetch time. Property IDs are checked against their live labels on every
build (17 of 17 on 29 October).

## Shrines per district beyond the archive (added 30 October 2026)

`pipeline/gis/shrine_sources/district_counts/` counts shrines per district from OSM (a wider pull,
classified into audited tiers), GeoNames, Wikidata and the Department of Archaeology & Museums'
national inventory, separately and as a deduplicated union, with OSM's mapping effort as a control;
measures every source against DOAM as the official baseline; and checks the archive's pins. The
viewer's workbench reads the counts (`build_viewer.py`). **Read its `README.md` before using any of
them**: the sources disagree on which districts are dense, and OSM's coverage follows wealth.
HANDOVER §9.434.

## Licences

Boundaries come from OCHA COD-AB through `pkmapr` 1.4.0, which is GPL-3. Census figures are
Pakistan Bureau of Statistics tables through `PakPC2023` 0.2.0. Both are recorded in the
manifest and codebook. Check the GPL-3 terms before publishing the GeoPackage with the data
release (`docs/DATA_RELEASE.md`).

Welfare and shrine sources: RWI **CC BY-NC 4.0** (non-commercial); night lights, Weiss travel
times, Kontur, GeoNames CC BY 4.0; HeiGIT CC BY-SA 4.0; OPHI and Wikidata CC0; DHS under its
free terms of use (cite); **OpenStreetMap ODbL 1.0**, so `external_sites.csv` and anything
derived from its OSM rows must stay ODbL with attribution if distributed.

Second wave (17 Oct 2026): DHS modelled surfaces under DHS's terms (cite); MAP, Kummu, UCDP CC BY
4.0; **Ookla CC BY-NC-SA 4.0** (non-commercial, share-alike — like RWI, it limits how the atlas
can be released); UNOSAT CC BY-SA; IPC CC0; PSLM and the census are PBS publications; the
district MPI is a Government of Pakistan report. Every source's licence and URL is in
`welfare/sources_extended.tsv`, every file's hash in `welfare/fetched_extended.tsv`.

## Open questions

Asked in the chat on 15 October 2026, recorded here with the answers when they come (RULE 5):

- Should `shrines_foundation.gpkg` (14 MB, a regenerable build output) be committed, or
  gitignored and kept only in this iCloud-backed folder? No tracked file in the repo is above 5 MB.
  **Answered 15 October 2026: gitignore it; commit everything needed to build it.** The scripts,
  the outcome CSVs and this note are tracked; `*.gpkg`, `boundaries/` and `sources/` are not.
