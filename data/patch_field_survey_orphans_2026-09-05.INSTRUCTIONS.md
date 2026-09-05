# Patch — three entries publish field-survey content and cite no field survey

*Built 5 September 2026 from a live read of both sheets. Three rows. Read "What the numbers
say" before importing — the patch is smaller than the 26 August note that prompted it claimed,
and larger in one place. Revised the same day after two rulings: `year_built` is filled on two
rows, and Peer Makki gets a `silsila`.*

## What prompted it

`docs/responses_sync_2026-08-26.md` recorded three responses as "never merged": Shah Jamal,
Peer Makki, Mauj Darya Bukhari. Re-read against production on 5 September, that is **half
wrong, and the half matters.**

Most of each survey's content *is* in production, rewritten editorially — Shah Jamal's Damdama
and the princess who wanted it lowered, Peer Makki's prophecy to Khusro Malik, Mauj Darya's cook
sitting unharmed in the cauldron, and all three shrines' daily and *ʿurs* visitor counts, fact
for fact. What never arrived is the **attribution**: no `Shrines Project field survey` line in
the Bibliography, and `support_level` still `Source-seeded`, `info_level` still `Moderate`.
Sixteen surveyed entries beside them say where the same kind of content came from. These three
publish a fieldworker's account as though it came from nowhere — in an archive whose
distinguishing claim is provenance.

The exception is **Peer Makki**, where the "never merged" verdict was right: its survey
biography is 9,627 characters and carries a whole narrative the entry never had.

## What the patch changes

| Row | `Description` | Also |
|---|---|---|
| Shrine of Shah Jamal | 4,231 → 5,432 chars | `support_level`, `info_level`, `qa_note`, the three date columns |
| Shrine of Peer Makki | 3,724 → 7,472 chars | `support_level`, `info_level`, `qa_note`, `silsila`, the three date columns |
| Shrine of Mauj Darya Bukhari | 4,639 → 5,348 chars | `support_level`, `info_level`, `qa_note` |

The builder asserts per row that **exactly** those columns moved and no others.

Nothing already in an entry is deleted or reworded. Every insertion is attributed to the survey
in the sentence that carries it, and where the survey and the entry disagree **both accounts are
left standing** (RULE 2), with the disagreement recorded in `qa_note`:

- **Shah Jamal's family.** The entry has Hussaini Syed descent from Jalaluddin Surkh-Posh
  Bukhari; the survey has a migration from Kashmir to Sialkot to Lahore under a father named
  Syed Ahmad Shah. Not reconciled here. (The father's name is *corroborated inside the archive* —
  `shrine-of-baba-shah-kamal` gives the same name for the same man, and calls Shah Kamal the
  elder brother.)
- **Mauj Darya's title.** The entry derives *Mouj Darya* from the miraculous diversion of the
  Ravi; the survey derives it from his generosity and his state of ecstasy (*mouj*). Both now
  stand.
- **Shah Jamal as *Sakhi Sarwar*.** The survey gives this epithet for his open-handedness. It is
  also the name of a different saint with his own shrine in this archive (`sakhi-sarwar`, Dera
  Ghazi Khan). Recorded as the survey gave it, flagged as not an identification of the two.
- **Two dates for one department.** The Peer Makki survey says the Auqaf Department took charge
  in 1958; the Shah Jamal entry says 1960 for the same department at that shrine. Neither is
  independently checked here. Both are in the text, attributed.

## The two rulings of 5 September

All three surveys answer "in which year was this place built" with the saint's **death** year —
1671, 612 AH, 1604 — the exact confusion CLAUDE.md RULE 2 uses as its worked example. Asked
whether to fill `year_built` anyway, the ruling was **fill it, with the qualification carried in
`year_built_precision`**. Mauj Darya already carried 1604 and is untouched; the other two now read:

| | `year_built` | `year_built_precision` |
|---|---|---|
| Shah Jamal | `1671 (as given: "English Calendar Date : 1671"; the saint's death year, not a construction date)` | `Uncertain — date derived from the figure's death date` |
| Peer Makki | `1215 CE (as given in the form as a Hijri year; the saint's death year, not a construction date)` | `Uncertain — date derived from the figure's death date` |

That shape is not invented here. Four rows already answer this exact problem this way —
`darbar-malik-ahmad-ayaz` carries `1041 (as given: "8 August 1041")` under
`Uncertain — date derived from the figure's death date; calendar era not stated`, and
`darbar-abul-muali-qadri`, `darbar-mian-qurban-ali-shah` and `bibi-pak-daman` are the same idea.
`year_built_note` on these two rows held a *built-form* sentence rather than a date one; the date
explanation is prepended and that sentence kept verbatim, which the builder asserts.

**One detail worth keeping.** Peer Makki's cell says "as given in the form as a Hijri year" in
words and puts `612 Hijri` in the note rather than `612 AH` in the value. `firstGregorianYear` in
`src/lib/data/places.ts` deliberately skips any date cell containing `AH` — Hijri is not
comparable without conversion — so the compound form would have contributed *nothing* to the
shrine's place span, while the CE-only form contributes 1215.

Neither value plots on `/chronology`: `plainYear` accepts a bare `^\d{3,4}$` and nothing else, so
both rows stay "recorded but not placed", showing the text verbatim — the same treatment their
four siblings get, and the honest one.

**Peer Makki's `silsila`, empty until now, reads `Junaidi (Ahl-e-Sunnat)`** per the second
ruling. Both halves are sourced: *Junaidi* is this entry's own prose ("the esoteric path of the
Junaidi Sufi lineage, tracing back to the classical Baghdad master Junayd"), *Ahl e Sunnat* is the
survey's answer to the sect question. Prose in this column is established — eight rows carry a
qualifying clause, one in exactly this bracketed form.

It is worth recording that this **reverses an earlier reading**:
`data/kg-order-proposals.json` declined to give this figure an order at all — *"The row states the
affiliation it does have as 'its tradition is Syed and Ahl-e-Sunnat' — a sect and a descent claim,
not a silsila"* — and separately declined a "Junaidiya" order node proposed from Bibi Pak Daman's
prose. Naming the lineage the entry's own prose already names does not contradict either: the KG
holds no Junaidi order, so this cell records an affiliation rather than joining one. If the intent
is for him to appear on an order page, that needs a Junaidi order node and is a separate decision.

## What the numbers say after import

`support_level = Field-verified` goes 16 → **19**, and `info_level = Full` goes 16 → **19** —
which is exactly the number of live (non-`Delete`) responses in the form. Those two counts and
the response count have been out of step since the 16 August patch-based import bypassed the
9 August TSV; this closes the gap.

`pipeline/validate_shrines.py` run on the input and on the output differ by exactly three lines:

```
- Shrine of Mauj Darya Bukhari  WARN  expansion_ratio  761 words on 1 specific source(s)
- Shrine of Peer Makki          WARN  expansion_ratio  608 words on 1 specific source(s)
- Shrine of Shah Jamal          WARN  expansion_ratio  684 words on 1 specific source(s)
```

Three warnings gone, none added — because each row now cites a second source. No other row in
the file changes by a single byte; the builder asserts it.

## How to import

Two files, same content. Pick one:

- **`data/import_2026-09-05.csv`** — the whole sheet, 171 rows × 44 columns, with the three rows
  already updated. Import settings per RULE 3: **Replace current sheet, comma separator,
  "Convert text to numbers, dates and formulas" OFF.** This is the safer route: the three
  `Description` cells contain markdown with real newlines, and pasting those by hand is how they
  get flattened.
- **`data/patch_field_survey_orphans_2026-09-05.csv`** — three rows, ten columns
  (`Name`, `id`, `Description`, `qa_note`, `info_level`, `support_level`, `silsila`, `year_built`,
  `year_built_precision`, `year_built_note`), for a by-hand edit if you would rather see only what
  moved.

Regenerate either from the input sheet at any time:

```bash
python3 pipeline/build_survey_orphan_patch.py [data/live_sheet_2026-09-05.csv]
```

The builder refuses to write unless every anchor it edits occurs exactly once, asterisks stay
balanced, no newline is lost, no paragraph acquires a soft wrap, the citation is the single last
line, and every other row survives byte-identical — six invariants, each of them a way this
project has already lost prose.

## After importing

```bash
npm run data:build && npm run data:validate
npm run data:check:live      # expect zero row drift
```

Then `/about` recomputes its own coverage figures from the shipped data, so the 16 → 19 change
appears there without anyone editing a number.

## Still open after this

- **Mauj Darya Bukhari's photographs cannot be fetched by anyone.** The survey recorded ten;
  every Drive id returns not-found to an authenticated read, `pipeline/photo_manifest.tsv` already
  typed all twelve `id_not_in_drive`, and `data/new-photos-manifest.json` says so in its own
  `_deprecated` note. The `qa_note` in this patch records it. **The remedy is re-shooting**, and
  the row keeps its single Wikimedia image until then.
- **Peer Makki's `silsila` is empty** while its prose names the Junaidi lineage. Left alone: the
  survey's answer to the sect question is "Syed - Ahl e Sunnat", which is not a *silsila*.
