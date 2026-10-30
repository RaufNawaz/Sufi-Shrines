# Worker briefs of the overnight public description run (28 to 29 October 2026)

Rauf asked (28 October 2026, in chat) for the public description stage to be finished in one interactive run, with the scheduled task paused. These are the briefs the coordinator gave its workers, kept here under RULE 0. They implement `docs/prompts/PUBLIC_DESCRIPTION_BRIEF.md` (binding) and quote its verifier prompts word for word; what they add is mechanics: where each worker writes, that every fix is given as exact `OLD:`/`NEW:` lines a script can apply, and that replies to the coordinator are short (the full reply is saved in `entries/descriptions_public/verify/`).

| brief | step |
|---|---|
| `WRITER_EN.md` | draft-en: public English and notes |
| `V1.md` | V1 English fidelity, round 1 or a full later round |
| `V1_CONFIRM.md` | V1 confirming round on the changed sentences |
| `WRITER_UR.md` | draft-ur: the Urdu |
| `V2.md`, `V3.md` | V2 Urdu fidelity, V3 Urdu fluency, round 1 |
| `FIXER_UR.md` | applies V2 and V3 round 1 with a fidelity guard against the English |
| `CONFIRM_UR.md` | one worker doing V2 and V3 together on the changed sentences, with a byte for byte replay of the change list on the backup |

Paths in the briefs point at the cloud mirror the run used (`/home/claude/repo`, a scratchpad folder, backups in `/home/claude/bak`); a later run substitutes its own. The coordinator's helper is `pipeline/book_queue/public_description_coordinator.py`.

Two small helpers were added on 29 October, after the usage limit stopped the run for most of a day (they hold the same scratchpad paths, so a later run edits the two constants at the top):

- `gen_prompt.py KIND ID [ROUND] [PREV] [BAK]` fills one brief's placeholders (`<ID>`, `<SLUG>`, `<ROUND>`, `<PREV>`, `<BAK>`) and writes the result to a prompt file; each worker was then told only to read that file and carry it out. For a full V1 round after round 1 it also names the previous report, the change list and the backup.
- `stage_commit.py NAME LISTFILE` copies the listed repository files to short numbered staging paths (`01.md`, `02.txt`, ...) and prints the `device_commit_files` lists, at most 50 files each, so a commit costs little to write out.

How a round ended, step by step, is in each row's `verify/` files; HANDOVER section 9.412 has the whole run.

