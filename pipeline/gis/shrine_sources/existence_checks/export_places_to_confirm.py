"""
Export the one-source places (a place only one source records, so not verified under Rauf's two-source
rule of 30 October 2026) for an existence check outside this repository (the hybrid worker,
docs/prompts/hybrid_worker_shrine_existence.md). One JSON object per line; nothing is invented: names,
points and links are the source records' own.

Usage (from the repo root):
  python -I pipeline/gis/shrine_sources/existence_checks/export_places_to_confirm.py
"""
import csv, json, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
DC = HERE.parent / "district_counts"
LINK = {"osm": "https://www.openstreetmap.org/{}", "doam": "https://doam.gov.pk/public/{}",
        "wikidata": "https://www.wikidata.org/wiki/{}", "geonames": "https://www.geonames.org/{}"}

rows = list(csv.DictReader(open(DC / "sites.csv", encoding="utf-8")))
dist = {r["district_code"]: r for r in csv.DictReader(open(DC / "district_counts.csv", encoding="utf-8"))}
places = {}
for r in rows:
    places.setdefault(r["place"], []).append(r)
out = []
for pid, recs in places.items():
    if len({r["source"] for r in recs}) != 1 or recs[0]["source"] == "archive":
        continue
    best = recs[0]
    d = dist.get(best["district_code"], {})
    out.append({
        "place_id": pid,
        "names": sorted({r["name"] for r in recs if r["name"]}),
        "tradition": next((r["tradition"] for r in recs if r["tradition"] != "unknown"), "not stated"),
        "lat": float(best["lat"]), "lon": float(best["lon"]),
        "district": d.get("district_name", ""), "province": d.get("province_name", ""),
        "source": best["source"] + (" (weak tier C)" if best["tier"] == "C" else ""),
        "records": [{"source": r["source"], "id": r["source_id"], "name": r["name"],
                     "url": LINK[r["source"]].format(r["source_id"])} for r in recs],
    })
named = [p for p in out if p["names"]]
f = HERE / "places_to_confirm.jsonl"
with open(f, "w", encoding="utf-8", newline="\n") as fh:
    for p in named:
        fh.write(json.dumps(p, ensure_ascii=False) + "\n")
print(f"{len(named)} one-source places written to {f} ({len(out) - len(named)} unnamed left out)")
if not 3000 < len(named) < 4000:
    sys.exit("unexpected count: check sites.csv")
