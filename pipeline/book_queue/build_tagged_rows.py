#!/usr/bin/env python3
"""New rows and joins from a book whose candidate list is free-form, read through a tag file.

Why (HANDOVER 9.288, 9.313): build_new_rows.py reads only `- [PK] **English / اردو** — …` lines,
and only hadeeqat_ul_aulia has them. Every other book's `## Figures and sites not in the archive`
is free-form: tareekh_lahore heads its items in Urdu only and groups them by kind of site. The
takeaways are never rewritten to fit a script. Instead a tag file,
pipeline/book_queue/figure_tags/<slug>.tsv, says of each item line, by line number, what it is:

  row     a proposed new sheet row (Rauf, 10 Oct 2026: one row per grave or shrine; also temples
          and samadhs, Sikh/Udasi/Jain sites, rulers' tombs and graveyards, and mosques; a site the
          book records as demolished still gets a row, status blank). `target` names ids it may be
          the same as: flagged in `_review`, never merged.
  join    the item is a site that already has an entry, an archive row or a row another book
          proposed: its line is appended, verbatim, to shrine_entries/<target>.md under this book's
          `## From …` section (Rauf, 10 Oct: "match as much of the information as you can").
  figure  a saint with no site in Pakistan (read by build_book_figures.py; not written here)
  skip    with the reason in `note`

What the tagger supplies is reading, not content: the transliterated `name`, the `category` and
`site_type` the item's own heading and words give, and `silsila` only when the line names the
person's own order. Everything else comes from the line (RULE 2). `figure_died` is the line's own
`d. …` clause, as printed. Location is the tag file's `#location`, city only.

Refuses (exit 2, nothing written) unless: every `- **` item line of the section is tagged exactly
once; every tag points at such a line; categories are the six; a silsila's stem occurs in the line;
every join target has an entry file and is an archive id or a proposed-row id; every may-be target
resolves; no new id collides with an archive id, a proposed id or an entry file; and a join's book
section, where the entry already has one, is the entry's last `## ` section. A second run refuses
on the first line already present.

Usage: build_tagged_rows.py <slug> --title "Author, Short title" --date "10 October 2026" --stamp 2026-10-10 [--dry-run]
"""
import argparse, csv, glob, json, os, re, shutil, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FALLBACK = os.path.join(REPO, 'src/data/shrines-fallback.json')
IMPORT_HEADER_FROM = os.path.join(REPO, 'data/import_2026-10-08.csv')
CATEGORIES = {'Muslim Shrine', 'Hindu Temple', 'Sikh Gurdwara', 'Nanakpanthi / Udasi Darbar',
              'Jain Temple', 'Secular / Memorial'}
ORDER_STEMS = {'Qadiri': 'Qadir', 'Chishti': 'Chisht', 'Naqshbandi': 'Naqshband',
               'Suhrawardi': 'Suhraward', 'Shattari': 'Shattar', 'Naushahi': 'Naushah'}
# a death date belongs to a row only where the site is one person's burial; a mosque's founder or
# one of a graveyard's many dead is not the row's figure
DIED_SITE_TYPES = {'Dargah/Mazar', 'Mausoleum/Memorial', 'Samadhi', 'Khanqah', 'Tomb-shrine'}
COLS = ['line', 'kind', 'target', 'name', 'category', 'site_type', 'silsila', 'note']
HEAD_RE = re.compile(r'^- (?:\[PK\] )?\*\*(.+?)\*\*')
# the line's own death clause: d. "…" (as quoted) or d. <number…> up to the next clause
DIED_RE = re.compile(r'\bd\. (?:\*\*)?(?:"([^"]+)"|([0-9۰-۹][^;(]*?))(?:\*\*)?(?=;|,| \(| aged|$)')


def slugify(text):   # as build_new_rows.py
    t = re.sub(r'\[(?:OCR\?|illegible)\]', '', text).lower().replace('&', ' and ')
    t = re.sub(r'[^\w\s-]', '', t, flags=re.ASCII)
    return re.sub(r'-+', '-', re.sub(r'[\s_]+', '-', t)).strip('-')


def read_tags(path):
    meta, tags = {}, []
    for raw in open(path, encoding='utf-8').read().split('\n'):
        if raw.startswith('#'):
            k, _, v = raw[1:].partition('\t')
            if v and ' ' not in k:
                meta[k] = v.strip()
            continue
        if not raw.strip() or raw.startswith('line\t'):
            continue
        f = raw.split('\t')
        if len(f) != len(COLS):
            sys.exit(f'REFUSED: tag line has {len(f)} fields, not {len(COLS)}: {raw[:80]}')
        tags.append(dict(zip(COLS, f)) | {'line': int(f[0])})
    return meta, tags


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('--title', required=True)
    ap.add_argument('--date', required=True); ap.add_argument('--stamp', required=True)
    ap.add_argument('--only-lines', default='',
                    help='process only these item lines (comma separated), adding to an existing patch: for '
                         'lines held earlier and released later (9.313). The tag file need not be exhaustive.')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    only = {int(x) for x in a.only_lines.split(',') if x}
    src_rel = f'entries/book_takeaways/{a.slug}.md'
    L = open(os.path.join(REPO, src_rel), encoding='utf-8').read().split('\n')
    st = L.index('## Figures and sites not in the archive')
    en = next(i for i in range(st + 1, len(L)) if L[i].startswith('## '))
    items = {n + 1 for n in range(st, en) if HEAD_RE.match(L[n])}
    meta, tags = read_tags(os.path.join(REPO, 'pipeline/book_queue/figure_tags', f'{a.slug}.tsv'))
    if only:
        items &= only
        tags = [t for t in tags if t['line'] in only]
    archive = {r['id'] for r in json.load(open(FALLBACK, encoding='utf-8'))['rows']}
    proposed = {}
    for p in glob.glob(os.path.join(REPO, 'data/review/PATCH_new_rows_*.csv')):
        if f'PATCH_new_rows_{a.slug}_' in p and not only:
            continue
        for r in csv.DictReader(open(p, encoding='utf-8')):
            proposed[r['id']] = os.path.basename(p)
    errors = []
    seen = {}
    for t in tags:
        if t['line'] in seen:
            errors.append(f'line {t["line"]} tagged twice')
        seen[t['line']] = t
        if t['line'] not in items:
            errors.append(f'line {t["line"]} is not a `- **` item of the section')
        if t['kind'] not in ('row', 'join', 'figure', 'skip'):
            errors.append(f'line {t["line"]}: unknown kind {t["kind"]!r}')
    for n in sorted(items - set(seen)):
        errors.append(f'line {n} is not tagged: {L[n - 1][:70]}')

    header = next(csv.reader(open(IMPORT_HEADER_FROM, encoding='utf-8')))
    short = a.title.split(', ', 1)[1]
    rows, joins, taken = [], [], set()
    for t in tags:
        n, l = t['line'], L[t['line'] - 1]
        if t['kind'] == 'join':
            for tid in filter(None, t['target'].split(',')):
                if not os.path.exists(os.path.join(REPO, 'shrine_entries', f'{tid}.md')):
                    errors.append(f'line {n}: join target {tid} has no entry file')
                if tid not in archive and tid not in proposed:
                    errors.append(f'line {n}: join target {tid} is neither an archive id nor a proposed row')
                joins.append((tid, t, l))
            continue
        if t['kind'] != 'row':
            continue
        if t['category'] not in CATEGORIES:
            errors.append(f'line {n}: category {t["category"]!r} is not one of the six')
        if not t['name'] or not t['site_type']:
            errors.append(f'line {n}: a row needs name and site_type')
        if t['silsila'] and ORDER_STEMS.get(t['silsila'], '\0') not in l:
            errors.append(f'line {n}: silsila {t["silsila"]} not named on the line')
        maybe = []
        for tid in filter(None, t['target'].split(',')):
            if tid.startswith('tag:'):
                other = seen.get(int(tid[4:]))
                if not other or other['kind'] != 'row':
                    errors.append(f'line {n}: {tid} is not a row tag')
                else:
                    maybe.append(f'line {tid[4:]} ({other["name"]})')
            elif tid in archive or tid in proposed:
                maybe.append(tid + ('' if tid in archive else f' (proposed, {proposed[tid]})'))
            else:
                errors.append(f'line {n}: may-be target {tid} does not resolve')
        rid = slugify(t['name'])
        if rid in archive or rid in proposed or rid in taken \
                or os.path.exists(os.path.join(REPO, 'shrine_entries', f'{rid}.md')):
            rid = f'{rid}-{a.slug.split("_")[-1]}-{n}'
        taken.add(rid)
        dm = DIED_RE.search(l)
        died = ''
        if dm and t['site_type'] in DIED_SITE_TYPES:
            died = re.split(r' and | in one partial|\)|\*\*', (dm.group(1) or dm.group(2)))[0].strip().rstrip(' .,')
        flags = [x for x in [t['note']] if x]
        if maybe:
            flags.append('may be the same as ' + '; '.join(maybe) + ': kept apart, not merged')
        if '[OCR?]' in t['name'] or '[OCR?]' in HEAD_RE.match(l).group(1):
            flags.append('the head carries an OCR flag: check the page before the row is used')
        row = {h: '' for h in header}
        row.update({'Name': t['name'], 'Location': meta.get('location', ''), 'id': rid,
                    'category': t['category'], 'site_type': t['site_type'],
                    'site_type_note': f'A {t["site_type"].lower()} as {short} records it; the present structure is not described.',
                    'silsila': t['silsila'],
                    'silsila_note': f'The order is the one the book\'s line names ({short} takeaways).' if t['silsila'] else '',
                    'figure_died': died, 'support_level': 'Source-seeded', 'info_level': 'Low',
                    'flags': f'NEW_FROM_BOOK_{a.slug.upper()}'})
        row.update({'_name_ur': HEAD_RE.match(l).group(1), '_entry_no': '', '_region': meta.get('location', ''),
                    '_group': next((L[i][4:] for i in range(n - 1, st, -1) if L[i].startswith('### ')), ''),
                    '_takeaways_line': n, '_review': '; '.join(flags)})
        rows.append((row, l))
    # a join is appended into the book's section only where that section is the entry's last
    plan = {}
    for tid, t, l in joins:
        p = os.path.join(REPO, 'shrine_entries', f'{tid}.md')
        text = plan.get(tid) or open(p, encoding='utf-8').read()
        if l in text:
            errors.append(f'line {t["line"]}: already in {tid}.md (second run?)'); continue
        heads = [m.group(0) for m in re.finditer(r'^## .*$', text, flags=re.M)]
        mine = f'## From {a.title}'
        if mine in heads and heads[-1] != mine:
            errors.append(f'{tid}.md: this book\'s section is not the last `## ` section'); continue
        add = (f'\n*Joined {a.date} from `{src_rel}` (reviewed: no), line {t["line"]}: the book\'s "Figures and '
               f'sites not in the archive". {t["note"] + ". " if t["note"] else ""}The line below is copied verbatim.*\n\n{l}\n')
        if mine not in heads:
            add = f'\n{mine}\n' + add
        plan[tid] = text.rstrip('\n') + '\n' + add
    if errors:
        print('REFUSED -- nothing written:', *errors, sep='\n  '); return 2

    cols = header + ['_name_ur', '_entry_no', '_region', '_group', '_takeaways_line', '_review']
    patch = os.path.join(REPO, 'data/review', f'PATCH_new_rows_{a.slug}_{a.stamp}.csv')
    existing_rows = []
    if only and os.path.exists(patch):   # --only-lines adds to the book's patch, never rewrites a row
        existing_rows = list(csv.DictReader(open(patch, encoding='utf-8')))
        if existing_rows and list(existing_rows[0].keys()) != cols:
            print('REFUSED -- the existing patch has other columns'); return 2
        clash = {r['id'] for r in existing_rows} & {r['id'] for r, _ in rows}
        if clash:
            print('REFUSED -- already in the patch:', *sorted(clash)); return 2
    if not a.dry_run:
        bdir = os.path.join(REPO, 'out/integration', a.slug, 'before_tags')
        os.makedirs(bdir, exist_ok=True)
        for tid in plan:
            shutil.copy2(os.path.join(REPO, 'shrine_entries', f'{tid}.md'), bdir)
        with open(patch, 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
            for row in existing_rows:
                w.writerow(row)
            for row, _ in rows:
                w.writerow(row)
        for row, l in rows:
            with open(os.path.join(REPO, 'shrine_entries', f'{row["id"]}.md'), 'w', encoding='utf-8') as fh:
                fh.write(f'## From {a.title}\n\n*New row proposed {a.date} from `{src_rel}` (reviewed: no), '
                         f'line {row["_takeaways_line"]}: the book\'s "Figures and sites not in the archive", '
                         f'under {row["_group"]}. The line below is copied verbatim; nothing was added or '
                         f'reworded. Coordinates not yet known.*\n\n{l}\n')
        for tid, text in plan.items():
            open(os.path.join(REPO, 'shrine_entries', f'{tid}.md'), 'w', encoding='utf-8').write(text)
    k = {x: sum(1 for t in tags if t['kind'] == x) for x in ('row', 'join', 'figure', 'skip')}
    print(f'{"DRY RUN -- " if a.dry_run else ""}{len(tags)} items tagged: {k["row"]} rows, {k["join"]} joins '
          f'({len(joins)} appends into {len(plan)} entries), {k["figure"]} figures, {k["skip"]} skipped')
    print(f'  rows: {sum(1 for r, _ in rows if r["_review"])} flagged; figure_died set on '
          f'{sum(1 for r, _ in rows if r["figure_died"])}; silsila set on {sum(1 for r, _ in rows if r["silsila"])}')
    for c in sorted(CATEGORIES):
        m = sum(1 for r, _ in rows if r['category'] == c)
        if m:
            print(f'    {c}: {m}')
    print('patch:', os.path.relpath(patch, REPO))
    return 0


if __name__ == '__main__':
    sys.exit(main())
