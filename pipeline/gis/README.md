# Spatial foundation for the shrines project

> **In this repository:** see `docs/GIS_FOUNDATION.md` for what was measured on import (15 Oct
> 2026), the caveats that come from the archive's own audits (coordinate precision, unknown
> founding years, team-only columns in `sites`), and the rebuild order.

This folder builds one GeoPackage, `shrines_foundation.gpkg`, that every later map or dataset is layered onto. It opens directly in QGIS, ArcGIS Pro and ArcGIS Online, and reads into Python (geopandas) or R (sf).

The sites come from the same Google Sheet that the website reads, so rebuild after any change to the archive (export the sheet to `data/shrines.csv` first):

```
git clone --depth 1 https://github.com/abdullahumer1101/pkmapr.git
cp -r pkmapr/inst/extdata pipeline/gis/boundaries
pip install geopandas h3 scipy rasterstats rasterio
python pipeline/gis/build_foundation.py --shrines data/shrines.csv \
    --boundaries pipeline/gis/boundaries --out pipeline/gis/shrines_foundation.gpkg
```

## Design principles and where they come from

**Keys are the backbone, not geometry.** SHRUG (Asher, Lunt, Matsuura and Novosad 2019) made India's village data usable by giving every location a consistent identifier, so that any new dataset can be linked to everything else at high resolution. Here every unit carries OCHA COD-AB P-codes for province, district and tehsil, plus H3 cell ids. A new dataset only needs to be matched to one of these keys once.

**A fixed grid is the neutral unit of analysis.** PRIO-GRID (Tollefsen, Strand and Buhaug 2012) argues that grid cells are fixed in time and space and do not depend on political boundaries, and that a grid can be scaled up or down consistently. This matters in Pakistan, where districts keep being split. The grid uses H3 hexagons at resolution 6 (about 36 km² each), which nest inside resolution 5 cells (about 250 km²). Hexagons have equidistant neighbours, unlike squares.

**Test across scales.** Results can change with the size of the unit (the modifiable areal unit problem), including on H3 grids. Every finding should be checked at H3 resolution 6, resolution 5, tehsil and district.

**Distances in metres, in an equal area projection.** All distances and areas use a Lambert azimuthal equal area projection centred on Pakistan. Layers are stored in EPSG:4326 for portability.

**Respect survey displacement.** DHS cluster coordinates are randomly moved up to 2 km in urban areas, 5 km in rural areas, and 10 km for 1 percent of rural clusters. DHS recommends distance categories wide enough to absorb this rather than exact distances, so the toolkit provides distance bands (under 5, 5 to 10, 10 to 25, 25 to 50, 50 to 100, over 100 km) and counts of shrines within 5, 10 and 25 km.

**Build in spatial inference from the start.** Kelly (2019) and Conley and Kelly (2025) show that many historical persistence results cannot be distinguished from spatial noise once spatial autocorrelation is handled properly. Their remedy is a placebo with spatial noise, a low dimensional spatial basis in the regression, and large cluster standard errors. Every unit here stores projected centroid coordinates (`x_m`, `y_m` or `cx_m`, `cy_m`) so these checks can always be run, and `layering.morans_i` gives the first warning light.

**Keep exposure sources separate.** The archive is curated, not a census: 80 geocoded Muslim shrines, a quarter of them in Lahore, and all field verified sites in Lahore. Each site carries `exposure_source` and `support_level`. When the Auqaf notified shrine lists, OpenStreetMap or colonial gazetteer records are added, they should enter as separate sources with the same fields, so exposure can be built from each and compared. Mehmood and Seror (2023) built their exposure from British colonial archives, which is the natural historical source to add.

**Versioned and reproducible.** The `manifest` layer records the build time, a hash of the shrine CSV, boundary source, projection and H3 settings.

## Layers

| Layer                  | One row per                                                                                                                                               | Key fields                                                                                                                                                                                                       |
| ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `sites`                | geocoded site on spiritualsitespakistan.com (169 of 171), carrying every archive column: description, events, images, saint, silsila, dates, review flags | `site_id`, admin codes, `h3_id`, `h3_parent`, `h3_child`, `x_m`, `y_m`, `is_muslim_shrine`, `built_pre1857`, `support_level`, `shared_pin`, `exposure_source`                                                    |
| `grid_h3_r6`           | hexagon (22,982)                                                                                                                                          | `h3_id`, `h3_parent`, admin codes, `area_km2`, `cx_m`, `cy_m`, counts `n_site`, `n_mus`, `n_mus_pre1857`, distances `dist_km_site`, `dist_km_mus`, `dist_km_mus_pre1857`, `dist_band_mus`, `nearest_mus_site_id` |
| `admin_tehsil`         | tehsil (577)                                                                                                                                              | `tehsil_code`, counts, `n_field_verified`, `mus_per_1000km2`, centroid                                                                                                                                           |
| `admin_district`       | district (160)                                                                                                                                            | `district_code`, same fields                                                                                                                                                                                     |
| `admin_province`       | province or territory                                                                                                                                     | `province_code`, same fields                                                                                                                                                                                     |
| `sites_no_coordinates` | website site with no recorded coordinates (2, both Lahore)                                                                                                | all archive columns, no geometry                                                                                                                                                                                 |
| `outcomes_district`    | district in the four provinces and Islamabad (135)                                                                                                        | about 45 Census 2023 indicators plus shrine counts; complete coverage                                                                                                                                            |
| `outcomes_tehsil`      | tehsil (299)                                                                                                                                              | same indicators, only in the 77 districts whose census tehsils match the boundary tehsils one to one                                                                                                             |
| `outcomes_codebook`    | indicator                                                                                                                                                 | definition and census table of every indicator                                                                                                                                                                   |
| `census_crosswalk`     | census unit (591)                                                                                                                                         | how each census tehsil matched a boundary tehsil (`exact`, `fuzzy_in_district`, `exact_other_district`, `unmatched`)                                                                                             |
| `keys_crosswalk`       | hexagon                                                                                                                                                   | `h3_id` to tehsil, district, province codes and names                                                                                                                                                            |
| `manifest`             | build setting                                                                                                                                             | provenance                                                                                                                                                                                                       |

`shared_pin` marks sites placed on a landmark coordinate shared with another site. `admin_assigned_by_nearest` marks border or coastal units matched to the nearest tehsil. Six very small urban tehsils contain no hexagon centre, so they appear in `admin_tehsil` but not in `keys_crosswalk`; use point or polygon joins for those.

## Welfare outcomes: Census 2023

Built by `outcomes/build_census_outcomes.py` from the Pakistan Bureau of Statistics Census 2023 tables, as packaged in PakPC2023 0.2.0. Indicators cover population and growth, urban share, household size, literacy (overall, female, rural, gender gap), out of school children, never attended school, electricity, solar, cooking fuel, improved and piped water, flush toilets, open defecation, home ownership, crowding, disability, religious composition and mother tongue. Rural versions are given for literacy, electricity, water and toilets, since shrine effects are most plausible in rural areas.

Everything is summed as counts and converted to rates last, so split tehsils add back correctly. Checks against published totals: population 241.2 million; population weighted literacy 59.9 percent against the official 60.7; urban share 40 percent against the official 38.8.

Coverage rules. The census has 591 units, many created after the boundary file was drawn (new tehsils in Lahore, Peshawar and much of Balochistan; Karachi sub divisions that are not the boundary file's towns). Tehsil values are therefore published only for districts where at least 99.5 percent of census population matched a boundary tehsil, so no tehsil value is a partial count. Use `outcomes_district` for national comparisons and `outcomes_tehsil` for finer variation inside the matched districts. AJK and Gilgit Baltistan are outside the PBS census.

The out of school measure is an approximation: the census reports no population aged 5 to 16, so it is out of school children divided by out of school children plus primary, middle and matric enrolment.

```
git clone --depth 1 https://github.com/myaseen208/PakPC2023.git
cd pipeline/gis/outcomes
python build_census_outcomes.py --census PakPC2023/data --gpkg ../shrines_foundation.gpkg
```

## Adding a new layer

```python
import layering as L
G = "shrines_foundation.gpkg"

clusters = L.attach_points(dhs_df, G, lat="LATNUM", lon="LONGNUM")   # keys and exposure
lights = L.raster_to_grid("viirs_2022.tif", G, prefix="ntl")           # zonal mean per hexagon
by_district = L.aggregate(lights, ["ntl_mean"], to="district_code", gpkg=G)
L.morans_i(residuals, clusters.x_m, clusters.y_m)                      # check before trusting t stats
```

Candidate layers, in rough order of value: Auqaf notified shrine lists, PBS Mauza Statistics, PDHS 2017/18 clusters, VIIRS nightlights, WorldPop population, Census 2023 tehsil tables, ECP polling stations, Punjab police station boundaries, colonial gazetteer shrine records.

## Sources

Asher, S., Lunt, T., Matsuura, R. and Novosad, P. (2019). The Socioeconomic High resolution Rural Urban Geographic Dataset on India (SHRUG). IGC Working Paper.

Tollefsen, A. F., Strand, H. and Buhaug, H. (2012). PRIO-GRID: A unified spatial data structure. Journal of Peace Research 49(2).

Kelly, M. (2019). The standard errors of persistence. CEPR Discussion Paper 13783.

Conley, T. G. and Kelly, M. (2025). The standard errors of persistence. Journal of International Economics.

Mehmood, S. and Seror, A. (2023). Religious leaders and rule of law. Journal of Development Economics 160.

DHS Program, GPS displacement guidance and covariate extraction documentation.

Umer, A. (2026). pkmapr: Pakistan Spatial Data Toolkit, version 1.4.0, from OCHA COD-AB Pakistan boundaries (GPL-3).
