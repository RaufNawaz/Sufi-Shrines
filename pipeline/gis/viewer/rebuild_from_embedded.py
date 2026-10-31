"""
Rebuild pipeline/gis/viewer/index.html from the data already embedded in it, without the GeoPackage.

build_viewer.py is the real build: it reads shrines_foundation.gpkg with geopandas. That file is not
in the repository (it is rebuilt by pipeline/gis/rebuild.sh), so on a machine without it a change to
template.html could not reach index.html at all. This script takes the gzipped, base64-encoded payload
out of the current index.html, optionally replaces the leads with the merged Wikidata + OSM file, and
puts it into template.html through the same /*__DATA__*/ null placeholder build_viewer.py fills.

Python standard library only.

Before writing, it proves the payload survives the trip: the decoded JSON, re-serialised exactly as
build_viewer.py serialises it, must equal the embedded bytes. If it does not (a float that does not
round-trip, a key order change), it refuses rather than ship a page whose numbers moved.

Usage (from the repo root):
  python pipeline/gis/viewer/rebuild_from_embedded.py
  python pipeline/gis/viewer/rebuild_from_embedded.py --leads pipeline/gis/shrine_sources/merged_leads.json
  python pipeline/gis/viewer/rebuild_from_embedded.py --places pipeline/gis/shrine_sources/district_counts/sites.csv
  python pipeline/gis/viewer/rebuild_from_embedded.py --cities pipeline/gis/sources/geonames_cities/cities1000.zip
  python pipeline/gis/viewer/rebuild_from_embedded.py --check          # round-trip only, writes nothing
"""
import argparse, base64, csv, gzip, hashlib, json, math, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The merged leads file (pipeline/gis/shrine_sources/merged_leads.json): one object per place, Wikidata
# and OSM merged with Wikidata given priority, GeoNames dropped. Exactly these keys; empty values are null.
LEAD_KEYS = ("id", "name", "name_ur", "kind", "religion", "lat", "lon", "src", "qid", "figure",
             "figure_ur", "year_built", "url", "osm_url", "wiki_en", "off_m", "disagree", "in_archive")
LEAD_SRC = {"wikidata", "osm", "both"}

PAYLOAD_RE = re.compile(r'atob\(("[A-Za-z0-9+/=]*")\)')
PLACEHOLDER_RE = re.compile(r"/\*__DATA__\*/\s*null")


# The template names its libraries as CDN tags with SRI hashes, which keeps it readable; the built page
# carries them inline (decided by Rauf, 30 October 2026), so it opens offline and cannot change under
# a reader if a CDN does. Each tag is filled from viewer/vendor/<file name>, and only when that file's
# sha384 equals the tag's integrity hash: the hash in the template is the single statement of which
# bytes the page runs.
VENDOR = HERE / "vendor"
LIB_RE = re.compile(
    r'<(?P<tag>script|link)\s+(?:rel="stylesheet"\s+href|src)="(?P<url>https://[^"]+)"\s+'
    r'integrity="(?P<sri>sha384-[A-Za-z0-9+/=]+)"\s+crossorigin="anonymous"\s*(?:/>|></script>)')
N_LIBS = 5


def inline_libs(html):
    def fill(m):
        f = VENDOR / m["url"].rsplit("/", 1)[1]
        if not f.exists():
            sys.exit(f"refusing: {f} missing; download {m['url']} into {VENDOR}")
        body = f.read_bytes()
        sri = "sha384-" + base64.b64encode(hashlib.sha384(body).digest()).decode()
        if sri != m["sri"]:
            sys.exit(f"refusing: {f.name} is {sri}, the template expects {m['sri']}")
        text = body.decode("utf-8")
        el = "script" if m["tag"] == "script" else "style"
        if re.search(rf"</{el}", text, re.I):
            sys.exit(f"refusing: {f.name} contains </{el}, which would end the inline element early")
        return f"<{el}>/* {m['url']} ({m['sri']}), inlined from viewer/vendor/ */\n{text}\n</{el}>"

    html, n = LIB_RE.subn(fill, html)
    if n != N_LIBS:
        sys.exit(f"refusing: expected {N_LIBS} library tags to inline, found {n}")
    if re.search(r'<script[^>]+src="https?:|<link[^>]+href="https?:', html):
        sys.exit("refusing: an external script or stylesheet is left after inlining")
    return html


def attach_support(data, atlas_dir=HERE.parent / "atlas"):
    """Give each indicator its native support from atlas/native_support.tsv, after
    atlas/check_native_support.py has passed: {text, n, kind, coarse}, only the parts the table states.
    An indicator whose source has no stated level gets no "support" key, and the page says nothing."""
    sys.path.insert(0, str(atlas_dir))
    import check_native_support as cns
    cns.main()                                  # exits non-zero on a stale or malformed table
    ns = {r["source_key"]: r for r in cns.load(atlas_dir / "native_support.tsv")}
    with open(atlas_dir / "atlas_codebook.csv", encoding="utf-8", newline="") as f:
        src = {r["indicator"]: r["source_key"] for r in csv.DictReader(f)}
    n = 0
    for ind in data["indicators"]:
        r = ns.get(src.get(ind["key"], ""))
        ind.pop("support", None)
        if r and r["support"]:
            sup = {"text": r["support"]}
            if r["n_units"]:
                sup["n"] = int(r["n_units"])
            if r["kind"]:
                sup["kind"] = r["kind"]
            if r["coarser_than_district"]:
                sup["coarse"] = int(r["coarser_than_district"])
            ind["support"] = sup
            n += 1
    print(f"native support: {n} of {len(data['indicators'])} indicators")


def serialise(data):
    """Exactly build_viewer.py's serialisation: compact JSON, no NaN, gzip level 9 with mtime 0."""
    raw = json.dumps(data, separators=(",", ":"), allow_nan=False).encode()
    return raw, json.dumps(base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode())


# Lead fields that are shown as text, and those that become links: checked here because the page
# puts them into popups (it escapes the text and draws only http(s) links as well).
LEAD_TEXT = ("name", "name_ur", "kind", "religion", "figure", "figure_ur", "url", "osm_url", "wiki_en")
LEAD_URLS = ("url", "osm_url", "wiki_en")


def load_leads(path):
    """Read and validate merged_leads.json. Fails loudly on any departure from the schema (RULE 4)."""
    leads = json.loads(Path(path).read_text(encoding="utf-8"))
    if not isinstance(leads, list) or not leads:
        sys.exit(f"{path}: expected a non-empty JSON array of lead objects")
    want, bad = set(LEAD_KEYS), []
    for i, l in enumerate(leads):
        if not isinstance(l, dict) or set(l) != want:
            got = set(l) if isinstance(l, dict) else type(l).__name__
            bad.append(f"#{i}: keys differ (missing {sorted(want - got) if isinstance(got, set) else '?'}, "
                       f"extra {sorted(got - want) if isinstance(got, set) else '?'})")
        elif l["src"] not in LEAD_SRC:
            bad.append(f"#{i} {l.get('id')}: src {l['src']!r} is not one of {sorted(LEAD_SRC)}")
        elif not all(isinstance(l[k], (int, float)) and not isinstance(l[k], bool) and math.isfinite(l[k])
                     for k in ("lat", "lon")):
            bad.append(f"#{i} {l.get('id')}: lat/lon not finite numbers")
        elif not (-90 <= l["lat"] <= 90 and -180 <= l["lon"] <= 180):
            bad.append(f"#{i} {l.get('id')}: lat/lon out of range")
        elif not isinstance(l["disagree"], bool) or not isinstance(l["in_archive"], bool):
            bad.append(f"#{i} {l.get('id')}: disagree and in_archive must be true/false")
        elif any(l[k] is not None and not isinstance(l[k], str) for k in LEAD_TEXT):
            bad.append(f"#{i} {l.get('id')}: {', '.join(LEAD_TEXT)} must be text or null")
        elif any(l[k] is not None and not re.fullmatch(r"https?://[^\s\"<>]+", l[k]) for k in LEAD_URLS):
            bad.append(f"#{i} {l.get('id')}: {', '.join(LEAD_URLS)} must be http(s) links or null")
        elif l["qid"] is not None and not re.fullmatch(r"Q\d+", str(l["qid"])):
            bad.append(f"#{i} {l.get('id')}: qid {l['qid']!r} is not a Wikidata id")
        elif l["year_built"] is not None and not isinstance(l["year_built"], (str, int, float)):
            bad.append(f"#{i} {l.get('id')}: year_built must be text, a number or null")
        elif l["off_m"] is not None and not isinstance(l["off_m"], (int, float)):
            bad.append(f"#{i} {l.get('id')}: off_m must be a number or null")
        if len(bad) >= 10:
            break
    if bad:
        sys.exit(f"{path}: {len(bad)}+ leads break the schema:\n  " + "\n  ".join(bad))
    ids = [l["id"] for l in leads]
    if len(set(ids)) != len(ids):
        sys.exit(f"{path}: lead ids are not unique")
    # Keep exactly the schema's keys, in the schema's order, and the coordinates at build_viewer's precision.
    return [{k: (round(l[k], 5) if k in ("lat", "lon") else l[k]) for k in LEAD_KEYS} for l in leads]


# Every shrine record from every source, grouped into places (shrine_sources/district_counts/sites.csv,
# HANDOVER 9.434): the archive, DOAM's national inventory, OSM (tiers A, B and the weaker C), Wikidata
# and GeoNames. The page filters them by source; a place two sources agree on is what Rauf counts as
# verified (30 October 2026). OSM tier C is its own source key here because it is ~65-70% precise.
PLACE_SRC = ("archive", "doam", "osm", "osmc", "wikidata", "geonames")
PLACE_TRAD = {"muslim", "hindu", "sikh", "jain", "secular", "other", "unknown"}
# Which record's point stands for the place: the most precise source first (README "Sources").
PLACE_RANK = {"archive": 0, "wikidata": 1, "osm": 2, "osmc": 2, "doam": 3, "geonames": 4}
PLACE_ID_RE = {"archive": r"[a-z0-9-]+", "doam": r"sites/\d+", "osm": r"(node|way|relation)/\d+",
               "osmc": r"(node|way|relation)/\d+", "wikidata": r"Q\d+", "geonames": r"\d+"}


def load_places(path):
    """Read sites.csv into one object per place: {id, lat, lon, trad, r: [[src, name, source_id], ...]}.
    Fails loudly on an unknown source, a malformed id, or a point outside Pakistan (RULE 4)."""
    with open(path, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    if not rows:
        sys.exit(f"{path}: no rows")
    places, bad = {}, []
    for i, r in enumerate(rows, 2):
        src = "osmc" if r["source"] == "osm" and r["tier"] == "C" else r["source"]
        try:
            lat, lon = float(r["lat"]), float(r["lon"])
        except ValueError:
            lat = lon = float("nan")
        if src not in PLACE_SRC:
            bad.append(f"line {i}: source {r['source']!r} tier {r['tier']!r}")
        elif not re.fullmatch(PLACE_ID_RE[src], r["source_id"]):
            bad.append(f"line {i}: {src} id {r['source_id']!r}")
        elif r["tradition"] not in PLACE_TRAD:
            bad.append(f"line {i}: tradition {r['tradition']!r}")
        elif not (23.5 <= lat <= 37.2 and 60.8 <= lon <= 77.9):
            bad.append(f"line {i}: point {r['lat']},{r['lon']} outside Pakistan")
        elif not re.fullmatch(r"U\d{5}", r["place"]):
            bad.append(f"line {i}: place id {r['place']!r}")
        if bad:
            if len(bad) >= 10:
                break
            continue
        p = places.setdefault(r["place"], {"id": r["place"], "best": None, "trads": set(), "r": []})
        p["r"].append([src, r["name"], r["source_id"]])
        if r["tradition"] != "unknown":
            p["trads"].add(r["tradition"])
        if p["best"] is None or PLACE_RANK[src] < p["best"][0]:
            p["best"] = (PLACE_RANK[src], round(lat, 5), round(lon, 5))
    if bad:
        sys.exit(f"{path}: rows break the schema:\n  " + "\n  ".join(bad))
    out = []
    for p in places.values():
        # The union never joins two known traditions, treating "secular" like "unknown" (it is the archive's
        # Secular / Memorial: Ranjit Singh's samadhi, Aibak's tomb), so one religious tradition is left at most.
        rel = p["trads"] - {"secular"}
        if len(rel) > 1:
            sys.exit(f"{path}: place {p['id']} mixes traditions {sorted(rel)}")
        if sum(1 for x in p["r"] if x[0] == "archive") > 1:
            sys.exit(f"{path}: place {p['id']} holds two archive rows")
        out.append({"id": p["id"], "lat": p["best"][1], "lon": p["best"][2],
                    "trad": next(iter(rel or p["trads"]), "unknown"), "r": p["r"]})
    return out


# Place names for the map (Rauf, 30 October 2026: the welfare map "does not have any city names").
# GeoNames cities1000 (every populated place over 1,000 people; CC BY 4.0), Pakistan only. Each place
# carries the lowest zoom at which its label shows: capitals always, then by population.
CITY_ZOOM = ((1_000_000, 5), (300_000, 6), (100_000, 7), (30_000, 8), (10_000, 9))


def load_cities(zip_path):
    """[[name, lat, lon, population, min_zoom, rank], ...] for Pakistan, largest first; rank 0 for the
    national capital, 1 for a provincial capital, 2 otherwise (capitals win a crowded label spot). The
    name is GeoNames' ASCII form, as the basemap writes names. Refuses a file that does not look like
    GeoNames' (RULE 4)."""
    import io, zipfile
    with zipfile.ZipFile(zip_path) as z:
        lines = io.TextIOWrapper(z.open("cities1000.txt"), encoding="utf-8").read().splitlines()
    out = []
    for l in lines:
        f = l.split("\t")
        if len(f) != 19:
            sys.exit(f"{zip_path}: a line with {len(f)} fields, GeoNames has 19")
        if f[8] != "PK":
            continue
        name, lat, lon, code, pop = (f[2] or f[1]).strip(), float(f[4]), float(f[5]), f[7], int(f[14] or 0)
        if not name or not (23.5 <= lat <= 37.2 and 60.8 <= lon <= 77.9):
            sys.exit(f"{zip_path}: bad Pakistan row {f[0]} {name!r} {lat},{lon}")
        if code in ("PPLC", "PPLA"):
            z = 5
        else:
            z = next((zz for p, zz in CITY_ZOOM if pop >= p), 10)
            if code == "PPLA2":
                z = min(z, 8)           # every district headquarters by zoom 8
        out.append([name, round(lat, 5), round(lon, 5), pop, z, {"PPLC": 0, "PPLA": 1}.get(code, 2)])
    names = {c[0] for c in out}
    missing = {"Islamabad", "Karachi", "Lahore", "Quetta", "Peshawar"} - names
    if missing or not 400 <= len(out) <= 1500:
        sys.exit(f"{zip_path}: {len(out)} Pakistan places; missing {sorted(missing)}")
    return sorted(out, key=lambda c: -c[3])


def attach_place_counts(data, sites_csv):
    """Put n_ext_verified (places two independent sources record) and n_ext_single (one source) on every
    district and province, with the verified count per million people. A place belongs to the district of
    its first-ranked member, the rule build_district_counts.py uses, and verified + single must equal that
    build's n_union_abc in every district, or nothing is written (RULE 4)."""
    rank = {"archive": 0, "wikidata": 1, "osm": 2, "doam": 3, "geonames": 4}
    with open(sites_csv, encoding="utf-8", newline="") as fh:
        rows = list(csv.DictReader(fh))
    place_dc, srcs = {}, {}
    for r in sorted(rows, key=lambda r: rank[r["source"]]):
        place_dc.setdefault(r["place"], r["district_code"])
        srcs.setdefault(r["place"], set()).add(r["source"])      # OSM tiers are one source here
    ver, one = {}, {}
    for p, s in srcs.items():
        tgt = ver if len(s) >= 2 else one
        tgt[place_dc[p]] = tgt.get(place_dc[p], 0) + 1
    dc_csv = Path(sites_csv).parent / "district_counts.csv"
    with open(dc_csv, encoding="utf-8", newline="") as fh:
        dist = {r["district_code"]: r for r in csv.DictReader(fh)}
    bad = [f"{d}: {ver.get(d, 0)} + {one.get(d, 0)} != n_union_abc {r['n_union_abc']}"
           for d, r in dist.items() if ver.get(d, 0) + one.get(d, 0) != int(float(r["n_union_abc"]))]
    if bad:
        sys.exit("refusing: verified + single places disagree with district_counts.csv:\n  " + "\n  ".join(bad[:10]))
    prov = {}
    for d, r in dist.items():
        pv = prov.setdefault(r["province_name"], [0, 0])
        pv[0] += ver.get(d, 0)
        pv[1] += one.get(d, 0)
    for unit in ("district", "province"):
        hit = 0
        for f in data[unit]["features"]:
            p = f["properties"]
            if unit == "district":
                if p["id"] not in dist:
                    continue
                v = (ver.get(p["id"], 0), one.get(p["id"], 0))
            else:
                if p["name"] not in prov:
                    continue
                v = tuple(prov[p["name"]])
            hit += 1
            p["n_ext_verified"], p["n_ext_single"] = v
            pop = p.get("pop2023")
            p["ext_verified_per_million"] = v[0] / pop * 1e6 if pop else None
        if hit != len(data[unit]["features"]):
            sys.exit(f"refusing: place counts matched {hit} of {len(data[unit]['features'])} {unit} features")
    n = sum(ver.values()), sum(one.values())
    print(f"place counts: {n[0]:,} verified and {n[1]:,} one-source places on {len(dist)} districts")


def extract(html):
    found = PAYLOAD_RE.findall(html)
    if len(found) != 1:
        sys.exit(f"expected one embedded payload (atob(\"...\")), found {len(found)}")
    literal = found[0]
    raw = gzip.decompress(base64.b64decode(json.loads(literal)))
    return literal, raw, json.loads(raw)


def sig3(v):
    """build_viewer.py's clean(): three significant figures, whole numbers from 100 up."""
    if v == 0:
        return 0
    r = round(v, max(0, 2 - int(math.floor(math.log10(abs(v))))))
    return int(r) if r == int(r) and abs(r) >= 100 else r


def restore_precision(data, atlas_dir):
    """Put the atlas CSVs' full-precision values back into the district, tehsil and province features.

    The page used to embed every value at three significant figures (build_viewer.py's clean()), and
    "Test a conjecture" fits regressions on what is embedded. This only adds digits: it refuses if any
    CSV value, rounded the old way, is not exactly the value already embedded, or if a unit or a column
    is missing. Hexagons stay as embedded (the atlas has no hexagon CSV; build_viewer.py, when it can
    be run, now writes them at full precision too)."""
    ids = {"district": "district_code", "tehsil": "tehsil_code", "province": "province_code"}
    total, bad = 0, []
    for u, idc in ids.items():
        with open(Path(atlas_dir) / f"atlas_{u}.csv", encoding="utf-8", newline="") as fh:
            rows = {r[idc]: r for r in csv.DictReader(fh)}
        for f in data[u]["features"]:
            p, r = f["properties"], rows.get(f["properties"]["id"])
            if r is None:
                bad.append(f"{u} {p['id']}: not in atlas_{u}.csv")
                continue
            for k, v in p.items():
                if k in ("id", "name") or v is None:
                    continue
                if k not in r or r[k] in ("", None):
                    bad.append(f"{u} {p['id']} {k}: embedded {v}, no value in the CSV")
                    continue
                c = float(r[k])
                if not math.isfinite(c) or (sig3(c) != v and c != v):  # already precise is fine
                    bad.append(f"{u} {p['id']} {k}: embedded {v}, CSV {c}")
                    continue
                p[k] = int(c) if c == int(c) and isinstance(v, int) else c
                total += 1
            if len(bad) > 20:
                break
    if bad:
        sys.exit("refusing to restore precision; the CSVs disagree with the page:\n  " + "\n  ".join(bad[:20]))
    print(f"precision: {total:,} values restored from {atlas_dir}")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default=HERE / "index.html", type=Path, help="page to take the data from")
    ap.add_argument("--template", default=HERE / "template.html", type=Path)
    ap.add_argument("--out", default=HERE / "index.html", type=Path)
    ap.add_argument("--leads", type=Path, help="merged_leads.json to replace the embedded leads with")
    ap.add_argument("--places", type=Path,
                    help="shrine_sources/district_counts/sites.csv: every source's records, for the source filter")
    ap.add_argument("--cities", type=Path,
                    help="GeoNames cities1000.zip: place names for the map (pipeline/gis/sources/geonames_cities/)")
    ap.add_argument("--check", action="store_true", help="check the round trip and write nothing")
    ap.add_argument("--precise", type=Path, metavar="ATLAS_DIR",
                    help="restore full precision at district, tehsil and province from atlas_*.csv")
    ap.add_argument("--no-support", action="store_true",
                    help="leave the indicators' native support as embedded (atlas/native_support.tsv)")
    a = ap.parse_args()

    literal, raw, data = extract(a.source.read_text(encoding="utf-8"))
    raw2, literal2 = serialise(data)
    if raw2 != raw:
        sys.exit("refusing: the embedded JSON does not re-serialise to the same bytes")
    print(f"round trip: {len(raw):,} bytes of JSON identical; "
          f"base64 literal {'identical' if literal2 == literal else 'differs only in the gzip header (OS byte), JSON identical'}")
    if a.check:
        return

    if a.leads:
        data["leads"] = load_leads(a.leads)
        print(f"leads: {len(data['leads'])} from {a.leads}")
        raw, literal = serialise(data)
    if a.places:
        data["places"] = load_places(a.places)
        print(f"places: {len(data['places'])} from {a.places}")
        attach_place_counts(data, a.places)
        raw, literal = serialise(data)
    if a.cities:
        data["cities"] = load_cities(a.cities)
        print(f"cities: {len(data['cities'])} place names from {a.cities}")
        raw, literal = serialise(data)
    if a.precise:
        restore_precision(data, a.precise)
        raw, literal = serialise(data)
    if not a.no_support:
        attach_support(data)
        raw2, literal2 = serialise(data)
        if raw2 != raw:
            raw, literal = raw2, literal2
    # Unchanged data keeps the original literal, so a template-only rebuild changes nothing in the
    # payload. (Re-gzipping gives the same deflate stream but a different header byte 9, the OS
    # code: zlib writes 03 on macOS and 0a on Windows.)

    tpl = a.template.read_text(encoding="utf-8")
    html, n = PLACEHOLDER_RE.subn(lambda m: literal, tpl)
    if n != 1:
        sys.exit(f"{a.template.name}: expected one /*__DATA__*/ null placeholder, found {n}")
    html = inline_libs(html)
    # newline="" keeps the template's LF endings on Windows too.
    a.out.write_text(html, encoding="utf-8", newline="")
    print(f"{a.out} {len(html) / 1e6:.1f} MB ({len(raw) / 1e6:.1f} MB of JSON): {len(data['leads'])} leads")


if __name__ == "__main__":
    main()
