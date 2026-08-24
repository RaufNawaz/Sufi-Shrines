# Branching — what each branch is for

*Written 24 August 2026. Every count in the disposition table was measured on that date
with `git rev-list --count origin/main..origin/<branch>`; re-measure before acting on it.*

The intended shape is **`main`, plus one branch per version.** Nothing else is permanent.

## The thing to know before you touch a branch

**GitHub Pages does not deploy from `main`.** It deploys from the newest *version* branch —
`1.7` today, with `1.6` still listed as a fallback. The trigger list lives in
`.github/workflows/deploy-pages.yml`:

```yaml
on:
  push:
    branches: [1.7, 1.6]
```

So a commit on `main` is not live until it reaches `1.7`. This has already cost the project
once: ten commits of fixes were believed live and had never deployed, because the site built
from a version branch the fixes had not reached (HANDOVER §9, and `/report`'s own corrections
ledger says so in public). `1.6` stays in that list on purpose — a push trigger reads the
workflow *from the branch being pushed*, so removing `1.6` would remove its only path to a
deploy and leave nothing to fall back to if `1.7` has a problem.

`ci.yml` matches version branches by pattern (`[0-9]*.[0-9]*`), so a new one gets CI without
editing anything. Deploy is the file you must edit.

## Roles

| Kind | Naming | Lifetime |
|---|---|---|
| Trunk | `main` | permanent |
| Version | `1.6`, `1.7`, … | permanent; the newest is what Pages serves |
| Work | `claude/…`, `feat/…` | delete once merged into `main` |

Cutting a new version branch is a **release decision**, not tidying: it changes what deploys
next. The steps are (1) branch from `main`, (2) add it to `deploy-pages.yml` ahead of the old
one, (3) confirm Pages is serving it, (4) only then retire the previous entry.

## Disposition, measured 24 August 2026

| Branch | Commits not in `main` | Disposition |
|---|---|---|
| `main` | — | trunk |
| `1.1` | 33 | **Keep.** The original project history from March 2026, not on `main`'s line. |
| `1.6` | 4 | **Keep.** Deploy fallback. Its four commits are merges from `main`. |
| `1.7` | 0 | **Keep.** The branch Pages serves. Identical to `main` as measured. |
| `claude/continue-previous-work-n31xsk` | 0 | Safe to delete — fully in `main`. |
| `claude/keep-working-on-this-ewipvq` | 0 | Safe to delete — fully in `main`. |
| `feat/spotlight-source-notes` | 0 | Safe to delete — identical to `main`. |
| `feat/tours-phase5-discovery` | 131 | Superseded. See below before deleting. |

No pull request is open against any of them (checked 24 August 2026), so deleting a branch
closes nothing.

### `feat/tours-phase5-discovery` — superseded, and why that is a measurement

It looks alarming: 131 commits `main` does not have, carrying tours phases 1–5, the `/graph`
explorer, self-hosted Nastaliq, app hardening and an Urdu description pass. All of it re-landed
on `main` by a later line. Checked three ways rather than assumed:

- **0 file paths** exist on the branch and not on `main`.
- **0 exported symbols** (`export function|const|class|interface|type|enum` across `src/**`)
  exist on the branch and not on `main` — 202 on the branch against 422 on `main`.
- Every file compared is *older* on the branch, not newer: `data/kg.json` 104 KB against
  `main`'s 428 KB, `src/lib/i18n/uiStrings.ts` 14 KB against 64 KB, `data/shrines.json` 682 KB
  against 1.0 MB. `src/data/tours.json` is byte-identical.

So there is nothing to port. The 131 commits are provenance, not pending work.

**It should be tagged before it is deleted**, so that history survives:

```bash
git tag -a archive/tours-phase5-discovery origin/feat/tours-phase5-discovery \
  -m "Superseded development line, July 2026 (PR #1, never merged)."
git push origin refs/tags/archive/tours-phase5-discovery
```

An agent session could not do this: pushing a tag returns **HTTP 403** with the token a Claude
Code session is given, and `git push --delete` is blocked in the sandbox. Both steps need a
human, or a token with tag-write. Until the tag exists, deleting the branch makes those commits
unreachable — recoverable from GitHub for a while, but not indefinitely.

## The cleanup, as commands

Zero-loss deletions — every commit on these three is already in `main`:

```bash
git push origin --delete claude/continue-previous-work-n31xsk
git push origin --delete claude/keep-working-on-this-ewipvq
git push origin --delete feat/spotlight-source-notes
git remote prune origin
```

Then, after the tag above is pushed:

```bash
git push origin --delete feat/tours-phase5-discovery
```

Re-measure first — a branch that was fully merged in August may have been pushed to since, and
the table above is a measurement with a date on it. `scripts/branch-audit.sh` recomputes the
whole thing:

```
$ ./scripts/branch-audit.sh
Pages deploys from: 1.7 1.6

BRANCH                                          AHEAD  DISPOSITION
1.1                                                33  KEEP — version branch
1.6                                                 4  KEEP — Pages deploys from this
1.7                                                 0  KEEP — Pages deploys from this
claude/continue-previous-work-n31xsk                0  finished — every commit is in main
claude/keep-working-on-this-ewipvq                  0  finished — every commit is in main
feat/spotlight-source-notes                         0  finished — every commit is in main
feat/tours-phase5-discovery                       131  REVIEW — 131 commit(s) only here
main                                                0  trunk
```

It reads the deploy branches out of the workflow rather than from memory, so a version branch
can never be reported as finished merely because `main` has caught up with it — which `1.7`,
sitting at 0, otherwise would be. And it deletes nothing: deciding a branch is finished and
deleting it are different decisions, and only the first is safe to automate.

## Publishing cadence (agreed 24 August 2026)

**The live site must never be more than two commits behind `main`.** So the push
sequence for every commit is three pushes, not one:

```bash
git push origin <working-branch>
git push origin HEAD:main
git push origin HEAD:1.7      # the branch GitHub Pages tracks
```

The third one is the deploy. `1.7` is what `.github/workflows/deploy-pages.yml`
triggers on (with `1.6` still listed as a fallback), and it is *not* `main` — for
most of 24 August, 25 commits sat on a working branch while `1.7` and `main` were
the same commit, so nothing that had been built, tested and pushed was actually
visible. Pushing to `main` alone does not publish anything.

The deploy job re-runs `npm run verify` and `data:validate` before it publishes,
so a red commit cannot reach production by this route; that is the reason it is
safe to publish per commit rather than in batches.
