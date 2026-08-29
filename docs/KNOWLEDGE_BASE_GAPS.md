# What is missing from the knowledge base, and who can close it

_Measured 28 August 2026. Re-run with `node scripts/data/measure-kb-gaps.mjs`
(`--json` for the machine-readable form). **Do not quote the numbers below
without re-running** — three of them moved twice in the session that produced
this file._

The instruction that produced this document was "complete and bridge all the
gaps in the knowledge base". The first honest answer is a measurement, because
that phrase hides the distinction that decides who can do the work.

## The headline

| class | count | who can close it |
|---|---|---|
| **evidence** | 388 | Nobody at a keyboard. The archive does not record it. |
| **human-review** | 125 | A reader with the two worksheets. |
| **informational** | 17 | Nobody — a proxy with no true positives left. |
| **unread** | 5 | An agent, today. |
| **by-design** | 2 | Nobody. A rule working correctly. |

**73% of what is missing is missing because nobody recorded it.** Not because
the pipeline drops it, not because a column is unread, not because a slug is
wrong. That is the single most useful thing this measurement says, and it is why
a report that lumped the classes together would be actively harmful: it would
turn a field-research problem into a to-do list, and the way an agent "completes"
a to-do list of unrecorded facts is by supplying them from general knowledge.
`docs/allo_mahar_resolution.md` is 700 confident words about the wrong man,
assembled that way from real sentences about a real saint.

## What each class means

**`evidence`** — the archive holds nothing to read. 114 figures have no dates
because no date was recorded; 79 have no teacher or successor because the prose
names none; 135 have no order because the `silsila` column is populated on 52 of
169 rows. RULE 2 forbids filling these, and the only thing that closes them is a
source or a field visit.

**`human-review`** — 125 relations published `reviewed: false`. They are not
hidden: the site renders each with an "unreviewed" badge and the source sentence
beside it, which is the honest way to publish a machine reading. The verdicts
live in `data/review/kg-review.csv` (255 rows, 0 verdicts) and
`data/review/figure-identity-review.csv` (169 rows, 0 verdicts, 154 drafted).
See `docs/KG_REVIEW_WORKFLOW.md`.

**`unread`** — the value is in the archive and the graph does not read it. This
is the class an agent can close, and it is now down to **5**: three rows whose
`silsila` cell the graph did not turn into an edge (all three are prose or an
order the taxonomy lacks — see below), and two figure names whose Urdu exists
inside a reviewed string but cannot be lifted mechanically.

**`informational`** — 17 figure slugs of six words or more. The count is a proxy
for "a slug that swallowed a description", and every true positive is closed
(below). What remains is people with long names:
`shaikh-shihab-ud-din-abu-hafs-umar-al-suhrawardi` is nine words and all nine are
his name. **Do not shorten these** — inventing a shorter name for a real person
is the failure this document exists to keep separate from the work.

**`by-design`** — 2. Bhai Lalo and Bhai Mardana have no `figure_type` because
they are named *second* on a composite row, and the row's figure columns describe
the figure the cell leads with. Rori Sahib records `figure_type: "Sikh Guru"` and
Bhai Mardana was not a Guru. Listed so nobody "fixes" it.

## What was closed on 28 August, and what it cost

| | before | after |
|---|---|---|
| figures whose Urdu name resolves to Latin (recorded-name path) | 51 / 133 | 9 / 133 |
| figure slugs that are a name plus a description | 5 | 0 |
| figure URLs that are whole sentences | 21 | 17 (all real names) |
| `unread` gaps | 48 | 5 |

**Urdu names, 51 → 9.** `build_dictionary.py` now derives the bare name from a
glossed entry: `Shiva (Mahadev)` → `شیو`. Derived rather than hand-listed so it
keeps working as figures arrive, and deliberately narrow — the English key must
be exactly `<name> (<gloss>)` *and* the Urdu must itself end in a parenthetical,
or there is no way to know which part of the Urdu is the name. Both guards earn
their place: a looser rule takes `بھگوان والمیک` as the Urdu for "Valmiki" and
pairs "Guru Gobind Singh" with an entry about a different man. Cost: the seed
grew 80,452 → 88,485 bytes, paid only by Urdu readers (it is lazy-loaded).

**Descriptive cells, 5 → 0.** `saintDescriptiveCells` maps a cell that is a name
plus a clause to the name alone —
`malik-ahmad-ayaz-described-in-the-survey-as-slave-of-mahmud-ghaznavi-minister-and-governor-of-lahore`
is now `malik-ahmad-ayaz`. The clause is **kept as an altName**, so the surveyor's
own sentence is still on the figure's page and still searchable. Five published
URLs retire into `retiredSlugs` redirects.

That change bit three times on the way in, and all three are recorded because
each is a trap the next rename will hit:

1. **It created two duplicate figures.** The proposal path mints nodes
   independently of the sheet path and joins them by identical name; the
   proposals carry the *long* name, so shortening broke the join and
   `bhai-gurdas` existed twice, one node holding the site and the other the
   lineage. Symptom: a node count of 192 where 191 was right.
2. **It silently un-did an existing merge.** `shah-abul-muali-qadri` had been
   joined to the long-named node *because the names matched*. Both fixed by
   keying the identity index on `altNames` as well as `name` — still
   exact-after-normalisation, never similarity.
3. **`figureColumns.mjs` did not know the new rule** and derived five slugs that
   had just stopped being nodes. Caught by check 7 of `validate-kg-identity.mjs`,
   written that morning for exactly this and firing for the first time.

**And it recovered evidence the archive already held.** Malik Ahmad Ayaz's date
proposal is keyed on the slug `malik-ahmad-ayaz`, while his node was
`malik-ahmad-ayaz-described-in-the-survey-as-…`. The two never met, so the
proposal resolved to nothing and was dropped on every build. He now carries a
`biographySource` and a date precision that were in the repository all along —
the same shape as Bhai Lalo's birth year, which had nowhere to land until he had
a node.

## Still open, and what each one needs

- **Four orders the corpus names and the taxonomy lacks** — Azeemia, Malamatiyya,
  Rashidi, Shattari. Each is a `finding/order` row in the review worksheet with
  the source's own wording. Adding them needs a naming decision the existing five
  imply (`-iyya`) but do not settle, and for Rashidi the corpus explicitly
  declines to name a parent. A human call, small.
- **Three `silsila` cells the graph does not read** — one is prose that declines
  to name an order, one is `Ahl e Sunnat - Ghaznavi silsila`, one is `Malamati`.
  Two of the three become readable the moment the taxonomy above grows.
- **Two Urdu names that cannot be lifted mechanically** — `Lava`, whose reviewed
  entry leads with لو (Luv) where the English leads with Lava while another entry
  uses لاوا, and `Jain temple dedicated to Parshvanatha`, whose Urdu reverses the
  word order so no prefix of it is the name.
- **The 58 lineage-only figures with no Urdu name.** A recorded budget in
  `figureNameUrduParity.test.ts`, asserted as an upper bound so the debt can only
  shrink. Untouched by tonight's derivation, because their names appear in no
  glossed entry.
- **The two review queues**, 0 verdicts of 255 and 0 of 169.

## The rule this file is written to protect

An agent can close `unread`, `taxonomy` and `structural`. It cannot close
`evidence`, and the measure of a good night's work here is not how far the total
fell — it is that the 388 did not move, because moving it would have meant
making something up.
