# Next steps and the blue-sky line — 21 August 2026

**What this is.** The working plan from here, written the day A8 step 2 closed. It
supersedes the sequencing sections of [`PROJECT_VISION.md`](PROJECT_VISION.md) ("Suggested
sequencing") and [`DESIGN_VISION.md`](DESIGN_VISION.md) (Part 4's revised sequencing) —
those documents remain the reference for *what* each track and feature is; this one says
*what happens next and in what order*, against the state of 21 August. Every status claim
below was checked against the repo today, not carried forward from an older doc.

---

## 0. Where the project actually stands

**Data.** 171 rows live on the sheet; 169 ship to the site (2 dropped for empty
coordinates — `darbar-hazrat-shah-gohar-peer`, `darbar-mian-qurban-ali-shah`).
`support_level`/`info_level` populated across all rows. `data/provenance.json` current at
169/169 (the 163-row staleness noted in DESIGN_VISION Part 4 was fixed 18 August —
`0da15d3`). One row still carries the out-of-schema category `Islam` in the live snapshot,
which means **the 4-row schema patch from 18 August was never imported** (§B4 below).

**Urdu.** Dictionary gates at 100% coverage, zero Latin leaks. Articles: 168/171 drafted —
A8 step 1 (five full translations, 18 Aug) and step 2 (all 74 deltas, 21 Aug,
`25150d6`..`8b9621e`) are done; the last 3 are blocked on editorial decisions, not on
work. **0 of 168 articles have been read by a human.** That is now the single largest
risk and the single largest queue.

**Frontend.** Urdu typographic identity (dense Nastaliq, de-carded chrome, verse blocks),
lamp-light dark mode, vector basemap with keyless CARTO fallback, the Urs Almanac with
honest Hijri precision + `.ics` export, `/graph` linked from the welcome card, the
41 MB → 1.2 MB image fix, 44 px touch targets. `npm run verify` green at 426 unit tests;
59 Playwright specs exist (blocked in the web sandbox by a pinned-browser mismatch — a
config escape hatch is drafted, §A2).

**The ledger.** The 49-uncited-entries risk is closed (imported 18 Aug). Zero audio
recordings against a stated oral-history purpose. Mauj Darya Bukhari's 12 media files
verified lost; Data Darbar and Bibi Pak Daman photos WhatsApp-compressed. Coverage ~31%
of the Punjab Auqaf register alone.

---

## 1. The constraint that orders everything

This project has one editor (you) and one surveyor (Saifullah). Every path to "actually
done" — reviewed prose, imported patches, editorial policy, photographs, audio — passes
through one of you. So the plan runs in three lanes:

- **Lane A** — agent-executable now, no input needed. Chosen not just for value but for
  how much each item *cheapens Lane B*: the best use of autonomous time is making your
  scarce time go further.
- **Lane B** — queued on a decision or an act only you can perform. Each item names the
  exact artifact that is waiting and what it unblocks.
- **Lane C** — the blue-sky line: where this is going, so Lanes A and B always have a
  direction to point at.

---

## 2. Lane A — next sessions, no input needed

Ordered. Each has a definition of done; nothing counts until `npm run verify` (and where
UI-visible, `npm run e2e`) is green and the finding is written into the repo (RULE 0).

### A1 — Fix Urdu search parity (a real bug, found and verified 21 Aug)

`src/lib/search/useSearch.ts` builds each search document's `urduName` from
`getUrduFieldValue(s.raw, 'Name')` — i.e. from a sheet column (`Urdu Name`, `Name Urdu`,
…) that **does not exist**: the 21 Aug snapshot has zero Urdu-variant columns. So
`urduName` is the empty string for all 169 documents, and a reader who types **داتا
دربار** into search gets nothing except accidental matches. Meanwhile the UI displays
Urdu names everywhere via `localizeShrineName()` → the 548-entry seed dictionary. The
search index and the visible names have diverged.

**Fix:** index the same name the reader sees — `localizeShrineName(shrine, 'ur')`
(dictionary fallback included) — plus the Urdu location/saint strings where the
dictionary has them. The worker's `processTerm` folding (harakat, yeh/kaf variants)
already exists and is tested; it was built for exactly this input and currently receives
none.

**DoD:** unit test on the doc builder; a new e2e in `urdu.spec.ts` — type داتا in
`?lang=ur`, expect Data Darbar ranked first; no-leak guard still green. This is a
mission-bar item: "Urdu as complete as English" currently fails at the search box.

### A2 — Make the e2e suite run where the agent works

All 59 specs fail in 2 ms in the Claude Code web sandbox: the repo pins
`@playwright/test` 1.61 (wants `chromium_headless_shell-1228`) while the sandbox
pre-installs build 1194 and blocks downloads. A `PLAYWRIGHT_CHROMIUM_EXECUTABLE` escape
hatch in `playwright.config.ts` is drafted (no-op when unset). **DoD:** one full 59-spec
run recorded from the sandbox; the mechanism documented in `FRONTEND_NOTES.md`; consider
a `SessionStart` hook exporting the variable so future sessions get it for free. Until
this lands, every UI change made remotely ships with unit coverage only — that gap has
bitten before (HANDOVER §9 items 9–10 were both caught by e2e, after deploys).

### A3 — The review cockpit: turn 168 unreviewed articles into a walkable queue

The biggest liability is not missing content but unreviewed content live in production.
Reviewing from raw files means opening two sources per entry and diffing by eye —
archaeology, not editing. Build the tool that makes review a three-minute job:

- a generator producing **side-by-side EN/UR review pages** (one HTML per entry, or one
  paginated file), priority-ordered: tour stops and the eight high-traffic entries first;
- a machine-readable ledger `urdu-i18n/reviewed.json` (`slug → {reviewer, date}`), with
  `TRANSLATION_LOG.md` reporting **drafted** and **reviewed** as separate numbers instead
  of the current single flag;
- a gate: an entry edited after its review date drops back to unreviewed automatically
  (hash the source text into the ledger — an invariant, not an intention; RULE 4).

**DoD:** queue + ledger + regenerated log committed; the top-8 review packet ready for
you. This is the item that converts Lane B1 from "someday" into "next sitting".

### A4 — F2 groundwork: the Auqaf register as data

The honest coverage map (Lane C, F2) needs the Punjab Auqaf register (534 sites) as
structured data before it needs any UI. Extract it to `data/auqaf-register.csv` with
per-row provenance, then a matching script (name + district fuzzy match against our 171,
emitting a human-confirmable report — never auto-merging). **DoD:** register file +
match report committed; unmatched-both-ways lists are the seed of the public "not yet
documented" page.

### A5 — Cite-this-entry

Per-shrine citation block (BibTeX / CSL-JSON / plain text) generated at prerender time,
with `support_level` carried into the note field so a citer inherits the honesty. Cheap,
scholarly, and the precondition for anyone treating the archive as a source rather than
a website. Pairs with B6 (DOI). **DoD:** visible on shrine pages in both languages,
prerendered, e2e-checked in the no-leak guard.

### A6 — Axe/Lighthouse pass on the two newest pages

`/almanac` and `/graph` shipped after the last full a11y sweep. Run the existing axe
specs against them, fix what surfaces, add them to the e2e a11y matrix so they stay
covered. **DoD:** both pages in `a11y.spec.ts`, green.

---

## 3. Lane B — queued on you

Each item is one sitting or less. In rough order of leverage:

1. **Review Urdu articles** (unblocked by A3). Start with the eight named in
   `docs/TODO.md` §0a. Every review converts `reviewed=false` risk into standing content.
2. **Answer `docs/EDITORIAL_DECISIONS_PENDING.md`** — four policy questions plus the
   sensitive-content call on two entries. Unblocks: the last 3 Urdu translations (A8
   step 3), qa_note surfacing, and F7's contradiction display. The briefs are written;
   this is four decisions, not a project.
3. **Coordinates for the two dropped rows.** Shah Gohar Peer carries one of only ~23
   day-precise urs dates in the archive and a finished Urdu article that nobody can see.
   RULE 2 forbids inventing coordinates; only a human confirms them.
4. **Import `data/patch_schema_and_truncation.csv`** (4 rows, settings per RULE 3:
   replace sheet, comma, conversion OFF). Verified still pending — the live snapshot
   retains category `Islam`. Fixes out-of-schema categories and six truncated cells.
5. **Send the Saifullah message** (`docs/message_to_saifullah_2026-08-16.md`, drafted
   five days ago) and commission re-shoots: Mauj Darya (total loss), Data Darbar and
   Bibi Pak Daman (compression). The photo debt only ages badly.
6. **Mint the DOI** — `docs/DATA_RELEASE.md` §3 is a 15-minute Zenodo walkthrough.
   Feeds A5's citation block a real identifier.
7. **The oral-history go/no-go** (`docs/DECISION_oral_histories.md`). Gates F3, F8, F9.
   HANDOVER §10 already says it plainly: if oral history is the purpose, it needs a
   decision, not a backlog entry.

---

## 4. Lane C — the blue-sky line

Status refresh of DESIGN_VISION Part 3, then what's genuinely new. The standing rule for
all of it: every feature renders something the archive already *is* — bilingual, honest
about uncertainty, built from primary materials — or it doesn't get built.

### The existing ten, as of today

| # | Feature | Status 21 Aug | Next gate |
|---|---|---|---|
| F1 | Urs Almanac | **Shipped 18 Aug** (`26ed561`), with `.ics` and honest Hijri precision | Per-shrine urs pages; PWA return-visit notifications |
| F2 | Honest coverage map | Not started | A4 (register as data) |
| F3 | Awaz oral-history shelf | Not started | B7 (the decision) |
| F4 | Witness view (then/now) | Not started | Gazetteer scan acquisition (in progress in `entries/`) |
| F5 | Silsila metro map | Not started | None — KG data exists; pure frontend |
| F6 | Ziyarat print packs | Not started | None — tours + prerender exist |
| F7 | "How do we know this?" | Unblocked (provenance.json now current) | B2 (contradiction-display policy) |
| F8 | Names, said aloud | Not started | B7, B5 (field kit in Saifullah's hands) |
| F9 | Sound of the place | Not started | B7, rights metadata model |
| F10 | State of the Archive | Not started | Becomes N6 below — first edition end of 2026 |

### New proposals (N-series)

**N1 — Ask the Archive.** Grounded Q&A over the corpus: retrieval strictly limited to
entry text + sources, every sentence carrying a claim-level citation, explicit refusal
outside the corpus ("the archive does not record this"). This is Track 5 sharpened to one
surface — and it is *gated behind F7*, deliberately: a Q&A layer built before claim-level
provenance exists would launder exactly the uncited prose this project spent August
citing. The refusal behaviour is the feature; a shrine archive that answers confidently
beyond its sources is worse than none.

**N2 — Wikidata / Commons round-trip.** Match our 171 against Wikidata (many shrines
have QIDs; many don't — minting them is a contribution), push our field-verified
coordinates and CC-licensed photos outward, pull sitelinks and structured data inward.
The highest-leverage reach move available: it puts the archive's corrections into the
infrastructure every other site reads from. Gate: a media license audit first — we push
nothing whose rights we can't state.

**N3 — The field-kit PWA.** An offline-first capture form for Saifullah aligned to the
schema (site_type/status vocabularies as pickers, coordinate capture from the phone,
photo slots keyed by Drive ID), queuing submissions offline and exporting **CSV patches
for human import — never writing the sheet** (RULE 3 preserved by construction, not by
promise). Turns the WhatsApp-message-to-transcription pipeline into structured data at
the moment of collection, and makes A4's "help us document this shrine" list actionable
by anyone we trust with the kit.

**N4 — The third language: Punjabi in Shahmukhi.** Track 4 made concrete and cheap-first.
Shahmukhi reuses the entire hard-won Nastaliq/RTL stack — fonts, Eastern numerals, bidi
isolation, the no-leak gate pattern — so the real cost is architectural (the `en | ur`
union type threaded through `LanguageContext`), not typographic. Do the type-level
generalisation as a refactor *now-ish* while the i18n code is warm, even if Punjabi
content waits; Sindhi (also Arabic-script, and where a third of the shrines stand)
follows the same rails. The mission argument writes itself: Bulleh Shah's entry should
be readable in the language he wrote in.

**N5 — Adopt-a-shrine.** A public sponsorship wall funding exactly the debts the ledger
names: a re-shoot for Mauj Darya, scanning for a tazkira, a survey trip for an
undocumented Auqaf-register site from F2's list. Money attaches to a named, verifiable
artifact; the thank-you is the artifact's provenance line. Honest fundraising for an
honest archive.

**N6 — State of the Archive 2026.** F10, committed to a date: first edition at year-end.
Generated from the data: coverage vs the register, support-level distribution, the year's
corrections ledger (HANDOVER §9 made public — the archive grading itself is the brand),
what was lost, what was recorded. The artifact for funders, the Auqaf department, and
the project's own accountability.

**N7 — The typology atlas.** A visual browser of built form — `site_type` already
encodes it (octagonal Multani towers, haveli darbars, stepwells, cave asthans). Filter
the photo corpus by form, era, and tradition; every image already carries its shrine's
provenance. The cheapest genuinely-new *reading* of data the archive already holds.

---

## 5. Sequencing

| Horizon | Items | Exit condition |
|---|---|---|
| **Now** (next 1–3 sessions) | A1 search parity · A2 e2e-in-sandbox · A3 review cockpit | Urdu search works; e2e runs remotely; review queue in your hands |
| **Next** (as B-items land) | A4 register data · A5 cite-this-entry · A6 a11y pass · A8 step 3 (after B2) · qa_note surfacing (after B2) | Coverage data merged; last 3 articles drafted |
| **Quarter** | F2 coverage map UI · F7 claim provenance · F5 metro map · F6 print packs · N4 type-level i18n refactor · Track 1 sources shelf | The "honest archive" surfaces exist end-to-end |
| **Year** | N1 Ask the Archive (behind F7) · N2 Wikidata round-trip · F4 witness view · N6 State of the Archive 2026 · F3/F8 if B7 says go | The archive is infrastructure, not just a site |

**Standing order within any horizon:** review-enabling work beats feature work; a bug in
shipped Urdu parity (A1) beats both. And the non-negotiables ride along unchanged: never
invent content (RULE 2), never write to the sheet (RULE 3), encode every new invariant as
a check that exits non-zero (RULE 4), and land every finding in this repo before the
session ends (RULE 0).

---

## 6. Corrections to earlier planning docs, so nobody re-derives them

- `DESIGN_VISION.md` Part 4 (18 Aug) says `provenance.json` is stale at 163 rows — fixed
  the same day (`0da15d3`; validate now reports 169/169). Its "F1 as the first new
  feature" recommendation is done (`26ed561`).
- `PROJECT_VISION.md` Track 0 "in flight" status: article drafting is now 168/171 with
  steps 1–2 complete; only the editorial-blocked 3 remain.
- `A8_URDU_DELTA_SCOPE.md` carries the full 21 Aug close-out note, including the
  baseline-advance trap and the `--snapshot` mechanics; read it before touching A8 again.
