# Shrine databases built by economists: Malik and Mirza, and Mehmood and Seror

_Read 31 October 2026 for Rauf, who asked what data these two databases rely on and where it comes from. The
papers are saved under `pipeline/gis/sources/shrine_dbs/registers/` (gitignored, like every raw download;
sha256 below). Neither team has published its shrine-level database or a replication package that holds
one: Zenodo, Mendeley Data and the papers' pages were searched on 31 October 2026, and none turned up. What
can be added here is what the papers print._

## Malik and Mirza: shrines and literacy in Punjab (Adeel Malik, Oxford; Rinchan Ali Mirza, Kent)

**The papers.**

- Malik, A. and Mirza, R. A. (2015). _Religion, Land and Politics: Shrines and Literacy in Punjab_. IFPRI
  Pakistan Strategy Support Program, Working Paper 30. Saved as `academic_malik_mirza/ifpri_pssp_wp30.pdf`
  (sha256 `ec46ea3a…`).
- Malik, A. and Mirza, R. A. (2022). Pre-colonial religious institutions and development: evidence through a
  military coup. _Journal of the European Economic Association_ 20(2): 907–956, doi 10.1093/jeea/jvab050.
  The accepted manuscript (January 2021) from the Kent repository, without the online appendix, is saved as
  `academic_malik_mirza/malik_mirza_2021_jeea_accepted.pdf` (sha256 `6939a9b9…`).

**What they built.** Three databases at the tehsil level, for Punjab only, joined into a "master database on
shrines, which contains a total of 598 shrines" (WP 30, p. 13):

1. **The Auqaf list**, "the primary source for our database on shrines": the Punjab Auqaf Department's
   internal list of shrines under its administration, organised by circles that cross district and tehsil
   boundaries, "an old compilation". They placed each shrine in a tehsil using mauza and union council
   names and National Reconstruction Bureau files, and by "specialized interviews with informed respondents
   in each district circle" (p. 11). The list "largely covers small and medium-sized shrines". It leaves out
   independent shrines of powerful families (examples given: Syed Abdullah Shah Gillani of Pindigheb, Bibi
   Pak Daman of Lahore).
   It was supplemented from:
   - the Auqaf department's website list of "important" shrines;
   - every TMA (town and municipal administration) website's "Important places" section;
   - "Generalized Google searches … with words, such as 'shrine' or 'Darbar'";
   - Google Maps, and the Wikipedia pages of districts and tehsils;
   - a run-through of each district's list with "a knowledgeable resource person on that district
     (typically a shrine caretaker)";
   - two Urdu books: Ghaffir Shahzad (2007), _Punjab Mein Khanqahi Culture_, and Mohammad Latif Malik
     (2005), _Aulia-e-Lahore_ (pp. 11–12).
2. **The historical database**: every shrine named in the colonial **Punjab District Gazetteers**, mostly in
   their "Religious fairs and festivals" sections, sometimes with fair attendance and offerings. "A total of
   146 shrines across Punjab were mentioned", in 47 tehsils (p. 12). This is the 2022 paper's main measure:
   gazetteer shrines per thousand persons in 1931.
3. **The politics database**: shrine families that won national or provincial seats in 15 elections from
   1937 to 2013, from FAFEN, gazette notifications, the Election Commission and Urdu works on political
   dynasties. It covers 64 shrines in 42 tehsils (pp. 12–13).

**What is published.** Only the gazetteer list, as Appendix 1 of WP 30 (pp. 32–34). For each shrine it
gives the colonial district, tehsil, name and fair attendance. The 598-shrine database is not published,
and the paper's text gives no names from it beyond examples.

## Mehmood and Seror: religious leaders and rule of law (Sultan Mehmood, New Economic School; Avner Seror, Aix-Marseille)

**The paper.** Mehmood, S. and Seror, A. (2023). Religious leaders and rule of law. _Journal of
Development Economics_ 160: 102974, doi 10.1016/j.jdeveco.2022.102974. The May 2021 version circulated
for the 2022 AEA meetings is saved as `academic_mehmood_seror/mehmood_seror_2021_aea.pdf` (sha256
`729558ba…`). The open-access post-print on HAL (hal-04002732) could not be fetched, because bot
protection blocks it.

**What they built.** Shrine **counts** per judicial district (the jurisdictions of the district high courts),
not a list of shrines. The data come from two sources (section III, footnotes 20–22 and 27, and Data
Appendix C.3):

- **Punjab and Sindh: "British Colonial Gazettes"**, the "fairs and festivals" sections, "as recorded in
  1911". The paper says this colonial data "is compiled by the historian Rinchan Ali Mirza … see Malik and
  Mirza (2020). We thank him for sharing this data with us." So for Punjab it is the same gazetteer data
  as above. Malik and Mirza's own papers describe only Punjab; the Sindh part is not described anywhere
  we could read.
- **Khyber Pakhtunkhwa and Balochistan: the provincial Auqaf departments' records**, "taken from the
  earliest available year (1950)" (Appendix A says 1952), because the British gazettes did not cover them.
  Appendix C.3 says "Auqaf Department records all shrines with their location".

Shrines are summed per judicial district and divided by population (shrines per 1,000 people). Only a map
(Figure 1) and summary statistics are published. **Nothing at the level of a shrine is published, so there
is nothing in it to add to this database**; its sources are the ones this repo already uses (the Auqaf
registers, `README_auqaf.md`) or the Malik and Mirza gazetteer list below.

## What was added from them

1. **`gazetteer_shrines_malik_mirza.csv`**: Appendix 1 of WP 30, transcribed by
   `build_gazetteer_shrines.py` from the PDF's text. It has **142 rows**, every field as printed.
   - The PDF's line wraps are rejoined, and "…" is read as no figure.
   - District and tehsil are the colonial ones, with no district code and no point, because the appendix
     gives neither. Montgomery is today's Sahiwal, Okara and Pakpattan. Shahpur is Sargodha and Khushab,
     and its "Sahiwal" is the old Sahiwal tehsil of Sargodha, not Sahiwal district. Bahawalpur is the
     former state.
   - The text says 146 shrines, but the appendix prints 142 rows. One row names three pirs, one names two,
     and one (Gujar Khan) has no name. Ahmadpur has 14 rows where the text says 15. This is recorded, not
     reconciled.
2. **`gazetteer_match_verdicts.tsv`**: each gazetteer shrine compared by hand with the places of
   `verified_db/shrines_verified.csv` whose names share a word with it, in the districts carved from its
   colonial district. **29 gazetteer rows match 33 places, and 13 more rows possibly match 14 places**:
   - `match`: the same saint, by name, in that district.
   - `possible`: a common name, a different spelling, part of the name only, or a different modern
     district.
   - 100 gazetteer rows have no place in the database. Many are small fairs, and some are well-known
     shrines that no source here records, such as Shah Jiwana in Jhang.
   - Candidates were found by name words: fuzzy matching, then prefix matching, which caught "Sher Shah
     Syed Jalal" as Jalaluddin Surkh-Posh of Uch. Each candidate was then read by hand. A shrine known
     today by a wholly different name can still be missed.
   - Two pairs of matches show the union holds the same shrine twice: Bari Imam (U00002 and U01568) and
     Imam Ali-ul-Haq (U00131 and U01063).
3. **The verified database's `colonial_gazetteer` column** carries these matches. **It changes no tier.** A
   gazetteer mention attests a shrine and its fair around 1880–1930, and the match is by name alone, so
   whether it should count as an independent source is Rauf's question. Counting the 33 matches would bring
   12 places into the final set (`docs/research/VERIFIED_DB_OVERNIGHT_2026-10-31.md`,
   question 9).

## Limits

- The gazetteer list is the colonial view of the notable shrines: those with a fair worth reporting.
  It covers Punjab only, and not every district (Lahore, for one, has no row).
- The matches rest on names. A shrine can carry another name today (Bari Imam for Shah Abdul Latif), and
  two shrines can share one ("Nur Shah"), which is why `possible` is kept apart.
