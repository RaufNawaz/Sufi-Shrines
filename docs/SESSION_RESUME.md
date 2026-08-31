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

### From the knowledge-base council (30 August 2026)

Ranked queue, four decisions for Rauf and the five raw reports:
[`docs/planning/KB_COUNCIL_2026-08-30.md`](planning/KB_COUNCIL_2026-08-30.md).

| Finding | Commit |
| --- | --- |
| 48 measurements dated a day that had not happened, the catalogue of wrong measurements included | `0c72998` |
| The coordinate gate had a baseline, an exit code and no caller | `3206a7e` |
| The schema gates read one dataset file and the site ships another | `9552e47` |
| Three closed vocabularies enforced by nothing; `/about` is two active sites short | `910b907` |
| The only hard error on a category rejected three the archive uses | `692ef14` |
| Every kg guard compared the graph to another kg artefact, never to the dataset | `0debf21` |
| CLAUDE.md's "107 citing three or more sources" was 103 | `070f0ab` |
| "Eight slugs carry live photo URLs" — fifteen do, and seven served half the photographs | `df318c3` |
| The published schema described 11 of 44 columns and omitted every provenance one | `0c6cc49` |
| `.find()` flattened eleven compound silsilas out of the data release | `372709e` |
| The 544→533 correction reached one file of three, twice | `3801d99` |
| "Already withheld from every page" was never true of the payload | `48d355c` |
| The almanac said 52 sites record no observance; 51 of them do | `216829d` |
| Four contradiction disclosures were keyed to a slug the site does not use | `fbf29bb` |
| The four unsourced order memberships were the four the guard could not see | `a53b350` |
| An Urdu reader who browsed English first got the English article, permanently | `fc453b9` |
| The infobox withheld the date note whenever the year was missing — 28 entries | `0a02e72` |
| A two-decimal locality guess was printed as a five-decimal coordinate | `60ddb15` |
| Sixteen Latin budgets re-measured; the almanac's went 47 to 3 | `4fbd727` |
| All 64 place pages were unreachable by an Urdu search query | *this commit* |
| 111 of 112 marker photographs were ellipses, and Leaflet was sizing them | `071a870` |
| Seventeen measurements in the UI lane were dated a day that had not happened | `4d3a82b` |
| 290 of the archive's 459 entity pages could not be cited | `2357fd3` |

---

## Next, in order

Each item names what a reader loses, so the ranking can be argued with rather than just followed.

~~1. **82% of on-screen pins do not receive a tap at their own centre.**~~ **Closed 31 August
    2026.** Measured before believing it, and it was **90%**, with a median nearest-neighbour
    distance of **1 px** — 169 markers forming **21 visually distinct shapes**, the largest holding
    **66 sites**. Put to Rauf as four costed options
    (`docs/planning/MAP_PIN_DENSITY_2026-08-30.md`); the ruling was **fan on tap, and leave the
    resting map alone**. Shipped as `src/lib/map/spiderfy.ts` + `e2e/marker-fan.spec.ts`, which
    asserts both halves — the fan works, *and* no clustering arrived by the back door.

    **What was deliberately not fixed, and is still true:** the map still opens looking like a
    21-entry collection. A reader has no cue that 66 sites are under one mark until they tap it.
    That half was considered and declined, and the spec holds the decline in place rather than
    letting it drift.

~~The queue has nothing else on it that an agent can take without a decision.~~ **It has
twenty-three more as of 30 August 2026**, from a second council convened that evening on a
different brief — the first asked what is broken, this one asked what the archive should *become*.
Findings, retractions and the ranking are in
[`docs/planning/UI_COUNCIL_2026-08-30.md`](planning/UI_COUNCIL_2026-08-30.md); the top of it is
reproduced here so this file stays the one queue.

**Read that document's "the numbers the council got wrong" section before trusting any figure in
it.** Three headline numbers did not survive re-measurement, one of them inside the finding that
has already shipped — it said 524 entity pages and 94 places, and it is 459 and 29.

2. **U-1 · An Urdu reader is served the English article. Two mechanisms fixed, the race still
   open.** *Partially closed 30 August 2026.*

   Confirmed before believing it, and the council's framing was too narrow. Measured over a
   12-entry sample: after visiting the English map first, **9 rendered a different article and 8
   of those rendered materially more English** — Latin share of the article body going from 6–20%
   on a clean start to 45–79%. `shrine-of-shah-yusaf-gardez` 8% → 53%, `kali-bari-mandir`
   0% → 70%.

   **Two real defects, both fixed, and they had to be fixed together.** `fingerprintShrines`
   hashed name, founded and the *English* description length; the Urdu merge writes
   `Description Urdu`, so a merged dataset and its English source were indistinguishable and
   `adoptCsvResult` kept the English one as a no-op. Teaching the fingerprint to see Urdu fixes
   that — **and opens a second hole**, because `fetchShrines` awaits the Urdu *seed* but not the
   Urdu *article payload*, so a CSV that lands first is built English-only and would then be
   *adopted* over a merged dataset instead of discarded. `adoptCsvResult` now re-merges against
   the current payload state before comparing. Held by
   `src/hooks/__tests__/datasetFingerprint.test.ts`, mutation-checked.

   **What is still wrong, and it is not what the finding said.** The remaining defect does not
   need an English visit at all. Loaded five times from a *clean* context,
   `/shrine/darbar-hazrat-tahir-bandagi-qadri?lang=ur` settles into **one of two different
   articles** — 11,115 characters at 30% Latin, or 4,021 at 55% — and a 15-second floor does not
   change the split. So the article payload races the dataset build on every load; an English
   visit only makes the wrong outcome likelier. **Next step: instrument which of the two states
   the payload subscription is in when the page settles**, rather than measuring the rendered
   text, which cannot tell a lost merge from a slow one.

   **No e2e spec was added, deliberately.** A browser assertion of "no English after an English
   visit" would fail intermittently for a reason unrelated to its name, on a suite the other
   session also runs. The flakiness is the finding, not a reason to encode it.

   *And the standing lesson:* **a suite whose every case starts clean cannot see a defect that
   needs a dirty start.** Every existing Urdu spec opens a fresh context, which is why this lived
   this long — the same shape as the gallery specs that asserted against images the browser had
   never requested.
3. **J-1 · A phone opens the map with a third of the archive off-screen**, including 14 of 14
   Nanakpanthi/Udasi darbars and 16 of 36 Hindu temples. Fixed centre and zoom against a portrait
   viewport plus the sheet. Does not reopen the pin-density ruling: the resting map is unchanged.
4. **IA-1 · `/chronology` is reachable from nowhere** — 0 links across 81 rendered pages, while
   prerendered, in the sitemap at priority 0.7, and rendering 171 shrine links. Six e2e specs
   exercise it and every one arrives by `page.goto`, which is why it survived.
5. **IA-2 · Desktop has no top-level navigation at all** — `.tabbar` is hidden at ≥641px, and five
   routes hang off one component that renders only when nothing is selected.

The rest of the ranking, and the items that need Rauf rather than an agent, are in the council
document. What was already in "Waiting on a person" below still stands.

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
pages.~~ **One half fixed, the other half retracted — 30 August 2026.**

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

Both reading piles were taken to the end on 30 August 2026, and the result is a negative worth
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

**Found 30 August 2026 while looking for what a reader sees where the archive is silent:** the
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

**The orphaned-guard sweep, finished 30 August 2026 — and the answer is reassuring, which is why
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

**A photograph that cannot be fetched used to offer itself anyway — closed 30 August 2026.**
Measured on `/shrine/gurdwara-sacha-sauda`, whose only image 404s: the gallery rendered one tile,
the tile was a `<button>` announcing *"Image 1: Open image"*, and pressing it opened the lightbox
full-screen over a broken image with **no text in it at all**. A sighted reader was invited to
open a picture that does not exist; a screen-reader user was told there was one and then handed an
empty dialog. Three entries were in that state, and it is not a fixed list — `check_image_liveness.py`
went 53 → 54 in four days when a host's certificate expired.

A photograph that cannot be fetched is now treated as a photograph the archive does not have,
which is what it is, and which is how the **51 entries with no photograph already render**: no
gallery section at all. No new sentence, so no Urdu to author. `e2e/gallery-dead-image.spec.ts`
injects the failures rather than pointing at a URL that is dead today.

*Three drafts of that spec asserted against a page whose images had never been requested.* Gallery
images are `loading="lazy"` below a long article, so on an untouched page the browser never asks
for them — nothing is fetched, nothing can fail, and the fix reads as broken. **Anything testing
image failure has to scroll the gallery into view first.** Two earlier implementations were wrong
the same way and are recorded at the code: a listener on the grid never fired (`error` does not
bubble, and React binds media events to the element), and matching a failed `<img>` back to its row
by URL prefix marked the wrong one dead — every Wikimedia Commons URL here shares 43 leading
characters, so an entry with one broken photograph and one good one lost the good one.
`ShrineImage` now reports its own failure through an `onLoadError` callback, which has neither
problem.

**`pipeline/photo_manifest.tsv` is gitignored, so a repair to it is not retained** *(raised by the
other session, 30 August 2026)*. They fixed 44 of 206 rows that were one field too wide — a stray
empty at index 2 shifting the Drive ID into `drive_filename` — which `csv.DictReader` then dropped
before they reached the list a person reads. **The repair is what made three of CLAUDE.md's
standing findings checkable**, two of which carried caveats saying they were not: the 18-video/
zero-audio count, Mauj Darya Bukhari's twelve lost files (all twelve `id_not_in_drive` rows in the
manifest are that one shrine), and "filenames lie" — `dfdfdfdfd - Saifullah Imtiaz.jpg` is three
rows, three Drive ids and three byte sizes across two shrines, where CLAUDE.md says one filename
spans two shrines. **The unfiled-media figure behind the RMS question is 30 files and 223 MB, not
the 44 and 448 MB first reported** — fourteen were re-uploads of already-matched rows, eleven of
them Mazar-e-Iqbal, and none of the unfiled objects is a video. The repair is recorded in HANDOVER with the steps to
redo it, and their test skips when the file is absent so a clone stays green. **Whether to track
it is a judgement for Rauf:** CLAUDE.md's layout puts manifests in `pipeline/` and RULE 0 argues
for retaining it; against that, its ~200 filenames name the surveyor, and this archive moved a
colleague's name out of a public field on 30 August. It belongs beside the RMS question.

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
  (The other three are audited in HANDOVER, 30 August 2026: one was live, two were orphaned in
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

  **This costs more than two absent pages, measured 30 August 2026 — it publishes a false claim
  about the archive's own holdings.** Both figures have `/saint/` pages: prerendered, in the
  sitemap, in both languages. The knowledge graph is built from the same 169-row snapshot, so both
  are marked `lineageOnly`, and both pages therefore tell a reader *"The archive holds no entry of
  its own for this figure."* The archive holds **5,268 and 5,374 characters** about them, live in
  the sheet right now, and **8,923 and 12,875 characters** of drafted entry in `entries/`. On the
  one surface whose whole claim is provenance, that is not a gap — it is a misstatement.

  `npm run data:check:unpublished` now asks the question RULE 0 implies and never checked: does the
  finished work in this repository reach a reader? It exits 1 until `data:build` runs, names both
  entries with their character counts, and names the `/saint/` page each one is contradicting. It
  is a named script rather than part of `verify` for the same reason `data:check:location` is —
  red until a person acts, on a sequenced action, and reddening the shared build helps nobody.
  Verified by adding the two live rows: at 171 it goes green.

  **And the bill is larger than two pages of prose.** Re-measured from the repaired
  `pipeline/photo_manifest.tsv` on 30 August 2026: the two shrines hold **23 media files between
  them, every one `matched` and fetchable** — Shah Gohar Peer 12 (9 images, 3 video) and Mian
  Qurban Ali Shah 11 (10 images, 1 video, 348 MiB). Set that against 54 entries with no working
  photograph, and against the archive's **18 video rows in total: four of them belong to these two
  entries**, in an archive whose stated purpose is oral history.

  **The line worth putting in front of Rauf is the share, not the count.** The two entries hold
  **360 MiB of the manifest's 4,782 — 7.5% of all the media the archive has recorded** — and the
  site says neither of them exists. *(Two sessions measured this independently and reported 365
  and 347 for the same file: decimal MB against binary MiB, agreeing all along and neither saying
  which. Units stated here for that reason.)* The gate reports these when the
  manifest is present and says nothing when it is not — the file is gitignored, so a clone has
  none of it, and the defect is the missing row either way.

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


- **Does the archive publish its own raw QA notes?** *Measured 30 August 2026 by the KB council
  (KB4-1); the decision is yours and nothing has been changed.* `qa_note` holds **50,009
  characters across 50 of 169 rows** — internal deliberation, including a block headed
  *"9. SENSITIVE — EDITORIAL DECISION NEEDED"* discussing a conversion claim, a conflict claim
  naming the Sikh community, and an undated property-origin claim about a named existing Lahore
  institution. It is not rendered on any page, and it **is published three times over**: in
  `src/data/shrines-fallback.json`, which builds to a 925 KB chunk listed in the Workbox precache
  manifest and therefore fetched in the background on every first visit; in this public
  repository; and in the Zenodo bundle, via `data/shrines.json` in `release.mjs`'s `DATA_FILES`.

  **Two files reasoned from the premise that it was withheld, and it never was.**
  `validate-publication-safety.mjs` exempted the internal columns because they "are already
  withheld from every page by `INTERNAL_ONLY_KEYS`" — that constant feeds `NON_DETAIL_KEYS`,
  whose only consumer filters the infobox's row iteration. And `build-location-hygiene-patch.mjs`
  moved four colleague-directed notes into `qa_note` on 30 August because it "already never
  renders", so those notes are in the public bundle now. **Both premises are corrected in place;
  the behaviour is not changed**, because whether a provenance archive should publish its own
  doubts is an editorial question and a good archive might answer yes.

  Three ways to go, and they are not equivalent: **(a)** strip `INTERNAL_ONLY_KEYS` from the
  snapshot in `build-dataset.mjs`, which covers the bundle, the repo and the release in one
  filter and costs the release its `qa_note` column; **(b)** keep publishing and say so, in
  `datapackage.json`'s field description and in `DATA_RELEASE.md`, so a downstream reader knows
  what they have; **(c)** publish the *reviewed bilingual* `src/data/source-notes.json` instead —
  the cleaned, attributed form the 22 August ruling created for exactly this material, which is
  currently in neither the release bundle nor the descriptor. Under (a) or (c) the sensitive block
  still wants reading by a person before anything ships.
- **Four order memberships have no basis in the archive, and render as *more* settled than the
  sourced ones.** *Measured 30 August 2026 by the KB council (KB1-1); the guard is in, the
  reader-facing half is yours.* `rahman-baba → chishtiyya`, `makhdoom-burhan-ud-din →
  suhrawardiyya`, `sufi-shah-inayat-shaheed → qadiriyya`, `sachal-sarmast → qadiriyya`. Their only
  basis is a bare `slug → orderSlug` line in `kg-seeds.json#saintOrders`. All four shrine rows'
  `silsila` cell is empty and none of the four Descriptions names the order.

  **The presentation inverts the truth.** `getOrderMemberships` reads `reviewed: r.reviewed !==
  false`, and `reviewed` is *absent* on every hand-seeded edge, so it resolves to `true` and the
  chip never shows. The four unsourced claims are bare order badges; the 43 machine-extracted
  memberships beside them carry a chip, a verbatim quote and a citation.

  Done here: `build-kg.mjs` now reports `seeded-order-has-no-basis` — its
  `seeded-order-contradicts-sheet` check was nested inside `if (asRecorded)`, so the four seeds
  with no sheet cell were exactly the four it could not question. `saintOrders` now accepts
  `{ "order", "source", "note" }` so a seed can be closed by naming a work. And
  `orderMembershipBasis.test.ts` fails on a fifth.

  **Two ways to close it, and both are yours.** Name a source the archive holds for each — all
  four are well attested in the general literature, and *that is not this archive saying so*
  (RULE 2), so it has to be an entry, a survey or a work in the collection. Or mark the four
  `reviewed: false` so the chip appears — which also needs `/about`'s sentence reworded, because
  it currently reads *"Machine-extracted claims … are marked unreviewed wherever they appear"* and
  ties the chip to machine extraction. That rewording needs Urdu.

- **`/about` says the archive rests on "464 distinct sources"; 57 of those are placeholders.**
  *Measured 30 August 2026 (KB1-2). The classification now reaches the data; what the page says
  about it is yours.* The archive's own `GENERIC` rule in
  `pipeline/build_sources_registry.py` defines a placeholder — "General established histories of
  the Chishti revival in nineteenth-century Punjab", "Local hagiographical tradition … to be used
  with due caution" — and **one of the 57 is a withdrawal notice**: *"Pending. Prior source
  attribution for this entry has been withdrawn as unreliable."* It holds a source id and a slug
  and is counted among the archive's distinct sources. 59 of 533 citations point at one.

  The separation is documented as load-bearing in three places — `build_sources_registry.py`'s
  docstring ("until they are separated you cannot tell a sourced claim from an unsourced one"),
  HANDOVER §3, and `BADGE_GLOSSARY.md` ("without that separation the badge would be flattering
  rather than honest"). It was applied to the **badge**, in Python, offline, writing TSVs that
  nothing ships — and never to the **count**.

  **Two of the 57 are in the prominent shared list, and a reader can walk to one.** `SourceReach`
  links any citation shared by two or more entries to `/about#source-…`, so following "also cited
  by 1" under a Uch Sharif bibliography lands on "General established histories of the Suhrawardi
  order and of Uch Sharif."

  Done here: the rule is ported to `src/lib/data/sourceKind.ts` and
  `scripts/data/lib/sourceKind.mjs`, `kg-sources.json` tags all 57, `buildSourceIndex` returns
  `placeholders`, and `sourceKindSync.test.ts` runs all three implementations — including the
  Python — over every one of the 464 names and requires identical answers.

  **Nothing renders it, because the choice is a wording one and it is yours.** Three options,
  and they say different things: leave the headline at 464 and mark the 57 in the list; drop the
  headline to 407 and say "distinct citable sources"; or publish both, the way `/about` already
  publishes "of them read and signed off by a human reader — 0". **Do not delete the lines**
  (RULE 2) — the withdrawal notice is among the most honest sentences in the archive. Whichever
  way it goes, the copy lands in `uiStrings` and needs Urdu.

- **The citable release calls itself "a bilingual (English/Urdu) dataset" and contains no Urdu.**
  *Measured 30 August 2026 (KB4-7). The contents-table half is fixed (`a1d7fbc`); this half is
  yours.* `scripts/data/release.mjs` bundles fifteen files. Arabic-script character counts across
  all of them: the 1,192 in `shrines.json` are Urdu *terms inside English prose*, and
  `grep -o '@en\|@ur' data/export/graph.ttl` gives **2,088 `@en` and zero `@ur`**.

  Not in the bundle: `src/data/urdu-content.json` (433,765 Urdu characters, **168 full Urdu
  articles**), `src/data/urdu-seed.json` (the data dictionary), `src/data/source-notes.json` (the
  bilingual "where the source contradicts itself" disclosures — 131 notes, none with an empty
  `ur`), `data/kg-traditions.json` and `src/data/tours.json` (8 tours, 46 of 46 stops with a
  `narrativeUr`).

  `CITATION.cff` — the file the release exists to be cited by — opens *"A bilingual
  (English/Urdu), schema-validated, open dataset…"*; `codemeta.json` repeats it; `/about` says
  *"The Urdu edition is a first-class edition, not a translation layer."* A researcher who follows
  `DATA_RELEASE.md` to the DOI, cites it, and works from the deposit has the English half of a
  bilingual archive and a citation record saying otherwise. The 168 Urdu articles are the largest
  body of original work in the repository after the English prose.

  **Two ways to close it and they are not equivalent.** Add the Urdu artefacts to `DATA_FILES` —
  a three-line change, and that every Urdu article is an unreviewed draft is already the archive's
  stated position on `/about` ("of them read and signed off by a human reader — 0"), so it belongs
  in the release README rather than being a reason to withhold. Or amend `CITATION.cff` and
  `codemeta.json` to stop claiming bilingual. Publishing is the better answer, and it is a
  licensing-adjacent decision about what the archive distributes, so it is yours.

  A third, mechanical part needs no ruling and is not done: both exporters emit `@en` on 2,088
  literals with no Urdu path, and adding `@ur` where `urdu-seed.json` has a name is wiring.

- **Two Urdu group headings are the same word, and one of them is now visible.**
  *Found 30 August 2026 while wiring Urdu place search; needs a fluent speaker.*
  `searchGroupSites` and `placesTitle` are both `مقامات`, while English
  distinguishes "Sites" from "Places". An Urdu query now returns three groups
  headed **«مقامات | شخصیات | مقامات»**. The collision is in the strings and
  predates the wiring — it was invisible only because the Places group never
  appeared in Urdu.

  **Which of the two is wrong is already settled by the archive's own usage:**
  reviewed Urdu uses مقامات for *sites* consistently (`sharedGroundIntro` — "پیدل
  فاصلے پر N دیگر مقامات"; `sharedGroundSamePin` — "ایک ہی درج مقام"). So
  `searchGroupSites` is idiomatic and `placesTitle` is the ambiguous one. There
  is **no reviewed Urdu term for a locality anywhere in the repo** to substitute,
  so choosing one is composition rather than substitution, and it is yours.
  Shipped ambiguous rather than held: unreachable is worse than
  ambiguously-labelled, and the place rows are distinguishable by their
  site-count meta even while the headings are not.

- **The Urdu UI calls every site a shrine, which is the overclaim the English
  rename corrected.** *Found the same way, and it is the larger of the two.*
  Three reviewed strings render English "site" as **مزارات** (shrines/tombs):
  `placeSitesHeading` — English "Sites recorded here", Urdu "یہاں درج مزارات";
  `placeSiteCount` — "N sites" against "N مزارات"; `placesUnplaced` — likewise.

  On 30 August the archive was renamed *away* from "Sufi shrines" in English
  precisely because **88 of its 171 sites are not shrines** — they are temples,
  gurdwaras, darbars, a Jain complex and a memorial. The Urdu edition still makes
  that claim on every place page, in the reviewed strings. It is the same defect
  as `UI_TEXT.ur.siteTitle` already recorded above, in a place nobody had looked.
  `src/lib/i18n/uiStrings.ur.ts`, and it is Urdu content (RULE 2) — annotated
  here rather than guessed at.

  **Measured 30 August 2026, and the wording is not merely imprecise.** Of the
  **29 published place pages, 25 show "یہاں درج مزارات" above at least one site
  that is not a Muslim Shrine, and on 13 of them there is no Muslim Shrine under
  it at all** — Dadu 3 of 3, Qambar-Shahdadkot 2 of 2, Hingol 2 of 2, Karachi 8
  of 11. On those thirteen the heading contradicts every item beneath it.

  **Why the obvious substitution is not available, which is the decision.** The
  archive's own reviewed word for a site is مقامات, so swapping it in looks like
  the `graphExplorerIntro` substitution that needed no fluent speaker. It is not
  the same case: **that replacement word was idle, and this one is already
  doing another job.** `placesTitle` is also مقامات, and it renders on *every*
  place page as the breadcrumb crumb (`PlacePage.tsx:304`) and on `/about`
  directly above the per-place counts (`ArchiveKnows.tsx:369` over `:379`). So
  substituting would put مقامات in two senses on one page, on two surfaces.
  The two strings have to be settled together, as one question: **what is the
  Urdu for a locality, and does مقامات then belong to sites alone?**

- **Five figure pairs claim the same name and the identity gate reported zero.** *Measured
  30 August 2026 (KB2-5); the gate now sees them, the verdicts are yours.* `saintNameKey` is the
  archive's identical-name test and `validate-kg-identity.mjs` states the rule it enforces —
  *"identical names are the one signal this project accepts as proof of the same person."*
  `findNameKeyCollisions` read `node.name` and nothing else. **An `altName` is a name.**

      "bhai gurdas singh"   bhai-gurdas-singh (name)     ·  bhai-gurdas (alt)
      "kanhiya lal"         bhai-gurdas-singh (alt)      ·  bhai-gurdas (alt)
      "bhai kanya lal"      bhai-gurdas-singh (alt)      ·  bhai-gurdas (alt)
      "jhulelal"            jhulelal (name)              ·  sheikh-tahir (alt)
      "zinda pir"           khwaja-muhammad-qasim (alt)  ·  jhulelal (alt)

  **Three of the five are the same two nodes**, and they are otherwise near-identical: both typed
  `Sant`, both titled "Bhai", both `disciple_of guru-gobind-singh`, differing in their shrine
  (Balochistan vs Sindh). Both came out of composite cells — the retired slugs
  `bhai-gurdas-veneration-of-guru-nanak` and `bhai-gurdas-singh-disciple-of-guru-gobind-singh` say
  so — which is the process that produced this archive's known splits *and* its known false
  merges.

  **Not decided here, and deliberately.** `docs/KG_REVIEW_WORKFLOW.md` records that **19 of 21**
  name-similarity merges attempted in this project were wrong, so a shared name is a question and
  RULE 2 forbids answering it from general knowledge. The likelier reading is not that they are
  one man but that they are two correct pages each carrying the other's names in its "also known
  as" list — which is its own defect: a reader at `/saint/bhai-gurdas` sees "Bhai Gurdas Singh"
  as an alias and has no way to learn a different figure holds it as a name.

  Each pair is cleared the same way any decision here is: merge them, or add a `saintDoNotMerge`
  entry with the verbatim quote and its source. The five are allowed **by name**, so a sixth fails
  while these wait and clearing one does not license another. `saintDoNotMerge` currently holds 14
  entries and a decision on none of these.

  *One is data hygiene rather than identity and can go without a ruling:*
  `khwaja-muhammad-qasim` carries both `Zinda Pir` and `"Zinda Pir"` — the same alt-name twice,
  once with literal quote characters in the string.

- **62 entries have a substantively different Description under an unchanged provenance record.**
  *Measured 30 August 2026 (KB1-3). The fabricated dates are removed (`this commit`); the
  re-tiering is yours.* `data/provenance.json` is frozen at its `updated` stamp by design —
  `build-provenance.mjs` is additive-only and never revisits a record when the text it describes
  changes, and there is no digest of that text. Diffed against the 12 July commit, normalising the
  known `=====` separator artefact and smart quotes and requiring the **word count** to have moved:
  **62 changed, 51 of them having gained an entire bibliography.** 43 are still recorded as
  *"Automated enrichment pipeline … Claude-assisted web research"*, `method: llm`,
  `confidence: 0.6`.

  Six `Field-verified` / `Full` entries added in August — every one citing the Shrines Project
  field survey in its own prose — are recorded as *"Pre-existing sheet content … origin inferred by
  elimination, not independently confirmed"*, which renders to a reader as **"pre-existing
  entry"**. The panel is behind `hasProjectAccess()`, so its audience is the project team, which is
  exactly who consults it to decide whether a sentence needs re-checking.

  **Re-tiering is not an agent's.** `contentTier` is a claim about how a passage was written, and
  the store's own note calls `sheet-original` "inferred by elimination". Deriving it afresh from
  today's text would be inventing provenance (RULE 2). The six field-survey entries are the
  exception — their tier is answerable from survey records the project already holds.

  **The guard that would catch the next 62 is a digest** of the described text stored beside
  `contentTier`, failing when a shipped Description no longer matches its record. Not written here
  on purpose: stamping today's digest onto a record that describes yesterday's text would bless the
  drift rather than find it, so the first digests have to be written by whoever re-tiers.

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
