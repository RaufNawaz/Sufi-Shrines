You are a section drafter for the Lahore place article of a bilingual heritage website (the Sufi-Shrines archive). You write ONE PART of the TEAM version: a fully cited, scholarly account of what the books say about Lahore as a place. A composer will later merge five parts into one article, so write your part to be merged.

Work in the repository copy at /home/claude/repo. Read in full before writing:
1. /home/claude/repo/docs/prompts/PLACE_DESCRIPTION_BRIEF.md (binding; the place rules and headings).
2. /home/claude/repo/docs/prompts/DESCRIPTION_REWRITE_BRIEF.md, the sections "Citations", "Quotation", "Verse", "Shape" and "What stays out" (binding for the team version; ignore its parts about a row's current Description and the sheet, a place has none).
3. /home/claude/repo/CLAUDE.md, RULE 2 (never invent content).
4. YOUR MATERIAL in /home/claude/repo/entries/places/sources/lahore.sources.md: the "## The books" list at the top (for bibliography items), and ONLY the section(s) assigned below. Read every line of your assignment.

YOUR ASSIGNMENT: {ASSIGNMENT}

WHAT TO WRITE: /home/claude/repo/entries/places/drafts/lahore.part{N}.md
- Markdown. Use the place headings of the brief that your material fills (## Overview is the composer's; do not write one): ## History, ## A City of Saints (or ## Holy Places), ## Communities, ## Shrines, Endowments and the State, ## Festivals and Practice, ## In Verse, ## The Place in the Books, ## Where the Sources Disagree, and last ## Bibliography. Only headings your material fills.
- Prose paragraphs, one per line, a blank line between. No lists except in Where the Sources Disagree (one "- " item per disagreement, every side cited) and the Bibliography.
- EVERY factual sentence carries an inline citation exactly as the brief says: (Surname, *Title*, p. N) or (Surname, *Title*, p. N, folio M), the title being a substring of the book's "## From" heading in the sources file (for example *Tarikh-e Lahore*, *Tahqiqat-e Chishti*, *Khulasat al-Tawarikh*, *A White Trail*), and the page reference copied EXACTLY as the source block gives it, including "folio not stated" and any [OCR?] on a digit. Never compute or tidy a page reference. If a passage has no page reference in the source, leave the passage out.
- Quotations verbatim from the source: Urdu, Persian and Punjabi in the original script exactly as printed in the block (with [OCR?] carried), English quotations exactly. Give the English sense only where the block glosses it.
- Capture EVERYTHING in your assignment that speaks of Lahore as a place: history, rulers and builders as they bear on religious life, the landscape of holy sites, communities and how they lived together, custodianship, endowments, offerings, the state and religious property, festivals, building and repair, the city's religious economy, poetry, how the author saw the city. "The more information we are able to capture the better." Length comes from the material; do not pad. Do NOT retell one shrine's own history at length (its own article does that): name a site where it helps the reader see the city.
- Weak material (a bare transit, a table of contents heading that is only a locator, "weigh accordingly", a publisher's imprint): leave it out, or state it as what it is. Legends stay legends ("Lal relates that...").
- Disagreements between sources, or inside one source, go side by side into ## Where the Sources Disagree, each side cited, no verdict.
- No process words in the prose: never "the notes", "takeaways", "chunk", "block", "archive row", "integrated", "OCR", "PDF page", "worker", "ruling (a)", "place-level". Express uncertainty in plain words ("the reading of the year is uncertain in the printed text").
- No em dashes or en dashes anywhere in your prose (Rauf's standing rule). British spelling.
- ## Bibliography: one "- " item per book you cite, built only from that book's *Source:* line in "## The books": "- Author, *Title* (language if given, date; edition or publisher as the Source line gives it)." Add nothing the Source line does not give. The cited title string must appear in the item.

ALSO WRITE /home/claude/repo/entries/places/drafts/lahore.part{N}.notes.md: what you left out and why (quote the line start), weak material and how you treated it, every disagreement, every [OCR?] you carried, verse quoted, and questions for Rauf.

CHECK YOUR PART (mandatory) by copying it to a scratch folder and running the checker:
  mkdir -p /tmp/part{N} && cp /home/claude/repo/entries/places/drafts/lahore.part{N}.md /tmp/part{N}/lahore.md && cd /home/claude/repo && python3 pipeline/book_queue/check_place_description.py team lahore --draft-dir /tmp/part{N}
It must exit 0. It proves every citation's page reference occurs in that book's section, every Arabic-script run of three or more words and every English quotation of six or more words occurs verbatim in the sources, and the bibliography carries every cited book. Fix the part (never the checker) until it passes. Do not edit any other file.

Reply with: the part's path, its length in characters, the headings you used, the number of citations, the checker's final line, and the three most important things you left out or flagged.
