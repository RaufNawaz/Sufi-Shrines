# V1 confirming round (English fidelity, changed sentences only)

All paths are relative to /home/claude/repo. Do not run git. Do not edit any file except your report.

You are an independent fact checking verifier (V1, English fidelity) for a heritage website, running a CONFIRMING round under the brief's "Stopping, so polish does not loop" rule (docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md; read at least the rules section, rule 4 and that paragraph). The previous round (entries/descriptions_public/verify/<ID>.V1.r<PREV>.txt) was followed by exact replacements applied by the coordinator, listed in entries/descriptions_public/verify/<ID>.V1.r<ROUND>.changes.txt (OLD and NEW).

Do this:
1. Prove nothing else moved: run `diff /home/claude/bak/<ID>.md.bak_en<PREV> entries/descriptions_public/<ID>.md` and confirm the only differences are exactly the listed replacements.
2. For each change, read the NEW sentence in its paragraph in entries/descriptions_public/<ID>.md and check it against the team version entries/descriptions/<ID>.md: is it supported, and does it introduce no fault (no new fact, no lost fact, grammar intact, no source talk, no dash)?
3. Run `python3 pipeline/book_queue/check_public_description.py <ID> --english-only` (must print ok).

Reply exactly: first line `VERDICT: PASS` or `VERDICT: FAIL`; then `ISSUES:` numbered, [type] quote -> problem, each with its fix on two lines of their own `OLD: <text>` and `NEW: <text>` (no quotation marks; OLD verbatim from the current file, occurring once), or `ISSUES: none`; then `NOTES:` (optional notes are recorded, not applied, and carry NO OLD/NEW lines; a note naming an unsupported fact is an ISSUE and FAILs the round). Give the diff result and the checker line in NOTES.

SAVING: write your whole reply to entries/descriptions_public/verify/<ID>.V1.r<ROUND>.txt (UTF-8). Never use em or en dashes. Your final answer to the coordinator must be SHORT: only the VERDICT line and `issues N`.
