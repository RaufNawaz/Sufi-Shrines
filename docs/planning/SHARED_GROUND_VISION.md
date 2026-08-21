# Shared Ground — a vision for the next phase

**Status:** proposed 20 August 2026. **Tracks A, B and D shipped 21 August 2026**; Track C is
last per the sequencing at the foot of this file, and still gated on date quality. Read alongside
[`PROJECT_VISION.md`](PROJECT_VISION.md)
(the nine-track roadmap) and [`DESIGN_VISION.md`](DESIGN_VISION.md) (aesthetic direction).
This document does not replace either; it argues for one idea those two do not contain, and
sizes it against the data we actually hold.

---

## The observation

This archive documents six traditions — Muslim shrines, Hindu temples, Sikh gurdwaras,
Nanakpanthi/Udasi darbars, Jain temples and secular memorials — and presents each site as an
island. Every page is about one entity. Every list is a list of one kind of thing.

But the coordinates say something the pages never do. Measured across the 169-row snapshot:

| | |
|---|---|
| Sites within 800 m of at least one other site | **62 of 169 (37%)** |
| Pairs within 800 m | **65** |
| Places where sites of **different traditions** stand within 800 m | **8** |

Concretely: **Data Darbar is 222 m from Gurdwara Chowmala Sahib** and 576 m from the shrine of
Peer Makki. **Dargah Pir Ratan Nath is 100 m from Gurdwara Bhai Beba Singh**, 208 m from Panj
Tirath and 411 m from the Gorakhnath Temple. **Prahladpuri Temple sits inside the Multan
complex** with Bahauddin Zakariya and Shah Rukn-e-Alam. Ranjit Singh's samadhi, the Loh
Temple, the Jain Mandir, Mazar-e-Iqbal and Qutbuddin Aibak's tomb are all within a few hundred
metres of one another inside Lahore's walled city.

That is not a footnote about this heritage. For much of Punjab and Sindh it *is* the heritage:
these communities did not build in separate places, they built on the same streets. An archive
whose stated commitment is "three living traditions, represented accurately and with dignity"
currently makes it impossible to see that.

**The north star for this phase: the archive should be able to answer questions no single row
can.** Shared ground is the first and most striking of those questions, and it needs no new
content — only relations we have never drawn.

---

## A warning, recorded because it nearly shaped this plan

The obvious model is a *cluster*: single-link everything within 800 m and call each connected
component a complex. Measured, that produces one "cluster" of 15 sites whose extent is
**3358 m**. Transitive closure had strung together the whole of central Lahore and called it a
courtyard.

So this plan does **not** use chained clusters as its primary unit. Two honest units instead:

1. **Neighbourhood (exact, per site).** "Sites within 800 m of *this* one." No chaining, so the
   number means what it says.
2. **Named place (where the data names it).** A shared Location phrase — "Uch Sharif" (extent
   51 m), "Saidpur Village" (68 m), "Nankana Sahib", "Miani Sahib Graveyard" — is a name the
   archive already records. Where no shared phrase exists, the place stays unnamed rather than
   invented (RULE 2).

An extent figure must ride along with any grouping we ever do show. A group without one is a
claim about proximity that has not been checked.

---

## Track A — Shared ground (experience + relations) · **SHIPPED 21 Aug 2026**

`src/lib/data/sharedGround.ts` + the section on each shrine page. The honesty fix it forced is
in: `NearbyShrines` shows metres below a kilometre, and for the four identical-pin groups it
shows "same recorded location" rather than a distance the archive never measured.

**Database.** Model adjacency as a first-class, derived relation rather than a runtime sort:
per site, its neighbours inside a radius, each with a measured distance and the neighbour's
tradition. Derived, regenerable, and never hand-edited — the same posture as
`data/kg-shrine-figures.json`.

**Experience.**
- On a shrine page, a **Shared ground** section: which sites stand within walking distance, and
  *how many traditions* are represented among them. The cross-tradition count is the headline,
  because it is the fact nobody can currently see.
- An overview route listing the eight cross-tradition adjacencies, each with its distance.
- On the map, an optional "shared ground" lens that draws the adjacency, so the walled city
  reads as one dense knot of four traditions rather than fifteen unrelated pins.

**Honesty requirement, not optional.** Four coordinate groups in the data are *identical*, and
every one is a documented approximation — the four Miani Sahib darbars share one pin because
the survey gives no position within the graveyard, and Darbar Malik Ahmad Ayaz carries Data
Darbar's pin because the survey ties its location to it. The existing `NearbyShrines` component
renders those as "0.0 km", which presents a recorded approximation as an exact coincidence.
Any adjacency feature must say **"same recorded location"** and point at the note. A distance
this archive did not measure must never be displayed as one it did.

---

## Track B — Places as entities · **SHIPPED 21 Aug 2026**

`/place/:slug` and `/ur/place/:slug`, one page per place holding two or more sites: which sites,
which traditions, and the span of the dates the archive can actually read. Indexed from
`/coverage`, linked from every shrine masthead, prerendered in both languages, in the sitemap.

**What shipped**

| | |
|---|---|
| Place vocabulary | **62 entries**, every one derived from a `Location` string that appears in the data |
| Pages built | **27** places with ≥2 sites (× 2 languages) |
| Densest place | **Lahore, 35 sites**, five of the six traditions |
| Sites the vocabulary cannot place | **8 of 169** — reported on `/coverage`, not rounded away |
| Urdu | all 62 names resolve through the dictionary; 282 place tokens added to the seed |

**What the data forced, and what it cost**

There is no District, City, Province or Region column — all of it is derived from one free-text
`Location`. Positional parsing does not survive that: measured over the snapshot, the last
comma-separated segment is "Pakistan" for 124 rows and a province for 35, and six rows carry a
paragraph of survey qualification instead of an address. So the vocabulary is closed and matched
anywhere in the string, the same technique `extractRegion` already used one level up.

Two consequences, both kept deliberately:

- **A site can be in two places.** "Uch Sharif, Bahawalpur District" matches both, because it is
  in both. Choosing one would mean suppressing a true statement.
- **The district/tehsil hierarchy this section hoped for is not here.** One `\bLahore\b` entry
  covers "Lahore", "Lahore District" and "Walled City, Lahore" without asserting that a district
  is a city. That is weaker than a hierarchy and it is what the data supports; a hierarchy needs
  a column the sheet does not have.

The page states counts, traditions and a date span, and **nothing else** — no prose about
Lahore, because the archive has none and writing some would be inventing content (RULE 2). The
date span reads only bare Gregorian years and skips every Hijri and hedged date rather than
flattening it into a point.

**Invariants added with it** (RULE 4): a vocabulary drift guard holding
`scripts/data/lib/places.mjs` to `src/lib/data/places.ts` structurally *and* over every Location
in the snapshot; a `/place/lahore` + `/ur/place/lahore` spot-check in the prerender gate; and
`src/styles/__tests__/classNamesStyled.test.ts`, which came out of this track's own mistake —
two class names written into JSX that existed in no stylesheet.

## Track C — Chronology · not started

Era parsing exists (`src/lib/data/era.ts`), the map has a time slider, and 69 of 196 figures
now carry dates — but there is no view in which the archive's whole span is legible. A
timeline spanning the 7th to the 21st century, banded by tradition, would show something else
no single row can: that these traditions' building phases interleave.

Prerequisite: dates are still thin and 31 rows have a date column that hardened a hedge the
prose never made (`docs/TODO.md` §0). A timeline must render "c. 1165" as an interval, not a
point, or it will launder uncertainty into false precision.

## Track D — The gaps as a first-class page · **SHIPPED 21 Aug 2026**

`/coverage`, computed by `buildCoverage()` from the shipped data on every page load.

**Two of the three numbers this section argued from were already wrong when it was written**,
which is the argument for the page rather than against it. Re-measured 21 August: 168 of 169
entries carry a bibliography (not 49 of 167 missing — the enrichment passes had closed it
weeks earlier and the note was still being quoted); coverage is ~32% of the Punjab register
(169 vs 534); 51 of 169 entries carry no photograph, and 242 image fields are populated across
the other 118. The video/audio count could not be re-measured at all — the sheet has no video
or audio column, so it came from media directories that are gitignored and absent from a fresh
clone. It is flagged as undated in CLAUDE.md rather than repeated.

That is exactly what the page fixes: a figure computed on every load cannot go stale the way a
sentence in a document can.

---

## A payload debt this phase created — **paid, 21 August 2026**

Correcting the dictionary's row universe grew `src/data/urdu-seed.json` from 49 KB to 67 KB, and
Track B's place tokens took it to 80 KB. `urduFallback` imported it statically, so all of it
landed on every route and `scripts/check-bundle-budget.mjs` had to be raised twice in two days.
The note here used to say what the real answer was and why it had not been done.

**It is done.** The dictionary is loaded on demand and gated on the reader's language, exactly as
`urdu-content.json` already was. Measured after: `index.html` fell from **322 KB to 248 KB** of
eager JavaScript and the map route from **611 to 537** — 74 KB off every one of the eleven
routes, for readers who were downloading a dictionary they never consulted.

The reason it had waited was real, not laziness: `translateToUrdu` runs **synchronously during
render**, so a late dictionary means a frame of English on an Urdu page. Four things close that:

1. the request starts at module scope in `main.tsx` from `detectInitialLang()`, before React's
   first pass — so for an Urdu reader it resolves alongside, usually well before, the sheet fetch;
2. `LanguageProvider` carries a `dictVersion` in its context value, so the arrival re-renders
   every component that translates (they all read `useLang()` anyway);
3. `useShrineData` waits for it where it already waited for the article payload, and rebuilds if
   it lands later — which also rebuilds the search index;
4. `useSearch` fetches it when a **query contains Urdu letters**, because the worker indexes both
   scripts on purpose and an English-interface reader pasting an Urdu name must still find it.
   That promise was free when the dictionary was eager and now has to be kept explicitly; the
   first such query in an English session waits one chunk request.

Guarded by `MUST_STAY_LAZY` in the budget check (bundling), five tests in `e2e/payload.spec.ts`
(behaviour, including the mid-session switch and the Urdu-query case), and
`src/lib/i18n/__tests__/urduSeedGating.test.ts` for the un-loaded window — where the rule is that
an unknown string comes back **unchanged**, never transliterated.

## Sequencing

1. ~~**Track A**~~ — shipped 21 August.
2. ~~**Track D**~~ — shipped 21 August.
3. **Track B** — unlocks the named half of A and tidies the region/district mess. ← next
4. **Track C** — last, because it depends on date quality that is not there yet. The date
   hedges are still hedges: `year_built_note` carries readings like "1416 AH is the survey's
   answer to 'in which year was this place built', but may refer to the saint's death rather
   than construction", and a timeline must render those as intervals or it launders uncertainty
   into false precision.

Every number in this document was measured against `src/data/shrines-fallback.json` on
20 August 2026, not estimated. Re-measure before trusting any of it; the sheet is production
and moves.
