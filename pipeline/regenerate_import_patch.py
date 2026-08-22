# -*- coding: utf-8 -*-
"""
regenerate_import_patch.py — rebuilds data/patch_schema_and_truncation.csv per
the 22 August 2026 rulings (docs/EDITORIAL_DECISIONS_PENDING.md §6):

  1. Re-verify the 18 Aug patch's assumptions against the current committed
     snapshot (data/shrines.csv) — the ruling was "regenerate against the
     current snapshot first", because the sheet may have drifted.
  2. Add the new `silsila_note` column (§1.2 ruling): the three entries whose
     silsila field holds survey prose get that prose MOVED to silsila_note —
     a relocation of the survey's own words, never a rewrite (RULE 2) — plus
     the Mian Qurban Ali Shah uncorroborated-silsila caveat, every clause of
     which is quoted from the authored entry file.
  3. Emit data/patch_schema_and_truncation.INSTRUCTIONS.md with the explicit
     per-cell edit list, because a sparse patch CSV cannot distinguish
     "clear this cell" from "leave this cell alone" on its own.

The two coordinate-less rows (Shah Gohar Peer, Mian Qurban Ali Shah) are NOT
in the committed snapshot (build-dataset drops rows without coordinates), so
their cells cannot be re-verified here; their values are carried from the
committed 18 Aug patch and the authored entry files, and the instructions say
so. Never writes the sheet (RULE 3) — a human imports.

    python3 pipeline/regenerate_import_patch.py
"""
import csv
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SNAPSHOT = os.path.join(ROOT, "data", "shrines.csv")
OUT = os.path.join(ROOT, "data", "patch_schema_and_truncation.csv")
INSTRUCTIONS = os.path.join(ROOT, "data", "patch_schema_and_truncation.INSTRUCTIONS.md")

COLUMNS = [
    "id", "Name", "category", "site_type", "principal_figure", "Sufi Saint",
    "silsila", "silsila_note", "year_built_note", "Events",
]


def die(msg):
    print(f"[regenerate-patch] FAIL: {msg}", file=sys.stderr)
    sys.exit(1)


def load_snapshot():
    with open(SNAPSHOT, newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh))
    return {(r.get("id") or "").strip(): r for r in rows if (r.get("id") or "").strip()}, rows


def load_old_patch():
    with open(OUT, newline="", encoding="utf-8") as fh:
        return {((r.get("id") or "").strip() or (r.get("Name") or "").strip()): r
                for r in csv.DictReader(fh)}


# ── The silsila → silsila_note moves (22 Aug ruling, §1.2) ──────────────────
# For rows present in the snapshot, `expect_silsila` is asserted verbatim
# against the live cell before the move — sheet drift fails the run loudly.
ABUL_MUALI_SILSILA = (
    'Not stated as an order. Q5 answers the *silsila* question with descent and '
    'personal affiliation: "Lineage of Hazrat Ali (R.A), Kirmani Sadaat, '
    'Affiliation with Syed Dawood Bandgi Kirmani." See qa_note 1.'
)
MALIK_AYAZ_SILSILA = 'As recorded: "Ahl e Sunnat - Ghaznavi silsila"'
GOHAR_SILSILA = (
    'Not given as a Sufi order in the survey. The sect field reads "Ahl e Sunnat '
    '- Ismaili Sadaat Uch Shareef - Shajra e nasab Hazrat Imam Hussain (R.A)" — '
    'recorded as given; see qa_note. The account separately says he adopted a '
    '*Qalandarī* appearance, but does not claim a Qalandarī affiliation.'
)
# Every clause below is quoted/paraphrased from entries/entry_mian_qurban_ali_shah.md
# (the silsila bullet and qa_note item 9) — no new claim is introduced.
MIAN_QURBAN_SILSILA_NOTE = (
    'Survey answer as written: "Naqshbandi Majdadi - Ahl e Sunnat" — "Ahl e Sunnat" '
    'is the sect answer, not a *silsila*. The field rests on the one-line Q5 answer '
    'alone: nothing in Q8, Q9, Q10, Q11, Q16 or Q19 mentions a Naqshbandi '
    'affiliation, a Naqshbandi chain, or any Naqshbandi practice. See qa_note.'
)


def main():
    by_id, rows = load_snapshot()
    old = load_old_patch()
    print(f"[regenerate-patch] snapshot: data/shrines.csv ({len(rows)} rows)")

    edits = []  # (row_id, name, column, new_value, action_note)

    # ── 1. category fixes: re-verify they are still needed ─────────────────
    abul = by_id.get("darbar-abul-muali-qadri") or die("abul-muali row missing from snapshot")
    if (abul.get("category") or "").strip() == "Islam":
        edits.append(("darbar-abul-muali-qadri", "Darbar Abul Muali Qadri",
                      "category", "Muslim Shrine",
                      "still 'Islam' in the snapshot — out-of-schema fix still needed"))
    else:
        print(f"[regenerate-patch] NOTE: abul-muali category is now "
              f"{abul.get('category')!r} — category fix dropped from patch")

    hinglaj = next((r for r in rows if (r.get("Name") or "").strip()
                    == "Shaktipeeth Shri Hinglaj Mata Mandir"), None) \
        or die("Hinglaj row missing from snapshot")
    if not (hinglaj.get("category") or "").strip():
        edits.append(("", "Shaktipeeth Shri Hinglaj Mata Mandir",
                      "category", "Hindu Temple",
                      "category cell still empty (legacy-column fallback in use)"))

    # ── 2. silsila → silsila_note moves, verified where the row is visible ──
    if (abul.get("silsila") or "").strip() != ABUL_MUALI_SILSILA:
        die("abul-muali silsila cell has drifted from the value this script "
            "expects — re-read the sheet before moving anything:\n"
            f"  found: {(abul.get('silsila') or '')[:120]!r}")
    edits.append(("darbar-abul-muali-qadri", "Darbar Abul Muali Qadri",
                  "silsila_note", ABUL_MUALI_SILSILA, "moved verbatim from silsila"))
    edits.append(("darbar-abul-muali-qadri", "Darbar Abul Muali Qadri",
                  "silsila", "", "cleared — prose moved to silsila_note"))

    ayaz = by_id.get("darbar-malik-ahmad-ayaz") or die("malik-ahmad-ayaz row missing")
    if (ayaz.get("silsila") or "").strip() != MALIK_AYAZ_SILSILA:
        die("malik-ahmad-ayaz silsila cell has drifted:\n"
            f"  found: {(ayaz.get('silsila') or '')[:120]!r}")
    edits.append(("darbar-malik-ahmad-ayaz", "Darbar Malik Ahmad Ayaz",
                  "silsila_note", MALIK_AYAZ_SILSILA, "moved verbatim from silsila"))
    edits.append(("darbar-malik-ahmad-ayaz", "Darbar Malik Ahmad Ayaz",
                  "silsila", "", "cleared — prose moved to silsila_note"))

    # Rows not in the snapshot (no coordinates): carried, not re-verified.
    edits.append(("darbar-hazrat-shah-gohar-peer", "Darbar Hazrat Shah Gohar Peer",
                  "silsila_note", GOHAR_SILSILA,
                  "moved from silsila (row absent from snapshot — value from the "
                  "authored entry file / 18 Aug patch)"))
    edits.append(("darbar-hazrat-shah-gohar-peer", "Darbar Hazrat Shah Gohar Peer",
                  "silsila", "", "cleared — prose moved to silsila_note"))
    edits.append(("darbar-mian-qurban-ali-shah", "Darbar Mian Qurban Ali Shah",
                  "silsila_note", MIAN_QURBAN_SILSILA_NOTE,
                  "new note; the silsila CELL ITSELF stays as the sheet has it "
                  "(row absent from snapshot, current cell unverifiable from here)"))

    # ── 3. carry the 18 Aug rows forward (truncation restores etc.) ─────────
    carried = {}
    for key, row in old.items():
        carried[key] = {c: (row.get(c) or "") for c in COLUMNS if c != "silsila_note"}
        carried[key]["silsila_note"] = ""

    for row_id, name, column, value, _note in edits:
        key = row_id or name
        if key not in carried:
            carried[key] = {c: "" for c in COLUMNS}
            carried[key]["id"], carried[key]["Name"] = row_id, name
        carried[key][column] = value

    with open(OUT, "w", newline="", encoding="utf-8") as fh:
        w = csv.DictWriter(fh, fieldnames=COLUMNS)
        w.writeheader()
        for key in sorted(carried):
            w.writerow(carried[key])

    with open(INSTRUCTIONS, "w", encoding="utf-8") as fh:
        fh.write(
            "# Import instructions — patch_schema_and_truncation.csv\n\n"
            "Regenerated %s against `data/shrines.csv`. A sparse CSV cannot say\n"
            '"leave this cell alone", so THIS list is the authority — apply each\n'
            "edit by hand in the sheet (RULE 3: only a human writes the sheet).\n\n"
            "**First: add a `silsila_note` column** (after `silsila`).\n\n"
            "| Row | Column | Action |\n|---|---|---|\n"
            % "22 Aug 2026"
        )
        for row_id, name, column, value, note in edits:
            shown = value if len(value) <= 80 else value[:77] + "…"
            action = f"set to `{shown}`" if value else "clear the cell"
            fh.write(f"| {name} | `{column}` | {action} — {note} |\n")
        fh.write(
            "\nThe Shah Gohar Peer truncation restores from the 18 Aug patch are\n"
            "unchanged and still pending — the full values are in the CSV (they\n"
            "exceed table width): `site_type`, `principal_figure`, `Sufi Saint`,\n"
            "`year_built_note`, `Events`, plus `category` = `Muslim Shrine` for\n"
            "that row and Darbar Mian Qurban Ali Shah.\n\n"
            "Sheet import settings if replacing wholesale instead: Replace current\n"
            "sheet · comma separator · \"Convert text to numbers, dates and\n"
            "formulas\" OFF.\n"
        )

    print(f"[regenerate-patch] wrote {os.path.relpath(OUT, ROOT)} "
          f"({len(carried)} rows) and {os.path.relpath(INSTRUCTIONS, ROOT)}")
    print(f"[regenerate-patch] {len(edits)} cell edits listed for the human import")


if __name__ == "__main__":
    main()
