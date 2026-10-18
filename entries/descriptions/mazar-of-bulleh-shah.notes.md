# Review notes: `mazar-of-bulleh-shah` Description rewrite

Draft: `entries/descriptions/mazar-of-bulleh-shah.md`. Brief: `docs/prompts/DESCRIPTION_REWRITE_BRIEF.md`.
Material: `shrine_entries/mazar-of-bulleh-shah.md` (line numbers below are that file's), and the current
Description from `data/snapshot_2026-10-08_post-import.csv`. Checker: `check_description_draft.py` exits 0
(71,779 characters, 295 citations to 18 books, 87 paragraphs; current text 4,552 characters).

## For Rauf's decision

1. **Length.** 71.8k characters, nearly five times Data Darbar's ~15k. Everything in it comes from the
   entry or the current text. The bulk is Shackle, Rafat/Khaled Ahmad, Abbas and Sharib. If it is too
   long for one cell, the easiest cuts are: the `## Where the Sources Disagree` bullets that repeat
   quotations already given in the narrative (corpus size, burial, fabric), Boivin's four Sindhi
   mentions (lines 1224–1233) and the Setting paragraph on Kasur's founding legends.
2. **Death year: every reading shown, no verdict** (as you asked). Two of the readings come with
   Doubts that say not to use them without checking: Schimmel *Mystical Dimensions* 1752 (Doubt at
   lines 1612–1616: "Do not let `1752` into a Bulleh Shah entry without the page image", because the same
   index prints 1752 for Shah Abdul Latif two pages away), and *As Through a Veil* index 1754 (lines
   1525–1527, 1538: "a human must reconcile them before either enters an entry"). I put both in the
   list. 1752 carries a plain-words caution ("this reading needs checking against the printed page")
   and 1754 is marked as index-only. *Pain and Grace* prints 1752 in body text separately (line 482).
   Keep, or drop the two flagged readings?
3. **Live sheet cells disagree with the current Description.** `figure_died` = 1758 and
   `Founded/Opened` = 1757, but the Description says "c. 1680–1757". The draft keeps the Description's
   1757 and lists the books' 1758 beside it. The cells are not changed here.
4. **Thin mappings I used:** Shackle's *Risalo* (Doubt at lines 456–461, which says a reviewer "may prefer
   to demote"), cited at pp. 12, 14, 23, 326, 339 as comparison only. Schimmel *As Through a Veil* and
   *Mystical Dimensions*: the Doubts at 1540–1557 and 1618–1620 call these bare bibliography entries,
   but both sections also have body-text statements (lines 1490–1498, 1577–1605), and those are what I
   cite. Khalid *A White Trail* (Doubt 1722): I cite only p. 63 (the shrine named) and p. 71 (Kasur
   place-level).
5. **Citation and bibliography forms the checker forced, or that needed a choice:**
   - Shackle's Bulleh Shah volume is cited as *Sufi Lyrics* (its Source-line title), not as the heading's
     "Bulleh Shah: Sufi Lyrics". This is so the bibliography item, built from the Source line, carries the cited
     title (check B2).
   - Kanhaiya Lal: `book_sources.md` cuts the Source line off at "*Tarikh-e-Lahore". The bibliography
     gives the heading's form "*Tarikh-e Lahore*" so that it matches the citation. Haroon Khalid, *A White
     Trail*: that Source line is also cut off, so the item has the title only.
   - Alam's translation is cited under the heading's author, "(Madho Lal Hussein, *Verses of a Lowly
     Fakir*, …)". The prose names Naveed Alam as translator.
   - Hadiqat citations keep the entry's "[marker: N]" in the page reference. The editor's footnotes
     (حاشیہ 1, 2) are described in the prose as footnotes and are not put into the page reference.
6. **The current bibliography's last two items** ("Bulleh Shah, *Kafian* … standard published wording";
   "General established histories of Punjabi Sufi poetry") are kept verbatim as required. The entry's
   own reference note (line 53) still says "confirm Shahmukhi orthography before publishing" for the
   three Shahmukhi lines the current text carries. They are reused unchanged and are still unverified.
7. **Left out as sensitive or prone to misreading** (your call):
   - Iqbal Qaiser's continuation "but that changed when Mumtaz Qadri murdered Salman Taseer" (line 1759).
     Only "Bulleh Shah was a Qadri." is quoted.
   - Lahori's editor's footnote on a "Ghulam Murtaza Qasuri" who migrated to Peshawar and answered
     Ahmad Shah Abdali (province block, line 247). It has the same name as Bulleh Shah's teacher, but
     nothing in the entry connects the two, and printing it would suggest they are the same man.

## Disagreements listed (16 bullets under `## Where the Sources Disagree`)

Death year (current c. 1757; Lahori author 1180 AH / editor alive 1181 AH; Sharib 1171 AH; Shackle
d. 1758, chronogram AH 1171 = 1757 or 1758, CIP 1680?–1758?; Shackle *Risalo* 1758; Khaled Ahmad and Rafat
1758; Alam 1680–1758; Schimmel 1752 (×2 books) and 1754; Abbas years illegible) · birth (date and place) ·
name (kunya / Sayyid honorific / declension / seal pronunciation; spellings) · how he came to Kasur
(aged six / to study / fled as an adult) · the teacher Ghulam Murtaza (studied with him vs "rather than
study") · the road to Shah Inayat (Sharib's ancestor Abd al-Hakim vs Lahori's Shaikh Abd al-Hakim
Qadiri at Talamba) · order (Qadiri, Qadiri-Shattari, Shattari for the master only) · Shah Inayat's caste
(current text vs Abbas's two definitions) · the break with his master (Gwalior / dancing girl / troubles
of the Panjab / seven years among musicians / several or twelve years among dancing girls / servant
twelve years / miracle contest and expulsion / the *tazkiras*' version) · the burial refusal (tradition vs told
as fact) · martyrdom (Sachal's verse vs Schimmel's footnote) · where Kasur lies (south / 30 miles SE /
70 miles) · the tomb's fabric (Khaled Ahmad / Abbas / Shackle's photographs) · his politics (current
text vs Shackle, Khaled Ahmad, Rafat) · Rumi in his verse (Shackle "unique reference" vs Rafat "does not
mention") · size of the corpus (thousands / 156 / 157).

## Verse quoted

Set off as verse paragraphs or italic verse paragraphs (15):

1. Shahmukhi couplet from the current text (current Description; entry lines 19, 23), with the current
   text's own English renderings (lines 21, 25). The English carries no inline citation because it is
   the current text's own rendering.
2. عِلموں بس کریں او یار (current text; line 29) as a one-line paragraph, which renders as prose
   because the renderer needs two lines for a verse block. It is followed by Alam's English "Enough of learning, my friend / Only
   one letter 'A' is all you need" (line 1020–1021). I matched the two because the English is identical to
   the current text's gloss. The entry itself does not pair them.
3. Shackle p. 113, folio 88, "May anyone who calls us a Sayyid…" (lines 577–579).
4. Rafat p. 93, folio 73, "Does sanctity deserve such scorn?…" (lines 823–827).
5. Shackle p. 52, folio 27, "The twelfth century has come…". The first line is from line 705. The second and third lines
   are from the province block, line 760, where the first line's endnote numeral would have broken the match.
6. Shackle p. 58, folio 33, "I am not a Hindu, nor a Muslim…" (lines 606–607).
7. Shackle p. 131, folio 106, "I am not twice-born…" (lines 610–611).
8. Shackle p. 102, folio 77, "The mullah taught me the lesson…" (lines 600–602).
9. Schimmel, *As Through a Veil*, p. 158, folio 140, "The mollas have made me read lessons…" (lines 1493–1494).
10. Shackle p. 104, folio 79, "With the departure of Inayat Qadiri…" (line 702).
11. Shackle p. 111, folio 86, "Bullha, let us go and sit at the gate of Shah Inayat…" (lines 651–653).
12. Sachal Sarmast's litany in Schimmel, *Mystical Dimensions*, p. 426, folio 395, paired with her
    footnote as the entry says it must be (lines 1592–1596). "Jacfar" is kept as printed.
13. Rafat p. 149, folio 129, "You are gone, friend…Kasur has missed your smile" (lines 936–938).
14. Rafat p. 149, folio 129, "Now hell has opened its bogs…" (province block, line 1008). It is given as "on
    the same page", not "the same poem", because the entry does not say it is the same poem.
15. Waris Shah (Usborne tr.) p. 56, folio 55, "Of all the wretched Punjab I am most concerned for Kasur"
    (province block, line 1105), framed as context.

Quoted inline (one line or a short run each): Ramakrishna's opening and closing via Rafat p. 243 (lines
917–919); Shackle p. 112 (607–610); Shackle p. 46 (605); fakir lines p. 79, p. 141 (598–600); *Pain and Grace*
p. 208 (500–501); Khalid's dog line (1763); woman's-voice lines p. 110, p. 142 (612–614) and Rafat p. 187
(834); Rafat p. 111 (828); dance lines p. 115, 52, 51 and the reproach p. 116 (651–658); Abida Parvin's closing
line and Abbas's English, p. 102 (1428–1430); the qawwals' 'Tamba chook-chook mandi javain' (872), which the
entry does not translate; Rumi's model ghazal in Shackle's English, p. 167 (621–624).

**Lineation is mine.** The entry prints most of these translations as run-on prose quotations. Where it
has no " / " I split at the translator's own sentence ends. The exceptions are Alam, Schimmel's *As
Through a Veil*, Rafat p. 149 (hell lines) and Sachal, where the entry has the " / ". I did not translate
any verse myself.

## `[OCR?]` carried into the prose

پانڈو [OCR?] (Sharib, line 297); Talamba [OCR?] and بجزہ [OCR?] (Lahori p. 219, lines 178–181); سید بلہی
[OCR?] شاہ (Lahori, line 161); بلہے[OCR?] and کلاونت[OCR?] (Kanhaiya Lal, line 92), also stated in plain
words; قصور[OCR?] آباد کیا and کشور [OCR?] (Chishti, line 61).

These words were given in the entry's bracketed corrected reading and not quoted, so they appear in
paraphrase without the flag: 'Bullhya, hor wi neenva ho' (line 913); Bullah / Bhulla (lines 892–893,
marked "as the printed text is read"); 'Neh wi doongi' (line 927); *tazkiras* (line 809); *dohras*,
*athvaras*, *siharfis*, *baramahas* (lines 904–905; `gandban` left out, no reading); "filigree work" (line
852); charkha (line 956); "frequently quoted" (line 908); *Qānūn-e ʿishq* (line 1509). Abbas's dropped
years are rendered "both years are illegible in the copy consulted" (line 1286).

## Left out, and why

- **Not this saint or not this site:** Lahori's look-alikes, entry no. 190 بہلے [OCR?] شاہ مجذوب
  لاہوری and the index's بھلے [OCR?] شاہ لاہوری (Doubt I24, lines 228–234). Lahori's Kasur index (lines
  191–194) appears only as the Qasuri family graves, framed as "a different burial ground". Kanhaiya
  Lal's "تحصیل قصور" (line 102). Chishti's unmapped "نواح قصور" and "لب سڑک قصور" (line 59). Sharib's
  back-cover catalogue mention (lines 398–400, which the entry itself says not to merge).
- **Must not be reconstructed:** Kanhaiya Lal's broken clause linking the poet with Kasur and Shah Zia
  Qadri (lines 94, 98–103). The prose says only that the clause is broken.
- **Apparatus or bare mentions:** the indexes in Lahori (lines 213–215), Schimmel *Pain and Grace* (504), Boivin
  (1234) and Abbas (1301–1302). Shackle's seven romanizations (535) and his lists of English translations and
  studies (739–750). Schimmel's endnotes to Ramakrishna and the "Turk" note (1501–1515). Khalid *Walking
  with Nanak* p. 151 (1647) and *A White Trail* p. 202 (1713). Abbas's fieldwork-site, acknowledgment and
  edition references (1413–1419, 1438–1443), her interview dated December with day and year lost (1386–1388),
  and the plate caption (1369–1371).
- **Negative evidence that could mislead:** Rizvi has no index entry for Bulleh Shah (lines 1169–1173).
  The volume covers early Sufism, so its silence says little.
- **Place-level items cut to keep `## Setting` short:** Khalid's Ram Thamman and Hardo Sahari (1649),
  canal, farmhouse, rain, Sutlej (damaged), thugs, Nanak and Mardana (1650–1652). *A White Trail*'s
  Ram Thamman, falooda, the 2009 attack (Doubt 1722 says it may attach to Bahmniwala only) and the
  Nihangs (1715–1718). The lynched businessman in *In Search of Shiva* (Doubt 1768). Rafat's "religious
  significance of Kasur" and "a Pathan rebellion in Qasur" (939–940). The province bullets of Shackle and
  Rafat not used (761–767, 999, 1003–1007). Usborne's annotator's note (1105).
- **Minor or unclear:** *Pain and Grace*'s hadith qudsi note (502–503; the hadith is not identified and the
  line is flagged). Shackle's "eighteenth-century Muslim poet" and Matringe title (561–564), "District Kasur"
  (569), the Sayyid-descent gloss (576), the Hindi-vocabulary note (617–618). Rafat's flagged female-persona
  lines with "[OCR?] [I]" (828–834) and most of the kafi-title list (971–991).
- **Sections with no row-specific material** (province-level only, not used): Sorley, Kugle, Eaton, Ernst
  and Lawrence, Kasmani, Schaflechner, Werbner and Basu, Qureshi, Rozehnal, Dhillon, Khulasat.

## Pointers and hedges

- Sharib's p. 340 dream and p. 341 encounter: the draft says "Whether this meeting continues the dream
  or is a separate waking episode is not clear from the account as it stands" (lines 320–322).
- Shackle's Rumi-model note (p. 167) is given as "of one famous kafi". The entry does not say which kafi it is,
  so it is not tied to 'Ki janan mein kaun'.
- Shackle's caution on "a later hagiographic elaboration" (p. 183) is given as being about "one kafi on the
  theme". It is not tied to the p. 113 poem.
- Abbas's hijra link is given as her own inference (line 1368). Her p. 84 contrast is quoted without calling
  the shrine non-Chishti (Doubt, lines 1384–1385). The qawwals' three-century descent and their
  attributions are given as their claim (1335).
- The four items of the horseman legend are said to "answer to" the four-item initiation price. Sharib
  draws no conclusion (lines 380–381).
- Urdu prose without an English gloss in the entry is either glossed in the entry's own words or left
  unglossed, for example ‘تم کون ہو؟’ / ‘سید ہوں’, the امانت sentence, the Chenab and والہانہ عشق lines, and آپ کو دیکھ کر مسکرائے.
- Introduction voices in Rafat's book: pp. 21–28 are attributed to Khaled Ahmad and pp. 31–51 to Rafat,
  following the entry (lines 788–799, 811–822). The notes at pp. 235–244 are given as "a note in Rafat's
  selection".
