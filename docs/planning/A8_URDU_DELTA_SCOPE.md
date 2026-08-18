# A8 — Urdu content delta: measured scope and resume point

**Written 18 August 2026**, after the consolidated CSV was imported into the live sheet
(which un-gated A8). Scope was computed, not estimated. **No translation has been drafted
yet** — this is the analysis A8 step (1) asks for, and the resume point for steps (2)–(4).

Regenerate any time: `python3 pipeline/a8_urdu_delta.py` (add `--check` to assert the
committed scope still matches the live sheet; it exits non-zero if not).
Machine-readable per-entry lists: **`urdu-i18n/a8-scope.json`**.

---

## The numbers

| Bucket | Entries | English text involved |
|---|---:|---:|
| **Full translation** — live row with no `content/<slug>.md` at all | **8** | 49,759 chars |
| **Delta** — Urdu exists, English has moved on | **74** | 61,635 added chars |
| **No action** — English unchanged, or differs only by the `=====` artefact | **89** | — |
| | **171** | |

## Three things the task description got wrong

A8 was written before the import and estimated its own scope. All three corrections are
load-bearing, so a future session doesn't re-derive them:

**1. The baseline is not the import.** A8 frames the work as translating "the 16 Aug
enrichment." But the correct question is *what has the Urdu never seen*, and the Urdu was
translated from `urdu-i18n/_english_descriptions.json` — a **12 July** snapshot. English moved
on twice since: the 9–10 August work and the 16 August enrichment. Diffing the import alone
would have missed 23 entries whose Urdu has been stale since before this session's work began.

**2. 87 of the apparently-stale entries are not stale.** They differ from the July baseline
*only* by removal of the `=====…` separator artefact
(`docs/STATUS_AND_ROADMAP.md` §1.2 — "158 entries: a separator artefact leaking into the public
description field"). 110 entries looked like drift; 87 were this. Their Urdu is fine and needs
nothing. Without normalising for it, A8 would have looked roughly three times larger than it is.
**The Urdu files never carried the artefact** — verified, zero occurrences across all 163.

**3. Eight entries have no Urdu at all, not four.** A8 anticipated the 4 brand-new 16 August
shrines. There are 8: those 4, plus the 4 field-survey shrines added on **10 August** that never
got `content/*.md` files. `urdu-i18n/content/` has 163 files against 171 live rows.

The 8, with the English they need (largest first) — these are the highest priority, because for
them the Urdu article view has *nothing* to fall back to:

| slug | English chars |
|---|---:|
| `darbar-abul-muali-qadri` | 9,360 |
| `darbar-malik-ahmad-ayaz` | 6,909 |
| `darbar-hazrat-tahir-bandagi-qadri` | 5,906 |
| `darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami` | 5,882 |
| `darbar-wasif-ali-wasif` | 5,697 |
| `darbar-mian-qurban-ali-shah` | 5,374 |
| `darbar-ghazi-ilm-din-shaheed` | 5,363 |
| `darbar-hazrat-shah-gohar-peer` | 5,268 |

Note the overlap with `docs/EDITORIAL_DECISIONS_PENDING.md`: three of these eight are the
entries carrying the largest `qa_note` contradiction lists, and two carry the sensitive
material. **Translate those three last**, after the editorial policy in that document is
decided — otherwise the Urdu prose has to be redone when the English framing changes.

## Sequencing (recommended)

1. **5 of the 8 full translations** — the ones with no editorial questions outstanding
   (`tahir-bandagi-qadri`, `khawaja-feroz-ud-din`, `wasif-ali-wasif`, `ghazi-ilm-din-shaheed`,
   `shah-gohar-peer`).
2. **The 74 deltas**, largest first — `urdu-i18n/a8-scope.json` is pre-sorted by `added_chars`.
   The top of that list (`shrine-of-mauj-darya-bukhari` +3,001, `shrine-of-shah-jamal` +2,579,
   `shrine-of-shah-inayat-qadiri` +2,213, `shrine-of-peer-makki` +1,998) is where a reader
   actually notices the gap.
3. **The remaining 3 full translations**, once the editorial policy is settled.

## Conventions that apply (verified against the pipeline, not assumed)

- Source of truth is `urdu-i18n/content/<slug>.md`; `src/data/urdu-content.json` is **built**
  from it by `build_urdu_content.py`. Never hand-edit the JSON.
- `mergeUrduContent()` (`src/lib/data/urduContentOverride.ts`) overrides the **whole**
  `Description Urdu` per slug, and only when the sheet doesn't already supply one. There is no
  per-paragraph merge — a delta means editing the whole file, not appending a fragment.
- **Bibliography stays untranslated.** `build_urdu_content.py` permits Latin script only after
  `## کتابیات` / `## حوالہ جات` / `## حوالے`, and **fails the build** on Latin anywhere before it.
  That is the existing convention A8 told us to verify; it is enforced mechanically.
- Numbers stay Western in stored text — the Eastern-numeral toggle converts at render.
- Honorifics per `data/glossary.csv`; naming conventions in `urdu-i18n/README.md`.

## Definition of done (from A8, unchanged)

`npm run data:validate` green (dictionary `--check`, tours, Urdu parity, no-leak gates);
per-entry diff list in the PR body — `urdu-i18n/a8-scope.json` is that list;
**a human signs off on the Urdu prose before merge.** Machine translations are drafts until
reviewed (RULE 2). `urdu-i18n/TRANSLATION_LOG.md` tracks `reviewed=false` per shrine.

## One risk that no longer applies

Before the import, drafting Urdu for content that wasn't live in English yet would have put the
Urdu view *ahead* of the English one, since `urdu-content.json` ships in the bundle. The import
happened on 18 August, so this is moot — regenerate freely.
