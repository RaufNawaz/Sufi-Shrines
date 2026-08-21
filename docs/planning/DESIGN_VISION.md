# Design Vision — aesthetic direction & blue-sky features

**Written 18 August 2026.** Companion to [`PROJECT_VISION.md`](PROJECT_VISION.md), which is
strong on features and silent on design. This doc supplies the missing half — a deliberate
aesthetic direction — plus feature ideas that have emerged since the vision's eight tracks
were written, plus a status audit of those tracks so sequencing reflects reality.

Every proposal is written to be independently shippable in small, verifiable steps
(token-level changes, one surface at a time), never a big-bang redesign of a live site.

> **Implementation status — 18 August 2026 (was: "nothing here is implemented").**
>
> | Item | Status |
> |---|---|
> | Migration 1 — chrome/tradition token split (kashi cobalt) | **Shipped** `e6052f8` |
> | Migration 2 — bilingual Nastaliq masthead | **Shipped** `e6052f8` |
> | Migration 3 — dark mode as lamp-light | **Shipped** `e6052f8` |
> | Migration 4 — marginalia rail | **Blocked** on the `qa_note` editorial ruling (`../EDITORIAL_DECISIONS_PENDING.md` §1) |
> | Migration 5 — kashi tile markers / empty-state tiles | Not started |
> | Migration 6 — type trials (Spectral, Gulzar) | Not started; needs eyes on real pages, not a decision from a doc |
> | Visual-regression guard in Playwright | **Shipped** `e2e/typography.spec.ts` — as layout/type invariants rather than pixel diffs, see below |
> | F1 — Urs Almanac | **Shipped** `26ed561`, at 19% coverage (see below) |
> | F7 prerequisite — `provenance.json` staleness | **Fixed** `26ed561` / `0da15d3`, 163 → 167 → 169 entries |
> | F2–F6, F8–F10 | Not started |
>
> **The visual guard asserts relationships, not pixels.** `e2e/typography.spec.ts`
> checks that h1 outranks h2 outranks body in both languages, that the two
> languages keep the same scale *shape*, that the Urdu infobox stays within 30%
> of the English one, and that the shrine list has room to be a list at
> 1280x720. Verified to fail — reintroducing the old `calc(1em * scale)` rule
> breaks two of them with the exact numbers in the message. Pixel diffs were
> rejected: the pages carry remote photographs and live map tiles, so a
> screenshot suite would have needed so much masking that what remained would
> be roughly these assertions anyway, with added flakiness.
>
> **The token split's invariant shipped alongside it.**
> `src/styles/__tests__/tokenSplit.test.ts` (41 assertions) fails the build if chrome and any
> tradition colour converge again, if `--color-rubric` collapses into `--color-error`, or if
> any palette pair drops below WCAG AA in either theme. That covers the specific regression
> this document argued was a correctness problem. It does **not** cover layout, and screenshot
> regression is still the missing guardrail.
>
> **F1 was built on less data than this document assumed.** Part 3 says the almanac's data
> "already exists in `Events` and `event_year/event_note`". Measured: `event_year` is a
> *historical* year (1469 is Guru Nanak's birth, not an observance date), and `Events` is free
> prose. Of 169 shipped rows, **22 carry a day, 10 a month, 6 only a season, 79 name an
> observance with no date at all, and 52 record nothing** — 19% at month precision or better.
> The feature was therefore built around the gap rather than around a full calendar: the
> undated shrines are listed by name on the page. Full measurements and the abstention rules
> in `src/lib/data/ursDates.ts`.

---

## Part 1 — Where the current design actually stands

An honest read of `src/styles/tokens.css` and the shipped surfaces:

**What's genuinely good.** A real token system with light/dark parity; category colors that
never conflate the traditions; info/support badge colors with documented semantics; Nastaliq
with tuned `--leading-urdu: 2.1` and a `--font-scale-urdu`; logical properties and safe-area
insets; reduced-motion handled at the token level. This is a far stronger base than most
sites ever build.

**Two real problems, one principled and one aesthetic:**

1. **The brand color is one tradition's color.** `--color-primary: #1a5c4e` and
   `--color-cat-muslim: #1a5c4e` are the *same value*. Every link, button, focus ring, and
   chrome element on a page about a Hindu temple or Sikh gurdwara is painted in the Muslim-
   shrine category color. For an archive whose third commitment is "three living traditions,
   represented accurately and with dignity," the chrome should belong to no tradition. This
   is the single strongest argument for touching the palette at all, and it stands even if
   everything else in this document is rejected.

2. **The look is the generic heritage default.** Warm cream ground (`#f9f6f0`),
   high-contrast serif display (Merriweather), warm accent — this is the combination any
   competent designer (or model) produces for "heritage archive" with no further thought.
   Nothing in it comes from *these* buildings, *these* books, or *these* practices. The
   subject has one of the richest material cultures on earth and none of it is in the UI.

---

## Part 2 — The recommended direction: **“The Annotated Register”**

### Thesis

This archive's most distinctive editorial behavior is that it **reports its own doubts**:
qa_notes listing contradictions, `year_built_note` explaining what a date actually refers
to, "per the survey" hedges, support-level badges grading the archive's own evidence. That
is the behavior of a serious manuscript tradition — text in the center, apparatus in the
margin, corrections rubricated, nothing silently smoothed.

So the design thesis: **the page apparatus behaves like a scholarly register — ruled,
margined, rubricated — while the content itself (photographs, the map, the living places)
stays vivid and present-day.** Trust made visible is the identity. No other shrine site
can wear this look honestly, because no other shrine site has the marginalia.

### Palette — from the buildings, not from "heritage"

The material skin of the archive's most iconic sites — Shah Rukn-e-Alam, the Uch Sharif
tombs, Sehwan — is **kashi-kari**: cobalt and turquoise glaze on brick. Those two blues are
entirely absent from the current token system. They become the chrome:

| Token (proposed) | Light | Role |
|---|---|---|
| `--color-kashi-cobalt` | `≈ #2a4d9b` | links, primary actions, focus rings — the new `--color-primary` |
| `--color-kashi-firozi` | `≈ #0f7d78` | secondary chrome, active states, the jadval rules |
| `--color-rubric` | `≈ #8f2d1f` | marginalia/contradiction markers **only** (see below) |
| `--color-accent` (kept) | `#c8890a` | gilding: urs events, tour route, highlights — unchanged |
| ground (kept) | `#f9f6f0` | the paper stays; it's the chrome on it that changes |

Rules that make this principled rather than cosmetic:

- **Chrome belongs to no tradition.** `--color-primary` becomes kashi cobalt everywhere;
  `--color-cat-muslim` keeps its green and goes back to being *only* a category color.
  (Kashi blues read as the Indus region's craft, not one faith's — and where that argument
  feels thin, the ajrak alternative below is the fallback.)
- **Rubric ≠ error.** `--color-rubric` marks *the archive talking about its own text* —
  qa_notes, disputed dates, "both accounts reported." It must be a distinct token from
  `--color-error` (which stays for actual failures), because the semantic is different:
  rubric means "we checked and it's genuinely uncertain," not "something broke."
- **Dark mode becomes Thursday night.** The current dark palette is a generic teal-dark
  (`#0f1a17`). Recast it as lamp-light: warm near-black ground (`≈ #171310`), the existing
  `#e8a82a` lamp-gold accent doing more work, kashi blues desaturated. Dark mode stops
  being "the same site with the lights off" and becomes the shrine after dark — which is
  when the dhamal happens.

### Typography — Urdu as identity, not as a mode

The single highest-leverage typographic move costs no new fonts:

- **The bilingual masthead.** Every shrine's Nastaliq name appears as a large calligraphic
  element on its page *in both language modes* — beside/above the Latin `<h1>` in the
  English view (wrapped in `<bdi>`, exempt from the leak guard by design). The Urdu name is
  the one visual asset every single entry already has, it is unfakeable by any generic
  template, and it makes the "equally excellent in both languages" mission legible in one
  glance. This is the cheapest distinctive move available to the project.
- **Latin faces: trial, don't decree.** Merriweather is defensible; it's also everyone's
  default. Trial **Spectral** (designed for long-form reading, sharper cut, real italics
  and light weights for large display sizes) as body+display in a branch and judge on the
  actual article pages. If it doesn't clearly win, keep Merriweather — the identity lever
  is the Nastaliq, not the Latin serif.
- **Nastaliq display: trial Gulzar** for headings only (verify rendering quality first —
  claims about Nastaliq webfonts need eyes, not assumptions). Noto Nastaliq Urdu remains
  the body workhorse; i18n rule 4 (Nastaliq everywhere, controls included) is untouched.
- **Scholarly furniture:** old-style figures and small caps in the apparatus (dates,
  badges, citations) where the chosen face supports them — verify before asserting.

### The signature element: **the marginalia rail**

One element to be remembered by, everything else disciplined around it:

On article pages, provenance stops being a footer section and becomes a **ruled margin**.
The wide-viewport margin rail (≥1340px, where `ContentsNav` already lives) gains the
apparatus: source attributions, qa_note contradictions, "per the survey" flags — set
small, hanging in the margin beside the exact paragraph they qualify, rubricated where
the note reports a genuine conflict. A thin double rule (the manuscript *jadval*) frames
the text column and visually separates text from apparatus. On narrow viewports the notes
collapse to tappable rubric marks in the text.

Why this is the right risk:
- It is **structurally true** — the content already exists (52 entries carry qa_notes;
  every enriched entry carries attribution hedges). The design renders what the archive
  already does.
- It resolves a live defect found 18 Aug: `qa_note` is in `INTERNAL_ONLY_KEYS`, so Shah
  Gohar Peer's public text says "see the note below on that attribution" about a note no
  reader can reach. The marginalia rail is that note's home. (Whether qa_notes become
  public verbatim or in edited form is an editorial call —
  [`../EDITORIAL_DECISIONS_PENDING.md`](../EDITORIAL_DECISIONS_PENDING.md) — but the
  *design* should assume some form of them ships.)
- It scales down honestly: entries with no notes simply have a quiet margin.

Supporting motif (not the signature): **kashi tile map markers** — the category dot
becomes a small star-and-cross/octagonal tile shape in the category color. One shape
system, six colors, ownable at a glance. Must pass the marker-count-vs-row-count
invariant and cluster performance before shipping (RULE 4).

Motion: **one orchestrated moment** — on shrine-page load, the jadval rules draw in and
content settles (SVG stroke animation, ~400ms, fully disabled under reduced-motion).
Nothing else animates that doesn't already.

### Two sketched alternatives (if the register direction doesn't land)

- **B — Ajrak.** Palette from Sindhi ajrak block-print: deep indigo, madder crimson,
  unbleached white, black resist lines. Strongest *pan-communal* material argument — ajrak
  is worn across Hindu, Muslim, and Sikh Sindh — and the geometry gives a strong border/
  divider language. Risk: reads regional-Sindhi for a Punjab-heavy dataset.
- **C — Field notebook.** Lean into the survey register instead of the manuscript one:
  photographic, utilitarian grid, stamp-like badges, coordinates and dates in a mono face,
  the aesthetic of documentation-in-progress. Cheapest to execute; most honest about the
  archive's youth; least beautiful ceiling.

### Migration path (no big bang)

1. Token-level: split `--color-primary` from `--color-cat-muslim` (cobalt chrome). One PR,
   whole-site effect, zero layout risk.
2. Bilingual masthead on `ShrinePage`.
3. Dark-mode recast (tokens only).
4. Marginalia rail v1 behind the qa_note editorial decision.
5. Map markers + empty-state tiles (photo-less entries get a kashi pattern placeholder
   instead of a grey box — the archive's incompleteness rendered as identity, "no
   photograph yet" as an invitation).
6. Type trials last — they're the most subjective and least urgent.

Add the missing guardrail while at it: **visual regression screenshots in Playwright**
(shrine page, map, both languages, both themes) so aesthetic passes stop being
unfalsifiable. Every serious error in this project's history was an unchecked assumption;
design regressions are currently unchecked by construction.

---

## Part 3 — Blue-sky features beyond the existing eight tracks

Each references what it builds on. None duplicates `PROJECT_VISION.md`; several sharpen a
track into a single concrete surface.

**F1 — The Urs Almanac.** A Hijri-aware living calendar: "this week at the shrines,"
per-shrine urs pages, ICS export, Eastern-numeral Hijri dates with Gregorian conversion
*shown as approximate* (urs dates follow moon sighting — the almanac must say so rather
than fake precision; RULE 2 applies to calendars too). Data already exists in `Events` and
`event_year/event_note`. The single most pilgrimage-useful feature the site could add, and
the natural push-notification/return-visit driver for the PWA.

**F2 — The honest coverage map.** Invert completeness: render the Punjab Auqaf register's
534 sites as ghost markers behind the 171 documented ones, with a support-level choropleth
and a public "not yet documented" list. Turns the project's defining honesty into a
feature, makes the 31%-coverage figure visible instead of buried in a doc, and doubles as
a surveyor-recruitment tool ("this shrine near you has no entry — help us").
Builds on [`AUQAF_INTEGRATION_PLAN.md`](AUQAF_INTEGRATION_PLAN.md).

**F3 — Awaz: the oral-history shelf.** The stated purpose of the archive has zero audio
after months of tooling-readiness ([`../DECISION_oral_histories.md`](../DECISION_oral_histories.md)).
Ship the *shelf before the books*: every shrine page gets a visible, honest audio slot —
"no recording yet" as a designed state, not an absence — plus a recording kit runbook for
Saifullah, rights metadata per clip, and transcript+translation reusing the termbase.
The empty shelf creates the pull the tooling never did.

**F4 — Witness view (then/now).** For `Destroyed` / `Ruin` / `Heritage` sites: a
before/after image slider and a condition timeline. The status vocabulary shipped in the
new-columns work; this is Track 7's most concrete, most affecting surface. Pairs with the
1919/1962 gazetteer scans already surfacing in the acquisition work.

**F5 — The silsila metro map.** A deterministic transit-diagram rendering of the lineage
graph — orders as colored lines, saints as stations, khilafat as interchanges — beside the
existing force-directed `NetworkGraph`. Force graphs demo well and read poorly; a metro
map is legible, printable, and shareable as a poster. Print-quality SVG export.

**F6 — Ziyarat print packs.** Per-tour bilingual PDF guides — route map, per-stop
articles, QR links back to the live site — generated from the prerender pipeline. For the
diaspora gift market and pilgrims whose phones die. Tours and prerender both exist; this
is a build artifact, not a new system.

**F7 — "How do we know this?"** Claim-level provenance popovers — the interactive twin of
the marginalia rail, and the UI face of Tracks 1+6. Click a date → see the source, its
support level, and any recorded contradiction. Requires the citation-object model Track 1
already calls for; `provenance.json` (currently stale at 163 rows — fix first) is the
seed.

**F8 — Names, said aloud.** A pronunciation clip per shrine/saint name, recorded by
Saifullah on the existing field kit. Small, high-charm, bilingual by nature, and the
lowest-stakes way to build the oral-history muscle F3 needs.

**F9 — The sound of the place.** Where rights allow: one ambient loop per shrine
(Thursday dhamal at Shah Jamal is already *described* in the content — let it be heard).
Strictly opt-in playback, never autoplay, rights metadata mandatory.

**F10 — State of the Archive.** An annual scrollytelling report generated from the data:
coverage, support-level distribution, what was corrected this year (the §9 trust ledger,
made public), what was lost (Mauj Darya's 12 photos). The archive grading itself in
public is the brand; this is its yearly proof — and the artifact to send to funders,
partners, and the Auqaf department.

---

## Part 4 — Status audit of PROJECT_VISION.md's tracks (18 Aug 2026)

> **Corrections, 21 August 2026** (details and the current sequencing in
> [`NEXT_STEPS_2026-08-21.md`](NEXT_STEPS_2026-08-21.md), which supersedes the
> sequencing below): `provenance.json` is no longer stale — fixed the same day this
> audit was written (`0da15d3`, validate reports 169/169). F1 (Urs Almanac) shipped
> 18 Aug with `.ics` export (`26ed561`). Track 0 article drafting is now 168/171:
> A8 steps 1–2 complete (all 74 deltas done 21 Aug), 3 entries blocked on editorial
> decisions, all still `reviewed=false`.

| Track | Status | Evidence |
|---|---|---|
| 0 — Urdu parity | **Done** | `headingLabels.ts`, no-leak e2e guard, `fmtNum` sites tested, `/ur/*` prerender (`22bca4c`); article content 168/171 drafted (3 blocked on editorial calls), all `reviewed=false` |
| 1 — Sources library | Not started | No `SourcesPage` route exists |
| 2 — Knowledge graph | Partial | `LineageView`/`NetworkGraph` + KG exports shipped; DOI unminted (see `DATA_RELEASE.md`) |
| 3 — Immersive tours | Partial | 8 tours + TTS audio live; offline packs, curated recordings open |
| 4 — More languages | Not started | Two-language architecture still hardcoded |
| 5 — Grounded AI | Not started | — |
| 6 — Trust & provenance | Partial | Badges + `SourcesProvenance` + validate gates live; `provenance.json` stale at 163 rows; claim-level citations open |
| 7 — Heritage at risk | Partial | Status vocabulary + filters shipped; condition timeline / imagery open |
| 8 — Reach & platform | Partial | Prerender + hreflang shipped; embeds, read API, clustering open |

### Suggested sequencing (revised)

- **Now (with the data work):** migration steps 1–3 of Part 2 (token split, bilingual
  masthead, dark-mode recast) — small, high-identity, zero-risk; F1 Urs Almanac as the
  first new feature; fix `provenance.json` staleness (prerequisite for F7 and Track 6).
- **Next:** marginalia rail + F7 (once the qa_note editorial decision lands); F2 coverage
  map; F3 shelf + F8 pronunciations (forcing function for the oral-history decision).
- **Then:** Track 1 sources library (the scholarly moat), F5 metro map, F4 witness view.
- **Later:** Tracks 4, 5, 8's remainder; F6, F9, F10 as capstones.

The through-line: every aesthetic move renders something the archive already *is* —
bilingual, honest about uncertainty, built from real materials — rather than decorating
it. Where a proposal and the data's honesty conflict, the honesty wins.
