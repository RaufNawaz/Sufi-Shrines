#!/usr/bin/env bash
# Rebuild the GIS foundation, every welfare layer, the atlas and the viewer, in dependency order.
# Stops at the first builder that exits non-zero (each one's hard checks), naming it.
#
# Usage, from the repo root:
#   pipeline/gis/rebuild.sh            # from the welfare layers on (the foundation and census as they are)
#   pipeline/gis/rebuild.sh --full     # also rebuild the foundation and census outcomes first; this
#                                      # deletes and rewrites the GeoPackage, so everything after must run
#
# Needs: ~/.venvs/gis312 (Python 3.12 with geopandas h3 rasterio scipy pyarrow pdfplumber openpyxl
# pyreadr netCDF4), pdftotext (poppler), tar, and for --full the boundaries in pipeline/gis/boundaries
# and data/shrines.csv. See docs/GIS_FOUNDATION.md.
set -euo pipefail
PY="${PY:-$HOME/.venvs/gis312/bin/python}"
G=pipeline/gis
CENSUS="$G/sources/census_pakpc2023/PakPC2023/data"

step() { echo; echo "== $*"; "$@" || { echo "FAILED: $*" >&2; exit 1; }; }

if [[ "${1:-}" == "--full" ]]; then
  step "$PY" "$G/build_foundation.py" --shrines data/shrines.csv --boundaries "$G/boundaries" --out "$G/shrines_foundation.gpkg"
  step "$PY" "$G/outcomes/build_census_outcomes.py" --census "$CENSUS" --gpkg "$G/shrines_foundation.gpkg"
  step "$PY" "$G/welfare/fetch_sources.py"
  step "$PY" "$G/welfare/build_welfare_layers.py"
  step "$G/shrine_sources/fetch_shrine_sources.sh"
  step "$PY" "$G/shrine_sources/build_external_sites.py"
fi

step "$PY" "$G/welfare/fetch_extended_sources.py"
step "$PY" "$G/outcomes/build_census_extended.py" --census "$CENSUS"   # reads welfare_province.csv (wave one)
step "$PY" "$G/welfare/build_extended_layers.py"                      # ~10 min
step "$PY" "$G/welfare/build_air_quality.py"
step "$PY" "$G/welfare/build_health_facilities.py"
step "$PY" "$G/welfare/build_roads.py"
step "$PY" "$G/outcomes/build_pslm_district.py"                       # reads welfare_ext_district.csv
step "$PY" "$G/outcomes/build_mpi_district.py"                        # reads outcomes_pslm_district.csv
step "$PY" "$G/outcomes/build_pslm_2015.py"                           # reads outcomes_pslm_district.csv
step "$PY" "$G/outcomes/build_nns_district.py"                        # reads wave two, census ext, PSLM
step "$PY" "$G/outcomes/build_mics_district.py"                       # reads NNS and census ext
step "$PY" "$G/outcomes/build_wb_poverty_district.py"                 # reads the district MPI
step "$PY" "$G/outcomes/build_undp_hdi_district.py"                   # reads the district MPI
step "$PY" "$G/welfare/build_dhs_regions.py"                          # reads the NNS
step "$PY" "$G/atlas/build_atlas.py"                                  # last layer builder; holds the note's counts
step "$PY" "$G/viewer/build_viewer.py"
echo; echo "rebuilt: atlas and viewer current"
