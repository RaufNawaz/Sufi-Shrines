# Legacy exports

## shrines_flat_export.tsv

Found untracked at the repo root, undated, no extension (`shrines`). It's a **TSV** export
of the shrines database in the old flat schema (`Name`, `Location`, `Category`,
`Founded/Opened`, `Sufi Saint`, `Image 1`-`Image 16`, `Events`, `Description`) — from before
the three-axis schema split (`category`/`site_type`/`status`) and before provenance/date
fields existed.

Kept for reference only, not as a usable source: Google Sheets' TSV export strips newlines
inside cells (see RULE 3 in CLAUDE.md), so any multi-paragraph or bulleted Description in this
file has already lost its structure. Do not reflow or re-import it — treat `data/shrines.csv`
and the live sheet as authoritative instead.
