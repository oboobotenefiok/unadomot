#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
KEYSTORE="$ROOT/apps/flutter_app/android/upload-keystore.jks"
ALIAS="upload"

if ! command -v keytool >/dev/null 2>&1; then
  echo "keytool is missing. Install a JDK first, for example: pkg install openjdk-17" >&2
  exit 1
fi

if [ -f "$KEYSTORE" ]; then
  echo "Keystore already exists: $KEYSTORE"
else
  if [ -z "${KEYSTORE_PASSWORD:-}" ]; then
    read -r -s -p "Choose a keystore password: " KEYSTORE_PASSWORD
    echo
  fi
  if [ -z "${KEY_PASSWORD:-}" ]; then
    KEY_PASSWORD="$KEYSTORE_PASSWORD"
  fi

  mkdir -p "$(dirname "$KEYSTORE")"
  keytool -genkeypair -v \
    -keystore "$KEYSTORE" \
    -alias "$ALIAS" \
    -keyalg RSA -keysize 2048 -validity 10000 \
    -storepass "$KEYSTORE_PASSWORD" \
    -keypass "$KEY_PASSWORD" \
    -dname "CN=UnaDomot, OU=Mobile, O=UnaDomot, L=Lagos, ST=Lagos, C=NG"
  echo "Created $KEYSTORE"
fi

echo
 echo "SHA fingerprints:"
keytool -list -v -keystore "$KEYSTORE" -alias "$ALIAS" -storepass "${KEYSTORE_PASSWORD:?Set KEYSTORE_PASSWORD}" | grep -E "SHA1:|SHA256:"

echo
echo "Base64 keystore for GitHub secret ANDROID_KEYSTORE_BASE64:"
base64 -w 0 "$KEYSTORE"
echo

echo
echo "Set the GitHub secrets with:"
echo "  gh secret set ANDROID_KEYSTORE_BASE64 --repo oboobotenefiok/unadomot < <(base64 -w 0 \"$KEYSTORE\")"
echo "  gh secret set ANDROID_KEYSTORE_PASSWORD --repo oboobotenefiok/unadomot"
echo "  gh secret set ANDROID_KEY_ALIAS --repo oboobotenefiok/unadomot --body upload"
echo "  gh secret set ANDROID_KEY_PASSWORD --repo oboobotenefiok/unadomot"
