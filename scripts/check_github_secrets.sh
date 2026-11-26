#!/usr/bin/env bash
set -euo pipefail

REPO="${REPO:-oboobotenefiok/unadomot}"
REQUIRED=(
  GOOGLE_CLIENT_ID
  ANDROID_KEYSTORE_BASE64
  ANDROID_KEYSTORE_PASSWORD
  ANDROID_KEY_ALIAS
  ANDROID_KEY_PASSWORD
)

if ! command -v gh >/dev/null 2>&1; then
  echo "GitHub CLI is not installed. Install gh first." >&2
  exit 1
fi

if ! gh auth status >/dev/null 2>&1; then
  echo "GitHub CLI is not authenticated. Run: gh auth login" >&2
  exit 1
fi

EXISTING="$(gh secret list --repo "$REPO" --json name --jq '.[].name' 2>/dev/null || true)"
MISSING=0

for name in "${REQUIRED[@]}"; do
  if grep -qx "$name" <<<"$EXISTING"; then
    echo "OK      $name"
  else
    echo "MISSING $name"
    MISSING=$((MISSING + 1))
  fi
done

echo
echo "Repository: $REPO"
if [ "$MISSING" -eq 0 ]; then
  echo "All required secrets are set."
else
  echo "$MISSING secret(s) missing."
  exit 1
fi

if [ -f apps/flutter_app/android/upload-keystore.jks ]; then
  echo "Local keystore: present"
else
  echo "Local keystore: missing (run scripts/setup_android_signing.sh)"
fi
