#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-apps/flutter_app/android/app/src/main/AndroidManifest.xml}"

if [[ ! -f "$manifest" ]]; then
  echo "AndroidManifest.xml not found at $manifest" >&2
  echo "Run flutter create first, then rerun this script." >&2
  exit 1
fi

permissions=(
  INTERNET
  ACCESS_NETWORK_STATE
  CAMERA
  RECORD_AUDIO
  ACCESS_FINE_LOCATION
  ACCESS_COARSE_LOCATION
  READ_MEDIA_IMAGES
  READ_MEDIA_VIDEO
  READ_EXTERNAL_STORAGE
  POST_NOTIFICATIONS
  VIBRATE
  BLUETOOTH_CONNECT
  WAKE_LOCK
  FOREGROUND_SERVICE
  FOREGROUND_SERVICE_MICROPHONE
  FOREGROUND_SERVICE_CAMERA
)

for permission in "${permissions[@]}"; do
  if ! grep -q "android.permission.${permission}" "$manifest"; then
    sed -i "/<manifest /a\\    <uses-permission android:name=\"android.permission.${permission}\" />" "$manifest"
  fi
done

echo "Android permissions applied to $manifest"
