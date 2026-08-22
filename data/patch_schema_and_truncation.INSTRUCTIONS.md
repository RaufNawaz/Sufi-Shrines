# Import instructions — patch_schema_and_truncation.csv

Regenerated 22 Aug 2026 against `data/shrines.csv`. A sparse CSV cannot say
"leave this cell alone", so THIS list is the authority — apply each
edit by hand in the sheet (RULE 3: only a human writes the sheet).

**First: add a `silsila_note` column** (after `silsila`).

| Row | Column | Action |
|---|---|---|
| Darbar Abul Muali Qadri | `category` | set to `Muslim Shrine` — still 'Islam' in the snapshot — out-of-schema fix still needed |
| Shaktipeeth Shri Hinglaj Mata Mandir | `category` | set to `Hindu Temple` — category cell still empty (legacy-column fallback in use) |
| Darbar Abul Muali Qadri | `silsila_note` | set to `Not stated as an order. Q5 answers the *silsila* question with descent and pe…` — moved verbatim from silsila |
| Darbar Abul Muali Qadri | `silsila` | clear the cell — cleared — prose moved to silsila_note |
| Darbar Malik Ahmad Ayaz | `silsila_note` | set to `As recorded: "Ahl e Sunnat - Ghaznavi silsila"` — moved verbatim from silsila |
| Darbar Malik Ahmad Ayaz | `silsila` | clear the cell — cleared — prose moved to silsila_note |
| Darbar Hazrat Shah Gohar Peer | `silsila_note` | set to `Not given as a Sufi order in the survey. The sect field reads "Ahl e Sunnat -…` — moved from silsila (row absent from snapshot — value from the authored entry file / 18 Aug patch) |
| Darbar Hazrat Shah Gohar Peer | `silsila` | clear the cell — cleared — prose moved to silsila_note |
| Darbar Mian Qurban Ali Shah | `silsila_note` | set to `Survey answer as written: "Naqshbandi Majdadi - Ahl e Sunnat" — "Ahl e Sunnat…` — new note; the silsila CELL ITSELF stays as the sheet has it (row absent from snapshot, current cell unverifiable from here) |

The Shah Gohar Peer truncation restores from the 18 Aug patch are
unchanged and still pending — the full values are in the CSV (they
exceed table width): `site_type`, `principal_figure`, `Sufi Saint`,
`year_built_note`, `Events`, plus `category` = `Muslim Shrine` for
that row and Darbar Mian Qurban Ali Shah.

Sheet import settings if replacing wholesale instead: Replace current
sheet · comma separator · "Convert text to numbers, dates and
formulas" OFF.
