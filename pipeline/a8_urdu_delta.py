# -*- coding: utf-8 -*-
"""
a8_urdu_delta.py — computes which shrines need Urdu article work, and how much.

Task A8 in docs/planning/DELEGATED_EXECUTION_PLAN.md: the 16 August English
enrichment added paragraphs and Bibliographies with no Urdu counterpart. This
script answers "which entries, and how far behind" reproducibly, so no future
session re-derives it by hand.

Method
------
English now  : the live published sheet (identical to data/shrines_final_import_2026-08-16.csv
               once imported). Fetched live so the answer is never computed against a
               stale local file — the mistake docs/HANDOVER.md §9 records twice.
English then : urdu-i18n/_english_descriptions.json — the 12 July snapshot the existing
               urdu-i18n/content/<slug>.md files were actually translated from. This is
               the only correct baseline: "what has the Urdu not seen", not "what changed
               in the import".
Buckets      : full_translation — a live row with no content/<slug>.md at all
               delta            — Urdu exists but English has moved on
               no_action        — English is unchanged, or differs ONLY by the `=====`
                                  separator artefact that was stripped from the sheet
                                  (see docs/STATUS_AND_ROADMAP.md §1.2). 87 rows are
                                  this case; treating them as stale would have tripled
                                  the apparent size of A8.

Writes urdu-i18n/a8-scope.json. Use --check to verify the committed file is current
(exits non-zero if not) — wired for CI the same way build_dictionary.py --check is.

    python3 pipeline/a8_urdu_delta.py [--check] [--offline] [--snapshot]

--offline uses data/shrines_final_import_2026-08-16.csv instead of fetching. That
file is gitignored, so it does not exist in a fresh clone; --snapshot falls back to
the committed data/shrines.json instead, which is the only offline source available
in a sandbox that cannot reach the published sheet (measured 21 August 2026: the
web session's proxy answers 403 to docs.google.com). --offline degrades to
--snapshot automatically when the CSV is absent, so the script always runs.

One caveat with --snapshot, stated rather than papered over: build-dataset drops
rows with empty coordinates, so the snapshot holds 169 of the sheet's 171 rows.
The two missing ones (darbar-hazrat-shah-gohar-peer, darbar-mian-qurban-ali-shah)
are simply absent from the buckets, and the row-count assertion below is against
whatever source was loaded, not a hardcoded 171.
"""
import csv, datetime, difflib, io, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SCOPE = os.path.join(ROOT, "urdu-i18n", "a8-scope.json")
BASELINE = os.path.join(ROOT, "urdu-i18n", "_english_descriptions.json")
CONTENT = os.path.join(ROOT, "urdu-i18n", "content")
LOCAL_CSV = os.path.join(ROOT, "data", "shrines_final_import_2026-08-16.csv")
SNAPSHOT = os.path.join(ROOT, "data", "shrines.json")

SEPARATOR = re.compile(r"\n*={10,}\n*")


def slugify(text):
    """Mirror of buildStableSlug() in src/lib/data/slugify.ts — content/<slug>.md
    is keyed by exactly this, so a drift here silently mis-buckets every row."""
    t = (text or "").lower()
    for ch, rep in (("&", " and "), ("@", " at "), ("%", " percent "), ("+", " plus ")):
        t = t.replace(ch, rep)
    # JS \w is ASCII-only; Python's is Unicode. Without the explicit class, a
    # name containing an accented letter slugifies differently here than on
    # the site, silently mispairing content (code-review finding, 21 Aug 2026).
    t = re.sub(r"[^A-Za-z0-9_\s-]", "", t)
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"-+", "-", t)
    return t.strip("-").strip()


def normalise(text):
    """Collapse the ===== separator artefact and whitespace, so a row that differs
    only by its removal is correctly seen as unchanged."""
    return re.sub(r"\s+", " ", SEPARATOR.sub("\n", text or "")).strip()


def load_english(offline, snapshot):
    if snapshot or (offline and not os.path.exists(LOCAL_CSV)):
        with open(SNAPSHOT, encoding="utf-8") as fh:
            data = json.load(fh)
        return data["rows"], f"data/shrines.json snapshot ({data.get('generated', 'undated')}, {len(data['rows'])} rows)"
    if offline:
        with open(LOCAL_CSV, newline="", encoding="utf-8") as fh:
            return list(csv.DictReader(fh)), "data/shrines_final_import_2026-08-16.csv"
    url = json.load(open(os.path.join(ROOT, "data", "csv-source.json")))["csvUrl"]
    raw = urllib.request.urlopen(url, timeout=120).read().decode("utf-8")
    # io.StringIO, never raw.splitlines() — splitlines breaks quoted multi-paragraph
    # cells before the csv module's quote-aware parser sees them, silently flattening
    # every Description. This exact bug is recorded in docs/HANDOVER.md §8c.
    return list(csv.DictReader(io.StringIO(raw))), "live published sheet"


def main():
    offline = "--offline" in sys.argv
    check = "--check" in sys.argv
    snapshot = "--snapshot" in sys.argv

    rows, source = load_english(offline, snapshot)
    baseline = json.load(open(BASELINE, encoding="utf-8"))
    have = {f[:-3] for f in os.listdir(CONTENT) if f.endswith(".md")}

    full, delta, no_action = [], [], []
    for row in rows:
        slug = slugify(row.get("Name", ""))
        new = (row.get("Description") or "").strip()
        old = (baseline.get(slug) or {}).get("desc", "").strip()
        if slug not in have:
            full.append({"slug": slug, "english_chars": len(new)})
        elif normalise(old) == normalise(new):
            no_action.append(slug)
        else:
            matcher = difflib.SequenceMatcher(None, old, new, autojunk=False)
            added = sum(j2 - j1 for tag, _, _, j1, j2 in matcher.get_opcodes()
                        if tag in ("insert", "replace"))
            delta.append({"slug": slug, "added_chars": added,
                          "old_chars": len(old), "new_chars": len(new)})

    delta.sort(key=lambda d: -d["added_chars"])

    # Nothing may vanish quietly. If the loaded source holds fewer rows than the
    # scope this replaces — which is exactly what --snapshot does, since
    # build-dataset drops rows with empty coordinates — name the dropped slugs in
    # the file itself rather than letting them disappear from every bucket.
    seen = {d["slug"] for d in full} | {d["slug"] for d in delta} | set(no_action)
    dropped = []
    if os.path.exists(SCOPE):
        previous = json.load(open(SCOPE, encoding="utf-8"))
        known = ([d["slug"] for d in previous.get("full_translation", [])]
                 + [d["slug"] for d in previous.get("delta", [])]
                 + list(previous.get("no_action", []))
                 + list(previous.get("rows_not_in_source", [])))
        dropped = sorted({s for s in known if s not in seen})

    result = {
        "_comment": ("A8 (Urdu content delta) scope. Regenerate with "
                     "pipeline/a8_urdu_delta.py. 'added_chars' counts inserted/replaced "
                     "characters, not a diff of meaning."),
        "generated": "",  # filled below: today's date, but only when content changes
        "baseline": "urdu-i18n/_english_descriptions.json",
        "english_source": source,
        "full_translation": sorted(full, key=lambda d: d["slug"]),
        "delta": delta,
        "no_action": sorted(no_action),
        "rows_not_in_source": dropped,
    }

    total = len(full) + len(delta) + len(no_action)
    if total != len(rows):
        raise SystemExit(f"FAIL: bucketed {total} rows but the sheet has {len(rows)}")

    print(f"[a8] source: {source}  rows: {len(rows)}")
    print(f"[a8]   full translation needed : {len(full):>4}  ({sum(d['english_chars'] for d in full):,} English chars)")
    print(f"[a8]   delta needed            : {len(delta):>4}  ({sum(d['added_chars'] for d in delta):,} added English chars)")
    print(f"[a8]   no action               : {len(no_action):>4}")
    if dropped:
        print(f"[a8]   in previous scope but not in this source: {len(dropped)} — {', '.join(dropped)}")

    if check:
        if not os.path.exists(SCOPE):
            raise SystemExit("FAIL: urdu-i18n/a8-scope.json missing")
        current = json.load(open(SCOPE, encoding="utf-8"))
        drift = ([d["slug"] for d in current.get("full_translation", [])] != [d["slug"] for d in result["full_translation"]]
                 or sorted(d["slug"] for d in current.get("delta", [])) != sorted(d["slug"] for d in result["delta"]))
        if drift:
            raise SystemExit("FAIL: urdu-i18n/a8-scope.json is stale — rerun without --check")
        print(f"[a8] OK — committed scope matches {source}.")
        return

    # Stamp the date only when the buckets actually change. A hardcoded or
    # always-refreshed date is how data/provenance.json came to assert a
    # provenance date months out of step with its own contents
    # (docs/HANDOVER.md §9) — the file that measures staleness must not lie
    # about its own.
    previous = json.load(open(SCOPE, encoding="utf-8")) if os.path.exists(SCOPE) else {}
    comparable = {k: v for k, v in result.items() if k != "generated"}
    unchanged = {k: v for k, v in previous.items() if k != "generated"} == comparable
    result["generated"] = previous.get("generated", "") if unchanged else datetime.date.today().isoformat()

    with open(SCOPE, "w", encoding="utf-8") as fh:
        json.dump(result, fh, ensure_ascii=False, indent=1)
    print(f"[a8] wrote {SCOPE} (generated: {result['generated']})")


if __name__ == "__main__":
    main()
