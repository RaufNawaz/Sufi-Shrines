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

---

## Next, in order

Each item names what a reader loses, so the ranking can be argued with rather than just followed.

1. **Search says 44 matches and shows 40.** `MAX_RESULTS = 40`; the status line reports
   `results.length` rather than what is on screen. **Blocked on a UI string** — reporting
   `visible.length` instead would be a different falsehood, so it needs a truncation string in
   `uiStrings.ts`/`.ur.ts`, which the other session has been editing. Coordinate before taking it.

2. **Cobalt means "interactive" everywhere except the archive's own data graphics** —
   `/chronology`'s 120 bars and one of `/about`'s two charts, which sits directly beneath six bars
   drawn in the tradition palette.

3. **The photo grid is forced left-to-right in Urdu** while its arrows are mirrored and its arrow
   keys swapped. Wants a decision, not a deletion: the override carries a comment restating the
   rule without a reason.

4. **A shrine names its order and never links to it** — the only one-way edge in the entity
    graph. 48 of 54 `silsila` values resolve to exactly one order page.

5. **The shrine page overwrites its own clean share snippet with raw markdown**, so the live DOM
    description begins `## Overview`; seven index routes ship the map's blurb; `hreflang`
    alternates appear on one prerendered page out of ~800.

6. **82% of on-screen pins do not receive a tap at their own centre** at the opening view. The
    largest by reader impact and by cost; wants a decision about clustering.

---

**Left from the header work, and it is a layout question rather than a heading one:** `/about`
still shows two right edges — the section rules stop at one x for nine headings and another for
seventeen, because the two classes sit in containers of different width. The headings are now one
spec, so what remains is the containers. Same family as `.settings-page`'s dead `max-width`,
which `.entity-page` beats on import order.

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
- **Never leave a scratch file in the tree.** `prettier --check .` walks untracked files, so a
  stray file turns `npm run verify` red for both sessions and reads as the other one's failure.
- **`npm run build:e2e` and `npm run e2e` must be one chained command** — the other session
  commits every few minutes and the stale-dist guard fires on any gap.
- **A budget failure is not automatically yours.** Check `data/kg.json`'s size against the last
  commit before touching `check-bundle-budget.mjs`.
- Run the whole `npm run verify` before every commit, and mutation-check every new test by
  reverting the fix and watching it fail.

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
