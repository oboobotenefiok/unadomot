#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-oboobotenefiok/unadomot}"
BRANCH="${BRANCH:-rewrite/flutter-rust-postgres}"

if ! command -v gh >/dev/null 2>&1; then
  echo "gh is required. Install it first." >&2
  exit 1
fi

run_workflow() {
  local file="$1"
  local name="$2"
  echo "==> Starting $name"
  gh workflow run "$file" --repo "$REPO" --ref "$BRANCH"
  sleep 5
  local id
  id="$(gh run list --repo "$REPO" --workflow "$file" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')"
  gh run watch "$id" --repo "$REPO" --exit-status
}

run_workflow deploy-api.yml "API deploy"
run_workflow build-apk.yml "APK build"

DEST="${DEST:-$HOME/storage/downloads}"
mkdir -p "$DEST"
TMP="$(mktemp -d)"
gh run download --repo "$REPO" --name unadomot-release-apk --dir "$TMP"
APK="$(find "$TMP" -name '*.apk' -print -quit)"
cp "$APK" "$DEST/UnaDomot.apk"
rm -rf "$TMP"

if command -v termux-media-scan >/dev/null 2>&1; then
  termux-media-scan "$DEST/UnaDomot.apk" >/dev/null 2>&1 || true
fi

echo "Done: $DEST/UnaDomot.apk"
