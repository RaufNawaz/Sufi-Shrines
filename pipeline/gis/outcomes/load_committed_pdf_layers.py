"""
Load the four PDF-parsed district layers into the GeoPackage from their committed CSVs, for a machine
without poppler's pdftotext (see pdftext.py: the parsers need poppler's layout, and Git for Windows
ships xpdf's).

build_nns_district.py, build_mics_district.py, build_wb_poverty_district.py and
build_undp_hdi_district.py each write one layer, admin_district's code, name, province and geometry
inner-joined to the parsed table, and the same table without geometry as outcomes_<x>_district.csv.
This rebuilds exactly that layer from the CSV. It refuses unless every PDF the builder parses is on
disk with the SHA-256 recorded in welfare/fetched_extended.tsv, so the committed table is the poppler
parse of these very bytes. It does not re-run any check; the committed *_checks.csv stand.

Run it where rebuild.sh would run those four builders, then go on with build_dhs_regions.py.
  python pipeline/gis/outcomes/load_committed_pdf_layers.py
"""
import csv, hashlib, sys
from pathlib import Path

import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
SRC = GIS / "sources"
LAYERS = {
    "nns": ["nns_vol2"],
    "mics": ["mics_punjab_vol3", "mics_punjab_vol2", "mics_sindh"],
    "wb_poverty": ["wb_poverty_map"],
    "undp_hdi": ["undp_hdi"],
}


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def main():
    with open(GIS / "welfare/fetched_extended.tsv", encoding="utf-8", newline="") as f:
        rec = {r["key"]: r for r in csv.DictReader(f, delimiter="\t")}
    bad = []
    for keys in LAYERS.values():
        for k in keys:
            p = SRC / rec[k]["file"].replace("\\", "/")
            if not p.exists():
                bad.append(f"{k}: {p} missing")
            elif sha256(p) != rec[k]["sha256"]:
                bad.append(f"{k}: {p.name} differs from the recorded sha256; re-parse it with poppler instead")
    if bad:
        sys.exit("refusing:\n  " + "\n  ".join(bad))
    dist = gpd.read_file(GPKG, layer="admin_district")[["district_code", "geometry"]]
    for name in LAYERS:
        t = pd.read_csv(HERE / f"outcomes_{name}_district.csv")
        g = gpd.GeoDataFrame(dist.merge(t, on="district_code", how="inner"), geometry="geometry", crs=dist.crs)
        if len(g) != len(t):
            sys.exit(f"outcomes_{name}_district.csv: {len(t) - len(g)} district codes not in admin_district")
        g = g[[c for c in t.columns] + ["geometry"]]
        g.to_file(GPKG, layer=f"outcomes_{name}_district", driver="GPKG")
        print(f"outcomes_{name}_district: {len(g)} districts, {len(t.columns) - 3} columns, from the committed CSV")


if __name__ == "__main__":
    main()
