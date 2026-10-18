#!/usr/bin/env python3
"""Freeze the working import CSV into a dated, checked snapshot for Rauf to import (18 Oct 2026, HANDOVER §9.365).

The working file is data/import_2026-10-15.csv: built by build_import_2026_10_15.py on 15 Oct and since then
edited in place by the approved applies (Urdu fixes §9.358, Location/Description meta §9.360, as-printed sweep
§9.361-). It is still the file every tool writes to, so keep working on it; run this script whenever an import
is wanted. It never touches the sheet (RULE 3).

  python3 pipeline/finalize_import.py --date 2026-10-18 [--dry-run]

1. refreshes, IN the working file, the join-check line of each new row's qa_note from the current
   pipeline/book_queue/join_decisions.tsv (join / maybe only, as the builder did), and needs_review=Yes where
   any note exists — backup first to out/finalize_import/<stamp>/;
2. checks (exit 1 on any failure): header = 47 live columns + Description 2..N; 171 archive rows in the live
   sheet's order with its ids; every archive cell equals the live sheet except Description*/Location/qa_note
   (the changed ones are listed); every approved id's parts rejoin ('\\n\\n') to entries/descriptions/<id>.md
   exactly; parts after the first start at '## '; asterisks balanced per cell; no cell >= 50,000 UTF-16
   units; no CR; new-row ids unique and not live; byte-exact CSV round trip;
3. writes data/import_<date>.csv (identical bytes to the working file) and prints its md5.
"""
import argparse, csv, datetime, hashlib, io, os, re, shutil, sys
csv.field_size_limit(10**9)
REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
WORK = os.path.join(REPO, 'data', 'import_2026-10-15.csv')
LIVE = os.path.join(REPO, 'data', 'live_sheet_2026-10-15.csv')
APPROVED = os.path.join(REPO, 'data', 'review', 'descriptions_approved.txt')
JOINS = os.path.join(REPO, 'pipeline', 'book_queue', 'join_decisions.tsv')
DRAFTS = os.path.join(REPO, 'entries', 'descriptions')
ALLOWED = re.compile(r'^(Description( \d+)?|Location|qa_note)$')
JNOTE = re.compile(r'^Join check \(HANDOVER [^)]*\): ')
u16 = lambda s: len(s.encode('utf-16-le')) // 2
md5 = lambda b: hashlib.md5(b).hexdigest()
errs = []
def bad(m): errs.append(m)

def load(path):
    t = open(path, encoding='utf-8', newline='').read()
    rd = csv.reader(io.StringIO(t))
    rows = list(rd)
    return t, rows[0], [dict(zip(rows[0], r)) for r in rows[1:]]

def dump(cols, rows):
    b = io.StringIO()
    w = csv.DictWriter(b, fieldnames=cols, lineterminator='\n', extrasaction='raise')
    w.writeheader(); w.writerows(rows)
    return b.getvalue()

def main():
    ap = argparse.ArgumentParser(); ap.add_argument('--date', required=True); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    text, cols, rows = load(WORK)
    if dump(cols, rows) != text: sys.exit('working CSV does not round-trip byte-exact; refusing')
    _, lcols, live = load(LIVE)
    cont = [c for c in cols if re.fullmatch(r'Description \d+', c)]
    want = []
    for c in lcols:
        want.append(c)
        if c == 'Description': want += cont
    if cols != want: bad('header is not the live columns + %s' % cont)
    lids = [r['id'].strip() for r in live]
    arch, new = rows[:len(live)], rows[len(live):]
    if [r['id'].strip() for r in arch] != lids: bad('archive rows are not the live rows in live order')
    approved = [l.strip() for l in open(APPROVED, encoding='utf-8') if l.strip() and not l.startswith('#')]
    # 1. refresh join notes
    J = {}
    for ln in open(JOINS, encoding='utf-8'):
        if ln.startswith('#') or ln.startswith('proposed_id\t') or not ln.strip(): continue
        f = ln.rstrip('\n').split('\t'); J[f[0]] = (f[1], f[2])
    changed_notes = []
    for r in new:
        segs = [s for s in r['qa_note'].split(' | ') if s.strip()] if r['qa_note'].strip() else []
        keep = [s for s in segs if not JNOTE.match(s)]
        d = J.get(r['id'].strip())
        if d and d[0] in ('join', 'maybe'):
            keep.append('Join check (HANDOVER §9.344-§9.359): %s archive row %s — see pipeline/book_queue/join_decisions.tsv'
                        % ('same site as' if d[0] == 'join' else 'may be the same as', d[1]))
        nq = ' | '.join(keep)
        if nq != r['qa_note']:
            changed_notes.append(r['id']); r['qa_note'] = nq
            if nq and not r['needs_review'].strip(): r['needs_review'] = 'Yes'
    # 2. checks
    diff = {}
    for l, o in zip(live, arch):
        for c in lcols:
            if l[c] != o[c]:
                diff.setdefault(c, []).append(o['id'])
                if not ALLOWED.match(c): bad('%s.%s differs from the live sheet' % (o['id'], c))
        if o['id'].strip() not in approved and any(o[c] for c in cont):
            bad('%s has continuation cells but is not approved' % o['id'])
    by = {r['id'].strip(): r for r in arch}
    for i in approved:
        if i not in by: bad('approved %s not in the archive rows' % i); continue
        r = by[i]; parts = [r['Description']] + [r[c] for c in cont]
        got = '\n\n'.join(p.strip() for p in parts if p.strip())
        p = os.path.join(DRAFTS, i + '.md')
        if not os.path.exists(p): bad('no draft for approved %s' % i); continue
        if got != open(p, encoding='utf-8').read().strip(): bad('%s: CSV parts do not rejoin to its draft' % i)
        for c in cont:
            if r[c] and not r[c].startswith('## '): bad('%s.%s does not start at a ## section' % (i, c))
    nids = [r['id'].strip() for r in new]
    if len(set(nids)) != len(nids) or '' in nids: bad('new-row ids empty or repeated')
    if set(nids) & set(lids): bad('new-row id already live')
    big = 0
    for r in rows:
        for c in cols:
            v = r[c]; big = max(big, u16(v))
            if u16(v) >= 50000: bad('%s.%s over 50,000' % (r['id'], c))
            if '\r' in v: bad('%s.%s has CR' % (r['id'], c))
            if c.startswith('Description') and v.count('*') % 2: bad('%s.%s unbalanced asterisks' % (r['id'], c))
    out = dump(cols, rows)
    if [dict(zip(cols, x)) for x in list(csv.reader(io.StringIO(out)))[1:]] != rows: bad('round trip failed')
    print('rows: %d archive + %d new = %d; columns %d (%s)' % (len(arch), len(new), len(rows), len(cols), ', '.join(cont)))
    print('archive cells differing from the live sheet, by column:')
    for c, ids in diff.items(): print('  %-14s %3d rows' % (c, len(ids)))
    print('approved Descriptions rejoining to drafts: %d checked' % len(approved))
    print('largest cell: %d UTF-16 units' % big)
    print('new rows whose join-check note was refreshed: %d %s' % (len(changed_notes), changed_notes))
    print('needs_review=Yes on new rows: %d' % sum(1 for r in new if r['needs_review'].strip()))
    if errs:
        print('\nFAILED:'); [print('  ' + e) for e in errs]; return 1
    if a.dry_run: print('\n--dry-run: nothing written'); return 0
    if out != text:
        stamp = datetime.datetime.utcnow().strftime('%Y%m%dT%H%M%SZ')
        bd = os.path.join(REPO, 'out', 'finalize_import', stamp); os.makedirs(bd, exist_ok=True)
        shutil.copy2(WORK, bd)
        open(WORK, 'w', encoding='utf-8', newline='').write(out)
        if open(WORK, encoding='utf-8', newline='').read() != out: sys.exit('working file did not write back exactly')
        print('working file updated (backup %s)' % os.path.relpath(bd, REPO))
    snap = os.path.join(REPO, 'data', 'import_%s.csv' % a.date)
    open(snap, 'w', encoding='utf-8', newline='').write(out)
    if open(snap, encoding='utf-8', newline='').read() != out: sys.exit('snapshot did not write exactly')
    b = out.encode('utf-8')
    print('wrote %s  %d bytes  md5 %s' % (os.path.relpath(snap, REPO), len(b), md5(b)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
