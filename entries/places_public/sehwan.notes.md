V1 English fidelity: PASS (round 2) en:d722b4a8
V2 Urdu fidelity: PASS (round 3) en:d722b4a8 ur:07724de1
V3 Urdu fluency: PASS (round 3) ur:07724de1

# Public description notes: `sehwan` (place article)

Source: entries/places/sehwan.md (team version) only, with its notes entries/places/sehwan.notes.md for which readings are uncertain and for the team's open questions, and data/glossary.csv for the glosses of *dargah* (Sufi shrine complex), *khanqah* (Sufi lodge) and *urs* (the yearly commemoration of a saint's death); every other gloss is a plain dictionary sense. Written by one writer, 31 October 2026, under docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md and docs/prompts/PLACE_DESCRIPTION_BRIEF.md, with peshawar and uch-sharif (team, public, public notes) as the house style. Drafted whole, then reread sentence by sentence against the team version and corrected.

`check_place_description.py public sehwan --english-only`: ok, team 15,187 -> public 7,793 characters of prose (0.51), exit 0. About 1,380 words of prose before the bibliography.

Headings: the team version's, in order, without "Where the Sources Disagree" (the team version has none): Overview; History; The Town and Its Country; Holy Places; Communities; Festivals, Music and Pilgrimage; Sehwan in Books; Bibliography. "The Place in the Books" renamed "Sehwan in Books", as Peshawar's and Uch Sharif's were. The team version has no verse, so the public article has none. The bibliography is the team version's seven items, verbatim, in order (diffed).

Why 0.51: the team version carries 79 citations in about 15,000 characters of prose, so roughly a quarter of it is apparatus. It also tells most facts two or three times (the Overview repeats the body, and "The Place in the Books" repeats it again book by book: the Khanqah-i Muhammadi, the Shiva temple, the Hindus' half of the town, the urs crowds and the women musicians each appear two or three times), and several sentences exist only to carry uncertain readings in plain words (Rawal Bhim and Dalip, Tarkhan, the rockets, the illegible word, Manchur, the year of the interviews), which rule 5 removes. The public article states each fact once in its section and recalls it briefly in the Overview and "Sehwan in Books". Nothing obviously important was cut to reach the length; nothing was padded.

## Consensus choices (rule 4)

The team version lists no disagreement (team notes: "None listed"). The four matters its notes considered are handled so:

- **The Shiva temple and the shrine.** Public, Holy Places: "The shrine of Sehwan Sharif, one of the most important Muslim shrines in Sindh, is held to have once been a Hindu temple dedicated to Lord Shiva." Then, separately: "Before partition the town also had two main Hindu temples of its own. The first was devoted to Shiva and stood in the northeast of the town". Basis: team: Khalid "calls the shrine of Sehwan Sharif 'one of the most important Muslim shrines in Sindh, which was once a Hindu temple dedicated to Lord Shiva'"; Boivin's two temples; team notes: "The article reports both and does not connect them." The public does not connect them either. The converted temple rests on one writer, so it is given as "is held to", less certain than the team's plain attribution, never more; in "Sehwan in Books" it stays attributed ("A modern writer calls its shrine ... once a Hindu temple dedicated to Shiva").
- **How Sehwan came to the Khankhanan.** Team notes: "A fort taken and a province ceded by treaty are different events, not rival accounts." Both kept, in consecutive sentences, as the team orders them: "His army first conquered the fort of Sehwan and then moved on. Mirza Jani Beg made peace and brought the country of Sehwan into the imperial dominions".
- **Siwistan and Sehwan.** One place under two names: "Histories also know the town as Siwistan". Siwistan is used where the team's material uses it (the fort in Dara's flight, the *sarkar*, Shaikh ʿArif, the Khanqah-i Muhammadi).
- **"Small city" against "historic city".** Not a conflict (team notes); both kept: "It is a small city, in contrast to a big one such as Karachi" (team: "He takes Sehwan Sharif as his example of a small city, against Karachi as a big one") and the historic fortress city in History and "Sehwan in Books".
- **Alexander the Great.** Public: "Sehwan is said to be an ancient place, a historic city built within a large fortress from the time of Alexander the Great." Team: "Abbas gives the city an older past still, as 'the historic city built within a large fortress from the time of Alexander the Great'; she gives no other date for the fortress". One writer's description, so "is said to be" rather than the narrator's own voice. Moved from the end of History to its start, since it is the earliest time the article names.
- **The date of Saf Shikan Khan's approach.** Team: "On the twelfth day, of Safar as the narrative runs". Public: "On the twelfth of Safar, as the story runs", keeping the team's hedge on the month.

## Uncertain readings (rule 5), left out

- Bhandari p. 175, Rawal Bhim of Jaisalmer and Dalip son of Rai Rai Singh of Bikaner ("the printed readings of both names are uncertain"): both names, and so the sentence on who joined the Khankhanan, left out.
- Bhandari p. 50, Muhammad Salih's second name Tarkhan ("the reading is uncertain in the printed text"): public "Muhammad Salih".
- Bhandari p. 50, the rockets ("what the uncertain printed text appears to call rockets"): public "musketeers and camel guns, together with diggers and water carriers".
- Bhandari p. 50, the illegible word in "Dara passed Siwistan": the passage itself is kept as the team states it ("Dara got past Siwistan, a place of dread and of mortal danger, and reached Thatta"); only the note on the word goes.
- Bhandari p. 529, the name of the lake, Manchur ("the printed reading of the name is uncertain"): public "a great lake, two days' journey long", unnamed.
- Bhandari p. 529, "dwellings built over it" (team notes, "نشیمنها[OCR?]: rendered 'dwellings'; not hedged in the prose. Please check"): left out; public "Fishermen lived on its waters, mostly by fishing".
- Bhandari p. 529, the comparison with Kashmir, "where land is made on the face of the water" (team notes: "بهر[OCR?] روے اب دل زمین میسازند", question 4): left out, with the Dal question it raises.
- Abbas pp. 214, 217, the February "whose year cannot be read in the printed text": the month is left out with its year; public "drawing on two informants at Sehwan Sharif, one of them a medical doctor".

## Left out, and why

Source apparatus and process talk:
- Every citation, page and folio; every "Boivin writes", "Schaflechner calls", "Rizvi records", "Bhandari judges", "Abbas describes", "Women whom Abbas interviewed told her", "as Schaflechner names him", "Schimmel's account of the place speaks of".
- The team's signpost sentences about the books ("Bhandari's chronicle first brings Sehwan into its story", "The chronicle returns to the fort", "The fullest scene the chronicle sets at Siwistan", "Rizvi names Siwistan twice in his history of the Sufis", "Boivin follows several people of Sehwan through his book"). Where a signpost carried substance it is restated as fact: "Its fort changed hands more than once"; "The fort of Siwistan also stood in the path of Dara's flight to Thatta"; "Siwistan was also a place of flight in another story".
- "He does not name either temple, date it, or say whether it survives" and "Boivin does not describe what he saw" (Bedil's visions): statements about what a book omits; the public says nothing beyond what the team states, and puts the temples in the past tense ("Before partition the town also had").
- "In a note to his second chapter he writes: 'Here, the Thakurs came from Sehwan Sharif'": the team notes say "The block does not say what 'Here' refers to"; its content (the Thakurs came from Sehwan) is already carried by the Thakurs paragraph and by "the origin of the Thakurs" in "Sehwan in Books", so the note itself is left out.
- "The Place in the Books" keeps every book's view, described by its kind, without surnames, as Peshawar does: the Persian chronicle written in Aurangzeb's reign; a modern history of Sufism in India; a study of Islamic mysticism; a study of women's voices in Sufi ritual (from the title *The Female Voice in Sufi Ritual*); a modern writer (Khalid's *Walking with Nanak*, whose bibliography item says nothing of its kind, so it is not described further); a study of the Hindu temple of Hinglaj Devi (from the bibliography's title); a study of the Sindhis in India (from the bibliography's subtitle). "He says nothing of any shrine or saint there" is kept as "with no word of any shrine or saint there". Rizvi's "Siwistan (Sehwan) in Sind" is quoted, as the team quotes it.

Kept, though weak in the team notes (each stated as the team states it, nothing added):
- Schimmel's *malang*s, her fair with its Shawwal dates, the sanctuary of Shiva and the lingam (team question 1): given only as what the team gives, "Sehwan also has its *malangs*, wandering dervishes, and a fair whose dates fall in Shawwal", and in "Sehwan in Books", "A study of Islamic mysticism speaks of its *malangs*, its fair, a sanctuary of Shiva and a lingam". The sanctuary is not placed at the shrine and nothing is added from the lal-shahbaz-qalandar article. The fair is not identified with the *urs*.
- The lake "in these parts" of the province of Thatta, not placed at Sehwan (team notes on p. 529).
- "Writing of a man whose native town it was" (Boivin p. 113): the man is not named in the team version and is left out; "a very reputed centre of Sufi pilgrimage" is kept as the town's description.
- The Shahi Bazar (Boivin p. 125, no context): "the Shahi Bazar in Sehwan figures in his story", which says no more than that it is named in Mulchand's passage.
- A Jalal al-Din, defeated before Lahore (Bhandari p. 399): "A Jalal al-Din", unidentified, as the team has it.
- Bedil, Raj Kumar, Alan Faqir, Nandirani Merani, Mulchand and Paru Chawla: kept by the names the team gives, without "as Schaflechner names him". Alan Faqir's singing and Bedil's visions keep the team's "is reported to" as "is said to".
- "for some time now it has had a Facebook page": kept, as the team gives it.

Left out from the team notes' own list of exclusions: nothing restored (Lakki, the Lakkiyyaris, the Jamshoro material and the index locators are not in the team version, so not in the public).

## Time anchors used

- Event dates the team states: 1932 (Paru Chawla's birth), 1947 (the Hindus' migration), 2010 (the pilgrim at Lahoot la Makan); "the twelfth of Safar" with the team's hedge on the month.
- Bhandari's events are given by reign and person (the Samma rulers, Jam Nizam al-Din known as Jam Nanda, Mirza Shah Beg, the Khankhanan, Dara), without years, as the team gives them. "The Persian chronicle written in Aurangzeb's reign" in "Sehwan in Books": the bibliography item reads "composed in regnal year 40 of Aurangzeb", a firm date.
- Sultan Muhammad bin Tughluq for the Khanqah-i Muhammadi, without a year, as the team gives it.
- No anchor for Abbas's, Boivin's or Schaflechner's reportage beyond the dates they state; the present tense for the panchayat in Bombay ("there is still"), as the team has it.

## Glosses given

*dargah* (a Sufi shrine complex, glossary), *urs* (the yearly commemoration of a saint's death, glossary), *khanqah* (a Sufi lodge, glossary), Sufis (the Muslim mystics), Khankhanan (a title meaning khan of khans), *kos* (an old measure of distance), *faujdar* (military commander), Shaikhu'l-Islam (the chief religious dignitary), *sarkar* (district), Jhulelal (a deity revered by Sindhi Hindus), *panchayat* (a community council), Amil (a member of one of the Hindu communities of Sindh), *malangs* (wandering dervishes), Shawwal (the tenth month of the Islamic calendar), lingam (the emblem under which Shiva is worshipped), Hinglaj Devi (the Hindu goddess, whose temple the bibliography's title names). Each is a definition, never a fact about this place.

## V1 round 1 (watcher 31 October 2026, 05:13Z)

- PASS with notes. Applied notes 1 (referent "them" now "its Hindus"; council wording as the team's), 2 ("an ancient place" dropped), 3 (fishermen "lived there"), listed in `verify/sehwan.V1.r1.changes.txt`. Not applied, taste: note 4 ("whose" after "pilgrimage"), note 5 ("figures in his story"), note 6 (allies of the Khankhanan left out with their uncertain names).
- V1 round 2 (confirming) PASS. Recorded, not applied: "Fishermen ... mostly by fishing" echoes (taste).

## Urdu (watcher 31 October 2026)

- Urdu writer (ratio 0.93). New spellings to check: مرزا ایرج، صف شکن خان، محمد صالح، شیخ عارف، خانقاہِ محمدی، نندی رانی میرانی، پارو چاولہ، لالوانی، شتر نال (camel guns). مخدوم جہانیاں as in the Sindh article. Nandirani Merani's sentence written without gender (the English does not give it). *سرکار* italicised once (ordinary Urdu sense is "government").
- Urdu round 1: V2 PASS (notes only), V3 FAIL (23). The writer applied 27 changes; four V3 fixes were reworded to keep the English facts (1947 "from", not "after"; Dara got past Siwistan, not dread within it; "had a place"; Nandirani Merani kept without gender), ten notes left as taste or as contrary to the English (`verify/sehwan.ur.r1.changes.txt`).
- Urdu round 2 (confirming, `verify/sehwan.C.r2.txt`): V2 PASS, V3 FAIL (1: the shrine sentence of change 16 put a relative clause between commas and echoed the Overview); applied by the coordinator in the verifier's wording (`verify/sehwan.ur.r2.changes.txt`). Recorded, not applied (taste): "یہ" after Hyderabad; "سیہون کے اپنے ملنگ"; "ایک ہاتھ سے دوسرے ہاتھ".
- Urdu round 3 (confirming, `verify/sehwan.C.r3.txt`): PASS both. Done.
