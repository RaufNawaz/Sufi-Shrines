# CHANGES — shrines.csv -> shrines_final.csv

Repair session 2026-08-09. Original preserved at `backups/shrines.20260809-130538.csv`. No row or column was deleted at any stage; every cell-level change is listed below.

Pipeline: `apply_description_fixes.py` -> `merge_patch.py` -> `fix_targeted.py` (validated with `validate_shrines.py` before and after; see `reports/`).


## Stage 0 — script fixes (no data changed)

- `apply_description_fixes.py`: output delimiter now follows the output filename (`.csv` -> comma). It previously always wrote tab-delimited content, even to a `.csv` path.
- `build_sources_registry.py`: added a fallback that splits a bibliography on ` - ` (space-hyphen-space) when the section contains no newline, with a runtime assertion that intra-word hyphens (e.g. *Bibian-e-Pak Daman*) are never split. Current export has no flattened bibliographies, so registry outputs are unchanged today.
- `validate_shrines.py`: coordinate check now recognises administrative qualifiers (matched place followed by District/Distt/Tehsil, or appearing as a non-leading, comma-separated Location component): tolerance 120 km, severity capped at WARN. Bare leading town names keep the strict 20/60 km thresholds.
- New scripts: `merge_patch.py` (patch join), `fix_targeted.py` (Step-3 fixes), `check_descriptions.py` (newline guard), `gen_changes.py` (this log).

## Stage 1 — Description cleanup (`apply_description_fixes.py`)

`shrines.csv` (163 rows, 25 cols) -> `shrines_clean.csv` (163 rows, 27 cols)

**Rows with value changes: 159 of 163.**

Trailing `=====` separators stripped; trailing `NOTE:` blocks lifted into the new `qa_note` column; spelling normalisation (e.g. Sind -> Sindh, Qadri -> Qadiri); duplicate field-survey bibliography lines removed; placeholder Events flagged in `needs_review`. Fix-by-fix log: `fixes_applied.log`.

Columns added: `qa_note`, `needs_review`. No column removed; no row added or removed.

### Allo Mahar
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Contemporary press and community accounts of the annual *urs* at Allo Mahar Sharif.
    -
    -=====================================================================================
    ```


### Amb Temples (Amb Sharif)
  - `Description` (diff):

    ```diff
    @@ -24,3 +24 @@
     - Comparative literature on the Katas Raj and Tilla Jogian sites of the Salt Range.
    -
    -=====================================================================================
    ```


### Bari Imam
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories and traditions of Bari Imam and Nurpur Shahan.
    -
    -=====================================================================================
    ```


### Bhagnari Mandir
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - General literature on the Hindu communities of Sindh and eastern Balochistan and their migration to Karachi and Mumbai.
    -
    -=====================================================================================
    ```


### Bhai Sant Thawan Das Mandir
  - `Description` (diff):

    ```diff
    @@ -16,3 +16 @@
     - Zulfiqar Ali Kalhoro, published surveys of Nanakpanthi saints and shrines of Sindh (for wider regional context; this specific site is not covered).
    -
    -=====================================================================================
    ```


### Bhai Waliram Darbar
  - `needs_review` (new column): `'events_placeholder'`

### Bhit (Bhit Shah)
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - General established histories of Sindhi literature and Sufism.
    -
    -=====================================================================================
    ```


### Churrio Jabal Durga Mata Temple
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Studies of Hindu communities and sacred geography in Tharparkar and Nagarparkar.
    -
    -=====================================================================================
    ```


### Darbar Ghamkol Sharif (Zinda Pir)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Darbar-e-Aliya Naqshbandia Ghamkol Sharif lies in a secluded valley a few miles outside the town of Kohat in Khyber Pakhtunkhwa, and is among the most important centres of the *Naqshbandi* Sufi order in modern Pakistan. It was founded in 1952 by the Naqshbandi master universally known as *Zinda Pir* (1912–1999), who was born in the nearby village of Jungle Khail. He had received spiritual authority (*khilafat*) around 1942 from his own guide, Baba Ji Muhammad Qasim of Mohra Sharif, who directed him to establish an independent centre; obedient to that instruction, Zinda Pir withdrew to the then-barren Ghamkol valley and there built, over the following decades, a great complex of mosque, seminary, and lodgings that grew into a thriving spiritual township. His following spread far beyond Pakistan, and the darbar developed an especially strong connection with the Pakistani community of Birmingham in the United Kingdom, where an associated mosque bears its name. Zinda Pir died on 21 March 1999 and is buried at the darbar, his tomb becoming a place of pilgrimage in its turn; his spiritual seat passed to his son, Pir Sayyid Badshah. Each year vast crowds of devotees gather at Ghamkol Sharif for the commemorative observances, making it one of the great living Sufi centres of the north-west.
    -
    -=====================================================================================
    ```


### Darbar Hazrat Khawaja Shah Muhammad Sulaiman Taunsvi (R.A)
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Chishti revival in nineteenth-century Punjab.
    -
    -=====================================================================================
    ```


### Darbar Sakhi Shah Chan Charagh
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - General studies of Sufi shrine culture and Muharram devotion in the Pothohar region of Punjab.
    -
    -=====================================================================================
    ```


### Dargah / Roza Sufi Shah Inayat Shaheed
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of Sufism in Sindh and of the Jhok movement.
    -
    -=====================================================================================
    ```


### Dargah Fateh Pur Sharif
  - `Description` (diff):

    ```diff
    @@ -6,3 +6,3 @@
     
    -Rakhyal Shah is generally held to have lived from 1842 to 1940, a span of nearly a century across the colonial Indus frontier. Of Baloch origin and associated with the Qadiri tradition — the spreadsheet preserves his title as *Sufi al-Qadri* — he devoted his life to the theme of *'ishq*, the love of the Divine, and became so beloved that, in the phrase of one modern scholar, "the poet himself grew to be the head of a cult." What most distinguishes him is his reach across languages: he is said to have composed in five tongues — Sindhi, Balochi, Saraiki, Urdu and Persian — a fluency that made his message intelligible to the mixed peoples of the Sindh–Balochistan borderland and that helped his fame outlast him. Around his person gathered a circle of *murids* (disciples) whose devotion would, after his death, give rise to the shrine that now bears his name.
    +Rakhyal Shah is generally held to have lived from 1842 to 1940, a span of nearly a century across the colonial Indus frontier. Of Baloch origin and associated with the Qadiri tradition — the spreadsheet preserves his title as *Sufi al-Qadiri* — he devoted his life to the theme of *'ishq*, the love of the Divine, and became so beloved that, in the phrase of one modern scholar, "the poet himself grew to be the head of a cult." What most distinguishes him is his reach across languages: he is said to have composed in five tongues — Sindhi, Balochi, Saraiki, Urdu and Persian — a fluency that made his message intelligible to the mixed peoples of the Sindh–Balochistan borderland and that helped his fame outlast him. Around his person gathered a circle of *murids* (disciples) whose devotion would, after his death, give rise to the shrine that now bears his name.
     
    @@ -31,3 +31 @@
     - Government of Balochistan, Culture Department — portal listing the shrines and Sufi heritage of Balochistan.
    -
    -=====================================================================================
    ```


### Dargah of Khwaja Muhammad Zaman (Luari Sharif)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
    -The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman received his first instruction from his father, Shaikh Abdul Latif, a follower of the Naqshbandi order, before studying at Thatta, then the great seat of learning in Sindh. There he came under the influence of the Sufi master Khwaja Abul Masakin, whose disciple he became and from whom, tradition records, he received the honorific Sultan al-Aulia, "master of the saints". Settling at Luari, he made the khanqah he established there — traditionally dated to 1737 — the foremost Naqshbandi centre of eighteenth-century Sindh after Thatta, a place of study from which his khalifas carried the order's teaching across the province. He was also a poet of note: a body of mystical verse in Sindhi is attributed to him, of which some eighty-five poems are said to survive. He died in January 1775 and was buried at Luari, where his tomb and the vaulted chambers of his successors form the shrine complex. An annual urs commemorates him and draws devotees from across the region, though the complex has at times been subject to restricted access, with a police post maintained at its entrance since the 1980s. Luari Sharif is counted among the oldest and most important Sufi sites of southern Sindh. NOTE: coordinates are those of Luari Sharif town (gazetteer-level), where the dargah is situated; treat as accurate to village level.
    -
    -=====================================================================================
    +The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman received his first instruction from his father, Shaikh Abdul Latif, a follower of the Naqshbandi order, before studying at Thatta, then the great seat of learning in Sindh. There he came under the influence of the Sufi master Khwaja Abul Masakin, whose disciple he became and from whom, tradition records, he received the honorific Sultan al-Aulia, "master of the saints". Settling at Luari, he made the khanqah he established there — traditionally dated to 1737 — the foremost Naqshbandi centre of eighteenth-century Sindh after Thatta, a place of study from which his khalifas carried the order's teaching across the province. He was also a poet of note: a body of mystical verse in Sindhi is attributed to him, of which some eighty-five poems are said to survive. He died in January 1775 and was buried at Luari, where his tomb and the vaulted chambers of his successors form the shrine complex. An annual urs commemorates him and draws devotees from across the region, though the complex has at times been subject to restricted access, with a police post maintained at its entrance since the 1980s. Luari Sharif is counted among the oldest and most important Sufi sites of southern Sindh.
    ```

  - `qa_note` (new column): `'coordinates are those of Luari Sharif town (gazetteer-level), where the dargah is situated; treat as accurate to village level.'`

### Dargah of Pir Muhammad Rashid (Roze Dhani), Pir Jo Goth
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The town of Pir Jo Goth — "the village of the Pir" — in the Kingri taluka of Khairpur District, Sindh, grew up around the shrine of Pir Syed Muhammad Rashid Shah (1757–1818), known by his honorific Roze Dhani, "master of the shrine," the founder of the Rashidi Sufi order and an ancestor of the line of Pir Pagara. A Qadiri–Naqshbandi saint of great influence, his teaching is said to have spread through Sindh, the Punjab, Balochistan, Rajasthan, and beyond. From his descendants issued the spiritual and temporal leadership of the Hurs, the community of devoted faqirs whose ancestors, under the later Pir Pagaras, waged a celebrated resistance against British rule in Sindh in the nineteenth and twentieth centuries; the present (eighth) Pir Pagara draws his authority from this shrine complex. The dargah is distinguished by an austere discipline unusual among Sufi shrines: devotees are required to enter only with the head covered, the Hur faqirs make pilgrimage at fixed times of the year, and the sacred date of 27 Rajab draws great throngs of mureeds — yet, in contrast to the festive urs kept at most Sufi tombs, the Rashidi tradition is said to observe no public urs here. The complex, entered through an imposing Shahi (royal) gate, remains the devotional and political heart of the Hur community and one of the most distinctive shrines of upper Sindh.
    -
    -=====================================================================================
    ```


### Dargah Pir Ratan Nath Jee
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Studies of the pre-Partition Hindu community of Peshawar and the Gor Khatri complex.
    -
    -=====================================================================================
    ```


### Darya Lal Mandir (Darya Lal Sankat Mochan Mandir)
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Michel Boivin, *Historical Dictionary of the Sufi Culture of Sindh*, for the shared veneration of the river-lord.
    -
    -=====================================================================================
    ```


### Data Darbar
  - `Description` (diff):

    ```diff
    @@ -64,4 +64 @@
     - Shrines Project field survey, Data Darbar responses (surveyor: Saifullah Imtiaz), 2026.
    -- Shrines Project field survey, Data Darbar responses, 2026.
    -
    -=====================================================================================
    ```


### Eidgah Sharif
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Contemporary Pakistani press coverage of the *urs* and *milad* gatherings at Eidgah Sharif and of its custodians.
    -
    -=====================================================================================
    ```


### Garh Maharaja (Shorkot)
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - General established histories of the Qadiri order and Punjabi Sufi poetry.
    -
    -=====================================================================================
    ```


### Golra Sharif
  - `Description` (diff):

    ```diff
    @@ -25,3 +25 @@
     - General established histories of the Chishti order in modern Punjab.
    -
    -=====================================================================================
    ```


### Gorakhnath (Goraknath) Temple
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Mughal-era accounts and histories of Peshawar noting Jahan Ara Begum's Sarai Jahanabad.
    -
    -=====================================================================================
    ```


### Gori Temple (Gori jo Mandar)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Gori Temple — *Gori jo Mandar*, the "temple of Gori" — is a marble *Śvetāmbara Jain* temple standing amid the desert near the village of Gori, between Islamkot and Nagarparkar in Tharparkar District, some fourteen miles north-west of the Viravah ruins. Built in 1375-1376 CE and dedicated to *Parshvanatha*, the twenty-third *Tirthankara* of the Jain faith, it is one of the most important surviving Jain monuments of the subcontinent's north-west. The temple, raised on a high stepped platform and built of marble, measures roughly 125 by 60 feet and is distinguished by its three *mandapas* (halls) and its remarkable array of some fifty-two domes, whose form blends Gujarati temple design with the regional architecture of the age. Its greatest treasure is its painting: the frescoes within the main dome — depicting princely processions, palanquins and coaches, riders, and elegantly robed figures in flowing Rajasthani dress — are reckoned to be the oldest surviving Jain frescoes in the northern regions of the subcontinent, a survival of extraordinary rarity. Long abandoned as a place of worship, the temple stands today as a monument of the once-flourishing Jain and Hindu culture of the Thar. It forms part of the group of Nagarparkar temples inscribed in 2016 on the UNESCO tentative list as the "Nagarparkar Cultural Landscape," and it remains a site of pilgrimage interest for Jains and Hindus and of growing concern for heritage conservation.
    -
    -=====================================================================================
    ```


### Gurdas Ram Mandir
  - `Description` (diff):

    ```diff
    @@ -17,3 +17 @@
     - Zulfiqar Ali Kalhoro, published writing on Sindh's Nanakpanthi saints, including the distinct Bhai Gurdas of Shikarpur (for contrast only).
    -
    -=====================================================================================
    ```


### Gurdwara Babay De Ber
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Pakistan Sikh Gurdwara Parbandhak Committee accounts of the historic gurdwaras of the Punjab.
    -
    -=====================================================================================
    ```


### Gurdwara Babay Nanki
  - `Description` (diff):

    ```diff
    @@ -28,3 +28 @@
     - SikhiWiki and Discover Sikhism, entries on Bebe Nanaki and Gurdwara Janamasthan Bebe Nanaki, Dera Chahal.
    -
    -=====================================================================================
    ```


### Gurdwara Balila Sahib (Bal Lila Sahib)
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Surinder Singh Johar, *Guru Nanak: A Biography*.
    -
    -=====================================================================================
    ```


### Gurdwara Baoli Sahib (Guru Arjan Dev Ji), Lahore
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Baoli Sahib stands in the crowded Dabbi Bazaar at the very heart of the walled city of Lahore, where its precinct once adjoined the Loha, Kesera and Guru bazaars. It commemorates a visit of *Guru Arjan Dev*, the fifth Sikh Guru, to Lahore in 1599. In the tradition preserved by the community, a devotee named *Bhai Chhajju Bhagat*, together with a Pathan merchant, laid a purse of gold *mohars* at the Guru's feet and asked that it be spent for religious purposes; the Guru had a *baoli* — a roofed stepwell — sunk at this spot to provide water for the people of the quarter. The stepwell later suffered in the turbulence of the eighteenth century: it is said to have been filled in and built over during the governorship of Nawab Yahya Khan, at the instigation of Diwan Jaspat Rai. It was rediscovered and restored during the reign of *Maharaja Ranjit Singh*, who in 1834 had a new building raised and a *sarovar* (sacred tank) dug, and the gurdwara passed under the management of the Shiromani Gurdwara Parbandhak Committee in 1927. Today the site is also known as Baoli Bagh, its surroundings laid out as a garden. As a shrine tied to Guru Arjan — the compiler of the *Adi Granth* and the first martyr of the Sikh faith, whose principal Lahore memorial is the Gurdwara Dera Sahib by the Fort — Baoli Sahib is a significant station on the map of Sikh Lahore.
    -
    -=====================================================================================
    ```


### Gurdwara Bhai Beba Singh
  - `Description` (diff):

    ```diff
    @@ -28,3 +28 @@
     - Reports of the Evacuee Trust Property Board, Government of Pakistan.
    -
    -=====================================================================================
    ```


### Gurdwara Bhai Joga Singh
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Reporting (e.g. *Scroll.in*) on the reopening and present life of Peshawar's gurdwaras.
    -
    -=====================================================================================
    ```


### Gurdwara Chakki Sahib
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Chakki Sahib stands within the old town of Eminabad in Gujranwala District — the settlement known in Guru Nanak's day as Saidpur — and marks the place where a great millstone (*chakki*) associated with the Guru was kept. It commemorates one of the most dramatic episodes of Guru Nanak's life: his imprisonment during the invasion of the Punjab by the Mughal *Babur*, traditionally dated to around 1520-21, when Eminabad was sacked and its people carried off. According to Sikh tradition the captives, Guru Nanak among them, were set to grinding corn with hand-mills to feed the conquering army; and it is remembered that the Guru's millstone turned of its own accord while he, pouring in the grain, sang the praises of the One God — the hymns lamenting the horrors visited upon the land that are preserved in Sikh scripture as the *Babar-vani*, the "utterances concerning Babur." The marvel is said to have astonished his guards and, when reported to Babur, to have brought the emperor himself to the Guru; moved by his words, Babur is remembered to have sought his blessing and, at the Guru's urging, to have freed many prisoners. The present shrine, a simple flat-roofed building within a brick-paved compound, preserves the memory of the millstone and of the Guru's witness against the cruelty of war. Since Partition it has stood without a resident congregation, cared for as part of Pakistan's Sikh heritage and visited by pilgrims on the great anniversaries, often together with the neighbouring Eminabad shrines of Rori Sahib and Bhai Lalo's well.
    -
    -=====================================================================================
    ```


### Gurdwara Chhevin Patshahi, Chitti Gatti
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
    -Gurdwara Chhevin Patshahi stands in the small village of Chitti Gatti, in a garden by the roadside about eight kilometres from Mansehra in the Hazara hills of Khyber Pakhtunkhwa. Its name — Chhevin Patshahi, the "Sixth Sovereignty" — commemorates Guru Hargobind, the sixth Guru of the Sikhs (Guru from 1606 to 1644), who by tradition is said to have visited the site during his travels through the region. The gurdwara is a handsomely built, domed structure, and it is remembered above all for an unusual arrangement of shared sacred use: a stone Shiv Ling was worshipped on the upper floor of the building while the prakash of the Guru Granth Sahib was installed on the floor below, with Hindu priests officiating — an arrangement that reflects the closely intertwined Hindu and Sikh devotion of the frontier, where the Guru was honoured by Hindus and Sikhs alike. A fair was traditionally held here at Vaisakhi, enthusiastically attended by the communities of the surrounding hills. The building stands beside the Shiv Mandir of Chitti Gatti (recorded separately in this dataset), the two shrines together forming a single sacred spot. Following the Partition of 1947 the Sikh and Hindu populations of the area departed and regular worship ceased, though the structure survives as a monument to the region's plural religious past. NOTE: coordinates are adjacent to the Shiv Mandir Chiti Ghati (row 69) and are approximate; the two sites are co-located at Chitti Gatti. Distinct from the Gurdwara Chhevin Patshahi at Hadiara in Lahore district.
    -
    -=====================================================================================
    +Gurdwara Chhevin Patshahi stands in the small village of Chitti Gatti, in a garden by the roadside about eight kilometres from Mansehra in the Hazara hills of Khyber Pakhtunkhwa. Its name — Chhevin Patshahi, the "Sixth Sovereignty" — commemorates Guru Hargobind, the sixth Guru of the Sikhs (Guru from 1606 to 1644), who by tradition is said to have visited the site during his travels through the region. The gurdwara is a handsomely built, domed structure, and it is remembered above all for an unusual arrangement of shared sacred use: a stone Shiv Ling was worshipped on the upper floor of the building while the prakash of the Guru Granth Sahib was installed on the floor below, with Hindu priests officiating — an arrangement that reflects the closely intertwined Hindu and Sikh devotion of the frontier, where the Guru was honoured by Hindus and Sikhs alike. A fair was traditionally held here at Vaisakhi, enthusiastically attended by the communities of the surrounding hills. The building stands beside the Shiv Mandir of Chitti Gatti (recorded separately in this dataset), the two shrines together forming a single sacred spot. Following the Partition of 1947 the Sikh and Hindu populations of the area departed and regular worship ceased, though the structure survives as a monument to the region's plural religious past.
    ```

  - `qa_note` (new column): `'coordinates are adjacent to the Shiv Mandir Chiti Ghati (row 69) and are approximate; the two sites are co-located at Chitti Gatti. Distinct from the Gurdwara Chhevin Patshahi at Hadiara in Lahore district.'`

### Gurdwara Chhevin Patshahi, Jhalian (Jhalian Dhilwan)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Chhevin Patshahi at Jhalian — a village of the Lahore District lying in the former Barki (Burki) police-station area, some five kilometres east of Barki town and close to the Lahore–India borderland — commemorates a visit by Guru Hargobind, the sixth Guru (*Chhevin Patshahi*). The settlement is paired with the neighbouring village of Dhilwan, the two together being known as *Jhalian Dhilwan*. By Sikh tradition the Guru halted here and blessed the local *sangat*, and it was from this place, the accounts hold, that he afterwards travelled the short distance to Hadiara, where another gurdwara of the sixth Guru still stands (a separate entry in this dataset). The shrine at Jhalian is remembered as a modest but dignified building raised over the spot said to have been "touched by the feet" of Guru Hargobind: constructed in the manner of a colonial-era bungalow, with a verandah across the front and two rooms behind, and endowed by the villagers with some eight *ghumaon* of land for its upkeep. Like the great majority of gurdwaras on the Pakistani side of the 1947 border, it was maintained by the local Sikh community until Partition, after which the congregation departed and the building passed out of regular worship — such border-village shrines being frequently left empty or turned to other uses thereafter. Its history survives chiefly in Sikh pilgrimage literature and gazetteers rather than in independent record, and its present condition is not well documented. It should not be confused with the other shrines of the sixth Guru in the Lahore region — among them the *Chhevin Patshahi* gurdwaras at Mozang and inside Bhati Gate within Lahore city, and the one at Chitti Gatti near Mansehra recorded elsewhere in this dataset — each marking a different halt in Guru Hargobind's travels.
    -
    -=====================================================================================
    ```


### Gurdwara Choa Sahib
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Choa Sahib — its name meaning the "gurdwara of the exalted spring" — stands at the northern edge of the great sixteenth-century *Rohtas Fort*, a UNESCO World Heritage Site near Jhelum, close to the fort's Talaqi gate. It commemorates a tradition of *Guru Nanak* (1469–1539): Sikhs hold that the Guru, travelling with his companion *Bhai Mardana* during the fourth of his great journeys (*udasis*) and having spent forty days at the nearby *Tilla Jogian*, came to this waterless tract in the heat of summer. When Bhai Mardana lamented his thirst, the Guru is said to have struck the ground with his staff and moved a stone, causing a natural spring to well up — the *choa* that gives the shrine its name. A further Sikh legend relates that Sher Shah Suri, builder of Rohtas Fort, thrice attempted to divert the spring uphill to supply his stronghold, and thrice his engineers failed. The first commemorative structure, with a *sarovar* (sacred tank) and a place for the recitation of the *Guru Granth Sahib*, is attributed to Charat Singh; the present building dates from 1834 and was commissioned by *Maharaja Ranjit Singh*. Long neglected after the Partition of 1947, the gurdwara was reopened to pilgrims around the time of Guru Nanak's 550th birth anniversary in 2019, and from 2020 a diaspora Sikh organisation undertook its rehabilitation and restoration.
    -
    -=====================================================================================
    ```


### Gurdwara Darbar Sahib Kartarpur
  - `Description` (diff):

    ```diff
    @@ -35,3 +35 @@
     - UNESCO and international press coverage of the Kartarpur Corridor and its inauguration for Guru Nanak's 550th *Prakash Utsav* (2019).
    -
    -=====================================================================================
    ```


### Gurdwara Dash Mesh Pita
  - `Description` (diff):

    ```diff
    @@ -17,3 +17 @@
     - AllAboutSikhs, "Gurudwara Sadhu Bela, Sukkur" (for contrast).
    -
    -=====================================================================================
    ```


### Gurdwara Dera Sahib
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Records of the Evacuee Trust Property Board (ETPB) and heritage documentation of the Lahore Fort and Badshahi Mosque ensemble.
    -
    -=====================================================================================
    ```


### Gurdwara Guru Ram Das Ji
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Patwant Singh, *The Sikhs* (Knopf/Doubleday).
    -
    -=====================================================================================
    ```


### Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Khoohi Bhai Lalo, in the old town of Eminabad, marks the home and the narrow well (*khooi*) of *Bhai Lalo*, the honest carpenter with whom *Guru Nanak Dev Ji* lodged when he came to the town in the early sixteenth century. Bhai Lalo, traditionally said to have been born at Saidpur (Eminabad) in 1452 into a family of carpenters, became one of the most beloved of the Guru's early companions, and his house grew into a *dharamsala*, a gathering-place for the local followers of Guru Nanak. The site is inseparable from one of the most famous of all the *sakhis*: the story of *Malik Bhago*, a wealthy official of Eminabad who held a great feast and was affronted when the Guru chose the plain fare of the labouring carpenter over his own rich table. Summoned to explain himself, Guru Nanak is remembered to have taken Bhai Lalo's coarse bread in one hand and Malik Bhago's fine bread in the other and pressed them: from the honest man's bread there flowed milk, and from the oppressor's, blood — a sign, the Guru explained, that Lalo's food was earned by the sweat of honest toil, while Bhago's was wrung from the exploitation of the poor. The parable of the milk and the blood has ever since stood at the heart of the Sikh ethic of *kirat karni*, of earning one's bread by honest labour and sharing it with others. The gurdwara, named for the well that still survives, preserves this memory; since Partition it has been maintained as part of Pakistan's Sikh heritage and visited by pilgrims, usually in the same round as the nearby Chakki Sahib and Rori Sahib shrines.
    -
    -=====================================================================================
    ```


### Gurdwara Malji Sahib
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Sri Mal Ji Sahib stands in Nankana Sahib, near the railway station and close to Gurdwara Kiara Sahib, and commemorates one of the miracles of *Guru Nanak Dev Ji's* childhood. Its name comes from the *mal* — a shady tree, also called *van* or *jal* — beneath which the young Nanak, tending his father's cattle, once lay asleep in the heat of the day. According to the *sakhi*, the local landlord *Rai Bular*, riding through his fields with his attendants, came upon the sleeping child and saw that a great cobra had spread its hood over Nanak's face to shade him from the sun, withdrawing quietly as the men approached. This wonder — remembered together with the miracle of the untouched crop at nearby Kiara Sahib — is said to have convinced Rai Bular of the boy's spiritual greatness, so that he became a devoted follower of Guru Nanak and later granted him half of his estate. A gurdwara was first built on the spot by *Diwan Kaura Mall* and later renovated in the time of *Maharaja Ranjit Singh*; larger and more ornate than Kiara Sahib, it is crowned by a central dome with domed kiosks at the corners and porches along the hall, and its interior is faced with old ceramic tiles, each some four inches square and each depicting a cobra in memory of the miracle. Since Partition the shrine has been maintained as part of Pakistan's Sikh heritage and is visited by pilgrims on the great anniversaries, forming, with Kiara Sahib, the eastern cluster of the Nankana Sahib shrines.
    -
    -=====================================================================================
    ```


### Gurdwara Panja Sahib
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Records of the Evacuee Trust Property Board (ETPB) and press coverage of the Baisakhi pilgrimages to Panja Sahib.
    -
    -=====================================================================================
    ```


### Gurdwara Panjvi Chati Patshahi
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Pilgrimage guides to the historic gurdwaras of Nankana Sahib.
    -
    -=====================================================================================
    ```


### Gurdwara Patshahi Chhevin (Hadiara), Lahore
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Patshahi Chhevin at Hadiara, a village of the Lahore District lying off the Lahore–Ghawindi (formerly Lahore–Patti) road near the Bambawali–Ravi–Bedian (BRB) canal, commemorates a visit by Guru Hargobind, the sixth Guru (*Chhevin Patshahi*). By tradition the Guru — *Miri–Piri da Malik*, "master of the temporal and the spiritual" — came to Hadiara with a body of Sikhs around 1620 and stayed overnight to bless the local *sangat*. Before Partition the gurdwara held a large annual fair at *Maghi*, and in the days of the Sikh Empire it is said to have been endowed with some hundred acres of land; it was administered by the Shiromani Gurdwara Parbandhak Committee until 1947. After Partition the shrine fell empty and was for a time occupied by refugees; during the 1965 war soldiers of the Indian Army's Sikh Regiment, reaching the border village, are reported to have repaired its shell-damaged dome and raised a *Nishan Sahib* upon it. The building, the tallest in Hadiara, survives with notable interior murals depicting episodes of Sikh history, including the Battle of Kartarpur of 1635. It should not be confused with the Gurdwara Chhevin Patshahi at Chitti Gatti near Mansehra (a separate entry in this dataset), which commemorates the same Guru at a different place.
    -
    -=====================================================================================
    ```


### Gurdwara Patti Sahib
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Pakistan Sikh Gurdwara Parbandhak Committee and pilgrimage guides to the shrines of Nankana Sahib.
    -
    -=====================================================================================
    ```


### Gurdwara Pehli Patshahi (Jind Pir), Sukkur
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Gurdwara Pehli Patshahi, popularly called Jind Pir, stands on the Sukkur side of the great bridge that carries the Lahore–Karachi railway across the Indus between Sukkur and Rohri. By tradition it marks a spot graced by Guru Nanak, the first Guru (*Pehli Patshahi*), during his third journey (*udasi*) through Sindh; it was from here, the tradition holds, that he crossed to the river islet later famous as Sadh Belo (a separate entry in this dataset). Its first custodian is said to have been an Udasi *sadhu* of the Jhulelal devotion, and the shrine passed into the keeping of the Nanakpanthi community of Sindh — Hindus and Sikhs together — who honour Guru Nanak without a firm confessional boundary. Within, the *Guru Granth Sahib* is installed and its *prakash* performed, while images are also venerated, and a lamp said to have been kindled by the Guru himself is kept burning day and night, before which pilgrims bow. The gurdwara is thus a characteristic monument of Sindh's syncretic Nanakpanthi tradition, distinct both from the island temple of Sadh Belo and from the other Sikh sites of the Sukkur–Rohri conurbation. Much of its detailed history survives only in oral and community tradition.
    -
    -=====================================================================================
    ```


### Gurdwara Rori Sahib
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Government of Pakistan, Evacuee Trust Property Board, records on Sikh heritage gurdwaras.
    -
    -=====================================================================================
    ```


### Gurdwara Sach Khand Sahib
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Evacuee Trust Property Board (Pakistan), Functional Gurdwaras register.
    -
    -=====================================================================================
    ```


### Gurdwara Sacha Sauda
  - `Description` (diff):

    ```diff
    @@ -25,3 +25 @@
     - Singh, Nikky-Guninder Kaur. *Sikhism: An Introduction*. I. B. Tauris.
    -
    -=====================================================================================
    ```


### Gurdwara Sahib Saidpur (Guru Nanak Dev Ji)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Sikh gurdwara at Saidpur Village stands at the foot of the Margalla Hills on the northern edge of Islamabad, within the historic multi-faith village that also preserves a Hindu temple complex (the Ram Kund mandirs). Saidpur is an old settlement — traditionally traced to the early sixteenth century and named after Sultan Said Khan, a chief of the Pothohar region — that served in Mughal times as a garden resort watered by its perennial springs, and that long sheltered a mingled population of Hindus, Sikhs, and Muslims. The gurdwara was built by the Sikh community in the early twentieth century and is remembered as having housed a school dedicated to the teachings of Guru Nanak, the founder of the Sikh faith. It remained active until the Partition of 1947, after which, the Sikh congregation having departed, the building was repurposed — for a time as a girls' school — before being closed in the mid-2000s when Saidpur was developed as a cultural-heritage and tourist village by the Capital Development Authority. Standing beside the temples and close to an old mosque, the disused gurdwara is today valued chiefly as a monument to the religious plurality of pre-Partition Saidpur, a small but eloquent survival of the shared life of the Pothohar.
    -
    -=====================================================================================
    ```


### Gurdwara Shaheed Bhai Taru Singh
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Gandhi, Surjit Singh. *History of Sikh Gurus Retold*.
    -
    -=====================================================================================
    ```


### Gurdwara Shaheed Ganj Singh Singhnian
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Shiromani Gurdwara Parbandhak Committee and SikhiWiki, entries on Gurdwara Shahid Ganj Singhnian, Lahore.
    -
    -=====================================================================================
    ```


### Gurdwara Singh Sabha
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Wikipedia, "Sikhism in Pakistan" (with cited sources).
    -
    -=====================================================================================
    ```


### Gurdwara Sri Kiara Sahib
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Histories of Sant Gurmukh Singh "Sevavale" and the pre-Partition rebuilding of Sikh gurdwaras.
    -
    -=====================================================================================
    ```


### Gurdwara Sri Tilganji Sahib
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
    -Gurdwara Sri Tilganji Sahib stands on Masjid Road in the heart of Quetta, the capital of Balochistan. By Sikh tradition the site marks a visit by Guru Nanak, the first Guru, during one of his great journeys, or udasis: it is said that the Guru honoured the assembled sangat by distributing til — sesame seeds — as parshad, the sanctified offering, and that from this the shrine took its name, Tilganji deriving from til (sesame) and ganj (treasury or store). The gurdwara is a substantial domed building whose main gateway is said to resemble that of a mosque; within its precincts, in a pattern common to many gurdwaras in Pakistan after 1947, a government school — the Government Sandeman School — has long functioned, occupying land belonging to the shrine. Quetta was almost entirely destroyed in the catastrophic earthquake of 1935, so that the present fabric of the building, like much of the city, is unlikely to be of great antiquity, even if the sanctity of the site is older. The gurdwara is one of the principal Sikh shrines of the city and is to be distinguished from the Gurdwara Singh Sabha of Quetta, recorded separately in this dataset. NOTE: coordinates approximate (central Quetta, Masjid Road area); distinct from row 88 Gurdwara Singh Sabha. Founding predates the 1935 earthquake; structural age hedged accordingly.
    -
    -=====================================================================================
    +Gurdwara Sri Tilganji Sahib stands on Masjid Road in the heart of Quetta, the capital of Balochistan. By Sikh tradition the site marks a visit by Guru Nanak, the first Guru, during one of his great journeys, or udasis: it is said that the Guru honoured the assembled sangat by distributing til — sesame seeds — as parshad, the sanctified offering, and that from this the shrine took its name, Tilganji deriving from til (sesame) and ganj (treasury or store). The gurdwara is a substantial domed building whose main gateway is said to resemble that of a mosque; within its precincts, in a pattern common to many gurdwaras in Pakistan after 1947, a government school — the Government Sandeman School — has long functioned, occupying land belonging to the shrine. Quetta was almost entirely destroyed in the catastrophic earthquake of 1935, so that the present fabric of the building, like much of the city, is unlikely to be of great antiquity, even if the sanctity of the site is older. The gurdwara is one of the principal Sikh shrines of the city and is to be distinguished from the Gurdwara Singh Sabha of Quetta, recorded separately in this dataset.
    ```

  - `qa_note` (new column): `'coordinates approximate (central Quetta, Masjid Road area); distinct from row 88 Gurdwara Singh Sabha. Founding predates the 1935 earthquake; structural age hedged accordingly.'`
  - `needs_review` (new column): `'events_placeholder'`

### Gurdwara Tambo Sahib
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Pilgrimage guides to the historic gurdwaras of Nankana Sahib.
    -
    -=====================================================================================
    ```


### Guru Gurpat Mandir (DB-80 Sirey Ghat)
  - `Description` (diff):

    ```diff
    @@ -25,3 +25 @@
     - General accounts of the Jagiasi/Udasi Nanakpanthi tradition in Sindh.
    -
    -=====================================================================================
    ```


### Gurudwara Janam Asthan Nankana Sahib
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Records of the Evacuee Trust Property Board (ETPB) and Government of Punjab heritage listings, together with press coverage of the annual Gurpurab pilgrimages.
    -
    -=====================================================================================
    ```


### Jagannath Temple, Sialkot
  - `Description` (diff):

    ```diff
    @@ -21,3 +21 @@
     - Wikipedia, "Shivala Teja Singh temple," for contrast; the redirect from "Jagannath Temple, Sialkot" reflects an unresolved identification, not a confirmed identity between the two sites.
    -
    -=====================================================================================
    ```


### Jain Mandir, Lahore
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     On Lytton Road in Old Anarkali, directly opposite the Anarkali station of the Orange Line Metro Train, stands the Jain Mandir, one of the last physical reminders of Lahore's once-substantial Jain community. Built around 1940 to serve the city's Bhabra Jain merchant families — Punjab having historically been home to a significant Jain trading population — the temple follows a shikhara-style form typical of North Indian Jain architecture and was dedicated to the veneration of the Tirthankaras, the enlightened teacher-figures central to Jain belief and practice. Like much of Lahore's pre-Partition religious minority heritage, the temple fell into disuse after 1947, when the great majority of the city's Jain and Hindu population departed for India. Its most severe blow came in 1992, when it was heavily vandalised in retaliation for the demolition of the Babri Masjid in Ayodhya, India, leaving the building damaged and effectively abandoned for three decades. The turning point came in December 2021, when Pakistan's Supreme Court ordered its restoration, leading to an eight-month conservation effort. The temple reopened in June 2022, allowing religious use to resume after a hiatus of roughly thirty years — an unusual and widely reported instance in Pakistan of an active return to worship, rather than mere heritage preservation, at a minority religious site. Though Jainism has only a residual presence in contemporary Pakistan, the temple's revival has been framed in Pakistani and international press as a significant, if modest, gesture of religious pluralism, and the building today stands as a rare functioning Jain place of worship anywhere in the country, embedded within the dense, historically layered streetscape of Old Anarkali.
    -
    -=====================================================================================
    ```


### Jhollay Lal Mandir
  - `Description` (diff):

    ```diff
    @@ -25,3 +25 @@
     - General accounts of Sindhi Hindu Cheti Chand observance and the Jhulelal/Udero Lal tradition.
    -
    -=====================================================================================
    ```


### Kali Bari Mandir
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Reema Abbasi, *Historic Temples in Pakistan: A Call to Conscience* (Niyogi Books), for the temples of the north-west.
    -
    -=====================================================================================
    ```


### Kalka Cave Temple (Asthan of Kalka Devi)
  - `Description` (diff):

    ```diff
    @@ -24,5 +24,3 @@
     - *The Friday Times* and *The Express Tribune*, features on the Kalka Devi Temple, Rohri.
    -- H. T. Lambrick, *Sind: A General Introduction* (Sindhi Adabi Board), on Aror and the historical geography of the Rohri region.
    +- H. T. Lambrick, *Sindh: A General Introduction* (Sindhi Adabi Board), on Aror and the historical geography of the Rohri region.
     - Wikipedia, "Kalka Cave Temple" and "Aror (Alor)" (with cited sources).
    -
    -=====================================================================================
    ```


### Katas Raj Temples
  - `Description` (diff):

    ```diff
    @@ -33,3 +33 @@
     - The *Mahabharata* and Puranic *tirtha* literature for the Shiva and Pandava traditions.
    -
    -=====================================================================================
    ```


### Khatwari Darbar, Shikarpur
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Khatwari Darbar is among the most celebrated of the historic Sikh and Nanakpanthi shrines of Shikarpur, the north-Sindh town once known as the "Paris of Sindh" for the wealth of its merchant houses. It is traditionally held to have been founded by Bhai Gurdas Singh — also remembered by the name Kanhiya Lal — a disciple of Guru Gobind Singh who, after the Guru's death in 1708, is said to have travelled to Sindh and preached the Sikh teaching at Shikarpur. He is remembered as delivering his sermons seated upon a *khat* (a rope cot), from which the darbar took its name, "Khatwari". The building most likely dates to the second quarter of the eighteenth century and is one of the finest structures in the town: a two-storey *haveli*-style darbar noted for its fresco paintings and intricate woodwork, decoration rarely matched elsewhere in upper Sindh. Images of the ten Sikh Gurus adorn its walls, and three doorways open onto the main hall, where the *Guru Granth Sahib* is installed. The darbar belongs to the shared Nanakpanthi and *Udasi* devotional world of Sindh, in which Sindhi Hindus and Sikhs venerated the Gurus together. There are in fact three Khatwari Darbars in Shikarpur — the principal one, or Khatwari Dharamshala, in Thekrati Bazar — and the tradition of Bhai Gurdas is also remembered at Shahdadkot and at Gandava in Jhal Magsi.
    -
    -=====================================================================================
    ```


### Krishna Mandir (Kabari Bazar)
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Wikipedia, "Krishna Temple, Rawalpindi" (with cited press sources).
    -
    -=====================================================================================
    ```


### Krishna Mandir (Ravi Road)
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Wikipedia, "Krishna Mandir, Lahore" and "List of temples in Lahore" (with cited sources).
    -
    -=====================================================================================
    ```


### Lal Kurti Temple (Balmiki Mandir), Rawalpindi
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Lal Kurti Temple — also called the *Balmiki* (Valmiki) Mandir — stands in the historic Lalkurti quarter of Rawalpindi Cantonment, a bazaar district whose name ("red shirt") recalls the red tunics of the British Indian Army soldiers who once shopped there and gave the old British Infantry Bazaar its popular name. Completed in 1905 in a Mughal-influenced idiom, the temple is dedicated to the sage-poet *Valmik* (Valmiki), revered as author of the *Ramayana* and venerated especially by the Balmiki community. It remained a focal point for local Hindus both before and after the Partition of 1947; while most of the quarter's Hindus left in 1947, a small community stayed on and kept the temple in worship, and its first post-Partition custodian, Kheera Lal, is buried within a side portion of the complex. As of 2025 it is reported to be the only Hindu place of worship still functioning in Lalkurti — a neighbourhood that once held shrines of several faiths — and it is counted as one of the three principal Hindu temples of Rawalpindi district, alongside the Krishna Mandir of Saddar and the Valmiki Swamiji Mandir of Gracy Lines. The temple hosts daily worship and the major festivals of *Diwali*, *Holi* and *Raksha Bandhan*, and its upkeep has been associated with the Pakistan Hindu Balmik Welfare Society and with the few dozen local families who continue to maintain it.
    -
    -=====================================================================================
    ```


### Lal Shahbaz Qalandar
  - `Description` (diff):

    ```diff
    @@ -37,3 +37 @@
     - General established histories of the qalandari tradition and of Sehwan Sharif.
    -
    -=====================================================================================
    ```

  - `needs_review` (new column): `'events_placeholder'`

### Langer Makhdoom
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Local hagiographical tradition concerning Hazrat Makhdoom Burhan-ud-din (to be used with due caution).
    -
    -=====================================================================================
    ```


### Loh Temple (Lava Temple)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Wedged into the narrow space between the western wall of Lahore Fort and the eastern wall of Hazuri Bagh, close to the Alamgiri Gate, stands one of Lahore's most storied yet architecturally modest religious survivals: the Loh, or Lava, Temple. According to Hindu tradition, Lahore takes its name from Lava (also rendered Luv), twin son of Lord Rama and Sita in the Ramayana, who is said to have founded the city — known in Sanskrit as Lavapuri, the "City of Lava" — while his brother Kusha is traditionally credited with founding nearby Kasur. Despite this ancient legendary association, historians including Sir Edward MacLagan date the surviving structure itself to the early nineteenth century, likely built during or shortly after Maharaja Ranjit Singh's conquest of Lahore Fort in 1799, making it a Sikh-period commemorative shrine to an ancient legend rather than an ancient building in its own right. The temple is a simple hexagonal brick structure of interconnected chambers around an inner sanctum, historically topped by a dome that has since been lost; it contains no surviving Ramayana carvings or frescoes, consistent with its comparatively late construction. For much of the twentieth century the temple stood neglected and largely inaccessible within the Fort precincts. Between 2024 and 2026 it underwent careful restoration by the Walled City of Lahore Authority in partnership with the Aga Khan Cultural Service–Pakistan, funded by the United States Ambassadors Fund for Cultural Preservation, alongside related Sikh-era monuments nearby. It reopened to the public on 27 January 2026, drawing renewed attention in both Pakistani and Indian media as a rare, tangible link between Lahore's Hindu mythological heritage and its physical urban fabric, even though it does not currently host regular congregational worship in the manner of Lahore's active mandirs.
    -
    -=====================================================================================
    ```


### Mausoleum of Waris Shah
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - General established histories of Punjabi literature.
    -
    -=====================================================================================
    ```


### Mazar of Bulleh Shah
  - `Description` (diff):

    ```diff
    @@ -2,3 +2,3 @@
     
    -At Kasur, south of Lahore, lies the shrine of Hazrat Bulleh Shah (Sayyid Abdullah Shah Qadri, c. 1680–1757), the towering Punjabi Sufi poet whose *kafis* are among the best-loved verses ever composed in the language. Heir to the tradition of Shah Hussain and forerunner of Waris Shah, Bulleh Shah gave Punjabi mysticism some of its most piercing and rebellious poetry — verse that scorned the hypocrisy of the learned, dissolved the boundaries of caste and creed, and sang of a love for God that overturns the self. His tomb at Kasur is a place of pilgrimage and, still more, his poetry a living presence, sung by qawwals and folk-singers and, in our own day, by pop musicians across South Asia.
    +At Kasur, south of Lahore, lies the shrine of Hazrat Bulleh Shah (Sayyid Abdullah Shah Qadiri, c. 1680–1757), the towering Punjabi Sufi poet whose *kafis* are among the best-loved verses ever composed in the language. Heir to the tradition of Shah Hussain and forerunner of Waris Shah, Bulleh Shah gave Punjabi mysticism some of its most piercing and rebellious poetry — verse that scorned the hypocrisy of the learned, dissolved the boundaries of caste and creed, and sang of a love for God that overturns the self. His tomb at Kasur is a place of pilgrimage and, still more, his poetry a living presence, sung by qawwals and folk-singers and, in our own day, by pop musicians across South Asia.
     
    @@ -39,3 +39 @@
     - General established histories of Punjabi Sufi poetry.
    -
    -=====================================================================================
    ```


### Mithankot (Kot Mithan)
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - General established histories of Seraiki literature and Chishti Sufism.
    -
    -=====================================================================================
    ```


### Mohra Sharif (Khanqah)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Mohra Sharif is a celebrated *khanqah* — a Sufi lodge and spiritual centre — set in a small village in the Murree hills of the Punjab, some distance above Islamabad and Rawalpindi. It is the home of the *Naqshbandi Mujaddidi Qasimiya* order, and takes its name (the "holy village") from its sanctity. The centre was established by *Khwaja Muhammad Qasim Sadiq*, born about 1846 (1263 AH), whose forebears are said to have migrated from Iran and settled in the Rawalpindi district. According to the traditions of the order, he journeyed on foot to the shrine of his spiritual guide, *Khwaja Nizamuddin Aulia* of Kahiyan Sharif in the Neelam Valley of Kashmir, and there received *khilafat* with the instruction to settle at Mohra Sharif. He is said to have undertaken a *chilla* — a forty-day retreat of unbroken devotion — and the stone slab on which he sat throughout is preserved at the shrine as a relic (*tabarruk*). On his death the spiritual seat passed to his son Khwaja Pir Muhammad Zahid Khan, remembered as the first *sajjada nashin* (custodian) of Mohra Sharif, and thence down a line of successors. The khanqah remains an active centre of Naqshbandi devotion, drawing pilgrims especially at its annual *urs*, and is counted among the important Sufi shrines of the northern Punjab.
    -
    -=====================================================================================
    ```


### Nagarparkar Jain Temples (Nagarparkar Cultural Landscape)
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Ahmad Nabi Khan, *Islamic Architecture of Pakistan* (for the Bhodesar mosque and regional context).
    -
    -=====================================================================================
    ```


### Panj Tirath
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Directorate of Archaeology, Khyber Pakhtunkhwa, notifications under the KP Antiquities Act 2016.
    -
    -=====================================================================================
    ```


### Parnami Mandir
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - General literature on the *bhakti* movements of western India and their spread into Sindh and the Punjab.
    -
    -=====================================================================================
    ```


### Prahladpuri Temple
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Reports on the 1992 destruction of Hindu temples in Pakistan and the status of Evacuee Trust properties.
    -
    -=====================================================================================
    ```


### Purana Bhalwal
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Gazetteer of the Shahpur District (the historic district encompassing Bhalwal and Sargodha), Punjab Government.
    -
    -=====================================================================================
    ```


### Rahman Baba Mausoleum (Rehman Baba Shrine)
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - General established histories of Pashto literature and Sufism.
    -
    -=====================================================================================
    ```


### Ram Mandir, Saidpur (Ram Kund Mandir)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Ram Mandir at Saidpur — also known as the Ram Kund Mandir — stands in the historic village of Saidpur, set in a fold of the Margalla Hills on the northern edge of Islamabad. A Hindu temple dedicated to *Lord Rama*, it is traditionally dated to the sixteenth century and attributed by some accounts to Raja Man Singh I, the Rajput general of the Mughal emperor Akbar. The site's sanctity is bound to the belief that Rama, with Sita and Lakshmana, passed through this country during the years of exile recounted in the *Ramayana*: the natural springs of the village, fed by the hill streams, were revered as sacred pools, and four of them are traditionally named for Rama, Sita, Lakshmana, and Hanuman. Before Partition, Saidpur was a place of notable interfaith coexistence, home to Muslims, Hindus, and Sikhs together, its skyline holding a mosque, this Hindu temple, and — from the early twentieth century — a Sikh *gurdwara*. After 1947 the temple ceased to function as a place of worship; it was used for a time as a girls' school, and in the 2000s the Capital Development Authority restored Saidpur as a heritage and arts village, conserving the temple's fabric while its idols were removed and its images painted over. The building survives as a protected monument and a popular destination for visitors to Islamabad, though the local Hindu community has not been permitted to resume regular rituals there — a source of continuing appeal by Hindu representatives.
    -
    -=====================================================================================
    ```


### Ramapir Temple, Tando Allahyar
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Regional gazetteer material on the cult of Ramdev Pir and Ramdevra.
    -
    -=====================================================================================
    ```


### Ranmal Sharif
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Qadiri/Naushahia order in the Punjab.
    -
    -=====================================================================================
    ```


### Sadh Belo (Sadh Belo Island Temple)
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Accounts of the *gaddi nashin* lineage and the nineteenth-century building of the temple complex.
    -
    -=====================================================================================
    ```


### Sain Vali Vilayat Rai Darbar, Kambar
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The darbar of Sain Vali Vilayat Rai stands in the *Shivalo* quarter of Kambar (Qambar), the headquarters town of the Qambar–Shahdadkot District of upper Sindh, and is described by the anthropologist Zulfiqar Ali Kalhoro as the largest Nanakpanthi *darbar* in the district. Its founder, Vali Vilayat Rai, was born in 1825 into a prosperous Hindu family of Old Hala; his father, Pratab Rai, had served as a *munshi* (secretary) to the Talpur Mirs of Hyderabad. Vali Vilayat Rai settled first at Larkana and later moved to Kambar, where he chose the then-unpopulated Shivalo locality — remembered as a resort of *yogis*, *sants* and *sadhus* drawn from Kambar, Shahdadkot, Larkana and the surrounding towns — and there established his darbar, raising a great hall in which the *Guru Granth Sahib* was installed. Like the wider body of Sindhi Nanakpanthis, his followers venerate the Hindu deities together with Baba Guru Nanak, his son Baba Sri Chand, and the other Sikh Gurus, so that the darbar belongs at once to Hindu and to Sikh devotional worlds; it is entered here under "Hindu Temple" as the closest of the dataset's three categories, following the convention used for the other Sindhi *sant* darbars in this collection. The darbar and the *samadhi* (memorial shrine) of Vali Vilayat Rai remain at Kambar, and the lineage retains a devotional following, though — as with most Sindhi Hindu shrines — much of the community associated with it now lives in India. The saint is counted among a constellation of nineteenth- and early-twentieth-century Nanakpanthi masters of the Larkana country, among them Swami Dharmdas of Larkana and Bhai Waliram of Digano Mahesar.
    -
    -=====================================================================================
    ```


### Sakhi Sarwar
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Sakhi Sarwar cult and the shared religious culture of the Punjab.
    -
    -=====================================================================================
    ```


### Samadhi of Maharaja Ranjit Singh
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Immediately beside Lahore Fort and the Badshahi Mosque, on the spot where Maharaja Ranjit Singh's body was cremated, stands the samadhi built in his memory — one of the grandest funerary monuments of the Sikh Empire. Ranjit Singh, the "Lion of Punjab," founded and ruled the Sikh Empire from 1801 until his death on 27 June 1839. Construction began the following month under his son Kharak Singh and was largely completed by 1848 under his youngest son, Duleep Singh, with final repairs funded by the British after their 1849 annexation of Punjab. At the monument's heart, beneath a marble pavilion inlaid with pietra dura stonework, a lotus-shaped marble urn holds the Maharaja's ashes, surrounded by smaller urns commemorating the four queens and seven attendants who, according to the custom of sati, died on his funeral pyre. Adjoining smaller samadhis honour his son Kharak Singh and grandson Nau Nihal Singh. Architecturally the building is a striking synthesis of Sikh, Hindu and Islamic idioms: gilded fluted domes and cupolas rise above red sandstone doorways carved with images of Ganesha, Devi and Brahma, while surviving interior frescoes, painted between 1839 and 1849, have been reassessed by modern scholars as a high point of Sikh decorative art. Though formally a samadhi rather than a constituted gurdwara, the site has long functioned as a living place of Sikh devotion: the Guru Granth Sahib was installed and read there for decades after construction, and today it remains an active pilgrimage destination, especially around Ranjit Singh's death anniversary and the spring Vaisakhi season, when Sikh visitors, including delegations from India, gather to pay homage. The Evacuee Trust Property Board administers the site, one of the most visited symbols of Sikh heritage remaining in Pakistan.
    -
    -=====================================================================================
    ```


### Sant Baba Asudaram Darbar (Panno Aqil)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Darbar of Sant Baba Asudaram at Panno Aqil (Pano Akil), a town of the Sukkur District some forty kilometres north of Sukkur city, is among the surviving *sant* shrines of the Sindhi Hindu (Nanakpanthi) tradition. Asudaram (1895–1960), remembered by the honorific *Sakhi Baba*, "the generous master," was born on 3 April 1895 in the village of Jatoin near Panno Aqil, the son of Bhai Ludhrodmal and Chaini Bai. As a boy he came under the influence of Sant Shiromani Satramdas of Raharki (whose *Devri Sahib* is a separate entry in this dataset), and he later served at the Raharki *darbar* under the martyr-saint Bhagat Kanwar Ram (also recorded separately here), who is said to have given him the name *Shiv Swaroop*. On his Guru's instruction he returned to Panno Aqil in 1940 and there established his own *Darbar Sahib*. Around it grew a network of social works for which he became renowned — schools (*pathshalas*), a dispensary, and homes for the elderly and destitute — sustained by a *sadavrat* said to serve food and sweet water around the clock without distinction of caste or creed. He died on 4 September 1960, on the day of *Anant Chaturdashi*, and was succeeded by his son Sai Chanduram, whose activity later shifted to Lucknow in India. The darbar at Panno Aqil endures as the principal shrine of his lineage in Pakistan.
    -
    -=====================================================================================
    ```


### Sant Baba Bhagat Ram Darbar Mandir
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Wikipedia, "Hinduism in Sindh" and "Dadu, Sindh", with cited sources.
    -
    -=====================================================================================
    ```


### Sant Bhagat Kanwar Ram Temple (Chak)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     This temple at Chak, a town in Shikarpur district, is dedicated to the memory of Bhagat Kanwar Ram (1885–1939), one of the best-loved Sindhi Hindu saint-singers of the twentieth century. Born in the village of Jarwar in the Sukkur region, he became renowned for his rendition of the *Sur Prabhati*, sung in the early morning; the gramophone company HMV is said to have preserved a number of his devotional songs on record, spreading his fame across Sindh. Revered by Hindus and Muslims alike as a figure of piety and communal harmony, he was assassinated at Ruk railway station in the Sukkur area in November 1939 and is remembered as a martyr. The temple at Chak was raised in his name after his death and was rebuilt in 2006; its main hall holds canopies bearing images of Bhagat Kanwar Ram and of Sant Satram Das, the saint of the *Sacho Satram* tradition with whom his memory is closely linked. In a syncretic touch characteristic of Sindhi devotion, the *Guru Granth Sahib* is also installed within, so that the darbar is honoured by Hindu and Sikh worshippers together. Every year on 2 November his followers gather to mark the anniversary of his martyrdom, both at this shrine and at Ruk station where he was killed.
    -
    -=====================================================================================
    ```


### Sant Satram Dham, Raharki (Sacho Satram / Devri Sahib)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The town of Raharki (Raherki Sahib) in Ghotki district, in upper Sindh close to the Punjab border, is home to the *Sant Satram Dham* — also known as *Devri Sahib*, and, after the devotional movement it anchors, as *Sacho Satram* — reckoned among the largest and most frequented Hindu shrines in present-day Pakistan. It marks the birthplace of *Satguru* Swami Sai Satramdas Sahib, the revered Sindhi saint born here, according to the tradition, on 25 October 1866. He gave his life to spiritual teaching in the syncretic Sindhi devotional mould, preaching love, humility and service to the destitute, and drawing followers from across Sindh who came to him for blessing and healing; the tradition records that he "left the mortal body" on 25 January 1910. After his passing the *Devri* (shrine) at Raharki grew into the principal seat of his lineage, whose devotees revere a holy text recited at the shrine known as the *Dhuni Sahib*. Today thousands of pilgrims — Sindhi Hindus from Pakistan, India and the diaspora — gather at Raharki, especially each October to mark the saint's birth anniversary, and the site is locally described as one of the biggest temples in the country. A succession of *sants* has continued to lead the community, and the darbar sustains traditions of communal hospitality and worship; the town itself is noted as one where Muslims and Hindus have long lived together. His memory is closely linked with that of Bhagat Kanwar Ram (also recorded in this dataset), with whom the *Sacho Satram* tradition is associated.
    -
    -=====================================================================================
    ```


### Sevapanthi Darbar (Bhai Gurdas), Gandava
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     In the heart of Gandava — the old headquarters town of the Jhal Magsi District on the Kachhi (Kach Gandava) plain of Balochistan — stands a *darbar* of the *Sevapanthi* tradition, the order of devotees descended from Bhai Gurdas, the disciple of Guru Gobind Singh who is said to have carried the Nanakpanthi teaching into Sindh and Balochistan in the eighteenth century. According to the anthropologist Zulfiqar Ali Kalhoro, who has surveyed the Hindu and Sikh heritage of the region, the Gandava darbar was founded by one of Bhai Gurdas's disciples; the *Sevapanthis* (also written Sewapanthis, "those of the path of service") established such darbars and *dharamshalas* in many towns of Sindh and Balochistan, joining the veneration of Guru Nanak to a discipline of charitable hospitality. The Gandava darbar is celebrated above all for its woodwork: an intricately carved wooden frame decorating the main façade depicts Baba Guru Nanak flanked by his companions Bhai Bala and Bhai Mardana, together with the Hindu deities Ganesha (*Ganpati*) and Krishna — a vivid emblem of the syncretic Nanakpanthi devotion in which Sikh and Hindu figures share a single sacred idiom. The carving belongs to the same tradition of craftsmanship that produced the famed woodwork of the Khatwari Darbar at Shikarpur (a separate entry in this dataset), and the wider district is noted for such carvings of Krishna, Ganpati and Guru Nanak with his minstrel companions. Filed here under "Sikh Gurdwara" as the closest of the dataset's three categories, the darbar is more precisely a Nanakpanthi–Sevapanthi shrine of the kind once common among the Hindu mercantile communities of the Sindh–Balochistan borderland. Its exact date of foundation is not securely recorded, and — like many such darbars whose congregations dispersed after 1947 — the details of its present custody and use are uncertain, though the building and its carved façade were reported still standing when documented in recent years.
    -
    -=====================================================================================
    ```


### Shah Noorani Shrine (Syed Bilawal Shah Noorani)
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established accounts of the Shah Noorani shrine and the Lahut Lamakan valley.
    -
    -=====================================================================================
    ```


### Shah Yousuf
  - `Description` (diff):

    ```diff
    @@ -21,3 +21 @@
     - Local histories of Shahpur town, for contrast with its separately documented founding figure, Syed Shams Shah Shirazi.
    -
    -=====================================================================================
    ```


### Shahwala Teja Singh Mandir
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - George Michell, *The Hindu Temple: An Introduction to Its Meaning and Forms* (on the *nagara* tradition).
    -
    -=====================================================================================
    ```


### Shaktipeeth Shri Hinglaj Mata Mandir
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Ethnographic accounts of the Aghori and Charan traditions associated with Hinglaj.
    -
    -=====================================================================================
    ```


### Shamsabad
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - Devotional accounts of Hazrat Shams Ali Qalandar and his *Tegh-e-Barahna* (to be used with due caution).
    -
    -=====================================================================================
    ```


### Sharada Peeth
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Contemporary heritage and press coverage of conservation appeals and the Sharada corridor initiative (Kashmir press; Indian and Pakistani media).
    -
    -=====================================================================================
    ```


### Shergarh
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Qadiri order in the Punjab.
    -
    -=====================================================================================
    ```


### Shiv Mandir Chiti Ghati
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Reema Abbasi, *Historic Temples in Pakistan: A Call to Conscience* (Niyogi Books).
    -
    -=====================================================================================
    ```


### Shree Ratneshwar Mahadev Temple, Karachi
  - `Description` (diff):

    ```diff
    @@ -30,3 +30 @@
     - Reema Abbasi, *Historic Temples in Pakistan: A Call to Conscience* (Niyogi Books).
    -
    -=====================================================================================
    ```


### Shri Laxmi Narayan Mandir (Native Jetty Bridge)
  - `Description` (diff):

    ```diff
    @@ -26,3 +26 @@
     - Reema Abbasi, *Historic Temples in Pakistan: A Call to Conscience* (Niyogi Books), for Karachi's Hindu shrines.
    -
    -=====================================================================================
    ```


### Shri Panchmukhi Hanuman Mandir (Karachi)
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Sir Ganga Ram Heritage Foundation documentation on Karachi's Hindu temples.
    -
    -=====================================================================================
    ```


### Shri Swaminarayan Mandir, Karachi
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Studies of Partition migration through the port of Karachi.
    -
    -=====================================================================================
    ```


### Shri Varun Dev Mandir
  - `Description` (diff):

    ```diff
    @@ -22,3 +22,3 @@
     
    -- Cousens, Henry. *The Antiquities of Sind, with Historical Outline*. Archaeological Survey of India.
    +- Cousens, Henry. *The Antiquities of Sindh, with Historical Outline*. Archaeological Survey of India.
     - Boivin, Michel. *Historical Dictionary of the Sufi Culture of Sindh* and related studies on Sindhi religion.
    @@ -27,3 +27 @@
     - Heritage documentation of Manora Island and Karachi's endangered monuments.
    -
    -=====================================================================================
    ```


### Shrine at Odero Lal (Udero Lal Teerath Asthan)
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - Academic work on shared sacred spaces and river veneration in Sindh.
    -
    -=====================================================================================
    ```


### Shrine of Abdullah Shah Ghazi
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories and traditions of Karachi's patron saint.
    -
    -=====================================================================================
    ```


### Shrine of Abul Faiz Qalander Ali Suharwardi
  - `Description` (diff):

    ```diff
    @@ -34,3 +34,3 @@
     
    -The order into which Abul Faiz Qalandar was ultimately drawn is one of the oldest and most influential in Islam. The Suhrawardiyya takes its name from Abu Najib al-Suhrawardi and, above all, from his nephew Shaikh Shihab al-Din Umar al-Suhrawardi of Baghdad, whose manual *‘Awarif al-Ma‘arif* became one of the classic guides of the Sufi path. In contrast to some of the more antinomian and ecstatic movements, the Suhrawardi way was known for its sobriety, its insistence on the outward law and on refined manners (*adab*), and its readiness to engage with rulers and society for the good of the community — a temper well suited to a scholar-saint. The order was carried into the Indian subcontinent in the thirteenth century, most famously by Bahauddin Zakariya of Multan, whose great shrine remains one of the anchors of Sufism in Pakistan, and it put down deep roots across the Punjab and Sind. In taking allegiance in this line, Abul Faiz Qalandar joined a chain of transmission seven centuries deep — even as he bore, in his Gilani descent, the blood and the blessing of the Qadiri order of Abd al-Qadir Jilani. His life thus gathered up two of the great rivers of Islamic spirituality, the Qadiri and the Suhrawardi, and carried them into twentieth-century Lahore.
    +The order into which Abul Faiz Qalandar was ultimately drawn is one of the oldest and most influential in Islam. The Suhrawardiyya takes its name from Abu Najib al-Suhrawardi and, above all, from his nephew Shaikh Shihab al-Din Umar al-Suhrawardi of Baghdad, whose manual *‘Awarif al-Ma‘arif* became one of the classic guides of the Sufi path. In contrast to some of the more antinomian and ecstatic movements, the Suhrawardi way was known for its sobriety, its insistence on the outward law and on refined manners (*adab*), and its readiness to engage with rulers and society for the good of the community — a temper well suited to a scholar-saint. The order was carried into the Indian subcontinent in the thirteenth century, most famously by Bahauddin Zakariya of Multan, whose great shrine remains one of the anchors of Sufism in Pakistan, and it put down deep roots across the Punjab and Sindh. In taking allegiance in this line, Abul Faiz Qalandar joined a chain of transmission seven centuries deep — even as he bore, in his Gilani descent, the blood and the blessing of the Qadiri order of Abd al-Qadir Jilani. His life thus gathered up two of the great rivers of Islamic spirituality, the Qadiri and the Suhrawardi, and carried them into twentieth-century Lahore.
     
    @@ -58,4 +58 @@
     - Shrines Project field survey, Darbar Abul Faiz Qalandari responses (surveyor: Saifullah), 2026.
    -- Shrines Project field survey, Darbar Abul Faiz Qalandari responses, 2026.
    -
    -=====================================================================================
    ```


### Shrine of Akhund Darweza Baba
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Akhund Darweza Baba lies in the Hazarkhwani area of Peshawar, a short way south of the Ganj gate of the old walled city, where the saint was buried in the historic Hazarkhwani graveyard. *Akhund Darweza* (traditionally 1533-1638) was one of the most influential religious figures of the Pashtun country in the age of the Mughals — a Sufi and a formidable scholar of the outward religious sciences, a poet in both Pashto and Persian, and a disciple of *Sayyid Ali Tirmizi*, the saint known as *Pir Baba* of Buner (himself honoured at a shrine in this collection). He is best remembered for his learned and combative opposition to the *Roshani* movement of Bayazid Ansari (Pir Roshan), against whose teachings he wrote and preached, and for his religious works, among them the *Makhzan al-Islam* and the *Tazkirat al-Abrar wa'l-Ashrar*, which remain landmarks of early Pashto and Indo-Persian religious literature. He died in the reign of Shah Jahan and was laid to rest at Peshawar, where his tomb became, and remains, a place of pilgrimage for those who seek his blessing. The shrine is a characteristic Peshawar *ziyarat*, its custodianship and its customs handed down over the centuries, and it stands as a memorial to a saint who shaped the religious identity of the Pashtuns as both teacher and defender of orthodox belief. Its situation in the crowded graveyards east of the old city ties it to the deep Islamic heritage of Peshawar, the ancient meeting-place of Central Asia and the subcontinent.
    -
    -=====================================================================================
    ```


### Shrine of Akhund Panju Baba
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Akhund Panju Baba stands at Akbarpura, a town in Nowshera District of Khyber Pakhtunkhwa, in the historic Peshawar valley. It honours *Hazrat Syed Abdul Wahab*, known to all as *Akhund Panju Baba*, a Sufi and preacher remembered as one of the great teachers of Islam in the Pashtun country during the reign of the Mughal emperor Akbar (1556-1605). Tradition holds that many were guided to Islam through him, and that his circle of disciples included some of the most notable saints of the region — among them, it is said, *Bahadur Baba*, the father of the celebrated *Kaka Sahib* of Nowshera, so that Akhund Panju Baba stands near the head of a whole genealogy of Pashtun Sufi teachers. His tomb at Akbarpura, together with the historic mosque associated with him — a Mughal-era foundation reckoned to be some four centuries old — forms a shrine complex attended by thousands of devotees, who gather especially at the annual *urs* to seek his blessing. Set amid the fields and orchards of the Nowshera plain, the shrine is a characteristic example of the Sufi *ziyarat* of Khyber Pakhtunkhwa, where the memory of the early preacher-saints remains woven into the devotional life of the surrounding villages. Its enduring draw testifies to the reverence in which Akhund Panju Baba is held as a founder of the region's Islamic learning and as the spiritual ancestor of a line of saints whose shrines dot the valley.
    -
    -=====================================================================================
    ```


### Shrine of Baba Shah Chiragh
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Set beside the Lahore High Court on The Mall, in the shadow of the colonial-era Aiwan-e-Auqaf building that now bears its name, the shrine of Baba Shah Chiragh commemorates Syed Abdul Razzaq, a Sufi of the Qadiri lineage who traced his descent to Sheikh Abdul Qadir Gilani of Baghdad and whose family originated from Uch in what is now Bahawalpur. Given the honorific "Chiragh," meaning lamp, by his grandfather Hazrat Abdul Qadir Sani, he flourished during the reign of the Mughal emperor Shah Jahan and died in 1657 CE. His mausoleum was constructed by imperial order of Aurangzeb, and an adjoining mosque was added later, in 1716, under the patronage of Lahore's Mughal viceroy Zakariya Khan during the reign of Muhammad Shah Rangeela. The mausoleum, built of limestone on a square plan in restrained Mughal style, contains eight graves in total, including those of Shah Chiragh's father and grandfather, making it a multi-generational family shrine rather than a single tomb. Its façades feature cusped-arch niches and panelled cartouches, while the interior retains traces of floral fresco decoration. In the late nineteenth century the surrounding precinct was absorbed into the grand Indo-Saracenic Aiwan-e-Auqaf complex, built by the British administration between 1875 and 1880, which today houses the offices and library of the Auqaf Department — the same body that has administered the shrine since 1973. Though it lacks the international renown of some of Lahore's other Sufi sites, the shrine is formally catalogued as a protected heritage monument by the Punjab Directorate General of Archaeology, and its distinctive Mughal fabric, set incongruously amid the bureaucratic buildings of modern Lahore, makes it a quietly significant survival from the city's seventeenth-century religious landscape.
    -
    -=====================================================================================
    ```


### Shrine of Baba Shah Kamal
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
    -In the Muslim Town locality near Ichhra, within a graveyard that still bears his name and lends it to a surrounding housing scheme, lies the tomb of Hazrat Baba Shah Kamal, remembered chiefly as the elder brother of the celebrated Sufi Baba Shah Jamal. Their father, Syed Ahmad Shah, a descendant of Jalaluddin Surkh-Posh Bukhari of Uch Sharif, personally instructed both sons in Islamic theology before the brothers settled together in the Ichhra area of Lahore. While far less is independently documented about Shah Kamal than about his more famous sibling, local devotional tradition attaches to him the composite title "Qadri Suhrawardi," suggesting an affiliation with the same overlapping Sufi orders associated with his brother's shrine nearby, and his likely lifetime is generally placed in the same late-sixteenth to seventeenth-century Mughal-era window as Shah Jamal's own. The shrine sits within the historic Shah Kamal graveyard, still in active use as a burial ground, and continues to attract local devotees for weekly Thursday evening gatherings involving dhol drumming and qawwali, echoing in more modest form the famous dhamal tradition at his brother's shrine. An annual urs is held in his honour, drawing pilgrims from the surrounding neighbourhoods, though the precise calendar date is not widely documented. The site is formally catalogued as a monument of the historic period by the Punjab Department of Archaeology and Museums, and together with the Shah Jamal shrine it helps anchor the religious identity of this part of Lahore as a historic centre of Sufi devotion, reflecting the broader pattern by which entire Lahore neighbourhoods have taken their names and characters from the saints buried within them.
    -
    -=====================================================================================
    +In the Muslim Town locality near Ichhra, within a graveyard that still bears his name and lends it to a surrounding housing scheme, lies the tomb of Hazrat Baba Shah Kamal, remembered chiefly as the elder brother of the celebrated Sufi Baba Shah Jamal. Their father, Syed Ahmad Shah, a descendant of Jalaluddin Surkh-Posh Bukhari of Uch Sharif, personally instructed both sons in Islamic theology before the brothers settled together in the Ichhra area of Lahore. While far less is independently documented about Shah Kamal than about his more famous sibling, local devotional tradition attaches to him the composite title "Qadiri Suhrawardi," suggesting an affiliation with the same overlapping Sufi orders associated with his brother's shrine nearby, and his likely lifetime is generally placed in the same late-sixteenth to seventeenth-century Mughal-era window as Shah Jamal's own. The shrine sits within the historic Shah Kamal graveyard, still in active use as a burial ground, and continues to attract local devotees for weekly Thursday evening gatherings involving dhol drumming and qawwali, echoing in more modest form the famous dhamal tradition at his brother's shrine. An annual urs is held in his honour, drawing pilgrims from the surrounding neighbourhoods, though the precise calendar date is not widely documented. The site is formally catalogued as a monument of the historic period by the Punjab Department of Archaeology and Museums, and together with the Shah Jamal shrine it helps anchor the religious identity of this part of Lahore as a historic centre of Sufi devotion, reflecting the broader pattern by which entire Lahore neighbourhoods have taken their names and characters from the saints buried within them.
    ```


### Shrine of Bahauddin Zakariya
  - `Description` (diff):

    ```diff
    @@ -12,3 +12,3 @@
     
    -Bahauddin Zakariya’s lasting achievement was to root the Suhrawardi way in the Indian subcontinent. From his Multan khanqah the order spread through Sind and the Punjab, carried by his disciples and descendants — among them the poet-saint Fakhr-ud-Din Iraqi, who came to Multan and married into his family, and, in the next generations, his own grandson Shah Rukn-e-Alam. The Suhrawardi order he founded was marked by strict adherence to the Sharia, sober devotion, learning, and an active engagement with society and state — a pattern that made Multan a hub of both spiritual authority and worldly influence, and that shaped the religious life of the western Punjab and Sind for centuries.
    +Bahauddin Zakariya’s lasting achievement was to root the Suhrawardi way in the Indian subcontinent. From his Multan khanqah the order spread through Sindh and the Punjab, carried by his disciples and descendants — among them the poet-saint Fakhr-ud-Din Iraqi, who came to Multan and married into his family, and, in the next generations, his own grandson Shah Rukn-e-Alam. The Suhrawardi order he founded was marked by strict adherence to the Sharia, sober devotion, learning, and an active engagement with society and state — a pattern that made Multan a hub of both spiritual authority and worldly influence, and that shaped the religious life of the western Punjab and Sindh for centuries.
     
    @@ -26,3 +26 @@
     - General established histories of the Suhrawardi order and of Multan.
    -
    -=====================================================================================
    ```


### Shrine of Bibi Pak Daman
  - `Description` (diff):

    ```diff
    @@ -34,3 +34,3 @@
     
    -That the identity of the Bibis should be so disputed is itself part of the shrine’s history, and the arguments have been rehearsed by scholars for generations. Those who question the Karbala account marshal a formidable case. They observe that, according to the standard histories, the wife of Hazrat Ali who bore Abbas — Umm al-Banin — had four sons and no daughter at all, so that Ruqayya cannot have been her child; that the two women named Ruqayya bint Ali are traditionally commemorated elsewhere, one at a shrine in Damascus and another in Egypt, not in Lahore; and that none of the family of the Prophet who went with Imam Hussain is recorded to have abandoned him before the end — indeed, on the night of Ashura he is said to have released his companions from their oath, and all refused to leave. They point out, too, that in the first century of Islam Lahore lay wholly outside the Muslim world: Islam reached Sind only with the conquests of Muhammad bin Qasim around 93 AH, and Lahore itself came under Muslim rule only with Mahmud of Ghazni in the early eleventh century — so that no Muslim woman, still less a princess of the Prophet’s house, could plausibly have dwelt in Lahore in 61 AH. Finally they note that two of the six names — Gauhar and Shahbaz — are Persian, not Arabic, and are not to be found among the recorded daughters of Aqeel or of Ali.
    +That the identity of the Bibis should be so disputed is itself part of the shrine’s history, and the arguments have been rehearsed by scholars for generations. Those who question the Karbala account marshal a formidable case. They observe that, according to the standard histories, the wife of Hazrat Ali who bore Abbas — Umm al-Banin — had four sons and no daughter at all, so that Ruqayya cannot have been her child; that the two women named Ruqayya bint Ali are traditionally commemorated elsewhere, one at a shrine in Damascus and another in Egypt, not in Lahore; and that none of the family of the Prophet who went with Imam Hussain is recorded to have abandoned him before the end — indeed, on the night of Ashura he is said to have released his companions from their oath, and all refused to leave. They point out, too, that in the first century of Islam Lahore lay wholly outside the Muslim world: Islam reached Sindh only with the conquests of Muhammad bin Qasim around 93 AH, and Lahore itself came under Muslim rule only with Mahmud of Ghazni in the early eleventh century — so that no Muslim woman, still less a princess of the Prophet’s house, could plausibly have dwelt in Lahore in 61 AH. Finally they note that two of the six names — Gauhar and Shahbaz — are Persian, not Arabic, and are not to be found among the recorded daughters of Aqeel or of Ali.
     
    @@ -71,4 +71 @@
     - Shrines Project field survey, Bibi Pak Daman responses (surveyor: Saifullah Imtiaz), 2026.
    -- Shrines Project field survey, Bibi Pak Daman responses, 2026.
    -
    -=====================================================================================
    ```


### Shrine of Fariduddin Ganjshakar
  - `Description` (diff):

    ```diff
    @@ -37,3 +37 @@
     - General established histories of the Chishti order and of Pakpattan.
    -
    -=====================================================================================
    ```


### Shrine of Ganj e Inayat Sarkar
  - `Description` (diff):

    ```diff
    @@ -12,3 +12,3 @@
     
    -In search of deeper learning he left Kashmir and travelled to Gujrat, in the Punjab, and the villages around it, studying under a number of the noted religious teachers of the age — among them Hazrat Abu al-Barakat Syed Muhammad Ahmad, Hazrat Syedna Tahir Alauddin Qadri Gilani, and the renowned orator Maulana Ghulam Ali Okarvi. It was at the seminary Ashraf-ul-Madaris in Gujrat that he found his own spiritual master: he took the oath of allegiance (bai‘at) at the hand of Hazrat Pir Syed Ismail Shah Bukhari — famous as *Karman Wali Sarkar* — and studied and served under his mentorship, receiving from him both learning and the promise, often repeated, that one day he would become a *wali-ullah*, a friend of God. From this master he received his authorisation (khilafat) in the Naqshbandi-Mujaddidi order, becoming a *khalifa-e-mujaz* of Karman Wali Sharif. He lived to the age of seventy-four, dying in 2011.
    +In search of deeper learning he left Kashmir and travelled to Gujrat, in the Punjab, and the villages around it, studying under a number of the noted religious teachers of the age — among them Hazrat Abu al-Barakat Syed Muhammad Ahmad, Hazrat Syedna Tahir Alauddin Qadiri Gilani, and the renowned orator Maulana Ghulam Ali Okarvi. It was at the seminary Ashraf-ul-Madaris in Gujrat that he found his own spiritual master: he took the oath of allegiance (bai‘at) at the hand of Hazrat Pir Syed Ismail Shah Bukhari — famous as *Karman Wali Sarkar* — and studied and served under his mentorship, receiving from him both learning and the promise, often repeated, that one day he would become a *wali-ullah*, a friend of God. From this master he received his authorisation (khilafat) in the Naqshbandi-Mujaddidi order, becoming a *khalifa-e-mujaz* of Karman Wali Sharif. He lived to the age of seventy-four, dying in 2011.
     
    @@ -49,4 +49 @@
     - Shrines Project field survey, Darbar Ganj-e-Inayat Sarkar responses (surveyor: Saifullah Imtiaz), 2026.
    -- Shrines Project field survey, Darbar Ganj-e-Inayat Sarkar responses, 2026.
    -
    -=====================================================================================
    ```


### Shrine of Hafiz Muhammad Jamal Multani
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of *Hafiz Muhammad Jamal Multani* is among the most historically important Sufi mausolea of Multan, the "city of saints", and marks the resting place of the man traditionally credited with establishing the *Chishti* order firmly in the city. Born at Multan around 1747 (1160 AH) and dying in 1811, Hafiz Jamal was a disciple of *Khwaja Noor Muhammad Maharvi*, a leading Chishti master of the region, and became a renowned teacher and poet in his own right, composing in Arabic, Persian and Siraiki; his *Siharfi*, an acrostic poem of the Punjabi–Siraiki tradition, is his best-known literary work. His tomb, near the Aam Khas Bagh outside the historic Daulat Gate, is a fine piece of late-Mughal funerary architecture: a square chamber rising to a twelve-sided drum and a hemispherical dome. It is especially valued because it preserves original Mughal-era wall paintings — a rarity, since the murals of most such monuments have been lost to whitewash and renovation. The shrine remains an active centre of devotion, with an annual *urs* commemorating the saint and continuous visitation by those seeking blessing, and it forms part of the dense sacred geography of Multan alongside the great shrines of Bahauddin Zakariya, Shah Rukn-e-Alam and Shah Shams Sabzwari.
    -
    -=====================================================================================
    ```


### Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)
  - `Description` (diff):

    ```diff
    @@ -88,4 +88 @@
     - Shrines Project field survey, Darbar Madho Lal Hussain responses (surveyor: Saifullah), 2026.
    -- Shrines Project field survey, Darbar Madho Lal Hussain responses, 2026.
    -
    -=====================================================================================
    ```


### Shrine of Hazrat Muhammad Ayub Shah Bukhari
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Hazrat Muhammad Ayub Shah Bukhari is one of the principal Sufi dargahs of the Jhal Magsi district of Balochistan, situated at Gandawah (Gandava), the historic administrative town of the Kachhi plain. Its saint bore the *Bukhari* lineage, marking descent from the influential family of Sayyids who traced their origins to Bukhara and whose forebears — most famously Jalaluddin Surkh-Posh Bukhari of Uch Sharif — spread the *Suhrawardi* devotional tradition across Sindh and the southern Punjab. The tomb is locally admired as one of the finest examples of shrine architecture in the district, and it stands among a cluster of Sufi graves in the Gandawah area that together form an important sacred landscape for the surrounding Baloch and Brahui communities. Devotees from across the district and beyond visit to seek blessing and intercession, and the saint's *urs* is observed as the chief event of the devotional year, drawing pilgrims, *qawwali* and the distribution of food. As with many shrines of interior Balochistan, the documented history of the saint is thin and his dates uncertain, so his biography is best treated as living tradition rather than established record; the *Bukhari* attribution and the shrine's standing as a regional pilgrimage centre are, however, well attested locally. It should not be confused with the separate and larger Dargah of Fateh Pur Sharif (Pir Rakhail Shah), also in the Jhal Magsi district.
    -
    -=====================================================================================
    ```


### Shrine of Hazrat Shah Ali Akbar (Shah Ali Akbar Shamsi)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Shrine of Hazrat Shah Ali Akbar Shamsi stands in the historic neighbourhood of Suraj Miani in Multan, the celebrated "city of saints", and is counted among the oldest and most beautiful mausoleums of the city. Shah Ali Akbar is remembered as a descendant — by tradition of the eighth generation — of the great Sufi Shah Shams Sabzwari of Multan, and it is said that after the death of his father he settled permanently in the city. His tomb, built of brick in the octagonal, tiered form so characteristic of Multan, is often likened to a smaller version of the famous shrine of Shah Rukn-e-Alam, and it belongs to the classic tradition of Multani funerary architecture with its glazed tilework and tapering silhouette. According to inscriptions and local tradition, construction of the mausoleum began in 993 AH (about 1585 CE) and took some fifteen years to complete; it is said to have been raised by the saint's grandson, who is himself buried within the complex, and the work is attributed to the builders Ibrahim and Rajab, sons of the noted architect Musa Lahori. Despite its remarkable beauty and its importance to the architectural history of Multan, the shrine has often been described as one of the city's more neglected monuments. It remains a place of *ziyarat* and hosts an annual *urs* in the saint's honour.
    -
    -=====================================================================================
    ```


### Shrine of Hazrat Shah Daula Daryai
  - `Description` (diff):

    ```diff
    @@ -31,3 +31 @@
     - Alam Faqri, *Tazkirah Awliya-e-Pakistan*, and general histories of Mughal-era Punjabi Sufism, for the life and cult of the saint.
    -
    -=====================================================================================
    ```


### Shrine of Imam Ali-ul-Haq
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Contemporary Pakistani press and local commemorative accounts of Imam Ali-ul-Haq ("Imam Sahib") and the *urs* held at his Sialkot shrine.
    -
    -=====================================================================================
    ```


### Shrine of Jalaluddin Surkh-Posh Bukhari (Jalaluddin Bukhari)
  - `Description` (diff):

    ```diff
    @@ -6,3 +6,3 @@
     
    -Sayyid Jalaluddin was born in 1192 at Bukhara, in Central Asia, into a family of Sayyids tracing descent from the Prophet. Migrating southward in the age of the Mongol upheavals, he came by way of Bhakkar in Sind and settled at last at Uch, which he made the base of his mission. He is remembered as “Surkh-Posh” for the red garment he habitually wore, and as a propagator of the Suhrawardi way, connected to the great Multan line of Bahauddin Zakariya. From Uch he preached and guided, and he founded the family of the Bukhari sayyids that would become one of the most influential religious lineages of the Punjab and Sind. He died at Uch in 1291, full of years, and was buried there.
    +Sayyid Jalaluddin was born in 1192 at Bukhara, in Central Asia, into a family of Sayyids tracing descent from the Prophet. Migrating southward in the age of the Mongol upheavals, he came by way of Bhakkar in Sindh and settled at last at Uch, which he made the base of his mission. He is remembered as “Surkh-Posh” for the red garment he habitually wore, and as a propagator of the Suhrawardi way, connected to the great Multan line of Bahauddin Zakariya. From Uch he preached and guided, and he founded the family of the Bukhari sayyids that would become one of the most influential religious lineages of the Punjab and Sindh. He died at Uch in 1291, full of years, and was buried there.
     
    @@ -18,3 +18,3 @@
     
    -Jalaluddin Surkh-Posh Bukhari holds a foundational place in the spiritual history of the Punjab and Sind: the Bukhara-born saint who rooted the Suhrawardi way at Uch and fathered a dynasty of saints whose influence endured for centuries. Through his descendants — above all Jahaniyan Jahangasht — his line shaped the religion and society of the region, and through the shrines of Uch Sharif his memory is bound to one of the great sacred landscapes of Pakistan.
    +Jalaluddin Surkh-Posh Bukhari holds a foundational place in the spiritual history of the Punjab and Sindh: the Bukhara-born saint who rooted the Suhrawardi way at Uch and fathered a dynasty of saints whose influence endured for centuries. Through his descendants — above all Jahaniyan Jahangasht — his line shaped the religion and society of the region, and through the shrines of Uch Sharif his memory is bound to one of the great sacred landscapes of Pakistan.
     
    @@ -24,3 +24 @@
     - General established histories of the Suhrawardi order and of Uch Sharif.
    -
    -=====================================================================================
    ```


### Shrine of Lakhi Shah Saddar
  - `Description` (diff):

    ```diff
    @@ -19,6 +19,4 @@
     - Sindh Exploration and Adventure Society / EFT Sindh, *Heritage Sites of Sindh: District Jamshoro* (gazetteer of the district's shrines and monuments).
    -- Ansari, Sarah F. D. *Sufi Saints and State Power: The Pirs of Sind, 1843–1947.* Cambridge University Press, 1992.
    +- Ansari, Sarah F. D. *Sufi Saints and State Power: The Pirs of Sindh, 1843–1947.* Cambridge University Press, 1992.
     - Schimmel, Annemarie. *Pearls from the Indus: Studies in Sindhi Culture.* Jamshoro: Sindhi Adabi Board, 1986.
     - Boivin, Michel. *Historical Dictionary of the Sufi Culture of Sindh in Pakistan and India.* Karachi: Oxford University Press, 2015.
    -
    -=====================================================================================
    ```


### Shrine of Makhdoom Abdul Rahim Girhori
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Makhdoom Abdul Rahim Girhori stands at Girhor Sharif, a village some eight kilometres west of Pithoro in Umarkot district, in the semi-desert borderlands of eastern Sindh. It honours a leading Naqshbandi mystic and scholar of eighteenth-century Sindh (1739–1778) who belonged to the Mangrio tribe and came to be known as *Girhori* after he settled at Girhor and established his *khanqah* there. He was among the foremost *khalifas* (deputies) of Khwaja Muhammad Zaman of Luari Sharif (also recorded in this dataset), the celebrated *Sultan al-Aulia* of the Sindhi Naqshbandis, under whom he was trained. A learned man, Abdul Rahim Girhori is remembered for his religious scholarship and ascetic life and is said to have composed works in Sindhi, Arabic and Persian. He is venerated as a *shaheed* (martyr): according to traditional accounts he was killed late in his life in a confrontation, and his tomb is honoured as that of a martyr-saint. Today the shrine complex is a place of pilgrimage that local sources note is frequented by both Muslims and Hindus, and an annual *urs* commemorates him. His memory forms part of the wider Naqshbandi devotional network that the disciples of Khwaja Muhammad Zaman spread across Sindh in the eighteenth century.
    -
    -=====================================================================================
    ```


### Shrine of Makhdoom Jahaniyan Jahangasht
  - `Description` (diff):

    ```diff
    @@ -10,3 +10,3 @@
     
    -Makhdoom Jahaniyan Jahangasht carried the prestige of the Uch Bukhari sayyids to its height. A prolific guide with a wide following, he strengthened the Suhrawardi presence across the Punjab and Sind, and his descendants and disciples spread the *Jalali* Bukhari line far and wide — a lineage of sayyids who would remain religiously and politically prominent for centuries and whose branches reached into many regions of the subcontinent. His memory is bound to that of his grandfather Surkh-Posh and to the whole flowering of sanctity that made Uch Sharif a spiritual capital of the south.
    +Makhdoom Jahaniyan Jahangasht carried the prestige of the Uch Bukhari sayyids to its height. A prolific guide with a wide following, he strengthened the Suhrawardi presence across the Punjab and Sindh, and his descendants and disciples spread the *Jalali* Bukhari line far and wide — a lineage of sayyids who would remain religiously and politically prominent for centuries and whose branches reached into many regions of the subcontinent. His memory is bound to that of his grandfather Surkh-Posh and to the whole flowering of sanctity that made Uch Sharif a spiritual capital of the south.
     
    @@ -18,3 +18,3 @@
     
    -Makhdoom Jahaniyan Jahangasht is remembered as one of the great Suhrawardi saints of medieval India — the learned, far-travelled “Master of the World” whose authority spanned the Sultanate and whose lineage shaped the religious landscape of the Punjab and Sind for generations. His shrine at Uch Sharif keeps alive the memory of the age when Uch, with Multan, was a beating heart of Sufism in the subcontinent.
    +Makhdoom Jahaniyan Jahangasht is remembered as one of the great Suhrawardi saints of medieval India — the learned, far-travelled “Master of the World” whose authority spanned the Sultanate and whose lineage shaped the religious landscape of the Punjab and Sindh for generations. His shrine at Uch Sharif keeps alive the memory of the age when Uch, with Multan, was a beating heart of Sufism in the subcontinent.
     
    @@ -24,3 +24 @@
     - General established histories of the Suhrawardi order and of Uch Sharif.
    -
    -=====================================================================================
    ```


### Shrine of Makhdoom Nooh (Hala)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Shrine of Makhdoom Nooh at Hala, a town some fifty-six kilometres north-east of Hyderabad in Sindh, honours one of the most revered saints and scholars of the province. Makhdoom Lutufullah, universally known as Makhdoom Nooh — and often as Makhdoom Sarwar Nooh — is generally dated to the sixteenth century, with tradition placing his birth around 1500–1505 and his death about 1590. A Sufi of the *Suhrawardi* order, honoured also with an Uwaisi spiritual lineage, he is remembered as the founder of the *Sarwari* branch of the order in Sindh, and above all as the first religious scholar of the region to render the Holy Quran into Persian, an achievement that secured his lasting fame. He was buried near his native village close to Halakandi, but the shifting of the Indus twice compelled the relocation of his remains — to Mula Sanwani about 1601, and again, in 1777, to the site of new Hala, where his mausoleum now stands. The shrine is the spiritual heart of Hala, a town long associated with the *Makhdoom* saintly lineage, with Sufi devotional music and with the celebrated blue-and-white *Kashi* pottery of the region. It draws devotees throughout the year and hosts an annual *urs* in the saint's memory.
    -
    -=====================================================================================
    ```


### Shrine of Mauj Darya Bukhari
  - `Description` (diff):

    ```diff
    @@ -9,3 +9 @@
     The shrine remains one of scores of Lahore shrines administered by the Punjab Auqaf and Religious Affairs Department (Mehkama Auqaf), and continues to draw a devoted following. Daily devotion includes the recitation of the Fatiha, the lighting of diyas, the making of vows (mannat) and the presentation of niyaz, and the gatherings of Thursday night (Jummay Raat) remain the busiest of the week. The annual urs is held on the 17th to the 19th of Rabi-ul-Awal, with a Mela Chiraagha (festival of lights), the ceremonial washing (gusal) of the tomb and the changing of its chadar, and langar throughout; some 2,200 to 2,500 visitors are recorded on an ordinary day, rising to between 225,000 and 300,000 across the urs.
    -
    -=====================================================================================
    ```


### Shrine of Mian Mir
  - `Description` (diff):

    ```diff
    @@ -2,3 +2,3 @@
     
    -In the Dharampura quarter of Lahore, once the garden-suburb of Baghbanpura (or Hashimpura), stands the shrine of Hazrat Mian Mir — Mir Mohammad of Sind — one of the greatest Sufi saints of the Mughal age and among the most beloved holy figures in the history of the city. A master of the Qadiri order, Mian Mir was revered in his own lifetime by beggars and emperors alike for the fierceness of his asceticism, the depth of his learning, and the breadth of a heart that welcomed Muslim, Sikh, Hindu, and Christian without distinction. For nearly four centuries his red-sandstone tomb has drawn pilgrims seeking peace, healing, and blessing, and because of his celebrated friendship with the Sikh Gurus it endures as one of Lahore’s living symbols of interfaith reverence. To understand the shrine is first to understand the life of the man buried within it, and so this account begins with the saint himself before turning to the tomb, its miracles, and the devotion that surrounds it.
    +In the Dharampura quarter of Lahore, once the garden-suburb of Baghbanpura (or Hashimpura), stands the shrine of Hazrat Mian Mir — Mir Mohammad of Sindh — one of the greatest Sufi saints of the Mughal age and among the most beloved holy figures in the history of the city. A master of the Qadiri order, Mian Mir was revered in his own lifetime by beggars and emperors alike for the fierceness of his asceticism, the depth of his learning, and the breadth of a heart that welcomed Muslim, Sikh, Hindu, and Christian without distinction. For nearly four centuries his red-sandstone tomb has drawn pilgrims seeking peace, healing, and blessing, and because of his celebrated friendship with the Sikh Gurus it endures as one of Lahore’s living symbols of interfaith reverence. To understand the shrine is first to understand the life of the man buried within it, and so this account begins with the saint himself before turning to the tomb, its miracles, and the devotion that surrounds it.
     
    @@ -6,3 +6,3 @@
     
    -Mian Mir was born in the sixteenth century in Sehwan (Sivastan) in Sind — the town lying, as the prince Dara Shikoh later noted, between the cities of Thatta and Bhakkar — into a devout and learned family. His father, Qazi Sain Datta, was a man of religious standing respected throughout Sind, and the family traced its lineage to the second Caliph of Islam, Umar al-Farooq, from which descent Mian Mir is often given the epithet “Farooqi.” His father died while he was still a child, and the decisive turn of his life came early: at about the age of twelve, with the consent and blessing of his widowed mother, the boy left home in search of inner enlightenment at the feet of some God-oriented soul, and for a time he wandered as a seeker. He was drawn to the inward path and was initiated into the Qadiri silsila — the order that traces its spiritual descent to Shaikh Abd al-Qadir Jilani of Baghdad — at the hands of the master whom the shrine’s tradition remembers as Shaikh Siyustani, from whom he received training and, in time, the khilafat, the authority to guide others.
    +Mian Mir was born in the sixteenth century in Sehwan (Sivastan) in Sindh — the town lying, as the prince Dara Shikoh later noted, between the cities of Thatta and Bhakkar — into a devout and learned family. His father, Qazi Sain Datta, was a man of religious standing respected throughout Sindh, and the family traced its lineage to the second Caliph of Islam, Umar al-Farooq, from which descent Mian Mir is often given the epithet “Farooqi.” His father died while he was still a child, and the decisive turn of his life came early: at about the age of twelve, with the consent and blessing of his widowed mother, the boy left home in search of inner enlightenment at the feet of some God-oriented soul, and for a time he wandered as a seeker. He was drawn to the inward path and was initiated into the Qadiri silsila — the order that traces its spiritual descent to Shaikh Abd al-Qadir Jilani of Baghdad — at the hands of the master whom the shrine’s tradition remembers as Shaikh Siyustani, from whom he received training and, in time, the khilafat, the authority to guide others.
     
    @@ -80,4 +80 @@
     - Shrines Project field survey, Mian Mir responses (surveyor: Muhammad Rizwan), 2026.
    -- Shrines Project field survey, Mian Mir responses, 2026.
    -
    -=====================================================================================
    ```


### Shrine of Mian Umar Baba (Chamkani)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Mian Muhammad Umar Baba lies at Chamkani, a village on the eastern outskirts of Peshawar about seven kilometres from the old city. Mian Umar (traditionally 1671–1776) was a Sufi of the Naqshbandi order — a scholar, poet, social reformer, and historian who is counted, together with Akhund Darweza Baba and the warrior-poet Khushal Khan Khattak, among the great literary and spiritual figures of the Mughal-era Pashtun frontier. Said to have been born near Lahore and to have lived to a great age, he attracted disciples from every rank of society; tradition holds that even Ahmad Shah Abdali (Durrani), the founder of the Afghan kingdom, visited him and became his devotee. His tomb at Chamkani grew into a shrine and khanqah that remains a place of resort for the surrounding population, drawing its largest crowds at the annual urs, held over the first Wednesday and Thursday of the Islamic month of Rajab, when devotees gather for sermons, collective dhikr, and na'at, and the langar (free kitchen) is served. Like a number of Sufi shrines in Khyber Pakhtunkhwa, the site was targeted in militant attacks during the years of insurgency in the region, but it endures as an active centre of devotion. It complements the nearby shrine of the saint's contemporary Akhund Darweza Baba, also recorded in this dataset.
    -
    -=====================================================================================
    ```


### Shrine of Miran Hussain Zanjani (Zanjani Sahib)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     In the old riverside locality of Chah Miran, named directly in his honour, stands the tomb of Syed Miran Hussain Zanjani, one of the earliest Muslim missionary figures associated with Lahore. A Hussaini Syed born in 958 CE in Zanjan, in present-day Iran, he travelled to Lahore around 998 CE on the instruction of his spiritual master, Sheikh Abu al-Fazal Khatil, and is remembered to have preached in the city for some thirty-six years, converting large numbers of its inhabitants to Islam well before the Ghaznavid and later Mughal periods reshaped the region's religious landscape. He died in 1042 CE and was buried alongside his brother, Hazrat Musa Hussain Zanjani, whose own shrine lies nearby. The tomb, unusually for a site of such antiquity, rests on a simple raised platform without a dome, standing within what was once a dedicated garden named for the saint — a modest architectural footprint that belies its historical significance as one of Lahore's oldest surviving Islamic devotional sites, predating by centuries the grander Mughal-era shrines for which the city is more widely known. The shrine is formally recognised and maintained by the Punjab Auqaf and Religious Affairs Department, and continues to host an annual urs drawing local devotees, alongside its role as the namesake and spiritual anchor of the surrounding Chah Miran neighbourhood on the historic bank of the River Ravi near the old walled city. As one of the earliest attested Sufi graves in the Lahore region, the shrine offers valuable testimony to the gradual, missionary-led spread of Islam in Punjab in the centuries before the Delhi Sultanate and Mughal empire.
    -
    -=====================================================================================
    ```


### Shrine of Peer Makki
  - `Description` (diff):

    ```diff
    @@ -5,3 +5 @@
     The shrine complex includes an adjoining mosque, the Hazrat Pir Makki Masjid, and is formally administered, like Data Darbar itself, by the Punjab Auqaf and Religious Affairs Department; its tradition is Syed and Ahl-e-Sunnat. Despite its proximity to one of Pakistan's most visited shrines, Peer Makki's own tomb receives markedly fewer pilgrims — some 3,500 to 4,000 on an ordinary day — giving it a more intimate, contemplative atmosphere, though Thursday-night gatherings draw larger crowds, and the narrow street and surrounding Peer Makki Bazaar can make access difficult. The annual urs, held on the 9th to the 11th of Rabi-ul-Awal, fills the quarter with gatherings and dhikr, drums and dhamal, qawwali, the ritual bathing of the shrine and the distribution of offerings, and draws on the order of 400,000 to 500,000 devotees. Many writers — including, it is said at the shrine, authors from the Hindu and Christian communities — have written books about the saint that are still read with interest today.
    -
    -=====================================================================================
    ```


### Shrine of Pir Baba (Syed Ali Tirmizi)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Shrine of Pir Baba at Pacha Kalay, in the mountainous Buner District of Khyber Pakhtunkhwa, honours *Syed Ali Tirmizi* (c. 1502–1583), the Sufi saint universally known as *Pir Baba*, one of the most revered holy figures of the Pashtun lands. Of *Sayyid* descent, he was traditionally said to have been born at Tirmiz in Central Asia (in present-day Uzbekistan) — though some accounts instead give Fergana as his birthplace — and, according to tradition, came to the region in the train of the Mughal advance, settling at Pacha in Buner around the middle of the sixteenth century. From there his spiritual influence spread widely, and he is remembered as a supporter of the early Mughals — the emperor Humayun is said to have granted him lands in Kunar — and as an opponent of the heterodox teacher Bayazid Ansari, the "Pir Roshan." His green-domed mausoleum, which also holds the grave of his son Syed Habibullah, became the nucleus of a devotional complex; an adjoining mosque was raised in the twentieth century, between about 1938 and 1965, under the care of his descendants. The shrine draws great crowds of pilgrims, above all at the annual *urs* commemorating the saint, held from 24 to 26 of the Islamic month of Rajab. Its prominence made it a target during the militancy that afflicted the region: in December 2008 militants attacked the shrine, destroying religious inscriptions and hoardings, and in 2009 it was briefly closed when Taliban fighters seized control of Buner, before being reopened as security was restored. It remains among the most important Sufi shrines of Khyber Pakhtunkhwa.
    -
    -=====================================================================================
    ```


### Shrine of Pir Chhatal Shah Noorani
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of *Pir* Chhatal Shah Noorani stands at a spring-fed oasis near the mouth of the Moola gorge, where the Moola River shears clear across the Kirthar range to reach the Kachhi plain at Gandava, in the Jhal Magsi district of Balochistan. The point where the river debouches from the hills is known as *Naulung* ("Nine Fords") or, among the highland Baloch, *Punjmunh* ("Five Mouths"); for thousands of years this was the most convenient passage between the Indus valley and the Kalat uplands. The site is celebrated for a small, clear pond, fed by a copious spring bursting from the rock, that teems with large *mahseer* fish. By long tradition the fish were the saint's pets and no one has ever eaten them; local lore holds that any fish caught and cooked would emerge again alive, a taboo that has in effect made the pond one of the oldest fish-conservation sanctuaries in the region. Chhatal Shah Noorani is remembered as a granter of wishes to whom Hindus and Muslims alike came to have their hearts' desires fulfilled. The tomb sits on a low knoll: in 1831 the traveller Charles Masson (James Lewis) recorded it as a conspicuous *gumbaz*, or domed building, that served as the usual halting-place for caravans crossing between Kalat and Kachhi, though the dome has since collapsed and the grave now stands within plain modern walls. In recent years improved access has turned the once-remote spot into a popular picnic destination.
    -
    -=====================================================================================
    ```


### Shrine of Pir Lakha (Aab-e-Shifa), Jhal Magsi
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The shrine of Pir Lakha lies in the north-western uplands of the Jhal Magsi District of Balochistan, in the broken country near Kotra where the Moola river descends through its gorge — the same tract that holds the shrine of Pir Chhatal Shah Noorani (a separate entry in this dataset). District heritage listings count Pir Lakha among the principal shrines of Jhal Magsi, alongside the *dargahs* of Rakhyal Shah at Fatehpur and Muhammad Ayub Shah Bukhari at Gandava. Its particular fame rests less on a documented saintly biography — of which little is recorded — than on the hot springs beside it, known as *Aab-e-Shifa*, "the water of healing." Pilgrims travel from far-flung parts of Balochistan and Sindh to bathe in these thermal waters, which are believed to cure skin ailments and other afflictions, so that the site functions at once as a shrine and as a place of folk therapeutics. Like several shrines of the Kachhi–Gandava plain, it draws Muslim and Hindu visitors alike. Because the life of the eponymous *pir* is essentially undocumented in accessible sources, only the shrine's living role as a pilgrimage-and-healing centre can be stated with confidence.
    -
    -=====================================================================================
    ```


### Shrine of Pir Mangho
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established accounts of Mangho Pir, its crocodiles and springs, and the Sheedi community.
    -
    -=====================================================================================
    ```


### Shrine of Pir Sher Muhammad
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Qadiri-Chishti tradition in modern Punjab.
    -
    -=====================================================================================
    ```


### Shrine of Qalandar Baba Auliya
  - `Description` (diff):

    ```diff
    @@ -21,3 +21 @@
     - (This saint post-dates the Tazkirah Awliya-e-Pakistan compendium; entry based on established modern accounts.)
    -
    -=====================================================================================
    ```


### Shrine of Sachal Sarmast
  - `Description` (diff):

    ```diff
    @@ -25,3 +25 @@
     - General established histories of Sindhi Sufi poetry.
    -
    -=====================================================================================
    ```


### Shrine of Shah Abdul Karim Bulri
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Shrine of Shah Abdul Karim stands at Bulri, the town in Tando Muhammad Khan district that bears his name — Bulri Shah Karim — and honours one of the earliest and most influential of the Sindhi Sufi poets. Shah Abdul Karim (1536–1623) was born into a Sayyid family of Matiari but spent most of his life at Bulri, from which he takes his epithet. He is remembered as a mystic of simple, laborious life and as a pioneer of Sindhi devotional verse: he was among the first to weave the folk romances of the land — *Sasui and Punhun*, *Sohni and Mehar*, *Umar and Marui*, *Leela and Chanesar* — into poetry expressing the soul's longing for the Divine, a method later brought to its summit by his celebrated great-great-grandson, Shah Abdul Latif Bhittai. His sayings and verses were first gathered by a disciple, Mir Daryai Tharawi, in the Persian work *Bayan al-Arifin*, completed in 1630, seven years after the poet's death. Tradition holds that Shah Abdul Latif Bhittai himself stayed two years at Bulri and supervised the building of the shrine complex, laying the foundation of the tomb and its three-domed mosque about 1741 (1154 AH). The dargah remains a vibrant place of devotion, and its annual *urs* draws thousands of pilgrims.
    -
    -=====================================================================================
    ```


### Shrine of Shah Inayat Qadiri
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     At Mozang Chungi on Queens Road, not far from Fatima Jinnah Medical University, lies the shrine of Shah Inayat Qadiri, one of the most historically consequential Sufi figures of Mughal Punjab — not chiefly for his own writings, considerable though they were, but as the spiritual guide, or murshid, of Bulleh Shah, arguably the most celebrated Punjabi Sufi poet of all. Born around 1643 in Kasur into a farming family of the Arain community, Shah Inayat trained under the Sufi scholar Muhammad Ali Raza Shattari and, after friction with Kasur's ruling family, migrated to Lahore, where he served as imam of the Oonchi Masjid near Bhati Gate and founded his own madrasa, teaching students without regard to caste. He combined the Qadiri and Shattari silsilas in his own practice and authored several Persian works of mystical philosophy, including the Dastur-ul-Amal and Lata'if-e-Ghaibiya. His acceptance of Bulleh Shah as a disciple became one of the most retold episodes in Punjabi Sufi lore, precisely because it crossed rigid social boundaries: Bulleh Shah came from a Syed family of higher perceived status, yet sought out and remained devoted to a teacher of humbler, land-tilling background, a relationship that Bulleh Shah's own verses immortalised and that continues to be cited in Pakistan as an example of Sufism's disregard for caste hierarchy. Shah Inayat died around 1728 and is buried at Mozang alongside two of his sons. His shrine, with its adjoining mosque, remains an active site of pilgrimage; its annual urs draws thousands of devotees for nights of zikr and qawwali, sustaining a living devotional connection to one of Punjab's most enduring literary and spiritual partnerships.
    -
    -=====================================================================================
    ```


### Shrine of Shah Jamal
  - `Description` (diff):

    ```diff
    @@ -9,3 +9 @@
     The tomb itself is enclosed within a mosque of relatively modern construction, single-domed with four minarets, reflecting rebuilding rather than preserved Mughal fabric; an adjoining graveyard lies beside it. The shrine — of the Suhrawardi line and the Ahl-e-Sunnat tradition — has been in the care of the government's Auqaf Department since 1960, while the current sajjada nashin, a descendant of the saint, continues to hold Khatam Khawajgan ceremonies. The site illustrates the continuing vitality of shrine-centred devotional practice in Lahore, and its shadows as well: the city's homeless rely on the shrine's langar and offerings, even as questions over noise, crowding and drug use in the vicinity — a real safety concern for pilgrims — have periodically drawn official scrutiny.
    -
    -=====================================================================================
    ```


### Shrine of Shah Rukn-e-Alam
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Suhrawardi order and studies of the architecture of Multan.
    -
    -=====================================================================================
    ```


### Shrine of Shah Shams-ud-Din Sabzwari
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories and legends of the saints of Multan.
    -
    -=====================================================================================
    ```


### Shrine of Shah Yusaf Gardez
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of Multan and its saints.
    -
    -=====================================================================================
    ```


### Shrine of Syed Musa Pak
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Qadiri-Gilani sayyids of Multan.
    -
    -=====================================================================================
    ```


### Sial Sharif
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories of the Chishti revival in nineteenth-century Punjab.
    -
    -=====================================================================================
    ```


### Swami Dharmdas Darbar, Larkana (Kennedy Market)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The darbar of Swami Dharmdas at Larkana is one of the *Nanakpanthi* shrines of the Larkana country of upper Sindh, recorded by the anthropologist Zulfiqar Ali Kalhoro in his survey of the region's Hindu–Sikh saints. Swami Dharamdas is remembered as a disciple of Sant Bhai Wasan Shah of Rohri; according to Kalhoro he first established a darbar at the village of Mena and afterwards founded the shrine at Larkana with which his name is chiefly associated, said to lie in the Kennedy Market quarter of the town. He was a contemporary of Sain Vali Vilayat Rai of Kambar (a separate entry in this dataset), one of a group of nineteenth- and early-twentieth-century *sants* who spread a message of love, harmony and tolerance among the Hindu, Muslim and Sikh communities of Sindh. In the Nanakpanthi manner, such darbars house a copy of the *Guru Granth Sahib* alongside images of Hindu deities, and honour Baba Guru Nanak without a firm confessional boundary. The saint's dates and the darbar's detailed history are only thinly documented in accessible sources, and — as with most Sindhi Hindu shrines — the size and present condition of the site are uncertain; the entry is offered on the authority of Kalhoro's fieldwork and should be treated as provisional.
    -
    -=====================================================================================
    ```


### Tilla Jogian
  - `Description` (diff):

    ```diff
    @@ -29,3 +29 @@
     - G. W. Briggs, *Gorakhnath and the Kanphata Yogis*, for the wider Nath ascetic tradition.
    -
    -=====================================================================================
    ```


### Tomb of Allama Iqbal (Mazar-e-Iqbal)
  - `Description` (diff):

    ```diff
    @@ -102,3 +102,3 @@
     
    -Iqbal’s enduring place in the history of the subcontinent rests, finally, on his political vision. In his presidential address to the annual session of the All-India Muslim League at Allahabad in 1930, he argued that the Muslims of the north-west of India — the Punjab, the North-West Frontier, Sind, and Baluchistan — formed a distinct nation with its own culture, law, and moral order, and that their destiny would be best secured in a consolidated, self-governing Muslim state within or without the British Empire. This address is remembered as the intellectual seed from which the demand for Pakistan would grow. In the last years of his life Iqbal corresponded closely with Muhammad Ali Jinnah, the Quaid-e-Azam, urging him to return from London to lead the Muslims of India and pressing upon him the case for a separate homeland; their exchange, the famous “Iqbal–Jinnah letters,” is treasured as a founding document of the Pakistan Movement. Iqbal’s concern was never merely territorial: he insisted that a true Islamic polity must also be a just one, freeing the poor and the labouring from exploitation, and he saw the proposed state as a place where the ethical vision of his faith might be lived out. He did not live to see it — he died in 1938, nine years before Pakistan came into being in August 1947 — yet the new nation enshrined him as its ideological founder, and its highest honours and its very self-image are bound up with his name.
    +Iqbal’s enduring place in the history of the subcontinent rests, finally, on his political vision. In his presidential address to the annual session of the All-India Muslim League at Allahabad in 1930, he argued that the Muslims of the north-west of India — the Punjab, the North-West Frontier, Sindh, and Baluchistan — formed a distinct nation with its own culture, law, and moral order, and that their destiny would be best secured in a consolidated, self-governing Muslim state within or without the British Empire. This address is remembered as the intellectual seed from which the demand for Pakistan would grow. In the last years of his life Iqbal corresponded closely with Muhammad Ali Jinnah, the Quaid-e-Azam, urging him to return from London to lead the Muslims of India and pressing upon him the case for a separate homeland; their exchange, the famous “Iqbal–Jinnah letters,” is treasured as a founding document of the Pakistan Movement. Iqbal’s concern was never merely territorial: he insisted that a true Islamic polity must also be a just one, freeing the poor and the labouring from exploitation, and he saw the proposed state as a place where the ethical vision of his faith might be lived out. He did not live to see it — he died in 1938, nine years before Pakistan came into being in August 1947 — yet the new nation enshrined him as its ideological founder, and its highest honours and its very self-image are bound up with his name.
     
    @@ -127,4 +127 @@
     - For life and dates, standard biographies of Iqbal (the 2026 field survey preserves some variant dates, noted above).
    -- Shrines Project field survey, Mazar-e-Iqbal responses, 2026.
    -
    -=====================================================================================
    ```


### Tomb of Baha'al-Halim (Uch Sharif)
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Tomb of Baha'al-Halim is one of the celebrated cluster of medieval shrines at the south-western edge of Uch Sharif, the ancient town in Bahawalpur district that was for centuries a great centre of the Suhrawardi order and of the Bukhari Sayyids. Together with the neighbouring tombs of Bibi Jawindi and Ustad Nuriya and the tomb and mosque of Jalaluddin Bukhari, the shrine forms the ensemble that Pakistan placed on the UNESCO World Heritage tentative list in 2004 as an outstanding example of Islamic funerary architecture. Baha'al-Halim is remembered as a revered spiritual guide of Uch, and his tomb is traditionally said to have been raised in his honour by the great saint Makhdoom Jahaniyan Jahangasht; the exact dates of his life are not securely recorded and are best treated with caution. The mausoleum is an octagonal, three-tiered structure of glazed brick, crowned by a dome and adorned with the brilliant blue, turquoise and white tilework for which Uch and Multan are famous — a fusion of Central Asian, Persian and local Multani decorative traditions. Though damaged over the centuries, it remains among the most admired monuments of the town and, like its companion shrines, is honoured with an annual *urs*.
    -
    -=====================================================================================
    ```


### Tomb of Javindi Bibi
  - `Description` (diff):

    ```diff
    @@ -20,3 +20 @@
     - General established histories and heritage/conservation studies of the monuments of Uch Sharif.
    -
    -=====================================================================================
    ```


### Tomb of Qutbuddin Aibak
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Tucked amid the crowded lanes of Aibak Road in the Anarkali quarter, this modest garden tomb marks the burial place of Sultan Qutb ud-Din Aibak, founder of the Mamluk, or "Slave," dynasty and the first ruler of the Delhi Sultanate. Born around 1150 in Turkestan, Aibak was sold into slavery as a child and eventually rose, through service to the Ghurid ruler Muhammad Ghori, to command Ghurid territories in northern India following the decisive Second Battle of Tarain in 1192. After Ghori's assassination in 1206, Aibak established independent rule based in Lahore, laying the foundations of Muslim dynastic government in the subcontinent; he is also remembered as the patron who commissioned Delhi's Qutb Minar. He died in Lahore in November 1210 after a fall from his horse while playing chaugan, an early form of polo, and was succeeded eventually by his son-in-law Iltutmish. The tomb's physical history has been anything but continuous: historians dispute whether a substantial mausoleum ever stood over the grave in the medieval period, and for long the site was a simple, informal grave hemmed in by the houses of the Anarkali bazaar. The structure visitors see today is essentially a 1970s reconstruction by Pakistan's Department of Archaeology and Museums, deliberately evoking early Sultanate-period style within a small walled garden. Unlike Lahore's Sufi shrines, the tomb hosts no urs, no pilgrimage tradition and no ongoing devotional practice; it is maintained purely as a protected historical monument, valued chiefly for its symbolic role marking the thirteenth-century founding moment of Muslim dynastic rule in South Asia, centred, briefly, on Lahore itself.
    -
    -=====================================================================================
    ```

  - `needs_review` (new column): `'events_placeholder'`

### Tomb of Ustad Nuriya
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
    -The Tomb of Ustad Nuriya is the smallest and plainest of the celebrated funerary monuments clustered on the Bukhari mound at Uch Sharif, an ancient town in the Bahawalpur district of southern Punjab long renowned as a centre of Suhrawardi Sufism. It stands beside the far more famous tombs of Bibi Jawindi and Baha'al-Halim (both octagonal and blue-tiled) and the flat-roofed brick tomb-and-mosque of Jalaluddin Surkh-Posh Bukhari, with which it forms an ensemble of five monuments placed on UNESCO's tentative list of World Heritage Sites. Tradition holds that the tomb honours Ustad Nuriya — the master-builder, or ustad, credited with designing the exquisite tomb of Bibi Jawindi, itself usually dated to the late fifteenth century. Because it was raised for a craftsman rather than a saint, the tomb departs from the octagonal, tiered form of its neighbours: it is smaller and broadly rectangular in plan, and it lacks the lavish glazed-tile revetment for which Uch is famous. Like the rest of the group it has suffered severe structural loss over the centuries — a great flood in 1817 is traditionally blamed for the collapse of much of the complex — and part of its rear structure is gone. Its interest lies precisely in its dedication: in an architectural tradition that seldom named its makers, the survival of a monument to the builder himself is remarkable, and it underlines the extraordinary artistic reputation of the Uch workshops. Filed here under the Muslim-shrine category as an integral part of the Suhrawardi funerary complex, the tomb draws the heritage traveller and the historian of Indo-Islamic architecture rather than the pilgrim. NOTE: coordinates approximate — the tomb sits on the same mound as rows 11 (Bibi Jawindi), 90, 91 and 138 (Baha'al-Halim). It is the tomb of an architect, included under "Muslim Shrine" as part of the Sufi shrine ensemble. A dedicated Wikimedia Commons category "Shrine of Nuriya, Uch Sharif" exists; Image 1 left NONE because no exact filename could be confirmed without a browser — flag for a browser-enabled image pass.
    -
    -=====================================================================================
    +The Tomb of Ustad Nuriya is the smallest and plainest of the celebrated funerary monuments clustered on the Bukhari mound at Uch Sharif, an ancient town in the Bahawalpur district of southern Punjab long renowned as a centre of Suhrawardi Sufism. It stands beside the far more famous tombs of Bibi Jawindi and Baha'al-Halim (both octagonal and blue-tiled) and the flat-roofed brick tomb-and-mosque of Jalaluddin Surkh-Posh Bukhari, with which it forms an ensemble of five monuments placed on UNESCO's tentative list of World Heritage Sites. Tradition holds that the tomb honours Ustad Nuriya — the master-builder, or ustad, credited with designing the exquisite tomb of Bibi Jawindi, itself usually dated to the late fifteenth century. Because it was raised for a craftsman rather than a saint, the tomb departs from the octagonal, tiered form of its neighbours: it is smaller and broadly rectangular in plan, and it lacks the lavish glazed-tile revetment for which Uch is famous. Like the rest of the group it has suffered severe structural loss over the centuries — a great flood in 1817 is traditionally blamed for the collapse of much of the complex — and part of its rear structure is gone. Its interest lies precisely in its dedication: in an architectural tradition that seldom named its makers, the survival of a monument to the builder himself is remarkable, and it underlines the extraordinary artistic reputation of the Uch workshops. Filed here under the Muslim-shrine category as an integral part of the Suhrawardi funerary complex, the tomb draws the heritage traveller and the historian of Indo-Islamic architecture rather than the pilgrim.
    ```

  - `qa_note` (new column): `'coordinates approximate — the tomb sits on the same mound as rows 11 (Bibi Jawindi), 90, 91 and 138 (Baha\'al-Halim). It is the tomb of an architect, included under "Muslim Shrine" as part of the Sufi shrine ensemble. A dedicated Wikimedia Commons category "Shrine of Nuriya, Uch Sharif" exists; Image 1 left NONE because no exact filename could be confirmed without a browser — flag for a browser-enabled image pass.'`
  - `needs_review` (new column): `'events_placeholder'`

### Umarkot (Amarkot) Shiv Mandir
  - `Description` (diff):

    ```diff
    @@ -22,4 +22,4 @@
     
    -- Cousens, Henry. *The Antiquities of Sind, with Historical Outline*. Archaeological Survey of India.
    -- Raikes, S. N. *Memoir on the Thurr and Parkur Districts of Sind*.
    +- Cousens, Henry. *The Antiquities of Sindh, with Historical Outline*. Archaeological Survey of India.
    +- Raikes, S. N. *Memoir on the Thurr and Parkur Districts of Sindh*.
     - Contemporary press reporting (Dawn, "The thriving Shiva festival in Umarkot") on Maha Shivaratri at the temple.
    @@ -27,3 +27 @@
     - Local histories of Umarkot (Amarkot) and the birth of Akbar.
    -
    -=====================================================================================
    ```


### Valmik Mandir (Naqi Road)
  - `Description` (diff):

    ```diff
    @@ -27,3 +27 @@
     - Reporting of the Pakistan Hindu Council and Evacuee Trust Property Board on functioning temples in Lahore.
    -
    -=====================================================================================
    ```


### Valmiki Swamiji Mandir (Gracy Lines), Rawalpindi
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     The Valmik Swamiji Mandir — also called the Valmiki Mandir or *Balaknash* Temple — lies in the Gracy Lines neighbourhood of Chaklala Cantonment, in the south-eastern part of Rawalpindi. Reported to have been built in 1935, it has served since the pre-Partition era as one of the principal places of worship for the city's Hindu residents, and is counted among the three main Hindu temples of Rawalpindi district alongside the Krishna Mandir of Saddar and the Lal Kurti (Balmiki) Temple. Like the Lalkurti shrine it is dedicated to the sage-poet *Valmik* (Valmiki), author of the *Ramayana*, particularly venerated by the Balmiki community, and it remains active, celebrating festivals such as *Diwali* and *Holi*. In August 2014 the temple drew national and international attention when cantonment authorities issued notices for residents of Block 141, Gracy Lines, to vacate the area for a development scheme, raising fears that the temple and adjoining Hindu homes might be demolished. Members of the community petitioned the courts and obtained a stay against immediate demolition; authorities reportedly indicated that a replacement temple would be provided if relocation went ahead, and residents were said to have been offered alternative accommodation. In the event the temple was not demolished and continues in worship — a reminder of the precarious position of the small Hindu community's heritage in the twin cities of Rawalpindi and Islamabad.
    -
    -=====================================================================================
    ```


### Wadpagga Sharif
  - `Description` (diff):

    ```diff
    @@ -22,3 +22 @@
     - General works on Sufi shrine culture and *sayyid* families in Khyber Pakhtunkhwa.
    -
    -=====================================================================================
    ```


### Ziarat Kaka Sahib
  - `Description` (diff):

    ```diff
    @@ -1,3 +1 @@
     Ziarat Kaka Sahib, set among rugged hills roughly twelve kilometres south of Nowshera city in Khyber Pakhtunkhwa, is the shrine of the sixteenth-century Sufi saint *Kaka Sahib*, whose given name was *Syed Kasteer Gul* and who is also remembered by the honorific *Sheikh Rahmkar*. Born, by tradition, on the first of Ramazan in 1575 (sometimes given as 1576), he received his religious education from his Sufi father and from the scholars of his day, and his forefathers are remembered as affiliated with all four of the great Sufi orders — the *Naqshbandi*, *Suhrawardi*, *Chishti*, and *Qadiri* — an inheritance tradition credits him with carrying forward, though he himself is remembered in the *Uwaisi* style of not naming a personal living guide. Tradition names his teachers as Qazi Abul Aala, Abdullah Ansari Sultanpuri, Maulana Abdul Lateef Sultanpuri, and Sheikh Akhuddeen Seljuki; the nearby saint Akhund Panju Baba was a respected contemporary he is said to have met, rather than a personal teacher — Panju Baba's own disciple, by tradition, was Kaka Sahib's father, Bahadur Baba. So great was his renown for piety that his resting place became one of the most frequented religious sites of the province, and the town that grew around it took his name. His white mausoleum, raised by his son Sheikh Abdul Haleem around 1661, is a fine example of Mughal-era funerary architecture, richly ornamented within by mosaic work, floral patterns, and painted stucco decoration. The descendants of his teacher and of the saint's own line have long lived in the settlement, tending the shrine and its traditions. Today Ziarat Kaka Sahib remains a much-visited place of pilgrimage, its annual observances drawing devotees from across Khyber Pakhtunkhwa who come to seek blessing at the tomb of a saint whose memory has endured for more than four centuries.
    -
    -=====================================================================================
    ```



## Stage 2 — field patch merge (`merge_patch.py`)

`shrines_clean.csv` (163 rows, 27 cols) -> `shrines_merged.csv` (163 rows, 42 cols)

**Rows with value changes: 133 of 163.**

15 columns appended from `shrines_field_patch.tsv` (join on Name; 162/163 matched exactly; the unmatched row is flagged `unmatched_in_patch` — see QUESTIONS.md §1 and `reports/join_report.txt`). `Events` overwritten from the patch for matched rows; stale `events_placeholder` flags re-evaluated. Appended per-row values are the patch values verbatim and are not repeated here; the cell-level changes below cover every pre-existing column.

Columns added: `id`, `category`, `site_type`, `status`, `principal_figure`, `figure_type`, `silsila`, `year_built`, `year_built_precision`, `year_built_note`, `figure_born`, `figure_died`, `event_year`, `event_note`, `flags`. No column removed; no row added or removed.

### Amb Temples (Amb Sharif)
  - `Events`: `''` -> `'None - abandoned; heritage visitation'`

### Bari Imam
  - `Events`: `'Annual urs'` -> `'Annual urs (spring); daily langar'`

### Bhagnari Mandir
  - `Events`: `''` -> `'Community worship; no fixed public festival documented'`

### Bhai Sant Thawan Das Mandir
  - `Events`: `''` -> `'Not documented'`

### Bhai Waliram Darbar
  - `Events`: `'Undocumented'` -> `'Not documented'`

### Bhit (Bhit Shah)
  - `Events`: `'Urs celebrated in Safar (Islamic month)'` -> `'Annual urs (Safar); nightly Shah jo Raag; daily langar'`

### Chandragup (Baba Chandragup)
  - `Events`: `'Annual Hinglaj Yatra (April, four days) — pilgrims halt at Chandragup to fast, keep vigil, and make offerings before continuing to Hinglaj Mata Temple'` -> `'Hinglaj Yatra halt (April, four days)'`

### Churrio Jabal Durga Mata Temple
  - `Events`: `''` -> `'Maha Shivratri (spring); ash-immersion rites year-round'`

### Darbar Ghamkol Sharif (Zinda Pir)
  - `Events`: `'Annual urs / large annual gathering'` -> `'Annual urs; large annual gathering'`

### Darbar Hazrat Khawaja Shah Muhammad Sulaiman Taunsvi (R.A)
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali and naat; daily langar'`

### Darbar Sakhi Shah Chan Charagh
  - `Events`: `''` -> `'Annual urs; Muharram tazia procession (9 Muharram); commemorative mach bonfire'`

### Dargah / Roza Sufi Shah Inayat Shaheed
  - `Events`: `''` -> `'Annual urs; Sufi music and remembrance'`

### Dargah of Pir Muhammad Rashid (Roze Dhani), Pir Jo Goth
  - `Events`: `'Large gatherings of Hur devotees on 27 Rajab and at fixed times of the year; notably, no public urs is observed'` -> `'Hur gatherings on 27 Rajab and at fixed times; no public urs observed'`

### Dargah Pir Ratan Nath Jee
  - `Events`: `''` -> `'Maha Shivratri'`

### Darya Lal Mandir (Darya Lal Sankat Mochan Mandir)
  - `Events`: `''` -> `'Cheti Chand (spring)'`

### Data Darbar
  - `Events`: `'Qawwali on Thursdays between Zuhr and Asr'` -> `'Annual urs (18-20 Safar); Thursday-evening qawwali and dhamal; daily langar'`

### Eidgah Sharif
  - `Events`: `'Annual urs'` -> `'Annual urs; Eid Milad-un-Nabi (principal gathering); langar'`

### Garh Maharaja (Shorkot)
  - `Events`: `'Annual urs'` -> `'Annual urs (spring); abyat singing; qawwali; langar'`

### Golra Sharif
  - `Events`: `'Annual urs'` -> `'Annual urs; naat and qawwali; daily langar'`

### Gorakhnath (Goraknath) Temple
  - `Events`: `''` -> `'Diwali (principal annual opening)'`

### Gurdas Ram Mandir
  - `Events`: `''` -> `'Not documented'`

### Gurdwara Babay De Ber
  - `Events`: `''` -> `'Sikh pilgrimage; Guru Nanak Gurpurab'`

### Gurdwara Babay Nanki
  - `Events`: `''` -> `'Occasional pilgrimage; Bebe Nanaki commemoration'`

### Gurdwara Balila Sahib (Bal Lila Sahib)
  - `Events`: `''` -> `'Guru Nanak Gurpurab (November)'`

### Gurdwara Bhai Beba Singh
  - `Events`: `''` -> `'Daily prakash; major Sikh anniversaries'`

### Gurdwara Bhai Joga Singh
  - `Events`: `''` -> `'Daily prakash; morning and evening worship'`

### Gurdwara Chakki Sahib
  - `Events`: `"Sikh pilgrimage, especially on Guru Nanak's Gurpurab; part of the Eminabad heritage circuit"` -> `"Sikh pilgrimage, especially Guru Nanak's Gurpurab"`

### Gurdwara Chhevin Patshahi, Chitti Gatti
  - `Events`: `'Vaisakhi fair (historically)'` -> `'Historically a Vaisakhi fair; not currently observed'`

### Gurdwara Chhevin Patshahi, Jhalian (Jhalian Dhilwan)
  - `Events`: `'Historically an annual fair (pre-1947); now not in regular worship'` -> `'Historically an annual fair; not in regular worship'`

### Gurdwara Chhevin Patshahi, Mozang
  - `Events`: `"Annual Akhand Path (unbroken reading of the Guru Granth Sahib) around Guru Hargobind's birth anniversary (Gurpurb); daily congregational worship was recorded here in the pre-1947 period"` -> `"Annual Akhand Path around Guru Hargobind's Gurpurb (historic)"`

### Gurdwara Chowmala Sahib
  - `Events`: `"No scheduled events currently documented; an annual fair around Basant Panchami is recorded in older sources, but its continuation is uncertain given reports that the site's structure no longer survives"` -> `'Historically an annual fair at Basant Panchami; continuation uncertain'`

### Gurdwara Darbar Sahib Kartarpur
  - `Events`: `''` -> `'Guru Nanak anniversaries; daily visa-free pilgrimage via the Kartarpur Corridor'`

### Gurdwara Dash Mesh Pita
  - `Events`: `''` -> `'Not documented'`

### Gurdwara Dera Sahib
  - `Events`: `''` -> `'Martyrdom anniversary of Guru Arjan Dev (Jeth, May-June)'`

### Gurdwara Guru Ram Das Ji
  - `Events`: `''` -> `'Guru Ram Das birth anniversary'`

### Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)
  - `Events`: `"Sikh pilgrimage, especially on Guru Nanak's Gurpurab; part of the Eminabad heritage circuit"` -> `"Sikh pilgrimage, especially Guru Nanak's Gurpurab"`

### Gurdwara Malji Sahib
  - `Events`: `"Sikh pilgrimage, especially on Guru Nanak's Gurpurab"` -> `"Sikh pilgrimage, especially Guru Nanak's Gurpurab"`

### Gurdwara Panja Sahib
  - `Events`: `''` -> `'Vaisakhi (principal jatha pilgrimage); Saka Panja Sahib commemoration'`

### Gurdwara Panjvi Chati Patshahi
  - `Events`: `''` -> `'Occasional pilgrimage; historically a Gur Mela'`

### Gurdwara Patshahi Chhevin (Hadiara), Lahore
  - `Events`: `'Historically an annual Maghi fair (pre-1947)'` -> `'Historically an annual Maghi fair'`

### Gurdwara Patti Sahib
  - `Events`: `''` -> `'Guru Nanak Gurpurab'`

### Gurdwara Rori Sahib
  - `Events`: `''` -> `'Guru Nanak Gurpurab; jatha pilgrimage'`

### Gurdwara Sach Khand Sahib
  - `Events`: `''` -> `'Daily prakash; continuous langar'`

### Gurdwara Sacha Sauda
  - `Events`: `''` -> `'Guru Nanak anniversaries; organised jatha pilgrimage'`

### Gurdwara Sahib Saidpur (Guru Nanak Dev Ji)
  - `Events`: `'Preserved as a heritage site; occasional Sikh visitors. No regular events scheduled.'` -> `'Preserved as a heritage site; no regular events'`

### Gurdwara Shaheed Bhai Taru Singh
  - `Events`: `''` -> `'Martyrdom commemoration (1 July)'`

### Gurdwara Shaheed Ganj Singh Singhnian
  - `Events`: `''` -> `'Martyrdom commemoration; pilgrim visits'`

### Gurdwara Singh Sabha
  - `Events`: `''` -> `'Daily worship; Sikh anniversaries'`

### Gurdwara Sri Kiara Sahib
  - `Events`: `''` -> `'Guru Nanak Gurpurab'`

### Gurdwara Sri Tilganji Sahib
  - `Events`: `'No events scheduled right now'` -> `'Daily worship; Sikh anniversaries'`
  - `needs_review`: `'events_placeholder'` -> `''`

### Gurdwara Tambo Sahib
  - `Events`: `''` -> `'Guru Nanak Gurpurab'`

### Guru Gurpat Mandir (DB-80 Sirey Ghat)
  - `Events`: `''` -> `'Community worship; langar-adjacent hospitality'`

### Gurudwara Janam Asthan Nankana Sahib
  - `Events`: `''` -> `'Guru Nanak Gurpurab (principal Sikh pilgrimage in Pakistan)'`

### Jagannath Temple, Sialkot
  - `Events`: `''` -> `'Community worship; no fixed festival documented'`

### Jain Mandir, Lahore
  - `Events`: `'Reopened for active worship in June 2022 following restoration; no fixed public festival calendar documented'` -> `'Reopened for active worship 2022; no fixed public festival calendar'`

### Jhollay Lal Mandir
  - `Events`: `''` -> `'Cheti Chand'`

### Kalat Kali Temple
  - `Events`: `'Annual three-day Kali festival held each January, drawing Hindu pilgrims from across Pakistan and from India'` -> `'Annual three-day Kali festival (January)'`

### Kali Bari Mandir
  - `Events`: `''` -> `'Durga Puja; daily worship'`

### Kalka Cave Temple (Asthan of Kalka Devi)
  - `Events`: `''` -> `'First Monday of each month; major goddess festivals'`

### Katas Raj Temples
  - `Events`: `''` -> `'Maha Shivratri; periodic cross-border pilgrimage'`

### Krishna Mandir (Kabari Bazar)
  - `Events`: `''` -> `'Holi; Diwali; Janmashtami'`

### Krishna Mandir (Ravi Road)
  - `Events`: `''` -> `'Janmashtami; Holi; Diwali'`

### Lal Kurti Temple (Balmiki Mandir), Rawalpindi
  - `Events`: `'Diwali, Holi, Raksha Bandhan; daily worship'` -> `'Diwali; Holi; Raksha Bandhan; daily worship'`

### Lal Shahbaz Qalandar
  - `Events`: `'No events scheduled right now'` -> `"Annual urs (Sha'ban); Thursday-evening dhamal and qawwali; daily langar"`
  - `needs_review`: `'events_placeholder'` -> `''`

### Langer Makhdoom
  - `Events`: `'Annual urs'` -> `'Annual urs (16-18 March); Friday gatherings at the tomb'`

### Loh Temple (Lava Temple)
  - `Events`: `'Recently restored and reopened to visitors (January 2026); no regular festival calendar documented'` -> `'Recently restored and reopened to visitors; no congregational worship'`

### Mausoleum of Waris Shah
  - `Events`: `''` -> `'Annual urs; Heer recitation and qawwali'`

### Mazar of Bulleh Shah
  - `Events`: `'Annual urs'` -> `'Annual urs; kafi singing through the night'`

### Mithankot (Kot Mithan)
  - `Events`: `'Annual urs'` -> `'Annual urs; kafi singing; qawwali; langar'`

### Nagarparkar Jain Temples (Nagarparkar Cultural Landscape)
  - `Events`: `''` -> `'None - abandoned; heritage visitation'`

### Panj Tirath
  - `Events`: `''` -> `'Historically Kartik bathing; not currently observed'`

### Parnami Mandir
  - `Events`: `''` -> `'Historically an annual mela in Chaitra; not currently observed'`

### Prahladpuri Temple
  - `Events`: `''` -> `'None - destroyed 1992'`

### Purana Bhalwal
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali; langar'`

### Rahman Baba Mausoleum (Rehman Baba Shrine)
  - `Events`: `''` -> `'Annual urs with mushaira (poetic assembly); rabab recitals'`

### Ram Mandir, Saidpur (Ram Kund Mandir)
  - `Events`: `'Heritage/tourist site; regular worship discontinued (idols removed)'` -> `'Heritage/tourist site; regular worship discontinued'`

### Ramapir Temple, Tando Allahyar
  - `Events`: `''` -> `'Ramapir Mela (1 Bhadva, three days)'`

### Ranmal Sharif
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali and naat; langar'`

### Sadh Belo (Sadh Belo Island Temple)
  - `Events`: `''` -> `'Annual festival (boat pilgrimage to the island)'`

### Sakhi Sarwar
  - `Events`: `'Annual urs'` -> `'Annual urs and pilgrimage; seasonal banner processions'`

### Sant Baba Asudaram Darbar (Panno Aqil)
  - `Events`: `'Annual death anniversary (Anant Chaturdashi); continuous sadavrat (free kitchen)'` -> `'Annual death anniversary (Anant Chaturdashi); continuous sadavrat'`

### Sant Baba Bhagat Ram Darbar Mandir
  - `Events`: `''` -> `'Not documented'`

### Shah Noorani Shrine (Syed Bilawal Shah Noorani)
  - `Events`: `''` -> `'Annual urs; evening dhamal; qawwali and langar'`

### Shahwala Teja Singh Mandir
  - `Events`: `''` -> `'Maha Shivratri'`

### Shaktipeeth Shri Hinglaj Mata Mandir
  - `needs_review`: `''` -> `'unmatched_in_patch'`

### Shamsabad
  - `Events`: `'Annual urs'` -> `'Two annual urs observances (15 March and 6 September)'`

### Sharada Peeth
  - `Events`: `''` -> `'None - ruin; access restricted near the Line of Control'`

### Shergarh
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali; langar'`

### Shiv Mandir Chiti Ghati
  - `Events`: `''` -> `'Maha Shivratri (late winter)'`

### Shree Ratneshwar Mahadev Temple, Karachi
  - `Events`: `''` -> `'Maha Shivratri (principal festival)'`

### Shri Laxmi Narayan Mandir (Native Jetty Bridge)
  - `Events`: `''` -> `'Ganesh Chaturthi; Holi; Raksha Bandhan; asthi visarjan rites'`

### Shri Panchmukhi Hanuman Mandir (Karachi)
  - `Events`: `''` -> `'Hanuman Jayanti; Holi; Diwali'`

### Shri Swaminarayan Mandir, Karachi
  - `Events`: `''` -> `'Janmashtami; Holi; Diwali'`

### Shri Varun Dev Mandir
  - `Events`: `''` -> `'None - derelict; conservation appeals ongoing'`

### Shrine at Odero Lal (Udero Lal Teerath Asthan)
  - `Events`: `''` -> `'Cheti Chand; shared Hindu and Muslim observance year-round'`

### Shrine of Abdullah Shah Ghazi
  - `Events`: `'Annual urs'` -> `'Annual urs; Thursday-evening qawwali and dhamal'`

### Shrine of Abul Faiz Qalander Ali Suharwardi
  - `Events`: `'Annual urs'` -> `'Annual urs (11-12 Rabi al-Awwal); weekly Sunday milad; daily langar'`

### Shrine of Akhund Darweza Baba
  - `Events`: `'Pilgrimage to the tomb; visited year-round by devotees'` -> `'Pilgrimage to the tomb; visited year-round'`

### Shrine of Baba Shah Chiragh
  - `Events`: `'No confirmed annual urs date currently documented'` -> `'No confirmed annual urs date documented'`

### Shrine of Bahauddin Zakariya
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali; daily langar'`

### Shrine of Bibi Pak Daman
  - `Events`: `'Annual urs'` -> `'Annual urs; Thursday-night gathering; Muharram observances (peak attendance)'`

### Shrine of Fariduddin Ganjshakar
  - `Events`: `'Annual urs'` -> `'Annual urs (Muharram) with the opening of the Bahishti Darwaza; qawwali; langar'`

### Shrine of Ganj e Inayat Sarkar
  - `Events`: `'Annual urs'` -> `"Annual urs (27-28 Sha'ban); weekly Saturday gathering; langar"`

### Shrine of Hazrat Madho Lal Hussain (Shah Hussain Darbar)
  - `Events`: `''` -> `'Mela Chiraghan / annual urs (9-11 Shawwal); Thursday-evening lamp-lighting, dhamal and qawwali'`

### Shrine of Hazrat Muhammad Ayub Shah Bukhari
  - `Events`: `'Annual urs (death-anniversary commemoration)'` -> `'Annual urs'`

### Shrine of Hazrat Shah Daula Daryai
  - `Events`: `''` -> `'Annual three-day urs (Auqaf-administered); langar'`

### Shrine of Imam Ali-ul-Haq
  - `Events`: `'Annual urs'` -> `'Annual urs; devotional music and langar'`

### Shrine of Jalaluddin Surkh-Posh Bukhari (Jalaluddin Bukhari)
  - `Events`: `''` -> `'Annual urs; qawwali; langar'`

### Shrine of Lakhi Shah Saddar
  - `Events`: `'Annual urs'` -> `'Annual urs; ritual bathing in the Laki hot springs'`

### Shrine of Makhdoom Abdul Rahim Girhori
  - `Events`: `'Annual urs'` -> `'Annual urs; visited by both Muslims and Hindus'`

### Shrine of Makhdoom Jahaniyan Jahangasht
  - `Events`: `''` -> `'Annual urs; qawwali; langar'`

### Shrine of Mauj Darya Bukhari
  - `Events`: `'Annual three-day urs; weekly Thursday milad'` -> `'Annual urs (17-19 Rabi al-Awwal); weekly Thursday milad; Mela Chiraagha'`

### Shrine of Mian Mir
  - `Events`: `''` -> `'Annual urs (7 February); Thursday-evening qawwali; daily langar'`

### Shrine of Mian Umar Baba (Chamkani)
  - `Events`: `'Annual urs on the first Wednesday and Thursday of Rajab (langar served)'` -> `'Annual urs (first Wednesday and Thursday of Rajab); langar'`

### Shrine of Peer Makki
  - `Events`: `'Annual urs (around 10th Rabi al-Awwal)'` -> `'Annual urs (9-11 Rabi al-Awwal); Thursday-night gatherings; dhamal and qawwali'`

### Shrine of Pir Baba (Syed Ali Tirmizi)
  - `Events`: `'Annual urs (24–26 Rajab)'` -> `'Annual urs (24-26 Rajab)'`

### Shrine of Pir Chhatal Shah Noorani
  - `Events`: `'Visited year-round by Muslim and Hindu pilgrims (no fixed urs recorded)'` -> `'Visited year-round by Muslim and Hindu pilgrims; no fixed urs recorded'`

### Shrine of Pir Mangho
  - `Events`: `'Annual urs'` -> `'Annual urs; Sheedi Mela (drumming, dance, offerings to the crocodiles)'`

### Shrine of Pir Sher Muhammad
  - `Events`: `'Annual urs'` -> `'Annual urs; naat and qawwali; daily langar'`

### Shrine of Sachal Sarmast
  - `Events`: `'Annual urs'` -> `'Annual urs; poetry, music and dhamal'`

### Shrine of Shah Inayat Qadiri
  - `Events`: `'Annual urs (25th–27th Jamadi al-Thani); zikr, qawwali and langar'` -> `'Annual urs (25-27 Jamadi al-Thani); zikr, qawwali and langar'`

### Shrine of Shah Jamal
  - `Events`: `'Annual urs (3rd–5th Rabi al-Thani); weekly Thursday-night dhamal (drum-trance gathering)'` -> `'Annual urs (3-5 Rabi al-Thani); weekly Thursday-night dhamal'`

### Shrine of Shah Rukn-e-Alam
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali; daily langar'`

### Shrine of Shah Shams-ud-Din Sabzwari
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali and langar'`

### Shrine of Syed Musa Pak
  - `Events`: `'Annual urs'` -> `'Annual urs; qawwali; langar'`

### Sial Sharif
  - `Events`: `'Annual urs'` -> `'Annual urs; naat and qawwali; daily langar'`

### Tilla Jogian
  - `Events`: `''` -> `'None - abandoned since 1947'`

### Tomb of Allama Iqbal (Mazar-e-Iqbal)
  - `Events`: `''` -> `'Iqbal Day (9 November); death anniversary (21 April); daily changing of the guard'`

### Tomb of Qutbuddin Aibak
  - `Events`: `'No events scheduled right now (heritage/tourism site, not a pilgrimage destination)'` -> `'None - heritage site, no devotional programme'`
  - `needs_review`: `'events_placeholder'` -> `''`

### Tomb of Ustad Nuriya
  - `Events`: `'No events scheduled right now'` -> `'None - heritage site, no devotional programme'`
  - `needs_review`: `'events_placeholder'` -> `''`

### Umarkot (Amarkot) Shiv Mandir
  - `Events`: `''` -> `'Maha Shivratri (three-day festival)'`

### Valmik Mandir (Naqi Road)
  - `Events`: `''` -> `'Holi; Diwali; Valmiki Jayanti'`

### Valmiki Swamiji Mandir (Gracy Lines), Rawalpindi
  - `Events`: `'Diwali, Holi'` -> `'Diwali; Holi'`


## Stage 3 — targeted fixes (`fix_targeted.py`)

`shrines_merged.csv` (163 rows, 42 cols) -> `shrines_final.csv` (163 rows, 43 cols)

**Rows with value changes: 8 of 163.**

Rationale per change in `reports/targeted_changes.md`. Highlights: Allo Mahar description replaced with the sourced short entry from `allo_mahar_resolution.md` (figure unresolved -> no biography written); Bibi Jawindi and both Gurdwara coordinates corrected; Luari Sharif punctuation fix for a false-positive artefact match; Amb Temples dedication flagged unsourced (not edited).

Columns added: `info_level`. No column removed; no row added or removed.

### Allo Mahar
  - `Description` (diff):

    ```diff
    @@ -2,19 +2,13 @@
     
    -Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot District, in the fertile plain between the Chenab and the foothills of Kashmir, which has become known across Pakistani Punjab as a centre of Naqshbandi devotion. Its fame rests above all on the shrine of Sayyid Faiz-ul-Hassan Shah, the twentieth-century orator and scholar honoured by his followers as *Khatib-ul-Islam*, "the preacher of Islam," but the village carries a longer association with a line of Naqshbandi *sayyids*, and the suffix *Sharif* — "noble" — attached to its name signals the sanctity that local tradition ascribes to it. The shrine is a place of both pilgrimage and learning, in keeping with a family whose reputation was made as much in the pulpit and the printed page as in the cell of the mystic.
    +Allo Mahar Sharif is a village in the Daska *tehsil* of Sialkot District, in the plain between the Chenab and the Kashmir foothills. The suffix *Sharif* — "noble" — marks the sanctity local tradition ascribes to it, and the village is known across Pakistani Punjab as a centre of Naqshbandi devotion associated with a line of *sayyid* families.
     
    -## The Life of Faiz-ul-Hassan Shah
    +## A note on identification
     
    -Sayyid Faiz-ul-Hassan Shah was born at Allo Mahar around 1911 into this *sayyid* household and rose to become one of the most celebrated religious orators of his age in the Punjab. Aligned with the *Ahl-e-Sunnat wa'l-Jama'at* — the Barelvi tradition of South Asian Sunni Islam — he was renowned for a commanding eloquence, expounding *hadith*, *tasawwuf* (Sufism), and Islamic philosophy before great gatherings and interweaving his sermons with devotional poetry in praise of the Prophet Muhammad. He is generally said to have begun his public religious career in the early 1930s, following the death of his father, and over the succeeding decades he became a prominent figure in the religious life and politics of his time.
    +Two distinct figures are connected with this village, and our records do not yet establish which of them this shrine commemorates.
     
    -His public activity was closely bound up with the movements of his day. He was associated with the *Majlis-e-Ahrar-ul-Islam* and with campaigns concerning the finality of prophethood (*khatm-e-nubuwwat*), a cause to which much Sunni activism was directed in colonial and post-colonial Punjab, and he served for a long period — reportedly some ten years — as a president of the *Jamiat Ulama-e-Pakistan*. He was also a writer, and works attributed to him, collections of his addresses and treatises on Islamic and Naqshbandi themes, circulated among his followers. The precise details of these engagements are recorded chiefly in devotional and partisan sources and are best read with that in mind, but there is no doubt of his standing as a leading *khatib* of his generation.
    +**Pir Syed Muhammad Channan Shah Nuri** is the figure recorded in our database for this site, in the Naqshbandi tradition.
     
    -## The Shrine and the Naqshbandi Lineage
    +**Sayyid Faiz-ul-Hassan Shah** (c. 1911–1984), honoured as *Khatib-ul-Islam*, was a celebrated orator of the *Ahl-e-Sunnat* tradition, also from Allo Mahar, who died in 1984 and is buried in the village.
     
    -Faiz-ul-Hassan Shah died on 22 February 1984 and was buried at Allo Mahar, where a shrine now commemorates him and an annual *urs* is held — traditionally kept on 23 March — drawing devotees from across the district and beyond. The village contains other tombs of the same *sayyid* family, and it is remembered as the home of a line of Naqshbandi saints, so that a visit to Allo Mahar is understood by pilgrims as homage not to a single figure alone but to a spiritual household rooted in the place.
    -
    -The devotional world of the shrine is characteristically Naqshbandi in its emphasis: a sober, *sharia*-minded Sufism that stresses the silent remembrance of God (*dhikr*), attachment to the Prophetic model, and the transmission of blessing through an unbroken chain of teachers. To this the memory of Faiz-ul-Hassan Shah adds the distinctive note of the orator's mission — the conviction that the spoken word, delivered with learning and passion, is itself a form of service to the faith. His grave thus draws those who honour him as a saint and those who revere him as a defender of doctrine, and often the same visitors in both capacities.
    -
    -## Legacy
    -
    -Allo Mahar Sharif illustrates a pattern common in rural Punjab, in which an otherwise unremarkable agricultural village becomes a node of religious life through the presence of a saintly family and the shrine of a beloved figure. For Sialkot District it is a place of local pride, its name lending itself to the wider network of Barelvi and Naqshbandi devotion that shapes popular Islam in the region. The continuing observance of the *urs*, the upkeep of the family tombs, and the circulation of Faiz-ul-Hassan Shah's sermons together keep his memory vivid, and mark the shrine as a living institution rather than a relic of the past.
    +The village contains tombs of more than one member of these *sayyid* households, and a visit to Allo Mahar is understood by pilgrims as homage to a spiritual family rooted in the place rather than to a single figure. **This entry is awaiting a field visit to confirm which tomb the shrine refers to, whether the site should be recorded as more than one entry, and what the annual *urs* commemorates.** Until then we have deliberately left it brief rather than attribute a history to the wrong man.
     
    @@ -22,5 +16,2 @@
     
    -- Biographical notices of Sayyid Faiz-ul-Hassan Shah "Khatib-ul-Islam" (c. 1911–1984), in Urdu *tazkira* literature and collected editions of his addresses.
    -- *Sialkot District Gazetteer* and district records, for Allo Mahar and the Daska *tehsil*.
    -- General studies of the *Ahl-e-Sunnat* (Barelvi) movement and Naqshbandi Sufism in twentieth-century Punjab.
    -- Contemporary press and community accounts of the annual *urs* at Allo Mahar Sharif.
    +- Pending. Prior source attribution for this entry has been withdrawn as unreliable.
    ```

  - `needs_review`: `''` -> `'figure_unresolved'`

### Amb Temples (Amb Sharif)
  - `needs_review`: `''` -> `'dedication_unsourced'`

### Dargah of Khwaja Muhammad Zaman (Luari Sharif)
  - `Description` (diff):

    ```diff
    @@ -1 +1 @@
    -The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman received his first instruction from his father, Shaikh Abdul Latif, a follower of the Naqshbandi order, before studying at Thatta, then the great seat of learning in Sindh. There he came under the influence of the Sufi master Khwaja Abul Masakin, whose disciple he became and from whom, tradition records, he received the honorific Sultan al-Aulia, "master of the saints". Settling at Luari, he made the khanqah he established there — traditionally dated to 1737 — the foremost Naqshbandi centre of eighteenth-century Sindh after Thatta, a place of study from which his khalifas carried the order's teaching across the province. He was also a poet of note: a body of mystical verse in Sindhi is attributed to him, of which some eighty-five poems are said to survive. He died in January 1775 and was buried at Luari, where his tomb and the vaulted chambers of his successors form the shrine complex. An annual urs commemorates him and draws devotees from across the region, though the complex has at times been subject to restricted access, with a police post maintained at its entrance since the 1980s. Luari Sharif is counted among the oldest and most important Sufi sites of southern Sindh.
    +The dargah of Luari Sharif, some fifteen kilometres from the town of Badin in the far south of Sindh, is the shrine of Khwaja Muhammad Zaman (1713–1775), one of the most revered Naqshbandi Sufis and Sindhi mystic poets of the eighteenth century. Born into a family of the Siddiqi lineage that claimed descent from the caliph Abu Bakr and had settled in Sindh in earlier centuries, Muhammad Zaman received his first instruction from his father, Shaikh Abdul Latif, a follower of the Naqshbandi order, before studying at Thatta, then the great seat of learning in Sindh. There he came under the influence of the Sufi master Khwaja Abul Masakin, whose disciple he became and from whom, tradition records, he received the honorific Sultan al-Aulia, "master of the saints". Settling at Luari, he made the khanqah he established there — traditionally dated to 1737 — the foremost Naqshbandi centre of eighteenth-century Sindh after Thatta, a place of study from which his khalifas carried the order's teaching across the province. He was also a poet of note; a body of mystical verse in Sindhi is attributed to him, of which some eighty-five poems are said to survive. He died in January 1775 and was buried at Luari, where his tomb and the vaulted chambers of his successors form the shrine complex. An annual urs commemorates him and draws devotees from across the region, though the complex has at times been subject to restricted access, with a police post maintained at its entrance since the 1980s. Luari Sharif is counted among the oldest and most important Sufi sites of southern Sindh.
    ```


### Garh Maharaja (Shorkot)
  - `principal_figure`: `'Sultan Bahoo'` -> `'Sultan Bahu'`

### Gurdwara Dera Sahib
  - `Latitude`: `'31.3523'` -> `'31.588'`
  - `Longitude`: `'74'` -> `'74.313'`

### Gurdwara Khoohi Bhai Lalo (Bhai Lalo di Khooi)
  - `Longitude`: `'74'` -> `'74.2470'`

### Parnami Mandir
  - `principal_figure`: `'Dya Ram (samadhi)'` -> `'Dya Ram'`

### Tomb of Javindi Bibi
  - `Latitude`: `'29.14'` -> `'29.238'`
  - `Longitude`: `'71.04'` -> `'71.064'`
  - `qa_note`: `''` -> `'Coordinates corrected to the Bibi Jawindi tomb on the Uch Sharif Bukhari mound (29.238, 71.064); previous value (29.14, 71.04) sat ~11 km off the Uch Sharif monument cluster.'`

