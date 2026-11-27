#!/usr/bin/env bash
set -euo pipefail

manifest="${1:-apps/flutter_app/android/app/src/main/AndroidManifest.xml}"

if [[ ! -f "$manifest" ]]; then
  echo "AndroidManifest.xml not found at $manifest" >&2
  echo "Run flutter create first, then rerun this script." >&2
  exit 1
fi

if grep -q 'android:scheme="unadomot"' "$manifest"; then
  echo "Deep links already present in $manifest"
  exit 0
fi

python3 - "$manifest" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()

filters = '''
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="unadomot.com" />
                <data android:scheme="https" android:host="www.unadomot.com" />
            </intent-filter>
            <intent-filter>
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="unadomot" />
            </intent-filter>
'''

marker = "</activity>"
if marker not in text:
    raise SystemExit("No </activity> tag found; cannot add deep links")

text = text.replace(marker, filters + "        " + marker, 1)
path.write_text(text)
print(f"Deep links added to {path}")
PY
