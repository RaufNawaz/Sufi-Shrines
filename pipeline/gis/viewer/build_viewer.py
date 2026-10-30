"""
Build pipeline/gis/viewer/index.html: one self-contained page for looking at welfare across
Pakistan with the archive's sites (and the open-source leads) laid over it.

Reads the atlas layers of shrines_foundation.gpkg (atlas/build_atlas.py, run last of the layer
builders), atlas/indicator_catalog.tsv for the menu, and shrine_sources/merged_leads.json for the leads.
Without the GeoPackage, rebuild_from_embedded.py puts a changed template (or new leads) into the page
using the data already embedded in it. Writes one HTML file with the data
embedded, so it opens from disk with a double-click (map tiles and Leaflet/h3-js load from CDNs).

Only public columns go in: no qa_note, needs_review or flags (see docs/GIS_FOUNDATION.md).

Usage (from the repo root):
  python pipeline/gis/viewer/build_viewer.py
"""
import base64, gzip, json, re, sys
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
GPKG = GIS / "shrines_foundation.gpkg"
LEADS = GIS / "shrine_sources/merged_leads.json"
sys.path.insert(0, str(HERE))
from rebuild_from_embedded import load_leads  # noqa: E402  (stdlib only; shared schema check)
SITE = "https://raufnawaz.github.io/Sufi-Shrines/shrine/"

# The menu comes from atlas/indicator_catalog.tsv (label, theme, direction, year), in file order, so the
# viewer and the atlas codebook cannot disagree about what an indicator is called or which way is good.
CATALOG = pd.read_csv(GIS / "atlas/indicator_catalog.tsv", sep="\t", dtype=str).fillna("")
IND = {r.key: (r.label, r.theme, {"1": True, "0": False}.get(r.higher_is_better), r.year)
       for r in CATALOG.itertuples()}
SHRINE_Y = ["n_site", "n_mus", "n_mus_pre1857", "sites_per_million", "sites_per_1000km2"]
CHECK_FILES = ["welfare/checks.csv", "welfare/checks_extended.csv", "welfare/checks_air.csv", "welfare/checks_health.csv", "welfare/checks_dhs_regions.csv",
               "welfare/checks_roads.csv", "outcomes/census_extended_checks.csv",
               "outcomes/pslm_checks.csv", "outcomes/pslm15_checks.csv", "outcomes/nns_checks.csv", "outcomes/mics_checks.csv",
               "outcomes/wb_poverty_checks.csv", "outcomes/undp_hdi_checks.csv",
               "outcomes/mpi_checks.csv",
               "atlas/checks.csv", "shrine_sources/checks.csv"]
SEQ_RE = re.compile(r"^(n_|pop|sites_)")


def clean(v):
    if v is None or (isinstance(v, float) and not np.isfinite(v)):
        return None
    if isinstance(v, (np.integer,)):
        return int(v)
    if isinstance(v, (np.floating, float)):
        # Three significant figures: a septile choropleth and a rank correlation cannot use more, and it
        # halves the hexagon payload. The atlas layers and CSVs keep full precision.
        v = float(v)
        if v == 0:
            return 0
        r = round(v, max(0, 2 - int(np.floor(np.log10(abs(v))))))
        return int(r) if r == int(r) and abs(r) >= 100 else r
    return v


def feature_collection(gdf, id_col, name_col, cols, tol):
    g = gdf.copy()
    g["geometry"] = g.geometry.simplify(tol, preserve_topology=True)
    feats = []
    for _, r in g.iterrows():
        props = {"id": r[id_col], "name": r[name_col]}
        props.update({c: clean(r[c]) for c in cols if c in g.columns})
        feats.append({"type": "Feature", "properties": props,
                      "geometry": json.loads(gpd.GeoSeries([r.geometry]).to_json())["features"][0]["geometry"]})
    return {"type": "FeatureCollection", "features": feats}


def denan(obj):
    if isinstance(obj, float) and not np.isfinite(obj):
        return None
    if isinstance(obj, list):
        return [denan(x) for x in obj]
    if isinstance(obj, dict):
        return {k: denan(v) for k, v in obj.items()}
    return obj


def round_coords(obj, nd=4):
    if isinstance(obj, list):
        return [round_coords(x, nd) for x in obj]
    if isinstance(obj, float):
        return round(obj, nd)
    if isinstance(obj, dict):
        return {k: round_coords(v, nd) for k, v in obj.items()}
    return obj


def slugify(t):
    """Port of src/lib/data/slugify.ts; checked against dist/shrine/ (169 of 169) on 16 Oct 2026."""
    t = str(t).lower()
    t = re.sub(r"[&@%+]", lambda m: " " + {"&": "and", "@": "at", "%": "percent", "+": "plus"}[m.group()] + " ", t)
    t = re.sub(r"[^\w\s-]", "", t, flags=re.ASCII)
    t = re.sub(r"[\s_]+", "-", t)
    return re.sub(r"-+", "-", t).strip("-").strip()


def main():
    L = lambda n, **k: gpd.read_file(GPKG, layer=n, **k)
    d, t, wp = L("atlas_district"), L("atlas_tehsil"), L("atlas_province")
    wp = wp[wp.geometry.notna()]

    cols = list(IND) + SHRINE_Y
    data = {
        "district": round_coords(feature_collection(d, "district_code", "district_name", cols, 0.01)),
        "tehsil": round_coords(feature_collection(t, "tehsil_code", "tehsil_name", cols, 0.006)),
        "province": round_coords(feature_collection(wp, "province_code", "province_name", cols, 0.02)),
    }
    grid = L("atlas_grid_h3_r6", ignore_geometry=True)
    grid = grid[grid.pop_kontur_2023.fillna(0) > 0]       # unpopulated hexagons carry no welfare value
    hex_cols = list(dict.fromkeys([k for k in IND if k in grid.columns and grid[k].notna().any()] + ["n_site", "n_mus"]))
    data["hex"] = {"cols": hex_cols, "rows": [[r.h3_id] + [clean(getattr(r, c)) for c in hex_cols]
                                              for r in grid.itertuples()]}

    sites = L("sites", ignore_geometry=True)
    data["sites"] = [{"name": r.name, "cat": r.category, "lat": round(r.lat, 5), "lon": round(r.lon, 5),
                      "support": r.support_level, "status": r.status, "shared_pin": int(r.shared_pin),
                      "url": SITE + slugify(r.name)} for r in sites.itertuples()]
    # Leads: one object per place, Wikidata and OSM merged (Wikidata first, GeoNames dropped), validated
    # against the schema by the same function rebuild_from_embedded.py --leads uses, so the two builds
    # cannot disagree about the shape the page reads.
    data["leads"] = load_leads(LEADS)

    cb = pd.read_csv(GIS / "atlas/atlas_codebook.csv")
    defs = {r.indicator: f"{r.definition} — {r.publisher}" for r in cb.itertuples()}
    data["indicators"] = [{"key": k, "label": v[0] + (f" ({v[3]})" if v[3] and v[3] not in v[0] else ""), "group": v[1],
                           "good": v[2], "def": defs.get(k, ""),
                           "units": [u for u, gj in [("hex", None), ("tehsil", "tehsil"), ("district", "district"),
                                                     ("province", "province")]
                                     if (u == "hex" and k in hex_cols) or
                                     (gj and any(f["properties"].get(k) is not None for f in data[gj]["features"]))]}
                          for k, v in IND.items()]
    missing = [i["key"] for i in data["indicators"] if not i["units"] or not i["def"]]
    if missing:
        sys.exit(f"catalog indicators with no data or no definition: {missing}")
    checks = pd.concat([pd.read_csv(GIS / f) for f in CHECK_FILES])
    data["checks"] = [{"check": r.check, "result": r.result, "measured": str(r.measured), "reference": str(r.reference)}
                      for r in checks.itertuples()]
    cov = pd.read_csv(GIS / "shrine_sources/archive_coverage_by_source.csv")
    data["coverage"] = cov.replace({np.nan: None}).to_dict("records")

    for k in ("district", "tehsil", "province"):
        n = sum(f["properties"].get("n_site") or 0 for f in data[k]["features"])
        if k != "tehsil" and k != "province" and n != len(data["sites"]):
            sys.exit(f"site count mismatch: {k} sums to {n}, sites layer has {len(data['sites'])}")

    # Prettier formats the template (npm run verify checks it) and turns "/*__DATA__*/null" into
    # "/*__DATA__*/ null"; a plain replace then matched nothing and wrote an empty page. Match any
    # spacing, and refuse to write unless exactly one placeholder was filled.
    tpl = (HERE / "template.html").read_text(encoding="utf-8")
    # JSON.parse rejects NaN, which a JS literal accepted: every NaN becomes null, and allow_nan=False
    # makes a missed one fail here rather than leave a blank page.
    raw = json.dumps(denan(data), separators=(",", ":"), allow_nan=False).encode()
    payload = json.dumps(base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode())   # a JS string literal
    html, n = re.subn(r"/\*__DATA__\*/\s*null", lambda m: payload, tpl)
    if n != 1:
        sys.exit(f"template.html: expected one /*__DATA__*/ null placeholder, found {n}")
    (HERE / "index.html").write_text(html, encoding="utf-8", newline="")
    print(f"index.html {len(html) / 1e6:.1f} MB ({len(raw) / 1e6:.1f} MB of JSON, gzipped): {len(data['district']['features'])} districts, "
          f"{len(data['tehsil']['features'])} tehsils, {len(data['hex']['rows'])} hexagons, "
          f"{len(data['sites'])} sites, {len(data['leads'])} leads")


if __name__ == "__main__":
    main()
