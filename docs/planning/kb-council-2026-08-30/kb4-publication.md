# KB-4 — What the archive knows but does not publish, and what it publishes that it does not know

*Read-only review, 30 August 2026. Nothing was written into the repository. Measured against: the
working tree; the committed `dist/`; **the live published Google Sheet, fetched directly** (171
rows, 44 columns, 856,607 bytes); and the running dev server at http://localhost:5173 driven by
Playwright. Where a claim depends on the render layer it was taken from `document.body.innerText`
in a real browser, never inferred from the data.*

*Two instrument notes, since this council requires them. (1) The first fetch of the published CSV
returned a **Google interstitial HTML page** — 7,877 bytes, nine "rows", ten "columns" — and a
naïve script would have reported the archive as having ten columns. Following the redirect chain
to `doc-0o-4k-sheets.googleusercontent.com` returns the real 171×44 file. (2) The observance
findings below use a script that imports the app's own `parseObservances` /
`claimsUndatedObservance`; it was validated against the almanac's own published 80 and 52 **before**
any conclusion was drawn from it, and reproduces both exactly.*

---

## Section 1 — Findings

Ranked by what a reader loses.

---

### KB4-1 — The almanac tells a reader that 52 sites record no observance. Fifty-one of them record one. The classifier knows ʿurs and mela; it does not know Diwali, Holi, Janmashtami, Durga Puja, Cheti Chand, Vaisakhi, Akhand Path or prakash.

**Measured.** Rendered `http://localhost:5173/almanac`, Coverage block, verbatim:

```
Coverage
23  with a day and month
10  with a month only
 6  with a season only
80  observed, date unrecorded
52  no observance recorded
```
23+10+6+80+52 = 171, so this partitions the whole archive. Re-derived with the app's own
predicates over the live sheet:

```
"no observance recorded":                                        52
  Events cell non-empty:                                         51
  Events names an observance the classifier's vocabulary lacks:  30
```

By the archive's own `category` column:

| tradition | classified "no observance recorded" |
| --- | --- |
| Muslim (all forms) | **5 / 82 — 6%** |
| Sikh Gurdwara | 9 / 33 — 27% |
| Nanakpanthi / Udasi Darbar | 9 / 14 — 64% |
| Hindu Temple | **23 / 35 — 66%** |
| Jain Temple | **3 / 3 — 100%** |

The cause is one regex, `OBSERVANCE_RE`, `src/lib/data/ursDates.ts:352`:

```js
/\burs\b|ʿurs|\bmela\b|\bfestival\b|\bcommemorat|\banniversar|\byatra\b|\bgurpurab\b|\bjatra\b|\bshivratri\b|\bgathering/i
```

Eleven alternatives. These `Events` cells therefore read as recording nothing:

```
Krishna Mandir (Kabari Bazar)        "Holi; Diwali; Janmashtami"
Krishna Mandir (Ravi Road)           "Janmashtami; Holi; Diwali"
Shri Swaminarayan Mandir, Karachi    "Janmashtami; Holi; Diwali"
Shri Panchmukhi Hanuman Mandir       "Hanuman Jayanti; Holi; Diwali"
Shri Laxmi Narayan Mandir            "Ganesh Chaturthi; Holi; Raksha Bandhan; asthi visarjan rites"
Valmik Mandir (Naqi Road)            "Holi; Diwali; Valmiki Jayanti"
Valmiki Swamiji Mandir, Rawalpindi   "Diwali; Holi"
Lal Kurti Temple (Balmiki Mandir)    "Diwali; Holi; Raksha Bandhan; daily worship"
Kali Bari Mandir                     "Durga Puja; daily worship"
Gorakhnath (Goraknath) Temple        "Diwali (principal annual opening)"
Jhollay Lal Mandir                   "Cheti Chand"
Shrine at Odero Lal                  "Cheti Chand; shared Hindu and Muslim observance year-round"
Gurdwara Sach Khand Sahib            "Daily prakash; continuous langar"
Gurdwara Bhai Joga Singh             "Daily prakash; morning and evening worship"
Gurdwara Pehli Patshahi (Jind Pir)   "Gurpurabs; daily prakash of the Guru Granth Sahib"
Gurdwara Chhevin Patshahi, Mozang    "Annual Akhand Path around Guru Hargobind's Gurpurb (historic)"
Gurdwara Patshahi Chhevin (Hadiara)  "Historically an annual Maghi fair"
Gurdwara Chowmala Sahib              "Historically an annual fair at Basant Panchami"
Kalka Cave Temple                    "First Monday of each month; major goddess festivals"
Khatwari Darbar, Shikarpur           "Sikh and Nanakpanthi festivals"
```

**Two of those are a plain bug, not a vocabulary judgement.** `\bfestival\b` does not match
`festivals`:

```
$ node -e "const OB=/…\bfestival\b…/i;
           console.log(OB.test('Sikh and Nanakpanthi festivals'), OB.test('a festival'))"
false true
```
`\bmela\b` is present; `\bfair\b`, its English, is not — three more rows.

**The same visit contradicts `/about` outright.** `/about`, computed from the same live sheet:
*"Urs and festivals — **170** entries recording an observance; **1** entry recording none."*
`/almanac`: **52** recording none.

**What a reader loses.** `/shrine/krishna-mandir-kabari-bazar`, measured on screen, shows an
infobox row reading `Events — Holi; Diwali; Janmashtami` and a paragraph opening *"The temple
comes most fully alive at the great festivals of the Hindu year."* The almanac counts that entry
among the sites recording no observance. Two thirds of the archive's Hindu temples and every one
of its Jain temples are reported as keeping nothing, on the page whose purpose is to say when
these places gather, in an archive whose distinguishing claim is that it covers six traditions.
The archive is misreporting its own holdings along exactly the line it exists to cross.

**Scale.** 52 published as recording nothing; 51 have text; 30 name an observance; 20 of those
name a specific, currently-kept festival or daily rite. 6% of Muslim sites against 66% of Hindu
and 100% of Jain.

**Remedy.** Widen `OBSERVANCE_RE` in `src/lib/data/ursDates.ts` (unowned) with vocabulary lifted
from the archive's own cells — nothing invented — and fix `festival` → `festivals?`, add `fair`.
That moves ~30 rows from "records nothing" to "observed, date unrecorded", a first-class state the
page already renders honestly. A test asserting the *per-tradition rate* rather than a magic
number would refuse the next Muslim-only vocabulary. Do not bundle in the dating of Hindu and
Sikh festivals — there is no Bikrami calendar here, and the undated bucket is the honest
destination today. `/about` and `/almanac` should call one function; today they call two.

**Confidence:** high. Instrument validated against the page's own 80 and 52 before use; the regex
miss reproduced directly; one entry confirmed on screen from both sides.

---

### KB4-2 — Four entries' "Where the source contradicts itself" disclosure is keyed to a slug the site does not use, so it never renders — and its test compares `id` to `id`, so it passes.

**Measured.** `src/data/source-notes.json` holds 52 keys. The route a shrine page lives at is
`slugify(Name)` (`shrineModel.ts:98` via `buildStableSlug`), not the sheet's `id` column. Six of
the 52 keys are not any route:

```
tahir-bandagi-qadri                 → route is darbar-hazrat-tahir-bandagi-qadri            (2 items)
wasif-ali-wasif                     → route is darbar-wasif-ali-wasif                       (1 item)
khawaja-feroz-ud-din-gharib-nawaz   → route is darbar-hazrat-khawaja-feroz-ud-din-…-nizami  (1 item)
ghazi-ilm-din-shaheed               → route is darbar-ghazi-ilm-din-shaheed                 (2 items)
darbar-mian-qurban-ali-shah         → (an unpublished entry — already known)               (10 items)
darbar-hazrat-shah-gohar-peer       → (an unpublished entry — already known)                (4 items)
```

Confirmed in a browser (`ShrinePage.tsx:493` passes `shrine.slug`; `SourceNotes` gates on
`SOURCE_NOTE_SLUG_SET.has(slug)`):

```
/shrine/darbar-hazrat-tahir-bandagi-qadri                          renders, no disclosure
/shrine/darbar-wasif-ali-wasif                                     renders, no disclosure
/shrine/darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-…-nizami   renders, no disclosure
/shrine/darbar-ghazi-ilm-din-shaheed                               renders, no disclosure
/shrine/shrine-of-baba-shah-kamal   (control, id == slug)          renders, disclosure present
```

**Why nothing caught it.** `SourceNotes.test.tsx` builds its expectation as
`shrineSnapshot.rows.filter(r => r.qa_note).map(r => r.id)` and compares it to
`Object.keys(table)`. Both sides are the `id` column. The test asserts the table is keyed the way
it is keyed. `sourceNoteSlugs.ts`'s own header says a slug missing from the index is *"a
disclosure a reader silently never sees — a failure with no symptom, which is why it is asserted
in both directions"* — and both directions are the same direction.

**The root cause is wider than the disclosure.** Across the live sheet, **13 of 171 rows have an
`id` that is not the route slug, and none of the 13 has a prerendered page**:

```
ghazi-ilm-din-shaheed · khawaja-feroz-ud-din-gharib-nawaz · tahir-bandagi-qadri
wasif-ali-wasif · abul-faiz-qalander-ali-suharwardi · bibi-pak-daman · ganj-e-inayat-sarkar
madho-lal-hussain · peer-makki · shah-jamal · mazar-e-iqbal
darbar-hazrat-khawaja-shah-muhammad-sulaiman-taunsvi-r-a · tomb-of-baha-al-halim-uch-sharif
```
Seven of CLAUDE.md's eight protected photo slugs are in that list. And the published dataset
(`data/shrines.json`, `shrines.csv`, the Zenodo bundle) carries `id` and **no slug column at
all** — so the only identifier a downstream researcher has fails to address the page for 13 rows.

**What a reader loses.** Four entries whose sources contradict themselves — including Darbar
Hazrat Tahir Bandagi Qadri, whose two notes concern where in a 475-kanal graveyard the shrine
stands, and Darbar Ghazi Ilm Din Shaheed, whose note explains that its coordinate is a graveyard
landmark rather than the grave — publish no disclosure. Those are the pages where the archive's
central claim is being made and silently is not.

**Scale.** 4 live entries lose a disclosure (6 keys are wrong, 2 belong to already-known
unpublished entries); 13 of 171 rows have a non-addressing `id`; 1 test that cannot fail.

**Remedy.** Key `source-notes.json` on the route slug, or resolve `id → slug` at the call site.
Then make the test compare the table's keys against **the slugs `buildShrines()` produces**, not
against `row.id` — that is the assertion that was intended. Separately, emit a `slug` column in
`data/shrines.json` / `shrines.csv` from `scripts/data/build-dataset.mjs` and document it, so the
release has an identifier that resolves. Files: `src/data/source-notes.json`,
`src/data/sourceNoteSlugs.ts`, `src/components/shrine/__tests__/SourceNotes.test.tsx`,
`scripts/data/build-dataset.mjs`. `src/components/` is another session's lane — the test file and
`ShrinePage` half must be handed over; the data half is unowned.

**Confidence:** high. Four pages confirmed on screen against a control that works.

---

### KB4-3 — Forty entries carry a written date caveat that no reader ever sees, and twelve of them display a bare year while the sentence disqualifying it is withheld.

**Measured.** `ShrineInfobox.tsx` renders `year_built_note` only inside `{shrine.yearBuilt && (…)}`.
Live sheet:

```
year_built_note non-empty:                              160 / 171
  of which year_built is EMPTY (note never renders):     40
total characters of note that never render:           1,711
```

Four of the 40 also have an empty `Founded/Opened`, so **nothing about the date renders at all**:

```
Jhollay Lal Mandir                  "Founding date undocumented"
Sant Baba Bhagat Ram Darbar Mandir  "Undocumented"
Shrine of Lakhi Shah Saddar         "Dates not securely established"
Valmik Mandir (Naqi Road)           "Heritage claims of great antiquity; unverified"
```

Twelve display a year or century in the "Founded" row while the note that qualifies it is hidden:

```
shown "1757"          hidden "Shrine developed after the saint's death"   Mazar of Bulleh Shah
shown "1901"          hidden "Shrine developed after the saint's death"   Mithankot (Kot Mithan)
shown "1604"          hidden "Shrine developed after the saint's death"   Purana Bhalwal
shown "1575"          hidden "Shrine developed after the saint's death"   Shergarh
shown "1966"          hidden "Shrine raised after the saint's death"      Shamsabad
shown "d. 1384"       hidden "Shrine developed after the saint's death"   Makhdoom Jahaniyan Jahangasht
shown "1245"          hidden "Traditional dating only"                    Langer Makhdoom
shown "15th century"  hidden "15th c. date provisional; uncorroborated"   Shah Yousuf
shown "around 500 AD" hidden "Traditional claim of c. 1,500 years; unverified"  Shri Panchmukhi Hanuman Mandir
shown "~900-1,000 yrs" hidden "Heritage accounts claim 900-1,000 years; unverified"  Shahwala Teja Singh Mandir
shown "~1,500 years"  hidden "Traditionally c. 1,500 years; unverified"   Kalat Kali Temple
shown "18th c., c. 1728" hidden "No construction date is given by either source"  Shah Inayat Qadiri
```

Confirmed on screen for `/shrine/gurdwara-chakki-sahib`: the infobox shows `Founded — Commemorates
events of c. 1520-21; gurdwara built later` and `Event year 1520` with its `event_note`, and the
row's `year_built_note` ("Gurdwara built later than the commemorated event") appears nowhere.
Note that `event_note` **does** render — the same shaped field, in the same block, correctly — so
this is one missing guard rather than a policy.

**What a reader loses.** CLAUDE.md RULE 2 names these notes as *"the most honest content in the
archive"* and gives an example of exactly this shape. `/about` counts them — *"160 entries whose
date carries a written qualification"* — so the archive tells a reader the qualifications exist
and then shows a bare "1757" with no way to reach the sentence saying 1757 is when the saint died,
not when the shrine was built. The failure mode is the worst available: the page looks complete.

**Scale.** 40 entries hold an unrendered note; 4 lose every word about their date; 12 display a
year the withheld sentence disqualifies.

**Remedy.** Move `yearBuiltNote` out of the `{shrine.yearBuilt && …}` guard so it renders whenever
it is present — under the `Founded` row when the legacy value is what is shown, and on its own
when nothing else is. The `hasDates` condition needs `|| shrine.yearBuiltNote` too, or the four
with nothing else stay invisible. **This lands in `src/components/shrine/ShrineInfobox.tsx` —
another session's lane — and must be handed over.** No new copy and no Urdu: the note already
renders through `{t('sourceNoteLabel')}: <bdi>{…}</bdi>` in the same file. A unit test should
assert a row with a note and no year.

**Confidence:** high. Counted in both the snapshot and the live sheet (40 in each), and the
absence confirmed on a rendered page against `event_note` rendering correctly beside it.

---

### KB4-4 — The archive prints a two-decimal locality guess as a five-decimal coordinate, with a copy button, and says nothing.

**Measured.** `src/components/shrine/LocationMap.tsx:26`:

```ts
const coords = `${latLng.lat.toFixed(5)}, ${latLng.lng.toFixed(5)}`;
```

Twelve of 169 entries carry a latitude or longitude typed to two decimal places or fewer
(≈1.1 km; two of them one decimal, ≈11 km), and **all twelve are silent** — no
`approximate` / `precise pin` / `no coordinates` phrase in `Location`, `year_built_note` or
`status_note`:

```
32.0422   74.26      Gurdwara Chakki Sahib
31.46     74.555     Gurdwara Chhevin Patshahi, Jhalian
29.03     66.588889  Kalat Kali Temple
33.9833   73.5       Mohra Sharif (Khanqah)                  <- 1 dp longitude
33.99333  71.59      Rahman Baba Mausoleum
28.3      69.39      Sant Satram Dham, Raharki               <- 1 dp latitude
34.79194  74.19      Sharada Peeth
25.51     69.29      Shrine of Makhdoom Abdul Rahim Girhori
31.565    74.31      Shrine of Mauj Darya Bukhari
34.03     71.628     Shrine of Mian Umar Baba (Chamkani)
28.66     67.35      Shrine of Pir Chhatal Shah Noorani
28.63     67.37      Shrine of Pir Lakha (Aab-e-Shifa)
```

On screen, not inferred:

```
/shrine/mohra-sharif-khanqah                      →  Coordinates: 33.98330, 73.50000
/shrine/sant-satram-dham-raharki-…-devri-sahib    →  Coordinates: 28.30000, 69.39000
/shrine/gurdwara-chakki-sahib                     →  Coordinates: 32.04220, 74.26000
```
Each under a "Copy coordinates" button and a "Get Directions" link into Google Maps. None of the
three carries the word *approximate* anywhere on the page.

`pipeline/audit_coordinates.py --json`, run read-only, returns `{"coarse": 12, "shared": 10,
"missing": 0}` and its docstring already says *"a coordinate typed to two decimals is one nobody
has surveyed."*

**What a reader loses.** A person navigating to Sant Satram Dham is sent to a point that may be
eleven kilometres from the darbar, told to five decimal places, and invited to copy it into
another tool where the padding survives and the doubt does not. Ten *other* entries do carry a
coordinate caveat in their published source notes ("The coordinates are approximate",
"gazetteer-level … village-level accuracy"), so the archive marks coordinate doubt where a source
disagreed and not where its own number is a locality guess. Zero of the coarse twelve overlap
with the ten that are marked.

**Scale.** 12 entries render a padded coordinate; 12 of 12 unmarked; 10 unrelated entries marked,
which is what makes the silence read as a statement.

**Remedy.** Display precision must not exceed recorded precision: format from the raw
`Latitude`/`Longitude` **strings** rather than the parsed float, and derive a one-line "recorded
to about 1 km" note from the decimal count `audit_coordinates.py` already computes. **Lands in
`src/components/shrine/LocationMap.tsx` — another session's lane — and needs one new UI string in
both languages. Hand over.** The data-side half (exposing a per-row precision class) is unowned.

**Confidence:** high. Data, component source, and three rendered pages.

---

### KB4-5 — `/about` tells a reader both "170 entries with a bibliography" and "articles carrying at least one citation — 22 · 13%".

**Measured.** Rendered `/about`, full `innerText`. Section 8, *Citations*:

```
170 entries with a bibliography
103 entries citing three or more sources
1   entry citing nothing
```

Section 16, *How the words were made*, under *"The archive tracks, per entry, how its article was
produced"*:

```
articles carrying at least one citation                       22 · 13%
articles that are AI-researched drafts                       102 · 60%
articles researched from primary sources (OCR of tazkiras)     7 · 4%
```

The second block is `summarizeProvenance()` (`src/lib/data/archiveReport.ts:112`), counting
`data/provenance.json` entries whose `fields.Description.citations` is non-empty. Recomputed
directly: `withCitations 22, aiResearched 102, primarySource 7, tracked 169` → 13 / 60 / 4%,
matching the page. The first block is `buildCoverage()` counting bibliography items parsed from
the Description prose. Both are correct measurements of different things; the string
`reportWithCitations` (`src/lib/i18n/uiStrings.ts:918`) names them the same thing.

**What a reader loses.** The page's whole argument is *"Every number in this section is counted
from the data this page just loaded, so it cannot drift."* A reader who reads it end to end finds
two counts of "entries with citations" differing by 148 and no way to tell which is the archive's
citation coverage — on the one page the project offers as its warrant for being cited.

Two smaller things in the same block: the denominator is `provenance.json`'s **169** while the
page's own headline is **171 sites**, so two entries are silently excluded rather than counted as
untracked; and the tiers `tier2-compendium` (30) and `sheet-original` (30) are shown nowhere, so
the three published rows account for 131 of 169.

**Scale.** One page, two contradictory figures (170 vs 22); 60 of 169 entries whose content tier
is never reported.

**Remedy.** Rename the string — it measures *structured* citations in the provenance store — and
put the row beside the other two content-tier rows with the two missing tiers added, so the four
sum to the tracked total. `src/lib/data/archiveReport.ts` is unowned; `src/lib/i18n/uiStrings*`
is the other session's. Needs an Urdu string. Hand over the string half.

**Confidence:** high on measurement and cause; medium on wording, which is editorial.

---

### KB4-6 — `/about`'s "Coordinates" section reports 8 where the archive's own gate holds 22.

**Measured.** Rendered `/about`:

```
Coordinates
8   entries whose own text says the pin is approximate
```

`coverage.ts:95` — `APPROXIMATE_PIN` is a regex over `Location`, `year_built_note`, `status_note`.
Snapshot: 6 matches. Live (171 rows): 8. Against:

```
$ python3 pipeline/audit_coordinates.py --json
{"counts": {"coarse": 12, "shared": 10, "missing": 0}}
```

Twelve are locality-grade (KB4-4); ten share a point with another row — including Data Darbar and
Darbar Malik Ahmad Ayaz on the identical point while Ayaz's own `Location` reads "Shah Alam
Market". No overlap between the coarse twelve and the prose-disclosed set.

**What a reader loses.** `/about` exists to say *"An archive is only as useful as its account of
its own limits… If a figure here looks low, that is the gap, stated plainly rather than smoothed
over."* Under "Coordinates" it publishes 8 of 171 — 5% — where the archive's own instrument, wired
into `npm run verify` with a written baseline, holds 22. The label is scrupulously worded
("whose own **text** says"), which is precisely why it passes unnoticed.

**Scale.** 8 published against 22 measured; 16 of the 22 need a field survey
(`data/review/coordinate-review-2026-08-30.csv`), so it will not fall on its own.

**Remedy.** Add a row to `buildCoverage()`'s `location` block computed the way
`audit_coordinates.py` computes it — decimal places from the raw strings, plus shared-point
detection. Arithmetic on data the page already holds; no new evidence needed.
`src/lib/data/coverage.ts` is unowned; the copy lands in `uiStrings` (other session) and needs
Urdu.

**Confidence:** high. Both numbers re-derived from the same shipped snapshot.

---

### KB4-7 — The citable data release calls itself "a bilingual (English/Urdu) dataset" and contains no Urdu.

**Measured.** `scripts/data/release.mjs` bundles exactly fifteen files. Arabic-script character
counts across all of them:

```
   bytes   arabic chars  file
 1000355           1192  data/shrines.json
  833533           1192  data/shrines.csv
  174564              0  data/provenance.json
    4425              0  data/datapackage.json
    1964              0  data/shrine-schema.json
  390802            531  data/kg.json
  185968           6969  data/kg-seeds.json
 1213268           1252  data/export/graph.jsonld
 1027300           1252  data/export/graph.ttl
    6240              0  docs/DATA_DICTIONARY.md
   11808             16  docs/KG_VOCABULARY.md
    1339 / 2159 / 1654 / 2491   0  CITATION.cff / codemeta.json / LICENSE / LICENSE-data.md
```
The 1,192 in `shrines.json` are Arabic-script *terms inside English prose*. From the other side:

```
$ grep -o '"@language":"[a-z-]*"' data/export/graph.jsonld | sort | uniq -c     (no output)
$ grep -o '@en\|@ur'              data/export/graph.ttl   | sort | uniq -c     2088 "@en
```
**2,088 RDF literals tagged `@en`; zero tagged `@ur`.**

Not in the bundle:

```
 1017920  433,765 Urdu chars  src/data/urdu-content.json   168 full Urdu articles
   96546   21,872             src/data/urdu-seed.json      the data dictionary
   96950   24,030             src/data/source-notes.json   "Where the source contradicts itself"
   21126    2,145             data/kg-traditions.json      the six-tradition layer
   47763   10,445             src/data/tours.json          8 guided tours
 2119381        —             urdu-i18n/                   dictionary + article source of truth
```

`CITATION.cff` — the file the release exists to be cited by — opens *"A bilingual (English/Urdu),
schema-validated, open dataset of 169 sacred sites across Pakistan"*; `codemeta.json` repeats it;
`/about` says *"The Urdu edition is a first-class edition, not a translation layer."*

**What a reader loses.** A researcher who follows `docs/DATA_RELEASE.md` to a Zenodo DOI, cites
it, and works from the deposit has the English half of a bilingual archive and a citation record
that says otherwise. The 168 Urdu articles are the single largest body of original work in the
repository after the English prose. So are the reader-facing contradiction disclosures and the
tradition layer that justifies the archive's name.

**Scale.** 15 files bundled, 0 carrying Urdu prose; 168 Urdu articles omitted; 2,088 `@en`
literals against 0 `@ur`; 5 named data artefacts omitted.

**Remedy, three separable pieces.**
1. Either add the Urdu artefacts to `DATA_FILES` in `scripts/data/release.mjs`, or amend
   `CITATION.cff` / `codemeta.json` to stop claiming bilingual. Publishing is the better answer
   and is a three-line change; that every Urdu article is an unreviewed draft is already the
   archive's stated position and belongs in the release README, not as a reason to withhold.
   **This one is Rauf's call.**
2. `export-jsonld.mjs` / `export-rdf.mjs` emit `@en` on 2,088 literals with no Urdu path. Adding
   `@ur` where `urdu-seed.json` has a name is mechanical.
3. `dist-data/README.md`, generated inside `release.mjs`, lists **11** files; the bundle copies
   **15** — `kg.json`, `kg-seeds.json`, `graph.jsonld`, `graph.ttl` and `KG_VOCABULARY.md` ship
   undocumented. Same function, same edit.

All in `scripts/data/` and the root metadata files. Not another session's lane.

**Confidence:** high.

---

### ~~KB4-8 — The four columns the archive calls "internal, never displayed" are precached by every visitor, committed to a public repo, and bundled into the citable release.~~ **WITHDRAWN — found independently and written into the tree by another session while this review was running.**

I measured this and wrote it up before checking `git status` again. Re-checked at the end of the
review, the working tree already carries an uncommitted fix:
`scripts/data/validate-publication-safety.mjs` has replaced its false premise with the same
measurement (50,009 characters across 50 of 169 rows; the 925 KB chunk in `dist/sw.js`'s Workbox
precache manifest; the `"9. SENSITIVE — EDITORIAL DECISION NEEDED"` block shipping verbatim), and
`docs/SESSION_RESUME.md` now carries it as a question for Rauf, attributed to this council as
*KB4-1*. `scripts/data/build-location-hygiene-patch.mjs` is corrected too.

Recorded here rather than deleted for two reasons. **The measurement is confirmed twice,
independently, to the character** — which is worth more than either report. And the lesson is the
one this council exists for: I formed a finding against a tree that two other sessions are
committing to, and did not re-read the tree before writing it up. On a shared working directory,
`git status` is a measurement with a timestamp, like everything else here.

The part that is *not* fixed and is still open is the decision itself — publish, strip, or publish
the reviewed bilingual `source-notes.json` instead — and it is correctly parked as Rauf's.

---

## Section 2 — Retractions

Everything checked that turned out fine, and every finding formed and then killed.

### Killed by re-measuring

- **"The source-notes disclosure is missing from `/shrine/darbar-malik-ahmad-ayaz`."** It is on
  line 153 of a 178-line browser dump and I had piped the dump through `head -120`. The exact trap
  `docs/MEASUREMENT_FAILURES.md` §2 names, hit inside a review that quotes it. Every subsequent
  page capture in this review was written to a file and grepped. *(The disclosure genuinely is
  missing on four **other** entries — KB4-2 — and that was found by comparing key sets, not by
  reading a dump.)*
- **"The live sheet has ten columns."** The first `curl` of the published CSV returned a Google
  interstitial HTML page, 7,877 bytes, which `csv.DictReader` parsed into 9 rows × 10 columns
  without error. The real file is 856,607 bytes, 171 × 44, and needs the redirect followed.
- **"`principal_figure` is used to build `/place` figure links and 95 of 171 rows would produce a
  dead `/saint/` URL."** `src/lib/data/placeFigures.ts` records having measured exactly that
  (86 of 169 slugs diverge) and takes identity from the graph index instead. The trap was found
  and closed before I arrived.
- **"Five of the seven figure names Rauf adjudicated on 29 August are not on the pages."** True,
  and deliberate: `data/kg-seeds.json` holds them in `_pending_saintDisplayNames` with a comment
  explaining that the ruling can only be carried out where the formal name exists in Urdu, and
  check 9 of `validate-kg-identity.mjs` enforces it. A pending block that names itself pending is
  not an unpublished verdict.
- **"`MAX_INFOBOX_ROWS = 8` silently truncates the infobox."** After the filters, the 44-column
  dataset can offer the generic row loop at most four keys. The cap is never reached.
- **"Markdown asterisks leak into infobox values at scale."** They do leak — `Events` renders
  `*ʿurs*, annually on 12, 13 and 14 Zil Hajj` verbatim — but only **4 rows of 171** carry an
  asterisk in any infobox-rendered field, and **2 of the 4 are the already-known unpublished
  entries**. Two visible entries is not a finding; recorded here so nobody re-derives it.

### Checked and fine

- **`shrine_entries/` is not unpublished work.** All 37 book-derived draft Descriptions checked
  against the live sheet with three 70-character probes each after normalising markup, quotes and
  dashes: **37 of 37 matched, 0 missing.**
- **`entries/web-research-2026-08/`** — 40 targets, 23 STRONG / 15 PARTIAL / 2 NOTHING RELIABLE
  by its own `SUMMARY.md`, folded into `data/patch_web_research.csv` and merged. The 52 `qa_note`
  values in the live sheet are that pass's conflicts, so it reached production.
- **`qa_note` has a reader-facing surface, and it is complete at the entry level.** All **50 of 50**
  entries carrying a `qa_note` have published notes in `source-notes.json`; none has zero. The
  condensation is lossy at the item level (Darbar Malik Ahmad Ayaz: 14 numbered internal items →
  7 published; 50,009 characters of `qa_note` → 29,672 of published note) but the published items
  are faithful restatements, and judging which internal items deserve a reader is editorial work
  I should not second-guess. Recorded, not reported.
- **The knowledge graph's fields reach pages.** Every non-empty `KGSaint` / `KGOrder` / `KGEvent`
  property was traced to a component: `disputedDates` (11) → `SaintPage`, `titles` (98) →
  `SaintPage`/`AboutPage`/`ReviewPage`, `altNames` (117) → `SaintPage`/`OrderPage`/`LineageView`,
  `datePrecision`/`biographySource`/`biographyReviewed` (104 each) → `figurePrecision.ts` /
  `figureProvenance.ts`, `frequency` (85) → `RecordedObservanceList`, `arabicName`,
  `wikidataQid`, `retiredSlugs`. **`kinNotes` (12) surfaces on `/saint/:slug` under "Recorded, and
  unnamed".** The A4 audit of 27 August did its job and the gaps it found have been closed or
  escalated with a status.
- **`/about`'s "51 entries with no photograph"** is the archive's own known-imprecise number —
  CLAUDE.md already records that the honest figure is 54 once dead image URLs are counted, and
  that "`/about` cannot see the difference". Not re-reported.
- **`/about`'s Urdu block is the most honest thing on the site**: *"entries with a full Urdu
  article 168 · 98% / of them read and signed off by a human reader 0 · 0%"*. Verified against
  `src/data/urdu-content.json` (168 keys with `descriptionUr`).
- **The almanac's coverage arithmetic adds up.** 23+10+6+80+52 = 171 exactly. The defect in KB4-1
  is the classification, not the sums.
- **`ShrineObservances` does not assert absence.** An entry with no parsed observance renders no
  section at all, which is silence rather than a false claim — the same choice the gallery makes
  for the 51 photograph-less entries.
- **`data/review/coordinate-review-2026-08-30.csv`** carries no unapplied verdicts: `verdict` is
  empty on all 24 rows, 15 recommendations read "NO SOURCE FOUND — needs a field survey", and
  `pipeline/audit_coordinates.py` holds the baseline meanwhile. Nothing adjudicated is sitting
  unapplied.
- **`data/review/kg-review.csv`** — 285 rows, `verdict` and `reviewer_note` empty on all 285. A
  queue, not a backlog of ignored rulings.
- **`data/review/figure-identity-review.csv`** — 13 rows carry a verdict and 16 a
  `reviewer_note` signed *"Rauf, 29 Aug 2026"*. Traced each: the Kali / Kalka Devi split **is**
  applied (`kalka-devi` exists in `kg.json`, Kali keeps 2 sites), the three "unsure" rows were
  correctly left alone, and the seven "custom" rows are the `_pending_saintDisplayNames` case
  above. Nothing was quietly dropped.
- **`docs/EDITORIAL_DECISIONS_PENDING.md` §6's five rulings of 22 August** are all either shipped
  (the reader-facing source-notes disclosure; attribute-everything) or tracked as an awaiting-import
  patch (`silsila_note`) or in the known unpublished-entries item (show the two unmapped rows).

### One small thing, filed rather than reported

`_comment_saintDisplayNames` in `data/kg-seeds.json` and the `reviewer_note` in
`figure-identity-review.csv` both still say `pir-abdul-ul-karim` "was deliberately held out of
this ruling and [is] back in the worksheet unanswered". It is in the applied `saintDisplayNames`
map, correctly and for a different and better reason, adjudicated in commit `6aab182`. The
decision is sound; two artefacts describing it are now stale, which is
`docs/MEASUREMENT_FAILURES.md` kind 1 sitting in wait. One sentence in each.
