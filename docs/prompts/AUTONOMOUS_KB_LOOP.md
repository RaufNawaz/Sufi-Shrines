# The resume protocol — how a session with no memory of this one continues the work

> **Read [`docs/SESSION_RESUME.md`](../SESSION_RESUME.md) first.** That is the door: what is in
> flight, what is next, and what is waiting on a person. **This file is not a second door** — it
> is the *how* for one lane of that queue, the knowledge-base work. Two files claiming to be where
> a fresh session starts is the failure `docs/README.md` warns about, and the two were written
> within minutes of each other on 30 August 2026 by two sessions that could not see each other's
> uncommitted work. Kept separate rather than merged because they answer different questions:
> SESSION_RESUME says *what to pick up*, this says *how to do a knowledge-base cycle without
> rediscovering the traps*.

**This file exists so that clearing the chat costs nothing.** Hand a fresh session this file (or
let `/loop` re-enter it) and it can pick up the next piece of knowledge-base work and leave the
repo in a state the *next* fresh session can continue from.

It is written for a reader who knows nothing about what happened yesterday. Nothing here should
require the previous session to be alive.

---

## 0. Before anything — the two traps that waste the first ten minutes

**The path.** Two Desktop directories render identically. Use the symlink, never `find`:

```bash
cd ~/shrines-repo    # -> "Desktop - rauf’s MacBook Air/Harvard/Shrines Project" (curly apostrophe)
```

**Xcode's licence blocks `git` and `python3`.** Prefix anything that touches them:

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools npm run verify
```

---

## 1. Orient (five minutes, in this order)

```bash
cd ~/shrines-repo
git log --oneline -12                       # what the last session actually landed
git status --short                          # what is dirty, and whose it is (see §2)
tail -c 20000 docs/HANDOVER.md              # the most recent §9 entries are the real state
node scripts/data/scan-kin-statements.mjs      | tail -1
node scripts/data/scan-lineage-statements.mjs  | tail -1
node scripts/data/measure-kb-gaps.mjs          | tail -12
```

`CLAUDE.md` is the operating contract and overrides anything here. `MEMORY.md` in the Claude
memory directory carries cross-session facts; the newest project memory names the current phase.

**Read the numbers, do not quote them.** Every measured figure in the docs has a date on it, and
this project's standing lesson is that a measurement quoted after it stopped being true is worse
than no measurement. Re-run the instrument.

---

## 2. There is probably another session in this same working tree

One git index, one working tree, two agents. Before touching anything:

- `git status --short` — files you did not modify belong to the other lane. **Do not stage them,
  do not format them, do not fix their lint.** A shared `git add -A` sweeps their half-finished
  work into your commit; it has happened.
- **Commit with explicit paths**: `git commit -o <path> <path> -m ...` — never `-a`.
- `npm run build` and `npm run verify` measure the **working tree, not a commit**. A number taken
  while the other lane is mid-edit describes a state that never existed. Ruling a cause *out* from
  a dirty tree is safe; ruling one *in* is not.
- `format:check` and the import-tracking test walk **untracked** files, so either lane's scratch
  file reddens the shared gate. If a failure is in a file you did not touch, say so and move on.
- Message them rather than fixing their files (`ListAgents`, then `SendMessage`).

---

## 3. Pick the next piece of work

In order of preference:

1. **Anything HANDOVER's newest entries name as "not done" or "left for".** They carry the
   reasoning; you do not have to re-derive it.
2. **The relation reading piles.** `scan-kin-statements.mjs` and `scan-lineage-statements.mjs`
   report four states: carried by an edge / read-and-ruled-out / names nobody / **to read**. Work
   the last one. Every sentence ends as either an edge or a recorded rejection — never as
   "skipped", because a skipped sentence is re-read by every future pass.
3. **A gap the instruments name**, from `measure-kb-gaps.mjs`. Respect its classes: `evidence`
   means the archive does not record it and **RULE 2 forbids supplying it**.

**Do not start `npm run data:build` without Rauf.** It fetches the live sheet, pulls unreviewed
edits into a release, and lands off-schema values. The 171-vs-169 drift is real and is his call.

**Never push.** Commit freely; pushing and deploying are asked for, not assumed.

---

## 4. How to add a relation, if that is the work

Everything is quote-checked, so the shape is fixed:

- Kin -> `data/kg-seeds.json#familyRelations`. Lineage -> `data/kg-lineage-proposals.json#proposals`
  (has `IsNew` flags) or `#lineageRelations` in the seeds (both ends must already exist).
- A rejection is worth as much as an edge: `#kinAdjudicated` and `#explicitNonRelations`, each with
  the verbatim sentence and **why**. The scanners read those and stop offering the sentence.
- `IsNew` means "this person has **no site in the archive**", not "this slug is new".
- Every new figure needs an Urdu name in `SAINTS` in `urdu-i18n/build_dictionary.py` — it is an
  assertion, not a budget, so the suite fails without it.
- Before adding a figure whose name resembles an existing one, write the `saintDoNotMerge` row
  **first**. Two Shah Razas and two Fakhr-ud-Dins are already in there.

Then, in order:

```bash
DEVELOPER_DIR=/Library/Developer/CommandLineTools python3 urdu-i18n/build_dictionary.py
cp urdu-i18n/shrine-translations.seed.json src/data/urdu-seed.json
node scripts/data/build-kg.mjs
node scripts/data/export-jsonld.mjs && node scripts/data/export-rdf.mjs
npm run data:review
npm run verify
```

`figureProvenance.test.ts` pins the figure count; update it **with a sentence saying what the new
figures are**, in the style of the entries above it. The pin moving is the point of the pin.

---

## 5. Before the context is cleared — leave it resumable

A cycle is not finished when the code works. It is finished when a stranger could continue.

1. `npm run verify` green, or the failure named and attributed to a lane.
2. Committed with explicit paths and a message that says **why**, not what.
3. A HANDOVER §9 entry for anything a future session would otherwise rediscover — especially a
   wrong turn. This file's number space is shared: check the highest entry and take the next.
4. Update the newest project memory file so the *next* session's first screen names the phase.
5. Revert timestamp-only churn in generated files before committing:
   `git diff <f> | grep -E '^[+-]' | grep -v '^[+-][+-]' | grep -v '"generated"'` — if that is
   empty, `git checkout -- <f>`.

---

## 6. The standing lessons, because they keep costing sessions

- **Measure the instrument before believing it.** Several of this project's worst hours came from
  a tool that was measuring something adjacent to the question and answering confidently.
- **A false positive in a report is worse than a missing check** — it sends someone to fix
  something that is already right, or to "complete" a fact the archive never recorded.
- **Verify a fix by re-running the thing that failed.** More than once the fix was wrong and only
  the unchanged number said so.
- **Do not edit content to satisfy a failing check.** Fix the check (RULE 4).
- **Report what the data says, including when it contradicts itself.** The qualifying notes are
  the most honest content in the archive (RULE 2).
