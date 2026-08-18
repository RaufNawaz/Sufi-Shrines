# Documentation Index

Reference documentation for the Sufi Shrines project. Start with the root
[`README.md`](../README.md) (overview, quick start) and [`CLAUDE.md`](../CLAUDE.md)
(architecture, i18n rules, working conventions).

## Reference

| Doc                                        | Purpose                                                                         |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| [`HANDOFF.md`](HANDOFF.md)                 | Maintainer handbook: scripts, architecture, data updates, deploy, environment   |
| [`DATA_DICTIONARY.md`](DATA_DICTIONARY.md) | Dataset field reference, controlled vocabularies, validation rules              |
| [`DATA_RELEASE.md`](DATA_RELEASE.md)       | Producing a citable data release and minting a DOI (Zenodo / Harvard Dataverse) |
| [`KG_VOCABULARY.md`](KG_VOCABULARY.md)     | Custom `sufi:` vocabulary used in the knowledge-graph exports (JSON-LD / RDF)   |
| [`CORRECTIONS_WORKFLOW.md`](CORRECTIONS_WORKFLOW.md) | How to report and process a factual correction to shrine content     |

## OCR guides (Urdu book pipeline)

| Doc                                                          | Purpose                                                      |
| ------------------------------------------------------------ | ------------------------------------------------------------ |
| [`BOOK_OCR_WORKFLOW.md`](BOOK_OCR_WORKFLOW.md)               | Full OCR + translation pipeline setup — Windows / PowerShell |
| [`BOOK_OCR_WORKFLOW_MAC.md`](BOOK_OCR_WORKFLOW_MAC.md)       | Full OCR + translation pipeline setup — macOS                |
| [`LOCAL_OCR_QUICKSTART.md`](LOCAL_OCR_QUICKSTART.md)         | Short "run OCR on a PDF now" recipe — Windows / PowerShell   |
| [`LOCAL_OCR_QUICKSTART_MAC.md`](LOCAL_OCR_QUICKSTART_MAC.md) | Short "run OCR on a PDF now" recipe — macOS                  |

## Planning (`planning/`)

Roadmaps and runbooks; some are kept for history after implementation.

| Doc                                                                            | Purpose                                                                           |
| ------------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| [`planning/TODO.md`](planning/TODO.md)                                         | Live working checklist for the dataset and app                                    |
| [`planning/DELEGATED_EXECUTION_PLAN.md`](planning/DELEGATED_EXECUTION_PLAN.md) | Bounded Urdu-aesthetic + feature tasks specced for GPT-Codex-class/cheaper models |
| [`planning/EXECUTION_PLAN.md`](planning/EXECUTION_PLAN.md)                     | Ordered milestones threading the backlog and roadmap together                     |
| [`planning/PROJECT_VISION.md`](planning/PROJECT_VISION.md)                     | Blue-sky roadmap (Track 0 = Urdu parity; Tracks 1–8 = the future)                 |
| [`planning/DESIGN_VISION.md`](planning/DESIGN_VISION.md)                       | Aesthetic direction (palette, type, marginalia signature) + blue-sky features F1–F10 |
| [`planning/URDU_IMPLEMENTATION_PLAN.md`](planning/URDU_IMPLEMENTATION_PLAN.md) | Phased Urdu-parity plan (implemented — historical reference)                      |
| [`planning/ENRICHMENT_RUNBOOK.md`](planning/ENRICHMENT_RUNBOOK.md)             | Per-run procedure for enriching the shrines workbook (descriptions, rows, images) |
| [`planning/TOURS_FUTURE_PLAN.md`](planning/TOURS_FUTURE_PLAN.md)               | Guided-tours experience roadmap (phases 1–5 implemented)                          |
| [`planning/DATA_QUALITY_PLAN.md`](planning/DATA_QUALITY_PLAN.md)               | Detailed plan: description content provenance, citations, fact-verification (Track 6) |

Elsewhere in the repo: [`../urdu-i18n/README.md`](../urdu-i18n/README.md) (Urdu
dictionary + content pipeline) and [`../data/`](../data/) (canonical dataset, schema,
provenance, exports).
