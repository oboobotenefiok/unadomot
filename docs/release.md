# Play Store release

Play Store downloads are much smaller than a debug APK because the store delivers only the native libraries and resources for the user's device.

## Build locally

```bash
flutter build appbundle --release \
  --dart-define=API_BASE_URL=https://unadomot.fly.dev \
  --dart-define=GOOGLE_CLIENT_ID=your-client-id
```

The bundle is written to `build/app/outputs/bundle/release/app-release.aab`.

## Signing

Create an upload keystore and add these GitHub secrets:

- `ANDROID_KEYSTORE_BASE64`
- `ANDROID_KEYSTORE_PASSWORD`
- `ANDROID_KEY_ALIAS`
- `ANDROID_KEY_PASSWORD`

Then configure `android/key.properties` and the release signing config in `android/app/build.gradle`. The current workflow builds an unsigned bundle, which is fine for size checks but not for upload.

## Size checks

```bash
flutter build appbundle --release --analyze-size
```

Use Android vitals in Play Console to see the real download and install size.
