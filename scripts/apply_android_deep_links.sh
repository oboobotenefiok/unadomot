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
if 'unadomot.fly.dev' in text:
    print('Deep links already configured')
    sys.exit(0)

filter_block = '''
            <intent-filter android:autoVerify="true">
                <action android:name="android.intent.action.VIEW" />
                <category android:name="android.intent.category.DEFAULT" />
                <category android:name="android.intent.category.BROWSABLE" />
                <data android:scheme="https" android:host="unadomot.fly.dev" />
            </intent-filter>
'''

marker = '</activity>'
if marker not in text:
    raise SystemExit('Could not find activity closing tag')

text = text.replace(marker, filter_block + marker, 1)
path.write_text(text)
print('Added username deep link intent filter')
PY
