#!/usr/bin/env python3
"""Saints a book documents who have no site in Pakistan -> a seed for the saints-and-orders layer.

Ruling (Rauf, 10 Oct 2026, HANDOVER 9.286 record): "for saints what you do is add them to the
section which explores saints and orders". Sites in Pakistan became rows (build_new_rows.py); this
takes the FIGURES of the takeaways' `## Figures and sites not in the archive` that are not [PK]:

  kind "entry"  a `- **English / اردو** — …` line (the book's own numbered entry, mostly)
  kind "named"  a bold name inside one of the saint-framed `·` lists: "Spiritual masters, teachers
                and kin named in passing", "Named without a grave", "Chain-links named from outside
                India", "Also named without a place", and "Place not stated".
Lists that are NOT about saints (informants, manuscript owners, places) are left out and
reported; which "Also named" lists count, and which items inside them are not figures, is
recorded per book in pipeline/book_queue/new_rows_decisions/<slug>.json under "figures". Every record keeps its source text verbatim (RULE 2): the name, the Urdu as printed, the
death clause as printed, and the line or list item itself. Nothing is normalised or merged; the
KG build does identity joining with its own name key, and reports what it joins.

Writes data/kg-book-figures-<slug>.json. Usage: build_book_figures.py <slug> [--dry-run]
"""
import argparse, json, os, re, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SAINT_LISTS = ('Spiritual masters, teachers and kin named in passing', '- Named without a grave:',
               '- Chain-links named from outside India', '- Also named without a place:',
               'Figures the book names and describes but does not bury')
ENTRY_RE = re.compile(r'^- \*\*(.+?)\*\*(.*)$')
BOLD_RE = re.compile(r'\*\*(.+?)\*\*')


def slugify(text):
    t = re.sub(r'\[(?:OCR\?|illegible)\]', '', text).lower()
    t = re.sub(r'[^\w\s-]', '', t, flags=re.ASCII)
    return re.sub(r'-+', '-', re.sub(r'[\s_]+', '-', t)).strip('-')


def main():
    ap = argparse.ArgumentParser(); ap.add_argument('slug'); ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    src_rel = f'entries/book_takeaways/{a.slug}.md'
    L = open(os.path.join(REPO, src_rel), encoding='utf-8').read().split('\n')
    st = L.index('## Figures and sites not in the archive')
    en = next(i for i in range(st + 1, len(L)) if L[i].startswith('## '))
    dec_path = os.path.join(REPO, 'pipeline/book_queue/new_rows_decisions', f'{a.slug}.json')
    dec = (json.load(open(dec_path, encoding='utf-8')) if os.path.exists(dec_path) else {}).get('figures', {})
    also, skip_items, skipped = set(dec.get('alsoNamedRegions', [])), dec.get('skipItems', {}), []
    region, figs, left_out, pending = '', [], [], None
    for n in range(st, en):
        l = L[n]
        if l.startswith('### '):
            region = l[4:].strip(); pending = None; continue
        if l.startswith('---') or l.startswith('**Count.**'):
            break
        m = ENTRY_RE.match(l)
        if m and not l.startswith('- [PK]'):
            en_name, _, ur = m.group(1).partition(' / ')
            rest = m.group(2)
            dm = re.search(r'(?:^|; )((?:died|d\.|killed) [^;]+)', rest.lstrip(' —'))
            em = re.search(r'entry no\. ([0-9۰-۹]+)', rest)
            died = ''
            if dm:   # the clause as printed, cut where the line moves on to burial, quotation or citation
                died = re.split(r' \(p+\. | and | — |, "|; ', dm.group(1).replace('**', ''))[0].rstrip(' .,')
                if not re.search(r'[0-9۰-۹]|thousand|hundred', died):
                    died = ''
            figs.append(dict(kind='entry', slug=slugify(en_name.split(' b. ')[0]), name=en_name.strip(),
                             nameUr=ur.strip(), died=died,
                             entryNo=em.group(1) if em else '', region=region, line=n + 1, text=l))
            continue
        # a list item paragraph: the framing sentence may be on this line or the line before
        frame = next((s for s in SAINT_LISTS if l.startswith(s) or (pending and pending.startswith(s))), None)
        if not frame and l.startswith('- Also named:') and region in also:
            frame = '- Also named:'
        if ' · ' in l or (frame and BOLD_RE.search(l)):
            if frame:
                for item in l.split(' · '):
                    for nm in BOLD_RE.findall(item)[:1]:   # the item's first bold run is its figure
                        if nm in skip_items:
                            skipped.append((n + 1, nm, skip_items[nm])); continue
                        figs.append(dict(kind='named', slug=slugify(nm), name=nm, nameUr='', died='',
                                         entryNo='', region=region, line=n + 1, text=item.strip()))
            else:
                left_out.append((n + 1, region, l[:90]))
        pending = l if l.strip() else pending
    joins, has_row = dec.get('joins', {}), dec.get('hasRow', {})
    dropped = [(f['line'], f['slug'], has_row[f['slug']]) for f in figs if f['slug'] in has_row]
    figs = [f for f in figs if f['slug'] not in has_row]
    for f in figs:
        if f['slug'] in joins:
            f['joinsSaint'] = joins[f['slug']]
    # the same figure can be listed twice in one book (a numbered entry and a passing mention):
    # keep both records, mark the repeat, never merge here
    seen = {}
    for f in figs:
        if f['slug'] in seen:
            f['repeatOf'] = seen[f['slug']]
        else:
            seen[f['slug']] = f['line']
    out = {'_comment': f'Built by pipeline/book_queue/build_book_figures.py from {src_rel} '
                       '("Figures and sites not in the archive", the non-[PK] figures). Verbatim; reviewed: no.',
           'work': a.slug, 'figures': figs}
    path = os.path.join(REPO, 'data', f'kg-book-figures-{a.slug}.json')
    if not a.dry_run:
        json.dump(out, open(path, 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
        open(path, 'a', encoding='utf-8').write('\n')
    k = {x: sum(1 for f in figs if f['kind'] == x) for x in ('entry', 'named')}
    print(f'{"DRY RUN -- " if a.dry_run else ""}{len(figs)} figure record(s): {k["entry"]} entries, '
          f'{k["named"]} named in saint lists; {sum(1 for f in figs if "repeatOf" in f)} repeats; '
          f'{len({f["slug"] for f in figs})} distinct slugs')
    print(f'  joined to a figure the graph holds: {sum(1 for f in figs if "joinsSaint" in f)} record(s)')
    for ln, sl, rid in dropped:
        print(f'  dropped line {ln}: {sl} -- already a proposed row ({rid})')
    for ln, nm, why in skipped:
        print(f'  skipped item line {ln}: {nm} -- {why}')
    for ln, reg, txt in left_out:
        print(f'  left out (not a saint list) line {ln} [{reg}]: {txt}')
    return 0


if __name__ == '__main__':
    sys.exit(main())
