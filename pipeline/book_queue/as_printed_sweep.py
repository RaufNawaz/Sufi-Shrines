#!/usr/bin/env python3
"""As-printed sweep of the Tareekh/Tahqiqat Urdu quotations (Rauf, 16 Oct 2026, HANDOVER §9.357 ruling 14:
"FULLY AS PRINTED (مین, یہان, سکھون, ہی …)", consistent with §9.242). Written 17 Oct 2026 (§9.361).

Why a page image is needed for every line: both transcriptions were partly modernised by the transcribers
(measured 17 Oct: Tareekh has میں 2,792 vs مین 845; Tahqiqat میں 5,818 vs مین 1,748; and on Tahqiqat the
book also prints ی for ے, ہی for ہے, تہا for تھا, ہوی for ہوئی). So the printed form cannot be derived from
the transcription or by rule: each quotation is read off its page image and the reading is recorded in a
readings TSV (data/review/AS_PRINTED_READINGS_<batch>.tsv) before anything is applied.

  as_printed_sweep.py inventory [--out TSV]
      every "…" quotation with Arabic script in entries/descriptions/<id>.md whose next citation on the
      line is Tarikh-e Lahore or Tahqiqat-e Chishti, with the cited PDF page(s). Read-only.
  as_printed_sweep.py apply READINGS.tsv [--conf high] [--kind ortho] [--dry-run]
      applies `proposed` for the selected lines to: the draft line (entries/descriptions/<id>.md, the cited
      line only), the import CSV's Description parts (data/import_2026-10-15.csv, same replacements, then
      parts joined '\\n\\n' must equal the draft exactly as they did before), the row's shrine entry and the
      book's consolidated takeaways (only on lines that cite the same page, so a like phrase from another page
      is never touched). REFUSES the whole run if any selected line's old quote is not on its draft line, the
      entry has no page-scoped occurrence (check_description_draft Q1 would fail), or the CSV/draft equality
      breaks. A line whose draft already carries `proposed` is reported as already applied and skipped, so a
      second run writes nothing. Backups: out/as_printed_sweep/apply_<UTC stamp>/.
Never touches the sheet, the transcriptions, the Pass-1 chunk notes or the new-row patch CSVs.
"""
import argparse, csv, glob, hashlib, json, os, re, shutil, sys, time

csv.field_size_limit(10**9)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AR = r'؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿'
Q = re.compile(r'"([^"]*[%s][^"]*)"' % AR)
CIT = re.compile(r'\(([^()]*?pp?\. ([\d–\-, ]+)[^()]*)\)')
IMP = 'data/import_2026-10-15.csv'
DCOLS = ['Description', 'Description 2', 'Description 3', 'Description 4', 'Description 5']
TAKE = {'tareekh_lahore': 'entries/book_takeaways/tareekh_lahore', 'tahqiqat_chishti': 'entries/book_takeaways/tahqiqat_chishti'}
md5 = lambda p: hashlib.md5(open(p, 'rb').read()).hexdigest()[:8]


def book_of(c):
    if 'Tarikh-e Lahore' in c: return 'tareekh_lahore'
    if 'Tahqiqat' in c: return 'tahqiqat_chishti'
    return None


def inventory(out):
    rows = []
    for p in sorted(glob.glob(os.path.join(ROOT, 'entries/descriptions/*.md'))):
        if p.endswith('.notes.md'): continue
        rid = os.path.basename(p)[:-3]
        for ln, line in enumerate(open(p, encoding='utf-8'), 1):
            # an original-script block line (HANDOVER §9.366): "> QUOTE — (citation)"
            bm = re.match(r'^> (.*\S)\s+\u2014\s+(\(.*\))\s*$', line.rstrip('\n'))
            if bm:
                c = CIT.search(bm.group(2))
                b = book_of(c.group(1)) if c else None
                if b:
                    rows.append([rid, 'L%d' % ln, b, '/'.join(re.findall(r'\d+', c.group(2))), bm.group(1)])
                continue
            for m in Q.finditer(line):
                c = CIT.search(line, m.end())
                if not c: continue
                b = book_of(c.group(1))
                if not b: continue
                rows.append([rid, 'L%d' % ln, b, '/'.join(re.findall(r'\d+', c.group(2))), m.group(1)])
    w = csv.writer(open(out, 'w', encoding='utf-8'), delimiter='\t', lineterminator='\n')
    w.writerow(['id', 'draft_line', 'book', 'pdf_page', 'quote'])
    w.writerows(rows)
    pages = {(r[2], p) for r in rows for p in r[3].split('/')}
    print(f'{len(rows)} quotations in {len({r[0] for r in rows})} rows, {len(pages)} cited pages -> {out}')


def page_re(pages):
    return re.compile(r'pp?\. [^)]*?(?<!\d)(%s)(?!\d)' % '|'.join(map(re.escape, pages)))


def apply(readings, conf, kind, dry):
    os.chdir(ROOT)
    sel = [r for r in csv.DictReader(open(readings, encoding='utf-8'), delimiter='\t')
           if r['proposed'] and r['proposed'] != r['draft_quote'] and r['confidence'] in conf and r['kind'] in kind]
    texts, bad, edits, done = {}, 0, [], 0
    get = lambda f: texts.setdefault(f, open(f, encoding='utf-8').read())
    for r in sel:
        old, new, rid, ln = r['draft_quote'], r['proposed'], r['id'], int(r['draft_line'][1:])
        d = f'entries/descriptions/{rid}.md'
        line = get(d).split('\n')[ln - 1]
        if f'"{old}"' not in line:
            if f'"{new}"' in line: done += 1; print(f'already applied n={r["n"]}'); continue
            print(f'REFUSE n={r["n"]}: old quote not on {d}:{ln}'); bad += 1; continue
        edits.append(r)
    # entries and takeaways: page-scoped
    plan = []
    for r in edits:
        old, new, rid = r['draft_quote'], r['proposed'], r['id']
        pr = page_re(r['pdf_page'].split('/'))
        files = [f'shrine_entries/{rid}.md'] + sorted(glob.glob(TAKE[r['book']] + '.md') + glob.glob(TAKE[r['book']] + '/*.md'))
        files = [f for f in files if os.path.exists(f) and '.notes.' not in f and '/chunk_' not in f]
        for f in files:
            n = sum(l.count(old) for l in get(f).split('\n') if pr.search(l))
            if f.startswith('shrine_entries/') and n == 0:
                print(f'REFUSE n={r["n"]}: no occurrence citing p. {r["pdf_page"]} in {f}'); bad += 1
            if n: plan.append((r, f, n))
    if bad: sys.exit(1)
    # the import CSV
    hdr, rows = None, None
    with open(IMP, encoding='utf-8', newline='') as fh:
        rd = csv.reader(fh); hdr = next(rd); rows = list(rd)
    import io
    buf = io.StringIO(); w0 = csv.writer(buf, lineterminator='\n'); w0.writerow(hdr); w0.writerows(rows)
    if buf.getvalue() != open(IMP, encoding='utf-8', newline='').read():
        print(f'REFUSE: {IMP} does not round-trip byte-exact through csv'); sys.exit(1)
    ix = {c: hdr.index(c) for c in DCOLS + ['id']}
    byid = {row[ix['id']]: row for row in rows}
    touched = sorted({r['id'] for r in edits})
    for rid in touched:
        row = byid.get(rid)
        draft = get(f'entries/descriptions/{rid}.md')
        if row is None or '\n\n'.join(row[ix[c]] for c in DCOLS if row[ix[c]]).rstrip('\n') != draft.rstrip('\n'):
            print(f'REFUSE: import CSV parts of {rid} do not equal its draft before the edit'); bad += 1
    if bad: sys.exit(1)
    new_texts = dict(texts)
    for r in edits:
        d = f'entries/descriptions/{r["id"]}.md'; ln = int(r['draft_line'][1:])
        L = new_texts[d].split('\n'); k = L[ln - 1].count(f'"{r["draft_quote"]}"')
        L[ln - 1] = L[ln - 1].replace(f'"{r["draft_quote"]}"', f'"{r["proposed"]}"')
        new_texts[d] = '\n'.join(L)
        row = byid[r['id']]; left = k
        for c in DCOLS:
            if left and f'"{r["draft_quote"]}"' in row[ix[c]]:
                m = min(left, row[ix[c]].count(f'"{r["draft_quote"]}"'))
                row[ix[c]] = row[ix[c]].replace(f'"{r["draft_quote"]}"', f'"{r["proposed"]}"', m); left -= m
        if left: print(f'REFUSE n={r["n"]}: {left} occurrence(s) not found in the import CSV'); sys.exit(1)
        print(f'n={r["n"]} {r["id"]} {r["draft_line"]}: draft {k}x')
    for r, f, n in plan:
        pr = page_re(r['pdf_page'].split('/'))
        new_texts[f] = '\n'.join(l.replace(r['draft_quote'], r['proposed']) if pr.search(l) else l
                                 for l in new_texts[f].split('\n'))
        print(f'   {f}: {n}x (page-scoped)')
    for rid in touched:
        row = byid[rid]
        if '\n\n'.join(row[ix[c]] for c in DCOLS if row[ix[c]]).rstrip('\n') != new_texts[f'entries/descriptions/{rid}.md'].rstrip('\n'):
            print(f'REFUSE: CSV/draft equality broken for {rid}'); sys.exit(1)
    print(f'check ok: {len(edits)} lines to apply, {done} already applied, {len({f for _, f, _ in plan})} record files')
    if dry or not edits: return
    bk = 'out/as_printed_sweep/apply_' + time.strftime('%Y%m%dT%H%M%SZ', time.gmtime())
    for f in [f for f in new_texts if new_texts[f] != texts[f]] + [IMP]:
        dst = os.path.join(bk, f); os.makedirs(os.path.dirname(dst), exist_ok=True); shutil.copy2(f, dst)
    for f, t in new_texts.items():
        if t != texts[f]:
            b = md5(f); open(f, 'w', encoding='utf-8', newline='').write(t); print(f'{f}: {b} -> {md5(f)}')
    b = md5(IMP)
    with open(IMP, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, lineterminator='\n'); w.writerow(hdr); w.writerows(rows)
    print(f'{IMP}: {b} -> {md5(IMP)}  (backups in {bk})')
    fail = [r['n'] for r in edits if f'"{r["proposed"]}"' not in open(f'entries/descriptions/{r["id"]}.md', encoding='utf-8').read()]
    print('verify', 'FAILED ' + str(fail) if fail else 'ok'); sys.exit(1 if fail else 0)


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    a = sp.add_parser('inventory'); a.add_argument('--out', default=os.path.join(ROOT, 'data/review/AS_PRINTED_SWEEP_inventory.tsv'))
    b = sp.add_parser('apply'); b.add_argument('readings'); b.add_argument('--conf', default='high')
    b.add_argument('--kind', default='ortho'); b.add_argument('--dry-run', action='store_true')
    x = ap.parse_args()
    if x.cmd == 'inventory': inventory(x.out)
    else: apply(x.readings, set(x.conf.split(',')), set(x.kind.split(',')), x.dry_run)
