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

---

## Next, in order

Each item names what a reader loses, so the ranking can be argued with rather than just followed.

1. **82% of on-screen pins do not receive a tap at their own centre** at the opening view. The
    largest by reader impact and by cost; wants a decision about clustering.

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

**Left from the share-snippet work, both prerender-side and untouched:** seven index routes
(`/almanac`, `/chronology`, `/typology`, `/graph`, `/shared-ground`, `/settings`, `/review`) ship
the map's blurb as their description rather than one about the page; and `hreflang` alternates
appear on `dist/index.html` only — **zero on the ~800 other prerendered pages** — so the `/ur`
mirror that exists purely so crawlers find the Urdu edition is never declared as its alternate.
Both are `scripts/prerender.mjs`.

## Waiting on a person, not on an agent

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
- **Three citation strings give three answers.** `LICENSE-data.md` says v1.0.0 / 2026,
  `citation.ts` says v2.0.0 / 2026, the release README says v1.0.0 / **2025**. A version and a
  year are facts, so they are recorded rather than picked (HANDOVER §9.172). Related and also
  deliberately unrenamed: `PUBLICATION.attribution` mirrors the ODbL attribution that
  `LICENSE-data.md` *requires of people using the data* — changing that is a licence change, not
  a rename.
- **Four patches await import** (RULE 3 — a human imports, agents do not write to the sheet):
  `patch_schema_hygiene_2026-08-27.csv`, `patch_year_built_precision_2026-08-29.csv`,
  `patch_site_type_2026-08-30.csv`, and `patch_location_hygiene_2026-08-30.csv` — the last
  produced 30 August (`68173c4`), moving four entries' "ask Saifullah…" instructions out of the
  public `Location` field into `qa_note` while keeping every caveat. `npm run data:check:location`
  fails until it is imported, by design.
- **Then `npm run data:build`**, which closes the 171-vs-169 drift (HANDOVER §9.156, §9.148) —
  two shrines currently invisible to the graph, search, `/about` and the Urdu dictionary, and two
  figure pages telling readers an entry the archive holds does not exist. Order matters: patches
  first, then `data:build`, `data:kg`, `data:index`, traditions, and `data:check:live` to confirm
  zero drift.
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
