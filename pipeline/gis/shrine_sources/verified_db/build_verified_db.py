"""
Build the verified shrine database: one row per place, every place of district_counts/sites.csv plus the
archive rows that have no pin, each with a tier saying how well its existence is established.

Tiers (the conservative default of 31 October 2026, with Rauf's ruling of the same day that a DOAM record
counts as documented on its own):
  verified            two or more independent sources (archive, DOAM, OSM, Wikidata, GeoNames, and a hand-judged
                      match to the colonial Punjab District Gazetteers; OSM tiers once)
  archive_documented  archive only, support_level Field-verified or Source-documented
  doam_documented     DOAM only (the government's inventory), unless the check confirmed or contradicted it
  literature_documented  a place only a published study names (Malik and Mirza's political-shrines table), with
                      no record of its own in sites.csv and so no point
  web_confirmed       one source, and the existence check found a verbatim quote naming it in its locality
  plausible           one source, the check found the name but not the locality
  unconfirmed         one source, no evidence found, or not checked (NOT "does not exist")
  contradicted        the check found the place demolished, moved or elsewhere

Inputs: district_counts/sites.csv, district_counts/district_counts.csv, data/shrines.csv, and, when present,
existence_checks/results/existence_results.csv with existence_evidence_cited.jsonl (the hybrid worker's
check, docs/prompts/hybrid_worker_shrine_existence.md), and registers/gazetteer_shrines_malik_mirza.csv with
registers/gazetteer_match_verdicts.tsv (shrines the colonial Punjab District Gazetteers name, as Malik and Mirza
list them, matched by hand; registers/README_academic.md). A `match` counts as an independent source (Rauf,
31 October 2026); a `possible` is recorded only. Likewise registers/political_shrines_malik_mirza.csv with
registers/political_shrine_match_verdicts.tsv (shrines whose families entered politics, Malik and Mirza 2022,
online appendix), whose matches count as the source malik_mirza_politics; registers/literature_places.csv holds
the shrines that table names and no other source records, added as places without a point. Nothing is invented (RULE 2): names, points and
links are the source records' own; no point is averaged or moved.

Writes shrines_verified.csv, shrines_verified.geojson (in_final = yes, with a point),
shrines_verified_codebook.csv and verified_db_checks.csv beside this file, and exits 1 if a check fails
(RULE 4).

Usage (from the repo root):
  python -I pipeline/gis/shrine_sources/verified_db/build_verified_db.py
"""
import collections
import csv
import json
import re
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
SS = HERE.parent
DC = SS / "district_counts"
RES = SS / "existence_checks" / "results"
REG = SS / "registers"
ROOT = SS.parents[2]

LINK = {"osm": "https://www.openstreetmap.org/{}", "doam": "https://doam.gov.pk/public/{}",
        "wikidata": "https://www.wikidata.org/wiki/{}", "geonames": "https://www.geonames.org/{}"}
# Most precise point first (district_counts/README.md: archive pins are the archive's own; Wikidata 19 m,
# OSM 22 m, DOAM 12 m from OSM; GeoNames median 148 m, so only when it is the only source).
COORD_ORDER = ["archive", "wikidata", "osm", "doam", "geonames"]
NAME_ORDER = ["archive", "wikidata", "osm", "doam", "geonames"]
OSM_TIER_ORDER = {"A": 0, "B": 1, "C": 2}
FINAL_TIERS = {"verified", "archive_documented", "doam_documented", "literature_documented", "web_confirmed"}
NOT_SHRINE = {"secular_tomb_or_memorial", "mosque_only", "graveyard", "buddhist_or_christian_out_of_scope"}
# The archive's traditions are Muslim, Hindu, Sikh, Nanakpanthi/Udasi, Jain and secular (CLAUDE.md). Buddhist and
# Christian sites are kept in the file, labelled, but out of the final set: the conservative reading of
# 31 October 2026, a question for Rauf.
OUT_OF_SCOPE = re.compile(r"\b(buddhist|buddha|stupa|monastery|church|cathedral|marian)\b", re.I)
ARCHIVE_DOCUMENTED = {"Field-verified", "Source-documented"}
TIERS = ["verified", "archive_documented", "doam_documented", "literature_documented", "web_confirmed", "plausible", "unconfirmed",
         "contradicted"]
ARCHIVE_KIND = {"Muslim Shrine": "sufi_shrine_or_saints_tomb", "Hindu Temple": "hindu_temple_or_samadhi",
                "Sikh Gurdwara": "sikh_gurdwara_or_samadhi", "Nanakpanthi / Udasi Darbar": "nanakpanthi_udasi_darbar",
                "Jain Temple": "jain_temple", "Secular / Memorial": "secular_tomb_or_memorial"}
ARCHIVE_TRADITION = {"Muslim Shrine": "muslim", "Hindu Temple": "hindu", "Sikh Gurdwara": "sikh",
                     "Nanakpanthi / Udasi Darbar": "other", "Jain Temple": "jain", "Secular / Memorial": "secular"}
# A source's tradition says less than the archive or the worker's evidence: "muslim" covers saints' shrines
# and the tombs of nobles alike, so it is kept apart from sufi_shrine_or_saints_tomb.
TRADITION_KIND = {"muslim": "muslim_tomb_or_shrine", "hindu": "hindu_temple_or_samadhi",
                  "sikh": "sikh_gurdwara_or_samadhi", "jain": "jain_temple", "secular": "secular_tomb_or_memorial"}
PAKISTAN_BOX = (23.5, 37.5, 60.5, 78.0)  # lat min, lat max, lon min, lon max
MULTI_SOURCE_PLACES_31_OCT = 208

COLUMNS = ["place_id", "name", "other_names", "tradition", "kind", "lat", "lon", "coord_source",
           "district_code", "province", "tier", "n_independent_sources", "sources", "source_record_ids",
           "source_urls", "archive_id", "archive_support_level", "web_verdict", "web_evidence_urls",
           "web_evidence_quotes", "colonial_gazetteer", "malik_mirza_politics", "in_final", "note"]
CODEBOOK = [
    ("place_id", "The place's id in district_counts/sites.csv (`place`); `archive:<id>` for an archive row with no pin, which sites.csv does not hold.", "sites.csv; data/shrines.csv"),
    ("name", "The name of the most authoritative record: archive, then Wikidata, OSM (tier A, B, C), DOAM, GeoNames.", "sites.csv name; data/shrines.csv Name"),
    ("other_names", "Every other distinct name the place's records give, separated by `; `.", "sites.csv name"),
    ("tradition", "First stated tradition in the same order (muslim, hindu, sikh, jain, secular, other, unknown).", "sites.csv tradition; data/shrines.csv category"),
    ("kind", "What the place is. From the existence check's evidence where it named a kind; else the archive's category and site_type; else the source's tradition (`muslim_tomb_or_shrine` when a source says only muslim). A name or evidence quote saying Buddhist, stupa, monastery, church, cathedral or Marian makes it `buddhist_or_christian_out_of_scope`. `note` says which.", "existence_results.csv kind; data/shrines.csv; sites.csv"),
    ("lat", "Latitude of the most precise source's point, unchanged. Empty for an unpinned archive row.", "sites.csv"),
    ("lon", "Longitude, as lat.", "sites.csv"),
    ("coord_source", "Which source the point is: archive, then wikidata, osm, doam; geonames only when it is the only source.", "derived"),
    ("district_code", "District code of the point's record.", "sites.csv district_code"),
    ("province", "Province of that district.", "district_counts.csv province_name"),
    ("tier", "verified / archive_documented / doam_documented / web_confirmed / plausible / unconfirmed / contradicted; rules in README.md.", "derived"),
    ("n_independent_sources", "Number of distinct sources among archive, doam, osm, wikidata, geonames, colonial_gazetteer and malik_mirza_politics (OSM tiers count once; the last two only for a hand-judged `match`).", "derived from sources"),
    ("sources", "Those sources, `; ` separated.", "sites.csv source"),
    ("source_record_ids", "Every record as `source:id`, OSM with its tier in brackets.", "sites.csv source_id, tier"),
    ("source_urls", "Each non-archive record's own page.", "built from source_id"),
    ("archive_id", "The archive row's id when the archive records the place.", "sites.csv source_id; data/shrines.csv id"),
    ("archive_support_level", "That row's support_level.", "data/shrines.csv"),
    ("web_verdict", "The existence check's verdict for a one-source place (confirmed / plausible / no_evidence / contradicted), after its quote checks and the hand spot check; empty when not checked.", "existence_results.csv verdict"),
    ("web_evidence_urls", "The outside pages the verdict rests on, `; ` separated. Never the record's own page.", "existence_results.csv evidence_urls"),
    ("web_evidence_quotes", "Word-for-word quotes from those pages' titles or snippets, ` | ` separated.", "existence_results.csv evidence_quotes"),
    ("colonial_gazetteer", "Shrines the colonial Punjab District Gazetteers name (1880s-1930s), as listed in Malik and Mirza (2015), Appendix 1, matched to this place by hand: `match` or `possible`, the appendix row, name, colonial district/tehsil and fair attendance as printed. ` | ` separated. A `match` counts as the source colonial_gazetteer; a `possible` is recorded only.", "registers/gazetteer_shrines_malik_mirza.csv; registers/gazetteer_match_verdicts.tsv"),
    ("malik_mirza_politics", "Shrines whose families were elected to the assemblies, in Malik and Mirza (2022), online appendix, Table A.1 (rows P1-P11) and Figure A.2 (rows F1-F8), matched by hand: `match` or `possible`, the row and the shrine as printed. A `match` counts as the source malik_mirza_politics; a `possible` is recorded only.", "registers/political_shrines_malik_mirza.csv; registers/political_shrine_match_verdicts.tsv"),
    ("in_final", "yes when tier is verified, archive_documented, doam_documented or web_confirmed and kind is not secular_tomb_or_memorial, mosque_only, graveyard or buddhist_or_christian_out_of_scope.", "derived"),
    ("note", "Where kind came from, and anything a reader must know about the row.", "derived"),
]


def read_csv(path):
    with open(path, encoding="utf-8", newline="") as fh:
        return list(csv.DictReader(fh))


def ws(s):
    return " ".join((s or "").split())


def main():
    sites = read_csv(DC / "sites.csv")
    province = {r["district_code"]: r["province_name"] for r in read_csv(DC / "district_counts.csv")}
    archive = {r["id"]: r for r in read_csv(ROOT / "data" / "shrines.csv")}
    web, cited = {}, {}
    if (RES / "existence_results.csv").exists():
        web = {r["place_id"]: r for r in read_csv(RES / "existence_results.csv")}
        with open(RES / "existence_evidence_cited.jsonl", encoding="utf-8") as fh:
            for line in fh:
                c = json.loads(line)
                cited[c["place_id"]] = c["results"]

    gaz = gazetteer()
    pol = political()

    places = collections.OrderedDict()
    for r in sites:
        places.setdefault(r["place"], []).append(r)

    rows = []
    for pid, recs in places.items():
        fams = sorted({r["source"] for r in recs})
        all_sources = fams + literature_sources(pid, gaz, pol)
        n = len(all_sources)

        def ordered(order):
            return sorted(recs, key=lambda r: (order.index(r["source"]), OSM_TIER_ORDER.get(r["tier"], 9)))

        by_name = ordered(NAME_ORDER)
        name = next((r["name"] for r in by_name if r["name"]), "")
        others = list(dict.fromkeys(r["name"] for r in by_name if r["name"] and r["name"] != name))
        tradition = next((r["tradition"] for r in by_name if r["tradition"] not in ("", "unknown")), "unknown")
        pt = ordered(COORD_ORDER)[0]
        arch = next((r for r in recs if r["source"] == "archive"), None)
        arow = archive.get(arch["source_id"]) if arch else None
        w = web.get(pid, {}) if len(fams) == 1 and fams[0] != "archive" else {}
        verdict = w.get("verdict", "")

        notes = []
        if verdict in ("confirmed", "plausible", "contradicted") and w.get("kind") not in ("", None, "unclear"):
            kind, kind_from = w["kind"], "kind from the existence check's evidence"
        elif arow:
            kind, kind_from = archive_kind(arow), "kind from the archive's category and site_type"
        else:
            kind = TRADITION_KIND.get(tradition, "unclear")
            kind_from = "kind from the source's tradition"
        if any(OUT_OF_SCOPE.search(t) for t in [name] + others + [w.get("evidence_quotes", "")]):
            kind, kind_from = "buddhist_or_christian_out_of_scope", "kind from the name or evidence (Buddhist or Christian site)"
        notes.append(kind_from)

        if n >= 2:
            tier = "verified"
            if len(fams) == 1:
                notes.append("verified with a published study's record as its second source")
        elif fams[0] == "archive":
            tier = "archive_documented" if arow and arow["support_level"] in ARCHIVE_DOCUMENTED else "unconfirmed"
        elif verdict == "confirmed":
            tier = "web_confirmed"
        elif fams == ["doam"] and verdict != "contradicted":
            # Rauf, 31 October 2026: the government's inventory documents a place on its own. A web
            # confirmation is kept as the stronger tier; a contradiction is left for a person to settle.
            tier = "doam_documented"
        elif verdict == "plausible":
            tier = "plausible"
        elif verdict == "contradicted":
            tier = "contradicted"
        else:
            tier = "unconfirmed"
            if not verdict:
                notes.append("not checked for outside evidence" + ("" if name else " (the records give no name)"))
        if fams == ["osm"] and all(r["tier"] == "C" for r in recs):
            notes.append("OSM weak tier C only")
        if arch and not arow:
            notes.append(f"archive id {arch['source_id']} is not in data/shrines.csv")

        rows.append({
            "place_id": pid, "name": name, "other_names": "; ".join(others), "tradition": tradition,
            "kind": kind, "lat": pt["lat"], "lon": pt["lon"], "coord_source": pt["source"],
            "district_code": pt["district_code"], "province": province.get(pt["district_code"], ""),
            "tier": tier, "n_independent_sources": n, "sources": "; ".join(all_sources),
            "source_record_ids": "; ".join(f"{r['source']}:{r['source_id']}" + (f" [{r['tier']}]" if r["source"] == "osm" else "")
                                           for r in recs),
            "source_urls": "; ".join(LINK[r["source"]].format(r["source_id"]) for r in recs if r["source"] in LINK),
            "archive_id": arch["source_id"] if arch else "", "archive_support_level": arow["support_level"] if arow else "",
            "web_verdict": verdict, "web_evidence_urls": w.get("evidence_urls", ""),
            "web_evidence_quotes": w.get("evidence_quotes", ""),
            "colonial_gazetteer": gaz.get(pid, ""), "malik_mirza_politics": pol.get(pid, ""),
            "in_final": "yes" if tier in FINAL_TIERS and kind not in NOT_SHRINE else "no",
            "note": "; ".join(notes),
        })

    pinned = {r["source_id"] for r in sites if r["source"] == "archive"}
    for aid, a in archive.items():
        if aid in pinned:
            continue
        lit = literature_sources(f"archive:{aid}", gaz, pol)
        if lit:
            tier = "verified"
        else:
            tier = "archive_documented" if a["support_level"] in ARCHIVE_DOCUMENTED else "unconfirmed"
        kind = archive_kind(a)
        rows.append({
            "place_id": f"archive:{aid}", "name": a["Name"], "other_names": "",
            "tradition": ARCHIVE_TRADITION.get(a["category"], "unknown"), "kind": kind, "lat": "", "lon": "",
            "coord_source": "", "district_code": "", "province": "", "tier": tier,
            "n_independent_sources": 1 + len(lit),
            "sources": "; ".join(["archive"] + lit), "source_record_ids": f"archive:{aid}", "source_urls": "", "archive_id": aid,
            "archive_support_level": a["support_level"], "web_verdict": "", "web_evidence_urls": "",
            "web_evidence_quotes": "", "colonial_gazetteer": gaz.get(f"archive:{aid}", ""),
            "malik_mirza_politics": pol.get(f"archive:{aid}", ""),
            "in_final": "yes" if tier in FINAL_TIERS and kind not in NOT_SHRINE else "no",
            "note": "kind from the archive's category and site_type; archive row without a pin, so not in sites.csv "
                    "and not placed (no lat/lon)" + ("; verified with a published study's record as its second source"
                                                     if lit else ""),
        })

    # Shrines a published study names that no source of sites.csv records (registers/literature_places.csv).
    for lp in read_csv(REG / "literature_places.csv") if (REG / "literature_places.csv").exists() else []:
        lit = literature_sources(lp["place_id"], gaz, pol)
        tier = "verified" if len(lit) >= 2 else "literature_documented"
        kind = "sufi_shrine_or_saints_tomb"
        rows.append({
            "place_id": lp["place_id"], "name": lp["name"], "other_names": "", "tradition": "muslim", "kind": kind,
            "lat": "", "lon": "", "coord_source": "", "district_code": lp["district_code"],
            "province": province.get(lp["district_code"], ""), "tier": tier, "n_independent_sources": len(lit),
            "sources": "; ".join(lit), "source_record_ids": "", "source_urls": "", "archive_id": "",
            "archive_support_level": "", "web_verdict": "", "web_evidence_urls": "", "web_evidence_quotes": "",
            "colonial_gazetteer": gaz.get(lp["place_id"], ""), "malik_mirza_politics": pol.get(lp["place_id"], ""),
            "in_final": "yes" if tier in FINAL_TIERS and kind not in NOT_SHRINE else "no",
            "note": "a shrine of a family Malik and Mirza record in politics ('Shrine/Gaddi'), so kind "
                    "sufi_shrine_or_saints_tomb; in no source of sites.csv; no point, because no record of the shrine "
                    f"itself was found (district as the study states it: {lp['district_as_written']}; the settlement: "
                    f"{lp['settlement_locator']})",
        })

    checks = run_checks(rows, places, sites, archive, web, cited, gaz, pol)
    write(rows, checks)
    summarise(rows)
    failed = [c for c in checks if c["pass"] != "yes"]
    for c in checks:
        print(f"{'ok  ' if c['pass'] == 'yes' else 'FAIL'} {c['check']}: {c['value']} (expected {c['expected']})")
    sys.exit(1 if failed else 0)


def literature_sources(pid, gaz, pol):
    """The published-study sources a place has a hand-judged `match` in (Rauf, 31 October 2026: they count)."""
    return [name for name, cells in (("colonial_gazetteer", gaz), ("malik_mirza_politics", pol))
            if "match:" in cells.get(pid, "")]


def political():
    """place_id -> the political-shrines matches judged by hand, as one cell."""
    if not (REG / "political_shrine_match_verdicts.tsv").exists():
        return {}
    listed = {r["row"]: r for r in read_csv(REG / "political_shrines_malik_mirza.csv")}
    out = collections.defaultdict(list)
    with open(REG / "political_shrine_match_verdicts.tsv", encoding="utf-8", newline="") as fh:
        for v in csv.DictReader(fh, delimiter="\t", quoting=csv.QUOTE_NONE):
            g = listed.get(v["row"])
            if g is None or v["verdict"] not in ("match", "possible"):
                sys.exit(f"political_shrine_match_verdicts.tsv: bad row {v}")
            out[v["place_id"]].append(f"{v['verdict']}: {g['row']} {g['shrine_as_written']} ({g['district_as_written']})")
    return {k: " | ".join(x) for k, x in out.items()}


def gazetteer():
    """place_id -> the colonial-gazetteer matches judged by hand, as one cell."""
    if not (REG / "gazetteer_match_verdicts.tsv").exists():
        return {}
    listed = {r["row"]: r for r in read_csv(REG / "gazetteer_shrines_malik_mirza.csv")}
    out = collections.defaultdict(list)
    with open(REG / "gazetteer_match_verdicts.tsv", encoding="utf-8", newline="") as fh:
        for v in csv.DictReader(fh, delimiter="\t", quoting=csv.QUOTE_NONE):
            g = listed.get(v["gazetteer_row"])
            if g is None or v["verdict"] not in ("match", "possible"):
                sys.exit(f"gazetteer_match_verdicts.tsv: bad row {v}")
            att = f", fair attendance {g['fair_attendance_as_written']}" if g["fair_attendance_as_written"] else ""
            out[v["place_id"]].append(f"{v['verdict']}: row {g['row']} {g['name_as_written']} "
                                      f"({g['colonial_district']}/{g['tehsil_as_written'] or '?'}{att})")
    return {k: " | ".join(x) for k, x in out.items()}


def summarise(rows):
    """Print the counts the README reports (they are recomputed on every build, never typed in)."""
    c = collections.Counter
    print("tiers:", dict(c(r["tier"] for r in rows)))
    admitted = [r for r in rows if r["tier"] in FINAL_TIERS]
    print("admitted by tier, removed by kind:", {k: n for k, n in c(r["kind"] for r in admitted
                                                                     if r["kind"] in NOT_SHRINE).items()})
    final = [r for r in rows if r["in_final"] == "yes"]
    print("final:", len(final), "with a point:", sum(1 for r in final if r["lat"]))
    print("final by tier:", dict(c(r["tier"] for r in final)))
    print("final by tradition:", dict(c(r["tradition"] for r in final)))
    print("final by kind:", dict(c(r["kind"] for r in final)))
    print("final by province:", dict(c(r["province"] or ("(no district)" if r["lat"] else "(no point)") for r in final)))
    one_source_checked = [r for r in rows if r["web_verdict"]]
    print("one-source places checked:", len(one_source_checked), dict(c(r["web_verdict"] for r in one_source_checked)))
    gz = [r for r in rows if r["colonial_gazetteer"]]
    print("colonial gazetteer:", len(gz), "places;", dict(c(("match" if "match:" in r["colonial_gazetteer"] else "possible", r["tier"])
                                                             for r in gz)))
    pl = [r for r in rows if r["malik_mirza_politics"]]
    print("malik_mirza_politics:", len(pl), "places;", dict(c(r["tier"] for r in pl)))
    print("web verdict by source:", {s: dict(c(r["web_verdict"] for r in one_source_checked if r["sources"] == s))
                                     for s in sorted({r["sources"] for r in one_source_checked})})


def archive_kind(a):
    st = (a.get("site_type") or "").lower()
    if st == "mosque":
        return "mosque_only"
    if st == "graveyard":
        return "graveyard"
    return ARCHIVE_KIND.get(a.get("category", ""), "unclear")


def run_checks(rows, places, sites, archive, web, cited, gaz, pol):
    checks = []

    def check(name, value, expected, ok):
        checks.append({"check": name, "value": value, "expected": expected, "pass": "yes" if ok else "no"})

    ids = collections.Counter(r["place_id"] for r in rows)
    site_ids = set(places)
    check("every place of sites.csv appears exactly once",
          sum(1 for p in site_ids if ids[p] == 1), len(site_ids), all(ids[p] == 1 for p in site_ids))
    check("no place_id repeats", max(ids.values()), 1, max(ids.values()) == 1)
    tiers = collections.Counter(r["tier"] for r in rows)
    check("tier counts sum to the row count", sum(tiers[t] for t in TIERS), len(rows),
          sum(tiers[t] for t in TIERS) == len(rows))

    bad_quote = []
    for r in rows:
        if r["tier"] != "web_confirmed":
            continue
        urls = [u for u in r["web_evidence_urls"].split("; ") if u]
        quotes = [q for q in r["web_evidence_quotes"].split(" | ") if q]
        results = cited.get(r["place_id"], [])
        texts = [ws(x["title"] + " \n " + x["snippet"]) for x in results]
        own = set(r["source_urls"].split("; "))
        if not urls or not quotes or any(u in own for u in urls) \
                or not all(any(u == x["url"] for x in results) for u in urls) \
                or not all(any(ws(q) in t for t in texts) for q in quotes):
            bad_quote.append(r["place_id"])
    check("web_confirmed rows each have a quote and an outside URL, every quote verbatim in that place's "
          "gathered evidence and every URL among its results", len(bad_quote), 0, not bad_quote)
    unknown_web = sorted(set(web) - site_ids)
    check("every existence-check result is a place of sites.csv", len(unknown_web), 0, not unknown_web)
    multi_web = [p for p in web if p in places and len({r["source"] for r in places[p]}) > 1]
    check("no existence-check result is for a place with two or more sources", len(multi_web), 0, not multi_web)

    # A pattern that compiles can still never match (31 October 2026: a heredoc turned \b into backspaces).
    fires = bool(OUT_OF_SCOPE.search("Buddhist Monastery Mohra Moradu")) and not OUT_OF_SCOPE.search("Buddhu's Tomb")
    check("the out-of-scope pattern matches 'Buddhist Monastery' and not 'Buddhu's Tomb'", fires, True, fires)
    bad_n = [r["place_id"] for r in rows if int(r["n_independent_sources"]) != len(set(r["sources"].split("; ")))]
    check("n_independent_sources agrees with sources", len(bad_n), 0, not bad_n)
    bad_final = [r["place_id"] for r in rows if r["in_final"] == "yes"
                 and (r["tier"] not in FINAL_TIERS or r["kind"] in NOT_SHRINE)]
    check("every in_final row has an admitted tier and kind", len(bad_final), 0, not bad_final)
    lo_lat, hi_lat, lo_lon, hi_lon = PAKISTAN_BOX
    out_box = [r["place_id"] for r in rows if r["lat"] and not (lo_lat <= float(r["lat"]) <= hi_lat
                                                                 and lo_lon <= float(r["lon"]) <= hi_lon)]
    check("no lat/lon outside Pakistan's box", len(out_box), 0, not out_box)
    unplaced = [r["place_id"] for r in rows if not r["lat"] and not r["place_id"].startswith(("archive:", "lit:"))]
    check("every place of sites.csv has a point", len(unplaced), 0, not unplaced)

    multi = [p for p, recs in places.items() if len({r["source"] for r in recs}) >= 2]
    check(f"places of two or more sources (was {MULTI_SOURCE_PLACES_31_OCT} on 31 October 2026; a different count "
          "means sites.csv has been rebuilt)", len(multi), MULTI_SOURCE_PLACES_31_OCT, len(multi) == MULTI_SOURCE_PLACES_31_OCT)
    by_id = {r["place_id"]: r for r in rows}
    doam_only = [p for p, recs in places.items() if {r["source"] for r in recs} == {"doam"}
                 and "match:" not in gaz.get(p, "")]
    doam_bad = [p for p in doam_only if by_id[p]["tier"] not in ("doam_documented", "web_confirmed", "contradicted")]
    check("every DOAM-only place without a gazetteer match is doam_documented, web_confirmed or contradicted", len(doam_bad), 0, not doam_bad)
    misplaced = [r["place_id"] for r in rows if r["tier"] == "doam_documented" and r["sources"] != "doam"]
    check("doam_documented rows are DOAM-only places", len(misplaced), 0, not misplaced)
    not_verified = [p for p in multi if by_id[p]["tier"] != "verified"]
    check("every place of two or more sources is verified", len(not_verified), 0, not not_verified)

    unknown_gaz = sorted(set(gaz) - set(by_id))
    check("every colonial-gazetteer match names a place of this file", len(unknown_gaz), 0, not unknown_gaz)
    unknown_pol = sorted(set(pol) - set(by_id))
    check("every political-shrines match names a place of this file", len(unknown_pol), 0, not unknown_pol)
    lit_bad = [p for p, r in by_id.items() for name, cells in (("colonial_gazetteer", gaz), ("malik_mirza_politics", pol))
               if ("match:" in cells.get(p, "")) != (name in r["sources"].split("; "))]
    check("a published study is a source exactly where one of its rows is a `match`", len(lit_bad), 0, not lit_bad)
    lit_rows = [r for r in rows if r["place_id"].startswith("lit:")]
    lit_tier = [r["place_id"] for r in lit_rows if not r["sources"] or r["lat"]
                or r["tier"] != ("verified" if int(r["n_independent_sources"]) >= 2 else "literature_documented")]
    check("every added literature place has a matching study row, no point, and the tier its sources give",
          len(lit_tier), 0, not lit_tier)
    two = [r["place_id"] for r in rows if int(r["n_independent_sources"]) >= 2 and r["tier"] != "verified"]
    check("every place of two or more sources, counting the studies, is verified", len(two), 0, not two)

    pinned = [r["source_id"] for r in sites if r["source"] == "archive"]
    arch_ids = collections.Counter(r["archive_id"] for r in rows if r["archive_id"])
    check("the archive's pinned rows each appear once, under their archive_id",
          sum(1 for a in pinned if arch_ids[a] == 1), len(pinned), all(arch_ids[a] == 1 for a in pinned))
    check("every archive row appears exactly once", sum(1 for a in archive if arch_ids[a] == 1), len(archive),
          all(arch_ids[a] == 1 for a in archive) and set(arch_ids) <= set(archive))
    return checks


def write(rows, checks):
    with open(HERE / "shrines_verified.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        w.writerows(rows)
    feats = [{"type": "Feature",
              "geometry": {"type": "Point", "coordinates": [float(r["lon"]), float(r["lat"])]},
              "properties": {k: r[k] for k in COLUMNS if k not in ("lat", "lon")}}
             for r in rows if r["in_final"] == "yes" and r["lat"]]
    with open(HERE / "shrines_verified.geojson", "w", encoding="utf-8") as fh:
        json.dump({"type": "FeatureCollection", "features": feats}, fh, ensure_ascii=False)
        fh.write("\n")
    with open(HERE / "shrines_verified_codebook.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.writer(fh)
        w.writerow(["column", "meaning", "from"])
        w.writerows(CODEBOOK)
    with open(HERE / "verified_db_checks.csv", "w", encoding="utf-8", newline="") as fh:
        w = csv.DictWriter(fh, fieldnames=["check", "value", "expected", "pass"])
        w.writeheader()
        w.writerows(checks)


if __name__ == "__main__":
    main()
