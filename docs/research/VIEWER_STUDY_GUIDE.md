# Shrines and Welfare viewer: study guide

*Written 30 October 2026 for Rauf. The live, editable copy is the Claude doc
https://claude.ai/artifact/LXCi6nbbyqpEnbZ1asCyus; this file is the repository's record of it (RULE 0).*

The viewer is a single HTML file that maps 169 archive sites against 243 welfare indicators and tests conjectures with spatially honest statistics; this guide shows how to learn it, what it is good for, and how to share it.

## What it is, and what it is not

It is an exploration and screening tool for ecological questions about shrines and welfare; it is not a census of shrines or a source of causal claims.

- **One file.** `pipeline/gis/viewer/index.html` (4.9 MB) holds the data and its four libraries. Double-click it; only the map tiles need the internet. Nothing is sent anywhere.
- **Data.** 169 geocoded archive sites; 243 welfare indicators in 18 themes (Census 2023, PSLM, DHS, MICS, NNS, World Bank poverty map, Meta wealth index, night lights, travel time, air quality and others); four units: H3 hexagons (~36 km², 19,197 populated), 577 tehsils, 160 districts, provinces.
- **The archive is curated.** 80 geocoded Muslim shrines, a quarter of them in Lahore. A shrine variable measures where the archive has looked as well as where shrines are.
- **Associations are ecological.** They hold among places, not among people or shrines.

## Learning path

About an hour, in this order; each step builds on the one before.

1. **Orient (5 min).** Open the file. It starts on None: outlines, the archive's sites coloured by tradition, nothing else. Click a district to see its card and the sites inside. Type a name into **Find a place**.
2. **One measure (10 min).** Pick district, then literacy from the indicator menu (or **Find an indicator**). Read the legend: seven equal-count classes, with a count of units per class. Read the definition in the side panel, including the line that says where the indicator was measured.
3. **The side panel against the archive (10 min).** Compare the plain Spearman ρ with the partial ρ holding population constant. Literacy falls from 0.23 to 0.01: most of the raw association is population. Check the scatter and the median where there is a site against where there is none.
4. **Compare two and Composite (10 min).** Compare two draws a 3×3 map of two indicators' tertiles. Composite averages percentile ranks with equal weights; note the theme counts it shows, since a theme with more indicators weighs more.
5. **Test a conjecture (15 min).** Open the drawer, press **Start from the map**, write the conjecture in words, set the expected sign, then **Record and test**. Read the result with the next section of this guide beside you.
6. **Stress it (10 min).** Press **Same test at every unit** to see if the result survives a change of scale, **Show residuals on the map** to see where the model misses, then export the Markdown, the data and the R or Stata code.

To practise without risk, use the drawer's exploratory mode (no expected sign) and **Hide these tests** afterwards; hidden tests stay in the log and in the multiple-testing count.

## Use cases

The strongest uses are screening ideas, describing places and teaching inference; a thesis claim needs the confirmatory route in the checklist below. The questions are examples of the kind to ask, not findings.

| Use | Example question | What to use | What to report |
| --- | --- | --- | --- |
| Thesis: screen hypotheses | Do districts with more pre-1857 shrines differ in literacy, net of night lights? | Side panel partial ρ; Test a conjecture; fragility table; Same test at every unit | Headline p, BH p, the fragility flags, n; that it was exploratory |
| Thesis: confirmatory test | A hypothesis written down before looking | Pre-register on OSF or AsPredicted, then run exactly that spec; exported R or Stata code | The registered spec, the headline p, the replication in R or Stata, DATA_ID |
| Archive coverage audit | Where is the archive thin relative to population or to leads? | None mode site counts; sites per million; Leads (Wikidata + OSM) | Counts per unit; that leads are unverified |
| Fieldwork planning | Which under-documented districts have many leads and low access? | Leads; travel time; Compare two; the region card | A shortlist with each district's values |
| Descriptive maps | How do poverty and schooling co-vary across tehsils? | One measure; Compare two (bivariate tertiles); Composite | The map, the class cuts, the definitions and sources |
| Teaching econometrics | Why do ordinary p-values mislead with spatial data? | Run one spec; compare HC1, Conley and placebo p; Moran's I of residuals | The gap between the p-values, and why |
| Replication by others | Can a colleague reproduce a number? | Export JSON spec (and Re-run a JSON spec); Download data; R or Stata code | The spec file, VIEWER_VERSION, DATA_ID |

## Reading a result

Judge a result by its headline p and its flags, not by the robust p alone: on spatially smooth noise the robust p called 47–78% of runs significant, the headline p 0–5%.

| Part of the result | What it is | How to read it |
| --- | --- | --- |
| Coefficient and robust p | OLS with HC1 (or classical) SEs; Poisson with sandwich SEs | Assumes units are independent; too small with spatial data |
| Conley p, 50 to 500 km | SEs allowing correlation between units up to each distance | A p that grows with distance means nearby units share the signal |
| Placebo p | Share of spatially smooth noise variables, matched to the variable's Moran's I, that fit as well: 200 draws from each of two noise families (one family at hexagons) | The guard against a smooth outcome finding any smooth variable |
| Headline p | The largest of the robust, Conley and placebo p | The one to quote; conservative, so it loses some power |
| BH p | Benjamini–Hochberg over the distinct hypotheses in the log | Rises as you test more; hidden tests still count |
| Moran's I of residuals | Cliff–Ord test (OLS) or permutation test (Poisson) | A small p means the model leaves spatial structure unexplained |
| Fragility table | Refits without Lahore, without each province, without the most influential unit | A flag means one place or province decides the answer |
| Flags | Coarse or modelled variables, high leverage, few distinct values | Each names the problem and the better guide |

Below 10 residual degrees of freedom the page prints no p-values at all. Every result also states that it is ecological, and when it uses an archive variable, that the archive is curated.

## Before you cite a result

A result is citable in the thesis only when it passes every box below; until then, call it exploratory.

- [ ] Tested on the current page: VIEWER_VERSION 2026-10-30 or later. Anything tested before 30 October 2026 is re-run.
- [ ] Confirmatory claims were pre-registered (OSF or AsPredicted) before the map was explored, and the run matches the registration.
- [ ] The headline p and the BH p are reported, not the robust p alone.
- [ ] No fragility flag fires, or the flag is reported (e.g. "without Lahore the estimate doubles").
- [ ] The result holds at a second unit (Same test at every unit), or the difference is explained.
- [ ] Coarse and modelled variables are named with their native level (e.g. GDP per capita: 32 divisions).
- [ ] The exported R or Stata code was run and reproduces the coefficient (it has never been run by the project).
- [ ] The write-up says the association is ecological and, for shrine variables, that the archive is curated.
- [ ] The record is kept: the JSON spec, the Markdown export, VIEWER_VERSION, DATA_ID and the repository commit.

## Deploying it

For professors, sending the file is enough today; for a thesis, an archived copy with a DOI is the version to cite; a page on the website is the step that needs a decision.

| Option | Who it suits | Steps | Watch out for |
| --- | --- | --- | --- |
| Open locally | You | Double-click `pipeline/gis/viewer/index.html` | The test log lives in that browser only; export it |
| Send the file | Professors, advisers | Email or share the 4.9 MB `index.html` (with this guide); they double-click it | Checked in Chromium; Safari has not been tested. Each reader's log is their own |
| Review package | An outside reviewer or ChatGPT | `python pipeline/gis/viewer/review/make_package.py` builds `welfare-viewer-review.zip` with the brief, screenshots, code and tests | Rebuild it after any change; the zip is not committed |
| Archived release with a DOI | The thesis and anyone citing it | Deposit `index.html`, this guide, `GIS_FOUNDATION.md`, the source list and the commit hash on Zenodo or OSF | Fix the version first; credit only "Adil Ahsan and Rauf Nawaz" |
| A page on the website | The public | Copy `index.html` into the site's `public/` folder (e.g. `public/research/welfare/index.html`), build, deploy | A public research page is a decision; it should be linked with its caveats |

**Licences limit how it can be shared.** The Meta wealth index (CC BY-NC 4.0) and Ookla speeds (CC BY-NC-SA 4.0) are non-commercial; OpenStreetMap-derived leads are ODbL; the boundaries come through a GPL-3 package. Academic, non-commercial sharing with attribution fits all of them. Each source's licence is in `pipeline/gis/welfare/sources.tsv` and `sources_extended.tsv`.

**Credit and citation.** Name "Adil Ahsan and Rauf Nawaz" only, with no institution or e-mail, as on the site. Cite a result as: viewer version, DATA_ID, repository commit, and the spec file.

## Keeping it current

Rebuild after the archive or any source changes, then compare and re-test before trusting the new page. On this PC the Python environment is `~/.venvs/gis312` and poppler is in `~/tools/poppler`.

1. `npm run data:build` refreshes `data/shrines.csv` from the sheet.
2. Set `PDFTOTEXT` to `C:\Users\g16\tools\poppler\poppler-26.09.0\Library\bin\pdftotext.exe` and `PY` to the venv's `Scripts/python`, then run `pipeline/gis/rebuild.sh --full` from Git Bash.
3. `python pipeline/gis/atlas/compare_atlas.py` lists every value that moved since the last commit.
4. `python pipeline/gis/atlas/check_native_support.py` confirms the native-support table still matches its sources.
5. Run `tests/test_review_fixes.cjs`, `tests/test_conjecture.cjs` and `tests/check_conjecture_reference.py` (usage at the top of each).
6. Commit, and give the new page a new VIEWER_VERSION if its statistics changed.

Full notes, including what a Windows rebuild needs, are in `docs/GIS_FOUNDATION.md`.

## Known limits

- The headline p's calibration was measured for literacy at district and tehsil, not for hexagons, Poisson models or other outcomes.
- The exported R and Stata code has never been run by the project.
- Safari and other WebKit browsers have not been tested.
- Tehsil census values exist only in the 77 districts whose tehsils match the boundary file; AJK and Gilgit-Baltistan are outside the census.
- 25 of the 80 Muslim shrines have no numeric founding year and count as not pre-1857.
- The test log cannot know what a user looked at before testing; only an outside registration can.
- Leads are unverified candidates, not sites.
