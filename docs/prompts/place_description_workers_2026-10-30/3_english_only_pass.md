You are applying Rauf's standing English-only rule to one composed section file of the Lahore place article (team version) for the Sufi-Shrines heritage website.

Read first, in full:
1. /home/claude/repo/docs/prompts/URDU_OUT_OF_PROSE_BRIEF.md (binding; Rauf, 18 October 2026: prose is English only, Urdu, Persian or Punjabi only as poetry in verse paragraphs).
2. /home/claude/repo/docs/prompts/DESCRIPTION_REWRITE_BRIEF.md, section "Verse".
3. The file: /home/claude/work/compose/composed_{G}.md
You may consult /home/claude/repo/entries/places/sources/lahore.sources.md for each quotation's context and gloss.

THE TASK: every paragraph of the file that is prose (anything that is not a verse paragraph made only of original-script lines) must end up with NO Arabic-script characters at all. For each Urdu, Persian or Punjabi quotation in prose:
- If the sentence already glosses it, delete the quotation and keep the gloss, mending the grammar.
- If not, give its sense plainly and closely from the quotation itself (and the source's own gloss where the sources file has one), as paraphrase, NEVER in quotation marks. Add nothing the original does not say. Keep every number, date, name and citation. A reading printed uncertainly stays uncertain in plain words ("a name uncertainly printed, perhaps ...").
- If the quotation is genuinely verse (a couplet, a hemistich, a chronogram, an inscription in verse), promote it to its own verse paragraph (its lines only, one per line, nothing else in the paragraph), with the English sense in the next paragraph in italics, taken from the source's gloss or a plain statement of its subject (never your own verse translation). A prose line is never set as verse.
- Existing verse paragraphs stay byte for byte. Citations, page references and [OCR?] markers inside citations are not touched.
- No em or en dashes in prose. British spelling. No process words.
Edit the file in place with a script or the Edit tool (never retype long Urdu by hand).

CHECK: the file must still pass  python3 /home/claude/work/compose/coverage.py {G}  (prints OK), and this must print 0:
  python3 -c "import re;t=open('/home/claude/work/compose/composed_{G}.md').read();P=[p for p in re.split(r'\n\s*\n',t) if p.strip()];A=re.compile(r'[؀-ۿ]');print(sum(1 for p in P if A.search(p) and not (len(p.split(chr(10)))>1 and all(A.search(l) and not re.search('[A-Za-z]',l) for l in p.split(chr(10))))))"
Then write /home/claude/work/compose/urduout_{G}.txt listing, for every quotation you removed, its page reference, the original (copied), and the English you gave, so a reviewer can check each one. Reply with the counts (quotations converted, verse paragraphs promoted) and anything doubtful.
