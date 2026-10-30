#!/usr/bin/env python3
"""Put the original of each quoted verse above its English rendering.

Rauf, 30 October 2026: every verse the public descriptions quote in English
must show its original ("the original needs to be there"); where the original
is not Urdu it is quoted as written, Gurmukhi for Guru Nanak, with the English
rendering under it in the English article and the Urdu translation under it in
the Urdu article.

The originals are recorded, with their sources, in
entries/verse_originals/registry.json (one entry per distinct rendering). This
script inserts each `found` original as its own paragraph directly above the
rendering it belongs to, in entries/descriptions_public/<id>.md and in the
matching place of <id>.ur.md, and adds the source to the English bibliography.

    python3 pipeline/apply_verse_originals.py            # apply, then check
    python3 pipeline/apply_verse_originals.py --check    # check only; exit 1 on any gap

The check is the invariant: every rendering whose registry entry is `found`
has its original directly above it in both languages (or, for a second
rendering of the same original in a row, the original stands above the first),
and the bibliography carries the source.

Verdicts. The public files carry V1/V2/V3 verdict lines stamped with the md5
of the text they passed (pipeline/build_public_import.py refuses a file whose
stamp is stale). An insertion made here changes the md5 but nothing the
verifiers read: --restamp proves that the new text, with the inserted
paragraphs and the bibliography line taken out again, is byte for byte the
text whose md5 is stamped, and only then moves the stamp, saying so on the
line. A file that fails the proof keeps its old stamp, and the import builder
will refuse it until it is verified again.
"""
import argparse
import hashlib
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PUB = os.path.join(REPO, 'entries', 'descriptions_public')
REG = os.path.join(REPO, 'entries', 'verse_originals', 'registry.json')
RENDERING = re.compile(r'^\*([^*]+)\*(?:\s*\(translated by ([^)]+)\))?$', re.I)
STAMP_NOTE = 'verse originals added by pipeline/apply_verse_originals.py, the rest byte for byte the passed text'

md5 = lambda b: hashlib.md5(b).hexdigest()


def paragraphs(text):
    return [p for p in re.split(r'\n\s*\n', text.strip('\n'))]


def join(paras):
    return '\n\n'.join(paras) + '\n'


def renderings(paras):
    """Indexes of the rendering paragraphs, in order."""
    return [i for i, p in enumerate(paras) if RENDERING.match(p.strip())]


def load_registry():
    reg = json.load(open(REG, encoding='utf-8'))
    by_md5 = {}
    for e in reg['entries']:
        if e['status'] == 'found':
            by_md5[e['rendering_md5']] = e
    return reg, by_md5


def body_md5(p):
    m = RENDERING.match(p.strip())
    return hashlib.md5(m.group(1).strip().encode('utf-8')).hexdigest()[:12]


def bib_line(entries):
    """One bibliography item per work, listing the places quoted."""
    out = []
    works = {}
    for e in entries:
        works.setdefault(e['source']['work'], []).append(e)
    for work, es in works.items():
        if work == 'Sri Guru Granth Sahib':
            angs = []
            for e in es:
                a = str(e['source']['ang'])
                if a not in angs:
                    angs.append(a)
            angs.sort(key=lambda a: int(a.split()[0]))
            out.append('- *Sri Guru Granth Sahib*, Ang %s (Gurmukhi text as given by BaniDB, banidb.com).'
                       % ', '.join(angs))
        else:
            raise SystemExit('no bibliography form for %r' % work)
    return out


def plan(i, by_md5):
    """What the row needs: [(english_rendering_index, entry)], in order."""
    en = paragraphs(open(os.path.join(PUB, i + '.md'), encoding='utf-8').read())
    need = []
    groups = set()
    for k in renderings(en):
        e = by_md5.get(body_md5(en[k]))
        if not e:
            continue
        g = e.get('group')
        if g and g in groups:
            continue  # a second rendering of an original already shown above
        if g:
            groups.add(g)
        need.append((k, e))
    return need


def original_para(e):
    return '\n'.join(e['original'])


def apply_row(i, by_md5):
    pe = os.path.join(PUB, i + '.md')
    pu = os.path.join(PUB, i + '.ur.md')
    en = paragraphs(open(pe, encoding='utf-8').read())
    ur = paragraphs(open(pu, encoding='utf-8').read())
    ren, rur = renderings(en), renderings(ur)
    need = plan(i, by_md5)
    if not need:
        return False, []
    if len(ren) != len(rur):
        raise SystemExit('%s: %d renderings in English, %d in Urdu; cannot pair them' % (i, len(ren), len(rur)))
    changed = False
    # Work from the end so earlier indexes stay valid.
    for k, e in reversed(need):
        o = original_para(e)
        ordinal = ren.index(k)
        ku = rur[ordinal]
        if en[k - 1].strip() != o:
            en.insert(k, o)
            changed = True
        if ur[ku - 1].strip() != o:
            ur.insert(ku, o)
            changed = True
    # Bibliography.
    lines = bib_line([e for _, e in need])
    try:
        b = next(n for n, p in enumerate(en) if p.strip() == '## Bibliography')
    except StopIteration:
        raise SystemExit('%s: no ## Bibliography' % i)
    items = en[b + 1].split('\n') if b + 1 < len(en) else []
    for line in lines:
        if line not in items:
            items.append(line)
            changed = True
    en[b + 1] = '\n'.join(items)
    if changed:
        open(pe, 'w', encoding='utf-8').write(join(en))
        open(pu, 'w', encoding='utf-8').write(join(ur))
    return changed, need


def check_row(i, by_md5):
    errs = []
    en = paragraphs(open(os.path.join(PUB, i + '.md'), encoding='utf-8').read())
    ur = paragraphs(open(os.path.join(PUB, i + '.ur.md'), encoding='utf-8').read())
    ren, rur = renderings(en), renderings(ur)
    need = plan(i, by_md5)
    if need and len(ren) != len(rur):
        errs.append('%d renderings in English, %d in Urdu' % (len(ren), len(rur)))
        return errs
    for k, e in need:
        o = original_para(e)
        if en[k - 1].strip() != o:
            errs.append('English: %s has no original above it' % e['id'])
        ku = rur[ren.index(k)]
        if ur[ku - 1].strip() != o:
            errs.append('Urdu: %s has no original above its Urdu rendering' % e['id'])
    text = '\n'.join(en)
    for line in bib_line([e for _, e in need]) if need else []:
        if line not in text.split('\n'):
            errs.append('bibliography lacks: ' + line)
    return errs


def strip_insertions(text, entries, bib):
    """The text as it was before this script: inserted paragraphs and lines out."""
    paras = paragraphs(text)
    originals = {original_para(e) for e in entries}
    out = [p for p in paras if p.strip() not in originals]
    res = join(out)
    for line in bib:
        res = res.replace('\n' + line, '', 1)
    return res


def restamp(i, by_md5, before):
    """Move V1/V2/V3 stamps when the change is provably insertion only."""
    pn = os.path.join(PUB, i + '.notes.md')
    pe = os.path.join(PUB, i + '.md')
    pu = os.path.join(PUB, i + '.ur.md')
    en_b, ur_b = open(pe, 'rb').read(), open(pu, 'rb').read()
    need = plan(i, by_md5)
    entries = [e for _, e in need]
    bib = bib_line(entries) if entries else []
    old_en = before[0]
    old_ur = before[1]
    if strip_insertions(en_b.decode('utf-8'), entries, bib).encode('utf-8') != old_en:
        return 'English differs from the passed text beyond the insertions; stamps left'
    if strip_insertions(ur_b.decode('utf-8'), entries, []).encode('utf-8') != old_ur:
        return 'Urdu differs from the passed text beyond the insertions; stamps left'
    notes = open(pn, encoding='utf-8').read().split('\n')
    oe, ou = md5(old_en)[:8], md5(old_ur)[:8]
    ne, nu = md5(en_b)[:8], md5(ur_b)[:8]
    for n, line in enumerate(notes[:8]):
        if not re.match(r'V[123] ', line) or ': PASS' not in line:
            continue
        if ('en:' + oe not in line) and ('ur:' + ou not in line):
            return 'verdict %r is not stamped for the text before the insertions' % line[:2]
        line = line.replace('en:' + oe, 'en:' + ne).replace('ur:' + ou, 'ur:' + nu)
        if STAMP_NOTE not in line:
            line = re.sub(r'\)( en:| ur:)', '; ' + STAMP_NOTE + r')\1', line, count=1)
        notes[n] = line
    open(pn, 'w', encoding='utf-8').write('\n'.join(notes))
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--check', action='store_true')
    a = ap.parse_args()
    reg, by_md5 = load_registry()
    rows = sorted({r for e in by_md5.values() for r in e['rows']})
    bad = 0
    if not a.check:
        for i in rows:
            before = (open(os.path.join(PUB, i + '.md'), 'rb').read(),
                      open(os.path.join(PUB, i + '.ur.md'), 'rb').read())
            changed, need = apply_row(i, by_md5)
            if changed:
                why = restamp(i, by_md5, before)
                print('%-50s %d originals%s' % (i, len(need), ('; ' + why) if why else '; stamps moved'))
                if why:
                    bad += 1
    for i in rows:
        for err in check_row(i, by_md5):
            print('CHECK %s: %s' % (i, err))
            bad += 1
    found = sum(1 for e in reg['entries'] if e['status'] == 'found')
    print('%d of %d distinct renderings have an original; %d rows checked; %s'
          % (found, len(reg['entries']), len(rows), 'FAIL' if bad else 'ok'))
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
