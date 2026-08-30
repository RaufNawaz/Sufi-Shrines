# The front door shows 169 sites as 21 shapes

*Measured 31 August 2026 against the dev server, at the opening view, before any change.*

The map is the archive's front door and its main claim: 169 sites, six traditions, across
Pakistan. At the view it opens on, a reader cannot see that.

## What was measured

`.leaflet-marker-icon` centres, on the running site, at the default view — no interaction.

| | Desktop 1280×900 | iPhone 13 390×844 |
| --- | --- | --- |
| Pins in the DOM | 169 | 169 |
| Pins on screen | 169 | 118 |
| **Another pin's centre within 22 px** | **152 (90%)** | **107 (91%)** |
| Median nearest-neighbour distance | **1 px** | **1 px** |
| Nearest neighbour under 4 px | 107 | 82 |

Then the same centres grouped by single-link clustering at 30 px — one pin diameter, i.e. "close
enough that a reader sees one shape":

| | |
| --- | --- |
| Pins | 169 |
| **Visually distinct blobs** | **21** |
| **Largest single blob** | **66 sites** |
| Pins standing alone | **8** |

**The queue note said 82%. It is 90%, and the percentage was the least of it.** A tap-target
figure describes a reader who has already decided which pin they want. A median nearest-neighbour
of 1 px describes a reader who cannot tell there is more than one pin there at all.

161 of 169 sites are inside a shape that also contains another site, and nothing on the screen
says so. The largest shape is 66 places — 39% of the entire archive — rendered as a single 30 px
mark over Lahore with no number on it.

## Why this is a content problem, not a polish problem

The archive's own standing figures are about coverage: 169 entries, ~32% of the Punjab register,
six traditions, 40 cross-tradition pairings within 800 m. Every one of those claims is *about
density*, and the map — the surface that exists to show them — renders density as a smudge. The
`/shared-ground` work of 29 August shipped a lens for exactly the fact that sites stand close
together. At the opening view, "close together" is indistinguishable from "one site".

It also reads as a smaller archive than it is. Twenty-one shapes is what a twenty-one-entry
collection would look like.

## The options, and what each costs

**A. Cluster with counts.** The 66-pile becomes a circle reading 66; zooming in splits it.
Standard, immediately legible, and it makes the archive's real shape its first impression.
Reversible. Costs a dependency or a hand-rolled equivalent, and at low zoom the map reads more
like a data view than a map of places.

**B. Spiderfy on click only.** Keep today's appearance; a tap on a pile fans it out. Least
disruptive, and it fixes the *tap* problem. It does not fix the *seeing* problem: the reader still
has no cue that 66 sites are under there, so they have no reason to tap.

**C. Open where the data is.** Fit the initial view to the collection rather than to Pakistan.
Honest about the archive's real shape, and it thins the piles. But the national framing is part of
the claim, and a map of Pakistan that opens on Lahore concedes something the coverage figures are
trying to state plainly.

**D. Leave the pins; lean on the list.** The sidebar already enumerates all 169 and the count is
correct. Cheapest, and it accepts that the map's job is orientation rather than enumeration.

**Recommended: A.** When 39% of an archive sits behind one unnumbered mark, the mark should carry
the number. It is also the only option that makes the opening view *state* the collection's
density rather than merely permit a reader to discover it.

## Not yet decided

This is the archive's most visible surface and the choice changes its character, so it is Rauf's.
Measurements above are reproducible from
`scripts/` — the probe is the DOM read described at the top of this file, and it should be turned
into an e2e assertion **once a target is chosen**, not before: a check that fails by design is a
note with a non-zero exit code, and RULE 4 asks for the opposite.
