#!/usr/bin/env python3
"""Rauf's ruling of 15 Oct 2026 (HANDOVER §9.351), encoded as a check (CLAUDE.md RULE 4).

  (a) a Location cell holds only the location itself: no survey/pin meta-commentary;
  (c) a Description holds no meta-text about what the surveyor uploaded, which sources were or
      were not supplied, or what the survey omits.

  scan  [CSV]            scan the import CSV (default data/import_2026-10-15.csv) and
                         entries/descriptions/*.md; exit 1 on any hit.
  (10) Rauf, 16 Oct 2026 (§9.357 ruling 10): no 2026 field-survey attribution ("the survey states",
      "according to the survey", "the surveyor", "per the survey" ...) in running prose: it is written
      as reported fact ("It is reported that ..."), EXCEPT inside a "Where the Sources Disagree"
      section (and the Bibliography). A line kept under the exception's reason (weighed against a
      named book) or a false match (another, published survey) is listed, exact, in
      pipeline/book_queue/location_meta_exceptions.tsv; an exception that matches nothing fails.

  verify-patch PATCH [CSV]
                         every patch line's `old` occurs EXACTLY once in its target (the CSV cell,
                         Description parts joined as the site joins them, and the md draft when one
                         exists); applies the patch in memory and re-scans the touched rows; writes
                         nothing; exit 1 on any failure.

  apply PATCH [CSV]      verify-patch, then write the CSV (byte-exact round trip checked first) and
                         the md drafts, backing every file up to out/location_meta_apply/<stamp>/.

Patch TSV columns: id, field, action, old, new, note.  field = Location | Description | qa_note.
action = replace (old -> new) | append (new appended to the cell after a newline; old empty).
`\\n` in old/new means a newline.
"""
import csv, glob, os, re, sys

csv.field_size_limit(10**9)
DCOLS = ['Description', 'Description 2', 'Description 3', 'Description 4', 'Description 5']
LOC_META = re.compile(r'(survey|surveyor|\bpin\b|coordinat|approximate landmark|not recorded|'
                      r'is stated anywhere|as given in|see Bibliography)', re.I)
DESC_META = re.compile(r'(surveyor uploaded|photographs? and one audio|no book or pamphlet|'
                       r'was supplied|were supplied|no copy was supplied|none was available|'
                       r"this entry's only source|in the account's own terms|"
                       r'does not, however, give|information the source gives)', re.I)


FS = re.compile(r"(\bthe (2026 )?(field )?survey\b|\bsurveyor|survey's|field survey|per the survey)", re.I)
EXC_PATH = 'pipeline/book_queue/location_meta_exceptions.tsv'


def load_exc():
    if not os.path.exists(EXC_PATH):
        return []
    out = []
    for ln in open(EXC_PATH, encoding='utf-8').read().split('\n')[1:]:
        if ln.strip():
            i, kind, text, reason = ln.split('\t')
            out.append([i, kind, text, reason, 0])
    return out


def fs_hits(i, kind, text, exc):
    hits, sec = [], ''
    for p in text.split('\n'):
        if p.startswith('#'):
            sec = p
        if 'Bibliography' in sec or 'Disagree' in sec:
            continue
        if FS.search(p):
            m = [e for e in exc if e[0] == i and e[1] == kind and e[2] in p]
            if m:
                for e in m:
                    e[4] += 1
                continue
            hits.append((i, kind + ' survey-attribution', p[:160]))
    return hits


def load(path):
    with open(path, encoding='utf-8', newline='') as f:
        return list(csv.DictReader(f))


def desc(r):
    return '\n\n'.join(r[c] for c in DCOLS if r.get(c))


def scan_rows(rows, only=None, exc=None):
    hits = []
    exc = load_exc() if exc is None else exc
    for r in rows:
        if only and r['id'] not in only:
            continue
        if LOC_META.search(r.get('Location') or ''):
            hits.append((r['id'], 'Location', (r['Location'] or '')[:160]))
        for p in desc(r).split('\n'):
            if DESC_META.search(p) and not p.startswith('- '):
                hits.append((r['id'], 'Description', p[:160]))
        hits += fs_hits(r['id'], 'Description', desc(r), exc)
    return hits


def scan_md(only=None, exc=None):
    hits = []
    exc = load_exc() if exc is None else exc
    for fn in sorted(glob.glob('entries/descriptions/*.md')):
        if fn.endswith('.notes.md'):
            continue
        i = os.path.basename(fn)[:-3]
        if only and i not in only:
            continue
        t = open(fn, encoding='utf-8').read()
        for p in t.split('\n'):
            if DESC_META.search(p) and not p.startswith('- '):
                hits.append((i, 'md', p[:160]))
        hits += fs_hits(i, 'md', t, exc)
    return hits


def unesc(s):
    return s.replace('\\n', '\n')


def verify(patch, csvpath, out=None):
    rows = {r['id']: r for r in load(csvpath)}
    bad = 0
    lines = list(csv.reader(open(patch, encoding='utf-8'), delimiter='\t'))
    hdr, lines = lines[0], lines[1:]
    assert hdr == ['id', 'field', 'action', 'old', 'new', 'note'], hdr
    touched = set()
    mds = {}
    for n, (i, field, action, old, new, note) in enumerate(lines, 2):
        old, new = unesc(old), unesc(new)
        if i not in rows:
            print(f'line {n}: unknown id {i}'); bad += 1; continue
        r = rows[i]; touched.add(i)
        if action == 'append':
            if old:
                print(f'line {n}: append with non-empty old'); bad += 1
            r[field] = (r.get(field) or '') + ('\n' if r.get(field) else '') + new
            continue
        if action != 'replace':
            print(f'line {n}: bad action {action}'); bad += 1; continue
        if field == 'Description':
            parts = [c for c in DCOLS if r.get(c)]
            cnt = sum(r[c].count(old) for c in parts)
            if cnt != 1:
                print(f'line {n}: {i} Description old occurs {cnt}x (want 1)'); bad += 1; continue
            for c in parts:
                if old in r[c]:
                    r[c] = r[c].replace(old, new)
            md = f'entries/descriptions/{i}.md'
            if os.path.exists(md):
                t = mds.setdefault(md, open(md, encoding='utf-8').read())
                k = t.count(old)
                if k != 1:
                    print(f'line {n}: {md} old occurs {k}x (want 1)'); bad += 1; continue
                mds[md] = t.replace(old, new)
        else:
            k = (r.get(field) or '').count(old)
            if k != 1:
                print(f'line {n}: {i} {field} old occurs {k}x (want 1)'); bad += 1; continue
            r[field] = r[field].replace(old, new)
    exc = load_exc()
    left = scan_rows(rows.values(), touched, exc)
    for md, t in mds.items():
        for p in t.split('\n'):
            if DESC_META.search(p) and not p.startswith('- '):
                left.append((md, 'md', p[:160]))
        left += fs_hits(os.path.basename(md)[:-3], 'md', t, exc)
    if out is not None:
        out.update(rows=rows, mds=mds)
    for h in left:
        print('STILL META after patch:', *h)
    bad += len(left)
    print(f'{len(lines)} patch lines, {len(touched)} rows, {len(mds)} md drafts; failures {bad}')
    return 1 if bad else 0


def apply(patch, csvpath):
    import hashlib, io, shutil, time
    raw = open(csvpath, encoding='utf-8', newline='').read()
    grid = list(csv.reader(io.StringIO(raw)))
    o = io.StringIO(); csv.writer(o, lineterminator='\n').writerows(grid)
    if o.getvalue() != raw:
        print('REFUSE: the CSV does not round-trip byte-exact; nothing written'); return 1
    st = {}
    if verify(patch, csvpath, st):
        print('REFUSE: verify-patch failed; nothing written'); return 1
    hdr = grid[0]; idx = hdr.index('id')
    for row in grid[1:]:
        r = st['rows'].get(row[idx])
        if r:
            row[:] = [r[h] for h in hdr]
    bdir = 'out/location_meta_apply/' + time.strftime('%Y%m%dT%H%M%S'); os.makedirs(bdir)
    shutil.copy2(csvpath, bdir)
    for md in st['mds']:
        shutil.copy2(md, bdir)
    o = io.StringIO(); csv.writer(o, lineterminator='\n').writerows(grid)
    open(csvpath, 'w', encoding='utf-8', newline='').write(o.getvalue())
    for md, t in st['mds'].items():
        open(md, 'w', encoding='utf-8').write(t)
    for f in [csvpath] + list(st['mds']):
        print(hashlib.md5(open(f, 'rb').read()).hexdigest()[:8], f)
    print('backups in', bdir)
    return 0


def main(a):
    if not a or a[0] not in ('scan', 'verify-patch', 'apply'):
        print(__doc__); return 2
    if a[0] == 'scan':
        path = a[1] if len(a) > 1 else 'data/import_2026-10-15.csv'
        exc = load_exc()
        hits = scan_rows(load(path), None, exc) + scan_md(None, exc)
        for h in hits:
            print(*h, sep=' | ')
        stale = [e for e in exc if not e[4]]
        for e in stale:
            print('STALE exception (matches nothing):', *e[:3], sep=' | ')
        print(f'{len(hits)} hits, {len(stale)} stale exceptions')
        return 1 if hits or stale else 0
    if a[0] == 'apply':
        return apply(a[1], a[2] if len(a) > 2 else 'data/import_2026-10-15.csv')
    return verify(a[1], a[2] if len(a) > 2 else 'data/import_2026-10-15.csv')


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
