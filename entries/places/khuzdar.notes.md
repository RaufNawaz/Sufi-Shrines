# Khuzdar team version: notes for Rauf

Written 31 October 2026 under docs/prompts/PLACE_DESCRIPTION_BRIEF.md by a single drafter. The sources file, entries/places/sources/khuzdar.sources.md, is about 2,600 characters from one book (Schaflechner, *Hinglaj Devi*), most of it the book's Source line and attachment apparatus. The material about the place is one bullet, under the block heading "Lahoot / Lahoot la Makan / Khuzdar". Every line was read. Nothing from the web, from general knowledge, or from any shrine article was used.

`check_place_description.py team khuzdar`: ok, 1,310 characters (1,097 of prose before the bibliography), 7 citations to 1 book, 8 paragraphs, exit 0. No Arabic script anywhere in the file, no em or en dashes, no hyphenated words (the only hyphen is the bibliography's list marker).

The article is short because the material is short. It holds one fact about the place (Lahoot, placed in Khuzdar, was a stop on Shah Abdul Latif's wandering) and one fact about its name in writing (the name stands in the titles of two works the study cites).

## Headings used

Overview (two sentences, one for each item, cited to the pages the body cites); A Stop on Shah Abdul Latif's Wandering (the brief's History renamed for what it holds: the book gives no dated history, no ruler and no builder, only the stop); The Place in the Books (the two titles); Bibliography.

No Holy Places, Communities, Shrines, Endowments and the State, Festivals and Practice or In Verse: no line of the material fills them. No Where the Sources Disagree: one book, and nothing in it conflicts (see below).

## Framing

- **Lahoot and Khuzdar.** The only geography is the book's parenthesis, "Lahoot (Khuzdar)" (p. 95, folio not stated), quoted and stated as "places Lahoot in Khuzdar". Nothing is said of where in Khuzdar Lahoot lies, of the district, or of Balochistan.
- **The wandering.** Stated only as the bullet gives it: Lahoot is "a stop on Shah Abdul Latif's wandering". No account of the journey, its date, its route, its other stops, or what happened at Lahoot. The phrase "one of the stops" follows the bullet's "a stop"; no count is given.
- **Shah Abdul Latif.** Named and not identified: no dates, no "poet", "Sufi" or "saint", since the material says nothing of who he was. Spelled Shah Abdul Latif, as the Sindh, Hingol and Matiari articles spell him.
- **The study.** "Jürgen Schaflechner's study of the temple of Hinglaj Devi" draws only on the book's title as the bibliography item gives it (*Hinglaj Devi: ... at a Hindu Temple in Pakistan*), as the Quetta article does.
- **The two titles.** Given for what they are: works the study cites whose titles carry the name of the place. Nothing is said of their subject, language, date or contents, since the material gives none. Abro's *Hinglāj ai Lāhūt* is cited to "pp. 94, 241, folios not stated" and Nazamani's *Lāhūṭ lā Makān* to "p. 108, folio not stated", exactly as the bullet gives them. Abro and Nazamani are given by surname only, as the bullet gives them; no first names are borrowed from other place articles.
- **Spelling.** The book's spellings are kept exactly inside the citations and titles: "Lahoot" (p. 95), *Hinglāj ai Lāhūt*, *Lāhūṭ lā Makān* (with the dotted ṭ, as the bullet prints the title). In the article's own prose the place is always "Lahoot". The archive spells the site Lahoot Lamakan (the bullet's bold line: "The book's `Lāhūt` / `Lahoot la Makan` against the archive's `Lahoot Lamakan`."); neither "Lahoot la Makan" nor "Lahoot Lamakan" is used in the prose, because the book's own text, as the material gives it, says only "Lahoot" of the place.

## Left out, and why

- "Besides the site-specific material in the subsection above, ...": the site material it points to (the shrine at Lahoot and what the book says of it) is not in this sources file. Nothing of it is used or alluded to: no cave, no shrine, no Shah Noorani, no pilgrims. See question 2.
- "and as the index headwords `Lahoot, 89, 98`, `Khuzdar, 98` and `Lāhūt lā Makān (Nazamani), 98` (pp. 350, 351, folios not stated)": index headwords, locators only, saying nothing about the place; and 89 and 98 are the book's printed locators, not page references the article could cite. Left out.
- "**The book's `Lāhūt` / `Lahoot la Makan` against the archive's `Lahoot Lamakan`.**": a filing remark on spelling, recorded above, not given in the prose.
- "*Attached to 1 row(s): shah-noorani-shrine-syed-bilawal-shah-noorani*" and the ruling (a) boilerplate ("copied into every existing entry that list names (ruling (a); Rauf, 10 October 2026)"): apparatus. The shrine of Syed Bilawal Shah Noorani, under which the material is filed, is not named, because no line of the material says anything about it.
- The block heading's "Lahoot la Makan": the note taker's heading, not the book's sentence. Not used as a name of the place (above).
- The Source line's remarks (the contradictory imprint, the "folio not stated" count, "Reviewed: no"): apparatus, except that the imprint is carried in the bibliography item exactly as instructed.

## Weak material and how I treated it

- **The stop (p. 95, folio not stated).** A single mention, the only statement about the place. Kept, stated in its own words and nothing more.
- **The two titles (pp. 94, 241 and p. 108, folios not stated).** Bare mentions inside bibliographical references. Kept, stated as exactly what they are (the name inside two titles the study cites), never as a statement that the works are about Lahoot.
- **The index (pp. 350, 351).** Left out (above).

## Disagreements

None, and no Where the Sources Disagree section. Considered and not listed:
- **Lāhūṭ (the title as the bullet gives it, p. 108) against Lāhūt (the index headword "Lāhūt lā Makān (Nazamani)", p. 351).** A transliteration variant of one title within one book, between the text and the index; minor, and the index is left out. The article keeps the text's form. Recorded here only.

## [OCR?] carried

None. The material holds no [OCR?] or illegible reading.

## Verse quoted

None. The material holds no verse.

## Questions for Rauf

1. **The two titles.** I kept them under The Place in the Books as the only other thing the book offers about Khuzdar's Lahoot. Keep, or cut the article to the one sentence about Shah Abdul Latif?
2. **The site material "in the subsection above".** The book evidently says more about Lahoot (the bullet begins "Besides the site-specific material in the subsection above"), but that material is filed under the shrine of Syed Bilawal Shah Noorani, not in the place sources, so this article cannot use it. Should `build_place_sources.py` carry that shrine's site material into the Khuzdar sources, or should Lahoot's own history stay on the shrine's page only?
3. **The name.** The book prints "Lahoot" and the titles *Hinglāj ai Lāhūt* and *Lāhūṭ lā Makān*; the archive spells the site Lahoot Lamakan. The article uses "Lahoot" alone. Is that the spelling you want on the site, or should the article say that the place is also called Lahoot Lamakan (which the material does not itself say)?
4. **An article about Lahoot on a page for Khuzdar.** The book's only "Khuzdar" is the parenthesis after Lahoot, so the article is about Lahoot as a place in Khuzdar, not about Khuzdar as a whole. Acceptable?
