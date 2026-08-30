# Patch — `year_built_precision`, three rows

*Proposed 29 August 2026. Three cells, one column. Nothing else changes.*

## What this is

`year_built_precision` records **how well the archive knows a building date**. 165 of the 169
rows use a five-value vocabulary — `exact` (44), `unknown` (43), `circa` (41), `century` (35),
`range` (2). Three rows carry a *sentence* instead:

| Row | current value |
|---|---|
| Darbar Abul Muali Qadri | `Uncertain — field value is a Hijri day-and-year, not a building date` |
| Darbar Malik Ahmad Ayaz | `Uncertain — date derived from the figure's death date; calendar era not stated` |
| Shrine of Bibi Pak Daman | `uncertain / referent disputed` |

## Why this is safe, and why it is not "tidying away a qualification"

RULE 2 says a qualifying note is the most honest content in the archive and must not be
flattened into a clean value. **That is not what this does.** Every one of these three
sentences is *already* in `year_built_note` on the same row, at greater length, and this patch
does not touch that column. What is being removed is a duplicate of the note sitting in a
column that holds a code — where it also breaks any grouping, filter or count over precision,
because it is a category of one.

Read the three `year_built_note` values before importing. If any of them did **not** already
carry the explanation, do not import that row — tell me and I will withdraw it.

## Why `unknown` for all three

`unknown` is the vocabulary's existing word for "the archive does not know when this was
built", and that is exactly what each of the three notes concludes:

- **Abul Muali Qadri** — the founding answer is the saint's death date and the middle day of
  the *ʿurs*, so the sheet holds no construction date at all.
- **Malik Ahmad Ayaz** — the founding answer is character-for-character the death date given
  in the life answer; the survey supplies no independent building date.
- **Bibi Pak Daman** — two traditions, six centuries apart, and the entry declines to choose.

**The honest alternative, if you prefer it:** add `disputed` to the vocabulary and use it for
Bibi Pak Daman. I did not propose that, because declaring a value nothing currently uses is a
promise the data does not keep — the reason the event vocabulary was cut from four values to
two (HANDOVER §9.106). If you add it, tell me and I will widen the guard in
`scripts/data/validate.mjs` to match.

## Import settings

Per RULE 3: **Replace current sheet, comma separator, "Convert text to numbers, dates and
formulas" OFF.** This patch is two columns and touches three rows; it is meant to be applied by
hand rather than as a full-sheet replace.

## After importing

`npm run data:build && npm run data:validate` — the three warnings this patch exists to clear
are the only `year_built_precision` warnings in the run.
