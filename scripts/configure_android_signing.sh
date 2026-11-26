#!/usr/bin/env bash
set -euo pipefail

APP_DIR="apps/flutter_app/android/app"
KEY_FILE="apps/flutter_app/android/key.properties"

if [ -z "${ANDROID_KEYSTORE_BASE64:-}" ]; then
  echo "ANDROID_KEYSTORE_BASE64 is not set; skipping release signing."
  exit 0
fi

mkdir -p "$APP_DIR"
echo "$ANDROID_KEYSTORE_BASE64" | base64 -d > "$APP_DIR/upload-keystore.jks"

cat > "$KEY_FILE" <<EOF
storePassword=${ANDROID_KEYSTORE_PASSWORD}
keyPassword=${ANDROID_KEY_PASSWORD}
keyAlias=${ANDROID_KEY_ALIAS}
storeFile=upload-keystore.jks
EOF

python3 - "$APP_DIR/build.gradle" <<'PY'
import sys
from pathlib import Path

path = Path(sys.argv[1])
text = path.read_text()
if 'keystoreProperties' in text:
    sys.exit(0)

props = """
def keystoreProperties = new Properties()
def keystorePropertiesFile = rootProject.file('key.properties')
if (keystorePropertiesFile.exists()) {
    keystoreProperties.load(new FileInputStream(keystorePropertiesFile))
}
"""
text = text.replace('android {', props + '\nandroid {', 1)
text = text.replace(
    'buildTypes {',
    """signingConfigs {
        release {
            keyAlias keystoreProperties['keyAlias']
            keyPassword keystoreProperties['keyPassword']
            storeFile keystoreProperties['storeFile'] ? file(keystoreProperties['storeFile']) : null
            storePassword keystoreProperties['storePassword']
        }
    }
    buildTypes {""",
    1,
)
text = text.replace(
    'release {',
    'release {\n            signingConfig signingConfigs.release',
    1,
)
path.write_text(text)
print('Configured Android release signing')
PY
