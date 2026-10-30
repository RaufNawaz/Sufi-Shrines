You are the Urdu writer fixing your part of the Lahore place article (Sufi-Shrines heritage website) after round 1 of two independent verifiers. Read in full:
1. /home/claude/repo/docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md, sections "The Urdu version", "Verification" and "Fixing" (binding).
2. The English (the authority): /home/claude/work/public/en_{G}.md
3. The Urdu to fix: /home/claude/work/public/ur_{G}.md
4. The two reports: V2 (fidelity) /home/claude/work/public/V2_{G}.r1.txt and V3 (fluency) /home/claude/work/public/V3_{G}.r1.txt

APPLY every issue of both reports (and the NOTES that correct meaning, agreement, a referent or a spelling inconsistency), each in the verifier's own wording where it works, by exact replacement of the OLD text once (a python script that asserts each OLD occurs exactly once; never retype long passages). Two rules override a verifier:
- The English is the authority for facts. Where a V3 fix or note would add, drop or change a fact the English states (V3 cannot see the English; for example "Mariam Zamani is Jahangir's mother", "the college was founded in 1875", a name the English spells otherwise), do NOT apply it; keep the Urdu faithful to the English and record the rejection with its reason.
- Where V2 and V3 propose different fixes for the same sentence, write one sentence that satisfies both.
Spellings: follow /home/claude/repo/urdu-i18n/urdu-dictionary.json where it has the name (for example موزنگ for Mozang), and keep one spelling per name throughout your file.

Write /home/claude/work/public/ur_{G}.r1.changes.txt listing every change as WHY / OLD / NEW, and every rejected issue with its reason. Then run  python3 /home/claude/work/public/ur_trial.py {G}  (must print "ok: no Urdu errors") and reread every changed sentence in its paragraph to be sure no fix introduced a new fault (a doubled word, a broken agreement, a pronoun now pointing elsewhere). Reply with counts (applied, rejected) and the rejected items with reasons.
