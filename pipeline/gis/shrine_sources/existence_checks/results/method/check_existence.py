"""Stage C of the shrine existence check: verify every verdict against the gathered evidence.

Reads the collected verdicts (collect_judgements.py: the Claude judges plus the mechanical pass) and, for
each place, applies in order:
  1. verbatim: each quote must appear word for word (whitespace aside) in the title or snippet of a gathered
     result with the same URL, and that URL is not the record's own page (for a place only Wikidata records,
     the Wikipedia articles its item links count as its own pages); confirmed / contradicted with no such quote become plausible, plausible with
     none becomes no_evidence;
  2. type: a place its database calls a temple, gurdwara or samadhi (or of hindu, sikh or jain tradition)
     cannot rest on evidence of a Sufi shrine or mosque, nor a Muslim tomb on a temple: no_evidence;
  3. name: some cited quote must contain a distinctive word of the place's names (as prefilter_candidates.py
     defines it); where names and quotes are in different scripts the words cannot be compared, so the
     place is listed for a hand check instead;
  4. hand spot-check corrections (--overrides), which may only demote.
Writes existence_results.csv, existence_evidence_cited.jsonl (the gathered results behind every verdict
other than no_evidence) and existence_check.json (counts, every demotion, spot-check picks).

  python check_existence.py --out out/existence [--overrides spot_check_overrides.csv]
"""
import argparse
import collections
import csv
import datetime
import json
import os
import random
import re
import urllib.parse

from gather_evidence import http_json, is_urdu
from prefilter_candidates import all_words, distinctive, matches, words

HERE = os.path.dirname(os.path.abspath(__file__))
WS = os.path.join(HERE, "workspace")
NON_MUSLIM_WORDS = re.compile(r"\b(temple|mandir|mandar|gurdwara|gurudwara|samadhi|samadh|jain)\b|مندر|گوردوارہ|سمادھی",
                              re.I)
MUSLIM_KINDS = {"sufi_shrine_or_saints_tomb", "mosque_only"}
NON_MUSLIM_KINDS = {"hindu_temple_or_samadhi", "sikh_gurdwara_or_samadhi", "jain_temple"}


def wikidata_sitelinks(qid):
    """URLs of the Wikipedia articles the Wikidata item links (cached, polite): for a place only Wikidata records,
    these are the record's own pages rather than outside evidence (the conservative reading, 31 October 2026)."""
    res = http_json("https://www.wikidata.org/w/api.php?action=wbgetentities&props=sitelinks/urls&format=json&ids="
                    + qid)
    links = res.get("entities", {}).get(qid, {}).get("sitelinks", {})
    return {l["url"] for l in links.values() if "url" in l}


def ws_norm(s):
    return " ".join((s or "").split())


def type_conflict(place, kind):
    non_muslim = place["tradition"] in ("hindu", "sikh", "jain") or any(NON_MUSLIM_WORDS.search(n)
                                                                        for n in place["names"])
    if non_muslim and kind in MUSLIM_KINDS:
        return True
    return place["tradition"] == "muslim" and not non_muslim and kind in NON_MUSLIM_KINDS


def name_check(place, quotes):
    """'ok', 'cross_script' (cannot be compared mechanically) or 'missing'."""
    nw = distinctive(place["names"])
    text = " ".join(quotes)
    if nw and matches(nw, text):
        return "ok"
    if not nw and any(ph <= set(words(text)) for ph in all_words(place["names"])):
        return "ok"
    names_urdu = all(is_urdu(n) for n in place["names"])
    if all(is_urdu(q) != names_urdu for q in quotes):
        return "cross_script"
    return "missing"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--items", default="inputs/shrine_evidence.jsonl")
    ap.add_argument("--meta", default="inputs/shrine_evidence_meta.jsonl")
    ap.add_argument("--places", default="inputs/places_to_confirm.jsonl")
    ap.add_argument("--judged", default="out/claude_judge/judged_all.jsonl")
    ap.add_argument("--out", default="out/existence")
    ap.add_argument("--seed", type=int, default=7)
    ap.add_argument("--overrides", help="CSV place_id,verdict,reason from the hand spot check; may only demote")
    a = ap.parse_args()
    out_dir = os.path.join(WS, a.out)
    os.makedirs(out_dir, exist_ok=True)
    judged_path = os.path.join(WS, a.judged)
    run_date = datetime.date.fromtimestamp(os.path.getmtime(judged_path)).isoformat()

    places = {}
    with open(os.path.join(WS, a.places), encoding="utf-8") as fh:
        for line in fh:
            p = json.loads(line)
            places[p["place_id"]] = p
    apis = {}
    with open(os.path.join(WS, a.meta), encoding="utf-8") as fh:
        for line in fh:
            m = json.loads(line)
            if "place_id" in m:
                apis[m["place_id"]] = sorted(m["hits_per_api"])
    items = {}
    with open(os.path.join(WS, a.items), encoding="utf-8") as fh:
        for line in fh:
            try:
                it = json.loads(line)
            except json.JSONDecodeError:
                continue
            items[it["id"]] = it
    with open(judged_path, encoding="utf-8") as fh:
        judged = {v["id"]: v for v in map(json.loads, fh)}
    overrides = {}
    if a.overrides:
        with open(a.overrides, encoding="utf-8") as fh:
            overrides = {r["place_id"]: r for r in csv.DictReader(fh)}

    rank = {"no_evidence": 0, "plausible": 1, "confirmed": 2, "contradicted": 2}
    rows, demoted, applied, cross_script, long_quotes, cited = [], collections.defaultdict(list), [], [], [], []
    by_verdict = collections.defaultdict(list)  # after the mechanical checks, before the hand overrides
    for pid, v in sorted(judged.items()):
        it, place = items.get(pid), places.get(pid)
        if it is None or place is None:
            raise SystemExit(f"{pid} has a verdict but no gathered evidence or no place record")
        by_url = collections.defaultdict(list)
        for r in it["results"]:
            by_url[r["url"]].append(ws_norm(r["title"] + " \n " + r["snippet"]))
        record_urls = {r.get("url") for r in place.get("records", [])}
        if place["source"] == "wikidata":
            for r in place.get("records", []):
                record_urls |= {urllib.parse.unquote(u) for u in wikidata_sitelinks(r["id"])}
        good = []
        for e in v.get("evidence") or []:
            q, u = ws_norm(e.get("quote")), (e.get("url") or "").strip()
            if q and urllib.parse.unquote(u) not in record_urls and any(q in t for t in by_url.get(u, [])):
                good.append({"url": u, "quote": q})
                if len(q.split()) >= 25:
                    long_quotes.append(pid)
        verdict, kind = v["verdict"], v.get("kind") or "unclear"

        def demote(to, why):
            nonlocal verdict
            demoted[f"{verdict}->{to} ({why})"].append(pid)
            verdict = to

        if verdict in ("confirmed", "contradicted") and not good:
            demote("plausible", "no verbatim quote")
        if verdict == "plausible" and not good:
            demote("no_evidence", "no verbatim quote")
        if verdict != "no_evidence" and type_conflict(place, kind):
            demote("no_evidence", "type conflict")
        if verdict != "no_evidence":
            nc = name_check(place, [g["quote"] for g in good])
            if nc == "missing":
                demote("no_evidence", "no distinctive name word in the quotes")
            elif nc == "cross_script":
                cross_script.append(pid)
        by_verdict[verdict].append(pid)
        ov = overrides.get(pid)
        if ov and ov["verdict"] != verdict:
            if rank[ov["verdict"]] >= rank[verdict] and ov["verdict"] != "contradicted":
                raise SystemExit(f"override for {pid} would promote {verdict} to {ov['verdict']}; overrides only demote")
            applied.append({"place_id": pid, "from": verdict, "to": ov["verdict"], "reason": ov["reason"]})
            verdict = ov["verdict"]
        if verdict == "no_evidence":
            good, kind = [], "unclear"
        else:
            cited.append({"place_id": pid, "results": it["results"]})
        rows.append({"place_id": pid, "verdict": verdict, "kind": kind,
                     "evidence_urls": "; ".join(dict.fromkeys(g["url"] for g in good)),
                     "evidence_quotes": " | ".join(g["quote"] for g in good),
                     "apis_with_hits": "; ".join(apis.get(pid, [])),
                     "model": v["judged_by"], "run_date": run_date, "_source": place["source"]})

    cols = ["place_id", "verdict", "kind", "evidence_urls", "evidence_quotes", "apis_with_hits", "model", "run_date"]
    with open(os.path.join(out_dir, "existence_results.csv"), "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, extrasaction="ignore")
        w.writeheader()
        w.writerows(rows)
    with open(os.path.join(out_dir, "existence_evidence_cited.jsonl"), "w", encoding="utf-8") as fh:
        for c in cited:
            fh.write(json.dumps(c, ensure_ascii=False) + "\n")

    by_source = collections.defaultdict(collections.Counter)
    kinds = collections.Counter()
    for r in rows:
        by_source[r["_source"]][r["verdict"]] += 1
        if r["verdict"] != "no_evidence":
            kinds[r["kind"]] += 1
    rng = random.Random(a.seed)
    judged_by_claude = {p for p, v in judged.items() if not v["judged_by"].startswith("mechanical")}
    pick = lambda pool, n: sorted(rng.sample(sorted(pool), min(n, len(pool))))
    summary = {
        "places": len(rows), "places_without_a_verdict": sorted(set(places) - set(judged)),
        "verdicts": dict(collections.Counter(r["verdict"] for r in rows)),
        "verdicts_by_source": {s: dict(c) for s, c in sorted(by_source.items())},
        "kinds_where_evidence": dict(kinds),
        "judged_by": dict(collections.Counter(v["judged_by"] for v in judged.values())),
        "demoted": {k: {"n": len(v), "places": v} for k, v in demoted.items()},
        "hand_overrides": applied, "cross_script_for_hand_check": cross_script,
        "quotes_25_words_or_more": long_quotes,
        "spot_check_confirmed": pick(by_verdict["confirmed"], 30),
        "spot_check_no_evidence_judged": pick([p for p in by_verdict["no_evidence"] if p in judged_by_claude], 10),
        "spot_check_no_evidence_mechanical": pick([p for p in by_verdict["no_evidence"] if p not in judged_by_claude], 10),
    }
    with open(os.path.join(out_dir, "existence_check.json"), "w", encoding="utf-8") as fh:
        json.dump(summary, fh, ensure_ascii=False, indent=1)
    print(json.dumps({k: (v if not isinstance(v, dict) or k != "demoted" else {d: x["n"] for d, x in v.items()})
                      for k, v in summary.items() if not k.startswith("spot") and k != "places_without_a_verdict"},
                     ensure_ascii=False, indent=1))
    print(f"places without a verdict: {len(summary['places_without_a_verdict'])}")


if __name__ == "__main__":
    main()
