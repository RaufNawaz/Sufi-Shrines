# Shrines per district, beyond the archive

_Built 30 October 2026 (HANDOVER §9.434). Leads, not entries (RULE 2): nothing here enters the
archive or the sheet._

**Why.** The viewer's "Test a conjecture" regressed welfare on the archive's counts: 168 pinned
sites of 489 rows. Those count where the archive has looked as much as where shrines are. This
folder counts shrines per district from every source we can reach, separately and as a
deduplicated union. It says how far each count can be trusted, and checks the archive's own pins
against the other sources.

## Run

From the repo root, with the gis venv (`~/.venvs/gis312/Scripts/python`):

```bash
# fetch (≈2 min each; Overpass wants a User-Agent); kept in pipeline/gis/sources/shrine_dbs/counts/
curl -sf -m 700 -A "ShrinesArchiveResearch/1.0" --data-urlencode "data@pipeline/gis/shrine_sources/overpass_counts.ql" \
  https://overpass-api.de/api/interpreter -o pipeline/gis/sources/shrine_dbs/counts/osm_counts.json
curl -sf -m 700 -A "ShrinesArchiveResearch/1.0" --data-urlencode "data@pipeline/gis/shrine_sources/overpass_effort.ql" \
  https://overpass-api.de/api/interpreter -o pipeline/gis/sources/shrine_dbs/counts/osm_effort.json
python pipeline/gis/shrine_sources/district_counts/build_district_counts.py   # exits 1 on a hard check
python pipeline/gis/shrine_sources/district_counts/calibrate.py
python pipeline/gis/shrine_sources/district_counts/validity.py
python pipeline/gis/shrine_sources/district_counts/archive_location_check.py
python pipeline/gis/viewer/build_viewer.py                                     # puts the counts in the viewer
```

## Outputs

| File                                                                            | What                                                                                                                                                                                                                                                          |
| ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `district_counts.csv`                                                           | Per district: `n_archive`, `n_osm_A/B/C`, `n_geonames`, `n_wikidata`, `n_doam`, the union (`n_union_ab` excludes OSM tier C; `n_union_abc` includes it), the union by tradition, `n_osm_pow_effort`, capture-recapture columns, per-capita and per-area rates |
| `province_counts.csv`                                                           | The same per province and for Pakistan, with the Chapman estimate                                                                                                                                                                                             |
| `sites.csv`                                                                     | One row per source record: tier, rule, tradition, district, and `place` (the union id)                                                                                                                                                                        |
| `osm_rules.csv`                                                                 | How many OSM elements each classification rule took or dropped                                                                                                                                                                                                |
| `calibration_offsets.csv`, `calibration_recall.csv`, `calibration_estimate.csv` | Every source measured against the DOAM inventory (below)                                                                                                                                                                                                      |
| `validity_convergent.csv`, `validity_effort.csv`                                | The two validity measurements below                                                                                                                                                                                                                           |
| `archive_location_check.csv`                                                    | Every archive pin against the independent records of the same place                                                                                                                                                                                           |
| `not_same_place.tsv`                                                            | A person's "these are two places" verdicts; the union never joins them                                                                                                                                                                                        |
| `checks.csv`                                                                    | Every invariant and measurement of the last build                                                                                                                                                                                                             |

## Sources, and what each is good for

| Source                                                            | Records counted                                                 | Good for                                                                         | Not good for                                                                                          |
| ----------------------------------------------------------------- | --------------------------------------------------------------- | -------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Archive                                                           | 168 pinned (320 unpinned rows not placed)                       | Verified detail                                                                  | Counting: curated, not a census                                                                       |
| OpenStreetMap, wide pull (`overpass_counts.ql`)                   | 1,191 (A 375, B 685, C 60 before dedup)                         | Location: median 22 m from archive pins                                          | Even coverage: mapping follows wealth (below)                                                         |
| Wikidata                                                          | 92                                                              | Location (19 m); identity                                                        | Coverage: notable sites only                                                                          |
| GeoNames (SHRN/TMB/TMPL)                                          | 1,855                                                           | Counting rural sites; coverage independent of OSM                                | Location: median 148 m, p90 1,082 m. Never votes on a pin                                             |
| **DOAM national inventory** (Department of Archaeology & Museums) | 1,034 tombs, shrines, temples, samadhis, gurdwaras (857 places) | **The baseline**: official, a point and a district for every site, 12 m from OSM | Coverage: historic monuments, not living shrines; uneven by province (`registers/README_heritage.md`) |
| Auqaf registers (Punjab 480 named of 548 stated, Sindh 80)        | not counted by district                                         | Official existence of state-administered shrines                                 | Districts: Punjab's is by Auqaf zone, and no entry has coordinates (`registers/README_auqaf.md`)      |

## How OSM was classified (`classify_osm.py`), and how well

The wide pull returns 2,794 elements: every element the old `overpass.ql` returned (773) plus roads,
villages, restaurants, churches and mosques named after shrines. Each element gets a tier and the
rule that decided it:

- **A**: the tags say tomb, shrine, temple, gurdwara (`historic=tomb`, `building=shrine`, a
  non-Muslim place of worship...).
- **B**: a site-like tag and a decisive name word (darbar, mazar, dargah, ziarat, khanqah,
  maqbara, samadhi, mandir, gurdwara...), in Latin or Urdu script.
- **C**: a Muslim or untagged place of worship named for a person with a saint's honorific
  (Pir, Baba, Sakhi, Hazrat...) and no mosque word.

**Precision, measured by reading random samples (30 October 2026):** A **25 of 25** are religious
or funerary sites (some secular tombs, e.g. Gulbahar Begum's, so A means "tomb or temple", not
"site of devotion"). B **48 of 50** are shrines (one dhaba named "Darbar", one graveyard named
"Darbar Qabristan"; both now dropped by name). C about **16–18 of 25** (≈ 65–70%); C is counted
separately and left out of `n_union_ab`.

Traps the samples found, each now a rule: 14 darbars carry `religion=shinto` (an editor preset
called "shrine"), so their names are read instead; **درگاہ sits inside بندرگاہ** (a port), **مندر
inside سمندری** (Samundri), "mazar" inside the surname Mazari, so every keyword is matched as a whole
word; Gurumandir is a Karachi neighbourhood; "X Shrine Mosque" is the mosque beside a shrine (13 of
15 audited), so it is dropped unless it also says tomb or khanqah; Waris Shah's tomb is tagged only
`historic=heritage`.

## The union (`n_union_*`)

One place per real site. Records join when the measured matcher of `build_external_sites.py`
(97% precision on `match_gold.tsv`) agrees on the name, needing more agreement the farther apart
they are (0.6 up to 300 m, 0.75 up to 1 km, 0.9 up to 2 km, because GeoNames' points are coarse);
an OSM node and way within 50 m are one building; never across two different known traditions.

**Cannot-link constraints**, added after reading the largest clusters: a place never holds two
archive rows, two Wikidata items, or two traditions, and links apply nearest first. Without them,
union-find chained Shah Jamal to Shah Kamal (two archive rows), Prahladpuri Temple to Bahauddin
Zakariya, and Ranjit Singh's samadhi to his son's. Proximity links also need a shared _distinctive_
word, not an honorific. **Still merged, known:** tombs inside one complex: Makli's Tarkhan tombs, the
samadhis beside Ranjit Singh's, Sadhu Bela's temples. About ten places nationally.

**Link precision:** 23 of 25 sampled OSM–GeoNames links are the same place.
**Missed links:** of 40 sampled GeoNames records with an unlinked OSM shrine within 2 km, about 8
were plainly the same place (Kirio Qubba and Shaikh Kirhyo tomb at 32 m; Barri Shah Latif and Bari
Imam), and about 5 more possibly. The union therefore over-counts by roughly 30–45 places, about 1%.

## How far the counts can be trusted for a conjecture (`validity.py`)

**The sources do not rank districts alike.** Spearman, per person, across the 135 districts with a
census population: OSM vs GeoNames **0.09** (p = 0.28), archive vs GeoNames 0.16, archive vs OSM
0.58 and archive vs Wikidata 0.63. The archive was partly built from those last two, so their
agreement is not independent confirmation.

**OSM's mapping follows wealth.** The mapped mosques per district (`n_osm_pow_effort`, which tracks
population, not shrines) rise **0.78** in log(1+count) per standard deviation of the Relative
Wealth Index, holding population fixed. OSM shrine counts rise 0.50; with mapping effort
controlled, 0.30 (HC1 s.e. 0.10). **GeoNames runs the other way: −0.38** (−0.51 with effort), with
more shrines in poorer, more rural districts, as old topographic maps would. The sign of a
shrines-welfare result can therefore depend on the source. The viewer's workbench says so under
any result that uses these counts, and asks for the effort control.

**What all the sources miss.** OSM (A+B) and GeoNames (Muslim and unknown-tradition) share 50
places nationally, of 1,007 and 1,775. Chapman's two-list estimate is about **35,000** (95% CI
26,000–44,000). Correcting for the missed links above (true overlap ≈ 80–100) gives roughly
18,000–22,000. Two-list estimates assume the lists are independent; both favour famous shrines,
which biases the estimate down. So read it as an order of magnitude: **Pakistan has tens of
thousands of shrines, and every source here together sees perhaps one in seven to one in ten.**
Per district the overlap is too small for an estimate (one district has ≥ 7 shared places).

## The official baseline: the DOAM inventory (`calibrate.py`)

Rauf (30 October 2026): find a verified source, use it as the baseline, adjust the others to it, and
use it to check the archive. No official body publishes shrines by district online
(`registers/README_auqaf.md`). The **Department of Archaeology & Museums' national inventory** is
the one official list with a district and a point for every site: 6,200 records, of which 1,034
are tombs, shrines, temples, samadhis and gurdwaras (`registers/README_heritage.md`). Only its
rows are counted (`n_doam`); the other heritage lists overlap it and are not stacked.

**Its points are accurate.** Where a DOAM record and another source's are one place, the median
distance is **12 m to OSM** (p90 150 m) and 11 m to Wikidata (p90 555 m), but 41 m to the archive with a p90 of
**1,199 m**: the archive has a tail of misplaced pins (below). DOAM therefore votes on archive pins.

**It is not biased by mapping effort.** Its counts correlate with OSM's mapped mosques at 0.16
(n.s.), against 0.39 for OSM's own shrines. Like GeoNames, it is denser in poorer districts
(−0.24 per s.d. of RWI).

**What the other sources hold of it** (`calibration_recall.csv`): of DOAM's 857 places, every other
source together holds **16.9%** (OSM 12%, GeoNames 5.6%, archive 6%, Wikidata 5%); Punjab 27%,
Sindh 8%. Read by hand: of 30 unlinked DOAM sites with another record within 500 m, about 4–6 were
the same place under another spelling (Mian Moosa / Mian Musa Muqam, 17 m), so the true figure is
nearer **19–20%**. The rest are genuinely absent: Makli's numbered tombs, Shigar's khanqahs,
village temples.

**The adjustment** (`calibration_estimate.csv`). DOAM is one list and every other source together
the second; of DOAM's Muslim places, the share the others hold is their recall, and Chapman's
two-list estimate is the others' count adjusted by it:

|                    | DOAM | Others | Both | Recall | Estimate (95% CI)        |
| ------------------ | ---- | ------ | ---- | ------ | ------------------------ |
| Punjab             | 224  | 1,002  | 87   | 0.39   | **2,563** (2,166–2,961)  |
| Sindh              | 285  | 366    | 21   | 0.07   | 4,770 (2,954–6,586)      |
| Khyber Pakhtunkhwa | 54   | 219    | 8    | 0.15   | 1,343 (597–2,090)        |
| **Pakistan**       | 635  | 1,745  | 121  | 0.19   | **9,101** (7,706–10,496) |

Other provinces share fewer than 7 places, too few for an estimate. **These are floors.** DOAM
lists monuments, which every source finds most easily, so the others' recall of shrines in general
is lower than their recall of DOAM's, and the true count higher. Punjab's 2,563 against the 548
shrines Punjab Auqaf administers is consistent with Auqaf running a subset. Sindh's figure is
inflated by necropolises: DOAM lists Makli's tombs one by one, the others a complex as a few places.
The OSM-and-GeoNames estimate above (18,000–35,000) is the looser upper reading; the truth for
Muslim shrines is likely between about 9,000 and 20,000-odd.

**Why not per district.** Most districts have fewer than 7 places in both lists. Scaling a district
by its province's recall would change between-province comparisons only, which the province table
already gives. The viewer offers the counts and the effort control, not an adjusted district series.

**The Auqaf registers cannot calibrate by name alone.** Matching each register name to the sources
within its province and reading 40 sampled matches: about **12 are right** (Mian Mir, Rukn-e-Alam,
Baba Farid, Sakhi Sarwar) and most wrong (Data Ganj Bakhsh to "Ziarat Nabi Bakhsh", Pir Karam Shah
to a gurdwara). "Darbar Hazrat Pir X Shah" fits dozens of places in a province. Its apparent
recall (OSM 153 of 480) is therefore not reported. Each entry needs a district first.

## The archive's pins (`archive_location_check.py`)

84 archive sites have independent records of the same place. **61 confirmed** (an independent
record within 150 m), 5 near (150–300 m), 6 disputed (one source > 300 m away), **10 suspect**
(two independent sources, DOAM among them in every case, agree with each other and lie > 300 m
from the pin). GeoNames never votes. Each suspect read by a person on 30 October 2026, and each
coherent (the agreeing records within metres of one another):

| Site                                 | Pin off by | Agreeing                                                                                |
| ------------------------------------ | ---------- | --------------------------------------------------------------------------------------- |
| Hafiz Muhammad Jamal Multani         | 1.5 km     | DOAM, OSM                                                                               |
| Shah Ali Akbar (Multan)              | 1.5 km     | DOAM, OSM, Wikidata (also in the August review)                                         |
| Malik Ahmad Ayaz                     | 1.2 km     | DOAM, OSM                                                                               |
| Baha'al-Halim and Bibi Jawindi (Uch) | 1.2 km     | DOAM, OSM, Wikidata; **the two share one placeholder pin**                              |
| Abul Muali Qadri                     | 0.9 km     | DOAM, OSM (a Mochi Gate placeholder, per the August review)                             |
| **Lal Shahbaz Qalandar**             | 0.9 km     | DOAM, OSM, 40 m apart                                                                   |
| Tahir Bandagi Qadri                  | 0.8 km     | DOAM, OSM; **pin shared with Ghazi Ilm Din and Wasif Ali Wasif** (both disputed by OSM) |
| Samadhi of Maharaja Ranjit Singh     | 0.7 km     | DOAM, OSM, Wikidata, beside the Fort                                                    |
| Miran Hussain Zanjani                | 0.4 km     | DOAM, OSM ("Chah Miran")                                                                |

The proposed point for each is `agreeing_centre_lat/lon` in `archive_location_check.csv`. A fifth
earlier flag, Gurdwara Baoli Sahib, was a false match to Janam Asthan Guru Ram Das and is in
`not_same_place.tsv`.

Nothing here moves a pin. The flagged rows are for a person to check and, where right, to correct
in the sheet.

## Licences

`sites.csv` and every count derived from its OSM rows carry OpenStreetMap data: **ODbL 1.0**, ©
OpenStreetMap contributors, and must stay ODbL with attribution if distributed. GeoNames CC BY 4.0;
Wikidata CC0; the DOAM inventory is a Government of Pakistan publication (`registers/README_heritage.md`).
