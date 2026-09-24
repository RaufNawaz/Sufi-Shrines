#!/usr/bin/env python3
"""Build the place -> archive-id map that mapping ruling (a) runs on.

Ruling (a), Rauf, 21 September 2026: a bare TOPONYM takes the id of EVERY archive row in
that place -- "if a book has information on multan in general then all the shrines in
multan have to have that because it is part of multan's tradition".

Applying that needs a place->ids table, and `shrine_index.tsv`'s `location_short` cannot
be joined on naively. Two measured reasons (21 September 2026):

  1. `location_short` is HARD-CLIPPED AT 60 CHARACTERS. 45 of 169 rows sit exactly at 60
     and 14 of those end mid-word inside "Pakistan" ("Pakis", "Pakist", "Pakista",
     "Paki"). A substring join therefore silently drops the tail of the longest rows.
     The city name almost always survives the clip, which is why a curated city-level
     map works where a raw join does not.
  2. Some rows carry PROSE in that field, not a location list -- e.g. darbar-abul-muali-
     qadri: "Lahore. The survey places the saint's mosque and seminary ne[clipped]".

And a scope limit that is a judgement, flagged for Rauf rather than assumed:

  3. The ruling is applied at CITY / TOWN / LOCALITY level only. Country and province
     are excluded, because "Pakistan" matches 87 of 169 rows and "Punjab" 81, and
     attaching a book's passing mention of Punjab to 81 shrines is not what "part of
     Multan's tradition" means. If Rauf wants province-level attachment too, drop the
     names from EXCLUDE and re-run.

Usage:  python3 build_place_map.py <shrine_index.tsv> [-o place_to_ids.tsv]
Exits non-zero if the index has an empty id cell or if no place resolves (RULE 4).
"""
import csv, re, sys, collections, argparse

# country, provinces/territories, and the clipped fragments of "Pakistan"
EXCLUDE = {
    "pakistan", "pakistа", "pakista", "pakist", "pakis", "paki",
    "punjab", "sindh", "sind", "balochistan", "baluchistan",
    "khyber pakhtunkhwa", "kpk", "nwfp",
    "gilgit-baltistan", "gilgit baltistan", "azad kashmir", "ajk", "kashmir",
}
# tokenizer artifacts: bare generic nouns that are not a place name
GENERIC = {
    "town", "village", "city", "district", "tehsil", "taluka", "area", "near",
    "cantonment", "mohalla", "valley", "road", "market", "bazar", "bazaar",
    "gate", "hill", "mountain", "fort", "park", "the survey", "per the field survey",
    "walled", "old", "new", "central", "cantt",
}

def places_of(loc):
    """Yield the candidate place names in one location_short cell."""
    # Cut prose: anything after a sentence-ending period followed by a capital WORD.
    # The period must not be an initial. Measured 23 September 2026: the old pattern
    # `\.\s+[A-Z]` fired inside "M. A. Jinnah Road, Karachi, Sindh, Pakistan", truncating the
    # whole cell to "M" and silently losing that row's city. Require a capital followed by a
    # lower-case letter, so "A." and "M." no longer end the sentence.
    loc = re.split(r'(?<![A-Z])\.\s+[A-Z][a-z]', loc)[0]
    for tok in re.split(r'[,/;()—–]', loc):
        tok = tok.strip().strip('.')
        tok = re.sub(r'^(near|inside|outside|the|at|in)\s+', '', tok, flags=re.I).strip()
        if len(tok) < 3:
            continue
        low = tok.lower()
        if low in EXCLUDE or low in GENERIC:
            continue
        # a bare lowercase noun is a tokenizer artifact, not a place name.
        # NB test the ORIGINAL casing: low.islower() is always True after .lower().
        if tok.islower() and ' ' not in tok:
            continue
        yield tok
        # "Islamabad Capital Territory" should also answer to "Islamabad";
        # "Multan City" to "Multan"; "Bahawalpur District" to "Bahawalpur".
        # Strip administrative and compass suffixes, REPEATEDLY: "Karachi South District"
        # must answer to "Karachi South" and then to "Karachi", or a book's material on
        # Karachi never reaches a shrine the survey placed in Karachi South (ruling (a)).
        stem = tok
        for _ in range(3):
            mm = re.match(r'^(.*?)\s+(Capital Territory|City|District|Tehsil|Taluka|Cantonment|Town|'
                          r'North|South|East|West|Central)$', stem, re.I)
            if not mm or len(mm.group(1)) < 3:
                break
            stem = mm.group(1).strip()
            if stem.lower() in EXCLUDE or stem.lower() in GENERIC or stem.islower():
                break
            yield stem

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("index")
    ap.add_argument("-o", "--out", default=None)
    ap.add_argument("--min-rows", type=int, default=1)
    a = ap.parse_args()

    rows = list(csv.DictReader(open(a.index, encoding="utf-8"), delimiter="\t"))
    empty = [r for r in rows if not (r.get("id") or "").strip()]
    if empty:
        sys.stderr.write("FAIL: %d row(s) with an empty id cell: %s\n"
                         % (len(empty), [r.get("name") for r in empty]))
        return 2

    m = collections.defaultdict(set)
    for r in rows:
        rid = r["id"].strip()
        for p in places_of(r.get("location_short") or ""):
            m[p.lower()].add(rid)
        # the row's own name often carries its place (Uch Sharif, Bhit Shah)
    if not m:
        sys.stderr.write("FAIL: no place resolved from %d rows\n" % len(rows))
        return 2

    # CONTAINMENT PASS - this is what ruling (a) actually asks for.
    # "a bare TOPONYM takes the id of EVERY archive row in that place" (Rauf, 21 September
    # 2026). Tokenizing alone does not deliver that: a row whose cell says "Karachi South
    # District" produced only the longer keys, so the `karachi` line came out at 8 when a
    # plain substring join gives 11. So after tokenizing, every place key also collects any
    # row whose location text contains that key on word boundaries.
    for r in rows:
        rid = r["id"].strip()
        low = (r.get("location_short") or "").lower()
        if not low:
            continue
        for place in list(m):
            if rid in m[place]:
                continue
            if re.search(r'(?<![a-z])' + re.escape(place) + r'(?![a-z])', low):
                m[place].add(rid)

    # RULE 4 - the ruled counts are an invariant, not a hope. These five were fixed by Rauf
    # on 21-22 September 2026 and re-measured on the full-length column on 23 September.
    RULED = {"lahore": 35, "karachi": 11, "peshawar": 10, "multan": 8, "islamabad": 4}
    wrong = {p: (len(m.get(p, ())), n) for p, n in RULED.items() if len(m.get(p, ())) != n}
    if wrong:
        sys.stderr.write("FAIL: ruled place counts not reproduced (got, expected): %s\n" % wrong)
        sys.stderr.write("      Ruling (a) joins on location_short. If shrine_index.tsv changed\n"
                         "      legitimately, re-measure and update RULED here - do not delete it.\n")
        return 2

    out = sorted(((p, sorted(ids)) for p, ids in m.items() if len(ids) >= a.min_rows),
                 key=lambda x: (-len(x[1]), x[0]))
    fh = open(a.out, "w", encoding="utf-8") if a.out else sys.stdout
    fh.write("place\tn_rows\tids\n")
    for p, ids in out:
        fh.write("%s\t%d\t%s\n" % (p, len(ids), ",".join(ids)))
    if a.out:
        fh.close()
    sys.stderr.write("ok: %d places from %d rows; largest: %s\n"
                     % (len(out), len(rows),
                        ", ".join("%s(%d)" % (p, len(i)) for p, i in out[:6])))
    return 0

if __name__ == "__main__":
    sys.exit(main())
