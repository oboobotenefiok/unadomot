#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/apps/flutter_app"
OUT="$APP/build/app/outputs/flutter-apk/app-release.apk"

cd "$APP"
flutter pub get
flutter build apk --release \
  --dart-define=API_BASE_URL=https://unadomot.fly.dev \
  --dart-define=GOOGLE_CLIENT_ID="${GOOGLE_CLIENT_ID:-}"

if [ ! -f "$OUT" ]; then
  echo "Release APK was not produced at $OUT" >&2
  exit 1
fi

DEST=""
if [ -d /sdcard/Download ]; then
  DEST="/sdcard/Download/UnaDomot.apk"
elif [ -d "$HOME/storage/downloads" ]; then
  DEST="$HOME/storage/downloads/UnaDomot.apk"
fi

if [ -z "$DEST" ]; then
  echo "No shared Download folder found. APK is at $OUT" >&2
  exit 1
fi

cp "$OUT" "$DEST"
if command -v termux-media-scan >/dev/null 2>&1; then
  termux-media-scan "$DEST" >/dev/null 2>&1 || true
fi

echo "Copied APK to $DEST"
ls -lh "$DEST"
