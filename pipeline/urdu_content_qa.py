# -*- coding: utf-8 -*-
"""
urdu_content_qa.py — per-file invariants on urdu-i18n/content/<slug>.md

Why this exists
---------------
A8 (the Urdu article backlog) had a reporting tool — pipeline/a8_urdu_delta.py — that
measured, correctly, that 74 Urdu articles had fallen behind their English. Nothing
*failed*, so the number sat in a JSON file for weeks. CLAUDE.md RULE 4: prefer a check
that exits non-zero over a note saying "be careful here".

The failure that made this urgent was not a stale translation, it was the opposite. The
English for `allo-mahar` was deliberately *retracted* — a ~700-word biography turned out
to be about the wrong man, and docs/allo_mahar_resolution.md replaced it with a short
"awaiting a field visit" note rather than fix a hallucination with a second one. The
retraction never reached the Urdu. Because mergeUrduContent() overrides the *whole*
Description per slug, the Urdu reader kept getting the withdrawn text — confident dates,
offices and an urs date — while the English reader got the honest stub. A live RULE 2
violation, invisible to every gate in the repo, and found only by eyeballing a length
ratio.

So the sharp check here is over-coverage: Urdu that is substantially longer than its
English carries claims the English does not make. That is an ERROR. Under-coverage — the
ordinary A8 delta — is a WARN against a ratchet, so the backlog can only shrink.

Thresholds are measured, not guessed (20 Aug 2026, 169 live rows). Urdu/English character
ratio for the 93 entries whose English had not moved: min 0.74, median 0.81, max 0.95.
For the 74 known-stale ones: min 0.36, median 0.62. The two populations do not overlap,
which is what makes 0.70 a real boundary rather than a taste.

    python3 pipeline/urdu_content_qa.py [--fail-on {NONE,WARN,ERROR}] [--verbose]

Reads English from data/shrines.csv (tracked, and byte-identical in Description to the
16 August import for every row it carries) so the gate is deterministic in CI. Note it is
the *built* snapshot: build-dataset drops rows with empty coordinates, so a content file
for one of those cannot be ratio-checked and is reported as skipped, not as passing.
"""
import argparse
import csv
import glob
import os
import re

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CONTENT_DIR = os.path.join(ROOT, "urdu-i18n", "content")
ENGLISH_CSV = os.path.join(ROOT, "data", "shrines.csv")

LATIN = re.compile(r"[A-Za-z]+")
HEADING = re.compile(r"^##\s+(.*)$", re.M)

# Bibliography headings are excluded from the structure comparison on both sides. Most
# English articles carry "## Bibliography" while most Urdu files, by convention, omit the
# section (scripts/data/validate-urdu-leak.mjs allows zero Latin letters, so a
# Latin-titled source cannot be cited verbatim). Counting them made this check fire on
# 144 files, all of them correct — CLAUDE.md RULE 4: fix the check, not the content.
BIBLIO_HEADINGS = {
    "sources", "bibliography", "references", "citations", "works cited",
    "کتابیات", "حوالہ جات", "حوالے",
}

# Ratio bounds on len(urdu) / len(english).
OVER_COVERAGE = 1.15   # ERROR: Urdu asserts more than the English does
UNDER_COVERAGE = 0.70  # WARN:  Urdu has not caught up with the English

# Ratchet. 35 entries are under-covered as of 20 Aug 2026. Note this is *not* the same as
# a8-scope.json's 74 deltas: an entry whose English grew by a paragraph is a delta but its
# ratio can still clear 0.70, so this counts the gaps a reader would actually notice. The
# number must never go up — a new translation that lands condensed is a bug, not a
# milestone. When you finish deltas, lower it. a8-scope.json lists them, largest gap first.
UNDER_COVERAGE_BUDGET = 35


def slugify(text):
    """Mirror of buildStableSlug() in src/lib/data/slugify.ts — content/<slug>.md is
    keyed by exactly this, so drift here silently un-pairs every file from its English."""
    t = (text or "").lower()
    for ch, rep in (("&", " and "), ("@", " at "), ("%", " percent "), ("+", " plus ")):
        t = t.replace(ch, rep)
    t = re.sub(r"[^\w\s-]", "", t)
    t = re.sub(r"[\s_]+", "-", t)
    t = re.sub(r"-+", "-", t)
    return t.strip("-").strip()


def _prose_headings(text):
    """`## ` headings excluding bibliography aliases — see BIBLIO_HEADINGS."""
    return [h.strip() for h in HEADING.findall(text) if h.strip().lower() not in BIBLIO_HEADINGS]


def load_english():
    if not os.path.exists(ENGLISH_CSV):
        raise SystemExit(f"FAIL: {os.path.relpath(ENGLISH_CSV, ROOT)} not found — run npm run data:build")
    with open(ENGLISH_CSV, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return {slugify(r.get("Name", "")): (r.get("Description") or "").strip() for r in rows}


def check_file(path, english):
    """Returns (errors, warnings, ratio_or_None) for one content file."""
    slug = os.path.splitext(os.path.basename(path))[0]
    with open(path, encoding="utf-8") as fh:
        body = fh.read().strip()
    errors, warnings = [], []

    if not body:
        errors.append("file is empty")
        return errors, warnings, None

    leaks = sorted(set(LATIN.findall(body)))
    if leaks:
        # Latin anywhere fails scripts/data/validate-urdu-leak.mjs too; caught here so it
        # is attributed to a file rather than to the built JSON blob.
        errors.append(f"Latin-script leak: {', '.join(leaks[:6])}")

    if body.count("*") % 2:
        errors.append(f"unbalanced asterisks ({body.count('*')}) — markdown italics/bold will bleed")

    en = english.get(slug)
    if en is None:
        # Orphans (a content file with no live row) are build_dictionary.py's gate; a row
        # dropped for missing coordinates lands here too, so this is a skip, not a failure.
        return errors, warnings, None
    if not en:
        return errors, warnings, None

    ratio = len(body) / len(en)
    if ratio > OVER_COVERAGE:
        errors.append(
            f"over-coverage: Urdu is {ratio:.2f}x its English ({len(body)} vs {len(en)} chars). "
            "The Urdu is asserting material the English does not — check whether the English "
            "was cut or retracted (see docs/allo_mahar_resolution.md for the precedent)."
        )
    elif ratio < UNDER_COVERAGE:
        warnings.append(f"under-coverage: {ratio:.2f}x ({len(body)} vs {len(en)} chars) — English has moved on")

    en_headings = _prose_headings(en)
    ur_headings = _prose_headings(body)
    # Only meaningful when the English is actually sectioned: plenty of entries are
    # unheaded prose in English, and the Urdu files give those bespoke section headings
    # on purpose, so a bare count difference there says nothing.
    if len(en_headings) >= 2 and len(en_headings) != len(ur_headings):
        warnings.append(
            f"section count differs: English has {len(en_headings)} "
            f"({', '.join(en_headings)}), Urdu has {len(ur_headings)}"
        )

    return errors, warnings, ratio


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--fail-on", choices=("NONE", "WARN", "ERROR"), default="ERROR")
    ap.add_argument("--verbose", action="store_true", help="list every warning, not just the counts")
    args = ap.parse_args()

    english = load_english()
    paths = sorted(glob.glob(os.path.join(CONTENT_DIR, "*.md")))
    if not paths:
        raise SystemExit(f"FAIL: no content files under {os.path.relpath(CONTENT_DIR, ROOT)}")

    n_err = n_warn = n_under = n_skipped = 0
    for path in paths:
        slug = os.path.splitext(os.path.basename(path))[0]
        errors, warnings, ratio = check_file(path, english)
        if ratio is None and not errors:
            n_skipped += 1
        for e in errors:
            print(f"  ✗ {slug}: {e}")
            n_err += 1
        for w in warnings:
            if w.startswith("under-coverage"):
                n_under += 1
                if args.verbose:
                    print(f"  ⚠ {slug}: {w}")
            else:
                print(f"  ⚠ {slug}: {w}")
            n_warn += 1

    print(f"[urdu-content-qa] {len(paths)} content files · {n_err} error(s) · {n_warn} warning(s)")
    print(f"[urdu-content-qa]   of which under-coverage (A8 backlog): {n_under} / budget {UNDER_COVERAGE_BUDGET}")
    if n_skipped:
        print(f"[urdu-content-qa]   {n_skipped} not ratio-checked (no English row in the snapshot)")
    if not args.verbose and n_under:
        print("[urdu-content-qa]   rerun with --verbose to list them, or see urdu-i18n/a8-scope.json")

    if n_under > UNDER_COVERAGE_BUDGET:
        raise SystemExit(
            f"FAIL: under-coverage count {n_under} exceeds the budget of {UNDER_COVERAGE_BUDGET}. "
            "A new Urdu article that lands condensed is a bug. Translate it in full, or, if the "
            "budget is genuinely stale, lower it — never raise it."
        )
    if n_err and args.fail_on in ("WARN", "ERROR"):
        raise SystemExit(f"FAIL: {n_err} error(s) in Urdu content files.")
    if n_warn and args.fail_on == "WARN":
        raise SystemExit(f"FAIL: {n_warn} warning(s) in Urdu content files (--fail-on WARN).")
    print("[urdu-content-qa] OK")


if __name__ == "__main__":
    main()
