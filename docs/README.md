# Documentation Index

Reference documentation for the Sufi Shrines project. Start with the root
[`README.md`](../README.md) (overview, quick start) and [`CLAUDE.md`](../CLAUDE.md)
(architecture, i18n rules, working conventions).

**Every markdown file under `docs/` is listed below.** That is not a courtesy — it is enforced.
`src/lib/data/__tests__/docsIndex.test.ts` fails if a doc exists that this page does not link,
because the previous version of this index omitted **29 files, including `HANDOVER.md`** — the
one file `CLAUDE.md` tells every reader to open first — and pointed the "live checklist" link at
a July snapshot whose stated highest-priority item had been completed in August. An index that
can go stale silently is worse than no index, because it is trusted.

## Read these first

| Doc                                | Purpose                                                                       |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| [`HANDOVER.md`](HANDOVER.md)       | **Full project state**: what this is, where everything lives, trust calibration (§9 — read it), risks, how to resume. The most important document here. |
| [`MEASUREMENT_FAILURES.md`](MEASUREMENT_FAILURES.md) | **Read before trusting a number you just produced.** The three ways a measurement goes wrong in this repo, from about fifteen that did. |
| [`SESSION_RESUME.md`](SESSION_RESUME.md)                                       | **Read this first with no conversation history.** The standing work queue, ranked by what each item costs a reader, plus what is waiting on a person and the agreements for a shared tree |
| [`TODO.md`](TODO.md)               | **The live working log.** Session-by-session record of what was done and what is next. |
| [`SESSION_CHECKPOINT_2026-08-21.md`](SESSION_CHECKPOINT_2026-08-21.md) | **Start here in a new session.** What is on the branch vs live, what shipped on 21 August, what to pick up, and the gotchas that cost an hour each. |
| [`BRANCHING.md`](BRANCHING.md)     | **What each branch is for, and the fact that Pages does not deploy from `main`.** Per-branch disposition with measurements, and how to cut a version branch. |
| [`HANDOFF.md`](HANDOFF.md)         | Maintainer handbook: scripts, architecture, data updates, deploy, environment  |
| [`GOLD_STANDARD.md`](GOLD_STANDARD.md) | What "done properly" means for a single entry                              |

## Data and schema

| Doc                                                  | Purpose                                                              |
| ---------------------------------------------------- | -------------------------------------------------------------------- |
| [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md)           | Field reference, controlled vocabularies, validation rules           |
| [`DATA_RELEASE.md`](DATA_RELEASE.md)                 | Producing a citable data release and minting a DOI (Zenodo / Dataverse) |
| [`KG_VOCABULARY.md`](KG_VOCABULARY.md)               | The custom `sufi:` vocabulary used in the JSON-LD / RDF exports      |
| [`KG_REVIEW_WORKFLOW.md`](KG_REVIEW_WORKFLOW.md)     | Reviewing the graph's 235 machine-extracted claims: the queue, what the gates already prove, and what stays a human's job |
| [`KNOWLEDGE_BASE_GAPS.md`](KNOWLEDGE_BASE_GAPS.md)   | Every hole in the knowledge base, classified by who can close it. 73% is unrecorded evidence no agent may supply; re-run `scripts/data/measure-kb-gaps.mjs` rather than quoting the numbers |
| [`CORRECTIONS_WORKFLOW.md`](CORRECTIONS_WORKFLOW.md) | How to report and process a factual correction                       |
| [`GIS_FOUNDATION.md`](GIS_FOUNDATION.md)             | The research GeoPackage in `pipeline/gis/`: sites on admin boundaries + an H3 grid, Census 2023 and satellite/DHS welfare layers (each verified), 2,525 shrine leads from OSM/Wikidata/GeoNames with measured accuracy, and a map viewer (`pipeline/gis/viewer/index.html`) |
| [`briefs/TRADITION_LAYER.md`](briefs/TRADITION_LAYER.md) | **Built, gated, and unrendered.** The six non-Sufi traditions the corpus describes and the graph had no word for — what exists, how to render it, and the term-match traps that are recorded as non-memberships |
| [`Shrines_Schema_and_Remediation_Spec.md`](Shrines_Schema_and_Remediation_Spec.md) | Schema revision and remediation spec        |
| [`EDITORIAL_DECISIONS_PENDING.md`](EDITORIAL_DECISIONS_PENDING.md) | The `qa_note` backlog — decisions only a human can make |
| [`allo_mahar_resolution.md`](allo_mahar_resolution.md) | Worked example: resolving a figure mismatch in one entry            |
| [`patch_addendum_hinglaj.md`](patch_addendum_hinglaj.md) | Patch addendum for Shaktipeeth Shri Hinglaj Mata Mandir           |

## Front end

| Doc                                    | Purpose                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| [`FRONTEND_NOTES.md`](FRONTEND_NOTES.md) | How the front end reads and renders the sheet — including §6, the MapTiler basemap measurements |
| [`SOURCES_TAB.md`](SOURCES_TAB.md) | The Sources tab (`/sources`, `/source/:slug`): the shelf, the books read in full, every citation by kind, and what each book page shows |
| [`COUNCIL_2026-10-17.md`](COUNCIL_2026-10-17.md) | The overnight UI council of 17 October 2026: every finding, its seat, and what was done |
| [`REVIEW_ur_prefix_routing.md`](REVIEW_ur_prefix_routing.md) | Review gate for the `/ur/*` prerendered routes       |
| [`URDU_TYPOGRAPHY_2026-09-11.md`](URDU_TYPOGRAPHY_2026-09-11.md) | The Urdu spacing pass — what was measured, what changed, before/after in px |
| [`URDU_TYPOGRAPHY_2026-09-14.md`](URDU_TYPOGRAPHY_2026-09-14.md) | The Urdu minimalism pass — why the spacing pass above could not have worked (Noto Nastaliq's own box is 2.50em), the change of reading face to Mehr Nastaliq Web, and the furniture that came off |
| [`ADIL_FEEDBACK_IMPLEMENTATION.md`](ADIL_FEEDBACK_IMPLEMENTATION.md) | Adil's fourteen items, each checked against the code on 14 September 2026 — what shipped, where it lives, and the five things still open |
| [`URS_CALENDAR_2026-09-11.md`](URS_CALENDAR_2026-09-11.md) | The Urs Calendar month grid — layout algorithm, and what is deliberately not on it |

## OCR guides (Urdu book pipeline)

| Doc                                                          | Purpose                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`BOOK_OCR_WORKFLOW.md`](BOOK_OCR_WORKFLOW.md)               | Full OCR + translation pipeline setup — Windows / PowerShell |
| [`BOOK_OCR_WORKFLOW_MAC.md`](BOOK_OCR_WORKFLOW_MAC.md)       | Full OCR + translation pipeline setup — macOS                |
| [`LOCAL_OCR_QUICKSTART.md`](LOCAL_OCR_QUICKSTART.md)         | Short "run OCR on a PDF now" recipe — Windows / PowerShell   |
| [`LOCAL_OCR_QUICKSTART_MAC.md`](LOCAL_OCR_QUICKSTART_MAC.md) | Short "run OCR on a PDF now" recipe — macOS                  |
| [`LIBRARY_OCR_SETUP.md`](LIBRARY_OCR_SETUP.md)               | Setting up the library workstation OCR kit                   |
| [`NEW_LAPTOP_OCR_RUNBOOK.md`](NEW_LAPTOP_OCR_RUNBOOK.md)     | Move, OCR, translate, photos — walkthrough on a fresh laptop  |
| [`WINDOWS_SETUP.md`](WINDOWS_SETUP.md) | Working from the Windows PC as well as the Mac: a separate clone synced through GitHub, never the Drive-synced folder |
| [`OCR_NEW_MACHINE_RUNBOOK.md`](OCR_NEW_MACHINE_RUNBOOK.md)   | The 42 new books (Sept 2026): copy the folder, run three commands; download is blocked on a private Drive folder |
| [`CLAUDE_DIRECT_EXTRACTION_EXPERIMENT.md`](CLAUDE_DIRECT_EXTRACTION_EXPERIMENT.md) | Measured comparison: reading OCR'd Urdu directly vs the LibreTranslate pipeline |
| [`CLOUD_OCR_QUEUE.md`](CLOUD_OCR_QUEUE.md) | Cloud book queue — runbook |
| [`CLOUD_OCR_RESUME.md`](CLOUD_OCR_RESUME.md) | Book corpus — state of the work and how another session continues it |
| [`CLOUD_OCR_RESEARCH_2026-09.md`](CLOUD_OCR_RESEARCH_2026-09.md) | What the literature says about OCR of Urdu Nastaliq books in 2026, and what the queue adopts |
| [`RUN_IN_PROGRESS_schimmel_mystical_dimensions.md`](RUN_IN_PROGRESS_schimmel_mystical_dimensions.md) | Run log, Schimmel *Mystical Dimensions* Pass 1 (complete) |

## Media and archiving

| Doc                                              | Purpose                                                     |
| ------------------------------------------------ | ----------------------------------------------------------- |
| [`manifest_report.md`](manifest_report.md)       | Shrine → Drive media manifest report                        |
| [`internet_archive_setup.md`](internet_archive_setup.md) | Internet Archive setup for the oral-history recordings |
| [`DECISION_oral_histories.md`](DECISION_oral_histories.md) | Decision required: do oral histories happen, or come off the plan? |

## Planning (`planning/`)

Roadmaps and runbooks; several are kept for history after implementation.

| Doc                                                                            | Purpose                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`planning/TODO.md`](planning/TODO.md)                                         | Live working checklist for the dataset and app                                    |
| [`planning/FRONT_DOOR_PAYLOAD.md`](planning/FRONT_DOOR_PAYLOAD.md)             | **The map downloads 672 KB of prose to draw 169 dots.** Measured front-door payload, the two fixes ruled out by measuring, and the slim index that fixes it |
| [`planning/URDU_ARTICLE_PAYLOAD.md`](planning/URDU_ARTICLE_PAYLOAD.md)         | **Every Urdu route downloads the same 253 KB of article prose**, on routes with no article on them. Measured per-route payload against a production build |
| [`planning/UX_COUNCIL_2026-08-30.md`](planning/UX_COUNCIL_2026-08-30.md)     | **Four reviewers, one lens each, thirty-two findings and eleven retractions.** What shipped, what is queued and ranked by what it costs a reader, and the three decisions that need a person |
| [`planning/UI_COUNCIL_2026-08-30.md`](planning/UI_COUNCIL_2026-08-30.md)     | **The second council, same day, different brief: what the archive should *become*.** Four lenses returned and one died on a rate limit; twenty-four findings, fourteen retractions, and the three headline numbers that did not survive being re-measured |
| [`planning/KB_COUNCIL_2026-08-30.md`](planning/KB_COUNCIL_2026-08-30.md)     | **The third council, same day: the knowledge base itself.** Five lenses — provenance, the graph, invariants, what is published vs held, Urdu parity — twenty-nine findings and sixteen retractions, eleven shipped. Raw reports in [`kb-council-2026-08-30/`](planning/kb-council-2026-08-30/) |
| [`planning/PERF_COUNCIL_2026-09-04.md`](planning/PERF_COUNCIL_2026-09-04.md) | **The fourth council: why the archive feels slow and chunky to use.** Five lenses — React render economy, the Leaflet marker layer, the language switch, route transitions, CSS and compositing. The first instrument here to measure interaction rather than load, the two defects found in that instrument before any finding rested on it, and a headline number the council corrected downward |
| [`planning/kb-council-2026-08-30/kb1-provenance.md`](planning/kb-council-2026-08-30/kb1-provenance.md) | KB council, raw report — provenance and citation integrity: 5 findings, 10 retractions |
| [`planning/kb-council-2026-08-30/kb2-graph.md`](planning/kb-council-2026-08-30/kb2-graph.md) | KB council, raw report — the knowledge graph: 8 findings, 6 killed by re-measuring |
| [`planning/kb-council-2026-08-30/kb3-invariants.md`](planning/kb-council-2026-08-30/kb3-invariants.md) | KB council, raw report — schema hygiene and invariant coverage: 7 findings, 11 retractions |
| [`planning/kb-council-2026-08-30/kb4-publication.md`](planning/kb-council-2026-08-30/kb4-publication.md) | KB council, raw report — what is published vs held: 7 findings, 1 withdrawn, 7 killed |
| [`planning/kb-council-2026-08-30/kb5-urdu.md`](planning/kb-council-2026-08-30/kb5-urdu.md) | KB council, raw report — Urdu knowledge parity: 5 findings, 16 retractions, three of them instrument errors from measuring the slim index |
| [`planning/BADGE_GLOSSARY.md`](planning/BADGE_GLOSSARY.md)                     | **The seven definitions the trust badges never gave a reader**, derived from the rule that computes them rather than authored. Wording, the 150-word threshold and the Urdu are open |
| [`planning/DELEGATED_EXECUTION_PLAN.md`](planning/DELEGATED_EXECUTION_PLAN.md) | Bounded Urdu-aesthetic + feature tasks specced for GPT-Codex-class/cheaper models |
| [`planning/EXECUTION_PLAN.md`](planning/EXECUTION_PLAN.md)                     | Ordered milestones threading the backlog and roadmap together                     |
| [`planning/NEXT_STEPS_2026-08-26.md`](planning/NEXT_STEPS_2026-08-26.md)       | **Current working plan**: display-enrichment phase (order/place/almanac surfaces from data the KG already holds) + feature polish, specced for a cheaper model |
| [`planning/SETTINGS_AND_READING_PREFERENCES.md`](planning/SETTINGS_AND_READING_PREFERENCES.md) | A11 scoped: why every control lived on the map, and the reading preferences behind `/settings` |
| [`planning/NEXT_STEPS_2026-08-21.md`](planning/NEXT_STEPS_2026-08-21.md)       | Previous working plan (Lane A closed same day); record of what was done and why |
| [`planning/REVIEW_DESK_2026-08-24.md`](planning/REVIEW_DESK_2026-08-24.md) | The review desk: turning the archive's 218 unreviewed claims from a number it publishes into a number it can reduce |
| [`planning/DECISION_figure_identity_column.md`](planning/DECISION_figure_identity_column.md) | **Decision required:** the graph builds figure identity from the legacy `Sufi Saint` column, not `principal_figure`. 43 rows and 41 of 133 figure slugs would move (re-measured; run the worksheet rather than quoting). The composite half is closed (fan out); the column is now a 169-row worksheet — `npm run data:review:figures`, 13 rows genuinely contested, 154 drafted |
| [`planning/LANGUAGE_LAYER_2026-08-24.md`](planning/LANGUAGE_LAYER_2026-08-24.md) | **The next phase.** Why N4's type-level refactor and the 42 KB of eager Urdu interface copy are one job, and the four-phase order that keeps the build green at every step. |
| [`planning/PROJECT_VISION.md`](planning/PROJECT_VISION.md)                     | Blue-sky roadmap (Track 0 = Urdu parity; Tracks 1–8 = the future)                 |
| [`planning/DESIGN_VISION.md`](planning/DESIGN_VISION.md)                       | Aesthetic direction (palette, type, marginalia signature) + blue-sky features F1–F10 |
| [`planning/URDU_IMPLEMENTATION_PLAN.md`](planning/URDU_IMPLEMENTATION_PLAN.md) | Phased Urdu-parity plan (implemented — historical reference)                      |
| [`planning/ENRICHMENT_RUNBOOK.md`](planning/ENRICHMENT_RUNBOOK.md)             | Per-run procedure for enriching the shrines workbook (descriptions, rows, images) |
| [`planning/TOURS_FUTURE_PLAN.md`](planning/TOURS_FUTURE_PLAN.md)               | Guided-tours experience roadmap (phases 1–5 implemented)                          |
| [`planning/DATA_QUALITY_PLAN.md`](planning/DATA_QUALITY_PLAN.md)               | Detailed plan: description content provenance, citations, fact-verification (Track 6) |

| [`planning/PROJECT_VISION.md`](planning/PROJECT_VISION.md)                     | Blue-sky roadmap (Track 0 = Urdu parity; Tracks 1–8 = the future)                  |
| [`planning/DESIGN_VISION.md`](planning/DESIGN_VISION.md)                       | Aesthetic direction (palette, type, marginalia) + blue-sky features F1–F10         |
| [`planning/SHARED_GROUND_VISION.md`](planning/SHARED_GROUND_VISION.md)         | Sites that share ground across traditions — tracks A–D, and the 3358 m clustering near-miss |
| [`planning/TRACK_C_CHRONOLOGY.md`](planning/TRACK_C_CHRONOLOGY.md)             | Track C: the archive across the centuries — why the deferral had gone stale, and the rules that keep an uncertain date from reading as a precise one |
| [`planning/EXECUTION_PLAN.md`](planning/EXECUTION_PLAN.md)                     | Ordered milestones threading the backlog and roadmap together                      |
| [`planning/DELEGATED_EXECUTION_PLAN.md`](planning/DELEGATED_EXECUTION_PLAN.md) | Bounded Urdu-aesthetic + feature tasks specced for cheaper models                  |
| [`planning/URDU_IMPLEMENTATION_PLAN.md`](planning/URDU_IMPLEMENTATION_PLAN.md) | Phased Urdu-parity plan (implemented — historical reference)                       |
| [`planning/A8_URDU_DELTA_SCOPE.md`](planning/A8_URDU_DELTA_SCOPE.md)           | Measured scope and resume point for the Urdu content delta (task A8)               |
| [`planning/TOURS_FUTURE_PLAN.md`](planning/TOURS_FUTURE_PLAN.md)               | Guided-tours roadmap (phases 1–5 implemented)                                      |
| [`planning/DATA_QUALITY_PLAN.md`](planning/DATA_QUALITY_PLAN.md)               | Description provenance, citations, fact-verification (Track 6)                     |
| [`planning/ENRICHMENT_RUNBOOK.md`](planning/ENRICHMENT_RUNBOOK.md)             | Per-run procedure for enriching the shrines workbook                               |
| [`planning/AUQAF_INTEGRATION_PLAN.md`](planning/AUQAF_INTEGRATION_PLAN.md)     | Auqaf ↔ Shrines integration plan (Bibi Pak Daman demo)                            |
| [`planning/PROJECT_HEAD_FEEDBACK_PLAN.md`](planning/PROJECT_HEAD_FEEDBACK_PLAN.md) | Triage and plan for the project head's feedback                               |
| [`planning/TODO.md`](planning/TODO.md)                                         | ⚠ **Superseded snapshot (12 July 2026).** Kept for history. The live checklist is [`TODO.md`](TODO.md). |
| [`planning/MAP_PIN_DENSITY_2026-08-30.md`](planning/MAP_PIN_DENSITY_2026-08-30.md) | Measured: the opening map view renders 169 sites as 21 shapes |


## Proposals, status and correspondence

Point-in-time documents. Useful as history; **do not read them as current state** — that is
[`HANDOVER.md`](HANDOVER.md) and [`TODO.md`](TODO.md).

| Doc                                                            | Purpose                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [`ADIL_UPDATE_2026-10-08.md`](ADIL_UPDATE_2026-10-08.md) | Draft update to Adil for the 8 October deploy and sheet import |
| [`PROPOSAL_Shrines_Data_Quality.md`](PROPOSAL_Shrines_Data_Quality.md) | Data-quality proposal                               |
| [`CLEANUP_2026-10.md`](CLEANUP_2026-10.md) | Performance, Safari/mobile stability, security and repository cleanup pass (October 2026): the three audits' plan, ticked as items land, with a progress log |
| [`TEAM_ACCESS_PLAN.md`](TEAM_ACCESS_PLAN.md) | Team view: what was shaky about `?team=1`, the Phase 1 fixes, and the Phase 2 sign-in options awaiting Rauf's ruling |
| [`shrines_193_Research_2026-10-27_region_context_display_mechanisms.md`](shrines_193_Research_2026-10-27_region_context_display_mechanisms.md) | Research note of 27 October 2026: how to link and display information general to a region (Wikivoyage hierarchies, Wikipedia excerpts and page previews, progressive disclosure, object first writing), for the region layer proposed in chat that day. Moved here from the repository root on 30 October |
| [`DATA_SOURCE_OPTIONS.md`](DATA_SOURCE_OPTIONS.md) | Replacing the Google Sheet as the data source: what it costs today, four options (repository files, a web editor over them, a hosted database, the sheet read only at build time) and a three step recommendation awaiting Rauf's ruling (30 October 2026) |
| [`DOMAIN_AND_HOSTING_2026-09-11.md`](DOMAIN_AND_HOSTING_2026-09-11.md) | Domain names (availability measured), registrars, hosting for a static site; three decisions for Rauf at the top |
| [`STATUS_AND_ROADMAP.md`](STATUS_AND_ROADMAP.md)               | Status and roadmap write-up                                |
| [`OPERATING_PLAN.md`](OPERATING_PLAN.md)                       | Operating plan                                             |
| [`POST_DATA_LAYER_ROADMAP.md`](POST_DATA_LAYER_ROADMAP.md)     | What comes after the data layer                             |
| [`Shrines_Execution_Plan.md`](Shrines_Execution_Plan.md)       | Earlier execution plan                                      |
| [`Shrines_Content_Quality_Plan.md`](Shrines_Content_Quality_Plan.md) | Content quality, source strategy, field-data plan     |
| [`RUNBOOK.md`](RUNBOOK.md)                                     | ⚠ **Dated 9 August 2026.** Step-by-step sheet-cleaning run. Read as a record: one of its steps told you to export TSV, which flattens every Description (RULE 3), and is corrected in place with a note. |
| [`FAST_PLAN.md`](FAST_PLAN.md)                                 | A 30-minute run plan                                        |
| [`TASKS.md`](TASKS.md)                                         | An autonomous work plan                                     |
| [`auqaf_records_brief.md`](auqaf_records_brief.md)             | Briefing note for the Auqaf records ask                     |
| [`email_to_adil_data_layer.md`](email_to_adil_data_layer.md)   | Follow-up email to Adil on the data layer                   |
| [`message_to_saifullah_2026-08-16.md`](message_to_saifullah_2026-08-16.md) | Draft message to Saifullah, 16 August 2026        |
| [`responses_sync_2026-08-26.md`](responses_sync_2026-08-26.md) | Field-survey responses sync, 26 August 2026: why the `shrines_updated` TSV lineage stopped, and the three orphaned enrichments |
| [`responses_sync_2026-09-05.md`](responses_sync_2026-09-05.md) | Field-survey responses sync, 5 September 2026: no new responses since 11 August, and why "three never merged" was three entries missing a *citation* — plus the n-gram instrument that reported all nineteen unmerged and was thrown away |
| [`SESSION_2026-08-27_overnight_handoff.md`](SESSION_2026-08-27_overnight_handoff.md) | Handoff for the overnight run of 26–27 August 2026: every agent-executable task in the 26 August plan closed (A2–A6, A10, B1–B4), five findings the gates produced that were in no plan (the dark theme, the header height, the bundle budgets, three dead images, 86 diverging figure slugs), and the three new tasks waiting on a decision |
| [`SESSION_2026-08-26_evening_handoff.md`](SESSION_2026-08-26_evening_handoff.md) | Mid-session handoff, 26 August 2026 evening: A1 + the almanac calendar view shipped, the live-sheet sync answer and the import-ready CSV, the image hunt left running, and the two enrichment asks not yet started |

## Prompts (`prompts/`)

Prompts written for Claude Code or other agents (RULE 0: they live here, not in a transcript).

| Doc                                                              | Purpose                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| [`prompts/AUTONOMOUS_KB_LOOP.md`](prompts/AUTONOMOUS_KB_LOOP.md) | **How to run a knowledge-base cycle** with no memory of the last one — the traps, the orienting commands, the sequence for adding a relation, and what "finished" means. Not a second entry point: [`SESSION_RESUME.md`](SESSION_RESUME.md) says what to pick up, this says how |
| [`prompts/pipeline_prompts.md`](prompts/pipeline_prompts.md)     | Generation-pipeline prompt specification             |
| [`prompts/PROMPT_media_pipeline.md`](prompts/PROMPT_media_pipeline.md) | Generalising the image pipeline to all shrines |
| [`prompts/BOOK_QUEUE_TASK.md`](prompts/BOOK_QUEUE_TASK.md) | The scheduled book-queue task's prompt — transcription and notes for the cloud OCR queue |
| [`prompts/INTEGRATION_BRIEF.md`](prompts/INTEGRATION_BRIEF.md) | Integration stage brief: replaces the notes branch of the book-queue routine |
| [`prompts/DESCRIPTION_REWRITE_BRIEF.md`](prompts/DESCRIPTION_REWRITE_BRIEF.md) | Rebuilding a row's `Description` from its shrine entry (ruled 13 October 2026, HANDOVER §9.333) |
| [`prompts/JOIN_CHECK_BRIEF.md`](prompts/JOIN_CHECK_BRIEF.md) | Join check: the proposed new rows against the archive rows (ORDER box step 2, §9.344) |
| [`prompts/QUOTE_BLOCKS_BRIEF.md`](prompts/QUOTE_BLOCKS_BRIEF.md) | Original-script quotations into `> ` blocks (§9.366) — superseded by the next brief |
| [`prompts/URDU_OUT_OF_PROSE_BRIEF.md`](prompts/URDU_OUT_OF_PROSE_BRIEF.md) | English-only prose; Urdu only as poetry (ruled 18 October 2026, §9.368) |
| [`prompts/PUBLIC_DESCRIPTION_BRIEF.md`](prompts/PUBLIC_DESCRIPTION_BRIEF.md) | The public descriptions: a shorter reader facing English and a full Urdu article for each row, from its team version, checked by V1, V2 and V3 (§9.382 to §9.412) |
| [`prompts/public_description_workers_2026-10-28/README.md`](prompts/public_description_workers_2026-10-28/README.md) | The worker briefs of the run that finished the public descriptions (§9.411, §9.412): [writer EN](prompts/public_description_workers_2026-10-28/WRITER_EN.md), [writer UR](prompts/public_description_workers_2026-10-28/WRITER_UR.md), [V1](prompts/public_description_workers_2026-10-28/V1.md), [V1 confirm](prompts/public_description_workers_2026-10-28/V1_CONFIRM.md), [V2](prompts/public_description_workers_2026-10-28/V2.md), [V3](prompts/public_description_workers_2026-10-28/V3.md), [UR fixer](prompts/public_description_workers_2026-10-28/FIXER_UR.md), [UR confirm](prompts/public_description_workers_2026-10-28/CONFIRM_UR.md) |

Elsewhere in the repo: [`../urdu-i18n/README.md`](../urdu-i18n/README.md) (Urdu dictionary +
content pipeline) and [`../data/`](../data/) (canonical dataset, schema, provenance, exports).
- [planning/APPLE_PASS_2026-10-09.md](planning/APPLE_PASS_2026-10-09.md) — the Apple pass: what "professional-grade minimalist" means in this codebase, what shipped on 9 October 2026, and the page-by-page plan for the explorer pages.
- [planning/APPLE_UI_REFINEMENT_PLAN.md](planning/APPLE_UI_REFINEMENT_PLAN.md) — the 15 October 2026 plan (drafted by Antigravity, continued by Claude Code): header tab capsule, Spotlight search, phone contents sheet, motion tokens. Its phases 2–4 are proposals, not shipped.
- [planning/PHONE_COUNCIL_2026-10-15.md](planning/PHONE_COUNCIL_2026-10-15.md) — the phone council of 15 October 2026 (three seats): back-to-close for every overlay, a map sheet and lightbox that follow the finger, recently viewed, Near me, wake lock during tours, install offer; what is unverified and what is not done.

## HANDOVER fragments

`_APPEND_NNN.md` files are §9 entries written by the book-queue sessions as separate files, to be appended to [`HANDOVER.md`](HANDOVER.md). Most are already in it; as of 18 October 2026 four (§9.343, §9.346, §9.358, §9.360) carry text that is not, so they are kept until merged. Delete a fragment once its text is in HANDOVER.md.

- [`_APPEND_318.md`](_APPEND_318.md)
- [`_APPEND_319.md`](_APPEND_319.md)
- [`_APPEND_320.md`](_APPEND_320.md)
- [`_APPEND_321.md`](_APPEND_321.md)
- [`_APPEND_322.md`](_APPEND_322.md)
- [`_APPEND_323.md`](_APPEND_323.md)
- [`_APPEND_324.md`](_APPEND_324.md)
- [`_APPEND_325.md`](_APPEND_325.md)
- [`_APPEND_326.md`](_APPEND_326.md)
- [`_APPEND_327.md`](_APPEND_327.md)
- [`_APPEND_328.md`](_APPEND_328.md)
- [`_APPEND_331.md`](_APPEND_331.md)
- [`_APPEND_343.md`](_APPEND_343.md)
- [`_APPEND_344.md`](_APPEND_344.md)
- [`_APPEND_345.md`](_APPEND_345.md)
- [`_APPEND_346.md`](_APPEND_346.md)
- [`_APPEND_348.md`](_APPEND_348.md)
- [`_APPEND_349.md`](_APPEND_349.md)
- [`_APPEND_350.md`](_APPEND_350.md)
- [`_APPEND_354.md`](_APPEND_354.md)
- [`_APPEND_355.md`](_APPEND_355.md)
- [`_APPEND_356.md`](_APPEND_356.md)
- [`_APPEND_357.md`](_APPEND_357.md)
- [`_APPEND_358.md`](_APPEND_358.md)
- [`_APPEND_360.md`](_APPEND_360.md)
- [`_APPEND_363.md`](_APPEND_363.md)
- [`_APPEND_364.md`](_APPEND_364.md)
- [`_APPEND_365.md`](_APPEND_365.md)
- [`_APPEND_366.md`](_APPEND_366.md)
- [`_APPEND_368.md`](_APPEND_368.md)
- [`_APPEND_381.md`](_APPEND_381.md)
- [`_APPEND_382.md`](_APPEND_382.md)
- [`_APPEND_383.md`](_APPEND_383.md)
- [`_APPEND_400.md`](_APPEND_400.md)
- [`_APPEND_401.md`](_APPEND_401.md)
- [`_APPEND_402.md`](_APPEND_402.md)
- [`_APPEND_403.md`](_APPEND_403.md)
- [`_APPEND_404.md`](_APPEND_404.md)
- [`_APPEND_405.md`](_APPEND_405.md)
- [`_APPEND_406.md`](_APPEND_406.md)
- [`_APPEND_407.md`](_APPEND_407.md)
- [`_APPEND_408.md`](_APPEND_408.md)
- [`_APPEND_409.md`](_APPEND_409.md)
- [`_APPEND_410.md`](_APPEND_410.md)
- [`_APPEND_411.md`](_APPEND_411.md)
- [`_APPEND_412.md`](_APPEND_412.md)
- [`_APPEND_413.md`](_APPEND_413.md)
- [`_APPEND_414.md`](_APPEND_414.md)
- [`_APPEND_415.md`](_APPEND_415.md)
- [`_APPEND_416.md`](_APPEND_416.md)
- [`_APPEND_417.md`](_APPEND_417.md)
- [`_APPEND_422.md`](_APPEND_422.md)
