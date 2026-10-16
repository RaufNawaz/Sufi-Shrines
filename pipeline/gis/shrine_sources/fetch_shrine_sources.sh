#!/bin/bash
# Fetch the three open shrine-location sources into pipeline/gis/sources/shrine_dbs/ (gitignored).
# Run from the repo root. Requires curl and the gis virtualenv's python (PY, default ~/.venvs/gis/bin/python).
#
# Each source is fetched independently. A source that fails keeps its previous file, is named in
# the summary, and makes the script exit non-zero, so a stale file is never mistaken for a fresh one.
# (16 Oct 2026: overpass-api.de returned 502 for every query, including a one-node test, and the
# kumi mirror 500 - an outage, not a query problem. Hence the mirror list.)
set -uo pipefail
PY=${PY:-~/.venvs/gis/bin/python}
HERE=pipeline/gis/shrine_sources
OUT=pipeline/gis/sources/shrine_dbs
UA="shrines-archive-gis/1.0 (research; raufnawaz.github.io/Sufi-Shrines)"   # Overpass returns 406 without one
CURL=(curl -sf --retry 3 --retry-delay 15 --retry-all-errors -A "$UA")
mkdir -p "$OUT"
FAILED=()

fetch_osm() {
  for ep in https://overpass-api.de/api/interpreter https://overpass.private.coffee/api/interpreter \
            https://overpass.kumi.systems/api/interpreter; do
    if "${CURL[@]}" -m 400 --data-urlencode "data@$HERE/overpass.ql" "$ep" -o "$OUT/osm_overpass.json.new" \
       && grep -q '"elements"' "$OUT/osm_overpass.json.new"; then
      mv "$OUT/osm_overpass.json.new" "$OUT/osm_overpass.json"; echo "osm: ok from $ep"; return 0
    fi
    echo "osm: $ep failed"
  done
  rm -f "$OUT/osm_overpass.json.new"; return 1
}

fetch_wikidata() {
  "${CURL[@]}" -m 300 -H "Accept: application/sparql-results+json" \
    --data-urlencode "query@$HERE/wikidata_classes.rq" https://query.wikidata.org/sparql -o "$OUT/wikidata.json.new" || return 1
  local roots
  roots=$("$PY" -c "
import json
b=json.load(open('$OUT/wikidata.json.new'))['results']['bindings']
keep=('Hindu temple','tomb','mausoleum','gurdwara','shrine','samadhi','dargah','Sufi lodge','Jain temple','national shrine','cave temple')
print(' '.join(sorted({'wd:'+x['class']['value'].rsplit('/',1)[1] for x in b if x['classLabel']['value'] in keep})))") || return 1
  [ -n "$roots" ] || return 1
  sed "s/ROOTS/$roots/" "$HERE/wikidata_subclass.rq.template" > "$OUT/wikidata_subclass.rq"
  "${CURL[@]}" -m 300 -H "Accept: application/sparql-results+json" \
    --data-urlencode "query@$OUT/wikidata_subclass.rq" https://query.wikidata.org/sparql -o "$OUT/wikidata_subclass.json.new" || return 1
  mv "$OUT/wikidata.json.new" "$OUT/wikidata.json"; mv "$OUT/wikidata_subclass.json.new" "$OUT/wikidata_subclass.json"
  echo "wikidata: ok"
}

fetch_geonames() {
  "${CURL[@]}" -L -m 300 -o "$OUT/PK.zip.new" https://download.geonames.org/export/dump/PK.zip || return 1
  mv "$OUT/PK.zip.new" "$OUT/PK.zip" && (cd "$OUT" && unzip -o -q PK.zip) && echo "geonames: ok"
}

fetch_osm || FAILED+=(osm)
fetch_wikidata || FAILED+=(wikidata)
fetch_geonames || FAILED+=(geonames)

shasum -a 256 "$OUT"/osm_overpass.json "$OUT"/wikidata*.json "$OUT"/PK.zip > "$OUT/fetched.sha256"
if [ ${#FAILED[@]} -gt 0 ]; then
  echo "FAILED (previous file kept, build will use it): ${FAILED[*]}"; exit 1
fi
echo "all three sources fetched"
