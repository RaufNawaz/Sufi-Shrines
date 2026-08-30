# The UX council, 30 August 2026 — four lenses, thirty-two findings

Four reviewers were briefed in parallel against the running site, each with one lens and no
overlap: **visual craft**, **interaction and mobile flows**, **information architecture and
editorial presentation**, **accessibility and Urdu/RTL parity beyond the automated gates**. All
four were read-only. Each was given the same three rules — measure the instrument before
believing it, never invent content, and expect most of what you check to be fine — and each was
required to publish a **retraction section** alongside its findings.

This document is the record. It exists because a review that lives in a transcript is a review
that has to be done again.

---

## Why the retraction requirement is the load-bearing part

Between them the four reviewers retracted **eleven** findings by re-measuring, and several of
those retractions are worth more than the findings that survived:

- A sweep for the accent colour on non-interactive elements scoped itself to `main *` and
  returned **zero hits on all twelve routes**. These pages render no `<main>` element. Rescoped
  to `body *` it returned 136. The reviewer would have reported "colour discipline is clean" and
  been believed.
- "3,650 Western digits across 158 of 168 Urdu articles" was true of `src/data/urdu-content.json`
  and false on screen — `localizeProseDigits` converts them at render. Reading the data file was
  measuring the wrong surface; only four render sites actually survive.
- "The map renders on a blank cream ground with no geography" was slow-4G tile loading inside the
  reviewer's own throttle.
- "Search is completely broken — every query returns zero results" was a selector error: the
  palette portals to `document.body`, and the probe was looking inside `.sidebar`.
- "Activating a map pin loses focus to `<body>`" did not reproduce in a fresh context; the first
  reading came from a context carrying a persisted language preference, which rebuilds the marker
  layer.
- "The 44px tap-target fix does nothing" — my own first reading, from probing for the Leaflet icon
  rather than the dot the pseudo-element belongs to.

The findings below are worth acting on **because** those eleven were not.

---

## Shipped from the council

| # | Finding | Commit |
|---|---|---|
| IA‑3 | A mosque emoji labelled the principal figure of every site, including Guru Nanak and Shiva, while the shrine page two taps away correctly said "Sikh Guru" | `251d3d0` |
| INT‑1 | A shared `?selected=` link opened a **different shrine in a different province**, silently, because `id` is a row index and the dataset is swapped twice on load | `492b747` |
| VIS‑2 | The language toggle — in the header of every page — had no visible keyboard focus in either theme, its ring clipped away by the pill's `overflow: hidden` | `9e2ccaa` |
| VIS‑3 + A11Y‑1 | The reading-size slider moved no Urdu control and no page title on eleven routes; two literal lengths where the token carries the factor | `6d1ce06` |
| — | (found while fixing the above) The Urdu shrine page could be left holding slim-index rows for good: 1 infobox row against 7 | `e508648` |

Two of these were found by two reviewers independently, from different lenses, which is the
strongest signal the method produced.

---

## Queued, ranked by what it costs a reader

**1. Filters change the URL and the list and never the map.** Pick "Jain Temple", see "3 of 171
sites", close the panel — all 171 pins are still on the map, and that URL is shareable.
`MapPage` passes the unfiltered array to both `ShrineMap` and `MapSidebar`; all filtering happens
inside the sidebar. *(INT‑3, measured: 169 markers before and after.)*

**2. Four of five entity routes answer an unknown slug by silently becoming the map.**
`/shrine/zzz`, `/saint/zzz`, `/order/zzz`, `/tradition/zzz` all end at `/` with the address bar
rewritten. `/place/zzz` does the right thing and says "No place by that name is recorded." For an
archive whose case rests on citability, a URL that resolves to something else without saying so
is worse than a 404 — and merging two figure nodes retires a published `/saint/` URL, so this is
live risk rather than hypothetical. *(IA‑4; `PlacePage` is the model to copy.)*

**3. The map costs 174 tab presses to cross.** Tabs 3–173 are the 171 links of the visually
hidden shrine directory, whose focus ring is clipped to a 1×1 box, so the page appears frozen
while focus travels. `tabIndex={-1}` on those links is one line and leaves them in the
accessibility tree. The 171 Leaflet markers behind them want a roving tabindex, which is not.
*(A11Y‑2.)*

**4. The archive search palette announces nothing** on every route except the map, where a
different component announces correctly. No `aria-live` in `ArchiveSearch` at all; the pattern to
copy is twenty lines away in `CommandPalette`. Its combobox also hardcodes `aria-expanded="true"`
and points `aria-controls` at a listbox that is not rendered — which axe grades *incomplete*
rather than a violation, so the zero-serious gate passes. *(A11Y‑3.)*

**5. Search says 44 matches and shows 40.** `MAX_RESULTS = 40`, and the status line reports
`results.length` rather than what is on screen. Four sites unreachable through search, silently.
*(INT‑6, one line.)*

**6. The 404 page has no `<main>`**, so its skip link goes nowhere — the exact silent failure
`skip-links.spec.ts` exists to catch, on the one route it does not test — and its Urdu title is
English. *(A11Y‑4.)*

**7. A section header is drawn sixteen different ways** across twelve routes: six sizes, two
typefaces, four rule weights, with two byte-identical eight-declaration blocks 236 lines apart in
one file. `.kg-section-heading` draws 2px where `.article-section-heading` draws a hairline —
four device pixels against one. The hairline test only asserts one direction ("if you use
`--color-border-light`, use `--hairline`"), so a separator at a literal width passes.
*(VIS‑1, and VIS‑8 falls out of it: `/about`'s rules stop at 767px for nine headings and 1054px
for seventeen, on one page.)*

**8. Starting a guided tour drops focus to `<body>`** and announces nothing; the panel's live
region is created already populated, which screen readers do not announce. Advancing a stop
works correctly. *(A11Y‑5.)*

**9. Cobalt means "interactive" everywhere except the archive's own data graphics.**
`/chronology` paints all 120 dated sites in the link colour; `/about` puts a support chart in it
directly beneath six bars in the tradition palette — two colour logics on one page. There is
already a purpose-built palette for exactly the four values that chart plots. *(VIS‑4.)*

**10. Two English `aria-label`s survive in the Urdu view** (`/typology`, `/chronology`) because
the no-leak walker is built with `NodeFilter.SHOW_TEXT` and never visits attributes. The two
lines are trivial; the second pass over `aria-label`/`title`/`alt` is the finding. *(A11Y‑6.)*

**11. Eastern numerals miss four render sites** — a digit inside an Urdu `##` heading on ten
entries (rendered twice each, heading and contents nav), an almanac figure's dates, and the
gallery's `aria-label` index. The body text beneath each heading is already converted, so the
same year appears twice on one screen in two numeral systems. *(A11Y‑8.)*

**12. The photo grid is forced left-to-right in Urdu** while its own arrows are mirrored and its
arrow keys are swapped — the strip and its controls disagree about which way "next" is. The
override carries a one-line comment restating the rule without a reason, so it wants a decision
rather than a deletion. *(A11Y‑7.)*

**13. Two card radii sit side by side and there are sixteen ways to draw a small label**;
`/typology` is 171 photo cards in a system whose first principle is hairlines, with empty
thumbnails painted in the link colour; the pages do not share a grid (`/almanac` jumps 114px
left, `.settings-page`'s `max-width` is dead CSS beaten by `.entity-page` on import order).
*(VIS‑5, VIS‑6, VIS‑7.)*

**14. A shrine names its order and never links to it** — the only one-way edge in the entity
graph. 54 rows carry a `silsila`; 48 resolve to exactly one of the nine order pages, and the
resolution table already exists in the KG builder. *(IA‑7.)*

**15. The shrine page overwrites its own clean share snippet with raw markdown.** The prerenderer
writes a good description; React then replaces it with `Description.slice(0, 160)`, so the live
DOM description for `/shrine/allo-mahar` begins `## Overview`. Seven index routes ship the map's
blurb, and `hreflang` alternates appear on `dist/index.html` only — zero on ~800 other pages, so
the `/ur` mirror that exists purely for crawlers is never declared as an alternate. *(IA‑8.)*

**16. At the opening view, 82% of on-screen pins do not receive a tap at their own centre** —
152 of 169 markers have another marker's centre within a fingertip, with no clustering and no
count bubble to say so. The largest finding by reader impact and the largest by cost; it wants a
decision about clustering rather than a patch. *(INT‑2.)*

---

## Needs a human, and should not be decided here

**The archive calls itself "Sufi Shrines" and 88 of its 171 sites are not Sufi shrines.** Every
`<title>`, the front door's `<h1>`, the welcome card and `og:site_name`. Pasted into a message,
Guru Nanak's page reads *"Guru Nanak — Sufi Shrines"*. Only `/about` gets it right, and it is the
page most readers never open. The code is four string constants and the prerender suffix; **the
name is an editorial decision**, and no URL slug or the `/Sufi-Shrines/` deploy path need change.
*(IA‑2, measured: Muslim Shrine 79, Hindu Temple 35, Sikh Gurdwara 33, Nanakpanthi/Udasi 14, Jain
3, Secular 3, plus 4 off-schema.)*

**Four entries publish an internal to-do, naming a colleague, in the reader-facing `Location`
field.** Eight of 171 `Location` values run 191–398 characters; four contain an instruction —
*"ask Saifullah for a precise pin when possible"*, and one that opens with the literal token
*"FLAG:"*. The caveats themselves are exactly right under RULE 2 and should stay; the instruction
to a colleague is a workshop note on a gallery wall. `INTERNAL_ONLY_KEYS` cannot catch it because
it is inline in a `Location` value rather than in `qa_note`. **This is a sheet edit (RULE 3), so
it needs a CSV patch and a human import** — the correct home already exists and already never
renders. Separately and correctly, 15 entries credit "surveyor: Saifullah" inside their
bibliographies; that is provenance and must stay. *(IA‑6.)*

**The seven definitions the archive's trust vocabulary needs.** Every entry wears a
`support_level` and an `info_level` badge; 31% say "Source-seeded" and nothing on the site says
what that means or how it differs from "Source-documented". The badges' tooltips explain the
*dimension* and never the values. The code around it is small — a definition list on `/about`
with stable anchors, and the badges linking to them — but the seven sentences are archive prose
and must be written by a person. *(A11Y/IA‑5.)*

---

## A fifth lens, swept 31 August 2026: what a reader sees where the archive is silent

The council's four lenses never asked this, and it is the archive's own stated value — an entry's
worth here rests on saying what is *not* known as plainly as what is. Measured against the shipped
data and the running site.

**Mostly correct, and worth recording as the denominator.** The two extremes behave the way the
archive claims they do: Data Darbar carries "Fully documented" and sixteen bibliography items;
*Sant Baba Asudaram Darbar*, the archive's only entry citing nothing, carries "Limited
information" and no bibliography section at all. No page overstates itself, and `/about`
publishes the aggregate — 51 of 169 with no photograph — as prominently as the flattering
figures. **51 photo-less entries omit the gallery silently rather than claiming an empty one**,
which is defensible; whether they should say "no photograph recorded" is a design call about a
third of the archive and belongs to Rauf, not here.

**One real defect, shipped:** the newline invariant RULE 4 names existed only in
`pipeline/append_new_shrines.py`, which nothing in the build path calls — see
`docs/SESSION_RESUME.md`. It now runs in `data:validate`.

**One trap left in place deliberately.** `UI_TEXT.noImage` reads *"No image found. Add an 'Image
Link' value in your sheet."* — an instruction to the sheet's owner, sitting in the table a
**reader-facing** page draws from, with a reviewed Urdu twin saying the same. It is currently
rendered nowhere, in either locale, which is the only reason no visitor has been told to edit a
spreadsheet they cannot see. Recorded rather than deleted: the wording is the hazard, not the
string, and the next person to wire up an empty-gallery state will find it first.

## What the council checked and found correct

Recorded because it is most of what they found, and because a list of defects with no denominator
is not a review.

`/about` recomputing every figure from the shipped data and publishing the unflattering ones as
prominently as the rest · the dark theme as a designed palette rather than an inverted one, down
to `--color-primary-pale` staying warm · the focus-ring system (one global rule, thirteen
overrides, two offsets) · article typography on the shrine entry, 72–78 characters at
`--leading-normal`, the best-set thing in the archive · category-colour discipline, guarded by
`tokenSplit.test.ts` · Nastaliq at all five reading sizes, with line-height ratios holding steady
rather than collapsing · reduced motion, including the JavaScript half (`flyToOrSetView`,
`fitBounds`, `useReveal`) · both palettes' focus contracts, including Escape restoring focus to
the exact prior element · the lightbox's focus trap, which the comments in its own file describe
going looking for · offline after a first visit, with an explicit dated banner · guided tours,
including a `stop=99` clamping to the real last stop · heading order and landmarks across 30
route×language combinations · coordinates staying Western while everything else goes Eastern ·
figure pages not mistyping their subjects — "SIKH GURU" for Guru Nanak, "FIGURE" for Bhai
Mardana · shadow use, 22 in 13,869 lines of CSS.
