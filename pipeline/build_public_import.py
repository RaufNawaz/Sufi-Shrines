#!/usr/bin/env python3
"""Build the sheet import that puts the PUBLIC descriptions into the 94 rows (29 Oct 2026, HANDOVER §9.413).

Rauf, 29 October 2026, in chat, after all 94 public descriptions passed V1, V2 and V3 (§9.412):
"generate the csv to upload". docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md ("When all 94 are done"): the public
English goes into `Description` and its continuation columns.

    python3 pipeline/build_public_import.py --live data/live_sheet_2026-10-29.csv --date 2026-10-29 [--dry-run]

Base: a fresh export of the live sheet (RULE 3: the import is "Replace current sheet", so it must start from
what the sheet holds now, not from an older import file). For each id in data/review/descriptions_approved.txt
the text of entries/descriptions_public/<id>.md goes into `Description`, split at `## ` headings into
`Description 2`, `Description 3`, ... only where a part would reach 50,000 UTF-16 units (the Sheets cell limit),
and every unused continuation cell of that row is emptied. Nothing else changes.

Refuses (exit 1) unless: the live export round-trips through csv; the header has `Description 2..N` right after
`Description`; every approved id is a live row and has a public file whose three verdict lines (V1, V2, V3) in
its .notes.md read PASS and carry the current md5 of the English; in the output, every row and column of the
live sheet is present in the same order, every cell outside the approved rows' Description* equals the live
cell, each approved row's parts rejoin ('\\n\\n') to its public file exactly, every continuation part starts
with `## `, no cell reaches 50,000 UTF-16 units, no cell holds a CR, asterisks balance in every Description*
cell, no multi-line Description has lost its newlines, and the written file reads back byte-exact.
It never touches the sheet.
"""
import argparse, csv, hashlib, io, os, re, sys
csv.field_size_limit(10**9)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
APPROVED = os.path.join(REPO, 'data', 'review', 'descriptions_approved.txt')
PUB = os.path.join(REPO, 'entries', 'descriptions_public')
LIMIT = 50000
u16 = lambda s: len(s.encode('utf-16-le')) // 2
md5 = lambda b: hashlib.md5(b).hexdigest()
errs = []
def bad(m): errs.append(m)

def split_parts(text, ncols):
    """Greedy split at '\\n\\n## ' boundaries; each part < LIMIT; at most ncols parts."""
    secs = re.split(r'\n\n(?=## )', text)
    parts, cur = [], ''
    for s in secs:
        cand = s if not cur else cur + '\n\n' + s
        if u16(cand) < LIMIT: cur = cand; continue
        if not cur: return None  # one section alone is over the limit
        parts.append(cur); cur = s
        if u16(cur) >= LIMIT: return None
    parts.append(cur)
    return parts if len(parts) <= ncols else None

def verdicts_ok(i, text_bytes):
    p = os.path.join(PUB, i + '.notes.md')
    if not os.path.exists(p): return 'no notes file'
    head = open(p, encoding='utf-8').read().split('\n')[:8]
    h = md5(text_bytes)[:8]
    for V in ('V1', 'V2', 'V3'):
        line = next((l for l in head if l.startswith(V + ' ')), None)
        if not line or ': PASS' not in line: return '%s verdict is not PASS' % V
        if V in ('V1', 'V2') and 'en:' + h not in line: return '%s verdict is stamped for another English (md5 %s)' % (V, h)
    return None

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--live', required=True); ap.add_argument('--date', required=True); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    raw = open(a.live, encoding='utf-8', newline='').read()
    rows = list(csv.reader(io.StringIO(raw)))
    cols, live = rows[0], rows[1:]
    if any(len(r) != len(cols) for r in live): sys.exit('live export has ragged rows; refusing')
    k = cols.index('Description')
    cont = []
    for c in cols[k + 1:]:
        if re.fullmatch(r'Description \d+', c): cont.append(c)
        else: break
    if cont != ['Description %d' % n for n in range(2, 2 + len(cont))]: sys.exit('continuation columns not Description 2..N after Description')
    dcols = [k] + [cols.index(c) for c in cont]
    idc = cols.index('id')
    ids = [r[idc].strip() for r in live]
    approved = [l.strip() for l in open(APPROVED, encoding='utf-8') if l.strip() and not l.startswith('#')]
    out = [list(r) for r in live]
    pos = {i: n for n, i in enumerate(ids)}
    texts = {}
    for i in approved:
        if i not in pos: bad('approved %s is not a live row' % i); continue
        p = os.path.join(PUB, i + '.md')
        if not os.path.exists(p): bad('no public file for %s' % i); continue
        b = open(p, 'rb').read()
        v = verdicts_ok(i, b)
        if v: bad('%s: %s' % (i, v)); continue
        t = b.decode('utf-8').strip()
        if '\r' in t: bad('%s: CR in the public file' % i); continue
        parts = split_parts(t, len(dcols))
        if parts is None: bad('%s: cannot split under %d units into %d cells' % (i, LIMIT, len(dcols))); continue
        texts[i] = t
        r = out[pos[i]]
        for n, ci in enumerate(dcols): r[ci] = parts[n] if n < len(parts) else ''
    # checks on the result
    changed = 0
    for n, (lr, orow) in enumerate(zip(live, out)):
        i = ids[n]
        for ci, c in enumerate(cols):
            if lr[ci] != orow[ci]:
                changed += 1
                if not (i in texts and ci in dcols): bad('%s.%s differs from the live sheet' % (i, c))
        if i in texts:
            got = '\n\n'.join(orow[ci].strip() for ci in dcols if orow[ci].strip())
            if got != texts[i]: bad('%s: parts do not rejoin to the public file' % i)
            for ci in dcols[1:]:
                if orow[ci] and not orow[ci].startswith('## '): bad('%s.%s does not start at a ## section' % (i, cols[ci]))
        for ci, c in enumerate(cols):
            v = orow[ci]
            if u16(v) >= LIMIT: bad('%s.%s reaches %d units' % (i, c, u16(v)))
            if '\r' in v: bad('%s.%s has CR' % (i, c))
            if ci in dcols and v.count('*') % 2: bad('%s.%s unbalanced asterisks' % (i, c))
        if any(u16(orow[ci]) > 2000 and '\n' not in orow[ci] for ci in dcols): bad('%s: a long Description cell has no newline' % i)
    b = io.StringIO(); w = csv.writer(b, lineterminator='\n'); w.writerow(cols); w.writerows(out); text = b.getvalue()
    back = list(csv.reader(io.StringIO(text)))
    if back[0] != cols or back[1:] != out: bad('round trip failed')
    nparts = {}
    for i in texts:
        nparts[i] = sum(1 for ci in dcols if out[pos[i]][ci])
    print('live: %d rows x %d columns (%s); approved rows replaced: %d of %d' % (len(live), len(cols), a.live, len(texts), len(approved)))
    print('cells changed: %d; rows split into continuation columns: %d %s' % (changed, sum(1 for v in nparts.values() if v > 1), sorted(i for i, v in nparts.items() if v > 1)))
    print('largest cell: %d UTF-16 units' % max(u16(v) for r in out for v in r))
    if errs:
        print('\nFAILED:'); [print('  ' + e) for e in errs]; return 1
    if a.dry_run: print('--dry-run: nothing written'); return 0
    dst = os.path.join(REPO, 'data', 'import_%s.csv' % a.date)
    open(dst, 'w', encoding='utf-8', newline='').write(text)
    if open(dst, encoding='utf-8', newline='').read() != text: sys.exit('written file does not read back exactly')
    bb = text.encode('utf-8')
    print('wrote %s  %d bytes  md5 %s' % (os.path.relpath(dst, REPO), len(bb), md5(bb)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
