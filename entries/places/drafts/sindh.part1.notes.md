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
