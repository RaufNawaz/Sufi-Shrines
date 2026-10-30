# Karachi team version: notes for Rauf

Written 30 October 2026 under docs/prompts/PLACE_DESCRIPTION_BRIEF.md by a single drafter. The sources file, entries/places/sources/karachi.sources.md, is about 53,800 characters, short enough for one writer, so there are no parts and no composer. Every "## From" section of the sources file was read in full; thirteen of its fourteen books are cited; Rizvi is not (see below).

`check_place_description.py team karachi`: ok, 34,083 characters, 168 citations to 13 books, 51 paragraphs, exit 0. It passed on the first run. After that I reread the whole article against the sources, fixed the sentences listed under "Fixed on reread" below, and ran the checker again: still exit 0.

Dashes: there are no em dashes. The only en dashes are inside page references that the sources print as ranges (for example "pp. 142–143, folio not stated" and "pp. 202–215, folios not stated–198"). They are copied exactly, because the checker matches each reference character for character, and multan.md does the same.

## Headings used

Overview; History; Holy Places; Communities; Custodians, Institutions and the State (the brief's "Shrines, Endowments and the State", renamed because the books record custodians and an order's institutions but no endowments or offerings); Festivals and Practice; Qawwali and Song (the brief's "In Verse", renamed because the material is about Qawwals, recordings and one death in *samaʿ*, and has no verse); The Place in the Books; Where the Sources Disagree; Bibliography. History is one section of about 6,200 characters. The longest section is History, far under the 40,000 limit.

## Left out, and why

- Schimmel, *As Through a Veil*: the remaining Karachi imprints, "Madāḥān ain munājātūṉ" (p. 314, folio 296), "Kalam-i Girhoi" (p. 318, folio 300), Gurbaxshani's "Lunwārīyā jā lāl" (p. 322, folio 304), Hashmi's "Mathnawī maẓhar al-āthār" (p. 323, folio 305), Hoshyarpuri's "Mathnawiyāt-i Hīr Ranjhā" (p. 324, folio 306), Ikram's "Armaghān-i Pāk" (p. 325, folio 307), Qaniʿ's "Maqālāt ash-shuʿarā" (p. 333, folio 315), Rashdi's "Sindhi adab" and "Mehran jufi maujufi" (p. 334, folio 316). These are imprints only. The article gives a representative set framed as the bibliography's (The Place in the Books) rather than all fifteen. The "Row-set divergence kept side by side" paragraph is about how the material was gathered, not about the city, so it is left out.
- Schimmel, *Mystical Dimensions*: "Every other `Karachi` in the book (some forty occurrences ...) is a publisher's imprint city, and the index entry `Karachi, 207` (p. 519, folio 488) is a bare pointer; all were declined". The source declines them, so they are left out.
- Ernst and Lawrence: "the home city of a scholar thanked in the acknowledgements, 'Riyazul Islan (Karachi)'" (p. 15): a bare acknowledgement whose name the text layer prints uncertainly; left out. "The index carries `Karachi 125` (p. 248, folio 239)": an index locator; left out.
- Khalid, *Walking with Nanak*: "'This was my first visit to the city of Karachi' (garbled) (p. 216, folio 190)": the source marks it garbled, and the first draft's "on his first visit" was removed on reread (see below). "A garbled sentence places the shrine of Nanak in a city of 'twenty million people' (p. 222)": only "twenty million people" is kept, given as from a garbled sentence. The "shrine of Nanak" part is left out because the sentence cannot be read. "The 'Pehli Patshah' gurdwara at Ram Bagh is held out": the source holds it out and gives no page, so it is left out.
- Schaflechner: "a spelling example (p. 10, folio not stated)": not about the city; left out. "The index headwords 'Empress Market, Karachi, 292' and 'Aram Bagh, 112' (pp. 344, 340)": locators only; left out. "Karachi sites the book names that have no archive row of their own: ... the Jagnath akhāṛā (Bhimpura), the Ram Bagh / Aram Bagh in Saddar town, the 'local Ram Pir temple' in Narayanpur, and the unnamed Kali temple": no page reference for Bhimpura, Saddar, the Ram Pir temple or the Kali temple, so those are left out. The two *akhāṛā*s are cited from their own page list.
- Boivin: "Further bare occurrences at pp. 56, 57, 62, 66, 67 ... and pp. 94, 103": bare occurrences with no content; left out. "The one Karachi sentence that names a temple is mapped site-specifically to `shri-laxmi-narayan-mandir-native-jetty-bridge`": that sentence is not in this sources file, so it is not available here.
- Kasmani: "'Karachi, the following year' as an acknowledgment dateline (p. 12, folio not stated)": a dateline only; left out.
- Werbner and Basu: "named as a city in the editors' introduction (p. 14, folio 3)": a bare naming; left out.
- Qureshi: "Index: 'Karachi / Yusuf Shah, xv, 13' (p. 284, folio 264)" and "the index has 'Zahin Shah, Baba, xv' (p. 285, folio 265)": index locators, and the pages they point to are cited directly; left out. "AJOO 'Karachi: Alam'; QURESHI 1982 'Karachi: Oxford University Press'; SABRI 'Karachi: 'Abid Book Depot'" (pp. 267, 270, 274; folios 247, 250, 254): imprints. Only Enayatullah's *Karachi Morning News* piece is used, cited to p. 270, folio 250. The combined reference holds a semicolon, which the checker's citation parser would split.
- Rizvi: the whole section. "a 'Karachi' index headword ... but do not give the headword's printed page" (no page, so nothing can be cited) and "Elsewhere Karachi appears only as a publisher's imprint (p. 375, folio 353), which is ... not converted" (the source declines it). Rizvi is therefore not cited and not in the bibliography.
- Abbas: "Kubra's 'No, that is in Karachi—we sing at weddings' (p. 71, folio not stated)": the source gives no context for what "that" is, and the quotation holds a dash; left out rather than guessed at.
- Khalid, *A White Trail*: the parenthesis "(part of the Avari chain of hotels)" on the Beach Luxury Hotel (pp. 142–143) is left out as incidental. Nothing else is left out.
- Kugle: nothing left out.

## Weak material and how I treated it

- **Imprints** (Schimmel ATV, Ernst and Lawrence, Werbner and Basu, Kasmani, Qureshi's Enayatullah): gathered in The Place in the Books and Custodians, Institutions and the State, each framed as a work published in Karachi. No fact about the city rests on them.
- **Legends:** Mai Kolachi is given as the legend Khalid records "as a man he calls Humayun told it to him". The source marks the passage damaged, and the article says so. Liaqat ʿAli Bhatti's vision of his *murshid* at Karachi port is framed as Werbner and Basu's account. Schimmel's alligator miracle is given only as her passing mention.
- **Damaged passages** (Khalid, *Walking with Nanak*, pp. 222, 225, 226): each is marked in plain words ("the printed passage is damaged in places", "In a sentence the printed text leaves garbled").
- **Informants** (Khalid, *A White Trail*): Daria Boatwala, Farah and Raza are introduced as names Khalid gives ("One he calls", "an informant he calls"), because the Source line records that the author's note says informant names were changed. Khalid's own caveat that the comparison of Lahore and Karachi is not his own observation is kept.
- **Rozehnal's "three or four hundred branches"** (p. 154): quoted as an informant's words, with "branches" as printed. The source warns that the word is "branches", not disciples.
- **Rozehnal p. 218 "Disciples generally avoid zikr in Karachi and Pakpattan altogether"**: framed as "Writing of the order's tomb shrines", following the source's own heading, which places the remark at the shrine. The quotation itself does not name the tomb.
- **Rozehnal p. 78, the Islamic Center lectures**: the source's "He" could be Shahidullah Faridi or the senior disciple named just before. The article says "A shaykh of the order". See question 2.
- **Boivin's 2007 note**: it does not name the society, so the article says it does not, and does not identify it with the Theosophical Society.
- **Unnamed shrines** (Abbas's Karachi memorial shrine and the hijṛā shrine of Dehlavi's film; Kasmani's "shrines in Karachi"): kept unnamed, and the article says the book does not name them.
- **Schaflechner's list of roles**: given in the book's own terms ("a place of public slaughter", "the HSM", "the seat of a housing authority"). The source does not explain them, so nothing is added: the article does not expand "HSM" and does not say what was slaughtered.
- **Abbas's Bava Gor sentence**: "In Karachi there is also a memorial shrine" sits in a passage on Bava Gor's journey. The article quotes it whole and says only that it comes in that passage. It does not say that Bava Gor stopped at Karachi.
- **Signpost sentences without a citation** introduce what the cited sentences after them say and add no fact of their own: "The books that speak of Karachi know it first as a port and a great modern city"; "The books also show a city of many faiths"; "Boivin writes of Karachi in the colonial period"; "The port was also a place of departure"; "Partition remade the city"; "The city of the present is large and troubled in these books"; "The books name only a handful of the city's Sufi shrines"; "Khalid went looking for the city's Hindu temples"; "The Parsis are the other community the books follow"; "The books say little of the state and religious property in Karachi"; "The Chishti order's week in Karachi has a fixed shape"; "Karachi is also a city pilgrims set out from"; "The city recorded the music as well as hearing it"; "Each author sees a different Karachi".

## Fixed on reread (after the first checker pass)

- In the Overview, "Khalid visits Hindu temples at Clifton ..." became "sought out ... at Clifton, where his visit was aborted". The source says the Clifton visit was aborted.
- "on his first visit" was removed from the Overview, History and The Place in the Books, because it rests on the sentence the source marks garbled (p. 216).
- "a memorial shrine of Bava Gor" was reworded so it does not name Bava Gor as the shrine's saint (see above). "The Sidis keep another site in the city" was removed.
- "The state appears in these books in what it renames, builds and guards" became "The books say little of the state and religious property in Karachi". The source does not say who renamed Ram Bagh or who built the Port Grand mosque.
- Schimmel's Urdu title for Abdul Haqq's book is now given as printed. My first draft had glossed it in English, and that gloss was my own translation.
- "a community still large enough to supply the rest of the country", "the Hindus of the Punjab", "held each April", "his companion Sadia", "The Parsis keep their prayers at the Fire Temple" and "the two great urban centres of Qawwali" were all corrected to what the passage says. "at the Fire Temple" now covers only the Navroz morning prayer, and Qureshi's phrase "two important urban centres of Sufism" is quoted.
- Pronouns for Omar Kasmani are avoided. The sources give none.

## Where the Sources Disagree (as in the article)

1. The temple at Clifton and Guru Nanak. Later Sikh writers, as Khalid reports, identify Nanak's sea god temple with the temple at Clifton, and Khalid objects that it was "on the mainland" (p. 229). On p. 224, folio 198, he writes that, along with the temple at Clifton, the Ram Bagh temple must have been a historical Hindu temple in Nanak's time.
2. The age of the Ram Bagh temple. The old man said one hundred and fifty years (p. 223, folio 197). The officer said he did not know, only that it existed before Partition (pp. 223–224, folios 197–198).
3. When Zauqi Shah came to Karachi. Ernst and Lawrence say he "finally moved to Karachi" and was therefore at the 1907 Muslim League meeting (p. 96, folio 82), and also that he settled there soon after the birth of Pakistan (p. 140, folio 127). Rozehnal says he attended the 1907 meeting (p. 108, folio 99).
4. The distance to Hinglaj. Khalid gives about two hundred and fifty kilometres from Karachi (*A White Trail*, p. 32). Schaflechner gives the road route from Narayanpur as about 240 kilometres (p. 158). These may measure different things, so they are listed side by side without a verdict.

Not listed as disagreements:
- The spellings Mango Pir (Schimmel), Mangho Pir (Boivin) and Manghopir (Abbas). The prose notes all three.
- Daria Boatwala calling Karachi both "a much more happening city" and "really a desert". These are one informant's words, and the second has no context.

## Uncertain readings ([OCR?] and text layer), carried as plain words

No [OCR?] token appears in the prose, and there is no verse paragraph. Readings the article uses:
- "Justice Kayan [OCR?] [Kayani] Road" (Khalid, *Walking with Nanak*, p. 222) is given as "a road whose printed name, Justice Kayani Road, is uncertain".
- "Raw Prag [OCR?] [Ram Bagh]" (same page) is given as Ram Bagh, the source's bracketed reading, which the name Aram Bagh in the same sentence supports.
- "religions [OCR?] [religious] connotation" (same page) is paraphrased, without quotation marks, as "religious connotation".
- "Bahaudd in Qutubuddin `[text-layer?: Bahauddin Qutubuddin]`" (Qureshi, p. 281) is given as Bahauddin Qutubuddin.
- Schimmel's imprint titles are given in the source's bracketed text-layer readings (*Urdū kī nashw a namā meṉ ṣūfiyā-i kirām kā kām*, *Burhānpur ke Sindhī auliyā*, *Sirr-i dilbarān*), with author names from the same readings: Abdul Haqq, Muhammad Aslah, Husamuddin Rashdi, Dhauqi. *Tadhkirat-i shucara-i Kashmir* is kept as the source prints it, with "c" for the ʿayn.
- None of the cited page references carries [OCR?].

## Verse quoted

None. The Karachi material carries no verse in any script, so there is no verse paragraph and no italic rendering. The nearest thing is Qureshi's report that Sufi Abdul Karim Sumar died at Baba Ahmad Shah's ʿurs "during the recital of a verse by Jami". The book does not give the verse.

## Urdu, Persian or Sindhi prose given in English

None was needed. The Karachi material is entirely in English. The only non-English words are romanised titles and terms (*halqa*, *dars*, *akhāṛā*, *murid*, *murshid*, *khutba*, *qadimi ʿalam*), kept in italics as the sources use them.

## Questions for Rauf

1. **Mahfil-i Dhauqiyya and Mahfil-i Zauqiyya.** Schimmel's bibliography cites a 1968 Karachi edition of *Sirr-i dilbarān* by "Hazrat Shah Sayyid Muhammad Dhauqi", published by the "Mahfil-i dhauqiyya" (p. 319, folio 301). Rozehnal's Mahfil-i Zauqiyya publishes Muhammad Zauqi Shah's Urdu works in Karachi (p. 130, folio 121). They look like two romanisations of one name and one publisher, but neither book says so, and the article does not join them. May the public version say they are the same?
2. **Who lectured at the Islamic Center?** Rozehnal p. 78, folio 68 reads "He also met regularly with a group of foreign students at a large Islamic Center in Karachi". In the source the nearest antecedent is the senior disciple who runs the Mahfil, but the page sits in Rozehnal's account of Shahidullah Faridi (p. 76 is his move to Karachi). The article says "A shaykh of the order". Should it name Shahidullah Faridi?
3. **Sites with no row.** The books describe several Karachi sites that the site's place vocabulary does not hold: the shrine of Sheikh Yusuf Shah (Qureshi, with its sajjadanashin Baba Zahin Shah Taji), Shahidullah Faridi's tomb complex (Rozehnal), Baba Ahmad Shah's shrine (Qureshi), the Sidi memorial shrine (Abbas), the Nagnath and Jagnath *akhāṛā*s (Schaflechner), the Ram Bagh temple, and the Port Grand temple with its mural of Jhule Lal (Khalid). The sources say none of Khalid's temples is identified with an existing row. Do you want rows for any of them? In particular, is the Port Grand temple one of the existing Karachi temple rows?
4. **The Qawwal lists.** The team version keeps Qureshi's names of Karachi Qawwals, recording parties and consultants in full, because they are the city's musicians as the book records them. The public version will need to shorten them. Is a few names with "and others" acceptable there?
