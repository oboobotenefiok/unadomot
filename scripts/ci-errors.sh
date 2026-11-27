#!/usr/bin/env bash
set -euo pipefail

WORKFLOW="rewrite-ci.yml"
OUT="thisrun-errors.txt"

RUN_ID=$(gh run list --workflow="$WORKFLOW" --limit 1 --json databaseId --jq '.[0].databaseId')

{
  echo "# CI errors for run $RUN_ID"
  echo "https://github.com/$(gh repo view --json nameWithOwner --jq .nameWithOwner)/actions/runs/$RUN_ID"
  echo
  gh run view "$RUN_ID" --log-failed 2>&1 \
    | grep -Ei "error|failed|panic|exception|expected|actual|assert|exit code" \
    | tail -n 200 || true
} | tee "$OUT"

git add "$OUT"
git commit -m "ci: record errors for run $RUN_ID" || true
git push origin "${CI_BRANCH:-rewrite/flutter-rust-postgres}"
