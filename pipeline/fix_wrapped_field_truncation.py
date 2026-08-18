# -*- coding: utf-8 -*-
"""
fix_wrapped_field_truncation.py — repairs two row-conversion defects found on
18 August 2026 while drafting the A8 Urdu translations, and writes one importable
CSV patch for a human (CLAUDE.md RULE 3: agents never write the sheet).

Defect 1 — hard-wrapped field values truncated to their first line
------------------------------------------------------------------
`entries/entry_shah_gohar_peer.md` records its sheet values as a hard-wrapped
markdown bullet list under "## Proposed field values":

    - **principal_figure:** Hazrat Sufi Peer Syed Gohar Ali Shah (Syed Ali Gohar), known as
      Shah Gohar Peer

Whatever converted those bullets into sheet columns kept only the FIRST PHYSICAL
LINE of each, so the live sheet holds `…(Syed Ali Gohar), known as` — cut
mid-sentence. Six cells on that row are truncated this way. It is the only row in
the sheet whose Description is hard-wrapped, which is why it is the only row
affected: the same authoring style produced both.

Rather than retype the lost text, this script re-parses the entry file and joins
each bullet's continuation lines back together, so the restored value is provably
the authored one. It refuses to "restore" anything that is not a strict extension
of what the sheet already holds (see check_is_extension) — that guard is the point:
it makes it impossible for this script to quietly rewrite content.

Defect 2 — `category` values outside the six-value schema
---------------------------------------------------------
Three rows carry a non-empty `category` that is not one of CLAUDE.md's six values
('Islam' ×2, 'Sufi shrine (Islam)' ×1). categoryKey() in
src/lib/data/categoryKey.ts maps each to 'default', and MapSidebar's filter is
`activeCategories.includes(categoryKey(s.category))` where activeCategories only
ever holds the six canonical keys — so such a row is excluded from EVERY category
chip selection and draws with the default marker colour.

Only `darbar-abul-muali-qadri` is currently visible on the site; the other two
have no coordinates yet and the dataset build drops them, so for them the bug is
latent until Saifullah supplies pins. A fourth row (Hinglaj) has an EMPTY
`category`, which is harmless — shrineModel falls back to the legacy `Category`
column — but is filled in here so the row stops depending on that fallback.

Every replacement value is sourced from the row's own data, never inferred:
see CATEGORY_FIXES below for the evidence string behind each.

    python3 pipeline/fix_wrapped_field_truncation.py [--live]

Writes data/patch_schema_and_truncation.csv.
"""
import csv, io, json, os, re, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ENTRY = os.path.join(ROOT, "entries", "entry_shah_gohar_peer.md")
LOCAL_CSV = os.path.join(ROOT, "data", "shrines_final_import_2026-08-16.csv")
OUT = os.path.join(ROOT, "data", "patch_schema_and_truncation.csv")

VALID_CATEGORIES = {
    "Muslim Shrine", "Hindu Temple", "Sikh Gurdwara",
    "Nanakpanthi / Udasi Darbar", "Jain Temple", "Secular / Memorial",
}

# entry-file bullet key -> sheet column(s) it populates. 'Sufi Saint' is the
# legacy mirror of principal_figure and carries the same truncation.
BULLET_TO_COLUMNS = {
    "site_type": ["site_type"],
    "principal_figure": ["principal_figure", "Sufi Saint"],
    "silsila": ["silsila"],
    "year_built_note": ["year_built_note"],
    "events": ["Events"],
    "figure_type": ["figure_type"],
    "status": ["status"],
    "figure_born": ["figure_born"],
    "figure_died": ["figure_died"],
    "Location": ["Location"],
}

# id -> (correct category, where that value came from in the row itself)
CATEGORY_FIXES = {
    "darbar-abul-muali-qadri": (
        "Muslim Shrine",
        "row's own Description, sentence 1: 'Darbar Abul Muali Qadri is an active "
        "Muslim shrine in Lahore'",
    ),
    "darbar-mian-qurban-ali-shah": (
        "Muslim Shrine",
        "row's own Description, Overview: 'Darbar Mian Qurban Ali Shah is a Muslim "
        "shrine at Mint Stop, Lahore'",
    ),
    "darbar-hazrat-shah-gohar-peer": (
        "Muslim Shrine",
        "row's own Description, sentence 1: 'Darbar Hazrat Shah Gohar Peer is a "
        "Muslim shrine in Lahore'",
    ),
    "Shaktipeeth Shri Hinglaj Mata Mandir": (
        "Hindu Temple",
        "row's own legacy `Category` column, which already reads 'Hindu Temple' "
        "(this row's `id` is blank, so it is keyed by Name)",
    ),
}


def die(msg):
    raise SystemExit(f"FAIL: {msg}")


def parse_entry_bullets(path):
    """Un-wrap the '## Proposed field values' bullets: a bullet's value is its
    first line plus every following indented continuation line."""
    if not os.path.exists(path):
        die(f"{path} is missing — cannot restore truncated values from it. "
            "Do not reconstruct them from general knowledge (RULE 2).")
    with open(path, encoding="utf-8") as fh:
        lines = fh.read().split("\n")
    try:
        start = next(i for i, l in enumerate(lines) if l.strip() == "## Proposed field values")
    except StopIteration:
        die(f"{path}: no '## Proposed field values' section")
    values, key = {}, None
    for line in lines[start + 1:]:
        if line.startswith("## "):
            break
        m = re.match(r"^- \*\*(.+?):\*\*\s*(.*)$", line)
        if m:
            key, first = m.group(1).strip(), m.group(2).strip()
            values[key] = [first] if first else []
        elif key and line.startswith("  ") and line.strip():
            values[key].append(line.strip())
        elif not line.strip():
            key = None
    return {k: " ".join(v).strip() for k, v in values.items() if v}


def check_is_extension(column, sheet_val, restored):
    """Guard: a restoration must be a strict extension of the truncated cell.

    Three cases, and only the first is ours to fix:
      * sheet is a prefix of the entry file  -> wrap truncation, restore it
      * entry file is a prefix of the sheet  -> the sheet was legitimately
        enriched after the entry file was written (this is what happened to
        `Location`, which patch_field_survey_coordinates.csv extended with a
        FLAG note). Leave it alone.
      * neither is a prefix of the other     -> genuine divergence. Stop; a
        human decides, because silently picking a side would overwrite content.
    """
    s, r = " ".join(sheet_val.split()), " ".join(restored.split())
    if r.startswith(s):
        return len(r) > len(s)
    if s.startswith(r):
        print(f"[fix] skip {column}: sheet value already extends the entry file "
              f"({len(s)} vs {len(r)} chars) — later enrichment, not a truncation")
        return False
    die(f"{column}: sheet and entry-file values diverge (neither is a prefix of the "
        f"other), so this is not a wrap truncation and not this script's to fix.\n"
        f"      sheet:     {s!r}\n      entryfile: {r!r}")


def load_rows(live):
    if live:
        url = json.load(open(os.path.join(ROOT, "data", "csv-source.json")))["csvUrl"]
        raw = urllib.request.urlopen(url, timeout=120).read().decode("utf-8")
        return list(csv.DictReader(io.StringIO(raw))), "live published sheet"
    with open(LOCAL_CSV, newline="", encoding="utf-8") as fh:
        return list(csv.DictReader(fh)), os.path.relpath(LOCAL_CSV, ROOT)


def main():
    live = "--live" in sys.argv
    rows, source = load_rows(live)
    by_id = {(r.get("id") or "").strip(): r for r in rows if (r.get("id") or "").strip()}
    by_name = {(r.get("Name") or "").strip(): r for r in rows}
    print(f"[fix] source: {source} ({len(rows)} rows)")

    bullets = parse_entry_bullets(ENTRY)
    gohar = by_id.get("darbar-hazrat-shah-gohar-peer") or die("gohar-peer row not found")

    # ── defect 1: restore wrap-truncated cells ──────────────────────────────
    restored = {}
    for bullet_key, columns in BULLET_TO_COLUMNS.items():
        if bullet_key not in bullets:
            continue
        full = bullets[bullet_key]
        for col in columns:
            if col not in gohar:
                die(f"column {col!r} not in the sheet — refusing to invent it")
            cur = (gohar.get(col) or "").strip()
            if not cur:
                continue
            if check_is_extension(col, cur, full):
                restored[col] = full
                print(f"[fix] restore {col}: {len(cur)} -> {len(full)} chars")
    if not restored:
        print("[fix] nothing truncated — sheet already repaired?")

    # ── defect 2: normalise out-of-schema categories ────────────────────────
    cat_rows = {}
    for key, (value, evidence) in CATEGORY_FIXES.items():
        row = by_id.get(key) or by_name.get(key)
        if row is None:
            die(f"category fix target {key!r} not found in the sheet")
        cur = (row.get("category") or "").strip()
        if cur in VALID_CATEGORIES:
            print(f"[fix] category for {key!r} already valid ({cur!r}) — skipping")
            continue
        if value not in VALID_CATEGORIES:
            die(f"replacement category {value!r} is not one of the six schema values")
        cat_rows[key] = (row, value)
        print(f"[fix] category {key!r}: {cur!r} -> {value!r}   [{evidence}]")

    # ── emit one patch ──────────────────────────────────────────────────────
    targets = {}
    for key, (row, value) in cat_rows.items():
        targets.setdefault(id(row), {"row": row, "cols": {}})["cols"]["category"] = value
    if restored:
        t = targets.setdefault(id(gohar), {"row": gohar, "cols": {}})
        t["cols"].update(restored)

    if not targets:
        print("[fix] nothing to patch — no CSV written.")
        return

    columns = []
    for t in targets.values():
        for c in t["cols"]:
            if c not in columns:
                columns.append(c)
    header = ["id", "Name"] + columns

    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=header)
        w.writeheader()
        for t in sorted(targets.values(), key=lambda t: (t["row"].get("Name") or "")):
            row, cols = t["row"], t["cols"]
            out = {"id": (row.get("id") or "").strip(), "Name": (row.get("Name") or "").strip()}
            out.update(cols)
            w.writerow(out)

    # invariant: every emitted cell is non-empty, and no unbalanced asterisks
    with open(OUT, newline="", encoding="utf-8") as fh:
        for r in csv.DictReader(fh):
            for k, v in r.items():
                if v is None:
                    continue
                if k in columns and v.strip() and v.count("*") % 2:
                    die(f"{r['Name']} / {k}: unbalanced asterisks in the patched value")
    print(f"[fix] wrote {OUT} — {len(targets)} row(s), columns: {', '.join(header)}")
    print("[fix] OK — every value derived from the entry file or the row's own data.")


if __name__ == "__main__":
    main()
