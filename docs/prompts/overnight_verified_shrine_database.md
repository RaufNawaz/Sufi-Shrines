# Prompt: overnight, verify the one-source places with the local models, then build the verified shrine database

_Written 31 October 2026 for Rauf to paste into a separate Claude Code session opened in
`C:\Users\g16\Desktop\hybrid-worker` (the local-model manager). It runs unattended overnight. It
builds on `docs/prompts/hybrid_worker_shrine_existence.md` (stages A to C), which it must read first,
and adds the overnight rules and the final database (stage D)._

---

You are the manager in `C:\Users\g16\Desktop\hybrid-worker` (read its `CLAUDE.md` first; it binds you).
Tonight you work unattended. Rauf is asleep; nobody will answer a question until morning. Your job has two
parts:

1. **Verify** the one-source shrine places with the local model, following
   `C:\Users\g16\Desktop\Shrines Project\docs\prompts\hybrid_worker_shrine_existence.md` stages A, B and C
   exactly. Read that file now, in full.
2. **Build the finalized verified database** of shrines in the Shrines repository (stage D below).

Also read, in the Shrines repository (`C:\Users\g16\Desktop\Shrines Project`): `CLAUDE.md` (RULES 0 to 5
bind you there: never invent a value, never write to the Google Sheet, encode checks that fail loudly, write
everything into the repository), and `pipeline/gis/shrine_sources/district_counts/README.md` (what each
source is and how places were joined).

## What exists already (do not rebuild it)

- `pipeline/gis/shrine_sources/district_counts/sites.csv`: 4,346 records from five sources (archive,
  DOAM national inventory, OpenStreetMap tiers A/B/C, Wikidata, GeoNames), joined into 3,689 places
  (`place` column). Place ids are renumbered whenever that file is rebuilt; **do not rebuild it tonight**,
  so the ids you work with stay valid.
- `pipeline/gis/shrine_sources/existence_checks/places_to_confirm.jsonl`: the 3,376 named places that only
  one source records (export them again with `export_places_to_confirm.py` beside it only if it is missing).
- Rauf's rule (30 October 2026): **a place two independent sources record is verified.** OSM's weak tier C
  counts as OSM, so OSM never confirms itself.
- The archive (`data/shrines.csv`, 489 rows, 169 with a pin): its own rows, with `support_level`.

## Overnight rules

- **Pilot before volume.** Stage A on 20 places, then stage B `--sample 2`, then the 50-place pilot with
  your own check of 20 (the prompt above says how). Only if at most 2 of 20 verdicts are wrong, start the
  full run. If the pilot fails twice after fixing the instruction, stop the verification, and build stage D
  from what exists (verified places only), saying so.
- **Long runs in the background, resumable.** Run `gather_evidence.py` and `worker.py run` as background
  processes, logging to files under `workspace/out/`. Check on them every 20 to 30 minutes by reading the
  progress line count and the log tail, never by reading outputs wholesale. If a process dies (Ollama
  restart, a crash), restart it; both must skip work already done. Write a one-line status with the time to
  `workspace/out/overnight_status.md` at every check, so the morning shows what happened when.
- **Measure throughput early.** After the pilot, estimate the full run from seconds per place. If it would
  not finish by 07:00 local time, process places in this order and stop cleanly where time runs out:
  DOAM-only, then OSM-only (tiers A/B), then Wikidata-only, then GeoNames-only, then OSM tier C. Say in the
  report which groups were done.
- **Politeness.** At most one request per second per host, a User-Agent naming the tool and
  `https://raufnawaz.github.io/Sufi-Shrines/`, every response cached. If an API starts refusing (HTTP 429
  or 403), back off for 15 minutes, then continue at half the rate; never work around a block.
- **Questions.** You cannot ask tonight. When something is Rauf's decision, choose the conservative option
  (the one that claims less), keep going with everything that does not depend on it, and list the
  question at the top of the morning report (RULE 5: it is asked when he returns, not filed away).
- **Never**: write to the Google Sheet; change `sites.csv`, `data/shrines.csv` or any file outside the
  folders named below; mark a place confirmed without a verbatim quote from an outside source; treat the
  database record's own page (OSM, GeoNames, DOAM, Wikidata entry) as evidence for itself.

## Stage D: the verified shrine database (in the Shrines repository)

Write `pipeline/gis/shrine_sources/verified_db/` with `build_verified_db.py` (Python standard library),
its outputs, and a `README.md`. The script reads `district_counts/sites.csv`, `data/shrines.csv`, and
`existence_checks/results/existence_results.csv` (stage C's output, if present), and writes:

- `shrines_verified.csv`: **one row per place**, every place of `sites.csv` included, with:
  `place_id, name, other_names, tradition, kind, lat, lon, coord_source, district_code, province,
  tier, n_independent_sources, sources, source_record_ids, source_urls, archive_id, archive_support_level,
  web_verdict, web_evidence_urls, web_evidence_quotes, in_final, note`.
- `shrines_verified.geojson`: the same rows with `in_final = yes`, as points.
- `shrines_verified_codebook.csv`: every column, its meaning and where it comes from.
- `verified_db_checks.csv`: every check below with its measured value.

**Tiers (`tier`), the conservative default; Rauf may change it in the morning:**

| tier | rule |
|---|---|
| `verified` | recorded by two or more independent sources (archive, DOAM, OSM, Wikidata, GeoNames; OSM tiers count once) |
| `archive_documented` | in the archive only, with `support_level` Field-verified or Source-documented |
| `web_confirmed` | one source, and the worker's verdict `confirmed`, with a verbatim quote and URL, surviving stage C's checks and spot check |
| `plausible` | one source, verdict `plausible` (the name matches, the locality is not shown) |
| `unconfirmed` | one source, verdict `no_evidence`, or not yet checked |
| `contradicted` | the verdict `contradicted` (demolished, moved, elsewhere) |

**What counts as a shrine (`kind`)**: from the worker's `kind` where it gave one with evidence, otherwise
from the sources' own tradition and type fields. Keep every kind in the file (secular tombs, mosques,
graveyards included, labelled); `in_final = yes` only for `verified`, `archive_documented` and
`web_confirmed` places whose kind is not `secular_tomb_or_memorial`, `mosque_only` or `graveyard`. Say how
many each exclusion removed.

**Coordinates**: the point of the most precise source (archive pin, then Wikidata, OSM, DOAM; GeoNames
only when it is the only source), named in `coord_source`. Never average across sources, never move a
point. Unpinned archive rows (no coordinates) stay in with empty `lat`/`lon` and `note` saying so.

**Checks that exit non-zero (RULE 4)**: every place of `sites.csv` appears exactly once; tier counts sum
to the place count; no `web_confirmed` row lacks a quote or a URL, and every such quote appears verbatim
in that place's gathered evidence; `n_independent_sources` recomputed from `sources` agrees; every
`in_final` row has a tier and kind that the rule above admits; no `lat`/`lon` outside Pakistan's box; the
208 places of two or more sources (as of 31 October) all carry `verified`, unless `sites.csv` has been
rebuilt (then say so); the archive's 169 pinned rows each appear once, under their `archive_id`.

**README**: what the database is; the tier table and the counts in each tier; how many places are in the
final set, by tradition and province; what "web_confirmed" rests on (the worker, its model, the pilot and
spot-check error rates); the limitations, above all that `unconfirmed` does not mean a place does not
exist (many rural shrines have no web presence; GeoNames records come from old maps); and how to rebuild.

Run `npm run verify` in the Shrines repository before committing; it must pass. Commit on the current
branch with the scope prefix `data:`, only the files you wrote (another session may have uncommitted work
in the same folder: stage paths explicitly, never `git add -A`), ending the message with
`Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`. Do not push.

## The morning report

Write `docs/research/VERIFIED_DB_OVERNIGHT_<date>.md` in the Shrines repository, append a dated section to
`docs/HANDOVER.md` §9 (take the next free number; parallel sessions append there too), link the new doc
from `docs/README.md` (a test fails on an unlinked doc), and leave the same report as your final message:

1. **Questions for Rauf first** (each with the conservative choice you made in the meantime).
2. What ran, and when (from `overnight_status.md`); what stopped early, and why.
3. Pilot and spot-check results: how many verdicts you would change, per verdict type.
4. Counts per tier and in the final set, by tradition and province; how many places moved from one source
   to `web_confirmed`.
5. Every check of stage C and stage D with its result.
6. Limitations, in plain words.
