#!/usr/bin/env python3
"""New sheet rows for the [PK] sites a book documents and the archive lacks (Rauf, 10 Oct 2026).

Ruling (HANDOVER 9.286): "for grave or shrine do one row per site"; coordinates blank (research
agents fill them later); saints with no site go to the saints-and-orders layer instead. This reads
the takeaways' `## Figures and sites not in the archive`, takes every `- [PK] **Name / اردو** — …`
line, and writes:

  data/review/PATCH_new_rows_<slug>_<date>.csv   one row per line, sheet columns + `_` columns
  shrine_entries/<id>.md                          the line itself, verbatim, under the book heading

A cell is filled only from the line's own words (RULE 2):
  Name              the bold head's English, up to the first " b. " (pedigree goes to principal_figure)
  principal_figure  the whole English head; blank when the head names a site ("Mazar …")
  Location          the region heading when it is one place; otherwise the one heading place the
                    line names; otherwise blank. City only: the book's address stays in the entry.
  silsila           the one order the line names; else, in Lahore, the single order of its group
                    heading (the groups follow the book's chamans); else blank. Basis in silsila_note.
  figure_died       the line's "died …" clause exactly as printed, disagreements and [OCR?] kept
  category / site_type   Muslim Shrine / Dargah/Mazar: a [PK] line is by definition a burial place
  support_level / info_level   Source-seeded (one work) / Low (no Description yet)
  Latitude, Longitude, Description, status   blank

Columns starting with `_` are NOT sheet columns (Urdu name, entry number, review flags); the
consolidated import must drop them. Refuses (exit 2) on an id that already exists in the archive,
on an entry file that already exists, or on any entry line not verbatim in the takeaways.

Per-line decisions (lines that are no new site, lines that may be one person) live in
pipeline/book_queue/new_rows_decisions/<slug>.json, so each one is a reviewable record.

Usage: build_new_rows.py <slug> --title "Author, Short title" --date "10 October 2026" --stamp 2026-10-10 [--dry-run]
"""
import argparse, csv, json, os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
FALLBACK = os.path.join(REPO, 'src/data/shrines-fallback.json')
IMPORT_HEADER_FROM = os.path.join(REPO, 'data/import_2026-10-08.csv')

ORDERS = [('Qadiri', r'\bQadi?ri\b|\bQadri\b'), ('Chishti', r'\bChishti\b'),
          ('Naqshbandi', r'\bNaqshbandi\b'), ('Suhrawardi', r'\bSuhrawardi\b'),
          ('Shattari', r'\bShattari\b')]
LINE_RE = re.compile(r'^- \[PK\] \*\*(.+?)\*\*(.*)$')


def slugify(text):   # same as scripts/data/lib/slugs.mjs slugify, for the characters that occur here
    t = text.lower().replace('&', ' and ')
    t = re.sub(r'[^\w\s-]', '', t, flags=re.ASCII)
    t = re.sub(r'[\s_]+', '-', t)
    return re.sub(r'-+', '-', t).strip('-')


def orders_in(text):
    return [o for o, rx in ORDERS if re.search(rx, text)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug'); ap.add_argument('--title', required=True)
    ap.add_argument('--date', required=True); ap.add_argument('--stamp', required=True)
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    src_rel = f'entries/book_takeaways/{a.slug}.md'
    lines = open(os.path.join(REPO, src_rel), encoding='utf-8').read().split('\n')
    src_set = set(lines)
    st = lines.index('## Figures and sites not in the archive')
    en = next(i for i in range(st + 1, len(lines)) if lines[i].startswith('## '))
    header = next(csv.reader(open(IMPORT_HEADER_FROM, encoding='utf-8')))
    existing = {r['id'] for r in json.load(open(FALLBACK, encoding='utf-8'))['rows']}

    dec_path = os.path.join(REPO, 'pipeline/book_queue/new_rows_decisions', f'{a.slug}.json')
    dec = json.load(open(dec_path, encoding='utf-8')) if os.path.exists(dec_path) else {}
    excl = {int(k): v for k, v in dec.get('exclude', {}).items()}
    pairs = [(tuple(ls), why) for ls, why in dec.get('pair', [])]
    excluded = []
    region = group = ''
    out, errors = [], []
    for n in range(st, en):
        l = lines[n]
        if l.startswith('### '):
            region, group = l[4:].strip(), ''
            continue
        if re.match(r'^\*\*[^*]+\*\*$', l):
            group = l.strip('*')
            continue
        m = LINE_RE.match(l)
        if not m:
            continue
        if n + 1 in excl:
            excluded.append((n + 1, m.group(1).partition(' / ')[0], excl[n + 1]))
            continue
        head, rest = m.group(1), m.group(2)
        en_name, _, ur_name = head.partition(' / ')
        en_name, ur_name = en_name.strip(), ur_name.strip()
        flags = []
        is_site = en_name.lower().startswith(('mazar ', 'mazar-', 'the mazar'))
        name = en_name.split(' b. ')[0].strip()
        rid = slugify(re.sub(r'\[(?:OCR\?|illegible)\]', '', name))   # flags and Urdu runs never reach an id
        if '[OCR?]' in head or '[illegible]' in head:
            flags.append('name carries an OCR flag: check the page before the row is used')
        # location
        places = [p.strip() for p in re.split(r',| and ', region) if p.strip() and p.strip() != 'the south'
                  and not p.strip().startswith('the ')]
        if len(places) == 1:
            loc = places[0]
        else:
            hits = [p for p in places if re.search(r'\b' + re.escape(p) + r'\b', l)]
            loc = hits[0] if len(hits) == 1 else ''
            if not loc:
                flags.append(f'location unresolved within "{region}"')
        # silsila
        named = orders_in(rest + ' ' + en_name)
        if len(named) == 1:
            sil, sil_note = named[0], 'The order is the one the book\'s line names (Hadiqat al-Awliya takeaways).'
        elif region == 'Lahore' and len(orders_in(group.split(',')[0])) == 1 and ' and ' in group \
                and group.split(' and ')[0] in ('Qadiri', 'Chishti', 'Naqshbandi'):
            sil = group.split(' and ')[0]
            sil_note = f'Not named on the line; the takeaways group it under "{group}", following the book\'s chamans.'
        else:
            sil, sil_note = '', (f'The line names {", ".join(named)}.' if named else '')
        # death clause, exactly as printed (markdown bold removed, nothing else)
        dm = re.search(r'(?:^|; )((?:died|death given as) [^;]+)', rest.lstrip(' —'))
        died = ''
        if dm:
            died = re.sub(r'^(?:died|death given as) ', '', dm.group(1).replace('**', '')).strip()
            died = re.split(r' \(p+\. | and (?:was )?buried| buried ', died)[0].rstrip(' .,')
            if died.startswith('aged') or not re.search(r'[0-9۰-۹]|thousand|hundred|Hijri', died):
                died = ''
            elif 'editor' in dm.group(1) or ' vs ' in dm.group(1) or 'rival' in dm.group(1):
                flags.append('death date disputed on the line itself; both readings kept')
        em = re.search(r'entry no\. ([0-9۰-۹]+)', rest)
        row = {h: '' for h in header}
        row.update({
            'Name': name, 'Location': loc, 'id': rid, 'category': 'Muslim Shrine',
            'site_type': 'Dargah/Mazar',
            'site_type_note': f'A burial place as {a.title.split(", ", 1)[1]} records it; the present structure is not described.',
            'principal_figure': '' if is_site else en_name, 'silsila': sil, 'silsila_note': sil_note,
            'figure_died': died, 'support_level': 'Source-seeded', 'info_level': 'Low',
            'flags': f'NEW_FROM_BOOK_{a.slug.upper()}',
        })
        row.update({'_name_ur': ur_name, '_entry_no': em.group(1) if em else '', '_region': region,
                    '_group': group, '_takeaways_line': n + 1, '_review': '; '.join(flags)})
        out.append((row, l))

    # identity checks: an existing archive id is a refusal; two lines giving one id are kept apart
    # (second and later take the line number) and both are flagged, never merged
    first = {}
    for row, _ in out:
        if row['id'] in existing:
            errors.append(f'{row["id"]}: already an archive id')
        if row['id'] in first:
            other = first[row['id']]
            for r in (row, other):
                r['_review'] = '; '.join(filter(None, [r['_review'], 'shares a name with another line: one person or two?']))
            row['id'] = f'{row["id"]}-{row["_takeaways_line"]}'
        else:
            first[row['id']] = row
    byline = {r['_takeaways_line']: r for r, _ in out}
    for lines_, why in pairs:
        for ln in lines_:
            if ln not in byline:
                errors.append(f'--pair names line {ln}, which is not a row'); continue
            others = ', '.join(byline[o]['id'] for o in lines_ if o != ln and o in byline)
            byline[ln]['_review'] = '; '.join(filter(None, [byline[ln]['_review'], f'{why} (see {others})']))
    for row, l in out:
        p = os.path.join(REPO, 'shrine_entries', f'{row["id"]}.md')
        if os.path.exists(p):
            errors.append(f'{row["id"]}: shrine_entries file already exists')
        if l not in src_set:
            errors.append(f'{row["id"]}: line not verbatim')
    if errors:
        print('REFUSED -- nothing written:', *errors, sep='\n  '); return 2

    cols = header + ['_name_ur', '_entry_no', '_region', '_group', '_takeaways_line', '_review']
    patch = os.path.join(REPO, 'data/review', f'PATCH_new_rows_{a.slug}_{a.stamp}.csv')
    if not a.dry_run:
        with open(patch, 'w', encoding='utf-8', newline='') as fh:
            w = csv.DictWriter(fh, fieldnames=cols); w.writeheader()
            for row, _ in out:
                w.writerow(row)
        for row, l in out:
            with open(os.path.join(REPO, 'shrine_entries', f'{row["id"]}.md'), 'w', encoding='utf-8') as fh:
                fh.write(f'## From {a.title}\n\n*New row proposed {a.date} from `{src_rel}` (reviewed: no), '
                         f'line {row["_takeaways_line"]}: the book\'s "Figures and sites not in the archive", '
                         f'under {row["_region"]}{" / " + row["_group"] if row["_group"] else ""}. The line below '
                         f'is copied verbatim; nothing was added or reworded. Coordinates not yet known.*\n\n{l}\n')
    flagged = sum(1 for r, _ in out if r['_review'])
    print(f'{"DRY RUN -- " if a.dry_run else ""}{len(out)} new row(s); {flagged} carry review flags; '
          f'location blank on {sum(1 for r, _ in out if not r["Location"])}; silsila set on '
          f'{sum(1 for r, _ in out if r["silsila"])}; figure_died set on {sum(1 for r, _ in out if r["figure_died"])}')
    print('patch:', os.path.relpath(patch, REPO))
    for ln, name, why in excluded:
        print(f'  excluded line {ln}: {name} -- {why}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
