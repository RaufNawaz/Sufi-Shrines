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

**`pyreadr` does not build on this Mac's system Python 3.9** (16 Oct 2026), so the census step
cannot be re-run here yet; everything else installs (`geopandas h3 scipy rasterstats rasterio
openpyxl pdfplumber`). Use a newer Python for the census step.

### Full run order

```bash
PY=~/.venvs/gis/bin/python
$PY pipeline/gis/build_foundation.py ...            # as above
$PY pipeline/gis/outcomes/build_census_outcomes.py ...
$PY pipeline/gis/welfare/fetch_sources.py           # ~200 MB into pipeline/gis/sources/, hashed
$PY pipeline/gis/welfare/build_welfare_layers.py    # exits non-zero if any hard check fails
pipeline/gis/shrine_sources/fetch_shrine_sources.sh # OSM, Wikidata, GeoNames; non-zero if any failed
$PY pipeline/gis/shrine_sources/build_external_sites.py
$PY pipeline/gis/viewer/build_viewer.py             # writes viewer/index.html
```

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

## Open questions

Asked in the chat on 15 October 2026, recorded here with the answers when they come (RULE 5):

- Should `shrines_foundation.gpkg` (14 MB, a regenerable build output) be committed, or
  gitignored and kept only in this iCloud-backed folder? No tracked file in the repo is above 5 MB.
  **Answered 15 October 2026: gitignore it; commit everything needed to build it.** The scripts,
  the outcome CSVs and this note are tracked; `*.gpkg`, `boundaries/` and `sources/` are not.
