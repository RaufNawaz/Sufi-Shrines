# The verified shrine database

_Built 31 October 2026 overnight (`docs/research/VERIFIED_DB_OVERNIGHT_2026-10-31.md`) and rebuilt the
same day after Rauf ruled that a DOAM record counts as documented on its own. A research layer, not the archive: nothing here enters the sheet or the site (RULE 3), and no point is moved._

**What it is.** One row per place for every place in `district_counts/sites.csv` (3,689, from the archive,
the DOAM national inventory, OpenStreetMap, Wikidata and GeoNames, joined by the measured matcher), plus
the 320 archive rows without a pin: 4,009 rows. Each row has a **tier** saying how well the place's
existence is established and a **kind** saying what it is. `in_final = yes` marks the places a study can
treat as established shrines, temples, gurdwaras and samadhis.

## Tiers

Rauf's rules: a place two independent sources record is verified (30 October), and a DOAM record documents a
place on its own (31 October). Everything else is the conservative default of 31 October 2026.

| tier                 | rule                                                                                                                                                                         | places |
| -------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -----: |
| `verified`           | two or more independent sources (archive, DOAM, OSM, Wikidata, GeoNames; OSM's tiers count once)                                                                             |    208 |
| `archive_documented` | the archive only, with `support_level` Field-verified or Source-documented                                                                                                   |     61 |
| `doam_documented`    | DOAM only (the government's inventory of protected and listed monuments), unless the check confirmed it (then `web_confirmed`) or contradicted it                            |    659 |
| `web_confirmed`      | one source, and the existence check found a word-for-word quote from an outside page naming it in its locality, surviving the quote, type and name checks and the spot check |    124 |
| `plausible`          | one source other than DOAM; the check found the name but not the locality                                                                                                    |     44 |
| `unconfirmed`        | one source and no outside evidence found, or (archive rows) Source-seeded or Web-compiled                                                                                    |  2,910 |
| `contradicted`       | the check found the place demolished, moved or recorded elsewhere                                                                                                            |      3 |

**`unconfirmed` does not mean a place does not exist.** It means none of the sources searched (Wikipedia
in English and Urdu, Wikimedia Commons, Wikidata) names it in its locality. Most rural shrines have no
presence there, and GeoNames' shrines come from old topographic maps: 1,727 of its 1,758 one-source places
are unconfirmed. `doam_documented` rows keep their `web_verdict` (`no_evidence` 635, `plausible` 24). Treat the tier as how far existence is documented, not as a census.

## The final set (`in_final = yes`)

**1,025 places**: 206 verified, 60 archive-documented, 657 DOAM-documented, 102 web-confirmed. The
admitted tiers lose 22 secular tombs or memorials, 1 mosque, 2 graveyards and 2 Buddhist sites (Mohra
Moradu, Jaulian) to the kind rule; 1,023 have a point (the GeoJSON), and 2 are archive rows without one.
Before DOAM counted (the overnight build) the final set was 368.

| By tradition | places |     | By province            | places |
| ------------ | -----: | --- | ---------------------- | -----: |
| Muslim       |    708 |     | Punjab                 |    466 |
| Hindu        |    194 |     | Sindh                  |    355 |
| Sikh         |     76 |     | Khyber Pakhtunkhwa     |     96 |
| Jain         |      4 |     | Gilgit-Baltistan       |     49 |
| unknown      |     43 |     | Balochistan            |     28 |
|              |        |     | Azad Kashmir           |     18 |
|              |        |     | Islamabad              |      9 |
|              |        |     | no district / no point |  2 / 2 |

By kind: Muslim tomb or shrine (a source says only "muslim") 596, Hindu temple or samadhi 190, Sufi shrine
or saint's tomb 114, Sikh gurdwara or samadhi 71, Jain temple 9, Nanakpanthi or Udasi darbar 8, unclear 37.
`muslim_tomb_or_shrine` includes nobles' tombs a source did not distinguish from saints' shrines.

**What DOAM brings in, and what to watch.** 473 of the 657 DOAM-documented places are
`muslim_tomb_or_shrine`, because DOAM's records say only "muslim". DOAM lists monuments, not shrines, so these
include tombs of clan members in old graveyards ("Tomb of Bahran Faqir at Khoso Graveyard"; 15 names say
graveyard or qabristan), numbered or unknown tombs ("Unknown Tomb No.3 at Arrora Mukam Graveyard", 9), and
24 Noorbakhshi khanqahs in Gilgit-Baltistan (`Khanqah-e-Moallah …`), which are places of prayer. They are
left in: telling a saint's shrine from a noble's tomb needs a source, not a name pattern.

**102 places moved from one source to `web_confirmed`** in the final set (OSM 48, DOAM 40, GeoNames 7,
Wikidata 7).

## What `web_confirmed` rests on

The existence check of 30–31 October (`existence_checks/results/existence_report.md`):

- **The evidence** was gathered by script from free structured APIs: Wikipedia search and geosearch,
  Commons photo geosearch and Wikidata search, at most 12 results per place. Web search was unavailable
  (no credits).
- **A mechanical pass** settled as `no_evidence` the 1,676 places whose results share no distinctive
  word of their names.
- **Claude Sonnet 5.5 subagents** judged the other 1,700 under fixed written rules, from the results shown
  only, quoting word for word.
- **Every quote is machine-checked** against the gathered results. The checks also require that the type
  agrees and that a distinctive name word appears in the quote.
- **Hand checks:** the pilot (54 places) found 0 verdicts to change. The spot check found 1 of 30
  confirmed, now demoted, and 0 of 20 `no_evidence`. So `web_confirmed` is about 97% right on that
  sample: it measures that the judge read the evidence correctly, not that the evidence is complete.
- **The local models** (qwen3.5:9b, gemma4:12b) were tried first and are not used: the first failed its
  pilots, and Rauf stopped the second.

## Columns, checks, rebuild

- **Columns:** every column is in `shrines_verified_codebook.csv`.
- **Coordinates:** each point is the most precise source's own point, named in `coord_source`. No point
  is averaged or moved.
- **Checks:** `verified_db_checks.csv` holds the checks the build runs. The build exits 1 if any fails:
  - every place appears once;
  - the tiers sum to the row count;
  - every `web_confirmed` quote is verbatim in its gathered evidence;
  - every `in_final` row is admitted by the rule;
  - every point is inside Pakistan;
  - every DOAM-only place is `doam_documented`, `web_confirmed` or `contradicted`, and no other place is
    `doam_documented`;
  - the 208 multi-source places are all `verified`;
  - every archive row appears once.
  - the out-of-scope pattern actually matches a known name and not a near miss.

  The 208 is the count of 31 October 2026. If `sites.csv` is rebuilt, its place ids are renumbered, and
  the existence-check results must be re-keyed by source record ids before this runs again.

```bash
python -I pipeline/gis/shrine_sources/verified_db/build_verified_db.py
npx prettier --write pipeline/gis/shrine_sources/verified_db/shrines_verified.geojson  # format:check reads it
```

## Limitations

1. **`unconfirmed` is not absence.** See the tiers above.
2. **Kind comes from three places**, and `note` says which. Where the existence check found evidence that
   names a kind, it comes from that evidence. Otherwise, for archive rows, it comes from the archive's
   category and site_type. For the rest it comes from the source's tradition, which can be wrong: one
   GeoNames shrine is tagged hindu.
3. **Missed links remain in the union.** The check found one pair, Tomri Sahib temple (U00184 and
   U02962), that are the same temple but sit as two one-source places. Both are `web_confirmed`, and the
   temple appears twice in the final set.
4. **Wikidata-only places** were not credited with their own item's Wikipedia articles, a conservative
   choice; 10 places lost a confirmation that way.
5. **Buddhist and Christian sites** are kept, labelled `buddhist_or_christian_out_of_scope`, but left out
   of the final set, a conservative choice.

## Licences

The rows carry OpenStreetMap data (**ODbL 1.0**, © OpenStreetMap contributors), GeoNames (CC BY 4.0),
Wikidata (CC0) and the DOAM inventory (a Government of Pakistan publication), as `district_counts/README.md`
records. The evidence quotes are short excerpts from Wikipedia (CC BY-SA 4.0) and Wikimedia Commons file
titles.
