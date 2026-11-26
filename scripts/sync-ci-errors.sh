#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/unadomot}"
TAG="v0.1.0"
WORKFLOW="rewrite-ci.yml"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  cd "$REPO"
fi

BRANCH="$(git branch --show-current)"

git checkout -- error.txt error-summary.txt 2>/dev/null || true

STASHED=0
if ! git diff --quiet -- . ':(exclude)error.txt' ':(exclude)error-summary.txt' \
  || ! git diff --cached --quiet -- . ':(exclude)error.txt' ':(exclude)error-summary.txt'; then
  git stash push -u -m "ci-autostash-$(date +%s)" -- . ':(exclude)error.txt' ':(exclude)error-summary.txt' >/dev/null
  STASHED=1
fi

git pull --rebase

# Log-only commits do not match the workflow path filter, so dispatch explicitly.
gh workflow run "$WORKFLOW" --ref "$BRANCH" >/dev/null
sleep 5

RUN_ID="$(gh run list --workflow "$WORKFLOW" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')"
if [ -z "$RUN_ID" ] || [ "$RUN_ID" = "null" ]; then
  echo "Could not find a workflow run"
  exit 1
fi

echo "Watching run $RUN_ID"
gh run watch "$RUN_ID" --exit-status >/dev/null 2>&1 || true

STATUS="$(gh run view "$RUN_ID" --json conclusion --jq '.conclusion')"
if [ "$STATUS" = "failure" ]; then
  gh run view "$RUN_ID" --log-failed > error.txt || true
  sed -E 's/\x1B\[[0-9;]*[mK]//g' error.txt \
    | grep -n -E 'error(\[|:)|warning:' \
    > error-summary.txt || true
  git add error.txt error-summary.txt
  if ! git diff --cached --quiet; then
    git commit -m "chore: capture CI failure $RUN_ID"
    git push origin "$BRANCH"
    echo "Pushed error.txt and error-summary.txt for run $RUN_ID"
  fi
else
  git rm -f error.txt error-summary.txt >/dev/null 2>&1 || true
  if ! git diff --cached --quiet; then
    git commit -m "chore: clear CI logs for run $RUN_ID"
    git push origin "$BRANCH"
  fi
  echo "Run $RUN_ID is $STATUS"
fi

if [ "$STASHED" = "1" ]; then
  git stash pop || echo "Warning: could not restore stashed changes"
fi

if [ "$STATUS" != "success" ]; then
  echo "Run $RUN_ID is $STATUS; skipping release"
  exit 0
fi

gh release delete "$TAG" --yes --cleanup-tag 2>/dev/null || true
git tag -d "$TAG" 2>/dev/null || true
git tag -f "$TAG"
git push origin "$TAG" --force

gh release create "$TAG" \
  --title "UnaDomot $TAG" \
  --notes "Automated beta build from $BRANCH at $(git rev-parse --short HEAD)." \
  --prerelease

APK_DIR="$(mktemp -d)"
if gh run download "$RUN_ID" -n unadomot-debug-apk -D "$APK_DIR" 2>/dev/null; then
  APK="$(find "$APK_DIR" -name '*.apk' -print -quit)"
  if [ -n "$APK" ]; then
    gh release upload "$TAG" "$APK" --clobber
    echo "Attached $(basename "$APK") to $TAG"
  fi
fi

rm -rf "$APK_DIR"
echo "Released $TAG from $BRANCH"
