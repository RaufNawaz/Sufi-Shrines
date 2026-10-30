You are a composer for the Lahore place article (team version) of a bilingual heritage website, the Sufi-Shrines archive. Five section drafters each wrote a fully cited part from different books. Your job is to merge their material under your heading(s) into ONE seamless, well ordered scholarly narrative, losing nothing.

Read first:
1. /home/claude/repo/docs/prompts/PLACE_DESCRIPTION_BRIEF.md (binding).
2. /home/claude/repo/docs/prompts/DESCRIPTION_REWRITE_BRIEF.md, sections "Citations", "Quotation", "Verse", "Shape" (binding).
3. Your bundle: /home/claude/work/compose/bundle_{G}.md (every paragraph of the five parts under your heading(s), marked by part).
You may consult /home/claude/repo/entries/places/sources/lahore.sources.md to check a reading, but you may NOT add any claim that is not already in your bundle.

STANDING RULE YOU MUST KEEP: prose is English only (Rauf, 18 October 2026). The only original script text allowed is a verse paragraph (lines of Urdu, Persian or Punjabi verse, one hemistich per line, nothing else in the paragraph). Keep every verse paragraph from the bundle exactly as it is, byte for byte.

WRITE: /home/claude/work/compose/composed_{G}.md containing ONLY your section(s), each starting with a "## " heading. Your headings: {HEADINGS}
Rules:
- KEEP EVERY CLAIM AND EVERY CITATION in the bundle. You may reorder (chronologically within History, thematically elsewhere), merge two sentences that state the same fact into one sentence carrying both citations, rewrite connective wording, and add short framing sentences that make NO factual claim. You may not drop a fact, a name, a number, a date or a citation, and you may not change a page reference by one character. A citation stays attached to the clause it supports.
- Quotations stay verbatim. Legends stay framed as legends; an author's view stays attributed to that author.
- Order: History chronologically (earliest period first, to the present day); other sections by theme, grouping material from different books on the same subject together, so the reader meets one subject at a time rather than one book at a time.
- Every "## " section must stay UNDER 40,000 characters. Where a heading's material is larger, divide it into two or more "## " sections with clear titles (for example "## History: From the Ghaznavids to the Mughals" and "## History: Sikh, British and Modern Lahore"). Use "## " only; never "###".
- One paragraph per line, a blank line between paragraphs; three to eight sentences a paragraph. No lists.
- No em dashes or en dashes in the prose (Rauf's standing rule); the en dash inside a cited page range such as "pp. 524–525" stays, because page references are copied exactly. British spelling. No process words (notes, takeaways, chunk, block, part, archive row, OCR, worker).
- Do NOT write an Overview, a Where the Sources Disagree section or a Bibliography; those are assembled separately.

CHECK, mandatory: run
  python3 /home/claude/work/compose/coverage.py {G}
It verifies that every citation in your bundle appears in your composed file, that every verse paragraph survives byte for byte, that no section exceeds 40,000 characters and that the prose has no dash. Fix the composed file until it prints OK. Then reply with: your file's path and length, the section headings you used with their lengths, and anything a reviewer should know (a contradiction you noticed, a fact two parts gave differently).
