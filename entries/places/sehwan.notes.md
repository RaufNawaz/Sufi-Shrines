# Sehwan team version: notes for Rauf

Written 31 October 2026 under docs/prompts/PLACE_DESCRIPTION_BRIEF.md by a single drafter. The sources file, entries/places/sources/sehwan.sources.md, is about 24,000 characters, short enough for one writer, so there are no parts and no composer. Every "## From" section was read in full. Seven of the eight books are cited; Schimmel's *As Through a Veil* is not (its only material is an index headword).

`check_place_description.py team sehwan`: ok, 16,412 characters, 79 citations to 7 books, 35 paragraphs, exit 0.

Dashes: no em dash, and no en dash in any prose (checked by script with citations removed). En dashes remain only inside page ranges the sources print that way: `pp. 56–57, folios not stated` (Abbas), `pp. 179–180, folios 166–167` (Boivin), `pp. 160–161, folios not stated` (Schaflechner). The hyphens in the prose are in names and terms only (Khanqah-i Muhammadi, Makhdum-i Jahaniyan, Shaikhu'l-Islam, Jalal al-Din, *Khulasat al-Tawarikh*) and in Boivin's quoted "north-eastern" and "north-western".

No prose paragraph holds Arabic script. There is no verse paragraph.

## Headings used

Overview; History; The Town and Its Country (Bhandari's river, *sarkar*, distances and the lake, Schaflechner's mountains, Boivin's dialect and "small city": the brief has no heading for a place's country, and Peshawar set the precedent with "The City and Its Country"); Holy Places; Communities; Festivals, Music and Pilgrimage; The Place in the Books; Bibliography.

Not used: "A City of Saints" (only one saint, Lal Shahbaz Qalandar, is tied to the town, and only as Schaflechner's "dargāh town"); "Shrines, Endowments and the State" (the only endowment is Rizvi's villages attached to the Khanqah-i Muhammadi, which sits in History and Holy Places); "In Verse" (no verse in any script); "Where the Sources Disagree" (no real disagreement; see below).

## Left out, and why

- Schimmel, *As Through a Veil*: "`Sehwan` stands as its own headword (p. 361, folio 343)" and the "Form discrepancy ... 'Sehwan Sharif' in `location_short`". The block itself says "INDEX HEADWORD ONLY". Left out; the book is not cited and has no bibliography item.
- Schimmel, *Mystical Dimensions of Islam*: "The index's bare `Sehwan, 355` (p. 525, folio 494) and the glossed `Mdlang (dervish at the sanctuary in Sehwan), 355` (p. 536, folio 505) were both declined". Index locators, left out.
- Schimmel, *Mystical Dimensions of Islam*: "Footnote 14 on the same page carries Schimmel's assessment of Peter Mayne's `Saints of Sind` (p. 386, folio 355)". The assessment itself is not in the sources file (it is "quoted under lal-shahbaz-qalandar"), and it is about a book, not the place. Left out.
- Schaflechner: "the index headword `Sehwan, 97, 104, 148–149` (p. 359, folio not stated)". Locator, left out.
- Schaflechner: "`shrine-of-lakhi-shah-saddar` takes the id at place level only: its `location_short` reads 'Laki (Lakhi), near Sehwan Sharif'". About the archive, not the book. Left out.
- Boivin, "Place-level material: Lakki": "the 'Sukkur riots' occurred beyond the city ... in Lakki" (p. 61, folio 48) and "Indexed 'Lakki 48'". Lakki is not Sehwan, and the only thing tying Lakki to Sehwan is the archive's own location field, not the book. Left out (question 2).
- Boivin: "'Lakkiyyaris 168' and 'Lakkiyyari, Gul Muhammad 170' (pp. 244–245, folios 231–232) — a Sehwan Sayyid family". Index entries, and the identification "a Sehwan Sayyid family" is stated in the block without a quotation from the book's text. Left out (question 3).
- Boivin: "two clauses naming no saint at pp. 210, 211 (folios 197, 198)". The block does not say what they say. Left out. (The separate p. 210 note, "Here, the Thakurs came from Sehwan Sharif.", is used.)
- Boivin, "Place-level material: the Jamshoro district": "said of Thano Bula Khan, not of Sehwan". Left out.
- Abbas, Jamshoro: "named only as the seat of Sind University and the Institute of Sindhology (pp. 20, 23, 64–69, ...)". Not about Sehwan; the link to Jamshoro District is the archive's location field. Left out.
- Rizvi: "Index: 'Sehwan, 153, 277, 306' and 'Siwistan, 153, 277' (pp. 484, 486; folios 460, 462)". Locators. The index lists a third Sehwan page (folio 306) whose content the sources do not give; left out.
- Bhandari: the attachment line "Campaign and transit mentions (brief item 2) and the suba Thatta description; nothing is said of Lal Shahbaz or of any shrine or saint at Sehwan/Siwistan". A remark about the material. Its substance is used once, uncited, in The Place in the Books: "He says nothing of any shrine or saint there."
- Every "Attached to N row(s)" line and every row id: about the archive.

## Weak material and how I treated it

- **Schimmel, *Mystical Dimensions of Islam*, p. 386, folio 355.** The sources file does not hold Schimmel's words: it says only that "The place-level material is the *malang* sentence, the 'fair' with its Shawwal dates, and the Shiva-sanctuary and lingam sentences — all quoted in full under **lal-shahbaz-qalandar**". So the article can only say that her account speaks of the *malang*s, of a fair whose dates she gives in Shawwal, and of a sanctuary of Shiva and a lingam. It does not say what she says about them, nor that the sanctuary was at the shrine. The public writer should not expand this from the shrine article (question 1).
- **Bhandari's campaign and transit mentions** (pp. 172, 175, 174, 50, 399), which the block marks "campaign mention", "campaign / office mention" and "passing mention". They are the chronicle's whole record of the place, so they go into History as events at the fort, with nothing added. The p. 399 line (Jalal al-Din's flight "toward Sind and Siwistan") is given explicitly as "one passing line". Bhandari does not say which Jalal al-Din, and the article does not either.
- **Bhandari p. 510, "directional mention"**: the Indus entering Thatta by way of Siwistan, given as geography.
- **Bhandari p. 525**: Siwistan as one end of the province of Multan's length, given as what it is.
- **Bhandari p. 529, the lake.** The block puts "درین حدود" ("in these parts") right after the Siwistan *sarkar* sentence in the description of suba Thatta. The article says "in these parts" and "in the same description", and does not say the lake is at Sehwan.
- **Boivin p. 113**: "his native town of Sehwan Sharif". The block does not say whose native town. The article says "Writing of a man whose native town it was".
- **Boivin p. 97**: Bedil's visions. The block notes that "what he saw is not described"; the article says so.
- **Boivin p. 125**: "the Shahi Bazar in Sehwan" has no context in the block. The article only says Boivin names it in the same passage as Mulchand.
- **Boivin p. 210, folio 197, Ch. 2 n. 6**: "Here, the Thakurs came from Sehwan Sharif." The block does not say what "Here" refers to. The article quotes the sentence and calls it a note to his second chapter. The citation carries "Ch. 2 n. 6" because the block gives the reference that way.
- **Abbas's two interviews (pp. 214, 217, folios not stated)**, with "both years destroyed". Stated as what they are in The Place in the Books: two informants interviewed at Sehwan Sharif "in a February whose year cannot be read in the printed text, one of them a medical doctor". The informants' names (Asif, Muhammad; Saeeda, Asif) are not given in the article.
- **Abbas's fortress "from the time of Alexander the Great"**: kept as her phrase, with the block's remark "No date for the fortress beyond" carried as "she gives no other date for the fortress".
- **Schaflechner's four mentions** (pp. 107, 113, 147, 160–161): each is a single clause in the block. Given as what they are.
- **Uncited signpost sentences** (body only, never the Overview): "Bhandari's chronicle first brings Sehwan into its story under the Samma rulers"; "The chronicle returns to the fort in the Khankhanan's campaign against Thatta"; "The fullest scene the chronicle sets at Siwistan is Dara's flight to Thatta"; "Rizvi names Siwistan twice in his history of the Sufis"; "Bhandari places Siwistan on the river"; "The town also had Hindu temples of its own"; "Among them were the Thakurs"; "Boivin follows several people of Sehwan through his book"; "Abbas describes the city at the time of the *urs*"; "Sehwan is both a goal and a starting point of journeys"; "The books see Sehwan from very different distances"; "The modern writers see a town of pilgrimage"; "He says nothing of any shrine or saint there".

## Disagreements

None listed, so the article has no "## Where the Sources Disagree". Considered and not listed:

- **The Shiva temple.** Khalid says the shrine of Sehwan Sharif "was once a Hindu temple dedicated to Lord Shiva" (p. 32, folio 14). Boivin says that before partition the town had a Shiva temple in its north-eastern part (pp. 179–180, folios 166–167). The two do not conflict (a converted temple and a separate standing one can both be true), and Boivin does not say where the shrine stands. The article reports both and does not connect them.
- **How Sehwan came to the Khankhanan.** Bhandari has the army conquer the fort of Sehwan first (p. 175) and Mirza Jani Beg make peace and bring the country of Sehwan into the imperial dominions (p. 174). A fort taken and a province ceded by treaty are different events, not rival accounts.
- **Siwistan and Sehwan.** Rizvi writes "Siwistan (Sehwan)"; Bhandari uses both سیوستان and سهوان. The same place under two names, not a disagreement. The Overview says the histories know it also as Siwistan.
- **"Small city" against "historic city".** Boivin's small city (p. 67) and Abbas's historic, heavily populated city (pp. 56–57, p. 56) describe different things.

## [OCR?] and illegible readings, carried in plain words

No [OCR?] appears in the prose or in any cited page reference.

- Bhandari p. 175, "راول[OCR?] بهیم" and "دلیپ[OCR?]": "though the printed readings of both names are uncertain".
- Bhandari p. 50, "محمد صالح ترخان[OCR?]": "whose second name reads Tarkhan though the reading is uncertain in the printed text".
- Bhandari p. 50, "بان[OCR?]": "what the uncertain printed text appears to call rockets".
- Bhandari p. 50, "جاےے[OCR?]" and "سے[OCR?]" in the battery sentence: rendered as "at a spot where the river was narrower"; the uncertain letters do not change the sense, so no hedge was added.
- Bhandari p. 50, "از [illegible] سیوستان": "one word of the passage cannot be read in the printed text".
- Bhandari p. 529, "منچور[OCR?]": "which people call Manchur, though the printed reading of the name is uncertain".
- Bhandari p. 529, "نشیمنها[OCR?]": rendered "dwellings"; not hedged in the prose. Please check.
- Bhandari p. 529, "بهر[OCR?] روے اب دل زمین میسازند": rendered "where land is made on the face of the water". See question 4.

## Verse quoted

None. The Sehwan material carries no verse in any script.

## Persian prose given in English (my renderings; the block glosses none of these lines unless stated)

- p. 172, "جام نظام الدین که بجام نندا مشهور است": "Jam Nizam al-Din, known as Jam Nanda".
- p. 172, "میرزا شاه بیگ حاکم قندهار": "Mirza Shah Beg, the ruler of Qandahar"; "و بعد ازان قلعه سهوان را نیز گرفته بقندهار معاودت کرد": "and after that he took the fort of Sehwan as well and went back to Qandahar". The sending of Mirza Isa Tarkhan and the taking of Bhakkar follow the block's English.
- p. 175, "راول بهیم مرزبان ولایت جیسلمیر": "Rawal Bhim, lord of the land of Jaisalmer"; "دلیپ پسر رائے راے سنگه بیکانیر": "Dalip, son of Rai Rai Singh of Bikaner"; "اولا قلعه سهوان را مفتوح نموده روانه پیشتر شدند": "the army first conquered the fort of Sehwan and then moved on".
- p. 174, "صلح در میان آورده ولایت سهوان داخل ممالک محروسه نموده": "made peace and brought the country of Sehwan into the imperial dominions". *Mamalik-i mahrusa* (the protected dominions) is given as "the imperial dominions".
- p. 50, "سیزده کروسے سیوستان": "thirteen *kos* from Siwistan"; "محمد صالح ... فوجدار و قلعه دار سیوستان": "the *faujdar* and keeper of the fort of Siwistan"; "پنج کروسے قلعه": "within five *kos* of the fort".
- p. 50, "برق انداز و بان و شترنال": "musketeers, camel guns and ... rockets"; beldars and water carriers follow the block's English ("beldars and water-carriers"), written "diggers and water carriers".
- p. 50, "نزدیک قلعه جاےے که عرض دریا سے کمتر بوده باشد": "near the fort at a spot where the river was narrower".
- p. 50, "لیکن ازجهت مسافت بعید کارگر نشد": "but the distance was too great for them to do any harm"; "کشتیها بے ممانعت از طرف قلعه عبور نمود": "the boats passed the fort unhindered".
- p. 50, "محمد صالح توفیق خدمت گذاری نیافت": "Muhammad Salih failed in his service" (literally, did not find the grace of service); the rest follows the block's English.
- p. 50, "از [illegible] سیوستان که محل بیم و مکان هلاکت بود": "Dara passed Siwistan, which the chronicle calls a place of dread and of mortal danger".
- p. 399, "بطرف سند وسیوستان بدر رفت": "escaped toward Sind and Siwistan".
- p. 510, "براه ولایت سیوستان بمحال تهتهه می دراید": "enters the districts of Thatta by way of the country of Siwistan".
- p. 525, "از فیروزپور تا سیوستان چهارصد کروه": "four hundred *kos* from Firozpur to Siwistan".
- p. 529, "سرکار سیوستان تابع این صوبه است برکنار دریائے سند": "The *sarkar* of Siwistan ... on the bank of the river Sind, is one of the four *sarkars* of the province of Thatta" (the "four sarkars" is the block's English).
- p. 529, "درین حدود کولابی است بزرگ دو روزه راه دراز و ان را منچور خوانند": "a great lake in these parts, two days' journey long, which people call Manchur".

## Questions for Rauf

1. **Schimmel's Sehwan sentences (p. 386, folio 355).** The sources file names them (the *malang*s, the fair with its Shawwal dates, the Shiva sanctuary and the lingam) but does not quote them, because the quotations sit in the lal-shahbaz-qalandar entry. The article therefore says only what they are about. Should build_place_sources.py carry the quoted sentences into the place file, so that the Sehwan article can quote them? Until then the public article can say no more than the team version does.
2. **Lakki (Boivin p. 61, folio 48: the "Sukkur riots" reached "in Lakki").** Left out because no book places Lakki near Sehwan; only the archive's location field does. Should a sentence on Lakki go in, framed as the archive's location?
3. **The Lakkiyyaris (Boivin's index, pp. 244–245, folios 231–232),** called "a Sehwan Sayyid family" in the source block, though the quotation from the book is only an index entry. If the body text at folios 168 and 170 says they are of Sehwan, they belong in Communities. Should someone read those pages?
4. **Bhandari p. 529, "بهر[OCR?] روے اب دل زمین میسازند".** "اب دل" may be "the water of the Dal", Kashmir's lake, which would make the comparison "in Kashmir they make land on the waters of the Dal". The article keeps the safer "on the face of the water". May the public version name the Dal?
5. **The three en dashes inside page ranges** (`pp. 56–57`, `pp. 179–180, folios 166–167`, `pp. 160–161`). Kept, as in Peshawar, Uch Sharif and the other places, because the checker needs the exact range.
