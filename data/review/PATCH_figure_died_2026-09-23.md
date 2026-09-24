# Sheet patch — `figure_died`, where two or more books agree against the archive

*Ruled by Rauf, 23 September 2026: "patch the sheet where two or more books agree." This is the
record; the ask and the ruling were both in the chat (RULE 5). RULE 3 — an agent does not write to
the sheet, so these are proposals for a human to import.*

Evidence measured across **all 19 consolidated Pass 2 files** in `entries/book_takeaways/`, not
from any one run's reports. Raw extraction kept at `data/review/figure_died_evidence_2026-09-23.txt`.

## The two changes that meet the bar

See `PATCH_figure_died_2026-09-23.csv`. Both are **single-cell edits** — do not run them through
the export/replace-current-sheet path, which is for full snapshots.

| id | `figure_died` now | proposed | books agreeing |
|---|---|---|---|
| `mazar-of-bulleh-shah` | 1757 | **1758** | rafat, shackle |
| `shrine-of-fariduddin-ganjshakar` | 1266 | **1265** | kugle, rafat |

**Bulleh Shah: RULED 23 September 2026 — apply 1758.** Rauf was shown the third value below and
ruled to apply the patch as the two-book rule produces it. The caveat is kept as the record of what
was known when the change was made, not as an open question.

Two books say 1758, but a third —
`schimmel_as_through_a_veil` — prints `Bullhe Shah (d. 1754)` as an index headword (p. 351,
folio 333). So the corpus offers **three** years, not two. The rule as ruled is satisfied, but the
underlying fact is not settled, and 1757 → 1758 replaces one contested number with another. Baba
Farid has no such problem: 1265 is the only competing value, and Eaton's 1335 belongs to Baba
Farid's grandson, not to him.

## What did NOT meet the bar — and why the earlier count was wrong

I put eight conflicting death years to Rauf in the chat. That list came from six workers' end-of-run
reports read together. **Checked against the whole corpus, only two survive.** The others:

| figure | what was claimed | what the corpus actually shows |
|---|---|---|
| Sachal Sarmast | 1826 vs 1827 | **one book only** (rafat). No second source in 19 files. |
| Shah Husain | 1593 vs 1599 | `hadeeqat_ul_aulia` gives **AH** years (1008 AH author, 1013 AH *Miftah al-Arifin*) — not directly comparable to a CE cell, and the book is internally split. Needs a calendar conversion decision, not a patch. |
| Guru Nanak | 1538 vs 1539 | no death-year line matched in any Pass 2 file. The 1538 came from a birth–death range in one book. |
| Guru Arjan | 1605 vs 1606 | **the two books contradict each other**, not the archive: madho_lal read 1605, rafat recorded 1606 as agreeing. Net: no case. |
| Sultan Bahu | 1690 vs 1691 | rafat explicitly records "the death year the book gives matches the archive row" (1631–1691). **No conflict at all.** |
| Waris Shah | 1790 vs 1798 | `tazkirah_awliya_pak_o_hind` gives 1798, agreeing with the archive. Shackle's 1790 sits inside a third party's book title. |
| al-Hujwiri | — | two books give 1072, **agreeing** with the archive; only schimmel_pain_and_grace has 1071. |
| Bahauddin Zakariya | — | two books give 1267, **agreeing**; only Eaton has 1263. |

**The lesson, and it is the recurring one in this project:** eight figures were reported as
conflicts because six reports were read side by side; when the same question was put to all
nineteen files mechanically, six of the eight dissolved — two were the books agreeing with the
archive, one was two books contradicting each other, one was a grandson, one was a calendar
mismatch, and one had no second source. **A conflict counted from summaries is not a measurement.**

## Method, so it can be re-run or disputed

`figure_died` parsed from `pipeline/book_queue/shrine_index.tsv`; each of fifteen distinctive
figures matched by a tight name regex across all 19 Pass 2 files; a year counted only when it falls
within 90 characters after the name AND the line carries a death marker (`d.`, `died`, `death`,
`wafat`, `dies`). A first, looser pass keyed on `principal_figure` tokens was **discarded** — the
token "Muhammad" matched almost every line in the corpus and it returned nonsense. That failure is
recorded here because a wrong instrument that looks like it is working is this pipeline's most
frequent error.

## Not patched, deliberately

Nothing here touches `figure_born`, `year_built` or any `*_note` column, and no value is changed
where only one book disagrees. Both proposed cells carry a real date conflict in the source
literature; if you prefer, the honest alternative to changing either cell is to leave it and put the
competing years in `figure_died`'s note column, which is what CLAUDE.md RULE 2 calls the most honest
content in the archive.
