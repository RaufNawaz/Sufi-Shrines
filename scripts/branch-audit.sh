#!/usr/bin/env bash
# Which branches are finished, and which carry commits main does not have.
#
# The disposition table in docs/BRANCHING.md is a measurement with a date on it,
# and CLAUDE.md's standing-findings lesson is that such a table gets quoted long
# after it stops being true. So this recomputes it. Read-only: it deletes
# nothing, because deciding a branch is finished and deleting it are different
# decisions and only the first one is safe to automate.
set -euo pipefail

git fetch origin --prune >/dev/null 2>&1 || echo "warning: fetch failed, working from the last fetch" >&2

# The branches Pages actually deploys from, read out of the workflow rather than
# remembered — a version branch is load-bearing and must never be listed as
# finished just because main has caught up with it.
deploy_branches=$(
  sed -n '/^on:/,/^[a-z]/p' .github/workflows/deploy-pages.yml |
    sed -n 's/.*branches: *\[\(.*\)\].*/\1/p' | tr -d ' ' | tr ',' ' '
)
echo "Pages deploys from: ${deploy_branches:-<could not parse deploy-pages.yml>}"
echo

printf '%-44s %8s  %s\n' BRANCH AHEAD DISPOSITION
for b in $(git branch -r --format='%(refname:short)' | sed 's|^origin/||' | grep -v '^HEAD'); do
  ahead=$(git rev-list --count "origin/main..origin/$b")
  case " $deploy_branches " in *" $b "*) note="KEEP — Pages deploys from this"; ;; *)
    if [ "$b" = main ]; then note="trunk"
    elif printf '%s' "$b" | grep -qE '^[0-9]+\.[0-9]+$'; then note="KEEP — version branch"
    elif [ "$ahead" -eq 0 ]; then note="finished — every commit is in main"
    else note="REVIEW — $ahead commit(s) only here"
    fi ;;
  esac
  printf '%-44s %8s  %s\n' "$b" "$ahead" "$note"
done
echo
echo "Nothing was deleted. See docs/BRANCHING.md for the commands and for why a"
echo "branch with commits of its own needs a tag before it is removed."
