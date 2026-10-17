#!/usr/bin/env python3
"""
export_outline_svg.py — Pakistan's province outlines as a few kilobytes of SVG
path, for the website's small locator maps.

WHY. `/source/:slug` shows where in the country one book's evidence lies — the
sites that cite it, as dots. A Leaflet map for that would load tiles, a library
and a key for a picture that needs none of them; a static outline does it in
about 6 KB, works offline, and prints. Nothing else in the app had a country
outline, so this is the one place it is made.

WHAT. Reads `admin_province` (OCHA boundaries, see docs/GIS_FOUNDATION.md) out of
`pipeline/gis/shrines_foundation.gpkg`, simplifies each ring with
Douglas–Peucker, projects equirectangularly with x scaled by cos(30°) — the
country's middle latitude, so shapes are not stretched east–west — and writes
`src/data/pakistan-outline.json`: a viewBox, one path per province, and the
projection constants, so the client projects a site's lat/lng with exactly the
arithmetic used here (`src/lib/geo/outlineProjection.ts`).

The boundaries are OCHA's administrative ones as the GIS foundation already uses
them, including Azad Jammu & Kashmir and Gilgit-Baltistan, where archive sites
(Sharada Peeth among them) stand. Not a statement about any border.

No geopandas: GeoPackage geometry is a small header followed by standard WKB,
and parsing it with `struct` keeps this runnable on a bare Python.

    python3 pipeline/gis/export_outline_svg.py            # write
    python3 pipeline/gis/export_outline_svg.py --check    # exit 1 if stale
"""
import json
import math
import sqlite3
import struct
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
GPKG = ROOT / "pipeline" / "gis" / "shrines_foundation.gpkg"
OUT = ROOT / "src" / "data" / "pakistan-outline.json"

# Degrees. 0.04° is ~4 km — invisible at the 300px these maps draw at, and it
# takes the province rings from tens of thousands of vertices to a few hundred.
TOLERANCE = 0.04
# Rings smaller than this (square degrees) are islets and slivers that would
# draw as a single pixel; dropped.
MIN_RING_AREA = 0.02
REF_LAT = 30.0
SCALE = 10.0  # SVG units per projected degree, so coordinates fit 1 decimal.


def gpkg_wkb(blob: bytes) -> bytes:
    """Strip the GeoPackage binary header, returning the WKB inside."""
    if blob[:2] != b"GP":
        raise ValueError("not a GeoPackage geometry blob")
    flags = blob[3]
    envelope = (flags >> 1) & 0b111
    env_len = {0: 0, 1: 32, 2: 48, 3: 48, 4: 64}[envelope]
    return blob[8 + env_len :]


def parse_wkb(wkb: bytes):
    """Polygons of a (Multi)Polygon WKB, as lists of rings of (lng, lat)."""
    pos = 0

    def read(fmt, order):
        nonlocal pos
        size = struct.calcsize(fmt)
        value = struct.unpack(order + fmt, wkb[pos : pos + size])
        pos += size
        return value

    def geometry():
        nonlocal pos
        order = "<" if wkb[pos] == 1 else ">"
        pos += 1
        (kind,) = read("I", order)
        kind %= 1000
        if kind == 3:
            (nrings,) = read("I", order)
            rings = []
            for _ in range(nrings):
                (npts,) = read("I", order)
                pts = [read("dd", order) for _ in range(npts)]
                rings.append(pts)
            return [rings]
        if kind == 6:
            (npolys,) = read("I", order)
            polys = []
            for _ in range(npolys):
                polys.extend(geometry())
            return polys
        raise ValueError(f"unexpected WKB type {kind}")

    return geometry()


def simplify(points, tol):
    """Douglas–Peucker, iterative so a long ring cannot hit the recursion limit."""
    if len(points) < 4:
        return points
    keep = [False] * len(points)
    keep[0] = keep[-1] = True
    stack = [(0, len(points) - 1)]
    while stack:
        a, b = stack.pop()
        (ax, ay), (bx, by) = points[a], points[b]
        dx, dy = bx - ax, by - ay
        norm = math.hypot(dx, dy) or 1e-12
        worst, idx = 0.0, None
        for i in range(a + 1, b):
            px, py = points[i]
            d = abs(dy * px - dx * py + bx * ay - by * ax) / norm
            if d > worst:
                worst, idx = d, i
        if idx is not None and worst > tol:
            keep[idx] = True
            stack.append((a, idx))
            stack.append((idx, b))
    return [p for p, k in zip(points, keep) if k]


def ring_area(points):
    return abs(
        sum(x1 * y2 - x2 * y1 for (x1, y1), (x2, y2) in zip(points, points[1:] + points[:1]))
    ) / 2


def build():
    kx = math.cos(math.radians(REF_LAT))
    con = sqlite3.connect(GPKG)
    rows = con.execute(
        "select province_name, province_code, geom from admin_province order by province_code"
    ).fetchall()
    provinces = []
    all_pts = []
    for name, code, blob in rows:
        rings_out = []
        for poly in parse_wkb(gpkg_wkb(blob)):
            for ring in poly[:1]:  # outer ring only; holes are invisible at this size
                if ring_area(ring) < MIN_RING_AREA:
                    continue
                # A closed ring starts and ends on one point, which gives
                # Douglas–Peucker a zero-length baseline and it keeps nothing.
                # Split at the vertex farthest from the start and simplify the
                # two halves.
                x0, y0 = ring[0]
                far = max(range(len(ring)), key=lambda i: (ring[i][0] - x0) ** 2 + (ring[i][1] - y0) ** 2)
                simple = simplify(ring[: far + 1], TOLERANCE)[:-1] + simplify(ring[far:], TOLERANCE)
                if len(simple) < 4:
                    continue
                rings_out.append(simple)
                all_pts.extend(simple)
        provinces.append((name, code, rings_out))

    min_x = min(lng for lng, _ in all_pts) * kx
    max_x = max(lng for lng, _ in all_pts) * kx
    min_lat = min(lat for _, lat in all_pts)
    max_lat = max(lat for _, lat in all_pts)

    def project(lng, lat):
        return (round((lng * kx - min_x) * SCALE, 1), round((max_lat - lat) * SCALE, 1))

    out_provinces = []
    for name, code, rings in provinces:
        parts = []
        for ring in rings:
            pts = [project(lng, lat) for lng, lat in ring]
            parts.append("M" + "L".join(f"{x:g} {y:g}" for x, y in pts) + "Z")
        out_provinces.append({"name": name, "code": code, "d": "".join(parts)})

    width = round((max_x - min_x) * SCALE, 1)
    height = round((max_lat - min_lat) * SCALE, 1)
    return {
        "_readme": "Generated by pipeline/gis/export_outline_svg.py from OCHA admin_province "
        "boundaries in the GIS foundation. Do not edit by hand. Project a site with "
        "src/lib/geo/outlineProjection.ts.",
        "viewBox": [0, 0, width, height],
        "projection": {
            "refLat": REF_LAT,
            "scale": SCALE,
            "minX": round(min_x, 6),
            "maxLat": round(max_lat, 6),
        },
        "provinces": out_provinces,
    }


def main():
    doc = build()
    text = json.dumps(doc, ensure_ascii=False, separators=(",", ":")) + "\n"
    if "--check" in sys.argv:
        current = OUT.read_text(encoding="utf-8") if OUT.exists() else ""
        if current != text:
            print("pakistan-outline.json is stale — rerun export_outline_svg.py", file=sys.stderr)
            sys.exit(1)
        print("pakistan-outline.json up to date")
        return
    OUT.write_text(text, encoding="utf-8")
    print(
        f"wrote {OUT.relative_to(ROOT)}: {len(doc['provinces'])} provinces, "
        f"{len(text):,} bytes, viewBox {doc['viewBox']}"
    )


if __name__ == "__main__":
    main()
