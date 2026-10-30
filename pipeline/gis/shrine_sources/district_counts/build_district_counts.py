"""Shrines per district from every source, separately and as a deduplicated union.

Why: the viewer's conjecture workbench regressed welfare on the ARCHIVE's counts (489 rows,
a few hundred pinned), which measure where the archive has looked as much as where shrines
are. This builds counts that do not depend on the archive, says how far each can be trusted,
and estimates what all of them miss. Leads, not entries (RULE 2): nothing here enters the
archive or the sheet.

Reads (run from the repo root, with the gis venv: ~/.venvs/gis312/Scripts/python):
  data/shrines.csv                                    the archive (pinned rows only)
  pipeline/gis/sources/shrine_dbs/counts/osm_counts.json   overpass_counts.ql (fetch below)
  pipeline/gis/shrine_sources/external_sites.csv      GeoNames rows (SHRN/TMB/TMPL)
  pipeline/gis/shrine_sources/merged_leads.csv        Wikidata rows (P31 under shrine/tomb/temple/...)
  pipeline/gis/shrine_sources/registers/heritage_monuments.csv   its doam_inventory rows (DOAM national inventory)
  pipeline/gis/shrine_sources/registers/auqaf_registers.csv      Punjab + Sindh Auqaf registers
  pipeline/gis/boundaries/pk_districts.gpkg, pk_tehsils.gpkg

Writes (pipeline/gis/shrine_sources/district_counts/):
  sites.csv              one row per source record, its tier, tradition, district and union place
  district_counts.csv    per district: every source's count, the union, capture-recapture
  province_counts.csv    the same per province, with the capture-recapture estimate
  checks.csv             every invariant and measurement; exits 1 if a hard one fails

Fetch (≈2 min; Overpass wants a User-Agent):
  curl -sf -m 700 -A "ShrinesArchiveResearch/1.0" --data-urlencode \
    "data@pipeline/gis/shrine_sources/overpass_counts.ql" https://overpass-api.de/api/interpreter \
    -o pipeline/gis/sources/shrine_dbs/counts/osm_counts.json
"""

import csv, json, math, re, sys
from collections import Counter, defaultdict
from pathlib import Path

import numpy as np
import geopandas as gpd
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
SS = HERE.parent
GIS = SS.parent
REPO = GIS.parent.parent
sys.path.insert(0, str(HERE))
sys.path.insert(0, str(SS))
from classify_osm import classify  # noqa: E402
import build_external_sites as bes  # noqa: E402  (the measured matcher: sim, aliases, TOPONYMS)

PK_LAEA = bes.PK_LAEA
# Type words the DOAM inventory and OSM spell in ways the matcher's list lacks: "Samadh of Sir
# Ganga Ram" and "Samadh of Ranjit Singh" shared only "samadh" and were joined. In this process only.
bes.GENERIC |= {"samadh", "smadh", "samadhi", "qubba", "maqbra", "tombs", "shrines", "darbaar", "dargha",
                "khanqah-e", "monument", "complex"}
CHECKS = []


def check(name, measured, reference, ok, hard=True, note=""):
    CHECKS.append({"check": name, "measured": measured, "reference": reference,
                   "result": "pass" if ok else ("FAIL" if hard else "warn"), "note": note})
    print(f"  [{'pass' if ok else ('FAIL' if hard else 'warn')}] {name}: {measured} vs {reference}")


ARCHIVE_TRAD = {"Muslim Shrine": "muslim", "Hindu Temple": "hindu", "Sikh Gurdwara": "sikh",
                "Nanakpanthi / Udasi Darbar": "sikh", "Jain Temple": "jain", "Secular / Memorial": "secular"}
GEONAMES_TRAD = {"temple": "hindu", "shrine": "muslim", "tomb": "unknown", "religious site": "unknown"}
HERITAGE_TRAD = {"tomb_shrine": "muslim", "temple": "hindu", "gurdwara": "sikh", "samadhi": "unknown"}


def wd_trad(kind, religion):
    k = f"{kind} {religion}".lower()
    if "gurdwara" in k or "sikh" in k:
        return "sikh"
    if "jain" in k:
        return "jain"
    if "hindu" in k or "temple" in k or "ashram" in k:
        return "hindu"
    if "samadhi" in k:
        return "unknown"
    return "muslim" if re.search(r"shrine|dargah|sufi|islam|mausoleum|tomb|türbe", k) else "unknown"


def load_records():
    recs = []
    # Archive: pinned rows only. Unpinned rows are counted in checks, never placed by guesswork.
    unpinned = 0
    with open(REPO / "data/shrines.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            try:
                lat, lon = float(r["Latitude"]), float(r["Longitude"])
            except (TypeError, ValueError):
                unpinned += 1
                continue
            cat = r.get("category") or r.get("Category") or ""
            recs.append(dict(source="archive", source_id=r["id"], name=r["Name"], tier="archive",
                             tradition=ARCHIVE_TRAD.get(cat, "unknown"), lat=lat, lon=lon, qid=""))
    check("archive rows without a pin (not counted by district)", unpinned, "reported", True, hard=False)

    osm = json.load(open(GIS / "sources/shrine_dbs/counts/osm_counts.json", encoding="utf-8"))
    check("OSM base timestamp", osm["osm3s"]["timestamp_osm_base"], "recorded", True, hard=False)
    rules = Counter()
    for e in osm["elements"]:
        t = e.get("tags", {})
        tier, trad, rule = classify(t)
        rules[rule] += 1
        if tier == "-":
            continue
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        if lat is None:
            continue
        nm = t.get("name") or t.get("name:en") or t.get("alt_name:en") or t.get("name:ur") or ""
        others = [v for k, v in t.items() if k.startswith(("name", "alt_name", "old_name")) and v != nm]
        recs.append(dict(source="osm", source_id=f"{e['type']}/{e['id']}", name=nm, alt=" / ".join(others),
                         tier=tier, tradition=trad, lat=lat, lon=lon, qid=t.get("wikidata", ""), rule=rule))
    with open(HERE / "osm_rules.csv", "w", encoding="utf-8", newline="\n") as f:
        w = csv.writer(f, lineterminator="\n")
        w.writerow(["rule", "elements"])
        for k, v in sorted(rules.items(), key=lambda x: (-x[1], x[0])):
            w.writerow([k, v])

    with open(SS / "external_sites.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["source"] != "geonames":
                continue
            recs.append(dict(source="geonames", source_id=r["source_id"], name=r["name"], tier="gazetteer",
                             tradition=GEONAMES_TRAD.get(r["kind"], "unknown"),
                             lat=float(r["lat"]), lon=float(r["lon"]), qid=""))

    with open(SS / "merged_leads.csv", encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if "wikidata" not in r["sources"] or not r["qid"]:
                continue
            recs.append(dict(source="wikidata", source_id=r["qid"], name=r["name"], alt=r.get("aliases", ""),
                             tier="item", tradition=wd_trad(r["kind"], r["religion"]),
                             lat=float(r["lat"]), lon=float(r["lon"]), qid=r["qid"]))

    her = SS / "registers/heritage_monuments.csv"
    if her.exists():
        n_np = 0
        with open(her, encoding="utf-8") as f:
            for r in csv.DictReader(f):
                # One list only: the table stacks overlapping lists (README_heritage.md). The DOAM
                # national inventory is the official list with a district and a point for every row.
                if r["list"] != "doam_inventory" or r["kind"] not in HERITAGE_TRAD:
                    continue
                try:
                    lat, lon = float(r["lat"]), float(r["lon"])
                except (TypeError, ValueError):
                    n_np += 1
                    recs.append(dict(source="doam", source_id=r["official_id"] or r["name"], name=r["name"],
                                     tier="listed", tradition=HERITAGE_TRAD[r["kind"]], lat=None, lon=None,
                                     qid=r.get("wikidata", ""), district_code=r["district_code"]))
                    continue
                recs.append(dict(source="doam", source_id=r["official_id"] or r["name"], name=r["name"],
                                 tier="listed", tradition=HERITAGE_TRAD[r["kind"]], lat=lat, lon=lon,
                                 qid=r.get("wikidata", "")))
        check("DOAM inventory rows with no coordinates (district as listed)", n_np, "reported", True, hard=False)
    else:
        check("heritage_monuments.csv present", "absent", "present", False, hard=False,
              note="heritage columns left empty")
    return recs


def place_in_districts(recs):
    dist = gpd.read_file(GIS / "boundaries/pk_districts.gpkg")
    teh = gpd.read_file(GIS / "boundaries/pk_tehsils.gpkg")
    for nm in list(teh.tehsil_name) + list(dist.district_name):
        bes.TOPONYMS.update(t for t in bes.tokens(nm) if len(t) >= 4)
    pts = [i for i, r in enumerate(recs) if r["lat"] is not None]
    g = gpd.GeoDataFrame({"i": pts}, geometry=gpd.points_from_xy([recs[i]["lon"] for i in pts],
                                                                 [recs[i]["lat"] for i in pts]), crs=4326)
    j = gpd.sjoin(g, dist[["district_code", "province_name", "geometry"]], how="left", predicate="within")
    j = j[~j.index.duplicated()]
    for i, dc, pn in zip(j.i, j.district_code, j.province_name):
        recs[i]["district_code"] = dc if isinstance(dc, str) else ""
    # A point a few metres offshore (Karachi's coast) falls in no polygon: nearest district within 2 km.
    miss = [i for i in pts if not recs[i].get("district_code")]
    if miss:
        dm = dist.to_crs(PK_LAEA)
        gm = gpd.GeoDataFrame({"i": miss}, geometry=gpd.points_from_xy([recs[i]["lon"] for i in miss],
                                                                       [recs[i]["lat"] for i in miss]), crs=4326).to_crs(PK_LAEA)
        nj = gpd.sjoin_nearest(gm, dm[["district_code", "geometry"]], how="left", max_distance=2000, distance_col="d")
        nj = nj[~nj.index.duplicated()]
        for i, dc in zip(nj.i, nj.district_code):
            recs[i]["district_code"] = dc if isinstance(dc, str) else ""
    outside = sum(1 for i in pts if not recs[i].get("district_code"))
    check("points outside every district (> 2 km offshore or abroad; dropped from counts)", outside,
          "reported", True, hard=False)
    return dist


def union_places(recs):
    """One place per real site. Same rules as the measured matcher, scaled for GeoNames' coarseness:
    the farther apart, the more the names must agree; never across two known, different traditions;
    an OSM node and way of one building (≤ 50 m, either unnamed or names agreeing) are one place."""
    idx = [i for i, r in enumerate(recs) if r["lat"] is not None]
    lat = np.array([recs[i]["lat"] for i in idx]); lon = np.array([recs[i]["lon"] for i in idx])
    g = gpd.GeoSeries(gpd.points_from_xy(lon, lat), crs=4326).to_crs(PK_LAEA)
    xy = np.c_[g.x.values, g.y.values]
    parent = list(range(len(recs)))
    # Cannot-link: a place never holds two archive rows, two Wikidata items, or two different
    # known traditions. Without this, union-find chained neighbours into one "place": Shah Jamal
    # and Shah Kamal (two archive rows; "jamal"/"kamal" pass the fuzzy test), Prahladpuri Temple
    # and Bahauddin Zakariya (bridged by an unnamed point), Ranjit Singh's samadhi and his
    # son's and grandson's. Links are applied nearest first, so the closest claim wins.
    wd_dupes = set()
    with open(SS / "wikidata_duplicates.tsv", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            wd_dupes.add(frozenset(v for k, v in r.items() if k and k.lower().startswith("q") and v))
    # A person's "not the same place" verdicts (not_same_place.tsv) override the matcher.
    key = {f'{r["source"]}:{r["source_id"]}': i for i, r in enumerate(recs)}
    forbid = defaultdict(set)
    with open(HERE / "not_same_place.tsv", encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            a, b = r["record_a"], r["record_b"]
            if a not in key or b not in key:
                check(f"not_same_place.tsv names a record that exists ({a} / {b})", "missing", "present", False)
                continue
            forbid[key[a]].add(key[b]); forbid[key[b]].add(key[a])
    attrs = [dict(arch={r["source_id"]} if r["source"] == "archive" else set(),
                  qid={r["qid"]} if r.get("qid") else set(),
                  trad={r["tradition"]} - {"unknown", "secular"},
                  ids={i}, forbid=set(forbid.get(i, ()))) for i, r in enumerate(recs)]
    refused = Counter()

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    def union(a, b, why="link"):
        ra, rb = find(a), find(b)
        if ra == rb:
            return True
        A, B = attrs[ra], attrs[rb]
        q = A["qid"] | B["qid"]
        if len(A["arch"] | B["arch"]) > 1 or len(A["trad"] | B["trad"]) > 1 or \
                (len(q) > 1 and frozenset(q) not in wd_dupes) or A["ids"] & B["forbid"]:
            refused[why] += 1
            return False
        parent[ra] = rb
        B["arch"] |= A["arch"]; B["qid"] = q; B["trad"] |= A["trad"]
        B["ids"] |= A["ids"]; B["forbid"] |= A["forbid"]
        return True

    al = {i: bes.aliases(recs[i]["name"]) + bes.aliases((recs[i].get("alt") or "")[:200]) for i in idx}
    # Identifier links first: an OSM wikidata tag, a heritage row's QID.
    by_qid = defaultdict(list)
    for i in range(len(recs)):
        if recs[i].get("qid"):
            by_qid[recs[i]["qid"]].append(i)
    for v in by_qid.values():
        for b in v[1:]:
            union(v[0], b)
    def strong_overlap(x, y):
        """A shared word that names someone: not a type word, honorific or lineage name. Shared
        "Singh" chained Ranjit Singh's samadhi to his son's; shared "Shah" would chain Multan."""
        weak = bes.GENERIC | bes.WEAK
        tx = {t for s in x for t in bes.tokens(s) if t not in weak and len(t) >= 3}
        ty = {t for s in y for t in bes.tokens(s) if t not in weak and len(t) >= 3}
        return any(bes._tok_match(u, v) for u in tx for v in ty)

    basis = Counter()
    tree = cKDTree(xy)
    pairs = sorted(tree.query_pairs(2000), key=lambda p: float(np.hypot(*(xy[p[0]] - xy[p[1]]))))
    known = {"unknown", "secular"}
    for a, b in pairs:
        ia, ib = idx[a], idx[b]
        ra, rb = recs[ia], recs[ib]
        ta, tb = ra["tradition"], rb["tradition"]
        if ta not in known and tb not in known and ta != tb:
            continue
        d = float(np.hypot(*(xy[a] - xy[b])))
        why = ""
        if bes.sim(al[ia], al[ib]) >= (0.6 if d <= 300 else 0.75 if d <= 1000 else 0.9):
            why = "name"
        elif ra["source"] == rb["source"] == "osm" and d <= 50 and (
                not bes.tokens(ra["name"]) or not bes.tokens(rb["name"]) or strong_overlap(al[ia], al[ib])):
            why = "osm-same-building"
        elif ra["source"] != rb["source"] and d <= 50 and ta == tb and ta not in known and strong_overlap(al[ia], al[ib]):
            why = "proximity+tradition"
        if why and union(ia, ib, why):
            basis[why] += 1
    check("union links by basis", dict(basis), "reported", True, hard=False)
    check("links refused by a cannot-link constraint", dict(refused), "reported", True, hard=False)
    roots = {}
    for i in range(len(recs)):
        recs[i]["place"] = roots.setdefault(find(i), f"U{len(roots):05d}")


def chapman(n1, n2, m):
    """Chapman's estimator of a closed population from two lists, with its variance (Seber 1970).
    Assumes the lists are independent; positive dependence (both lists favour famous shrines)
    biases it DOWN, so it is a floor, not a total."""
    if n1 == 0 or n2 == 0:
        return None, None, None
    N = (n1 + 1) * (n2 + 1) / (m + 1) - 1
    var = (n1 + 1) * (n2 + 1) * (n1 - m) * (n2 - m) / ((m + 1) ** 2 * (m + 2))
    se = math.sqrt(var)
    return round(N, 1), round(max(N - 1.96 * se, n1 + n2 - m), 1), round(N + 1.96 * se, 1)


def main():
    print("loading sources")
    recs = load_records()
    dist = place_in_districts(recs)
    print("joining records into places")
    union_places(recs)

    counted = [r for r in recs if r.get("district_code")]
    # The two independent-ish lists for capture-recapture: OSM (A+B) and GeoNames, Muslim and
    # unknown-tradition sites (GeoNames' SHRN/TMB do not say a tradition).
    def in_list(r, name):
        if name == "osm":
            return r["source"] == "osm" and r["tier"] in ("A", "B")
        return r["source"] == "geonames" and r["tradition"] in ("muslim", "unknown")

    def place_sets(rows):
        s = defaultdict(set)
        for r in rows:
            s[r["source"] + ("_" + r["tier"] if r["source"] == "osm" else "")].add(r["place"])
            if r["source"] != "osm" or r["tier"] in ("A", "B"):
                s["union_ab"].add(r["place"])
            s["union_abc"].add(r["place"])
            if r["source"] != "osm" or r["tier"] in ("A", "B"):
                s["union_" + {"muslim": "muslim", "hindu": "hindu", "sikh": "sikh", "jain": "other",
                              "other": "other", "secular": "other"}.get(r["tradition"], "unknown")].add(r["place"])
            if in_list(r, "osm"):
                s["cr_osm"].add(r["place"])
            if in_list(r, "geonames"):
                s["cr_geonames"].add(r["place"])
        return s

    # A place belongs to the district of its first-listed member with a district: archive pin
    # first, then Wikidata, OSM, heritage, GeoNames (the order of measured coordinate quality).
    rank = {"archive": 0, "wikidata": 1, "osm": 2, "doam": 3, "geonames": 4}
    place_dc = {}
    for r in sorted(counted, key=lambda r: rank[r["source"]]):
        place_dc.setdefault(r["place"], r["district_code"])
    split = sum(1 for r in counted if place_dc[r["place"]] != r["district_code"])
    check("records whose place is counted in another district (members straddle a boundary)", split,
          "reported", True, hard=False)
    by_d = defaultdict(list)
    for r in counted:
        by_d[place_dc[r["place"]]].append(r)

    cols = ["archive", "osm_A", "osm_B", "osm_C", "geonames", "wikidata", "doam",
            "union_ab", "union_abc", "union_muslim", "union_hindu", "union_sikh", "union_other", "union_unknown",
            "cr_osm", "cr_geonames"]
    dd = dist.set_index("district_code")
    pop = {}
    try:
        import pandas as pd
        cen = pd.read_csv(GIS / "outcomes/outcomes_district.csv")
        pcol = "pop2023"
        pop = dict(zip(cen.district_code, cen[pcol]))
    except Exception as ex:  # noqa: BLE001
        check("district population for per-capita columns", f"not read ({ex.__class__.__name__})", "read",
              False, hard=False)
    # Mapping effort: every Muslim or untagged place of worship OSM holds (overpass_effort.ql).
    # Mosques follow population, not shrines, so their mapped count says how thoroughly a
    # district has been mapped; a regression on OSM shrine counts should control for it.
    eff = json.load(open(GIS / "sources/shrine_dbs/counts/osm_effort.json", encoding="utf-8"))
    check("OSM effort base timestamp", eff["osm3s"]["timestamp_osm_base"], "recorded", True, hard=False)
    ex = [(e.get("lon", e.get("center", {}).get("lon")), e.get("lat", e.get("center", {}).get("lat")))
          for e in eff["elements"]]
    ex = [p for p in ex if p[0] is not None]
    eg = gpd.GeoDataFrame(geometry=gpd.points_from_xy(*zip(*ex)), crs=4326)
    effort = gpd.sjoin(eg, dist[["district_code", "geometry"]], predicate="within").district_code.value_counts().to_dict()
    check("OSM places of worship (effort) placed in a district", sum(effort.values()), len(ex), True, hard=False)
    rows = []
    for dc in sorted(dd.index):
        s = place_sets(by_d.get(dc, []))
        row = {"district_code": dc, "district_name": dd.at[dc, "district_name"],
               "province_name": dd.at[dc, "province_name"], "area_km2": round(float(dd.at[dc, "area_km2"]), 1)}
        for c in cols:
            row["n_" + c] = len(s.get(c, ()))
        m = len(s.get("cr_osm", set()) & s.get("cr_geonames", set()))
        row["n_osm_pow_effort"] = int(effort.get(dc, 0))
        row["cr_overlap"] = m
        N, lo, hi = chapman(row["n_cr_osm"], row["n_cr_geonames"], m) if m >= 7 else (None, None, None)
        row.update(cr_chapman=N, cr_lo=lo, cr_hi=hi)
        p = pop.get(dc)
        row["union_ab_per_100k"] = round(row["n_union_ab"] / p * 1e5, 2) if p else None
        row["union_ab_per_1000km2"] = round(row["n_union_ab"] / row["area_km2"] * 1000, 2)
        rows.append(row)
    with open(HERE / "district_counts.csv", "w", encoding="utf-8", newline="\n") as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(rows)

    prow = []
    for pn in sorted(set(dd.province_name)):
        rs = [r for dc in dd.index[dd.province_name == pn] for r in by_d.get(dc, [])]
        s = place_sets(rs)
        row = {"province_name": pn, **{"n_" + c: len(s.get(c, ())) for c in cols},
               "n_osm_pow_effort": sum(int(effort.get(dc, 0)) for dc in dd.index[dd.province_name == pn])}
        m = len(s.get("cr_osm", set()) & s.get("cr_geonames", set()))
        row["cr_overlap"] = m
        row["cr_chapman"], row["cr_lo"], row["cr_hi"] = chapman(row["n_cr_osm"], row["n_cr_geonames"], m)
        prow.append(row)
    s = place_sets(counted)
    row = {"province_name": "PAKISTAN", **{"n_" + c: len(s.get(c, ())) for c in cols},
           "n_osm_pow_effort": sum(int(v) for v in effort.values())}
    m = len(s["cr_osm"] & s["cr_geonames"])
    row["cr_overlap"] = m
    row["cr_chapman"], row["cr_lo"], row["cr_hi"] = chapman(row["n_cr_osm"], row["n_cr_geonames"], m)
    prow.append(row)
    with open(HERE / "province_counts.csv", "w", encoding="utf-8", newline="\n") as f:
        w = csv.DictWriter(f, fieldnames=list(prow[0]), lineterminator="\n")
        w.writeheader()
        w.writerows(prow)

    with open(HERE / "sites.csv", "w", encoding="utf-8", newline="\n") as f:
        fn = ["place", "source", "source_id", "tier", "rule", "tradition", "name", "lat", "lon", "district_code", "qid"]
        w = csv.DictWriter(f, fieldnames=fn, extrasaction="ignore", lineterminator="\n")
        w.writeheader()
        for r in sorted(recs, key=lambda r: (r["place"], r["source"], r["source_id"])):
            w.writerow({**r, "lat": "" if r["lat"] is None else round(r["lat"], 6),
                        "lon": "" if r["lon"] is None else round(r["lon"], 6)})

    # Invariants.
    tot = {r["province_name"]: r for r in prow}["PAKISTAN"]
    check("district union sums to the national union", sum(r["n_union_abc"] for r in rows), tot["n_union_abc"],
          sum(r["n_union_abc"] for r in rows) == tot["n_union_abc"])
    below = [r["district_code"] for r in rows
             if r["n_union_abc"] < max(r["n_archive"], r["n_geonames"], r["n_wikidata"], r["n_doam"])]
    check("no district's union is smaller than any one source's count there", len(below), 0, not below)
    check("every district present", len(rows), len(dd), len(rows) == len(dd))
    for src in ("archive", "osm", "geonames", "wikidata", "doam"):
        n = sum(1 for r in counted if r["source"] == src)
        check(f"{src} records counted", n, "reported", True, hard=False)
    with open(HERE / "checks.csv", "w", encoding="utf-8", newline="\n") as f:
        w = csv.DictWriter(f, fieldnames=["check", "measured", "reference", "result", "note"], lineterminator="\n")
        w.writeheader()
        w.writerows(CHECKS)
    if any(c["result"] == "FAIL" for c in CHECKS):
        sys.exit(1)


if __name__ == "__main__":
    main()
