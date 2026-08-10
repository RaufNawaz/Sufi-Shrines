#!/usr/bin/env python3
"""
append_new_shrines.py — add the four field-surveyed shrines to the database.

    python3 append_new_shrines.py shrines_final.csv shrines_final_v2.csv

Reads the four `entry_*.md` files written from the field surveys, parses each into a
Description plus its proposed field values, and appends them as new rows aligned to
whatever header your CSV actually has. It does not assume a column order.

Needs these files in the same directory:
    entry_shah_gohar_peer.md
    entry_mian_qurban_ali_shah.md
    entry_abul_muali_qadri.md
    entry_malik_ahmad_ayaz.md

WHAT IT DOES
  - Description  = the public prose sections, with "## Bibliography" forced to the end
                   (the drafters placed it inconsistently) and the field-values and
                   qa_note blocks excluded.
  - qa_note      = the drafter's qa_note block, verbatim. Internal only.
  - Everything in "## Proposed field values" is mapped to its column, matched
    case-insensitively against your real header.
  - Legacy columns are filled for backwards compatibility, because the site still
    reads them: `Category` <- category, `Sufi Saint` <- principal_figure,
    `Founded/Opened` <- year_built or its note.
  - Image columns are left EMPTY. The Drive links in the surveys do not render; images
    arrive later via the media pipeline. Better blank than broken.

SAFETY
  - Refuses to run if a shrine name already exists in the CSV.
  - Asserts newlines survive in every Description before writing.
  - Reports any field-value key it could not match to a column instead of dropping it.
"""

import csv, re, sys, os

FILES = [
    "entry_shah_gohar_peer.md",
    "entry_mian_qurban_ali_shah.md",
    "entry_abul_muali_qadri.md",
    "entry_malik_ahmad_ayaz.md",
]

SKIP_SECTIONS = re.compile(r"^(proposed field values|qa[_ ]note|qa notes?)\s*$", re.I)
BIB_SECTION   = re.compile(r"^bibliograph", re.I)
FIELD_SECTION = re.compile(r"^proposed field values", re.I)
QA_SECTION    = re.compile(r"^qa[_ ]note", re.I)

# field-value label -> target column (matched case-insensitively against the real header)
ALIASES = {
    "name": "Name", "location": "Location", "latitude": "Latitude",
    "longitude": "Longitude", "events": "Events", "id": "id",
    "category": "category", "site_type": "site_type", "status": "status",
    "principal_figure": "principal_figure", "figure_type": "figure_type",
    "silsila": "silsila", "year_built": "year_built",
    "year_built_precision": "year_built_precision",
    "year_built_note": "year_built_note", "figure_born": "figure_born",
    "figure_died": "figure_died", "event_year": "event_year",
    "event_note": "event_note", "flags": "flags", "info_level": "info_level",
    "support_level": "support_level", "needs_review": "needs_review",
}


def split_sections(text):
    """Return [(heading, body)]. Text before the first ## heading gets heading ''."""
    parts, cur, body = [], "", []
    for line in text.splitlines():
        m = re.match(r"^##\s+(.*?)\s*$", line)
        if m:
            parts.append((cur, "\n".join(body).strip()))
            cur, body = m.group(1), []
        else:
            body.append(line)
    parts.append((cur, "\n".join(body).strip()))
    return [(h, b) for h, b in parts if h or b]


def parse_entry(path):
    raw = open(path, encoding="utf-8").read()
    # strip a leading H1 title if present
    raw = re.sub(r"\A#\s+.*?\n", "", raw)
    sections = split_sections(raw)

    prose, bib, fields_raw, qa = [], None, None, None
    for head, body in sections:
        if FIELD_SECTION.match(head or ""):
            fields_raw = body
        elif QA_SECTION.match(head or ""):
            qa = body
        elif BIB_SECTION.match(head or ""):
            bib = body
        else:
            prose.append((head, body))

    desc_parts = []
    for head, body in prose:
        desc_parts.append(f"## {head}\n{body}" if head else body)
    if bib:
        desc_parts.append(f"## Bibliography\n{bib}")
    description = "\n\n".join(p for p in desc_parts if p.strip())

    # field values: accept "- key: value", "key: value", "| key | value |"
    fields, unmatched = {}, []
    for line in (fields_raw or "").splitlines():
        line = line.strip()
        if not line or line.startswith(("#", "---", "===")):
            continue
        m = re.match(r"^\|?\s*[-*]?\s*\*{0,2}`?([A-Za-z_ /]+?)`?\*{0,2}\s*[:|]\s*(.+?)\s*\|?$", line)
        if not m:
            continue
        key = re.sub(r"\s+", "_", m.group(1).strip().lower())
        val = m.group(2).strip().strip("`").strip()
        val = re.sub(r"^\*\*(.*)\*\*$", r"\1", val)
        if val.lower() in ("", "—", "-", "n/a", "none", "not stated", "unknown", "blank",
                           "*(blank)*", "(blank)", "[blank]"):
            val = "" if key not in ("year_built_precision",) else "unknown"
        if key in ALIASES:
            fields[ALIASES[key]] = val
        else:
            unmatched.append((key, val))

    qa_text = (qa or "").strip()
    qa_text = re.sub(r"^```+\w*\s*|\s*```+$", "", qa_text).strip()

    return description, fields, qa_text, unmatched


def main(src, dst):
    missing = [f for f in FILES if not os.path.exists(f)]
    if missing:
        sys.exit("missing entry files: " + ", ".join(missing))

    with open(src, newline="", encoding="utf-8") as fh:
        rdr = csv.DictReader(fh)
        header = rdr.fieldnames
        rows = list(rdr)
    if not header:
        sys.exit("could not read a header from " + src)

    lower = {h.strip().lower(): h for h in header}
    def col(name):
        return lower.get(name.strip().lower())

    existing = {(r.get(col("Name")) or "").strip().lower() for r in rows}
    new_rows, report = [], []

    for path in FILES:
        desc, fields, qa, unmatched = parse_entry(path)
        name = fields.get("Name", "").strip()
        if not name:
            sys.exit(f"{path}: no Name in the field-values block")
        if name.lower() in existing:
            sys.exit(f"{path}: '{name}' is already in {src} — refusing to duplicate")
        assert "\n" in desc, f"{path}: Description has no newlines, refusing to write"

        row = {h: "" for h in header}
        for k, v in fields.items():
            c = col(k)
            if c:
                row[c] = v
            else:
                unmatched.append((k, v))

        if col("Description"): row[col("Description")] = desc
        if col("qa_note"):     row[col("qa_note")] = qa

        # legacy columns the live site still reads
        if col("Category") and fields.get("category"):
            row[col("Category")] = fields["category"]
        if col("Sufi Saint") and fields.get("principal_figure"):
            row[col("Sufi Saint")] = fields["principal_figure"]
        if col("Founded/Opened"):
            row[col("Founded/Opened")] = fields.get("year_built") or fields.get("year_built_note", "")

        if col("flags"):
            row[col("flags")] = ((row[col("flags")] + ";") if row[col("flags")] else "") + "NEW_FROM_FIELD_SURVEY"

        new_rows.append(row)
        report.append((path, name, len(desc.split()), desc.count("\n"),
                       bool(qa), unmatched))

    with open(dst, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader(); w.writerows(rows); w.writerows(new_rows)

    print(f"{src}: {len(rows)} rows -> {dst}: {len(rows)+len(new_rows)} rows\n")
    for path, name, words, nl, has_qa, unmatched in report:
        print(f"  {name}")
        print(f"      {words} words | {nl} newlines | qa_note: {'yes' if has_qa else 'NO'}")
        if unmatched:
            print("      UNMATCHED field values (add these by hand):")
            for k, v in unmatched:
                print(f"        {k} = {v[:70]}")
    print("\nImage columns left blank deliberately — the Drive links do not render.")
    print("Run validate_shrines.py on the output before importing.")


if __name__ == "__main__":
    if len(sys.argv) != 3:
        sys.exit(__doc__)
    main(sys.argv[1], sys.argv[2])
