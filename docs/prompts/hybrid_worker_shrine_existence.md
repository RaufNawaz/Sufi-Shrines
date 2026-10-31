# Prompt: confirm that one-source shrine places exist (hybrid worker)

_Written 30 October 2026 for Rauf to paste into Claude Code opened in `C:\Users\g16\Desktop\hybrid-worker`.
Context: Rauf's rule is that a place two independent sources record is verified; a place one source
records may stay, but for research it must be confirmed real. The input is
`pipeline/gis/shrine_sources/existence_checks/places_to_confirm.jsonl` (3,377 places; rebuild with
`export_places_to_confirm.py` beside it). The result comes back to
`pipeline/gis/shrine_sources/existence_checks/results/`._

---

You are the manager in this folder (read CLAUDE.md first; its rules bind you). The job: for each of
3,377 places in Pakistan that only one database records as a shrine, temple, tomb, samadhi or
gurdwara, find out whether outside evidence shows **the place exists**, and **what kind of place it
is**. This is for academic research, so nothing may be invented. A verdict without a word-for-word
quote from a fetched source is not a verdict.

## Input

Copy `C:\Users\g16\Desktop\Shrines Project\pipeline\gis\shrine_sources\existence_checks\places_to_confirm.jsonl`
to `workspace/inputs/places_to_confirm.jsonl`. Do not open it in your own context beyond the first
three lines (it is 3,377 lines). Each line is
`{place_id, names[], tradition, lat, lon, district, province, source, records[{source, id, name, url}]}`.
`source` is the one database that records it: `geonames` (old map labels, coordinates often 150 m to
1 km off), `osm`, `osm (weak tier C)`, `doam` (Pakistan's Department of Archaeology inventory) or
`wikidata`. The record's own page is NOT independent evidence; never count it.

## Stage A: gather evidence with a script (no model, no pages in your context)

Write `gather_evidence.py` (standard library only) that reads the input and, for each place, queries
these free, structured APIs, and writes `workspace/inputs/shrine_evidence.jsonl`:

1. **Wikipedia, English and Urdu**: `https://{en,ur}.wikipedia.org/w/api.php?action=query&list=search&srsearch=<name> <district>&srlimit=5&format=json`
   (title, snippet, page URL), and `list=geosearch&gscoord=<lat>|<lon>&gsradius=1000&gslimit=10` (articles near the point, with distance).
2. **Wikimedia Commons, photos near the point**: `https://commons.wikimedia.org/w/api.php?action=query&list=geosearch&gscoord=<lat>|<lon>&gsradius=500&gsnamespace=6&gslimit=20&format=json`
   (file titles and distance; a photo titled with the place's name within 500 m is good evidence).
3. **Wikidata search**: `action=wbsearchentities&search=<name>&language=en&limit=5&format=json` (label, description, id).
4. **Ollama web search**, only if `OLLAMA_API_KEY` works: try one query first; on HTTP 402 (no credits),
   skip this source for the whole run and record `search_unavailable` in the report. If it works, one
   query per place: `"<name>" <district> Pakistan` (top 5: title, URL, snippet or content, trimmed).

Rules for the script: at most one request per second per host; a User-Agent naming the tool and
`https://raufnawaz.github.io/Sufi-Shrines/` (no e-mail address); cache every response on disk keyed
by URL so a rerun costs nothing; resumable (skip places already written); record API errors per place
rather than stopping. Keep each place's evidence under about 1,500 tokens: at most 12 candidates,
snippets trimmed to 300 characters. Strip HTML tags from snippets. Each candidate:
`{api, title, snippet, url, distance_m (or null)}`. Also try each name in `names` (English and Urdu
spellings both occur). Run it on 20 places first and show me the counts per API before the full run.

## Stage B: the worker judges each place

Task `workspace/tasks/shrine_existence.json`, `items_file: inputs/shrine_evidence.jsonl`. Instruction
(adapt the wording, keep every rule):

> This is one place in Pakistan, as one database records it, with search results gathered about it.
> Decide only from the search results shown. **confirmed**: a result names the same place (allow
> spelling and transliteration differences, English or Urdu) AND puts it in the same locality (the
> same district or town named in the text, or a geosearch result within 500 m). **plausible**: the
> name matches but the locality cannot be told. **no_evidence**: nothing shown is about this place.
> **contradicted**: a result says the place was demolished, moved, or is elsewhere. Copy each quote
> word for word from a result's title or snippet, under 25 words, with that result's URL. The
> database record itself (OpenStreetMap, GeoNames, DOAM, Wikidata entry given in `records`) is not
> evidence. Also say what kind of place the results show it is. If unsure, say unclear. Empty
> evidence with no_evidence is a correct answer.

Schema: `verdict` (confirmed | plausible | no_evidence | contradicted), `kind` (sufi_shrine_or_saints_tomb |
hindu_temple_or_samadhi | sikh_gurdwara_or_samadhi | jain_temple | secular_tomb_or_memorial | mosque_only |
graveyard | unclear), `evidence` [{url, quote}], `note` (one sentence, may be empty).

Test with `--sample 2`, then a 50-place pilot. **Check the pilot yourself**: for 20 pilot places, compare
the item's evidence with the verdict; count verdicts you would change. If more than 2 of 20 are wrong,
fix the instruction and pilot again. Tell me the pilot numbers and the measured seconds per place
before the full run.

## Stage C: check and hand back

After the full run:
- Every `confirmed` or `contradicted` must have at least one quote that appears verbatim in that
  place's evidence and a URL from its candidates; demote any that fail to `plausible` and count them.
- Read `_report.json`; any `ungrounded_quotes` or `unmatched_numbers` flag means you check that item.
- Spot-check 30 random `confirmed` and 20 random `no_evidence` items by hand.

Write `existence_results.csv` (UTF-8, comma): `place_id, verdict, kind, evidence_urls (; separated),
evidence_quotes (" | " separated), apis_with_hits, model, run_date`, and `existence_report.md`: what
ran, per-API hit counts, whether web search was available, verdict counts by `source`, the pilot and
spot-check results, and every limitation. Copy both to
`C:\Users\g16\Desktop\Shrines Project\pipeline\gis\shrine_sources\existence_checks\results\`
and change nothing else in that repository.

Remember when reporting: **no_evidence does not mean the place does not exist**. Many rural shrines
have no web presence; GeoNames records come from old topographic maps. Say so in the report.
