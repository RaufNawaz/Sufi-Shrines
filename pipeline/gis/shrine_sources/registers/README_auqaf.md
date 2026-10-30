# Auqaf shrine registers: what was found, 30 October 2026

The goal was an evidence-based list of shrines under the provincial Auqaf departments, with the
district of each, for per-district counts. **That goal is only partly reachable from published
sources.** No official source found online gives a per-district list or per-district total for Punjab,
Khyber Pakhtunkhwa, Balochistan or Islamabad. What exists:

| File                        | Rows                          | What it is                                                                               |
| --------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------- |
| `auqaf_registers.csv`       | **560**: Punjab 480, Sindh 80 | Every shrine named in the two official web registers that exist                          |
| `auqaf_district_totals.csv` | 2                             | Province totals as stated by the departments. **No district totals were found anywhere** |
| `build_auqaf_registers.py`  |                               | Rebuilds both CSVs from the saved pages; exits non-zero if a count drifts                |

Raw pages and PDFs are in `pipeline/gis/sources/shrine_dbs/registers/<source>/`, which is gitignored and
kept locally. Rebuild with
`python -I pipeline/gis/shrine_sources/registers/build_auqaf_registers.py "<repo root>"`.

**Only 13 of the 560 rows have a `district_code`** (12 Sindh, 1 Punjab). That is not something a
script left unfinished. A district is recorded only where the document itself states one. The Punjab
register is organised by **Auqaf zone** (nine zones, each covering several districts), and most of the
Sindh list is organised by **Auqaf circle**. Neither is a district. Assigning districts from the
place names inside entries ("…Pattoki", "…Chunian") would be inference, and the register shows
why that is unsafe: its own "Major Shrines" list says "Kot Mithen, Dera Ghazi Khan", but the
department's offices page puts Kot Mithan in "District Rajanpur". Each row's zone or circle is in `note`.
A district assignment pass, using the place-name hints and the leads below, is a separate,
reviewable step. It is not part of this transcription.

## Punjab: Auqaf & Religious Affairs Department

**Found: `https://auqaf.punjab.gov.pk/shrines`, "Zone-Wise Shrines".** Saved as
`punjab_auqaf_web/shrines.html`. The page is undated (Drupal, live 30 Oct 2026). It lists 479 shrines
under nine zones: Lahore 108, Gujranwala 73, Rawalpindi 71, Faisalabad 56, Sargodha 25, Pakpattan 52,
Multan 32, Dera Ghazi Khan 27, Bahawalpur 35. The CSV adds Data Darbar (row 480). Data Darbar
appears only in the page's "Major Shrines" list and is administered by a separate "Data Darbar Zone"
office (`/our-offices`). Names are transcribed as written, typos included ("Darabr", "Hhallay Shah",
"Pir Karim ShaHazrat"). Runs of whitespace are collapsed as a browser would render them.
English only, so `name_ur` is empty.

- **Completeness: about 88% of the department's own count.** The FAQ (`/faqs`) says "Currently, there
  are 548 Shrines under Administrative control of Auqaf Department". The list gives 480, so about 68
  are missing, and nothing says which. Other stated totals, none on an official page found here:
  530 (an academic paper on Lahore shrines, tehqeeqat.org/downloadpdf/11115, not retrievable: it
  returns HTML), 544 (WION, 2020), 546 (an undated Punjab government statement in search results), and
  534 (Wikipedia; this is where the project's "~534" comes from). The numbers drift with takeovers and
  de-notifications. Treat 548 as the current figure.
- **Duplicates are possible but unproven.** Five names occur twice, exactly as written: "Darbar Hazrat
  Lal Shah" and "Darbar Hazrat Hussain Shah", each twice within one zone (Pakpattan and Gujranwala),
  and "Masoom Shah", "Sikandar Shah" and "Zinda Pir", each in two different zones. A Bibi Pak Daman
  also appears in both the Lahore and Multan zones, with different wording. All are kept as separate
  rows, as the page lists them. Many shrines share a saint's name.
- Only two entries state a district: "Noor Shah Bukhari **Distt Khanewal**" (coded PK615), and
  "Abdul Waheed **Dist. Khoshan**". Khoshan is not a district, so that one has no code.

**Punjab leads not transcribed (worth a second pass):**

- **Auction schedules, which are the best route to districts.** These are 2024-25 and 2025-26
  contract/lease schedules saved in `punjab_auqaf_auctions/` (7 PDFs from
  `https://auqaf.punjab.gov.pk/sites/auqaf.punjab.gov.pk/files/…`, e.g.
  `Shedule_Auction_Lhr_Gu_Fsd_Sarg_Pak_2025-26.pdf`, `Shedule_Auction_2025-26_Mu_Bhw_DGK_KGF.pdf`,
  `Shedule_Auction_2025-26_RWP.pdf`). They are organised by **Auqaf circle**, and most circles are
  district-named, with offices of "District Manager Auqaf": Lahore circles 1–6 plus Data Darbar,
  Sheikhupura, Kasur, Sialkot, Gujrat, Gujranwala/Hafizabad, Faisalabad, Jhang, Sargodha, Khushab,
  Chiniot, Pakpattan, Burewala, Rawalpindi I/II, Jhelum, Multan 1–3, Khanewal, Muzaffargarh,
  Bahawalpur, Chishtian, Rahim Yar Khan, Khanpur, Liaquatpur, Sakhi Sarwar (DG Khan), Kot Mithan.
  Each contract row names a shrine. **However, these schedules cover only shrines with a cash box,
  shoe-keeping or land contract, not the register.** They are Urdu, and pdfplumber extracts the
  text in reversed visual order (reversing each word recovers it; see how the circle headings
  were read). The tables are irregular. Two files have pages with no text layer.
- **Development schemes (ADP).** `pnd.punjab.gov.pk/system/files/Auqaf%20&%20Religious%20Affairs*.pdf`
  (2009-10 to 2025-26) list shrine conservation schemes with a district column. Only shrines with a
  scheme appear, and not all of them are Auqaf-administered. Not downloaded.
- **District gazetteers.** The Muzaffargarh District Gazetteer (elearn.gov.pk flipbook, page 177)
  has an Auqaf chapter that, by its search snippet, says the district office manages 10 establishments
  and lists them. The host (103.226.217.236) refused connections from here on 30 Oct 2026. Other
  district gazetteers of the same series may have the same chapter. **This is the most promising
  source of stated district totals** and should be retried.
- `performance_achievements.pdf` (Achievements 2018–2023) is a scan with no text layer. Saved, not read.
- The Urs calendar (`/event-calendar`) is also by zone. `/zones` is a 404. District government portals
  (e.g. `vehari.punjab.gov.pk/auqaf`) carry only boilerplate.
- Bureau of Statistics Punjab (`bos.punjab.gov.pk`) was unreachable. Searches found no Punjab
  Development Statistics table of shrines by district. Searches also found no Punjab Gazette
  take-over notifications online, and no Punjab Assembly answer with a list.
- The Wayback Machine was partly offline on 30 Oct 2026, so earlier versions of the Auqaf site could
  not be checked for an older district-wise list.
- Malik & Mirza, _Religion, Land and Politics: Shrines and Literacy in Punjab_ (IFPRI PSSP WP 30,
  2015; saved in `academic_malik_mirza/`), describes the department's internal "Auqaf list". It says
  that list is organised by circles that overlap district and tehsil boundaries, and that it is "an old
  compilation". The authors assigned each shrine to a tehsil and supplemented the list from the web
  and interviews, reaching 598 shrines. Their database is not published in the paper, and it is not an
  Auqaf register, so nothing was taken from it.

## Sindh: Auqaf, Religious Affairs, Zakat & Ushr Department

**Found: `https://arazud.sindh.gov.pk/list-of-dargahs-mosques`, "DISTRICT WISE LIST OF DARGAHS UNDER
THE CONTROL OF AUQAF DEPARTMENT SINDH".** Saved as `sindh_arazud/list-of-dargahs-mosques.html`. The
page is undated. It lists 80 dargahs, serials 1–80, under 19 headings. Despite the list's title,
only three of the headings are districts ("DISTRICT MIRPURKHAS", "DISTRICT TANDO MUHAMMAD KHAN",
"DISTRICT WEST KARACHI"). The rest are circles. Ten entries state a district in their own text.
District codes were given only where the statement maps cleanly to the current dictionary:

- Entry district overrides heading: Luari Sharif "District Badin" under Mirpurkhas, and Saman Shah
  "District Badin" under Tando Muhammad Khan.
- Left uncoded, with the reason in `note`:
  - "District Thatta" ×2, at Chohar Jamali. Sujawal was split from Thatta in 2013.
  - "Kandhkot District Jacobabad". Kashmore was split from Jacobabad in 2004.
  - "DISTRICT WEST KARACHI". Karachi's districts were redrawn in 2011, 2013 and 2020, and one of the
    three entries is at Azizabad.
  - "Usman Shah Detha Station Hyderabad", which is under the Mirpurkhas heading.
- "District Nawabshah" → Shaheed Benazirabad (PK719), a rename.

**Completeness: high, and it slightly exceeds the department's own count.** The department's
`/about-auqaf` page says "Total No. of Dargahs under administrative Control of Auqaf Department : 78",
but the list enumerates 80. The Urs calendar (`/calendar-of-annual-urs-of-auqaf-department`, by
division, not district) includes "Chilla Syed Ali Datar" and "Dargah Hazrat Qatil Shah", Karachi,
which are not in the 80. So the list is not perfectly in step with the department's other pages.
The same page's mosque list (84) was not transcribed. `/circle-wise-details` gives properties
(shops, houses, land) per circle, not shrines.

Not used: an ARY News report of a police statement to the Sindh High Court gives Karachi shrine
counts by district (South 13, Central 45, West 71, East 29, Malir 41, Korangi 61). That counts all
shrines needing police security, not Auqaf ones, and it is a news report. Recorded here only.

## Khyber Pakhtunkhwa: Auqaf, Hajj, Religious & Minority Affairs

**Dead end, but a near miss.** `https://auqaf.kp.gov.pk/properties/Shrine` is a page titled
"Shrine Properties" with a table **"S.No | District | Number of Properties | View"**, which is
exactly the per-district count wanted. The table is filled by JavaScript from
`/proxy/get-property-by-nature/<nature>`. On 30 Oct 2026 that proxy returned a Laravel "Server Error"
page for every nature tried (Shrine, Shrines, Mazar), and so did `/proxy/get-nature-of-properties`.
The page's other code path calls a backend at `175.107.63.241:8085`. That backend did not answer
over plain HTTP, and it was not tried over HTTPS with certificate checks disabled. **Retry the proxy
later. If it comes back, it gives district totals for KP shrines directly.** The `/download` and
`/notification` PDFs are the Waqf Properties Ordinance 1979, its 2020 and 2021 amendments, and a
2026 land take-over notification at Moza Chouni, Peshawar. None lists shrines. The KP Development
Statistics table of contents was not checked (pndkp.gov.pk).

## Balochistan

Nothing found. Searches turned up no Balochistan Auqaf web presence with a shrine list. The
Balochistan Waqf Properties Ordinance exists, with the same take-over-by-notification model.

## Islamabad Capital Territory

`https://ictadministration.gov.pk/auqaf-department/` (saved in `ict_auqaf/`) describes Auqaf ICT under
the Federal Auqaf (Control) Act 1976. It mentions "Auqaf-managed Shrines" and the Bari Imam complex,
but gives no list and no count of shrines. A search snippet attributes "89 Auqaf-managed mosques"
to it.

## Evacuee Trust Property Board (Hindu and Sikh sites; record separately)

`https://etpb.gov.pk/shrines/shrines-branch/` (saved in `etpb/`) lists only "Major Gurdwaras" (7) and
"Major Mandirs" (10), with towns, plus festival tables. It is not a register, and no district-wise list
of ETPB properties was found. Press figures vary widely (1,130 temples and 517 gurdwaras on
Wikipedia; 1,817 to 1,830 combined in Indian press, 31 to 37 functional), and none is official.
Nothing from ETPB is in the CSVs.

## Statistics yearbooks

No yearbook found gives "number of shrines by district" for any province. The Punjab Bureau of
Statistics site was unreachable from here. Searches of Punjab, KP and Sindh Development Statistics
returned only Auqaf ADP scheme lists.

## Known gaps, in order of value

1. District for the 480 Punjab rows. Sources to try: the auction schedules by circle, and the district
   gazetteers' Auqaf chapters.
2. About 68 Punjab shrines in the 548 that the web list omits.
3. KP: retry `auqaf.kp.gov.pk/proxy/get-property-by-nature/Shrine`.
4. Urdu names (`name_ur`): neither web register gives them. The Punjab auction schedules are Urdu.
5. Balochistan and ICT: no list exists online. These need an RTI request.
