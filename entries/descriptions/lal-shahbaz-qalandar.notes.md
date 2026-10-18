# lal-shahbaz-qalandar — review notes for the rewritten Description

Draft: `entries/descriptions/lal-shahbaz-qalandar.md` (134,595 characters; current cell 4,515). Checker
`pipeline/book_queue/check_description_draft.py lal-shahbaz-qalandar` exits 0 (548 citations, 15 books,
152 paragraphs). The largest `## ` section is "Where the Sources Disagree" at about 14,300 characters,
far under the 45,000 limit. Line numbers below are lines of `shrine_entries/lal-shahbaz-qalandar.md`.

## Current Description

Every sentence of the current text (the snapshot cell; the same prose stands at entry lines 7–37) is
kept, nearly verbatim, spread across the new headings. Edits:

- The shrine paragraph's first sentence ("Lal Shahbaz’s shrine at Sehwan … *langar*.") is split three
  ways: its first clause opens "The Shrine", "thronged year-round and overwhelmingly so at the annual
  urs" becomes "Thronged year-round, the shrine fills overwhelmingly at the annual urs." (opens "Devotion
  and Practice"), and the Sha‘ban clause opens "The Urs and the Mehndi". No claim was dropped.
- "That openness has also made it a target" became "The shrine's openness has also made it a target",
  because it moved to its own section, "The Attack of 2017".
- "The shrine is administered by the Sindh Auqaf department …" opens "Custodians, Lodges and the State".
- "— and, above all, the *dhamal*: …" became "And above all there is the *dhamal*: …", because the verse
  block now ends the paragraph before it. "whose refrain rings out … is sung —" now ends with a colon.
- **The two Arabic-script lines are split into hemistichs**, so that `ProseParagraphs.tsx` renders them
  as verse (a one-line paragraph renders as prose). The Haidari couplet is split at its own ٭ marker
  (the marker dropped). The Dama Dam refrain is split after "قلندر،", with the comma kept. Both
  hemistichs of each are verbatim from the current text.
- The two bracketed English renderings are now italic paragraphs, with the brackets and quotation marks
  removed. The wording is unchanged and carries no citation, as before.
- The heading "The Poetry and the Dhamal" is now "Poetry and Song"; "The Shrine and its Devotion" is
  divided as above.

All three current bibliography items are kept verbatim and first.

## Books cited (15)

Kasmani (*Queer Companions*), Boivin (*Hindu Sufis of South Asia*), Sorley, Rizvi, Abbas, Schimmel
(*Pain and Grace*; *As Through a Veil*; *Mystical Dimensions of Islam*), Schaflechner, Shackle (*Sufi
Lyrics*), Waris Shah (*Hir and Ranjha*, Usborne tr.), Khalid (*Walking with Nanak*; *In Search of
Shiva*), Werbner and Basu, and Bhandari (*Khulasat al-Tawarikh*, for the Setting only).

## Verse quoted

There are six set-off excerpts. Two are in Arabic script and both come from the current text; none of
the books carries Arabic-script verse for this row.

1. Haidari couplet, حیدریم قلندرم مستم / بندۂ مرتضیٰ علی ہستم, with the current text's English (current
   Description; entry line 19).
2. Dama Dam refrain, دَمادَم مست قلندر، / علی دَم دَم دے اندر, with the current text's English (entry
   line 25).
3. Verse "Hazrat Lal Shahbaz Qalandar is reported to have said of the dhammāl", Abbas p. 65 (lines
   2173–2178). It is given as lines 1–4 and lines 7–8, with the entry's own ` / ` divisions. **Lines 5–6
   ("I have become notorious in your love / I beseech you to come to me") are left out** so that the
   poem, which the entry may give whole, is not quoted entire. Rauf may restore them.
4. Reshma's melody, Abbas p. 94 (lines 2157–2160). The transliteration and the book's facing English are
   given as two italic paragraphs, the ` / ` divisions following the entry's pairs. The p. 94 form
   *Jhule Lālan* is used; the book also prints *Jhole Lālan* (line 2160).
5. "Thou giver of children to mothers / Thou giver of brothers to sisters", Abbas p. 57 (lines
   2166–2170). Only the English is given, because the transliterated lines have characters missing.
6. The Baluchi line "also Shahbaz, the generous to his friends …" as Sorley quotes it from Dames,
   p. 257 (lines 174–178). It is given as running text, with Sorley's identification of the poem's
   'Shahbaz' stated.

There are three inline verse quotations: *Alī dam dam de andar* / "Ali's name is the healing breath"
(Abbas p. 57, lines 2179–2181); Kasmani's chorus 'dam-a-dam mast Qalandar' and its gloss (line 1048);
and Usborne's Waris Shah lines (lines 431, 438–440).

## Disagreements listed (31)

1. Birthplace: Marwand, Afghanistan/Iran (current); Marwand near Tabriz (Kasmani, 606); Persia (Boivin,
   1324); a native of Sehwan (Rizvi, 514).
2. Birth year: 1177 only in the LC heading printed in Kasmani (588–591).
3. Death year: 1274 (current; Kasmani, 579); d. 1262 (Schimmel MDI index, 2342); 13th cent. (ATAV, 2261);
   "thirteenth century" (Sorley, 135, 339).
4. Arrival: 1272, 1251, 1263 Multan, "last year or two", "a year after" (Kasmani, 627–640), unjoined.
5. Route: Iraq, Hejaz, Central Asia (current) against Kasmani's Multan–Balochistan–Sindh stops (631–633).
6. Name: Sayyid Usman Marwandi (current); Sayid Usman 'Shah Marwandi (Sorley, 131); Kalandar Lal
   Marwandi (Parsram via Sorley, 201); Mir Saiyid ʿUsman (Rizvi, 514); Shah Hasan (custodians, 595).
7. "Lal": crimson robe (current); red dress (Rizvi, 523); Lal or Laʿl (Kasmani, 601–605).
8. "Shahbaz": freedom of spirit (current); a title from Bahauddin (Rizvi, 523–525); a miracle (Kasmani,
   604–605).
9. Order and master: qalandari way (current); Suhrawardi (Rizvi, 518–522); Suhrawardi/Qadiri/Savi
   (Kasmani, 612–626); Shah Sadr and Qalandariyya shahbaziyya (Boivin, 1328–1342); Malamti (Khalid,
   2430).
10. Four friends with Farid and Bahauddin (current); quartet unnamed (Kasmani, 616–617); "serious
    differences" (Khalid, 2430); Bahauddin "disliked qalandars intensely" (Rizvi, 519).
11. Burial: Sehwan; "in Sind" (Rizvi, 528–532); "saint of Uch" / "buried in Sind" (Waris Shah, 449–452).
12. Other names: Jhule Lal (Kasmani, 662); Raja Bharthari/Barthari/Vir and the refused fusion (Boivin,
    1347–1363); Jivelal, Udero Lal (Sorley, 216–221, 238–254).
13. Poems: Persian (current); "alleged diwan" (Boivin, 1325); grammar books (Sorley, 145–157).
14. Dama Dam: whose song it is and how it is rendered (current; Kasmani 1043–1049; Abbas 2179–2183;
    Boivin 1577).
15. When the dhamal is danced: Thursdays and urs (current); daily at or before sunset (Boivin, 1607–1613);
    every evening (Kasmani, 1007–1010; Abbas, 2068).
16. Drums: *naqqara* (current); *naubats* (Abbas, 2070); "the drum and the metal disc" (Kasmani, 719).
17. Urs month and length: Sha‘ban (current); 18–20 Shaban (Boivin, 1492–1493); Shawwal 18–20 (Schimmel
    MDI, 2368); three-day (Kasmani, 981); more than a week (Abbas, 2120).
18. Numbers: hundreds of thousands (current); millions a year (Kasmani, 665–666); thousands (Parsram,
    201); hundreds at the dhamal (Boivin, 1609).
19. The 2017 attack: "scores" (current); more than eighty (Kasmani, 809–811); ninety killed, more than 300
    injured (Boivin, 1739–1742).
20. Takeover: 1960 / 24 June 1960 / June 1960, under the 1959 ordinance (Kasmani, 847–866); "1960s"
    (Boivin, 1396). Not harmonised, per the Doubt at 1279–1283.
21. The site before the shrine: Schimmel (2356–2360), Khalid WwN (2438), Boivin (1402–1404) and Kasmani
    (766–775).
22. District: Jamshoro (the row's location, as the entry reports it at 1894–1895) against Dadu
    (Schaflechner, 1892–1893).
23. Lodges: fourteen (Kasmani, 912–922) against about twenty (Boivin, 1420).
24. Mulchand's tomb: west (p. 75) against east (p. 180) (Boivin, 1405–1415).
25. The Hindu mehndi families (Boivin, 1516–1526; Schaflechner, 1901–1907).
26. The Mulchand Kafi succession, nephew or cousin (Boivin, 1527–1546).
27. The Kanungos' migration, 1962 or 1981 (Boivin, 1547–1558).
28. The Lal Kunwar: Burton's version, the "other sources" and Kasmani's (Boivin, 1672–1687; Kasmani,
    1003–1006).
29. Faqiriānī, muridīānī and Murīdīānī (Abbas, 2087–2098).
30. When the women singers come (Abbas, 2133–2139; 2127).
31. Reshma's discovery: "in the sixties" or "the late sixties" (Abbas, 2148–2151).

## Hedged pointers, and context framing

- **Sorley's Udero Lal parenthesis** (lines 238–254): given only as Sorley's words, with his index
  cross-reference, and the statement that he gives no ground and that the equation rests on that
  parenthesis and that cross-reference. **No identification of rows is implied.** 'Jivelal' is given as
  printed, with Sorley's gloss and no equation to Jhulelal (lines 216–221, 251–254).
- **Sorley's four grammar books** (lines 145–157; Doubt 256–261): given as Sorley's attribution, with
  "No other source consulted mentions these works, and the attribution rests on Sorley alone." The
  damaged third title and the damaged language name are described as damaged, not repaired.
- **Waris Shah / Usborne** (Doubt 449–455): given as a hedged pointer in "Poetry and Song", ending
  "whether the poem's saint of Uch is the saint of Sehwan the book does not settle", and in
  disagreement 11. **The Doubt says "A human must resolve this before any bullet enters the row". Strike
  both passages if Rauf prefers.**
- **Khalid, *Walking with Nanak*, p. 32** (line 2438): the shrine is unnamed there, so the sentence is
  introduced with "without naming the saint".
- **Boivin's Jhulelal**: his own refusal of a fusion (1360–1363) is quoted beside every Jhulelal item.
- **Setting** opens "What follows speaks of the town and its region, not of the shrine." It draws on
  Kasmani's town material (664–672, 777–784, 1096–1102), Abbas (2196–2203), Boivin's place-level block
  (1761–1793), Schaflechner (1989), Rizvi's Khanqah-i Muhammadi, explicitly "not this shrine" (551), and
  Bhandari (2493–2505).
- **Province-level material used as context**: Sorley on six Talpur madressas (325), the Jelali and
  Jemali darwishes (337) and the thirteenth century (339); Abbas on the regional 'Mast Qalandar' dhun
  (2233).

## [OCR?] carried into the prose

There is one: محمد صالح ترخان[OCR?] (Bhandari p. 50, line 2501).

## Line-break hyphens and damaged words

- **Kasmani's gloss "ev-ery breath is intoxicated with Qalandar"** (line 1048) is given in italics as
  *every breath is intoxicated with Qalandar*, with the line-break hyphen removed. It is not in quotation
  marks, so the checker does not test it. **This is the one place where I repaired the wording; Rauf
  should confirm it.**
- Hyphens of the same kind, in "mauso-leum" (707), "di-vine" and "polythe-istic" (1235–1237), "mu-sic",
  "coun-try" and "res-cue" (1046–1052), "asso-ciated" (876), "Depart-ment" (852) and "assem-blage"
  (1035), are kept out of every quotation. The sentences are either quoted only up to the damage or
  paraphrased. "polytheistic" stands outside the quotation marks.
- **"t<?mh"** (lines 202, 210–211; the entry says it "MUST be checked against the PDF before
  quotation"): I did not quote across it. The prose says "camped round the tomb (the word is damaged in
  the printed text)", following the entry's own reading of the word as "tomb". **Rauf should check this
  against the scan.**
- Boivin's "giratory [text-layer? gyratory]" (1667) is paraphrased as "gyratory", outside the quotation.
- Rochaldas's "ishq majuzi [text-layer? ishq majazi]" (1376–1379): I wrote *ishq majazi*, the form the
  same page prints eleven lines earlier, outside quotation marks. **Rauf to confirm.**
- Kasmani's backticked forms (`Lahut-lamakan`, `sajjadah-nashin`, `she-camel`, `fourteen-kafi`,
  `Lal-kunwar`, `mid-twentieth`, `twenty-five`, `ever-extending`) are given in plain prose, outside
  quotation marks.

## Left out, and why

- **Province-level only, nothing on the site**: Lahori (54–63), Chishti (64–73), Kanhaiya Lal (74–83),
  Sharib (84–93), Shackle's *Risalo* (94–119), Rafat (411–420), Madho Lal Hussein (471–480), Kugle
  (481–491), Eaton (492–506), Rozehnal (2243–2253) and Khalid's *A White Trail* (2450–2463). The same
  applies to the other books' Sindh blocks, apart from the items named above.
- **Index-only material**: Sorley's index runs (179–189) and his "Murad Buksh Shah (See Lal Shahbaz)",
  which collides with a different saint (227–231); the index lines of Pain and Grace (354–356), Rizvi
  (533–539), Kasmani (575–576, 625–626, 646–647, 994–996), Boivin (1481–1489, 1652–1656) and Schaflechner
  (1936–1938, 1974–1980); and Schimmel MDI's separate "Marwand, 355" (2350–2351), its Abu ʿAli Qalandar
  cross-reference (2352–2354) and its *Malang* gloss, which the place-level block marks as declined
  (2372–2373, 2396–2397).
- **Shackle's two invocations of the Five Pirs** (line 404): the entry prints them as "p. 122 (folio 97)"
  and "p. 136 (folio 111)". That form cannot be cited in the brief's format, because nested parentheses
  break the citation pattern and "p. 122, folio 97" does not occur in the entry. Only the note
  (p. 186, folio 161, n. 2 on 122) is cited. Shackle's Bu Ali Qalandar (405–409) is not this saint.
- **Kasmani**:
  - "is believed to be their place of meeting" for Chothanbi (801–803): whose meeting place is not
    stated.
  - Figure captions, the unreadable town map, and every spatial relation on Map 3.1 (1293–1297). Only
    the plan's labels are listed, and no topographic claim is made.
  - The Bodlo-kafi institutional matters (1246–1251) and Murad's *wardi* dispute (1285–1291).
  - The prayer corners, the Shiʿi prayer room and the later "prayer room" are each quoted where they
    occur, and **are not said to be the same structure or different ones** (Doubt 1289–1290).
  - Amma's prayer about menstruation (1195–1197) is given only as "a prayer granted, which Kasmani
    reports without judging". **Rauf may expand or drop it.**
- **Boivin**:
  - His general definition of the urs (1500–1504): the entry says it is unclear whether it describes
    Sehwan or Ulhasnagar.
  - Dadi Dhan's versi (1648–1651): the book does not say whom the song names.
  - The Thano Bula Khan / Jamshoro sentence (1794–1802): it is not about Sehwan.
  - Several minor place-level clauses (Nandirani Merani, Paru Chawla's departure, the small-city example).
- **Abbas**: her destroyed fieldwork year (2113–2116), the interviews whose years are destroyed (2206),
  and the index (2061–2063).
- **Schaflechner**: the untranslated original of Raj Kumar's interview (1926–1927).
- **Bhandari**: the Khankhanan's allies, Jani Beg's peace (p. 174), Jalal al-Din's flight (p. 399), the
  Indus's course (p. 510), the Firuzpur distance (p. 525) and the lake منچور[OCR?] (p. 529). These are
  left out to keep the Setting short; a few of them could be added.

## Needs Rauf's decision or a check

1. **Waris Shah pointer** (see above). Keep it or strike it.
2. **Sorley's grammar books**: keep them as Sorley's attribution, or drop them until checked.
3. **Length**: 134.6k characters, against 4.5k now. Every section is under 15k, so the splitter can
   handle it, but much of the bulk is long verbatim prose quotations from Kasmani (2022) and Boivin
   (2019). Rauf may want the longest of them (the ghusl, the mehndi succession, the legends) shortened
   to excerpts.
4. **Row cells, not changed here**:
   - `year_built` 1356 is not in the entry or the Description; Kasmani gives a first mausoleum "as
     early as 1357" (line 680).
   - `silsila` "Qalandari" is contested by Rizvi, Kasmani and Boivin.
   - `Events` "Thursday-evening dhamal" sits against the books' daily dhamal.
   - `figure_born` 1177 occurs only in the LC heading.
   - The entry's header (line 2) notes a second sheet row, "Sehwan Sharif", for the same shrine.
5. **Citation titles**: Shackle is cited as *Sufi Lyrics* and Khulasat without diacritics, as in the
   tilla-jogian pilot. Abbas is cited with "The" (*The Female Voice in Sufi Ritual*), which is a
   substring of both the heading and the Source line.
6. **"Charles Frederick Usborne"** appears only in the bibliography, because it comes from the Source
   line, not the entry. The prose says "Usborne".
7. **Bhandari bibliography**: "composed in regnal year 40 of Aurangzeb" is taken from the Source line,
   which hedges it "as the notes report it", as in the pilot.
8. **Checker**: no problem with the checker itself. It tests only double-quoted English quotations of
   six or more words. I checked every other quotation (single-quoted, and anything under six words)
   against the entry with the checker's own `norm()`. All of them occur there, apart from the spacing
   in Sorley's "the ' living Pir '".
