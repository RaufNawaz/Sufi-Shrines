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
> editorial-decision-blocked ones (step 3). **Next: step 2, the 74 deltas, largest first.**
> Two measurement bugs found and fixed while doing this — see the tables' note below and
> `docs/HANDOVER.md` §9.

> # STEP 2 IS COMPLETE (20 August 2026). The delta backlog is **zero**.
>
> **74 -> 0 deltas; 61,635 -> 0 added English chars.** All 167 rows carrying an Urdu
> article now match the English they were translated from; `pipeline/a8_urdu_delta.py`
> reports 167 no-action. `pipeline/urdu_content_qa.py` is at 0 errors and 0 warnings across
> all 168 content files, with its under-coverage ratchet set to 0.
>
> **What is left of A8 is step 3 only:** the 2 remaining full translations,
> `darbar-abul-muali-qadri` and `darbar-malik-ahmad-ayaz`, plus
> `darbar-mian-qurban-ali-shah` which is absent from the built snapshot for want of
> coordinates. These stay blocked on `docs/EDITORIAL_DECISIONS_PENDING.md` — translating
> them before the English framing is settled means redoing the Urdu prose.
>
> **The one thing that is NOT done: nobody has read any of it.** 53 articles were written
> or corrected on 20 August and every entry in `urdu-i18n/TRANSLATION_LOG.md` is still
> `reviewed=false`. Under RULE 2 this work is drafts. A native reader going through the
> Urdu prose is now the single highest-value action available on the Urdu track — higher
> than any remaining translation.
>
> ## What 53 entries of this work actually taught us
>
> Recorded because it changes how the next person should read the remaining Urdu, and
> because the A8 framing ("the Urdu has fallen behind") turned out to describe only part of
> the problem:
>
> **1. The delta was, almost without exception, the provenance.** What the English had
> added and the Urdu lacked was the corroborating-source paragraph — Alam Faqri's
> *Tazkirah*, Iqbal Qaiser, Majid Sheikh's *Dawn* columns, Kalhoro, Werbner, Schaflechner,
> the Archaeology Department's own listings — together with the Bibliography and the
> visitor figures. The Urdu reader was systematically getting the devotional tradition
> **without the scholarship that tests it**, which is precisely the archive's stated
> distinguishing claim. Not a word-count problem.
>
> **2. Four entries were not stale but *wrong*, and no gate could have seen it.** In rough
> order of severity:
> - `allo-mahar` still carried a ~700-word biography of the wrong man that the English had
>   retracted (`docs/allo_mahar_resolution.md`).
> - `ziarat-kaka-sahib` named Akhund Panju Baba among the saint's teachers; the English
>   says in as many words that he was a contemporary and *not* a teacher.
> - `shrine-of-pir-baba-syed-ali-tirmizi` said the 2008 attack on the shrine "was foiled";
>   the English says militants attacked it and destroyed its inscriptions.
> - `kalat-kali-temple` opened by placing the town "far from Quetta", a distance the
>   English never claims.
>
> **The lesson:** these files were drafted *from* the English and are not independently
> sourced, so anything in the Urdu that is not in the English has no source at all. Read
> the Urdu against its English, not on its own.
>
> **3. Three proper nouns were mistranslated, each in exactly one file.** `peer-makki` had
> دیوان گنج بخش ("Diwan" for "Data") where 14 other files have داتا; `loh-temple` had
> واجد سٹی for "Walled City", which is not a word; `kalat-kali-temple` spelled the town two
> ways. Nothing checks proper-noun consistency across `urdu-i18n/content/`. If a fourth
> instance appears, build the check.
>
> ## Conventions settled by doing the work
>
> - **Bibliographies in Urdu script, with one note at the head of the section**, not per
>   item: "these sources are in English; titles are translated here; see the English entry
>   for the original." Per-item it adds ~300 characters of scaffolding and can push a
>   correct file past the over-coverage threshold.
> - **A finished article lands at 0.90-1.05 of its English length.** Under 0.70 means
>   content is missing; over 1.15 fails the build. This is the fastest single check on a
>   draft.
> - **`--mark` after every article**, or the entry keeps counting as a delta.
> - **URLs cannot appear** (the leak gate forbids all Latin). Name the source and point to
>   the English entry. This contradicts CLAUDE.md i18n rule 6 and needs a decision — see
>   `docs/HANDOVER.md` §9.14.
> - **Where the English hedges, hedge.** Roughly a third of these entries contain an
>   unreconciled contradiction the English deliberately refuses to resolve. Carrying those
>   across intact is most of the job.

---

> **Historical: progress note from earlier the same day. 11 deltas done, backlog 74 -> 61.**
> Added English chars outstanding: 61,635 -> 38,729. Done, largest-gap-first:
> `shrine-of-mauj-darya-bukhari`, `shrine-of-shah-jamal`, `shrine-of-shah-inayat-qadiri`,
> `shrine-of-peer-makki`, `gurdwara-baoli-sahib-guru-arjan-dev-ji-lahore`,
> `valmiki-swamiji-mandir-gracy-lines-rawalpindi`, `tomb-of-qutbuddin-aibak`,
> `khatwari-darbar-shikarpur`, `sant-satram-dham-raharki-sacho-satram-devri-sahib`,
> `shrine-of-hazrat-shah-ali-akbar-shah-ali-akbar-shamsi`, `darbar-ghamkol-sharif-zinda-pir`,
> `lal-kurti-temple-balmiki-mandir-rawalpindi`. All `reviewed=false`.
>
> **Plus one entry that was not on any list and mattered more than all of them:**
> `allo-mahar`'s English had been *retracted* (a biography of the wrong man — see
> `docs/allo_mahar_resolution.md`) and the Urdu still carried the withdrawn text. A8's
> framing — "the Urdu has fallen behind" — cannot see that case at all, because there the
> Urdu is *ahead*. See `docs/HANDOVER.md` §9.11–§9.12.
>
> **What the delta actually consists of, now that eleven have been done.** In every single
> case the missing English was the *corroborating source* paragraph — Alam Faqri's
> *Tazkirah*, Iqbal Qaiser, Majid Sheikh's *Dawn* columns, Pnina Werbner, the Archaeology
> Department's own listing — usually together with the visitor and urs figures, and always
> together with the Bibliography. The Urdu reader was systematically getting the devotional
> tradition **without the scholarship that tests it**, which is precisely the archive's
> stated distinguishing claim. Treat the remaining deltas as a provenance-parity problem,
> not a word-count one.
>
> **Three working notes for whoever continues:**
> - Use `python3 pipeline/a8_urdu_delta.py --offline --mark <slug>` after each article. It
>   copies the current English into the baseline, which is what moves the entry out of the
>   delta bucket and arms drift detection on it.
> - `python3 pipeline/urdu_content_qa.py` is the fast check: Latin leaks, asterisk balance,
>   and the length ratio. A finished article should land at 0.90-1.05 of its English. Under
>   0.70 means content is still missing; over 1.15 fails the build.
> - Say "these sources are in English, see the English entry" **once** at the head of the
>   bibliography, not per item. Per-item it adds ~300 characters of scaffolding and can push
>   a correct file over the over-coverage threshold.
>
> **Next, still largest-first:** `gori-temple-gori-jo-mandar` +1,359, `jain-mandir-lahore` +1,347, `chandragup-baba-chandragup` +1,339, `kalat-kali-temple` +1,338, `gurdwara-chakki-sahib` +1,306, `sant-bhagat-kanwar-ram-temple-chak` +1,279.

Regenerate any time: `python3 pipeline/a8_urdu_delta.py` (add `--check` to assert the
committed scope still matches the live sheet; it exits non-zero if not).
Machine-readable per-entry lists: **`urdu-i18n/a8-scope.json`**.

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
- **Bibliography: SUPERSEDED 20 August 2026 — Latin citations are now allowed.** The project
  head's decision: a Latin citation is fine; English prose is not. `validate-urdu-leak.mjs`
  now checks the article body only and exempts everything from the first bibliography heading
  onward, matching `build_urdu_content.py`, and `pipeline/urdu_content_qa.py` does the same.
  So a source can be cited **verbatim** — its real title, its publisher, its URL — which is
  what an archive whose distinguishing claim is provenance actually needs. `urdu_content_qa`'s
  length ratio is also computed on prose only now, for the same reason: an Urdu bibliography
  may legitimately be much shorter or longer than its English one, and the old full-text ratio
  would have fired on citation practice — or blocked a build for *adding* a source.
  **Consequence worth acting on:** the ~25 bibliographies written on 20 August render their
  English titles in Urdu script with a note pointing at the English entry, which loses the
  exact search string. Those can now carry the original titles. Nothing is broken as it
  stands, so this is an improvement rather than a fix, but it is the single cheapest
  provenance win left on the Urdu track.

  *Historical, for context — the constraint that shaped those files:*
  It said "Bibliography stays untranslated", because
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
