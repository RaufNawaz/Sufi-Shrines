# shrine-of-fariduddin-ganjshakar — review notes for the rewritten Description

Draft: `entries/descriptions/shrine-of-fariduddin-ganjshakar.md` (194,191 characters; current cell 5,656).
Checker `pipeline/book_queue/check_description_draft.py shrine-of-fariduddin-ganjshakar` exits 0 (765
citations to 24 books, 145 paragraphs). Line numbers below are lines of
`shrine_entries/shrine-of-fariduddin-ganjshakar.md`.

## For Rauf's decision

1. **Length.** 194k characters, about 2.7 times the Bulleh Shah pilot. Everything in it is from the entry
   (547 KB, the largest I have seen) or the current text. No section is near the 45,000 limit: the
   largest are "The Life of the Saint" (22.1k), "Where the Sources Disagree" (21.8k) and "At Ajodhan"
   (20.9k). I split the life across two headings ("The Life of the Saint", "At Ajodhan") so that no
   section came near the limit. If it is too long, the easiest cuts are: Eaton's economy detail in
   "Custodians, Patrons and the State" (marriage counts, Mughal revenue, the 1757/1776/1810 episodes);
   the Rozehnal dream and vision stories in "Legends and Miracles"; and the "Other Places" section.
2. **Death year on the live sheet.** The snapshot's `figure_died` cell reads **1265**, but the current
   Description says "(c. 1173–1266)" and "He died at Ajodhan in 1266". The entry's Doubts all compare the
   books with "the archive row's 1266" (lines 755–758, 817, 1219, 1911–1915, 2952). The draft keeps the
   Description's 1266 and lists every book's reading beside it. The cells are not changed here.
   `Founded/Opened` = 1280 is supported by nothing in the entry, and the draft does not use it.
3. **Sharib's material is claim-noted** (line 422), and the three readers of his book disagree about the
   mapping (D1, lines 742–753). His chapter 8 names Pak Pattan twice (lines 519–528), so I use it as
   Sharib's account. The disputed portions are given with the doubt in plain words:
   - the "قاضی بچہ" / Kahtwal pomegranate passage (pp. 35–36) as "Another chapter of the same book, which
     places him only at کہتوال";
   - the Ajodhan chapters (pp. 78–92: Sabir, the countersealing at Hansi, the *kaniz*, Burhan al-Din, Hasan
     Qawwal, Shams al-Din Turk) as "Sharib's chapter on Sabir, which places Baba Farid at Ajodhan" and "in a
     chapter that places Baba Farid at Ajodhan".

   If D1 is resolved against the mapping, those sentences go.
4. **Qureshi's material** (lines 3204–3334) is a name-hit, not a site-hit. Its Doubt says "a human should
   confirm this before any of it enters the Pakpattan entry" (line 3320). I used it because the book's own
   discriminators fix the man (Nizamuddin Auliya's "spiritual guide"; Table 18 "d. 1266, Pakpattan"). It
   appears in these places:
   - Disciples (the glossary);
   - The Shrine (Table 18);
   - Devotion (the Delhi anniversary);
   - In Verse (two Khusrau song excerpts);
   - Other Places (the Delhi Chilla);
   - two disagreements.

   I left out the bare "Qutab Farid mil ae barati" (lines 3278, 3322). **Confirm or strike.**
5. **Ernst and Lawrence's Ajodhan-only sentences.** Their Doubt (lines 2422–2428) says the "Ajodhan
   hospice", the karil grove and the mosque-minaret classroom should not enter as statements about
   Pakpattan. I left out the hospice and the classroom. The karil grove and the "settled in Ajodhan"
   passage (p. 167) are in "At Ajodhan" as statements about Ajodhan in the saint's life, not about the
   shrine. **Strike them if even that is too close.**

   The two bare-name bullets (p. 47 zikr formula, p. 57 Simnani's list; line 2405) are used only as
   person-level, never as evidence about Pakpattan.
6. **Rizvi never equates Ajodhan with Pakpattan** (lines 2459–2462). His material is given as Ajodhan,
   and the draft says so once ("Rizvi, who calls the town only Ajodhan"). This includes the funeral
   passage (p. 168), where the coffin is brought inside the walls.
7. **Rozehnal's annuity figures** (1,500,000 against 150,000 rupees, line 3458) are quoted as printed. The
   Doubt (lines 3720–3724) asks for a check against the page.
8. **The Waris Shah "Fairs of Pakpattan" sentence** (line 994) rests on the place alone. Its Doubt says
   "Confirm before the fair material enters the row" (lines 1024–1029). I gave it as a hedged pointer:
   "a sentence that names the place but not the saint". **Keep or strike.**
9. **Abbas p. 203** (Lorraine Sakata behind a pillar) names only the place and "the shrine"
   (lines 3183–3186). It is given with exactly that caveat.
10. **"O Living one, O Eternal one!"** (Ernst and Lawrence p. 169, line 2138). The text layer prints `0`
    for O. I used the entry's corrected [O] inside single quotes, so the checker does not test it.
11. **"Lieutenant F. Mackeson's journal of Captain C. M. Wade's voyage of 1832–33"** names the 1833
    account from Eaton's footnote (lines 1449–1451). Rozehnal calls it an unnamed "1833 European
    account" (line 3432).
12. **Citation forms.**
    - Shackle is cited as *Sufi Lyrics*, as in the pilots.
    - Kanhaiya Lal's and *A White Trail*'s Source lines are cut off in `out/descriptions/book_sources.md`,
      so their bibliography items carry the title only (pilot form).
    - Lahori citations keep the entry's "[marker N]" in the page reference, as the entry prints it.
13. **The section heading change.** The current "The Shrine and the Bahishti Darwaza" is split:
    - its first two sentences open "## The Shrine";
    - the Gate sentences open "## Devotion and Practice".

    "Devotion and Legacy" is now "## Legacy", and "Teaching and Poetry" keeps its name.

## Current Description

Every sentence of the current text is kept verbatim, redistributed under the new headings. The edits:
- curly double quotes became straight;
- the two bracketed shloka translations `[“…”]` became italic paragraphs (the quotation marks kept, no
  citation, as the current text has none).

The three current bibliography items are kept verbatim and first.

## Books cited (24)

Lahori, Nur Ahmad Chishti, Kanhaiya Lal, Sharib, Schimmel (*Pain and Grace*, *As Through a Veil*,
*Mystical Dimensions*), Shackle (*Sufi Lyrics*), Rafat, Waris Shah (Usborne), Kugle, Eaton, Ernst and
Lawrence, Rizvi, Kasmani, Werbner and Basu, Abbas, Qureshi, Rozehnal, Khalid (*Walking with Nanak*,
*A White Trail*, *In Search of Shiva*), Dhillon, Bhandari.

Not cited, because they have only province-level blocks for this row:
- Shackle *Risalo* (line 766);
- Sorley (776);
- Madho Lal Hussein (1086);
- Boivin (3010);
- Schaflechner (3026).

No province-level context block is used.

## Verse quoted

Original-script verse blocks (2), both from the current Description: the crow *shloka* and the "فریدا جے
تُوں عقل لطیف ہیں" *shloka* (entry lines 21–22, 26–27). Each is followed by the current text's own English
in italics.

Italic English excerpts (9). ` / ` is used only where the entry prints the line division.
1. Rizvi's renderings of two *dohas*, as two single-line excerpts (p. 350, lines 2899–2901). The
   Devanagari originals are destroyed in the text layer and are not given.
2. Khalid, "I did not sleep with my love tonight / And every bit of my body aches" (p. 138, line 3927).
3. Waris Shah's Invocation in Usborne's English (p. 2, lines 1002–1003), with the "4" note marker dropped.
4. Qureshi, Khusrau's "In the name of Ganj-e-Shakar / Protect our honour (Nijam, Beloved)" (p. 46,
   lines 3276–3277), with the transliteration given inline.
5. Qureshi, "In the likeness of Ganj-e-Shakar [see note 6 above], the dear Beloved is asleep" (p. 51,
   line 3283), the bracket being the book's own.
6. Abbas, "Give thy head, expect no loyalty in return— / O, this is Farid, the Saint's wisdom" (p. 10,
   lines 3146–3147), with the p. 88 transliteration inline.
7. Abbas, "O lover Farid, alive were those habitations once—may God bring the wilderness to life again!"
   (p. 88, lines 3142–3144), as running text.
8. Rizvi, the verse recited against Sher Khan, "'Alas! You have no knowledge about me; / When you would
   gain knowledge about me, you would repent.'" (p. 163, lines 2744–2746).

Original-script verse given inline, not as verse blocks. These are fragments (single hemistichs or
phrases), and one carries `[illegible]`, which the verse-block shape cannot hold.
- The *Tahqiqat* versified chain: "از کمال نور[OCR?] رخ و ہمچون فرید الدین شدی" and "صد ہزاراں [illegible]
  شکر بار[OCR?] آمدے" (pp. 36–37, line 327).
- The *Tahqiqat* chronogram line "بامدادِ[OCR?] فرید الدین شکر گنج" (p. 38).
- The *Tahqiqat* *qit'a-e tarikh* words "گنج ٭ شکر ٭ گنج شکر" (pp. 234–235, line 325). No encoded year is
  stated, so none is given.
- Lahori's chronogram refrain "فردے یگانہ فرید" (line 154). The chronogram itself is not quoted in the
  entry.
- The torn-certificate saying in three forms (lines 175, 474, 581).

Not quoted, because the entry does not give the text:
- Khalid's "If someone smites your face, O Farid …" and "You did not launch your boat …", which are
  truncated (line 3927);
- Bayram Khan's four-line poem (line 2350), mentioned only.

## Disagreements listed (36)

1. Birth year (lines 76–85, 450–452, 2465–2468, 885–891, 3923, 3983).
2. Death year (86–89, 325, 503–506, 801–806, 885–894, 1050, 1116, 2056–2069, 2471–2476, 2982, 3217,
   3359–3364, 3756, 3823–3826, 3983, 4145).
3. Age at death: 95, ninety, 93 (2070, 1285, 80–82).
4. Century: 12th against 13th (892, 3228, 3372, 4058, 4014).
5. The name of the birthplace (118, 260–261, 442, 2484, 3923, 4141).
6. Who came from Kabul, and who Qazi Shuaib was (90–125, 109–113, 440–443, 2482–2485).
7. The father's name: جلال against Jamal (4141).
8. The mother's name, and Bibi Sharifa as mother or daughter (126–128, 444–445, 2101–2104, 2244–2248,
   2554–2558).
9. The age and place of initiation (460–474, 2498–2506, 4142).
10. Whether he followed his master to Delhi at once. The current text says he did; Sharib, Rizvi and
    Bhandari differ (469–471, 479, 2502–2505, 4142–4143).
11. Who succeeded Qutb al-Din (2533–2540, 3828).
12. Where, and on what timing, he did the inverted *chilla* (2516–2527, 2273–2276, 1152–1157, 3836–3842,
    4081).
13. How he came by "Ganjshakar" (680–689, 2782–2790, 2277–2283, 3869–3872, 4154, 4059).
14. The renaming and its meaning (1322–1324, 3852, 3924).
15. Where Pakpattan lies, including Dhillon's "near Sirhind" (1315–1316, 3983, 3992).
16. Length of residence at Ajodhan (1287–1290, 2472).
17. Who offered villages (612–619, 2721–2727).
18. The Balban marriage (620–622, 2764–2768).
19. Wives and children (497–502, 2548–2556, 3843).
20. The tokens that passed to Nizamuddin (1116–1117, 1162–1167, 544–548, 2660–2663).
21. The number of khalifas (2648–2653, 3862, 540–543).
22. Sabir (173–179, 573–585, 1174–1194, 2572–2574, 2087–2090).
23. Writings (228–233, 513–515, 2866–2872, 2256–2263).
24. Whether he composed in Punjabi (3925, 3877–3883, 2541).
25. The Granth *shlokas* (2903–2917, 896–907, 3987, 4015).
26. The building and the ground (330, 4065, 3930).
27. Which building is the great one (1335–1345, 1936–1940, 4067–4068).
28. Whether every power honoured the shrine. This sets the current text against Eaton's Khaljis and
    Ranjit Singh (1798–1799, 1615–1617).
29. The name of the Gate (1346–1351, 1941–1944, 3426, 330).
30. Where the Delhi Chilla stands (3329–3332).
31. Ibn Battuta's visit: 1334 against c. 1340 (1472, 2203–2206).
32. Who comes to the shrine now (3937, 4077, 3421–3424).
33. Women at the qawwali (3128–3130, 4076).
34. The court case's dating and the Fagan report's date (1916–1920, 1952–1955).
35. The 2001 death toll and blame (3475–3479, 3486–3498).
36. Conversion claims against Eaton's and Rizvi's doubts (1855–1865, 3884, 2716–2720, 2852–2854).

## Pointers given in hedged form, and context framing

- **Kallar Kahar spring** (Werbner and Basu, lines 3063–3091): given in "Other Places", with the sentence
  "which Lukas Werth describes without saying whether this is the saint of Pakpattan".
- **Tibba Haji Deen, Chistian, Tibba Nanaksar, Lahore (Farid Astana, Data Darbar chillas, the takia),
  Delhi, Ajmer, Khuldabad, Faridkot, Uch** are in "Other Places", introduced as "none of them is this
  shrine" (lines 3920, 3950, 322, 364–373).
- **Kanhaiya Lal**: the contents locator "چلہ بابا فرید گنج شکر[OCR?]" is given with "the name and page
  uncertain in the printed text" (lines 365, 369–373).
- **Eaton's subordinate-shrine list** is "a single witness's claim" (line 1981). The crowd figure is
  undated, and the langar wheat figure is one kitchen worker's estimate (lines 1945–1947, 1967–1976).
- **Eaton's conversion argument** is "among his grounds", because his full argument is not in the entry
  (lines 1930–1935). Table 9.1 is not used (lines 1921–1929).
- **Lahori's Kothewal annotation** "names no saint itself" (lines 114–119, 280–282).
- **The Multan chairs**: the draft says the text does not make clear who spoke (lines 209–210, 264).
- **Aban Shah** (Khalid, line 4090): one sentence in "Setting", as a different shrine near the town.

## [OCR?] carried into the prose

43 flags, all as the entry prints them:
- Lahori: کتہوال, چندے, غز, جھاولی, the بلبن of Aslam's title.
- *Tahqiqat*:
  - اجودہن, Pak Pattan, گذرا / بیس, میانہ, انو, سی;
  - حتی / قیوم, ۶۶۳ (twice), مفتی / سرور, the chain lines, بامدادِ.
- Sharib: نجندی, اعزا الدین, تیس, متقی, ویلہ (also on *vela*), چارہ, النمان, نہرزہ (twice), شارو, سکرے,
  سنی, دوستی, غرہ, کہتوال.
- Kanhaiya Lal: شکر (chilla), تکیہ.
- Rizvi: "Sharia'a [OCR?]" in the zakat quotation.

## Left out, and why

- **Lahori**:
  - Index locators and "فرید ثانی" (lines 70–75), and the neighbouring Chishti locators (253–255).
  - The Shah Maruf *shajara* (145–146).
  - The undated "اسی دربار" row (147–149, 265).
  - The Najib al-Din errand that does not match its execution (262–263); the courier role is kept.
  - The three source titles for the family (251–252).
  - The Sohan Majzub death year (214).
- **Tahqiqat**:
  - The not-mapped names (line 322).
  - The author's own family claim, with a flagged name (328).
  - Bare names in chains (pp. 205, 217–218, 348, 434).
  - The p. 759 literary reference, and the p. 230 khalifa lines.
- **Sharib**:
  - The three-title formula (lines 436–438), which the entry says is the book's register, not a fact.
  - The Significance block on the source base (723–738).
  - The "twelve years at Hansi" with an unstated subject (482–484, D10).
  - Sabir's lamp detail (577–578).
  - Doubts D9, D11 and D13 are referred to in the entry but their text is not in it (lines 452, 502,
    548), so I could not reflect them. In particular, the داماد against دادا[OCR?] reading behind
    "son-in-law" is not flagged in the prose. **Rauf may want a plain-words caution there.**
- **Schimmel *Pain and Grace***: the place headword "Pakpattan 12" (line 809).
- **Schimmel *Mystical Dimensions***: the five-name list (3896), the Nizami-title footnote (3898) and the
  index office line.
- **Schimmel *As Through a Veil***: the place headword (3764–3765).
- **Shackle**: the three unresolved Farid items (lines 851–858).
- **Rafat**: the Granth contents line (p. 41); the "preceptor-beloved" and "three predecessors" remarks
  (pp. 45, 25).
- **Waris Shah**: the Five Pirs list in note 10 (line 1014).
- **Kugle**:
  - The index forms (1106–1110).
  - The other terms of the ascension oath (1141–1145).
  - The Sabiri chain that bypasses him (1196–1202).
  - The "upon his death" oddity is reflected only in the tokens disagreement (1214–1217).
- **Eaton**:
  - The publication history of the essays and the map (1253–1259).
  - Table 9.1 (1921).
  - The Hans/Dhudhi alliance counts (1753–1755). The Khokhar sub-counts are quoted, but the 3 + 6 ≠ 13
    discrepancy (1756, 1948–1951) is not remarked in the prose.
  - Garbled quotations: n. 37 "M[uh]ammadans" and n. 68 "declar[e]".
  - The 'Ala' ad-Din / Mauj Darya collision note (1994–2012), which is irrelevant to the prose.
- **Ernst and Lawrence**:
  - The "Ajodhan hospice" and the minaret classroom (2169–2171), per their Doubt.
  - The sayyid-status sentence (2110–2116).
  - The Persian manuscript leads (2392–2401).
  - Most bibliography leads; Mohana Lala, Irving and Eaton are named in Legacy.
- **Rizvi**:
  - p. 200, the tombs at Ajmer and Ajodhan (2603–2606), whose attachment the entry hedges.
  - p. 196, a precedent with no content (2737).
  - p. 192, the "(Baba Farid)" gloss and the thronging (2680–2688).
  - Saying 5, which has lost its numeral (2639).
  - The plate caption (2934–2938) and the index satellites (2927–2933).
  - p. 26 *tabaqa*, p. 353 dohas corpus, p. 330 and p. 243.
- **Kasmani**: the References line (2986).
- **Werbner and Basu**: Werth's "This famous saint (see Eaton 1984)" and the Eaton titles (3051–3062).
- **Abbas**:
  - The unmapped p. 118 Farid (3177–3181).
  - The four-word endnote (3171).
  - The destroyed dates (3110–3119).
  - The repertoire lists (pp. 54, 98, 99, 111).
- **Rozehnal**:
  - The English dervish (3640–3642).
  - The "ninth of Muharram" dream date, which has no year (3645).
  - Maqsuda Begam's visions (3685–3687).
  - The index locators.
- **Khalid**:
  - *Walking with Nanak*: the truncated poems (3927); the Uch meditation rooms (p. 283); the ridicule by
    the elite (p. 128); the Tibba Haji Deen gurdwara (3950).
  - *A White Trail*: the framed picture (p. 188), the bangle vendor (p. 61) and Nadeem's *'urs* visits
    (p. 219).
  - *In Search of Shiva*: Lakhewali Haveli and "Fareed Gharib" (4090, 4094); the Chistian guide and
    endnote 93 (4062).
- **Khulasat**:
  - The not-mapped index names (4138).
  - The bare index locators (4156).
  - The "many people benefited" line (4150).

## Small wording decisions to check

- "In Sharib's telling his father died before he came to his senses" follows the entry's own gloss
  (line 459).
- "Sharib's account runs close to it" (food at Ajodhan) is my comparison of Rizvi p. 159 and Sharib p. 63.
- "Ernst and Lawrence, through Thanvi, attach a like saying to Bibi Sharifa the mother" juxtaposes
  Rizvi p. 168 and Ernst p. 135. Neither book makes the comparison.
- The Arabic-script quotations that the entry does not gloss are given without an English rendering:
  - Lahori's description of the mother (line 127);
  - the brothers' "یگانہ" line (94);
  - Bhandari's birthplace line (4141);
  - the Faiz Bakhsh *'urs* food line (186);
  - Sharib's "قدم بوسی" reply (468).
