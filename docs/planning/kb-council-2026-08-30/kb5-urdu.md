# KB-5 — Urdu Knowledge Parity

Reviewer KB-5, read-only. Measured 30 August 2026 against the running dev server at
`http://localhost:5173` and the live published sheet CSV (171 rows, 44 columns, fetched
directly). Nothing was written into the repository.

**Instrument note that governs every number below.** `src/data/shrines-index.json` is a slim
169-row index carrying only 10 columns — no `site_type`, no `Events`, no `year_built_note` —
and it paints before the live 171-row/44-column sheet replaces it. A Playwright probe with a
fixed wait, or one that stops at the first two identical readings, measures the slim index and
reports the Urdu view as missing knowledge it in fact has. Two of my own findings died that way
(§2.2, §2.3). Every rendered number in Section 1 was taken after a settle loop that required at
least ten samples and four consecutive identical readings, and the two large sweeps were
independently cross-checked against a data-level simulation that reproduces the same counts.

---

## Section 1 — Findings

### KB5-1 — Every recorded qualification about *when* a site was built or an event happened reaches an Urdu reader only in English

**Measured — rendered page.** Playwright over all 161 shrine pages whose live-sheet row carries a
`year_built_note` or an `event_note`, `?lang=ur`, reading `.infobox-note` textContent after the
settle loop:

```
pages=161  content-notes=139  latin=139  urdu=0  pages-with-no-note-rendered=35
```

(The 35 render no note because their `year_built` cell is empty, which suppresses the whole
infobox row in *both* languages. Two further `.infobox-note` elements on those pages were the UI
string `locationNotRecorded` and are excluded from the 139.)

A second, independent rendered sweep of all 171 Urdu shrine pages reading every `.infobox-row`
agrees and extends it:

```
label            rows  containing Latin
قیام (Founded)    166   119
تقریب کا سال      19    19
وفات (Died)       72    9
پیدائش (Born)     67    8
سلسلہ             54    6
تعمیری صورت       169   4
مقام              170   8
تقریبات           169   2
صوفی بزرگ / دیوتا / سکھ گرو / سنت / روایت / تاریخی شخصیت   0 each
```

**Source, unambiguous.** `src/components/shrine/ShrineInfobox.tsx:283-287` and `:312-316` render
`{shrine.yearBuiltNote}` / `{shrine.eventNote}` raw inside `<bdi data-latin>`, with no
`localizeField`. `src/lib/data/shrineModel.ts:112,114,123,127` builds `statusNote`,
`siteTypeNote`, `yearBuiltNote`, `eventNote` with `getFieldValue` (the English column only), and
the live sheet has no `*_ur` column at all — I checked the 44 column names.

**What an Urdu reader loses:** the archive's most honest content. On
`/shrine/darbar-malik-ahmad-ayaz?lang=ur` the founding year reads `۱۰۴۱` in Eastern numerals and
directly beneath it, in English: *"The founding answer (Q6) is '8 August 1041', which is
character-for-character the death date given in the life answer…"*. On
`/shrine/bhit-bhit-shah?lang=ur`: `نوٹ: Tomb built after the saint's death`. On
`/shrine/darbar-mian-qurban-ali-shah?lang=ur`: *"1416 AH is the survey's answer to 'in which
year was this place founded'…"* — the exact sentence CLAUDE.md RULE 2 holds up as the model of
correct editorial practice. The Urdu reader sees a confident number and cannot read the sentence
that qualifies it. This is the one class of content where being unable to read the caveat is
worse than being unable to read the fact.

**Scale:** 139 rendered notes across 161 entries (160 rows carry a `year_built_note`, 21 an
`event_note`; 147 and 20 distinct strings). Add 17 more rows of the same class — `figure_born`
and `figure_died` cells that are hedged sentences rather than years (*"8 Muharram 1040 AH / 8
August 1630 CE"*, *"Not given. The only early date is 'educated in Georgia in 993 AD' (Q9)"*) —
and 6 hedged `silsila` cells. **162 infobox values in total.**

**Remedy:** **requires authoring Urdu — this is a human's, not an agent's.** 147 + 20 distinct
sentences, most of them argued prose about a source contradiction, and RULE 2 forbids
paraphrasing a hedge. Two mechanical parts can be split off first and are safe:
(a) 11 rows' `year_built_note` already resolve through the existing dictionary — the six strings
`Undocumented`, `Ancient; construction date undocumented`, `Commemorates Bebe Nanaki`,
`Rebuilt 1670`, `1375-1376 CE`, `Traditionally linked to Guru Nanak's third udasi` — so routing
these two render sites through `localizeField(shrine.raw, 'year_built_note')` (the way the
`Events` row already goes through `localizeField`) converts 11 of the 119 with no new Urdu;
(b) the remainder then becomes a countable, shrinking translation queue in
`urdu-i18n/build_dictionary.py` rather than an invisible one. Note that the existing
`e2e/urdu-no-leak.spec.ts` cannot see the size of this: it visits **two** shrine pages, and
`shrine: 10` is a budget of text nodes on Data Darbar alone.

**Confidence:** high. Code path, two independent rendered sweeps, and a data-level count that
matches the rendered count field by field.

---

### KB5-2 — The Urdu for 80 observance cells is already in the repository, and four surfaces never look at it

**Measured — rendered page, three surfaces:**

```
/almanac?view=list&lang=ur   .almanac-plain-source   80 rows,  32 contain Latin
/place/lahore?lang=ur        .order-urs-recorded     37 rows,  25 contain Latin
/order/chishtiyya?lang=ur    .order-urs-recorded     13 rows,   7 contain Latin
```

Against the *same cells* on the shrine pages, measured in the 171-page sweep: `تقریبات` renders
Latin on **2 of 169**.

The same data, two answers. Data Darbar's `Events` cell renders on its own page as

> سالانہ عرس (18 سے 20 صفر)؛ جمعرات کی شام قوالی اور دھمال؛ روزانہ لنگر

and on `/place/lahore?lang=ur` as

> ⁨Annual urs (۱۸-۲۰ Safar)⁩؛ ⁨جمعرات کی شام قوالی اور دھمال⁩؛ ⁨روزانہ لنگر⁩

**Cause, exact.** `ShrineInfobox.tsx:42` is
`localizeObservance(localizeField(shrine.raw, key), lang)` — the **whole cell** is looked up
first, and `translateToUrdu` → `buildUrduFallback` (`urduFallback.ts:347`) consults
`SPECIAL_URDU_PHRASES`, a 170-entry map of whole `Events` cells hand-translated in
`src/lib/i18n/urduFallback.ts:9-258`. The other three call sites pass the raw English cell:
`AlmanacPage.tsx:717`, `RecordedObservanceList.tsx:151` (used by `/place/:slug`, `/order/:slug`
and `/saint/:slug`), `ArchiveSearch.tsx:255`. `localizeObservance` splits on `;` **before** any
lookup, so a whole-cell entry is unreachable from those three.

Simulating both paths over the 170 live `Events` cells against the seed **plus**
`SPECIAL_URDU_PHRASES`:

```
whole-cell path fully Urdu (shrine infobox)                    168 / 170
segment path fully Urdu (almanac, order, place, saint, search)  88 / 170
whole works but segments do not  ← the gap                      80
neither                                                          2
```

The simulation's "neither = 2" matches the rendered sweep's "`تقریبات` Latin on 2 of 169"
exactly, which is what validates it.

**What an Urdu reader loses:** on the ʿurs almanac — the page whose entire subject is *when the
gatherings happen* — 32 of the 80 undated observances read half in English:
`⁨کبھی کبھار زیارت⁩؛ ⁨Bebe Nanaki commemoration⁩`,
`⁨سکھ برسیاں⁩؛ ⁨martyrdom commemoration of Guru Arjan Dev⁩`,
`⁨گرو نانک کی برسیاں⁩؛ ⁨daily visa-free pilgrimage via the Kartarpur Corridor⁩`. Some read
entirely in English with Eastern digits substituted mid-sentence
(`Annual urs (۱۸-۲۰ Safar)`), which is worse than plain English because it looks translated.

**Scale:** 80 of 170 cells, on four surfaces — `/almanac` (both views), all 9 `/order/:slug`,
all 64 `/place/:slug`, 143 `/saint/:slug`, and the archive-wide search.

**Remedy — mechanical, reusing reviewed Urdu already in the repo; no Urdu authoring.** Either
pass the localized cell at the three call sites the way the infobox already does
(`localizeObservance(localizeField(row, 'Events'), lang)`), or — better, because it fixes all
four at once and cannot be forgotten by the fifth caller — try the whole string first inside
`localizeObservance` itself: `const whole = translateToUrdu(raw); if (!/[A-Za-z]/.test(whole))
return whole;` before the `raw.split(';')`. The strings being reused are the existing
`SPECIAL_URDU_PHRASES` entries, e.g. `'Occasional pilgrimage; Bebe Nanaki commemoration'` →
`'کبھی کبھار زیارت؛ بے بے نانکی کی یادگاری تقریب'` and
`'Annual urs (18-20 Safar); Thursday-evening qawwali and dhamal; daily langar'` →
`'سالانہ عرس (18 سے 20 صفر)؛ جمعرات کی شام قوالی اور دھمال؛ روزانہ لنگر'`.

**Corrects a note in the repo:** `e2e/urdu-no-leak.spec.ts` explains the `order`, `place` and
`almanac` budgets as *"each of these is a segment the observance dictionary does not yet
carry"*. For 80 of the 170 cells the dictionary carries the whole thing; only the lookup shape
differs. The budgets are not measuring a translation debt, they are measuring a wiring one.

**Confidence:** high. Code paths read, three rendered surfaces measured, simulation validated
against a known rendered answer.

---

### KB5-3 — All 64 place pages are unreachable from an Urdu search query

**Measured — rendered page.** Archive-wide palette on `/about?lang=ur`, reading
`.archive-search-results > li` after each query settles:

```
"Karachi" → GROUP مقامات … کراچی | ۱۱ مزارات        "کراچی" → no place row
"Multan"  → GROUP مقامات … ملتان | ۸ مزارات          "ملتان" → no place row
"Lahore"  → GROUP مقامات … لاہور | ۳۷ مزارات         "لاہور" → no place row
"چشتیہ" → order row ✓ (arabicName)   "بے بے نانکی" → figure row ✓ (the 0fb1a10 fix)
```

Run in both orders (Latin first, Urdu first) to rule out a load-order artefact; the result is
order-independent.

**Cause, exact.** `src/components/search/ArchiveSearch.tsx:227` builds the place match
candidates as `places.map((place) => ({ type: 'order' as const, slug: place.slug, name:
place.name }))` — **no `nameUr`**. The 30 August fix (`0fb1a10`) added `searchableEntities`
(lines ~158-175), which enriches `entities` — the 261 rows of `data/kg-search-index.json`
(244 figures + 9 orders + 8 traditions) — and places are not in that file. Line 235 already
renders the row through `localizeRecordedName(place.name, lang)`, so this is precisely the seam
the commit message describes for figures, still open one entity type over: *the row can display
the name the reader typed while the matcher cannot find it.*

**What an Urdu reader loses:** `/place/:slug` is a whole navigational layer — Track B of
`SHARED_GROUND_VISION.md`, 64 pages, the one that turns "Lahore" from a filter value into a
readable subject. An Urdu reader typing لاہور gets six shrines and no Lahore. An English reader
typing the same word in Latin gets the page.

**Scale:** 64 place pages, all of them — and **all 64 already have a reviewed Urdu name in
`src/data/urdu-seed.json`** (`'Lahore' → 'لاہور'`, `'Multan' → 'ملتان'`, `'Karachi' → 'کراچی'`),
which is why every one of the 64 page titles renders in Urdu today. Nothing is missing but the
wire.

**Remedy — mechanical, reusing reviewed Urdu already in the repo; no Urdu authoring.** At
`ArchiveSearch.tsx:227`, add the Urdu name to the candidate:
`{ type: 'order' as const, slug: place.slug, name: place.name, nameUr: localizeRecordedName(place.name, 'ur') }`.
`localizeRecordedName` is already imported in this file and already used three lines below to
render the row; `haystacks()` in `entitySearch.ts` already indexes `nameUr` when present. The
strings being reused are the `PLACES` names resolved through `src/data/urdu-seed.json` — the
same values the page titles use (all 64 place-page `h1`s render in Urdu today, verified). The
existing `dictGen` re-render already covers the "dictionary arrived late" case. Guard it with a
case in `e2e/search-bilingual.spec.ts`, which is where the figure fix's own case lives.

**Confidence:** high.

---

### KB5-4 — 239 of 239 shrine locations on the figure and order pages are English, and 163 of them have a reviewed Urdu translation the archive shows everywhere else

**Measured — rendered page.** All 9 `/order/:slug` and all 244 `/saint/:slug` in Urdu, reading
`.order-site-location`:

```
pages rendering .order-site-location: 143
location rows rendered: 239   containing Latin: 239   distinct Latin strings: 150
```

Against the *same field* on other surfaces, from the 171-page shrine sweep: `مقام` renders Latin
on **8 of 170**.

**Cause, exact.** `src/components/shrine/RelatedShrines.tsx:36` uses
`localizeField(s.raw, 'Location')` and gets `لاہور، پنجاب`. `src/pages/SaintPage.tsx:794` and
`src/pages/OrderPage.tsx:810` render `{shrine.location}` raw and get `Lahore, Punjab`. Both are
`data-latin`, but only one of them is actually untranslated. Both pages hold full `Shrine`
records (`shrineRecords` at `SaintPage.tsx:176`, `orderShrines` at `OrderPage.tsx:233`), so
`.raw` is in scope at both render sites.

Dictionary coverage of the 171 live `Location` values: **163 translate, 8 do not** — and the 8
are exactly the long survey-qualification paragraphs (*"Miani Sahib Graveyard, Lahore. The field
survey itself locates the shrine only as 'Lahore'…"*), which the sidebar and infobox also leave
in English, correctly, under RULE 2.

**What an Urdu reader loses:** on `/saint/data-ganj-bakhsh?lang=ur`, "متعلقہ مزارات → داتا دربار
→ **Lahore, Punjab**", while the map sidebar, the shrine's own infobox, the typology cards, the
related-shrine cards and the search rows all say `لاہور، پنجاب` for the same string. It is not
that the place is untranslated; it is that this one surface does not ask.

**Scale:** 239 rendered rows across 143 pages; 150 distinct strings, of which the 8 genuine
survey paragraphs are the only ones that should stay Latin.

**Remedy — mechanical, reusing reviewed Urdu already in the repo; no Urdu authoring.** Replace
`{shrine.location}` with `{localizeField(shrine.raw, 'Location') || shrine.location}` at
`SaintPage.tsx:794` and `OrderPage.tsx:810`, exactly as `RelatedShrines.tsx:36` already does.
Keep `data-latin` — the 8 survey paragraphs still need it — and lower the affected budgets in
`e2e/urdu-no-leak.spec.ts` afterwards rather than leaving slack (that file's own rule). The
strings being reused are the existing `urdu-seed.json` location values, e.g.
`'Lahore, Punjab' → 'لاہور، پنجاب'`. The code comment at `SaintPage.tsx:793` — *"The survey's own
wording, often still English"* — is true of 8 rows out of 171 and should be corrected with the
fix.

**Confidence:** high.

---

### KB5-5 — Two different kinds of result share one heading in the Urdu search, so the archive's places read as a second list of shrines

**Measured — rendered page, both languages.** Same query, same component:

```
/about?lang=en  "Lahore" → GROUP: SITES | GROUP: FIGURES | GROUP: PLACES
/about?lang=ur  "Lahore" → GROUP: مقامات | GROUP: شخصیات | GROUP: مقامات
```

(Read via `innerText`, so the English headings arrive CSS-uppercased; the source strings are
`'Sites'` and `'Places'`.)

**Cause, exact.** `uiStrings.ur.ts:157` `searchGroupSites: 'مقامات'` and `uiStrings.ur.ts:537`
`placesTitle: 'مقامات'`. `ArchiveSearch.tsx:285-296` uses the first for `kind === 'shrine'` and
the second for `kind === 'place'`.

**What an Urdu reader loses:** the distinction between an entry of the archive and a place that
holds several of them — which is the entire idea `/place/:slug` was built for. With the place
group rendered last, the second `مقامات` reads as a continuation of the first rather than a
different kind of thing, and `لاہور | ۳۷ مزارات` looks like a 37th shrine.

**Scale:** every archive-wide search in Urdu that returns both kinds. Structural, not per-row.

**Remedy:** one of the two Urdu strings must change, and **choosing the word is authoring Urdu —
a human's decision.** What can be said without deciding it: the archive already uses `مزارات`
for the shrine list in this very component's own place-row meta (`placeSiteCount` renders
`۳۷ مزارات`), so substituting the term the archive already uses in the same grammatical slot is
the smallest available proposal for `searchGroupSites`; `مقامات` would then be left to
`placesTitle`, which is also the `/place` index page's own title. I am proposing a substitution
of an existing string, not composing a new one. Note that this is a knowledge-navigation defect
rather than a leak, so `e2e/urdu-no-leak.spec.ts` cannot ever catch it — a guard asserting that
the group headings in one result list are distinct would.

**Confidence:** medium-high on the effect, high on the measurement. What would raise it: a
fluent reader confirming that `مقامات` for "Sites" is the collision it appears to be rather than
an accepted overload.

---

## Section 2 — Retractions

Everything I checked that turned out fine, and everything I killed by re-measuring. Two of these
were findings I had already written down.

**2.1 — "16 of 169 entries have no Urdu article." Wrong key.** I cross-referenced
`src/data/urdu-content.json` against the `id` column of `shrines-fallback.json` and got 16
missing plus 15 orphan Urdu articles, including six of the eight protected photo slugs. The app
does not key on `id`: `urduContentOverride.ts:mergeUrduContent` keys on
`buildStableSlug(getFieldValue(row, 'Name'))`. Re-run against the live sheet with the right key:
**168 of 171 entries have an Urdu article, 3 do not, and there are zero orphans.** The three are
Darbar Abul Muali Qadri, Darbar Malik Ahmad Ayaz and Darbar Mian Qurban Ali Shah, and
`useArticleContent.ts`'s `urduArticleMissing` already tells the reader so in Urdu — verified on
the rendered page: *"اِس اندراج کا اردو متن ابھی نہیں لکھا گیا۔ نیچے دیا گیا مضمون انگریزی میں
ہے — روکنے کے بجائے جوں کا توں دکھایا گیا ہے۔"* The only correction worth making is that the
comment above it says *"Two of the archive's 169 entries"* and it is now three of 171.

**2.2 — "The Urdu typology atlas collapses all 169 sites into 'built form not recorded'."**
Measured, real, and false. A 5-second fixed wait caught the slim index, which carries no
`site_type`. With a settle loop the Urdu `/typology` has the same 15 groups as English with
identical counts (مندر ۳۸ · احاطہ ۳۴ · درگاہ / مزار ۳۱ · گردوارہ ۳۱ · مقبرہ / یادگار ۱۵ ·
خانقاہ ۱۰ · مزار ۳ · غار کا مزار ۲ · شہید کی قبر ۱ · قدرتی مقدس مقام ۱ · جیسا سروے نے بیان کیا
×4 · تعمیری صورت درج نہیں ۱).

**2.3 — "The Urdu almanac is missing three sections the English one has."** Same cause. `Coming
up`, `Coverage`, `Recorded by season only` and `Observed, but the date is not recorded (80)` are
all present in Urdu; my probe read the page before the live sheet landed. This one is the reason
I hardened the settle rule for everything afterwards rather than only for typology.

**2.4 — "Observance cells are half-translated on shrine pages."** The opposite. `تقریبات`
renders fully in Urdu on 167 of 169 pages. The half-translated rendering is on the *other* four
surfaces, which is what became KB5-2 — a finding that only exists because the first reading was
wrong in a way that made the two surfaces disagree.

**2.5 — "English survey prose floods the Urdu browse list."** I was reading the visually hidden
screen-reader shrine directory in `MapPage.tsx`, not the sidebar, and generalising from the ten
Lahore rows that happen to sort together. Across all 171 shrine pages the `مقام` row is Latin on
**8**, and those 8 are the survey-qualification paragraphs RULE 2 protects. (The genuine defect
next door is KB5-4, and it is a different surface.)

**2.6 — Urdu article completeness.** Fine. Comparing English `Description` against
`descriptionUr` with the bibliography section stripped from both: median length ratio **0.91**
across 168 entries, **nothing below 0.84**, no entry below 0.60 or 0.75. Section headings match
one-for-one apart from the bibliography, which is the settled fallback.

**2.7 — Entity page titles.** All 323 render in Urdu. Rendered sweep of `h1.entity-title` with
`?lang=ur`: place 64/0 Latin, order 9/0, tradition 6/0, saint **244/0**. The
`kgNameCoverage.test.ts` ratchet is holding well past the 136 principal figures it asserts.

**2.8 — "28 of 94 knowledge-graph places have no Urdu name."** True of `data/kg.json` and
irrelevant: `/place/:slug` is driven by the closed 64-entry vocabulary in
`src/lib/data/places.ts`, not by the graph's place nodes, and all 64 titles render in Urdu
(2.7). Reading the data file measured a surface that does not exist.

**2.9 — "All 149 knowledge-graph event names render in Latin."** Same shape. `event.name`
(*"Urs of Shah Abdul Latif Bhittai at Bhit (Bhit Shah)"*) is never rendered anywhere;
`getShrineEvents` / `getSaintObservances` consume `shrineSlug`, dates and frequency, and the
labels around them are UI strings.

**2.10 — "The seed dictionary covers 1 of 14 `site_type` values, 0 of 9 `status`, 0 of 11
`figure_type`."** True of `urdu-seed.json` and not a gap: those are enum label maps in code —
`SITE_TYPE_LABELS` in `src/lib/data/siteType.ts`, and the equivalents in `siteStatus.ts`,
`infoLevel.ts`, `supportLevel.ts` — which is the convention CLAUDE.md prescribes. The rendered
pages show `درگاہ / مزار`, `جزوی طور پر دستاویز شدہ`, `ماخذات سے دستاویز شدہ`. Likewise
`year_built_precision`: 126 of 170 cells are Latin in the sheet and the infobox renders
`۱۷۷۲ (متعین)`.

**2.11 — `/about`.** Full parity. All 24 sections present in both languages, section by section,
with the Urdu within ±10% of the English length on every one. The only Latin in the Urdu view is
section 8's bibliography (2,589 chars — i18n rule 7), the licence string, the citation record
and the contact address. My first reading compared `innerText` line counts (292 vs 506) and
would have reported a missing half; that was the source list wrapping differently, not missing
content.

**2.12 — `/chronology`, `/shared-ground`, `/review`, `/tradition/:slug`.** None of these is in
`e2e/urdu-no-leak.spec.ts`'s 21-route walker, so I scanned them for undeclared Latin text nodes.
Clean: `/shared-ground` and `/review` carry one Latin node each (the `EN` language toggle),
`/tradition/nanakpanthi` 33, all declared. `/chronology` has two undeclared runs and both are the
known two shrines with no Urdu name. `/chronology` also carries the era-boundary years and
category counts in Eastern numerals at full precision (مسلم مزار ۵۵ · ۷۴۸–۲۰۱۱ etc.).

**2.13 — Tours.** Fully bilingual. All 8 tours have `titleUr` and `descriptionUr`; **46 of 46
stops have a `narrativeUr`**, none empty. Every tour facet value resolves — 7 eras, 5 regions,
7 themes through the dictionary, 3 traditions through `TRADITION_LABELS`.

**2.14 — Source notes ("where the source contradicts itself").** Fully bilingual. 131 notes
across 53 slugs; **0 with an empty `ur`, 0 where `ur` equals `en`.** This is the one place the
archive's contradiction-reporting *does* reach an Urdu reader intact, which is worth stating
next to KB5-1.

**2.15 — Route coverage.** Every English route has a `/ur/` twin in `App.tsx`, including the two
redirects and the two unlisted pages; nothing is English-only.

**2.16 — An instrument I could not stabilise, reported rather than hidden.**
`/shrine/darbar-mian-qurban-ali-shah?lang=ur` returned 85 Latin text nodes on one run and 1 on
the next, twelve seconds of settling each time. That entry is one of the two rows present in the
live sheet and absent from both `shrines-index.json` (169 rows) and `shrines-fallback.json` (169
rows, generated 18 August), so when the sheet fetch is slow the route resolves to nothing. This
is the known 171-vs-169 snapshot drift, not an Urdu defect, and I mention it only because it
means any per-shrine measurement of those two rows — mine included — is a coin flip until
`npm run data:build` is run.
