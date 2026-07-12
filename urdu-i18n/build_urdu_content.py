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


def main():
    content = {}
    for path in sorted(glob.glob(os.path.join(CONTENT_DIR, "*.md"))):
        slug = os.path.splitext(os.path.basename(path))[0]
        with open(path, encoding="utf-8") as f:
            body = f.read().strip()
        if body:
            content[slug] = {"descriptionUr": body}

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
    print("[build_urdu_content] OK — zero Latin-script leaks outside citations.")


if __name__ == "__main__":
    main()
