You write the PUBLIC English for part of the Lahore place article on the Sufi-Shrines heritage website (https://spiritualsitespakistan.com/). The TEAM version (fully cited, scholarly) is done; the public reads a distilled, warm, readable version.

Read first, in full:
1. /home/claude/repo/docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md (BINDING: voice, what changes from the team version, the consensus rule, legends as legends, no source narration, length, terms glossed).
2. /home/claude/repo/docs/prompts/PLACE_DESCRIPTION_BRIEF.md (what a place article is about; the public headings).
3. One finished shrine public article as the house style: /home/claude/repo/entries/descriptions_public/shah-jamal.md (and its team version /home/claude/repo/entries/descriptions/shah-jamal.md to see what distilling means).
4. YOUR TEAM SECTIONS: /home/claude/work/public/team_{G}.md (the only source of facts; for a gloss of a term, /home/claude/repo/data/glossary.csv).

WRITE /home/claude/work/public/pub_{G}.md: the public English of your sections only, each starting with "## ". Your headings: {HEADINGS}
- Never use a "## " heading over 40,000 characters; split a long one into two with clear titles.
- No citations, no page numbers, no author narration ("Lal writes", "according to Chishti", "the chronicle records"). State the content. Anchor in time, not in an author ("By the 1880s ..."), and only as precisely as the source date is firm: Kanhaiya Lal 1884 is firm; Chishti's 1867 is unconfirmed, so his material is "in the nineteenth century".
- Side by side variants go: give the established position with "accounts differ" in one clause where it matters, or the commonly told version where it does not (brief rule 4). Never merge two accounts into one.
- Nothing resting on a reading the team version marks uncertain, illegible or uncertainly printed: leave it out (or drop the uncertain name from a list).
- KEEP EVERYTHING OBVIOUSLY IMPORTANT: names (rulers, saints, builders, custodians, families), places, buildings, dates, sums, festivals, practices, communities, how the city changed. Rauf wants everything the books say about Lahore carried to the site; what goes is only the apparatus (citations, who said what, side by side variants, uncertain readings, process talk). Length: about 0.45 to 0.75 of your team sections' prose; never under 0.40.
- Verse paragraphs (original script lines) are copied EXACTLY as in the team version, with the English rendering paragraph after them in italics, the citation replaced by a translator credit only where a published translation exists.
- Short paragraphs of three to six sentences, one per line, a blank line between. No lists. Explain every term at first use in a few words (*ʿurs*, *langar*, *waqf*, *nazul*, *mela*, *samadh* ...). British spelling. NO em dashes or en dashes anywhere, and no hyphenated words of our own.
- No archive or process words: this archive, entry, the sources consulted, the books, notes, uncertain in print, set out below.

ALSO WRITE /home/claude/work/public/pub_{G}.notes.md: every consensus choice and its basis (team sentence quoted), what you left out and why.

CHECK: assemble and run the public checker on a trial file:
  python3 /home/claude/work/public/trial.py {G}
It runs check_public_description.py --english-only on your sections against your team sections. Errors P1 to P5, Q1, Q2 and F1 to F6 must be fixed; ignore L1 (whole article) and B1 (bibliography), which the coordinator handles. Reply with your file's length, your public/team ratio, your headings, and the important things you chose to leave out.
