# urdu-i18n — Urdu translations for Sufi Shrines

Authoritative English→Urdu translations for the app's **data layer** (names, places,
saints, categories, tour facets, dates) plus the **Urdu article content** pipeline. The
UI chrome is handled by `src/lib/i18n/uiStrings.ts`; this folder covers everything the
dataset itself needs in Urdu.

See **`../docs/planning/URDU_IMPLEMENTATION_PLAN.md`** for the full parity plan (now
implemented — kept for history).

## Files

| File                                   | Purpose                                                                                                                                      |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `urdu-dictionary.json`                 | Source of truth — structured, human‑readable sections. Edit here.                                                                            |
| `shrine-translations.seed.json`        | Flat `en → ur` map (548 entries) for runtime lookup. Synced to `src/data/urdu-seed.json`.                                                    |
| `build_dictionary.py`                  | Regenerates the seed from the source dict and validates coverage. `--check` validates only (no writes) — wired into `npm run data:validate`. |
| `content/`                             | Per‑shrine Urdu article markdown (163 files, one per site — AI‑translated drafts pending human review).                                      |
| `build_urdu_content.py`                | Builds `src/data/urdu-content.json` from `content/`.                                                                                         |
| `build-all.sh`                         | Full pipeline (`npm run urdu:build`) — see workflow below.                                                                                   |
| `update_log.py` / `TRANSLATION_LOG.md` | Regenerates / records per‑shrine translation + review status.                                                                                |
| `_shrine_rows.json`                    | Snapshot of the shrine rows used to build/validate the dictionary.                                                                           |
| `_english_descriptions.json`           | English source descriptions used by the content pipeline.                                                                                    |

## Coverage (validated on every build, 0 Latin‑script leaks)

- categories 3 · traditions 3 · tour regions 5 · tour themes 7 · tour eras 7
- place tokens 243 · shrine names 143 · saints 123 · founded phrases 86 · full locations 123 · Sufi glossary 49
- flat seed: 548 entries
- article content: 163/163 shrines have an Urdu description (machine‑translated,
  `reviewed=false` until a human signs off — see `TRANSLATION_LOG.md`)

Coverage is validated against the `_shrine_rows.json` snapshot; after adding shrines,
refresh the snapshot and rerun the build so new names/saints/locations are covered.

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
