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
cell. At the level that matters — the slug a figure's page lives at — **47 rows
would move, and 44 of the current 132 figure slugs would cease to exist.**

*Numbers from `node scripts/data/measure-figure-identity-columns.mjs`, re-run
28 August 2026.*

> **This paragraph said 49 and 46 for most of 28 August 2026, and both were
> wrong by the end of the same day.** They were right when written. Four commits
> later, `3c6fb1a` moved `"Guru Nanak and Bhai Mardana"` out of
> `saintMergeVariants` and into `saintCompositeFigures` — the fix that gave Bhai
> Mardana a node at all — and the measurement script knew about the first map and
> nothing about the second. From that commit it reported **50 and 47**, and three
> of the slugs it counted as retiring were whole composite cells slugified as
> though they named one person:
>
> ```
> guru-nanak-and-bhai-mardana
> guru-arjan-dev-and-guru-hargobind
> guru-nanak-dev-ji-associated-with-bhai-lalo
> ```
>
> No page has ever been served from any of them. A document whose purpose is to
> price a URL migration was pricing three URLs that do not exist.
>
> Nobody wrote a wrong number. A correct instrument was invalidated by a correct
> data fix, which is the sixth time this repository has recorded that shape. The
> structural fix: the arithmetic now lives in `scripts/data/lib/figureColumns.mjs`
> and is shared by the measurement script, the reviewer worksheet and
> `validate-kg-identity.mjs`, so the three cannot hold different definitions.
> Check 7 of that validator fails if any figure slug the analysis derives is not
> a node in `data/kg.json` — it was confirmed to exit non-zero by re-creating this
> exact regression and naming all three phantoms.
>
> *An earlier note here claimed the reverse of all this: that 50/47 came from a
> throwaway probe that split `;` without regard for parentheses, and that the
> committed instrument's 49/46 should be preferred. The paren-aware point is real
> and is why `splitFigureCell` exists, but it is not what separated 49 from 50.
> Removed rather than left standing, because a correction that misidentifies its
> own cause teaches the next reader to look in the wrong place.*

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

~~It was left alone because it is a layout decision on a shared component while
another session held the front end, not because it is hard.~~

**Closed 28 August 2026.** `ShrinePage` now renders one link per named figure for
the three composite rows, and one for the other 166. The approach differs from
the cheap path sketched above in one respect worth recording: names do **not**
come from `slugToLabel`. Deriving a display name from a slug happens to work for
`guru-arjan-dev` and produces "Shrine Of Baba Shah Kamal" elsewhere, and inventing
a name is the thing RULE 2 forbids. Instead `build-kg.mjs` emits
`data/kg-composite-figures.json` — 558 bytes, three shrines, the canonical name
beside each slug — which is cheaper than the alternative it was weighed against
(a name column on all 169 rows of `kg-shrine-figures.json` would ship every
figure's display string *and its Urdu*, undoing the saving that index exists to
make). `localizeRecordedName` does the Urdu, through the dictionary rather than
through the graph node's `nameUr`, because the page cannot import the graph.

The summary line shows the canonical names; the sheet's own cell stays verbatim in
the infobox, under the row's `figure_type` label. That division is deliberate and
guarded: the summary cannot render `Guru Nanak Dev Ji; associated with Bhai Lalo`
as two link texts without deciding what "associated with" attaches to, which the
sheet never said. `src/pages/__tests__/shrineCompositeFigures.test.tsx` fails if
the infobox ever stops rendering that cell, because at that point the page would
name these figures only in words the sheet did not use.

## What was done on 28 August without a decision

- The identical-name join (`saintIdentity.mjs`): 2 figures were 4 nodes.
- Five merge variants for the duplicate deities and Guru Nanak: 196 → 190 nodes.
- `saintDoNotMerge`: 11 merges decided against, quoted and enforced.
- `retiredSlugs`: no figure merge can silently retire a published URL again.
- The composite fan-out, once Rauf ruled on it (above).

None of those needed a decision about the column. **The column question above is
still open**, and it is the one thing in this document that has not been acted on.

---

## The worksheet — 28 August 2026

The reason this question kept not getting answered is not that it is hard in
principle. It is that answering it requires holding two columns, seventeen
merge-variant keys, a paren-aware split and 44 retiring URLs in mind at once,
across 169 rows, before the easy rows can even be recognised as easy.

```bash
npm run data:review:figures          # build data/review/figure-identity-review.csv
npm run data:review:figures:check    # fail if the worksheet is missing a row (in data:validate)
```

169 rows, one per sheet row, ordered so the scarce resource goes where a verdict
changes the answer. Every consequence on a row is mechanical — which slug the cell
produces, which URL stops existing, which merge key stops applying, which figure
splits apart. Nothing in it decides anything; `verdict` is empty in every row.

| priority | rows | what it is |
|---|---|---|
| 1 | 15 | Contested. A figure splits or joins, or a merge keyed only on the legacy cell stops applying, or `principal_figure` is empty. **`principal_figure` is not automatically the winner here.** |
| 2 | 39 | The slug moves. Mechanical, but each retires a published URL. |
| 3 | 115 | The cells agree, or differ only in wording. Confirm and move on. |

Fill `verdict` with `legacy`, `principal` or `custom`; `chosen_name` carries the
name when neither column is right. Verdicts are carried across regenerations by
`id`, whose digest is over both cells — so a recorded verdict survives a sheet
refresh and stops being carried exactly when the cells it judged have changed.

**The fifteen contested rows**, since they are the whole decision:

- **Kalka Cave Temple** — `kali` → `kalka-devi`, peeling one of Kali's three
  temples back off. The row where `principal_figure` is worse, and the reason
  "adopt the better column" is the wrong shape of answer.
- **Data Darbar** — `data-ganj-bakhsh` → `hazrat-ali-ibn-usman-al-hujwiri`. The
  archive's most linkable figure page, and the most expensive single redirect.
- **Tomb of Javindi Bibi** — `jalaluddin-surkh-posh-bukhari` → `bibi-jawindi`.
  Worth looking at first: the tomb is currently filed under a figure who is not
  the person buried in it, and `principal_figure` already says so.
- **Shaktipeeth Shri Hinglaj Mata Mandir** — `principal_figure` is empty. The one
  row where switching would leave a site with no figure at all.
- **Darbar Wasif Ali Wasif** — the `;` inside a parenthetical. Both cells are
  identical and correct; it is here only so nobody splits it later.
- Plus Bari Imam, Jhulelal ×2, Kali ×2, Odero Lal, Lakhi Shah Saddar, Jalaluddin
  Surkh-Posh Bukhari, Valmiki, and Gurdwara Chakki Sahib.

The other 154 rows are the reason the worksheet exists: they can be answered in a
sitting, and until now they were indistinguishable from the fifteen that cannot.

### The drafts — 28 August 2026

`draft_verdict` and `draft_rationale` are filled for 154 rows; **`verdict` is empty
in all 169 and `data:review:figures:check` still reports 0.** A machine proposing
an answer has reviewed nothing, and the two counts are kept in separate columns so
the queue cannot come to *look* reviewed — the failure `KG_REVIEW_WORKFLOW.md`
names.

| draft | rows | rule |
|---|---|---|
| `principal` | 147 | The slug does not move (115), or it moves and the name is the same: a title or descriptor leaves the slug, the curated cell gives a fuller form of the same name, or it is a respelling (32). |
| `needs-human` | 7 | The two cells name the figure *differently*. That is an identity claim and the sheet does not argue for it. |
| *(blank)* | 15 | Contested. Cases below. |

The rule draws on slug **tokens**, never on how similar the strings look. A
honorific-stripping matcher proposed 21 merges in this corpus and 19 were wrong.
Four rows the rules would have waved through are held back by name in
`FORCE_HUMAN`, each with its reason, so a regeneration re-applies the decision.

**The seven `needs-human` rows.** All are the same move — a widely-known epithet
retired in favour of a formal name — and it is a decision about how a reader finds
a page, not a normalisation:

```
kaka-sahib            -> syed-kasteer-gul
qalandar-baba-auliya  -> sayyid-muhammad-azeem-barkhiya
ganj-e-inayat-sarkar  -> pir-muhammad-inayat-ahmad-naqshbandi-mujaddidi
jahaniyan-jahangasht  -> sayyid-jalaluddin
bibi-pak-daman        -> the-six-bibis
guru-gurpat           -> baba-gurpat-sahib
pir-abdul-ul-karim    -> hazrat-hafiz-muhammad-abdul-karim
```

**`jahaniyan-jahangasht` is a second row where `principal_figure` is worse**, and
this document previously said there was only one. `Sayyid Jalaluddin` would stand
one suffix away from `Sayyid Jalaluddin Surkh-Posh Bukhari`, a different man whose
own row is in the contested fifteen. The legacy slug is unambiguous; the curated
one invites exactly the confusion the 19 wrong merges were made of.

---

## The fifteen contested rows are six decisions

Read as fifteen rows they look like fifteen judgements. They are not: several are
a *consequence* of one row elsewhere in the same cluster, and answering the parent
settles them.

### 1. Does Kalka Devi split off from Kali? — 3 rows

| row | today | under `principal_figure` |
|---|---|---|
| Kalka Cave Temple | `kali` | `kalka-devi` |
| Kali Bari Mandir | `kali` | `kali` |
| Kalat Kali Temple | `kali` | `kali` |

Only the first moves; the other two are flagged because their figure would lose a
temple. **For `principal_figure`:** the cell reads `Kalka Devi (Kali)`, and the
sheet distinguishing a local form from the pan-Indian goddess is a distinction a
machine should not flatten. **Against:** it undoes a merge made deliberately on
28 August, and leaves a one-temple figure beside a two-temple one where the
archive currently shows three together. This is the row the whole column question
was reserved for a human over.

### 2. Is Jhulelal one figure, and how many names does he have? — 3 rows

| row | today | under `principal_figure` |
|---|---|---|
| Darya Lal Mandir | `jhulelal` | `jhulelal-daryalal` |
| Jhollay Lal Mandir | `jhulelal` | `jhulelal` |
| Shrine at Odero Lal | `sheikh-tahir` | `sheikh-tahir-udero-lal` |

The first would split Jhulelal's two temples apart on a slug that is two names
joined (`jhulelal-daryalal`), which is not a form the archive uses anywhere else.
The third is a separate question the sheet raises itself: the legacy cell says
Sheikh Tahir is *"also revered as Udero Lal/Jhulelal"*. Whether that makes him the
same figure is a claim about devotion across two traditions and is exactly what
RULE 2 says not to resolve by tidying. Recommend deciding 1 and 2 together; both
turn on how much local variation a figure node should absorb.

### 3. What is the Tomb of Javindi Bibi filed under? — 2 rows

| row | today | under `principal_figure` |
|---|---|---|
| Tomb of Javindi Bibi | `jalaluddin-surkh-posh-bukhari` | `bibi-jawindi` |
| Shrine of Jalaluddin Surkh-Posh Bukhari | `jalaluddin-surkh-posh-bukhari` | `sayyid-jalaluddin-surkh-posh-bukhari` |

**Look at this one first.** The tomb is currently filed under a figure who is not
the person the tomb is named for; `principal_figure` says `Bibi Jawindi`. That is
not a naming preference, it is the archive attributing a woman's tomb to a man. If
any single row justifies the migration, it is this one — and it can be fixed on
its own, without the column decision, by adding a `saintMergeVariants`-style
correction for that row alone.

The second row is a plain honorific addition (`Sayyid`) and only appears here
because it shares the slug being vacated.

### 4. Three formal-name swaps on well-known epithets — 3 rows

```
Data Darbar               data-ganj-bakhsh  ->  hazrat-ali-ibn-usman-al-hujwiri
Bari Imam                 bari-imam         ->  sayyid-abdul-latif-kazmi
Shrine of Lakhi Shah Saddar  laki-shah-saddar -> syed-shah-sadaruddin-lakyari
```

Same shape as the seven `needs-human` rows, and here because each also drops a
`saintMergeVariants` key. `data-ganj-bakhsh` is the archive's most linkable figure
URL. `laki-shah-saddar` is additionally a *misspelling* the curated column fixes
(the shrine itself is "Lakhi"), so that one has an argument the other two do not.
**The trade in every case:** the formal name is the better record, the epithet is
what a reader searches for. `retiredSlugs` makes the old address a redirect rather
than a 404, so the cost is real but bounded.

### 5. Hinglaj Mata — `principal_figure` is empty — 1 row

The only row where switching leaves a site with **no figure at all**. Shaktipeeth
Shri Hinglaj Mata Mandir is one of the archive's most significant Hindu sites.
Whatever is decided about the column, this row needs the cell filled in the sheet
first; it is a data gap, not a naming question.

### 6. Two rows that need no decision at all — 3 rows

- **Darbar Wasif Ali Wasif** — both cells identical. Flagged only because the `;`
  sits inside a parenthetical, so it is here to stop a future reader splitting it.
  Nothing to decide; do not split.
- **Gurdwara Chakki Sahib** (`Guru Nanak Dev Ji` → `Guru Nanak`) and **Valmik
  Mandir** (`Bhagwan Valmik (Valmiki)` → `Valmiki (Bhagwan Valmik)`) — the slug is
  unchanged either way. Both are flagged only because their legacy cell is a
  `saintMergeVariants` key that would go dead. Adopting the column means deleting
  those two entries, which is bookkeeping.

**So the real queue is:** one row to look at first (Javindi Bibi), two clusters
that turn on a single principle (Kali, Jhulelal), one repeated trade-off across
ten rows (epithet vs formal name), one sheet gap (Hinglaj Mata), and three rows
that are bookkeeping.
