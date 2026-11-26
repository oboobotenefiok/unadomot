# Production readiness

## Current build status

- API is deployed at https://unadomot.fly.dev on Fly.io in `fra`.
- Database is Neon Postgres 16 in `aws-eu-central-1` (Frankfurt).
- `fly-deploy.yml` deploys the API from `services/api`.
- `build-apk.yml` builds a debug APK against the live API and uploads `unadomot-debug-apk`.
- `/health` returns `ok`.
- Registration and login succeed against Neon, confirming migrations and connectivity.
- The debug APK is not Play Store-ready; complete the signing steps below for a release build.

## Required environment

- `DATABASE_URL` Postgres connection string.
- `JWT_SECRET` at least 32 random bytes.
- `REFRESH_TOKEN_SECRET` at least 32 random bytes, separate from JWT.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` for photo uploads.
- `PUBLIC_WEB_URL` canonical public URL.
- `BIND_ADDR` e.g. `0.0.0.0:3000` locally; Fly sets `PORT=8080`.
- `RUST_LOG` e.g. `info,tower_http=info`.
- `ALLOWED_ORIGINS` comma-separated production origins.
- `REDIS_URL` optional; enables shared rate limiting.
- `RATE_LIMIT_PER_MINUTE` optional, default 120.

Admin access is granted only through the `admin_roles` table. There is no environment-variable admin bypass.

Secrets should be injected by the platform secret manager, not committed. The API reads environment variables only and never logs them.

## Deploy

Fly.io:

```bash
gh workflow run fly-deploy.yml \
  --repo oboobotenefiok/unadomot \
  --ref rewrite/flutter-rust-postgres
```

Migrations run through the Fly release command:

```toml
[deploy]
  release_command = "unadomot-api migrate"
```

The API stays warm with `min_machines_running = 1` and `auto_stop_machines = "off"` during the beta.

Local Docker:

```bash
docker compose up --build
```

The process handles `SIGTERM` gracefully.

## Health and monitoring

- `/health` liveness.
- `/ready` Postgres readiness.
- Structured tracing logs.
- Redis-backed rate limiting when configured.

## Android release signing

1. Create a keystore outside the repository:

```bash
keytool -genkey -v -keystore ~/unadomot-release.jks \
  -keyalg RSA -keysize 2048 -validity 10000 -alias unadomot
```

2. Add `apps/flutter_app/android/key.properties` locally (never commit it):

```properties
storePassword=...
keyPassword=...
keyAlias=unadomot
storeFile=/absolute/path/to/unadomot-release.jks
```

3. Configure `android/app/build.gradle` to read `key.properties` and use `signingConfigs.release`.
4. In CI, inject the keystore and passwords as base64 secrets, decode them into the runner, and build with `flutter build apk --release`.
5. Verify with `apksigner verify --print-certs app-release.apk`.

## Migration from Firebase

1. Back up Postgres.
2. Export a Firebase service account and set `GOOGLE_APPLICATION_CREDENTIALS`.
3. Run `node scripts/migrate-firebase.mjs --dry-run` and review counts/errors.
4. Run without `--dry-run` during a quiet window.
5. Spot-check users, listings, media and favorites.
6. Keep the legacy app read-only for 48 hours before shutdown.

Users migrate without passwords; they must use password reset or social login. Listings are matched by `legacy_id`, making reruns safe.

## Rollback

- Keep the legacy Firebase project running read-only during the beta.
- If the API is unhealthy, point clients back to the legacy build.
- Restore Postgres from the pre-migration backup if data is corrupted.
- Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` to invalidate all sessions after a suspected compromise.

## Known limitations

- Cloudinary secrets are not configured in production yet, so photo uploads are disabled.
- Password reset tokens are generated but email delivery is not implemented.
- The production API runs on a single Fly machine; there is no multi-region failover.
- Rate limiting falls back to per-process memory when `REDIS_URL` is absent.
- Offset pagination is used instead of cursors.
- No automated zero-downtime migration; cut-over is scripted and manual.
- Release APK signing requires a keystore configured outside the repo.
- The test account `test@example.com` should be removed or rotated before public launch.
- Business metrics are currently derived from structured logs; a Prometheus endpoint is a follow-up.
