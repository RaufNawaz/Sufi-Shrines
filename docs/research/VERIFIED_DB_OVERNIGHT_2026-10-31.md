# The verified shrine database: overnight run, 30–31 October 2026

_Session: Claude Code in `C:\Users\g16\Desktop\hybrid-worker`, following
`docs/prompts/hybrid_worker_shrine_existence.md` and `docs/prompts/overnight_verified_shrine_database.md`.
Outputs: `pipeline/gis/shrine_sources/existence_checks/results/` (stage C) and
`pipeline/gis/shrine_sources/verified_db/` (stage D)._

## 1. Questions for Rauf

Each question lists the conservative choice made in the meantime; nothing waits on the answers.

1. **Should a DOAM record count as documented on its own?** DOAM is the government's archaeological
   inventory, the baseline `district_counts` already calibrates against. 635 DOAM-only places found no
   web evidence and are `unconfirmed`. _Meanwhile:_ DOAM counts as one source like any other, so they
   stay `unconfirmed`. Counting DOAM as documented would add up to about 600 places to the final set.
   **Answered the same morning: yes.** The database was rebuilt with a `doam_documented` tier (§7).
2. **How should the 1,727 unconfirmed GeoNames places be checked, if at all?** The web almost never names
   them: 8 of 1,758 were confirmed. The options are a random sample checked by hand on imagery and Google
   Maps (giving an accuracy rate per source), or the Google Places API (about $100 for every place).
   _Meanwhile:_ they stay `unconfirmed`.
3. **For a place only Wikidata records, does its own item's Wikipedia article count as evidence?**
   _Meanwhile:_ no; the article is treated as the record's own page. 10 Wikidata places lost a
   confirmation this way (`existence_report.md`, Stage C checks).
4. **Buddhist and Christian sites** (Mohra Moradu and Jaulian at Taxila; the National Marian Shrine):
   _Meanwhile:_ kept and labelled `buddhist_or_christian_out_of_scope`, outside the final set.
5. **Mumtaz Qadri's tomb, Islamabad (U00203).** OSM calls it a "Darbar" and the photo title says مزار;
   the judge labelled it a secular tomb. _Meanwhile:_ secular, so outside the final set.
6. **Tomri Sahib temple, Gujranwala, is in the union twice** (U00184 from OSM, U02962 from Wikidata), so
   it appears twice in the final set. Joining them would mean rebuilding `sites.csv`, which renumbers
   every place id. _Meanwhile:_ left as two places and recorded here.
7. **Mir Chakar Khan Tomb, Sibi (DOAM).** A Wikipedia snippet puts his tomb at Satghara near Okara.
   _Meanwhile:_ `contradicted`, outside the final set, with the snippet quoted. Which source is right is
   for a person to settle.

## 2. What ran, and when

From `workspace/out/overnight_status.md` in the hybrid worker:

| Time (31 Oct) | Event |
|---|---|
| 23:50 (30th) | New input copied: 3,376 places. The 146 places already gathered were re-keyed by source record ids, and none was dropped. U03342 had no match and had not been gathered. |
| 23:50–00:53 | Evidence gather in source order (DOAM, OSM, Wikidata, GeoNames, OSM tier C). The local model `gemma4:12b` judged in cooling batches of at most 120. |
| 01:08 | Rauf: stop the local model. Ollama was stopped and the GPU freed. The gather continued alone. |
| 01:12 | Claude judge pilot: 54 places, 0 verdicts to change. Batches 001–010 launched. |
| 01:14–04:30 | Judging rounds as evidence arrived: batches 001–030 on Sonnet 5.5 subagents, about 2.2 million subagent tokens. |
| 04:13 | Gather finished: 3,376 of 3,376 places, 0 API errors, no HTTP 429 or 403. |
| 04:30 | Stage C checks, hand spot checks, Stage D build. |

**What stopped early:** nothing was cut by the 07:00 limit; every group (DOAM, OSM, Wikidata, GeoNames,
OSM tier C) was done.

**What changed from the plan:**
- **The local model was replaced by Claude.** `qwen3.5:9b` failed two pilots, and `gemma4:12b` passed one
  but then confirmed 2 of 15 DOAM places wrongly. Rauf then asked for the local model to be stopped and
  allowed Claude usage instead. None of the local model's verdicts are used.
- **Ollama web search was unavailable** all night (HTTP 402).

## 3. Pilots and spot checks

| What | Places | Verdicts I would change |
|---|---|---|
| qwen3.5:9b pilots 1 and 2 | 50 each | 6, then 4 (missed matches): failed |
| gemma4:12b pilot | 50 | 0 |
| gemma4:12b hand check, DOAM confirmations | 15 | 2 verdicts, 2 kinds |
| Claude judge pilot (the 50 pilot places + 4 hard cases) | 54 | 0 |
| Interim: all 3 contradicted + 15 random confirmed | 18 | 0 |
| Final: 30 random confirmed | 30 | 1 (U00330, demoted to plausible) |
| Final: 20 random no_evidence (10 judged, 10 mechanical) | 20 | 0 |
| Final: 9 cross-script + 1 long quote | 10 | 0 |

By verdict type in the final sample: confirmed 1 of 30 changed; no_evidence 0 of 20; contradicted 0 of 3.

## 4. Counts

**Existence check of the 3,376 one-source places:** 124 confirmed, 68 plausible, 3 contradicted, 3,181
no_evidence. By source:

| Source | confirmed | plausible | contradicted | no_evidence |
|---|---|---|---|---|
| DOAM (711) | 50 | 24 | 2 | 635 |
| OSM A/B (831) | 54 | 18 | 1 | 758 |
| OSM tier C (51) | 2 | 2 | 0 | 47 |
| Wikidata (25) | 10 | 1 | 0 | 14 |
| GeoNames (1,758) | 8 | 23 | 0 | 1,727 |

**Tiers (4,009 rows: the 3,689 places of `sites.csv` and the 320 unpinned archive rows):** verified 208,
archive_documented 61, web_confirmed 124, plausible 68, unconfirmed 3,545, contradicted 3.

**The final set (overnight build; §7 has the rebuild):** 368 places (206 verified, 60 archive_documented,
102 web_confirmed). The kind rule
removed 21 secular tombs, 1 mosque, 1 graveyard and 2 Buddhist sites.
- **By tradition:** Muslim 231, Hindu 74, Sikh 48, Jain 4, unknown 11.
- **By province:** Punjab 229, Sindh 81, Khyber Pakhtunkhwa 30, Balochistan 15, Islamabad 4, Azad
  Kashmir 4, Gilgit-Baltistan 2; 1 place has a point but no district, and 2 have no point.
- **Moved from one source to `web_confirmed`:** 124 places, of which 102 are in the final set.

## 5. Checks

**Stage C** (`existence_checks/results/existence_check.json`):
- **Quotes:** every quote is verbatim in its gathered evidence and not from the record's own page. 10
  confirmed → plausible and 14 plausible → no_evidence, mostly the Wikidata rule of question 3.
- **Type conflict:** 1 demotion.
- **Name word missing from the quotes:** 0.
- **Cross-script items checked by hand:** 9, all right.
- **One quote of 25 words or more:** right.
- **Hand override:** 1.
- **Places without a verdict:** 0.

**Stage D** (`verified_db/verified_db_checks.csv`): all 15 pass.
- every place of `sites.csv` appears once (3,689);
- no id repeats;
- the tiers sum to 4,009;
- every `web_confirmed` quote is verbatim and every URL is among the place's results;
- every result is a place of `sites.csv`, and none is a multi-source place;
- `n_independent_sources` agrees with `sources`;
- every `in_final` row is admitted;
- every point is inside Pakistan;
- every place of `sites.csv` has a point;
- there are 208 multi-source places, all `verified`;
- the 169 pinned archive rows and all 489 archive rows appear once each.
- the out-of-scope pattern fires on "Buddhist Monastery" and not on "Buddhu's Tomb".

## 6. Limitations, in plain words

1. **"Unconfirmed" means "not found online", not "not there".** Only Wikipedia, Commons and Wikidata were
   searched, as titles and short snippets, because web search had no credits. Most rural shrines are not
   in them.
2. **The judges are a language model.** Every quote is checked by machine and a sample by hand, but a
   verdict is still a model's reading of the evidence, right about 29 times in 30 on the sample.
3. **A mechanical pass settled half the places** (1,676) on word overlap alone. In the pilot it made no
   error, but a place whose evidence spells its name very differently is never read.
4. **Kind is often a source's word, not a survey.** 123 final places are only "muslim tomb or shrine",
   which can include a noble's tomb. 36 places with evidence have an unclear kind.
5. **The union still has missed links** (question 6), so a few temples or shrines may appear twice.
6. **Places outside the five sources are not here at all.** `district_counts/README.md` estimates that
   all the sources together see perhaps one shrine in seven to ten.

## 7. Rebuilt after Rauf's answer to question 1 (31 October 2026, morning)

Rauf: count DOAM as documented. `build_verified_db.py` now gives a DOAM-only place the tier
`doam_documented`, which the final set admits. Two exceptions keep their tiers: places the existence check
confirmed stay `web_confirmed` (50), and the 2 contradicted stay `contradicted`, so Mir Chakar Khan's tomb
(question 7) is still for a person to settle. The existence check itself did not change.

- **Tiers (4,009 rows):** verified 208, archive_documented 61, doam_documented 659, web_confirmed 124,
  plausible 44, unconfirmed 2,910, contradicted 3. The 659 are the 635 DOAM places with no web evidence
  and the 24 the check found plausible.
- **The final set: 1,025 places** (206 verified, 60 archive_documented, 657 doam_documented, 102
  web_confirmed). Two DOAM places stay out by kind: the Tomb of Mir Shahdad (secular, from its evidence) and
  the Tomb and Mosque of Pir Patho (graveyard).
- **By tradition:** Muslim 708, Hindu 194, Sikh 76, Jain 4, unknown 43. **By province:** Punjab 466, Sindh
  355, Khyber Pakhtunkhwa 96, Gilgit-Baltistan 49, Balochistan 28, Azad Kashmir 18, Islamabad 9; 2 with
  no district and 2 with no point.
- **Checks:** 17 of 17 pass, including two new ones: every DOAM-only place is `doam_documented`,
  `web_confirmed` or `contradicted`, and no other place is `doam_documented`.

**A new question this raises (8).** 473 of the 657 DOAM-documented places in the final set are only
`muslim_tomb_or_shrine`, because DOAM's records say only "muslim". DOAM lists monuments, not shrines, so
these include clan members' tombs in old graveyards (15 names say graveyard or qabristan), numbered or
unknown tombs (9), and 24 Noorbakhshi khanqahs in Gilgit-Baltistan, which are places of prayer. Should
they stay in the final set? _Meanwhile:_ left in, since telling a saint's shrine from a noble's tomb needs
a source, not a name pattern, and `kind` marks them for any study that wants to leave them out.

## 8. The economists' shrine databases (31 October 2026, later)

Rauf asked what data Adeel Malik's and Sultan Mehmood's shrine databases rely on and where it comes from
(`pipeline/gis/shrine_sources/registers/README_academic.md`).

- **Malik and Mirza** built 598 Punjab shrines from the Punjab Auqaf Department's internal list, Auqaf
  and TMA websites, Google searches and Google Maps, Wikipedia, interviews with shrine caretakers and two
  Urdu books. They add the 146 shrines named in the colonial Punjab District Gazetteers and a database of
  shrine families in elections. Only the gazetteer list is published (WP 30, Appendix 1, 142 rows).
- **Mehmood and Seror** count shrines per judicial district. Their Punjab and Sindh counts come from
  colonial gazettes, as compiled by Rinchan Ali Mirza; their Khyber Pakhtunkhwa and Balochistan counts come
  from Auqaf records of about 1950. Nothing at the level of a shrine is published.
- **Added:** the gazetteer list, transcribed (`registers/gazetteer_shrines_malik_mirza.csv`), and matched
  by hand to this database. 29 rows match 33 places, 13 possibly match 14 more, and 100 have no place here.
  The new column `colonial_gazetteer` holds the matches; no tier changed, and 18 of 18 checks pass.

**Question 9.** Should a colonial-gazetteer match count as an independent source for `verified`? It
attests the shrine and its fair around 1880–1930, but the match is by name. Counting it would bring 12
places into the final set: 8 now `unconfirmed` or `plausible`, and 4 unpinned archive rows. _Meanwhile:_
recorded in the column, not counted. **Answered the same day: yes, a match counts.** The rebuild made 24 one-source places
`verified` and brought the final set to **1,037** (230 verified, 58 archive-documented, 649 DOAM-documented,
100 web-confirmed). A `possible` match is still recorded only. 20 of 20 checks pass.

**Then (Rauf: add everything found).** Malik and Mirza's political-shrines table and figure (JEEA online
appendix) are transcribed and matched; a match counts as a source. Five shrines no source here records
(Makhad Sharif, Shah Jewana, Jamal Din Wali, Mau Mubarak, Sandhilianwali) are added without a point. The final
set is **1,044**: 233 verified, 58 archive-documented, 649 DOAM-documented, 4 literature-documented and 100
web-confirmed. 22 of 22 checks pass.

