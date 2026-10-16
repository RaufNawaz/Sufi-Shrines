"""
Shrine-type places in Pakistan from open databases, matched against the archive's own sites.

Sources (downloaded into pipeline/gis/sources/shrine_dbs/, gitignored):
  OpenStreetMap  Overpass query in this folder (overpass.ql). ODbL 1.0.
  Wikidata       SPARQL, items in Pakistan whose class is a subclass of the shrine/tomb/
                 temple/gurdwara classes (wikidata.rq). CC0.
  GeoNames       Pakistan dump, feature codes SHRN, TMB, TMPL, RLG, PGDA. CC BY 4.0.

These are LEADS, not entries (RULE 2). Nothing here may enter the sheet without a human reading
the source behind it. What this script adds is a measurement of how far each source can be
trusted, made the only way it can be: against the archive's own sites, whose positions are known.
For every archive site a source also contains, the distance between the two points is that
source's positional error at a place where the answer is known. The median of those distances is
reported per source, and against the 17 field-verified sites separately.

Writes:
  layer external_sites        every feature, with admin keys, h3_id, and its archive match if any
  layer external_site_checks  the measurements
  external_sites.csv, archive_coverage_by_source.csv, checks.csv in this folder

Usage (from the repo root):
  pipeline/gis/shrine_sources/fetch_shrine_sources.sh
  python pipeline/gis/shrine_sources/build_external_sites.py
"""
import csv, json, re, sys, unicodedata
from difflib import SequenceMatcher
from pathlib import Path

import numpy as np
import pandas as pd
import geopandas as gpd
import h3
from scipy.spatial import cKDTree

HERE = Path(__file__).resolve().parent
GIS = HERE.parent
SRC = GIS / "sources/shrine_dbs"
GPKG = GIS / "shrines_foundation.gpkg"
PK_LAEA = "+proj=laea +lat_0=30 +lon_0=69 +datum=WGS84 +units=m +no_defs"
CHECKS = []

# Words that say what kind of place something is, not which one. Stripped before names are compared.
# Words that say what KIND of place something is, not which one; stripped before comparing.
# Personal names and honorifics that identify ("Data", "Bibi", "Baba") are kept: stripping "data"
# and "bibi" once turned "Data Darbar" and "Bibi Pak Daman" into empty strings that matched nothing.
GENERIC = {"darbar", "dargah", "mazar", "mazaar", "shrine", "tomb", "of", "the", "at", "ra", "rah",
           "r", "a", "mausoleum", "ziarat", "ziyarat", "astana", "khanqah", "khanqa", "maqbara",
           "temple", "temples", "mandir", "mandar", "gurdwara", "gurudwara", "and", "complex", "sahib",
           "sharif", "shareef", "hazrat", "hazrath", "shri", "sri", "shree", "jo", "de", "di", "ji"}
# Honorifics, titles and lineage names: they help a string comparison but are never enough on
# their own. "Syed ... Shah" twice, or "Samadhi ... Singh" twice, does not make two places one.
WEAK = {"syed", "sayyid", "sayed", "shah", "pir", "peer", "baba", "sain", "mian", "makhdoom",
        "makhdum", "sheikh", "shaikh", "khawaja", "khwaja", "khwaja", "sakhi", "maharaja", "bhai",
        "guru", "singh", "samadhi", "bukhari", "gilani", "gillani", "qadri", "qadiri", "chishti",
        "suharwardi", "naqshbandi", "shaheed", "shahid", "ghazi", "wali", "ali", "muhammad", "mohammad",
        "din", "ud", "ul", "al", "e", "i", "mai", "bibi", "sufi", "dev", "devi", "mahadev", "nath",
        "lal", "ji", "jee", "ram", "das", "hanuman", "mosque", "masjid", "old", "new", "abandoned",
        # deities name many temples, not one
        "shiv", "shiva", "krishna", "rama", "durga", "kali", "mata", "lakshmi", "laxmi", "narayan",
        "vishnu", "ganesh", "mahavir", "mahaveer", "ganga", "sita", "radha", "valmiki", "valmik",
        "jain", "digambar", "svetambar", "parshvanath", "sikh", "sangat", "nanak"}
# Toponyms are added at run time from the boundary file's district and tehsil names (TOPONYMS):
# "Multan" in a temple's name and "Multani" in a saint's are not the same place.
TOPONYMS = set()
# The tradition a name's type-word implies, used only to stop a proximity match across traditions.
TYPE_WORDS = {"gurdwara": "sikh", "gurudwara": "sikh", "temple": "hindu", "mandir": "hindu",
              "mandar": "hindu", "shivala": "hindu", "darbar": "muslim", "dargah": "muslim",
              "mazar": "muslim", "shrine": "muslim", "tomb": "muslim", "mausoleum": "muslim",
              "ziarat": "muslim", "maqbara": "muslim", "khanqah": "muslim"}
EXCLUDE_WD_CLASSES = re.compile(r"church|cathedral|masonic|war graves", re.I)


def check(name, measured, reference, ok, hard=True, note=""):
    CHECKS.append({"check": name, "measured": measured, "reference": reference,
                   "result": "pass" if ok else ("FAIL" if hard else "warn"), "note": note})
    print(f"  [{'pass' if ok else ('FAIL' if hard else 'warn')}] {name}: {measured} vs {reference}")


def tokens(s):
    s = unicodedata.normalize("NFKD", str(s or "")).encode("ascii", "ignore").decode().lower()
    return [t for t in re.split(r"[^a-z0-9]+", s) if t]


def aliases(s):
    """'Gori Temple (Gori jo Mandar)' -> ['Gori Temple (Gori jo Mandar)', 'Gori Temple', 'Gori jo Mandar']."""
    s = str(s or "")
    parts = [s, re.sub(r"\(.*?\)", "", s)] + re.findall(r"\((.*?)\)", s) + re.split(r"[,/;]", s)
    return [p.strip() for p in parts if p and p.strip()]


def skeleton(t):
    """Consonant skeleton for Urdu/Punjabi/Sindhi transliterations: Hujwiri and Hajveri are both
    hjwr, Farid and Freed both frd, Mehr and Meher both mhr, Qutab and Qutb both ktb."""
    for a, b in (("ph", "f"), ("gh", "g"), ("kh", "k"), ("q", "k"), ("v", "w"), ("z", "j"), ("ee", "i")):
        t = t.replace(a, b)
    t = t[0] + re.sub(r"[aeiouy]", "", t[1:]) if t else t
    return re.sub(r"(.)\1+", r"\1", t)


def _tok_match(a, b):
    if a == b:
        return True
    if min(len(a), len(b)) >= 3 and (a.startswith(b) or b.startswith(a)):
        return True
    sa, sb = skeleton(a), skeleton(b)
    if len(sa) >= 3 and sa == sb:
        return True
    return min(len(a), len(b)) >= 4 and SequenceMatcher(None, a, b).ratio() >= 0.8


def sim_one(a, b):
    ta = [t for t in tokens(a) if t not in GENERIC]
    tb = [t for t in tokens(b) if t not in GENERIC]
    if not ta or not tb:
        return 0.0
    weak = WEAK | TOPONYMS
    sa, sb = [t for t in ta if t not in weak], [t for t in tb if t not in weak]
    if not sa or not sb:                    # nothing distinctive on one side: no claim of identity
        return 0.0
    hit = sum(any(_tok_match(x, y) for y in sb) for x in sa)
    hit_b = sum(any(_tok_match(y, x) for x in sa) for y in sb)
    if hit == 0:                            # not one distinctive word in common
        return 0.0
    # Containment counts only when it rests on two distinctive tokens, or when both names are a
    # single distinctive token: one shared "Karachi" or "Shah" must never make two places one.
    n = min(hit, hit_b)
    contain = (n / min(len(sa), len(sb))) if (n >= 2 or (len(sa) == 1 and len(sb) == 1)) else 0.0
    seq = max(SequenceMatcher(None, " ".join(sa), " ".join(sb)).ratio(),
              SequenceMatcher(None, " ".join(map(skeleton, sa)), " ".join(map(skeleton, sb))).ratio())
    return max(contain, seq)


def any_overlap(a_list, b_list):
    """Any shared word at all, weak ones included; used only for the 50 m same-tradition rescue."""
    ta = {t for a in a_list for t in tokens(a) if t not in GENERIC}
    tb = {t for b in b_list for t in tokens(b) if t not in GENERIC}
    return any(_tok_match(x, y) for x in ta for y in tb)


def sim(a_list, b_list):
    return max((sim_one(a, b) for a in a_list for b in b_list), default=0.0)


def tradition(s):
    found = {TYPE_WORDS[t] for t in tokens(s) if t in TYPE_WORDS}
    return found.pop() if len(found) == 1 else None


def load_osm():
    d = json.load(open(SRC / "osm_overpass.json"))
    rows = []
    for e in d["elements"]:
        t = e.get("tags", {})
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        if lat is None:
            continue
        kind = ("tomb" if t.get("historic") == "tomb" or "tomb" in t
                else t.get("historic") if t.get("historic") in ("monument", "memorial")
                else "place_of_worship")
        rows.append({"source": "osm", "source_id": f"{e['type']}/{e['id']}",
                     "name": t.get("name:en") or t.get("name"), "name_ur": t.get("name:ur") or "",
                     "name_other": t.get("name") or "", "kind": kind,
                     "religion": t.get("religion", ""), "lat": lat, "lon": lon,
                     "wikidata": t.get("wikidata", ""),
                     "url": f"https://www.openstreetmap.org/{e['type']}/{e['id']}"})
    return pd.DataFrame(rows), d["osm3s"]["timestamp_osm_base"]


def load_wikidata():
    b = json.load(open(SRC / "wikidata_subclass.json"))["results"]["bindings"]
    rows = {}
    for x in b:
        cls = x["classLabel"]["value"]
        if EXCLUDE_WD_CLASSES.search(cls):
            continue
        qid = x["item"]["value"].rsplit("/", 1)[1]
        lon, lat = map(float, re.findall(r"[-\d.]+", x["coord"]["value"])[:2])
        r = rows.setdefault(qid, {"source": "wikidata", "source_id": qid, "name": x["itemLabel"]["value"],
                                  "name_ur": x.get("urLabel", {}).get("value", ""), "name_other": "",
                                  "kind": cls, "religion": "", "lat": lat, "lon": lon, "wikidata": qid,
                                  "url": f"https://www.wikidata.org/wiki/{qid}"})
        if cls not in r["kind"]:
            r["kind"] += "; " + cls
    return pd.DataFrame(rows.values())


def load_geonames():
    cols = ["geonameid", "name", "asciiname", "alternatenames", "lat", "lon", "fclass", "fcode",
            "cc", "cc2", "a1", "a2", "a3", "a4", "pop", "elev", "dem", "tz", "mod"]
    g = pd.read_csv(SRC / "PK.txt", sep="\t", names=cols, quoting=csv.QUOTE_NONE, dtype=str,
                    keep_default_na=False)
    g = g[(g.fclass == "S") & g.fcode.isin(["SHRN", "TMB", "TMPL", "RLG", "PGDA"])]
    kind = {"SHRN": "shrine", "TMB": "tomb", "TMPL": "temple", "RLG": "religious site", "PGDA": "pagoda"}
    return pd.DataFrame({"source": "geonames", "source_id": g.geonameid, "name": g["name"],
                         "name_ur": "", "name_other": g.alternatenames.str.slice(0, 300),
                         "kind": g.fcode.map(kind), "religion": "", "lat": g.lat.astype(float),
                         "lon": g.lon.astype(float), "wikidata": "",
                         "url": "https://www.geonames.org/" + g.geonameid, "mod": g["mod"]})


def coord_decimals(v):
    s = repr(float(v))
    return len(s.split(".")[1]) if "." in s else 0


def main():
    osm, osm_ts = load_osm()
    wd = load_wikidata()
    gn = load_geonames()
    ext = pd.concat([osm, wd, gn], ignore_index=True)
    print(f"features: osm {len(osm)} (OSM base {osm_ts}), wikidata {len(wd)}, geonames {len(gn)}")

    sites = gpd.read_file(GPKG, layer="sites")
    teh_all = gpd.read_file(GPKG, layer="admin_tehsil")
    dist_names = gpd.read_file(GPKG, layer="admin_district", ignore_geometry=True).district_name
    for nm in list(teh_all.tehsil_name) + list(dist_names):
        TOPONYMS.update(t for t in tokens(nm) if len(t) >= 4)
        TOPONYMS.update(t + "i" for t in tokens(nm) if len(t) >= 4)      # Multan -> Multani, Lahore -> Lahori
    teh = teh_all[["tehsil_code", "district_code", "province_code", "geometry"]]

    pts = gpd.GeoDataFrame(ext, geometry=gpd.points_from_xy(ext.lon, ext.lat), crs=4326)
    j = gpd.sjoin(pts, teh, how="left", predicate="within").drop(columns="index_right")
    j = j[~j.index.duplicated()]
    inside = j.tehsil_code.notna()
    check("features inside Pakistan's boundary file", f"{inside.sum()} of {len(j)}", ">= 98%",
          inside.mean() >= 0.98, hard=False)
    j["h3_id"] = [h3.latlng_to_cell(y, x, 6) for y, x in zip(j.lat, j.lon)]
    p = j.to_crs(PK_LAEA).geometry
    exy = np.c_[p.x, p.y]

    # Match every feature to its nearest archive site; accept by name similarity within 2 km.
    s = sites.to_crs(PK_LAEA)
    sxy = np.c_[s.geometry.x, s.geometry.y]
    site_alias = [sum((aliases(r[c]) for c in ["name", "principal_figure", "sufi_saint"]
                       if c in r and r[c]), []) for _, r in sites.iterrows()]
    site_trad = [{"Muslim Shrine": "muslim", "Hindu Temple": "hindu", "Sikh Gurdwara": "sikh",
                  "Nanakpanthi / Udasi Darbar": "sikh", "Jain Temple": "jain"}.get(c) for c in sites.category]
    rel_trad = {"muslim": "muslim", "hindu": "hindu", "sikh": "sikh", "jain": "jain"}
    tree = cKDTree(sxy)
    cand = tree.query_ball_point(exy, 2000)
    rows = []
    for i, idxs in enumerate(cand):
        r = j.iloc[i]
        ea = aliases(r["name"]) + aliases(r["name_other"][:200]) if isinstance(r["name_other"], str) else aliases(r["name"])
        et = rel_trad.get(r["religion"]) or tradition(r["name"]) or (
            "muslim" if r["kind"] == "tomb" else "hindu" if r["kind"] == "temple" else None)
        best = (None, np.nan, 0.0, "")
        for k in idxs:
            d = float(np.hypot(*(exy[i] - sxy[k])))
            sc = sim(ea, site_alias[k])
            # The farther apart, the more the names must agree.
            basis = "name" if sc >= (0.6 if d <= 300 else 0.75 if d <= 1000 else 0.9) else ""
            # Proximity rescue: within 50 m, same tradition, some name overlap. Never across
            # traditions: the Lahore Fort's Lava temple shares a pin with a Sufi shrine.
            if not basis and d <= 50 and et and et == site_trad[k] and any_overlap(ea, site_alias[k]):
                basis = "proximity+tradition"
            key = (bool(basis), sc, -d)
            if best[0] is None or key > (bool(best[3]), best[2], -best[1]):
                best = (sites.iloc[k].site_id, d, sc, basis)
        rows.append(best)
    j["archive_site_id"] = [b[0] if b[3] else None for b in rows]
    j["archive_dist_m"] = np.round([b[1] for b in rows], 1)
    j["archive_name_sim"] = [round(b[2], 3) for b in rows]
    j["match_basis"] = [b[3] for b in rows]
    j["nearest_site_id"] = [b[0] for b in rows]
    j["matched"] = j.archive_site_id.notna().astype(int)
    j["coord_decimals"] = [min(coord_decimals(a), coord_decimals(b)) for a, b in zip(j.lat, j.lon)]

    # Cross-source duplicates: OSM features carrying a Wikidata tag; otherwise within 300 m and
    # name similarity >= 0.6. Each feature gets a cluster id; one place, one cluster.
    j = j.reset_index(drop=True)
    parent = list(range(len(j)))
    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]; a = parent[a]
        return a
    def union(a, b):
        parent[find(a)] = find(b)
    qid_ix = {q: i for i, q in zip(j.index, j.source_id) if j.at[i, "source"] == "wikidata"}
    for i in j.index[(j.source == "osm") & (j.wikidata != "")]:
        if j.at[i, "wikidata"] in qid_ix:
            union(i, qid_ix[j.at[i, "wikidata"]])
    t2 = cKDTree(exy)
    for a, b in t2.query_pairs(300):
        if j.at[a, "source"] != j.at[b, "source"] and sim(aliases(j.at[a, "name"]), aliases(j.at[b, "name"])) >= 0.6:
            union(a, b)
    j["place_id"] = [f"P{find(i):05d}" for i in j.index]

    # Measure the matcher before trusting it: match_gold.tsv holds 51 pairs judged by hand
    # (same place or not). Precision is what matters most here: a false match hides a place the
    # archive lacks behind one it has, and moves an archive site's "offset" onto the wrong building.
    gold = pd.read_csv(HERE / "match_gold.tsv", sep="\t")
    g = gold.merge(j[["source", "name", "archive_site_id"]].rename(columns={"name": "external_name",
                   "archive_site_id": "got"}), on=["source", "external_name"], how="left")
    g["said_same"] = g.got == g.archive_site_id
    tp = int((g.said_same & (g.same_place == 1)).sum()); fp = int((g.said_same & (g.same_place == 0)).sum())
    fn = int((~g.said_same & (g.same_place == 1)).sum())
    found = g.got.notna() | g.archive_site_id.notna()
    check("matcher precision on hand-labelled pairs", f"{tp} / {tp + fp} = {tp / max(tp + fp, 1):.0%}",
          ">= 95%", tp / max(tp + fp, 1) >= 0.95,
          note="; ".join(f"FALSE MATCH {r.external_name} -> {r.archive_name}" for r in g[g.said_same & (g.same_place == 0)].itertuples()))
    check("matcher recall on hand-labelled pairs", f"{tp} / {tp + fn} = {tp / max(tp + fn, 1):.0%}",
          ">= 70%", tp / max(tp + fn, 1) >= 0.70, hard=False,
          note="; ".join(f"MISSED {r.external_name} -> {r.archive_name}" for r in g[~g.said_same & (g.same_place == 1)].itertuples()))

    # Then let the human verdicts win. Measured first, applied second, so the scores above are the
    # matcher's own and the outputs below never repeat an error a person has already caught.
    neg = gold[gold.same_place == 0]
    for r in neg.itertuples():
        m = (j.source == r.source) & (j.name == r.external_name) & (j.archive_site_id == r.archive_site_id)
        j.loc[m, ["archive_site_id", "match_basis"]] = [None, "rejected_by_hand"]
        j.loc[m, "matched"] = 0
    # A place is in the archive if any of its features matched an archive site.
    in_arch = j.groupby("place_id").archive_site_id.agg(lambda x: next((v for v in x if v), None))
    j["place_archive_site_id"] = j.place_id.map(in_arch)

    # --- Measurements -------------------------------------------------------------------------
    print("how much of the archive each source contains, and how far its points are")
    cov = []
    fv = set(sites[sites.support_level == "Field-verified"].site_id)
    precise = set(sites[(sites.shared_pin == 0)].site_id)
    for src in ["osm", "wikidata", "geonames"]:
        m = j[(j.source == src) & (j.matched == 1)].sort_values("archive_dist_m").drop_duplicates("archive_site_id")
        mp = m[m.archive_site_id.isin(precise)]
        mf = m[m.archive_site_id.isin(fv)]
        cov.append({"source": src, "features": int((j.source == src).sum()),
                    "archive_sites_found": len(m), "of_archive": len(sites),
                    "median_offset_m": round(mp.archive_dist_m.median(), 0) if len(mp) else None,
                    "p90_offset_m": round(mp.archive_dist_m.quantile(.9), 0) if len(mp) else None,
                    "field_verified_found": len(mf),
                    "median_offset_field_verified_m": round(mf.archive_dist_m.median(), 0) if len(mf) else None,
                    "share_coords_le_2_decimals": round(100 * (j[j.source == src].coord_decimals <= 2).mean(), 1)})
    cov = pd.DataFrame(cov)
    print(cov.to_string(index=False))
    for r in cov.itertuples():
        if r.median_offset_m is not None:
            check(f"{r.source}: median offset from archive sites it shares (unshared pins only)",
                  f"{r.median_offset_m:.0f} m over {r.archive_sites_found} sites (p90 {r.p90_offset_m:.0f} m)",
                  "recorded, not thresholded", True,
                  note="The archive's own pins have errors too (22 placeholders); this bounds the pair, not the source alone.")

    # Spot checks against the eight best-documented sites: does each source place them sanely?
    places = j.drop_duplicates("place_id")
    new_places = places[places.place_archive_site_id.isna() & j.loc[places.index, "tehsil_code"].notna()]
    check("places not in the archive (deduplicated across sources)", f"{len(new_places)}",
          "leads for a human; none enters the sheet unread (RULE 2)", True)

    # Where an open source, matched by name, puts one of the archive's own sites > 300 m from the
    # archive's pin. Not a correction: either point can be the wrong one (OSM has 437 m p90 noise;
    # the archive has 22 known placeholders). It is a list of places to look, with both points.
    placeholder = set()
    rv = GIS.parent.parent / "data/review/coordinate-review-2026-08-30.csv"
    if rv.exists():
        placeholder = set(pd.read_csv(rv).shrine)
    dis = j[(j.matched == 1) & (j.match_basis == "name") & (j.archive_dist_m > 300)
            & j.source.isin(["osm", "wikidata"])].copy()
    sl = sites.set_index("site_id")
    dis["archive_name"] = dis.archive_site_id.map(sl.name)
    dis["archive_lat"] = dis.archive_site_id.map(sl.lat)
    dis["archive_lon"] = dis.archive_site_id.map(sl.lon)
    dis["archive_pin_shared"] = dis.archive_site_id.map(sl.shared_pin)
    dis["archive_pin_in_coordinate_review"] = dis.archive_name.isin(placeholder).astype(int)
    dis = dis.sort_values(["archive_name", "archive_dist_m"])
    first = dis.drop_duplicates("archive_site_id")
    check("archive sites an open source places > 300 m from the archive's pin",
          f"{len(first)} sites ({int(first.archive_pin_in_coordinate_review.sum())} already in the 30 Aug coordinate review)",
          "listed in archive_coordinate_disagreements.csv for a human", True)

    # Write.
    out = j.drop(columns=["geometry"])
    gpd.GeoDataFrame(out, geometry=gpd.points_from_xy(out.lon, out.lat), crs=4326).to_file(
        GPKG, layer="external_sites", driver="GPKG")
    gpd.GeoDataFrame(pd.DataFrame(CHECKS), geometry=[None] * len(CHECKS)).to_file(
        GPKG, layer="external_site_checks", driver="GPKG")
    keep = ["place_id", "source", "source_id", "name", "name_ur", "kind", "religion", "lat", "lon",
            "coord_decimals", "tehsil_code", "district_code", "province_code", "h3_id",
            "archive_site_id", "archive_dist_m", "archive_name_sim", "match_basis", "place_archive_site_id", "wikidata", "url"]
    out[keep].sort_values(["place_id", "source"]).to_csv(HERE / "external_sites.csv", index=False)
    cov.to_csv(HERE / "archive_coverage_by_source.csv", index=False)
    dis[["archive_site_id", "archive_name", "archive_lat", "archive_lon", "archive_pin_shared",
         "archive_pin_in_coordinate_review", "source", "name", "lat", "lon", "archive_dist_m", "url"]].to_csv(
        HERE / "archive_coordinate_disagreements.csv", index=False)
    pd.DataFrame(CHECKS).to_csv(HERE / "checks.csv", index=False)
    fails = [c for c in CHECKS if c["result"] == "FAIL"]
    print(f"\n{len(CHECKS)} checks, {len(fails)} FAIL")
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
