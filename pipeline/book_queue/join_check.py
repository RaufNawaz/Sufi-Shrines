#!/usr/bin/env python3
"""ORDER box step 2: the join check of the proposed new rows against the archive rows.

Why (Rauf, 13 October 2026, HANDOVER 9.333 ruling 4): "Enrich existing rows first, then new rows.
For proposed new rows, first look for any clue connecting a line to an existing archive row (name,
master, address, companions) and prefer that connection; a new row is the fallback."
Brief: docs/prompts/JOIN_CHECK_BRIEF.md (binding).

Until 17 October 2026 this script never wrote an entry; `apply` (below) now does, and still never a patch. It screens, queues and checks; the reading and the
decision are a person's or a worker's, recorded one line per proposed row in
pipeline/book_queue/join_decisions.tsv.

  screen          write out/join_check/candidates.tsv: for every proposed row, the archive rows a
                  rare name token or an alias (pipeline/book_queue/join_aliases.tsv) ties it to
  status          counts by decision, and how many undecided rows have screen candidates
  next N          the next N undecided rows (screen-candidate rows first, then patch order)
  view ID         a proposed row: its line(s) as the entry carries them, its cells, its candidates
  check           validate join_decisions.tsv; exit 1 on any failure (RULE 4)
  apply [--dry-run]  carry out Rauf's 16 Oct rulings (HANDOVER 9.357): related/carried-no lines appended
                  to archive entries, see-also both ways for joins and ruling-3 graveyards; ruling 8 HELD

Decisions: new | join | maybe | related  (see the brief). `evidence` must be a verbatim substring of
the proposed row's own entry lines; `target` must be an archive id for join/maybe/related.
"""
import csv, os, re, sys, unicodedata

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SNAP = os.path.join(REPO, 'data/snapshot_2026-10-08_post-import.csv')
PATCHES = [os.path.join(REPO, 'data/review/PATCH_new_rows_hadeeqat_ul_aulia_2026-10-10.csv'),
           os.path.join(REPO, 'data/review/PATCH_new_rows_tareekh_lahore_2026-10-10.csv')]
ALIASES = os.path.join(REPO, 'pipeline/book_queue/join_aliases.tsv')
DECISIONS = os.path.join(REPO, 'pipeline/book_queue/join_decisions.tsv')
CANDS = os.path.join(REPO, 'out/join_check/candidates.tsv')
ENTRIES = os.path.join(REPO, 'shrine_entries')
DECISION_KINDS = {'new', 'join', 'maybe', 'related'}
DEC_COLS = ['proposed_id', 'decision', 'target', 'evidence', 'carried', 'basis', 'decided']
csv.field_size_limit(10**9)

STOP = set('''shaikh sheikh shaykh sayyid syed sayed seyyed hazrat hazarat pir peer mir miyan mian
khwaja khawaja khwajah baba bibi shah sahib saheb sharif al el ul ud un ad ud-din din deen uddin
muhammad mohammad mohammed ahmad ahmed ali abd abdul abdal abu ibn bin lahori lahore multani
of the and a an at in on near outside inside known famous as entitled called also son daughter
mazar maqbara tomb shrine darbar dargah khanqah takya tekya mosque masjid temple mandir gurdwara
gurudwara samadh samadhi thakurdwara shivala dharamsala graveyard qabristan haveli bagh garden
qadri qadiri chishti naqshbandi suhrawardi sabri nizami mujaddidi gilani bukhari naqvi rizvi
qureshi hazrat-e maulana maulvi mulla mullah hafiz haji qazi qari mufti makhdum makhdoom
syeda sayyida sain sant bhai guru baba-ji ji jee devi mata lord sri shri dev'''.split())


def norm(s):
    s = unicodedata.normalize('NFKD', s or '')
    s = ''.join(c for c in s if not unicodedata.combining(c))
    return s.lower()


def latin_tokens(s):
    return [t for t in re.split(r"[^a-z]+", norm(s)) if len(t) >= 3 and t not in STOP]


def load_csv(p):
    with open(p, newline='', encoding='utf-8') as f:
        return list(csv.DictReader(f))


def archive():
    return {r['id']: r for r in load_csv(SNAP)}


def proposed():
    out = {}
    for p in PATCHES:
        book = 'hadeeqat_ul_aulia' if 'hadeeqat' in p else 'tareekh_lahore'
        for i, r in enumerate(load_csv(p)):
            r['_book'] = book
            r['_order'] = len(out)
            out[r['id']] = r
    return out


def entry_lines(pid):
    """The verbatim item line(s) of a proposed row's own entry (the `- ` lines and their
    continuations), i.e. what the join would carry."""
    p = os.path.join(ENTRIES, f'{pid}.md')
    if not os.path.exists(p):
        return None
    with open(p, encoding='utf-8') as f:
        txt = f.read()
    keep, on = [], False
    for ln in txt.split('\n'):
        if ln.startswith('- '):
            on = True
        elif ln.startswith('## ') or ln.startswith('*'):
            on = False
        if on and ln.strip():
            keep.append(ln)
    return '\n'.join(keep)


def aliases():
    al = {}
    if not os.path.exists(ALIASES):
        return al
    with open(ALIASES, encoding='utf-8') as f:
        for ln in f:
            if not ln.strip() or ln.startswith('#'):
                continue
            parts = ln.rstrip('\n').split('\t')
            if len(parts) < 2:
                sys.exit(f'join_aliases.tsv: bad line: {ln!r}')
            al.setdefault(parts[0], []).append(parts[1])
    return al


def screen(arc, prop):
    al = aliases()
    for aid in al:
        if aid not in arc:
            sys.exit(f'join_aliases.tsv names {aid}, which is not an archive id')
    # rare tokens: a token naming at most 3 archive rows
    tok_rows = {}
    for aid, r in arc.items():
        toks = set(latin_tokens(r['Name'] + ' ' + r['principal_figure'] + ' ' + r.get('Sufi Saint', '')))
        for a in al.get(aid, []):
            toks |= set(latin_tokens(a))
        for t in toks:
            tok_rows.setdefault(t, set()).add(aid)
    rare = {t: s for t, s in tok_rows.items() if len(s) <= 3}
    res = {}
    for pid, r in prop.items():
        hits = {}
        ptoks = set(latin_tokens(r['Name'] + ' ' + r['principal_figure']))
        for t in ptoks & rare.keys():
            for aid in rare[t]:
                hits.setdefault(aid, []).append(f'name-token:{t}')
        text = entry_lines(pid) or ''
        ntext = norm(text)
        for aid, als in al.items():
            for a in als:
                if re.search(r'[a-z]', norm(a)):
                    if re.search(r'(?<![a-z])' + re.escape(norm(a)) + r'(?![a-z])', ntext):
                        hits.setdefault(aid, []).append(f'alias:{a}')
                elif a in text:
                    hits.setdefault(aid, []).append(f'alias:{a}')
        res[pid] = hits
    return res


def load_decisions():
    if not os.path.exists(DECISIONS):
        return []
    with open(DECISIONS, newline='', encoding='utf-8') as f:
        rows = [r for r in csv.DictReader((l for l in f if not l.startswith('#')), delimiter='\t')]
    return rows


def cmd_screen(arc, prop):
    res = screen(arc, prop)
    os.makedirs(os.path.dirname(CANDS), exist_ok=True)
    with open(CANDS, 'w', newline='', encoding='utf-8') as f:
        w = csv.writer(f, delimiter='\t')
        w.writerow(['proposed_id', 'book', 'name', 'location', 'candidates'])
        for pid, r in prop.items():
            c = '; '.join(f"{a} ({', '.join(sorted(set(v)))})" for a, v in sorted(res[pid].items()))
            w.writerow([pid, r['_book'], r['Name'], r['Location'], c])
    n = sum(1 for v in res.values() if v)
    print(f'screened {len(prop)} proposed rows; {n} have at least one archive candidate -> {os.path.relpath(CANDS, REPO)}')
    return res


def cmd_check(arc, prop, quiet=False):
    rows = load_decisions()
    errs, seen = [], set()
    res = screen(arc, prop)
    for i, d in enumerate(rows, 2):
        pid = d.get('proposed_id', '')
        if set(d.keys()) != set(DEC_COLS):
            errs.append(f'line {i}: columns {sorted(d.keys())} != {DEC_COLS}')
            continue
        if pid not in prop:
            errs.append(f'line {i}: {pid} is not a proposed row id')
            continue
        if pid in seen:
            errs.append(f'line {i}: {pid} decided twice')
        seen.add(pid)
        k = d['decision']
        if k not in DECISION_KINDS:
            errs.append(f'line {i}: decision {k!r} not in {sorted(DECISION_KINDS)}')
        if not d['basis'].strip():
            errs.append(f'line {i}: {pid}: empty basis')
        if d['carried'] not in ('yes', 'no', ''):
            errs.append(f"line {i}: {pid}: carried must be yes, no or blank (blank only for new)")
        if k in ('join', 'maybe', 'related') and d['carried'] not in ('yes', 'no'):
            errs.append(f"line {i}: {pid}: {k} needs carried = yes or no")
        if not d['decided'].strip():
            errs.append(f'line {i}: {pid}: empty decided')
        text = entry_lines(pid)
        if text is None:
            errs.append(f'line {i}: {pid}: no shrine_entries/{pid}.md')
            continue
        if k in ('join', 'maybe', 'related'):
            for t in [x.strip() for x in d['target'].split(',') if x.strip()] or ['']:
                if t not in arc:
                    errs.append(f'line {i}: {pid}: target {t!r} is not an archive id')
            if not d['evidence'].strip():
                errs.append(f'line {i}: {pid}: {k} needs verbatim evidence')
            for ev in [e for e in d['evidence'].split(' || ') if e.strip()]:
                if ev not in text:
                    errs.append(f'line {i}: {pid}: evidence not verbatim in the entry line: {ev!r}')
        if k == 'new':
            if d['target'].strip():
                errs.append(f'line {i}: {pid}: a new row carries no target')
            if res[pid] and not any(a in d['basis'] for a in res[pid]):
                errs.append(f'line {i}: {pid}: screen candidates {sorted(res[pid])} not answered in basis')
    if errs:
        print('\n'.join(errs))
        print(f'FAIL: {len(errs)} problem(s) in {os.path.relpath(DECISIONS, REPO)}')
        sys.exit(1)
    if not quiet:
        print(f'ok: {len(rows)} decisions, {len(prop) - len(seen)} undecided')


# ---------------------------------------------------------------------------------------------
# apply — added 17 October 2026 (HANDOVER §9.359) to carry out Rauf's rulings of 16 October 2026
# (§9.357). Rulings 1-7 and 9; ruling 8's rows are HELD and never touched.
#   ruling 1  join     -> the row STAYS; a "see also" both ways (archive entry + proposed entry)
#   ruling 2  related  -> where carried = no, the proposed row's line(s) are appended verbatim to
#                         the archive entry, each book's lines under that book's `## From …` section
#   ruling 3  graveyard rows containing archive shrines -> own row, "see also" both ways
#   maybe / new / related-carried-yes -> nothing to write (maybe: already flagged in the entries)
# Never drops a row, never touches a patch CSV, the import CSV or the sheet.
# Backups: out/integration/join_check/before/<file>. Refuses a second application (the marker
# "proposed row `<id>`" already in the target). After writing, re-reads every file and checks it
# is exactly old text + inserted block, and every appended line occurs verbatim (RULE 4).
HELD_RULING_8 = {
    'samadh-maharaja-kharak-singh-and-kunwar-nau-nihal-singh',            # §9.351 Q4
    'pir-muhammad-sachiar-naushahi', 'sayyid-shah-ismat-allah-hamza-pahalwan-naushahi',
    'shah-farid-naushahi',                                                # the batch 2-3 reopenings
    'shaikh-haji-muhammad-saeed-lahori', 'haji-muhammad-saeed-dola-wari',
    'shah-sharaf-enclosure-at-khwaja-muhammad-saeeds',                    # "Haji Muhammad Saeed etc."
    'shaikh-muhammad-ismail-lahori-famous-as-mian-kalan-also-mian-wada',
    'sayyid-baha-al-din-gilani-known-as-bahawal-sher-qalandar-hujrawi',
}
CROSSREF_GRAVEYARD = {'miani-graveyard-and-panj-pir-dher'}                # ruling 3
APPLY_HEAD = '### Related and cross-referenced rows from the join check'
APPLY_INTRO = ("*Added by `join_check.py apply` on 17 October 2026 under Rauf's rulings of 16 October 2026 "
               "(HANDOVER §9.357); decisions in `pipeline/book_queue/join_decisions.tsv`. Every proposed row "
               "named here stays its own row.*")


def entry_sections(pid):
    """{`## From …` heading: verbatim item lines} of a proposed row's own entry."""
    p = os.path.join(ENTRIES, f'{pid}.md')
    with open(p, encoding='utf-8') as f:
        txt = f.read()
    out, head, on = {}, None, False
    for ln in txt.split('\n'):
        if ln.startswith('## '):
            head, on = ln, False
            continue
        if ln.startswith('- '):
            on = True
        elif ln.startswith('*'):
            on = False
        if on and ln.strip() and head:
            out.setdefault(head, []).append(ln)
    return out


def insert_in_section(txt, section_head, block_lines):
    """Insert block_lines at the end of APPLY_HEAD's subsection inside `section_head`'s `## `
    section (creating APPLY_HEAD at the end of that section if absent; creating the section at
    the end of the file if absent). Returns (new_text, position, inserted_string)."""
    lines = txt.split('\n')
    try:
        s = lines.index(section_head)
    except ValueError:
        ins = '\n\n' + section_head + '\n\n' + APPLY_HEAD + '\n\n' + APPLY_INTRO + '\n\n' + '\n'.join(block_lines) + '\n'
        base = txt.rstrip('\n')
        return base + ins, len(base), ins
    e = next((i for i in range(s + 1, len(lines)) if lines[i].startswith('## ')), len(lines))
    h = next((i for i in range(s + 1, e) if lines[i] == APPLY_HEAD), None)
    if h is None:
        end = e
        while end > s + 1 and not lines[end - 1].strip():
            end -= 1
        piece = ['', APPLY_HEAD, '', APPLY_INTRO, '', *block_lines]
    else:
        end = next((i for i in range(h + 1, e) if lines[i].startswith('### ')), e)
        while end > h + 1 and not lines[end - 1].strip():
            end -= 1
        piece = ['', *block_lines]
    pos = len('\n'.join(lines[:end]))
    ins = '\n' + '\n'.join(piece)
    return txt[:pos] + ins + txt[pos:], pos, ins


def cmd_apply(arc, prop, dry):
    cmd_check(arc, prop, quiet=True)
    dec = load_decisions()
    plan, skipped = [], []   # plan: (file, section_head, block_lines, marker, appended_verbatim)
    for d in dec:
        pid, k = d['proposed_id'], d['decision']
        if pid in HELD_RULING_8:
            if k != 'new' or True:
                skipped.append((pid, 'HELD by ruling 8'))
            continue
        targets = [t.strip() for t in d['target'].split(',') if t.strip()]
        name = prop[pid]['Name']
        if k == 'related' and d['carried'] == 'no':
            secs = entry_sections(pid)
            for t in targets:
                if not os.path.exists(os.path.join(ENTRIES, f'{t}.md')):
                    skipped.append((pid, f'target {t} has no shrine_entries file (not created by apply)'))
                    continue
                for head, ls in secs.items():
                    block = [f"*Related site (ruling 2) — proposed row `{pid}`, {name}. Join-check basis follows; "
                             f"then its line(s) under this book, copied verbatim from `shrine_entries/{pid}.md`.*",
                             '', 'Join-check basis: ' + d['basis'], '', *ls]
                    plan.append((t, head, block, f'proposed row `{pid}`', ls))
        if (k == 'join') or (pid in CROSSREF_GRAVEYARD):
            rule = ('ruling 1: the same site or inside this row\'s own precinct, kept as its own row and '
                    'cross-referenced' if k == 'join' else
                    'ruling 3: a graveyard that contains this archive shrine, its own row, cross-referenced')
            secs = entry_sections(pid)
            for t in targets:
                if not os.path.exists(os.path.join(ENTRIES, f'{t}.md')):
                    skipped.append((pid, f'target {t} has no shrine_entries file'))
                    continue
                for head in secs:
                    block = [f"*See also (cross-reference, {rule}) — proposed row `{pid}`, {name}.*", '',
                             'Join-check basis: ' + d['basis']]
                    plan.append((t, head, block, f'proposed row `{pid}`', []))
                # the other direction: in the proposed row's own entry, as an italic line
                aname = arc[t]['Name']
                plan.append((pid, None, [f"*See also: archive row `{t}`, {aname} ({rule}; HANDOVER §9.357). "
                                         f"Marker: proposed row `{pid}` → `{t}`.*"],
                             f'proposed row `{pid}` → `{t}`', []))
    # group by file
    from collections import OrderedDict
    byfile = OrderedDict()
    for f, head, block, marker, ls in plan:
        byfile.setdefault(f, []).append((head, block, marker, ls))
    errs, written = [], []
    bdir = os.path.join(REPO, 'out/integration/join_check/before')
    for f, items in byfile.items():
        p = os.path.join(ENTRIES, f'{f}.md')
        with open(p, encoding='utf-8') as fh:
            old = fh.read()
        new = old
        for head, block, marker, ls in items:
            if marker in old:
                errs.append(f'{f}.md already carries {marker!r}: refusing a second application')
                continue
            if head is None:
                ins = '\n\n' + '\n'.join(block) + '\n'
                new = new.rstrip('\n') + ins
            else:
                new, _, _ = insert_in_section(new, head, block)
        # verify: every appended verbatim line present; old lines all still present in order
        for head, block, marker, ls in items:
            for ln in ls:
                if ln not in new:
                    errs.append(f'{f}.md: appended line not found verbatim after insert: {ln[:60]!r}')
            if marker not in new:
                errs.append(f'{f}.md: marker {marker!r} missing after insert')
        it = iter(new.split('\n'))
        if not all(any(x == y for y in it) for x in old.split('\n')):
            errs.append(f'{f}.md: an existing line was lost or reordered')
        if new.count('*') % 2:
            errs.append(f'{f}.md: odd asterisk count after insert')
        written.append((f, p, old, new, len(items)))
    for pid, why in skipped:
        print(f'skip  {pid}: {why}')
    for f, p, old, new, n in written:
        print(f'{"would write" if dry else "write"}  shrine_entries/{f}.md  (+{len(new) - len(old)} chars, {n} item(s))')
    if errs:
        print('\n'.join(errs))
        sys.exit(f'FAIL: {len(errs)} problem(s); nothing written')
    if dry:
        print(f'dry run: {len(written)} file(s) would change; nothing written')
        return
    import hashlib
    os.makedirs(bdir, exist_ok=True)
    for f, p, old, new, n in written:
        bp = os.path.join(bdir, f'{f}.md')
        if not os.path.exists(bp):
            with open(bp, 'w', encoding='utf-8') as fh:
                fh.write(old)
        with open(p, 'w', encoding='utf-8') as fh:
            fh.write(new)
        with open(p, encoding='utf-8') as fh:
            back = fh.read()
        if back != new:
            sys.exit(f'FAIL: {p} read back differs from what was written')
        print(f'  md5 {hashlib.md5(back.encode()).hexdigest()}  shrine_entries/{f}.md')
    print(f'applied: {len(written)} file(s); backups in {os.path.relpath(bdir, REPO)}')



def main():
    a = sys.argv[1:]
    if not a:
        sys.exit(__doc__)
    arc, prop = archive(), proposed()
    if a[0] == 'screen':
        cmd_screen(arc, prop)
    elif a[0] == 'check':
        cmd_check(arc, prop)
    elif a[0] in ('status', 'next'):
        res = screen(arc, prop)
        dec = {d['proposed_id']: d for d in load_decisions()}
        if a[0] == 'status':
            from collections import Counter
            c = Counter(d['decision'] for d in dec.values())
            und = [p for p in prop if p not in dec]
            print(f'proposed rows: {len(prop)}  decided: {len(dec)}  ' + '  '.join(f'{k} {c.get(k, 0)}' for k in sorted(DECISION_KINDS)))
            print(f'undecided: {len(und)} ({sum(1 for p in und if res[p])} with screen candidates)')
        else:
            n = int(a[1]) if len(a) > 1 else 20
            und = sorted((p for p in prop if p not in dec), key=lambda p: (0 if res[p] else 1, prop[p]['_order']))
            for p in und[:n]:
                print(p, '\t', '; '.join(sorted(res[p])) or '-')
    elif a[0] == 'apply':
        cmd_apply(arc, prop, dry='--dry-run' in a)
    elif a[0] == 'view':
        res = screen(arc, prop)
        pid = a[1]
        r = prop[pid]
        print(f"{pid}  [{r['_book']}]  Name={r['Name']!r}  Location={r['Location']!r}  category={r['category']}/{r['site_type']}")
        print(f"principal_figure={r['principal_figure']!r}  figure_died={r['figure_died']!r}  _review={r['_review']!r}")
        print('candidates:', '; '.join(f"{k} ({', '.join(sorted(set(v)))})" for k, v in res[pid].items()) or '-')
        print(entry_lines(pid))
    else:
        sys.exit(__doc__)


if __name__ == '__main__':
    main()
