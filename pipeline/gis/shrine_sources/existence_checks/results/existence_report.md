# Existence check of the one-source shrine places: report

_Run 30–31 October 2026 (overnight), from `C:\Users\g16\Desktop\hybrid-worker`, following
`docs/prompts/hybrid_worker_shrine_existence.md` (stages A to C) and
`docs/prompts/overnight_verified_shrine_database.md`. Input: `existence_checks/places_to_confirm.jsonl`,
3,376 places, as exported after the pin import (31 October). Every place has a verdict._

**`no_evidence` does not mean a place does not exist.** It means none of the free structured sources
searched (Wikipedia in English and Urdu, Wikimedia Commons, Wikidata) names it in its locality. Most
rural shrines have no presence there, and GeoNames' records come from old topographic maps. Read
`no_evidence` as "not documented online in these sources", nothing more.

## What ran

1. **Stage A: evidence, gathered by a script** (`method/gather_evidence.py`, standard library). For each
   place and each of its names, it searched English and Urdu Wikipedia (`<name> <district>`; Urdu-script
   names without the Latin district, which cannot match Urdu text; a second search with honorifics
   removed when the first found nothing). It also ran Wikipedia geosearch within 1 km, Commons photo
   geosearch within 500 m, and Wikidata entity search. It made at most one request per second per host,
   sent a User-Agent naming the tool and the project URL, cached every response, and could resume.
   **Ollama web search was unavailable** (HTTP 402, no credits) and was skipped for the whole run.
   The results: all 3,376 places, **0 API errors**, no HTTP 429 or 403. Wikimedia refused about 40% of
   geosearch calls as "too busy", and short retries got every one through. Each place kept at most 12
   results, snippets cut to 300 characters, ranked by shared name words and nearness. The record's own
   page was never kept.
2. **Stage B: judging.** It started on the local model and moved to Claude at Rauf's request:
   - **Local model.** `qwen3.5:9b` failed two pilots: it missed real matches, mostly in Urdu, lists and
     photo titles. `gemma4:12b` then passed the 50-place pilot. 784 DOAM places were judged before
     Rauf asked, at about 01:00, for the local model to be stopped. A hand check of 15 of its DOAM
     confirmations had found 2 wrong verdicts and 2 wrong kinds, and a rerun gave different answers on
     the same hard cases. **None of its verdicts are used.**
   - **The final procedure**, in two steps:
     1. **A mechanical pass** (`method/prefilter_candidates.py`). A place none of whose results shares a
        distinctive word of its names is `no_evidence` without judgement: 1,676 places. Honorifics,
        place-type words and very common name words don't count as distinctive. A name made only of
        common words ("Pir Baba") needs a result holding all of its words, and when the names and a
        result are in different scripts, results within 500 m go through.
     2. **Claude Sonnet 5.5 subagents judged the remaining 1,700**, in 30 batches of 17 to 70
        (`method/judge_instructions.md`). They used only the results shown, with numbered results and
        word-for-word quotes, and no web access.
3. **Stage C: checks** (`method/check_existence.py`), applied in order:
   1. Each quote must appear verbatim (whitespace aside) in the title or snippet of a gathered result
      with the same URL, and that URL may not be the record's own page. For a place only Wikidata
      records, the Wikipedia articles its own item links count as its own page (see the questions).
   2. Type: a temple, gurdwara or samadhi, or a Hindu, Sikh or Jain place, cannot rest on evidence of a
      Sufi shrine or mosque, and a Muslim tomb cannot rest on a temple.
   3. Name: a cited quote must contain a distinctive word of the names. Where the names and quotes are
      in different scripts, this is checked by hand instead.
   4. Corrections from the hand spot check, which may only demote.

## Results per API (Stage A)

| API                             | Places with any result | Results |
| ------------------------------- | ---------------------- | ------- |
| Wikipedia en, search            | 1,883                  | 6,492   |
| Wikipedia en, geosearch 1 km    | 895                    | 3,274   |
| Wikipedia ur, search            | 944                    | 2,008   |
| Wikipedia ur, geosearch 1 km    | 445                    | 1,564   |
| Commons photos, geosearch 500 m | 484                    | 3,719   |
| Wikidata search                 | 807                    | 2,977   |
| Web search (Ollama)             | unavailable (HTTP 402) | 0       |

2,371 places had at least one result; most results are about something else, which is what Stage B is for.

## Verdicts by source (after Stage C and the spot check)

| Source          | Places    | confirmed | plausible | contradicted | no_evidence |
| --------------- | --------- | --------- | --------- | ------------ | ----------- |
| DOAM            | 711       | 50        | 24        | 2            | 635         |
| OSM (tiers A/B) | 831       | 54        | 18        | 1            | 758         |
| OSM weak tier C | 51        | 2         | 2         | 0            | 47          |
| Wikidata        | 25        | 10        | 1         | 0            | 14          |
| GeoNames        | 1,758     | 8         | 23        | 0            | 1,727       |
| **All**         | **3,376** | **124**   | **68**    | **3**        | **3,181**   |

Kinds where there is evidence: Sufi shrine or saint's tomb 68, Hindu temple or samadhi 45, Sikh
gurdwara or samadhi 14, Jain temple 6, secular tomb or memorial 21, graveyard 4, mosque only 1, unclear
36 (the evidence names the place but does not say what it is).

The three `contradicted` (each read by hand):

- **Mari Mata Temple, Karachi:** "razed to the ground".
- **Wangri Garan Temple, Peshawar:** "demolished in 2016".
- **Mir Chakar Khan Tomb, Sibi (DOAM):** a Wikipedia snippet places the tomb of Mir Chakar Rind at
  Satghara near Okara. Here a snippet stands against a government record; it is reported, not resolved.

## Stage C checks

| Check                                                     | Result                                                                                                                                                                                                                                                            |
| --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Quote not verbatim, or from the record's own page         | 10 `confirmed` → `plausible`, 14 `plausible` → `no_evidence`. All but 4 are the Wikidata-only places whose only evidence was their own item's Wikipedia article (the rule above): U02947, U02950, U02958, U02963, U02965, U02966, U02969, U02975, U02976, U02977. |
| Type conflict                                             | 1 `plausible` → `no_evidence` (U00296)                                                                                                                                                                                                                            |
| Name not in any quote                                     | 0                                                                                                                                                                                                                                                                 |
| Names and quotes in different scripts, so checked by hand | 9, all right (U00169, U00195, U00196, U00338, U00600, U00642, U00856, U01155, U03313)                                                                                                                                                                             |
| Quote of 25 words or more                                 | 1 (U00297): verbatim and right, kept                                                                                                                                                                                                                              |
| `ungrounded_quotes` / `unmatched_numbers` flags           | not applicable: the final verdicts are not the worker's. The local model's 7 `unmatched_numbers` flags were all a rounded distance in the `note` field (291 m written as "within 300 meters")                                                                     |

## Pilots and spot checks

| What                                                                     | Places                        | Verdicts I would change                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------------------ | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| qwen3.5:9b pilot 1, 50 places                                            | 50                            | 6 (5 missed, 1 over-confirmed): failed                                                                                                                                                                                                                                             |
| qwen3.5:9b pilot 2, revised instruction                                  | 50                            | 4 missed: failed                                                                                                                                                                                                                                                                   |
| gemma4:12b pilot, revised again                                          | 50                            | 0, plus 2 quotes not verbatim (caught by Stage C)                                                                                                                                                                                                                                  |
| gemma4:12b hand check of 15 DOAM confirmations                           | 15                            | 2 verdicts, 2 kinds: instruction revised, then local model stopped by Rauf                                                                                                                                                                                                         |
| **Claude judge pilot** (50 pilot places + 4 hard DOAM cases)             | 54 (26 judged, 28 mechanical) | **0**                                                                                                                                                                                                                                                                              |
| Interim hand check (all 3 contradicted + 15 random confirmed)            | 18                            | 0                                                                                                                                                                                                                                                                                  |
| **Final spot check: 30 random `confirmed`**                              | 30                            | **1**: U00330 "Hanuman Temple", Karachi, demoted to `plausible` (Hanuman is a deity name shared by several Karachi temples; the snippet does not show it is this one). One kind is off (U03416, Bodhesar temples: `hindu`, though the photos do not say and DOAM calls them Jain). |
| **Final spot check: 20 random `no_evidence`** (10 judged, 10 mechanical) | 20                            | **0**                                                                                                                                                                                                                                                                              |

On these samples, `confirmed` is right about 29 times in 30 (97%; with 30 draws, the error rate could
plausibly be as high as about 15%). `no_evidence` is right 20 times in 20. What that measures is that
the judge read the evidence correctly, not that the evidence is complete.

## Limitations

1. **`no_evidence` is not absence.** 3,181 places, 94%, have no documented trace in these sources,
   including 1,727 of the 1,758 GeoNames places. GeoNames' shrines come from old topographic maps, and
   rural shrines rarely have a Wikipedia article or a Commons photo.
2. **Web search was unavailable** (no Ollama credits). Newspapers, blogs, Google Maps and government
   sites were never searched, so the check sees only Wikimedia projects.
3. **Snippets, not pages.** Judges saw 300-character snippets and titles, never full articles, so a
   place mentioned deep inside an article and not in its snippet is missed.
4. **The mechanical pass relies on word overlap.** A place whose only evidence spells its name very
   differently (beyond about 80% character similarity), or names it only by a title or epithet, is
   settled as `no_evidence` without a reader. In the pilot it settled 28 places and erred on none; a
   name made only of common words, with no result holding all of them, is never read.
5. **Type agreement relies on the source's tradition field, which can be wrong.** U02169 ("Darbar Hafiz
   Jammat Ali Shah", GeoNames, tradition hindu) has Commons photos of Pir Syed Jamat Ali Shah's tomb
   301 m away but is `no_evidence` by the type rule.
6. **Kind is often `unclear`** (36 of 195 places with evidence): the snippet names the place without
   saying what it is. The kind, where given, is the evidence's word, not a survey.
7. **Wikidata-only places:** their own item's Wikipedia articles were not counted (conservative; a
   question for Rauf). Ten places lost a confirmation this way.
8. **Missed links in the union show up here.** U00184 (OSM "Mandir Tomri Sahab") and U02962 (Wikidata
   "Tomri Sahib Temple") are the same temple, each confirmed by the same photo; the union left them as
   two one-source places. Others like it are likely.
9. **Judges are a language model.** Sonnet subagents read the evidence under fixed rules and every quote
   is machine-checked, but the verdicts are a model's reading, measured by the spot checks above, not a
   person's.

## Files

`existence_results.csv` holds one row per place, in the columns the prompt specified.
`existence_evidence_cited.jsonl` holds the gathered results behind every verdict other than
`no_evidence`, so that the quotes can be rechecked without the hybrid worker. `spot_check_overrides.csv`
holds the hand correction. `existence_check.json` holds every count and demotion, with place ids.
`method/` holds the scripts and the judging instructions that produced them.
