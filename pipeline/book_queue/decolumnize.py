#!/usr/bin/env python3
"""De-interleave a two-column text_layer extraction into reading order.

Why this exists (measured 18 September 2026, waris_shah_hir_ranjha, HANDOVER 9.205):
`pdftotext` on a two-column page emits ONE line per visual line, containing the left
column's line, a run of spaces, then the right column's line. Read straight across, the
left column's sentence is spliced into the right column's unrelated sentence. Every
quotation taken from such a page is corrupt, and nothing errors.

Method: per page, find the fully-blank vertical band (the gutter) that maximises the
number of body lines carrying text on BOTH sides of it, restricted to the middle half of
the page width. Split every line there; emit col 1 then col 2. Running headers are lifted
out first (they span the gutter and carry the printed folio).

INVARIANT (RULE 4): the multiset of whitespace-separated tokens must be identical before
and after, apart from the inserted `[col N of 2]` markers. The script exits non-zero if a
single token is lost or gained, so a bad gutter cannot pass silently.

Usage: decolumnize.py <chunks_dir> <out_dir> [--header-re REGEX]
`--header-re` matches a whole running-header line; default is this book's.
Pages with no detectable gutter are emitted unchanged and listed as "1-col".
"""
import re, sys, os, glob, collections

_default_hdr = r'^\s*Waris Shah:\s*The Adventures of Hir and Ranjha\s*(\d+)?\s*$'
HDR = re.compile(os.environ.get('DECOL_HDR_RE', _default_hdr))

def find_gutter(lines):
    body = [l for l in lines if l.strip() and not HDR.match(l)]
    if len(body) < 6:
        return None
    width = max(len(l) for l in body)
    blank = [c for c in range(width) if all((c >= len(l)) or l[c] == ' ' for l in body)]
    bands = []
    for c in blank:
        if bands and c == bands[-1][1] + 1:
            bands[-1][1] = c
        else:
            bands.append([c, c])
    best = None
    for s, e in bands:
        if (e - s + 1) < 2:
            continue
        if not (0.25 * width <= s <= 0.75 * width):
            continue
        both = sum(1 for l in body if l[:s].strip() and len(l) > e and l[e+1:].strip())
        if both < max(6, 0.15 * len(body)):
            continue
        score = (both, e - s + 1)
        if best is None or score > best[0]:
            best = (score, s, e)
    return None if best is None else (best[1], best[2])

def reflow_page(page_text):
    lines = page_text.split('\n')
    g = find_gutter(lines)
    if g is None:
        return page_text.strip('\n'), False, None
    s, e = g
    hdr, left, right = [], [], []
    for l in lines:
        if HDR.match(l):
            if l.strip():
                hdr.append(' '.join(l.split()))
            continue
        left.append(l[:s].rstrip())
        right.append(l[e+1:].rstrip() if len(l) > e else '')
    def trim(xs):
        while xs and not xs[0].strip(): xs.pop(0)
        while xs and not xs[-1].strip(): xs.pop()
        return xs
    out = (hdr + [''] if hdr else []) \
        + ['[col 1 of 2]'] + trim(left) + ['', '[col 2 of 2]'] + trim(right)
    return '\n'.join(out), True, (s, e)

def process(text):
    parts = re.split(r'(\[p\. \d+\])', text)
    out, refl, plain = [], [], []
    cur = None
    for p in parts:
        if re.fullmatch(r'\[p\. \d+\]', p):
            cur = int(re.search(r'\d+', p).group()); out.append(p); continue
        if not p.strip():
            out.append(p); continue
        r, did, _ = reflow_page(p)
        out.append('\n' + r + '\n')
        (refl if did else plain).append(cur)
    return ''.join(out), refl, plain

def main():
    src, dst = sys.argv[1], sys.argv[2]
    os.makedirs(dst, exist_ok=True)
    R, P = [], []
    fail = False
    for f in sorted(glob.glob(os.path.join(src, 'chunk_*.txt'))):
        t = open(f, encoding='utf-8', errors='replace').read()
        r, refl, plain = process(t)
        base = os.path.basename(f).replace('.txt', '.reflowed.txt')
        open(os.path.join(dst, base), 'w', encoding='utf-8').write(r)
        a, b = collections.Counter(t.split()), collections.Counter(r.split())
        allowed = {'[col', '1', '2', 'of', '2]'}
        lost = dict(a - b)
        extra = {k: v for k, v in (b - a).items() if k not in allowed}
        if lost or extra:
            print(f"  !! {base} FAIL lost={list(lost.items())[:8]} extra={list(extra.items())[:8]}")
            fail = True
        else:
            print(f"  {base}: 2-col pages={len(refl)} 1-col pages={len(plain)} {plain if plain else ''} tokens=OK")
        R += refl; P += plain
    print(f"TOTAL 2-col={len(R)} 1-col={len(P)} not-split={P}")
    sys.exit(1 if fail else 0)

if __name__ == '__main__':
    main()
