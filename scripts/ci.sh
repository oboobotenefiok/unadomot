#!/usr/bin/env bash
set -euo pipefail

BRANCH="${CI_BRANCH:-rewrite/flutter-rust-postgres}"
WORKFLOW="rewrite-ci.yml"
OUT="thisrun.txt"

{
  echo "# CI run $(date -u +%Y-%m-%dT%H:%M:%SZ)"
  echo "Branch: $BRANCH"
  echo

  echo "## Trigger"
  gh workflow run "$WORKFLOW" --ref "$BRANCH"
  sleep 5

  echo
  echo "## Recent runs"
  gh run list --workflow="$WORKFLOW" --branch "$BRANCH" --limit 5

  RUN_ID=$(gh run list --workflow="$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')
  echo
  echo "Run ID: $RUN_ID"
  echo "URL: https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/actions/runs/$RUN_ID"
  echo

  echo "## Watch"
  gh run watch "$RUN_ID" --exit-status >/dev/null 2>&1 || true
  gh run view "$RUN_ID"

  echo
  echo "## Failed logs"
  gh run view "$RUN_ID" --log-failed || true
} 2>&1 | tee "$OUT"

git add "$OUT"
git commit -m "ci: record run ${RUN_ID:-unknown}" || true
git push origin "$BRANCH"
