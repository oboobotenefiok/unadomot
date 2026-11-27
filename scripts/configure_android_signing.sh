#!/usr/bin/env bash
set -euo pipefail

app_dir="${1:-apps/flutter_app/android/app}"
keystore="$app_dir/upload-keystore.jks"
props="$app_dir/key.properties"

if [[ -z "${ANDROID_KEYSTORE_BASE64:-}" ]]; then
  echo "ANDROID_KEYSTORE_BASE64 is required" >&2
  exit 1
fi
if [[ -z "${ANDROID_KEYSTORE_PASSWORD:-}" ]]; then
  echo "ANDROID_KEYSTORE_PASSWORD is required" >&2
  exit 1
fi
if [[ -z "${ANDROID_KEY_ALIAS:-}" ]]; then
  echo "ANDROID_KEY_ALIAS is required" >&2
  exit 1
fi
if [[ -z "${ANDROID_KEY_PASSWORD:-}" ]]; then
  echo "ANDROID_KEY_PASSWORD is required" >&2
  exit 1
fi

mkdir -p "$app_dir"
printf '%s' "$ANDROID_KEYSTORE_BASE64" | base64 --decode > "$keystore"

cat > "$props" <<EOF
storePassword=$ANDROID_KEYSTORE_PASSWORD
keyPassword=$ANDROID_KEY_PASSWORD
keyAlias=$ANDROID_KEY_ALIAS
storeFile=upload-keystore.jks
EOF

chmod 600 "$keystore" "$props"
echo "Android signing configured at $app_dir"
