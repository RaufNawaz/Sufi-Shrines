# Brief: English-only prose; Urdu only as poetry (HANDOVER §9.368) — supersedes QUOTE_BLOCKS_BRIEF.md

**Ruling (Rauf, 18 October 2026, after seeing the §9.366 `> ` blocks):** "the citations look ugly … this block is
good for poetry but for general prose … there shouldn't be such urdu references but instead these blocks could very
easily be converted to plain English prose like the rest of the description so the only urdu there should be should
be the poetry and that is it."

So in every Description:

1. **Prose is English only.** Every Urdu, Persian, Punjabi, Sindhi or Arabic *prose* quotation goes. Its sense is
   carried in the English sentence, with the citation it had. Names, titles and terms are romanised as the draft and
   `data/glossary.csv` spell them (Sayyid Bulleh Shah, Shaikh Muhammad Ghaus Gwaliyari, *wilayat*).
2. **Poetry stays, in the original, as a verse paragraph** (DESCRIPTION_REWRITE_BRIEF.md "Verse": hemistichs on
   their own lines, nothing else in the paragraph), followed by its English paragraph (the book's translation, or
   the entry's gloss, or a plain statement of its subject — never our own verse translation). A verse line that was
   quoted inline in an English sentence is promoted to a verse paragraph if it is genuinely verse (a couplet,
   hemistich, *kafi* line, chronogram); a prose line is never set as verse to keep it.
3. **No `> ` original-script blocks** (§9.366 is withdrawn; the renderer support was removed). Rows the queue already
   put into blocks (`check_urdu_out.py status` marks them "[has > blocks]") are finished by deleting the block
   paragraphs: their English already carries the sense — but read each English sentence against its block before
   deleting it, and mend any sentence that does not yet give the sense.
4. Bibliography lines keep their Urdu titles. Headings carry no Urdu.

## The English (unchanged from §9.366)

- Where the sentence glosses the quotation, delete the quotation and keep the gloss, mending the grammar.
- Where it does not, give its sense plainly and closely from the quotation itself and the entry's words, as
  paraphrase, **never in quotation marks** (check_description_draft Q2: a quoted English passage must be in the
  entry). Add nothing the Urdu does not say. A reading the book prints uncertainly stays uncertain in English
  ("a place whose printed name, perhaps Pandu, cannot be read with certainty").
- Keep every number, date, citation and italic term. Where a date was only in the Urdu ("آپ کا وصال 1171ھ میں ہوا"),
  the English must give it ("his death in 1171 AH").

## Procedure, per row (`check_urdu_out.py status` order, fewest paragraphs first; ~60-100 paragraphs a firing)

1. `python3 pipeline/book_queue/check_urdu_out.py begin <id>` (keeps an existing original backup — never overwrite it).
2. Edit the draft by script (never retype Urdu; cut verse lines out of the old line by index when promoting them).
3. `python3 pipeline/book_queue/check_urdu_out.py check <id>` → exit 0 (EN1-EN5). It prints how many Urdu prose
   quotations the row lost: the coordinator reads every one against its English sentence (RULE 4 cannot do this).
4. `python3 pipeline/book_queue/check_description_draft.py <id>` → exit 0.
5. `python3 pipeline/book_queue/check_urdu_out.py rekey <id>` (exceptions for removed runs are dropped and listed),
   then `check_urdu_script.py scan` exit 0 (in the cloud, on a bundle — §9.360).
6. `python3 pipeline/book_queue/sync_draft_to_import.py <id>`, then `python3 pipeline/finalize_import.py --date X --dry-run`
   with no FAILED. Never run sync while another session holds `quote_blocks`/`urdu_out`/`as_printed_sweep` (the CSV is
   rewritten whole; two writers lose one write).
7. `python3 pipeline/book_queue/check_urdu_out.py done <id>`.

## Consequence for the as-printed sweep (§9.357 ruling 14)

The sweep read Urdu *quotations* off the page images so they would stand as printed. Prose quotations now leave the
Descriptions, so the sweep applies to **verse paragraphs only** from here on; its open word-level questions
(§9.361-§9.367) matter only where they change the English (e.g. Baoli Sahib's شادیانہ, کانسی کار; Zanjani's 557 AH;
Ram Das's Chuna Mandi and Tarn Taran) — carry those into the English when the row is converted, if Rauf approves them.
