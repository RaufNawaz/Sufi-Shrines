#!/usr/bin/env python3
"""
build_survey_orphan_patch.py — fold the three unmerged field-survey responses into
the production rows, and write both a 3-row patch and a full-sheet import CSV.

## What this is for

The Shrine Information Form (Responses) sheet holds 28 submissions, 11 of them marked
`Delete`, leaving 19 live responses covering 19 shrines. Sixteen of those nineteen carry a
`Shrines Project field survey` line in their production Bibliography and are
`Field-verified` / `Full`. Three do not:

    Shrine of Shah Jamal          (response 14 July 2026)
    Shrine of Peer Makki          (response 23 July 2026)
    Shrine of Mauj Darya Bukhari  (response 29 July 2026)

`docs/responses_sync_2026-08-26.md` recorded these three as "never received their survey
enrichment". **That is half wrong, and the half matters.** Reading the three production
Descriptions against the three responses shows most of the survey's content *is* already in
production, rewritten editorially: Shah Jamal's Damdama and the princess legend, Peer Makki's
Ghori prophecy, Mauj Darya's cook in the cauldron, and all three shrines' visitor counts are
there almost fact for fact. What is missing is the **citation and the provenance level** —
three entries publishing survey-derived content with no attribution, at `Source-seeded` /
`Moderate`, while the sixteen beside them say where the same kind of content came from.

Two instruments agree on exactly which three rows those are: the absence of a survey line in
the Bibliography, and `support_level != Field-verified`. A third — verbatim n-gram overlap
between response and Description — reported ~0 % coverage for *every* one of the nineteen,
including the sixteen known to be merged, and was discarded. It measures whether the prose was
copied, and this archive never copies its prose.

## What it changes

Per row: targeted insertions into `Description` (each at an anchor asserted to occur exactly
once), the survey citation appended to the Bibliography, `support_level` -> `Field-verified`,
`info_level` -> `Full`, and a `qa_note` recording what the survey and the entry disagree about.
Nothing already in an entry is deleted or reworded; a contradiction between the survey and the
entry is written down as a contradiction (RULE 2), not resolved.

Peer Makki gets more than the other two: its survey biography is 9,627 characters and carries a
narrative the entry never had — the command received in the Haram, the journey, and the two
six-year respites given to Khusrau Malik — so it gains a titled section in the house style of
`ghazi-ilm-din-shaheed` ("as the Survey Narrates It").

## The write-time invariants (RULE 4)

Every one of these is a way this project has already lost data:

1. **Each anchor occurs exactly once** in its target Description. A silent zero-match would
   drop an insertion; a two-match would corrupt the wrong sentence.
2. **Only the three named rows change**; every other row is asserted byte-identical, cell for
   cell, against the input.
3. **Asterisks stay balanced.** Unbalanced `*` turns the rest of an article into italics.
4. **Newlines survive.** No changed Description may end with fewer newlines than it started
   with — the TSV-flattening failure that destroyed markdown structure once already.
5. **The citation appears exactly once** per changed row, and the row ends with it.
6. **No new soft-wrapped newlines.** A paragraph in this corpus is one long line; a newline
   inside one is either an Urdu couplet or an artefact. `darbar-hazrat-shah-gohar-peer` carries
   50 of them from the day its entry was drafted at a 90-column wrap, and is the only prose row
   that does — the same drafting pass that truncated its `site_type` mid-phrase. A section
   written as a wrapped Python string would silently reproduce that, so the wrapping is undone
   before the text is inserted and the count is asserted not to have risen.
7. **Read-back.** The written CSV is parsed again and the three Descriptions compared
   byte-for-byte with what was intended, at 44 columns and 171 data rows.

Any failure exits non-zero and writes nothing.

    python3 pipeline/build_survey_orphan_patch.py [live_sheet.csv]

Default input `data/live_sheet_2026-09-05.csv`; outputs `data/import_2026-09-05.csv`
(full sheet, for Replace current sheet) and `data/patch_field_survey_orphans_2026-09-05.csv`
(three rows, changed columns only).
"""

import csv
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
REPO = os.path.dirname(HERE)

DEFAULT_IN = os.path.join(REPO, "data", "live_sheet_2026-09-05.csv")
FULL_OUT = os.path.join(REPO, "data", "import_2026-09-05.csv")
PATCH_OUT = os.path.join(REPO, "data", "patch_field_survey_orphans_2026-09-05.csv")

PATCH_COLS = [
    "Name",
    "id",
    "Description",
    "qa_note",
    "info_level",
    "support_level",
    "silsila",
    "year_built",
    "year_built_precision",
    "year_built_note",
]

# Columns each row is allowed to change. Anything else moving is a bug, and the
# script exits rather than writing it (invariant 2b).
CHANGED_COLS = {
    "shah-jamal": {
        "Description", "qa_note", "info_level", "support_level",
        "year_built", "year_built_precision", "year_built_note",
    },
    "peer-makki": {
        "Description", "qa_note", "info_level", "support_level", "silsila",
        "year_built", "year_built_precision", "year_built_note",
    },
    "shrine-of-mauj-darya-bukhari": {
        "Description", "qa_note", "info_level", "support_level",
    },
}

# ── The date columns, per Rauf's ruling of 5 September 2026 ──────────────────
#
# All three surveys answer "in which year was this place built" with the saint's
# **death** year. Asked whether to fill `year_built` anyway, the ruling was: fill
# it, with the qualification carried in `year_built_precision`.
#
# The shape below is not invented for this patch — it is what four rows in the
# sheet already do with the same problem (`darbar-malik-ahmad-ayaz`,
# `darbar-abul-muali-qadri`, `darbar-mian-qurban-ali-shah`, `bibi-pak-daman`):
# the value carries its own qualification inline, `year_built_precision` holds a
# sentence rather than a vocabulary term, and `year_built_note` explains. Mauj
# Darya already carries 1604 and is left alone.
#
# `year_built_note` on these rows currently holds a *built-form* sentence rather
# than a date one — a mixed use of the column across the sheet. The date
# explanation is prepended and the existing sentence kept, so nothing is lost.
DATES = {
    "shah-jamal": {
        "year_built": '1671 (as given: "English Calendar Date : 1671"; '
        "the saint's death year, not a construction date)",
        "year_built_precision": "Uncertain — date derived from the figure's death date",
        "year_built_note": 'The survey\'s founding-year answer, "English Calendar Date : 1671", '
        "is the year this entry already records as the saint's death, on 4 Rabi-ul-Sani; his "
        "grave was raised over the collapsed chilla cell inside the Damdama he had built in his "
        "own lifetime, so the answer dates the tomb rather than the structure, and 1649 also "
        "appears in the sources. Tomb enclosed within a modern single-domed mosque.",
    },
    "peer-makki": {
        # NB: the Hijri figure is named in words here and given as a numeral only in
        # the note, deliberately. `firstGregorianYear` in src/lib/data/places.ts
        # **skips any date cell containing "AH"** — Hijri is not comparable without
        # conversion — so "1215 CE / 612 AH ..." would have contributed nothing to
        # this shrine's place span, while "1215 CE ..." contributes 1215.
        #
        # (An earlier draft of this comment blamed `parseEra`, which collects every
        # 3-4 digit run in a string and would indeed have read 612 as a 7th-century
        # year. It never sees this column: `shrineFilters.ts` calls it on `founded`,
        # the legacy `Founded/Opened` cell, which this patch does not touch. The
        # hazard was real in the wrong file.)
        "year_built": "1215 CE (as given in the form as a Hijri year; "
        "the saint's death year, not a construction date)",
        "year_built_precision": "Uncertain — date derived from the figure's death date",
        "year_built_note": 'The survey\'s founding-year answer, "612 Hijri", is the year this '
        "entry already records as the saint's death (612 AH / 1215 CE). The survey itself says "
        "he settled in a mosque that was already standing and that the shrine was built after he "
        "was buried there, so the answer dates neither. Shrine complex includes the Hazrat Pir "
        "Makki Masjid.",
    },
}

# Peer Makki's `silsila` cell, per the same ruling: Junaidi, bracketed with the
# survey's own sect answer. Both halves are sourced — "Junaidi" is this entry's
# own prose ("the esoteric path of the Junaidi Sufi lineage, tracing back to the
# classical Baghdad master Junayd"), "Ahl e Sunnat" is the survey's answer to the
# sect question. Prose in this column is established: eight rows carry a
# qualifying clause, one of them in exactly this bracketed form.
#
# Recorded because it reverses an earlier reading, not because it is wrong to:
# `data/kg-order-proposals.json` declined to give this figure an order at all —
# "The row states the affiliation it does have as 'its tradition is Syed and
# Ahl-e-Sunnat' — a sect and a descent claim, not a silsila" — and declined a
# "Junaidiya" order node proposed from Bibi Pak Daman's prose. Neither is
# contradicted by naming the lineage the entry's own prose already names; the KG
# has no Junaidi order to join, so this cell adds a recorded affiliation, not an
# order edge.
PEER_MAKKI_SILSILA = "Junaidi (Ahl-e-Sunnat)"

CITATION = {
    "shah-jamal": "- Shrines Project field survey, Darbar Shah Jamal responses "
    "(surveyor: Saifullah), 2026.",
    "peer-makki": "- Shrines Project field survey, Darbar Sufi Aziz-ud-Din Peer Makki Sarkar "
    "responses (surveyor: Saifullah), 2026.",
    "shrine-of-mauj-darya-bukhari": "- Shrines Project field survey, Darbar Meera Mauj Darya "
    "Bukhari responses (surveyor: Saifullah), 2026.",
}

# ── Shah Jamal ───────────────────────────────────────────────────────────────
SJ_FAMILY = (
    " The 2026 field survey names his father as Syed Ahmad Shah — the name this archive's "
    "entry for his brother, Baba Shah Kamal, gives independently — and adds that the family "
    "moved from Kashmir to Sialkot and from Sialkot to Lahore, where both brothers were born "
    "and where both are counted among the saints. It also accounts for his coming to Ichhra: "
    "he arrived to see Shah Kamal, whose shrine still stands close to his own, and pitched his "
    "camp a short distance from his brother's house."
)

SJ_SAKHI = (
    " Devotees, the survey records, know him for his open-handedness as *Sakhi Sarwar* — a "
    "title that in the Punjab more usually belongs to Sultan Sakhi Sarwar of Dera Ghazi Khan, "
    "whose shrine this archive also holds; it is set down here as the survey gave it, and not "
    "as an identification of the two."
)

SJ_FAKHR = (
    " The survey adds that Sheikh Fakhr-ud-Din stayed in the saint's service all his life and "
    "that his grave lies inside the shrine."
)

SJ_CUSTODY = (
    "since 1960; before that, the survey relates, its upkeep and adornment fell first to Shah "
    "Jamal himself, who oversaw the building in his own lifetime, and afterwards to the kings, "
    "maharajas and devotees who came after him. The current sajjada nashin"
)

# ── Peer Makki ───────────────────────────────────────────────────────────────
PM_AUQAF = (
    "Religious Affairs Department, which the field survey says took charge of the shrine in "
    "1958; its tradition is Syed and Ahl-e-Sunnat."
)

PM_SECTION = """## The Life, as the Survey Narrates It

The 2026 field survey gives a fuller life than this entry has carried, and it is set out here in
the account's own terms.

His father, Hazrat Peer Syed Abdullah, was himself a saint and a scholar who taught in Baghdad,
and Peer Makki had his first education from him — memorising the Qur'an, then learning what the
survey calls the knowledge of the soul and of the sect, seated in the same row as everyone else
in his father's circle. Having taken the outward sciences as far as they went, he judged that he
must go looking for the hidden knowledge, and in 562 AH, at thirty, he left Baghdad for Mecca. He
spent twelve years there, hearing the pleas of those who came to him, helping them, keeping his
nights in the Haram in the remembrance of God, and — the account says — receiving the blessing of
the Prophet many times. He began to know what was to come, and did not show it.

The migration to India, in this telling, was not his own idea. Worshipping in the Haram, he
received the Prophet's command to go to Hind, where the people had fallen into associating
partners with God, and to bring them back to the Sunna and to the oneness of God. He did not wish
to leave the House of God, but the command was the command: he made his last Hajj, took some
companions with him, and turned first to Baghdad, to tell his family and to say the Fatiha at his
father's grave, before setting out. Two roads led to India, one through the dry desert and one by
sea; the journey was long and dangerous and there was little to eat or drink, but he preached
along the way, and people were moved enough to join his caravan. Something close to a year later
he reached India and gave thanks. He came to Lahore in 575 AH and settled in the mosque that
today carries his name beside his shrine, leading the prayers, teaching the Qur'an, and calling
people away from polytheism.

The survey then narrates the political part of his life at length. Lahore was held by Khusrau
Malik — whom the account calls the last of Mahmud of Ghazni's line, and the son of King Khusrau —
and describes as pleasure-seeking and unjust; Muhammad Shahab-ud-Din Ghori was advancing on the
city, having already taken Multan and Sialkot. When Khusrau Malik came to ask how long his rule
would last, the saint told him plainly that it would end soon, that what God has written must
come, and that he should turn to God and deal justly with his people. When Ghori's army arrived,
the people and the king both ran to him; he told them to be patient and to repent, and said the
danger would pass and return in six years. Ghori withdrew, and the saint's name went round the
city — but the people soon returned to their old habits, and exactly six years later Ghori came
again. Again the saint promised a respite, and said it was the last; again the army turned back,
and this time people called him a liar, saying the old man only ever said such things and that
Ghori left out of fear. When Ghori finally took Lahore, Khusrau Malik's men were killed or went
over to him, and the king himself was taken prisoner and later killed. Ghori, the account says,
came to the saint's door and told him he had known he was there, and that everything he had said
had been true.

He preached in Lahore for thirty-six years after that, and died in 612 AH; the quarter took his
name from him, as the title Makki had come from his years in Mecca. Kings maintained the shrine
after him and added to its beauty, and the survey states that the Auqaf Department took
responsibility for it in 1958."""

# ── Mauj Darya Bukhari ───────────────────────────────────────────────────────
MD_EPITHET = (
    "away from Lahore. The 2026 field survey derives the same title differently: he was called "
    "Mouj Darya, it says, for his open-handed generosity and for the state of spiritual ecstasy "
    "(*mouj*) in which his prayers were held to be answered at once. Both derivations stand here "
    "as they were given. He is remembered"
)

MD_BOOKS = (
    " The survey adds that books about him written by Muslim, Hindu and Sikh authors alike are "
    "widely read."
)

MD_CUSTODY = (
    "and continues to draw a devoted following. Its upkeep, the survey relates, ran down a long "
    "line before that — from the emperor Akbar through the rulers who followed him and Maharaja "
    "Ranjit Singh, and through the saint's own descendants — before the department took it on."
)

QA_NOTES = {
    "shah-jamal": (
        "Field-survey response of 14 July 2026 folded in on 5 September 2026; the entry already "
        "carried most of its content unattributed. Two accounts of the family now stand side by "
        "side and are not reconciled here: this entry's Hussaini Syed descent from Jalaluddin "
        "Surkh-Posh Bukhari, and the survey's migration from Kashmir to Sialkot to Lahore under "
        "the father Syed Ahmad Shah. year_built now carries the survey's founding-year answer, "
        "1671, which is the saint's death year — filled per a ruling of 5 September 2026 with "
        "the qualification in year_built_precision, following four rows in the sheet that "
        "already answer this problem that way. The survey's epithet Sakhi Sarwar is also the "
        "name of a separate saint and shrine in this archive (sakhi-sarwar)."
    ),
    "peer-makki": (
        "Field-survey response of 23 July 2026 folded in on 5 September 2026; the survey's "
        "biography is the longest in the response set and most of it was not in this entry. The "
        "survey dates the Auqaf Department's charge of the shrine to 1958; the Shah Jamal entry "
        "gives 1960 for the same department taking charge there, and neither date is "
        "independently checked here. year_built now carries the survey's founding-year answer, "
        "612 AH / 1215 CE, which is the saint's death year — filled per a ruling of 5 September "
        "2026 with the qualification in year_built_precision. silsila, empty until now, reads "
        "Junaidi (Ahl-e-Sunnat) per the same ruling: Junaidi from this entry's own prose, "
        "Ahl-e-Sunnat as the survey's sect answer. data/kg-order-proposals.json had declined to "
        "give this figure an order at all; the archive holds no Junaidi order, so this records "
        "an affiliation rather than joining one."
    ),
    "shrine-of-mauj-darya-bukhari": (
        "Field-survey response of 29 July 2026 folded in on 5 September 2026; the entry already "
        "carried most of its content unattributed. Two derivations of the title Mouj Darya now "
        "stand side by side and are not reconciled here: the diversion of the Ravi, and the "
        "survey's generosity and state of ecstasy. The ten photographs the survey recorded no "
        "longer exist: every Drive file id returns not-found to an authenticated read (checked "
        "5 September 2026, and already typed id_not_in_drive in pipeline/photo_manifest.tsv). "
        "This row publishes one Wikimedia image and the shrine needs re-shooting."
    ),
}


def fail(msg):
    sys.stderr.write("FAIL: %s\n" % msg)
    sys.exit(1)


def unwrap(text):
    """Undo the source-file line wrapping: a paragraph in this corpus is one long line."""
    out = []
    for para in text.split("\n\n"):
        lines = para.split("\n")
        joined = []
        for line in lines:
            if line.lstrip().startswith(("#", "-", "*", "|", ">")) or not joined:
                joined.append(line)
            else:
                joined[-1] = joined[-1].rstrip() + " " + line.lstrip()
        out.append("\n".join(joined))
    return "\n\n".join(out)


def soft_wraps(text):
    """Newlines sitting inside a paragraph — verse aside, these are wrapping artefacts."""
    n = 0
    lines = text.split("\n")
    for cur, nxt in zip(lines, lines[1:]):
        if not cur.strip() or not nxt.strip():
            continue
        if cur.lstrip().startswith(("#", "-", "*", "|", ">")):
            continue
        if nxt.lstrip().startswith(("#", "-", "*", "|", ">")):
            continue
        n += 1
    return n


def replace_once(text, anchor, replacement, where):
    n = text.count(anchor)
    if n != 1:
        fail("anchor occurs %d times (expected 1) in %s: %r" % (n, where, anchor))
    return text.replace(anchor, replacement)


def insert_after(text, anchor, addition, where):
    return replace_once(text, anchor, anchor + addition, where)


def build_shah_jamal(d):
    w = "shah-jamal"
    d = insert_after(d, "Bukhari of Uch Sharif.", SJ_FAMILY, w)
    d = insert_after(d, "orthodox Islamic practice.", SJ_SAKHI, w)
    d = insert_after(d, "moments before their roof collapsed.", SJ_FAKHR, w)
    d = replace_once(d, "since 1960, while the current sajjada nashin", SJ_CUSTODY, w)
    return d


def build_peer_makki(d):
    w = "peer-makki"
    d = replace_once(
        d, "Religious Affairs Department; its tradition is Syed and Ahl-e-Sunnat.", PM_AUQAF, w
    )
    d = replace_once(d, "## Bibliography", unwrap(PM_SECTION) + "\n\n## Bibliography", w)
    return d


def build_mauj_darya(d):
    w = "shrine-of-mauj-darya-bukhari"
    d = replace_once(d, "away from Lahore; he is remembered", MD_EPITHET, w)
    d = insert_after(d, "has continued under his descendants to this day.", MD_BOOKS, w)
    d = replace_once(d, "and continues to draw a devoted following.", MD_CUSTODY, w)
    return d


BUILDERS = {
    "shah-jamal": build_shah_jamal,
    "peer-makki": build_peer_makki,
    "shrine-of-mauj-darya-bukhari": build_mauj_darya,
}


def main():
    src = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_IN
    if not os.path.exists(src):
        fail("input sheet not found: %s" % src)

    with open(src, encoding="utf-8", newline="") as f:
        rows = list(csv.DictReader(f))
        fieldnames = list(rows[0].keys()) if rows else []

    if len(fieldnames) != 44:
        fail("expected 44 columns, found %d" % len(fieldnames))

    by_id = {}
    for r in rows:
        by_id.setdefault(r["id"], []).append(r)
    for sid in BUILDERS:
        if len(by_id.get(sid, [])) != 1:
            fail("id %r appears %d times in the sheet" % (sid, len(by_id.get(sid, []))))

    originals = {sid: dict(by_id[sid][0]) for sid in BUILDERS}
    changed = []

    for sid, build in BUILDERS.items():
        row = by_id[sid][0]
        before = row["Description"]
        after = build(before)

        cit = CITATION[sid]
        if cit in after:
            fail("%s already carries its survey citation" % sid)
        after = after.rstrip() + "\n" + cit

        # Invariant 3 — asterisks balanced.
        if after.count("*") % 2 != 0:
            fail("%s: unbalanced asterisks (%d) after edit" % (sid, after.count("*")))
        # Invariant 4 — newlines survive.
        if after.count("\n") < before.count("\n"):
            fail("%s: newline count fell from %d to %d" % (sid, before.count("\n"), after.count("\n")))
        # Invariant 5 — the citation appears exactly once, at the end.
        if after.count(cit) != 1 or not after.endswith(cit):
            fail("%s: citation is not the single final line" % sid)
        if "## Bibliography" not in after:
            fail("%s: no bibliography heading to cite into" % sid)
        # Invariant 6 — no new soft-wrapped newlines.
        if soft_wraps(after) > soft_wraps(before):
            fail(
                "%s: soft-wrapped newlines rose from %d to %d"
                % (sid, soft_wraps(before), soft_wraps(after))
            )
        if len(after) <= len(before):
            fail("%s: edit did not lengthen the description" % sid)

        row["Description"] = after
        row["qa_note"] = QA_NOTES[sid]
        row["info_level"] = "Full"
        row["support_level"] = "Field-verified"

        for col, value in DATES.get(sid, {}).items():
            if col == "year_built" and originals[sid][col].strip():
                fail("%s: year_built is not empty (%r) — refusing to overwrite"
                     % (sid, originals[sid][col]))
            # `year_built_note` is rewritten rather than replaced: the sentence the
            # sheet already holds must survive inside the new one, or the sheet has
            # been edited since this text was written and the edit would be lost.
            if col == "year_built_note":
                kept = originals[sid][col].strip().rstrip(".")
                if kept and kept not in value:
                    fail("%s: the existing year_built_note (%r) is not carried into the new one"
                         % (sid, originals[sid][col]))
            row[col] = value
        if sid == "peer-makki":
            if originals[sid]["silsila"].strip():
                fail("peer-makki: silsila is not empty — refusing to overwrite")
            row["silsila"] = PEER_MAKKI_SILSILA

        # Invariant 2b — this row changed exactly the columns it is allowed to.
        moved = {k for k in row if row[k] != originals[sid][k]}
        if moved != CHANGED_COLS[sid]:
            fail("%s changed %s; expected %s" % (sid, sorted(moved), sorted(CHANGED_COLS[sid])))
        changed.append(sid)

    if sorted(changed) != sorted(BUILDERS):
        fail("expected to change %d rows, changed %d" % (len(BUILDERS), len(changed)))

    # Invariant 2 — every other row untouched, cell for cell.
    with open(src, encoding="utf-8", newline="") as f:
        for a, b in zip(csv.DictReader(f), rows):
            if b["id"] in BUILDERS:
                continue
            if a != b:
                fail("row %r changed and should not have" % b.get("Name"))

    with open(FULL_OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=fieldnames, lineterminator="\r\n")
        w.writeheader()
        w.writerows(rows)

    with open(PATCH_OUT, "w", encoding="utf-8", newline="") as f:
        w = csv.DictWriter(f, fieldnames=PATCH_COLS, lineterminator="\r\n", extrasaction="ignore")
        w.writeheader()
        for sid in ("shah-jamal", "peer-makki", "shrine-of-mauj-darya-bukhari"):
            w.writerow(by_id[sid][0])

    # Invariant 6 — read both outputs back.
    with open(FULL_OUT, encoding="utf-8", newline="") as f:
        back = list(csv.DictReader(f))
    if len(back) != len(rows):
        fail("read-back row count %d != %d" % (len(back), len(rows)))
    if len(back[0]) != 44:
        fail("read-back column count %d != 44" % len(back[0]))
    back_by_id = {r["id"]: r for r in back}
    for sid in BUILDERS:
        if back_by_id[sid]["Description"] != by_id[sid][0]["Description"]:
            fail("%s: description did not survive the CSV round-trip" % sid)

    with open(PATCH_OUT, encoding="utf-8", newline="") as f:
        patch_back = list(csv.DictReader(f))
    if len(patch_back) != 3 or list(patch_back[0].keys()) != PATCH_COLS:
        fail("patch read-back is not 3 rows x %d columns" % len(PATCH_COLS))
    for r in patch_back:
        if by_id[r["id"]][0]["Description"] != r["Description"]:
            fail("%s: patch description differs from the full-sheet one" % r["id"])

    print("OK  %d rows x %d columns -> %s" % (len(rows), len(fieldnames), os.path.relpath(FULL_OUT, REPO)))
    print("OK  3 rows x %d columns -> %s" % (len(PATCH_COLS), os.path.relpath(PATCH_OUT, REPO)))
    for sid in ("shah-jamal", "peer-makki", "shrine-of-mauj-darya-bukhari"):
        o = originals[sid]["Description"]
        n = by_id[sid][0]["Description"]
        print(
            "    %-30s description %5d -> %5d chars (+%d), support %s -> %s"
            % (sid, len(o), len(n), len(n) - len(o), originals[sid]["support_level"], "Field-verified")
        )


if __name__ == "__main__":
    main()
