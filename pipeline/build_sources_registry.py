#!/usr/bin/env python3
"""
build_sources_registry.py — turn free-text bibliographies into a real provenance layer.

    python3 build_sources_registry.py <sheet.tsv|csv>

Reads the Bibliography section out of each description and produces:

  sources.tsv          one row per distinct work  (source_id, type, citation, n_shrines)
  shrine_sources.tsv   the shrine x source join   (name, source_id, citation)
  support_levels.tsv   name, support_level, info_level, n_specific_sources, word_count, ratio
  sources_report.txt   human-readable summary

WHY THIS EXISTS
Right now a bibliography line like "General established histories of the Qadiri
order in the Punjab" sits in the same column as "Michel Boivin, South Asian Sufis
(Bloomsbury, 2012)". One is a citation; the other is a placeholder. Until they are
separated you cannot tell a sourced claim from an unsourced one, and you cannot
compute an honest info_level badge.

SUPPORT LEVELS
  Field-verified     an enumerator visited; a field survey is cited
  Source-documented  >=2 specific, checkable works cited
  Source-seeded      exactly 1 specific work, or a specific work + generic filler
  Web-compiled       only encyclopaedias, press, registers or generic lines

INFO LEVELS  (what the visitor sees)
  Full      field-verified
  Moderate  source-documented or source-seeded with real substance
  Low       web-compiled, or very short, or no bibliography at all
"""

import csv, re, sys, hashlib
from collections import defaultdict, Counter

BIB_SPLIT = re.compile(r"##\s*Bibliograph\w*", re.I)
LINE      = re.compile(r"^\s*[-*•]\s*(.+?)\s*$", re.M)

def flattened_items(bib):
    """Fallback for bibliographies mangled by a past lossy export that replaced
    the newlines between bullet items with spaces: the whole section is one
    line whose items are separated by " - " (space-hyphen-space). Split on
    exactly that separator. Hyphens inside words and titles (e.g.
    *Bibian-e-Pak Daman*) have no surrounding spaces, so they can never be
    split points; the assertion verifies no hyphenated word was cut."""
    frags = bib.split(" - ")
    for tok in bib.split():                     # whitespace-delimited words
        if "-" in tok and tok != "-":           # hyphenated word, not the separator
            assert any(tok in f for f in frags), \
                f"flattened-bibliography split cut a hyphenated word: {tok!r}"
    return [re.sub(r"^\s*[-*•]\s*", "", f).strip() for f in frags]

# ---- source classification ------------------------------------------------------
GENERIC = re.compile(
    r"^(general(ly)?\b.*(histories|accounts|studies|literature)"
    r"|.*\bgeneral (established )?(histories|accounts|studies)"
    r"|.*\bcomparative literature\b"
    r"|.*\bstandard biographies\b"
    r"|.*\breference encyclopaedias\b"
    r"|.*\blocal (hagiographical|histories|accounts|tradition)"
    r"|.*\bcommunity (and press )?accounts\b"
    r"|.*\bcontemporary press\b"
    r"|.*\bpending\b)", re.I)

TYPES = [
    ("field survey",  re.compile(r"shrines project field survey", re.I)),
    ("gazetteer",     re.compile(r"gazetteer|settlement report|census of india", re.I)),
    ("tazkira",       re.compile(r"tazkira|tazkirah|tadhkira|khazinat|akhbar al-akhyar|"
                                 r"safinat|awliya-e-pakistan|auliya", re.I)),
    ("register",      re.compile(r"evacuee trust|etpb|auqaf|antiquities act|"
                                 r"directorate of arch|department of arch|unesco|"
                                 r"world heritage|shiromani gurdwara|sgpc|psgpc", re.I)),
    ("primary text",  re.compile(r"\b(risalo|diwan|divan|kafian|abyat|heer|kashf al-mahjub|"
                                 r"granth|rajatarangini|tuzuk|janamsakhi|ramayana|"
                                 r"mahabharata|purana|upanishad|si-yu-ki|records of the western)",
                                 re.I)),
    ("press",         re.compile(r"\bdawn\b|express tribune|friday times|scroll\.in|"
                                 r"the news|sindh courier|arab news|odishabytes|"
                                 r"karachi ?walla|asia samachar|sikhnet|bolan voice", re.I)),
    ("encyclopaedia", re.compile(r"wikipedia|sikhiwiki|discover ?sikhism|worldgurudwaras|"
                                 r"allaboutsikhs|encyclopaedia of sikhism|encyclopedia", re.I)),
    ("monograph",     re.compile(r"\b(19|20)\d{2}\b|university press|oxford|cambridge|"
                                 r"bloomsbury|routledge|manohar|niyogi|adabi board|"
                                 r"punjabi university|munshiram", re.I)),
    # catch-all for real citations that match no keyword: an italicised title,
    # an "Author, Title" pattern, or a named publisher. Urdu monographs land here.
    ("book",          re.compile(r"\*[^*]{6,}\*"
                                 r"|^[A-Z][A-Za-z.\'-]+(?: [A-Z][A-Za-z.\'-]+){0,3},\s+[A-Z\*]"
                                 r"|\(([A-Z][a-z]+:|Lahore|Karachi|Delhi|London)")),
]

def classify(cit):
    for t, pat in TYPES:
        if pat.search(cit):
            return t
    if GENERIC.search(cit):
        return "generic"
    return "unclassified"

SPECIFIC = {"gazetteer","tazkira","register","primary text","monograph","press","book"}

def key(cit):
    """Collapse a citation to a comparison key: authors + title words, no punctuation."""
    k = re.sub(r"\([^)]*\)", " ", cit.lower())
    k = re.sub(r"[^a-z0-9 ]", " ", k)
    k = re.sub(r"\b(the|a|an|of|and|in|on|for|to|with|its|his|her|by|vol|ed|eds)\b", " ", k)
    return " ".join(sorted(set(k.split())))[:160]

def col(row, *names):
    for n in names:
        for k_ in row:
            if k_.strip().lower() == n:
                return (row[k_] or "").strip()
    return ""


def main(src):
    delim = "\t" if src.lower().endswith((".tsv", ".tab")) else ","
    rows = list(csv.DictReader(open(src, newline="", encoding="utf-8"), delimiter=delim))
    if not rows: sys.exit("empty input")

    registry, join, support = {}, [], []
    unresolved = Counter()

    for r in rows:
        name = col(r, "name", "shrine", "title") or "?"
        desc = col(r, "description", "desc", "history", "content")
        parts = BIB_SPLIT.split(desc, maxsplit=1)
        body, bib = (parts[0], parts[1]) if len(parts) > 1 else (desc, "")
        cits = [c.strip() for c in LINE.findall(bib) if len(c.strip()) > 8]
        if bib.strip() and "\n" not in bib:     # flattened by the lossy export
            cits = [c for c in flattened_items(bib) if len(c) > 8]

        n_spec = n_gen = 0
        has_field = False
        for c in cits:
            t = classify(c)
            if t == "field survey":
                has_field = True
            if t == "generic":
                n_gen += 1
                unresolved[c[:80]] += 1
                continue
            if t in SPECIFIC:
                n_spec += 1
            k = key(c)
            if k not in registry:
                sid = "S" + hashlib.sha1(k.encode()).hexdigest()[:6].upper()
                registry[k] = dict(source_id=sid, type=t, citation=c, shrines=set())
            registry[k]["shrines"].add(name)
            join.append((name, registry[k]["source_id"], t, c))

        wc = len(body.split())
        if has_field:                       lvl = "Field-verified"
        elif n_spec >= 2:                   lvl = "Source-documented"
        elif n_spec == 1:                   lvl = "Source-seeded"
        else:                               lvl = "Web-compiled"

        if lvl == "Field-verified":                         info = "Full"
        elif lvl in ("Source-documented", "Source-seeded") and wc >= 150: info = "Moderate"
        else:                                               info = "Low"

        ratio = round(wc / max(n_spec, 1), 1)
        support.append((name, lvl, info, n_spec, n_gen, wc, ratio))

    # ---- write -------------------------------------------------------------------
    def w(path, header, data):
        with open(path, "w", newline="", encoding="utf-8") as fh:
            wr = csv.writer(fh, delimiter="\t"); wr.writerow(header); wr.writerows(data)

    reg = sorted(registry.values(), key=lambda d: (-len(d["shrines"]), d["type"]))
    w("sources.tsv", ["source_id","type","n_shrines","citation"],
      [[d["source_id"], d["type"], len(d["shrines"]), d["citation"]] for d in reg])
    w("shrine_sources.tsv", ["name","source_id","type","citation"], sorted(join))
    w("support_levels.tsv",
      ["name","support_level","info_level","n_specific_sources","n_generic_lines",
       "word_count","words_per_source"], sorted(support))

    # ---- report ------------------------------------------------------------------
    out = []
    P = out.append
    P(f"rows: {len(rows)}   distinct sources: {len(reg)}   shrine-source links: {len(join)}")
    P("")
    P("SUPPORT LEVEL")
    for k_, v in Counter(s[1] for s in support).most_common():
        P(f"  {k_:<20}{v}")
    P("")
    P("INFO LEVEL (visitor-facing badge)")
    for k_, v in Counter(s[2] for s in support).most_common():
        P(f"  {k_:<20}{v}")
    P("")
    P("SOURCE TYPE")
    for k_, v in Counter(d["type"] for d in reg).most_common():
        P(f"  {k_:<20}{v}")
    P("")
    P("MOST REUSED SOURCES  (the anthology strategy, measured)")
    for d in reg[:12]:
        if len(d["shrines"]) < 2: break
        P(f"  {len(d['shrines']):>3}x  [{d['type']}]  {d['citation'][:88]}")
    P("")
    P("HIGHEST EXPANSION RATIO  (words of prose per specific source cited)")
    for s in sorted(support, key=lambda s: -s[6])[:15]:
        P(f"  {s[6]:>7.0f} w/src  {s[3]} src  {s[5]:>5} words   {s[0][:56]}")
    P("")
    P(f"GENERIC / PLACEHOLDER BIBLIOGRAPHY LINES  ({sum(unresolved.values())} occurrences)")
    for c, n in unresolved.most_common(15):
        P(f"  {n:>3}x  {c}")

    txt = "\n".join(out)
    open("sources_report.txt","w",encoding="utf-8").write(txt)
    print(txt)
    print("\nwrote sources.tsv, shrine_sources.tsv, support_levels.tsv, sources_report.txt")


if __name__ == "__main__":
    if len(sys.argv) != 2: sys.exit(__doc__)
    main(sys.argv[1])
