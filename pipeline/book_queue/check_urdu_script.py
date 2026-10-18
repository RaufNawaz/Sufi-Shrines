#!/usr/bin/env python3
"""Urdu-script accuracy check of the new material against the OCR transcriptions (RULE 4).

Rauf, 15 Oct 2026 ~05:30Z (HANDOVER §9.351): "make sure the Urdu script is accurate for all of
these new things". This tool checks every Arabic-script run in
  * the rewritten Descriptions  entries/descriptions/<id>.md   (not the .notes.md files), and
  * the 318 proposed new rows    data/review/PATCH_new_rows_*.csv (`_name_ur` and every other cell)
against the printed forms in out/ocr/*/p001-end_*_transcribed.txt.

Each run gets ONE class, the first that matches:
  exact      the run occurs verbatim (whitespace runs collapsed) in a transcription
  marks      occurs once diacritics, tatweel and ZWNJ/ZWJ are removed from both sides
  ortho      occurs once orthographic variants are folded (ي ى→ی, ك→ک, ه ة ۀ ۂ→ہ, أ إ ٱ→ا,
             Arabic-Indic digits→ASCII). The printed form differs from ours in a letter shape:
             report it, the house rule is orthography AS PRINTED (§9.242).
  spacing    occurs only once all spaces are also removed (word joins/splits differ from print)
  gapped     every token found IN ORDER in one stretch of one book with <=25 words between
             neighbours: a page break, running head, footnote numeral or [OCR?] word inside the
             quotation, or an elision. absent_tokens then lists the skipped printed words: read them.
  partial    not found whole; every token found somewhere (a changed word, or assembled)
  missing    at least one token occurs in no transcription at all  -> look first
Runs of one letter, and runs that are only digits/punctuation, are skipped.

Usage:
  check_urdu_script.py scan [--out TSV] [--md MD]     write the report; exit 1 if any ortho/missing
  check_urdu_script.py show ID                         print the non-exact runs of one id
No file outside --out/--md is ever written. Never edits a Description, patch or entry.
"""
import argparse, csv, glob, os, re, sys, unicodedata
from collections import Counter, defaultdict

csv.field_size_limit(10**9)
ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
AR_CH = r'؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿'
RUN = re.compile(r'[%s](?:[%s‌‍ ]*[%s])?' % (AR_CH, AR_CH, AR_CH))
LETTER = re.compile(r'[ء-غف-يٱ-ۓۺ-ۼ]')
MARKS = re.compile(r'[ؐ-ًؚ-ٰٟۖ-ۭـ‌‍‎‏]')
FOLD = str.maketrans({'ي': 'ی', 'ى': 'ی', 'ئ': 'ئ', 'ك': 'ک', 'ه': 'ہ', 'ة': 'ہ', 'ۀ': 'ہ', 'ۂ': 'ہ',
                      'أ': 'ا', 'إ': 'ا', 'ٱ': 'ا', 'ؤ': 'ؤ',
                      **{chr(0x0660 + i): str(i) for i in range(10)},
                      **{chr(0x06F0 + i): str(i) for i in range(10)}})
WS = re.compile(r'\s+')


def n0(s): return WS.sub(' ', unicodedata.normalize('NFC', s)).strip()
def n1(s): return WS.sub(' ', MARKS.sub('', n0(s))).strip()
def n2(s): return n1(s).translate(FOLD)
def n3(s): return n2(s).replace(' ', '')


def load_books():
    books = {}
    for p in sorted(glob.glob(os.path.join(ROOT, 'out/ocr/*/p001-end_*_transcribed.txt'))):
        slug = p.split('/out/ocr/')[1].split('/')[0]
        t = open(p, encoding='utf-8').read()
        if not LETTER.search(t):
            continue
        # keep only Arabic-script text and spaces, so English prose between words cannot bridge a match
        t = re.sub(r'[^%s\s]' % AR_CH, ' ', t)
        books[slug] = {0: n0(t), 1: n1(t), 2: n2(t), 3: n3(t)}
    return books


def material():
    """yield (kind, id, field, run)"""
    for p in sorted(glob.glob(os.path.join(ROOT, 'entries/descriptions/*.md'))):
        if p.endswith('.notes.md'):
            continue
        rid = os.path.basename(p)[:-3]
        for ln, line in enumerate(open(p, encoding='utf-8'), 1):
            for m in RUN.finditer(line):
                yield 'description', rid, 'L%d' % ln, m.group(0)
    for p in sorted(glob.glob(os.path.join(ROOT, 'data/review/PATCH_new_rows_*.csv'))):
        for row in csv.DictReader(open(p, encoding='utf-8')):
            for k, v in row.items():
                for m in RUN.finditer(v or ''):
                    yield 'new_row', row['id'], k, m.group(0)


def classify(run, books):
    a = [n0(run), n1(run), n2(run), n3(run)]
    for lvl, name in ((0, 'exact'), (1, 'marks'), (2, 'ortho'), (3, 'spacing')):
        if not a[lvl]:
            continue
        hit = [b for b, t in books.items() if a[lvl] in t[lvl]]
        if hit:
            return name, hit, ''
    toks = a[2].split(' ')
    g = gapped(toks, books)
    if g:
        return 'gapped', [g[0]], g[1]
    absent = [t for t in toks if len(t) > 1 and not any(re.search(r'(?<!\S)%s(?!\S)' % re.escape(t), b[2]) for b in books.values())]
    return ('missing' if absent else 'partial'), [], ' '.join(absent)


def gapped(toks, books, maxgap=25):
    """every token of the run, in order, inside one stretch of a book, with at most `maxgap` other
    words between neighbours: a quotation that spans a page break, a running head, a footnote
    marker or an [OCR?] word, or that elides words. Returns (book, the words skipped) or None."""
    if len(toks) < 2:
        return None
    anchor = max(toks, key=len)
    ai = toks.index(anchor)
    for b, t in books.items():
        T = t[2]
        for m in re.finditer(r'(?<!\S)%s(?!\S)' % re.escape(anchor), T):
            left = T[max(0, m.start() - 60 * len(toks) - 600):m.start()].split(' ')
            right = T[m.end():m.end() + 60 * len(toks) + 600].split(' ')
            skipped, ok = [], True
            # walk right from the anchor
            j = 0
            for tok in toks[ai + 1:]:
                k = j
                while k < len(right) and k - j <= maxgap and right[k] != tok:
                    k += 1
                if k >= len(right) or right[k] != tok:
                    ok = False; break
                skipped += right[j:k]; j = k + 1
            if not ok:
                continue
            j = len(left) - 1
            for tok in reversed(toks[:ai]):
                k = j
                while k >= 0 and j - k <= maxgap and left[k] != tok:
                    k -= 1
                if k < 0 or left[k] != tok:
                    ok = False; break
                skipped += left[k + 1:j + 1]; j = k - 1
            if ok:
                return b, ' '.join(w for w in skipped if w)
    return None


def printed_form(run, books, hit):
    """for ortho/marks hits: the printed spelling as it stands in the first book (level-0 text)"""
    key = n2(run)
    for b in hit:
        t0 = books[b][0]
        # walk the level-0 text word-window by word-window; cheap because only called on few runs
        words = t0.split(' ')
        k = len(key.split(' '))
        for i in range(len(words) - k + 1):
            w = ' '.join(words[i:i + k])
            if n2(w) == key:
                return b, w
    return hit[0], ''


EXCEPTIONS = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'urdu_script_exceptions.tsv')


def load_exceptions():
    """Runs Rauf has ruled on that the transcriptions cannot confirm (17 Oct 2026, HANDOVER §9.358):
    `image-verified` (read off a page image; the transcription itself misreads the passage) and
    `legacy-kept` (§9.357 ruling 15: legacy verse with no corpus book behind it, kept as is).
    Keyed on (kind, id, field, run) exactly. Only a `missing`/`partial` run can be excepted, and an
    exception that matches nothing is STALE and fails the scan, so the file cannot rot."""
    if not os.path.exists(EXCEPTIONS):
        return {}
    with open(EXCEPTIONS, encoding='utf-8') as f:
        return {(r['kind'], r['id'], r['field'], r['run']): r['class'] for r in csv.DictReader(f, delimiter='\t')}


def scan(args):
    books = load_books()
    exc, used = load_exceptions(), set()
    rows, cache = [], {}
    for kind, rid, field, run in material():
        if len(LETTER.findall(run)) < 2:
            continue
        if run not in cache:
            cache[run] = classify(run, books)
        cls, hit, absent = cache[run]
        pf = ''
        key = (kind, rid, field, run)
        if key in exc and cls in ('missing', 'partial'):
            cls = exc[key]; used.add(key)
        if cls in ('marks', 'ortho', 'spacing') and hit:
            b, pf = printed_form(run, books, hit) if cls != 'spacing' else (hit[0], '')
        rows.append(dict(kind=kind, id=rid, field=field, cls=cls, run=run, printed=pf,
                         books=','.join(hit[:6]), absent_tokens=absent))
    with open(args.out, 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()), delimiter='\t')
        w.writeheader(); w.writerows(rows)
    c = Counter((r['kind'], r['cls']) for r in rows)
    ids = defaultdict(set)
    for r in rows:
        ids[(r['kind'], r['cls'])].add(r['id'])
    out = ['kind\tclass\truns\tids']
    for k in sorted(c):
        out.append('%s\t%s\t%d\t%d' % (k[0], k[1], c[k], len(ids[k])))
    print('\n'.join(out))
    print('report:', args.out, len(rows), 'runs')
    stale = sorted(set(exc) - used)
    for s in stale:
        print('STALE exception (matches no missing/partial run):', '\t'.join(s[:3]), s[3][:60])
    bad = sum(v for (k, cl), v in c.items() if cl in ('ortho', 'missing')) + len(stale)
    return 1 if bad else 0


def show(args):
    for r in csv.DictReader(open(args.report, encoding='utf-8'), delimiter='\t'):
        if r['id'] == args.id and r['cls'] != 'exact':
            print('\t'.join([r['field'], r['cls'], r['run'], r['printed'], r['books'], r['absent_tokens']]))


if __name__ == '__main__':
    ap = argparse.ArgumentParser()
    sp = ap.add_subparsers(dest='cmd', required=True)
    s = sp.add_parser('scan'); s.add_argument('--out', default=os.path.join(ROOT, 'out/urdu_check/report.tsv'))
    s2 = sp.add_parser('show'); s2.add_argument('id'); s2.add_argument('--report', default=os.path.join(ROOT, 'out/urdu_check/report.tsv'))
    a = ap.parse_args()
    if a.cmd == 'scan':
        os.makedirs(os.path.dirname(a.out), exist_ok=True)
        sys.exit(scan(a))
    show(a)
