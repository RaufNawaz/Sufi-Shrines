#!/usr/bin/env python3
"""Structural gate for a directed web-research pass (RULE 4: encode the invariant).

A research file is the archive's evidence trail. Its value is entirely in the
things that are easy to omit under time pressure — the URL, the access date, the
verbatim quote, the explicit verdict — and every one of those omissions is
invisible in a file that otherwise reads well. So they are checked, and the
check exits non-zero.

What it checks, and *only* this:

  1. Every target named in the batch's manifest(s) has a file.
  2. Every file carries all five required section headings.
  3. Every file's verdict is one of the three allowed words.
  4. A file whose verdict is STRONG or PARTIAL cites at least one URL and at
     least one access date inside its Verified findings.
  5. A file whose verdict is STRONG or PARTIAL quotes at least one source
     inside its Verified findings — either as a `>` blockquote or as an inline
     `"..."` run of five words or more. Both styles are in real use in
     `entries/web-research-2026-08/`, and the first version of this check
     accepted only blockquotes, so it failed 32 of that pass's 40 files. That is
     what a wrong check looks like: it fails almost everything, and the tempting
     repair is to reformat 32 good files. RULE 4 — fix the check.
  6. NOTHING RELIABLE FOUND files are exempt from 4 and 5 — having no citation
     is the whole content of that verdict — but must still have the sections.

What it deliberately does NOT check: prose style, length, source quality, or
whether a finding is *true*. Those are judgements, and a linter that makes them
gets fixed by editing the content, which is the failure mode CLAUDE.md RULE 4
warns about by name ("a linter once flagged the phrase 'a poet of note:' ... The
linter was wrong. Fix the check.").

Usage:
    python3 pipeline/check_research_files.py entries/web-research-2026-09
    python3 pipeline/check_research_files.py entries/web-research-2026-08 --no-manifest
"""
from __future__ import annotations

import argparse
import csv
import re
import sys
from pathlib import Path

REQUIRED_SECTIONS = [
    'Verified findings',
    'Conflicts',
    'Unverified leads',
    'Acquisition leads',
    'Verdict',
]
VERDICTS = ['STRONG', 'PARTIAL', 'NOTHING RELIABLE FOUND']
# Files that are the pass's own bookkeeping, not research on a site.
NON_TARGET_FILES = {'README', 'SUMMARY', 'ACQUISITION_LIST'}

URL = re.compile(r'https?://\S+')
ACCESS_DATE = re.compile(r'accessed\s+\d{1,2}\s+\w+\s+\d{4}', re.I)
# An inline quotation of at least five words, in straight or curly doubles.
INLINE_QUOTE = re.compile(r'["“][^"“”]*?(?:\s+\S+){4,}[^"“”]*?["”]')


def quotes_a_source(findings: str) -> bool:
    if any(l.lstrip().startswith('>') for l in findings.splitlines()):
        return True
    return bool(INLINE_QUOTE.search(findings))


def sections(text: str) -> dict:
    """Split on `## ` headings, returning {heading: body}. Tolerates `###` inside."""
    out, current, buf = {}, None, []
    for line in text.splitlines():
        m = re.match(r'^##\s+(?!#)(.*?)\s*$', line)
        if m:
            if current is not None:
                out[current] = '\n'.join(buf)
            current, buf = m.group(1), []
        else:
            buf.append(line)
    if current is not None:
        out[current] = '\n'.join(buf)
    return out


def section_body(secs: dict, wanted: str) -> str | None:
    """Match a heading loosely — a follow-up pass may title it 'Revised verdict'."""
    for head, body in secs.items():
        if head.lower().startswith(wanted.lower()):
            return body
    return None


def check_file(path: Path) -> list[str]:
    text = path.read_text(encoding='utf-8')
    secs = sections(text)
    problems = []

    for want in REQUIRED_SECTIONS:
        if section_body(secs, want) is None:
            problems.append(f'missing section: ## {want}')

    verdict_body = section_body(secs, 'Verdict')
    verdict = None
    if verdict_body is not None:
        # Longest first, so STRONG inside "NOTHING RELIABLE FOUND" can't shadow it.
        for v in sorted(VERDICTS, key=len, reverse=True):
            if v in verdict_body.upper():
                verdict = v
                break
        if verdict is None:
            problems.append(f'verdict is none of {VERDICTS}')

    findings = section_body(secs, 'Verified findings') or ''
    if verdict in ('STRONG', 'PARTIAL'):
        if not URL.search(findings):
            problems.append('verdict claims verified sources but no URL in Verified findings')
        if not ACCESS_DATE.search(findings):
            problems.append('verdict claims verified sources but no "accessed <date>" '
                            'in Verified findings')
        if not quotes_a_source(findings):
            problems.append('verdict claims verified sources but quotes none of them '
                            '(no "> " blockquote and no inline "..." of 5+ words) '
                            'in Verified findings')
    return problems


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument('batch_dir')
    ap.add_argument('--no-manifest', action='store_true',
                    help='skip the "every manifest target has a file" check')
    args = ap.parse_args()

    d = Path(args.batch_dir)
    if not d.is_dir():
        print(f'not a directory: {d}', file=sys.stderr)
        return 2

    files = sorted(p for p in d.glob('*.md') if p.stem not in NON_TARGET_FILES)
    failures = 0

    if not args.no_manifest:
        expected = {}
        for manifest in sorted(d.glob('targets*.tsv')):
            with open(manifest, newline='', encoding='utf-8') as fh:
                for row in csv.DictReader(fh, delimiter='\t'):
                    expected[row['file_slug']] = (row['name'], manifest.name)
        have = {p.stem for p in files}
        for slug, (name, manifest) in sorted(expected.items()):
            if slug not in have:
                print(f'MISSING  {slug}.md  ({name} — listed in {manifest})')
                failures += 1
        strays = have - set(expected)
        for slug in sorted(strays):
            print(f'note     {slug}.md is not in any manifest')

    for p in files:
        problems = check_file(p)
        if problems:
            failures += len(problems)
            print(f'FAIL     {p.name}')
            for prob in problems:
                print(f'           - {prob}')

    print(f'\n{len(files)} research files checked in {d}; {failures} problem(s).')
    return 1 if failures else 0


if __name__ == '__main__':
    raise SystemExit(main())
