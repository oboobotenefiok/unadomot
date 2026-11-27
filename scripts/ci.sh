#!/usr/bin/env bash
set -euo pipefail

BRANCH="${CI_BRANCH:-rewrite/flutter-rust-postgres}"
WORKFLOW="rewrite-ci.yml"
OUT="thisrun.txt"
ALERT_SOUND="${ALERT_SOUND:-$HOME/hi.m4a}"

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

git pull --rebase origin "$BRANCH"
git push origin "$BRANCH"

echo
echo "Captured output: $OUT"
cat "$OUT"

if command -v play-audio >/dev/null 2>&1 && [ -f "$ALERT_SOUND" ]; then
  echo
  echo "Run captured and pushed. Playing $ALERT_SOUND every 5 seconds. Press Ctrl+C to stop."
  termux-wake-lock 2>/dev/null || true
  while true; do
    play-audio "$ALERT_SOUND" >/dev/null 2>&1 || true
    sleep 5
  done
else
  echo
  echo "Alert skipped: play-audio or $ALERT_SOUND not found."
fi
