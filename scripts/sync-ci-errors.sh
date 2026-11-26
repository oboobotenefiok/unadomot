#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/unadomot}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  cd "$REPO"
fi

BRANCH="$(git branch --show-current)"
git pull --rebase

RUN_ID="$(gh run list --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')"
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "No workflow runs found for $BRANCH"
  exit 0
fi

gh run view "$RUN_ID" --log-failed > error.txt || true

if [ ! -s error.txt ]; then
  echo "Run $RUN_ID has no failed steps"
  rm -f error.txt
  exit 0
fi

git add error.txt
git commit -m "chore: capture CI failure $RUN_ID" || true
git pull --rebase
git push origin "$BRANCH"

echo "Pushed error.txt for run $RUN_ID"
