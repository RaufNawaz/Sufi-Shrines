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
| An Urdu reader could not find a figure by their Urdu name | `HEAD` |

---

## Next, in order

Each item names what a reader loses, so the ranking can be argued with rather than just followed.

1. **Filters change the URL and the list and never the map.** Pick "Jain Temple", see "3 of 171
   sites", and all 171 pins remain — and that URL is shareable. `MapPage` passes the unfiltered
   array to both `ShrineMap` and `MapSidebar`.

2. **Four of five entity routes answer an unknown slug by silently becoming the map.**
   `/shrine/zzz`, `/saint/zzz`, `/order/zzz`, `/tradition/zzz` end at `/` with the URL rewritten.
   `/place/zzz` does the right thing and is the model to copy. Merging two figure nodes retires a
   published `/saint/` URL, so this is live risk.

3. **The archive search palette announces nothing** on every route except the map. No `aria-live`
   in `ArchiveSearch`; the pattern is twenty lines away in `CommandPalette`. Its combobox also
   hardcodes `aria-expanded="true"` and points `aria-controls` at a listbox that is not rendered.

4. **Search says 44 matches and shows 40.** `MAX_RESULTS = 40`; the status line reports
   `results.length` rather than what is on screen. **Blocked on a UI string** — reporting
   `visible.length` instead would be a different falsehood, so it needs a truncation string in
   `uiStrings.ts`/`.ur.ts`, which the other session has been editing. Coordinate before taking it.

5. **A section header is drawn sixteen ways** across twelve routes — six sizes, two typefaces,
   four rule weights, two byte-identical blocks 236 lines apart in one file. `/about` is the
   visible symptom: its rules stop at 767px for nine headings and 1054px for seventeen.

6. **Starting a guided tour drops focus to `<body>`** and announces nothing; the panel's live
   region is created already populated, which screen readers do not announce.

7. **Cobalt means "interactive" everywhere except the archive's own data graphics** —
   `/chronology`'s 120 bars and one of `/about`'s two charts, which sits directly beneath six bars
   drawn in the tradition palette.

8. **The photo grid is forced left-to-right in Urdu** while its arrows are mirrored and its arrow
   keys swapped. Wants a decision, not a deletion: the override carries a comment restating the
   rule without a reason.

9. **A shrine names its order and never links to it** — the only one-way edge in the entity
    graph. 48 of 54 `silsila` values resolve to exactly one order page.

10. **The shrine page overwrites its own clean share snippet with raw markdown**, so the live DOM
    description begins `## Overview`; seven index routes ship the map's blurb; `hreflang`
    alternates appear on one prerendered page out of ~800.

11. **82% of on-screen pins do not receive a tap at their own centre** at the opening view. The
    largest by reader impact and by cost; wants a decision about clustering.

---

## Waiting on a person, not on an agent

- **The archive calls itself "Sufi Shrines" and 88 of its 171 sites are not Sufi shrines.** Four
  string constants and a prerender suffix once the name is chosen; no slug and no deploy path
  change. The name is an editorial decision.
- **Four entries publish an internal to-do naming a colleague in the reader-facing `Location`
  field** — *"ask Saifullah for a precise pin"*, one opening with the literal token `FLAG:`.
  Needs a CSV patch and a human import (RULE 3). The reader-facing caveats stay; the instruction
  moves to `qa_note`, which already never renders.
- **Seven sentences defining the trust vocabulary** the badges already print. 31% of entries say
  "Source-seeded" and nothing on the site says what that means.
- **The 171-vs-169 dataset drift** (HANDOVER §9.156, §9.148) still needs `npm run data:build`
  after the category patches are imported.

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
