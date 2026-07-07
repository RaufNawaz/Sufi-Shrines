# urdu-i18n — Urdu dictionary for Sufi Shrines

Authoritative English→Urdu translations for the app's **data layer** (names, places,
saints, categories, tour facets, dates). The UI chrome is already handled by
`src/lib/i18n/uiStrings.ts`; this fills the gap where the dataset has **no Urdu columns**.

See **`../URDU_IMPLEMENTATION_PLAN.md`** for how to wire this in and the full parity plan.

## Files

| File | Purpose |
|---|---|
| `urdu-dictionary.json` | Source of truth — structured, human‑readable sections. Edit here. |
| `shrine-translations.seed.json` | Flat `en → ur` map (538 entries) for runtime lookup. **Copy to `src/data/urdu-seed.json`.** |
| `shrine-translations.seed.js` | Same map as a `window.SHRINE_TRANSLATIONS = …` drop‑in. |
| `build_dictionary.py` | Regenerates the two seed files from the source dict; validates coverage. |
| `_shrine_rows.json` | Snapshot of the 143 shrine rows used to build/validate. |

## Coverage (100% of current structured data, 0 Latin‑script leaks)

- categories 3 · traditions 3 · tour regions/themes/eras 3+3+3
- place tokens 243 · shrine names 143 · saints 123 · founded phrases 86 · full locations 123 · Sufi glossary 49
- flat seed: 538 entries

## Conventions

- **Numbers stay Western** inside values; convert to Eastern (۰–۹) at render time via the numeral toggle (Phase 2 of the plan). This keeps the toggle reversible.
- "Shrine of X" → مزارِ X · "Tomb/Mausoleum of X" → مقبرہ X · Dargah → درگاہ · Gurdwara → گوردوارہ · Temple/Mandir → مندر.
- Honorifics transliterated per `../data/glossary.csv` (حضرت، پیر، خواجہ، سید، شاہ، بابا).
- Locations composed with Urdu class‑word order (ضلع X، X کے قریب) and the Urdu comma ،.

## Regenerate (after adding shrines)

```
cd urdu-i18n
python3 build_dictionary.py
```

Prints a coverage report and **fails loudly** if any value still contains Latin letters,
or if a saint/location/founded string in the data has no translation. Wire this check into
`npm run data:validate` so Urdu parity can't silently regress.
