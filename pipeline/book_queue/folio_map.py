#!/usr/bin/env python3
"""Derive a PDF-page -> printed-folio map for a chunked book, from running headers.

Why this exists (measured 18 Sep 2026, ernst_lawrence_sufi_martyrs_of_love):
the text_layer of this book keeps the running header but SILENTLY LOSES OR MANGLES the
folio digits on many pages ("6o" for 60; "83" dropped entirely on p.97, where the page
image plainly shows it). A single offset is therefore wrong: the offset (page - folio)
steps DOWN at each blank verso the scan omitted. Here it runs 15,14,13,12,11,10,9.

The rule this encodes: inside a run of pages whose read folios all share one offset, the
folio of an unnumbered page is page-offset. At a boundary between two runs a blank page
was dropped, so which side an unlabelled page belongs to is NOT determined by arithmetic
and is emitted as `unknown` rather than guessed (CLAUDE.md RULE 2).

CHECK (RULE 4): every folio actually read from a header must equal page-offset for its
run, and folios must increase by exactly 1 per page within a run. Violations exit 2.
"""
import re, sys, glob, json, argparse

DIGIT_FIX = str.maketrans({'o':'0','O':'0','l':'1','I':'1','i':'1','S':'5','B':'8'})

def load_pages(slug):
    pages = {}
    for f in sorted(glob.glob(f'out/ocr/{slug}/chunks/chunk_*.txt')):
        txt = open(f, encoding='utf-8', errors='replace').read()
        parts = re.split(r'^\[p\. (\d+)\]$', txt, flags=re.M)
        for i in range(1, len(parts), 2):
            pages[int(parts[i])] = parts[i + 1]
    return pages

def read_header_folio(body):
    """Return (folio, raw) read from the running header, or (None, None)."""
    lines = [l.rstrip() for l in body.split('\n') if l.strip()]
    if not lines:
        return None, None
    L = lines[0]
    # Two-space separated headers (ernst_lawrence and most text_layer books) are tried
    # first. Single-space headers (rizvi_history_of_sufism_india_1, tesseract route:
    # "84 A History of Sufism in India" / "Early Sufism 91") are tried second, and are
    # deliberately stricter about the title side -- >=2 words and >=8 characters of
    # letters -- because with one space "1 the" in body text would otherwise read as a
    # header. A bare numeral with no letters never matches either form, which is what
    # keeps p.110's stray "43" and p.480's orphan "456" out of the map (measured
    # 18 Sep 2026; both are library/plate artifacts, not folios).
    TITLE2 = r'(?=(?:\S+\s+){1,}\S)(?=.*[A-Za-z].*[A-Za-z])[A-Za-z][A-Za-z \'\-,\.]{7,}'
    for pat, gi in ((r'^\s*([0-9oOlIiSB]{1,3})\s{2,}(\S.*[A-Za-z].*)$', 1),
                    (r'^\s*(\S.*[A-Za-z].*?)\s{2,}([0-9oOlIiSB]{1,3})\s*$', 2),
                    (r'^\s*([0-9oOlIiSB]{1,3})\s(' + TITLE2 + r')\s*$', 1),
                    (r'^\s*(' + TITLE2 + r')\s([0-9oOlIiSB]{1,3})\s*$', 2)):
        m = re.match(pat, L)
        if not m:
            continue
        raw = m.group(gi)
        if not re.search(r'\d', raw.translate(DIGIT_FIX)):
            continue
        try:
            return int(raw.translate(DIGIT_FIX)), raw
        except ValueError:
            continue
    return None, None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--slug', required=True)
    ap.add_argument('--out')
    a = ap.parse_args()
    pages = load_pages(a.slug)
    if not pages:
        print(f'no chunks on disk for {a.slug}', file=sys.stderr); sys.exit(2)

    hdr = {}
    for p, body in pages.items():
        f, raw = read_header_folio(body)
        if f is not None and 1 <= f <= 2000:
            hdr[p] = (f, raw)

    # group header pages into runs of constant offset
    runs, ks = [], sorted(hdr)
    for p in ks:
        off = p - hdr[p][0]
        if runs and runs[-1]['off'] == off and p - runs[-1]['last'] <= 4:
            runs[-1]['last'] = p; runs[-1]['n'] += 1
        else:
            runs.append({'off': off, 'first': p, 'last': p, 'n': 1})
    runs = [r for r in runs if r['n'] >= 2]          # a lone page is noise, not a run

    # Merge adjacent runs of equal offset. Safe only if no header page strictly between
    # them contradicts that offset -- checked here, and again in the validation below.
    merged = []
    for r in runs:
        if merged and merged[-1]['off'] == r['off']:
            gap = [p for p in ks if merged[-1]['last'] < p < r['first']]
            if all(p - hdr[p][0] == r['off'] for p in gap):
                merged[-1]['last'] = r['last']; merged[-1]['n'] += r['n']
                continue
        merged.append(r)
    runs = merged

    errs = []
    for r in runs:
        for p in ks:
            if r['first'] <= p <= r['last'] and p - hdr[p][0] != r['off']:
                errs.append(f"p.{p} header folio {hdr[p][0]} breaks run offset {r['off']}")
    if not runs:
        errs.append('no stable offset run found')

    rows, counts = [], {'header': 0, 'run': 0, 'unknown': 0}
    for p in sorted(pages):
        run = next((r for r in runs if r['first'] <= p <= r['last']), None)
        if p in hdr and run and p - hdr[p][0] == run['off']:
            src, folio = 'header', hdr[p][0]
        elif run:
            src, folio = 'run', p - run['off']
        else:
            src, folio = 'unknown', ''
        counts[src] += 1
        rows.append((p, folio, src))

    out = a.out or f'out/ocr/{a.slug}/folio_map.tsv'
    with open(out, 'w', encoding='utf-8') as fh:
        fh.write('pdf_page\tfolio\tsource\n')
        for p, folio, src in rows:
            fh.write(f'{p}\t{folio}\t{src}\n')

    print(json.dumps({'slug': a.slug, 'pages': len(pages),
                      'runs': [{'offset': r['off'], 'first': r['first'],
                                'last': r['last'], 'header_pages': r['n']} for r in runs],
                      'counts': counts, 'errors': errs, 'out': out}, indent=1))
    if errs:
        print('FOLIO MAP CHECK FAILED', file=sys.stderr); sys.exit(2)

if __name__ == '__main__':
    main()
