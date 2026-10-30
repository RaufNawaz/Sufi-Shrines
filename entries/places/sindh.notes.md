# Team version notes: `sindh` (province article)

Source: `entries/places/sources/sindh.sources.md` only. Written 30 October 2026 by a scheduled firing of the place article queue.

## Composition (30 October 2026, scheduled firing)

Three section drafters (Sorley and Shackle's *Risalo*; Boivin, Schaflechner and Bhandari; the other twenty books), three composers (history and the land; saints and communities; language, the state and the books), one writer for the Overview and Where the Sources Disagree (33 items, twelve of them found while composing). Parts and composed groups are in `entries/places/drafts/sindh.*`. Checker: 906 citations to 25 books, exit 0.

A heading outside the brief's province list was kept: `## The Land and Its Livelihood` (Sorley's economic history: trade, industry, irrigation, population, revenue, land tenure).

Spellings fixed in narration (quotations and titles as printed): Sindh (Sind only for an author's own unit, "the Sind of Sorley's day", and in titles), Punjab, Shah Abdul Latif, Lal Shahbaz Qalandar, Thatta, Bhakkar, Sumra in history and Sumiro in the language section (one composer followed Shackle; to be made one in a later pass), Samma, Kalhora for the dynasty and Kalhoro for persons, Tarkhan, Umarkot (for Umerkot and Bhandari's Amarkot), Menghwar, Kohli, Sidis, Baluchis and Baluchistan, Diwan Gidumal, Quran, Kutch.

For Rauf, from the composers and drafters:
1. Hinglaj: Bhandari's suba of Thatta takes it in, but the site is tagged Balochistan, so the Sindh article leaves it out.
2. The Sorley text is badly damaged; damaged figures and names are given as uncertain in plain words, and the year of the British annexation is not supplied where the page is destroyed.
3. Both Sorley's and Shackle's Source lines have an em dash in the title or edition; the bibliography items replace it with a semicolon.
4. Kanhaiya Lal's fourth territory (سوران) is left as "one further named territory".
5. Bhandari has two Mirza Isa Tarkhans (appointed 1037; died 965) and does not link them.


---

## Drafter of part 1

# Sindh, team version, part 1: notes for Rauf and the composer

Part: `entries/places/drafts/sindh.part1.md` (78,029 characters, 322 inline citations, 60 paragraphs).
Material: `entries/places/sources/sindh.sources.md`, "## From H. T. Sorley, Shah Abdul Latif of Bhit"
(the 59 `sindh` province bullets) and "## From Christopher Shackle, Risalo of Shah Abdul Latif" (the 15
`sindh` province bullets and the sweep note). Both books carry only `### Province-level material: sindh`
blocks in this file; nothing place-level.

`check_place_description.py team sindh --draft-dir /tmp/sindh_part1` exits 0. The Arabic-script prose
check prints 0. A separate pass confirmed that every double-quoted passage in the prose, of any length
(not only the six words and over that Q2 checks), occurs verbatim in the sources file.

## Headings used

`## The Province in History` · `## The Land and Its Livelihood` (added: not in the brief's province
list; it holds Sorley's long economic and administrative chapters: trade, the Company's factory,
industries, irrigation, population, villages, revenue, land tenure. The composer may merge it into
`The Province in History` or keep it) · `## Saints and Pilgrimage` · `## Communities` ·
`## Language, Poetry and Music` · `## Shrines and the State` · `## The Province in the Books` ·
`## Where the Sources Disagree` · `## Bibliography`. No `## Overview` (the composer's).

## Whose unit

- Sorley's unit is "Sind", mainly 1592 to 1843 and above all the poet's lifetime (he gives 1689 to
  1752), seen from his own day (first published 1940). He says himself that under Akbar Sind was not a
  suba of its own: it was two sarkars, Bakhar (Upper Sind) and Tatta (Lower Sind), of the Subah of
  Multan (pp. 31–32 and p. 150), and that Upper and Lower Sind were not fully united even in 1843. The
  part says so in his words and does not map either onto the modern province.
- Shackle's unit is "Sindh", the poet's and the poem's land, with "Sindh proper" once in the sweep note
  (not used). His one boundary statement used is his gloss that Hind is the Gangetic region "as opposed
  to Sindh and the Indus valley".
- The "Sindh" of Baluch poetry (Sorley p. 256, via Longworth Dames) is the Indus valley, not the
  province; the block flags it ("Weigh: this 'Sindh' is the Indus valley, not the province"). It is
  stated as exactly that in `The Province in the Books`, not used as a fact about the province.

## Handling of the damaged text (Sorley especially)

The Sorley transcription is heavily damaged: most bullets carry `[text-layer?]` flags with the reading
supplied in brackets. Rule applied:
- **No `[text-layer?]` token appears in the prose.** An English quotation was used only where the run
  quoted is clean in the sources; a damaged passage was given as paraphrase, without quotation marks,
  using the bracketed reading the source block itself supplies (Kalhora for "Kalh6ra", Talpurs for
  "Talpiirs", Baluchis for "Baliichis", Subah for "Siibah", and so on).
- **Where the damage touches a figure or a name, the uncertainty is said in plain words**: 1662 ("as
  the damaged printed figure is read", p. 42); about 1025 for the Sumra start ("ro25", p. 174); Hijri
  700 for the Sumra ("7 00", p. 270); 1711 for Yar Muhammad Kalhoro ("17II", p. 201); the whole
  chronological table's years ("imperfectly printed", pp. 201–202, where the block marks "split numbers
  [text-layer?]"); the tribute figures 1739 and 11 lakhs ("l7J9", "I I", p. 154: "several of the
  printed figures imperfect"); 1757 in Erskine ("1 75 7", p. 66); 1800 in the population shift
  ("1 800", p. 127); 1,274,732 and 48,000 ("l,274,732", "48 ,000", p. 127: "both figures imperfectly
  printed"); Mirza Jani Beg Turkhan ("Trirkhan", p. 200: "the name imperfectly printed"); Sawan
  ("Si:Iiwan", p. 430: "the word uncertainly printed"); the third madrasa ("}\hohra", p. 225: "a place
  north of Sehwan whose printed name cannot be read with certainty"); Jatois ("Jat6is", pp. 256–257:
  "the name imperfectly printed"); the year of the British annexation at p. 248, destroyed in the
  print ("whose year is lost in the printed text at this point"; the block itself refuses to supply it,
  and so does the part).
- Dates where the damage is only spacing or punctuation inside a clean figure (1592, 1737, 1747, 1760,
  1843) were given as printed, without a hedge.
- Five passages carry a soft hyphen in the sources ("Qarma­tian", "con­sisted", "pre­dilections",
  "irriga­tion", "con­scripted", "battle­field"); none was quoted, each was paraphrased, so the checker's
  verbatim match is not at the mercy of an invisible character.
- No `[OCR?]` and no `[illegible]` occurs in either assigned section, so none was carried.

## Left out, and why

- Sorley p. 196, folio 187: "Appendix II lists the vessels "in the Sind trade about 1758-60"" — a
  locator to a table, with no content about the province given. Left out.
- Shackle's `*Sweep notes:*` paragraph ("Hit counts in the ten `.txt` chunks …"): process material.
  Its exclusions (Bhit "near Hyderabad in lower Sindh", Bulri, Bhambhor, Las Bela, Umarkot "in eastern
  Sindh", Kinjhar, Lahut, Pab, Malir/Dhat, the bibliography imprints) are the source file's own
  decision that those are single places, not the province. Left out; only Umarkot appears, inside the
  quoted verse line "Some have passed over Umarkot and have made the ground green".
- Shackle's closing "Every bullet is province-level, weigh accordingly" is a general caution, not a
  doubt about any one bullet; every bullet was used as province material, framed as Shackle's.
- Shackle p. 333: "Gandiri" is "flagged in the takeaways as possibly damaged" — carried as "Gandiri,
  the first name uncertain in the printed text".
- Sorley p. 165, folio 156: "of the jaghirdar tribes "The vast majority of these are Baluchi tribes"" —
  not given separately; its sense is in the sentence that jagirs were held mostly by Baluch chiefs
  (p. 164).
- Sorley p. 9 dedication: only the two clean lines ("The drums of peacefulness are struck" / "Your land
  a full abundance yields") are quoted; the first two lines ("Gone are the days when tempered blade /
  And matchlocks'. fire laid waste your ·fields.") carry stray marks in the transcription and were
  summed up as "a peace that followed an age of war".
- Sorley p. 162, Burnes on jurisprudence ("As the state religion of Scinde is taken from the E:oran
  …"): paraphrased because of the damaged word.
- Sorley p. 7 ("In Sind his poems are · held in such universal and popular esteem …"), p. 215 ("still
  medieval in outlo0k"), p. 233 ("the 1ast eighty years"), p. 245 ("Shah Abdul L<l,tif"), p. 247 ("an
  appealt o"), p. 225 ("understood afl:d loyed"), p. 249 ("Siifistic thought bas been"), p. 303
  ("Siifism in Sind has been handed down"), p. 224, p. 225 (teaching profession), p. 116 ("Kalhorn …
  Talpiirs"), p. 110 ("the popular modem idea"), p. 157 ("Kalh6ro and Talpiir"), p. 162 ("The Baliichis
  seem generally …"), p. 170 (Pottinger's classes), p. 256 ("not the modem political division"):
  paraphrased, not quoted, for the damage.

## Disagreements listed (13)

1. Nadir Shah's coming: 1737 (p. 18), 1739 (p. 35), 1740 (table, p. 201). Sorley against himself.
2. Afghan suzerainty: 1747 / about 1747 (pp. 18, 35) against 1750 (table, p. 201).
3. Conversion of Sind: fourteenth and fifteenth centuries, Jam Nizamuddin c. 1461 (pp. 174–175)
   against from the twelfth century onwards, almost entirely Muslim by the Lodi period (p. 248).
4. Sumra dates: c. 1025 to c. 1360 (p. 174); Tarikh-i-Tahiri AH 700 to 843; Ain-i-Akbari five
   hundred years (p. 270).
5. Who the Sumra were: "a local dynasty of Rajput origin" (p. 247); "the Hindu tribe of Sumra"
   (Tarikh-i-Tahiri, p. 270); "the Muslim Rajput dynasties of Sumiros and Samos" (Shackle p. 17).
6. The Mughal unit: Subah of Multan with two sarkars (pp. 31–32, 150); "a province of the Empire"
   (Callendar, p. 61); "Governor of Multan and Sind" and "Subedar of Sind" (table, pp. 200–201).
7. Growth of Sufism: "rapidly established" (Shackle p. 12) against "no reliable account" and no
   "consistent progress" (Sorley pp. 298, 302).
8. Sindhi literature before Latif: absence of native literature, the only classic (Sorley pp. 245, 7)
   against an "established culture … of vernacular Sufi poetry" (Shackle p. 9).
9. Setting of the Risalo's stories: Hindu, pre-Islamic (Sorley p. 269) against the pre-Mughal period
   of the Muslim Rajput Sumiros and Samos (Shackle p. 17).
10. Peace under the Talpurs (Sorley pp. 40–41, 151–152) against Lieutenant James's "one continued
    battlefield" until the British (pp. 36–37).
11. Famine: "relatively immune" (pp. 129, 143) against the famine and plague of 1659 to 1660 (p. 56)
    and the drought and plague of 1648 to 1652 (p. 143, the same page).
12. Population: Del Hoste 850,000 in 1832 against Burnes about one million in 1828 (p. 126). Different
    years; listed because they are two estimates of one quantity four years apart.
13. Burton's "almost exhausted state" against Sorley's "considerable qualification" (p. 143).

## Verse

- No original-script verse: Shackle's 2025 edition is English only (the Sindhi text removed), and
  Sorley's province bullets carry no Sindhi lines. So the part has no verse paragraph.
- English verse quoted inline, from the translators' own English: Shah Abdul Latif, sur 22 *Sarang*
  v. 38, in Shackle's translation (p. 265): "Some have passed over Umarkot and have made the ground
  green" and "Dear friend and sweet beloved, make the whole world prosperous"; the line between them,
  "Oh my God, make Sindh fourish [text-layer?] [flourish] forever", is damaged and is given as
  paraphrase ("asks God to make Sindh flourish forever"). Sur 18 *Ramakali* (p. 244): "There is nothing
  like it in the north, in Sindh, or in Hind". Sorley's own dedicatory verse (p. 9): two lines, above.
- Shackle's note that the final invocation of Sindh is "one of the most often quoted verses of the
  Risālo" is given in paraphrase (its first word is damaged).

## Non-English prose rendered in English

None in Arabic script: neither section carries any. Terms kept as the books romanise them, italicised
where a term: *kami* ("amatory", the Ain-i-Akbari's word for Sind's music as Sorley quotes it,
p. 229, rendered "described the music of Sind as *kami*, amatory"), *begari* (forced labour, p. 130),
*sar shumari* (poll tax, p. 155), *puttadaris* (p. 164), *inams*, *maktabs* (p. 222), *landhis*
(p. 126), *hafiz* (p. 219), *tasawwuf* (p. 299).

## Spellings

Narration uses Sindh only where Shackle is the source and Sind where Sorley is, since the article is
built from two authors who spell it differently; the composer may settle one. Dynasty: Kalhora (the
individual rulers keep "Kalhoro" as the table prints them: Yar Muhammad Kalhoro, Ghulam Shah Kalhoro);
Talpurs; Baluchis/Baluch; Sayyids in narration (glossary), "Sayids" only inside Sorley's quotations;
Mughal in narration, "Moghul" only in quotation; Tatta (Sorley) and Thatta (Shackle) kept to each
author.

## Bibliography

- Sorley's Source line prints the title with an em dash ("His Poetry, Life and Times — A Study of …").
  Rauf's standing rule bars em dashes; the item gives it with a semicolon ("His Poetry, Life and Times;
  A Study of …"). The ISBN on the last leaf was left out. The cited title string
  "Shah Abdul Latif of Bhit" is in the item.
- Shackle's Source line also has an em dash ("2025 — an English-only reprint …"); given with a
  semicolon. The cited title string "Risalo of Shah Abdul Latif" is in the item (inside "The Risalo of
  Shah Abdul Latif: Sufi Poetry from Sindh").

## Questions for Rauf

1. A heading outside the brief's province list, `## The Land and Its Livelihood`, holds Sorley's
   economic history (about a fifth of the part). Keep it as its own section, or fold it into
   `The Province in History`?
2. The em dash inside Sorley's and Shackle's book titles: is a semicolon in the bibliography
   acceptable, or should titles be copied with the dash as an exception to the no-dash rule?
3. Sind or Sindh in the narrator's voice for the whole article (the books split: Sorley "Sind",
   Shackle "Sindh")?


---

## Drafter of part 2

# Sindh, part 2: notes for Rauf

Part: `entries/places/drafts/sindh.part2.md` (team version, section drafter 2 of 3).
Material: `entries/places/sources/sindh.sources.md`, the three sections "From Michel Boivin, Hindu Sufis of South Asia", "From Jürgen Schaflechner, Hinglaj Devi" and "From Sujan Rai Bhandari, Khulasat al-Tawarikh", read in full.
Check: `check_place_description.py team sindh --draft-dir /tmp/sindh_part2` exit 0 (274 citations to 3 books, 60 paragraphs); Arabic script in prose paragraphs: 0.

Headings used: The Province in History; Saints and Pilgrimage; Communities; Language, Poetry and Music; Shrines and the State; The Province in the Books; Where the Sources Disagree; Bibliography. No Overview (the composer's).

## Whose unit, and when

- Bhandari: the *wilayat* of Sind / realm of Sind / lands of Thatta / "the wilayat of Sind known as Thatta" (pp. 173, 386–387, 175, 581), and in his own time (work dated 1107 AH, p. 581) the Mughal *suba* of Thatta, four *sarkars* Thatta, Siwistan, Nasirpur, Amarkot (pp. 528–530). Stated as his unit; not mapped onto the modern province.
- Boivin: colonial and modern Sindh, plus his own note that the Siraiki area of Southern Punjab "was a part of Sindh during the Middle Ages" (p. 216, folio 203), given as the book's statement of a differently bounded Sindh.
- Schaflechner: the modern province of Pakistan (minority seats, NGO figures), and "real Sindh" (Abro) as a nationalist construct, given as Abro's.

## Left out, and why

- Bhandari c. 038, "The Pandavas' last journey ... (p. 479)": a bare locator with no content in this file; left out.
- Bhandari c. 014 header, "سال سی و هشتم مطابق سنه هزار و یک هجری" (the 38th regnal year of the annexation): carries no page of its own in the bullet; left out. The annexation year 1001 AH is given from p. 171.
- Bhandari c. 006, "Muharram of the year printed ۱۰۶۸[OCR?] / ۱۰۶۹[OCR?]": the year sits in the bullet's period descriptor with no page; left out of the Qubad Khan sentence (p. 64). Qubad Khan's sentences keep p. 49 and p. 64 only.
- Bhandari c. 042, "Pass 1's Doubts: the book places Hinglaj in its suba Thatta section": process doubt, no page; left out. Hinglaj is not presented as in Sindh anywhere in the part (Schaflechner's book is introduced as on "the goddess temple of Hinglaj", not "the province's").
- Bhandari c. 004 period descriptor "Muharram to Rabi al-Thani, the year not stated": not used.
- Bhandari c. 047 table of contents locators (p. 591, p. 589): kept, but stated as what they are ("the chronicle's table of contents lists a section on ...").
- Bhandari c. 032 and c. 033 campaign and flight mentions (Jalal al-Din to Sind and Siwistan p. 399; the raja fleeing toward Sind pp. 421–420; the riverbank punishment p. 412): weak transit material, kept briefly in one paragraph as Sind appearing as a frontier of campaigns, never as facts about the province's life. The riverbank items are only "attached province-level by judgement"; I wrote "the bank of the river Sind" and "the country along the river Sind", which is what the Persian says.
- Boivin, "(The "Sindhian culture" area sentence is under `punjab` and `not attached`.)": not in this material; left out.
- Boivin p. 214 endnote: "This note does not itself name Sindh"; used only for the Amils as scribes of the Kalhoras and Talpurs, which the bullet attaches here.
- Schaflechner p. 81 note "(Kutch and Saurashtra are named alongside Sindh; see `not attached`)": Kutch and Saurashtra named only as the sentence names them alongside Sindh.
- Schaflechner p. 88 parenthesis "(The book's own phrase for this unit is "the Bombay Presidency"; the book adds no boundary history.)": the Bombay Presidency named as Verkaaik's phrase, no boundary history added.
- Boivin p. 499 bullet "See Sweep notes": process pointer; not used.
- No conversion of Hijri to Common Era was made anywhere (e.g. 735 AH, 927 AH, 1001 AH, 1107 AH stay as printed). An earlier wording "writing at the end of the seventeenth century" was removed for that reason.

## Weak material and uncertain readings, and how treated

Every Bhandari reading marked [OCR?] or [illegible] in the material is given in plain words in the English ("uncertain in the printed text", "cannot be read"). None of the page references carry [OCR?]. Carried uncertainties:
- Qubad Khan's name (p. 49, p. 64); "از کوکیان[OCR?] شینخمیر[OCR?]" rendered "described as one of the foster kin of Shaikh Mir, the words uncertain".
- 1037 for Shah Jahan's march (pp. 104–106).
- Bani Tamim Ansari; the Sammas' name; the illegible word in the Soomra takeover and in the Jam/Jamshid etymology (p. 173).
- Jam Bani Thatta's name; Jam Anzar's year 735 and his illegible reign length; Jam Junan, Jam Tamachi, Jam Karan names; Jam Tughluq's eighteen (pp. 172–173).
- 927 (p. 172); 930, 962, 965 and Muhammad Baqi's eighteen (p. 171); 1001 (p. 171).
- Jam Nanda's name and the *jagir* name (Mesr?) (p. 295).
- 417 (p. 412); the raja's name "لجه بجے راے" (pp. 421–420); Shihab al-Din's year "۵[illegible]" (p. 404).
- "ده[OCR?] کرور[OCR?]" in the *suba* revenue (pp. 528–529): "the first two words of the sum uncertain".
- "در[OCR?] شش کروهے" (six kos), "روغن[OCR?]" (fish oil), "پلوه[OCR?]" (the palla fish) (p. 530); "سبوده[OCR?]" (Sabuda) and "راجپوت[OCR?]" (p. 529; Rajput given without hedge since the sense is plain, flag if you want it hedged).
- Boivin text-layer marks: "Lowari Shari [text-layer?] [Lowari Sharif]" given as Lowari Sharif; "Kuch [text-layer?] [Kutch]" as Kutch; "Norther [text-layer?] [Northern]" as Northern Sindh. Schaflechner "Ibrahmin Joyo[text-layer?] [Ibrahim Joyo?]" given as "Ibrahim Joyo, whose first name the book prints as Ibrahmin".
- Boivin p. 40, "it is certain whether" (printed so; sense needs "uncertain"): quoted as printed with "which seems to have lost a negative".
- Boivin p. 38, 1872 census "2,333,527 million" and "statistics are not available": both kept as printed, and listed as an internal disagreement.
- Bhandari's liver-eaters (pp. 529–530) are given throughout as what Bhandari relates and reports, never in the narrator's voice. Legends (Brahmakshatriya, Charan Avar, Vagri oral history, the plague dream at the conquest) likewise framed as stories.

## Disagreements listed (7)

1. Religious harmony in Sindh's history: Syed and Verkaaik (via Schaflechner pp. 88–89, 89) against Schaflechner pp. 90–91 and Boivin pp. 61, 64.
2. Caste: Thakur (via Schaflechner pp. 277–278) against Boivin p. 40, with Boivin pp. 36–37.
3. Lohana share of Hindus: Boivin pp. 40–41 ("half") against McMurdo and Thakur (Schaflechner pp. 79, 80: "great body", "general body"). A mild difference; drop it if you think it forced.
4. Who ruled when Firuz Shah came: Boivin p. 189 (Jam Juna II, 1367) against Bhandari p. 173, pp. 172–173 (Jam Bani Thatta son of Anzar; Jam Junan as Anzar's brother).
5. Shikaris and Dheds: Burton against other authors (Boivin p. 187).
6. The 1872 census sentence, internal to Boivin (p. 38).
7. Partition migrant numbers, 0.8 million against the consensus of about 1 million, both in Boivin (p. 61).

Considered and not listed: Boivin's 1351 for the Samma accession against Bhandari's 735 for Jam Anzar (a disagreement only after converting the Hijri year, which I did not do); Ajwani against Jotwani on Bhakti in Sindh (not a contradiction; both given in prose); Schaflechner's 6 to 10 million against Boivin's "several millions" (compatible).

## Verse quoted

None. My three books carry no verse in their Sindh material.

## Non English prose rendered in English (Bhandari, all Persian)

- p. 581: "یک هزار و یکصد و هفتم هجری" → the year one thousand one hundred and seven of the Hijra.
- p. 173 "ولایت سنده" → the *wilayat* of Sind; pp. 386–387 "مملکت سنده با توابع ولواحق ومضافات در جاگیر شاهزاده مقرر گردید" → the realm of Sind, with all its dependencies, was fixed as the *jagir* of Prince Muhammad Sultan; p. 175 "ممالک تهته" → the lands of Thatta; p. 581 "ولایت سند المشهور به تهته" → the *wilayat* of Sind known as Thatta; p. 530 "صوبه تهته" → the *suba* of Thatta.
- p. 530 "برهمن اباد نام شهری بزرگ تختگاه بود و قلعه ان هزار و چهار صد برج داشت هر یک بفاصله یک طناب"; "ادپور پائے تخت گردید"; "پس ازان دیول اکنون تهته و دیبل دار الحکومت است" → Brahmanabad, a great city and seat of the throne, its fort with fourteen hundred towers each a rope's length apart; Adpur became the capital; then Dewal, and now Thatta and Debal are the seat of government (kept literal; the last clause is ambiguous in the Persian).
- p. 411 "لشکر عظیم بجانب ملتان وسنده کشیده تا چهار هزار کشتی ساختند" → led a great army toward Multan and Sind and had as many as four thousand boats built.
- pp. 421–420 "از روے بے همتی و بے تدبیری ... بجانب سند روان شد" → out of faintheartedness and poor judgement made for Sind.
- p. 412 "جمعی که دروقت مراجعت ازسومنات برکناره دریاۓ سنده بلشکریان سلطان بے ادبی کرده بودند" → a group who had behaved insolently toward his soldiers on the bank of the river Sind as he returned from Somnath.
- p. 404 "برسر دیول که بتهته مشهور است رفته تمام ولایت درکنار دریاۓ سنده بضبط درآورد ونفایس ونوادر ان دیار بامال بسیار گرفته برگشت" → went against Dewal, known as Thatta, brought the whole country along the river Sind under control, and returned with the rarities of that land and great wealth.
- p. 399 "بطرف سند وسیوستان" → toward Sind and Siwistan.
- pp. 173–174 "پوشیده نماند که در تاریخ سلطان بهادر شاه احوال سلاطین ولایت سنده چنان بقلم آورده اند" → the history of Sultan Bahadur Shah sets down the affairs of the sultans of the *wilayat* of Sind thus.
- p. 173: "یکصد و سی و نه سال" → 139 years; "پانصد سال در خانواده سومرگان حکومت ماند" → government stayed in the Soomra family five hundred years; "جام" for their "مقدم و کلانتر" traced "از [illegible] و جمشید" → the title Jam for their headman and chief traced through an unreadable word to Jamshid; Firuz Shah's three marches, taking the *wilayat*, bringing the Jam to Delhi and restoring the country.
- pp. 172–173: the Jams' list (block's own English for reigns, Persian figures as glossed by the block); "یک و نیم روز" → a day and a half; "چون آن ولایت از حاکم خالی گردید" → when the country was left without a ruler; "که بجام نندا مشهور است" → who was known as Jam Nanda; "هیزده" → eighteen.
- p. 172: "حکومت ولایت سنده بلاشرکت بجام فیروز تعلق گرفت" → the government of the *wilayat* of Sind passed to Jam Firuz alone; "در سنه ۹۲۷ میرزا شاه بیگ ارغون از قندهار لشکر کشیده تهته را متصرف شد" → in 927 Mirza Shah Beg Arghun led an army from Qandahar and took Thatta; "از آنجا حکومت سلسله سمه گان منقطع گردید" → with that the rule of the Samma line was cut off.
- p. 171: "بقوت و شجاعت ولایت سنده متصرف گشت" → took the *wilayat* of Sind by strength and courage; "میرزا عیسی ترخان از امراے میرزا شاه بیگ در تهته و سلطان محمود در بهکر دم استقلال میزدند" → Mirza Isa Tarkhan, one of Shah Beg's amirs, at Thatta and Sultan Mahmud at Bhakkar each claimed independence; "آن ولایت داخل ممالک محروسه گردید" → the country entered the protected dominions.
- p. 175 "نخستین انتزاع ولایت تهتهه پیش نهاد همت ساز و بعد ازان بتسخیر قندهار پرداز" → first take the *wilayat* of Thatta, then turn to the conquest of Qandahar.
- p. 174: "در آن نواحی وبائے عظیم روے داد"; "سرتابی مردم این ملک" → a great plague broke out in those parts; the rebelliousness of the people of that country; "منصب سه هزاری و جاگیر تهتهه" → the rank of three thousand and the *jagir* of Thatta; "لاهری بندر که از طرف تهتهه واقع است بخالصه شریفه مقرر گشت" → Lahari Bandar, the port on the Thatta side, was made crown land.
- p. 244 "فتح ولایت گجرات و تهتهه و دکن او کرده" → the conquest of Gujarat, Thatta and the Deccan.
- p. 295: "جام بایزید و جام ابراهیم از جام نند حاکم ولایت تهته رنجیده بخدمت سلطان حسین پیوستند" → offended with Jam Nanda, ruler of the *wilayat* of Thatta, they went over to Sultan Husain; "بمیرزا شاه حسین ارغون حاکم تهته" and "از تهته آمده" → to Mirza Shah Husain Arghun, ruler of Thatta, who came up from Thatta.
- p. 105 "میرزا عیسے ترخان بمنصب چهارهزاری ذات و دو هزار سوار و صوبه داری تهتهه سرافرازی یافتند" → received the rank of four thousand *zat* and two thousand horse and the governorship of the *suba* of Thatta.
- p. 49 "قباد خان بموجب فرمان والا بصوبه داری تهتهه قیام ورزید" → stayed behind by imperial order to hold the governorship of Thatta.
- p. 64 "بصوبه داری تهتهه از اصل اضافه بمنصب چهار هزاری و سه هزار سوار سر افراسته گردید" → raised to the governorship of the *suba* of Thatta with an increase to the rank of four thousand and three thousand horse.
- pp. 528–530, the *suba* description: extent and bounds (p. 529), *sarkars*, *mahals*, ports and revenue (pp. 528–529), "درین ولایت سوم بخش از کشاورز به گیرند" → a third share taken from the cultivator (p. 530), mines, quarry, boats "اکثر مدار بر کشتی است" / "از خورد و بزرگ چهل هزار خواهد بود" → most things turn on the boat / there must be forty thousand large and small (p. 530), food, fish, fruits (p. 530), river (p. 529), peoples (p. 529), the liver-eaters (pp. 529–530), "در هر بلاد می باشند و اما در بلاد تهته بیشتر باشند" → found in every land but more in the lands of Thatta (p. 529).
- p. 531 "کچهه ولایتی است جدا گانه ... مغرب رویه سند است" → Kutch is a separate country ... with Sind to its west.
- p. 579 "ازین مملکت جانب شرق بنگاله و سمت جنوب دکن و طرف غرب تهته بدریائے شور اتصال دارد" → this realm adjoins Bengal to the east and the Deccan to the south, and on the west Thatta reaches the salt sea.
- p. 581 "از تصرف اورنگ نشینان دهلی برامده و به هریک ولایت حاکمی جداگانه استقلال یافته بود" → had passed out of the hands of the throne holders of Delhi and each come under an independent ruler.

Schaflechner's Sindhi term "aṣal sindh" given as *asal sindh* ("real Sindh"); Abro's "[in English]" word "secular" given as "in his English word, secular".

## Spelling choices for the composer

Thatta (Boivin prints "Thatha" in a quotation, kept there); Umarkot in Boivin's quoted sentence and "Umerkot" in his p. 40 paraphrase (as the book has them); Amarkot for Bhandari's *sarkar*; Menghwar (Boivin) and Meghvar (Schaflechner) each as its author has it; Shah Abdul Latif / Shah Latif / Bhittai / Bhitai as each source names him (Bhitai inside Mangi's quotation). The composer should pick one spelling for the poet outside quotations.

## Questions for Rauf

1. Bhandari's p. 105 names a Mirza Isa Tarkhan appointed to Thatta under Shah Jahan (1037, uncertain), while p. 171 has Mirza Isa Tarkhan dying in 965. The books do not say whether these are two men; I wrote "a Mirza Isa Tarkhan" at p. 105 and did not identify them. Should the article say the books do not connect them?
2. Do you want the Hinglaj material in Bhandari's *suba* Thatta section mentioned in the Sindh article (the material says the book places Hinglaj there but the Hinglaj row is tagged Balochistan)? I left it out.
3. The Lohana share disagreement (item 3) is mild; keep or drop?


---

## Drafter of part 3

# Sindh, part 3: notes for Rauf and the composer

Part: `entries/places/drafts/sindh.part3.md` (team version, section drafter 3 of 3). Material: the twenty assigned `## From` sections of `entries/places/sources/sindh.sources.md` (Schimmel x3, Abbas, Khalid x3, Kanhaiya Lal, Madho Lal Hussein/Alam, Chishti, Lahori, Kasmani, Werbner and Basu, Eaton, Rozehnal, Rizvi, Kugle, Rafat, Waris Shah/Usborne, Sharib). Checker: `check_place_description.py team sindh --draft-dir /tmp/sindh_part3` exit 0 (209 citations to 20 books, 48 paragraphs); Arabic-in-prose check 0.

No `## Overview` (the composer's). Headings: The Province in History; Saints and Pilgrimage; Communities; Language, Poetry and Music; Shrines and the State; The Province in the Books; Where the Sources Disagree; Bibliography.

## Left out, and why

- Kanhaiya Lal, p. 26, folio 29: "His end at the fort of Sukkur (p. 26, folio 29) is a town statement and is not carried here." The block itself excludes it.
- Kanhaiya Lal, p. 25, folio 20: the fourth territory in "حکومت کیچ و مکران و سوران و سندہ". No gloss is given for سوران and I would not guess its vowels, so the prose says "with one further named territory". Rauf may want it romanised.
- Chishti, p. 805: "غرب رویہ سندہ" and the river uses of سندہ. The block left them out as ambiguous, and so did I.
- Chishti, p. 804: the illegible word before "راستہ سندہ" is stated in plain words ("a word before it being illegible").
- Khalid, *In Search of Shiva*: "**Label-only / toponym uses (not attached):**" the Marri blast near Shikarpur and Mohenjodaro. These are not attached, so left out.
- Khalid, *Walking with Nanak*, p. 306, folio 280: "television news 'covering the floods in Sindh and lower Punjab'". Only a passing mention, so left out.
- Schimmel, *As Through a Veil*, p. 175: the half sentence on "qawwals in the dargah of Gulbarga" (the block says it is not Sind).
- Schimmel, *As Through a Veil*, p. 287: "The Lal Shahbaz/Sehwan detail ('often implored when a woman wants a son') is a site statement". Left out. Only the women's diminutives and the existence of the saint poems are carried. The diminutives themselves ("Piral, Ghauthal [text-layer?]") are not quoted because of the flag.
- Schimmel, *Mystical Dimensions*, p. 358: "the Mogul emperors 'were as fond of him as the simple villagers in Sind and Punjab' (see `punjab`)". This is about Hafiz in the Punjab section and was not carried.
- Schimmel, *Mystical Dimensions*, p. 465: "the longing soul as a woman 'In the province of Sind, as well as in Punjab' (see `punjab`)". The full passage is not in this file, so it was not carried.
- Kasmani, p. 191: "see the Punjab bullet for the full quotation". Only the two fragments given here are carried.
- Rozehnal, p. 241, folio 234: Ansari's *Sufi Saints and State Power* is given in the source as "bibliographic only", so it was not cited.
- Eaton, p. 30: "While Arab rule in Sind was being consis [text-layer?] [word cut off]...". The sentence is damaged, so it was left out.
- Rizvi, p. 152: the printed "Itutmish" [OCR?]. The prose uses Iltutmish as the block reads it.
- Sharib, p. 297: "تذکرہ نویسوں میں اختلاف ہے کہ یہ واقعہ کہاں ہوا". This concerns the place of Sarmad's love episode, not Sindh, so it was left out.
- Abbas, p. 200 and elsewhere: the "Kolhi" / "Kohli" double spelling. Both appear inside quotations exactly as printed.

## Weak material, and how it was treated

- Waris Shah/Usborne, p. 55, note 1 (the Arab historians' Sind bounded by Multan, Jaisalmer and Gujarat): the block flags "weigh accordingly". It is given as the unattributed note's report of the Arab historians' unit, and it says the note "seems to" gloss Ranjha's blessing (p. 54) because the marker match is not confirmed. The uncertain word in the Chach Nameh's transliterated title ("was [text-layer?]") is stated in plain words and not quoted.
- Rozehnal, p. 127 ("Sindhu Desh"): weighted as "weigh accordingly". It is given as Wahid Bakhsh's warning against a slogan, framed as his view and Rozehnal's reading of it.
- Kugle, p. 280 (Imdadullah's flight "through the Punjab and Sindh"): "An itinerary: weigh lightly." One sentence, with the note that no shrine is named.
- Kugle, p. 241 ("toward Sindh", conquest of Thatta): flagged as borderline. It is kept as a sentence on the Mughal conquest that names the town.
- Abbas, p. 50 ("more than a hundred thousand Sufi shrines"): this is unsourced and says "are said to be". The prose writes "without giving a source" and keeps "are said to be".
- Khalid, *In Search of Shiva*, p. 6 (scope exclusion): given as what it is, his statement that Sindh lies outside the book.
- Madho Lal Hussein/Alam, p. 15 ("Sindhis" as a people word): kept, attributed to the translator.
- Kasmani, p. 188, n. 15 (Raja Bharthari): only the naming by the Hindus of Sindh is carried.

## Disagreements listed

1. Gidumal's gift of the saints' dust: Abdali (*Pain and Grace*, p. 25) against Nadir Shah 1739 (*Mystical Dimensions*, p. 427, folio 396). The two books are by the same author.
2. The date of the Arab conquest: 711 (Schimmel, Eaton); 710 advance, conquest "between 711 and 712" (Rizvi); 705 to 715 under Walid, numerals [OCR?], after attacks under Uthman and Ali (Chishti).
3. Whether Sufism came early: Abbas (p. 50) against Rizvi (pp. 127–128), with Schimmel (p. 375).
4. Where the Sassi story belongs: "a story of old Sind" (Usborne's annotator) against "originated in Baluchistan and Sind" (Abbas). This is a weak disagreement and the composer may judge it one of emphasis.
5. The meanings of *sung* inside Abbas (pp. 40, 55, 188, 198). The block says "These three senses are kept as printed".

Considered and not listed as disagreements: Hallaj's journey "shortly after 900" (*As Through a Veil*) against "In 905" (*Mystical Dimensions*), which are compatible. Rizvi's tenth century Isma'ili Mansura and fourteenth century Isma'ili Sumirahs, against Schimmel's "Ismaili missionaries who came to Sind in the 14th and 15th centuries" (*Pain and Grace*, p. 28): not contradictory as stated, but the composer may want to set them side by side. Lindholm's "two Hur rebellions against the British" and Schimmel's *hurr* who supported Ahmad Brelwi against the Sikhs and later fought the British: these agree.

## [OCR?] and damaged readings carried

- Rizvi, p. 209: the citation is copied exactly as the block gives it, `p. 209, folio printed "19]" [OCR?] [191]`. It carries double quotes inside the parentheses. The checker passes it, but it is unlovely. The composer may prefer to keep it (the rule is "copied exactly").
- Chishti, pp. 802–803: the years 705 and 715 ([OCR?] on both) appear in the prose as "both numbers uncertain in the printed text". The commander "Abu al-As[OCR?]" appears as "a commander whose name is uncertain in the printed text".
- Rizvi, p. 127: "Abu Ma''shar¢ [OCR?] Najih" and "Abu'l-'Ata> [OCR?]" appear as Abu Ma'shar Najih and Abu'l-'Ata, "both names imperfectly printed".
- Schimmel, *Pain and Grace*, p. 207: *otaq* (printed "6tdaq" [OCR?]), "its printed form uncertain".
- Schimmel, *Pain and Grace*, p. 235 (the Marui lament, "ts [OCR?] [is]"): paraphrased around the flags. Only "Punhun is no longer in Kech" is quoted, and it has no flag.
- Text-layer readings used: "Abu ʿAli as-Sindi" (printed "Abu CAH"); *taʿziya* (printed "tcfziya"); *sama'* (printed "samcf"); *faqirani*, *hafiza*, the Seven Chaste, *abdal*, Pir Pagaro (all from the block's bracketed readings). No flagged string is quoted.

## Verse

There are no original-script verse paragraphs: none of the assigned material carries Urdu, Persian, Punjabi or Sindhi verse. English verse is quoted from Schimmel's translations of Shah Abdul Latif in *Pain and Grace*:
- p. 259 (Sur Sarang): "My Lord, be kind over dear Sind, / Friend! Sweet darling! You may make the whole world happy!" (quoted with the slash the block prints).
- p. 235 (Mar. Mut. 30): paraphrased because of the [OCR?] flags, with one short quotation.
- Abbas, p. 156: Alan Faqir's recited line "Punnu is not in the Kec / Sind is not the amir". It is set beside the Latif lament without claiming that they are the same verse.

## Non-English prose given in English

- Kanhaiya Lal, p. 24, folio 19: "بادشاہ کیچ مکران و سندہ و ملتان" is given as "king of Kech, Makran, Sindh and Multan".
- Kanhaiya Lal, p. 25, folio 20: "حکومت کیچ و مکران و سوران و سندہ کی وسیع سلطنت" is given as "a wide realm that took in Kech, Makran and Sindh with one further named territory".
- Chishti, p. 802: "گجرات اور سندہ مین" is given as "in Gujarat and Sindh". "سندہ کی دریا" is given as "the river of Sindh". "سندہ کا کچہہ ملک فتح کیا" is given as "conquered some part of the country of Sindh".
- Chishti, pp. 802–803: "سن سات سو پانچ [OCR?] سے الی سن سات سو پندرہ [OCR?] عیسوی ملک سندہ فتح کرکے" is given as "between the years 705 and 715 of the Christian era, both numbers uncertain in the printed text, they conquered the country of Sindh".
- Chishti, p. 804: "تاریخ فرشتہ" is given as *Tarikh-e Firishta*. "[illegible] راستہ سندہ" is given as "the one by way of Sindh, a word before it being illegible".
- Lahori, p. 40, folio 28: "بعد سکونت اوچ کے سلطان حسین میرزا، حاکم سند اور سلطان سکندر لودھی بادشاہ ہند حضرت کے مرید ہوئے" is given as "after Sayyid Muhammad Ghaus settled at Uch, Sultan Husain Mirza, the ruler of Sind, and Sultan Sikandar Lodhi, king of Hind, became his disciples". The editor's "۸۸۷ھ" is given as "887 AH".
- Sharib, p. 297, folio 293: "اس زمانے میں ایران سے سیاح سندھ ہو کر ہندوستان آتے تھے۔ آپ بھی اسی راستے سے آئے۔ جب ٹھٹھہ پہنچے" is given as "in Sarmad's day travellers from Iran came to Hindustan by way of Sindh, and Sarmad came by the same road and reached Thatta". This follows the block's own gloss.

## Bibliography choices

- Kanhaiya Lal: the Source line spells the title *Tarikh-e-Lahore*, but the `## From` heading spells it "Tarikh-e Lahore". The cited title must occur in both, so the item uses *Tarikh-e Lahore*, following the finished Lahore team version.
- Lahori: the Source line gives the editor and publisher in Urdu script (محمد اقبال مجددی, تصوّف فاؤنڈیشن). I romanised them as Muhammad Iqbal Mujaddidi and Tasawwuf Foundation because the mandatory Arabic-script check counts the bibliography list as a prose paragraph. Rauf may want the Urdu kept: the brief allows Urdu titles in bibliography lines, but the drafter's check does not.
- Sharib: the Source line's imprint is self-contradictory. The item gives the colophon's first edition (October 1999), the preface date (4 April 1965, Ajmer Sharif) and Progressive Books, Urdu Bazar, Lahore, from the title page. The two publishers named in the colophon (Chaudhry Ghulam Rasul, Mian Jawad Rasul) are omitted. The composer may add them.
- Schimmel, *Mystical Dimensions* and *As Through a Veil*, Khalid, Kasmani, Werbner and Basu, Rozehnal, Rizvi, Kugle, Abbas, Madho Lal Hussein, Chishti: identical to the Lahore team version's items, so the composer can merge them.

## Questions for Rauf

1. Should the Rizvi p. 209 citation keep the printed folio damage exactly (`folio printed "19]" [OCR?] [191]`), or may a team version cite such a page as `p. 209` alone?
2. Should Lahori's editor and publisher stay in Urdu script in the bibliography? If so, the drafters' Arabic-in-prose check needs to skip the bibliography.
3. How should the fourth territory in Kanhaiya Lal's Yalduz passage (سوران) be romanised, if at all?
