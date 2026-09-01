# The front door shows 169 sites as 21 shapes

*Measured 30 August 2026 against the dev server, at the opening view, before any change.*

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

## Not yet decided *(it since was — the ruling follows)*

This is the archive's most visible surface and the choice changes its character, so it is Rauf's.
Measurements above are reproducible from
`scripts/` — the probe is the DOM read described at the top of this file, and it should be turned
into an e2e assertion **once a target is chosen**, not before: a check that fails by design is a
note with a non-zero exit code, and RULE 4 asks for the opposite.

## Ruled — 30 August 2026; amended 1 September 2026

Rauf ruled **B — fan on tap, and leave the resting map alone** on 30 August 2026. Shipped as
`src/lib/map/spiderfy.ts` plus the fan logic in `src/components/map/ShrineMarkers.tsx`, held by
`e2e/marker-fan.spec.ts`, which asserts both halves.

**Amended by Rauf on 1 September 2026: the tap gesture went.** A tap on a pile now **flies the
map toward it** (`flyToBounds`, capped at fan depth), and whatever depth cannot separate fans out
**on its own** at `AUTO_FAN_ZOOM` (z16), gathering again on the way back out. Measured against the
dataset the day of the amendment: **19 of 169 sites have a neighbour within 60 m** — the pile
radius at z16 over Lahore — **10 of them sharing exact coordinates** that no zoom could ever
separate (four at 31.5498, 74.3170 alone); the **median nearest-neighbour distance is 1.8 km**, so
everything else stands apart well before fan depth and is never fanned at all. The fan animates —
a 300 ms transform glide with the leader line fading in over the same window, both under
`prefers-reduced-motion: no-preference` — and it stopped being a transient: nothing dismisses it
but zooming away. Not Escape, not a background tap, and not selecting a marker inside it; at fan
depth the fan is simply how the map presents overlap.

The resting-map half of the 30 August ruling **stands**: the opening view sits ten zoom levels
above fan depth, and `e2e/marker-fan.spec.ts` still holds the declined option declined.
