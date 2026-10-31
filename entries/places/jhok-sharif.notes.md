# Jhok Sharif team version: notes for Rauf

Written 31 October 2026 under docs/prompts/PLACE_DESCRIPTION_BRIEF.md by a single drafter. The sources file, entries/places/sources/jhok-sharif.sources.md, is one book (Boivin, *Hindu Sufis of South Asia*), almost all of it the book's Source line and filing apparatus. The material about the place is one bullet holding two bare occurrences of the name: "He also visited **Jhok Sharif** and Daraza", of Bedil (p. 97, folio 84), and "**Sufi Hazrat Abdul Sattar Shah of Jhok Sharif**, speaks of jam wahdat jo, 'the cup of unity' (Nasir Faqir 1972)" (p. 101, folio 88). Every line was read. Nothing from the web, from general knowledge, or from any shrine or other place article was used.

`check_place_description.py team jhok-sharif`: ok, 1,242 characters (1,054 of prose before the bibliography), 6 citations to 1 book, 8 paragraphs, exit 0. No Arabic script anywhere in the file, no em or en dashes, no hyphenated words (the only hyphen is the bibliography's list marker).

The article is short because the material is two clauses.

## Headings used

Overview (two clauses, one for each occurrence, cited to the pages the body cites); A Place Bedil Visited (the brief's History or Holy Places renamed for what it holds: one visit, undated); Abdul Sattar Shah and the Cup of Unity (the brief's A City of Saints renamed: one Sufi of the place and the phrase he speaks of); Bibliography.

No History in the proper sense, no Communities, Shrines, Endowments and the State, Festivals and Practice, In Verse or The Place in the Books: no line of the material fills them. No Where the Sources Disagree: one book, and nothing in it conflicts.

## Framing

- **Bedil.** Identified only as the bullet identifies him: the subject of "He also visited Jhok Sharif and Daraza", introduced by the bullet's "of Bedil". No "Sufi", "poet", birthplace, dates or family, though other place articles (sukkur, multan, sehwan) carry such things from other pages of the same book; those pages are not in this sources file.
- **"also".** Quoted as printed and not explained. The article does not say which other places Bedil visited, or when, since the sentence as given says neither.
- **Daraza.** Named only as the other place of Bedil's sentence, as the coordinator directed. Nothing is said of where Daraza is or what is there.
- **What Bedil did there.** One sentence says the sentence gives no account of what Bedil did or found at Jhok Sharif, as tando-muhammad-khan says "of Tando Muhammad Khan itself the passage says nothing more". It is a statement of what the material holds, and stops a reader inferring a pilgrimage or a meeting. It is a candidate to drop (question 3).
- **Abdul Sattar Shah.** Given exactly as printed, "Sufi Hazrat Abdul Sattar Shah of Jhok Sharif", and identified no further: no dates, no lineage, no office (not *sajjada nashin*, not *pir*), no relation to anyone else at Jhok Sharif. "Of Jhok Sharif" is quoted rather than turned into "lived at" or "was buried at", since the phrase says neither.
- ***jam wahdat jo*.** Italicised as a term in the Overview, left roman inside the quotation as printed, and given only the book's own English, 'the cup of unity' (single quotes, as printed). The language of the phrase is not named, and nothing is said of what the phrase means in his teaching; "speaks of" is kept in the book's present tense.
- **Nasir Faqir 1972.** Boivin's own reference for the clause, given in one sentence ("For this Boivin gives a reference to Nasir Faqir, 1972"), as tando-muhammad-khan gave Kripalani 1986. The work is not named, because the bullet does not name it, and it is not in the bibliography (it is Boivin's source, not ours). No page is given because the bullet prints none. See question 2.
- **Bold removed** inside the quotations, as the rewrite brief directs.
- **Bibliography**: the item the other place articles already use for this book (tando-muhammad-khan and the rest), copied exactly.

## Left out, and why

- "*Attached to 1 row(s): dargah-roza-sufi-shah-inayat-shaheed*" and "The book's place-level material on "Jhok Sharif" (1 rows) ... copied into every existing entry that list names (ruling (a); Rauf, 10 October 2026). It is about the place in general, not about this shrine alone.": filing apparatus.
- "**dargah-roza-sufi-shah-inayat-shaheed** (the book's "Jhok Sharif", in its two bare occurrences) — **place-level.**": filing apparatus.
- "**The second attaches a person to the place, but not the row's principal figure, and Sufi Shah Inayat Shaheed is not named in either clause: (not stated).**": the note taker's remark about the filing. Sufi Shah Inayat Shaheed is not named anywhere in the article, because neither clause names him (as the coordinator directed). See question 1.
- The Source line's apparatus (transcription method, chunk counts, the series statement that contradicts itself, "Reviewed: no."): about the book's processing; only the publisher and year reach the bibliography item, as on every other page citing this book.

## Weak material and how I treated it

- **Both occurrences are bare.** Kept, each stated as exactly what it says: that Bedil visited Jhok Sharif (and Daraza), and that Boivin names a Sufi "of Jhok Sharif" who speaks of the cup of unity. Neither is made into a fact the clause does not state (no shrine, no date, no description of the place).
- **"(Nasir Faqir 1972)"**: a reference inside the book, not a fact about the place. Kept as a statement of Boivin's reference only, outside the quotation, so that the checker cannot mistake it for a citation of ours.

## Disagreements

None. One book, two clauses that do not touch each other.

## [OCR?] carried

None. The material holds no [OCR?], [text-layer?] or [illegible] marker.

## Verse quoted

None. The material holds no verse. *jam wahdat jo* is a phrase, not a verse line, and is given in Latin transliteration as printed.

## Questions for Rauf

1. **Shah Inayat.** The material is filed under the dargah of Sufi Shah Inayat Shaheed, but neither clause names him, so the article does not. Other books in the archive say much about Jhok and Shah Inayat (the Sindh article cites Schimmel on the army sent against Jhok, and Boivin's pp. 27 and 141 on the masters of Jhok Sharif and on invoking Jhok Sharif), but none of that is attached to this place, so it is not in this sources file. Should `build_place_sources.py` attach those passages to Jhok Sharif, so that its article can tell the place's history?
2. **Nasir Faqir 1972.** Boivin's bibliography would give the full reference; the sources file does not. If someone can check it, the work could be named, or the sentence dropped as apparatus.
3. **"Gives no account".** Keep the sentence that Bedil's line says nothing of what he did at Jhok Sharif, or drop it as a statement about the book rather than the place?
