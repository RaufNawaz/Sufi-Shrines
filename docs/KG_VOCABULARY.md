# Knowledge Graph Vocabulary

This document describes the custom vocabulary (`sufi:`) used in the knowledge
graph exports (`data/export/graph.jsonld`, `data/export/graph.ttl`).

## Namespace

| Prefix    | URI                                                |
| --------- | -------------------------------------------------- |
| `sufi:`   | `https://github.com/raufnawaz/sufi-shrines/vocab#` |
| `schema:` | `https://schema.org/`                              |
| `wd:`     | `https://www.wikidata.org/entity/`                 |

## Classes

| Term             | URI                | Extends               | Description                                                                    |
| ---------------- | ------------------ | --------------------- | ------------------------------------------------------------------------------ |
| `sufi:SufiOrder` | `…vocab#SufiOrder` | `schema:Organization` | A Sufi spiritual lineage (silsila/tariqa), e.g. Chishtiyya, Qadiriyya          |
| `sufi:UrsEvent`  | `…vocab#UrsEvent`  | `schema:Event`        | An urs festival — the annual commemoration of a Sufi saint's death anniversary |

## Properties

| Term                | URI                   | Domain           | Range           | Description                                                                        |
| ------------------- | --------------------- | ---------------- | --------------- | ---------------------------------------------------------------------------------- |
| `sufi:silsila`      | `…vocab#silsila`      | `sufi:SufiOrder` | `xsd:string`    | The spiritual chain/lineage name (Arabic/Urdu)                                     |
| `sufi:buriedAt`     | `…vocab#buriedAt`     | `schema:Person`  | `schema:Place`  | Sub-property of `schema:location`; the dargah or mazar where the saint is interred |
| `sufi:commemorates` | `…vocab#commemorates` | `sufi:UrsEvent`  | `schema:Person` | Sub-property of `schema:about`; the person commemorated by the urs                 |
| `sufi:discipleOf`   | `…vocab#discipleOf`   | `schema:Person`  | `schema:Person` | Hand-extracted from `shrine_entries/*.md`; see `data/kg-seeds.json#lineageRelations` for source quotes and confidence |
| `sufi:successorOf`  | `…vocab#successorOf`  | `schema:Person`  | `schema:Person` | Spiritual/institutional succession (e.g. head of a shrine or order), same source as above |
| `sufi:kinOf`        | `…vocab#kinOf`        | `schema:Person`  | `schema:Person` | Blood or marriage, as the archive's own entries state it. Qualified by `kinType`; see below. Seeded in `data/kg-seeds.json#familyRelations` with a verbatim quote per edge |

### `sufi:kinOf` and its `kinType`

The graph carries **43 family ties** (30 August 2026). They are a separate property from
`sufi:discipleOf` on purpose: in this corpus a *gaddi* passes down a family at least as often as
down a chain of initiation, and fusing the two would erase the difference the archive exists to
record. Thirteen pairs are recorded as *both* — a teacher who is also a father.

`kinType` is a closed vocabulary, and every edge is stored **once**, junior → senior:

| `kinType` | subject is the object's… | `juniorRole` (subject) | `elderRole` (object) |
| --- | --- | --- | --- |
| `son_of` | son | `son` | `father` |
| `daughter_of` | daughter | `daughter` | `father` |
| `grandson_of` | grandson | `grandsonPaternal` \| `grandsonUnspecified` | `grandfatherPaternal` \| `grandfatherUnspecified` |
| `nephew_of` | nephew | `nephewPaternal` \| `nephewMaternal` \| `nephewUnspecified` | `unclePaternal` \| `uncleMaternal` \| `uncleUnspecified` |
| `son_in_law_of` | son-in-law | `sonInLaw` | `fatherInLaw` |
| `descendant_of` | descendant | `descendant` | `ancestor` |
| `sibling_of` | **sibling — symmetric** | `brother` \| `sister` | `brother` \| `sister` |

**Why the roles are a closed vocabulary and not free text.** Urdu splits what English does not: a
paternal grandfather is دادا and a maternal one نانا, a father's brother چچا and a mother's
ماموں. A single translated "grandfather" would assert a line most of these entries never state,
so where the entry says which side the specific role is used, and where it does not the
`*Unspecified` role keeps both readings. Picking a side the source never states is an invented
fact (RULE 2).

**`sibling_of` is the one symmetric type**, and it breaks the junior → senior rule rather than
bending it: subject and object are interchangeable and the order carries **no seniority claim**
(Bebe Nanaki is the elder of her pair and is stored as the subject). The tie is still stored only
once — `getKinOf` resolves a figure as subject *or* object, so one row surfaces on both pages, and
the reverse-edge check needs no exception because a reverse edge is a duplicate here and a
contradiction everywhere else. The two role words may still **differ**: two brothers read `brother`
twice, while Bebe Nanaki reads `sister` and Guru Nanak `brother` off the same row. A single shared
symmetric role would print "sister" on Guru Nanak's page.

`elderRole` and `juniorRole` mean strictly **"role of the object"** and **"role of the subject"**.
For the six asymmetric types those names are accurate; for `sibling_of` they are a carried-over
convention, kept because renaming them would touch six types to accommodate one.

**Not yet exported.** `sufi:kinOf` is in the graph and on the site, and neither
`export-jsonld.mjs` nor `export-rdf.mjs` emits it — only `discipleOf` and `successorOf` reach the
data release. Recorded here as a known gap rather than left to be rediscovered.

## Standard properties reused

| Property                  | Used for                                                          |
| ------------------------- | ----------------------------------------------------------------- |
| `schema:about`            | Shrine → saint (the shrine is "about" this person)                |
| `schema:memberOf`         | Saint → SufiOrder                                                 |
| `schema:containedInPlace` | Shrine → Place (district)                                         |
| `schema:sameAs`           | Entity → Wikidata IRI (confirmed QIDs only)                       |
| `schema:alternateName`    | Canonical name → Arabic/Urdu alternate name                       |
| `schema:eventSchedule`    | UrsEvent → `schema:Schedule` with `repeatFrequency: P1Y` (annual) |
| `schema:geo`              | Shrine → `schema:GeoCoordinates`                                  |

## Entity IRI patterns

All entities have stable IRIs in the `https://github.com/raufnawaz/sufi-shrines/data/` namespace:

| Entity type | IRI pattern           | Example                            |
| ----------- | --------------------- | ---------------------------------- |
| Shrine      | `…data/shrine/{slug}` | `…data/shrine/sehwan-sharif`       |
| Saint       | `…data/saint/{slug}`  | `…data/saint/lal-shahbaz-qalandar` |
| Order       | `…data/order/{slug}`  | `…data/order/qalandariyya`         |
| Place       | `…data/place/{slug}`  | `…data/place/karachi`              |
| Event       | `…data/event/{slug}`  | `…data/event/urs-sehwan-sharif`    |

## Extending the vocabulary

To add new custom terms:

1. Add the term to `docs/KG_VOCABULARY.md` (this file)
2. Update the `CONTEXT` constant in `scripts/data/export-jsonld.mjs`
3. Add the RDFS declaration in `scripts/data/export-rdf.mjs`
4. Re-run `npm run data:export`

## Wikidata links

Only QIDs with `confirmed: true` in `data/kg-seeds.json` are emitted as
`schema:sameAs` links. All others require human verification before being
added to a citable release — see `docs/DATA_RELEASE.md`.

## `reviewNeeded` review status

`build-kg.mjs` logs every saint-name merge (raw "Sufi Saint" value → canonical
entity) to `reviewNeeded` for human follow-up — this is a mechanical, always-
regenerated audit trail, not evidence of a likely error. As of 2026-07-12, all
72 current entries were reviewed:

- **67 `name-merge` entries**: every one merges a parenthetical/annotated
  variant (an honorific, epithet, role, date range, or "also known/revered
  as" alias) into the same real person or entity — no case merges two
  distinct figures. Several parentheticals are descriptive text rather than
  a clean alternate name (e.g. "founder of the Rashidi order", a birth–death
  range) and land in `altNames` verbatim; cleaning that up properly needs
  per-entry classification of "alias vs. description," which is future work,
  not a correctness issue.
- **5 `seed-note` entries**: `data-ganj-bakhsh`, `shah-abdul-latif-bhittai`,
  and `sultan-sakhi-sarwar` are confirmed to have **zero** `belongs_to_order`
  relations — correctly left unaffiliated pending real scholarly consensus,
  not an oversight. `bibi-pak-daman`'s flagged possible duplicate row no
  longer exists in the current dataset. `guru-nanak-and-bhai-mardana` is a
  known, deliberate modeling gap — Bhai Mardana isn't a separate saint entity
  yet — tracked as future lineage-modeling work (see `PROJECT_VISION.md`
  Track 2), not a bug.

## Files

| File                       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `data/kg.json`             | Canonical KG (entities + relations)                                        |
| `data/kg-seeds.json`       | Human-curated seed data (orders, order associations, merge variants, QIDs) |
| `data/export/graph.jsonld` | JSON-LD export of the full KG                                              |
| `data/export/graph.ttl`    | RDF/Turtle export of the full KG                                           |

Rebuild with: `npm run data:export`
