"""
One row per shrine-type place in Pakistan, merged from Wikidata and OpenStreetMap, Wikidata first.

Sources (downloaded by fetch_merged_sources.sh into pipeline/gis/sources/shrine_dbs/, gitignored):
  Wikidata       wikidata_subclass.json (the item set: same query, same class roots, same church
                 exclusion as external_sites.csv), wikidata_items.json (full entities),
                 wikidata_refs.json (labels and dates of what the items cite),
                 wikidata_burials.json (people whose item says they are buried at one of the items),
                 wikidata_properties.json (the live label of every property read). CC0.
  OpenStreetMap  osm_details.json, the overpass.ql selection with every tag. ODbL 1.0.
  GeoNames is left out: against the archive's own pins its median offset is 148 m (p90 1,082 m),
  against OSM's 22 m / 437 m and Wikidata's 19 m / 578 m (docs/GIS_FOUNDATION.md).

How records become places. external_sites.csv already groups records across sources (place_id,
from build_external_sites.py's name+distance matcher, which is gated on match_gold.tsv). That
grouping is the start; nothing here re-matches by name. On top of it, a Wikidata item and an OSM
element are joined when either names the other: the OSM `wikidata` tag, or the item's OSM node /
way / relation ID statements. Every join the hard links add, and every one where they disagree
with the matcher, is counted in the checks.

Precedence, per field: Wikidata if non-empty, else OSM. Coordinates likewise. `name_from`,
`coord_from`, `figure_from` (and a few more *_from columns) say which source supplied the value.

The figure columns are filled ONLY from structured statements: Wikidata P547 (commemorates),
P825 (dedicated to), people whose P119 (place of burial) is the item, and the OSM tags
buried:wikidata / subject:wikidata / subject / memorial:name. A saint's name is never parsed out
of a shrine's title (RULE 2): "Darbar Syed Ahmed Saeed Shah" does not become a figure here. P138
(named after) is kept in its own column, `named_after`, because a name is not a dedication.
Note that P825 on a Hindu temple is usually a deity: it is the figure the site is dedicated to.

A record newer than external_sites.csv has never been through the archive matcher: its place
gets archive_unchecked=1, no admin codes, and an in_archive=0 that means "not checked", not "not
in the archive". Rerun build_external_sites.py (gis venv) to close that.

Two Wikidata items for one place are allowed only when wikidata_duplicates.tsv pairs them, with
evidence; any other place carrying two QIDs fails the build.

These are LEADS, not entries. Nothing here enters the sheet without a human reading the source.

Writes, in this folder:
  merged_leads.csv         one row per place (CSV, UTF-8)
  merged_leads.json        the viewer's compact array (schema fixed; see VIEWER_KEYS)
  merged_leads_checks.csv  name,value,note: counts, fill rates, the property table, invariants

Exits non-zero if an invariant fails or if a source had to fall back to external_sites.csv.

Usage (from the repo root; Python stdlib only):
  pipeline/gis/shrine_sources/fetch_merged_sources.sh
  python pipeline/gis/shrine_sources/build_merged_leads.py
"""
import csv, json, math, re, sys
from collections import Counter, defaultdict
from pathlib import Path

HERE = Path(__file__).resolve().parent
SRC = HERE.parent / "sources/shrine_dbs"
EXT = HERE / "external_sites.csv"
GOLD = HERE / "match_gold.tsv"
# Wikidata items judged to be the same place twice (one row per duplicate QID). A place may carry
# two QIDs only if this file pairs them; any other pair fails the build. Read by eye, with evidence.
WD_DUPES = HERE / "wikidata_duplicates.tsv"
# Same-place verdicts by a person, for records the archive matcher has not seen.
VERDICTS = HERE / "archive_match_verdicts.tsv"
ARCHIVE_CSV = HERE.parents[2] / "data/shrines.csv"
EXCLUDE_WD_CLASSES = re.compile(r"church|cathedral|masonic|war graves", re.I)   # as build_external_sites.py
BBOX = (23.0, 37.5, 60.5, 77.9)          # lat min, lat max, lon min, lon max: Pakistan, roughly
DISAGREE_M = 300                         # the GIS doc's threshold
# Every property read, with the English label it had when this script was written (29 Oct 2026,
# fetched live). The build compares these with wikidata_properties.json and fails on any change.
PROPS = {"P31": "instance of", "P17": "country", "P625": "coordinate location", "P547": "commemorates",
         "P825": "dedicated to", "P119": "place of burial", "P138": "named after",
         "P140": "religion or worldview", "P571": "inception",
         "P131": "located in the administrative territorial entity", "P1435": "heritage designation",
         "P18": "image", "P11693": "OpenStreetMap node ID", "P10689": "OpenStreetMap way ID",
         "P402": "OpenStreetMap relation ID", "P569": "date of birth", "P570": "date of death"}
FIGURE_FIELDS = {"wikidata:P547", "wikidata:P825", "wikidata:P119(inverse)",
                 "osm:buried:wikidata", "osm:subject:wikidata", "osm:subject", "osm:memorial:name"}
PRECISION = {6: "millennium", 7: "century", 8: "decade", 9: "year", 10: "month", 11: "day"}
VIEWER_KEYS = ["id", "name", "name_ur", "kind", "religion", "lat", "lon", "src", "qid", "figure",
               "figure_ur", "year_built", "url", "osm_url", "wiki_en", "off_m", "disagree", "in_archive"]
COLUMNS = ["id", "name", "name_ur", "name_from", "aliases", "description", "kind", "religion",
           "religion_from", "denomination", "lat", "lon", "coord_from", "sources", "qid", "qid_duplicates", "osm_ids",
           "figure_name", "figure_name_ur", "figure_qid", "figure_born", "figure_died", "figure_from",
           "named_after", "year_built", "year_built_precision", "year_built_from", "heritage",
           "admin_label", "admin_from", "tehsil_code", "district_code", "province_code", "h3_id",
           "admin_codes_stale", "image", "wikipedia_en", "wikipedia_ur", "wikidata_url", "osm_url",
           "wd_osm_offset_m", "coord_disagreement", "in_archive", "archive_site_id",
           "archive_unchecked", "external_place_ids", "in_external_sites"]

CHECKS, FAILS = [], []


def note(name, value, text=""):
    CHECKS.append({"name": name, "value": value, "note": text})


def invariant(name, ok, value, text=""):
    note("invariant: " + name, "pass" if ok else "FAIL", f"{value}. {text}".strip(". ").strip())
    print(f"  [{'pass' if ok else 'FAIL'}] {name}: {value}")
    if not ok:
        FAILS.append(name)


def hav(a_lat, a_lon, b_lat, b_lon):
    r = math.radians
    h = (math.sin(r(b_lat - a_lat) / 2) ** 2
         + math.cos(r(a_lat)) * math.cos(r(b_lat)) * math.sin(r(b_lon - a_lon) / 2) ** 2)
    return 2 * 6371008.8 * math.asin(math.sqrt(h))


def load_json(name):
    p = SRC / name
    return json.load(open(p, encoding="utf-8")) if p.exists() else None


# --- Wikidata --------------------------------------------------------------------------------
def truthy(ent, prop):
    """Statements as wdt: reads them: preferred rank if any, else normal; never deprecated."""
    cs = [c for c in ent.get("claims", {}).get(prop, []) if c.get("rank") != "deprecated"
          and c.get("mainsnak", {}).get("snaktype") == "value"]
    pref = [c for c in cs if c.get("rank") == "preferred"]
    return [c["mainsnak"]["datavalue"]["value"] for c in (pref or cs)]


def label(ent, lang):
    return ((ent or {}).get("labels", {}).get(lang) or {}).get("value", "")


def wd_time(v):
    """('1802', 'year') from a Wikidata time value, as given; no calendar conversion."""
    m = re.match(r"([+-])(\d+)-(\d\d)-(\d\d)", v["time"])
    sign, y, mo, d = m.groups()
    y = ("-" if sign == "-" else "") + str(int(y))
    p = v.get("precision")
    txt = y if p is not None and p <= 9 else f"{y}-{mo}" if p == 10 else f"{y}-{mo}-{d}"
    if v.get("calendarmodel", "").endswith("Q1985786"):
        txt += " (Julian)"
    return txt, PRECISION.get(p, f"precision {p}")


def dates(ent, prop):
    """'1802' or '1100 (century)': the year as given, its precision named when coarser than a year."""
    out = []
    for t in truthy(ent, prop):
        txt, p = wd_time(t)
        out.append(txt if p in ("year", "month", "day") else f"{txt} ({p})")
    return "; ".join(out)


def load_wikidata():
    sub, items, refs = load_json("wikidata_subclass.json"), load_json("wikidata_items.json"), load_json("wikidata_refs.json")
    burials = load_json("wikidata_burials.json")
    if not (sub and items and refs is not None and burials):
        return None
    classes = defaultdict(list)
    for b in sub["results"]["bindings"]:
        cls = b["classLabel"]["value"]
        if EXCLUDE_WD_CLASSES.search(cls):
            continue
        q = b["item"]["value"].rsplit("/", 1)[1]
        if cls not in classes[q]:
            classes[q].append(cls)
    buried = defaultdict(list)
    for b in burials["results"]["bindings"]:
        buried[b["item"]["value"].rsplit("/", 1)[1]].append(b["person"]["value"].rsplit("/", 1)[1])
    recs = {}
    for q, cls in classes.items():
        e = items.get(q)
        if not e or "missing" in e:
            continue
        coords = truthy(e, "P625")
        if not coords:
            continue
        figs = []
        for prop, tag in (("P547", "wikidata:P547"), ("P825", "wikidata:P825")):
            figs += [(v["id"], tag) for v in truthy(e, prop) if isinstance(v, dict) and "id" in v]
        figs += [(p, "wikidata:P119(inverse)") for p in sorted(buried.get(q, []))]
        seen, figures = set(), []
        for fq, tag in figs:
            if fq in seen:
                continue
            seen.add(fq)
            fe = refs.get(fq, {})
            born, died = dates(fe, "P569"), dates(fe, "P570")
            figures.append({"qid": fq, "name": label(fe, "en"), "name_ur": label(fe, "ur"),
                            "born": born, "died": died, "from": tag})
        incs = [wd_time(t) for t in truthy(e, "P571")]
        osm_ids = ([f"node/{v}" for v in truthy(e, "P11693")] + [f"way/{v}" for v in truthy(e, "P10689")]
                   + [f"relation/{v}" for v in truthy(e, "P402")])
        sl = e.get("sitelinks", {})
        wp = lambda site, host: (f"https://{host}.wikipedia.org/wiki/" + sl[site]["title"].replace(" ", "_")) if site in sl else ""
        refl = lambda prop: "; ".join(x for x in (label(refs.get(v["id"]), "en") or v["id"]
                                                  for v in truthy(e, prop) if isinstance(v, dict) and "id" in v) if x)
        al = [a["value"] for lang in ("en", "ur") for a in e.get("aliases", {}).get(lang, [])]
        recs[q] = {"source": "wikidata", "source_id": q, "name": label(e, "en"), "name_ur": label(e, "ur"),
                   "aliases": al, "description": ((e.get("descriptions", {}).get("en") or {}).get("value", "")),
                   "kind": "; ".join(cls), "religion": refl("P140"), "denomination": "",
                   "lat": coords[0]["latitude"], "lon": coords[0]["longitude"], "n_coords": len(coords),
                   "figures": figures, "named_after": refl("P138"),
                   "year_built": "; ".join(t for t, _ in incs), "year_built_precision": "; ".join(p for _, p in incs),
                   "heritage": refl("P1435"), "admin_label": refl("P131"),
                   "image": "; ".join(truthy(e, "P18")), "wikipedia_en": wp("enwiki", "en"),
                   "wikipedia_ur": wp("urwiki", "ur"), "qid": q, "osm_links": osm_ids,
                   "url": f"https://www.wikidata.org/wiki/{q}"}
    return recs


# --- OpenStreetMap ---------------------------------------------------------------------------
def osm_wikipedia(v):
    m = re.match(r"([a-z\-]+):(.+)", v or "")
    return (m.group(1), f"https://{m.group(1)}.wikipedia.org/wiki/" + m.group(2).replace(" ", "_")) if m else ("", "")


def load_osm():
    d = load_json("osm_details.json")
    if not d:
        return None, None
    recs, tagcount = {}, Counter()
    for e in d["elements"]:
        t = e.get("tags", {})
        tagcount.update(t.keys())
        lat = e.get("lat", e.get("center", {}).get("lat"))
        lon = e.get("lon", e.get("center", {}).get("lon"))
        if lat is None:
            continue
        sid = f"{e['type']}/{e['id']}"
        kind = ("tomb" if t.get("historic") == "tomb" or "tomb" in t       # as build_external_sites.py
                else t.get("historic") if t.get("historic") in ("monument", "memorial") else "place_of_worship")
        figures = []
        for k in ("buried:wikidata", "subject:wikidata"):
            for q in [x.strip() for x in t.get(k, "").split(";") if x.strip()]:
                figures.append({"qid": q, "name": t.get(k.split(":")[0] + ":en") or t.get(k.split(":")[0], ""),
                                "name_ur": t.get(k.split(":")[0] + ":ur", ""), "born": "", "died": "", "from": "osm:" + k})
        if not figures:
            for k in ("subject", "memorial:name"):
                if t.get(k):
                    figures.append({"qid": "", "name": t.get(k + ":en") or t[k], "name_ur": t.get(k + ":ur", ""),
                                    "born": "", "died": "", "from": "osm:" + k})
                    break
        name = t.get("name:en") or t.get("name") or ""
        al = [t[k] for k in ("name", "alt_name", "alt_name:en", "alt_name:ur", "old_name", "old_name:en", "old_name:ur")
              if t.get(k) and t[k] != name]
        wl = {}
        for k in ("wikipedia", "wikipedia:en", "wikipedia:ur"):
            if not t.get(k):
                continue
            lang, url = osm_wikipedia(t[k] if k == "wikipedia" else k.split(":")[1] + ":" + t[k])
            if lang:
                wl.setdefault(lang, url)
        admin = ", ".join(x for x in (t.get("addr:city:en") or t.get("addr:city", ""), t.get("addr:district", ""),
                                      t.get("addr:province", "")) if x)
        recs[sid] = {"source": "osm", "source_id": sid, "name": name, "name_ur": t.get("name:ur", ""),
                     "aliases": al, "description": t.get("description:en") or t.get("description", ""),
                     "kind": kind, "religion": t.get("religion", ""), "denomination": t.get("denomination", ""),
                     "lat": lat, "lon": lon, "figures": figures, "named_after": "",
                     "year_built": t.get("start_date", ""), "year_built_precision": "as tagged" if t.get("start_date") else "",
                     "heritage": t.get("heritage", ""), "admin_label": admin,
                     "image": t.get("wikimedia_commons") or t.get("image", ""),
                     "wikipedia_en": wl.get("en", ""), "wikipedia_ur": wl.get("ur", ""),
                     "qid": t.get("wikidata", "").strip(), "osm_links": [],
                     "url": f"https://www.openstreetmap.org/{sid}"}
    return recs, (tagcount, d.get("osm3s", {}).get("timestamp_osm_base", ""), len(d["elements"]))


def from_ext(r):
    """The thin record external_sites.csv holds, used only when a source's fetch is missing."""
    return {"source": r["source"], "source_id": r["source_id"], "name": r["name"], "name_ur": r["name_ur"],
            "aliases": [], "description": "", "kind": r["kind"], "religion": r["religion"], "denomination": "",
            "lat": float(r["lat"]), "lon": float(r["lon"]), "figures": [], "named_after": "", "year_built": "",
            "year_built_precision": "", "heritage": "", "admin_label": "", "image": "", "wikipedia_en": "",
            "wikipedia_ur": "", "qid": r["wikidata"] if r["source"] == "osm" else r["source_id"], "osm_links": [],
            "url": r["url"]}


def main():
    ext_all = list(csv.DictReader(open(EXT, encoding="utf-8")))
    ext = {(r["source"], r["source_id"]): r for r in ext_all if r["source"] in ("osm", "wikidata")}
    fallback = []
    wd = load_wikidata()
    osm, osm_meta = load_osm()
    if wd is None:
        fallback.append("wikidata")
        wd = {k[1]: from_ext(r) for k, r in ext.items() if k[0] == "wikidata"}
    if osm is None:
        fallback.append("osm")
        osm = {k[1]: from_ext(r) for k, r in ext.items() if k[0] == "osm"}
    man = SRC / "fetch_manifest.csv"
    for r in (csv.DictReader(open(man, encoding="utf-8")) if man.exists() else []):
        note(f"fetch: {r['file']}", r["status"], f"{r['source']}, fetched {r['fetched_utc']}, sha256 {r['sha256'][:12]}")
        if r["status"] != "fetched":
            print(f"  [note] {r['file']}: {r['status']} (fetched {r['fetched_utc']})")
    invariant("both sources read from a downloaded file, not the external_sites.csv fallback", not fallback,
              "fell back for: " + ", ".join(fallback) if fallback else "both fresh",
              "A fallback record carries no figure, date, heritage or image fields")

    recs = {("wikidata", k): v for k, v in wd.items()}
    recs.update({("osm", k): v for k, v in osm.items()})
    note("records: wikidata", len(wd), "items after the church/cathedral/masonic/war-graves class exclusion")
    note("records: osm", len(osm), f"OSM base {osm_meta[1]}" if osm_meta else "fallback")
    note("records: geonames", 0, "excluded by design")
    note("external_sites.csv rows read (osm+wikidata)", len(ext), "geonames rows ignored: "
         + str(sum(r["source"] == "geonames" for r in ext_all)))
    new = sorted(f"{s}:{i}" for s, i in recs if (s, i) not in ext)
    gone = sorted(f"{s}:{i}" for s, i in ext if (s, i) not in recs)
    note("records not in external_sites.csv (new since its build)", len(new),
         "; ".join(new) + (". Not name-matched against the archive or the other source: rerun "
                           "build_external_sites.py for that" if new else ""))
    note("external_sites.csv records no longer returned by the source", len(gone),
         "; ".join(gone) + (". Dropped from the merge (the source no longer has them)" if gone else ""))

    # --- Grouping ------------------------------------------------------------------------------
    keys = sorted(recs)
    parent = {k: k for k in keys}

    def find(a):
        while parent[a] != a:
            parent[a] = parent[parent[a]]
            a = parent[a]
        return a

    by_pid = defaultdict(list)
    for k in keys:
        if k in ext:
            by_pid[ext[k]["place_id"]].append(k)
    for ks in by_pid.values():
        for k in ks[1:]:
            parent[find(k)] = find(ks[0])
    matcher_root = {k: find(k) for k in keys}

    links = set()
    for k, r in recs.items():
        if k[0] == "osm" and r["qid"] and ("wikidata", r["qid"]) in recs:
            links.add((("wikidata", r["qid"]), k, "osm wikidata tag"))
        if k[0] == "wikidata":
            for o in r["osm_links"]:
                if ("osm", o) in recs:
                    links.add((k, ("osm", o), "wikidata OSM-id statement"))
    extra, contradictions = 0, []
    for a, b, how in sorted(links):
        if find(a) != find(b):
            extra += 1
            ea, eb = ext.get(a, {}), ext.get(b, {})
            arch = {x.get("place_archive_site_id") for x in (ea, eb) if x.get("place_archive_site_id")}
            # The matcher had put both in places of their own with other members: that is a
            # contradiction, not a gap. So is a link that would join two different archive sites.
            sizes = [len(by_pid.get(x.get("place_id"), [])) for x in (ea, eb) if x]
            if len(arch) > 1 or any(s > 1 for s in sizes):
                contradictions.append(f"{a[1]} ~ {b[1]} ({how}; archive {sorted(arch) or '-'})")
            parent[find(a)] = find(b)
    note("hard links found (OSM wikidata tag, Wikidata OSM-id statements, both inside the item sets)", len(links))
    note("extra unions the hard links add beyond external_sites.csv place_id", extra)
    note("hard links that contradict the matcher", len(contradictions), "; ".join(contradictions))
    osm_tag_outside = sorted(f"{k[1]}->{r['qid']}" for k, r in recs.items()
                             if k[0] == "osm" and r["qid"] and ("wikidata", r["qid"]) not in recs)
    note("OSM wikidata tags pointing outside the Wikidata item set", len(osm_tag_outside),
         "kept as the place's qid (sources stays osm); " + "; ".join(osm_tag_outside))
    wd_osm_outside = sorted(f"{k[1]}->{o}" for k, r in recs.items() if k[0] == "wikidata"
                            for o in r["osm_links"] if ("osm", o) not in recs)
    note("Wikidata OSM-id statements pointing outside the OSM selection", len(wd_osm_outside), "; ".join(wd_osm_outside))

    groups = defaultdict(list)
    for k in keys:
        groups[find(k)].append(k)

    # --- Invariants on the grouping ---------------------------------------------------------
    member_count = Counter(k for g in groups.values() for k in g)
    invariant("every OSM/Wikidata record lands in exactly one place",
              sum(member_count.values()) == len(recs) and all(v == 1 for v in member_count.values()),
              f"{sum(member_count.values())} memberships for {len(recs)} records")
    dupe_of = {r["qid_duplicate"]: r["qid_keep"]
               for r in csv.DictReader(open(WD_DUPES, encoding="utf-8"), delimiter="	")} if WD_DUPES.exists() else {}
    conflicts, explained = [], []
    for g in groups.values():
        q = {recs[k]["qid"] for k in g if recs[k]["qid"]}
        if len(q) > 1:
            desc = " + ".join(f"{k[1]}({recs[k]['qid'] or '-'})" for k in g)
            ok = len({dupe_of.get(x, x) for x in q}) == 1
            (explained if ok else conflicts).append(desc)
    note("places carrying two QIDs that wikidata_duplicates.tsv pairs as one place", len(explained),
         "; ".join(explained))
    invariant("no place carries two different QIDs (unless paired in wikidata_duplicates.tsv)", not conflicts,
              f"{len(conflicts)} conflicts", "; ".join(conflicts))
    unused = sorted(set(dupe_of) - {recs[k]["qid"] for g in groups.values() for k in g if len(
        {recs[x]["qid"] for x in g if recs[x]["qid"]}) > 1})
    note("wikidata_duplicates.tsv rows that no longer apply", len(unused), "; ".join(unused))

    # Human archive-match verdicts for records the archive matcher never saw (newer than
    # external_sites.csv). A verdict naming an archive id that does not exist fails the build.
    verdicts = {}
    if VERDICTS.exists():
        archive_ids = {r["id"] for r in csv.DictReader(open(ARCHIVE_CSV, encoding="utf-8"))}
        for v in csv.DictReader(open(VERDICTS, encoding="utf-8"), delimiter="\t"):
            if v["same_place"] == "1":
                verdicts[(v["source"], v["source_id"])] = v["archive_site_id"]
        missing = sorted(set(verdicts.values()) - archive_ids)
        invariant("every archive_match_verdicts.tsv id exists in data/shrines.csv", not missing,
                  f"{len(verdicts)} verdicts", "; ".join(missing))
        stale = sorted(f"{s}:{i}" for s, i in verdicts if (s, i) not in member_count)
        invariant("every archive_match_verdicts.tsv record is in the sources", not stale,
                  f"{len(verdicts)} verdicts", "; ".join(stale))

    # --- One row per place --------------------------------------------------------------------
    rows = []
    for g in groups.values():
        wds = sorted((recs[k] for k in g if k[0] == "wikidata"), key=lambda x: (x["qid"] in dupe_of, x["qid"]))
        w = wds[0] if wds else None
        osms = [recs[k] for k in g if k[0] == "osm"]
        if w:
            # The OSM element the item links to (either way) first, then the nearest.
            osms.sort(key=lambda o: (not (o["qid"] == w["qid"] or o["source_id"] in w["osm_links"]),
                                     hav(w["lat"], w["lon"], o["lat"], o["lon"]), o["source_id"]))
        else:
            osms.sort(key=lambda o: (-len([v for v in o.values() if v]), o["source_id"]))
        o = osms[0] if osms else None
        order = wds[:1] + wds[1:] + osms

        def pick(field):
            for x in order:
                if x[field]:
                    return x[field], x["source"]
            return "", ""

        name, name_from = pick("name")
        if not name:
            name, name_from = pick("name_ur")
        name_ur, _ = pick("name_ur")
        religion, religion_from = pick("religion")
        denomination, _ = pick("denomination")
        desc, _ = pick("description")
        year, year_from = pick("year_built")
        prec = next((x["year_built_precision"] for x in order if x["year_built"]), "")
        heritage, _ = pick("heritage")
        admin, admin_from = pick("admin_label")
        image, _ = pick("image")
        wen, _ = pick("wikipedia_en")
        wur, _ = pick("wikipedia_ur")
        named_after, _ = pick("named_after")
        figs = next((x["figures"] for x in order if x["figures"]), [])
        primary = w or o
        lat, lon = primary["lat"], primary["lon"]
        aliases = []
        for x in order:
            for a in x["aliases"] + ([x["name"]] if x["name"] and x["name"] != name else []):
                if a and a != name and a not in aliases:
                    aliases.append(a)
        qid = (w or {}).get("qid") or next((x["qid"] for x in osms if x["qid"]), "")
        off = round(hav(w["lat"], w["lon"], o["lat"], o["lon"]), 1) if (w and o) else None
        er = ext.get((primary["source"], primary["source_id"]))
        stale = ""
        if er:
            stale = int(hav(float(er["lat"]), float(er["lon"]), lat, lon) > 1.0)
        pids = sorted({ext[k]["place_id"] for k in g if k in ext})
        arch = sorted({ext[k]["place_archive_site_id"] for k in g if k in ext and ext[k]["place_archive_site_id"]}
                      | {verdicts[k] for k in g if k in verdicts})
        rows.append({
            "id": pids[0] if pids else "N-" + g[0][1].replace("/", "-"),
            "name": name, "name_ur": name_ur, "name_from": name_from, "aliases": " | ".join(aliases),
            "description": desc, "kind": "; ".join(dict.fromkeys(x["kind"] for x in order if x["kind"])),
            "religion": religion, "religion_from": religion_from, "denomination": denomination,
            "lat": round(lat, 7), "lon": round(lon, 7), "coord_from": primary["source"],
            "sources": "wikidata+osm" if (w and o) else ("wikidata" if w else "osm"), "qid": qid,
            "qid_duplicates": " ".join(x["qid"] for x in wds[1:]),
            "osm_ids": " ".join(x["source_id"] for x in osms),
            "figure_name": " | ".join(f["name"] for f in figs), "figure_name_ur": " | ".join(f["name_ur"] for f in figs),
            "figure_qid": " | ".join(f["qid"] for f in figs), "figure_born": " | ".join(f["born"] for f in figs),
            "figure_died": " | ".join(f["died"] for f in figs),
            "figure_from": " | ".join(dict.fromkeys(f["from"] for f in figs)),
            "named_after": named_after, "year_built": year, "year_built_precision": prec, "year_built_from": year_from,
            "heritage": heritage, "admin_label": admin, "admin_from": admin_from,
            "tehsil_code": (er or {}).get("tehsil_code", ""), "district_code": (er or {}).get("district_code", ""),
            "province_code": (er or {}).get("province_code", ""), "h3_id": (er or {}).get("h3_id", ""),
            "admin_codes_stale": stale, "image": image, "wikipedia_en": wen, "wikipedia_ur": wur,
            "wikidata_url": f"https://www.wikidata.org/wiki/{qid}" if qid else "",
            "osm_url": o["url"] if o else "", "wd_osm_offset_m": "" if off is None else off,
            "coord_disagreement": "" if off is None else int(off > DISAGREE_M),
            "in_archive": int(bool(arch)), "archive_site_id": " | ".join(arch),
            "archive_unchecked": int(any(k not in ext for k in g)),
            "external_place_ids": " ".join(pids), "in_external_sites": int(bool(pids) and all(k in ext for k in g)),
            "_w": w, "_g": g, "_arch": arch})
    rows.sort(key=lambda r: r["id"])

    # --- Invariants on the rows --------------------------------------------------------------
    ids = Counter(r["id"] for r in rows)
    invariant("place ids unique", all(v == 1 for v in ids.values()), f"{len(ids)} ids for {len(rows)} rows",
              "; ".join(k for k, v in ids.items() if v > 1))
    invariant("no GeoNames record in the output",
              not any(k[0] == "geonames" for r in rows for k in r["_g"]) and not any("geonames" in r["sources"] for r in rows),
              "0 geonames records")
    bad = [r["id"] for r in rows if r["_w"] and (r["lat"] != round(r["_w"]["lat"], 7) or r["lon"] != round(r["_w"]["lon"], 7))]
    invariant("where a place has a Wikidata coordinate, the output coordinate is it", not bad,
              f"{len(bad)} mismatches", "; ".join(bad))
    badfig = [r["id"] for r in rows if r["figure_name"].strip(" |") and not (
        r["figure_from"] and set(r["figure_from"].split(" | ")) <= FIGURE_FIELDS)]
    invariant("every figure_name comes from a structured field", not badfig, f"{len(badfig)} without",
              "; ".join(badfig))
    multi_arch = [f"{r['id']}: {r['archive_site_id']}" for r in rows if len(r["_arch"]) > 1]
    invariant("no place matched to two different archive sites", not multi_arch, f"{len(multi_arch)}",
              "; ".join(multi_arch))
    out_bb = [f"{r['id']} {r['name']} ({r['lat']}, {r['lon']}, {r['coord_from']})" for r in rows
              if not (BBOX[0] <= r["lat"] <= BBOX[1] and BBOX[2] <= r["lon"] <= BBOX[3])]
    note("coordinate outliers outside Pakistan's rough bbox (lat 23-37.5, lon 60.5-77.9)", len(out_bb),
         "; ".join(out_bb) or "none")

    # Matcher precision on the hand-labelled pairs, at the place level after the hard-link unions:
    # a union that dragged a rejected pair into one place would show up here as a false match.
    rec_place = {k: r for r in rows for k in r["_g"]}
    tp = fp = 0
    false = []
    for gr in csv.DictReader(open(GOLD, encoding="utf-8"), delimiter="\t"):
        if gr["source"] not in ("osm", "wikidata"):
            continue
        hits = [rec_place[(s, i)] for (s, i), e in ext.items() if s == gr["source"] and e["name"] == gr["external_name"]
                and (s, i) in rec_place]
        said = any(gr["archive_site_id"] in r["_arch"] for r in hits)
        if said and gr["same_place"] == "1":
            tp += 1
        elif said:
            fp += 1
            false.append(f"{gr['external_name']} -> {gr['archive_name']}")
    prec = tp / max(tp + fp, 1)
    invariant("match_gold.tsv precision, place level after hard-link unions, >= 95%", prec >= 0.95,
              f"{tp} / {tp + fp} = {prec:.0%}", "; ".join(false) +
              (" (OSM and Wikidata pairs only; human verdicts already applied in external_sites.csv)"))

    # Property labels, fetched live.
    pj = load_json("wikidata_properties.json")
    live = {b["p"]["value"].rsplit("/", 1)[1]: b["label"]["value"] for b in pj["results"]["bindings"]} if pj else {}
    for p, lab in PROPS.items():
        note(f"property {p}", live.get(p, "(not fetched)"), "expected: " + lab)
    badp = [p for p, lab in PROPS.items() if live.get(p) != lab]
    invariant("every Wikidata property read has the live label this script expects", not badp or "wikidata" in fallback,
              f"{len(PROPS) - len(badp)} of {len(PROPS)} match", "; ".join(badp))

    # --- Measurements ---------------------------------------------------------------------------
    sc = Counter(r["sources"] for r in rows)
    note("places", len(rows))
    for s in ("wikidata+osm", "wikidata", "osm"):
        note(f"places: {s}", sc[s], {"wikidata+osm": "overlap", "wikidata": "only Wikidata", "osm": "only OSM"}[s])
    note("places: coordinates from wikidata", sum(r["coord_from"] == "wikidata" for r in rows))
    note("places: coordinates from osm", sum(r["coord_from"] == "osm" for r in rows))
    both = [r for r in rows if r["wd_osm_offset_m"] != ""]
    offs = sorted(r["wd_osm_offset_m"] for r in both)
    if offs:
        note("wikidata-osm offset where both: median m", offs[len(offs) // 2], f"over {len(offs)} places")
        note("wikidata-osm offset where both: p90 m", offs[int(0.9 * (len(offs) - 1))])
    dis = [r for r in both if r["coord_disagreement"] == 1]
    note(f"places whose two sources disagree by > {DISAGREE_M} m", len(dis),
         "; ".join(f"{r['id']} {r['name']} {r['wd_osm_offset_m']:.0f} m" for r in dis))
    note("places with admin_codes_stale (fetched coordinate moved > 1 m from external_sites.csv)",
         sum(r["admin_codes_stale"] == 1 for r in rows))
    note("places in the archive", sum(r["in_archive"] for r in rows))
    note("leads: places not in the archive", sum(not r["in_archive"] for r in rows),
         "includes places not yet run through the archive matcher: see 'records not in external_sites.csv'")
    note("places with archive_unchecked=1 (a record the archive matcher has not seen; in_archive=0 is "
         "not a finding for these)", sum(r["archive_unchecked"] for r in rows),
         "; ".join(f"{r['id']} {r['name']}" for r in rows if r["archive_unchecked"]))
    note("leads not in the archive and inside external_sites.csv's admin boundary",
         sum(not r["in_archive"] and bool(r["tehsil_code"]) for r in rows))
    figrows = [r for r in rows if r["figure_name"].strip(" |") or r["figure_qid"].strip(" |")]
    note("places with a figure", len(figrows), f"{100 * len(figrows) / len(rows):.1f}% of places")
    fc = Counter(f for r in figrows for f in r["figure_from"].split(" | "))
    for f in sorted(FIGURE_FIELDS):
        note(f"places with a figure from {f}", fc.get(f, 0))
    note("places with a figure QID but no English label", sum(1 for r in figrows if any(
        q and not n for q, n in zip(r["figure_qid"].split(" | "), r["figure_name"].split(" | ")))))
    note("places with named_after (P138; not counted as a figure)", sum(bool(r["named_after"]) for r in rows))
    for c in COLUMNS:
        n = sum(1 for r in rows if str(r[c]).strip(" |") != "")
        note(f"fill: {c}", n, f"{100 * n / len(rows):.1f}%")
    if osm_meta:
        tc = osm_meta[0]
        for t in ("name", "name:en", "name:ur", "alt_name", "old_name", "religion", "denomination", "historic",
                  "building", "start_date", "construction_date", "heritage", "wikipedia", "wikidata",
                  "buried:wikidata", "subject:wikidata", "subject", "memorial:name", "addr:city",
                  "addr:district", "addr:province", "image", "wikimedia_commons", "description"):
            note(f"osm tag frequency: {t}", tc.get(t, 0), f"of {osm_meta[2]} elements")

    # --- Write --------------------------------------------------------------------------------
    with open(HERE / "merged_leads.csv", "w", newline="", encoding="utf-8") as f:
        wtr = csv.DictWriter(f, fieldnames=COLUMNS, extrasaction="ignore")
        wtr.writeheader()
        wtr.writerows(rows)
    nz = lambda v: v if v not in ("", None) else None
    view = []
    for r in rows:
        yb = r["year_built"] + (f" ({r['year_built_precision']})" if r["year_built_precision"] not in ("", "year", "month", "day") else "")
        view.append({"id": r["id"], "name": nz(r["name"]), "name_ur": nz(r["name_ur"]), "kind": nz(r["kind"]),
                     "religion": nz(r["religion"]), "lat": round(r["lat"], 6), "lon": round(r["lon"], 6),
                     "src": {"wikidata+osm": "both"}.get(r["sources"], r["sources"]), "qid": nz(r["qid"]),
                     "figure": nz(r["figure_name"].strip(" |") and r["figure_name"]),
                     "figure_ur": nz(r["figure_name_ur"].strip(" |") and r["figure_name_ur"]),
                     "year_built": nz(r["year_built"] and yb), "url": r["wikidata_url"] or r["osm_url"],
                     "osm_url": nz(r["osm_url"]), "wiki_en": nz(r["wikipedia_en"]),
                     "off_m": None if r["wd_osm_offset_m"] == "" else r["wd_osm_offset_m"],
                     "disagree": r["coord_disagreement"] == 1, "in_archive": bool(r["in_archive"])})
    assert all(list(v) == VIEWER_KEYS for v in view)
    json.dump(view, open(HERE / "merged_leads.json", "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    with open(HERE / "merged_leads_checks.csv", "w", newline="", encoding="utf-8") as f:
        wtr = csv.DictWriter(f, fieldnames=["name", "value", "note"])
        wtr.writeheader()
        wtr.writerows(CHECKS)
    print(f"{len(rows)} places ({sc['wikidata+osm']} both, {sc['wikidata']} wikidata only, {sc['osm']} osm only); "
          f"{len(FAILS)} invariant(s) failed")
    sys.exit(1 if FAILS else 0)


if __name__ == "__main__":
    main()
