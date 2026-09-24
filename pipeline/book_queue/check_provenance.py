#!/usr/bin/env python3
"""Verify the provenance chain: book text -> Pass-1 notes -> Pass-2 takeaways.

RULE 2 is this archive's core claim: a fact enters an entry only with the source and folio it came
from. Two checks already guard parts of that -- `check_note_ids.py` guards archive ids, and
`folio_probe.py` guards a folio RULE. Nothing guards the numbers that actually get cited, and
nothing guards Pass 2 at all, even though Pass 2 is the document shrine entries are written from.

This closes that gap. Three levels, each failing loudly and separately:

  L1  PAGE RANGE   every `(p. N)` in the notes names a page the book actually has.
  L2  FOLIO        every `(p. N, folio F)` agrees with the folio the book PRINTS on page N,
                   read independently from the transcription. This is the strong one: it catches
                   a worker that computed a folio from the wrong zone, applied an offset past a
                   plate insert, or misread a space-split digit -- the error class that has cost
                   four corrections (HANDOVER 9.213/9.217/9.218/9.221/9.223). A wrong folio in a
                   citation is worse than no folio, because it looks right.
  L3  PASS-2 TRACE every page reference, folio pairing, four-digit year and archive id in the
                   Pass-2 file occurs in Pass 1. Pass 2 is a merge, so it must introduce no new
                   facts; anything new is either a consolidation error or invention.

Usage:
    check_provenance.py <chunks_dir> <notes_dir> [pass2_file]

Exit 0 all clear · 2 a page reference is out of range or a folio disagrees with the book ·
3 Pass 2 introduces something Pass 1 does not contain.
"""
import collections, os, re, sys, glob

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from folio_probe import load, probe, zones

# A citation may WRAP across lines, and Pass 1 uses two shapes:
#     (p. 237, folio 219)        the protocol's form
#     p. 237 (folio 219)         used where the page is named in running prose
# Allowing \s inside matters: on the first run of this check, two "Pass 2 invented a page"
# reports turned out to be a reference the notes had split over a line break and one written in
# the second shape. Both were real citations the pattern could not see -- the same
# anchored-on-shape failure this script exists to catch elsewhere, committed here. Fix the check,
# not the content (CLAUDE.md RULE 4).
REF = re.compile(r'\(\s*p\.\s*(\d+)\s*(?:,\s*folio\s+(?:(\d+)|not\s+stated))?\s*\)'
                 r'|(?<![\w.])p\.\s*(\d+)\s*\(\s*folio\s+(?:(\d+)|not\s+stated)\s*\)',
                 re.S)


def refs(text):
    """Yield (page, folio_or_None) for every citation, in either shape."""
    for m in REF.finditer(text):
        if m.group(1):
            yield int(m.group(1)), (int(m.group(2)) if m.group(2) else None)
        else:
            yield int(m.group(3)), (int(m.group(4)) if m.group(4) else None)
YEAR = re.compile(r'(?<!\d)(1[0-9]{3}|20[0-2][0-9])(?!\d)')
HEAD_ID = re.compile(r'(?m)^(?:\s*[-*]\s+|#{2,4}\s+)(?=\*\*)')
BOLD = re.compile(r'\*\*([^*]+)\*\*')
BOLD_RUN = re.compile(r'\*\*([^*]+)\*\*(?:\s*(?:,|/|&|and)\s*)?')


def folio_model(chunks_dir):
    """Independent folio truth from the transcription: {pdf_page: folio}."""
    pages = load(chunks_dir)
    rows, blanks, noheader = probe(pages)
    zs = zones(rows)
    model = {n: v[0] for n, v in rows.items()}
    return pages, model, zs, set(blanks)


def read_notes(notes_dir):
    out = {}
    for f in sorted(glob.glob(os.path.join(notes_dir, 'chunk_*.notes.md'))):
        out[os.path.basename(f)] = open(f, encoding='utf-8').read()
    return out


def main():
    if len(sys.argv) < 3:
        sys.exit(__doc__)
    chunks_dir, notes_dir = sys.argv[1], sys.argv[2]
    pass2 = sys.argv[3] if len(sys.argv) > 3 else None

    pages, model, zs, blanks = folio_model(chunks_dir)
    lo, hi = min(pages), max(pages)
    notes = read_notes(notes_dir)
    print(f"book pages {lo}-{hi}; folio read independently for {len(model)} of {len(pages)}")
    print(f"notes files: {len(notes)}")
    for z in zs:
        print(f"  folio zone PDF {z[0]}-{z[1]} offset {z[2]:+d}")

    # ---- L1 + L2 -------------------------------------------------------------------------
    out_of_range, folio_bad, folio_ok, folio_unknown, notstated = [], [], 0, 0, 0
    pass1_refs, pass1_pairs, pass1_years = set(), set(), set()
    for fn, txt in notes.items():
        for p, f in refs(txt):
            pass1_refs.add(p)
            if not (lo <= p <= hi):
                out_of_range.append((fn, p))
            if f is None:
                notstated += 1
                continue
            pass1_pairs.add((p, f))
            if p in model:
                if model[p] == f:
                    folio_ok += 1
                else:
                    folio_bad.append((fn, p, f, model[p]))
            else:
                folio_unknown += 1
        pass1_years |= set(YEAR.findall(txt))

    print(f"\nL1 page range      : {len(pass1_refs)} distinct pages cited; "
          f"{len(out_of_range)} out of range")
    for fn, p in out_of_range[:10]:
        print(f"    {fn}: (p. {p}) but the book is {lo}-{hi}")

    print(f"L2 folio agreement : {folio_ok} agree, {len(folio_bad)} DISAGREE, "
          f"{folio_unknown} on pages where the book prints none, {notstated} 'folio not stated'")
    for fn, p, claimed, actual in folio_bad[:15]:
        where = " (page marked blank)" if p in blanks else ""
        print(f"    {fn}: (p. {p}, folio {claimed}) but the book prints {actual}{where}")

    rc = 0
    if out_of_range or folio_bad:
        rc = 2

    # ---- L3 ------------------------------------------------------------------------------
    if pass2 and os.path.exists(pass2):
        t2 = open(pass2, encoding='utf-8').read()
        p2_refs = {p for p, _ in refs(t2)}
        p2_pairs = {(p, f) for p, f in refs(t2) if f is not None}
        p2_years = set(YEAR.findall(t2))
        new_refs = sorted(p2_refs - pass1_refs)
        new_pairs = sorted(p2_pairs - pass1_pairs)
        new_years = sorted(p2_years - pass1_years)
        # Only the LEADING run of bold tokens is an id position. A blanket findall reports
        # ordinary bold emphasis later in the bullet: the first run of this check flagged the
        # word "five" as an unknown archive id. Same rule as check_note_ids.py.
        allnotes = '\n'.join(notes.values())
        p1_ids = set(BOLD.findall(allnotes))
        p2_ids = set()
        for line in t2.split('\n'):
            m = HEAD_ID.match(line)
            if not m:
                continue
            rest, pos = line[m.end():], 0
            while True:
                mm = BOLD_RUN.match(rest, pos)
                if not mm:
                    break
                p2_ids.add(mm.group(1).strip())
                pos = mm.end()
        new_ids = sorted(i for i in (p2_ids - p1_ids) if re.fullmatch(r'[a-z0-9][a-z0-9-]{3,}', i))

        print(f"\nL3 Pass-2 trace    : {len(p2_refs)} distinct pages cited "
              f"({100*len(p2_refs)//max(len(pass1_refs),1)}% of Pass 1's {len(pass1_refs)})")
        print(f"    page refs not in Pass 1 : {len(new_refs)} {new_refs[:12]}")
        print(f"    folio pairs not in Pass 1: {len(new_pairs)} {new_pairs[:8]}")
        print(f"    years not in Pass 1     : {len(new_years)} {new_years[:12]}")
        print(f"    bullet-head ids not in Pass 1: {len(new_ids)} {new_ids[:8]}")
        if new_refs or new_pairs or new_years or new_ids:
            print("\n    ^ Pass 2 is a MERGE. Anything here is a consolidation error or invention.",
                  file=sys.stderr)
            rc = rc or 3

    print("\n" + ("OK -- the provenance chain holds" if rc == 0 else f"PROBLEMS FOUND (exit {rc})"))
    sys.exit(rc)


if __name__ == '__main__':
    main()
