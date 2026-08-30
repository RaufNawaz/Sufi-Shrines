# Patch — `site_type` holds prose on four rows, and one sentence is cut off

*Proposed 30 August 2026. Four rows, two columns. Read the last section before importing row 2 —
it needs a decision, not just an import.*

## What is wrong

CLAUDE.md's schema: **`site_type` is the built form — a short term; prose belongs in
`site_type_note`.** Four rows in production put a whole clause in `site_type` and leave
`site_type_note` empty:

| Row | `site_type` today | length |
|---|---|---|
| Darbar Abul Muali Qadri | `Shrine complex (tomb, mosque, graveyard; originated as a mosque and seminary)` | 77 |
| Darbar Hazrat Shah Gohar Peer | `Shrine (*darbār*) with adjoining mosque, in a residential area beside a` | 71 |
| Darbar Malik Ahmad Ayaz | `Tomb shrine (*mazār*/*darbār*) with an associated mosque in its vicinity` | 72 |
| Darbar Mian Qurban Ali Shah | `Tomb-shrine with adjoining mosque in the same courtyard, and a closed basement chamber beneath the tomb` | 103 |

The other 165 rows use a short term — `Temple` (38), `Complex` (34), `Dargah/Mazar` (31),
`Gurdwara` (31), `Mausoleum/Memorial` (15), `Khanqah` (10) and five singletons.

**Why it is not cosmetic.** A category of one cannot be grouped, filtered or counted. These four
rows drop out of any breakdown by built form — which is exactly what `/typology`, the "Atlas of
Built Forms", is for.

## What the patch does

Moves each clause **verbatim** into `site_type_note`, and puts a short term in `site_type`. No
word of the prose is lost or rewritten.

The short terms are my proposal and the one genuinely editorial part of this. `Complex` for Abul
Muali because its own clause leads with "Shrine complex"; `Dargah/Mazar` for the other three
because each is a tomb-shrine with an associated mosque, and that is the vocabulary's existing
term for it. **If you would rather Ayaz and Mian Qurban Ali Shah were `Tomb-shrine`** — also in
use, on three rows — say so and I will re-cut it; the distinction between `Dargah/Mazar` and
`Tomb-shrine` is not one I can find a rule for in the existing data.

## Row 2 needs a decision: the sentence is truncated

`Darbar Hazrat Shah Gohar Peer`'s value ends **mid-phrase**:

> Shrine (*darbār*) with adjoining mosque, in a residential area beside a

It is cut after "beside a". This is **not** a display truncation — it is 71 characters in the
sheet and the same 71 characters in `entries/entry_shah_gohar_peer.md` line 87, so the loss
happened when the entry was drafted, before any import.

**The patch carries the truncated text through unchanged, on purpose.** Completing someone's
half-finished sentence is authoring, and RULE 2 is explicit. But the archive does hold what it
was almost certainly going to say — the survey transcript, `entries/survey_shah_gohar_peer.md`
line 106:

> In the surroundings of your shrine, there is a **residential area and a graveyard**, due to
> which there remains a rush of people…

and the drafted entry's own prose, line 10: *"residential area and graveyard surround the site."*

So the missing word is almost certainly **graveyard**. That is a judgement for you, not for me.
Either finish it in the sheet as `…in a residential area beside a graveyard`, or leave it and
I will add a `qa_note` recording that the value is truncated at source — an honest broken
sentence being better than a confident invented one.

## Import settings

Per RULE 3: **Replace current sheet, comma separator, "Convert text to numbers, dates and
formulas" OFF.** Four rows, three columns — applied by hand rather than as a full-sheet replace.

Two of these four rows (`Darbar Hazrat Shah Gohar Peer`, `Darbar Mian Qurban Ali Shah`) exist in
production and **not** in `data/shrines.json`, which is still on 169 rows — see HANDOVER §9.156.
Import this patch and the category patch, then `npm run data:build`, and both problems clear
together.

## After importing

`npm run data:build && npm run data:validate`, then `node scripts/data/measure-source-works.mjs`
is unaffected but `npm run data:check:live` should report zero row drift and zero off-schema
categories.
