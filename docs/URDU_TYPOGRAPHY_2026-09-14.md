# Urdu typography — the minimalism pass of 14 September 2026

Rauf's brief, in three messages: *"the urdu still does not look minimalistic, I do not know
what you need to change but change whatever is necessary and make this clean and minimalistic
and easy to read"* — then `https://www.rekhta.org/?lang=ur` with *"use this as a template"* and
a screenshot of a couplet set in plain black Nastaliq — then *"everything at the end should
look like the rekhta website"* and *"use the fonts etc from rekhta as well"*.

This is the successor to `URDU_TYPOGRAPHY_2026-09-11.md`, which fixed the *spacing* on the same
complaint three days earlier and did not fix the complaint. This note records why: the leading
was never the whole problem, and the part that was left is measurable.

---

## 1. What Rekhta is actually doing

Probed with headless Chromium against `rekhta.org/?lang=ur`, reading computed styles:

| | Rekhta | this archive, before |
| --- | --- | --- |
| Urdu face | Mehr Nastaliq Web | Noto Nastaliq Urdu |
| line-height | **exactly 2.0** at every size (30/60, 22/44, 16/32, 72/144) | 2.05 prose, 1.85 rows, 1.55 headings |
| content furniture | none — text on white, whitespace separates | bordered infobox card, per-row rules, filled status panel, bulleted bibliography |
| colour | near-black, one accent | five hues in the masthead alone |

The leading was the one thing already right. Everything else on that list was the finding.

---

## 2. The measurement that explains three days of failed spacing work

The 11 September pass raised `--leading-urdu` to 2.05 and the complaint survived. The reason is
in the font's own metrics, which nobody had read:

| | units/em | hhea ascent | descent | line gap | **content box** |
| --- | --- | --- | --- | --- | --- |
| Noto Nastaliq Urdu | 1000 | 1.904em | −0.596em | 0 | **2.500em** |
| Mehr Nastaliq Web | 2048 | 1.074em | −0.635em | 0.083em | **1.792em** |

**Noto Nastaliq Urdu's own content box is 2.50em.** A `line-height` of 2.05 is therefore not
generous — it is *below the face's natural line*, and the ink of one line necessarily enters the
box of the next. Every collision the previous pass chased was that, and no leading value under
2.5 could have fixed it. Going to 2.5 would have made the prose a ladder.

Mehr draws inside 1.79em. At the same 2.05 the ink now fits with room to spare, which is why
Rekhta looks calm at a flat 2.0 and why that has nothing to do with restraint.

### The size the swap needs

Measured on a canvas at a common nominal size, sample
`گوردوارہ بالیلا صاحب مزار کی اہم باتیں`:

| | advance width | ink height |
| --- | --- | --- |
| Noto Nastaliq Urdu @100px | 1347.4px | 211.0px |
| Mehr Nastaliq Web @100px | 1084.2px | 165.7px |
| **Noto ÷ Mehr** | **1.243** | **1.273** |

So Mehr set at the old `--font-scale-urdu: 1.15` was a quarter smaller on screen than the token
was calibrated for. `1.15 × 1.25 = 1.44` restores the optical size, and because advance widths
scale with it, restores the line breaks too: the sample line measured 247.9px in Noto at the old
size and 249.3px in Mehr at the new one. Nothing re-wrapped.

Probe: `pipeline/build_nastaliq_coverage.py` for the cmaps;
the ink/width figures come from a `canvas.measureText` run against the dev server
(`actualBoundingBox*`), reproducible in any devtools console with the two faces loaded.

---

## 3. The face

**Mehr Nastaliq Web** — calligraphy Nasrullah Mehr, design Zeeshan Nasar, developed at CSaLT,
Information Technology University of the Punjab, Lahore, 2017. **CC BY 4.0**: distribute, remix
and build upon, commercially included, with credit. Credit is given on `/about` (Licence and
reuse → Urdu typeface) and in `public/fonts/MehrNastaliqWeb-LICENSE.txt`.

A Nastaliq cut in Lahore, at a Punjab university, for an archive of Punjab shrines.

### What it costs, and what it saves

| | before | after |
| --- | --- | --- |
| preloaded for an Urdu reader | 3 files, **481 KB** | 1 file, **43 KB** |
| precached by the service worker for *every* visitor | 481 KB | 202 KB |
| weights available | 400 / 600 / 700, drawn | one, claiming 100–900 |
| codepoints mapped | 333 | 108 |

`NotoNastaliqUrdu-600.woff2` and `-700.woff2` are deleted. They existed to supply Nastaliq
*weights*; Mehr's single face claims the whole range, so nothing reaches them. `-400` stays,
declared and deliberately not preloaded, as the per-glyph fallback described below.

### The two real costs

**No bold.** Mehr ships one weight. The `@font-face` claims `font-weight: 100 900` on purpose:
declared at 400 alone, a `font-weight: 700` heading would match no face and the browser would
*synthesise* bold by smearing the outlines, which on a connected script thickens the joins into
blots. Claiming the range means real outlines at every weight and nothing faked — and the
hierarchy that the weight step used to carry is carried by size instead
(`--font-scale-urdu-heading: 1.2`, so an Urdu section heading is 1.5× its body where the English
one is 1.25× *and* 700). Measured after: h1/body is 2.25 in both languages, exactly matched;
h2/body is 1.25 English, 1.50 Urdu.

**Three codepoints.** Mehr maps 108; the archive's Urdu corpus uses 71 Arabic-script codepoints
and three of them are absent:

| | | where |
| --- | --- | --- |
| U+0768 | ݨ | Bulleh Shah's Punjabi kafi — `بُلھیا! کی جاݨاں میں کوݨ`, and `سجّݨ` |
| U+066D | ٭ | hemistich separator in a Persian couplet of Lal Shahbaz Qalandar |
| U+0680 | ڀ | Shah Abdul Latif's Sindhi bait — `جي تُو بيت ڀانئين` |

All three are in quoted verse, which is the most typographically exposed content the archive
has. Font fallback is per glyph, so they are drawn from Noto Nastaliq 400 — still Nastaliq, but
a different hand, and in a connected script the join to their neighbours is lost. It is not a
missing-glyph box; it is subtler than that, which is exactly why it needs a check rather than a
note. `src/styles/__tests__/nastaliqCoverage.test.ts` holds the corpus against
`pipeline/nastaliq_coverage.json` and fails on a fourth, in either direction — it also fails if
one of the three stops being a gap, so the exception list cannot rot into folklore. The manifest
records each font's SHA-256, so replacing a face without regenerating fails loudly rather than
validating the corpus against the wrong font.

---

## 4. The furniture that came off

All Urdu-only (`[dir='rtl']`) unless noted. The English view is unchanged except where a defect
was equally wrong in both.

| What | Before | After |
| --- | --- | --- |
| **Fact panel** | bordered card, fill, radius, a hairline under every one of six rows, 16px inline padding | no border, no fill, one hairline under the title and one above the dates and the action; rows separated by space |
| Panel row width | 186px of text inside a 220px rail — `ننکانہ صاحب، پنجاب، پاکستان` wrapped to **three** lines | 218px, two lines |
| Row gap | `--space-2` between label and value | **`0`** — the gap existed to keep Noto's ink apart and Mehr's slack is inside the line box now, so it was spent on separating *rows* instead (§5a.3) |
| **Status note** | filled amber panel | accent bar and the words |
| **Contents rail** | 220px, four of seven entries wrapped, wrapped lines set at the document's 2.05 leading so a two-line entry read as two entries | up to 264px (clamped to the page's own margin, so it can never be pushed off-screen), hanging indent under the number, `--leading-urdu-ui` inside an entry — **all seven entries now sit on one line**. The inter-entry gap was `--space-3` for one day and is now the item's own 3px padding; see §5a.4 |
| **Bibliography** | `disc` markers; Latin citations inheriting RTL, so the closing full stop was painted at the far left and every entry appeared to *begin* with a period; wrapped lines right-aligned | no markers; each Latin line an isolated LTR block, left-aligned, hanging indent — the bibliographic convention |
| **"Also cited by" note** | `border-block-end` drawn through the tails of `بھی` and `درج`, and an un-isolated RTL island that reordered the citation's tail (`(Oxford, ۱۹۰۹).` → `(Oxford.(۱۹۰۹ ,`) | padded clear of the descenders, `unicode-bidi: isolate` |
| **Section rhythm** | 32px between sections; the observances links sat **12px** above the next heading and their descenders met its ascenders | `--space-10`; the gap is 54px |

### Two defects that were equally wrong in English, fixed in both

- **The breadcrumb never drew an ellipsis.** `.shrine-breadcrumb-current` has carried
  `text-overflow: ellipsis` for as long as it has existed, and `.shrine-breadcrumb li` set
  `display: flex` — text-overflow applies to a block container's inline content, not to a flex
  container's anonymous item. So the name was cut by `overflow: hidden` with nothing marking the
  cut: *"Gurdwara Balila Sahib (Bal Li"*, *"گوردوارہ بالیلا صاحب (بال لیلا ص"*. The
  `max-width: 24ch` beside it fired at 810px of free space, because `ch` is the "0" advance and
  in Nastaliq that is nothing like the width of 24 Urdu letters. The crumb is a shrinkable flex
  item now and abbreviates only when it must.
- **The trust badges wrapped one-per-line.** Two more flex items in a row that fits in English
  and does not in Urdu, so `کتابی تصدیق شدہ` was orphaned on a second line. They are one group
  now (`.shrine-summary-trust`) and move together; nothing changes in English.

---

## 5. Checks added or corrected

- **`src/styles/__tests__/nastaliqCoverage.test.ts`** (new) — the corpus against the reading
  face's cmap, both directions, plus a SHA-256 on the shipped font files.
- **`pipeline/build_nastaliq_coverage.py`** (new) — generates the manifest; `--check` fails when
  it is stale. Vitest cannot parse WOFF2 and the repo carries no font parser, hence a manifest.
- **`e2e/typography.spec.ts`** — the Urdu-infobox guard was a raw pixel ratio (`< 1.5`) and was
  **measuring the typeface, not the layout**. Every px in the Urdu column got 25% bigger when
  the face changed, for a swap that made the panel *tighter*:

  | | px | px ratio | lines of its own body | line ratio |
  | --- | --- | --- | --- | --- |
  | English | 692 | — | 43.3 | — |
  | Urdu, Noto, 11 Sep | 979 | 1.415 | 50.7 | 1.17 |
  | Urdu, Mehr, 14 Sep | 1040 | 1.503 | 43.0 | **0.99** |

  It now measures the panel in multiples of its own body text, which is face-independent and is
  what "a compact list, not running prose" actually means. Threshold 1.15.
- **`src/styles/__tests__/fontFallbackMetrics.test.ts`** — "all three Noto weights are declared"
  became "every declared Nastaliq face covers Arabic *and* is reachable from `--font-urdu`, and
  the first family in that stack is one of them". The docstring's lesson (a face declared but
  never selected silently replaces the whole Urdu edition) is preserved and the assertion is now
  stronger than the count it replaced.
- **`e2e/font-preload.spec.ts`** — preloads the reading face and asserts the fallback face is
  *not* preloaded, which is the distinction that file exists to make.

---

## 5a. The second round, same day — what the first pass got wrong

Rauf, on the result: *"the sidebars on both sides look weird and there is english leaking on the
left one"*, then *"you cannot distinguish between the titles and the information"*, then
*"the spacing and stuff is good in the description but everywhere else it seems too much"* and
*"this sidebar takes the entire length of the screen"*.

Four separate defects, three of them mine:

**1. An English sentence in the fact panel, undeclared.** Five of the 127 rows carrying a
`year_built` hold English prose in it rather than a date — Bibi Pak Daman's is
`681 CE / c. 63 AH (popular tradition) — see note; second tradition dates the events to the
early 13th century CE`, which RULE 2 keeps verbatim. It rendered as though it were translated
Urdu: full size, full colour, right-aligned, 329px of the panel. It is declared now
(`data-latin` + `lang="en"`) and set as its own left-to-right block.

  The discriminator matters and the first attempt got it wrong. "Contains a Latin letter" also
  catches `1416 AH`, which is a date with a unit, and demoting *that* to a grey left-aligned
  block is a regression — `shrineInfoboxDates.test` caught it, correctly. The rule is now
  `looksLikeProse`: **a word standing next to a number is a unit; three or more words standing
  next to each other are a sentence.** Measured against the shipped snapshot it sorts the five
  as date/date/date/PROSE/PROSE, and the one edge (`1041 (as given: "8 August 1041")`, two
  words) stays inline as intended.

  Prose keeps Western digits; a date takes Eastern ones. Not an exception to i18n rule 5 — the
  archive already draws that line, in that a `year_built_note` is left Western by design. A
  value that is a note behaves like one.

**2. The guard could not see it.** `urdu-no-leak.spec.ts` tests `data-darbar` (whose
`year_built` is `1072`) and `bari-imam` (a bare year), so no route exercised the shape and the
guard reported clean for as long as it has existed. A third shrine route is added.
**This file's routes are shapes, not pages; a shape with no route is a shape with no guard.**

**3. De-boxing went too far — twice, and the second correction reversed the first.** With the row rules gone, proximity was the only thing saying
which value belonged to which label, and the ratio was wrong: 4px inside a row against 17px
between rows, on line boxes 39 and 45px tall. A label sits *on* its value now (gap 0) with
`--space-3` between rows — about 5px against 33px. The label could not simply be made smaller:
Nastaliq's floor is `--text-sm`, it is already there, and Mehr has one weight, so the cue had to
be spatial.

  **And spatial was still not enough.** Asked a second time — *"add some lines or some way to
  make it so that you can distinguish"* — the row hairlines went back in. The original argument
  against them was that a horizontal rule every 60px cuts across the tails of the Nastaliq line
  above it; that is true of a rule sitting tight under text and false of this one, which sits
  12px below a line box that already contains the descenders (Mehr draws 1.79em into a 1.85em
  box). The real lesson is about the tool, not the pixels: **with every row two lines of
  Nastaliq at 21 and 24px, "these two are closer together" is a judgement the reader has to
  make, and a rule is a fact.** Proximity still groups *inside* a row (`gap: 0`); the hairline
  says where a fact ends. The panel keeps no border, no fill and no radius — one hairline per
  row is the whole of its structure, which is what "hairlines, not cards" was always supposed to
  mean.

**4. The chrome was too airy, and the fix was gaps rather than type.** Measured in multiples of
its own body text the Urdu chrome was only ~10% looser than the English (masthead 17.0em against
15.3em; contents entries 2.48em against 2.38em) — proportionally almost the same design, which
is why nothing looked wrong in isolation. What a reader sees is absolute space, and 1.44x type
with Latin-tuned px gaps fills a screen:

| | before | after | English |
| --- | --- | --- | --- |
| masthead | 412px | 379px | 244px |
| contents rail (13 entries) | 842px | 660px | 536px |
| fact panel | 1037px | ~975px | 704px |

  The rail's entries are 45px, not less: at `--text-sm` the line box is 39px and a 39px link is
  below the 44px target minimum. (Measured in passing and **not** fixed, because it is neither
  Urdu nor new: the *English* rail's links are **27px**.)

**5. Every sticky element sat under the header in Urdu.** `--header-height` is a 56px token and
the page header is not: 71px in English, **95px in Urdu**, because it sets its own chrome in
Nastaliq. `EntityPageHeader.tsx` had already measured this and published
`--page-header-height`, and its own comment recorded that the three desktop sticky offsets
"all add `--space-4` to it, and 56 + 16 = 72 happens to clear a 71px header by a pixel … The
number was wrong and the sum was right, on desktop, by coincidence" — and left them alone. The
coincidence died with the change of face: the fact panel's title was sliced in half by the
header's own background. All three now read the measured value.

---

## 6. Open, for Rauf

**The category kicker and the breadcrumb print the same words in the Urdu view.** In English the
kicker is small caps at 0.1em tracking behind a rule, and the crumb beside it is sentence case at
12px: three words twice, but two obviously different objects. Nastaliq has neither case nor
tracking, so both collapse to the same string in the same script, thirty pixels apart, above the
title — `سکھ گردوارہ`, then `سکھ گردوارہ`.

Hiding the kicker in the Urdu view was tried and reverted: `e2e/nastaliq-metrics.spec.ts` asserts
it is visible there, and which of the two an Urdu reader should keep — the coloured genre label
or the navigation trail — is a call about the page, not about a stylesheet. Asked in the chat on
14 September 2026; this line is the record of the question, not the asking of it (RULE 5).
