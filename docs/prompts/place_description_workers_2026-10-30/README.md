# The worker prompts that wrote the Lahore pilot (30 October 2026)

These are the prompts and helpers exactly as the Lahore run used them (HANDOVER §9.423). They name
Lahore, a five part split and the cloud scratch folders `/home/claude/work/...`; for another place,
copy them, change the slug, the assignment lines and the folder, and keep everything else. The binding
rules are in `docs/prompts/PLACE_DESCRIPTION_BRIEF.md`; these files only apply them.

## The order, and what each step cost on Lahore

| step | prompt | workers | notes |
|---|---|---|---|
| 1 | `1_section_drafter.md` | 5, one per group of books (80,000 to 180,000 characters of source each) | each part checked with `check_place_description.py team <slug> --draft-dir <scratch>`; parts 25,000 to 103,000 characters |
| 2 | `2_composer.md` + `compose_coverage.py` | 4, one per group of headings | merges the parts heading by heading; the coverage script proves no citation and no verse was lost |
| 3 | `3_english_only_pass.md` | as needed | three of the five drafters quoted Urdu prose against the 18 October rule; the composers of those groups removed it, logging every quotation and its English |
| 4 | `4_overview_and_disagreements.md` | 1 | Overview cited only from the body; Where the Sources Disagree merged from the parts plus the composers' finds |
| | coordinator | | assemble, one bibliography (de-duplicated), `check_place_description.py team <slug>` exit 0 |
| 5 | `5_public_writer.md` + `public_trial.py` | 4, one per heading group | public 0.58 of the team version on Lahore |
| 6 | `6_V1.md` | 4 per round, then 1 confirming worker per later round | Lahore took four rounds: round 1 found 23 faults across the groups, rounds 2 and 3 each caught faults the previous fixes introduced (a doubled sentence, a broken referent) |
| 7 | `7_urdu_writer.md` + `urdu_trial.py` | 4 | |
| 8 | `8_V2.md`, `9_V3.md` | 8 (4 + 4) | round 1: V2 found 1 to 8 issues a group, V3 22 to 80 |
| 9 | `10_urdu_fixer.md` | 4 | the writers applied the fixes, rejecting any V3 fix that changed a fact the English states |
| 10 | `11_V2_V3_confirming.md` | 4, then 1 | round 2 caught 5 faults the fixes introduced; round 3 passed |

The coordinator records every round: each verifier reply in `entries/places_public/verify/`, the
combined report per round, the changes file, then `place_description_queue.py verdict`. Everything is
written to the PC the moment it exists.

## What the pilot taught (also folded into the brief)

- **Prose is English only** (18 October 2026). Say so in the drafter's prompt; the first Lahore prompt
  asked for Urdu quotations and three of five drafters followed it.
- **An `[OCR?]` inside a verse line is allowed** (`check_description_draft.is_verse` strips it before
  testing for Latin). A worker who removes it makes the line a run the sources do not contain, and Q1
  fails.
- **A confirming round is never skipped.** On Lahore every round of fixes introduced at least one new
  fault, in both languages.
- **Per group verifiers on a long article work**, as long as the round's verdict is the conjunction:
  the round fails if any group fails, and the combined report is saved as the round's one file.
- **One spelling per name across the parts.** Four Urdu writers chose differently for سید / سیّد and
  بھدر / بہدر کالی; the coordinator normalised them before V2 and V3 confirmed.
