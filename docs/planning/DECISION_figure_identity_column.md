# Decision needed — which column is a figure's identity?

*Measured 28 August 2026 against the 169-row committed snapshot. Nothing in this
document has been acted on; the three commits of 28 August fixed only what needed
no decision. Re-measure with `.scratch/measure_pf.mjs`-style probes before
quoting these numbers, per §9's standing rule.*

---

## The finding

`scripts/data/build-kg.mjs` builds every figure's identity from **`Sufi Saint`**,
the legacy column:

```js
const rawSaint = String(row['Sufi Saint'] ?? '').trim();
```

The schema's own column is `principal_figure` (CLAUDE.md § Schema: "Legacy
`Category`, `Sufi Saint`, `Founded/Opened` are still read as fallbacks"). It is a
*fallback* everywhere else and the primary source here.

**95 of 169 rows** have a `principal_figure` whose string differs from the legacy
cell. At the level that matters — the slug a figure's page lives at — **50 rows
would move, and 47 of the current 132 figure slugs would cease to exist.**

This is the mechanism behind the "86 of 169 diverge" note recorded on
26 August (`e605274`). That note described the symptom for consumers; this is
where it comes from.

## Why `principal_figure` looks like the better column

It is visibly the curated one:

| row | legacy `Sufi Saint` | `principal_figure` |
|---|---|---|
| Garh Maharaja | `Sultan Bahoo` | `Sultan Bahu` |
| Gurdwara Baoli Sahib | `Guru Arjan Dev (fifth Sikh Guru)` | `Guru Arjan Dev` |
| Chhevin Patshahi ×2 | `Guru Hargobind (Sixth Guru)` / `(Sixth Guru / Chhevin Patshahi)` | `Guru Hargobind` (both) |
| Kali Bari Mandir | `Goddess Kali` | `Kali` |
| Gori Temple | `Jain temple dedicated to Parshvanatha (23rd Tirthankara)` | `Parshvanatha (23rd Tirthankara)` |

Consistent spelling, epithets moved out of the name, and — the interesting part —
a **`;` convention for a row that names two figures**, which the schema's single
`principal_figure` otherwise cannot express:

```
Gurdwara Panjvi Chati Patshahi     Guru Arjan Dev; Guru Hargobind
Gurdwara Khoohi Bhai Lalo          Guru Nanak; Bhai Lalo
Gurdwara Rori Sahib                Guru Nanak; Bhai Mardana
```

Four of the six duplicate figure nodes closed on 28 August were closed by copying
what `principal_figure` already said. The column was right and unread.

## Why it is not a free win

Four things break, and the last two are the reason this is a decision and not a
patch.

**1. 47 figure URLs disappear.** Each is prerendered and in the sitemap. Among
them `data-ganj-bakhsh` → `hazrat-ali-ibn-usman-al-hujwiri`: the archive's
best-known figure, whose page address is the one most likely to be linked from
outside. `retiredSlugs` (added 28 August) makes this survivable rather than free —
every retirement becomes a redirect — but 47 redirects is a migration, not a
tidy-up.

**2. Ten of the seventeen `saintMergeVariants` keys stop applying.** They are
keyed on the raw cell, and ten of those strings exist only in the legacy column:

```
Bari Imam (Shah Abdul Latif Kazmi)      Goddess Kali            Guru Nanak Dev Ji
Bhagwan Valmik (Valmiki)                Goddess Kali (Kalka Devi)
Hazrat Data Ganj Bakhsh (Ali Hujwiri)   Guru Nanak and Bhai Mardana
Jhulelal / Daryalal (Zinda Pir)         Laki Shah Saddar (…)
Sheikh Tahir (also revered as Udero Lal/Jhulelal)
```

Switching the column silently un-merges every figure they join, including four of
the six joined on 28 August. The map has to be rekeyed in the same commit.

**3. The `;` cannot be split naively.** `darbar-wasif-ali-wasif` has

```
Hazrat Wasif Ali Wasif Awan (born Muhammad Wasif Awan; "Wasif" was his pen name/takhallus)
```

— a semicolon *inside a parenthetical*. Splitting on `;` yields
`hazrat-wasif-ali-wasif-awan-born-muhammad-wasif-awan` and
`wasif-was-his-pen-nametakhallus`, two nodes that are not people. Any split must
be parenthesis-aware, and the guard for it must be a test over all 169 rows
rather than a spot check.

**4. `principal_figure` is worse in at least one row.** Kalka Cave Temple:

| | |
|---|---|
| legacy | `Goddess Kali (Kalka Devi)` → joins Kali's three temples |
| `principal_figure` | `Kalka Devi (Kali)` → splits one back off as `kalka-devi` |

So the migration is not "adopt the better column". It is a row-by-row
reconciliation with a per-row winner, which is exactly the shape of work this
project reserves for a human.

## The composites, which are the same decision one step on

Two figure nodes in the graph are not people:

```
guru-arjan-dev-and-guru-hargobind             'Guru Arjan Dev & Guru Hargobind'
guru-nanak-dev-ji-associated-with-bhai-lalo   'Guru Nanak Dev Ji; associated with Bhai Lalo'
```

Consequence, checked: **Gurdwara Panjvi Chati Patshahi appears on neither Guru
Arjan Dev's page (2 shrines) nor Guru Hargobind's (5).** It is on a third page
belonging to a man who never existed. "Panjvi Chati Patshahi" means *fifth and
sixth Guruship*; the site commemorates both, and `principal_figure` says so.

There is an existing precedent, and it loses information:
`'Guru Nanak and Bhai Mardana' → 'Guru Nanak'` in `saintMergeVariants` collapses
a composite to its first figure and drops the second. Following it for these two
is consistent and cheap. Fanning out instead — one shrine, two `buried_at` edges,
both figures' pages — is more faithful and `data/kg-shrine-figures.json` already
maps each shrine to an *array*, so the shape supports it.

`bhai-lalo` would need a node of its own; the corpus gives him a birth year
(1452), per `nameCollisions` in `data/kg-saint-dates-proposals.json`.

**Three options, in order of cost:**

| | what it does | cost |
|---|---|---|
| **A** collapse to the first figure | follows the Mardana precedent | 2 lines; loses Hargobind and Bhai Lalo |
| **B** fan out from a declared composite map | both figures get the shrine | ~80-line loop refactor in `build-kg.mjs`; needs a Bhai Lalo node |
| **C** leave them | nothing regresses | 2 nodes remain that are not people |

Recommendation: **B**, and only as part of the `principal_figure` reconciliation
above — the `;` convention is the sheet asking for it, and doing the two
separately means parsing the same column twice under two different rules.

## What was done on 28 August without a decision

- The identical-name join (`saintIdentity.mjs`): 2 figures were 4 nodes.
- Five merge variants for the duplicate deities and Guru Nanak: 196 → 190 nodes.
- `saintDoNotMerge`: 11 merges decided against, quoted and enforced.
- `retiredSlugs`: no figure merge can silently retire a published URL again.

None of those needed this decision. Everything above does.
