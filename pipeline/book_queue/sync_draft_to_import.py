#!/usr/bin/env python3
"""Write a row's whole draft (entries/descriptions/<id>.md) back into the working import CSV
(data/import_2026-10-15.csv), re-split at '## ' into Description / Description 2..5 exactly as
pipeline/build_import_2026_10_15.py splits — for edits that change a draft beyond single
quotations (the original-script blocks of HANDOVER §9.366). Approved ids only.

    python3 pipeline/book_queue/sync_draft_to_import.py ID [ID ...] [--dry-run]

Refuses unless: the CSV round-trips byte-exact before; only the row's Description* cells change;
the parts rejoin ('\\n\\n') to the draft; no part >= 50,000 UTF-16 units; the split needs no more
continuation columns than the header has. Backup: out/sync_draft_to_import/<stamp>/.
"""
import csv, datetime, io, os, shutil, sys
csv.field_size_limit(10**9)
HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, os.path.join(REPO, 'pipeline'))
from build_import_2026_10_15 import split_article, site_join, u16  # noqa: E402
IMP = os.path.join(REPO, 'data', 'import_2026-10-15.csv')
APPROVED = os.path.join(REPO, 'data', 'review', 'descriptions_approved.txt')


def main(a):
    dry = '--dry-run' in a
    ids = [x for x in a if not x.startswith('--')]
    if not ids:
        print(__doc__); return 2
    approved = {l.strip() for l in open(APPROVED, encoding='utf-8') if l.strip() and not l.startswith('#')}
    text = open(IMP, encoding='utf-8', newline='').read()
    rows = list(csv.reader(io.StringIO(text)))
    cols, body = rows[0], rows[1:]
    def dump(b):
        o = io.StringIO(); w = csv.writer(o, lineterminator='\n'); w.writerow(cols); w.writerows(b); return o.getvalue()
    if dump(body) != text:
        sys.exit('import CSV does not round-trip byte-exact; refusing')
    dcols = [i for i, c in enumerate(cols) if c == 'Description' or c.startswith('Description ')]
    idc = cols.index('id')
    before = [list(r) for r in body]
    for id_ in ids:
        if id_ not in approved:
            sys.exit('%s is not an approved id' % id_)
        hit = [r for r in body if r[idc].strip() == id_]
        if len(hit) != 1:
            sys.exit('%s: %d rows' % (id_, len(hit)))
        draft = open(os.path.join(REPO, 'entries', 'descriptions', id_ + '.md'), encoding='utf-8').read().strip()
        parts = split_article(draft)
        if site_join(parts) != draft:
            sys.exit('%s: parts do not rejoin to the draft' % id_)
        if len(parts) > len(dcols):
            sys.exit('%s: needs %d parts, the header has %d Description columns' % (id_, len(parts), len(dcols)))
        for p in parts:
            if u16(p) >= 50000:
                sys.exit('%s: a part is %d units' % (id_, u16(p)))
        r = hit[0]
        old = [r[i] for i in dcols]
        for k, i in enumerate(dcols):
            r[i] = parts[k] if k < len(parts) else ''
        print('%s: %d part(s) %s (was %d)' % (id_, len(parts), [u16(p) for p in parts], sum(1 for x in old if x)))
    for r0, r1 in zip(before, body):
        for i, (x, y) in enumerate(zip(r0, r1)):
            if x != y and (i not in dcols or r1[idc].strip() not in ids):
                sys.exit('a cell outside the rows asked for changed: %s.%s' % (r1[idc], cols[i]))
    out = dump(body)
    if [r for r in csv.reader(io.StringIO(out))][1:] != body:
        sys.exit('round trip failed')
    if dry:
        print('--dry-run: nothing written'); return 0
    if out == text:
        print('no change'); return 0
    bd = os.path.join(REPO, 'out', 'sync_draft_to_import', datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ'))
    os.makedirs(bd, exist_ok=True); shutil.copy2(IMP, bd)
    open(IMP, 'w', encoding='utf-8', newline='').write(out)
    if open(IMP, encoding='utf-8', newline='').read() != out:
        sys.exit('the file on disk is not what passed the checks')
    print('wrote %s (backup %s)' % (os.path.relpath(IMP, REPO), os.path.relpath(bd, REPO)))
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
