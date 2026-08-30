# The knowledge-base council, 30 August 2026 — five lenses, twenty-nine findings

Five reviewers were briefed in parallel against the repository and the running site, each with
one lens and no overlap: **provenance and citation integrity**; **the knowledge graph — what it
asserts, omits and gets wrong**; **schema hygiene and invariant coverage**; **what the archive
knows and does not publish, and publishes and does not know**; **Urdu knowledge parity**. All
five were read-only. Each was given the same three rules — measure the instrument before
believing it, never invent content, and expect most of what you check to be fine — and each was
required to publish a **retraction section** alongside its findings.

This document is the record and the ranking. The five full reports, with every command and its
output, are in [`kb-council-2026-08-30/`](kb-council-2026-08-30/) — 2,300 lines of measurement
that this summary is not a substitute for.

It is the sibling of [`UX_COUNCIL_2026-08-30.md`](UX_COUNCIL_2026-08-30.md), which ran the same
method over the interface on the same day, and of the other session's
[`UI_COUNCIL_2026-08-30.md`](UI_COUNCIL_2026-08-30.md). Where the three overlap it is noted,
because two lenses reaching the same defect from opposite ends is the strongest signal any of
them produced.

---

## Why the retraction requirement is the load-bearing part

Between them the reviewers **killed at least sixteen findings by re-measuring**, and several of
those retractions are worth more than the findings that survived. Four are worth reading before
anything below is believed.

**The archive has two identifier spaces and both get called "slug".** The URL slug is
`buildStableSlug(name)` — `shrine-of-bibi-pak-daman` — and it is what `/shrine/:slug`, the
prerendered filename and the whole knowledge graph use. The `id` column is a different thing,
`bibi-pak-daman`, and it is the `public/photos/` directory name. **Three separate investigations
joined on `id` and got a dramatic false result**: the graph reviewer measured 14 graph slugs
"missing" from the dataset, the provenance reviewer measured "14 entries with no provenance
record and 14 orphan records", and the Urdu reviewer measured "16 shrines with no Urdu article".
All three are zero. What made the wrong key so convincing is that seven of the fourteen
mismatches are the protected photo slugs, so the error looked exactly like a slug rename.
`graphDatasetParity.test.ts` now pins the distinction.

**A term match is never evidence, and it arrived in three new costumes.** A keyword sweep of
every Description for the nine order names found ten rows stating an order the graph does not
carry. All ten sentences were read. **Zero are order statements.** `shrine-of-pir-chhatal-shah-
noorani` matched *"rashid"* on **Salman Rashid**, the travel writer whose Dawn piece is the
entry's source. `shrine-of-lakhi-shah-saddar` matched *"qalandar"* on **Lal Shahbaz Qalandar at
Sehwan**, a neighbouring shrine. `data-darbar` matched *"chisht"* on **Moinuddin Chishti keeping
a chilla at Hujwiri's tomb**. This is the "udasi matched Nanak's journeys" lesson, again.

**"161 of 169 Descriptions have changed" was 62.** The first pass normalised only whitespace and
produced a spectacular number — which should itself have been the warning. Stripping the known
`=====` separator artefact and smart quotes took it to 71; requiring the *word count* to have
moved took it to 62. HANDOVER §9 records that exact artefact affecting 87 entries. The lesson had
been written down and the reviewer hit it anyway.

**Any measurement of this app that does not wait for the dataset to settle is measuring the slim
index.** `/typology` in Urdu appeared to collapse to a single group. Re-measured with a settle
loop — two identical readings a second apart — it has 15 groups with counts identical to English.
`src/data/shrines-index.json` is a 169-row, 10-column index with no `site_type`; it paints first
and the live sheet replaces it. A fixed `wait(5s)` was measuring the placeholder.

Two more, briefly. The exports were **not** stale — both `--check` modes exit 0, which made the
memberships finding a live bug rather than a stale file, a worse answer and a different remedy.
And the JSON-LD `@context` "omitting `discipleOf`" omits only the *alias*; the exporter emits the
prefixed form and the prefix is in the context, so nothing is dropped — a narrower query than the
question.

The findings below are worth acting on **because** those were not.

---

## Shipped from the council

Eleven commits, all mutation-checked, `npm run verify` green at each.

| # | Finding | Commit |
|---|---|---|
| — | 48 measurements dated a day that had not happened, including in the catalogue of wrong measurements | `0c72998` |
| KB3‑6 | `pipeline/audit_coordinates.py` had a baseline, an exit code and no caller | `3206a7e` |
| KB3‑1 | The schema gates read `data/shrines.json`; the site ships `src/data/shrines-fallback.json`; nothing tied them, and `data:build` short-circuited on the wrong one | `9552e47` |
| KB3‑2 | `status` / `support_level` / `info_level` enforced by nothing — and `/about` counts 128 active sites where the archive holds 130 | `910b907` |
| KB3‑3 | The only hard error on a category rejected `Jain Temple`, `Nanakpanthi / Udasi Darbar` and `Secular / Memorial` | `692ef14` |
| KB3‑5 | Every kg guard compared the graph to another kg artefact, never to the dataset | `0debf21` |
| UI‑S3 | CLAUDE.md's "107 citing three or more sources" was 103 | `070f0ab` |
| KB3‑7 | "Eight slugs carry live photo URLs" — fifteen do, and the seven omitted serve exactly half the photographs | `df318c3` |
| KB3‑4 | The published schema described 11 of 44 columns and omitted every provenance one | `0c6cc49` |
| KB2‑1 | `.find()` flattened eleven compound silsilas out of the data release | `372709e` |
| KB1‑5 | The 544→533 correction reached one file of three, twice | `3801d99` |
| KB4‑1 | "Already withheld from every page" was never true of the payload | `48d355c` |

Three of these were found by two lenses independently: the published-descriptor hole (this
council's invariants lens measured the descriptor; the other session's measured the same gap from
the export end), the citation figure, and the coordinate-precision question.

---

## Queued, ranked by what a reader loses

Each item names the cost, so the ranking can be argued with rather than followed.

**1. The graph's place layer is a second, unguarded place vocabulary, and `/about` publishes its
count as a fact.** 103 of 169 sites are `containedInPlace` a node outside the archive's own closed
place vocabulary; **9 of the 94 place nodes are not places** — including ones named `district`,
`"and no coordinates."` and `"Road، Asha Pura"` — and Lahore's 35 sites are scattered across 14
nodes, the largest holding 13. The cause is `parseLocation` in `build-kg.mjs`, which splits
`Location` on commas; `src/lib/data/places.ts` opens by documenting that this exact technique does
not survive this data and replaces it with a closed 66-entry vocabulary that `build-kg.mjs` was
never moved onto. `/about` prints "94 places" from `kg-stats.json`. *(KB2‑2. The mechanical part
is an agent's; the published figure moves from 94 to roughly 66 and `located_in` becomes
many-to-many, so **the shape wants Rauf** — see below.)*

**2. The almanac tells a reader that 52 sites record no observance, and 51 of them do.** The
classifier's vocabulary knows ʿurs and mela and does not know Diwali, Holi, Janmashtami, Durga
Puja, Cheti Chand, Vaisakhi, Akhand Path or prakash. In an archive that spent August establishing
that it holds six traditions and that a Gurpurab is not an ʿurs, this is the same flattening one
layer down. *(KB4‑6, ranked first by its own reviewer.)*

**3. Four order memberships are asserted on figure and order pages with no source, no quote, no
sheet cell and no supporting prose anywhere in the archive — and they render as *more* trustworthy
than the machine-extracted ones beside them.** Rahman Baba → Chishtiyya, Sachal Sarmast →
Qadiriyya, Makhdoom Burhan-ud-Din → Suhrawardiyya, Sufi Shah Inayat Shaheed → Qadiriyya. Their
only basis is a bare `slug → orderSlug` map in `kg-seeds.json`. Because `reviewed` is *absent*
rather than `false`, `r.reviewed !== false` resolves true and no "unreviewed" chip appears — while
all 43 machine-extracted memberships carry a verbatim quote and a cited file. The presentation
inverts the truth. `build-kg.mjs`'s own `seeded-order-contradicts-sheet` guard is nested inside
`if (asRecorded)`, so the four seeds with no sheet basis at all are exactly the four it cannot
question. *(KB1‑1. The guard fix is an agent's; supplying the affiliations is not — RULE 2.)*

**4. `/about` says the archive rests on "464 distinct sources", and 57 of those are lines the
archive's own pipeline defines as placeholders.** One is a *withdrawal notice*: "Pending. Prior
source attribution for this entry has been withdrawn as unreliable." The separation exists, is
documented as load-bearing in three places, and is applied to the **badge** — in Python, offline,
writing TSVs nothing ships — and not to the **count**, which runs through `build-kg.mjs` to
`/about`. Two placeholders sit in the prominent shared list, reachable from a shrine page's "also
cited by" link. *(KB1‑2. Do not delete the lines — the withdrawal notice is among the most honest
in the archive. Count them as what they are.)*

**5. The provenance store is frozen at 12 July and cannot notice that what it describes has
changed.** 62 entries have a substantively different Description under an unchanged record, 51 of
them having gained an entire bibliography. Six `Field-verified` entries added in August are
recorded as "pre-existing entry … origin inferred by elimination". And all 167 `Description Urdu`
records carry one hardcoded date, 11 July — six of them asserting a translation made a month
before the English it translates existed. *(KB1‑3. The digest-and-gate half is an agent's;
re-tiering the 62 is not.)*

**6. Two figure nodes share three identical names and `validate-kg-identity.mjs` cannot see it,
because it reads `name` and not `altNames`** — and `altNames` is carrying three different kinds of
content, only one of which is a name, while feeding the subtitle, the search index and the Urdu
name translator. *(KB2‑5, KB2‑6.)*

**7. `classify()` consults the placeholder pattern only after nine type patterns have claimed the
line**, so 15 placeholder lines count as specific checkable works and two entries wear
"Source-documented" on the strength of one. `\b(19|20)\d{2}\b` alone types a line as a monograph,
which makes the `contemporary press` branch dead code for any line naming a masthead. *(KB1‑4.
Changes two published badges, so it needs a sheet patch and a human to accept the downgrade.)*

**8. `docs/KG_VOCABULARY.md` documents a graph the archive no longer has**, and the TTL's ontology
block declares three terms it never uses while using three it never declares. *(KB2‑7.)*

**9. The two corpus scanners read one of the archive's two prose corpora.** "The reading piles are
worked out" is true of `data/shrines.json` and unmeasured for the 49 markdown files that 17
relations cite as their source. The reviewer read all 45 candidate sentences and found **one**
ambiguous case, so the yield is low — but the scope gap is real and the claim should be stated
accurately. *(KB2‑8.)*

**10. One figure on `/graph` is a bare name with no explanation, and the test written to prevent
exactly that checks the data instead of the page.** `lineageOnlyFigures.test.ts` asserts the graph
has four populations; the page builds notes from three. 1 row of 110 today — and the type before
it took 39 rows with it, and the code comment beside that branch still says "eight". *(KB2‑4.
Lands in `src/pages/GraphPage.tsx` — handed over.)*

---

## Handed to the other session

These are real and land in `src/pages/`, `src/components/`, `e2e/` or `src/styles/`.

- **The infobox withholds the qualifying note whenever the year is missing.** 40 entries hold an
  unrendered `year_built_note`; **4 lose every word about their date**; 12 display a bare year the
  withheld sentence disqualifies. `/about` counts these qualifications — "160 entries whose date
  carries a written qualification" — so the archive tells a reader they exist and then shows
  "1757" with no way to reach the sentence saying 1757 is when the saint died. No new copy and no
  Urdu needed: the note already renders through an existing string in the same file. *(KB4‑3.)*
- **A two-decimal locality guess is printed as a five-decimal coordinate, with a copy button.**
  Twelve entries; two of them one decimal, about 11 km. `/shrine/sant-satram-dham-…` renders
  `28.30000, 69.39000` under "Copy coordinates" and a Google Maps link. Ten *other* entries do
  carry a coordinate caveat, so the silence on these twelve reads as a statement. Display
  precision must not exceed recorded precision. *(KB4‑4.)*
- **Infobox qualifying notes are English on every Urdu shrine page** — 139 of 139 content notes
  measured on the rendered page. The sheet has no `*_ur` column for them, so this is a translation
  question and not only a wiring one. *(KB5‑A.)*
- **`/about` tells a reader both "170 entries with a bibliography" and "articles carrying at least
  one citation — 22 · 13%".** *(KB4‑2.)*

---

## One ambiguity, three bugs: `id` is not the slug

This deserves its own heading because it is now the most expensive thing in the repository, and
none of the three defects looks like the other two.

The archive has two identifier spaces and the codebase calls both of them "slug" or "id" in
different places:

| | value | what it addresses |
|---|---|---|
| **URL slug** | `shrine-of-bibi-pak-daman` | `/shrine/:slug`, the prerendered filename, every graph relation, `source-notes.json` lookups |
| **`id` column** | `bibi-pak-daman` | the `public/photos/` directory name, and the protected list in CLAUDE.md |
| **`Shrine.id`** | `47` | the **row index** in the built array |

Three shipped defects, from three different lenses, all of them this:

1. **A shared `?selected=` link opened a different shrine in a different province** (UX council,
   `492b747`) — `Shrine.id` is a row index and the dataset is swapped twice on load.
2. **Four contradiction disclosures never rendered** (KB4‑2, `fbf29bb`) — `source-notes.json` was
   keyed by the `id` column while `ShrinePage` looks up by the URL slug. And its test compared
   `id` against `id`, so it could not fail in either direction.
3. **Three separate investigations reported a dramatic false result** by joining on `id` — 14
   graph slugs "missing", 14 provenance records "orphaned", 16 shrines with "no Urdu article". All
   three are zero.

There is a fourth cost, in the release rather than the code: `data/shrines.json` and the Zenodo
bundle carry `id` and **no slug column at all**, so the only identifier a downstream researcher
has fails to address the page for 13 of 171 rows.

The repository has absorbed this three times and re-derived it a fourth. `graphDatasetParity.test.ts`
and `sourceNoteKeys.test.ts` now pin the distinction where it bit; a `slug` column in the export
would close the fourth. Renaming `Shrine.id` to `Shrine.rowIndex` is the change that would stop the
first, and it is not an agent's to make unilaterally.

## `year_built_note` is not a date field

Recorded because it changes what the published descriptor may say about it, and because both
sessions reached it from different directions on the same afternoon.

158 rows carry a `year_built_note`. **25 of them contain no temporal content whatever** — they
describe the structure, its patron, or its institutional role: *"Raised platform, no dome"*,
*"Blue kashi tilework"*, *"Sacred crocodile pool and sulphur springs"*, *"Centre of the Azeemia
order"*, *"Shrine complex includes the Hazrat Pir Makki Masjid"*, *"Built by Diwan Kaura Mal;
renovated under Ranjit Singh"*.

The column is doing double duty. That matters twice over: the descriptor work (KB3‑4) had
described it as "qualifying prose about `year_built`", which is now corrected in
`datapackage.json` and `shrine-schema.json`; and the infobox fix that renders it must not file it
under a "Founded" heading, or a description of a building appears as a date qualification.

---

## Waiting on Rauf, not on an agent

1. **Does the archive publish its own raw QA notes?** Recorded in full in
   `docs/SESSION_RESUME.md`. `qa_note` is 50,009 characters across 50 rows, is not rendered on any
   page, and *is* published three times over — a 925 KB precached chunk, this public repository,
   and the Zenodo bundle. Three non-equivalent options are written up there. The premises that
   said otherwise are corrected; the behaviour deliberately is not.

2. **What should `/about` say about coordinate uncertainty?** It reports 8 — entries whose own
   prose admits the pin is approximate — where `audit_coordinates.py` holds 22. Neither number is
   wrong: one greps the archive's admission, the other measures decimal precision and shared
   points. **16 of the 22 need a field survey and will not move for months**, so whatever the page
   says has to stay true of a static number, and it has to publish 22 without implying the pins
   are wrong — precision is not accuracy. This is an editorial claim about the archive's honesty.
   *(Raised by both councils; the other session owns the render side.)*

3. **May `located_in` be multi-valued?** Item 1 in the queue above cannot ship without this. 12
   rows legitimately match more than one place, one row is genuinely unplaced, and the answer
   moves `/about`'s published place count from 94 to roughly 66.

4. **`buried_at` says that Shiva is interred at Katas Raj.** 172 edges carry the type, **93 at
   non-Muslim sites** and **34 naming a figure the graph itself types `Deity`**;
   `KG_VOCABULARY.md` defines the term as "the dargah or mazar where the saint is interred". No
   reader sees the word — no UI string contains "buried", and both exporters turn it into
   `schema:about` — so the damage is confined to `data/kg.json`, which the release ships. The
   rename to `commemorated_at` is not free: `relationId()` composes `type:subject:object` and
   `kg-sources.json` is keyed on those strings, so it rewrites 172 source keys. A naming decision
   with a published-artefact cost. The cheap first step — deleting `sufi:buriedAt` from the
   vocabulary doc and both exporters, where it is declared and emitted **zero** times — is
   available separately.

5. **Two published badges would drop** if `classify()` consulted the placeholder pattern first
   (queue item 7). The argument against is real: "Contemporary press coverage … (Dawn, The Express
   Tribune)" does name two mastheads. This is the wording of a rule, not a bug.

---

## What this council cost in wrong turns, and where that is recorded

Two instrument failures from the pre-council sweep are worth carrying forward, and both are now in
`docs/MEASUREMENT_FAILURES.md`'s territory:

- **`git grep -E` silently ignores `\b`.** A word-boundary pattern returns zero matches, which
  reads as "clean" rather than as "your regex is unsupported". It cost a false all-clear on the
  date sweep.
- **A regex for years that matched `20[3-9][0-9]`** reported a surveyor's phone number
  (`03008842077`) and a CSS unicode-range (`U+2070-209F`) as dates.

And one correction this council made to itself, which is the pattern worth imitating: a reviewer
reported the published `Category` enum as stale against the six-value schema — the most
plausible-looking finding in either council. It describes the **legacy** column, which really does
hold only those five values (76 Muslim Shrine, 50 Hindu Temple, 37 Sikh Gurdwara, 6 blank, nothing
else). The defect is the omission of the modern column, not the enum. Putting a six-value enum
there would have described a column that has never held five of them. It is written up at
`categoryVocabulary.test.ts` as the counter-example.
