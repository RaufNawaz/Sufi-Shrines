#!/usr/bin/env python3
"""check_quote_blocks.py — the instrument for moving Urdu/Persian/Punjabi quotations out of English
sentences into an original-script block under each paragraph (Rauf, 18 October 2026, "B everywhere";
HANDOVER §9.366; brief docs/prompts/QUOTE_BLOCKS_BRIEF.md).

    python3 pipeline/book_queue/check_quote_blocks.py begin ID [ID ...]   back up drafts before editing
    python3 pipeline/book_queue/check_quote_blocks.py check ID [ID ...]   compare each draft with its backup
    python3 pipeline/book_queue/check_quote_blocks.py status              what is left
    python3 pipeline/book_queue/check_quote_blocks.py done ID [ID ...]    record rows that pass `check`
    python3 pipeline/book_queue/check_quote_blocks.py rekey ID [ID ...]   move the row's line-keyed exceptions
        (urdu_script_exceptions.tsv, location_meta_exceptions.tsv) to the lines their runs are on now;
        refuses if a run is no longer in the draft or is on more than one line

Backups: out/quote_blocks/before/<id>.md (begin refuses to overwrite one). Rows done:
pipeline/book_queue/quote_blocks_done.txt (`check` is run on every one of them by `check` with no ids).

check, per row (exit 1 on any failure):
  QB1 no Arabic-script character left in an English prose paragraph (a paragraph with Latin letters
      that is not a heading, a list, a verse paragraph or a '> ' block), outside ## Bibliography
  QB2 every Arabic-script quotation of the backup ("…" with Arabic script, or any Arabic run in a
      prose paragraph) occurs in a '> ' line of the SAME ## section of the draft; and every '> '
      line's text occurs in the backup's same section (no Urdu lost, none added)
  QB3 every citation group "(… p. N …)" of the backup's section is still in the draft's section,
      as many times or more
  QB4 a '> ' block follows a prose paragraph, never a heading, a list or another block
  QB5 headings, verse paragraphs, list paragraphs and the Bibliography unchanged
  QB6 every number of the backup's English (digits outside Arabic script) still occurs in the
      section as often or more
Then also run check_description_draft.py ID (F1 knows the '> ' shape).
"""
import collections, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
DRAFTS = os.path.join(REPO, 'entries', 'descriptions')
BEFORE = os.path.join(REPO, 'out', 'quote_blocks', 'before')
DONE = os.path.join(HERE, 'quote_blocks_done.txt')
AR = '؀-ۿݐ-ݿﭐ-﷿ﹰ-﻿'
ARABIC = re.compile('[%s]' % AR)
LATIN = re.compile(r'[A-Za-z]')
FLAGS = re.compile(r'\[(?:OCR\?|illegible[^\]]*|text-layer\?|\?)\]')
QUOTE = re.compile(r'"([^"]*)"|\u2018([^\u2019]*)\u2019')  # paired in order, then filtered for Arabic
RUN = re.compile(r'[%s](?:[%s\s.,:;!?()\'\-…/]|\[(?:OCR\?|illegible[^\]]*|text-layer\?|\?)\])*' % (AR, AR))
CITE = re.compile(r'\(([^()]*\bpp?\. [^()]*)\)')
TAIL = re.compile(r'^(.*\S)\s+—\s+\((.*)\)\s*$')


def norm(s):
    s = s.replace('**', '').replace('*', '').replace('‌', '')
    return re.sub(r'\s+', ' ', s).strip(' ,.;:…')


def paras(text):
    return [p for p in re.split(r'\n\s*\n', text.strip()) if p.strip()]


def kind(p):
    lines = [l for l in p.split('\n') if l.strip()]
    if p.startswith('## '):
        return 'heading'
    if all(l.startswith('- ') for l in lines):
        return 'list'
    if all(l.startswith('> ') for l in lines):
        return 'block'
    if all(ARABIC.search(l) and not LATIN.search(FLAGS.sub('', l)) for l in lines):
        return 'verse'
    return 'prose'


def sections(text):
    """[(heading, [paragraphs])], the lead under heading ''."""
    out = [('', [])]
    for p in paras(text):
        if p.startswith('## '):
            out.append((p.split('\n')[0], []))
            rest = p.split('\n', 1)[1] if '\n' in p else ''
            if rest.strip():
                out[-1][1].append(rest)
        else:
            out[-1][1].append(p)
    return out


def block_texts(ps):
    out = []
    for p in ps:
        if kind(p) == 'block':
            for l in p.split('\n'):
                if l.strip():
                    body = l[2:].strip()
                    m = TAIL.match(body)
                    out.append(norm(m.group(1) if m else body))
    return out


def before_quotes(ps):
    out = []
    for p in ps:
        if kind(p) != 'prose':
            continue
        taken = []
        for m in QUOTE.finditer(p):
            body = m.group(1) if m.group(1) is not None else m.group(2)
            if ARABIC.search(body):
                out.append(norm(body))
                taken.append((m.start(), m.end()))
        rest = ''.join(ch if not any(a <= i < b for a, b in taken) else ' ' for i, ch in enumerate(p))
        for m in RUN.finditer(rest):
            # a run can swallow the straight ' that closes a '…' quotation or the ( that opens the
            # citation after it, or the ) of a parenthesis around it (RUN allows all three inside);
            # they are punctuation of the English, not of the quotation (§9.368: 'گنیش', '۱۲۶۷ھ (',
            # '(مهادیو)')
            t = norm(m.group(0)).strip("'() ")
            t = norm(t)
            if ARABIC.search(t):
                out.append(t)
    return [q for q in out if q]


def english_numbers(ps):
    c = collections.Counter()
    for p in ps:
        if kind(p) in ('prose', 'list'):
            t = QUOTE.sub(lambda m: ' ' if ARABIC.search(m.group(0)) else m.group(0), p)
            c.update(re.findall(r'(?<![\w])\d[\d,–\-]*', t))
    return c


def check(id_):
    errs = []
    dp, bp = os.path.join(DRAFTS, id_ + '.md'), os.path.join(BEFORE, id_ + '.md')
    if not os.path.exists(bp):
        return ['no backup %s — run `begin` before editing' % os.path.relpath(bp, REPO)]
    new, old = open(dp, encoding='utf-8').read(), open(bp, encoding='utf-8').read()
    S_new, S_old = sections(new), sections(old)
    if [h for h, _ in S_new] != [h for h, _ in S_old]:
        return ['QB5 headings changed: %r -> %r' % ([h for h, _ in S_old], [h for h, _ in S_new])]
    for (h, pn), (_, po) in zip(S_new, S_old):
        name = h or '(lead)'
        bib = h.strip() == '## Bibliography'
        if bib:
            if pn != po:
                errs.append('QB5 the Bibliography changed')
            continue
        for k in ('verse', 'list'):
            if [p for p in pn if kind(p) == k] != [p for p in po if kind(p) == k]:
                errs.append('QB5 %s: %s paragraphs changed' % (name, k))
        prev = None
        for p in pn:
            k = kind(p)
            if k == 'prose' and ARABIC.search(p):
                m = ARABIC.search(p)
                errs.append('QB1 %s: Arabic script left in English prose: …%s…' % (name, p[max(0, m.start() - 50):m.start() + 40]))
            if k == 'block' and prev != 'prose':
                errs.append('QB4 %s: a > block follows %s, not a prose paragraph' % (name, prev or 'the heading'))
            prev = k
        blocks = block_texts(pn)
        pool_new = ' ‖ '.join(blocks)
        for q in before_quotes(po):
            if q not in pool_new:
                errs.append('QB2 %s: quotation missing from the > blocks: %r' % (name, q[:90]))
        pool_old = ' ‖ '.join(before_quotes(po) + block_texts(po))
        for b in blocks:
            for piece in re.split(r'\s*…\s*', b):
                if piece and piece not in pool_old:
                    errs.append('QB2 %s: > line not in the backup\'s quotations: %r' % (name, piece[:90]))
        co = collections.Counter(norm(m.group(1)) for p in po for m in CITE.finditer(p))
        cn = collections.Counter(norm(m.group(1)) for p in pn for m in CITE.finditer(p))
        for c, n in co.items():
            if cn[c] < n:
                errs.append('QB3 %s: citation lost (%d -> %d): (%s)' % (name, n, cn[c], c[:90]))
        no, nn = english_numbers(po), english_numbers(pn) + collections.Counter(
            d for p in pn if kind(p) == 'block' for d in re.findall(r'(?<![\w])\d[\d,–\-]*', p))
        for d, n in no.items():
            if nn[d] < n:
                errs.append('QB6 %s: number %r occurs %d time(s), was %d' % (name, d, nn[d], n))
    return errs


def todo():
    out = []
    for f in sorted(os.listdir(DRAFTS)):
        if not f.endswith('.md') or f.endswith('.notes.md'):
            continue
        n = 0
        for h, ps in sections(open(os.path.join(DRAFTS, f), encoding='utf-8').read()):
            if h.strip() == '## Bibliography':
                continue
            n += sum(1 for p in ps if kind(p) == 'prose' and ARABIC.search(p))
        if n:
            out.append((n, f[:-3]))
    return sorted(out)


def done_ids():
    if not os.path.exists(DONE):
        return []
    return [l.strip() for l in open(DONE, encoding='utf-8') if l.strip() and not l.startswith('#')]


def rekey(ids):
    for fname in ('urdu_script_exceptions.tsv', 'location_meta_exceptions.tsv'):
        path = os.path.join(HERE, fname)
        if not os.path.exists(path):
            continue
        rows = open(path, encoding='utf-8').read().split('\n')
        head = rows[0].split('\t')
        if 'id' not in head or 'field' not in head:
            print('%s: no id/field columns, skipped' % fname); continue
        ci, cf = head.index('id'), head.index('field')
        cr = head.index('run') if 'run' in head else None
        changed = 0
        for k, r in enumerate(rows[1:], 1):
            f = r.split('\t')
            if len(f) <= max(ci, cf) or f[ci] not in ids or not re.match(r'^L\d+$', f[cf]) or cr is None:
                continue
            lines = open(os.path.join(DRAFTS, f[ci] + '.md'), encoding='utf-8').read().split('\n')
            hits = [n for n, l in enumerate(lines, 1) if f[cr] in l]
            if len(hits) != 1:
                print('REFUSED %s: %s %s run %r is on %d lines' % (fname, f[ci], f[cf], f[cr][:50], len(hits))); return 1
            if f[cf] != 'L%d' % hits[0]:
                f[cf] = 'L%d' % hits[0]; rows[k] = '\t'.join(f); changed += 1
        if changed:
            open(path, 'w', encoding='utf-8').write('\n'.join(rows))
        print('%s: %d line key(s) moved' % (fname, changed))
    return 0


def main(a):
    if not a or a[0] not in ('begin', 'check', 'status', 'done', 'rekey'):
        print(__doc__); return 2
    cmd, ids = a[0], a[1:]
    if cmd == 'begin':
        os.makedirs(BEFORE, exist_ok=True)
        for i in ids:
            bp = os.path.join(BEFORE, i + '.md')
            if os.path.exists(bp):
                print('%s: backup exists, kept (%s)' % (i, os.path.relpath(bp, REPO))); continue
            shutil.copy2(os.path.join(DRAFTS, i + '.md'), bp); print('%s: backed up' % i)
        return 0
    if cmd == 'rekey':
        return rekey(ids)
    if cmd == 'status':
        t, d = todo(), done_ids()
        print('rows done: %d; rows with Arabic script in English prose: %d (%d paragraphs)'
              % (len(d), len(t), sum(n for n, _ in t)))
        for n, i in t:
            print('  %4d  %s' % (n, i))
        return 0
    if cmd == 'done':
        bad = sum(1 for i in ids if check(i))
        if bad:
            print('refused: %d row(s) fail `check`' % bad); return 1
        have = done_ids()
        with open(DONE, 'a', encoding='utf-8') as fh:
            for i in ids:
                if i not in have:
                    fh.write(i + '\n')
        print('recorded: %s' % ', '.join(ids)); return 0
    ids = ids or done_ids()
    bad = 0
    for i in ids:
        errs = check(i)
        print('%s  %s' % ('FAIL' if errs else 'ok  ', i))
        for e in errs:
            print('   ' + e)
        bad += bool(errs)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
