# A8 — Urdu content delta: measured scope and resume point

**Written 18 August 2026**, after the consolidated CSV was imported into the live sheet
(which un-gated A8). Scope was computed, not estimated.

> **Progress, 18 August 2026 (later the same day): step 1 of the sequencing below is DONE.**
> All five full translations that carry no editorial questions are written and committed —
> `darbar-hazrat-tahir-bandagi-qadri`, `darbar-hazrat-khawaja-feroz-ud-din-gharib-nawaz-chishti-nizami`,
> `darbar-wasif-ali-wasif`, `darbar-ghazi-ilm-din-shaheed`, `darbar-hazrat-shah-gohar-peer`.
> Heading structure verified 1:1 against each English original; zero Latin leaks; both Urdu
> gates green; `npm run verify` green (259 tests). All five are **`reviewed=false`** — a human
> still has to read the Urdu prose (RULE 2).
> Scope now reads **3 full / 74 delta / 94 no-action**. The remaining 3 are the
> editorial-decision-blocked ones (step 3). Next was step 2, the 74 deltas, largest first —
> now done; see the 21 August note below.
> Two measurement bugs found and fixed while doing this — see the tables' note below and
> `docs/HANDOVER.md` §9.

> **Progress, 21 August 2026: step 2 is DONE. All 74 deltas are cleared** — the scope now
> reads **0 delta entries / 0 added chars**, from 74 / 61,635 when it was measured. Three
> commits: `25150d6` (16 largest), `090b30d` (20), `8b9621e` (the last 38). All are
> **`reviewed=false`**; a human still has to read the Urdu prose (RULE 2). `npm run verify`
> green throughout (426 tests). **What is left of A8 is step 3 only**, and it is still blocked
> on `docs/EDITORIAL_DECISIONS_PENDING.md`: `darbar-abul-muali-qadri`,
> `darbar-malik-ahmad-ayaz`, `darbar-mian-qurban-ali-shah`.
>
> Three things that batch established, in order of how much time they will save:
>
> 1. **The delta count does not move when you translate. It moves when you advance the
>    baseline.** `added_chars` is measured against `urdu-i18n/_english_descriptions.json`, so
>    a finished translation still reports as outstanding until that file's `desc` for the slug
>    is replaced with the English it was translated from. This is the same trap in a new
>    costume as the 18 August one recorded below (translating five entries made the remaining
>    work appear to *grow*). Advance the baseline in the same commit as the translation.
> 2. **A `## heading` appended without a blank line before it silently disappears.** Markdown
>    folds it into the preceding paragraph, so the section vanishes from the article *and* from
>    the contents nav, and nothing errors. This happened five times in one sitting, from
>    `cat >>` onto files with no trailing newline. `build_urdu_content.py` now refuses to write
>    when it sees one (and on an odd number of `*`).
> 3. **Paragraph-level diffs hide small deltas.** For the 38 entries under ~800 added chars,
>    most of the real change was a clause inside an existing sentence, while the paragraph-level
>    diff marked whole paragraphs as rewritten because the `=====` artefact's removal re-flowed
>    them. A sentence-level set difference (current English minus baseline, with a 0.93-ratio
>    near-match filter to separate "reworded" from "new") is what made those legible.
>
> And the finding that mattered most editorially: **three entries had Urdu asserting what the
> English had withdrawn.** `allo-mahar`'s English retracted its entire Faiz-ul-Hassan Shah
> biography in favour of an explicit "which of two figures is this?" note with the bibliography
> withdrawn as unreliable — and the Urdu still carried all five sections of the withdrawn
> biography. `gurdwara-tambo-sahib` and `gurdwara-rori-sahib` each told a sakhi as their own
> that the English now attributes to a neighbouring shrine. A delta pass is therefore not only
> additive: **check what the English has removed, not just what it has added.**

Regenerate any time: `python3 pipeline/a8_urdu_delta.py` (add `--check` to assert the
committed scope still matches the live sheet; it exits non-zero if not).
Machine-readable per-entry lists: **`urdu-i18n/a8-scope.json`**.

**Running it without the sheet.** The published sheet is unreachable from the Claude Code web
sandbox — the agent proxy answers `403` to `docs.google.com` (measured 21 August 2026) — and
`--offline`'s CSV (`data/shrines_final_import_2026-08-16.csv`) is gitignored, so it is absent in
a fresh clone. Use **`--snapshot`**, which reads the committed `data/shrines.json`. One caveat,
stated in the script and in the file it writes: the snapshot holds **169 of the sheet's 171
rows**, because `build-dataset` drops rows with empty coordinates. The two it drops
(`darbar-hazrat-shah-gohar-peer`, `darbar-mian-qurban-ali-shah`) are named in the scope file's
new `rows_not_in_source` field rather than silently vanishing from every bucket — which is why
`full_translation` reads 2 there and 3 against the live sheet. `update_log.py` deliberately has
*no* snapshot fallback: its coverage denominator must be the full 171 rows, and counting against
169 would both misreport the percentage and flag the two dropped rows' existing Urdu as orphaned.
It now says so instead of raising `FileNotFoundError`.

---

## The numbers

| Bucket | Entries | English text involved |
|---|---:|---:|
| **Full translation** — live row with no `content/<slug>.md` at all | **8** → **3** | 49,759 → 21,643 chars |
| **Delta** — Urdu exists, English has moved on | **74** | 61,635 added chars |
| **No action** — English unchanged, or differs only by the `=====` artefact | **89** → **94** | — |
| | **171** | |

The second figure in each row is after the five translations landed. Note that getting the
"no action" column to move required a fix: because the 12 July baseline has no entry for a
newly-added shrine, translating one moved it into **`delta`** with `added_chars` equal to the
entire article — so finishing five translations made the reported remaining work *grow*
(74 → 79 deltas, 61,635 → 89,751 chars) until `_english_descriptions.json` was extended with
the English those five were translated from (163 → 168 entries). That also means future English
drift on them is now detectable, which it would not otherwise have been.

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

1. ~~**5 of the 8 full translations**~~ — done 18 August (`tahir-bandagi-qadri`,
   `khawaja-feroz-ud-din`, `wasif-ali-wasif`, `ghazi-ilm-din-shaheed`, `shah-gohar-peer`).
2. ~~**The 74 deltas**, largest first~~ — done 21 August, all 74. `urdu-i18n/a8-scope.json`
   was pre-sorted by `added_chars`; working it in that order put the four a reader actually
   notices (`mauj-darya-bukhari` +3,001, `shah-jamal` +2,579, `shah-inayat-qadiri` +2,213,
   `peer-makki` +1,998) first, and the long tail of sub-800-char clause-level drift last.
3. **The remaining 3 full translations**, once the editorial policy is settled. ← *the only
   step still open, and it is blocked on a human, not on work.*

## Conventions that apply (verified against the pipeline, not assumed)

- Source of truth is `urdu-i18n/content/<slug>.md`; `src/data/urdu-content.json` is **built**
  from it by `build_urdu_content.py`. Never hand-edit the JSON.
- `mergeUrduContent()` (`src/lib/data/urduContentOverride.ts`) overrides the **whole**
  `Description Urdu` per slug, and only when the sheet doesn't already supply one. There is no
  per-paragraph merge — a delta means editing the whole file, not appending a fragment.
- **Bibliography: this doc had it wrong.** It said "Bibliography stays untranslated", because
  `build_urdu_content.py` permits Latin after `## کتابیات` / `## حوالہ جات` / `## حوالے`. But
  that builder is not the binding gate. `npm run data:validate` also runs
  `scripts/data/validate-urdu-leak.mjs`, which allows **zero Latin letters anywhere** in
  `urdu-content.json` — and its own docstring states the real convention: *"this project's
  convention is to omit Bibliography sections from Urdu content entirely."* An untranslated
  bibliography fails `data:validate` even though `build_urdu_content.py` passes it. Measured
  18 Aug 2026 by hitting exactly that failure.
  What the five new files do instead, and why: `data/provenance.json` is stale at 163 rows and
  has **no entry for any of the 8 new shrines**, so `SourcesProvenance` shows them no citations.
  Omitting the bibliography would therefore have left the Urdu reader with no provenance at all
  while the English reader gets one — a real parity loss, not a cosmetic one. So they carry a
  **fully Urdu-script** bibliography: zero Latin, passes both gates, and matches the one
  existing precedent, `urdu-i18n/content/shrine-of-shah-rukn-e-alam.md`.
  Caveat this creates: a Latin-titled source cannot be cited verbatim. Ghazi Ilm Din's entry
  cites an English press article; its title is rendered in Urdu with a note that the original is
  English, which loses the exact search string. Same for any verbatim English quotation — the
  Wasif Ali Wasif entry's "note on the source wording" section describes the ungrammatical
  survey answer in Urdu and points to the English entry for the exact words, because the string
  itself cannot appear.
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
