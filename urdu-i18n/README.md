# urdu-i18n — Urdu translations for Mapping the Shrines of Pakistan

Authoritative English→Urdu translations for the app's **data layer** (names, places,
saints, categories, tour facets, dates) plus the **Urdu article content** pipeline. The
UI chrome is handled by `src/lib/i18n/uiStrings.ts`; this folder covers everything the
dataset itself needs in Urdu.

See **`../docs/planning/URDU_IMPLEMENTATION_PLAN.md`** for the full parity plan (now
implemented — kept for history).

## Files

| File                                   | Purpose                                                                                                                                              |
| -------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `build_dictionary.py`                  | **Source of truth. Edit the `PLACE_TOKENS` / `SHRINE_NAMES` / `SAINTS` / `FOUNDED` dicts here.**                                                     |
| `urdu-dictionary.json`                 | **Generated — do not edit.** A readable dump of the Python dicts, overwritten on every build.                                                        |
| `shrine-translations.seed.json`        | Flat `en → ur` map (566 entries) for runtime lookup. Synced to `src/data/urdu-seed.json`.                                                            |
| (same script)                          | Regenerates both the JSON dump and the flat seed, and validates coverage. `--check` validates only (no writes) — wired into `npm run data:validate`. |
| `content/`                             | Per‑shrine Urdu article markdown (163 files, one per site — AI‑translated drafts pending human review).                                              |
| `build_urdu_content.py`                | Builds `src/data/urdu-content.json` from `content/`.                                                                                                 |
| `build-all.sh`                         | Full pipeline (`npm run urdu:build`) — see workflow below.                                                                                           |
| `update_log.py` / `TRANSLATION_LOG.md` | Regenerates / records per‑shrine translation + review status.                                                                                        |
| `_shrine_rows.json`                    | Snapshot of the shrine rows used to build/validate the dictionary.                                                                                   |
| `_english_descriptions.json`           | English source descriptions used by the content pipeline.                                                                                            |

## Coverage (validated on every build, 0 Latin‑script leaks)

- categories 3 · traditions 3 · tour regions 5 · tour themes 7 · tour eras 7
- place tokens 243 · shrine names 143 · saints 141 · founded phrases 86 · full locations 123 · Sufi glossary 49
- flat seed: 566 entries
- **every principal figure in the knowledge graph has an Urdu name** (136/136), asserted by
  `src/lib/i18n/__tests__/kgNameCoverage.test.ts`. 18 of those were added on 20 August 2026
  and are unreviewed drafts — see the note in `build_dictionary.py`'s `SAINTS`.
- article content: 163/163 shrines have an Urdu description (machine‑translated,
  `reviewed=false` until a human signs off — see `TRANSLATION_LOG.md`)

Coverage is validated against the `_shrine_rows.json` snapshot; after adding shrines,
refresh the snapshot and rerun the build so new names/saints/locations are covered.

## Careful — the JSON is an output, not an input

`urdu-dictionary.json` reads like the place to add a translation, and this file used to say
so. It is not: `build_dictionary.py` holds the real dictionaries and **rewrites the JSON from
them on every run**, so an edit made in the JSON is silently discarded the next time anyone
builds. Nothing errors; the entry simply vanishes. Add translations to the Python dicts and
run `npm run urdu:build`, which also syncs `src/data/urdu-seed.json` — the file the app
actually loads. (Step 1 alone writes `urdu-i18n/shrine-translations.seed.json` but does _not_
sync it, so a dictionary change made with `npm run data:build:urdu` will not reach the app.)

## Conventions

- **Numbers stay Western** inside values; convert to Eastern (۰–۹) at render time via the
  numeral toggle. This keeps the toggle reversible.
- "Shrine of X" → مزارِ X · "Tomb/Mausoleum of X" → مقبرہ X · Dargah → درگاہ · Gurdwara → گوردوارہ · Temple/Mandir → مندر.
- Honorifics transliterated per `../data/glossary.csv` (حضرت، پیر، خواجہ، سید، شاہ، بابا).
- Locations composed with Urdu class‑word order (ضلع X، X کے قریب) and the Urdu comma ،.

## Workflow

Full rebuild (what `npm run urdu:build` / `build-all.sh` does):

1. `build_dictionary.py` — rebuild `shrine-translations.seed.json` from the source dict.
2. Sync the runtime seed → `src/data/urdu-seed.json` (what the app loads).
3. `build_urdu_content.py` — rebuild `src/data/urdu-content.json` from `content/`.
4. `update_log.py` — refresh `TRANSLATION_LOG.md`.

Dictionary only: `npm run data:build:urdu` (equivalent to `python3 urdu-i18n/build_dictionary.py`).

Check without writing (runs in CI as part of `npm run data:validate`):

```
python3 urdu-i18n/build_dictionary.py --check
```

Every builder prints a coverage report and **fails loudly** if any value still contains
Latin letters, or if a saint/location/founded string in the data has no translation —
so Urdu parity can't silently regress.
