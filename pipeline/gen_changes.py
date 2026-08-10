#!/usr/bin/env python3
"""
gen_changes.py — assemble CHANGES.md by diffing the pipeline stages row-by-row:

    shrines.csv -> shrines_clean.csv -> shrines_merged.csv -> shrines_final.csv

Every changed row is logged as before -> after (rule 4). Long Description
changes are shown as unified diffs; everything else as full values.
"""
import csv, difflib, os, sys
from datetime import date

BASE = os.path.dirname(os.path.abspath(__file__))

def load(path):
    delim = "\t" if path.lower().endswith((".tsv", ".tab")) else ","
    with open(os.path.join(BASE, path), newline="", encoding="utf-8") as fh:
        rows = list(csv.DictReader(fh, delimiter=delim))
    names = [r.get("Name", "") for r in rows]
    assert len(set(names)) == len(names), f"{path}: duplicate Name keys"
    return {r["Name"]: r for r in rows}, names, list(rows[0].keys())

def fmt(v, limit=500):
    v = "" if v is None else v
    if len(v) > limit:
        v = v[:limit] + f"… [truncated; {len(v)} chars total]"
    return v

def field_change(out, field, b, a):
    if "\n" in (b or "") or "\n" in (a or "") or max(len(b or ""), len(a or "")) > 300:
        out.append(f"  - `{field}` (diff):")
        out.append("")
        out.append("    ```diff")
        diff = list(difflib.unified_diff((b or "").splitlines(), (a or "").splitlines(),
                                         lineterm="", n=1))[2:]  # drop ---/+++ headers
        if len(diff) > 40:
            diff = diff[:40] + [f"    … [{len(diff)-40} more diff lines omitted]"]
        out.extend("    " + l for l in diff)
        out.append("    ```")
        out.append("")
    else:
        out.append(f"  - `{field}`: `{fmt(b)!r}` -> `{fmt(a)!r}`")

def stage(out, title, before_path, after_path, note=None, skip_fields=()):
    bmap, border, bcols = load(before_path)
    amap, aorder, acols = load(after_path)
    out.append(f"\n## {title}")
    out.append(f"\n`{before_path}` ({len(border)} rows, {len(bcols)} cols) -> "
               f"`{after_path}` ({len(aorder)} rows, {len(acols)} cols)\n")
    if note:
        out.append(note + "\n")
    added_cols = [c for c in acols if c not in bcols]
    if added_cols:
        out.append(f"Columns added: {', '.join('`%s`' % c for c in added_cols)}. "
                   f"No column removed; no row added or removed.\n")
    assert border == aorder, "row set/order changed between stages!"
    shared = [c for c in bcols if c in acols and c not in skip_fields]
    changed_rows = 0
    for name in border:
        rb, ra = bmap[name], amap[name]
        diffs = [(c, rb.get(c) or "", ra.get(c) or "") for c in shared
                 if (rb.get(c) or "") != (ra.get(c) or "")]
        newvals = [(c, ra.get(c) or "") for c in added_cols if (ra.get(c) or "").strip()] \
                  if title.startswith("Stage 1") else []
        if not diffs and not newvals:
            continue
        changed_rows += 1
        out.append(f"### {name}")
        for c, b, a in diffs:
            field_change(out, c, b, a)
        for c, v in newvals:
            out.append(f"  - `{c}` (new column): `{fmt(v)!r}`")
        out.append("")
    out.insert(out.index(f"\n## {title}") + 2,
               f"**Rows with value changes: {changed_rows} of {len(border)}.**\n")
    return changed_rows

def main():
    out = []
    out.append("# CHANGES — shrines.csv -> shrines_final.csv")
    out.append(f"\nRepair session {date.today().isoformat()}. "
               "Original preserved at `backups/shrines.20260809-130538.csv`. "
               "No row or column was deleted at any stage; every cell-level change is listed below.\n")
    out.append("Pipeline: `apply_description_fixes.py` -> `merge_patch.py` -> `fix_targeted.py` "
               "(validated with `validate_shrines.py` before and after; see `reports/`).\n")

    out.append("\n## Stage 0 — script fixes (no data changed)\n")
    out.append("- `apply_description_fixes.py`: output delimiter now follows the output filename "
               "(`.csv` -> comma). It previously always wrote tab-delimited content, even to a `.csv` path.")
    out.append("- `build_sources_registry.py`: added a fallback that splits a bibliography on "
               "` - ` (space-hyphen-space) when the section contains no newline, with a runtime "
               "assertion that intra-word hyphens (e.g. *Bibian-e-Pak Daman*) are never split. "
               "Current export has no flattened bibliographies, so registry outputs are unchanged today.")
    out.append("- `validate_shrines.py`: coordinate check now recognises administrative qualifiers "
               "(matched place followed by District/Distt/Tehsil, or appearing as a non-leading, "
               "comma-separated Location component): tolerance 120 km, severity capped at WARN. "
               "Bare leading town names keep the strict 20/60 km thresholds.")
    out.append("- New scripts: `merge_patch.py` (patch join), `fix_targeted.py` (Step-3 fixes), "
               "`check_descriptions.py` (newline guard), `gen_changes.py` (this log).")

    stage(out, "Stage 1 — Description cleanup (`apply_description_fixes.py`)",
          "shrines.csv", "shrines_clean.csv",
          note="Trailing `=====` separators stripped; trailing `NOTE:` blocks lifted into the new "
               "`qa_note` column; spelling normalisation (e.g. Sind -> Sindh, Qadri -> Qadiri); "
               "duplicate field-survey bibliography lines removed; placeholder Events flagged in "
               "`needs_review`. Fix-by-fix log: `fixes_applied.log`.")

    stage(out, "Stage 2 — field patch merge (`merge_patch.py`)",
          "shrines_clean.csv", "shrines_merged.csv",
          note="15 columns appended from `shrines_field_patch.tsv` (join on Name; 162/163 matched "
               "exactly; the unmatched row is flagged `unmatched_in_patch` — see QUESTIONS.md §1 "
               "and `reports/join_report.txt`). `Events` overwritten from the patch for matched rows; "
               "stale `events_placeholder` flags re-evaluated. Appended per-row values are the patch "
               "values verbatim and are not repeated here; the cell-level changes below cover every "
               "pre-existing column.",
          skip_fields=())

    stage(out, "Stage 3 — targeted fixes (`fix_targeted.py`)",
          "shrines_merged.csv", "shrines_final.csv",
          note="Rationale per change in `reports/targeted_changes.md`. Highlights: Allo Mahar "
               "description replaced with the sourced short entry from `allo_mahar_resolution.md` "
               "(figure unresolved -> no biography written); Bibi Jawindi and both Gurdwara "
               "coordinates corrected; Luari Sharif punctuation fix for a false-positive artefact "
               "match; Amb Temples dedication flagged unsourced (not edited).")

    md = "\n".join(out) + "\n"
    with open(os.path.join(BASE, "CHANGES.md"), "w", encoding="utf-8") as fh:
        fh.write(md)
    print(f"wrote CHANGES.md ({len(md.splitlines())} lines)")

if __name__ == "__main__":
    main()
