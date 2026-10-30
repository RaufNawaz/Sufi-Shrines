#!/usr/bin/env python3
"""check_public_description.py: refuse a public Description (English or Urdu) that breaks Rauf's
24 October 2026 ruling, RULE 2, or the shape.

Rauf ruled on 24 October 2026 (in chat) that the rewritten Descriptions read like an encyclopedia.
They stay as the TEAM version (entries/descriptions/<id>.md). Every row also gets a PUBLIC version
that distils them into one narrative: no author by author citing, no side by side disagreements
(the established position, with "accounts differ"), nothing about uncertain readings, about three
quarters of the team version's length, and an Urdu article that independent verifiers have passed
for fidelity and fluency. Brief: docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md. This is its instrument
(RULE 4): every check exits non zero rather than warns; a failure is fixed in the draft unless the
check is wrong.

    python3 pipeline/book_queue/check_public_description.py ID [ID ...] [--english-only | --no-verdicts] [--quiet]

Reads entries/descriptions/<id>.md (the team version, the only source), and
entries/descriptions_public/<id>.md, <id>.ur.md and <id>.notes.md.

English (entries/descriptions_public/<id>.md):
  F1-F4, F6  the shape, exactly as check_description_draft.py checks it (verse paragraphs,
             "## " headings, balanced asterisks, no HTML/footnotes/tables, sections < 45,000)
  F5  "## Bibliography" present and the last heading
  P1  no inline citation "(Surname, *Title*, p. N)", no "p. N", no "folio"
  P2  no narration of a source: a surname the team version cites followed by writes / records /
      gives / 's account …, "according to <surname>", or the generic scaffolding ("the shrine's
      account", "the books", "the sources consulted")
  P3  no uncertainty, process or archive vocabulary ([OCR?], illegible, uncertain in print, the
      copy consulted, this archive, set out below, takeaways, chunk …)
  P4  no "## Where the Sources Disagree" (no heading containing "Disagree")
  P5  no em dash or en dash in the prose (Rauf's standing rule)
  L1  public prose / team prose between 0.40 and 0.85, or from 0.30 with a V1-backed "L1 exception" line
      in the notes (Rauf: "0.75 of the current ones", then,
      on the pilot: add back everything obviously important, not what authors say)
  Q1  every Arabic-script run of 3+ words occurs verbatim in the team version
  Q2  every English quotation of 6+ words occurs in the team version
  B1  the bibliography is the team version's, item for item, in order
Urdu (entries/descriptions_public/<id>.ur.md), skipped with --english-only:
  U1  the file exists and is not empty
  U2  no Latin letters anywhere (the file carries no bibliography; the site shows the English one)
  U3  no em or en dash
  U4  asterisks balanced
  U5  a blank line before every "## " heading
  U6  as many "## " headings as the English has before its bibliography
  U7  Urdu chars / English prose chars between 0.75 and 1.20 (urdu_content_qa.py's bounds)
  U8  every verse paragraph of the English occurs verbatim in the Urdu
  U9  Western digits only, and no figure the English prose does not have
Verdicts (entries/descriptions_public/<id>.notes.md), skipped with --english-only / --no-verdicts:
  V   the first lines carry "V1 English fidelity: PASS (round N) en:<md5>", "V2 Urdu fidelity: PASS
      (round N) en:<md5> ur:<md5>" and "V3 Urdu fluency: PASS (round N) ur:<md5>", written by
      `public_description_queue.py verdict`, and every stamp matches the CURRENT file (a verdict on a
      text that has since changed is stale and fails), and each round's report is saved in verify/
"""
from __future__ import annotations

import argparse
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))

import check_description_draft as cdd  # noqa: E402  (shape helpers, one definition of verse)
import urdu_content_qa as uq  # noqa: E402  (figure extraction, the Urdu ratio bounds)
import public_description_queue as pq  # noqa: E402  (verdict lines and their md5 stamps)

TEAM_DIR = os.path.join(REPO, "entries", "descriptions")
PUB_DIR = os.path.join(REPO, "entries", "descriptions_public")

RATIO_MIN, RATIO_MAX = 0.40, 0.85
# A row whose team version is mostly disagreement apparatus can fall below 0.40 with every important fact
# kept (bibi-pak-daman, 25 Oct: about two fifths of it is rival identities that rule 4 removes). Such a
# row may go down to EXC_MIN when its notes carry a line "L1 exception (V1 round N): <reason>", written
# only after a V1 report has swept the team version and found no important omission.
EXC_MIN = 0.30
EXC_LINE = re.compile(r"(?m)^L1 exception \(V1 round \d+\): \S")
# Below 0.30 only when a V1 sweep states in plain words that the honest length is under 0.30 and names
# no important omission (shrine-of-jalaluddin-surkh-posh-bukhari, 26 Oct: a saint with few facts, told
# book by book). The coordinator writes "L1 exception below 0.30 (V1 round N): <reason>"; floor EXC2_MIN.
EXC2_MIN = 0.25
EXC2_LINE = re.compile(r"(?m)^L1 exception below 0\.30 \(V1 round \d+\): \S")
UR_MIN, UR_MAX = uq.UNDER_COVERAGE, uq.OVER_COVERAGE
DASH = re.compile("[–—]")
EASTERN = re.compile("[۰-۹٠-٩]")

PAGE_REF = re.compile(r"\bpp?\. ?\d|\bfolios?\b", re.I)
VERBS = (
    r"writes?|wrote|records?|recorded|says|said|notes?|noted|relates?|related|gives?|gave|counts?|"
    r"calls?|called|places?|placed|lists?|listed|describes?|described|adds?|added|tells?|told|"
    r"mentions?|mentioned|reports?|reported|puts?|dates?|dated|names?|named|traces?|traced|"
    r"sets? out|knows?|knew|speaks?|spoke|agrees?|remarks?|remarked|locates?|located|devotes?|"
    r"heads?|headed|closes?|copies|copied|preserves?|preserved|repeats?|repeated|mentions?"
)
NOUNS = r"account|telling|notice|chapter|history|book|index|version|tazkira|text|edition|note|sentence|passage|list"
GENERIC = re.compile(
    r"the shrine's (?:own )?account|the account the shrine keeps|according to the shrine's account|"
    r"\bthe books\b|sources consulted|\bthese sources\b|\bthe sources do not\b|\bthe sources\b (?:differ|disagree|agree)",
    re.I,
)
VOCAB = re.compile(
    r"\[OCR\?\]|\billegible\b|uncertain (?:in )?(?:the )?print|\bprinted text\b|\bin print\b|copy consulted|"
    r"\bthis archive\b|\bthis entry\b|\bthe entry\b|set out below|gathered (?:below|under)|"
    r"\bthe notes\b|takeaways?|\bchunks?\b|Doubt [A-Z]{0,2}\d+|archive row|PDF page|Pass [12]\b|\bOCR\b|"
    r"uncertain reading|reading (?:is|was) uncertain|damaged (?:passage|line|copy|text)|partly damaged",
    re.I,
)


def prose_of(text: str) -> str:
    return text.split("\n## Bibliography")[0]


def cited_surnames(team: str) -> list:
    """Every 'Surname' that opens a citation in the team version: (Lahori, *Hadiqat …*, p. 185)."""
    out = set()
    for g in cdd.CITE_GROUP.finditer(team):
        for part in g.group(1).split(";"):
            head = part.strip().split(",")[0].strip()
            if head and "*" not in head and len(head) < 40:
                out.add(head)
    return sorted(out, key=len, reverse=True)


def shape_errors(text: str) -> list:
    errs, headings = [], []
    if "\r" in text:
        errs.append("F1 carriage return")
    for n, p in enumerate(cdd.paragraphs(text), 1):
        lines = p.split("\n")
        if p.lstrip().startswith("#"):
            if not re.match(r"^## \S", lines[0]) or lines[0].startswith("###"):
                errs.append("F2 paragraph %d: heading must be '## ': %r" % (n, lines[0][:60]))
            headings.append(lines[0][3:].strip())
            if len(lines) == 1:
                continue
            p, lines = "\n".join(lines[1:]), lines[1:]
        if p.startswith(">"):
            errs.append("F1 paragraph %d: no '> ' blocks in a Description (§9.369): %r" % (n, p[:80]))
        if len(lines) > 1 and not (cdd.is_verse(p) or cdd.is_list(p)):
            errs.append("F1 paragraph %d has a single newline and is neither verse nor a list: %r" % (n, p[:80]))
        if p.count("*") % 2:
            errs.append("F3 paragraph %d: unbalanced asterisks: %r" % (n, p[:80]))
        if re.search(r"</?[a-zA-Z][^>]*>|\[\^|^\s*\|.*\|\s*$", p, re.M):
            errs.append("F4 paragraph %d: HTML, footnote or table syntax" % n)
    for sec in re.split(r"(?m)^(?=## )", text):
        if len(sec) > cdd.SECTION_MAX:
            errs.append("F6 section %r is %d chars (max %d)" % (sec.split("\n")[0][:50], len(sec), cdd.SECTION_MAX))
    if not headings or headings[-1] != "Bibliography":
        errs.append("F5 '## Bibliography' missing or not the last heading (last: %r)" % (headings[-1] if headings else None))
    return errs


def ctx(text: str, m) -> str:
    return text[max(0, m.start() - 50):m.end() + 50].replace("\n", " ")


def check_english(id_: str, team: str, pub: str) -> list:
    errs = shape_errors(pub)
    body, tbody = prose_of(pub), prose_of(team)
    for m in cdd.CITE_GROUP.finditer(body):
        errs.append("P1 inline citation: %r" % m.group(0)[:100])
    for m in PAGE_REF.finditer(body):
        errs.append("P1 page or folio reference: %r" % ctx(body, m))
    names = cited_surnames(team)
    if names:
        alt = "|".join(re.escape(n) for n in names)
        pats = [
            re.compile(r"\b(?:%s)(?:'s)?\s+(?:%s)\b" % (alt, VERBS)),
            re.compile(r"\b(?:%s)'s\s+(?:\w+\s+){0,2}(?:%s)\b" % (alt, NOUNS)),
            re.compile(r"\baccording to (?:%s)\b" % alt),
            re.compile(r"\b(?:in|by) (?:%s)'s\b" % alt),
        ]
        for pat in pats:
            for m in pat.finditer(body):
                errs.append("P2 narrates a source: %r" % ctx(body, m))
    for m in GENERIC.finditer(body):
        errs.append("P2 source scaffolding: %r" % ctx(body, m))
    for m in VOCAB.finditer(body):
        errs.append("P3 uncertainty/process vocabulary: %r" % ctx(body, m))
    for h in re.findall(r"(?m)^## (.+)$", pub):
        if "disagree" in h.lower():
            errs.append("P4 heading %r: no side by side disagreements in the public version" % h)
    for m in DASH.finditer(body):
        errs.append("P5 em/en dash in prose (rephrase): %r" % ctx(body, m))
    ratio = len(body) / max(1, len(tbody))
    lo = RATIO_MIN
    notes_txt = read(os.path.join(PUB_DIR, id_ + ".notes.md")) or ""
    if EXC2_LINE.search(notes_txt):
        lo = EXC2_MIN
    elif EXC_LINE.search(notes_txt):
        lo = EXC_MIN
    if not lo <= ratio <= RATIO_MAX:
        errs.append("L1 length %.2f of the team version (%d vs %d chars); everything important kept, accepted %.2f to %.2f"
                    % (ratio, len(body), len(tbody), lo, RATIO_MAX))
    pool = cdd.norm(team)
    for seg in cdd.arabic_runs(body):
        if seg not in pool:
            errs.append("Q1 Arabic-script run not in the team version: %r" % seg[:120])
    for m in re.finditer(r'"([^"]*)"', cdd.norm(body)):
        q = m.group(1).strip(" ,.;:")
        if len(q.split()) >= 6 and cdd.LATIN.search(q) and not cdd.ARABIC.search(q) and q not in pool:
            errs.append("Q2 English quotation not in the team version: %r" % q[:120])
    if cdd.bib_items(pub) != cdd.bib_items(team):
        tb, pb = cdd.bib_items(team), cdd.bib_items(pub)
        missing = [i for i in tb if i not in pb]
        extra = [i for i in pb if i not in tb]
        errs.append("B1 bibliography differs from the team version (missing %d, extra %d%s)"
                    % (len(missing), len(extra), ", order differs" if not missing and not extra else ""))
    return errs


def check_urdu(id_: str, pub: str, ur: str) -> list:
    errs = []
    if not ur.strip():
        return ["U1 no Urdu file at entries/descriptions_public/%s.ur.md (or it is empty)" % id_]
    if "\r" in ur:
        errs.append("U5 carriage return in the Urdu file")
    lat = sorted(set(re.findall(r"[A-Za-z]+", ur)))
    if lat:
        errs.append("U2 Latin letters in the Urdu file: %s" % ", ".join(lat[:8]))
    for m in DASH.finditer(ur):
        errs.append("U3 em/en dash in the Urdu: %r" % ur[max(0, m.start() - 30):m.end() + 30].replace("\n", " "))
    if ur.count("*") % 2:
        errs.append("U4 unbalanced asterisks (%d)" % ur.count("*"))
    lines = ur.split("\n")
    for i, line in enumerate(lines):
        if line.startswith("## ") and i > 0 and lines[i - 1].strip():
            errs.append("U5 line %d: heading %r has no blank line before it" % (i + 1, line[:30]))
    en_body = prose_of(pub)
    en_h = len(re.findall(r"(?m)^## ", en_body))
    ur_h = len(re.findall(r"(?m)^## ", ur))
    if en_h != ur_h:
        errs.append("U6 the English has %d headings before its bibliography, the Urdu %d" % (en_h, ur_h))
    ratio = len(ur.strip()) / max(1, len(en_body.strip()))
    if not UR_MIN <= ratio <= UR_MAX:
        errs.append("U7 Urdu/English prose ratio %.2f (%d vs %d chars), allowed %.2f to %.2f"
                    % (ratio, len(ur.strip()), len(en_body.strip()), UR_MIN, UR_MAX))
    ur_paras = [p.strip() for p in cdd.paragraphs(ur)]
    for p in cdd.paragraphs(en_body):
        if cdd.is_verse(p) and p.strip() not in ur_paras:
            errs.append("U8 verse paragraph not copied verbatim into the Urdu: %r" % p.strip()[:80])
    if EASTERN.search(ur):
        errs.append("U9 Eastern digits in the Urdu; store Western digits (the site converts)")
    extra = sorted(uq._figures(ur) - uq._english_figures(en_body), key=lambda v: (len(v), v))
    if extra:
        errs.append("U9 figure(s) in the Urdu that the English lacks: %s" % ", ".join(extra[:8]))
    return errs


def check_verdicts(id_: str, notes: str) -> list:
    errs = []
    cur, vs = pq.current(id_), pq.verdicts(id_)
    for v, label in pq.LABELS.items():
        st, rnd, stamps = vs[v]
        if st != "PASS":
            errs.append("V %s is %s%s (notes file, first lines)" % (label, st, " (round %d)" % rnd if rnd else ""))
        elif not pq.fresh(v, stamps, cur):
            errs.append("V %s PASS (round %d) is STALE: the file it read has changed since; run %s again" % (label, rnd, v))
        elif not os.path.exists(os.path.join(pq.VERIFY_DIR, "%s.%s.r%d.txt" % (id_, v, rnd))):
            errs.append("V %s PASS (round %d) has no saved report at verify/%s.%s.r%d.txt" % (label, rnd, id_, v, rnd))
    return errs


def read(path: str) -> str:
    return open(path, encoding="utf-8").read().strip("\n") if os.path.exists(path) else ""


def check(id_: str, english_only: bool = False, quiet: bool = False, verdicts: bool = True) -> list:
    team = read(os.path.join(TEAM_DIR, id_ + ".md"))
    pub = read(os.path.join(PUB_DIR, id_ + ".md"))
    if not team:
        return ["no team version at entries/descriptions/%s.md" % id_]
    if not pub:
        return ["no public version at entries/descriptions_public/%s.md" % id_]
    errs = check_english(id_, team, pub)
    if not english_only:
        errs += check_urdu(id_, pub, read(os.path.join(PUB_DIR, id_ + ".ur.md")))
        if verdicts:
            errs += check_verdicts(id_, read(os.path.join(PUB_DIR, id_ + ".notes.md")))
    if not quiet:
        tb, pb = len(prose_of(team)), len(prose_of(pub))
        ur = read(os.path.join(PUB_DIR, id_ + ".ur.md"))
        print("%s  %s  team %d -> public %d chars (%.2f)%s"
              % ("FAIL" if errs else "ok  ", id_, tb, pb, pb / max(1, tb),
                 "" if english_only else ", Urdu %d chars (%.2f)" % (len(ur), len(ur) / max(1, pb))))
    return errs


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("ids", nargs="+")
    ap.add_argument("--english-only", action="store_true", help="skip the Urdu file and the verdict lines")
    ap.add_argument("--no-verdicts", action="store_true", help="check English and Urdu, not yet the verdict lines")
    ap.add_argument("--quiet", action="store_true")
    a = ap.parse_args()
    bad = 0
    for i in a.ids:
        errs = check(i, a.english_only, a.quiet, not a.no_verdicts)
        for e in errs:
            print("   " + e)
        bad += bool(errs)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
