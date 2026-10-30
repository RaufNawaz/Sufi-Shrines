#!/usr/bin/env python3
"""check_urdu_out.py — the instrument for Rauf's ruling of 18 October 2026 (HANDOVER §9.369; brief
docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md): **a Description's prose is English only; the only
Arabic-script text left is POETRY, set as verse paragraphs.** Prose quotations in Urdu/Persian/Punjabi/
Arabic are removed, their sense carried in the English sentence. Supersedes the '> ' original-script
blocks of §9.366 (Rauf: "the citations look ugly … the only urdu there should be should be the poetry").

    python3 pipeline/book_queue/check_urdu_out.py status
    python3 pipeline/book_queue/check_urdu_out.py begin ID [ID ...]   back up the ORIGINAL draft (shares
                                                                      out/quote_blocks/before/ with §9.366)
    python3 pipeline/book_queue/check_urdu_out.py check ID [ID ...]   compare with that backup (exit 1 on failure)
    python3 pipeline/book_queue/check_urdu_out.py rekey ID [ID ...]   follow / drop line-keyed Urdu exceptions
    python3 pipeline/book_queue/check_urdu_out.py done ID [ID ...]    record rows that pass (urdu_out_done.txt)

check (against the backup = the draft before any conversion):
  EN1 no Arabic-script character anywhere but in verse paragraphs and ## Bibliography (no '> ' blocks,
      no inline runs, no Urdu in headings)
  EN2 every verse paragraph of the backup is still there, in order; a NEW verse paragraph is allowed only
      if each of its lines occurs in the backup's same section (an inline verse quotation promoted)
  EN3 every citation group "(… p. N …)" of the backup's section is still in the section, as often or more
  EN4 every number of the backup's English (outside Arabic script) still occurs in the section as often or more
  EN5 headings and the Bibliography unchanged (list items are prose and are converted like it)
It also prints how many Arabic-script quotations each row lost — every one must be carried in English;
that cannot be checked by script, so the coordinator reads them (the brief says how).
Then run check_description_draft.py ID, rekey, check_urdu_script.py scan, sync_draft_to_import.py ID.
"""
import collections, os, re, shutil, sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
import check_quote_blocks as qb  # noqa: E402  (sections, kind, before_quotes, norm, CITE, ARABIC)

DRAFTS, BEFORE = qb.DRAFTS, qb.BEFORE
DONE = os.path.join(HERE, 'urdu_out_done.txt')
# Arabic-script-only paragraphs of the original that are PROSE, not verse (kind() cannot tell), and so
# are removed under the ruling like any prose quotation. Exact paragraph text, one per line: id<TAB>text.
PROSE_FILE = os.path.join(HERE, 'urdu_out_prose_paragraphs.tsv')
PROSE_PARAS = set()
if os.path.exists(PROSE_FILE):
    for _l in open(PROSE_FILE, encoding='utf-8'):
        if _l.strip() and not _l.startswith('#') and '\t' in _l:
            _i, _t = _l.rstrip('\n').split('\t', 1)
            PROSE_PARAS.add((_i, _t.strip()))
NUM = re.compile(r'(?<![\w])\d[\d,–\-]*')


def english_numbers(ps):
    c = collections.Counter()
    for p in ps:
        if qb.kind(p) in ('prose', 'list'):
            t = qb.QUOTE.sub(lambda m: ' ' if qb.ARABIC.search(m.group(0)) else m.group(0), p)
            t = qb.RUN.sub(' ', t)
            c.update(NUM.findall(t))
    return c


def check(id_, verbose=True):
    errs = []
    dp, bp = os.path.join(DRAFTS, id_ + '.md'), os.path.join(BEFORE, id_ + '.md')
    if not os.path.exists(bp):
        return ['no backup %s — run `begin` before editing' % os.path.relpath(bp, REPO)], 0
    new, old = open(dp, encoding='utf-8').read(), open(bp, encoding='utf-8').read()
    S_new, S_old = qb.sections(new), qb.sections(old)
    if [h for h, _ in S_new] != [h for h, _ in S_old]:
        return ['EN5 headings changed'], 0
    lost = 0
    for (h, pn), (_, po) in zip(S_new, S_old):
        name = h or '(lead)'
        if qb.ARABIC.search(h):
            errs.append('EN1 Arabic script in a heading: %s' % h)
        if h.strip() == '## Bibliography':
            if pn != po:
                errs.append('EN5 the Bibliography changed')
            continue
        for p in pn:
            k = qb.kind(p)
            if k != 'verse' and qb.ARABIC.search(p):
                m = qb.ARABIC.search(p)
                errs.append('EN1 %s: Arabic script outside verse (%s): …%s…'
                            % (name, k, p[max(0, m.start() - 40):m.start() + 40].replace('\n', ' ')))
        vo = [p for p in po if qb.kind(p) == 'verse']
        vn = [p for p in pn if qb.kind(p) == 'verse']
        vo = [v for v in vo if (id_, v.strip()) not in PROSE_PARAS]
        it = iter(vn)
        if not all(any(v == w for w in it) for v in vo):
            errs.append('EN2 %s: a verse paragraph of the original is missing or changed' % name)
        pool = ' ‖ '.join(qb.before_quotes(po))
        for v in vn:
            if v in vo:
                continue
            for line in [l.strip() for l in v.split('\n') if l.strip()]:
                for half in re.split(r'\s*٭\s*', line):
                    if half and qb.norm(half) not in pool:
                        errs.append('EN2 %s: new verse line not in the original section: %r' % (name, half[:80]))
        lost += len(qb.before_quotes(po)) - sum(1 for v in vn if v not in vo)
        co = collections.Counter(qb.norm(m.group(1)) for p in po for m in qb.CITE.finditer(p))
        cn = collections.Counter(qb.norm(m.group(1)) for p in pn for m in qb.CITE.finditer(p))
        for c, n in co.items():
            if cn[c] < n:
                errs.append('EN3 %s: citation lost (%d -> %d): (%s)' % (name, n, cn[c], c[:90]))
        no, nn = english_numbers(po), english_numbers(pn)
        for d, n in no.items():
            if nn[d] < n:
                errs.append('EN4 %s: number %r occurs %d time(s), was %d' % (name, d, nn[d], n))
    return errs, lost


def todo():
    out = []
    for f in sorted(os.listdir(DRAFTS)):
        if not f.endswith('.md') or f.endswith('.notes.md'):
            continue
        n = 0
        for h, ps in qb.sections(open(os.path.join(DRAFTS, f), encoding='utf-8').read()):
            if h.strip() == '## Bibliography':
                continue
            n += sum(1 for p in ps if qb.kind(p) != 'verse' and qb.ARABIC.search(p))
        if n:
            out.append((n, f[:-3]))
    return sorted(out)


def done_ids():
    if not os.path.exists(DONE):
        return []
    return [l.strip() for l in open(DONE, encoding='utf-8') if l.strip() and not l.startswith('#')]


def rekey(ids):
    """Line-keyed exceptions follow their run; an exception whose run has left the draft (a prose
    quotation removed under this ruling) is dropped and listed."""
    path = os.path.join(HERE, 'urdu_script_exceptions.tsv')
    rows = open(path, encoding='utf-8').read().split('\n')
    head = rows[0].split('\t')
    ci, cf, cr = head.index('id'), head.index('field'), head.index('run')
    keep, moved, dropped = [rows[0]], 0, []
    for r in rows[1:]:
        f = r.split('\t')
        if len(f) <= cr or f[ci] not in ids or not re.match(r'^L\d+$', f[cf]) or f[0] != 'description':
            keep.append(r); continue
        lines = open(os.path.join(DRAFTS, f[ci] + '.md'), encoding='utf-8').read().split('\n')
        hits = [n for n, l in enumerate(lines, 1) if f[cr] in l]
        if not hits:
            dropped.append('%s %s %s' % (f[ci], f[cf], f[cr][:40])); continue
        if len(hits) > 1:
            print('REFUSED: %s run %r is on %d lines' % (f[ci], f[cr][:40], len(hits))); return 1
        if f[cf] != 'L%d' % hits[0]:
            f[cf] = 'L%d' % hits[0]; moved += 1
        keep.append('\t'.join(f))
    open(path, 'w', encoding='utf-8').write('\n'.join(keep))
    print('urdu_script_exceptions.tsv: %d moved, %d dropped (run no longer in the draft)%s'
          % (moved, len(dropped), ''.join('\n  dropped: ' + d for d in dropped)))
    return 0


def main(a):
    if not a or a[0] not in ('status', 'begin', 'check', 'rekey', 'done'):
        print(__doc__); return 2
    cmd, ids = a[0], a[1:]
    if cmd == 'begin':
        os.makedirs(BEFORE, exist_ok=True)
        for i in ids:
            bp = os.path.join(BEFORE, i + '.md')
            if os.path.exists(bp):
                print('%s: original already backed up (kept)' % i); continue
            shutil.copy2(os.path.join(DRAFTS, i + '.md'), bp); print('%s: backed up' % i)
        return 0
    if cmd == 'status':
        t, d = todo(), done_ids()
        print('rows done: %d; rows with Arabic script outside verse: %d (%d paragraphs)'
              % (len(d), len(t), sum(n for n, _ in t)))
        for n, i in t:
            print('  %4d  %s%s' % (n, i, '  [has > blocks from §9.366]' if '\n> ' in '\n' + open(os.path.join(DRAFTS, i + '.md'), encoding='utf-8').read() else ''))
        return 0
    if cmd == 'rekey':
        return rekey(ids)
    if cmd == 'done':
        if any(check(i)[0] for i in ids):
            print('refused: a row fails `check`'); return 1
        have = done_ids()
        with open(DONE, 'a', encoding='utf-8') as fh:
            for i in ids:
                if i not in have:
                    fh.write(i + '\n')
        print('recorded: %s' % ', '.join(ids)); return 0
    ids = ids or done_ids()
    bad = 0
    for i in ids:
        errs, lost = check(i)
        print('%s  %s  (%d Arabic-script prose quotation(s) removed — each must be carried in English)'
              % ('FAIL' if errs else 'ok  ', i, lost))
        for e in errs:
            print('   ' + e)
        bad += bool(errs)
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
