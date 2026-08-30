# KB-2 — The knowledge graph: what it asserts, what it omits, where it is wrong

*Read-only review, 30 August 2026, against the working tree at commit `9c4eeb3` plus another
session's uncommitted front-end edits. Nothing was written into the repository. Every number
below was re-derived from `data/kg.json`, `data/shrines.json`, `data/export/` and the exporters
themselves; no count is quoted from a document.*

Shape re-derived, and it matches the brief: 244 figures (134 with a site, 110 lineage-only),
9 orders, 94 places, 149 events, 725 relations, 12 kinNotes, 19 retired slugs. Relations by type:
`buried_at` 172 · `located_in` 169 · `commemorated_by` 149 · `disciple_of` 70 · `belongs_to_order`
67 · `kin_of` 67 · `successor_of` 29 · `descendant_in_lineage_of` 2.

---

## Section 1 — Findings

### KB2-1 — Thirteen of the graph's 67 order memberships never reach the data release, and they are exactly the compound silsilas the archive went to the trouble of recording

**Measured:**

```
$ node -e "…kg.relations.filter(r=>r.type==='belongs_to_order')…"
belongs_to_order edges: 67
distinct subjects: 54
subjects with >1 order: 11   extra edges: 13
   shams-ali-qalandar -> qalandariyya, qadiriyya
   qalandar-baba-auliya -> qalandariyya, azeemia
   shah-inayat-qadiri -> shattari, qadiriyya
   pir-syed-muhammad-rashid-shah-roze-dhani -> rashidi, qadiriyya, naqshbandiyya
   hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami -> chishtiyya, qadiriyya
   hazrat-tahir-bandagi-qadri -> qadiriyya, naqshbandiyya
   hazrat-wasif-ali-wasif-awan -> chishtiyya, qadiriyya
   abul-faiz-qalander-ali-suharwardi -> suhrawardiyya, qadiriyya
   hazrat-baba-shah-kamal -> qadiriyya, suhrawardiyya
   pir-sher-muhammad -> qadiriyya, chishtiyya
   syed-shah-jamal-uddin-naqvi-bukhari -> suhrawardiyya, qadiriyya, chishtiyya

$ grep -o "schema:memberOf" data/export/graph.ttl | wc -l
54
$ node -e "…count memberOf values in graph.jsonld…"
memberOf 54
```

Both exporters are current — `node scripts/data/export-jsonld.mjs --check` and
`export-rdf.mjs --check` both exit 0 — so this is not staleness. The mechanism is one line in
each file:

```
scripts/data/export-jsonld.mjs:154:  const orderRel = (relBySubject.get(s.id) ?? []).find((r) => r.type === 'belongs_to_order');
scripts/data/export-rdf.mjs:178:   const orderRel  = (relBySubject.get(s.id) ?? []).find((r) => r.type === 'belongs_to_order');
```

`.find()` — first match, rest discarded. Confirmed in the shipped TTL:

```
saint:syed-shah-jamal-uddin-naqvi-bukhari
  …
  schema:memberOf order_:suhrawardiyya ;      ← graph holds three
saint:pir-sher-muhammad
  …
  schema:memberOf order_:qadiriyya ;          ← graph holds two
```

**What a reader loses:** nothing on the site — `getOrderMemberships` in `src/lib/kg.ts` returns
all of them, and its docstring explicitly exists to say so ("a compound silsila ('Qadri
Shattari') legitimately yields more than one"). The loss is in `data/export/graph.jsonld` and
`graph.ttl`, both shipped by `scripts/data/release.mjs`. A scholar who downloads the release and
asks "which figures joined the Qadiri and Chishti ways" gets Pir Sher Muhammad as a plain Qadiri,
and the sentence the archive read that edge out of — *"whose teaching joined the Qadiri and
Chishti ways"* — is unrepresented. `/order/chishtiyya` on the site lists him; the release does
not.

**Scale:** 13 of 67 memberships (19%), across 11 figures, missing from both export formats.

**Remedy:** `scripts/data/export-jsonld.mjs` line 154 and `scripts/data/export-rdf.mjs` line 178
— `.filter()` instead of `.find()`, emit an array (JSON-LD) / repeated `schema:memberOf`
statements (TTL), then `npm run data:export`. `schema:memberOf` is already multi-valued in
schema.org, so no vocabulary change is needed. **And the invariant belongs with it.**
`src/lib/data/__tests__/kinExportCoverage.test.ts` already asserts *one triple per kin edge*
("The count is derived rather than pinned, so adding a kin edge does not fail this test — only
adding an edge that does not come out the far end does"). That is precisely the check
`belongs_to_order` lacks. `scripts/data/lib/relationExport.mjs` generalised the lesson to the
*type* level and stopped there; the per-edge half is what catches this. An agent can do all of
it — no evidence and no editorial judgement is involved.

**Confidence:** high.

---

### KB2-2 — The graph's place layer is a second, unguarded place vocabulary built by a parser the archive already documented as broken: 103 of 169 sites are `containedInPlace` something that is not a place, and Lahore is split fourteen ways

**Measured:**

```
$ node …/places2.mjs
shrines whose graph place is NOT in the site's closed vocabulary: 103 of 169
shrines whose graph place IS in the vocabulary but is not one the site derives: 0
shrines where the two agree: 66

$ node …/lahore.mjs
sites the closed vocabulary places in Lahore: 35
sites the graph places in place:lahore: 13

$ node …/lahore2.mjs   # the 35 Lahore sites, by the place node the graph gives them
   13  lahore
    9  punjab
    2  anarkali
    1  district
    1  lahore-the-field-survey-itself-locates-the-shrine-only-as-lahore-its-one-detail
    1  lahore-per-the-field-survey
    1  lahore-the-survey-gives-no-street-address
    1  walled-city        1  near-barki        1  mozang
    1  inside-bhati-gate  1  lahore-district   1  old-anarkali   1  queens-road
```

Nine of the 94 place nodes have a `province` that is not one of Pakistan's seven administrative
units, and six of those are prose:

```
slug: district        province: "not the shrine's exact position) — ask Saifullah for a precise pin when possible."   shrines: 2
slug: lahore          province: "and no coordinates."                                                                 shrines: 13
slug: lahore-per-the-field-survey
                      province: "and no position within the graveyard's roughly 475 kanals beyond \"alongside the mosque\"…"
slug: road-asha-pura  province: "Road، Asha Pura"   (an Arabic comma, U+060C)
slug: kpk             province: "KPK"               (a second spelling of Khyber Pakhtunkhwa)
slug: nankana-sahib   province: "Nankana Sahib"     (a district)
```

They are in both shipped formats verbatim:

```
data/export/graph.ttl:2053  place:lahore
                     2059    schema:addressRegion   "and no coordinates."@en ;
data/export/graph.ttl:2020  place:district
                     2026    schema:addressRegion   "not the shrine's exact position) — ask Saifullah…"@en ;
data/export/graph.jsonld:3064  "@id": ".../data/place/district", "name": "district"
```

The cause is `parseLocation` in `scripts/data/build-kg.mjs:69` — split `Location` on commas,
take `parts[1]` as the district and the last part as the province. `src/lib/data/places.ts`
opens by documenting that this exact technique does not survive this data ("the last
comma-separated segment is 'Pakistan' for 124 rows and a province for 35, and six rows carry a
paragraph of survey qualification instead of an address") and replaces it with a closed
66-entry vocabulary. That vocabulary is mirrored into `scripts/data/lib/places.mjs` under a
drift guard (`src/lib/data/__tests__/placesVocabSync.test.ts`). `build-kg.mjs` was never moved
onto it. The two vocabularies share **30 slugs of 94**.

**What a reader loses:** `/about` prints "94 places" — `src/pages/AboutPage.tsx:13` imports
`data/kg-stats.json`, line 301 renders `<Stat value={graph.places} …>`, and `kg-stats.json` says
`"places": 94`. That figure is the count of comma-fragments, not of places, on the page whose
whole design principle is that a computed number cannot go stale the way a note can. Outside
the site, anyone consuming the release reads that nine of Pakistan's places are called
"district", "and no coordinates.", "Road، Asha Pura", and that Darbar Sakhi Shah Chan Charagh
is contained in a place called Punjab while Data Darbar is contained in one called Lahore.

**Scale:** 9 of 94 place nodes are not places; 103 of 169 `containedInPlace` triples point at a
node outside the archive's own place vocabulary; Lahore's 35 sites are scattered across 14
nodes, the largest holding 13.

**Remedy:** build `kg.places` from `PLACE_VOCABULARY`/`placesForLocation` in
`scripts/data/lib/places.mjs` — the module the front end and the scripts already share — instead
of `parseLocation`, in `scripts/data/build-kg.mjs` (place construction at ~line 862, and the
duplicate call at ~line 972). Two consequences must be decided rather than assumed, and both are
already argued in `places.ts`: a site can legitimately match more than one place (12 rows do),
so `located_in` becomes many-to-one → many-to-many; and one row is genuinely unplaced. Extend
`placesVocabSync.test.ts`, or add a sibling, to assert **every `kg.places` slug is in
`PLACE_VOCABULARY`** — that is the check whose absence let three vocabularies exist. An agent
can do the mechanical part; the one-to-many decision and the changed `/about` count should be
shown to Rauf before it ships, because the published figure moves from 94 to roughly 66.

**Confidence:** high on the measurement; medium on the exact remedy shape, because the
one-to-many change touches `getPlaceForShrine` and the release schema. What would raise it: a
decision from Rauf on whether `located_in` may be multi-valued.

---

### KB2-3 — The graph says Shiva is buried at Katas Raj

**Measured:**

```
$ node …/buried.mjs
buried_at edges by site category:
  { 'Muslim Shrine': 79, 'Hindu Temple': 36, 'Sikh Gurdwara': 36,
    'Nanakpanthi / Udasi Darbar': 14, 'Jain Temple': 3, 'Secular / Memorial': 3, Islam: 1 }
buried_at edges by figureType:
  { 'Sufi saint': 70, Deity: 34, 'Sikh Guru': 29, Sant: 16, 'Historical person': 11, … }
buried_at edges whose subject is a Deity: 34
    shiva | katas-raj-temples | Hindu Temple
    lord-krishna | krishna-mandir-kabari-bazar | Hindu Temple
    jain-tirthankaras | jain-mandir-lahore | Jain Temple
    goddess-sharada | sharada-peeth | Hindu Temple
    varuna | shri-varun-dev-mandir | Hindu Temple      … (34 total)
```

`docs/KG_VOCABULARY.md` defines the term this relation carries: *"`sufi:buriedAt` — Sub-property
of `schema:location`; the dargah or mazar where the saint is interred."* Thirty-four of these
subjects are typed `Deity` by the graph itself, and twenty-nine more are Sikh Gurus at gurdwaras
that mark a visit (`guru-nanak buried_at gurdwara-rori-sahib`).

**What a reader loses:** nothing on the site. There is no UI string containing "buried" or
"interred" (`grep -n "buried\|interred" src/lib/i18n/uiStrings.ts` → no matches), and
`getSaintsForShrine` reads the edge as "the saint(s) commemorated at a shrine". Both exporters
turn it into `schema:about` on the shrine node, and `sufi:buriedAt` — declared in both the TTL
vocabulary block and the JSON-LD `@context` — is emitted **zero** times. The loss is to a
release consumer: `scripts/data/release.mjs:30` ships `data/kg.json` itself, in which the
relation is literally `{"type":"buried_at","subject":"saint:shiva","object":"katas-raj-temples"}`.
For an archive whose distinguishing claim is that it says exactly what it knows, asserting
interment of a deity is the kind of error that costs more than it looks like.

**Scale:** 172 `buried_at` edges, of which **93 are at non-Muslim sites** and **34 name a
figure the graph itself types `Deity`**. Zero of the 172 are exported under the interment
predicate, so the damage is confined to `data/kg.json` and to the vocabulary doc.

**Remedy:** rename the relation to something the whole set can carry — `commemorated_at` is what
`src/lib/kg.ts` already calls it in prose — in `scripts/data/build-kg.mjs`, `src/types/kg.ts`,
`src/lib/kg.ts`, `scripts/data/lib/relationExport.mjs`, and `docs/KG_VOCABULARY.md`. **This is
not free and should not be done casually:** `relationId()` in `src/lib/kg.ts` composes
`type:subject:object` and `data/kg-sources.json` is keyed on those strings, so a rename rewrites
172 source keys and `kgRelationIds.test.ts` must move with it. The cheaper alternative, and
probably the right first step, is to keep the type and delete `sufi:buriedAt` from
`docs/KG_VOCABULARY.md` and both exporters' vocabulary blocks, since it is declared and never
used — then decide the rename deliberately. Either way it is a naming decision with a
published-artefact cost, so it wants Rauf's sign-off, not an agent's.

**Confidence:** high that the edges exist and that the term means interment; medium on severity,
because the exports do not carry the word — which is why it is ranked third and not first.

---

### KB2-4 — One figure on `/graph` is a bare name with no explanation, and the test written to prevent exactly that checks the data instead of the page

**Measured:**

```
$ node -e "…simulate GraphPage's roster expression over kg.json…"
lineage-only figures the /graph roster can say NOTHING about: 1
   sant-harnam-das | ["descendant_in_lineage_of"]
lineage-only figures whose roster note comes from the kin branch: 39 (the code comment says 8)
```

`src/pages/GraphPage.tsx:300` computes the row's note from three sources and no more:

```js
const disciples = people(getDisciplesOf(saint.slug));
const teachers  = disciples.length > 0 ? [] : people(getTeachersOf(saint.slug));
const kin       = disciples.length + teachers.length > 0 ? [] : getKinOf(saint.slug);
```

and lines 707/720 render a note only when `disciples[0] || teachers[0]` or `kin[0]`.
`getDescentsOf` is imported in `SaintPage` and in the test file — never in `GraphPage`.

`src/lib/__tests__/lineageOnlyFigures.test.ts` computes a `descentOnly` population and asserts it
is non-empty, under this comment:

> *"The sum is the real assertion: a figure in NONE of the four is one the explorer would list
> with a blank note, and adding a relation type without a matching note is exactly how that
> happens."*

The test passes. It asserts the *graph* has four populations; the *page* has three notes.

**What a reader loses:** on `/graph`, under "Named in a lineage, not documented here", 109 rows
read "teacher of X" / "disciple of X" / "father of X" and one reads "Sant Harnam Das" and
nothing else. The archive holds the answer and it is good: `descendant_in_lineage_of` →
`baba-bankhandi-maharaj`, `generations: 8`, quote *"built under an eighth successor in the
lineage, Sant Harnam Das"*, source `data/shrines.csv#sadh-belo-sadh-belo-island-temple`.
`/saint/sant-harnam-das` renders it (SaintPage:847). The index page that exists to give these
figures a way in is the one place it is missing.

**Scale:** 1 of 110 rows today. The number is small and the mechanism is not: this is the second
relation type to reach the graph and not the roster, and the type before it (`kin_of`) took 39
rows with it — the code comment beside the kin branch still says "the eight who are in no chain
at all", and it is 39.

**Remedy:** `src/pages/GraphPage.tsx` — add `getDescentsOf` as a fourth fallback beside the kin
branch, with a `graphLineageOnlyDescent*` string pair in `src/lib/i18n/uiStrings.ts` (Urdu
included; the row already carries `data-latin`). Then move the guard to the side that failed:
`lineageOnlyFigures.test.ts` should assert the **rendered note**, not the population sum — the
cheapest form is to export the note-building function from `GraphPage` (`lineageOnlyNote` /
`kinOnlyNote` are already module-scope) and assert it returns a non-empty string for every one
of the 110. Fully agent-doable; no evidence needed. While in the file, correct the two stale
comments ("eight" → 39, "~60"/"the other 60" → 110 in `src/lib/kg.ts`).

**Confidence:** high.

---

### KB2-5 — Two figure nodes share three identical names and the identity check cannot see any of them, because it reads `name` and not `altNames`

**Measured:**

```
$ node scripts/data/validate-kg-identity.mjs
[kg-identity] 244 figure nodes, 0 name collision(s)
[kg-identity] ✓ figure identity is consistent          (exit 0)

$ node …/alt.mjs   # same saintNameKey(), applied to names AND altNames
cross-node name/altName key collisions: 5

KEY "bhai gurdas singh"  [NOT recorded in saintDoNotMerge]
    bhai-gurdas-singh (name: "Bhai Gurdas Singh")
    bhai-gurdas       (alt:  "Bhai Gurdas Singh")
KEY "kanhiya lal"        [NOT recorded]
    bhai-gurdas-singh (alt: "Kanhiya Lal")     bhai-gurdas (alt: "Kanhiya Lal")
KEY "bhai kanya lal"     [NOT recorded]
    bhai-gurdas-singh (alt: "Bhai Kanya Lal")  bhai-gurdas (alt: "Bhai Kanya Lal")
KEY "jhulelal"           [NOT recorded]
    jhulelal    (name: "Jhulelal")             sheikh-tahir (alt: "Jhulelal")
KEY "zinda pir"          [NOT recorded]
    khwaja-muhammad-qasim (alt ×2)             jhulelal (alt: "Zinda Pir")
```

`findNameKeyCollisions` in `scripts/data/lib/saintIdentity.mjs` iterates `node.name` only. Its
own docstring states the rule it enforces: *"`saintNameKey` is the join that closes that split …
It is an identical-name test"* and *"Identical names are the one signal this project accepts as
proof of the same person"*. An `altName` is a name; the check does not read them.

The two nodes are otherwise near-identical:

```
bhai-gurdas        Sant · titles ["Bhai","a Khalsa saint"] · disciple_of guru-gobind-singh
                   · shrine sevapanthi-darbar-bhai-gurdas-gandava (Balochistan)
bhai-gurdas-singh  Sant · titles ["Bhai"]                 · disciple_of guru-gobind-singh
                   · shrine khatwari-darbar-shikarpur (Sindh)
```

I am **not** asserting they are one person, and RULE 2 forbids me deciding it from general
knowledge. Both retired slugs (`bhai-gurdas-veneration-of-guru-nanak`,
`bhai-gurdas-singh-disciple-of-guru-gobind-singh`) show these came out of composite cells, which
is exactly the process that produced the archive's known splits *and* its known false merges.
What is measurable is that the archive's own evidence rule fires here on three names, `data/
kg-seeds.json#saintDoNotMerge` (14 entries) records no decision either way, and the gate reports
zero.

**What a reader loses:** either two pages that are one man, or — the more likely reading given
`docs/KG_REVIEW_WORKFLOW.md`'s warning that 19 of 21 name-similarity merges here were wrong —
two correct pages each carrying the other's names in its "also known as" list, so a reader at
`/saint/bhai-gurdas` sees "Bhai Gurdas Singh" listed as an alias and has no way to learn that a
different figure holds that as a title. Same shape for `/saint/jhulelal` and
`/saint/sheikh-tahir`: `Jhulelal` is one's name and the other's alias, both typed `Deity`, three
sites between them, no relation and no note connecting them — and this pair is precisely the
kind of cross-tradition identification `/shared-ground` exists to surface.

**Scale:** 5 name keys shared across 6 nodes; 3 of the 5 join one pair. Zero recorded decisions.
The gate reports 0 collisions.

**Remedy, in two parts.** The check is an agent's job and should be done now: extend
`findNameKeyCollisions` in `scripts/data/lib/saintIdentity.mjs` to a second, clearly separate
pass over `[name, ...altNames]`, reported as a *warning list* rather than a hard fail — the
existing `name`-vs-`name` fail must stay hard, but an `altName` overlap is weaker evidence and
should not be able to block a build. `validate-kg-identity.mjs` then prints the pairs. **The
verdicts are not an agent's job**: each pair needs a byte-exact corpus quote and a human ruling
into `saintMergeVariants` or `saintDoNotMerge`, and `docs/KG_REVIEW_WORKFLOW.md` already
explains why an agent guessing here deletes the relation that made the pair worth recording.
Two smaller fixes are safe now: `khwaja-muhammad-qasim` carries `"Zinda Pir"` twice, once with
literal quote marks (`["\"Zinda Pir\"", "Zinda Pir"]`), and so does
`hazrat-meeran-muhammad-shah-bukhari` (`"\"Mauj Darya\""` beside `"Mauj Darya"`) — both render
the alias twice on the figure page.

**Confidence:** high that the check has this blind spot and that the five collisions exist;
deliberately no confidence offered on whether any pair is one person.

---

### KB2-6 — `altNames` is carrying three different kinds of content and only one of them is a name, and it is the field that feeds the subtitle, the search index and the Urdu name translator

**Measured:**

```
$ node …/altnames.mjs      # 244 figures, 236 altName strings
altName strings that read as a DESCRIPTION not an alias: 13
altName strings containing a quote character:             8
figures with a duplicate altName (after key-normalising):  2

$ node -e "…altNames[0] only…"
figures whose altNames[0] (the subtitle shown in lineage/order/related lists) is not a clean alias: 13
   pir-syed-muhammad-rashid-shah-roze-dhani | "founder of the Rashidi order"
   bhai-gurdas                              | "Sevapanthi tradition"
   sikh-women-and-children-martyrs          | "18th century, Mir Mannu era"
   guru-granth-sahib-sikh-community         | "Singh Sabha congregation; city assoc. w/ Guru Nanak per Tilganji tradition"
   akhund-darweza-baba                      | "Syed Muhammad, d. 1638"
   malik-ahmad-ayaz                         | "also given as \"Malik Ayaz Ahmad\" and \"Malik Ayaz\""
   hazrat-wasif-ali-wasif-awan              | "born Muhammad Wasif Awan; \"Wasif\" was his pen name/takhallus"
   khwaja-muhammad-qasim                    | "\"Zinda Pir\""
   hazrat-meeran-muhammad-shah-bukhari      | "\"Mauj Darya\""
   syed-abdul-razzaq                        | "\"Shah Chiragh\""
   sultan-bahoo                             | "Bahu (\"with Hoo\")"
   hazrat-syed-muhammad-khair-ul-deen       | "Hazrat Syed Muhammad Khair ul Deen, known as Shah Abul Muali Qadri"
   lava                                     | "Lava (Luv), son of Rama and Sita"
```

(One of the 13, `abul-faiz-qalander-ali-suharwardi`'s "Sayyid Abul Faiz Qalandar Ali Gilani
Suhrawardi", is a false positive from my word-count heuristic — a real alias. Twelve stand.)

`docs/KG_VOCABULARY.md` already knows: *"Several parentheticals are descriptive text rather than
a clean alternate name … cleaning that up properly needs per-entry classification of 'alias vs.
description,' which is future work, not a correctness issue."* It is now more than cosmetic
because three consumers were added after that note:

- `src/components/kg/LineageView.tsx:128`, `src/pages/OrderPage.tsx:623` and
  `src/pages/SaintPage.tsx:1046` all print `altNames[0]` as the row subtitle.
- `src/lib/data/figureSearch.ts:31` folds every `altName` into the search haystack.
- `src/lib/i18n/localizeKgName.ts:51` — `translateNameToUrdu(saint.name, saint.altNames ?? [])`
  — feeds them to the Urdu **name** translator.

**What a reader loses:** on `/order/rashidi`, the member row for Pir Syed Muhammad Rashid Shah
reads *"founder of the Rashidi order"* where every other order page prints a person's other
name; on `/order/naqshbandiyya`, Khwaja Muhammad Qasim reads `"Zinda Pir"` with the quotation
marks in the text. `guru-granth-sahib-sikh-community` offers an Urdu name translator the string
*"Singh Sabha congregation; city assoc. w/ Guru Nanak per Tilganji tradition"*.

**Scale:** 12 of 244 figures have a non-name in the surfaced first slot; 13 descriptive and 8
quote-wrapped strings among 236 altNames; 2 figures list the same alias twice.

**Remedy:** the strings come from the sheet's own `principal_figure` parentheticals, so per
RULE 3 the fix is a CSV patch under `data/` for a human to import, plus splitting the parsed
parenthetical in `scripts/data/build-kg.mjs` into `altNames` (a name) and a new descriptive
field or `titles` (everything else). The stripped-quote cases (`"\"Zinda Pir\""` →
`"Zinda Pir"`, and the two exact duplicates) are unambiguous and an agent can normalise them in
the builder. The alias/description classification is per-entry editorial judgement and needs
Rauf — the archive's own doc says so, and "18th century, Mir Mannu era" is a real recorded fact
that must land somewhere rather than be deleted.

**Confidence:** high on the strings and the render sites; medium on where each string should go,
which is the part that needs a person.

---

### KB2-7 — `docs/KG_VOCABULARY.md` documents a graph the archive no longer has, and the TTL's own ontology block declares three terms it never uses while using three it never declares

**Measured:**

| the doc says | measured today |
|---|---|
| "The graph carries **43 family ties** (30 August 2026)" | **67** `kin_of` edges |
| "43 edges become **46 triples** in both formats" | 67 edges → **73** triples (`8 sibling + 4 spouse + 41 parent + 6 grandsonOf + 5 nephewOf + 2 sonInLawOf + 7 descendantOf`, counted in `graph.ttl`) |
| "Thirteen pairs are recorded as *both* — a teacher who is also a father" | **15** |
| `kinType` closed vocabulary: 7 types | **8** — `spouse_of` is in the graph (2 edges) and in `KIN_EXPORT_PREDICATE`, not in the doc |
| Properties table: `silsila`, `buriedAt`, `commemorates`, `discipleOf`, `successorOf`, `kinOf` | `descendant_in_lineage_of` / `sufi:descendantInLineageOf` (2 edges, exported, in `RELATION_EXPORT`) appears nowhere in the file |
| "`guru-nanak-and-bhai-mardana` … Bhai Mardana isn't a separate saint entity yet" | `saint:bhai-mardana` exists; the composite slug is a retired redirect |

And the shipped ontology block disagrees with the shipped data in both directions:

```
$ awk 'NR>25' data/export/graph.ttl | grep -o "sufi:[A-Za-z]*" | sort | uniq -c
  70 sufi:discipleOf        ← used, never declared
  29 sufi:successorOf       ← used, never declared
   2 sufi:descendantInLineageOf   ← used, never declared
   7 sufi:descendantOf   6 sufi:grandsonOf   5 sufi:nephewOf   2 sufi:sonInLawOf
$ sed -n 13,25p data/export/graph.ttl | grep -o "^sufi:[A-Za-z]*"
  sufi:buriedAt sufi:commemorates sufi:silsila     ← declared, used ZERO times
  sufi:descendantOf sufi:grandsonOf sufi:nephewOf sufi:sonInLawOf sufi:SufiOrder sufi:UrsEvent
```

**What a reader loses:** an outside consumer resolving `sufi:discipleOf` — the archive's core
predicate, 70 triples, the single most important custom term it ships — finds no `rdfs:label`
and no `rdfs:subPropertyOf` in the ontology the release itself carries, while three terms that
appear in the vocabulary block and in the documentation describe relations the export does not
contain. Inside the project, the file `docs/KG_VOCABULARY.md` is the contract a next session
reads before touching the graph, and it is understating the kinship layer by 24 edges and
omitting a whole relation type. This is `docs/MEASUREMENT_FAILURES.md` kind 1 — a stale source
read as current — in the document that defines the vocabulary.

**Scale:** 7 stated facts wrong or missing in one file; 3 predicates used and undeclared (101
triples); 3 declared and unused.

**Remedy:** `docs/KG_VOCABULARY.md` — re-derive every number rather than editing the ones I
listed, add `descendant_in_lineage_of` and `spouse_of`, and strike the resolved
`guru-nanak-and-bhai-mardana` note. In `scripts/data/export-rdf.mjs`, add the three missing
`rdfs:label` / `rdfs:subPropertyOf` declarations and remove or start using `sufi:buriedAt`,
`sufi:commemorates`, `sufi:silsila` (same for the JSON-LD `@context` in `export-jsonld.mjs`,
which defines `buriedAt`, `commemorates` and `silsila` and emits none of them). Then the
invariant the file's own "Extending the vocabulary" section asks for by hand:
**assert that the set of `sufi:` terms declared equals the set emitted** — a dozen lines beside
`assertRelationTypesKnown` in `scripts/data/lib/relationExport.mjs`, and the thing that would
have caught `descendantInLineageOf` on the day it shipped. All agent-doable.

**Confidence:** high.

---

### KB2-8 — The two corpus scanners read one of the archive's two prose corpora, so "the reading piles are worked out" is true of `data/shrines.json` and unmeasured for the 49 markdown files that 17 relations cite as their source

**Measured.** `loadCorpus()` in `scripts/data/lib/sentenceScan.mjs:35` reads
`data/shrines.json` and nothing else. Meanwhile:

```
$ node -e "…relations by source prefix…"
{ 'data/shrines.csv': 194, entries: 11, shrine_entries: 6 }   (514 relations carry no source)
$ ls shrine_entries/*.md | wc -l   → 39      $ ls entries/*.md | wc -l → 9
```

Re-running the scanners' own machinery over those 48 files with the same word lists, edge sets
and rejection sets, then removing every sentence that also appears verbatim in the sheet prose:

```
kin:     39 unread; 13 also in the sheet prose; 26 exist ONLY in the markdown corpus
lineage: 29 unread; 10 also in the sheet prose; 19 exist ONLY in the markdown corpus
```

**I then read all 45 and the yield is one.** Every other one is already an edge, a `kinNote`, or
names nobody: Makhdoom Jahaniyan `grandson_of` Jalaluddin Surkh-Posh (edge exists), Ghulam
Farid's unnamed brother (`kinNotes[0]`, verbatim), Haji Tufail's succession (edge exists),
Mian Fazal Deen (two edges), Syed Ul Hassan Kabeer (edge), Dawood Bandgi as both uncle and
father-in-law (two edges, one quote). The single candidate:

> `entries/survey_abul_muali_qadri.md` — *"the Mughal emperor Dara Shikoh writes that he once
> went with Hazrat Shah Abul Muali to the court of **his teacher Sheikh Imam Niyamat Ali**"*

`Sheikh Imam Niyamat Ali` is in no node of the graph (`grep` over `kg.json` → none), and *"his"*
is ambiguous between Dara Shikoh and Shah Abul Muali, both of whom are figures. That ambiguity
is precisely why an agent must not draw it.

**What a reader loses:** essentially nothing today — which is the finding. What is at risk is
the *claim*: `MEMORY.md` records "both corpus piles exhausted 31 Aug", HANDOVER §9.181 tabulates
the two piles, and neither says the scan covers one corpus. The next entry drafted into
`entries/` before it reaches the sheet — which is how Shah Gohar Peer and Mian Qurban Ali Shah
both arrived — enters a corpus no instrument sweeps.

**Scale:** 48 files, 226 kin/lineage sentences, 45 of them not present in the scanned corpus,
1 candidate edge, 0 unambiguous ones.

**Remedy:** `scripts/data/lib/sentenceScan.mjs` — give `loadCorpus()` a second source that reads
`shrine_entries/*.md` and `entries/*.md` as pseudo-rows (`{ Name: path, Description: text }`);
`rowText`'s bibliography cut and URL-column cut both already work on them, and `rowSubjects`
should be left empty for a file with no shrine slug, which makes the scan strictly more
conservative. The count line then reports both corpora separately, so "worked out" can be said
about a named scope. Fully agent-doable. The one Niyamat Ali sentence should go to
`kg-lineage-proposals.json#rejected` **or** to a human — not to an edge.

**Confidence:** high on the scope gap; high on the yield, because I read the whole residual list
rather than sampling it.

---

## Section 2 — Retractions

Everything below I checked and found sound, or believed and then killed.

**Killed by re-measuring**

1. **"The exports are an hour stale."** `data/export/*` are stamped 14:43 and `data/kg.json`
   15:39, and I formed the memberOf finding expecting staleness to be the cause.
   `node scripts/data/export-jsonld.mjs --check` → *"OK — matches the graph (1129 nodes)"* and
   `export-rdf.mjs --check` → *"OK — ~9392 statements"*, both exit 0. The exports are current;
   the mtime gap is the export step running before the last `build-kg`. The 13 lost memberships
   are a live bug, not a stale file — which is a worse answer and a different remedy.

2. **"The JSON-LD `@context` omits `discipleOf`, so a conformant processor silently drops 101
   relations."** It omits the *alias*, but the exporter emits the prefixed form
   `"sufi:discipleOf"` and `"sufi": "https://…/vocab#"` **is** in the context, so the term
   expands correctly. I had checked the context and not the emitted keys — a narrower query than
   the question. The TTL half survives (KB2-7) because there the issue is a missing `rdfs:label`,
   not a lost triple.

3. **"Ten rows state an order in prose that the graph does not carry."** A keyword sweep of every
   Description for the nine order names found 10 rows whose figures have no `belongs_to_order`
   edge. I read all ten sentences. **Zero are order statements.** `shrine-of-pir-chhatal-shah-
   noorani` matched *"rashid"* on **Salman Rashid**, the travel writer whose Dawn piece is the
   entry's source; `shrine-of-lakhi-shah-saddar` matched *"qalandar"* on **Lal Shahbaz Qalandar
   at Sehwan**, a neighbouring shrine; `data-darbar` matched *"chisht"* on **Moinuddin Chishti
   keeping a chilla at Hujwiri's tomb**. This is the "udasi matched Nanak's journeys" lesson
   arriving again in three new costumes. The order layer's exhaustiveness claim in
   `data/kg-order-proposals.json` and HANDOVER §9.177 **holds**.

4. **"26 kin and 19 lineage statements are unread in the markdown corpus."** True of my
   instrument, misleading as a finding. My adapted scanner had no `rowSubjects`, the very
   parameter `sentenceScan.mjs` documents as taking lineage coverage "from 14 to 55", so it
   marked as unread every third-person sentence whose other end is the file's own subject.
   Reading all 45 left **one** ambiguous candidate. KB2-8 is written around the scope gap and the
   measured yield, not the raw count.

5. **"Four Sufi orders have no description, so four order pages are bare."** True of
   `orders[].description` — `rashidi`, `malamati`, `azeemia`, `shattari` have no `description`,
   no `descriptionUr` and no `founded`. But `data/kg-order-prose.json` gives each of them
   sourced passages from the archive's own entries (2 · 1 · 1 · 3), so the pages are not bare.
   The gap survives only in the release, where the exporters read `o.description` and those four
   order nodes ship with a name and an Arabic name and nothing else.

6. **"One kin pair has two contradictory edges."** `hazrat-syed-muhammad-khair-ul-deen` →
   `daud-bandagi-kirmani` carries both `nephew_of` and `son_in_law_of`. It is correct and both
   cite one sentence: *"he was taken under the care of his uncle Dawood Bandgi, who was also his
   father-in-law"*. It is the only unordered pair in the graph with two kin edges.

**Checked and sound**

7. **Referential integrity.** 0 dangling endpoints across all 725 relations against the 496 node
   ids plus the 169 shrine slugs. 0 relations point at a retired slug. All 19 retirement targets
   resolve to a live figure and none of the 19 retired slugs is still a live node.
   `getRetiredSaintTarget`'s "never bounce a reader from one dead end to another" guarantee holds
   in the data.

8. **Lineage consistency.** 0 self-loops, 0 duplicate edges, 0 mutual pairs (no A→B with B→A),
   0 cycles reachable by the single-teacher walk `getLineageChain` performs, and 0 cases where a
   junior kin (`son_of`, `grandson_of`, `nephew_of`, `descendant_of`) is also recorded as their
   elder's teacher or predecessor. The `stop: 'cycle'` branch is unreachable today, as its
   comment says.

9. **Kin edge shape.** All 67 carry both `elderRole` and `juniorRole` (so `toKinLink` can never
   return null and drop a row), 0 self-loops, and the store-once rule holds: no symmetric type
   appears twice. 8 `kinType` values, all mapped in `KIN_EXPORT_PREDICATE`, and the kin triple
   count in the TTL (73) equals edges + symmetric edges exactly.

10. **The event layer.** 149 events, 0 with a missing or dangling `saintSlug`, 0 with a missing
    or dangling `shrineSlug`, and all 149 `commemorated_by` relations match their event's
    `saintSlug` exactly — one per event, no orphans, no doubles. 149 of 169 shrines have an
    event and no shrine has two. The `urs`/`observance` split is right: the one apparent
    exception, `event:urs-darbar-abul-muali-qadri` at a row whose `category` is the off-schema
    `"Islam"`, is *named in build-kg.mjs's own comment* as the deliberate reason the rule keys on
    `NON_MUSLIM_TRADITIONS` rather than on `category === 'Muslim Shrine'`. The three
    `observance`-at-a-Muslim-shrine cases (Allama Iqbal's tomb among them) are records that do
    not say urs. HANDOVER §9.183's "no ʿurs framing is applied to a Gurpurab" is confirmed.

11. **Order membership against the sheet.** Of 52 rows with a non-empty `silsila` cell, exactly
    **2** have figures with no `belongs_to_order` edge, and both are the recorded
    `proseValuedSilsila` cases — Abul Muali Qadri, whose cell declines to name an order, and
    Malik Ahmad Ayaz, whose "Ghaznavi silsila" the entry rules dynastic rather than initiatic.
    Both refusals are written down with reasons. Nothing is missing here.

12. **The 110 lineage-only figures.** All 110 participate in at least one relation — 0 orphans —
    and none has a shrine, so `lineageOnlyFigures.test.ts`'s disjointness and completeness
    assertions hold on today's data. The two figures that *should not* be lineage-only,
    `shah-gohar-peer` and `mian-qurban-ali-shah`, still are; that is HANDOVER §9.156/§9.177, it
    is awaiting Rauf's `data:build` in a stated order of operations, and it is not mine to
    re-report as new.

13. **Shrine↔figure joins.** 0 of 169 shrines lack a figure edge; `data/kg-shrine-figures.json`
    has exactly 169 keys with no shrine missing; the 3 composite rows naming 6 figures
    (`gurdwara-khoohi-bhai-lalo`, `gurdwara-rori-sahib`, `gurdwara-panjvi-chati-patshahi`) match
    the 3 shrines with two `buried_at` edges exactly. `validate-kg-identity.mjs` reports all
    eight of its checks green and I reproduced each count.

14. **Places with no shrines, and places missing a field.** 0 and 0. Worth recording *because*
    it is the wrong question: every one of the nine broken place nodes has a non-empty `district`
    and `province`, so a null check passes on all of them. `p.province != null` is true for
    `"and no coordinates."` — the same shape as the empty-string trap the council brief warns
    about, one type up.

15. **The relation-type export decision.** `assertRelationTypesKnown` in
    `scripts/data/lib/relationExport.mjs` covers all 8 types present in the graph, and both
    exporters call it before writing. `attested_in` is listed as deliberately excluded and no
    such relation exists in `kg.json` today, so the exclusion is a standing decision rather than
    a live drop. That guard works; KB2-1 is the edge-level gap beneath it, not a failure of it.

16. **`/graph`'s figure counts.** 134 archive figures + 110 lineage-only = 244 = `kg.saints.length`,
    and `kg-stats.json`'s `figures`/`lineageOnlyFigures` agree. `lineageLinks: 99` = 70 + 29,
    correctly excluding the 2 descent edges; `orderMemberships: 67` and
    `orderMembershipsUnreviewed: 43` both reproduce; `ursObservances: 77` reproduces. The one
    number I would flag for a future re-read is not wrong but narrow: HANDOVER §9.182's middle
    state ("`reviewed` absent, `method: 'human'`") is described as "67 kin", and the state
    actually holds **100** relations — 67 kin, 24 order memberships, 6 `disciple_of`, 1
    `successor_of`, 2 descent. The editorial question §9.182 puts to Rauf is 50% larger than it
    states.
