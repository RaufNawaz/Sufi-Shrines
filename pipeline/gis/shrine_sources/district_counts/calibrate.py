"""Measure every source against the official baseline: the Department of Archaeology & Museums'
national inventory (DOAM; registers/README_heritage.md). Writes calibration_*.csv.

Rauf, 30 October 2026: "find a verified and accurate source and then use that as the baseline and
then adjust the others according to it". DOAM's inventory is the only official list found with a
point and a district for every site. Two measurements:

1. Location (calibration_offsets.csv): where a DOAM record and another source's record are one
   place, the distance between them. This says whether DOAM's points may vote on archive pins.
2. Coverage (calibration_recall.csv): of DOAM's places, the share each source also holds, by
   province and tradition. That is each source's recall of officially inventoried sites; dividing
   a source's count by it is the adjustment, with the caveat below.

Caveat, stated in the README: DOAM inventories historic monuments. A source's recall of
monuments is an upper bound on its recall of all shrines (small, recent darbars are harder to
find than listed tombs), so a count divided by it is a floor on the true count, not an estimate.
Run after build_district_counts.py (stdlib only).
"""

import csv, math, statistics
from collections import defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
GIS = HERE.parent.parent
prov = {}
with open(GIS / "boundaries/pk_dictionary.csv", encoding="utf-8") as f:
    for r in csv.DictReader(f):
        if r["level"] == "district":
            prov[r["district_code"]] = r["province_name"]


def metres(a, b):
    la1, lo1, la2, lo2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((la2 - la1) / 2) ** 2 + math.cos(la1) * math.cos(la2) * math.sin((lo2 - lo1) / 2) ** 2
    return 2 * 6371000 * math.asin(math.sqrt(h))


rows = list(csv.DictReader(open(HERE / "sites.csv", encoding="utf-8")))
by = defaultdict(list)
for r in rows:
    if r["source"] != "osm" or r["tier"] in ("A", "B"):
        by[r["place"]].append(r)

off = defaultdict(list)
for rs in by.values():
    doam = [r for r in rs if r["source"] == "doam" and r["lat"]]
    for o in rs:
        if o["source"] == "doam" or not o["lat"] or not doam:
            continue
        off[o["source"]].append(min(metres((float(d["lat"]), float(d["lon"])), (float(o["lat"]), float(o["lon"]))) for d in doam))
with open(HERE / "calibration_offsets.csv", "w", encoding="utf-8", newline="\n") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["source", "places_shared_with_doam", "median_m", "p90_m"])
    for s, v in sorted(off.items()):
        v = sorted(v)
        w.writerow([s, len(v), round(statistics.median(v)), round(v[int(0.9 * (len(v) - 1))])])

rec = defaultdict(lambda: defaultdict(int))
for rs in by.values():
    if not any(r["source"] == "doam" for r in rs):
        continue
    d = next(r for r in rs if r["source"] == "doam")
    groups = [prov.get(d["district_code"], "?"), "PAKISTAN"]
    trad = "muslim" if d["tradition"] == "muslim" else "non-muslim"
    srcs = {r["source"] for r in rs}
    for g in groups:
        for t in (trad, "all"):
            rec[(g, t)]["doam_places"] += 1
            for s in ("archive", "osm", "geonames", "wikidata"):
                rec[(g, t)][s] += s in srcs
            rec[(g, t)]["any_other"] += bool(srcs - {"doam"})
with open(HERE / "calibration_recall.csv", "w", encoding="utf-8", newline="\n") as f:
    w = csv.writer(f, lineterminator="\n")
    w.writerow(["province", "tradition", "doam_places", "archive", "osm", "geonames", "wikidata", "any_other",
                "recall_osm", "recall_geonames", "recall_any_other"])
    for (g, t), c in sorted(rec.items(), key=lambda x: (x[0][0] == "PAKISTAN", x[0])):
        n = c["doam_places"]
        w.writerow([g, t, n, c["archive"], c["osm"], c["geonames"], c["wikidata"], c["any_other"],
                    round(c["osm"] / n, 3), round(c["geonames"] / n, 3), round(c["any_other"] / n, 3)])
print(open(HERE / "calibration_offsets.csv", encoding="utf-8").read())
print(open(HERE / "calibration_recall.csv", encoding="utf-8").read())

# 3. The adjustment (calibration_estimate.csv). DOAM is one list; every other source together is
# the second. Of DOAM's Muslim places, the share the others also hold is their recall, and
# Chapman's two-list estimate N = (n1+1)(n2+1)/(m+1) - 1 is the others' count adjusted by it.
# DOAM lists historic monuments, the kind every source finds most easily, so the others' recall
# of monuments overstates their recall of shrines in general and N is a floor. Only where the
# overlap m is at least 7; elsewhere the estimate would be noise.
places = defaultdict(lambda: {"srcs": set(), "dc": "", "trad": set()})
for p, rs in by.items():
    for r in rs:
        places[p]["srcs"].add(r["source"])
        places[p]["trad"].add(r["tradition"])
        places[p]["dc"] = places[p]["dc"] or r["district_code"]
est = []
for g in sorted({prov.get(v["dc"], "?") for v in places.values()} - {"?"}) + ["PAKISTAN"]:
    ps = [v for v in places.values() if "muslim" in v["trad"] and (g == "PAKISTAN" or prov.get(v["dc"]) == g)]
    n1 = sum("doam" in v["srcs"] for v in ps)
    n2 = sum(bool(v["srcs"] - {"doam"}) for v in ps)
    m = sum("doam" in v["srcs"] and bool(v["srcs"] - {"doam"}) for v in ps)
    row = {"province": g, "doam_muslim_places": n1, "other_sources_muslim_places": n2, "overlap": m,
           "recall_of_others": round(m / n1, 3) if n1 else None}
    if m >= 7:
        N = (n1 + 1) * (n2 + 1) / (m + 1) - 1
        se = math.sqrt((n1 + 1) * (n2 + 1) * (n1 - m) * (n2 - m) / ((m + 1) ** 2 * (m + 2)))
        row.update(chapman_floor=round(N), ci_lo=round(max(N - 1.96 * se, n1 + n2 - m)), ci_hi=round(N + 1.96 * se))
    est.append(row)
with open(HERE / "calibration_estimate.csv", "w", encoding="utf-8", newline="\n") as f:
    w = csv.DictWriter(f, fieldnames=["province", "doam_muslim_places", "other_sources_muslim_places", "overlap",
                                      "recall_of_others", "chapman_floor", "ci_lo", "ci_hi"], lineterminator="\n")
    w.writeheader()
    w.writerows(est)
print(open(HERE / "calibration_estimate.csv", encoding="utf-8").read())
