# Fixer brief: Urdu round 2 (apply V2 and V3 round 1)

Work only in /home/claude/repo. Do not run git. You change only entries/descriptions_public/<ID>.ur.md, and only through the script below.

Read: docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md (section "The Urdu version" and the paragraphs "Fixing", "Stopping, so polish does not loop" and "Late rounds"); the public English entries/descriptions_public/<ID>.md (the authority for content); the Urdu entries/descriptions_public/<ID>.ur.md; and the round 1 reports entries/descriptions_public/verify/<ID>.V2.r1.txt and entries/descriptions_public/verify/<ID>.V3.r1.txt.

What to apply:
1. Every ISSUE of V2 and of V3, in the verifier's own wording, UNLESS the fix would change meaning against the English (add or drop a fact, a name, a hedge such as کہا جاتا ہے / روایت ہے / غالباً, or a qualifier; turn a legend into fact; change a referent). The English is the authority: check every V3 fix against the matching English sentence. Where a V3 fix changes meaning, adapt it minimally so that it fixes the fluency fault and keeps the English meaning, and say why in the "why" field. The brief keeps a gloss for قلندر (a term unfamiliar to many Urdu readers): do not drop that gloss. Reject an issue only if it is wrong, and say why.
2. The NOTES of either verifier that correct meaning or precision (an ambiguous referent, a word the English does not have, a weakened or strengthened comparison, an inconsistency between two renderings of the same English phrase), in the verifier's wording, checked against the English as above. Skip pure taste.
3. Nothing else. Do not rewrite sentences no verifier named.

How to apply: write a JSON list to /tmp/claude-0/-home-claude/0b9c57dc-a73b-5901-941a-3be03002d115/scratchpad/<ID>.ur2.json of objects {"old": ..., "new": ..., "why": "V3 r1 issue 4 (adapted: keeps the قلندر gloss)"} in file order. Each "old" must be copied verbatim from the CURRENT .ur.md and occur in it exactly once, and must not overlap another change's "old" (if two fixes touch one sentence, merge them into one change). Then run:

  python3 /tmp/claude-0/-home-claude/0b9c57dc-a73b-5901-941a-3be03002d115/scratchpad/apply_changes.py entries/descriptions_public/<ID>.ur.md /tmp/claude-0/-home-claude/0b9c57dc-a73b-5901-941a-3be03002d115/scratchpad/<ID>.ur2.json entries/descriptions_public/verify/<ID>.ur.r2.changes.txt ur1

(The script leaves a backup at entries/descriptions_public/<ID>.ur.md.bak_ur1; leave it there.)

(it refuses if an OLD does not occur exactly once; fix the JSON and rerun only if it refused, since it applies all or nothing; if it did apply, never run it a second time). Then run `python3 pipeline/book_queue/check_public_description.py <ID> --no-verdicts` (must print ok). No Latin letters, no dashes, Western digits only for figures the English has, balanced asterisks.

Reply in under 100 words: how many changes, and one line per issue you adapted or rejected (the reason is also in its "why" field), and the checker line.
