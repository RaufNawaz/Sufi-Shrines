# Writer brief: public English (draft-en)

You are the WRITER of the public English version of one row of a heritage website (Sufi-Shrines, spiritualsitespakistan.com). Work only in the repository mirror at /home/claude/repo (call it REPO). Do not run git. Do not touch any file other than the two you are asked to write.

Read in full, in this order:
1. REPO/docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md (binding; every rule applies, including rule 4 on disagreements, rule 5 on uncertain readings, rule 6 on embellishment, rule 7 on keeping everything important, the Verse section and the Length section).
2. The TEAM version: REPO/entries/descriptions/<ID>.md (the ONLY source of facts), and its notes REPO/entries/descriptions/<ID>.notes.md for context only.
3. REPO/data/glossary.csv (glosses of terms).
4. House style, all three files each: REPO/entries/descriptions_public/shah-jamal.{md,notes.md}, REPO/entries/descriptions_public/shrine-of-baba-shah-kamal.{md,notes.md}, and the most recent finished row REPO/entries/descriptions_public/mithankot-kot-mithan.{md,notes.md} (compare with its team version REPO/entries/descriptions/mithankot-kot-mithan.md to see what a public version keeps and drops).

Write:
- REPO/entries/descriptions_public/<ID>.md : the public English. Lead with the place (first paragraph two to four sentences, a map card summary). Narrative, short paragraphs, reader facing headings, `## Bibliography` at the end with EVERY item of the team version's bibliography verbatim and in order. No citations, no narration of sources or authors ("one book", "the books", "a study", "a historian writes", "according to"), no archive or process language ("consulted", "this article", "recorded", "none of the sources"), no uncertainty vocabulary about the printed text. Where the team version says the books do not describe the site itself, the public text simply tells what is known, framing figure level or region level material as being about the figure or the region (never tying it to this shrine unless the team version does). Legends stay legends ("tradition holds", "it is said", "devotees tell"). No em dashes or en dashes anywhere in prose; no hyphenated coinages of our own. British spelling. Verse paragraphs copied exactly from the team version with their italic rendering as the next paragraph, the citation replaced by `(translated by <Name>)` only for a published translation.
- REPO/entries/descriptions_public/<ID>.notes.md : start with the line `# Public description notes: \`<ID>\`` (no verdict lines; the coordinator adds them), then a short Source line, then `## Consensus choices` (every disagreement the team version records and how you settled it, with its basis (a) (b) (c) (d) as in rule 4), `## Left out` (what was dropped and why), `## Glosses`, `## Verse` (if any), `## Judgement calls for V1` (numbered, the points a fact checker should rule on), and `## For Rauf` (only real questions the team version raises for him; may be "None.").

Length: up to about 0.75 of the team prose, as the important information allows; the checker accepts 0.40 to 0.85. Never pad. Keep family members by name and every obviously important fact.

When written, run:
  cd /home/claude/repo && python3 pipeline/book_queue/check_public_description.py <ID> --english-only
It must print `ok` and exit 0. If it fails, fix the draft (not the checker) and run it again. Then reread your draft once against the team version, sentence by sentence, removing anything the team version does not support.

Reply in under 120 words: the checker's output line and the three most important judgement calls, one line each. Everything else belongs in the notes file.
