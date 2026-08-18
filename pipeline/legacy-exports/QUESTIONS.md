# QUESTIONS — blockers and items needing a human decision

_Repair session 2026-08-09. Nothing here blocked the pipeline; each item is flagged in-data via `needs_review` where applicable._

## 1. Row missing from shrines_field_patch.tsv: Shaktipeeth Shri Hinglaj Mata Mandir

The join (163 sheet rows vs 162 patch rows) left exactly one sheet row unmatched:

| Field | Value |
|---|---|
| Name | Shaktipeeth Shri Hinglaj Mata Mandir |
| Location | Hingol Balochistan National Park, Road، Asha Pura, Pakistan |
| Category | Hindu Temple |

- No patch row has a name resembling it (162/162 patch rows matched elsewhere, exact, no duplicates), so per instructions no match was guessed.
- The row keeps all original values; the 15 appended patch columns are empty; `needs_review = unmatched_in_patch`.
- **Question:** was Hinglaj Mata intentionally excluded from the field patch, or did a patch row go missing? This is one of the most significant Hindu pilgrimage sites in the archive, so it presumably wants `id`, `site_type`, `principal_figure`, etc. like the other 162.
- Side observation: its Location string contains an Arabic comma ("Road، Asha Pura") — looks like a Google-Maps copy artifact worth cleaning at source when the patch row is made.

## 2. Note (no action needed): the flattened-bibliography damage is absent from the current CSV export

The brief for the `build_sources_registry.py` fix said "Shrine of Bibi Pak Daman" reports 0 specific sources. On the current `shrines.csv` its bibliography has real newlines and reported **6 specific sources before any code change**; zero of the 163 rows carry a flattened bibliography. The damage evidently lived in the discarded TSV workflow (`shrines_clean.tsv`), not in this CSV export. The `" - "` fallback was implemented anyway and proven on a fixture reproducing the documented damage (1 mega-citation → 6 specific sources, hyphenated titles like *Bibian-e-Pak Daman* asserted unsplit), so the parser is protected if a flattened export ever reappears — but no data row needed it today.

## 3. Bibi Jawindi and Baha'al-Halim now share an exact coordinate

The instructed coordinates for Tomb of Javindi Bibi (29.238, 71.064) are byte-identical to the existing coordinates of Tomb of Baha'al-Halim — correct at ~110 m precision, since the two tombs stand side by side on the Uch Sharif Bukhari mound (the validator reports it as INFO `duplicate_coord`). If the front-end map can't render overlapping pins, one of the pair needs a higher-precision point from a source we don't have in hand; we did not invent one.
