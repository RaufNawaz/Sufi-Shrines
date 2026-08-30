# Session resume — the standing work queue

**Purpose: this file is written so a cleared chat costs nothing.** It is the one place a fresh
context reads to know what is in flight, what is next, and what the working agreements are. If
you are starting with no conversation history, start here and read nothing else first.

Keep it current: an item finished is an item struck through with its commit, and an item found is
an item added. A queue that describes yesterday is worse than no queue — the same failure mode
CLAUDE.md's standing findings carry a warning about.

---

## Where the work comes from

`docs/planning/UX_COUNCIL_2026-08-30.md` — four reviewers, one lens each (visual craft;
interaction and mobile flows; information architecture and editorial presentation; accessibility
and Urdu parity), thirty-two findings, eleven of them retracted by re-measuring. The queue below
is that document's ranking, plus what has been found since.

**Read the retraction section of that document before trusting any finding in it**, including the
ones marked measured. The reviewers were required to publish what they got wrong, and the list is
the reason the rest is credible.

---

## Done (30 August 2026)

| Finding | Commit |
| --- | --- |
| A mosque emoji labelled Guru Nanak and Shiva in the map preview | `251d3d0` |
| A shared `?selected=` link opened a different shrine, silently | `492b747` |
| The language toggle had no visible keyboard focus, in either theme | `9e2ccaa` |
| The reading-size slider moved no Urdu control and no page title | `6d1ce06` |
| The Urdu shrine page could be left holding slim-index rows for good | `e508648` |
| 174 tab presses across the map; 404 with no `<main>`; two English `aria-label`s; four missing Eastern-numeral sites | `6db6bf5` |
| Two thirds of shrine pages downloaded 92 KB of source notes to render none | `e3adcd9` |
| Every Urdu route downloaded 253 KB gz of article prose | `9a4f227` |
| A map marker could not tell its photograph had stopped existing | `49e5527` |
| The pin that had a tap target was exactly the pin that did not | `1d39105` |
| The search-document builder with the tests on it was not the one that ran | `7fe1b2a` |
| Two Urdu URLs published a file the router could not resolve | `287ef2a` |
| An Urdu reader could not find a figure by their Urdu name | `0fb1a10` |
| The archive called itself something 88 of its 171 sites are not (English half) | `730f045` |
| Four entries published a note addressed to a colleague in a public field | `68173c4` |
| The seven badge definitions, derived for review | `ce4a0c3` |
| Filters changed the URL and the list and never the map | `b768cb5` |
| Four entity routes answered an unknown slug by silently becoming the map | `f95c7ad` |
| The archive search palette announced nothing, and both comboboxes lied | `1093709` |
| Thirteen section-header treatments, and six headings with no class at all | `c472ce7` |
| Starting a guided tour dropped focus to `<body>` and announced nothing | `38e6eca` |
| The accent that means "interactive" painted 120 data marks and a chart bar | `1db5eca` |
| The photo strip ran left-to-right in Urdu while its own arrows ran right-to-left | `571607a` |
| Search said 44 matches and showed 40, silently | `d096824` |
| A shrine named its order and never linked to it — the graph's one one-way edge | `4ba4b8a` |
| The shrine page overwrote its own clean share snippet with raw markdown | `68c1e35` |
| `/about` ruled its section headings off at two different x, nine at one and fifteen at the other | `870db33` |
| The rename missed the footer, which sits under every page and all ~800 prerendered files | `73ee903` |
| `/graph` opened "the Sufi orders and saints" over a list where 64 of 134 figures are neither | `73ee903` |
| A figure-search assertion followed a gurdwara to the almanac, because `hasText` is a substring | `639e069` |
| The rename missed `index.html`, so ~940 prerendered pages still said "Sufi shrines" | `b9e04f3` |
| Three routes' bundle budgets sat at exactly zero headroom, six more under 3 KB | `4e655bb` |
| The kin reading pile held nine relatives the archive records and never names | `400a250` |
| Fourteen pages described the homepage rather than themselves, in English on the Urdu half | `0534a91` |
| The newline invariant RULE 4 names was in a script nothing in the build path calls | (this cycle) |
| A pir-brother is not a teacher; both scanner piles worked out | `9c4eeb3` |
| RULE 4's asterisk guard ran only where a person was already being careful | *this commit* |

---

## Next, in order

Each item names what a reader loses, so the ranking can be argued with rather than just followed.

~~1. **82% of on-screen pins do not receive a tap at their own centre.**~~ **Closed 31 August
    2026.** Measured before believing it, and it was **90%**, with a median nearest-neighbour
    distance of **1 px** — 169 markers forming **21 visually distinct shapes**, the largest holding
    **66 sites**. Put to Rauf as four costed options
    (`docs/planning/MAP_PIN_DENSITY_2026-08-31.md`); the ruling was **fan on tap, and leave the
    resting map alone**. Shipped as `src/lib/map/spiderfy.ts` + `e2e/marker-fan.spec.ts`, which
    asserts both halves — the fan works, *and* no clustering arrived by the back door.

    **What was deliberately not fixed, and is still true:** the map still opens looking like a
    21-entry collection. A reader has no cue that 66 sites are under one mark until they tap it.
    That half was considered and declined, and the spec holds the decline in place rather than
    letting it drift.

The queue has nothing else on it that an agent can take without a decision. What is left is in
"Waiting on a person" below.

---

~~**Left from the header work:** `/about` still shows two right edges.~~ **Closed 31 August
2026.** Measured before believing the note, and it was nine headings at x=767 against **fifteen**
at x=1054, not seventeen — the note's own count was a heading out. The cause was not the
containers as such: `.about-section` carried `max-width: 68ch` and `.coverage-section` carried
none. The measure moved onto the prose inside the section, so the tables and bar rows keep the
width they need and all 24 headings now rule off at one x. `e2e/typography.spec.ts` asserts both
halves — one edge, *and* prose still under 700px — because deleting the measure would have passed
an edge-only test and given the reader 130-character lines. The `.settings-page` `max-width` this
note pointed at is a different bug and is still there.

~~**Left from the share-snippet work:** seven index routes ship the map's blurb as their
description; and `hreflang` appears on `dist/index.html` only, zero on the ~800 other prerendered
pages.~~ **One half fixed, the other half retracted — 31 August 2026.**

**The `hreflang` half was never true.** It was measured against a local `npm run build`, and
`replaceHreflang()` *strips* all three alternates when `enUrl` is falsy, which it is whenever
`SITE_URL` is unset. Re-run with `SITE_URL` set, **941 of 942** files carry their alternates, and
`.github/workflows/deploy-pages.yml` sets it on every deploy. The deployed site has always been
correct. **A local build produces different `<head>` output from the deploy** — no canonical, no
hreflang, an empty sitemap — so any head-level measurement taken locally is measuring the wrong
artefact. The build says so in one line that is easy to read past.

**The description half was real, and the cause was not the seven routes.** `index.html` is the
template every prerendered page starts from, and its `<head>` still said "An interactive map of
**Sufi shrines** across Pakistan" — the string the 30 August rename had already corrected in
`UI_TEXT.en.siteMetaDescription` and not here. So eight routes and their Urdu mirrors described
the archive as Sufi shrines, `/graph` among them, whose own intro had just been corrected for
making that exact claim about that exact data. Both template strings now match the shipped ones,
and `staticTemplateCopy.test.ts` ties `index.html`'s description to
`UI_TEXT.en.siteMetaDescription` so they cannot drift apart again — while explicitly permitting
`/Sufi-Shrines/`, which is the repository name and would have taken the site down if a sweep had
banned the string outright.

~~**Still open:** the seven routes inherit the root's description, and the Urdu edition ships an
English one.~~ **Both closed the same day, and the cause was a third thing again.**

Two of the seven *already had* a description. `STATIC_PAGES` carried a `descEn` for `/graph` and
`/almanac`, written for exactly this; the `APP_ROUTES` loop runs afterwards, writes the same two
files, and set no description at all — so it overwrote both. **The defect was a second writer
silently discarding the first**, which is the third time in two days that the answer was a
mechanism rather than a missing value. Those two entries are deleted rather than superseded: a
dead entry that looks effective is how this happened.

**The Urdu half needed no fluent speaker after all, and that is the part worth keeping.** Every
one of these pages already opens with a reviewed sentence saying what it is, in both languages —
`almanacIntro`, `graphExplorerIntro`, `chronologyIntro`, `sharedGroundPageLede`, `typologyIntro`,
`settingsIntro`, `reviewIntro`. Quoting seven reviewed Urdu sentences is not authoring seven, so
all fourteen pages now describe themselves in the reader's own language. `scripts/lib/
routeDescriptions.mjs` holds them verbatim and `routeDescriptions.test.ts` asserts
character-for-character equality with the UI strings, so a quote cannot drift from the page it
quotes. `leadSentences()` shortens them for a `<meta>` tag on whole sentences, never mid-clause.

**The rule this generalises to, and it is worth reaching for before writing new copy:** the page
already says what it is, in both languages, and a description that is not the page's own words is
a second place for the archive to describe itself from.

Still English-only, and genuinely Rauf's: `/about` and `/coverage`, whose descriptions are not
built from a UI string. `/report` keeps the site blurb deliberately — it is a redirect stub whose
canonical points at `/about`.

## The corpus scanners are worked out

Both reading piles were taken to the end on 31 August 2026, and the result is a negative worth
recording so nobody re-reads them looking for edges.

**Kin: 30 to read → no unrecorded edge.** Every candidate was already in the graph — Bahadur Baba
as Kaka Sahib's father, Shah Kamal and Shah Jamal as brothers, Shah Ali Akbar eight generations
from Shams Sabzwari, Bhittai from Shah Abdul Karim Bulri, Bebe Nanaki and Guru Nanak. What the
pile held was family the archive states and *cannot name*, and `kinNotes` had two entries in it.
It has twelve.

**Lineage: 36 to read → one finding, and it is a non-relation.** A *pir-bhai* is a fellow disciple
of the same master, which no relation type here holds. Recorded, not acted on: one sighting is not
a vocabulary.

**And what is left is not agent-work.** `scripts/data/measure-kb-gaps.mjs`, run after both piles:
**434 gaps closeable only by evidence** — the archive does not record it, and RULE 2 says an agent
may not supply it — **135 by human review**, 20 informational (long slugs, and renaming one breaks
a published URL), and 4 that already carry a written adjudication. There is no pile left that
reading harder would move.

**Found 31 August 2026 while looking for what a reader sees where the archive is silent:** the
guard RULE 4 names — *"refuse-to-write if any long Description has lost its newlines"* — exists
and **was not in the build path**. It lives at `pipeline/append_new_shrines.py:155`, which runs
only when a person appends shrines by hand. `data:build`, `data:validate` and `verify` never
called it, so the archive had no standing protection against the single most destructive thing
that can happen to its prose: a TSV export, which strips newlines inside cells silently and
flattens every heading, bibliography item and paragraph break in all 169 entries at once. Nothing
errors. The site loads. Now `scripts/data/validate-description-structure.mjs`, in
`npm run data:validate`, with a distinct message for the one-entry case and the 169-entry one —
they are different emergencies and must not read alike.

**One entry has already lost them, and it needs a person.** *Sant Baba Asudaram Darbar (Panno
Aqil)* is 1,339 characters in a single unbroken block — the archive's only entry with no
bibliography and its only entry with no paragraph break. Whether an import flattened it or it was
written that way cannot be told from the data, which is precisely the problem: the failure leaves
no mark. It is recorded as a named exception rather than fixed, because deciding where a
surveyor's sentences divide is editorial work on someone else's prose (RULE 2) and the sheet is
production (RULE 3). The test fails if the exception ever stops being true, so paragraphing it in
the sheet will tell you to delete the line.

**The orphaned-guard sweep, finished 31 August 2026 — and the answer is reassuring, which is why
it is written down.** Two of RULE 4's four named checks turned out to live in hand-run paths, so
the obvious next question is how much of the rest of the repo is like that. Measured across every
gate-shaped script (`check-*`, `validate-*`, `verify-*`) in `scripts/`, `scripts/data/` and
`pipeline/`:

**14 gate-shaped scripts · 9 reached by `verify`, `build`, `e2e` or CI · 5 reachable only by
hand — and all five for a defensible reason.** Three need the network
(`validate-images.mjs`, `check_image_liveness.py`, `check-live-sheet.mjs`, which reads production)
and two need a file a person exports (`validate_shrines.py`, `check_descriptions.py`). None is an
invariant that could be running automatically and is not. **The two orphans were specific, not
symptomatic**, and the sweep is recorded so nobody re-derives it.

*Measure the instrument first:* the sweep's first pass reported **16** orphans. It was counting
`measure-*` scripts — which are instruments, not gates, and correctly manual — and it looked for
filenames in the CI workflows when CI invokes `npm run <name>`. That alone mislabelled
`check-production-base.mjs`, which `verify:pages` calls. The corrected pass is the one above.

**One thing the sweep turned up and did not act on:** the newline rule now has **three**
implementations — `pipeline/append_new_shrines.py` (on append), `pipeline/check_descriptions.py`
(on a mid-pipeline file) and `scripts/data/validate-description-structure.mjs` (on the dataset,
in `data:validate`). Left alone deliberately: they guard different artefacts at different moments,
which is not the same defect as `searchDocs` having two drifting copies of one map. Worth knowing
before a fourth is written.

**Checked independently, and the conclusion holds — but the reason is sharper than "different
artefacts", and matters if anyone tries to harmonise them.** The three use *different thresholds*,
and each is right for its own input. `validate-description-structure.mjs` needs
`LONG_ENOUGH = 600` and an allowlist because it runs over the whole dataset, which legitimately
contains short entries and one long unbroken one. `append_new_shrines.py:155` asserts
`"\n" in desc` unconditionally, with no threshold — correct there, because its inputs are the four
hand-authored `entries/entry_*.md` files, measured at 8,923–18,373 characters with 113–141 newlines
apiece. A markdown entry of that size with zero newlines is unambiguously damaged; a 39-character
row in the dataset is not.

**So do not give the append script a length threshold to "match".** It would pass a TSV-stripped
short entry that the unconditional assert catches. I set out to report these two as disagreeing and
they do not — the difference is the point.

## Waiting on a person, not on an agent

- **RULE 4's fourth guard has no implementation.** "RMS pixel comparison before any media sync
  (filenames lie — one filename spans two shrines)" is listed in CLAUDE.md among checks that *have
  worked*, and there is no code for it in `scripts/`, in `pipeline/`, or in the unversioned
  `~/shrines` legacy directory. It was probably an ad-hoc comparison a session ran and did not
  keep — the RULE 0 failure that rule exists for, in the same directory that swallowed
  `image_urls.tsv`. Deliberately not invented: media lives on a gitignored drive absent from a
  fresh clone, so a guard written here could not be tested against what it guards. **Two decisions
  are yours** — whether it should exist as code, and whether CLAUDE.md's RULE 4 list should say so
  meanwhile. An agent should not quietly edit the operating contract to match what it measured.
  (The other three are audited in HANDOVER, 31 August 2026: one was live, two were orphaned in
  hand-run paths, both now in `data:validate`.)


All four were put to Rauf on 30 August 2026 and answered. What is left is the half an agent
cannot do.

- **The archive's Urdu name, and its Urdu description.** The English rename shipped (`730f045`): it is *Mapping the Shrines
  of Pakistan*, the name the project has carried in CLAUDE.md all along, and no slug or deploy
  path changed. `UI_TEXT.ur.siteTitle` still reads 'پاکستان کے صوفی مزارات' — "Pakistan's Sufi
  shrines" — which has the same problem the rename fixed. An archive's name in Urdu is Urdu
  content (RULE 2), so it is annotated in place and left saying the wrong thing rather than
  guessed at. **The two editions disagree about the archive's name until a fluent speaker
  settles it.** `siteMetaDescription` on the line below it falls under the same ruling and is
  the clearer error of the two: it promises "an interactive map of Sufi shrines across Pakistan"
  where the English now enumerates shrines, temples, gurdwaras and darbars.
- **One Urdu noun, swapped and wanting a reader's eye.** `graphExplorerIntro` said "صوفی سلسلوں
  اور **اولیاء**" over a figure list that is 20 deities and 5 Sikh Gurus. The replacement — شخصیات —
  is not authored: it is the word `graphExplorerAllFigures` and `graphExplorerFiguresNote` already
  use, in reviewed Urdu, for this exact set of people. Applying the archive's own term in the same
  grammatical slot is a substitution, not composition, which is why this moved where
  `footerCredit` above did not. Worth one glance at the agreement all the same.
- **`/graph` is titled "Saints & Orders Explorer" and lists 20 deities.** The same overclaim as
  the intro, deliberately not fixed: a title is a name rather than a claim, it reaches the
  document title, breadcrumb, welcome card and a hand-synced copy in `scripts/prerender.mjs`, and
  it has an Urdu twin. Renaming a page a reader may have linked is the decision the archive
  rename was, at smaller scale. The archive's own neutral word is already on the page —
  "Figures in the archive".
- ~~**Three citation strings give three answers.**~~ **Answered 30 August 2026: v2.0.0 / 2026**
  (`306e568`). Five files now agree and `citation.test.ts` reads the version out of all five and
  the year out of four — it had only ever compared `citation.ts` against `CITATION.cff`, and those
  two happened to agree, so three files drifted in the blind spot beside a green test. Still open
  and still deliberately unrenamed: `PUBLICATION.attribution` mirrors the ODbL attribution that
  `LICENSE-data.md` *requires of people using the data*. Changing that is a licence change, not a
  rename, and it is the one part of this item an agent must not do.
- **Four patches await import** (RULE 3 — a human imports, agents do not write to the sheet):
  `patch_schema_hygiene_2026-08-27.csv`, `patch_year_built_precision_2026-08-29.csv`,
  `patch_site_type_2026-08-30.csv`, and `patch_location_hygiene_2026-08-30.csv` — the last
  produced 30 August (`68173c4`), moving four entries' "ask Saifullah…" instructions out of the
  public `Location` field into `qa_note` while keeping every caveat. `npm run data:check:location`
  fails until it is imported, by design.
- **Then `npm run data:build`**, which closes the 171-vs-169 drift — two shrines (Darbar Hazrat
  Shah Gohar Peer, Darbar Mian Qurban Ali Shah) currently invisible to the graph, search, `/about`
  and the Urdu dictionary. Order matters: patches first, then `data:build`, `data:kg`,
  `data:index`, traditions, and `data:check:live` to confirm zero drift.

  **The reason this drift existed was wrong for eight days and is corrected (30 August 2026,
  `d38d57c`).** `.gitignore` said `build-dataset` "drops for having no coordinates" the two rows a
  live export carries. It does not, and has not since 22 August: `isValidRow` keeps a named row
  with empty coordinates *on purpose*, and the comment beside it names Shah Gohar Peer — one of the
  two — as the case that motivated the change. Over the committed 171-row export the current
  predicate keeps **171 of 171**. The snapshot ships 169 because it **predates the fix**. Nothing
  rejects those rows, they are **not blocked on coordinates**, and they will ship as honestly
  unmapped pages. Four instruments had tripped over this drift and all four reported the symptom
  correctly; none read the predicate, and a dated sentence in a config file stood where the answer
  should have been.
- **Twenty-four coordinate verdicts**, in `data/review/coordinate-review-2026-08-30.csv`
  (30 August 2026, `d38d57c`). 22 shipped rows carry a *placeholder* coordinate — twelve typed to
  one or two decimal places (~1.1 km), ten sharing a point with another row — plus the two unmapped
  entries above. All 22 were queried against OpenStreetMap and Wikidata: **six answered, sixteen
  did not**, and no coordinate was written for those sixteen (RULE 2). Two confirm the current
  value; four are candidate moves; one is a rejection worth keeping, because the Wikidata entity
  for Mohra Sharif is the **village** and a name match is not a source. One proposal is annotated
  as *no more precise than what it would replace*, so no verdict is given on a lateral move by
  mistake. **Sixteen need a field survey** — this is the half no agent can do.
  `pipeline/audit_coordinates.py` holds the line meanwhile: it fails when the placeholder count
  rises above the recorded baseline, and it measures precision, not accuracy.

- **The badge glossary's wording.** The seven definitions are derived and written up in
  `docs/planning/BADGE_GLOSSARY.md` — not authored: each is the rule
  `pipeline/build_sources_registry.py` already applies. Three things are open and are yours: the
  wording, whether to publish the Moderate rule's 150-word threshold, and the Urdu. **The English
  half is ready to ship the moment there is an Urdu half** — shipping it English-only would put
  seven English paragraphs into the Urdu view.

---

## Working agreements for a fresh context

- **The tree is shared with another Claude session.** Commit with `git commit -o <paths>` and
  never `git add -A`. Their lane: `data/`, `scripts/data/`, `urdu-i18n/`, `src/lib/kg.ts`,
  `src/lib/data/`, `src/lib/i18n/uiStrings*`. Mine: `src/pages/`, `src/components/`, `src/hooks/`,
  `src/lib/search/`, `src/styles/`, `e2e/`, `docs/planning/`.
- **iCloud makes conflict copies of files you are editing** — `components 2.css`, `kg 2.css`,
  `GraphPage 2.tsx` all appeared mid-session on 30 August. They redden `repoHygiene` directly and
  `readingScale` as collateral, because a duplicate stylesheet double-counts what that test walks.
  `find src e2e scripts docs -name "* [0-9].*" -delete` before committing a run of style edits.
- **Never leave a scratch file in the tree.** `prettier --check .` walks untracked files, so a
  stray file turns `npm run verify` red for both sessions and reads as the other one's failure.
- **`npm run build:e2e` and `npm run e2e` must be one chained command** — the other session
  commits every few minutes and the stale-dist guard fires on any gap. And the guard fires
  *between* runs too: on 31 August a `data/` write landed after a full suite finished, so the
  next isolated run of an unrelated spec aborted in `global-setup` with a message about a stale
  dist. It reads like a failure of the spec you are looking at. **A red spec on a shared tree is
  worth exactly one rebuild-and-retry before you believe it** — that turned 1 failed into 480
  passed with nothing else changed.
- **`git commit -o` cannot take an untracked path.** `git add <that one path>` first — never
  `-A`, never `.` — then `-o` the full list. A new test file is the usual case.
- **A budget failure is not automatically yours.** Check `data/kg.json`'s size against the last
  commit before touching `check-bundle-budget.mjs`.
- Run the whole `npm run verify` before every commit, and mutation-check every new test by
  reverting the fix and watching it fail.
- **`innerText()` is rendered text; `textContent` is source text.** A locator on anything with
  `text-transform: uppercase` — `.palette-status`, `.settings-section-heading`, the entity
  kickers — reads back in capitals. A lowercase pattern against it matches nothing, and the
  failure looks like the value never arriving rather than like a case mismatch. It cost two
  failures from one cause on 30 August, one loud and one silent.

## How the session is meant to run

**Long sessions, not frequent small ones.** Work continuously through this queue — finish an
item, commit it, strike it off, take the next one, keep going. Do not end a turn because one item
is done; end it when there is nothing left you can do without a decision from Rauf.

The `/loop` wakeup is a **restart net, not a metronome**. Its job is to bring the session back if
it stops, so the delay should be long (an hour) rather than short. A ten-minute tick was tried on
30 August 2026 and was the wrong shape: it paced the work instead of resuming it, and turned a
development session into a series of small ones. Corrected the same day, by Rauf.

One item per commit is still right — that is about coherent history, not about stopping.
- **The full suite flakes under parallel load, and the rate rose as the day went on.** A run on
  30 August produced four failures across `no-overflow`, `a11y`, `search-announcements` and
  `tabbar` — and all 112 of those tests passed in isolation immediately after. Two sessions
  building and testing on one machine is the likely cause. **A single full-suite failure is not
  evidence; re-run the file.** Do not skip that step because a failure looks like yours — two of
  those four looked exactly like regressions from the change in flight.
- **A `HEAD` placeholder in the table above is a bug in this file**: write the real hash after
  committing, or the row records nothing. It has happened once.
