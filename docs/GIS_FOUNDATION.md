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
for map tiles and two libraries). Choose a unit (hexagon, tehsil, district, province) and any
indicator; the archive's 169 sites sit on top, coloured by tradition, each linking to its page on
the live site; OSM, Wikidata and GeoNames leads can be switched on. The side panel lines the
indicator up against the archive (sites per million people, counts, density) with a Spearman ρ, a
scatter, and the median of the indicator where the archive has a site against where it has none.
It also shows each indicator's definition and source, each open source's measured offset, and
every verification check.

Checked in Chromium on 16 Oct 2026: every unit draws, all four lead toggles work, no console
errors, no sideways scroll at 390 px. The file is 3.1 MB and committed, so it opens from any
clone; rebuild it after any layer changes. It carries no team-only column.

**Since 17 Oct 2026 it reads the atlas** (below): 243 indicators in 18 themes, the menu and labels
from `atlas/indicator_catalog.tsv`. The data is embedded gzipped and base64-encoded and inflated
in the page by `pako` (a third CDN script), so 7.1 MB of JSON ships as a 2.4 MB file. Two things
that would each cost an hour: **`JSON.parse` rejects `NaN`**, which the old JS-literal embedding
accepted, so the builder turns every NaN into null and dumps with `allow_nan=False`; and **do not
move the page script into a `type="text/plain"` block** to run it later — Prettier formats that as
prose and re-wraps the code. A search field above the menu filters it by label, theme or definition (Enter takes the first
match). Zero-inflated indicators (flood exposure, conflict deaths) get a
"zero" class of their own, or their septiles collapse to three faint classes. Re-checked in
Chromium on 17 Oct 2026: all 243 indicators at all 467 indicator-unit pairs draw with data, no
console errors, no sideways scroll at 390 px.

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
