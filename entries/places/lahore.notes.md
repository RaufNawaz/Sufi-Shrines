# Lahore team version: notes for Rauf

Written 30 October 2026 under docs/prompts/PLACE_DESCRIPTION_BRIEF.md (the pilot). Five section drafters each drafted a cited part from different books (entries/places/drafts/lahore.part1.md to part5.md, with their notes), four composers merged the parts heading by heading (entries/places/drafts/lahore.composed_A.md to _D.md), the English only rule of 18 October 2026 was applied to the two composed files that still quoted Urdu in prose (their logs: entries/places/drafts/lahore.urduout_A.txt and _D.txt list every quotation removed and the English given, for checking), and a last writer added the Overview and the merged Where the Sources Disagree.

`check_place_description.py team lahore`: ok, 333,148 characters, 1,668 citations to 21 books, 308 paragraphs. Every citation's page reference is proved against entries/places/sources/lahore.sources.md by the checker; every Arabic script run of three or more words and every English quotation of six or more words is verbatim in the sources.

## Questions for Rauf from the drafting

1. **En dashes inside cited page ranges** (pp. 524–525) are kept, as in the shrine team articles, because page references are copied exactly. None in the prose.
2. **English paraphrase of Urdu prose.** About 190 Urdu and Persian prose quotations (Lal, Bhandari, Chishti) are now English paraphrase under the 18 October rule. Where the book gave no gloss, the sense is the drafter's reading; the urduout logs and the composers' reports list those for checking against the sources.
3. **Lahore as a place of publication.** Most modern scholars mention Lahore only as an imprint; that was left out (part 5 notes).
4. **Kasmani's unnamed terror attack**, not linked to Data Darbar because the book does not name the shrine (part 5 notes).
5. **Bhandari's Shah Abu al-Maali** kept unlinked from Darbar Abul Muali Qadri (part 4 notes).
6. **The *In Search of Shiva* passing observations** the source marks "weigh accordingly" are kept, framed as Khalid's own (part 4 notes).
7. **Ernst and Lawrence on the Jama'at-i-Islami in 1939** left out: its page reference spans 18 pages and quotes nothing (part 5 notes).

The parts' own notes follow, verbatim.

---

# Part 1 notes

# Lahore, part 1: notes for Rauf and the composer

Material: `entries/places/sources/lahore.sources.md`, lines 1481 to 1659, the "Cross-cutting material" whole-book section from Kanhaiya Lal's *Tarikh-e Lahore*: custodianship; endowment and *waqf*; offerings, *nazr*, stipends and levies; the state and religious property. Part: `entries/places/drafts/lahore.part1.md`, 103,224 characters, 456 citations, all to one book. Checker (`check_place_description.py team lahore --draft-dir /tmp/part1`) exits 0.

## Headings used, and why

- `## History`: eighteenth century ransom and self defence; the emptied outer settlements and brick robbing; the Sikh period's use of mosques and tombs as magazines; the two explosions; the Badshahi Masjid under siege; the Mian Wadda khanqah battle; the half mile belt; the stripping of marble and its transfer to Amritsar; the British remaking of the walls and gates.
- `## Communities`: the custodial vocabulary across traditions; shared rites; buildings passing between communities; the Wahhabi held mosque; caste run *ʿurs*; the Kuka dharamsal.
- `## Shrines, Endowments and the State`: custodianship, payment, succession, alienation, contested possession, faqirs on premises, endowment and *waqf* (40,349 characters).
- `## The Religious Economy` and `## Religious Property and the Colonial State`: **renamed headings**. Both belong under the brief's "Shrines, Endowments and the State", but that one section would have run past the checker's 45,000 character cap (F6), so I split it. The composer may merge and re-split as it likes.
- `## Festivals and Practice`, `## The Place in the Books`, `## Where the Sources Disagree`, `## Bibliography`.
- No `## Overview` (the composer's), no `## A City of Saints` (this material is about property, not the landscape of saints), no `## In Verse` (the assignment carries no verse).

Some facts appear under two headings on purpose (the Shah Dargahi well rite, the Qizilbash Muharram, Mian Mir's melas, the Fazl Shah *ʿurs*, the Badshahi Masjid *darbar*), once as economy or custody and once as practice or as the author's stance. The composer should keep one telling and drop the other.

## Left out, and why

- "In the front matter the only possible custodianship word is itself doubtful: the contents carry "ذکر سجادہ و مقابر و منادر بیرون لاہور[OCR?]"..." (p. 3, folio 2): a table of contents heading, whole entry flagged, reading open. A locator only; left out.
- "**No Auqaf department appears anywhere in pp. 1–118**: (not stated)." A statement about the coverage of one range, not about the city; and the Auqaf department is a later institution. Left out.
- "...set out in full in the source partial under the per-site entry, not reproduced here." (Sunehri Masjid, pp. 147–148): the full Akali, *mochalka*, *nazul* and Egerton sequence is not in my assignment, so the article gives only the one sentence the section gives.
- "Under British officials the same instrument is used three times in one chunk" is kept, but reworded "within a few pages", since "chunk" is a process word.
- The closing references "see the closing register", "see the last section", "see the fiscal sequence below" and "referred to Doubts in the source partial" are internal cross references and are not reproduced. The Executive Engineer repairs that "the last section" holds are outside my lines; I give only what my section states (Shalamar's grant, and the Badshahi Masjid petition).
- Rani Gul Begum's twelve hundred rupees monthly and Bakhshi Bhagat Ram's twelve hundred rupee life pension: the source notes the identical figure "in the opposite case". It is a coincidence of figures, not a disagreement, so it is not in Where the Sources Disagree.
- The Pari Mahal, Nawab Mian Khan's garden and other *nazul* sites, and Shah Sharaf, Bibi Pak Daman, Data Ganj Bakhsh, Mian Mir, Jahangir's tomb and the Badshahi Masjid are named as the source names them, briefly, as examples of the city's pattern; no site's own history is retold.

## Weak material and how I treated it

- **Oral testimony**: Bahadur Khan's marble grave rests only on what old people say ("مسن [OCR?] لوگ بیان کرتے"); the article says so.
- **Legend or karamat**: the vow of bread at a grave is given as a *karamat* current in Lal's time, the number of loaves and the recipients illegible.
- **Damaged passages**: the Chief Pandit's office ranked against an honorary magistracy (p. 134) is called damaged; the clause about a price or sale of the Suthra house (p. 203) is said to be unreadable; the money figures at the Haqiqat Rai *samadh* (p. 209), the English period span of brick robbing (p. 33), the year of the *ifta farman* (p. 52), Munshi Najm-ud-Din's spending (p. 287) are said to be illegible.
- **The author's own framing**: the "Sikh loss, English restitution" pattern, his vouching for the state's fairness at the tank acquisition (p. 38), and his petition in print for the Badshahi Masjid are all framed as his under The Place in the Books, never as fact.
- **Unnamed and undated**: the three rulers who appointed Bawa Parsotam Das; the mosques Nawab Abdul Majid Khan built; the Muhammad Sultan *waqf*'s area and revenue. Stated as not given.

## Disagreements carried into the article

1. Akbar's grant to Mauj Darya Bukhari: two lakh (p. 79) against one lakh twenty five thousand (p. 279).
2. Shah Dargahi's well: the zamindar takes rotis and a paisa (p. 82) against rotis given to the people and a paisa to the zamindars (p. 299).
3. Shah Sharaf's reburial: through Faqir Aziz-ud-Din (pp. 80–81) against Faqir Nur-ud-Din, with Khwaja Muhammad Saeed's tomb and mosque the ones demolished (pp. 287–288).
4. Major MacGregor: Deputy Commissioner (p. 143) against Assistant Agent to the Resident (pp. 300–301).
5. Mr Cope and the Dai Anga mosque: "کچہی" against "کوٹہی", and the name flagged in one passage (p. 168 / p. 268, cited jointly as the source cites them). I did not gloss "کچہی", since it may be a *kachahri* or a misprint of "کوٹہی".
6. Nawab Mian Khan's tomb garden: ownerless and taken by Suchet Singh (p. 272) against confiscated by Ranjit Singh and given to him (p. 329).
7. The Dehona Das *mahant*: grandson or chela (p. 443), the book's own alternative.
8. Hassu Teli's six *bighas*: "و گزارہ ہر سال ہے" (p. 169) against "و اگزار ہے" (p. 269).
9. The doubled pagination of Mufti Ghulam Sarwar's purchase and Daya Anga's endowment (p. 167 and p. 267).
10. "رکھہ چلو[OCR?]" against "رکہہ جلو[OCR?]": one *rakh* or two.
11. Nur Jahan's physician: parts that do not add to the flagged total of twenty two lakh (p. 160).
12. The Wazir Khan *hammam* "counted among the mosque's اوقات" (p. 15) against the *hammam* now government property (p. 158).

## Uncertain readings carried

Every `[OCR?]` and `[illegible]` inside a quotation is carried as printed. In English prose, names flagged in the source keep `[OCR?]` on the name (Balak Nath, Ganita Nand Gar, Bir Sidh Nath, Jiwan Das, Madho Das Bairagi, Bawa Ram Das Bairagi, Bawa Chandi Nath Jogi, Moti Bairagi, Gauhar Singh, Nawab Ghazni, General Gulab Singh Powindia, Kahiya *lambardar*, Colonel Gulab Singh Kabh Kabh, Mr Samhur, Captain Nisbet, Dev Yadatta, Pandit Sardha Ram Phaluri, Kanu, Ishri Prashad, Hamri Gyan Mandir, Kalka Galla, Masjid Bazar Bi, Masjid Chinian Wali, Shah Kanhh, Khanqah Mian Wadda, Badhu-wala well, Devi Dial, Sahib Lahori, Maharaja Dalip Singh, Bhai Wasti Ram, Qandahar, Batala at p. 279), and so do flagged figures (a hundred rupees at p. 212; a hundred shops at the Baoli; eight and ten *ghumaon*; twelve *ghumaon*; five hundred rupees at p. 161; eleven slave girls; thirty two years; twenty years at Ichhra; "endowed" at p. 162; "preceptor" at p. 353; "confectioners'" at pp. 135–136; "Superintendent of Lahore" at p. 303). Flagged years are given in plain words: 1856 (p. 84), 1850 (p. 96 and p. 143), Sambat 1880 (p. 231), 1876 (p. 68), 1247 (p. 293), 1274 (p. 247), 1234 and 1289 (p. 163). Sambat 1895 (p. 276) and Sambat 1910 (p. 445) are unflagged in the source and given as printed. The bazaar name at Pandit Bishnath's shops and the first part of Pandit Nath's name (p. 450) are given as uncertain, not transliterated.

## Verse

None. The assigned lines hold no verse, chronogram text or inscription; Rani Gul Begum's chronogram is a numeral only, "۱۲۴۷[OCR?]", given as such.

## Questions for Rauf

1. **En dashes in citations.** The page references the source gives as ranges ("pp. 276–277, folios 279–280") carry an en dash, and the checker requires the reference exactly. I kept them inside citations only, as the shrine articles do; there is no dash in the prose. Is that acceptable under the no dash rule, or should the public version alone carry the rule?
2. **The title form.** The citations and the bibliography use *Tarikh-e Lahore*, the `## From` heading's form; the *Source:* line prints *Tarikh-e-Lahore*. The bibliography item otherwise copies the Source line ("Kanhaiya Lal Hindi", "1884 original", the DLI scan number). The Source line also says the manifest records the author as "to confirm"; that caveat is not in the item.
3. **Heading split.** "Shrines, Endowments and the State" would exceed the 45,000 character cap as one section, so this part splits it three ways. Do you prefer the composer to keep "The Religious Economy" and "Religious Property and the Colonial State" as headings, or to fold them back under one heading with a different split?
4. **Hyphens inside names** (Ahmad-ud-Din, Zeb-un-Nisa, Qutb-e Alam, Pattharan-wali) are kept as the source spells them; ordinary compounds in the prose are written without hyphens.

---

# Part 2 notes

# Lahore, Part 2: notes for Rauf and the composer

Part file: `entries/places/drafts/lahore.part2.md`. Material: `entries/places/sources/lahore.sources.md`, the Kanhaiya Lal *Tarikh-e Lahore* whole-book section, from "### Urs, mela, rite and langar" (line 1660) to the end of the file (line 1805). Only one book is cited: Kanhaiya Lal. Checker: `check_place_description.py team lahore --draft-dir /tmp/part2` exit 0 (91,673 characters, 567 citation references in 523 parenthetical citations, 83 paragraphs).

## The biggest choice: English-only prose

The section drafter brief says to quote Urdu, Persian and Punjabi in the original script. Rauf's standing ruling of 18 October 2026 (HANDOVER §9.369, `docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md`, and the F1 message of `check_description_draft.py`) is that the prose of every Description is English only, and the only Urdu is verse. I followed Rauf's ruling: every Urdu prose quotation in the material is given in English, as the source's own English gloss where it has one and as a close paraphrase otherwise, never in quotation marks, adding nothing. The original script appears only in the three verse paragraphs of `## In Verse`. **Question for Rauf / the coordinator:** confirm that the place articles follow the 18 October ruling. If they should carry Urdu prose quotations after all, every passage is at its page in the source file and can be restored.

## Headings used

History; A City of Saints; Communities; Shrines, Endowments and the State; Festivals and Practice; In Verse; The Place in the Books; Where the Sources Disagree; Bibliography. No Overview (the composer's).

Placement choices the composer may want to revisit: building, repair and dating material (the author's warning about rebuilt fabric, inscribed dates, measurements, finials, wills, fabric details, water) went under A City of Saints, since nearly all of it is about holy places; the British public buildings, wages, costs, jails and hospitals went under History; elapsed-time dating and reign dating went under The Place in the Books, as features of the author's method. Tali Sahib's felled tree and the Dai Anga mosque appear in two places (Communities or Festivals, and the railway paragraph) because the source reports them in both frames.

## Left out, and why

- "The partial for pp. 236–348 also refers to "the nine repairs through the author" as an established series in that range, without giving a page of its own for the count; that count must be verified against the per-site sections before it is cited." Left out: no page reference, and the source itself says not to cite it.
- "The later bazaar-straightening-and-pipes scheme, and the acquisitions it made from four religious sites, are set out under the state section above" and "Revenue-free (معافی) shrine land, jagir, nazrana and the revenue assessment of a disputed enclosure are gathered in the endowment section above": pointers to sections before line 1660 (Part 1's material). Left to Part 1.
- "Doubled pagination" list (lines 1795 to 1801): not a fact about Lahore. Where I used one of those facts I cited both references as given (the Huzuri khanqah mela; Hassu Teli's urs and the lamps at his shop; the railway's taking of the Dai Anga mosque). Not used: Mufti Ghulam Sarwar buying the burial enclosure land from the khanqah's mujawirs, Dai Anga's waqf property, and Jani Khan's gatehouse bought from the government: single-site custody and endowment matters, Part 1's territory and the sites' own articles.
- "Figures that must never be presented as clean numbers" (line 1803): almost all concern facts outside my range (the Haqiqat Rai grant, the Nila Gumbad sum, the brick digging, the ifta farman, the vowed rotis, the physician's day total, the 9955 jagir, the Quran readers at Jahangir's tomb, the samadh keeper's salary, the muafi land, the Than Bhairo land, the khanqah's dead, the explosion). None of these figures is used in my part. The ones inside my range (Bhauri Sarkar's wells, Bahadur Khan's octagon, Jahangir's platform and minaret steps, Shalamar's bighas, the Quran and sword valuation) are given as uncertain or unreadable.
- "Flagged readings on which a whole fact depends" (line 1805): the Wazir Khan hammam as *awqaf*, the front matter heading, the Khoja mosque's 1856, the Egerton release: all endowment or single-site matters for Part 1. MacGregor's 1850 is used, as uncertain, in Where the Sources Disagree. The list of firm, unflagged dates there was used to say which dates are printed without doubt.
- "the ninth to twelfth are absent from the transcription" (the thirteen "shocks"): left out of the article because it describes the copy, not the book; recorded here. The composer may wish to say plainly that four of the thirteen are missing from the text as read.
- Kali Mata, "devotion in the street": the source gives no Urdu for it; left out.
- Rani Jindan, "her personal name there OCR-garbled": not a fact about the place.
- The Kuka dharamsal's "state prosecution" and the Baoli's "Khalsa-salary building fund": given only as the source names them, with no detail, since the detail is in Part 1's sections.
- Haqiqat Rai: the source says the offence is stated twice and differently but does not give the two statements; the article says only that.
- Prose inscriptions and fragments not set as verse: the Wazir Khan mosque's completion inscription and its "second House of God" line (prose, given in English); the Gulabi Bagh date fragment (one line with a numeral); the three "second Kaaba" hemistichs (each from a different chronogram, so they cannot be set as one verse paragraph, and a verse paragraph needs two lines); the Shalamar quatrain (not printed in the source); the Shaikh Muhtaram abjad (prose).

## Weak material and how I treated it

- The orders list "قادریہ ۔ چشتیہ ۔ …" (p. 44, folio 47), which the source calls "a doctrinal list attached to no shrine, saint, khanqah or place, and referred to Doubts": given as exactly that, with the two flagged names reported as uncertain, not guessed.
- The contents locator for five saint-named mohallas (p. 2): given as what it is, a statement about the book's contents.
- The thirteen "shocks" (p. 2; p. 11, folio 6; p. 12, folio 7): given as the book's framing, under The Place in the Books.
- Legends kept as legends: the Mata temple's Turkish soldier ("Kanhaiya Lal relates that"); the Roshnai Gate accident given as his reading.
- The Takiya Sadhuwan passage (pp. 170 and 171, folios 173 and 174): framed as his judgement, as the source asks.
- His position as Executive Engineer: stated at the head of Shrines, Endowments and the State, with the provenance warning the source gives.

## Disagreements (all in ## Where the Sources Disagree, one book against itself)

Mauj Darya's endowment; Shah Sharaf's reburial; Shah Dargahi's well; Abu al-Maali's festivals; Major MacGregor's office; Mr Cope / Coop; Jahangir's tomb 1034 against 1037; Masjid Chinian Wali 1082 against 1080 (with the author's own reconciliation); Mulla Majid's two years; the Mian Mir church's years against "about six years"; Wasdev's Samvat 1937 against 1936; the two elapsed ages 226 and 251; Sikh-era schooling; Haqiqat Rai's offence; Rakh Chalu / Rakh Jalu; *kansi kar* against *kashi kari*; the two explanations of Nau Lakha. Also stated in the prose: the Sufis' irenic character against the Wahhabi mosque and the 1849 riot (Communities), which the source sets side by side but does not call a contradiction.

## [OCR?] carried

In the original script (verse only): "افراز خان[OCR?]" (Chinian Wali couplet, p. 153, folio 156); "ہو[OCR?]" and "بروبید[OCR?]" (Roshnai couplet, p. 222, folio 225). In the English prose every flagged reading is said plainly to be uncertain ("a year read as 1850", "the name uncertain", "the figure uncertain"); I did not carry the token into English prose. No page reference in my range carries a flag.

## Verse quoted

1. Masjid Muhammad Salih Kambo, two lines from the niches over the gate, "بانی این مسجد زیبا نگار" / "بنائے آل محمد صالح است" (p. 152, folio 155). The source does not call them verse; I judged them a Persian couplet of an inscription. **Question:** confirm, or the composer should turn them back into English prose.
2. Masjid Chinian Wali, the outer gateway's chronogram couplet (p. 153, folio 156), printed in the source with its own " / " division.
3. Roshnai Gate, the Persian couplet on the requital of deeds (p. 222, folio 225), printed in the source as one line. I split it after "مشو", leaving the stray "ہو[OCR?]" at the head of the second hemistich, where it stands in the print. **Question:** is that split acceptable, or should the couplet stay out until the page image is read?

None of the three is glossed in the source, so each English paragraph is a plain statement of the subject, not a translation.

## Other questions for Rauf

- **Bibliography title.** The Source line prints *Tarikh-e-Lahore*; the `## From` heading and the earlier shrine articles use *Tarikh-e Lahore*. The checker needs the cited string in the bibliography item, so the item reads *Tarikh-e Lahore*, following the heading and precedent. The author is given as "Kanhaiya Lal Hindi", as the Source line has it; the manifest records the author as "to confirm".
- **Citation surname.** I used "Lal", as the place brief's example does; the shrine articles use "Kanhaiya Lal". The composer should make the parts agree.
- **The date of composition.** None of the elapsed-time dates can be turned into years until the book's date of composition is fixed, and the two mosque ages (226 and 251 years) cannot both be reckoned from one moment.
- **Doubled pagination.** Six facts appear twice, a hundred pages apart (p. 167 against 267, p. 168 against 268, p. 169 against 269, and Jani Khan at p. 169 against 270). Both references are cited where used; which is right needs a look at the scan.

---

# Part 3 notes

# Lahore, part 3: notes for Rauf (Chishti, *Tahqiqat-e Chishti*)

Material: `entries/places/sources/lahore.sources.md`, section "## From Maulvi Nur Ahmad Chishti, Tahqiqat-e Chishti" (lines 556 to 1053), and the book's Source line in "## The books" (line 73). Part: `entries/places/drafts/lahore.part3.md`. Checker: `check_place_description.py team lahore --draft-dir /tmp/part3` exits 0 (187 citations, 1 book, 55 paragraphs).

## How the section is built, and what that meant

- The Lahore block appears four times (lines 578, 683, 788, 893), once per group of rows it was attached to. I diffed the four copies: they are identical except for spelling variants inside four quotations (p. 121 یہ/یہہ, میں/مین, تھا/تہا; p. 719 بیٹھا/بیٹہا; p. 661 کہتے ہیں/کہتی ہین; p. 498 بھاٹی/بہاٹی). I used the material once.
- The Achhra block appears twice (lines 558, 568), with اچھرہ and اچہرہ as the two spellings. Used once.
- Headings used: History, A City of Saints, Communities, Shrines, Endowments and the State, Festivals and Practice, The Place in the Books, Where the Sources Disagree, Bibliography. No In Verse: the section carries no verse I could set as verse (see the inscription question below).
- The city's extent, walls, twelve gates and tiled mosques (lines 666 to 672) went at the end of History, not under a new heading; the composer may move them.

## Original script: a decision for you

The drafter brief asked for Urdu, Persian and Punjabi quotations in the original script. Your ruling of 18 October 2026 (HANDOVER §9.369, `docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md`: "the only urdu there should be should be the poetry") says prose is English only. I followed your ruling: every Urdu quotation in this section is prose, so its sense is given in English, closely, without quotation marks, and every uncertain reading is kept as "uncertainly printed" or "cannot be read". If you want the team version to carry the Urdu after all, the quotations are all in the source file at the page cited. **Question 1: English only for the place articles' prose too, as for the shrines?**

## Left out, and why

- Line 1018, "ToC lines (printed on p. 1)": table of contents locators for Miani, only locators; a contents number is never cited as a page.
- Line 1021, "a related damaged passage mentions "محمد شاہ[OCR?]", "یہ موضع" and "حصہ چند[OCR?] قبرستان میانی"": too fragmentary to say anything. The first half (a table of named sites closes the section, p. 192) is kept, stated as what it is.
- Line 646, closing line "وہی لاہور اسرار کرے[OCR?] صاحبان عالی شان" (p. 648): garbled, no sense recoverable.
- Line 646, "حب مہارا حد کے سو فتح کیا" with the garbled phrase about the "قلعہ" (p. 646): garbled; the rest of the Mehr Muhkam passage is kept, flagged as badly garbled.
- Line 651, second sentence, "مظفر خان … لاہور میں پکہ نشن[OCR?] مقرر ہوئی" (p. 580): garbled, marked so in the source.
- Line 681, "A garbled line: "حد حکومت سے حاکماں شہر لاہور..."" (p. 420): the source says it cannot be construed.
- Line 1035, the word "رہیدار[OCR?]" (zamindar?) for Mian Murad Bakhsh: the source itself only guesses; left out, the rest of the sentence kept.
- Line 1037, the gravediggers' lists: not reproduced name by name in the prose; several names are given, and the two lists' counts (fourteen and ten) and differences go to Where the Sources Disagree. Names printed with [OCR?] (نور ماہی, ہیرا ماہی, لدھو and others) were not romanised except Ludhu, flagged.
- Line 1036, the [OCR?] names among the sons (نفہ ماہی, میہوں, نمس, احمد, بلاقی, Taj): not romanised; I named only the clearly printed ones.
- Line 611, the heavily flagged words around Malik Ali's kotwali ("تمر[OCR?] قرویہ[OCR?] ..."): not carried; the kotwali of the capital is kept with the passage flagged as uncertain.
- Shrine histories not retold, as the brief says: Shah Kaku Chishti appears only for his claim that Lahore was his city and his death as envoy; Miran Badshah's mazar only for the line that the people of Lahore revere it; Mian Mir and Mian Natha only in the Achhra legend.

## Weak material and how I treated it

- p. 45, the heading that opens the survey: given as what it is, a heading (A City of Saints).
- p. 186, the Miani section title, and p. 192, the table that closes it: given as what they are, not as facts about Miani.
- p. 828, Jahangir's coin legends: the source has only a summary of four illegible lines naming mints. Given as "cannot be read in full; they appear to name Lahore and Ahmadabad".
- p. 648, Akbar's second enthronement at Lahore: garbled; given with "a badly garbled passage places".
- p. 646 and p. 647, Mehr Muhkam: given as a badly garbled passage.
- p. 204, the gravediggers' history of Miani by reigns: the source says "heavily flagged, sequence approximate"; the prose says the order of events is approximate.
- p. 212, the fruit from *wilayat*, digging earth and the gorkan at four rupees: given as fragmentary.
- p. 525, the Gilani household's flag during a disturbance "یہ شیر سنگھ ہوا": the link to Sher Singh is given as made by a garbled passage.
- p. 718, the second massacre, "لاکہا آدمی": given as "hundreds of thousands", the passage flagged as heavily damaged.
- Legends kept as legends: the two founding stories ("introducing it as something people say", "the formula that God knows best"), the majzub faqir who kept Lahore safe ("it is said"), the Achhra date palms ("Chishti relates").

## Disagreements listed (all inside Chishti)

1. The founding of Lahore: three sons of Raja Ram Chand (p. 661) against two sons, Kushu and Lohu (p. 795).
2. The last nazim: Mir Momin Khan as the last (p. 173) against Nawab Abdullah Khan from 1161 (p. 717), Khwaja Abid as subadar (p. 578), and the unnamed ruler at Ranjit Singh's taking of the city (p. 579).
3. The heads of Hira Singh and Pandit Jalla: p. 590 against the afterword's eyewitness account, p. 868.
4. How Miani was emptied and became a graveyard: pp. 191, 204, 212, 213.
5. The name of Miani: ulama and Panj Dher (p. 191) against the gravediggers' illegible reason for "Siani" (p. 211).
6. The gravediggers' genealogy: p. 209 against p. 213.
7. The gravediggers then working: fourteen names (p. 209) against ten (p. 213).
8. The gravediggers' income and the sajjada nashin: p. 209 against p. 213.
9. Chishti against Lala Amin Chand on the Parsi graves and on the city (p. 733). Amin Chand is not a source of this part, so both sides are cited to Chishti.

Not listed as a disagreement, but given in History with each printing: the three Sikh rulers of Lahore (p. 251 names three; p. 326 prints only Gujjar Singh; p. 111 has Gujjar Singh ruling a part).

## Uncertain readings carried into the prose (each [OCR?] or [illegible] of the source, in plain words)

Kasur, Lo, Rao (p. 661); the Hijri year of Sabuktigin's first invasion (p. 804); Khair Allah Khan, Kalinjar, Tawar, Osa (p. 804); "seven" months and years (pp. 807, 808–809); the sultan's name and Kamran (p. 430); Malik Ali's kotwali (p. 194); Akbar in Lahore (p. 525); Lahore and Ahmadabad as mints (p. 828); Jahangir's death date (p. 830); Wazir Khan's title (p. 738); Khalil Allah Khan's "دارہ" (p. 497); 1712 CE (p. 846); Abdus Samad Khan's appointment (p. 714); Mir Momin Khan's administration and the real nazim's name (pp. 172, 173); Mir Mannu's saying (p. 121); 1155 (pp. 717–718); 1161 and the proverb's words (p. 717); Khwaja Abid's year (p. 578); the Nawab from Kabul (p. 722); the Ravi, "thousands", the Nakhas (pp. 218, 219); the fragmentation after Mir Mannu (p. 719); Gujjar Singh and Sobha Singh, the Samvat year (p. 251); the misls' names (p. 575); the "کاب گھر" at Wazir Khan's baradari (p. 575); Bikrami 1897 (p. 723); the number of days (p. 590); Sobraon, Raja Lal, Agra (p. 591); December 1849 (p. 592); the Lieutenant Governor (p. 142); the mohalla of the maulvi's house (p. 372); the Dakki and Sarawala gates and the Dakki gate's second name (p. 498); the "east" of the Delhi Gate (p. 739); the tomb's arches (p. 414); Khwaja Inayatullah (p. 719); Achhra and the date palms (p. 287); Fateh Mozang and the "Chaghtai" kings (p. 207); the Miani section title (p. 186); the grant, Mir Ali, Gumhat, Pir Alima, Panj Dher, Kanjar (p. 191); Siani (p. 211); the four rupees (p. 212); the rent and two hundred houses (p. 212); the rupee in four parts (p. 213); Ludhu and the five sons (pp. 209, 213); the Jain group's name (p. 544); Qutb Yunan (p. 585); the people of Delhi (p. 292); Coldstream (pp. 28, 734); Mir "Muharram Allah" (p. 756, left unnamed).

## Verse

None quoted. The section has no couplet, hymn or chronogram. **Question 2:** the inscription of Muhammad Salih Kambo's mosque, "وادی ایمن حرمت لاہور را فیض حرم" (p. 753), may be a Persian hemistich. The block does not say it is verse and gives no English, so I described its words in prose (the Valley of Ayman, the sanctity of Lahore, the grace of the Haram) rather than set it as verse or translate it. If you know it to be verse, it could go in as a one line verse paragraph with that plain statement of its subject.

## Other questions and points for the composer

- **Question 3: page ranges.** Two citations copy the source's ranges exactly, "pp. 808–809" and "pp. 717–718", which contain an en dash. I kept them, because page references must be copied exactly and the shrine team articles already carry such ranges; it is the only dash in the part.
- The commissioner's name is printed two ways, "ولیم کولڈسٹریم" (p. 28) and "ولیم گولڈ اسٹریم" (p. 734); the prose gives Coldstream once and says the name is printed differently on p. 734.
- The Bibliography item follows the form the shrine team articles already use for this book ("dated 1867 for the original, the date unconfirmed"); the Source line gives no language and no publisher, so none is added.
- Page references for this book are page indices with no folios; every citation is "p. N" as the source gives it.
- For the composer: History is long (about 20,500 characters) but well under the 45,000 limit for one section; its last four paragraphs (extent, gates, tiled mosques, the city's ruin) could become their own heading if the merged History grows too long.

---

# Part 4 notes

# Lahore, team version, Part 4: notes for Rauf

Part: `entries/places/drafts/lahore.part4.md`. Books: Bhandari, *Khulasat al-Tawarikh*; Nizami-i Arudi, *Chahar Maqala* (Browne); Khalid, *A White Trail*, *In Search of Shiva*, *Walking with Nanak*; Dhillon, *Janamsakhis*; Schaflechner, *Hinglaj Devi*; Madho Lal Hussein, *Verses of a Lowly Fakir* (Alam tr.). Checker: `check_place_description.py team lahore --draft-dir /tmp/part4` exit 0 (262 citations to 8 books, 58 paragraphs).

Headings used: History; Holy Places; Communities; Shrines, Endowments and the State; Festivals and Practice; In Verse; The Place in the Books; Where the Sources Disagree; Bibliography. No Overview (the composer's).

## Left out, and why

**Khulasat al-Tawarikh**
- "indexed: "لاہور" — printed locators ۳۹, …" (p. 21) and "indexed: "اچھرہ"" (p. 46): index headwords, locators only.
- "Table-of-contents headings only" (pp. 589–591): left out as headings, except that the body heading "عمارات جهانگیرآباد و لاهور" (p. 136) is named beside the palace it heads. The Deccan and Dara's flight headings are locators.
- "Departure point only: heading "نهضت موکب مقدس از لاهور بجانب ولایت دکن"" (p. 164): bare departure.
- "Bare mentions (c. 010)" (pp. 118, 119, 124: departures, and Kangra "بر سمت شمالی لاهور"): transit and direction only.
- "Passing: Mahabat Khan told Afzal Khan …" (p. 110) and Asaf Khan made vakil (p. 103): passing.
- "Shah Daula's Deg bridge is "پنجگروهی امن اباد جانب لاهور"" (p. 515): directional only.
- "Shaikh Ali "بلاهور رسیده …"" second half (the Sultan reassured about Lahore, p. 325): kept only the fort and the twelve thousand horse.
- "In "سنه ۹۶[OCR?]" Sultan Muhammad Shah sent Prince Humayun Khan …" (p. 335): the year is plainly incomplete and the event is a campaign abandoned; left out rather than carry a broken year.
- "Kamran came "از لاهور" to Humayun at Agra …" (p. 287), "بنا چار توقف در لاہور …" (p. 285), the Talaqan meeting (p. 278), Islam Shah's Qutb Khan episode (first half of p. 263), the return to Lahore after Bairam Khan (p. 245), Humayun leaving Lahore with colic (p. 255), Shah Abu al-Maali sent toward Lahore from Sirhind (p. 255), "در آغاز سال دویم از لاهور متوجه سیر و شکار کابل شدند" (p. 144), the Gujrat pargana journey and third Kashmir visit (p. 177, except the epithet "دارالممالک لاہور"), Shaikh Farid Bukhari turning Khusrau from Lahore (p. 146), Dara's damaged sentence on reaching Lahore (pp. 77–78), the Haibatpur Patti dispatch (p. 66), Muhammad Zaman Mirza's return (p. 290, kept only the advance): campaign and transit mentions that add nothing to the city.
- "سلطان جلال الدین … وسلطان بالشکر بسیار از لاهور رسیده مقابله نمود (as printed; see Doubts)" (p. 399): kept only the siege and the flight to Sind; the second clause is confused as printed about who came out of Lahore, so it is not stated.
- Achhra: kept as the camp of Khalilullah Khan and Jai Singh and of Aurangzeb (pp. 65, 67), not as a place in itself.
- "Shah Abu al-Maali" (p. 237) is named as the chronicle names him; he is NOT identified with the archive's darbar-abul-muali-qadri (the source leaves him unmapped).
- "The dead emperor's body" (pp. 106–107): kept without naming the emperor, as the source gives it.

**Chahar Maqala**
- "The bare imprint mentions "lithographed/printed at Lahore" (p. 97, p. 172) and the index locator "Lahore, 117"": already excluded upstream; not used.
- Browne's J.R.A.S. translation and the Persian notes' page ranges (p. 135): external references, not about the city.
- Mas'ud-i-Sa'd's release by Abu'l-Qasim and the Thiqatu'l-Mulk intercession, the fortress of Maranj, and 'Uthman Mukhtari and Mu'izzi as witnesses: the essentials kept, these names omitted for length; the composer may restore them from the source.

**A White Trail**
- "The Okara cyclists "will spend the night in Lahore …"", Maryabad walkers "from cities as far as Lahore", Sahiwal "about one hundred and fifty kilometres from Lahore" (pp. 85, 88, 117): distance and transit only.
- Contents list (pp. 5–6): used once, as what it is (Khalid's chapters on Lahore festivals), not as facts about the festivals.
- Dr. Yousuf John's school tap story (p. 91): the school's location is not stated, so not set in Lahore.
- Javed Aftab's Catholic procession "about twenty kilometres": kept the procession, not the distance.
- Sabar Elahi's hotel by the Ravi Bridge (p. 99), the Pepsi bottles (p. 221), the generator against power cuts (p. 117), Nasreen's name (p. 97): incidental.
- The Ahmadi lawyers' Shezan ban: kept; the Sunday cricket kept as one clause.
- "the "old Anarkali" curd-shop anecdote (p. 68) was not mapped" upstream: not in the material.

**In Search of Shiva**
- "Bare route mentions" (excluded upstream).
- "Ch. 4 informants' Lahore" (Mussadiq's DHA house, McLeod Road shop, p. 10): incidental, not religious life.
- "Ch. 6: Bhera woodwork, "specimens of which are also present in the Lahore museum"" (p. 12): about Bhera.
- "Ch. 8 school poster (borderline)" (p. 14): about a school's curriculum, not the city.
- Kept from the "Thin / incidental … weigh accordingly" group, each framed as Khalid's own passing observation: the park walkers (p. 7, ch. 1), the burqa remark (p. 16, ch. 10), one LUMS sentence (p. 16, ch. 10), and Iqbal Qaiser's encyclopedia and the Chunian line (p. 11, ch. 5). Rauf may prefer to drop these.

**Walking with Nanak**
- The long "Passing mentions only" run (p. 19 beggar, p. 41, p. 104 Saidpur reconstruction, p. 123 Tulamba, p. 124, p. 127, p. 141, p. 159 drivers, p. 163, p. 179, p. 185, p. 191, p. 193, p. 223, pp. 258–259, p. 282, p. 286): transit or comparison only. Two kept: the Grand Trunk Road (p. 115) and the caravanserai route (p. 119), as Lahore's place on routes, and "a city like Lahore, where everyone wears their religion on their" (p. 174), with the lost word stated.
- Jasdeep at "Punjab University, Leh i) [OCR?] [Lahore?]" (p. 88): the city reading is uncertain; left out.
- Guru Arjan's haveli, samadhi and the Ravi ("see the Arjan group", p. 253): that is the shrine articles' material; only his summons and death in the city are named.
- Prithi Chand's rival shrine "on the route from Lahore to Amritsar" (p. 44): the Bedian road sentence (p. 38) kept, this one not.

**Janamsakhis**
- Dialogue "my fields near Lahore, which are only a few hundred kos away" (p. 80, folio 88): a character's line, implausible as distance, adds nothing.
- The Duni Chand story is kept as Dhillon's retelling; it "names no present-day site in Lahore", so no site is named.

**Hinglaj Devi**
- The index headword "Lahore, 129" (p. 351): locator. The two passing mentions (pp. 28, 138) are stated as what they are, with the book's own finding that it attaches no shrine, saint or festival to Lahore.
- The `darbar-malik-ahmad-ayaz` join note: about the archive's rows, not the city.

**Verses of a Lowly Fakir**
- Nothing about the city left out.

## Weak material and how it was treated

- Bhandari's Lahore rests mostly on campaign and office mentions; his only description of the city is the suba passage (pp. 523–525), and the part says so in The Place in the Books.
- Kaiqubad's Mongol raid (p. 380): the source notes that only the environs are named and nothing is said of monuments or saints; the part says this.
- The unnamed "famous Sufi shrine in Lahore" (drug ban) and the unnamed "historic Hindu temple" (p. 10 and p. 11, ch. 4 and 5), and the unnamed temple of *Walking with Nanak* (p. 32) and of *A White Trail* (p. 9): kept, each said to be unnamed, assigned to no site.
- Daulat Khan Lodi's broken sentence (p. 311) and Sultan Sikandar's gap (p. 252): stated as broken off and gapped.
- Informant names in *A White Trail* may be pseudonyms (the book's own note, p. 15); the part says "an informant he calls" for Lal and Kartar, and otherwise uses the names as printed.

## Disagreements listed

1. Ghori and Lahore: Bhandari pp. 517, 404, 405 against Dhillon p. 136, folio 151.
2. Gates of the walled city: thirteen (*A White Trail*, p. 205) against twelve (*In Search of Shiva*, p. 12, ch. 6).
3. Minority communities: five (p. 9) against four (p. 10), both *A White Trail*.
4. Runi's death: Taqiyyu'd-Din's A.H. 489 against survival into Mas'ud III's reign (pp. 134–135).
5. Mas'ud-i-Sa'd's imprisonments: ten then eight or nine (p. 135); twelve and eight more, and ten and seven or eight (p. 69, folio 51).

Not listed as disagreements, but worth Rauf's eye: Bhandari gives Khusraw Malik twenty eight years of rule at Lahore (p. 405) and, in a damaged passage of the city description, thirty eight years for the Sultan's descendants holding Lahore as their seat (pp. 524–525). They may not describe the same span, so they are not set against each other; both are in the History.

## [OCR?] carried into the prose

- "مغول[OCR?]" in the Mongol siege date (p. 395)
- "یک کرور[OCR?] روپیه" Dara's treasury (p. 77)
- "نگاهبانی[OCR?]" the empty city (pp. 67–68)
- "تالاب زیبه[OCR?]" the riverbank (p. 524)
- "هشت لک[OCR?] روپیه" Jahangir's palace (p. 135)
- "بتجرید[OCR?]" goods of the seven climes (p. 524)

Years and numbers the source marks [OCR?] were given in Western digits with the doubt said in words: 412 (p. 414), 575, 580, 582 (p. 404), 603 (pp. 400–401), 607 (p. 400), 930 (p. 304), 1037 and its day (p. 106), the fourteenth regnal year (p. 136), about twenty thousand horse (p. 77).

## Verse quoted

- Bhandari, the couplet Akbar asked about while crossing the Ravi below the fort, "کلاه خسروی و تاج شاہی / بہر گل کی رسد حاشا و کلا" (p. 179), as a verse block. The source gives no translation, so none is given; the part says so.
- Bhandari, the last line of Shahryar's quatrain, "بگو کور شد دیده آفتاب" (p. 107), inline.
- Jahangir's palace ruba'i (p. 135) is only mentioned: the source does not quote it.

## Questions for Rauf

1. The citations keep the en dash of page ranges ("pp. 524–525") because the checker requires the reference exactly as the source gives it. The prose has no dashes. Is that acceptable under the no dash rule, or should the checker learn to accept a hyphen or "to"?
2. The "weigh accordingly" items from *In Search of Shiva* (park walkers, burqa remark, LUMS, Iqbal Qaiser's encyclopedia, Chunian) are kept as Khalid's observations. Keep, or drop?
3. Should Bhandari's Shah Abu al-Maali (p. 237) ever be linked to Darbar Abul Muali Qadri? The part keeps them apart, as the source does.

---

# Part 5 notes

# Lahore, part 5: notes for Rauf and the composer

Part: `entries/places/drafts/lahore.part5.md`. Books: Schimmel (*As Through a Veil*, *Mystical Dimensions of Islam*), Ernst and Lawrence, Boivin, Kasmani, Werbner and Basu, Qureshi, Rozehnal, Rizvi, Kugle, Abbas. Checker: `check_place_description.py team lahore --draft-dir /tmp/part5` exit 0 (115 citations to 11 books, 48 paragraphs, 25,405 characters as the checker counts).

Headings used: History, A City of Saints, Communities, Shrines, Endowments and the State, Festivals and Practice, The Place in the Books, Where the Sources Disagree, Bibliography. No In Verse: none of these eleven sections carries verse.

## Left out, and why

Schimmel, *As Through a Veil*
- "`Lahore` stands as its own headword in the Index of Proper Names" (p. 357): an index locator.
- "Iqbal's "epic ]avidniima (Lahore, 1932)" (p. 233): imprint only.
- "Note 77: "A fine Panjabi version with a commentary by Haji Muhammad ad­din..."" (p. 301): imprint; not used separately (the chapbook series is described from the bibliography items instead).
- The remaining bibliography imprints ("c Abdullah, Dr. Syed . Naqd-i Mir", Affifi, Zubaid Ahmad, "Bu c Alf Qalandar. Diwan", Ghalib, Gairdner, Mir, Smith, Sultan Bahoo, Waheed Mirza, Tuhfa Rahim Yar, "Iqbal aur cashq-i rasul", the 1955 presentation volume): imprints. Treated as what they are: one paragraph in The Place in the Books says Lahore houses printed mystical poetry, with the chapbook series (Allah wale ki qaumi dukan) named, citing the locator list "pp. 318, 321, 325 ..." and three items (pp. 329, 331, 333).
- "Contradiction kept side by side" between chunks about whether imprints are place material: a processing disagreement, not a disagreement about Lahore. Left out.
- "Negative finding (chunk 003): no shrine, tomb..." : a statement of absence, left out.

Schimmel, *Mystical Dimensions of Islam*
- "Massignon, Louis, and Huart, Clemens. "Les entretiens de Lahore."" (p. 486; p. 391): an article title only. Left out.
- Index entry "Lahore, 88, 225, 239, ..." (p. 520) and "Pilgrimage: … to Data Ganj Bakhsh, 88" (p. 538): locators. Left out.
- "brought into the Subcontinent not only scholars like al-Blruni": not quoted because of the damaged name; paraphrased as "brought scholars".

Ernst and Lawrence
- "Dr. Mansoor Hashmi (Lahore), Dr. Aftab Ahmed (Lahore)" (p. 15): acknowledgements. Left out.
- "After passing some time in Lahore, they went south" (p. 171): bare transit. Left out.
- The bibliography imprints (Sufi Foundation 1403/1983, Islamic Book Foundation, Artistic Printing Works 1903, Majlis Shah Hussain 1967, etc.): imprints. Left out.
- "Lahore is also recorded as the destination of the Jama'at-i-Islami in 1939 (pp. 214–231, folios 203–220)": a locator spanning eighteen pages with no quotation, and "destination" is unclear. Left out; see questions.

Boivin
- "Lalwani, L. W., The Life, Religion and Poetry of Shah Latif ... Lahore, Sang-e Meel" (p. 236): imprint. Left out. Iqbal's birth in Lahore (p. 212) is used.

Kasmani
- "Baba's fakir story "traverses Sufi shrines across the Punjab"" (p. 73): about the Punjab, not Lahore. Left out.
- "imparting the same knowledge of tariqat… to others in Lahore. There too his status is the same" (p. 136): minor; left out.
- "Living on the outskirts of Lahore, he had visited the shrine a few times only to pay his respects" (p. 141): which shrine is not clear from the source passage. Left out.
- "Lahore as a place of publication" (pp. 205, 215): imprints. Left out.

Werbner and Basu
- Lahore as a publisher's city in the reference lists (pp. 193, 203, 216–218): imprints. Left out.
- The "two quoted mentions of Data Ganj Baksh / Data Sahib, which are recorded under `data-darbar`": not in the Lahore source file, so not available here.

Qureshi
- Nothing left out except the explicit "Nothing else" statement.

Rozehnal
- "I spent the academic year of 1995–1996": paraphrased as "1995 and 1996" to keep a dash out of the prose.
- *Journal of the Panjab Historical Society (Lahore)* (pp. 242, 270), Sh. Muhammad Ashraf (p. 270), Vanguard Books (p. 241), al-Kitab (p. 263): imprints. Left out.
- "Interview datelines" (pp. 44 to 225): the source does not say these interviews took place in Lahore. Left out.

Rizvi
- "about forty miles south-west of Lahore" (p. 407): a compass bearing for an unnamed place. Left out.
- "Qazi Shu'aib, went to Lahore" (p. 157): bare transit. Left out (the route sentence at p. 158 is used).
- The index headword "Chah Miran, I11 [OCR?]" (p. 463): locator. Left out; no [OCR?] carried into the part as a result.
- The four mentions in pp. 1 to 29 whose pages were never recovered: no page reference, so left out.
- "published in Lahore in 1909", "Oriental College Magazine, Lahore X/1", and the bibliography imprints: imprints, already declined by the source.

Kugle
- The ten Lahore imprints (pp. 326, 339–341, 345–346): imprints; a sentence was drafted and then removed as weak.
- The index entry "Lahore, 181-83, ..." (p. 358): locator. Left out.
- "the whole of Chapter 4 is set in it": no page reference attached. Left out.

Abbas
- "mazar-e-iqbal reaches this list through Lahore, not through ... Allama Iqbal Open University": about mapping, not about Lahore. Left out.

## Weak material and how it was treated

- Imprints in Schimmel (*As Through a Veil*) and Qureshi were stated as what they are: Lahore as a place where these books were printed, in The Place in the Books, never as a fact about the city's religious life.
- Kasmani's Strothmann pointer (p. 189) is given as a pointer: Kasmani refers the reader elsewhere and does not name the shrine.
- Rozehnal's "print capital" material (p. 130) is given as the publishing of the order he studied; the source block heads it "Lahore as the order's print capital" but the quoted sentences do not themselves say "Lahore". Composer may wish to soften to "the order's publishing" if this troubles a verifier.
- The Werbner and Basu material is thin (catchment edge, Rabi‘a's return, Samnabad) and is given in one paragraph, paraphrased from the source's own summary, without quotation.
- Qureshi's four qawwals: named, with the explicit statement that no shrine or assembly is attached.
- Rozehnal's funeral rain (p. 75) is reported as the book's account ("Rozehnal relates ... and that"), a pious narrative, not a fact.
- Kugle's "Red Fort": the part says the book calls it the Red Fort and does not otherwise identify it. Not glossed as the Lahore Fort.
- Rizvi's "hostile ... to the views of its author" (p. 131): the source does not say whose views; the part does not name Hujwiri here, and a draft disagreement bullet setting Rizvi's hostile city against Schimmel's "first center" was removed for that reason.
- Schimmel's *Sakinat al-auliya*: the source summary says it was "written by the Mogul heir apparent" and also that the book gives it no date; the part says she "associates" it with the heir apparent and gives no date. The source summary's own "seventeenth-century" was not used, since the source says the book gives no date.

## Disagreements recorded (all in ## Where the Sources Disagree)

1. Patron saint: Kugle, Hujwiri "Lahore's patron saint" (p. 206, folio 185) against Shah Hussayn "one of Lahore's patron saints" (p. 204, folio 183) and "one of the patron saints of Lahore" (p. 241, folio 220). Inside one book.
2. Mughal status: Kugle, "regional capital" (p. 202) against "seasonal capital city and home of the Mughal court during its perennial rotation" (p. 233). Inside one book; a difference of characterisation, kept because the source sets them side by side.
3. The festival of lamps: Schimmel, *Melā Chirāghān*, "near the Shalimar Garden", last Saturday in March (p. 415, folio 384); Abbas, *Melā Chirāg*, at the Shalimar Gardens, no date (pp. 95, 185, folios not stated).

## Flags carried

- [OCR?]: none carried. The only [OCR?] in my sections (Rizvi's Chah Miran index locator; the Rizvi Source line) are in material left out or in the bibliography's corrected reading.
- Text-layer flag on a folio: Kugle "p. 208, folio 187 [`l&J`, text-layer?]" is cited exactly as the source gives it, backticks and all, because the folio reading itself is flagged. The composer should keep it exactly or drop the citation in favour of p. 210 alone.
- Schimmel (*As Through a Veil*) p. 254: the 1911 imprint is "191 1"[text-layer?: 1911]; the part says the year's reading is uncertain in the printed text.
- Abbas p. 90: the year of the partition is "[text-layer?: year dropped]"; the part says the year is lost in the printed text. Abbas's three local-literature items have every year destroyed; said in the part.
- Qureshi p. 282: "Mubarak Ali-Fateh Ah [text-layer?: Mubarak Ali-Fateh Ali]"; the part uses the corrected reading "Mubarak Ali and Fateh Ali".
- En dashes survive only inside three page references copied exactly (Rizvi "pp. 241–242, folios 221–222"; Schimmel "pp. 170–171, folios 152–153"; Abbas "pp. 121–122, folios not stated"). The prose has none.

## Verse quoted

None. No verse occurs in these eleven sections.

## Questions for Rauf

1. Ernst and Lawrence record Lahore as "the destination of the Jama'at-i-Islami in 1939" with an eighteen page locator (pp. 214–231). Left out as unclear. Do you want it in as stated?
2. Kasmani's "terror attack at Lahore's most prominent shrine" (p. 104) is unnamed and undated in the book; the same book calls Data Darbar "Lahore's most prominent shrine complex" (p. 65). The part does not join the two. Should it?
3. The Rizvi bibliography item gives both years the copyright page prints (first published 1978; copyright line 1975) and uses the Source line's corrected readings "Munshiram Manoharlal" and "Pvt. Ltd." and "1600 AD". Acceptable?

