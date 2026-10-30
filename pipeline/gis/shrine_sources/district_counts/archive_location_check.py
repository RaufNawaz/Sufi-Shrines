"""Check every archive pin against the independent records of the same place (writes
archive_location_check.csv). A verification of the archive, not a correction: RULE 2, nothing
here moves a pin; a person reads the flagged rows and decides.

For each archive site that build_district_counts.py joined to records from other sources:
  - the distance from the archive pin to each record, by source;
  - `agreeing_independent`: how many records from DIFFERENT sources (Wikidata, OSM, DOAM inventory)
    lie within 150 m of one another (the largest such group), with their centre;
  - verdict:
      confirmed      an independent record lies within 150 m of the pin
      pin_suspect    ≥ 2 records from different sources agree with each other (≤ 150 m) and lie
                     > 300 m from the pin: two independent sources outvote the archive
      disputed       the nearest independent record is > 300 m away, but no two agree
      near           the nearest is 150–300 m away
GeoNames is listed for information and never votes: its median offset against the archive is
148 m and its 90th percentile 1,082 m (GIS_FOUNDATION.md, "Other shrine databases").
Run after build_district_counts.py (stdlib only).
"""

import csv, math
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
VOTERS = ("wikidata", "osm", "doam")


def metres(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


rows = [r for r in csv.DictReader(open(HERE / "sites.csv", encoding="utf-8")) if r["lat"]]
by = defaultdict(list)
for r in rows:
    by[r["place"]].append(r)

out = []
for place, rs in by.items():
    arch = [r for r in rs if r["source"] == "archive"]
    if not arch:
        continue
    a = arch[0]
    pa = (float(a["lat"]), float(a["lon"]))
    others = [r for r in rs if r["source"] != "archive"]
    if not others:
        continue
    voters = [r for r in others if r["source"] in VOTERS]
    dists = {r["source"] + ":" + r["source_id"]: round(metres(pa, (float(r["lat"]), float(r["lon"])))) for r in others}
    near = min((metres(pa, (float(r["lat"]), float(r["lon"]))) for r in voters), default=None)
    # Largest group of voters from different sources within 150 m of each other.
    best = []
    for v in voters:
        pv = (float(v["lat"]), float(v["lon"]))
        grp = [w for w in voters if metres(pv, (float(w["lat"]), float(w["lon"]))) <= 150]
        if len({w["source"] for w in grp}) > len({w["source"] for w in best}):
            best = grp
    srcs = sorted({w["source"] for w in best})
    if best:
        cen = (sum(float(w["lat"]) for w in best) / len(best), sum(float(w["lon"]) for w in best) / len(best))
        to_group = metres(pa, cen)
    else:
        cen, to_group = (None, None), None
    if near is None:
        verdict = "geonames_only"
    elif near <= 150:
        verdict = "confirmed"
    elif len(srcs) >= 2 and to_group > 300:
        verdict = "pin_suspect"
    elif near > 300:
        verdict = "disputed"
    else:
        verdict = "near"
    out.append({"archive_id": a["source_id"], "name": a["name"], "district_code": a["district_code"],
                "verdict": verdict, "nearest_independent_m": None if near is None else round(near),
                "agreeing_sources": "+".join(srcs), "agreeing_centre_lat": None if cen[0] is None else round(cen[0], 6),
                "agreeing_centre_lon": None if cen[1] is None else round(cen[1], 6),
                "pin_to_agreeing_centre_m": None if to_group is None else round(to_group),
                "archive_lat": a["lat"], "archive_lon": a["lon"],
                "records_m": "; ".join(f"{k} {v}" for k, v in sorted(dists.items(), key=lambda x: x[1]))})

order = {"pin_suspect": 0, "disputed": 1, "near": 2, "confirmed": 3, "geonames_only": 4}
out.sort(key=lambda r: (order[r["verdict"]], -(r["nearest_independent_m"] or 0)))
with open(HERE / "archive_location_check.csv", "w", encoding="utf-8", newline="\n") as f:
    w = csv.DictWriter(f, fieldnames=list(out[0]), lineterminator="\n")
    w.writeheader()
    w.writerows(out)
from collections import Counter  # noqa: E402
print(Counter(r["verdict"] for r in out), "of", len(out), "archive sites with independent records")
for r in out:
    if r["verdict"] in ("pin_suspect", "disputed"):
        print(r["verdict"], r["name"][:40], r["nearest_independent_m"], r["agreeing_sources"], r["pin_to_agreeing_centre_m"])
