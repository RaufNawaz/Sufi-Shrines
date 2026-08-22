# -*- coding: utf-8 -*-
"""
update_log.py — regenerates urdu-i18n/TRANSLATION_LOG.md from the actual state on
disk: which shrines have a content/<slug>.md (done) vs. which still need one.

Run any time (also called by build-all.sh). This is the resumable source of truth
— if a session ends mid-way, re-read this log to see exactly what remains.

Where the shrine universe comes from (2026-08-18)
-------------------------------------------------
It used to come from `_english_descriptions.json` — a 12 July snapshot of 163 rows.
That made the log structurally incapable of noticing any shrine added after that
date, so it reported "163/163 done (100%)" while 8 live rows had no Urdu at all.
The universe is now the live row set (data/shrines_final_import_2026-08-16.csv,
or --live to fetch the published sheet), and `_english_descriptions.json` is used
only for the English text/name/category of the rows it happens to cover.

Invariant (RULE 4): an orphan content file — content/<slug>.md whose slug is not a
live row — means the slug drifted or a shrine was renamed, and the Urdu silently
stopped reaching the site. That exits non-zero. A *missing* translation does not:
incomplete coverage is the normal, tracked state this log exists to report.
"""
import json, os, glob, datetime, csv, io, re, sys, urllib.request

OUT = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.normpath(os.path.join(OUT, ".."))
LOCAL_CSV = os.path.join(ROOT, "data", "shrines_final_import_2026-08-16.csv")

# shrines with NO English description yet (can't translate until sourced).
# (2026-07-10: the 8 formerly listed here — Shah Yousuf, Guru Gurpat Mandir,
# Bhai Sant Thawan Das Mandir, Jhollay Lal Mandir, Gurdas Ram Mandir, Gurdwara
# Sach Khand Sahib, Gurdwara Dash Mesh Pita, Jagannath Temple Sialkot — all
# received sourced English descriptions in the M1/M2 dataset-integrity pass
# and are now unblocked; they appear in `_english_descriptions.json` and the
# Remaining list below like any other untranslated shrine.)
BLOCKED = []


def slugify(text):
    """Mirror of buildStableSlug() in src/lib/data/slugify.ts (and of the copy in
    pipeline/a8_urdu_delta.py) — content/<slug>.md is keyed by exactly this."""
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


def load_english():
    with open(os.path.join(OUT, "_english_descriptions.json"), encoding="utf-8") as f:
        return json.load(f)


def load_live_rows(live):
    """The shrine universe. Rows, not a snapshot — see the module docstring."""
    if live:
        url = json.load(open(os.path.join(ROOT, "data", "csv-source.json")))["csvUrl"]
        raw = urllib.request.urlopen(url, timeout=120).read().decode("utf-8")
        # io.StringIO, never raw.splitlines() — splitlines breaks quoted
        # multi-paragraph cells before the csv module sees them.
        return list(csv.DictReader(io.StringIO(raw))), "live published sheet"
    if not os.path.exists(LOCAL_CSV):
        # LOCAL_CSV is gitignored, so it is absent in a fresh clone. Say so plainly
        # rather than raising a bare FileNotFoundError. Deliberately no snapshot
        # fallback: data/shrines.json drops the rows with empty coordinates, and
        # counting coverage against a 169-row universe would both misreport the
        # percentage and flag the two dropped rows' existing Urdu as orphaned.
        raise SystemExit(
            f"FAIL: {os.path.relpath(LOCAL_CSV, ROOT)} is absent (it is gitignored).\n"
            "  Either run with --live to fetch the published sheet, or regenerate it\n"
            "  locally with `python3 pipeline/build_final_import.py`.\n"
            "  Note: the log's coverage denominator must be the full 171-row sheet,\n"
            "  so data/shrines.json (169 rows) is not a valid substitute."
        )
    with open(LOCAL_CSV, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh)), os.path.relpath(LOCAL_CSV, ROOT)


def load_tour_slugs():
    """Tour-featured shrines get priority."""
    tour_slugs = set()
    try:
        tours_path = os.path.normpath(os.path.join(OUT, "..", "src", "data", "tours.json"))
        with open(tours_path, encoding="utf-8") as f:
            tours = json.load(f)
        for t in tours:
            for s in t.get("stops", []):
                tour_slugs.add(s["shrineSlug"])
    except Exception:
        pass
    return tour_slugs


def load_done_slugs():
    done = set()
    for p in glob.glob(os.path.join(OUT, "content", "*.md")):
        with open(p, encoding="utf-8") as f:
            if f.read().strip():
                done.add(os.path.splitext(os.path.basename(p))[0])
    return done


def main():
    live = "--live" in sys.argv
    ENG = load_english()
    rows, source = load_live_rows(live)
    tour_slugs = load_tour_slugs()
    done = load_done_slugs()

    # universe = live rows, keyed by the same slug content/<slug>.md uses
    universe = {}
    for r in rows:
        slug = slugify(r.get("Name", ""))
        if not slug:
            continue
        snap = ENG.get(slug) or {}
        universe[slug] = {
            "name": r.get("Name", "") or snap.get("name", slug),
            "category": r.get("category") or r.get("Category") or snap.get("category", ""),
            "desc": (r.get("Description") or "").strip(),
        }

    done_t = sorted(s for s in universe if s in done)
    remaining = [s for s in universe if s not in done]
    orphans = sorted(done - set(universe))

    remaining.sort(key=lambda s: (s not in tour_slugs, -len(universe[s]["desc"])))

    total = len(universe)
    pct = round(100 * len(done_t) / total) if total else 0

    L = []
    L.append("# Urdu translation log")
    L.append("")
    L.append(f"_Auto-generated by `update_log.py` · {datetime.date.today().isoformat()}_")
    L.append("")
    L.append(f"**Progress: {len(done_t)} / {total} shrine descriptions translated ({pct}%).** "
             f"{len(BLOCKED)} more are blocked (no English description yet).")
    L.append("")
    L.append(f"Shrine universe: **{source}** ({total} rows). Coverage is counted against the "
             "live rows, not against `_english_descriptions.json` — that file is a 12 July "
             "snapshot of 163 rows and using it as the denominator reported 100% while 8 live "
             "rows had no Urdu at all.")
    L.append("")
    L.append("**Every entry here is `reviewed=false`.** No Urdu article in `content/` has been "
             "signed off by a human reader yet; machine and hand-drafted translations alike are "
             "drafts until reviewed (CLAUDE.md RULE 2).")
    L.append("")
    L.append("## How to resume")
    L.append("")
    L.append("Each shrine's Urdu article lives in `urdu-i18n/content/<slug>.md` (native Urdu, "
             "`## Heading` structure mirroring the English, numbers left Western). The English "
             "source is the live sheet (see `data/csv-source.json`); "
             "`urdu-i18n/_english_descriptions.json` holds the 12 July snapshot "
             "(`{slug: {name, category, desc}}`) that existing translations were made from, and "
             "`urdu-i18n/a8-scope.json` says which existing translations the English has since "
             "moved past. To continue: pick the next slug under **Remaining**, read its English "
             "from the sheet, author `content/<slug>.md`, then run `npm run urdu:build` (which "
             "rebuilds + revalidates + refreshes this log).")
    L.append("")
    L.append(f"## Remaining ({len(remaining)}) — priority order (★ = guided-tour shrine)")
    L.append("")
    L.append("| # | slug | shrine | category | en chars |")
    L.append("|---|------|--------|----------|----------|")
    for i, s in enumerate(remaining, 1):
        star = "★ " if s in tour_slugs else ""
        L.append(f"| {i} | `{s}` | {star}{universe[s]['name']} | {universe[s]['category']} | {len(universe[s]['desc'])} |")
    L.append("")
    if orphans:
        L.append(f"## ⚠ Orphaned content files ({len(orphans)})")
        L.append("")
        L.append("A `content/<slug>.md` with no matching live row — the slug drifted or the "
                 "shrine was renamed, and this Urdu no longer reaches the site.")
        L.append("")
        for s in orphans:
            L.append(f"- [ ] `{s}`")
        L.append("")
    L.append(f"## Done ({len(done_t)})")
    L.append("")
    for s in done_t:
        L.append(f"- [x] `{s}` — {universe[s]['name']}")
    L.append("")
    L.append(f"## Blocked — no English description ({len(BLOCKED)})")
    L.append("")
    L.append("These need a sourced English description first (see `TODO.md` §1–§2); "
             "some are duplicates/renames to resolve before writing.")
    L.append("")
    for n in BLOCKED:
        L.append(f"- [ ] {n}")
    L.append("")

    with open(os.path.join(OUT, "TRANSLATION_LOG.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(L))
    print(f"[update_log] source: {source}  ({total} live rows)")
    print(f"[update_log] {len(done_t)}/{total} done ({pct}%), {len(remaining)} remaining, {len(BLOCKED)} blocked.")
    if orphans:
        raise SystemExit(
            f"FAIL: {len(orphans)} orphaned content file(s) with no live row: {orphans}"
        )
    print("[update_log] OK — no orphaned content files.")


if __name__ == "__main__":
    main()
