"""
Fetch the full Wikidata entities behind the shrine item set, and the entities they point at.
Python stdlib only. Called by fetch_merged_sources.sh; not normally run by hand.

SPARQL selects the item set (wikidata_subclass.rq.template, the same query external_sites.csv was
built from). Joining a dozen OPTIONAL properties in one SPARQL query multiplies rows and invites
timeouts, so the attributes come from the wbgetentities API instead: 50 entities per request,
every statement, labels/aliases/descriptions in en and ur, en/ur Wikipedia sitelinks. Then a
second pass fetches labels (and, for people, birth/death statements) of every entity those
statements point at: classes, commemorated figures, people buried there, religions, admin units,
heritage designations.

Polite by construction: a handful of batched requests, a User-Agent, retries with back-off on
429/5xx, and nothing re-fetched within one run.

Usage: python fetch_wikidata_entities.py <subclass.json> <burials.json> <out_dir> [<osm_details.json>]
(the OSM file, if given, adds the people its buried:wikidata / subject:wikidata tags name, so
their birth and death dates can be read too)
Writes <out_dir>/wikidata_items.json and <out_dir>/wikidata_refs.json. Exits non-zero on failure.
"""
import json, sys, time, urllib.parse, urllib.request
from pathlib import Path

UA = "shrines-archive-gis/1.0 (research; raufnawaz.github.io/Sufi-Shrines)"
API = "https://www.wikidata.org/w/api.php"
# Properties whose values are entities we need a label for. Figure-bearing ones also need dates.
REF_PROPS = ["P31", "P547", "P825", "P138", "P140", "P131", "P1435"]
FIGURE_PROPS = ["P547", "P825", "P138"]


def get(params, tries=5):
    url = API + "?" + urllib.parse.urlencode({**params, "format": "json", "formatversion": "2"})
    delay = 10
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": UA})
            with urllib.request.urlopen(req, timeout=120) as r:
                d = json.load(r)
            if "error" in d:
                raise RuntimeError(d["error"])
            return d
        except Exception as e:  # noqa: BLE001 - every failure is retried, then reported
            print(f"  wbgetentities attempt {i + 1} failed: {e}", file=sys.stderr)
            if i + 1 == tries:
                raise
            time.sleep(delay)
            delay *= 2


def fetch(ids, props):
    out = {}
    ids = sorted(set(ids))
    for k in range(0, len(ids), 50):
        d = get({"action": "wbgetentities", "ids": "|".join(ids[k:k + 50]), "props": props,
                 "languages": "en|ur", "sitefilter": "enwiki|urwiki"})
        out.update(d["entities"])
        time.sleep(1)
    return out


def qid_values(ent, prop):
    vals = []
    for c in ent.get("claims", {}).get(prop, []):
        v = c.get("mainsnak", {}).get("datavalue", {}).get("value")
        if isinstance(v, dict) and v.get("id"):
            vals.append(v["id"])
    return vals


def main():
    sub, bur, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    items = sorted({b["item"]["value"].rsplit("/", 1)[1]
                    for b in json.load(open(sub, encoding="utf-8"))["results"]["bindings"]})
    burials = json.load(open(bur, encoding="utf-8"))["results"]["bindings"]
    print(f"wikidata: {len(items)} items from the subclass query, {len(burials)} burial statements")
    ents = fetch(items, "labels|aliases|descriptions|claims|sitelinks")
    figures, others = set(), set()
    for e in ents.values():
        for p in REF_PROPS:
            (figures if p in FIGURE_PROPS else others).update(qid_values(e, p))
    figures.update(b["person"]["value"].rsplit("/", 1)[1] for b in burials)
    if len(sys.argv) > 4 and Path(sys.argv[4]).exists():
        for el in json.load(open(sys.argv[4], encoding="utf-8"))["elements"]:
            for k in ("buried:wikidata", "subject:wikidata"):
                figures.update(q.strip() for q in el.get("tags", {}).get(k, "").split(";")
                               if q.strip().startswith("Q"))
    others -= figures
    refs = fetch(figures, "labels|claims") if figures else {}
    # People's items carry hundreds of statements; keep only what the build reads.
    for e in refs.values():
        e["claims"] = {p: v for p, v in e.get("claims", {}).items() if p in ("P31", "P569", "P570")}
    refs.update(fetch(others, "labels") if others else {})
    json.dump(ents, open(out / "wikidata_items.json", "w", encoding="utf-8"), ensure_ascii=False)
    json.dump(refs, open(out / "wikidata_refs.json", "w", encoding="utf-8"), ensure_ascii=False)
    print(f"wikidata: {len(ents)} item entities, {len(refs)} referenced entities")


if __name__ == "__main__":
    main()
