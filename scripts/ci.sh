#!/usr/bin/env bash
set -euo pipefail

branch=$(git rev-parse --abbrev-ref HEAD)
if [[ "$branch" != rewrite/* ]]; then
  echo "Refusing to run CI from branch: $branch" >&2
  exit 1
fi

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

echo "Tagging $branch as ci and pushing..."
git tag -f ci
git push -f origin ci

sleep 5
run_id=$(gh run list --workflow "Rewrite CI" --limit 1 --json databaseId --jq '.[0].databaseId')
if [[ -z "$run_id" || "$run_id" == "null" ]]; then
  echo "Could not find a CI run. Open the Actions tab to check." >&2
  exit 1
fi

echo "Watching run $run_id..."
if gh run watch "$run_id" --exit-status; then
  echo "CI passed."
  exit 0
fi

log_dir="${TMPDIR:-$HOME/.cache}/unadomot-ci"
mkdir -p "$log_dir"

echo "CI failed. Fetching error summaries..." >&2
git fetch origin ci-logs-rust ci-logs-android >/dev/null 2>&1 || true
if git show origin/ci-logs-rust:error-summary.txt >"$log_dir/rust.txt" 2>/dev/null; then
  echo "--- Rust ---" >&2
  cat "$log_dir/rust.txt" >&2
fi
if git show origin/ci-logs-android:error-summary.txt >"$log_dir/android.txt" 2>/dev/null; then
  echo "--- Android ---" >&2
  cat "$log_dir/android.txt" >&2
fi
exit 1
