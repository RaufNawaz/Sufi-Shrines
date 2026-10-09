# The Apple pass — a professional-grade, minimalist archive

**Direction, from Rauf, 9 October 2026 (four messages in one night):** the Urs Calendar "needs
to be significantly redesigned … take inspiration from how Apple does their products"; the
explorer pages — "not the shrine page but the Sufi order explorer etc pages" — are "so bland …
the idea is not to just display information but to display in the best way possible"; the entry
rows and "the color theme as well … should look like this website was designed by people at
Apple where everything is professional grade minimalistic and at the same time good UI"; and
finally "the general vibe of the entire website should be a professional grade minimalistic
apple website." This document is the record of what that means here, what shipped on the night
it was asked, and what is next. The 19 August direction (OS-native minimal: hairlines not cards,
cobalt interactive-only, dense Nastaliq) is not replaced; it is sharpened.

## What "Apple" means in this codebase

Apple's interfaces are recognisable for a handful of decisions, and each has a counterpart here:

| Apple | Here |
|---|---|
| One sans at every size, display weight with tight tracking for titles | `.entity-title` and every shared section heading in the interface face; the serif stays for the shrine entry's title and article prose, because an entry is read and an explorer is used |
| Cool, quiet neutrals; white surfaces on a grey-white page | tokens.css: page `#f5f5f7`, surfaces `#ffffff`, text `#1d1d1f`, separators `#d2d2d7` / `#e5e5ea`, neutral black shadows. Dark stays a hair warm (`#111110`) because `tokenSplit.test.ts` holds "lamp-light, not teal-dark" |
| One accent for everything interactive | kashi cobalt, unchanged; the gold accent marks facts (today), never controls |
| Inset grouped lists: rounded card, rows, chevrons | `.inset-list` (list.css), now also the welcome card's "Elsewhere in the archive" |
| Segmented controls for views | `.almanac-view-toggle` — the List / Month switch |
| Pill buttons, quiet by default, filled when active | `.action-btn` |
| Rounded cards with soft shadows, hairline edges | the calendar card, stat tiles, season cards, the undated disclosure |
| Large numerals with small captions | `CoverageTiles` + `useCountUp` (the number is in the HTML; the browser counts up once, never on a tile already in view, never under reduced motion) |
| Tinted callouts with an icon disc | `.almanac-note` (moon), `.almanac-contribute` (pencil) |
| Compact calendar card beside an agenda | `AlmanacCalendar`: numbers only, today ringed in the accent, the chosen day a cobalt disc, dots per tradition, hollow where projected |
| Rows you can open: hover, chevron, no underline | `.almanac-entry`; the figure is a chip, labels are quiet |
| Progressive disclosure, type to narrow | the undated list's card-row disclosure and its filter field |

What does not change under any of it: the honesty devices. Projected dates are still visibly
different (a hollow dot), month-only observances still sit off the grid, undated sites are still
counted and named, the coverage tiles still say that the two largest figures are gaps. The pass
changes how these read, not what they say — CLAUDE.md RULE 2 is not a style.

## Shipped on 9 October 2026 (commits after `026266e` on `cloud-ocr-queue` / `1.7`)

- `/almanac`: the calendar card + agenda; the toolbar as a segmented control and pills; the
  notice and contribute callouts; coverage as a proportion bar and counting tiles; season-only
  sites as cards (a snap rail on a phone); the undated list as a card-row disclosure with a
  type-to-narrow field; entry rows in the Apple idiom, in the list view and the agenda alike.
- Site-wide: the neutral palette in both themes; sans display titles and section headings;
  pill action buttons; the welcome card's destinations as an inset list group.
- Verification: unit suite green; the full e2e suite over the palette (532 passed; the two
  failures were load flakiness, rerun alone); a11y across every route in both languages and the
  dark theme; the no-leak guard; screenshots at 390 and 1440 in both languages and both themes.

- Later the same night: the sidebar's destinations as a system list (icon tiles, descriptions);
  a reversible **Look** setting (Current / Classic) and a **Team view** switch on `/settings`;
  the first pass over the four explorer pages — Atlas pills and photo cards, the orders
  comparison as card rows with large numerals, chronology bands as cards (lanes still on the
  scale), shared-ground stat tiles and pairing rows.
- Towards morning: `/graph` rebuilt under live review (item 1 below, done) — the comparison
  table and chip row merged into order cards that choose; the network coloured by century on a
  cobalt ramp with a legend, names on hover and focus only, capped at 44rem; the lineage as a
  tree of teachers, one row per disciple carrying every relation the record holds, the
  quotation behind a Source button for the public and open for the team; the two figure lists
  team-only. HANDOVER §9.274–9.275.

## Next — page by page, in the order they are reached from the welcome card

Each item is a council-sized piece of work: convene a lean council (three seats, one lens each:
information design, interaction and motion, Urdu parity) with these briefs, per the global UI
rule, and implement the consensus findings.

1. **Saints & Orders Explorer (`/graph`) — shipped 9 October, see above.** The orders table reads as a spreadsheet. Make it a
   card per order — name, a one-line character, the figure count as a large numeral, the century
   span as a thin timeline bar, sites as a pill — in a responsive grid; the chip row that follows
   becomes a segmented scroller; the network canvas gets a card frame, a quiet legend and a
   "reset view" pill. Lineage views as inset lists with generation indents.
2. **Atlas of Built Forms (`/typology`).** Group headings as sans with the count as a numeral;
   the related-cards as proper photo cards (image, name, place, a tradition dot), masonry-free
   grid; prose-form groups as callouts; a sticky segmented filter by tradition at the top.
3. **The Archive in Time (`/chronology`).** Keep the honest bars (width = uncertainty), but
   frame each tradition's lane as a card with its count and span as numerals; the scale as a quiet
   ruler; the per-tradition lists as inset rows with the precision as a chip; "How to read a bar"
   as a callout with the three swatches.
4. **Shared Ground (`/shared-ground`).** Pairs as cards: two names, the distance as a numeral,
   the traditions as two dots joined by a hairline; the map lens link as a pill; counts as tiles.
5. **About (`/about`).** The measured self-account as stat tiles and inset lists; the ledger as a
   card list; the citation block as a card with a copy pill.
6. **The map sidebar and palette.** Already close; align the search trigger, the list rows and
   the filters drawer with the inset idiom; the tour panel as a card.
7. **Settings.** Inset groups with switches, the iOS shape.
8. **The shrine entry.** Out of scope by Rauf's instruction except where the shared rules above
   already reach it (section headings, buttons, palette). Its serif title and prose stay.

Open questions, asked in the chat on 9 October: whether the shrine entry's own title should
follow the sans (recommended: no — one serif, deliberately, where the archive reads rather than
is used); whether month-only observances should also get a dot on the 1st with a different mark
(recommended: no — the strip under the card is the honest position).
