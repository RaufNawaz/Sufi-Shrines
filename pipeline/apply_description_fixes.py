#!/usr/bin/env python3
"""
Cleans the Description column of the shrines database.

Usage:  python3 apply_description_fixes.py <input.tsv|csv> <output.tsv|csv>

Operates on whatever table you point it at, so it can run after the
responses-sheet merge without conflicting with it. Idempotent - safe to re-run.

Fixes applied
  1. Strip the trailing "=====" separator artefact.
  2. Lift trailing "NOTE: ..." blocks out of the public description into `qa_note`.
  3. Remove internal row-number cross-references ("row 69", "rows 11, 90, 91 and 138").
  4. De-duplicate repeated field-survey bibliography lines.
  5. Normalise "Suharwardi"/"Suharwardia" -> "Suhrawardi"/"Suhrawardia" in prose.
  6. Collapse runs of blank lines; strip trailing whitespace.
  7. Report (does not silently alter) any surviving placeholder text.

Every change is written to fixes_applied.log with the shrine name and rule fired.
"""

import csv, re, sys, io, os

SEP        = re.compile(r"\n*={10,}\s*$")
NOTE_TAIL  = re.compile(r"\n*\s*NOTE:\s*(.+?)\s*$", re.S)
ROW_REF    = re.compile(r"\s*\(?\brows?\s+\d+(?:\s*,\s*\d+)*(?:\s+and\s+\d+)?\)?", re.I)
SURVEY_BIB = re.compile(r"^-\s*Shrines Project field survey.*$", re.M)
BLANKS     = re.compile(r"\n{3,}")
PLACEHOLDER = re.compile(r"no events scheduled right now|undocumented|not documented", re.I)

SPELLING = [
    (re.compile(r"\bSuharwardia\b"), "Suhrawardia"),
    (re.compile(r"\bSuharwardi\b"),  "Suhrawardi"),
    (re.compile(r"\bSuhrawardy\b"),  "Suhrawardi"),
    (re.compile(r"\bChisti\b"),      "Chishti"),
    (re.compile(r"\bQadri\b(?! \()"), "Qadiri"),
    (re.compile(r"\bSind\b(?!h)"),   "Sindh"),
]

def fix(name, text, log):
    notes = []
    def rec(rule): log.append((name, rule))

    if SEP.search(text):
        text = SEP.sub("", text); rec("separator_stripped")

    m = NOTE_TAIL.search(text)
    while m:
        notes.append(m.group(1).strip())
        text = text[:m.start()].rstrip()
        rec("note_lifted")
        m = NOTE_TAIL.search(text)

    if ROW_REF.search(text):
        text = ROW_REF.sub("", text); rec("row_ref_removed")

    hits = SURVEY_BIB.findall(text)
    if len(hits) > 1:
        seen = set(); keep = []
        for ln in text.split("\n"):
            if SURVEY_BIB.match(ln):
                k = re.sub(r"\s+", " ", ln).lower()
                # keep the more informative variant (the one naming the surveyor)
                if k in seen: continue
                seen.add(k)
            keep.append(ln)
        # drop the surveyor-less duplicate when a surveyor-named line exists
        named = [l for l in keep if SURVEY_BIB.match(l) and "surveyor:" in l.lower()]
        if named:
            keep = [l for l in keep
                    if not (SURVEY_BIB.match(l) and "surveyor:" not in l.lower())]
        text = "\n".join(keep); rec("survey_bib_deduped")

    for pat, repl in SPELLING:
        if pat.search(text):
            text = pat.sub(repl, text); rec(f"spelling:{repl}")

    new = BLANKS.sub("\n\n", text).strip()
    if new != text: rec("whitespace_normalised")
    text = new

    return text, " | ".join(notes)


def main(src, dst):
    delim = "\t" if src.lower().endswith((".tsv", ".tab")) else ","
    with open(src, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=delim))
    if not rows:
        sys.exit("empty input")

    cols = list(rows[0].keys())
    desc = next((c for c in cols if c.strip().lower() in
                 ("description", "desc", "history", "content")), None)
    namecol = next((c for c in cols if c.strip().lower() in ("name", "shrine", "title")), cols[0])
    if not desc:
        sys.exit(f"no description column found in: {cols}")

    for extra in ("qa_note", "needs_review"):
        if extra not in cols: cols.append(extra)

    log, flagged = [], []
    for r in rows:
        name = r.get(namecol, "?")
        cleaned, note = fix(name, r.get(desc) or "", log)
        r[desc] = cleaned
        if note:
            r["qa_note"] = (r.get("qa_note") or "")
            r["qa_note"] = (r["qa_note"] + " | " + note).strip(" |")
        ev = (r.get("Events") or r.get("events") or "")
        if PLACEHOLDER.search(ev):
            r["needs_review"] = "events_placeholder"
            flagged.append(f"{name}: Events = {ev!r}")
        r.setdefault("qa_note", ""); r.setdefault("needs_review", "")

    out_delim = "\t" if dst.lower().endswith((".tsv", ".tab")) else ","
    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=cols, delimiter=out_delim)
        w.writeheader(); w.writerows(rows)

    with open("fixes_applied.log", "w", encoding="utf-8") as fh:
        for n, rule in log: fh.write(f"{rule}\t{n}\n")

    from collections import Counter
    c = Counter(rule for _, rule in log)
    print(f"rows processed: {len(rows)}   description column: {desc!r}")
    print(f"changes: {len(log)}")
    for k, v in c.most_common(): print(f"  {k:<28}{v}")
    if flagged:
        print(f"\nplaceholder Events still present ({len(flagged)}) - patch these from shrines_field_patch.tsv:")
        for f in flagged: print("  " + f)
    print("\nwrote", dst, "and fixes_applied.log")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
