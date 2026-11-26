#!/usr/bin/env bash
set -euo pipefail

MANIFEST="apps/flutter_app/android/app/src/main/AndroidManifest.xml"
if [ ! -f "$MANIFEST" ]; then
  echo "Android manifest not found: $MANIFEST" >&2
  exit 1
fi

python3 - "$MANIFEST" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
permissions = [
    'android.permission.INTERNET',
    'android.permission.ACCESS_NETWORK_STATE',
    'android.permission.CAMERA',
    'android.permission.RECORD_AUDIO',
    'android.permission.MODIFY_AUDIO_SETTINGS',
    'android.permission.ACCESS_FINE_LOCATION',
    'android.permission.ACCESS_COARSE_LOCATION',
    'android.permission.READ_MEDIA_IMAGES',
    'android.permission.READ_MEDIA_VIDEO',
    'android.permission.READ_EXTERNAL_STORAGE',
    'android.permission.WRITE_EXTERNAL_STORAGE',
    'android.permission.POST_NOTIFICATIONS',
    'android.permission.VIBRATE',
    'android.permission.BLUETOOTH_CONNECT',
    'android.permission.WAKE_LOCK',
    'android.permission.FOREGROUND_SERVICE',
    'android.permission.FOREGROUND_SERVICE_MICROPHONE',
    'android.permission.FOREGROUND_SERVICE_CAMERA',
]
lines = []
for permission in permissions:
    if permission not in text:
        lines.append(f'    <uses-permission android:name="{permission}" />')
if lines:
    text = text.replace('</manifest>', '\n'.join(lines) + '\n</manifest>')
    path.write_text(text)
    print(f'Added {len(lines)} Android permissions')
else:
    print('Android permissions already present')
PY
