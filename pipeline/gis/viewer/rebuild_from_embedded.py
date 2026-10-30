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
  python pipeline/gis/viewer/rebuild_from_embedded.py --check          # round-trip only, writes nothing
"""
import argparse, base64, gzip, json, math, re, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent

# The merged leads file (pipeline/gis/shrine_sources/merged_leads.json): one object per place, Wikidata
# and OSM merged with Wikidata given priority, GeoNames dropped. Exactly these keys; empty values are null.
LEAD_KEYS = ("id", "name", "name_ur", "kind", "religion", "lat", "lon", "src", "qid", "figure",
             "figure_ur", "year_built", "url", "osm_url", "wiki_en", "off_m", "disagree", "in_archive")
LEAD_SRC = {"wikidata", "osm", "both"}

PAYLOAD_RE = re.compile(r'atob\(("[A-Za-z0-9+/=]*")\)')
PLACEHOLDER_RE = re.compile(r"/\*__DATA__\*/\s*null")


def serialise(data):
    """Exactly build_viewer.py's serialisation: compact JSON, no NaN, gzip level 9 with mtime 0."""
    raw = json.dumps(data, separators=(",", ":"), allow_nan=False).encode()
    return raw, json.dumps(base64.b64encode(gzip.compress(raw, 9, mtime=0)).decode())


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
        if len(bad) >= 10:
            break
    if bad:
        sys.exit(f"{path}: {len(bad)}+ leads break the schema:\n  " + "\n  ".join(bad))
    ids = [l["id"] for l in leads]
    if len(set(ids)) != len(ids):
        sys.exit(f"{path}: lead ids are not unique")
    # Keep exactly the schema's keys, in the schema's order, and the coordinates at build_viewer's precision.
    return [{k: (round(l[k], 5) if k in ("lat", "lon") else l[k]) for k in LEAD_KEYS} for l in leads]


def extract(html):
    found = PAYLOAD_RE.findall(html)
    if len(found) != 1:
        sys.exit(f"expected one embedded payload (atob(\"...\")), found {len(found)}")
    literal = found[0]
    raw = gzip.decompress(base64.b64decode(json.loads(literal)))
    return literal, raw, json.loads(raw)


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--source", default=HERE / "index.html", type=Path, help="page to take the data from")
    ap.add_argument("--template", default=HERE / "template.html", type=Path)
    ap.add_argument("--out", default=HERE / "index.html", type=Path)
    ap.add_argument("--leads", type=Path, help="merged_leads.json to replace the embedded leads with")
    ap.add_argument("--check", action="store_true", help="check the round trip and write nothing")
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
    # Unchanged data keeps the original literal, so a template-only rebuild changes nothing in the
    # payload. (Re-gzipping gives the same deflate stream but a different header byte 9, the OS
    # code: zlib writes 03 on macOS and 0a on Windows.)

    tpl = a.template.read_text(encoding="utf-8")
    html, n = PLACEHOLDER_RE.subn(lambda m: literal, tpl)
    if n != 1:
        sys.exit(f"{a.template.name}: expected one /*__DATA__*/ null placeholder, found {n}")
    # newline="" keeps the template's LF endings on Windows too.
    a.out.write_text(html, encoding="utf-8", newline="")
    print(f"{a.out} {len(html) / 1e6:.1f} MB ({len(raw) / 1e6:.1f} MB of JSON): {len(data['leads'])} leads")


if __name__ == "__main__":
    main()
