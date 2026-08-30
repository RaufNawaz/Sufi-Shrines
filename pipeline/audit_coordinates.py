#!/usr/bin/env python3
"""Coordinates that are present, plausible, and still not a location.

WHY THIS EXISTS. Asked on 30 August 2026 which entries lack coordinates, every
instrument said none: all 169 rows carry a latitude and a longitude, all inside
Pakistan, nothing empty, nothing zero. That answer is true and useless. What the
archive actually holds is 22 rows whose coordinate is a PLACEHOLDER — a value
that passes every emptiness check and does not point at the site:

  * 12 rows carry 1-2 decimal places. Two decimals is about 1.1 km at this
    latitude, which in a dense quarter of Lahore is several hundred buildings.
  * 10 rows share a coordinate with another row. Some of that is honest — four
    saints buried in Miani Sahib Graveyard share the graveyard's point, and the
    graveyard is a real place — but a shared point cannot distinguish two graves,
    and one pair turned out not to be a shared container at all.

THE ONE THAT IS SIMPLY WRONG. Data Darbar and Darbar Malik Ahmad Ayaz sit on the
same point, 31.57803,74.307, while Ayaz's own Location cell reads "Shah Alam
Market". They are not in the same place and the archive says so in another column.

Precision is not accuracy and this script measures only precision. Six decimals
of a guess is still a guess. What it can do is refuse to let the placeholder
count grow: a coordinate typed to two decimals is one nobody has surveyed, and
the archive should not acquire more of them silently. Run with --json for the
list, or plain to fail non-zero when the count rises above the baseline.

Sources for a real fix are recorded beside this in
data/coordinate-review-2026-08-30.csv — OSM and Wikidata answered for 6 of the
22 and could not answer for 16, which is the honest state of it.
"""
from __future__ import annotations
import argparse, collections, json, math, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SNAPSHOT = ROOT / "src" / "data" / "shrines-fallback.json"

# Pakistan, generously. A coordinate outside this is not a rounding problem.
LAT_RANGE = (23.5, 37.2)
LON_RANGE = (60.8, 77.9)

# Two decimals ~ 1.1 km of latitude. Anything at or below is a locality, not a site.
COARSE_DP = 2

# Measured 30 August 2026. Raise ONLY with a note saying which entry and why —
# a placeholder coordinate is a survey that has not happened, and the number
# going up means the archive gained one without anyone deciding to.
BASELINE = {"coarse": 12, "shared": 10}


def decimals(value: str) -> int:
    text = str(value).strip()
    return len(text.split(".")[1]) if "." in text else 0


def as_float(value):
    try:
        return float(str(value).strip())
    except (TypeError, ValueError):
        return None


def haversine(lat1, lon1, lat2, lon2) -> float:
    radius, rad = 6371000.0, math.radians
    step = (
        math.sin(rad(lat2 - lat1) / 2) ** 2
        + math.cos(rad(lat1)) * math.cos(rad(lat2)) * math.sin(rad(lon2 - lon1) / 2) ** 2
    )
    return 2 * radius * math.asin(math.sqrt(step))


def load_rows(path: Path):
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("rows", data) if isinstance(data, dict) else data


def audit(rows):
    findings, by_point = [], collections.defaultdict(list)
    for row in rows:
        raw_lat, raw_lon = row.get("Latitude"), row.get("Longitude")
        name = (row.get("Name") or "").strip()
        lat, lon = as_float(raw_lat), as_float(raw_lon)
        entry = {
            "name": name,
            "location": (row.get("Location") or "").strip(),
            "lat": str(raw_lat).strip(),
            "lon": str(raw_lon).strip(),
            "problems": [],
        }
        if lat is None or lon is None:
            entry["problems"].append("missing")
            findings.append(entry)
            continue
        if not (LAT_RANGE[0] <= lat <= LAT_RANGE[1] and LON_RANGE[0] <= lon <= LON_RANGE[1]):
            entry["problems"].append("outside Pakistan")
        dp = min(decimals(raw_lat), decimals(raw_lon))
        if dp <= COARSE_DP:
            entry["problems"].append(f"{dp}dp (~{round(111_000 / (10 ** dp))}m)")
        by_point[(entry["lat"], entry["lon"])].append(entry)
        findings.append(entry)

    for point, group in by_point.items():
        if len(group) < 2:
            continue
        for entry in group:
            others = [g["name"] for g in group if g is not entry]
            entry["problems"].append(f"shares its point with {len(others)}: {', '.join(others)}")

    flagged = [f for f in findings if f["problems"]]
    counts = {
        "coarse": sum(1 for f in flagged if any("dp (" in p for p in f["problems"])),
        "shared": sum(1 for f in flagged if any(p.startswith("shares") for p in f["problems"])),
        "missing": sum(1 for f in flagged if "missing" in f["problems"]),
    }
    return flagged, counts


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--snapshot", type=Path, default=SNAPSHOT)
    parser.add_argument("--json", action="store_true", help="emit the findings as JSON")
    args = parser.parse_args()

    if not args.snapshot.exists():
        print(f"[coords] snapshot not found: {args.snapshot}", file=sys.stderr)
        return 2

    rows = load_rows(args.snapshot)
    flagged, counts = audit(rows)

    if args.json:
        json.dump({"counts": counts, "findings": flagged}, sys.stdout, indent=1, ensure_ascii=False)
        print()
        return 0

    print(f"[coords] {len(rows)} rows · {len(flagged)} carry a placeholder-grade coordinate")
    print(f"[coords] coarse (<={COARSE_DP}dp): {counts['coarse']}   sharing a point: {counts['shared']}   missing: {counts['missing']}")
    for finding in sorted(flagged, key=lambda f: f["name"]):
        print(f"  {finding['name'][:48]:48s} {finding['lat']},{finding['lon']}")
        for problem in finding["problems"]:
            print(f"      · {problem}")

    over = {k: (counts[k], BASELINE[k]) for k in BASELINE if counts[k] > BASELINE[k]}
    if over:
        print("\n[coords] FAILED — the placeholder count rose:", file=sys.stderr)
        for key, (now, was) in over.items():
            print(f"  {key}: {now}, baseline {was}", file=sys.stderr)
        print(
            "A coordinate typed to two decimals is a survey nobody has done. If this is\n"
            "deliberate, raise BASELINE in pipeline/audit_coordinates.py and say which\n"
            "entry and why.",
            file=sys.stderr,
        )
        return 1

    print(f"\n[coords] OK — within baseline {BASELINE}.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
