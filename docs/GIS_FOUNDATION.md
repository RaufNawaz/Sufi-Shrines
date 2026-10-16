# GIS foundation — orientation

*Written 15 October 2026, when the foundation was imported. Every number below was measured on
that day against `pipeline/gis/shrines_foundation.gpkg` with `sqlite3` (a GeoPackage is a SQLite
file), not copied from the README. Re-measure rather than quote.*

## What it is

A research layer, separate from the website. It takes the archive's sites and places them on a
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

## Licences

Boundaries come from OCHA COD-AB through `pkmapr` 1.4.0, which is GPL-3. Census figures are
Pakistan Bureau of Statistics tables through `PakPC2023` 0.2.0. Both are recorded in the
manifest and codebook. Check the GPL-3 terms before publishing the GeoPackage with the data
release (`docs/DATA_RELEASE.md`).

## Open questions

Asked in the chat on 15 October 2026, recorded here with the answers when they come (RULE 5):

- Should `shrines_foundation.gpkg` (14 MB, a regenerable build output) be committed, or
  gitignored and kept only in this iCloud-backed folder? No tracked file in the repo is above 5 MB.
  **Answered 15 October 2026: gitignore it; commit everything needed to build it.** The scripts,
  the outcome CSVs and this note are tracked; `*.gpkg`, `boundaries/` and `sources/` are not.
