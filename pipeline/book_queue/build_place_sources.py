#!/usr/bin/env python3
"""Gather everything the books say about one place or province into one source file.

Rauf, 30 October 2026: every region gets its own description "so that everything from the
shrines is carried over to the site". The material already exists, scattered:

  1. PLACE-LEVEL BLOCKS. Mapping ruling (a) (21 September 2026) attached a book's material
     about a place to every archive row in that place, and integration (10 October onwards)
     copied each block VERBATIM into `shrine_entries/<id>.md` under
     `### Place-level material: <Name>`, inside that book's `## From <book>` section. So a
     Lahore passage sits, identically, in up to 35 entries. This script reads it back out
     once, de-duplicated by (book, heading, text), and keeps the list of rows it was
     attached to.
  2. PROVINCE-LEVEL BLOCKS. The province sweep (5 to 7 October) did the same for Punjab,
     Sindh, Balochistan and Khyber Pakhtunkhwa: `### Province-level material: <province>`.
  3. WHOLE-BOOK MATERIAL ABOUT A PLACE. A book whose subject is one place has its general
     material (custodianship, endowments, the city's religious economy...) in the takeaways'
     `## Cross-cutting material`, which integration never copied anywhere, because it is
     about no one row. `PLACE_BOOK_SECTIONS` below names those sections; they go in whole.

Which place a block belongs to:
  - the block's own heading, matched against the site's place vocabulary
    (`src/lib/data/places.ts`, the same regular expressions), and failing that
  - `HEADING_ALIASES` below, for headings that name a neighbourhood or a variant spelling
    ("Achhra", "Mozang", "Anarkali, Lahore", "Uchh", "Amarkot"), each reviewed by hand, and
    failing that
  - nothing: the block is listed under `unassigned` in the report, never guessed (RULE 2).

Usage:
  python3 pipeline/book_queue/build_place_sources.py            # write entries/places/sources/
  python3 pipeline/book_queue/build_place_sources.py --report   # counts only, write nothing
  python3 pipeline/book_queue/build_place_sources.py --check    # exit 1 if a file would change

Exits non-zero (RULE 4) if a block heading names no place and no alias, unless it is listed
in `NOT_A_PLACE`, so a new book's new heading cannot silently drop out of every page.
"""
import argparse, collections, glob, hashlib, json, os, re, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT = os.path.join(ROOT, "entries", "places", "sources")

# Province headings in the entries -> province slug (src/lib/data/places.ts PROVINCES).
PROVINCE_SLUGS = {
    "punjab": "punjab",
    "sindh": "sindh",
    "balochistan": "balochistan",
    "khyber pakhtunkhwa": "khyber-pakhtunkhwa",
}

# Headings that name a place the vocabulary does not, read by hand on 30 October 2026.
# Each maps to the vocabulary place it lies in, as the block itself or its rows show.
HEADING_ALIASES = {
    "achhra": ["lahore"],             # Ichhra, Shah Jamal's quarter of Lahore
    "mozang": ["lahore"],
    "anarkali, lahore": ["lahore"],
    "bhatti gate": ["lahore"],
    "miani graveyard": ["lahore"],    # Miani Sahib, Lahore (tahqiqat's group)
    "data ganj bakhsh": ["lahore"],
    "gor khatri": ["peshawar"],
    "peshawari": ["peshawar"],
    "uchh": ["uch-sharif"],
    "ucch": ["uch-sharif"],
    "utch near bahawalpur in punjab / utch (bahawalpur, punjab)": ["uch-sharif"],
    "omarkot": ["umerkot"],
    "amarkot": ["umerkot"],
    "talwandi": ["nankana-sahib"],
    "clifton": ["karachi"],
    "mangho pir": ["karachi"],
    "lakki": ["sehwan"],
    "the jamshoro district": ["sehwan"],
    "lowari sharif / lowari shari [text-layer? lowari sharif] / luari sharif": ["luari-sharif"],
    "las bela / lasbela district and hingol national park": ["lasbela", "hingol"],
    "lahoot / lahoot la makan / khuzdar": ["khuzdar"],
    "hinglaj": ["hingol"],
    "rohri": ["sukkur"],
    "rohri / rohri taluqa / rohri dham": ["sukkur"],
    "hala": ["matiari"],
    "margalla hills": ["islamabad"],
    "chah miran": ["lahore"],
    "jhang / jhang siyal / the district of jhang": ["jhang"],
}

# Headings that are not a place at all; listed so the check can tell them from a miss.
NOT_A_PLACE = {
    "chandrakup as a bare place-name",  # a feature inside Hingol's pilgrimage, see its rows
    "the salt range",                   # a range across districts; no single place
}

# Whole sections of a book's takeaways that are about one place (point 3 above).
# (takeaways slug, section heading). The section is printed under the book's own "## From"
# heading, so a team version cites it exactly as it cites the book's place-level blocks.
PLACE_BOOK_SECTIONS = {
    "lahore": [("tareekh_lahore", "Cross-cutting material")],
}


def load_vocabulary():
    src = open(os.path.join(ROOT, "src", "lib", "data", "places.ts"), encoding="utf-8").read()
    body = src.split("export const PLACES", 1)[1].split("] as const;", 1)[0]
    entries = []
    for m in re.finditer(r"slug: '([^']+)',\s*name: '([^']+)',\s*match: /(.+?)/i", body, re.S):
        entries.append((m.group(1), m.group(2), re.compile(m.group(3), re.I)))
    if len(entries) < 60:
        sys.exit(f"read only {len(entries)} places from places.ts; the parser is stale")
    return entries


BOOK_SLUGS = {}  # "From <Author, Title>" heading -> takeaways slug, read from the entries


def source_line(slug):
    """The takeaways' `*Source: ...*` paragraph: what a bibliography item is built from."""
    text = open(os.path.join(ROOT, "entries", "book_takeaways", f"{slug}.md"), encoding="utf-8").read()
    m = re.search(r"^\*Source:.*?(?=\n\s*\n)", text, re.M | re.S)
    return m.group(0).strip() if m else f"(no Source line in entries/book_takeaways/{slug}.md)"


def read_blocks():
    """(book, kind, name) blocks from every shrine entry, de-duplicated."""
    blocks = {}
    for path in sorted(glob.glob(os.path.join(ROOT, "shrine_entries", "*.md"))):
        sid = os.path.basename(path)[:-3]
        if sid.startswith("_"):
            continue
        book, cur = None, None
        text_all = open(path, encoding="utf-8").read()
        for m in re.finditer(r"^## (From .+)\n+\*Integrated [^`]*`entries/book_takeaways/([a-z0-9_]+)\.md`", text_all, re.M):
            BOOK_SLUGS.setdefault(m.group(1).strip(), m.group(2))

        def flush():
            if not cur:
                return
            text = "\n".join(cur["lines"]).strip()
            if not text:
                return
            key = hashlib.md5("|".join([cur["book"] or "", cur["kind"], cur["name"], text]).encode()).hexdigest()
            b = blocks.setdefault(key, {"book": cur["book"], "kind": cur["kind"], "name": cur["name"],
                                        "text": text, "rows": []})
            b["rows"].append(sid)

        for line in open(path, encoding="utf-8").read().split("\n"):
            if line.startswith("## "):
                flush(); cur = None
                book = line[3:].strip()
                continue
            if line.startswith("### "):
                flush(); cur = None
                m = re.match(r"(Place|Province)-level material:\s*(.*)", line[4:].strip())
                if m:
                    cur = {"book": book, "kind": m.group(1).lower(), "name": m.group(2).strip(), "lines": []}
                continue
            if cur is not None:
                cur["lines"].append(line)
        flush()
    return list(blocks.values())


def section_of(md_path, heading):
    text = open(md_path, encoding="utf-8").read()
    m = re.search(r"^## " + re.escape(heading) + r"\s*$", text, re.M)
    if not m:
        sys.exit(f"{md_path}: no '## {heading}' section")
    rest = text[m.end():]
    n = re.search(r"^## ", rest, re.M)
    return rest[: n.start() if n else len(rest)].strip()


def assign(block, vocab):
    if block["kind"] == "province":
        slug = PROVINCE_SLUGS.get(block["name"].lower())
        return [slug] if slug else None
    name = block["name"].lower()
    if name in HEADING_ALIASES:
        return HEADING_ALIASES[name]
    if name in NOT_A_PLACE:
        return []
    hits = [slug for slug, _, rx in vocab if rx.search(block["name"])]
    return hits or None


def build():
    vocab = load_vocabulary()
    names = {slug: name for slug, name, _ in vocab}
    names.update({"punjab": "Punjab", "sindh": "Sindh", "balochistan": "Balochistan",
                  "khyber-pakhtunkhwa": "Khyber Pakhtunkhwa", "azad-kashmir": "Azad Kashmir"})
    by_place = collections.defaultdict(list)
    unassigned = []
    for b in read_blocks():
        slugs = assign(b, vocab)
        if slugs is None:
            unassigned.append(b)
            continue
        for s in slugs:
            by_place[s].append(b)

    files = {}
    for slug in sorted(by_place) + [s for s in PLACE_BOOK_SECTIONS if s not in by_place]:
        blocks = sorted(by_place.get(slug, []), key=lambda b: (b["book"] or "", b["name"]))
        out = [f"# Source material for {names.get(slug, slug)} (`{slug}`)", "",
               "Generated by `pipeline/book_queue/build_place_sources.py` from the place-level and",
               "province-level blocks in `shrine_entries/` and the whole-book sections named in",
               "`PLACE_BOOK_SECTIONS`. Every block is verbatim. Do not edit: rebuild.", ""]
        books = sorted({b["book"] for b in blocks if b["book"]})
        whole = PLACE_BOOK_SECTIONS.get(slug, [])
        heading_of = {v: k for k, v in BOOK_SLUGS.items()}
        for book, _ in whole:
            if book not in heading_of:
                sys.exit(f"{book}: no shrine entry carries its '## From' heading")
            if heading_of[book] not in books:
                books.append(heading_of[book])
        out += ["## The books", "",
                "Each book's `*Source:*` line, from which its bibliography item is built.", ""]
        for h in sorted(books):
            out += [f"- **{h}** (`{BOOK_SLUGS.get(h, '?')}`): {source_line(BOOK_SLUGS[h]) if h in BOOK_SLUGS else '(slug not found)'}"]
        out += [""]
        current = None
        for b in blocks:
            if b["book"] != current:
                current = b["book"]
                out += [f"## {current}", ""]
            rows = ", ".join(sorted(set(b["rows"])))
            out += [f"### {b['kind'].capitalize()}-level material: {b['name']}", "",
                    f"*Attached to {len(set(b['rows']))} row(s): {rows}*", "", b["text"], ""]
        for book, heading in whole:
            path = os.path.join(ROOT, "entries", "book_takeaways", f"{book}.md")
            out += [f"## {heading_of[book]}: whole-book material, \"{heading}\"", "",
                    f"*The takeaways' whole `## {heading}` section, verbatim: about the place, not one row.*", "",
                    section_of(path, heading), ""]
        files[slug] = "\n".join(out).rstrip() + "\n"
    return files, unassigned


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--report", action="store_true")
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()
    files, unassigned = build()
    for slug, text in sorted(files.items(), key=lambda kv: -len(kv[1])):
        print(f"{slug:24s} {len(text):>8,d} chars")
    if unassigned:
        print("\nUNASSIGNED block headings (add to HEADING_ALIASES or NOT_A_PLACE):", file=sys.stderr)
        for b in unassigned:
            print(f"  {b['kind']}: {b['name']!r} ({b['book']})", file=sys.stderr)
        sys.exit(1)
    if args.report:
        return
    os.makedirs(OUT, exist_ok=True)
    changed = []
    for slug, text in files.items():
        path = os.path.join(OUT, f"{slug}.sources.md")
        old = open(path, encoding="utf-8").read() if os.path.exists(path) else None
        if old != text:
            changed.append(slug)
            if not args.check:
                open(path, "w", encoding="utf-8").write(text)
    if args.check and changed:
        sys.exit(f"stale source files: {', '.join(changed)}")
    print(f"\n{len(files)} files, {len(changed)} {'stale' if args.check else 'written'}")


if __name__ == "__main__":
    main()
