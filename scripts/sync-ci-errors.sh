#!/usr/bin/env bash
set -euo pipefail

REPO="${1:-$HOME/unadomot}"
TAG="v0.1.0"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  cd "$REPO"
fi

BRANCH="$(git branch --show-current)"
git pull --rebase

RUN_ID="$(gh run list --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')"
if [ -n "$RUN_ID" ] && [ "$RUN_ID" != "null" ]; then
  gh run view "$RUN_ID" --log-failed > error.txt || true
  if [ -s error.txt ]; then
    sed -E 's/\x1B\[[0-9;]*[mK]//g' error.txt \
      | grep -n -E 'error(\[|:)|warning:' \
      > error-summary.txt || true
    git add error.txt error-summary.txt
    git commit -m "chore: capture CI failure $RUN_ID" || true
    git pull --rebase
    git push origin "$BRANCH"
    echo "Pushed error.txt and error-summary.txt for run $RUN_ID"
  else
    rm -f error.txt error-summary.txt
    echo "Run $RUN_ID has no failed steps"
  fi
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
