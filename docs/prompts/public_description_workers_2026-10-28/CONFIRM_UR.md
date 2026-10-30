# Confirming round: V2 and V3 together on the changed Urdu sentences (round <ROUND>)

Work only in /home/claude/repo. Do not run git. Do not edit any file except your two report files.

You are an independent bilingual verifier and senior native Urdu editor running the CONFIRMING round described under "Late rounds" in docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md (read that paragraph and the section "The Urdu version"). The Urdu article entries/descriptions_public/<ID>.ur.md was changed after round <PREV> of V2 (fidelity) and V3 (fluency); the reports are entries/descriptions_public/verify/<ID>.V2.r<PREV>.txt and entries/descriptions_public/verify/<ID>.V3.r<PREV>.txt, and the exact changes are listed (OLD and NEW, with the reason, including any fix that was adapted or rejected) in entries/descriptions_public/verify/<ID>.ur.r<ROUND>.changes.txt.

Do this:
1. Prove nothing else moved: replay the change list on the backup /home/claude/bak/<ID>.ur.md.bak_<BAK> with a short python script (each OLD replaced once, in order) and confirm the result is byte for byte identical to the current .ur.md. Report the result.
2. For EACH change, read the NEW text in its paragraph:
   - V2 (fidelity): against the matching sentence of the English entries/descriptions_public/<ID>.md (the authority), is the meaning the same: every fact, name, number, hedge and qualifier kept, nothing added, the referents right? Where a fix was adapted or rejected for fidelity, is that decision right?
   - V3 (fluency): is the NEW text natural, correct, educated Urdu (agreement, postpositions, izafat, word order, no calque, no new ambiguity, no repetition inside the sentence), and does it fit the sentences around it? Also say whether each round <PREV> V3 issue is now fixed.
3. Run `python3 pipeline/book_queue/check_public_description.py <ID> --no-verdicts` (must print ok).

Write TWO reports, each in this exact format: first line `VERDICT: PASS` or `VERDICT: FAIL`; then `ISSUES:` numbered, with each fix on two lines of their own `OLD: <text>` and `NEW: <text>` (no quotation marks; OLD verbatim from the current .ur.md, occurring once), or `ISSUES: none`; then `NOTES:` (taste only; recorded, not applied; NO OLD/NEW lines in NOTES). FAIL only for a genuine fault in a changed sentence (or a round <PREV> issue left unfixed); do not reopen unchanged sentences unless a change broke them.
- the V2 report to entries/descriptions_public/verify/<ID>.V2.r<ROUND>.txt (include the replay result and the checker line in its NOTES);
- the V3 report to entries/descriptions_public/verify/<ID>.V3.r<ROUND>.txt.
Never use em or en dashes or Latin letters inside any proposed Urdu. Your final answer to the coordinator must be SHORT: `V2: PASS|FAIL (issues N); V3: PASS|FAIL (issues N); replay identical: yes|no`.
