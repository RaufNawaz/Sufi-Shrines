# -*- coding: utf-8 -*-
"""
build_urdu_content.py — assembles src/data/urdu-content.json from per-shrine
Urdu markdown files in urdu-i18n/content/<slug>.md

Each file is native Urdu article prose whose `## Heading` structure mirrors the
English Description, with headings translated to Urdu. Numbers stay Western in
stored text (the Eastern-numeral toggle converts them at render).

Resumable by design: to add a shrine, drop a `content/<slug>.md` file and re-run
(or `npm run urdu:build`). Progress is tracked in urdu-i18n/TRANSLATION_LOG.md.
The English source for every shrine lives in urdu-i18n/_english_descriptions.json.
"""
import json, os, re, glob

OUT = os.path.dirname(os.path.abspath(__file__))
CONTENT_DIR = os.path.join(OUT, "content")
DEST = os.path.normpath(os.path.join(OUT, "..", "src", "data", "urdu-content.json"))

LATIN = re.compile(r"[A-Za-z]")
BIBLIO_HEADINGS = ("## کتابیات", "## حوالہ جات", "## حوالے")


def structure_issues(body):
    """Structural faults that degrade silently in the reader's view, so they are
    made to fail loudly here instead (CLAUDE.md RULE 4).

    1. A `## heading` with no blank line before it. Markdown folds it into the
       preceding paragraph: the section vanishes from the article body and from
       the contents nav, and nothing errors. Hit five times on 21 August 2026
       while appending A8 delta sections with `cat >>` to files that had no
       trailing newline.
    2. An odd number of `*`. The Urdu articles carry meaningful markdown
       (*عرس*, *مرشد*); one unclosed run italicises the rest of the article.
    """
    issues = []
    lines = body.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("## ") and i > 0 and lines[i - 1].strip():
            issues.append(f"line {i + 1}: heading {line[:26]!r} has no blank line before it")
    stars = body.count("*")
    if stars % 2:
        issues.append(f"odd number of '*' ({stars}) — an unclosed italic run")
    return issues


def main():
    content = {}
    structural = 0
    for path in sorted(glob.glob(os.path.join(CONTENT_DIR, "*.md"))):
        slug = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as f:
            body = f.read().strip()
        if body:
            content[slug] = {"descriptionUr": body}
            for issue in structure_issues(body):
                structural += 1
                print(f"  ⚠ {slug}: {issue}")

    # Refuse to write a malformed article into the app's data, rather than
    # shipping a section the reader will never see.
    if structural:
        raise SystemExit(f"FAIL: {structural} structural fault(s) in urdu-i18n/content/*.md — nothing written.")

    os.makedirs(os.path.dirname(DEST), exist_ok=True)
    with open(DEST, "w", encoding="utf-8") as f:
        json.dump(content, f, ensure_ascii=False, indent=2)

    # ── validate ─────────────────────────────────────────────────────────────
    leaks_total = 0
    for slug, v in content.items():
        body = v["descriptionUr"]
        before = body
        for h in BIBLIO_HEADINGS:
            before = before.split(h)[0]
        leaks = sorted(set(re.findall(r"[A-Za-z][A-Za-z.]+", before)))
        if leaks:
            leaks_total += 1
            print(f"  ⚠ {slug}: non-biblio Latin: {leaks}")

    print(f"[build_urdu_content] wrote {len(content)} shrines → {DEST}")
    if leaks_total:
        raise SystemExit(f"FAIL: {leaks_total} file(s) have Latin-script leaks outside citations.")
    print("[build_urdu_content] OK — zero Latin-script leaks outside citations, no structural faults.")


if __name__ == "__main__":
    main()
