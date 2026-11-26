#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/../apps/flutter_app"

flutter create --platforms=android --org com.unadomot --project-name unadomot .

KEYSTORE_B64="${ANDROID_KEYSTORE_BASE64:?missing ANDROID_KEYSTORE_BASE64}"
KEYSTORE_PASSWORD="${ANDROID_KEYSTORE_PASSWORD:?missing ANDROID_KEYSTORE_PASSWORD}"
KEY_ALIAS="${ANDROID_KEY_ALIAS:?missing ANDROID_KEY_ALIAS}"
KEY_PASSWORD="${ANDROID_KEY_PASSWORD:?missing ANDROID_KEY_PASSWORD}"

printf '%s' "$KEYSTORE_B64" | base64 -d > android/upload-keystore.jks

cat > android/key.properties <<EOF
storePassword=$KEYSTORE_PASSWORD
keyPassword=$KEY_PASSWORD
keyAlias=$KEY_ALIAS
storeFile=upload-keystore.jks
EOF

python3 - <<'PY'
from pathlib import Path
p = Path('android/app/build.gradle.kts')
s = p.read_text()
if 'signingConfigs {' not in s:
    marker = '    buildTypes {'
    block = '''    signingConfigs {
        create("release") {
            val keystoreProperties = java.util.Properties()
            val keystorePropertiesFile = rootProject.file("key.properties")
            if (keystorePropertiesFile.exists()) {
                keystoreProperties.load(java.io.FileInputStream(keystorePropertiesFile))
            }
            storeFile = file(keystoreProperties["storeFile"] as String)
            storePassword = keystoreProperties["storePassword"] as String
            keyAlias = keystoreProperties["keyAlias"] as String
            keyPassword = keystoreProperties["keyPassword"] as String
        }
    }

'''
    s = s.replace(marker, block + marker, 1)
s = s.replace('signingConfig = signingConfigs.getByName("debug")', 'signingConfig = signingConfigs.getByName("release")')
p.write_text(s)
PY

echo "Android project prepared."
