#!/usr/bin/env python3
"""Integration stage, step 2-5, for one book: append its id-headed takeaways to shrine_entries/.

Written 10 October 2026 for the first integration that carried content (hadeeqat_ul_aulia,
HANDOVER 9.285). The brief (docs/prompts/BOOK_QUEUE_TASK.md, "Integration stage") asks for an
appended `## From <Author, Short title>` section per shrine id, the takeaways' groups kept, and
nothing already in an entry rewritten. This script does that by COPYING, never retyping: every
line it appends is either one of its own three scaffolding lines or a line that occurs verbatim
in the takeaways file, and it checks exactly that before it writes anything (RULE 2 / RULE 4).

What it takes, per `### <id> — <name>` heading anywhere in the takeaways file:
  - the block's body, up to the next `###`, `##` or `---` line;
  - minus any top-level bullet (with its continuation lines) that contains "not attached"
    (the brief: leave such bullets out, and count them);
  - plus, under `### Doubts the notes raise on this row`, every item in
    `## Doubts and review points` whose head names this id in backticks (see doubt_items).
    Those are the book's own caveats on the row, including its do-not-map refusals, and must
    not be separated from the facts they qualify.

What it refuses (exit non-zero, nothing written):
  - an id not in shrine_index.tsv;
  - an entry that already carries this book's section (no double append);
  - any appended line that is not in the takeaways file (bar the scaffolding);
  - an existing entry whose new text does not start byte-for-byte with its old text.

Province-level material is NOT handled here (the ruling of 8 Oct 2026 applies it to "every entry
in that province"; whether that means creating entries for rows that have none was put to Rauf
on 10 Oct 2026). Sheet-cell proposals are not handled here either.

Usage:
  integrate_book.py <slug> --title "Author, Short title" --date "10 October 2026"
                    [--skip id,id,...] [--dry-run]
"""
import argparse, json, os, re, shutil, sys

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
INDEX = os.path.join(REPO, 'pipeline/book_queue/shrine_index.tsv')
ENTRIES = os.path.join(REPO, 'shrine_entries')
FALLBACK = os.path.join(REPO, 'src/data/shrines-fallback.json')

HEAD_RE = re.compile(r'^### (?:\*\*)?([a-z0-9][a-z0-9-]*[a-z0-9])(?:\*\*)? (?:—|--) ')
DOUBT_HEAD_RE = re.compile(r'^\*\*[A-Z]+\d+\. ')   # **B4. `id` — ...** (the head may wrap)
DOUBT_LIST_RE = re.compile(r'^- (`[a-z0-9-]+`.*?) (?:—|--) ')   # - `id` (, `id`) — ...
TICK_RE = re.compile(r'`([a-z0-9][a-z0-9-]*[a-z0-9])`')


def load_ids():
    with open(INDEX, encoding='utf-8') as fh:
        hdr = fh.readline().rstrip('\n').split('\t')
        col = hdr.index('id')
        return {ln.rstrip('\n').split('\t')[col] for ln in fh if ln.strip()}


def blocks(lines):
    """Yield (id, start, body_lines) for every `### <id> — name` block."""
    i = 0
    while i < len(lines):
        m = HEAD_RE.match(lines[i])
        if not m:
            i += 1
            continue
        j = i + 1
        while j < len(lines) and not re.match(r'^(##|---\s*$)', lines[j]):
            j += 1
        yield m.group(1), i, lines[i + 1:j]
        i = j


def drop_not_attached(body):
    """Remove top-level bullets (and their continuation lines) that say 'not attached'."""
    out, dropped, k = [], 0, 0
    while k < len(body):
        if body[k].startswith('- '):
            e = k + 1
            while e < len(body) and body[e].startswith('  ') and not body[e].startswith('- '):
                e += 1
            item = body[k:e]
            if 'not attached' in ' '.join(item).lower():
                dropped += 1
            else:
                out.extend(item)
            k = e
        else:
            out.append(body[k])
            k += 1
    return out, dropped


def doubt_items(lines):
    """Map id -> list of items from the Doubts section that name it in their head.

    Two shapes: a paragraph item whose bold head carries the ids in backticks
    (`**B4. `id` — ...**`, `**I3. `a` (and `b`) — ...**`), and a list item whose ids come
    before its dash (`- `a` and `b` — do not attach ...`, the I26 do-not-map list). Ids in
    the BODY of an item are cross-references and do not count.
    """
    try:
        start = next(n for n, l in enumerate(lines) if l.startswith('## Doubts'))
    except StopIteration:
        return {}
    found, n = {}, start + 1
    while n < len(lines) and not lines[n].startswith('## '):
        mp, ml = DOUBT_HEAD_RE.match(lines[n]), DOUBT_LIST_RE.match(lines[n])
        if mp or ml:
            e = n + 1
            if mp:
                while e < len(lines) and lines[e].strip() and not lines[e].startswith(('#', '- ')):
                    e += 1
            else:
                while e < len(lines) and lines[e].startswith('  '):
                    e += 1
            if mp:   # the bold head can wrap over lines: read it up to its closing **
                joined = ' '.join(lines[n:e])[2:]
                head = joined[:joined.find('**')] if '**' in joined else joined
            else:
                head = ml.group(1)
            for i in dict.fromkeys(TICK_RE.findall(head)):
                found.setdefault(i, []).append(lines[n:e])
            n = e
        else:
            n += 1
    return found


def strip_blank_edges(ls):
    while ls and not ls[0].strip():
        ls = ls[1:]
    while ls and not ls[-1].strip():
        ls = ls[:-1]
    return ls


def province_mode(a):
    """Append `### province: <key>` bullets to every existing entry the index tags with <key>.

    Inside the book's `## From …` section: if the entry already has that section it must be the
    LAST `## ` section of the file (so appending at the end stays inside it), otherwise the
    section heading and intro are written first. Refuses on a second run, on any line not
    verbatim in the takeaways, and on a broken byte prefix -- same guarantees as the id mode.
    """
    src_rel = f'entries/book_takeaways/{a.slug}.md'
    lines = open(os.path.join(REPO, src_rel), encoding='utf-8').read().split('\n')
    try:
        st = lines.index(f'### province: {a.province}')
    except ValueError:
        print(f'REFUSED -- no `### province: {a.province}` in {src_rel}'); return 2
    en = st + 1
    while en < len(lines) and not lines[en].startswith(('### ', '## ')):
        en += 1
    body = strip_blank_edges(lines[st + 1:en])
    n_bullets = sum(1 for l in body if l.startswith('- '))
    skip = {s for s in a.skip.split(',') if s}
    with open(INDEX, encoding='utf-8') as fh:
        hdr = fh.readline().rstrip('\n').split('\t')
        tagged = [r[hdr.index('id')] for r in (l.rstrip('\n').split('\t') for l in fh if l.strip())
                  if len(r) > hdr.index('province') and r[hdr.index('province')] == a.province]
    heading = f'## From {a.title}'
    sub = f'### Province-level material: {a.province}'
    intro = (f'*Integrated {a.date} from `{src_rel}` (reviewed: no). Every line below the heading is '
             f'copied verbatim from that file; nothing was added or reworded. Page references are as '
             f'the takeaways give them.*')
    pnote = (f"*The book's `{a.province}` bullets, copied into every existing entry in the province "
             f'(Rauf, 8 and 10 October 2026). They speak of the province, not of this shrine.*')
    backup = os.path.join(REPO, 'out/integration', a.slug, f'before_province_{a.province}')
    done, held, missing = [], [], 0
    for rid in tagged:
        path = os.path.join(ENTRIES, f'{rid}.md')
        if not os.path.exists(path):
            missing += 1; continue
        if rid in skip:
            held.append(rid); continue
        if a.only and rid not in a.only.split(','):
            continue
        old = open(path, encoding='utf-8').read()
        ol = old.split('\n')
        if sub in ol:
            print(f'REFUSED -- {rid}.md already has "{sub}"'); return 3
        if heading in ol:
            last_h2 = max(i for i, l in enumerate(ol) if l.startswith('## '))
            if ol[last_h2] != heading:
                print(f'REFUSED -- {rid}.md: the book section is not the last section'); return 4
            add = ['', sub, '', pnote, ''] + body
        else:
            add = ['', heading, '', intro, '', sub, '', pnote, ''] + body
        new = old.rstrip('\n') + '\n' + '\n'.join(add) + '\n'
        if not new.startswith(old.rstrip('\n')):
            print(f'REFUSED -- {rid}: prefix'); return 5
        if not a.dry_run:
            os.makedirs(backup, exist_ok=True)
            shutil.copy2(path, os.path.join(backup, f'{rid}.md'))
            open(path, 'w', encoding='utf-8').write(new)
        done.append(rid)
    print(f'{"DRY RUN -- " if a.dry_run else ""}{a.slug} province {a.province}: {n_bullets} bullet(s) '
          f'into {len(done)} existing entr(ies); {missing} tagged row(s) have no entry (not created, '
          f'ruling of 10 Oct); held: {",".join(held) or "none"}')
    print('province entries:', ','.join(done))
    return 0


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('slug')
    ap.add_argument('--title', required=True)
    ap.add_argument('--date', required=True)
    ap.add_argument('--skip', default='')
    ap.add_argument('--only', default='', help='integrate only these ids (comma separated)')
    ap.add_argument('--claim-note', default='',
                    help='one extra italic line under the intro, for an attachment Rauf ruled to carry '
                         'as the book\'s claim (10 Oct 2026: shrine-of-baba-shah-kamal)')
    ap.add_argument('--province', default='',
                    help='instead of id sections, append the book\'s `### province: <key>` bullets to '
                         'every EXISTING entry tagged with that province (ruling of 10 Oct 2026)')
    ap.add_argument('--doubt-also', default='',
                    help='ID:ITEM[,ID:ITEM] -- also attach the Doubts item numbered ITEM (e.g. I1) to ID, for '
                         'an item that names the id only in its body')
    ap.add_argument('--dry-run', action='store_true')
    a = ap.parse_args()
    if a.province:
        return province_mode(a)

    src_rel = f'entries/book_takeaways/{a.slug}.md'
    with open(os.path.join(REPO, src_rel), encoding='utf-8') as fh:
        src_lines = fh.read().split('\n')
    src_set = set(src_lines)
    ids = load_ids()
    skip = {s for s in a.skip.split(',') if s}
    rows = {r['id']: r for r in json.load(open(FALLBACK, encoding='utf-8'))['rows']}
    doubts = doubt_items(src_lines)
    heading = f'## From {a.title}'
    scaffold = {heading,
                f'*Integrated {a.date} from `{src_rel}` (reviewed: no). Every line below the '
                f'heading is copied verbatim from that file; nothing was added or reworded. Page '
                f'references are as the takeaways give them.*',
                '### Doubts the notes raise on this row', ''}
    intro = sorted(scaffold - {heading, '### Doubts the notes raise on this row', ''})[0]
    only = {s for s in a.only.split(',') if s}
    for pair in filter(None, a.doubt_also.split(',')):
        did, item = pair.split(':')
        n = next(i for i, l in enumerate(src_lines) if l.startswith(f'**{item}. '))
        e = n + 1
        while e < len(src_lines) and src_lines[e].strip() and not src_lines[e].startswith(('#', '- ')):
            e += 1
        doubts.setdefault(did, []).insert(0, src_lines[n:e])
    if a.claim_note:
        scaffold.add(f'*{a.claim_note}*')

    plan, skipped, errors, dropped_total, seen = [], [], [], 0, set()
    for bid, at, body in blocks(src_lines):
        if bid not in ids:
            errors.append(f'line {at + 1}: id {bid!r} not in shrine_index.tsv')
            continue
        if bid in seen:
            errors.append(f'line {at + 1}: id {bid!r} heads two blocks; merge them in the takeaways first')
            continue
        seen.add(bid)
        if bid in skip or (only and bid not in only):
            if bid in skip:
                skipped.append(bid)
            continue
        body, dropped = drop_not_attached(body)
        dropped_total += dropped
        section = [heading, '', intro, ''] + ([f'*{a.claim_note}*', ''] if a.claim_note else []) \
            + strip_blank_edges(body)
        if bid in doubts:
            section += ['', '### Doubts the notes raise on this row', '']
            for item in doubts[bid]:
                section += item + ['']
            section = strip_blank_edges(section)
        stray = [l for l in section if l not in src_set and l not in scaffold]
        if stray:
            errors.append(f'{bid}: {len(stray)} appended line(s) not verbatim in the takeaways, first: {stray[0][:80]!r}')
            continue
        plan.append((bid, section, dropped))

    if errors:
        print('REFUSED -- nothing written:', *errors, sep='\n  ')
        return 2

    backup = os.path.join(REPO, 'out/integration', a.slug, 'before')
    created, appended = [], []
    for bid, section, dropped in plan:
        path = os.path.join(ENTRIES, f'{bid}.md')
        if os.path.exists(path):
            old = open(path, encoding='utf-8').read()
            if heading in old.split('\n'):
                print(f'REFUSED -- {bid}.md already has "{heading}"; nothing written')
                return 3
            new = old.rstrip('\n') + '\n\n' + '\n'.join(section) + '\n'
            appended.append(bid)
        else:
            if bid not in rows:
                print(f'REFUSED -- {bid} has no entry and no row in shrines-fallback.json to seed one')
                return 4
            old = None
            desc = rows[bid].get('Description') or ''
            new = (f'## Current site description (as of {a.date})\n\n'
                   f"*The row's `Description` cell exactly as it appears in `src/data/shrines-fallback.json` "
                   f'on {a.date}, untouched. Not yet checked against sources.*\n\n'
                   + (desc.rstrip('\n') if desc.strip() else '*(The cell is empty.)*')
                   + '\n\n' + '\n'.join(section) + '\n')
            created.append(bid)
        if old is not None and not new.startswith(old.rstrip('\n')):
            print(f'REFUSED -- {bid}: new text does not start with the old entry'); return 5
        if not a.dry_run:
            os.makedirs(backup, exist_ok=True)
            if old is not None:
                shutil.copy2(path, os.path.join(backup, f'{bid}.md'))
            with open(path, 'w', encoding='utf-8') as fh:
                fh.write(new)

    print(f'{"DRY RUN -- " if a.dry_run else ""}{a.slug}: {len(plan)} section(s); '
          f'{len(appended)} appended to existing entries, {len(created)} entries created; '
          f'{dropped_total} "not attached" bullet(s) left out; skipped ids: {",".join(skipped) or "none"}')
    print('appended:', ','.join(appended))
    print('created:', ','.join(created))
    print('integrated ids:', ','.join(b for b, _, _ in plan))
    return 0


if __name__ == '__main__':
    sys.exit(main())
