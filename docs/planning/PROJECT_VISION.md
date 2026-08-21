# Project Vision — _Sufi Shrines of Pakistan_

A blue‑sky roadmap for what this project can become, with concrete, detailed next steps
Claude Code can execute. Read alongside `CLAUDE.md` (conventions) and
`URDU_IMPLEMENTATION_PLAN.md` (the Urdu plan).

> **18 Aug 2026:** [`DESIGN_VISION.md`](DESIGN_VISION.md) now carries the aesthetic
> direction this doc never had, ten new feature ideas (F1–F10), and a status audit of the
> tracks below — Track 0 is done; 2/3/6/7/8 are partial. Read it alongside this.
>
> **20 Aug 2026:** [`SHARED_GROUND_VISION.md`](SHARED_GROUND_VISION.md) argues for one idea
> none of these tracks contain — that 37% of the archive's sites stand within 800 m of
> another, and in eight places across different traditions — and sizes it against measured
> data. Its Track A is in progress.

---

## North star

> The definitive, **trustworthy, bilingual‑first** digital archive and living map of
> Pakistan's shrine heritage — Sufi, Hindu, and Sikh — that is at once a beautiful public
> pilgrimage companion and a **citable scholarly resource** built on transparent,
> provenance‑tracked primary sources.

Three commitments that shape every decision:

1. **Parity** — Urdu (and eventually Sindhi, Punjabi, Persian) is a first‑class
   experience, not a translation afterthought.
2. **Provenance** — every claim is traceable to a source; machine output is a draft until
   reviewed. Trust is the product.
3. **Respect** — three living traditions, represented accurately and with dignity.

The repo already has unusually strong bones for this: an OCR pipeline over ~30 primary
texts (`out/ocr/`), a knowledge graph (`src/components/kg/`, `data/kg*.json`), guided
tours with audio, JSON‑LD/RDF export, a datapackage, `CITATION.cff` and `codemeta.json`.
The tracks below build on those assets.

---

## Track 0 — Finish Urdu parity (do this first)

The structured data, Nastaliq font, numeral toggle, and facet localization are in. Three
gaps remain (visible in the current Urdu screenshots) that make the experience feel
half‑translated. Close them before anything else.

**0.1 Urdu article content (the big one).**
Article bodies, section headings, and the Table of Contents still render English because
there is no Urdu description content. Steps:

- Add an Urdu content column per section to the data source (Google Sheet + fallback):
  `Description Urdu`, and for structured sections `History Urdu`, `Architecture Urdu`,
  `Rituals Urdu`, `Saint Biography Urdu`, `Events & Urs Urdu`, `Visiting Info Urdu`,
  `Sources Urdu`. `getUrduFieldValue()` already resolves `"<Field> Urdu"`, so no component
  change is needed once the data exists.
- **Author the Urdu descriptions to a high bar** — native Urdu prose (not MT), honorifics
  and Sufi terms per `data/glossary.csv`, Urdu section headings (reuse the Urdu titles in
  `ARTICLE_SECTION_DEFINITIONS`), numbers left Western in stored text (the toggle handles
  digits). Batch order: the ~18 tour‑featured shrines → highest‑traffic saints → the rest.
- Add a **generic heading‑label map** (`Overview→خلاصہ`, `Significance/Significance
Today→اہمیت`, `Bibliography/References→کتابیات`, `Legacy→ورثہ`, `The Shrine→مزار`, …) so
  even not‑yet‑translated inline headings localize; wire it into
  `useArticleContent.navItems` and `ShrineArticle`.

**0.2 Numerals everywhere.** Apply `fmtNum()` at the sites that still show Western digits:
`ShrineInfobox.tsx` (founded year), `ContentsNav.tsx` (`{i+1}.` numbering),
`RelatedShrines`/`TourPanel` distances, `era.ts` century labels. Coordinates stay Western.

**0.3 Guardrails.** Add the "no‑English‑leak" Vitest (fail on `[A-Za-z]` under
`[dir='rtl']` except URLs/coordinates/`<bdi>`) and wire
`urdu-i18n/build_dictionary.py`'s Latin‑leak check into `npm run data:validate` so parity
can't regress.

**Done when:** a shrine page in `?lang=ur` is fully Urdu — title, infobox, body, headings,
ToC, related cards, numbers — with no English or transliteration.

---

## Track 1 — A primary‑source digital library

Turn the OCR corpus into a first‑class, searchable, **cited** library that backs every
claim.

Why it matters: this is the project's scholarly moat — no other shrine site links
statements to page‑level primary sources across Urdu/Persian/English.

Next steps:

- Build a **Sources** browser: list the ~30 texts (`out/ocr/`), with metadata, language,
  and per‑book status; deep‑link from each shrine's "Sources" section to the exact
  passage/page image.
- Full‑text search across the corpus (extend the MiniSearch worker or add a small
  server/Pagefind index) in Urdu/Persian/English, with snippet highlighting.
- A **citation object** model (page, book, confidence, translator, reviewed?) surfaced in
  `SourcesProvenance` — click a fact → see the source. Feed from `data/provenance.json`.
- "How do we know this?" affordance on article claims (hoverable footnotes).

First Claude Code task: design the source/citation schema in `docs/`, then a `SourcesPage`

- corpus search index built from `out/ocr/**` with page anchors.

---

## Track 2 — The knowledge graph as the backbone

Make saints, orders (silsilas), lineages, places, and events a navigable graph, and
publish it as Linked Open Data.

Next steps:

- Enrich `data/kg.json` from `shrine_entries/` and the OCR corpus: teacher–disciple
  chains, silsila membership, birth/death, urs dates, place relationships.
- Ship an interactive **lineage explorer** (build on `LineageView`/`NetworkGraph`):
  filter by order, animate a saint's spiritual chain, "paths between two saints."
- A **timeline** view (reuse era parsing in `lib/data/era.ts`) spanning 7th–21st c.
- Formalize the LOD export (`npm run data:export` already emits JSON‑LD/RDF); mint a
  **DOI** (Zenodo) and versioned releases so the dataset is citable (`CITATION.cff` ready).

First Claude Code task: expand the KG schema + validator, then a `/graph` explorer route
with order/lineage filters.

---

## Track 3 — Immersive pilgrimage & storytelling

Make the tours feel like a guided pilgrimage, online or on‑site.

Next steps:

- Upgrade audio from browser TTS to **curated recordings** (Urdu narration; optional
  qawwali/sama clips with rights); per‑stop transcripts.
- **Offline pilgrim mode:** downloadable region packs (map tiles + shrine data + audio)
  via the existing PWA; works without signal at the site.
- On‑site mode: geofenced "you're here" cards, walking directions between nearby shrines,
  360°/StreetView embeds where available, prayer‑time/urs‑calendar awareness.
- Richer tour authoring: themed routes (e.g., "Qadiri Punjab," "Sindh's river saints,"
  "Partition‑era Sikh heritage"), seasonal urs routes.

First Claude Code task: implement offline region packs + audio‑with‑transcript in
`TourPanel`, and a tour authoring/validation format in `src/data/tours.json`.

---

## Track 4 — Multilingual & inclusive by design

Extend beyond en/ur to the languages of these shrines' own communities.

Next steps:

- Add **Sindhi**, **Punjabi (Shahmukhi)**, **Saraiki**, and **Persian** using the same
  dictionary + `uiStrings` architecture; make the language system list‑driven, not
  hardcoded to two.
- Audio **pronunciation** of shrine/saint names; a transliteration guide.
- WCAG 2.2 AA+ across scripts; screen‑reader passes in Urdu; dyslexia‑friendly and
  high‑contrast options.

First Claude Code task: refactor `LanguageContext`/`uiStrings` to an N‑language registry;
scaffold Sindhi as the second RTL locale to prove the pattern.

---

## Track 5 — AI features, grounded and cited

Use AI only where it's **anchored to the provenance‑tracked corpus** — never free‑floating
generation.

Next steps:

- **Semantic/natural‑language search:** "shrines with Thursday qawwali near Multan,"
  "13th‑century Suhrawardi saints" → structured filters + ranked results.
- **"Ask the archive" (RAG):** answers grounded strictly in the OCR corpus + dataset, with
  inline citations to page images; refuses when sources are thin. This is the trustworthy
  differentiator.
- **Corpus → KG extraction:** assist entity/relation extraction from OCR to grow the graph
  (human‑reviewed, tagged `reviewed=false` until approved).
- **Translation assist** for new entries, glossary‑enforced, always human‑reviewed.

First Claude Code task: a retrieval index over the corpus + a cited answer endpoint with a
"sources or silence" guarantee; ship semantic search in the map sidebar first.

---

## Track 6 — Trust, provenance & data quality

Make trustworthiness visible and enforced. Detailed plan:
[`docs/planning/DATA_QUALITY_PLAN.md`](DATA_QUALITY_PLAN.md) (shrine-description
content provenance, citations, fact-verification).

Next steps:

- Surface **provenance + confidence** in the UI (source count, "traditionally
  attributed," reviewed vs. draft) via `SourcesProvenance`.
- An **editorial pipeline:** contributions/corrections → review queue → provenance update;
  extend `npm run data:validate` (schema, coordinates, dates, image reachability, Urdu
  parity) and block releases on failure.
- **Versioned data releases** with changelog + DOI; snapshot diffs (`scripts/data/build-dataset.mjs`).

First Claude Code task: a provenance/confidence display component + expanded
`data:validate` gate (including the Urdu‑leak and image‑reachability checks).

---

## Track 7 — Heritage at risk & preservation

Several sites in the dataset are damaged, contested, or lost (e.g., temples destroyed or
rebuilt). Document and foreground preservation.

Next steps:

- A **threat/condition status** field (active, endangered, damaged, restored, lost) with a
  map layer and filter; timeline of condition changes.
- Before/after imagery and community‑submitted current photos (moderated).
- Partnerships/exports for heritage bodies; an "at‑risk" report view.

First Claude Code task: add condition status to the schema + a map layer/legend and filter
chip, reusing the existing filter architecture.

---

## Track 8 — Reach, platform & performance

Get it in front of pilgrims, diaspora, students, and scholars — fast, shareable, embeddable.

Next steps:

- **Per‑language prerender + SEO:** `/ur/…` routes (or snapshots) with `hreflang`, Urdu
  `<title>`/meta/OG, sitemap; extend `scripts/prerender.mjs`.
- **Embeddable** map/shrine widgets (the `?embed=1` mode exists — build on it) for
  museums, blogs, curricula.
- A **public read API** + the LOD dataset for researchers.
- Performance at scale: marker clustering, tile self‑hosting/caching, image pipeline
  (already `sharp`), keep Lighthouse green in CI.
- Educational packs and museum/gallery partnerships.

First Claude Code task: per‑language prerender + `hreflang` + Urdu meta, then a documented
embed and a minimal read API.

---

## Suggested sequencing

1. **Track 0** (finish Urdu) — now.
2. **Track 6 + Track 2** (trust + KG) — deepen the scholarly core.
3. **Track 1 + Track 5** (sources library + grounded AI) — the differentiator.
4. **Track 3 + Track 7** (immersive + at‑risk) — public impact.
5. **Track 4 + Track 8** (more languages + reach) — scale.

Each track is independently shippable; each "first task" is sized for one focused Claude
Code session.
