# Shared Ground — a vision for the next phase

**Status:** proposed 20 August 2026. Read alongside [`PROJECT_VISION.md`](PROJECT_VISION.md)
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

## Track A — Shared ground (experience + relations)

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

## Track B — Places as entities

The knowledge graph holds 94 places but they are thin: `located_in` edges and little else. A
place should carry what the archive knows about it — which sites, which traditions, which
century each was founded, what its name is in Urdu — so that "Uch Sharif" and "Nankana Sahib"
become readable subjects rather than filter values.

This is where the *named* half of shared ground lives, and it is the natural home for the
district/tehsil hierarchy the survey records inconsistently.

## Track C — Chronology

Era parsing exists (`src/lib/data/era.ts`), the map has a time slider, and 69 of 196 figures
now carry dates — but there is no view in which the archive's whole span is legible. A
timeline spanning the 7th to the 21st century, banded by tradition, would show something else
no single row can: that these traditions' building phases interleave.

Prerequisite: dates are still thin and 31 rows have a date column that hardened a hedge the
prose never made (`docs/TODO.md` §0). A timeline must render "c. 1165" as an interval, not a
point, or it will launder uncertainty into false precision.

## Track D — The gaps as a first-class page

The standing findings in `docs/HANDOVER.md` are the most honest thing in this repository and
they are invisible to readers: 49 of 167 entries have no bibliography; coverage is ~31% of the
Punjab register alone; there are 18 videos and **zero** audio recordings against a stated oral-
history purpose. A coverage page that states all of this, computed live rather than asserted,
would turn the archive's candour from a document into a feature — and would make the case for
the fieldwork that closes it.

---

## A payload debt this phase created

Correcting the dictionary's row universe grew `src/data/urdu-seed.json` from 49 KB to 67 KB,
and `urduFallback` imports it eagerly — so ~18 KB landed on every route and
`scripts/check-bundle-budget.mjs` failed two of them. Budgets were raised with the reason
recorded, which is the honest short-term answer.

The real answer is that **an English reader needs no Urdu dictionary at all.** The seed can be
language-gated exactly as `urdu-content.json` now is (`ensureUrduContentForLang` plus a
rebuild listener in `useShrineData`) — worth ~67 KB off every route, more than the whole
knowledge-graph chunk. It was not done in the same pass because `translateToUrdu` is called
synchronously during render, so a missing dictionary would flash English before it arrived;
that needs the same care the article payload got, not a quick dynamic import.

## Sequencing

1. **Track A** — highest value per unit of work, needs no new content, and the honesty fix it
   forces (identical pins) is owed regardless.
2. **Track D** — cheap, computed from what exists, and it recruits help.
3. **Track B** — unlocks the named half of A and tidies the region/district mess.
4. **Track C** — last, because it depends on date quality that is not there yet.

Every number in this document was measured against `src/data/shrines-fallback.json` on
20 August 2026, not estimated. Re-measure before trusting any of it; the sheet is production
and moves.
