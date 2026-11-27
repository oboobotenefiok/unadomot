#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-oboobotenefiok/unadomot}"
BRANCH="${BRANCH:-rewrite/flutter-rust-postgres}"

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI (gh) is required." >&2
  exit 1
fi

run_workflow() {
  local file="$1"
  local label="$2"
  echo "==> $label"
  gh workflow run "$file" --repo "$REPO" --ref "$BRANCH"
  sleep 5
  local id
  id="$(gh run list --repo "$REPO" --workflow "$file" --branch "$BRANCH" --limit 1 --json databaseId --jq '.[0].databaseId')"
  if [[ -z "$id" || "$id" == "null" ]]; then
    echo "Could not find a run for $file." >&2
    exit 1
  fi
  gh run watch "$id" --repo "$REPO" --exit-status
}

run_workflow deploy-api.yml "Deploying API"
run_workflow build-apk-manual.yml "Building release APK"

echo "CI finished. Download the APK from the Build APK Manual run."
