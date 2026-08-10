# Shrines Project — Execution Plan

**Prepared by:** Rauf Nawaz
**Date:** 9 August 2026
**Supersedes:** the workstreams in *Content Quality Plan* (9 Aug) and *Schema & Remediation Spec* (9 Aug). Those remain the reference documents for *what* and *why*; this is the single source of truth for *when* and *in what order*.

---

## 0. Framing

Three constraints shape everything below.

**Calendar.** It is 9 August. Roughly three weeks of summer remain before term resumes, after which my available hours drop by more than half. This argues for a specific sequencing: **front-load the mechanical, scriptable work into August** — it is high-volume, low-focus, and finishes fast with tooling — and **push the slow reading work into term**, because building a gold standard from an Urdu book is exactly the kind of task that suits a few hours a week over months rather than a sprint.

**Funding.** The CID appointment ended 29 May with the 80 hours exhausted. Everything since has been unfunded. That is fine for the near term but it caps sustainable throughput, and it should be an explicit conversation with Adil rather than a silent assumption — particularly before committing to a scale phase measured in hundreds of entries.

**Sequencing rule.** The one hard rule from the content-quality memo holds: *do not generate new content at volume until the pipeline has been measured and rebuilt.* Note that this does **not** block Phases 1–2 (data hygiene, no new content) or the source-acquisition track (gathering, not generating). Both proceed immediately.

**Now separate from Auqaf.** The mosque map has its own handover track. Saifullah's time should free up once that ships, which is when the field workstream can restart in earnest.

---

## 1. Workstreams

Owner: **R** = Rauf, **S** = Saifullah, **A** = Adil, **MR** = Muhammad Rizwan.

### A — Data integrity (~22 hrs, R)

| # | Task | Effort | Depends on |
|---|---|---|---|
| A1 | Backup; add `id` slug + `name_alt` alias columns | 2h | — |
| A2 | Mechanical errata: strip `NOTE:`/row-refs to `qa_note`, strip `====`, dedup bibliography lines, clear placeholder Events | 3h | A1 |
| A3 | Coordinate audit: scan all longitudes for `.0000` truncation, fix Dera Sahib / Khoohi Bhai Lalo / Javindi Bibi, normalise to 5 dp, add `coord_source` | 3h | A1 |
| A4 | Content errata: Allo Mahar saint mismatch, Javindi Bibi field/prose conflict, Fateh Pur 1359, Bahauddin Zakariya 1167 | 3h | A1 |
| A5 | Classification migration — `category` / `site_type` / `status`, then delete self-apologising prose | 5h | A1 |
| A6 | Date split — `year_built` + precision + figure dates + event dates | 5h | A1 |
| A7 | Image mirroring: pull all `web` images local, tag `image_N_source`, build replacement queue | 3h | A1 |

A2/A3 are largely regex and script work. A5/A6 require reading each of ~135 entries to determine what the existing value meant — that's the bulk of the time.

### B — Pipeline rebuild (~14 hrs, R)

| # | Task | Effort | Depends on |
|---|---|---|---|
| B1 | Termbase file: canonical romanisation for silsilas, offices, ritual and architectural vocabulary, plus known variants to normalise | 3h | — |
| B2 | Collapse translate-then-summarise into single-pass Urdu→English composition | 3h | B1 |
| B3 | Restructure as extract → compose → verify, with page anchors and a fresh-context verification pass | 5h | B2 |
| B4 | Wire `Source_Extracts` capture into the pipeline so every run persists what it read | 3h | B3 |

### C — Fidelity audit (~18 hrs, R)

| # | Task | Effort | Depends on |
|---|---|---|---|
| C1 | Gold standard, Bibi Pak Daman — read the Urdu source, enumerate every checkable claim | 8h | — |
| C2 | Gold standard, Mian Mir (different source type: chapter in a broader work) | 6h | — |
| C3 | Score both: precision / recall / terminology error count → baseline scorecard | 4h | C1, C2 |

C1 is the long pole of the entire quality track and has no dependencies — **start it now, run it slowly.**

### D — Content remediation (~26 hrs, R + reviewer)

| # | Task | Effort | Depends on |
|---|---|---|---|
| D1 | Blind bake-off: old vs new pipeline on the audited shrines, scored against C3 | 3h | B4, C3 |
| D2 | Regenerate the 9 field-surveyed shrines through the new pipeline | 4h | D1 |
| D3 | Human edit pass on those 9 (~45 min each) — these become the reference standard | 7h | D2 |
| D4 | Corroborate the ~25 `Source-seeded` entries against gazetteers; tighten or extend | 12h | E2, B4 |

### E — Source acquisition (~20 hrs, R + S)

| # | Task | Effort | Depends on |
|---|---|---|---|
| E1 | Scanner spec + capture protocol + shot list to Saifullah (flat pages, consistent light, no gutter shadow, capture title page and colophon) | 2h | budget decision |
| E2 | Gazetteer harvest — Punjab/Sindh/NWFP district gazetteers and settlement reports from digitised archives. **English, no OCR or translation loss, organised by district, strong on *ʿurs* dates and endowments.** No Pakistan dependency; I can do this entirely from here | 10h | — |
| E3 | Anthology manifest pipeline — index-first pass producing site/page-range/confidence before any extraction | 6h | B4 |
| E4 | Entity-resolution table + alias population as sources are mined | 2h + ongoing | A1, E3 |

### F — Field data review (~7 hrs, R + A + S)

| # | Task | Effort | Depends on |
|---|---|---|---|
| F1 | Build review grid: 9 shrines × field categories, present/partial/missing, with submitted photos and form responses | 3h | — |
| F2 | Joint session with Adil, one sitting | 1.5h | F1, Adil's calendar |
| F3 | Consolidated feedback note to Saifullah — one document, framed as a spec for "complete," not a list of complaints | 2h | F2 |
| F4 | Chase Mian Mir field photos from Muhammad Rizwan | 0.5h | — |

### G — Front end (~9 hrs, R)

| # | Task | Effort | Depends on |
|---|---|---|---|
| G1 | New category filters incl. Nanakpanthi (Hindu–Sikh), Jain, Secular/Memorial | 3h | A5 |
| G2 | `info_level` badges + status display | 3h | A5, A6 |
| G3 | Contribution prompt on Low-info entries; internal gap dashboard | 3h | G2 |

---

## 2. Phased sequence

### Phase 0 — Unblock (week of 10 Aug)

Everything here is cheap but has a long lead time or gates someone else. Do it first regardless of what else slips.

- **A1** backup + id/alias columns
- **E1** scanner spec and protocol to Saifullah *(pending budget decision)*
- **F1** build the review grid; **F4** chase Rizwan's photos
- Email Adil: Auqaf records ask, scanner budget, editorial reviewer, model-spend ceiling *(see §4)*
- **Start C1** — open the Bibi Pak Daman source and begin the gold standard. Slow burn from here on.
- **Start E2** — gazetteer harvest running in the background

### Phase 1 — Stop the bleeding (weeks of 10–17 Aug)

Visitor-facing errors currently live on the site. All mechanical.

- **A2** artefact strip · **A3** coordinates · **A4** content errata · **A7** image mirroring
- **F2/F3** Saifullah review session and feedback note, as soon as Adil's calendar allows

**Exit:** no internal notes, row numbers, duplicate citations or placeholder Events visible to visitors; no coordinate more than ~1 km off.

### Phase 2 — Schema migration (weeks of 17–31 Aug)

The last large block of focused time before term. Do the heaviest migration here.

- **A5** classification · **A6** dates · provenance tabs + `support_level` backfill
- **G1/G2** front end catches up

**Exit:** schema stable. Every row added after this point is added once, not migrated twice.

### Phase 3 — Measure (September, reduced cadence)

- **C1/C2** gold standards complete · **C3** baseline scorecard
- **B1** termbase in parallel

**Exit:** a real, numeric answer to Adil's question — *are we at the limit of what AI can do here?* — instead of a guess.

### Phase 4 — Rebuild (late September / October)

- **B2/B3/B4** pipeline restructure · **D1** blind bake-off against the baseline

**Exit:** measured improvement, or evidence that the current pipeline is already near the ceiling. Either result is useful.

### Phase 5 — Reference standard (October / November)

- **D2/D3** regenerate and hand-edit the 9 field-surveyed shrines
- **E3** anthology manifest pipeline

**Exit:** nine pages at publishable quality that define the bar for everything after.

### Phase 6 — Scale (November onward)

- **D4** corroborate the source-seeded entries · anthology mining at volume · **G3** gap dashboard · rolling edit
- Enumerator visits prioritised by the gap dashboard rather than by convenience

---

## 3. Critical path

```
A1 ─┬─► A2/A3/A4/A7 ──► [site clean]
    ├─► A5/A6 ──► G1/G2 ──► [schema stable]
    └─► E4

C1/C2 ──► C3 ──┐
               ├──► D1 ──► D2 ──► D3 ──► [reference standard]
B1 ──► B2 ──► B3 ──► B4 ──┘
                     │
E2 ──────────────────┴──► D4 ──► [corroborated]
                     └──► E3 ──► [scale]
```

**Three things start this week and finish late:** C1 (gold standard), E2 (gazetteers), E1 (scanner). None of them block on anything, and all of them block something important later. Everything else can wait.

---

## 4. Decision gates — needs Adil

| # | Question | Blocks | Cost of delay |
|---|---|---|---|
| 1 | Ask Auqaf for shrine records and *ʿurs* calendars, plus an access letter for Saifullah? | E-track depth, field access | High — the relationship is warm now |
| 2 | Scanner budget, ~$200–400 | E1, all anthology work | High — long procurement lead time |
| 3 | Subject-matter reviewer for Urdu/Persian and *tazkira* framing (Prof. Moeen at LUMS a plausible light-touch ask) | D3 quality ceiling | Medium |
| 4 | Model spend ceiling — frontier models on book-length sources, small per shrine, non-zero across hundreds | B3 design | Medium |
| 5 | Funding after CID — new appointment, or accept a slower cadence? | Phase 6 scope | Medium, rising |
| 6 | Female enumerator for women-only shrine spaces | Field coverage | Low now, systemic later |

---

## 5. Capacity reality

Total: **~116 hours.**

| Track | Hours |
|---|---|
| A — Data integrity | 22 |
| B — Pipeline | 14 |
| C — Audit | 18 |
| D — Remediation | 26 |
| E — Sources | 20 |
| F — Field review | 7 |
| G — Front end | 9 |

At ~12 hrs/week for the remaining three summer weeks (~36 hrs) and ~7 hrs/week during term, that lands the reference standard around **late November** and scale work running into the spring. That is honest rather than optimistic, and it assumes no external dependency stalls.

If the timeline needs compressing, the honest lever is **scope, not speed**: cut D4 (corroboration of the 25 source-seeded entries) and tag them `Moderate` with a visible caveat instead. Do not cut C — skipping the audit is what produces a hundred pages that need redoing.

---

## 6. Risks

| Risk | Likelihood | Response |
|---|---|---|
| Gold standard shows recall is poor — the model dropped a lot | Medium-high | This is the expected finding, not a surprise. It strengthens the case for the rebuild; budget more D-track time |
| Saifullah stays tied up with Auqaf handover | Medium | E2 (gazetteers) needs no Pakistan input — the anthology strategy survives on English-language sources alone for months |
| Anthology entity resolution harder than expected (one shrine, four names) | Medium | A1 alias column is the mitigation; populate aggressively during E3 rather than retroactively |
| Term load compresses everything | High | Already priced in. Mechanical work is front-loaded into August precisely for this reason |
| Scans arrive OCR-hostile (curved pages, gutter shadow) | Medium | Written protocol + one test book reviewed before bulk capture. Bad scans are the one input failure the pipeline cannot recover from |
| Model costs scale unexpectedly | Low-medium | Gate 4; index-first manifest pass (E3) means we only pay full extraction cost on pages that matter |

---

## 7. Definition of done — Phase 5

1. No internal artefacts, placeholder text or wrong coordinates visible on the site.
2. Schema stable: three classification axes, split dates, provenance columns, aliases.
3. `Source_Extracts` populated for every source mined after the rebuild.
4. Baseline and post-rebuild scorecards exist, with numbers.
5. Nine field-surveyed shrines regenerated and hand-edited.
6. Every entry carries an honest `info_level` badge, and Low-info pages invite contribution.
7. One consolidated feedback document delivered to Saifullah, with a revised field protocol and shot list.
