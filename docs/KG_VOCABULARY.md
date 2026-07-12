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

## Files

| File                       | Description                                                                |
| -------------------------- | -------------------------------------------------------------------------- |
| `data/kg.json`             | Canonical KG (entities + relations)                                        |
| `data/kg-seeds.json`       | Human-curated seed data (orders, order associations, merge variants, QIDs) |
| `data/export/graph.jsonld` | JSON-LD export of the full KG                                              |
| `data/export/graph.ttl`    | RDF/Turtle export of the full KG                                           |

Rebuild with: `npm run data:export`
