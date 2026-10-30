#!/bin/bash
# Fetch OpenStreetMap and Wikidata, with every attribute build_merged_leads.py reads, into
# pipeline/gis/sources/shrine_dbs/ (gitignored). GeoNames is not fetched: it is out of the merged
# leads (148 m median offset against the archive's pins, vs 22 m OSM and 19 m Wikidata;
# docs/GIS_FOUNDATION.md "Other shrine databases"). fetch_shrine_sources.sh still fetches it for
# build_external_sites.py.
#
# Run from the repo root. Needs curl and a python 3 (PY, default `python`); stdlib only.
#
# Each source is fetched independently into a staging file. A source that fails keeps its previous
# files, is named in the summary, and makes the script exit non-zero, so a stale file is never
# mistaken for a fresh one. fetch_manifest.csv records each file's SHA-256 and the time it was
# fetched; a file kept from an earlier run keeps its earlier fetch time.
#
# Wikidata steps (all class roots and item lists are derived from live answers, never typed):
#   1. wikidata_classes.rq          -> classes used in Pakistan; roots kept by label, as before
#   2. wikidata_subclass.rq.template -> the item set (same query as external_sites.csv)
#   3. wikidata_burials.rq.template  -> people whose item says they are buried at one of those items
#   4. fetch_wikidata_entities.py    -> full entities for the items, labels/dates for what they cite
#   5. wikidata_properties.rq        -> the live label of every property the build reads
set -uo pipefail
PY=${PY:-python}
HERE=pipeline/gis/shrine_sources
OUT=pipeline/gis/sources/shrine_dbs
UA="shrines-archive-gis/1.0 (research; raufnawaz.github.io/Sufi-Shrines)"   # Overpass returns 406 without one
CURL=(curl -sf --retry 3 --retry-delay 15 --retry-all-errors -A "$UA")
SPARQL=("${CURL[@]}" -m 300 -H "Accept: application/sparql-results+json")
WDQS=https://query.wikidata.org/sparql
mkdir -p "$OUT"
FAILED=()

fetch_osm() {
  for ep in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter \
            https://overpass.kumi.systems/api/interpreter; do
    if "${CURL[@]}" -m 400 --data-urlencode "data@$HERE/overpass_details.ql" "$ep" -o "$OUT/osm_details.json.new" \
       && grep -q '"elements"' "$OUT/osm_details.json.new"; then
      mv "$OUT/osm_details.json.new" "$OUT/osm_details.json"; echo "osm: ok from $ep"; return 0
    fi
    echo "osm: $ep failed"
  done
  rm -f "$OUT/osm_details.json.new"; return 1
}

fetch_wikidata() {
  local S="$OUT/.wd_staging"
  rm -rf "$S"; mkdir -p "$S"
  "${SPARQL[@]}" --data-urlencode "query@$HERE/wikidata_classes.rq" "$WDQS" -o "$S/wikidata.json" || return 1
  local roots
  roots=$("$PY" -c "
import json,sys
b=json.load(open(sys.argv[1],encoding='utf-8'))['results']['bindings']
keep=('Hindu temple','tomb','mausoleum','gurdwara','shrine','samadhi','dargah','Sufi lodge','Jain temple','national shrine','cave temple')
print(' '.join(sorted({'wd:'+x['class']['value'].rsplit('/',1)[1] for x in b if x['classLabel']['value'] in keep})))" "$S/wikidata.json") || return 1
  [ -n "$roots" ] || return 1
  sed "s/ROOTS/$roots/" "$HERE/wikidata_subclass.rq.template" > "$S/wikidata_subclass.rq"
  sleep 2
  "${SPARQL[@]}" --data-urlencode "query@$S/wikidata_subclass.rq" "$WDQS" -o "$S/wikidata_subclass.json" || return 1
  local items
  items=$("$PY" -c "
import json,sys
b=json.load(open(sys.argv[1],encoding='utf-8'))['results']['bindings']
print(' '.join(sorted({'wd:'+x['item']['value'].rsplit('/',1)[1] for x in b})))" "$S/wikidata_subclass.json") || return 1
  [ -n "$items" ] || return 1
  sed "s/ITEMS/$items/" "$HERE/wikidata_burials.rq.template" > "$S/wikidata_burials.rq"
  sleep 2
  "${SPARQL[@]}" --data-urlencode "query@$S/wikidata_burials.rq" "$WDQS" -o "$S/wikidata_burials.json" || return 1
  sleep 2
  "${SPARQL[@]}" --data-urlencode "query@$HERE/wikidata_properties.rq" "$WDQS" -o "$S/wikidata_properties.json" || return 1
  "$PY" "$HERE/fetch_wikidata_entities.py" "$S/wikidata_subclass.json" "$S/wikidata_burials.json" "$S" "$OUT/osm_details.json" || return 1
  for f in wikidata.json wikidata_subclass.json wikidata_subclass.rq wikidata_burials.json wikidata_burials.rq \
           wikidata_properties.json wikidata_items.json wikidata_refs.json; do
    mv "$S/$f" "$OUT/$f" || return 1
  done
  rm -rf "$S"; echo "wikidata: ok"
}

fetch_osm || FAILED+=(osm)
fetch_wikidata || FAILED+=(wikidata)

# Manifest: SHA-256 and fetch time per file. A failed source's files keep their previous row.
"$PY" - "$OUT" "${FAILED[@]}" <<'PYEOF'
import csv, hashlib, sys, datetime
from pathlib import Path
out, failed = Path(sys.argv[1]), set(sys.argv[2:])
man = out / "fetch_manifest.csv"
old = {r["file"]: r for r in csv.DictReader(open(man, encoding="utf-8"))} if man.exists() else {}
now = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
files = {"osm": ["osm_details.json"],
         "wikidata": ["wikidata.json", "wikidata_subclass.json", "wikidata_burials.json",
                      "wikidata_properties.json", "wikidata_items.json", "wikidata_refs.json"]}
rows = []
for src, fs in files.items():
    for f in fs:
        p = out / f
        if not p.exists():
            continue
        sha = hashlib.sha256(p.read_bytes()).hexdigest()
        prev = old.get(f, {})
        fetched = prev.get("fetched_utc", "") if src in failed else now
        rows.append({"source": src, "file": f, "bytes": p.stat().st_size, "sha256": sha, "fetched_utc": fetched or now,
                     "status": "kept_previous_after_failure" if src in failed else "fetched"})
w = csv.DictWriter(open(man, "w", newline="", encoding="utf-8"), fieldnames=list(rows[0]) if rows else ["file"])
w.writeheader(); w.writerows(rows)
PYEOF

if [ ${#FAILED[@]} -gt 0 ]; then
  echo "FAILED (previous file kept, build will use it or fall back to external_sites.csv): ${FAILED[*]}"; exit 1
fi
echo "both sources fetched"
