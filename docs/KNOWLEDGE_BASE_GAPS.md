# What is missing from the knowledge base, and who can close it

_Measured 28 August 2026; **re-measured 30 August 2026**, and the instrument was
wrong twice. Re-run with `node scripts/data/measure-kb-gaps.mjs` (`--json` for
the machine-readable form). **Do not quote the numbers below without
re-running** — three of them moved twice in the session that produced this file,
and the whole `unread` class has since gone to zero._

The instruction that produced this document was "complete and bridge all the
gaps in the knowledge base". The first honest answer is a measurement, because
that phrase hides the distinction that decides who can do the work.

## The headline

| class | 28 Aug | **30 Aug** | who can close it |
|---|---|---|---|
| **evidence** | 388 | **365** | Nobody at a keyboard. The archive does not record it. |
| **human-review** | 125 | **123** | A reader with the two worksheets. |
| **informational** | 17 | **17** | Nobody — a proxy with no true positives left. |
| **taxonomy** | 2 | **2** | A human, in minutes — but read the quoted cell first. |
| **by-design** | 2 | **2** | Nobody. A rule working correctly. |
| **unread** | 1 | **0** | Closed. |

## The instrument was wrong twice, and both are recorded before the numbers

This document's own warning — *do not quote the numbers without re-running* —
turned out to understate the problem. Re-running on 30 August found two defects
in `measure-kb-gaps.mjs` itself, and one of them had been **reporting a solved
thing as unfixable**, which is the exact failure this document exists to prevent.

**1. `figure-no-urdu-name` was a false positive.** The check asked whether the
whole name appeared in `urdu-seed.json`. That is one of the *three* paths
`translateNameToUrdu` actually takes, and not the one that resolves most
figures. `bhai-biba-singh` was reported as class `evidence` — *nobody at a
keyboard can close this* — while the archive records the name as
`Bhai Biba (Beba) Singh`, the resolver drops parentheticals when it normalises,
and the Urdu page has read بھائی بیبا سنگھ the whole time.

The script now mirrors all three paths (exact lookup → word-level
`WORD_URDU_MAP` composition → the normalised name index), reading the constants
out of `urduFallback.ts` as text because a script outside `tsconfig` cannot
import from inside it. Mirrors drift, so
`src/lib/i18n/__tests__/kbGapsUrduAgreement.test.ts` asserts **set equality**
between this report's verdict and `localizeFigureName`'s, in both directions: a
mirror that is too permissive hides a real gap, one that is too strict invents
one. The class is now **0**, agreeing with `figureNameUrduParity.test.ts`, which
had been green the whole time and was right.

**2. `--json` silently truncated at 65,536 bytes.** The JSON branch ended with
`console.log(...)` then `process.exit(0)`. `process.stdout` is asynchronous when
it is a **pipe** and synchronous when it is a **file**, so
`measure-kb-gaps.mjs --json > file` wrote all ~92 KB while
`measure-kb-gaps.mjs --json | jq` got a document cut off mid-string — with exit
code 0. The redirect is what a person types by hand, so the failure could only
appear in automation, and it appeared as a JSON parse error a long way from its
cause. Fixed by removing the `process.exit`; the agreement test consumes the
pipe, so it cannot come back quietly.

**Neither was found by a gate.** Both were found by asking why a number had
changed. That is the same move that produced the two other findings of the same
session (HANDOVER §9.161, §9.162).

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
is the class an agent can close, and it went 48 → 1 → **0**. The last was
`Lava`, whose Urdu existed inside a reviewed string and could not be lifted from
it mechanically (the entry reads `لو (لاوا)، رام اور سیتا کے بیٹے` — the Urdu
leads with لو where the English leads with Lava, and another reviewed entry uses
لاوا for the same figure). That was a reviewer's call rather than a derivation,
and it has since been made.

**`taxonomy`** — 2, and the class is coarser than it sounds, so **read the cell
the report quotes** rather than the label. Both are figures with no order edge
whose `silsila` cell names nothing the taxonomy has:

- `malik-ahmad-ayaz` — `As recorded: "Ahl e Sunnat - Ghaznavi silsila"`. A name
  the archive hedges around; adding a Ghaznavi order on that basis would be
  reading a survey's caveat as a claim.
- `hazrat-syed-muhammad-khair-ul-deen` — `Not stated as an order. Q5 answers the
  *silsila* question with descent and personal affiliation…`. **The survey
  explicitly declines to name an order.** There is nothing to close here; the
  absence of the edge is the archive being accurate.

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
| figure cells that are a name plus a description | 6 | 0 |
| figure URLs that are whole sentences | 21 | 17 (all real names) |
| `unread` gaps | 48 | 1 |

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

- ~~**Four orders the corpus names and the taxonomy lacks**~~ — **closed.**
  Rashidi, Malamati, Azeemia and Shattari are in the taxonomy, each with a
  member, Urdu lifted from already-reviewed strings and no invented description.
  Slugs follow the sheet's own forms rather than the `-iyya` of the existing
  five, because a sheet value is a join key and a label is cosmetic (RULE 3);
  `retiredSlugs` makes a change of convention a redirect.
- **Two `silsila` cells that still produce no edge** — quoted under `taxonomy`
  above. Neither is a plumbing failure and one is the survey saying there is no
  order to name.
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
