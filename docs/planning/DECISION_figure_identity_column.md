# Decision needed — which column is a figure's identity?

*Measured 28 August 2026 against the 169-row committed snapshot. Re-run with
`node scripts/data/measure-figure-identity-columns.mjs`. Nothing in this
document has been acted on; the 28 August commits fixed only what needed no
decision. Re-measure before quoting these numbers, per §9's standing rule.*

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
cell. At the level that matters — the slug a figure's page lives at — **49 rows
would move, and 46 of the current 132 figure slugs would cease to exist.**

*Numbers from `node scripts/data/measure-figure-identity-columns.mjs`. They were
first written here as 50 and 47, off by one, because the throwaway probe that
produced them split `;` without regard for parentheses and so counted
`darbar-wasif-ali-wasif` as a row that moves. It does not. The committed
instrument splits paren-aware; prefer it over any number quoted from memory.*

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

**1. 46 figure URLs disappear.** Each is prerendered and in the sitemap. Among
them `data-ganj-bakhsh` → `hazrat-ali-ibn-usman-al-hujwiri`: the archive's
best-known figure, whose page address is the one most likely to be linked from
outside. `retiredSlugs` (added 28 August) makes this survivable rather than free —
every retirement becomes a redirect — but 46 redirects is a migration, not a
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
rather than a spot check. `measure-figure-identity-columns.mjs` splits
paren-aware for exactly this reason — and the first, naive version of that probe
is what put a wrong number (50/47) in the paragraph above.

**4. `principal_figure` is worse in at least one row.** Kalka Cave Temple:

| | |
|---|---|
| legacy | `Goddess Kali (Kalka Devi)` → joins Kali's three temples |
| `principal_figure` | `Kalka Devi (Kali)` → splits one back off as `kalka-devi` |

So the migration is not "adopt the better column". It is a row-by-row
reconciliation with a per-row winner, which is exactly the shape of work this
project reserves for a human.

## The composites — DECIDED 28 August 2026: fan out (option B)

**Rauf's ruling:** *"for figure identity just preserve as much information as you
can because sometimes it is multiple saints."* Implemented the same day; this
section is kept as the record of what the question was.

Three rows name two figures each, and every earlier handling lost one of the two:

```
Gurdwara Panjvi Chati Patshahi   Guru Arjan Dev; Guru Hargobind
Gurdwara Rori Sahib              Guru Nanak; Bhai Mardana
Gurdwara Khoohi Bhai Lalo        Guru Nanak; Bhai Lalo
```

Panjvi Chati Patshahi and Khoohi Bhai Lalo had become single nodes named after
both people, reaching neither real figure's page. Rori Sahib was worse: a
`saintMergeVariants` entry resolved "Guru Nanak and Bhai Mardana" to "Guru
Nanak", so **Bhai Mardana was absent from the graph entirely** — Guru Nanak's
lifelong companion, in an archive holding eighteen of his gurdwaras.

`saintCompositeFigures` in `kg-seeds.json` now maps each cell to the figures it
names, primary first. Guru Arjan Dev 2 shrines → 3, Guru Hargobind 5 → 6, Guru
Nanak 17 → 18; Bhai Mardana and Bhai Lalo have their own pages. Enforced by
check 5 of `validate-kg-identity.mjs`.

What is deliberately *not* fanned out, because the row does not say it: the
`figure_type`, `figure_born` and `figure_died` columns, and the `Events` cell.
Rori Sahib records `figure_type: "Sikh Guru"` and Bhai Mardana was not a Guru;
its `Events` reads "Guru Nanak Gurpurab". Those describe the figure the cell
leads with, and copying them across would assert what the sheet never said
(RULE 2).

### The one piece still open, and it is small

`ShrinePage` links only the **primary** figure. The visible label is the raw cell,
so a reader at Gurdwara Panjvi Chati Patshahi *sees* "Guru Arjan Dev (5th) & Guru
Hargobind (6th)" — no information is hidden — but only Guru Arjan Dev is
clickable. Guru Hargobind's page does list the gurdwara, so it is one hop less
direct rather than unreachable.

Deliberately not done here, and the cheap path recorded so nobody re-derives it:

- `figureSlugsForShrine(slug)` already returns **both** slugs (the index is
  `Record<string, string[]>` and three shrines now have two entries), so the data
  is on the route already.
- Names must **not** come from `src/lib/kg.ts`. It statically imports the 426 KB
  graph, and `kg-shrine-figures.json` exists precisely to keep it off the
  archive's hottest route — measured at 40% of `/shrine/<slug>`'s eager JS.
- The graph-free path is `slugToLabel` (a six-line pure function with no data
  dependency, currently living in `lib/kg.ts` — the move that commit `e605274`
  noted and deferred because nothing needed it) plus `localizeRecordedName`,
  which ShrinePage already imports and which is graph-free by design.
- The Urdu side is ready: `Bhai Mardana` → بھائی مردانہ and `Bhai Lalo` →
  بھائی لالو are in the dictionary as of 28 August, and
  `figureNameUrduParity.test.ts` holds archive figures at zero Latin titles.

It was left alone because it is a layout decision on a shared component while
another session held the front end, not because it is hard.

## What was done on 28 August without a decision

- The identical-name join (`saintIdentity.mjs`): 2 figures were 4 nodes.
- Five merge variants for the duplicate deities and Guru Nanak: 196 → 190 nodes.
- `saintDoNotMerge`: 11 merges decided against, quoted and enforced.
- `retiredSlugs`: no figure merge can silently retire a published URL again.
- The composite fan-out, once Rauf ruled on it (above).

None of those needed a decision about the column. **The column question above is
still open**, and it is the one thing in this document that has not been acted
on.
