# -*- coding: utf-8 -*-
"""
build_review_queue.py — the review cockpit for the Urdu articles.

168 Urdu articles exist and none has been read by a human (docs/TODO.md §0a).
Reviewing from raw files means opening two sources per entry and diffing by
eye. This tool makes review a three-minute job:

  1. REVIEW_QUEUE.md — the priority-ordered checklist with live counts.
  2. review/<slug>.html — a side-by-side EN/UR page per entry (gitignored;
     regenerate any time). English on the left, Urdu (RTL, Nastaliq via the
     reader's system fonts) on the right.
  3. reviewed.json — the ledger. An entry is "reviewed" only while the hashes
     of BOTH texts still match what the reviewer saw; edit either side and the
     entry drops back to unreviewed automatically (an invariant, not an
     intention — CLAUDE.md RULE 4).

Usage:
    python3 urdu-i18n/build_review_queue.py                 # regenerate queue + pages
    python3 urdu-i18n/build_review_queue.py --mark SLUG --reviewer NAME
                                                            # record a completed review
    python3 urdu-i18n/build_review_queue.py --check         # exit 1 if REVIEW_QUEUE.md is stale

English source: data/shrines.json (the committed snapshot; the live sheet is
unreachable from the web sandbox). The two rows build-dataset drops for empty
coordinates fall back to urdu-i18n/_english_descriptions.json, and the queue
says so per-entry rather than hiding it.

Priority order: the eight high-value entries named in docs/TODO.md §0a, then
guided-tour stops (a tour walks a reader straight into them), then everything
else, longest Urdu first (longer prose = more surface for drift).
"""
import argparse, datetime, glob, hashlib, html, json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, "urdu-i18n")
CONTENT = os.path.join(OUT, "content")
LEDGER = os.path.join(OUT, "reviewed.json")
QUEUE = os.path.join(OUT, "REVIEW_QUEUE.md")
REVIEW_DIR = os.path.join(OUT, "review")
SNAPSHOT = os.path.join(ROOT, "data", "shrines.json")
BASELINE = os.path.join(OUT, "_english_descriptions.json")
TOURS = os.path.join(ROOT, "src", "data", "tours.json")

# docs/TODO.md §0a — most new prose and highest traffic, reviewed first.
TOP_PRIORITY = [
    "shrine-of-mauj-darya-bukhari",
    "shrine-of-shah-jamal",
    "shrine-of-shah-inayat-qadiri",
    "shrine-of-peer-makki",
    "data-darbar",
    "shrine-of-bibi-pak-daman",
    "tomb-of-allama-iqbal-mazar-e-iqbal",
    "allo-mahar",
]


def slugify(text):
    """Mirror of buildStableSlug() in src/lib/data/slugify.ts."""
    t = (text or "").lower()
    for ch, rep in (("&", " and "), ("@", " at "), ("%", " percent "), ("+", " plus ")):
        t = t.replace(ch, rep)
    t = re.sub(r"[^\w\s-]", "", t)
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"-+", "-", t)
    return t.strip("-").strip()


def sha(text):
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_ledger():
    if os.path.exists(LEDGER):
        with open(LEDGER, encoding="utf-8") as fh:
            return json.load(fh)
    return {}


def load_entries():
    """slug -> {name, english, english_source, urdu} for every Urdu article."""
    rows = json.load(open(SNAPSHOT, encoding="utf-8"))["rows"]
    by_slug = {slugify(r.get("Name", "")): r for r in rows}
    baseline = json.load(open(BASELINE, encoding="utf-8"))

    entries = {}
    for path in sorted(glob.glob(os.path.join(CONTENT, "*.md"))):
        slug = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as fh:
            urdu = fh.read().strip()
        if not urdu:
            continue
        row = by_slug.get(slug)
        if row is not None:
            english = (row.get("Description") or "").strip()
            name = row.get("Name", slug)
            source = "data/shrines.json"
        elif slug in baseline:
            english = (baseline[slug].get("desc") or "").strip()
            name = baseline[slug].get("name", slug)
            source = "_english_descriptions.json (row dropped from snapshot: no coordinates)"
        else:
            english, name, source = "", slug, "NO ENGLISH FOUND"
        entries[slug] = {"name": name, "english": english, "english_source": source, "urdu": urdu}
    return entries


def review_state(slug, entry, ledger):
    """'reviewed' | 'stale' | 'unreviewed' — stale means either text changed
    after the recorded review, so it must be re-read (RULE 4)."""
    rec = ledger.get(slug)
    if not rec:
        return "unreviewed"
    if rec.get("en_sha256") == sha(entry["english"]) and rec.get("ur_sha256") == sha(entry["urdu"]):
        return "reviewed"
    return "stale"


def tour_slugs():
    slugs = set()
    try:
        for t in json.load(open(TOURS, encoding="utf-8")):
            for s in t.get("stops", []):
                slugs.add(s["shrineSlug"])
    except Exception:
        pass
    return slugs


def ordered(entries):
    tours = tour_slugs()

    def key(item):
        slug, e = item
        if slug in TOP_PRIORITY:
            return (0, TOP_PRIORITY.index(slug))
        if slug in tours:
            return (1, -len(e["urdu"]))
        return (2, -len(e["urdu"]))

    return sorted(entries.items(), key=key)


# Deliberately zero external assets: the reviewer may open this offline.
PAGE_TMPL = """<!doctype html>
<meta charset="utf-8">
<title>Review: {name}</title>
<style>
  body {{ font-family: Georgia, serif; margin: 0; background: #faf8f4; color: #1a1a1a; }}
  header {{ padding: 1rem 2rem; border-bottom: 1px solid #ddd; background: #fff; }}
  header h1 {{ font-size: 1.1rem; margin: 0; }}
  header p {{ margin: .3rem 0 0; font-size: .85rem; color: #666; }}
  main {{ display: grid; grid-template-columns: 1fr 1fr; gap: 0; }}
  section {{ padding: 1.5rem 2rem; overflow-wrap: break-word; }}
  section.en {{ border-inline-end: 1px solid #ddd; background: #fff; }}
  section.ur {{ direction: rtl; font-family: "Noto Nastaliq Urdu", "Jameel Noori Nastaleeq", serif;
                line-height: 2.1; font-size: 1.05rem; }}
  h2 {{ font-size: .95rem; border-bottom: 1px solid #eee; padding-bottom: .3rem; }}
  pre {{ white-space: pre-wrap; font: inherit; margin: 0; }}
  .cmd {{ font-family: ui-monospace, monospace; background: #f2efe9; padding: .15rem .4rem; }}
</style>
<header>
  <h1>{name} <span style="color:#999">({slug})</span></h1>
  <p>English source: {english_source} · when done:
     <span class="cmd">python3 urdu-i18n/build_review_queue.py --mark {slug} --reviewer "YOUR NAME"</span></p>
</header>
<main>
  <section class="en"><h2>English (what the Urdu should say)</h2><pre>{english}</pre></section>
  <section class="ur"><h2>اردو (زیرِ جائزہ)</h2><pre>{urdu}</pre></section>
</main>
"""


def write_pages(entries):
    os.makedirs(REVIEW_DIR, exist_ok=True)
    for slug, e in entries.items():
        page = PAGE_TMPL.format(
            slug=slug,
            name=html.escape(e["name"]),
            english_source=html.escape(e["english_source"]),
            english=html.escape(e["english"]) or "(no English text found)",
            urdu=html.escape(e["urdu"]),
        )
        with open(os.path.join(REVIEW_DIR, f"{slug}.html"), "w", encoding="utf-8") as fh:
            fh.write(page)


def build_queue_md(entries, ledger):
    items = ordered(entries)
    states = {slug: review_state(slug, e, ledger) for slug, e in items}
    reviewed = sum(1 for s in states.values() if s == "reviewed")
    stale = sum(1 for s in states.values() if s == "stale")
    unreviewed = len(items) - reviewed - stale

    lines = [
        "# Urdu review queue",
        "",
        f"_Generated by `build_review_queue.py`. Do not hand-edit — regenerate instead._",
        "",
        f"**{len(items)} articles · {reviewed} reviewed · {stale} stale (text changed after review — re-read) · {unreviewed} unreviewed.**",
        "",
        "Open `urdu-i18n/review/<slug>.html` (gitignored — run this script to regenerate) for a",
        "side-by-side reading view. Record a finished review with:",
        "",
        '    python3 urdu-i18n/build_review_queue.py --mark <slug> --reviewer "Name"',
        "",
        "A review is pinned to the exact texts read (SHA-256 of both sides in `reviewed.json`);",
        "editing either side drops the entry back to **stale** automatically.",
        "",
        "| # | state | slug | shrine | urdu chars | notes |",
        "|---|---|---|---|---:|---|",
    ]
    tours = tour_slugs()
    mark = {"reviewed": "✅", "stale": "⚠️ stale", "unreviewed": "—"}
    for i, (slug, e) in enumerate(items, 1):
        notes = []
        if slug in TOP_PRIORITY:
            notes.append("top-8")
        if slug in tours:
            notes.append("tour stop")
        if "dropped" in e["english_source"]:
            notes.append("EN from baseline (row lacks coordinates)")
        if e["english_source"] == "NO ENGLISH FOUND":
            notes.append("**NO ENGLISH FOUND**")
        lines.append(
            f"| {i} | {mark[states[slug]]} | `{slug}` | {e['name']} | {len(e['urdu']):,} | {', '.join(notes)} |"
        )
    return "\n".join(lines) + "\n", reviewed, stale, unreviewed


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mark", metavar="SLUG", help="record a completed review for SLUG")
    ap.add_argument("--reviewer", help="reviewer name (required with --mark)")
    ap.add_argument("--check", action="store_true", help="exit 1 if REVIEW_QUEUE.md is stale")
    args = ap.parse_args()

    entries = load_entries()
    ledger = load_ledger()

    if args.mark:
        if args.mark not in entries:
            sys.exit(f"FAIL: no Urdu article for slug '{args.mark}'")
        if not args.reviewer:
            sys.exit("FAIL: --mark requires --reviewer (the ledger records who read it)")
        e = entries[args.mark]
        ledger[args.mark] = {
            "reviewer": args.reviewer,
            "date": datetime.date.today().isoformat(),
            "en_sha256": sha(e["english"]),
            "ur_sha256": sha(e["urdu"]),
        }
        with open(LEDGER, "w", encoding="utf-8") as fh:
            json.dump(ledger, fh, ensure_ascii=False, indent=1, sort_keys=True)
            fh.write("\n")
        print(f"[review] marked {args.mark} reviewed by {args.reviewer}")

    queue_md, reviewed, stale, unreviewed = build_queue_md(entries, ledger)

    if args.check:
        current = open(QUEUE, encoding="utf-8").read() if os.path.exists(QUEUE) else ""
        if current != queue_md:
            sys.exit("FAIL: urdu-i18n/REVIEW_QUEUE.md is stale — rerun build_review_queue.py")
        print("[review] OK — queue is current.")
        return

    with open(QUEUE, "w", encoding="utf-8") as fh:
        fh.write(queue_md)
    write_pages(entries)
    print(f"[review] {len(entries)} articles → {QUEUE}")
    print(f"[review]   reviewed: {reviewed}  stale: {stale}  unreviewed: {unreviewed}")
    print(f"[review]   side-by-side pages → urdu-i18n/review/ (gitignored)")


if __name__ == "__main__":
    main()
