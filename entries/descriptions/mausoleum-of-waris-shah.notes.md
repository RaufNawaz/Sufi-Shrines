# mausoleum-of-waris-shah — review notes for the rewritten Description

Draft: `entries/descriptions/mausoleum-of-waris-shah.md` (47,735 characters; current cell 3,939). Checker
`pipeline/book_queue/check_description_draft.py mausoleum-of-waris-shah` exits 0 (187 citations, 14
books, 93 paragraphs). The largest section is "Heer Waris Shah" at about 13.3k, well under the 45k cap. Line
numbers below are lines of `shrine_entries/mausoleum-of-waris-shah.md`.

## Current Description

Every sentence of the current text (entry lines 9–31; CSV cell) is kept verbatim, each paragraph opening
its own section (Overview, The Life of the Poet-Saint, Heer Waris Shah ×2, The Shrine, Legacy). There are
two edits of form:

- **The Shahmukhi opening line** (line 19) is split at its printed comma into two lines, so that it renders as
  a verse block (`ProseParagraphs.tsx` needs two or more Arabic-script lines). The words are unchanged.
  **Decision for Rauf:** the current text prints it as one line. If you prefer it that way, rejoin it, and
  it will render as a prose paragraph. The entry's reference note (line 45) still says "confirm Shahmukhi
  orthography". I reused the line unchanged, and it is still unverified.
- **The bracketed English** after it (line 21) is now an italic paragraph, without the brackets and quotation
  marks. It has no citation because it had none; its source stays the current bibliography's "standard
  published wording" item.

All three current bibliography items are kept verbatim and first.

## Books cited (14)

Waris Shah (*Hir and Ranjha*, Usborne tr.), Shackle (*Sufi Lyrics*), Rafat (*Bulleh Shah: A Selection*),
Schimmel (*Pain and Grace*; *As Through a Veil*; *Mystical Dimensions of Islam*), Abbas, Khalid (*In Search
of Shiva*; *Walking with Nanak*; *A White Trail*), Kugle, Bhandari (*Khulasat al-Tawarikh*), Kanhaiya Lal
(*Tarikh-e Lahore*), Chishti (*Tahqiqat-e Chishti*).

## Verse quoted: 24 excerpts (23 set off, 1 inline)

The only original-script verse is the current text's Shahmukhi line. **The entry has no other Arabic-script
verse for Waris Shah**: no chronogram, inscription or Shahmukhi couplet. Every English excerpt is the
book's own translation, given as running text, with no ` / ` except where Schimmel prints line breaks.

1. The Shahmukhi opening line with the current English (current text, lines 19–21).
2. Usborne, Waris Shah's own verse. Eighteen set-off excerpts, each in italics:
   - Kasur (p. 56, line 390)
   - Bhag Bhari (p. 45, line 405)
   - "My friends came to me" (p. 2, line 438)
   - the Invocation's Shakarganj line (p. 2, line 530)
   - 1180 Hijri (p. 56, line 416)
   - Kharal Hans (p. 56, line 432)
   - the lamp vow (p. 41, line 481)
   - "Poet Waris: None can withstand" (p. 8, line 474)
   - "Hir of Ranjha in Heaven" (p. 17, line 476)
   - the curse (p. 22, line 479)
   - "Poets, you should determine" (p. 56, line 451)
   - the Kheras (p. 39, line 455)
   - "your name will be famous" (p. 57, line 457)
   - "I have no capital of good works" (p. 56, line 459)
   - "Oh wise man" (p. 56, line 463)
   - "The story of true lovers" (p. 57, line 466)
   - "anxious to see God's face" (p. 57, line 468)
   - "May God pardon him who copies" (p. 57, line 446)
3. Schimmel, *Mystical Dimensions*, p. 420, four excerpts, with ` / ` as she prints them (lines 897–903): two from
   the allegorical key, one more from the key, and the "Warith Shah says" signature line.
4. Inline: the romanised Punjabi baarat line, quoted by Khalid, *A White Trail*, p. 56 (line 997). The entry
   gives no translation, so only its subject is stated.

**Note markers removed inside quotations**, with the wording otherwise verbatim:

- "Bhari,5" (405), "Waris,9" (476), "themes.3" (453), "troubles.4" (530), "country. 2" (417), "oil.'5" (482),
  "Punjab.8" (539) and "Kandaharis5" (539).
- "Shakarganj7" (409) is avoided by splitting the quotation.

**Key line 1** reads "Our soul is the tragic heroine Hlr [text-layer?: Hīr]" (line 898). I quote it only up to
"heroine" and give Heer outside the quotation marks, because the printed name is damaged.

## Disagreements listed (11 bullets)

1. His dates. The current text gives c. 1722–1798. Usborne gives neither year. Schimmel's index has "late 18th
   cent." (line 824). Abbas's birth year is unreadable (725–727). Kuldip's title has 1730–1790 (273–280, 290–293).
2. When the poem was written. The current text gives 1766. The poet gives 1180 Hijri (416). The annotator gives
   1766 twice (420–424), 1768 as a damaged reading (425–428), and "five years" after Panipat 1761 (429–431).
   Schimmel gives around 1794 (210–211, 883) and the late eighteenth century (822, 881).
3. Where it was written. The current text has Malka Hans and a chamber beside a mosque. The poet has Kharal Hans
   and the southern country, which is Lammnan Des / Montgomery (432–437).
4. His Sufi allegiance. The current text says Chishti, in the line of Makhdoom of Kasur. The annotator says
   "more than one sect" and names none (396–401, 517–521). The poet credits Shakarganj (409). The Invocation
   praises Gilani (411–414).
5. His teacher. The current text has Makhdoom of Kasur. Usborne has "the Saint of Kasur", with the damaged name
   "… Murtaza of Kasur" (380–385). Rafat has Khawaja Hafiz Ghulam Murtaza Qasuri (320–325).
6. His birthplace and his grave. The current text has Jandiala Sher Khan, born and buried. Usborne has
   "Jandiala" only, with birth and residence but no grave (380–389, 521–524).
7. Legend or history. The current text calls it an old love-legend. Abbas calls it a myth older than Waris Shah
   (725–727). Khalid reports Damodar's "actual story" (1033).
8. The poet and his annotator on the Punjab's past. The Invocation is followed by the annotator's rebuttal
   (530). "armies of the Punjab had fallen upon Hindustan" is followed by "imaginary situation" (538).
9. His name. Schimmel writes Warith (206, 822, 877), Shackle writes Varis (257–259), and the others write Waris.
10. The translator's name. Schimmel has "Charles Frederick Usborne" (907). Abbas has "C. L. Osborne … (London:
    Peter Owen)" (767–768).
11. Jalalpuri's book. Rafat has *Muqamat-e-Waris Shah* (Aina Adab, Lahore, 1972) by "Jalalpuri, Ali Abbas"
    (329–332). Abbas has the Hamid Raza Press, Lahore, with the title spelled two ways (764–766).

## Pointers given in hedged form, and context framing

- **Usborne's "Jandiala"** (Doubt, lines 521–524). The prose never cites Usborne for "Jandiala Sher Khan". It
  says three times that the book prints "Jandiala" alone and attaches no grave to it.
- **Schimmel's "Warith Shah"** (Doubts 234–237, 831–832). The prose says she spells the name so, and her
  quotations keep the spelling.
- **Kuldip's 1730–1790** (Doubt 290–293: "do not carry … as this book's claim"). This appears only in
  Disagreements and Legacy, explicitly as Kuldip's title and "not Shackle's".
- **Abbas's devotional frame** (line 741). "Its devotional frame is an invocation of Baba Farid of Pakpattan" is
  the entry's paraphrase, not Abbas's words, so it is given unquoted. The full quotation lives in the Farid
  row's entry.
- **Ghazi Pir** (508–513). This is place-level material through Sheikhupura District. It is set in "Setting"
  with "the book draws no connection between Ghazi Pir and Waris Shah".
- **Tahqiqat's Sheikhupura fort** (92–94) and **Khalid's "Sheikupura" route** (940). Both are framed in
  Setting as material about the district.
- **Province-level material, framed as about the province, the tale or the poem's world:**
  - Usborne annotator glosses (530–572), with seventeen notes used
  - Schimmel *Pain and Grace* p. 17 golden age (244)
  - Shackle p. 20 (309)
  - Abbas pp. 121, 124, 183–184, 188 (783–785)
  - Schimmel *Mystical Dimensions* pp. 415, 465 (925, 931)
  - Kugle p. 228 (596)
  - Bhandari pp. 512–511 (1141)
  - Kanhaiya Lal p. 10 (149)
  - Khalid *In Search of Shiva* p. 16 (1057)
- **Person-level**: Khalid *Walking with Nanak* p. 128 (946, 953).

## [OCR?] and uncertain readings carried into the prose

- `سوائے[OCR?]` in Kanhaiya Lal's preface (line 149). This is the only `[OCR?]`.
- Uncertain readings are stated in plain words:
  - Usborne's 1768 (425–428): "a year whose reading is uncertain in the printed text and appears to be 1768"
  - Panipat 1761 (430), given as 1761 without comment
  - the teacher's damaged name (384–385)
  - Abbas's birth year (725–727)
  - Rafat's damaged title "Mugamat-e-Waris Shab" (330, 337), given as *Muqamat-e-Waris Shah* with "the printed
    title being damaged"
- Text-layer corrections are used outside quotation marks:
  - Kheṛās (783)
  - Pirs (498–499)
  - Waris (394, 403, 499)
  - Mumtaz Hasan (908)
  - Ahmad Shah Abdali (537)
  - "unnecessary" (490)
  - "as" (501)

## Left out, and why

- **Hadiqat al-Awliya**:
  - The row's only item is a Sheikhupura index locator (line 53).
  - The editor's footnote on a "Ghulam Murtaza Qasuri" who migrated to Peshawar (line 66) is left out, as in the
    approved Bulleh Shah pilot. Nothing connects him to Waris Shah's teacher, and printing it would suggest
    they are the same man.
- **Tahqiqat**: Shah Jamal's chilla-place "شیخوپورہ" (92) was not mapped.
- **Usborne**:
  - The damaged name forms and running header (374–377) are left out.
  - The p. 57 repeat "Waris Shah, I have no capital of good works" (449) is omitted; I used the p. 56 version.
  - The Epilogue's lament "The country and the people have all been reduced to rump [ruin?]…" (572) is left out.
    Its page is ambiguous between p. 56 and p. 57, and the key word is damaged.
  - Unused glosses: Mauj Din, lassi, curds, Khojas, bhang, Sohni-Mahiwal (damaged), the mother's threat, the
    finger gesture, the ceremonial dish, basmati, 'King' and Nad (damaged), compliments, the snub nose, millet,
    Mehndhi, shaving, pearha (532–571). These are omitted for length only; each could be added.
- **Shackle**: the Doubt (284–288) that "Varis Shah" could in principle be another poet is not stated in the
  prose beyond giving his spelling.
- **Schimmel**:
  - The *Pain and Grace* index (217–220) and the striking Doubt (224–232) are not used. If you strike
    author-only bullets, these go.
  - *As Through a Veil*: the index for the romance (830), the Usborne bibliography entry that does not name him
    (833–835), and the refusal list (845–862) are not used.
  - *Mystical Dimensions*: the index lines (884–886, 912–913) and footnote 71's damaged Hoshyarpuri title
    (908–909) are not used.
- **Abbas**: the index (769–772) is apparatus only and is not used.
- **Khalid, *Walking with Nanak* p. 151** (938): a bare mention in an unspecified list.
- **Province blocks not used**:
  - Sharib, Shackle's *Risalo*, Sorley, Rizvi, Kasmani, Schaflechner, Werbner and Basu, Qureshi, Rozehnal,
    Dhillon, Madho Lal Hussein, and the Khalid and Rafat province blocks.
  - Bhandari, apart from pp. 512–511.
  - Shackle's province bullets on Bulleh Shah's times.
  - **Ernst and Lawrence p. 119** (Nizami Chishtis in eighteenth-century Punjab) and **Boivin pp. 217, 227**
    (Chishtiyya dominant in Punjab) are left out deliberately. Next to the current text's "Chishti" they would
    read as support for it.
  - **Eaton p. 227**: the Hans and Kharral clans (620) are not connected to "Kharal Hans", because the entry does
    not connect them.

## Needs Rauf's decision or a check

1. **The Shahmukhi line split** (see above).
2. **The complex's date.** The row's other cells say "Founded/Opened: 1978 (complex completed/opened)" and
   year_built 1978. That is in neither the current Description nor the entry, so the article does not say it.
   Should it go in?
3. **My English senses of Urdu prose** (line 149): "on the tongue of good and bad, small and great, rich and
   poor in the land of the Punjab" and "none but Punjabis could profit from them". The entry quotes the Urdu
   without glossing it. These senses are mine, resting on its "which is why he wrote his version in Persian".
4. **"the year 120 of the Bikramajit era"** (421–424). The entry does not say whether this sentence is the poet's
   or the annotator's. The prose calls it "a second reckoning on the last page" and attributes only the
   parenthesis to the annotator.
5. **Pairings resting on matching locators**:
   - The lamp vow (482) and the lamp note (565) are both p. 41 with marker/note 5. The prose says only "On the
     same page".
   - The Kandahar similes (539) and note 8 on p. 8 (537): "Of such lines".
   - The Gilani note and the superstition (414, 559) are both p. 31, note 7: "The same note".
6. **Rafat attributions.** Pp. 22 and 38 are given to "the introduction to Rafat's selection". The Source line
   names Khaled Ahmad as its author, and the entry's Doubt places p. 22 with him (343). The entry's bullets say
   only "Rafat".
7. **Bibliography forms**:
   - *Tarikh-e Lahore* follows the approved Bulleh Shah pilot ("Kanhaiya Lal Hindi, *Tarikh-e Lahore*.").
     The Source line is cut short and spells it "Tarikh-e-Lahore".
   - *A White Trail* is cut short in the Source line, so its item has no imprint.
   - *Khulasat al-Tawarikh* follows the Tilla Jogian pilot.
   - Usborne: "a later, unnamed annotator" comes from the Source line, as in the pilot.
8. **"Usborne's own note, as the annotator reports it"** (403, 435). The entry shows these two glosses as
   Usborne's, quoted inside the annotator's notes.
9. **New headings**: The Poet in His Poem, In Verse: The Mystical Key, Recitation and Song, and Setting:
   Sheikhupura District. Rename them as you prefer.
