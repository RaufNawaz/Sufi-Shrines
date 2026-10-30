#!/usr/bin/env python3
"""check_place_description.py: the instrument (RULE 4) for the place and province articles.

Brief: docs/prompts/PLACE_DESCRIPTION_BRIEF.md (Rauf, 30 October 2026). Three files per place,
exactly as for the shrines, and the same checks, re-pointed:

    team    entries/places/<slug>.md          against entries/places/sources/<slug>.sources.md
    public  entries/places_public/<slug>.md   against the team version
    urdu    entries/places_public/<slug>.ur.md against the public English
    notes   entries/places_public/<slug>.notes.md (V1, V2, V3 verdict stamps)

    python3 pipeline/book_queue/check_place_description.py team   SLUG [SLUG ...]
    python3 pipeline/book_queue/check_place_description.py public SLUG [SLUG ...] [--english-only | --no-verdicts]
    python3 pipeline/book_queue/check_place_description.py short  SLUG [SLUG ...] [--english-only | --no-verdicts]

`team` runs check_description_draft.py's checks with the place's source file standing in for
the shrine entry and no current Description (a place has never had one): the shape (F1 to F6),
no process vocabulary (P1), every citation's title a `## From` heading of the source file and its
page reference found in that book's section (C1), every Arabic-script run of three or more words
and every English quotation of six or more words verbatim in the sources (Q1, Q2, Q3), and every
cited book in the bibliography (B2).

`public` is check_public_description.py with its directories swapped: P1 to P5, L1, Q1, Q2, B1, the
Urdu checks U1 to U9 and the verdict stamps.

`short` checks the SHORT public article (Rauf, 30 October 2026: "an article that is short and complete
but then switch to the longer one if you want or toggle which sections you need more information
for"): `entries/places_public/<slug>.short.md` and `.short.ur.md`, verdicts in `.short.notes.md`,
reports in `verify/<slug>.short.<V>.r<N>.txt`. Its only source is the LONG public article
(`<slug>.md`), itself verified against the team version, so the short one cannot carry a fact the
long one lacks. The public checks run with the long article standing in for the team version, and:

  S1  the short English has exactly the long English's `## ` headings, in the same order, so the
      site can swap any one section for its long text
  S2  every section has prose, and no short section is longer than its long section
  S3  every verse paragraph of the short occurs verbatim in the long
  S4  the bibliography is the long article's, item for item
  S5  the short Urdu has exactly the long Urdu's `## ` headings, in the same order
  SL  length scaled by place, in words (Rauf, 30 October 2026: "scale by place", then "Lahore
      should be around 8000 words"): the target is SHORT_K x sqrt(long prose words), accepted
      SHORT_LO to SHORT_HI of the target. SHORT_K is set so that Lahore's 33,267 words give about
      8,000. A place whose long prose is under SHORT_MIN_LONG words needs no short article: the
      long one is short already (at that size the target would be over 0.6 of it).
"""
from __future__ import annotations

import argparse
import math
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(os.path.dirname(HERE))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.dirname(HERE))

import check_description_draft as cdd  # noqa: E402
import check_public_description as cpd  # noqa: E402
import public_description_queue as pq  # noqa: E402

TEAM_DIR = os.path.join(REPO, "entries", "places")
SOURCE_DIR = os.path.join(TEAM_DIR, "sources")
PUB_DIR = os.path.join(REPO, "entries", "places_public")


SHORT = ".short"
SHORT_K = 44
SHORT_LO, SHORT_HI = 0.85, 1.15
SHORT_MIN_LONG = 5000


def words(text: str) -> int:
    return len(cpd.prose_of(text).split())


def short_target(long_prose_words: int) -> int:
    return int(round(SHORT_K * math.sqrt(long_prose_words)))


def long_prose_words(slug: str) -> int:
    return words(cpd.read(os.path.join(PUB_DIR, slug + ".md")))


def needs_short(slug: str) -> bool:
    """A short article is written only where the long one is long (SL)."""
    return long_prose_words(slug) >= SHORT_MIN_LONG


def headings(text: str) -> list:
    return [h.strip() for h in re.findall(r"(?m)^## (.+)$", cpd.prose_of(text))]


def sections(text: str) -> list:
    """[(heading, body)] of the prose before the bibliography."""
    out = []
    for sec in re.split(r"(?m)^(?=## )", cpd.prose_of(text)):
        if sec.startswith("## "):
            head, _, body = sec.partition("\n")
            out.append((head[3:].strip(), body.strip()))
    return out


def check_short(slug: str, english_only: bool = False, quiet: bool = False, verdicts: bool = True) -> list:
    use_place_dirs()
    sid = slug + SHORT
    long_en = cpd.read(os.path.join(PUB_DIR, slug + ".md"))
    short_en = cpd.read(os.path.join(PUB_DIR, sid + ".md"))
    if not long_en:
        return ["no long public article at entries/places_public/%s.md" % slug]
    if not short_en:
        return ["no short public article at entries/places_public/%s.md" % sid]
    lp, sp = words(long_en), words(short_en)
    target = short_target(lp)
    # The public checks, with the long article as the source; L1 and B1 are replaced by SL and S4.
    errs = [e for e in cpd.check_english(sid, long_en, short_en) if not e.startswith(("L1 ", "B1 "))]
    if not SHORT_LO * target <= sp <= SHORT_HI * target:
        errs.append("SL short prose %d words; target %d for a long article of %d words (accepted %d to %d)"
                    % (sp, target, lp, SHORT_LO * target, SHORT_HI * target))
    if headings(short_en) != headings(long_en):
        errs.append("S1 headings differ from the long article's: short %r, long %r" % (headings(short_en), headings(long_en)))
    else:
        for (h, sb), (_, lb) in zip(sections(short_en), sections(long_en)):
            if not sb:
                errs.append("S2 section %r is empty" % h)
            elif len(sb) > len(lb):
                errs.append("S2 section %r is longer in the short article (%d) than in the long (%d)" % (h, len(sb), len(lb)))
    long_paras = {p.strip() for p in cdd.paragraphs(long_en)}
    for p in cdd.paragraphs(cpd.prose_of(short_en)):
        if cdd.is_verse(p) and p.strip() not in long_paras:
            errs.append("S3 verse paragraph not in the long article: %r" % p.strip()[:80])
    if cdd.bib_items(short_en) != cdd.bib_items(long_en):
        errs.append("S4 bibliography differs from the long article's")
    if not english_only:
        short_ur = cpd.read(os.path.join(PUB_DIR, sid + ".ur.md"))
        long_ur = cpd.read(os.path.join(PUB_DIR, slug + ".ur.md"))
        errs += cpd.check_urdu(sid, short_en, short_ur)
        if short_ur and headings(short_ur) != headings(long_ur):
            errs.append("S5 Urdu headings differ from the long Urdu's: short %r, long %r" % (headings(short_ur), headings(long_ur)))
        if verdicts:
            errs += cpd.check_verdicts(sid, cpd.read(os.path.join(PUB_DIR, sid + ".notes.md")))
    if not quiet:
        ur = cpd.read(os.path.join(PUB_DIR, sid + ".ur.md"))
        sc = len(cpd.prose_of(short_en))
        print("%s  %s  long %d -> short %d words (target %d, %.2f)%s"
              % ("FAIL" if errs else "ok  ", sid, lp, sp, target, sp / max(1, target),
                 "" if english_only else ", Urdu %d chars (%.2f of the English characters)" % (len(ur), len(ur) / max(1, sc))))
    return errs


def use_place_dirs() -> None:
    """Point the shrine checker and queue at the place folders (module globals, read at call time)."""
    cpd.TEAM_DIR = TEAM_DIR
    cpd.PUB_DIR = PUB_DIR
    pq.TEAM_DIR = TEAM_DIR
    pq.PUB_DIR = PUB_DIR
    pq.VERIFY_DIR = os.path.join(PUB_DIR, "verify")


def check_team(slug: str, quiet: bool = False, draft_dir: str = "") -> list:
    """check_description_draft.check, with the sources file as the entry and no current text."""
    src = os.path.join(SOURCE_DIR, slug + ".sources.md")
    if not os.path.exists(src):
        return ["no source file at %s: run build_place_sources.py" % os.path.relpath(src, REPO)]
    return cdd.check(slug, {slug: {"Description": ""}}, quiet, draft_dir=draft_dir or TEAM_DIR, entry_path=src)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("mode", choices=["team", "public", "short"])
    ap.add_argument("slugs", nargs="+")
    ap.add_argument("--english-only", action="store_true")
    ap.add_argument("--no-verdicts", action="store_true")
    ap.add_argument("--quiet", action="store_true")
    ap.add_argument("--draft-dir", default="", help="team mode: read <slug>.md from here (a section drafter's part)")
    a = ap.parse_args()
    use_place_dirs()
    bad = 0
    for slug in a.slugs:
        if a.mode == "team":
            errs = check_team(slug, a.quiet, a.draft_dir)
        elif a.mode == "short":
            errs = check_short(slug, a.english_only, a.quiet, not a.no_verdicts)
        else:
            errs = cpd.check(slug, english_only=a.english_only, quiet=a.quiet, verdicts=not a.no_verdicts)
        for e in errs:
            print("   " + e)
        bad += bool(errs)
    return 1 if bad else 0


if __name__ == "__main__":
    sys.exit(main())
