#!/usr/bin/env python3
"""The language label above each quoted verse.

Rauf, 30 October 2026: "For the differentiation between the urdu and punjabi
make it more obvious". The site sets a small label naming the language above an
original verse, and the language of the translation above the translation,
whenever the original is not in the language of the article (so a Punjabi kafi
in the Urdu article reads "پنجابی" above the verse and "اردو" above its Urdu
translation).

The record is entries/verse_originals/languages.json: one entry per distinct
verse paragraph, its exact text, its language, and the basis for saying so
(the article naming it, or its grammar). A null language sets no label.

    python3 pipeline/verse_languages.py --write    # src/data/verse-languages.json
    python3 pipeline/verse_languages.py --check data/import_2026-10-30.csv

--write turns the record into the map the site reads, keyed by a 32 bit FNV-1a
hash of the verse (its lines trimmed and joined by a newline, hashed over UTF-16
code units, exactly as src/components/shrine/verseLanguage.ts does). --check
reads a sheet export and src/data/urdu-content.json and fails on any verse
paragraph the record does not have, so a new verse cannot ship unlabelled
without someone deciding its language.
"""
import argparse
import csv
import json
import os
import re
import sys

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
REC = os.path.join(REPO, 'entries', 'verse_originals', 'languages.json')
OUT = os.path.join(REPO, 'src', 'data', 'verse-languages.json')
URDU = os.path.join(REPO, 'src', 'data', 'urdu-content.json')
AR = re.compile(r'[؀-ۿݐ-ݿ]')
GU = re.compile(r'[਀-੿]')
LAT = re.compile(r'[A-Za-z]')
CODES = {'pa', 'pa-Guru', 'Guru', 'fa', 'ur', 'sd', 'skr'}


def key_text(paragraph):
    return '\n'.join(l.strip() for l in paragraph.split('\n') if l.strip())


def fnv1a(text):
    h = 0x811C9DC5
    b = text.encode('utf-16-le')
    for i in range(0, len(b), 2):
        h ^= b[i] | (b[i + 1] << 8)
        h = (h * 0x01000193) & 0xFFFFFFFF
    return '%08x' % h


def verses(text, latin):
    """The verse paragraphs of an article, by the rules ProseParagraphs uses."""
    ps = [p.strip() for p in re.split(r'\n\n+', text) if p.strip()]
    for i, p in enumerate(ps):
        lines = [l.strip() for l in p.split('\n') if l.strip()]
        if not lines:
            continue
        if all(GU.search(l) and not LAT.search(l) for l in lines):
            yield p
            continue
        if len(lines) >= 2:
            if all(AR.search(l) and not re.match(r'^[-*•#]', l) for l in lines):
                yield p
            continue
        l = lines[0]
        one = len(l) <= 160 and AR.search(l) and not LAT.search(l) and not re.match(r'^[-*•#]', l)
        if not one:
            continue
        if latin or (i and re.search(r'[:：]\s*$', ps[i - 1]) and not re.search(r'[:：۔.،؛,؟!]$', l)):
            yield p


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--write', action='store_true')
    ap.add_argument('--check', metavar='SHEET_CSV')
    a = ap.parse_args()
    rec = json.load(open(REC, encoding='utf-8'))['entries']
    bad = [e for e in rec if e['lang'] is not None and e['lang'] not in CODES]
    if bad:
        sys.exit('unknown language code: %r' % bad[0]['lang'])
    known = {key_text(e['verse']) for e in rec}
    if a.write:
        m = {fnv1a(key_text(e['verse'])): e['lang'] for e in rec if e['lang']}
        if len(m) != sum(1 for e in rec if e['lang']):
            sys.exit('hash collision in the verse language map')
        open(OUT, 'w', encoding='utf-8').write(json.dumps(m, ensure_ascii=False, sort_keys=True, indent=0) + '\n')
        print('wrote %s: %d labelled verses of %d recorded' % (os.path.relpath(OUT, REPO), len(m), len(rec)))
    if a.check:
        missing = {}
        for r in csv.DictReader(open(a.check, encoding='utf-8')):
            t = '\n\n'.join(r.get(c) or '' for c in ['Description', 'Description 2', 'Description 3', 'Description 4', 'Description 5'])
            for p in verses(t, True):
                if key_text(p) not in known:
                    missing.setdefault(key_text(p), r.get('id'))
        for slug, v in json.load(open(URDU, encoding='utf-8')).items():
            for p in verses(v.get('descriptionUr', ''), False):
                if key_text(p) not in known:
                    missing.setdefault(key_text(p), slug)
        for p, where in missing.items():
            print('UNRECORDED verse in %s: %s' % (where, p.replace('\n', ' / ')[:100]))
        print('%d verse paragraphs not in %s' % (len(missing), os.path.relpath(REC, REPO)))
        if missing:
            sys.exit(1)


if __name__ == '__main__':
    main()
