#!/usr/bin/env python3
"""Scaffold a directed web-research batch from a live sheet export.

Rebuilds, from a CSV export of the production sheet:

  entries/web-research-<batch>/targets.tsv          n, name, file_slug, id, prose_words, cites
  entries/web-research-<batch>/current-content/<slug>.current.txt

so a researcher (human or agent) can see exactly what the archive already
publishes for a target before going looking, and cannot accidentally "add"
something the entry already says.

Target selection is a *measurement*, not a list: entries are ranked by prose
word count (everything before the first bibliography heading) and citation
count (`- ` lines after it). Which ones go into a batch is passed in by name,
because the judgement of what is worth researching is not the script's.

RULE 2 applies downstream: this script only ever copies what the sheet already
holds. It never writes to the sheet and never generates prose.

Usage:
    python3 pipeline/build_research_batch.py data/live_sheet_YYYY-MM-DD.csv \
        --batch 2026-09 --targets pipeline/research_targets_2026-09.txt
    python3 pipeline/build_research_batch.py <csv> --rank      # just print the ranking
"""
import argparse
import csv
import json
import re
import sys
from pathlib import Path

BIB_HEAD = re.compile(
    r'^##\s*(Bibliography|Sources|References|Further reading|کتابیات|حوالہ جات|حوالے)\s*$',
    re.M | re.I)

REPO = Path(__file__).resolve().parent.parent


def slugify(name: str) -> str:
    s = name.lower()
    s = s.replace('’', '').replace("'", '')
    s = re.sub(r'[^a-z0-9]+', '-', s)
    return s.strip('-')


def measure(row: dict) -> dict:
    d = (row.get('Description') or '').strip()
    m = BIB_HEAD.search(d)
    prose = d[:m.start()] if m else d
    bib = d[m.end():] if m else ''
    cites = len([l for l in bib.splitlines() if l.strip().startswith('- ')])
    imgs = sum(1 for i in range(1, 17) if (row.get(f'Image {i}') or '').strip())
    filled = sum(1 for k in ('year_built', 'figure_born', 'figure_died', 'silsila',
                             'site_type', 'status', 'principal_figure', 'figure_type',
                             'event_year', 'Latitude', 'Longitude')
                 if (row.get(k) or '').strip())
    return dict(name=row['Name'], loc=row.get('Location', ''), id=row.get('id', ''),
                slug=slugify(row['Name']), prose_words=len(prose.split()), cites=cites,
                imgs=imgs, filled=filled,
                info_level=row.get('info_level', ''), support_level=row.get('support_level', ''),
                has_bib=bool(m))


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('csv_path')
    ap.add_argument('--batch', help='batch label, e.g. 2026-09')
    ap.add_argument('--targets', help='file of exact sheet Names, one per line, # comments ok')
    ap.add_argument('--rank', action='store_true', help='print the poverty ranking and exit')
    ap.add_argument('--limit', type=int, default=60)
    ap.add_argument('--targets-out', default='targets.tsv',
                    help='name of the manifest inside the batch dir; use a distinct name when '
                         'adding a later wave to a batch whose first wave is still being '
                         'researched, so a live manifest is never rewritten underneath a reader')
    args = ap.parse_args()

    with open(args.csv_path, newline='', encoding='utf-8') as fh:
        rows = list(csv.DictReader(fh))
    by_name = {r['Name']: r for r in rows}
    measured = sorted((measure(r) for r in rows),
                      key=lambda e: (e['prose_words'], e['cites']))

    if args.rank or not args.batch:
        print(f"{len(rows)} rows in {args.csv_path}")
        print(f"{'words':>6} {'cit':>4} {'img':>4} {'fld':>4}  {'support':<18} name")
        for e in measured[:args.limit]:
            print(f"{e['prose_words']:>6} {e['cites']:>4} {e['imgs']:>4} {e['filled']:>4}  "
                  f"{e['support']:<18} {e['name']} — {e['loc']}")
        return 0

    if not args.targets:
        print('--batch needs --targets', file=sys.stderr)
        return 2
    names = [l.split('#')[0].strip() for l in open(args.targets, encoding='utf-8')]
    names = [n for n in names if n]

    missing = [n for n in names if n not in by_name]
    if missing:
        # RULE 4: a target that does not join is a bug, not a warning.
        print('target names not found in the sheet (join keys are exact `Name` values):',
              file=sys.stderr)
        for n in missing:
            print(f'  {n!r}', file=sys.stderr)
        return 1

    out = REPO / 'entries' / f'web-research-{args.batch}'
    cur = out / 'current-content'
    cur.mkdir(parents=True, exist_ok=True)

    index = {e['name']: e for e in measured}
    with open(out / args.targets_out, 'w', encoding='utf-8', newline='') as fh:
        w = csv.writer(fh, delimiter='\t', lineterminator='\n')
        w.writerow(['n', 'name', 'file_slug', 'id', 'prose_words', 'cites', 'imgs',
                    'support_level', 'location'])
        for n, name in enumerate(names, 1):
            e = index[name]
            w.writerow([n, name, e['slug'], e['id'], e['prose_words'], e['cites'],
                        e['imgs'], e['support_level'], e['loc']])

    for name in names:
        r = by_name[name]
        e = index[name]
        text = (
            f"id: {r.get('id','')}\n"
            f"name: {name}\n"
            f"location: {r.get('Location','')}\n"
            f"category: {r.get('category') or r.get('Category','')}\n"
            f"site_type: {r.get('site_type','')}   status: {r.get('status','')}\n"
            f"principal_figure: {r.get('principal_figure') or r.get('Sufi Saint','')}"
            f"   figure_type: {r.get('figure_type','')}   silsila: {r.get('silsila','')}\n"
            f"year_built: {r.get('year_built','')} ({r.get('year_built_precision','')})"
            f"   note: {r.get('year_built_note','')}\n"
            f"figure_born: {r.get('figure_born','')}   figure_died: {r.get('figure_died','')}\n"
            f"event_year: {r.get('event_year','')}   event_note: {r.get('event_note','')}\n"
            f"info_level: {r.get('info_level','')}   support_level: {r.get('support_level','')}\n"
            f"images: {e['imgs']}   prose words: {e['prose_words']}   citations: {e['cites']}\n"
            f"\n--- CURRENT Description ---\n{(r.get('Description') or '').strip()}\n"
            f"\n--- CURRENT qa_note ---\n{(r.get('qa_note') or '').strip()}\n"
            f"\n--- CURRENT flags ---\n{(r.get('flags') or '').strip()}\n"
        )
        (cur / f"{e['slug']}.current.txt").write_text(text, encoding='utf-8')

    print(f'wrote {out/args.targets_out} and {len(names)} files in {cur}')
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
