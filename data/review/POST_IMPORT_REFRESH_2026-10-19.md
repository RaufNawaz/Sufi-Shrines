# Post-import refresh list — re-measured 19 October 2026 (HANDOVER §9.373)

The §9.346 list ("what a committed `npm run data:build` refresh would break") was measured on
15 October against `data/import_2026-10-15.csv` as it stood then. Since then the working file has had
the Location/Description meta patch, the Urdu fixes, the as-printed sweep and the Urdu-out-of-prose
pass, so this firing measured it again, against the frozen snapshot `data/import_2026-10-18d.csv`
(md5 `8e07190e`, identical to the working file `data/import_2026-10-15.csv` at the time of the run).

**Method.** A tarball of the repo (minus books, out, media, node_modules, .git, pipeline/gis; md5
`c296281a`) was unpacked in the cloud; `npm ci`; `data:validate` run step by step on the tree as it is
(**all 20 steps exit 0**); then `build-dataset.mjs` pointed at the snapshot through a local HTTP server
(`VITE_CSV_URL`), and every step of `data:validate` run again. Nothing on the Mac was rebuilt; no
generated file was written back.

## After the refresh: 11 of 20 steps fail

| step | result | kind of fix |
|---|---|---|
| `validate.mjs` | **318 rows have no `provenance.json` entry** | **decision** (below, Q1) |
| `build_dictionary.py --check` | `urdu-i18n/_shrine_rows.json` lacks the 318 rows | mechanical refresh |
| `urdu_content_qa.py` | under-coverage 94 vs budget 0; two "2026" figures Urdu-only (peer-makki, shah-inayat) | **decision** (Q2) |
| `build-order-prose.mjs --check` | orderProse stale | mechanical: re-run the builder (it ran clean in the cloud, 17 passages, and its 3 orderProse quote failures then cleared) |
| `build-traditions.mjs --check` | `nath ← tilla-jogian`: marker "It became the principal seat of the" gone | one-line marker change, proposed below |
| `verify-kg-proposals.mjs` | **51 quotes no longer verbatim in 27 rows** (was 39 in 24 on 15 Oct) | 3 clear by order-prose re-run; **48 re-anchored by proposal** (below) |
| `validate-publication-safety.mjs` | 5 false positives | **FIXED in the check this firing** (below) |
| `export-jsonld.mjs` / `export-rdf.mjs --check` | stale | mechanical: `npm run data:export`, which first needs `validate.mjs` green (provenance) |
| `data:review:figures:check` | 318 rows not in the figure-identity worksheet | mechanical: `npm run data:review:figures` (ran clean in the cloud; verdicts carried by id) |

`validate.mjs` also prints 434 warnings: the 318 new rows' "no Description or Events text" is a warning,
not an error, under the current rules.

**Dependency order for the refresh:** provenance (Q1) → `data:build` → `build-order-prose` →
`reanchor_kg_quotes.py --write` → traditions marker → `data:kg` / `data:export` →
`data:review:figures` → Urdu refresh (`_shrine_rows.json`; under-coverage per Q2) → `data:validate` exit 0.

## Fixed this firing: publication-safety false positives (CLAUDE.md RULE 4 — fix the check)

The five hits were all the archive reporting history or quoting verse: "ordered his Sikhs to **ask God**
always for victory" (Chhevin Patshahi, Mozang), "**asking God** to command the earth" (Bibi Pak Daman),
"**asking God** to make Sindh flourish" (Panchmukhi Hanuman, Karachi), "has Amar Das **ask Ram Das** to
move" (Guru Ram Das Ji), and the verse line "**Ask Waris** the poet, he knows this well." (Waris Shah).
The colleague-directive rule now ignores a match whose object is God/Allah/Khuda/Lord, one inside a
double-quoted span of the same paragraph, and one whose verb directly follows a capitalised word (a named
narrative subject). The rules moved to `scripts/data/lib/publicationSafetyRules.mjs` (+ `.d.mts`) so they
can be tested; `src/lib/data/__tests__/publicationSafety.test.ts` gains two tests: the original
20 August note ("— ask Saifullah for a precise pin when possible.") and three variants still FAIL the
gate, and the five sentences above pass. Measured: the gate exits 0 on the refreshed data and on the tree
as it is; vitest 5/5; `npm run typecheck` 0; `npm run lint` 0; `prettier --check` clean on the changed
files (the five files `format:check` flags were flagged before this change).

## Proposed, not applied: 48 KG quotes re-anchored

`data/review/KG_QUOTE_REANCHOR_2026-10-19.tsv` — one line per quote (file, JSON path, source row, old
quote, new quote). Every new quote is a verbatim run of the REFRESHED row (checked with the verifier's own
normalisation) and at most 200 characters; every claim it supports is unchanged. Most are the same
sentence after the meta pass ("per the survey" → "reportedly", "the survey gives as" → "reported as",
dashes → commas) or a quote that used to run on across a `## ` heading, now cut at its sentence end.
Files: lineage 9, order 4, saint dates 22, kg-seeds 13 (kinship, adjudications, notes).

Apply ONLY after the refresh: `python3 pipeline/reanchor_kg_quotes.py data/review/KG_QUOTE_REANCHOR_2026-10-19.tsv`
(dry run: exit 0 on the cloud copy, all 48 located), then `--write`, then `node scripts/data/verify-kg-proposals.mjs`.
The tool replaces exactly one JSON string per line (the one at that path; the same sentence is also quoted
in unchecked sections such as `contradictions`, which it leaves alone) and refuses if the edited file
would differ anywhere else. **Not run with `--write` here.**

Lines to look at: `dates[9]` Wasif Ali Wasif (old quote ran birth + father; new is the birth sentence
only), `dates[12]` Muhammad Zaman (death sentence only), `dates[72]` Zanjani (birth now "he was a
Hussaini Syed, born in 958 CE in Zanjan", from "The Life of the Saint", which opens "According to the
site's account"), `kinAdjudicated[26]` Shah Hussain (the kafi line now stops before the Urdu verse, which
the new text holds as a verse paragraph).

## Proposed: the traditions marker

`scripts/data/build-traditions.mjs` line 165: `'It became the principal seat of the'` →
`'Tilla Jogian became the principal seat of the'` (end marker unchanged; the passage now names its subject,
the builder's rule 1). Not edited.

## Questions for Rauf

1. **Provenance for the 318 new rows.** `validate.mjs` requires an entry for every row, and
   `build-provenance.mjs` adds one only for rows with an Urdu description. What should the entry say for a
   book-derived row — e.g. `Name`/`Location`/`Description` from the book line in
   `PATCH_new_rows_<slug>_*.csv`, method `book`? Or exempt `needs_review` rows from the rule?
2. **Urdu under-coverage, 94 vs budget 0.** The 94 rewritten Descriptions have old, short Urdu articles.
   Re-translate them in full (a large job), or set the budget to 94 for now (the check says never raise it)?
