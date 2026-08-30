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
| [`briefs/TRADITION_LAYER.md`](briefs/TRADITION_LAYER.md) | **Built, gated, and unrendered.** The six non-Sufi traditions the corpus describes and the graph had no word for — what exists, how to render it, and the term-match traps that are recorded as non-memberships |
| [`Shrines_Schema_and_Remediation_Spec.md`](Shrines_Schema_and_Remediation_Spec.md) | Schema revision and remediation spec        |
| [`EDITORIAL_DECISIONS_PENDING.md`](EDITORIAL_DECISIONS_PENDING.md) | The `qa_note` backlog — decisions only a human can make |
| [`allo_mahar_resolution.md`](allo_mahar_resolution.md) | Worked example: resolving a figure mismatch in one entry            |
| [`patch_addendum_hinglaj.md`](patch_addendum_hinglaj.md) | Patch addendum for Shaktipeeth Shri Hinglaj Mata Mandir           |

## Front end

| Doc                                    | Purpose                                                                    |
| -------------------------------------- | -------------------------------------------------------------------------- |
| [`FRONTEND_NOTES.md`](FRONTEND_NOTES.md) | How the front end reads and renders the sheet — including §6, the MapTiler basemap measurements |
| [`REVIEW_ur_prefix_routing.md`](REVIEW_ur_prefix_routing.md) | Review gate for the `/ur/*` prerendered routes       |

## OCR guides (Urdu book pipeline)

| Doc                                                          | Purpose                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`BOOK_OCR_WORKFLOW.md`](BOOK_OCR_WORKFLOW.md)               | Full OCR + translation pipeline setup — Windows / PowerShell |
| [`BOOK_OCR_WORKFLOW_MAC.md`](BOOK_OCR_WORKFLOW_MAC.md)       | Full OCR + translation pipeline setup — macOS                |
| [`LOCAL_OCR_QUICKSTART.md`](LOCAL_OCR_QUICKSTART.md)         | Short "run OCR on a PDF now" recipe — Windows / PowerShell   |
| [`LOCAL_OCR_QUICKSTART_MAC.md`](LOCAL_OCR_QUICKSTART_MAC.md) | Short "run OCR on a PDF now" recipe — macOS                  |
| [`LIBRARY_OCR_SETUP.md`](LIBRARY_OCR_SETUP.md)               | Setting up the library workstation OCR kit                   |
| [`NEW_LAPTOP_OCR_RUNBOOK.md`](NEW_LAPTOP_OCR_RUNBOOK.md)     | Move, OCR, translate, photos — walkthrough on a fresh laptop  |
| [`CLAUDE_DIRECT_EXTRACTION_EXPERIMENT.md`](CLAUDE_DIRECT_EXTRACTION_EXPERIMENT.md) | Measured comparison: reading OCR'd Urdu directly vs the LibreTranslate pipeline |

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
| [`planning/MAP_PIN_DENSITY_2026-08-31.md`](planning/MAP_PIN_DENSITY_2026-08-31.md) | Measured: the opening map view renders 169 sites as 21 shapes |


## Proposals, status and correspondence

Point-in-time documents. Useful as history; **do not read them as current state** — that is
[`HANDOVER.md`](HANDOVER.md) and [`TODO.md`](TODO.md).

| Doc                                                            | Purpose                                                    |
| -------------------------------------------------------------- | ---------------------------------------------------------- |
| [`PROPOSAL_Shrines_Data_Quality.md`](PROPOSAL_Shrines_Data_Quality.md) | Data-quality proposal                               |
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
| [`SESSION_2026-08-27_overnight_handoff.md`](SESSION_2026-08-27_overnight_handoff.md) | Handoff for the overnight run of 26–27 August 2026: every agent-executable task in the 26 August plan closed (A2–A6, A10, B1–B4), five findings the gates produced that were in no plan (the dark theme, the header height, the bundle budgets, three dead images, 86 diverging figure slugs), and the three new tasks waiting on a decision |
| [`SESSION_2026-08-26_evening_handoff.md`](SESSION_2026-08-26_evening_handoff.md) | Mid-session handoff, 26 August 2026 evening: A1 + the almanac calendar view shipped, the live-sheet sync answer and the import-ready CSV, the image hunt left running, and the two enrichment asks not yet started |

## Prompts (`prompts/`)

Prompts written for Claude Code or other agents (RULE 0: they live here, not in a transcript).

| Doc                                                              | Purpose                                              |
| ---------------------------------------------------------------- | ---------------------------------------------------- |
| [`prompts/AUTONOMOUS_KB_LOOP.md`](prompts/AUTONOMOUS_KB_LOOP.md) | **How to run a knowledge-base cycle** with no memory of the last one — the traps, the orienting commands, the sequence for adding a relation, and what "finished" means. Not a second entry point: [`SESSION_RESUME.md`](SESSION_RESUME.md) says what to pick up, this says how |
| [`prompts/pipeline_prompts.md`](prompts/pipeline_prompts.md)     | Generation-pipeline prompt specification             |
| [`prompts/PROMPT_media_pipeline.md`](prompts/PROMPT_media_pipeline.md) | Generalising the image pipeline to all shrines |

Elsewhere in the repo: [`../urdu-i18n/README.md`](../urdu-i18n/README.md) (Urdu dictionary +
content pipeline) and [`../data/`](../data/) (canonical dataset, schema, provenance, exports).
