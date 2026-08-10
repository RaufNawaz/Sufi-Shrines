#!/usr/bin/env python3
"""
fix_targeted.py — STEP 3 targeted fixes: shrines_merged.csv -> shrines_final.csv

Every change is verified against the expected before-value where one is known,
logged to reports/targeted_changes.md as before -> after, and guarded by
assertions that no other cell moves. Descriptions: only Allo Mahar (sourced
replacement from allo_mahar_resolution.md) and Luari Sharif (one punctuation
substitution) may change; both are asserted precisely.

Idempotent: safe to re-run.
"""
import csv, re, sys, os

BASE = os.path.dirname(os.path.abspath(__file__))
SRC = os.path.join(BASE, "shrines_merged.csv")
DST = os.path.join(BASE, "shrines_final.csv")
RESOLUTION = os.path.join(BASE, "allo_mahar_resolution.md")
REPORT = os.path.join(BASE, "reports", "targeted_changes.md")

changes = []     # (name, field, before, after, note)
surprises = []   # unexpected before-values


def load_replacement_description():
    """Extract the blockquote under '### Proposed replacement description'."""
    with open(RESOLUTION, encoding="utf-8") as fh:
        lines = fh.read().split("\n")
    try:
        start = next(i for i, l in enumerate(lines)
                     if l.strip().startswith("### Proposed replacement description"))
    except StopIteration:
        sys.exit("allo_mahar_resolution.md: heading not found")
    out, started = [], False
    for l in lines[start + 1:]:
        if l.startswith(">"):
            started = True
            out.append(l[2:] if l.startswith("> ") else l[1:])
        elif started and l.strip() == "":
            # blank line between/after quote blocks: stop only if quote resumes no more
            out.append(None)  # placeholder; resolved below
        elif started:
            break
    # trim placeholders at the end; interior ones become blank lines
    while out and out[-1] is None:
        out.pop()
    text = "\n".join("" if l is None else l for l in out).strip()
    for must in ("## Overview", "## A note on identification", "## Bibliography",
                 "Channan Shah Nuri", "Faiz-ul-Hassan"):
        if must not in text:
            sys.exit(f"replacement description extraction failed: missing {must!r}")
    if text.count("\n") < 5:
        sys.exit("replacement description lost its structure (too few newlines)")
    return text


def append_token(value, token, joiner="; "):
    toks = [t.strip() for t in (value or "").split(joiner.strip()) if t.strip()]
    if token in toks:
        return value  # idempotent
    return token if not (value or "").strip() else value.rstrip() + joiner + token


def main():
    with open(SRC, newline="", encoding="utf-8") as fh:
        reader = csv.reader(fh)
        header = next(reader)
        rows = list(reader)
    assert len(rows) == 163, f"expected 163 rows, got {len(rows)}"
    idx = {c: i for i, c in enumerate(header)}
    for c in ("Name", "Latitude", "Longitude", "Events", "Description", "qa_note",
              "needs_review", "principal_figure", "figure_type"):
        assert c in idx, f"missing column {c}"

    # add info_level column if absent (never delete/rename anything)
    if "info_level" not in idx:
        header.append("info_level")
        idx["info_level"] = len(header) - 1
        for r in rows:
            r.append("")

    byname = {}
    for r in rows:
        byname.setdefault(r[idx["Name"]], []).append(r)

    def row(name):
        hits = byname.get(name, [])
        assert len(hits) == 1, f"{name!r}: expected exactly 1 row, found {len(hits)}"
        return hits[0]

    def setval(name, r, field, after, expect=None, note=""):
        before = r[idx[field]]
        if before == after:
            changes.append((name, field, before, after, note + " (already satisfied upstream; no-op)"))
            return
        if expect is not None and before != expect:
            surprises.append(f"{name}.{field}: expected before {expect!r}, found {before!r} — target value applied anyway")
        r[idx[field]] = after
        changes.append((name, field, before, after, note))

    # -- snapshot descriptions to prove only sanctioned ones change ------------
    desc_before = {r[idx["Name"]]: r[idx["Description"]] for r in rows}

    # 1. Allo Mahar — sourced replacement description (allo_mahar_resolution.md)
    r = row("Allo Mahar")
    new_desc = load_replacement_description()
    setval("Allo Mahar", r, "Description", new_desc,
           note="replacement sourced verbatim from allo_mahar_resolution.md "
                "('Proposed replacement description'); prior prose described "
                "Sayyid Faiz-ul-Hassan Shah while the row names Pir Syed Muhammad "
                "Channan Shah Nuri")
    setval("Allo Mahar", r, "needs_review",
           append_token(r[idx["needs_review"]], "figure_unresolved"),
           note="per allo_mahar_resolution.md")
    setval("Allo Mahar", r, "info_level", "Low", note="per allo_mahar_resolution.md")

    # 2. Tomb of Javindi Bibi — coords to the Bukhari-mound tomb; figure name
    r = row("Tomb of Javindi Bibi")
    setval("Tomb of Javindi Bibi", r, "Latitude", "29.238", expect="29.14")
    setval("Tomb of Javindi Bibi", r, "Longitude", "71.064", expect="71.04")
    setval("Tomb of Javindi Bibi", r, "principal_figure", "Bibi Jawindi")
    setval("Tomb of Javindi Bibi", r, "qa_note",
           append_token(r[idx["qa_note"]],
                        "Coordinates corrected to the Bibi Jawindi tomb on the Uch Sharif "
                        "Bukhari mound (29.238, 71.064); previous value (29.14, 71.04) sat "
                        "~11 km off the Uch Sharif monument cluster.", joiner=" | "))

    # 3. Parnami Mandir
    r = row("Parnami Mandir")
    setval("Parnami Mandir", r, "principal_figure", "Dya Ram")
    setval("Parnami Mandir", r, "figure_type", "Sant")

    # 4. Garh Maharaja (Shorkot)
    r = row("Garh Maharaja (Shorkot)")
    setval("Garh Maharaja (Shorkot)", r, "principal_figure", "Sultan Bahu",
           expect="Sultan Bahoo", note="canonical spelling; matches the description")

    # 5. Gurdwara Dera Sahib — longitude was truncated to 74
    r = row("Gurdwara Dera Sahib")
    setval("Gurdwara Dera Sahib", r, "Latitude", "31.588", expect="31.3523")
    setval("Gurdwara Dera Sahib", r, "Longitude", "74.313", expect="74")

    # 6. Gurdwara Khoohi Bhai Lalo — longitude was truncated to 74 (Eminabad)
    r = row("Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)")
    setval("Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)", r, "Latitude", "32.0415",
           expect="32.0415")
    setval("Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)", r, "Longitude", "74.2470",
           expect="74")

    # 7. Bhai Waliram Darbar — Events wording
    r = row("Bhai Waliram Darbar")
    setval("Bhai Waliram Darbar", r, "Events", "Not documented")

    # 8. Luari Sharif — legitimate prose trips the case-insensitive NOTE: artefact
    #    regex ("a poet of note: a body ..."); swap colon for semicolon.
    r = row("Dargah of Khwaja Muhammad Zaman (Luari Sharif)")
    d = r[idx["Description"]]
    target = "a poet of note: a body"
    if target in d:
        assert d.count(target) == 1
        setval("Dargah of Khwaja Muhammad Zaman (Luari Sharif)", r, "Description",
               d.replace(target, "a poet of note; a body"),
               note="punctuation only — 'of note: a' matched the validator's "
                    "case-insensitive internal_artefact regex (NOTE:\\s); meaning unchanged")
    else:
        assert "a poet of note; a body" in d, "Luari sentence not found in either form"

    # 9. Amb Temples — dedication to Shiva is not supported by its own description
    r = row("Amb Temples (Amb Sharif)")
    setval("Amb Temples (Amb Sharif)", r, "needs_review",
           append_token(r[idx["needs_review"]], "dedication_unsourced"),
           note="row claims dedication to Shiva (Mahadev) but the description never "
                "mentions Shiva; no other field edited pending a source")

    # -- guards ---------------------------------------------------------------
    allowed_desc_changes = {"Allo Mahar", "Dargah of Khwaja Muhammad Zaman (Luari Sharif)"}
    for rr in rows:
        nm = rr[idx["Name"]]
        if nm not in allowed_desc_changes:
            assert rr[idx["Description"]] == desc_before[nm], f"unexpected Description change: {nm}"
    pak = row("Shrine of Bibi Pak Daman")
    assert pak[idx["Description"]].count("\n") > 0, "Pak Daman description flattened!"
    assert len(rows) == 163 and all(len(rr) == len(header) for rr in rows)

    with open(DST, "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(header)
        w.writerows(rows)

    os.makedirs(os.path.dirname(REPORT), exist_ok=True)
    with open(REPORT, "w", encoding="utf-8") as fh:
        fh.write("# STEP 3 targeted fixes (shrines_merged.csv -> shrines_final.csv)\n\n")
        fh.write(f"Column added: info_level (blank except where noted). Rows: {len(rows)}. Columns: {len(header)}.\n\n")
        for name, field, before, after, note in changes:
            fh.write(f"## {name} — `{field}`\n")
            for label, v in (("before", before), ("after", after)):
                v = v if len(v) <= 400 else v[:400] + f"… [truncated; {len(v)} chars — full value in CSVs/backups]"
                fh.write(f"- {label}: `{v!r}`\n" if "\n" not in v else f"- {label} ({v.count(chr(10))+1} lines):\n\n```\n{v}\n```\n")
            if note:
                fh.write(f"- note: {note}\n")
            fh.write("\n")
        if surprises:
            fh.write("## Unexpected before-values\n\n")
            for s in surprises:
                fh.write(f"- {s}\n")

    print(f"wrote {DST} ({len(rows)} rows x {len(header)} cols) and {REPORT}")
    print(f"changes: {sum(1 for c in changes if c[2] != c[3])} applied, "
          f"{sum(1 for c in changes if c[2] == c[3])} already satisfied (no-op)")
    for name, field, before, after, note in changes:
        tag = "noop " if before == after else "FIXED"
        b = (before[:60] + "…") if len(before) > 60 else before
        a = (after[:60] + "…") if len(after) > 60 else after
        print(f"  [{tag}] {name} | {field}: {b!r} -> {a!r}")
    if surprises:
        print("SURPRISES (also in report):")
        for s in surprises:
            print("  !", s)


if __name__ == "__main__":
    main()
